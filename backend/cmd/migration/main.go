// Command migration menjalankan file SQL di folder migrations/ ke database.
//
// Cara pakai (dari folder backend):
//
//	go run ./cmd/migration up             jalankan semua migrasi yang belum jalan
//	go run ./cmd/migration down           batalkan 1 migrasi terakhir
//	go run ./cmd/migration down 3         batalkan 3 migrasi terakhir
//	go run ./cmd/migration status         lihat mana yang sudah / belum jalan
//	go run ./cmd/migration fresh          HAPUS semua tabel lalu jalankan ulang semua migrasi
//	                                      (hanya boleh saat APP_ENV=dev, data ikut hilang)
//	go run ./cmd/migration create nama    buat pasangan file .up.sql dan .down.sql baru
//
// Opsi: -dir <folder> untuk memakai folder migrasi lain (default: migrations).
//
// Format nama file: <versi>_<nama>.up.sql dan <versi>_<nama>.down.sql.
// Versi berupa angka dan diurutkan sebagai angka, jadi 000001 jalan lebih dulu
// daripada 20261029004406.
//
// Alamat database dibaca dari DB_URL (sama seperti server). Kalau kosong,
// DATABASE_URL dipakai sebagai cadangan. File .env ikut dibaca bila ada.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/joho/godotenv"
)

const (
	defaultDir = "migrations"

	// lockKey adalah angka bebas untuk advisory lock PostgreSQL. Gunanya agar
	// dua proses migrasi tidak berjalan bersamaan di database yang sama.
	lockKey = 20261029

	// createTable menyimpan daftar versi yang sudah dijalankan.
	createTable = `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    BIGINT      PRIMARY KEY,
			name       TEXT        NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`
)

// fileName mencocokkan nama file migrasi, contoh: 000001_create_users_table.up.sql
var fileName = regexp.MustCompile(`^(\d+)_([a-zA-Z0-9_]+)\.(up|down)\.sql$`)

// migration adalah satu pasangan file up/down dengan versi yang sama.
type migration struct {
	version  int64
	name     string
	upPath   string
	downPath string // boleh kosong bila file .down.sql tidak ada
}

// label menghasilkan teks seperti "000001_create_users_table" untuk dicetak.
func (m migration) label() string {
	return filepath.Base(strings.TrimSuffix(m.upPath, ".up.sql"))
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	// Baca opsi -dir dan perintah (up / down / status / create).
	flags := flag.NewFlagSet("migration", flag.ContinueOnError)
	dir := flags.String("dir", defaultDir, "folder berisi file migrasi")
	flags.Usage = func() { printUsage(flags) }

	if err := flags.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
	}

	cmd := flags.Arg(0)
	rest := flags.Args()
	if len(rest) > 0 {
		rest = rest[1:]
	}

	// "create" hanya membuat file, tidak butuh koneksi database.
	if cmd == "create" {
		return create(*dir, rest)
	}

	if cmd != "up" && cmd != "down" && cmd != "status" && cmd != "fresh" {
		printUsage(flags)
		if cmd == "" {
			return errors.New("perintah belum diisi")
		}
		return fmt.Errorf("perintah %q tidak dikenal", cmd)
	}

	// Baca dan cek semua file migrasi dulu, sebelum menyentuh database.
	migrations, err := loadMigrations(*dir)
	if err != nil {
		return err
	}

	// Ctrl+C membatalkan ctx; migrasi yang sedang jalan akan di-rollback.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	conn, err := connect(ctx)
	if err != nil {
		return err
	}
	defer conn.Close(context.Background())

	// Kunci supaya tidak ada proses migrasi lain yang jalan bersamaan.
	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1)", lockKey); err != nil {
		return fmt.Errorf("ambil lock: %w", err)
	}
	defer func() {
		_, _ = conn.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", lockKey)
	}()

	// "fresh": kosongkan database dulu, setelah itu sama seperti "up".
	if cmd == "fresh" {
		if err := dropAllTables(ctx, conn); err != nil {
			return err
		}
		cmd = "up"
	}

	if err := checkLegacyTable(ctx, conn); err != nil {
		return err
	}

	if _, err := conn.Exec(ctx, createTable); err != nil {
		return fmt.Errorf("buat tabel schema_migrations: %w", err)
	}

	applied, err := appliedVersions(ctx, conn)
	if err != nil {
		return err
	}

	switch cmd {
	case "up":
		return up(ctx, conn, migrations, applied)

	case "down":
		steps := 1
		if len(rest) > 0 {
			steps, err = strconv.Atoi(rest[0])
			if err != nil || steps < 1 {
				return fmt.Errorf("jumlah langkah %q harus angka minimal 1", rest[0])
			}
		}
		return down(ctx, conn, migrations, applied, steps)

	default: // status
		status(migrations, applied)
		return nil
	}
}

// connect membuka satu koneksi ke database dari DB_URL / DATABASE_URL.
func connect(ctx context.Context) (*pgx.Conn, error) {
	// File .env opsional; variable yang sudah di-set di terminal tidak ditimpa.
	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("baca .env: %w", err)
	}

	url := strings.TrimSpace(os.Getenv("DB_URL"))
	if url == "" {
		url = strings.TrimSpace(os.Getenv("DATABASE_URL"))
	}
	if url == "" {
		return nil, errors.New("DB_URL (atau DATABASE_URL) belum di-set")
	}

	conn, err := pgx.Connect(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("koneksi database: %w", err)
	}
	return conn, nil
}

// checkLegacyTable menolak bekerja bila tabel schema_migrations dibuat oleh
// alat lain (golang-migrate memakai kolom version + dirty, tanpa kolom name).
// Kalau dipaksa, catatan versinya akan kacau.
func checkLegacyTable(ctx context.Context, conn *pgx.Conn) error {
	var hasDirty, hasName bool
	err := conn.QueryRow(ctx, `
		SELECT COALESCE(bool_or(column_name = 'dirty'), false),
		       COALESCE(bool_or(column_name = 'name'), false)
		  FROM information_schema.columns
		 WHERE table_schema = current_schema()
		   AND table_name = 'schema_migrations'`,
	).Scan(&hasDirty, &hasName)
	if err != nil {
		return fmt.Errorf("cek schema_migrations: %w", err)
	}

	if hasDirty && !hasName {
		return errors.New("tabel schema_migrations dibuat oleh golang-migrate (format lain).\n" +
			"Kalau ini database dev dan datanya boleh hilang, jalankan: go run ./cmd/migration fresh")
	}
	return nil
}

// dropAllTables menghapus SEMUA tabel di schema aktif (biasanya public).
// Hanya diizinkan saat APP_ENV kosong atau "dev" supaya tidak terjadi di server.
func dropAllTables(ctx context.Context, conn *pgx.Conn) error {
	if env := strings.TrimSpace(os.Getenv("APP_ENV")); env != "" && env != "dev" {
		return fmt.Errorf("fresh ditolak: APP_ENV=%q, hanya boleh saat dev", env)
	}

	rows, err := conn.Query(ctx,
		"SELECT quote_ident(tablename) FROM pg_tables WHERE schemaname = current_schema()")
	if err != nil {
		return fmt.Errorf("daftar tabel: %w", err)
	}
	tables, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return fmt.Errorf("daftar tabel: %w", err)
	}

	if len(tables) == 0 {
		fmt.Println("Database sudah kosong.")
		return nil
	}

	// CASCADE ikut menghapus foreign key dan sequence milik tabel tersebut.
	if _, err := conn.Exec(ctx, "DROP TABLE "+strings.Join(tables, ", ")+" CASCADE"); err != nil {
		return fmt.Errorf("hapus tabel: %w", err)
	}

	fmt.Printf("Dihapus %d tabel: %s\n", len(tables), strings.Join(tables, ", "))
	return nil
}

// loadMigrations membaca folder migrasi, memasangkan file up/down per versi,
// lalu mengurutkannya dari versi terkecil.
func loadMigrations(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("baca folder %s: %w", dir, err)
	}

	byVersion := map[int64]*migration{}

	for _, e := range entries {
		if e.IsDir() {
			continue
		}

		m := fileName.FindStringSubmatch(e.Name())
		if m == nil {
			// File lain (mis. .gitkeep) diabaikan.
			continue
		}

		version, err := strconv.ParseInt(m[1], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("versi pada %s terlalu besar", e.Name())
		}
		name, direction := m[2], m[3]
		path := filepath.Join(dir, e.Name())

		mig, ok := byVersion[version]
		if !ok {
			mig = &migration{version: version, name: name}
			byVersion[version] = mig
		}

		// Versi yang sama harus punya nama yang sama, misal 0001_a.up dan 0001_a.down.
		if mig.name != name {
			return nil, fmt.Errorf("versi %d dipakai dua nama berbeda: %s dan %s", version, mig.name, name)
		}

		target := &mig.upPath
		if direction == "down" {
			target = &mig.downPath
		}
		if *target != "" {
			return nil, fmt.Errorf("file %s ganda untuk versi %d", direction, version)
		}
		*target = path
	}

	list := make([]migration, 0, len(byVersion))
	for _, m := range byVersion {
		if m.upPath == "" {
			return nil, fmt.Errorf("versi %d (%s) tidak punya file .up.sql", m.version, m.name)
		}
		list = append(list, *m)
	}

	sort.Slice(list, func(i, j int) bool { return list[i].version < list[j].version })
	return list, nil
}

// appliedVersions mengambil versi yang sudah tercatat di schema_migrations.
func appliedVersions(ctx context.Context, conn *pgx.Conn) (map[int64]bool, error) {
	rows, err := conn.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("baca schema_migrations: %w", err)
	}

	versions, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return nil, fmt.Errorf("baca schema_migrations: %w", err)
	}

	applied := make(map[int64]bool, len(versions))
	for _, v := range versions {
		applied[v] = true
	}
	return applied, nil
}

// up menjalankan semua migrasi yang belum tercatat, dari versi terkecil.
func up(ctx context.Context, conn *pgx.Conn, migrations []migration, applied map[int64]bool) error {
	count := 0

	for _, m := range migrations {
		if applied[m.version] {
			continue
		}

		err := apply(ctx, conn, m.upPath, func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx,
				"INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
				m.version, m.name)
			return err
		})
		if err != nil {
			// 42P07 = tabel sudah ada. Biasanya sisa skema lama yang dibuat
			// tanpa alat ini, jadi beri petunjuk cara membereskannya.
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "42P07" {
				return fmt.Errorf("up %s: %w\n"+
					"petunjuk: tabel ini sudah ada di database tapi belum tercatat di schema_migrations.\n"+
					"Kalau ini database dev dan datanya boleh hilang, jalankan: go run ./cmd/migration fresh",
					m.label(), err)
			}
			return fmt.Errorf("up %s: %w", m.label(), err)
		}

		fmt.Println("up  ", m.label())
		count++
	}

	if count == 0 {
		fmt.Println("Database sudah versi terbaru, tidak ada migrasi baru.")
	} else {
		fmt.Printf("Selesai: %d migrasi dijalankan.\n", count)
	}
	return nil
}

// down membatalkan migrasi terakhir sebanyak steps, dari versi terbesar.
func down(ctx context.Context, conn *pgx.Conn, migrations []migration, applied map[int64]bool, steps int) error {
	// Kumpulkan migrasi yang sudah jalan, urut dari yang paling baru.
	var done []migration
	for i := len(migrations) - 1; i >= 0; i-- {
		if applied[migrations[i].version] {
			done = append(done, migrations[i])
		}
	}

	if len(done) == 0 {
		fmt.Println("Belum ada migrasi yang dijalankan, tidak ada yang dibatalkan.")
		return nil
	}
	if steps > len(done) {
		steps = len(done)
	}

	for _, m := range done[:steps] {
		if m.downPath == "" {
			return fmt.Errorf("down %s: file .down.sql tidak ada", m.label())
		}

		err := apply(ctx, conn, m.downPath, func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, "DELETE FROM schema_migrations WHERE version = $1", m.version)
			return err
		})
		if err != nil {
			return fmt.Errorf("down %s: %w", m.label(), err)
		}

		fmt.Println("down", m.label())
	}

	fmt.Printf("Selesai: %d migrasi dibatalkan.\n", steps)
	return nil
}

// apply menjalankan isi file SQL dan mencatat hasilnya dalam satu transaksi.
// Kalau ada yang gagal, semuanya dibatalkan sehingga database tidak setengah jadi.
func apply(ctx context.Context, conn *pgx.Conn, path string, record func(pgx.Tx) error) error {
	sql, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	// Exec tanpa argumen boleh berisi beberapa perintah SQL sekaligus.
	if _, err := tx.Exec(ctx, string(sql)); err != nil {
		return err
	}
	if err := record(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// status mencetak daftar migrasi beserta tanda sudah/belum dijalankan.
func status(migrations []migration, applied map[int64]bool) {
	known := map[int64]bool{}
	pending := 0

	for _, m := range migrations {
		known[m.version] = true
		mark := "[ ]"
		if applied[m.version] {
			mark = "[x]"
		} else {
			pending++
		}
		fmt.Println(mark, m.label())
	}

	// Versi yang tercatat di database tapi file-nya sudah tidak ada.
	for v := range applied {
		if !known[v] {
			fmt.Printf("[x] %d (file migrasi tidak ditemukan)\n", v)
		}
	}

	fmt.Printf("\n%d sudah jalan, %d belum.\n", len(migrations)-pending, pending)
}

// create membuat pasangan file migrasi kosong dengan versi berupa waktu sekarang (UTC).
func create(dir string, args []string) error {
	if len(args) == 0 {
		return errors.New("nama migrasi belum diisi, contoh: create add_phone_to_users")
	}

	// Ubah nama jadi huruf kecil dengan garis bawah, misal "Add Phone" -> "add_phone".
	name := strings.ToLower(strings.Join(args, "_"))
	name = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(name, "_")
	name = strings.Trim(name, "_")
	if name == "" {
		return errors.New("nama migrasi hanya boleh huruf dan angka")
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	base := time.Now().UTC().Format("20060102150405") + "_" + name
	for _, direction := range []string{"up", "down"} {
		path := filepath.Join(dir, base+"."+direction+".sql")

		// O_EXCL: gagal bila file sudah ada, jadi file lama tidak tertimpa.
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(f, "-- %s: tulis perintah SQL di sini.\n", direction)
		if cerr := f.Close(); err == nil {
			err = cerr
		}
		if err != nil {
			return err
		}
		fmt.Println("dibuat", path)
	}
	return nil
}

func printUsage(flags *flag.FlagSet) {
	fmt.Fprintln(os.Stderr, `Pemakaian:
  go run ./cmd/migration [opsi] up
  go run ./cmd/migration [opsi] down [jumlah]
  go run ./cmd/migration [opsi] status
  go run ./cmd/migration [opsi] fresh      (dev saja: hapus semua tabel lalu up)
  go run ./cmd/migration [opsi] create <nama>

Opsi:`)
	flags.PrintDefaults()
}
