# Kalkulasi & Formula Sistem - Pelangi Laundry

## 1. Kalkulasi Transaksi & Item

### Subtotal Item
$$\text{Subtotal}_{\text{item}} = \text{Harga Satuan} \times \text{Qty} \times \text{Multiplier}$$

- `Harga Satuan`: Mengambil nilai `linen_harga_pelanggan.harga_khusus` jika ada; jika tidak, menggunakan `master_linen.harga_default`.
- `Multiplier`: Pengali paket pada item atau `jenis_nota` (default = 1).

### Total Nota & Sisa Tagihan
$$\text{Total Nota} = \sum \text{Subtotal}_{\text{item}}$$
$$\text{Total Bersih Nota} = \text{Total Nota} - \text{Diskon}$$
$$\text{Sisa Tagihan Nota} = \text{Total Bersih Nota} - \text{DP}$$

---

## 2. Agregasi Invoice Bulanan & Range Kustom

### Invoice Bulanan Pelanggan Standar (Hotel / Reguler Non-Flat)
$$\text{Total Invoice} = \sum_{i \in \text{Nota}} \text{Total Bersih Nota}_i$$

### Invoice Pelanggan Hotel Tarif Flat
Jika `tipe == 'HOTEL'` dan `tipe_billing == 'FLAT'`:
$$\text{Total Invoice} = \text{Tarif Flat} + \sum_{j \notin \{\text{FLAT}, \text{FLAT ASLI}\}} \text{Total Bersih Nota}_j$$

### Invoice Pelanggan RS Range Tanggal Kustom
Untuk penagihan pelanggan RS pada periode $[T_{\text{mulai}}, T_{\text{akhir}}]$:
$$\text{Total Invoice}_{\text{RS}} = \sum_{k \in \text{Nota}(T_{\text{mulai}} \le \text{tanggal}_k \le T_{\text{akhir}})} \text{Total Bersih Nota}_k$$

---

## 3. Kalkulasi Penggajian Karyawan (`AbsensiGaji.tsx`)

$$\text{Total Gaji Harian} = \text{Total Hari Hadir} \times \text{Tarif Harian}$$
$$\text{Total Gaji Borongan} = \text{Total Qty Borongan} \times \text{Tarif Borongan}$$
$$\text{Gaji Kotor} = \text{Total Gaji Harian} + \text{Total Gaji Borongan} + \text{Bonus}$$
$$\text{Gaji Bersih (Take Home Pay)} = \text{Gaji Kotor} - \text{Potongan Utang}$$

---

## 4. Ringkasan Keuangan & Laba Bersih (`Laporan.tsx`)

$$\text{Total Omset} = \sum \text{Total Invoice Lunas/Proses}$$
$$\text{Total Pengeluaran Operasional} = \sum \text{Pengeluaran Harian}$$
$$\text{Total Beban Gaji} = \sum \text{Gaji Bersih Karyawan}$$
$$\text{Laba Bersih Operasional} = \text{Total Omset} - \text{Total Pengeluaran Operasional} - \text{Total Beban Gaji}$$

---

## 5. Aturan Format Mata Uang

- Pengformatan integer dengan standar lokal Indonesia (`id-ID`):
  - Input: `1000000` $\rightarrow$ Output: `"Rp 1.000.000"`
  - Input: `-50000` $\rightarrow$ Output: `"- Rp 50.000"`
- Konversi angka menjadi teks terbilang menggunakan fungsi `terbilang()` untuk cetak nota dan kwitansi.
