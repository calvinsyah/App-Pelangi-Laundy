# Panduan Pengguna - Pelangi Laundry

Dokumen ini berisi panduan lengkap penggunaan aplikasi Pelangi Laundry untuk Admin dan Staff.

## 1. Login
- Buka aplikasi pada browser.
- Masukkan **Email** dan **Password**.
- Klik tombol **Login**.
- **Catatan Role**: 
  - **Admin**: Memiliki akses penuh ke semua fitur, termasuk menu Keuangan dan Backup.
  - **Staff**: Hanya memiliki akses ke operasional harian (Master, Transaksi, Tagihan). Menu Keuangan akan disembunyikan.

## 2. Dashboard
Halaman utama setelah login. Menampilkan ringkasan operasional:
- **Statistik Cepat**: Total nota hari ini, total tagihan, dll.
- **Grafik/Ringkasan**: Bergantung pada role (Admin dapat melihat ringkasan keuangan).

## 3. Menu Master (Data Induk)
Menu untuk mengelola data dasar yang digunakan dalam transaksi.

### 3.1. Master Pelanggan
- **Fungsi**: Mengelola data pelanggan (hotel/rumah sakit/dll).
- **Cara Penggunaan**:
  - Klik **Tambah Pelanggan** untuk memasukkan data baru.
  - Isi nama pelanggan, alamat, dan kontak.
  - **Konfigurasi Nota**: Pada setiap pelanggan, Anda dapat mengatur jenis nota apa saja yang masuk dalam perhitungan gaji untuk pelanggan tersebut.

### 3.2. Master Linen
- **Fungsi**: Mengelola daftar barang/linen beserta harganya.
- **Cara Penggunaan**:
  - Klik **Tambah Linen**.
  - Masukkan nama linen dan harga default.
  - **Kustomisasi per Pelanggan**: Setiap pelanggan dapat memiliki daftar linen sendiri dengan urutan (drag & drop) dan harga khusus yang berbeda dari harga default.

### 3.3. Master Karyawan
- **Fungsi**: Mengelola data pegawai untuk keperluan absensi dan gaji.
- **Cara Penggunaan**:
  - Klik **Tambah Karyawan**.
  - Isi nama, tipe gaji (Tetap / Borongan), dan nominal gaji pokok/rate borongan.

### 3.4. Master Jenis Nota
- **Fungsi**: Mengatur jenis layanan/nota (misal: Cuci Kering, Setrika, dll).
- **Cara Penggunaan**: Tambah, edit, atau hapus jenis nota sesuai kebutuhan operasional.

## 4. Menu Transaksi
Menu utama untuk operasional laundry harian.

### 4.1. Input Nota
- **Fungsi**: Mencatat cucian masuk.
- **Cara Penggunaan**:
  - Pilih **Pelanggan**.
  - Pilih **Jenis Nota**.
  - Tanggal nota akan terisi otomatis (bisa diubah jika perlu).
  - Masukkan jumlah/berat untuk masing-masing item linen.
  - Klik **Simpan**. Nota akan tersimpan dan siap untuk dicetak.

### 4.2. Riwayat Nota
- **Fungsi**: Melihat, mengedit, atau menghapus nota yang sudah dibuat.
- **Cara Penggunaan**:
  - Gunakan filter tanggal atau cari nama pelanggan.
  - Urutan nota default adalah dari tanggal terkecil ke terbesar.
  - Klik tombol **Edit** untuk mengubah rincian nota.
  - Klik tombol **Cetak** untuk mencetak nota fisik.

## 5. Menu Tagihan
Menu untuk mengelola penagihan ke pelanggan.

### 5.1. Tagihan (Invoice)
- **Fungsi**: Membuat tagihan kumulatif dari beberapa nota.
- **Cara Penggunaan**:
  - Pilih pelanggan dan rentang tanggal nota yang belum ditagihkan.
  - Sistem akan mengkalkulasi total tagihan.
  - Klik **Buat Tagihan / Invoice**. Invoice akan mendapatkan nomor unik.

### 5.2. Kuitansi
- **Fungsi**: Mencatat pembayaran dari invoice yang sudah dibuat.
- **Cara Penggunaan**:
  - Pilih invoice yang akan dibayar.
  - Masukkan nominal pembayaran.
  - Cetak kuitansi sebagai bukti pembayaran yang sah.

## 6. Menu Keuangan (Hanya Admin)
Menu untuk memantau arus kas dan penggajian.

### 6.1. Absensi & Gaji
- **Fungsi**: Mengelola kehadiran karyawan dan menghitung gaji otomatis.
- **Cara Penggunaan**:
  - Catat kehadiran karyawan setiap hari.
  - Sistem akan otomatis menghitung gaji berdasarkan tipe karyawan:
    - **Gaji Tetap**: Berdasarkan kehadiran bulanan.
    - **Gaji Borongan**: Dihitung dari jumlah nota/pekerjaan yang diselesaikan (berdasarkan konfigurasi nota per-pelanggan).
  - Lakukan snapshot/simpan data gaji pada periode pembayaran.

### 6.2. Pengeluaran
- **Fungsi**: Mencatat biaya operasional (listrik, deterjen, dll).
- **Cara Penggunaan**: Klik tambah pengeluaran, masukkan nominal, tanggal, dan keterangan.

### 6.3. Utang
- **Fungsi**: Mencatat utang usaha atau cicilan.
- **Cara Penggunaan**:
  - Tambah catatan utang baru.
  - Lakukan pembayaran cicilan utang melalui sistem (mengurangi saldo kas/neraca).

### 6.4. Laporan
- **Fungsi**: Melihat rekapitulasi laba rugi dan neraca keuangan.
- **Cara Penggunaan**: Tentukan bulan dan tahun untuk melihat ringkasan pemasukan (dari tagihan) dikurangi pengeluaran dan gaji.

## 7. Menu Sistem
Pengaturan tingkat lanjut.

### 7.1. Pengaturan
- **Fungsi**: Mengatur informasi toko (Nama Laundry, Alamat, Logo) untuk keperluan cetak nota/invoice.

### 7.2. Backup & Restore (Hanya Admin)
- **Fungsi**: Mengamankan data ke dalam format SQL atau merestorasi data.
- **Cara Penggunaan**:
  - Klik **Backup** untuk mengunduh seluruh database.
  - Untuk **Restore**, unggah file SQL backup. Peringatan: Restore akan menimpa data yang ada saat ini.
