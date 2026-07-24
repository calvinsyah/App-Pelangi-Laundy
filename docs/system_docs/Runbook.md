# Panduan Operasional & Pemeliharaan (Runbook) - Pelangi Laundry

## 1. Operasi Pemeliharaan Sistem

### Backup & Ekspor Data Darurat
- Navigasi ke Halaman: `/sistem/backup` (`src/pages/sistem/Backup.tsx`).
- Ekspor Data: Klik **Export JSON** atau **Export CSV** untuk mendownload backup tabel `pelanggan`, `nota`, `master_linen`, `pengeluaran_harian`, `karyawan`, dan `absensi`.
- Simpan file backup `.json` / `.csv` pada penyimpanan terpisah yang aman.

### Restore Data Darurat
- Navigasi ke `/sistem/backup`.
- Pilih file backup JSON yang valid.
- Klik **Restore Data**. Sistem menggunakan insert atomik batch via `20260713000011_restore_import_atomic.sql` untuk memulihkan record data.

---

## 2. Alur Kerja Operator Harian

```
1. Login Kasir/Admin (/login)
2. Input Nota Baru (/transaksi/input) -> Pilih Pelanggan -> Masukkan Item & Qty -> Simpan/Cetak
3. Cek Riwayat Nota (/transaksi/riwayat) -> Pembaruan Status (Proses -> Selesai -> Diambil)
4. Input Pengeluaran Operasional (/keuangan/pengeluaran) -> Tambah Pengeluaran Harian
5. Catat Absensi Karyawan (/keuangan/gaji) -> Rekap Kehadiran & Hasil Borongan
6. Akhir Bulan / Periode Tagihan:
   - Akses /tagihan -> Filter Pelanggan & Bulan / Range Tanggal -> Cetak Rekap & Invoice
   - Akses /kuitansi -> Generate Kwitansi -> Kunci Pembayaran (locks_payment)
```

---

## 3. Masalah Umum & Solusi (Troubleshooting)

### Masalah 1: "Data sudah ada (duplikat)" saat input pelanggan atau nota
- **Penyebab:** Batasan `UNIQUE` terlanggar (misal `kode_invoice` pelanggan atau `kode_nota`).
- **Solusi:** Periksa `kode_invoice` di Master Pelanggan. Gunakan kode unik 2-5 huruf.

### Masalah 2: Nomor Invoice / Kwitansi kembali ke 001 atau tidak sekuensial
- **Penyebab:** Format kunci `counter_key` pada tabel `document_counters` berbeda atau pergantian tahun.
- **Solusi:** `counter_key` terpisah per tahun (contoh `INV_HG_2026`). Periksa record pada tabel `document_counters` dan `invoice_numbers`.

### Masalah 3: Nota tidak bisa diedit atau dihapus
- **Penyebab:** Nota berada dalam periode yang telah dikunci oleh Kwitansi / `locks_payment`.
- **Solusi:** Buka halaman `/kuitansi`, cari record kunci pembayaran pelanggan terkait, dan lakukan pembukaan kunci (unlock) jika diizinkan oleh Admin.

### Masalah 4: Error RLS ("new row violates row-level security policy")
- **Penyebab:** Sesi JWT pengguna telah kedaluwarsa atau peran pengguna pada tabel `profiles` tidak memiliki izin `authenticated`.
- **Solusi:** Logout dan login kembali untuk memperbarui token JWT Supabase.

---

## 4. Pemulihan Bencana (Disaster Recovery) & Kontak Darurat

- **Admin Database Produksi:** Hubungi Database Administrator untuk perbaikan RLS / SQL manual melalui Supabase Dashboard.
- **Rollback Repository Git:** Jika terjadi deployment yang bermasalah, lakukan revert commit terakhir:
  ```bash
  git revert HEAD
  git push origin main
  ```
