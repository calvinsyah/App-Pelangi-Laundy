# Desain UI/UX & Sistem - Pelangi Laundry

## 1. Prinsip Desain
- **Kejelasan & Efisiensi:** Penyajian data berkepadatan tinggi yang dioptimalkan untuk operator POS dan penagihan harian.
- **Umpan Balik Visual:** Indikator status berbasis warna yang jelas (Hijau untuk lunas, Kuning/Oranye untuk belum bayar/utang, Biru/Abu-abu untuk proses).
- **Tata Letak Responsif:** Navigation bar samping yang adaptif untuk layar desktop dan drawer overlay untuk perangkat seluler.

## 2. Palet Warna & Tipografi

- **Warna Utama:** Indigo (`indigo-600` / `#4F46E5`), Biru (`blue-600` / `#2563EB`)
- **Warna Status:**
  - Sukses / Lunas: Zamrud (`emerald-600` / `#059669`)
  - Peringatan / Cicilan: Amber (`amber-500` / `#D97706`)
  - Bahaya / Batal / Utang: Merah (`red-600` / `#DC2626`)
  - Netral / Latar Belakang: Slate (`slate-50` hingga `slate-900`)
- **Tipografi:** Stack font bawaan sans-serif melalui TailwindCSS (`Inter` / font sistem bawaan).

## 3. Katalogs Komponen Utama

| Komponent | Jalur File | Tanggung Jawab |
|---|---|---|
| `Layout` | `src/components/Layout.tsx` | Shell aplikasi, navigasi samping, header, pembungkus rute aktif |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | Modal konfirmasi untuk tindakan destruktif (hapus, kunci) |
| `CurrencyInput` | `src/components/CurrencyInput.tsx` | Input angka dengan format pemisah ribuan otomatis |
| `FAB` | `src/components/FAB.tsx` | Floating Action Button untuk akses cepat tindakan utama |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | Penanganan fallback saat terjadi error render React |
| `ToastProvider` | `src/components/ToastProvider.tsx` | Penyedia notifikasi pesan toast global |

## 4. Peta Halaman & Rute

```
- Login (/login)
- Dashboard (/)
- Transaksi
  ├── Input Nota (/transaksi/input)
  └── Riwayat Nota (/transaksi/riwayat)
- Tagihan & Kwitansi
  ├── Tagihan / Invoice (/tagihan)
  └── Kwitansi Pembayaran (/kuitansi)
- Keuangan
  ├── Pengeluaran Harian (/keuangan/pengeluaran)
  ├── Utang Pelanggan (/keuangan/utang)
  ├── Absensi & Gaji Karyawan (/keuangan/gaji)
  └── Laporan Keuangan (/keuangan/laporan)
- Master Data
  ├── Pelanggan (/master/pelanggan)
  ├── Linen (/master/linen)
  ├── Karyawan (/master/karyawan)
  └── Jenis Nota (/master/jenis-nota)
- Sistem
  ├── Backup & Restore (/sistem/backup)
  └── Pengaturan (/sistem/pengaturan)
```

## 5. Desain Cetak & Ekspor (`printUtils.ts`)
- **Tata Letak Invoice:** Tampilan tabulasi profesional dengan logo, rincian pelanggan, daftar item, diskon, uang muka (DP), sisa bayar, dan instruksi transfer bank.
- **Tata Letak Kwitansi:** Tampilan tanda terima pembayaran resmi dengan nomor dokumen romawi, jumlah terbilang (`terbilang`), metode pembayaran, dan blok tanda tangan.
- **Tata Letak Rekapitulasi:** Ringkasan multi-halaman yang diformat khusus untuk audit keuangan pelanggan korporat (Hotel & Rumah Sakit).
