# Aturan Bisnis & Batasan Sistem - Pelangi Laundry

## 1. Tipe Pelanggan & Mode Penagihan

1. **HOTEL:**
   - Mendukung penagihan tarif `FLAT` (biaya bulanan tetap + opsi nota tambahan non-flat) atau `NON_FLAT` (per item).
   - Ditagih secara ketat berdasarkan periode bulanan (`YYYY-MM`).
2. **RS (Rumah Sakit):**
   - Ditagih berdasarkan Rentang Tanggal Kustom (`tanggalMulai` hingga `tanggalAkhir`).
   - Rentang bulan romawi diformat secara otomatis (misal: `V-VI` untuk periode Mei-Juni).
3. **REGULER:**
   - Ditagih per nota atau pengelompokan bulanan standar.

## 2. Aturan Penomoran Dokumen

- Penomoran dokumen untuk Invoice (`PL-INV`) dan Kwitansi (`PL-KWT`) wajib mengikuti struktur berikut:
  `[COUNTER]/PL-[TIPE_DOC]-[KODE_INVOICE]/[BULAN_ROMAWI]/[TAHUN]`
- Contoh:
  - Bulanan Hotel: `001/PL-INV-HG/VI/2026`
  - Range Kustom RS: `002/PL-INV-RS/V-VI/2026`
- **Imutabilitas (Sifat Tetap):** Setelah dibuat untuk periode/pelanggan tertentu, nomor dokumen disimpan dalam cache `invoice_numbers` dan tidak boleh berubah.

## 3. Penguncian Transaksi (`locks_payment`)

- Ketika invoice dibayar atau dikunci melalui `locks_payment`, seluruh item `nota` dalam rentang tanggal tersebut akan terkunci.
- Nota yang terkunci tidak dapat diedit, dihapus, atau dipindahkan sampai status penguncian dibatalkan oleh administrator yang berwenang.

## 4. Multiplier & Harga Khusus

- Item dalam `master_linen` dapat memiliki harga khusus per pelanggan (`linen_harga_pelanggan`).
- Jika harga khusus tersedia, nilai tersebut mengabaikan (override) `harga_default`.
- Item nota memiliki kolom `multiplier` (contoh: 1 set sprei + 2 sarung bantal).
- Formula Subtotal: `harga * qty * multiplier`.

## 5. Aturan Utang & Pembayaran Cicilan (`utang_pelanggan` & `cicilan_utang`)

- Invoice yang belum lunas dapat dicatat sebagai utang pelanggan.
- Pembayaran cicilan (`cicilan_utang`) mengurangi sisa utang secara atomik melalui fungsi database (RPC) `bayar_cicilan_utang`.

## 6. Keamanan Kode & Integritas Data

- **Tanpa Hardcode Kredensial:** Dilarang keras menyimpan API key atau password pada kode sumber, log, maupun pesan commit.
- **Operasi Atomik:** Semua penambahan counter penomoran dan transaksi utang wajib dieksekusi melalui prosedur RPC Supabase.
