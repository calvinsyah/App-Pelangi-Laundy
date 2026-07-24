# Skema Database & Kamus Data - Pelangi Laundry

## 1. Ikhtisar Relasi Entitas

Database menggunakan PostgreSQL pada platform Supabase. Row-Level Security (RLS) diaktifkan pada seluruh tabel produksi.

## 2. Spesifikasi Tabel Database

### `pelanggan`
| Kolom | Tipe Data | Batasan (Constraint) | Deskripsi |
|---|---|---|---|
| `id` | bigint | PRIMARY KEY, GENERATED | ID Pelanggan |
| `nama` | text | NOT NULL | Nama Pelanggan |
| `kode_invoice` | text | UNIQUE | Kode unik untuk penomoran dokumen (misal `HG`, `RS`) |
| `tipe` | text | CHECK (tipe IN ('HOTEL', 'REGULER', 'RS')) | Klasifikasi tipe pelanggan |
| `tipe_billing` | text | DEFAULT 'NON_FLAT' | Mode penagihan ('FLAT' atau 'NON_FLAT') |
| `tarif_flat` | numeric | DEFAULT 0 | Tarif bulanan tetap jika berstatus FLAT |
| `alamat` | text | NULLABLE | Alamat pelanggan |
| `telepon` | text | NULLABLE | Nomor telepon |
| `created_at` | timestamptz | DEFAULT now() | Waktu pembuatan record |

### `master_linen`
| Kolom | Tipe Data | Batasan (Constraint) | Deskripsi |
|---|---|---|---|
| `id` | bigint | PRIMARY KEY | ID Item Linen |
| `nama` | text | NOT NULL | Nama item linen |
| `harga_default` | numeric | NOT NULL, DEFAULT 0 | Harga standar per unit |
| `created_at` | timestamptz | DEFAULT now() | Waktu pembuatan record |

### `linen_harga_pelanggan`
| Kolom | Tipe Data | Batasan (Constraint) | Deskripsi |
|---|---|---|---|
| `id` | bigint | PRIMARY KEY | ID Harga Khusus |
| `pelanggan_id` | bigint | FOREIGN KEY -> pelanggan(id) | Pelanggan tujuan |
| `master_linen_id` | bigint | FOREIGN KEY -> master_linen(id) | Item linen tujuan |
| `harga_khusus` | numeric | NOT NULL | Harga negosiasi khusus pelanggan |
| `created_at` | timestamptz | DEFAULT now() | Waktu pembuatan record |

### `nota`
| Kolom | Tipe Data | Batasan (Constraint) | Deskripsi |
|---|---|---|---|
| `id` | text / bigint | PRIMARY KEY | ID Nota (Format `YYYYMMDD-XXXX` atau angka) |
| `kode_nota` | text | UNIQUE | Barcode / Kode unik nota |
| `pelanggan_id` | bigint | FOREIGN KEY -> pelanggan(id) | Pelanggan terkait |
| `tanggal` | date | NOT NULL | Tanggal transaksi |
| `jenis` | text | DEFAULT 'REGULER' | Kategori/jenis nota |
| `status` | text | DEFAULT 'Proses' | Status pengerjaan ('Proses', 'Selesai', 'Diambil') |
| `total` | numeric | DEFAULT 0 | Subtotal kotor |
| `diskon` | numeric | DEFAULT 0 | Potongan harga |
| `dp` | numeric | DEFAULT 0 | Uang muka yang diterima |
| `sisa` | numeric | DEFAULT 0 | Sisa pembayaran (`total - diskon - dp`) |
| `items` | jsonb | NOT NULL, DEFAULT '[]' | Array JSON item `[{idMaster, nama, qty, harga, multiplier, subtotal}]` |
| `status_pembayaran`| text | DEFAULT 'Belum Bayar' | 'Belum Bayar' atau 'Lunas' |
| `created_at` | timestamptz | DEFAULT now() | Waktu pembuatan record |

### `locks_payment`
| Kolom | Tipe Data | Batasan (Constraint) | Deskripsi |
|---|---|---|---|
| `id` | bigint | PRIMARY KEY | ID Record Lock |
| `pelanggan_id` | bigint | FOREIGN KEY -> pelanggan(id) | Pelanggan terkait |
| `bulan` | text | NULLABLE | Kunci periode bulanan (`YYYY-MM`) |
| `tanggal_mulai` | date | NULLABLE | Tanggal awal range kustom |
| `tanggal_akhir` | date | NULLABLE | Tanggal akhir range kustom |
| `status` | text | DEFAULT 'Lunas' | Status penguncian pembayaran |
| `total_tagihan` | numeric | DEFAULT 0 | Total tagihan invoice |
| `total_dibayar` | numeric | DEFAULT 0 | Total pembayaran diterima |
| `sisa_tagihan` | numeric | DEFAULT 0 | Sisa tagihan belum dibayar |
| `kwitansi_no` | text | NULLABLE | Nomor dokumen Kwitansi terkait |
| `created_at` | timestamptz | DEFAULT now() | Waktu pembuatan record |

### `invoice_numbers` & `document_counters`
- `invoice_numbers`: Menyimpan cache nomor dokumen yang sudah dibuat berdasarkan `cache_key`.
- `document_counters`: Mengelola counter urutan penomoran secara atomik per `counter_key` (contoh `INV_HG_2026`).

### `karyawan`, `absensi`, `pengeluaran_harian`, `master_kategori_pengeluaran`
- Mengelola data staf, absensi harian, tarif gaji harian vs borongan, dan biaya operasional bisnis.

## 3. Fungsi Database (RPC)

1. `generate_document_number(p_counter_key text)`: Menambah dan mengembalikan nilai urutan berikutnya secara atomik.
2. `get_dashboard_summary(p_bulan text, p_pelanggan_id bigint, p_adm_kategori text)`: Mengalkulasi total omset, pengeluaran, utang, dan laba bersih.
3. `bayar_cicilan_utang(...)`: Menambah record cicilan dan memperbarui sisa utang master secara atomik.
4. `get_unique_nota_months()`: Mengembalikan daftar bulan unik yang ada di tabel `nota`.
