# Catatan Perubahan (Changelog) Proyek & Skema - Pelangi Laundry

Seluruh pembaruan migrasi database dan perubahan arsitektur utama dicatat dalam dokumen ini.

## [2026-07-14] - Fitur Invoice Range Kustom Rumah Sakit (RS)
- **Penambahan:** Migrasi SQL `20260714000001_invoice_rs_custom_range.sql`.
- **Fitur Utama:** Mendukung penagihan berbasis rentang tanggal kustom (`tanggalMulai` hingga `tanggalAkhir`) khusus tipe pelanggan Rumah Sakit (RS).
- **Peningkatan:** Pembaruan helper `generateDocumentNumber()` pada `invoiceUtils.ts` menggunakan `toRomanMonthRange()` untuk menghasilkan nomor dokumen rentang bulan romawi (contoh: `V-VI`).

## [2026-07-13] - Konsolidasi RPC Database & Peningkatan Keuangan
- **Pembaruan RPC:** Penambahan `20260713000001_update_dashboard_rpc_for_laporan.sql` & `20260713000016_update_dashboard_rpc_adm_kategori.sql` untuk menyertakan kategori pengeluaran dalam laporan keuangan.
- **Penguncian Pembayaran:** Penambahan `20260713000003_add_pelanggan_id_to_locks.sql` dan `20260713000005_add_unique_locks_payment.sql` untuk memastikan penguncian pembayaran bulanan yang unik per pelanggan.
- **Penomoran Dokumen:** Penambahan `20260713000006_split_invoice_kwitansi.sql` yang memisahkan logika counter dokumen `PL-INV` dan `PL-KWT`. Penambahan `20260713000007_add_unique_kode_invoice.sql`.
- **Pembayaran Cicilan Utang:** Penambahan `20260713000008_rpc_bayar_cicilan_utang.sql` dan `20260713000014_fix_rpc_bayar_cicilan.sql` untuk pemrosesan cicilan utang secara atomik.
- **Penggajian:** Penambahan `20260713000012_add_gaji_snapshot_columns.sql` untuk menyimpan snapshot tarif gaji historis pada log absensi.

## [2026-07-11] - Integrasi RPC Dashboard
- **Penambahan:** Migrasi `20260711000001_dashboard_rpc.sql` yang memperkenalkan fungsi database `get_dashboard_summary()` untuk menggantikan agregasi multi-query di sisi klien.

## [Fondasi / Legacy] - Skema Dasar & Pengaturan Keamanan
- **001 - 004:** Profil pengguna, peran otentikasi, dan kebijakan RLS menyeluruh (`003_enable_rls_semua_tabel.sql`, `004_tambah_kebijakan_rls.sql`).
- **006:** Tabel harga khusus (`linen_harga_pelanggan`) dan kebijakan RLS finansial (`006_tambah_kebijakan_rls_finansial.sql`).
- **007 - 009:** Storage bucket aset (`007_storage_assets.sql`) dan konfigurasi jenis nota (`008_jenis_nota_config.sql`).
- **010 - 012:** Dukungan gaji harian vs borongan (`010_gaji_tetap_borongan.sql`), izin edit nota (`011_allow_user_edit_nota.sql`), dan konfigurasi nota linen pelanggan (`012_pelanggan_nota_linen.sql`).
