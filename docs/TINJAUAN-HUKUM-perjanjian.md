# Tinjauan Hukum — docs/PERJANJIAN-draf.md (2026-11-18)

> Tinjauan awal berbasis riset sumber sekunder (Hukumonline, pasal.id, Wikisource, dll.), bukan nasihat hukum.
> Pasal bertanda (?) belum dicocokkan ke naskah resmi (peraturan.go.id / JDIH). Tetap perlu ditinjau advokat/konsultan HKI sebelum ditandatangani.

## A. Cacat yang harus diperbaiki sebelum tanda tangan
1. **§2 kalimat rusak.** "...pada cakupan dengan syarat wajib mempertahankan dan menghapus maupun mengubahnya" tidak bermakna dan
   kontradiktif (mempertahankan *dan* menghapus). Usulan: "...untuk operasional toko Klien sendiri, dengan syarat Klien wajib
   mempertahankan atribusi dan tidak menghapus maupun mengubahnya." Satu paragraf juga memuat 6 larangan; pecah jadi butir.
2. **Pihak Klien kosong** ("[Nama Klien / Hii Stranger]"). Tanpa identitas (nama, NIK/NIB, alamat, kewenangan menandatangani)
   perjanjian tidak dapat ditegakkan (syarat sah, Pasal 1320 KUHPerdata).
3. **Imbalan, jangka waktu, terminasi tidak ada.** Pasal 80 ayat (2)-(3) UU 28/2014: lisensi berlaku untuk jangka waktu tertentu
   (tidak melebihi masa hak cipta) dan penerima lisensi membayar royalti *kecuali diperjanjikan lain*. Draf diam, jadi nyatakan
   tegas (mis. "tanpa royalti" atau nominal) beserta durasi dan syarat pemutusan.
4. **Hosting & operasional tidak diatur.** §2 melarang akses kode sumber, tetapi siapa yang menjalankan server (Railway belum
   deploy)? Bila Pengembang yang hosting, itu layanan berkelanjutan: butuh SLA, biaya hosting, backup, dan kepemilikan akun
   pihak ketiga (Railway, Cloudinary, RajaOngkir, email). Bila Klien yang hosting, ia butuh paket build/deploy.
5. **Kepemilikan data Klien tidak dipisah dari kode.** §2 menyatakan "seluruh ... sistem" milik Pengembang; bisa dibaca mencakup
   data toko (produk, pelanggan, pesanan). Tambah: data & konten Klien tetap milik Klien, ada hak ekspor saat berakhir.
6. **Kuasa tanda tangan.** Satu orang menandatangani mewakili 4 pencipta; lampirkan kuasa tertulis bertanda tangan keempatnya.
   Untuk pemberian lisensi/pengalihan hak, kuasa sebaiknya khusus (bukan umum), dan menyebut batas kewenangan.

## B. Risiko bernilai tinggi
- **Repo PUBLIC bertentangan dengan klausul kerahasiaan.** Draf & LICENSE melarang Klien/pihak lain mengakses kode, padahal siapa pun
  bisa melihatnya. Syarat layanan GitHub memberi pengguna lain lisensi melihat dan fork repo publik di dalam GitHub, jadi LICENSE
  proprietary tidak menghentikan fork di platform. Hak cipta tetap ada, tetapi nilai kode sebagai aset yang dilisensikan dan
  kerahasiaannya melemah. Jadikan repo private sebelum perjanjian berlaku (cek juga rahasia di riwayat commit).
- **Status awal hak cipta ciptaan pesanan.** Menurut Hukumonline, bila ciptaan dibuat atas pesanan, pembuat dianggap pencipta &
  pemegang hak *kecuali diperjanjikan lain* (Pasal 36 (?)). Jadi §1 sejalan dengan UU, tetapi harus dibuktikan bahwa memang
  tidak ada perjanjian lain (chat/email/proposal ke Klien bisa dianggap perjanjian). Kumpulkan dan rapikan korespondensi.
- **Kampus.** Ini tugas kelompok kuliah (Kelas 4KA21). Cek kebijakan HKI kampus dan syarat dosen pembimbing; bila ada klaim
  institusi, klausul "milik Pengembang" bisa digugat. Saya tidak menemukan aturan kampusnya; ini perlu dikonfirmasi.
- **Pencatatan lisensi.** Pasal 83 ayat (1),(3): perjanjian lisensi wajib dicatat di DJKI; bila tidak dicatat tetap sah antar para
  pihak tetapi tidak berakibat hukum terhadap pihak ketiga (PP 36/2018 mengatur tata caranya). Rencanakan pencatatan.
- **Pencatatan ciptaan.** Pencatatan hak cipta di DJKI tidak menjadi syarat perlindungan, tetapi memberi bukti kepemilikan kuat;
  disarankan untuk program komputer ini (dari pengetahuan saya, belum dicek).

## C. Ketepatan pasal & klausul
- §4 Pasal 16 ayat (2) UU 28/2014: benar, hak cipta dapat beralih lewat perjanjian tertulis. Tambah: hak moral (Pasal 5) tidak ikut beralih.
- §7 Pasal 95: ayat (1) APS, arbitrase, atau pengadilan; ayat (2)-(3) pengadilan yang berwenang hanya Pengadilan Niaga. Rujukan benar
  untuk sengketa hak cipta/lisensi. Tetapi sengketa kontrak murni (bayaran, wanprestasi pemeliharaan) bisa jatuh ke Pengadilan Negeri.
  Usulan: mediasi 30 hari, lalu BANI/pengadilan dengan domisili yang disebut jelas, dan sebutkan bahwa sengketa HKI ke Pengadilan Niaga.
- §6 UU PDP: Klien = pengendali sudah tepat, tetapi Pengembang yang mengakses/menyimpan data adalah **prosesor**. Pasal 51 UU 27/2022
  (nomor ayat perlu dicek): prosesor memproses hanya atas perintah pengendali, dan butuh persetujuan tertulis pengendali sebelum
  memakai prosesor lain (relevan: Railway, Cloudinary, RajaOngkir, penyedia email). Tambah: keamanan, notifikasi insiden
  (kewajiban notifikasi maks. 3x24 jam, dari pengetahuan saya, belum dicek), pengembalian/penghapusan data saat berakhir.
- Tanggung jawab: "Kelompok" bukan badan hukum, jadi 4 orang menanggung risiko pribadi. Tambah batas tanggung jawab (mis. maks. nilai imbalan),
  pengecualian jaminan (LICENSE §7 sudah ada, draf belum), force majeure, dan kerahasiaan timbal balik.
- Bea meterai: perjanjian perdata biasanya bermeterai Rp10.000 agar dapat dipakai sebagai alat bukti (dari pengetahuan saya, belum dicek).
- Klausul kunci pemeliharaan (§3-4) tanpa harga, durasi, atau jalan keluar memberi kesan Klien terkunci tanpa batas (lock-in).
  Beri jalur keluar wajar: biaya serah terima atau pemberitahuan N hari, agar tidak dianggap berat sebelah.

## D. Yang tidak dibahas
Pajak (PPh/PPN atas jasa), kepatuhan e-commerce (PP 80/2019), perlindungan konsumen toko Klien, dan kebijakan privasi/syarat toko di frontend.
