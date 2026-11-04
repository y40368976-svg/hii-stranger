package payment

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"math/big"

	"hii-stranger1/backend/internal/pkg/mailer"
)

// maxUniqueCode adalah batas atas kode unik transfer (1 sampai 999 rupiah).
const maxUniqueCode = 999

// Service berisi logika bisnis pembayaran.
type Service struct {
	repo *Repository
	mail *mailer.Mailer
}

// NewService membuat Service. mail boleh nonaktif (SMTP belum diisi).
func NewService(repo *Repository, mail *mailer.Mailer) *Service {
	return &Service{repo: repo, mail: mail}
}

// Get mengambil pembayaran order. Hanya pemilik order atau admin; selain itu
// dianggap tidak ada supaya keberadaan order tidak bocor.
func (s *Service) Get(ctx context.Context, orderID, userID string, admin bool) (Payment, error) {
	if err := s.checkAccess(ctx, orderID, userID, admin); err != nil {
		return Payment{}, err
	}
	return s.repo.GetByOrder(ctx, orderID)
}

// Create membuat tagihan pembayaran untuk order milik userID. Kode unik acak
// ditambahkan ke total agar transfer mudah dicocokkan admin.
func (s *Service) Create(ctx context.Context, orderID, userID, method string) (Payment, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(maxUniqueCode))
	if err != nil {
		return Payment{}, fmt.Errorf("payment: unique code: %w", err)
	}
	return s.repo.Create(ctx, orderID, userID, method, int(n.Int64())+1)
}

// UploadProof menyimpan bukti pembayaran milik order userID, lalu memberi
// tahu pemilik toko lewat email bahwa ada bukti yang perlu diverifikasi.
func (s *Service) UploadProof(ctx context.Context, orderID, userID string, proof Proof) (Payment, error) {
	if err := s.checkAccess(ctx, orderID, userID, false); err != nil {
		return Payment{}, err
	}
	p, err := s.repo.SaveProof(ctx, orderID, proof)
	if err != nil {
		return Payment{}, err
	}

	if c, err := s.repo.contactOf(ctx, orderID); err == nil {
		s.mail.NotifyOwner("Bukti pembayaran baru: "+c.OrderNumber,
			fmt.Sprintf("Pelanggan %s mengunggah bukti pembayaran untuk order %s.\n"+
				"Nominal yang harus diterima: Rp %s (kode unik %d).\n\n"+
				"Silakan verifikasi di halaman admin.", c.Name, c.OrderNumber, p.Amount, p.UniqueCode))
	} else {
		slog.WarnContext(ctx, "payment: load contact for email failed", "error", err)
	}
	return p, nil
}

// Proof mengambil berkas bukti pembayaran (pemilik order atau admin).
func (s *Service) Proof(ctx context.Context, orderID, userID string, admin bool) (Proof, error) {
	if err := s.checkAccess(ctx, orderID, userID, admin); err != nil {
		return Proof{}, err
	}
	return s.repo.GetProof(ctx, orderID)
}

// List mengambil satu halaman pembayaran (admin).
func (s *Service) List(ctx context.Context, f Filter, limit, offset int) ([]Payment, int, error) {
	return s.repo.List(ctx, f, limit, offset)
}

// Review menyetujui atau menolak pembayaran, lalu mengirim email hasilnya ke
// pelanggan.
func (s *Service) Review(ctx context.Context, paymentID, adminID, status string) (Payment, error) {
	p, err := s.repo.Review(ctx, paymentID, adminID, status)
	if err != nil {
		return Payment{}, err
	}

	if c, err := s.repo.contactOf(ctx, p.OrderID); err == nil {
		subject, body := "Pembayaran diterima: "+c.OrderNumber,
			fmt.Sprintf("Halo %s,\n\nPembayaran untuk order %s sudah kami terima dan pesanan segera diproses.\n\nTerima kasih!", c.Name, c.OrderNumber)
		if status == StatusRejected {
			subject = "Pembayaran ditolak: " + c.OrderNumber
			body = fmt.Sprintf("Halo %s,\n\nBukti pembayaran untuk order %s belum dapat kami verifikasi.\n"+
				"Silakan unggah ulang bukti transfer yang sesuai.\n\nTerima kasih.", c.Name, c.OrderNumber)
		}
		s.mail.Notify(c.Email, subject, body)
	} else {
		slog.WarnContext(ctx, "payment: load contact for email failed", "error", err)
	}
	return p, nil
}

// checkAccess memastikan order ada dan milik userID (kecuali admin).
func (s *Service) checkAccess(ctx context.Context, orderID, userID string, admin bool) error {
	owner, err := s.repo.OrderOwner(ctx, orderID)
	if err != nil {
		return err
	}
	if !admin && owner != userID {
		return ErrOrderNotFound
	}
	return nil
}
