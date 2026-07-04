# 📖 Dokumentasi Lengkap — Pelangi Laundry v24

> Dokumentasi teknis menyeluruh untuk aplikasi **Pelangi Laundry - Sistem Manajemen Laundry v24**.
> Mencakup struktur `index.html`, aturan `style.css`, fungsi & logika `script.js`, perhitungan, serta relasi antar file.

---

## 📑 Daftar Isi

1. [Gambaran Umum Aplikasi](#1-gambaran-umum-aplikasi)
2. [Arsitektur & Stack Teknologi](#2-arsitektur--stack-teknologi)
3. [Struktur `index.html` per Section](#3-struktur-indexhtml-per-section)
4. [Aturan `style.css` per Komponen](#4-aturan-stylecss-per-komponen)
5. [Logika `script.js` per Modul](#5-logika-scriptjs-per-modul)
6. [Perhitungan & Formula](#6-perhitungan--formula)
7. [Relasi `index.html` ↔ `script.js`](#7-relasi-indexhtml--scriptjs)
8. [Sistem Penyimpanan Data](#8-sistem-penyimpanan-data)
9. [Alur Penggunaan Aplikasi](#9-alur-penggunaan-aplikasi)

---

## 1. Gambaran Umum Aplikasi

**Pelangi Laundry** adalah sistem manajemen laundry berbasis web yang melayani dua tipe pelanggan utama:

| Tipe Pelanggan | Sistem Billing | Satuan |
|----------------|----------------|--------|
| 🏨 **HOTEL**   | REGULER (per pcs linen) atau FLAT (langganan bulanan) | Pcs |
| 🏥 **RS**      | REGULER per kilogram (KILOAN) | KG |

### Fitur Utama
- **Transaksi**: input nota cucian, riwayat pencarian nota
- **Tagihan**: generate invoice bulanan, cetak kuitansi, lock invoice, status pembayaran
- **Keuangan**: dashboard 8 indikator (omset, HPP, biaya adm, laba, piutang, utang, kas, modal), laporan laba rugi & neraca, pencatatan pengeluaran, manajemen utang
- **Sistem**: master data (pelanggan, linen, jenis nota, karyawan), absensi harian, hitung gaji, backup & restore data
- **Multi-Role**: `admin` (akses penuh) & `user` (hanya transaksi)

### Sistem Login
- `admin / admin` → akses semua menu (Transaksi, Tagihan, Keuangan, Sistem)
- `user / user` → hanya menu Transaksi (Input Nota & Riwayat)

---

## 2. Arsitektur & Stack Teknologi

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Frontend)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ index.html  │←→│  script.js   │←→│   style.css      │   │
│  │ (Struktur)  │  │  (Logika)    │  │  (Tampilan)      │   │
│  └─────────────┘  └──────┬───────┘  └──────────────────┘   │
│                          │                                   │
│            ┌─────────────┼─────────────┐                    │
│            ▼             ▼             ▼                    │
│     ┌────────────┐ ┌──────────┐ ┌──────────────┐           │
│     │ Supabase   │ │localStor.│ │ IndexedDB    │           │
│     │ (Cloud DB) │ │ (Cache)  │ │ (Logo biner) │           │
│     └────────────┘ └──────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Stack
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript (tanpa framework)
- **Database Cloud**: Supabase (PostgreSQL) via `@supabase/supabase-js@2` (CDN)
- **Cache Lokal**: `localStorage` untuk semua data master & transaksi
- **Storage Biner**: `IndexedDB` khusus menyimpan logo usaha (image)
- **Cetak Dokumen**: `window.open()` + `document.write()` untuk PDF/HTML printable
- **Export Excel**: HTML table dengan MIME `application/vnd.ms-excel`

### File yang Dimuat (di akhir `index.html`)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabaseClient.js"></script>  <!-- Inisialisasi klien Supabase -->
<script src="script.js" defer></script>    <!-- Logika aplikasi (defer = jalankan setelah HTML parse) -->
```

---

## 3. Struktur `index.html` per Section

File HTML berisi **1126 baris** yang dibagi menjadi beberapa blok utama:

### 3.1 Head & Resources (baris 1-10)
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pelangi Laundry - v24 Final</title>
  <link rel="stylesheet" href="style.css" />
</head>
```
- Mengatur viewport untuk responsif mobile
- Memanggil `style.css` eksternal

### 3.2 Komponen Global (baris 12-25)
| ID / Class | Fungsi |
|------------|--------|
| `#toastContainer` | Container notifikasi toast (kanan-bawah layar) |
| `#customConfirmModal` | Modal konfirmasi custom menggantikan `confirm()` native |
| `#customConfirmMessage` | Pesan teks di dalam modal konfirmasi |
| Tombol Batal & Lanjutkan | Memanggil `customConfirmRespond(false/true)` |

### 3.3 Halaman Login (`#loginPage`, baris 27-57)
```html
<div id="loginPage">
  <div class="login-box">
    <div class="login-logo">🌈</div>
    <h2>Pelangi Laundry</h2>
    <p>Sistem Manajemen Laundry v24</p>
    <div id="loginError">⚠️ Username atau Password salah!</div>
    <input type="text" id="username" placeholder="admin / user" 
           onkeydown="if (event.key === 'Enter') prosesLogin();" />
    <input type="password" id="password" placeholder="••••••"
           onkeydown="if (event.key === 'Enter') prosesLogin();" />
    <button class="btn btn-primary btn-block" onclick="prosesLogin()">Masuk →</button>
  </div>
</div>
```
- Enter key di input username/password otomatis trigger `prosesLogin()`
- `#loginError` default `display:none`, ditampilkan jika kredensial salah

### 3.4 Aplikasi Utama (`#appContent`, baris 60-812)
Diset `display: none` secara default, baru muncul setelah login sukses.

#### 3.4.1 Header (baris 62-68)
```html
<header class="no-print">
  <h1>🌈 PELANGI LAUNDRY</h1>
  <div class="header-right">
    <span class="user-badge" id="roleBadge">-</span>
    <button class="btn-sm btn-secondary" onclick="logout()">Logout</button>
  </div>
</header>
```
- `#roleBadge` diisi "👑 ADMIN" atau "👤 USER" oleh `bukaAplikasi()`
- `no-print` class menyembunyikan saat dicetak

#### 3.4.2 Navigasi Kategori & Subtab (baris 70-98)
Dua lapis navigasi:

**Layer 1: Kategori Utama** (`.nav-categories`)
| Tombol | `data-cat` | Akses |
|--------|------------|-------|
| 📊 Transaksi | `transaksi` | Semua user |
| 🧾 Tagihan | `tagihan` | Admin only |
| 💰 Keuangan | `keuangan` | Admin only |
| ⚙️ Sistem | `sistem` | Admin only |

Tombol admin-only ditandai class `admin-only` → disembunyikan via JS jika role = user.

**Layer 2: Subtab** (`.nav-subtabs`)
Diisi dinamis oleh fungsi `switchCategory(cat)` di `script.js` berdasarkan konstanta `TAB_CATEGORIES`.

#### 3.4.3 Tab: Input Nota (`#tab-nota`, baris 100-152)
Form input transaksi baru:
- `#notaTanggal` — tanggal transaksi
- `#pelangganSelect` — dropdown pelanggan (diisi oleh `renderPelangganDropdowns()`)
- `#jenisNota` — dropdown jenis nota (diisi oleh `renderJenisNotaDropdown()`)
- `#formHotel` — form khusus hotel (tabel linen dengan input qty per item)
- `#formRS` — form khusus RS (input berat KG + info tarif)
- `#tabelLinenInput` — tbody yang dirender oleh `renderFormLinenInput()`
- `#btnSimpanNota` — tombol simpan yang memanggil `simpanNotaSistem()`

#### 3.4.4 Tab: Riwayat Nota (`#tab-rekap`, baris 154-186)
Pencarian nota:
- `#cariTanggal` — filter tanggal
- `#cariPelanggan` — input teks untuk pencarian nama (auto-filter via `oninput`)
- Tombol Cari/Semua
- `#tabelRiwayatNota` — tbody diisi oleh `cariNotaSistem()`

#### 3.4.5 Tab: Invoice (`#tab-invoice`, baris 188-259)
Generate invoice bulanan:
- `#invoicePelangganSelect` — pilih pelanggan
- `#invoiceBulanSelect` — pilih bulan (`type="month"`)
- Tombol "Hitung Invoice" → `hitungDanAmbilInvoice()`
- `#invoiceListCard` — daftar nota periode
- `#invoiceResultCard` — preview invoice + tombol aksi:
  - 🔒 Lock/Unlock → `toggleLockInvoice()`
  - 💳 Status Pembayaran → `toggleStatusPembayaran()`
  - 🖨️ Cetak Linen Room → `cetakInvoice()`
  - ⬇️ Download LR → `downloadInvoice()`
  - 📥 Excel (.csv) → `downloadLinenRoomExcel()`
  - 🧾 Cetak Invoice → `cetakInvoicePelanggan()`

#### 3.4.6 Tab: Kuitansi (`#tab-kuitansi`, baris 261-281)
Cetak kuitansi resmi (legal portrait):
- `#kuitansiPelangganSelect`, `#kuitansiBulanSelect`
- Tombol Cetak → `generateKuitansi()`
- Tombol Download → `downloadKuitansi()`
- `#printKuitansiArea` — area render

#### 3.4.7 Tab: Dashboard Keuangan (`#tab-omset`, baris 283-412)
**8 finance box indikator**:
| ID Box | Isi |
|--------|-----|
| `#boxTotalOmset` | Penjualan Bersih |
| `#boxTotalHPP` | Total HPP (Harga Pokok Penjualan) |
| `#boxTotalAdm` | Biaya Administrasi & Umum |
| `#boxLabaBersih` | Laba Bersih |
| `#boxPiutang` | Piutang Usaha |
| `#boxTotalUtang` | Utang Usaha |
| `#boxKas` | Kas / Bank |
| `#boxModal` | Modal Bersih |

**Filter Pengeluaran**:
- `#filterExpMulai`, `#filterExpSelesai` — range tanggal
- `#filterExpKat` — kategori (Semua/GAS/AIR/LISTRIK/LAIN)

**Form Catat Pengeluaran**:
- `#expTanggal`, `#expKategori` (15 kategori tetap), `#expKategoriCustom` (jika LAIN-LAIN)
- `#expNominal` — input currency dengan auto-format titik (`formatCurrencyInput`)
- `#expLunas` — checkbox status pembayaran
- Tombol Simpan → `simpanBiayaOperasional()`

**Riwayat Pengeluaran**:
Tabel `#tabelRiwayatPengeluaran` diisi oleh `hitungMenejemenKeuangan()`. Per baris ada tombol Edit, Hapus, dan "Tandai Lunas" (jika belum lunas).

#### 3.4.8 Tab: Laporan (`#tab-laporan`, baris 414-432)
- Tombol View → `tampilkanLaporan()` (render laporan laba rugi + neraca)
- Tombol Download PDF → `cetakLaporan()` (buka window print)
- `#laporanContainer` — area render laporan

#### 3.4.9 Tab: Utang (`#tab-utang`, baris 434-484)
- Form catat utang baru: `#utangNama`, `#utangDari`, `#utangSampai`, `#utangCicilan`, `#utangKeterangan`
- Tombol Simpan → `simpanUtang()`
- Tabel daftar utang `#tabelDaftarUtang` dengan kolom: Nama, Periode, Cicilan/Bulan, Sisa Bulan, Sisa Total, Status, Aksi (Bayar Cicilan)

#### 3.4.10 Tab: Master Data (`#tab-master`, baris 486-701)
Berisi 5 card:
1. **Master Pelanggan** — daftar + form tambah pelanggan baru (Nama, Kode, Tipe HOTEL/RS, Billing REGULER/FLAT, Flat Rate, Tarif RS, Alamat, Kota)
2. **Master Karyawan** — tabel + form tambah (Nama, Bagian, Persentase %)
3. **Pengaturan Sistem** — tarif internal hotel, ongkos/kg, info rekening bank, nama direktur, nilai peralatan
4. **Kop Surat** — nama usaha, alamat, telepon, email, contact person, upload logo (≤2MB)
5. **Maintenance Data** — tombol "Bersihkan Nota Rusak"

Tombol di header card:
- 👔 Linen → `bukaModalMasterLinen()`
- ⚡ Jenis Nota → `bukaModalMasterJenisNota()`
- 📋 Atur Linen → `bukaModalAturLinenJenisNota()`

#### 3.4.11 Tab: Absensi (`#tab-absen`, baris 703-710)
- `#absensiTanggal` — pilih tanggal, trigger `renderAbsensiTable()`
- `#absensiContainer` — tabel absensi per karyawan dengan dropdown status (Hadir/Izin/Alpa/Libur)
- Tombol Simpan → `simpanAbsensi()`

#### 3.4.12 Tab: Gaji (`#tab-gaji`, baris 712-729)
- `#gajiTglMulai`, `#gajiTglSelesai` — range periode gaji
- Tombol Tampilkan → `tampilkanListGajiBaru()`
- `#listGajiContainer` — tabel rekap gaji + tombol Slip/Download/Edit per karyawan

#### 3.4.13 Tab: Backup (`#tab-backup`, baris 731-809)
4 aksi backup:
- 📤 **Export Semua Data** → `exportAllData()` (download JSON berisi semua tabel Supabase)
- 📥 **Import Data** → `importDataViaFile()` (upload JSON, sync ke Supabase)
- 🧹 **Backup & Bersihkan Semua** → `backupDanBersihkan()` (backup lalu hapus semua transaksi)
- 📅 **Backup Semua Bulan Belum** → `backupSemuaBulanBelum()` (hanya backup bulan yang belum di-backup)

`#backupStatusArea` menampilkan tabel status backup per bulan.

### 3.5 FAB (Floating Action Button) — Mobile Only (baris 815-823)
```html
<button class="fab" id="fabBtn" onclick="toggleFab()">
  <span class="fab-icon">+</span>
</button>
<div class="fab-menu" id="fabMenu">
  <button class="fab-item" onclick="fabAction('invoice')">🧾 Invoice</button>
  <button class="fab-item" onclick="fabAction('gaji')">💵 Gaji</button>
  <button class="fab-item" onclick="fabAction('absensi')">📅 Absensi</button>
</div>
```
- Hanya tampil di layar < 1025px (diatur di CSS)
- Di-hidden di desktop

### 3.6 Modal-Modal (baris 825-1117)
Aplikasi punya **9 modal** untuk berbagai keperluan:

| ID Modal | Fungsi |
|----------|--------|
| `#detailModal` | Detail nota (item + subtotal) |
| `#editLinenModal` | Edit transaksi nota (qty & jenis) |
| `#editBiayaModal` | Edit pengeluaran |
| `#editGajiModal` | Edit insentif/lembur/potongan gaji |
| `#editKaryawanModal` | Edit data karyawan |
| `#modalMasterLinen` | CRUD master linen |
| `#modalMasterJenisNota` | CRUD master jenis nota |
| `#modalAturLinenJenisNota` | Atur linen yang aktif per jenis nota |
| `#modalDetailPelanggan` | Edit pelanggan + daftar harga linen + urutan drag-drop |

### 3.7 Load Script (baris 1119-1124)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabaseClient.js"></script>
<script src="script.js" defer></script>
```
- `defer` memastikan script.js dijalankan setelah HTML selesai di-parse

---

## 4. Aturan `style.css` per Komponen

File CSS berisi **1004 baris** dengan tema desain modern, mobile-first, dan print-friendly.

### 4.1 Design Tokens (`:root`, baris 1-17)
```css
:root {
  --primary: #0f172a;       /* Biru navy gelap - warna utama */
  --primary-light: #1e293b;
  --accent: #3b82f6;        /* Biru terang - aksen */
  --success: #10b981;       /* Hijau - sukses/lunas */
  --danger: #ef4444;        /* Merah - hapus/error */
  --warning: #d97706;       /* Oranye - peringatan */
  --info: #0891b2;          /* Cyan - info */
  --text: #1e293b;
  --text-light: #475569;
  --border: #e2e8f0;
  --bg: #f1f5f9;            /* Background body abu muda */
  --card: #ffffff;
  --radius: 10px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.12);
}
```
Memakai CSS Custom Properties → konsistensi warna di seluruh aplikasi.

### 4.2 Reset & Body (baris 19-32)
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  font-size: 14px;
  line-height: 1.5;
  padding-bottom: 60px;     /* Space untuk FAB mobile */
}
```

### 4.3 Halaman Login (baris 34-72)
- `#loginPage` full-screen `position:fixed; inset:0` dengan gradient biru
- `.login-box` putih, rounded 16px, shadow besar, max-width 380px, terpusat

### 4.4 Header (baris 74-107)
```css
header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: #fff;
  height: 53px;
  position: sticky;         /* Menempel saat scroll */
  top: 0;
  z-index: 100;
}
```
- `.user-badge` untuk label role di header kanan

### 4.5 Container & Card (baris 109-134)
```css
.container {
  max-width: 1100px;
  margin: 160px auto 0;     /* Offset untuk header + nav sticky */
  padding: 0 15px;
}
.card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.card-title {
  border-left: 4px solid var(--accent);   /* Aksen kiri pada judul card */
  padding-left: 12px;
  color: var(--primary);
  font-weight: 700;
}
```

### 4.6 Form Controls (baris 136-192)
- `.flex-row` — layout horizontal flexbox dengan `flex-wrap:wrap`
- `.form-group` — wrapper label + input, margin-bottom 16px
- `input`, `select`, `textarea` — width 100%, border 1.5px, padding 10px 14px, transition border + box-shadow
- `:focus` — border biru + glow biru 3px
- `:disabled` — background abu, cursor not-allowed

### 4.7 Button System (baris 194-269)
```css
.btn { padding: 11px 20px; border-radius: 8px; font-weight: 600; min-height: 42px; }
.btn-primary   { background: var(--accent); }
.btn-success   { background: var(--success); }
.btn-danger    { background: var(--danger); }
.btn-warning   { background: var(--warning); }
.btn-info      { background: var(--info); }
.btn-secondary { background: #64748b; }
.btn-purple    { background: #8b5cf6; }
.btn-block     { width: 100%; }
.btn-sm        { padding: 6px 12px; font-size: 13px; min-height: 36px; }
.btn:hover     { filter: brightness(1.08); transform: translateY(-1px); }
.btn:disabled  { opacity: 0.5; cursor: not-allowed; }
.btn.loading::after { /* Spinner CSS via border + animation spin */ }
```
- Min-height 42px untuk mobile touch target (rekomendasi aksesibilitas)
- `.loading::after` menampilkan spinner putar saat tombol diklik

### 4.8 Navigation Tabs (baris 271-358)
Dua layer navigasi:

**Kategori Utama** (`.nav-categories`)
```css
.nav-categories {
  position: sticky;
  top: 53px;                /* Di bawah header */
  z-index: 99;
  background: #fff;
  overflow-x: auto;         /* Scroll horizontal di mobile */
}
.cat-btn {
  min-height: 40px;
  padding: 10px 14px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 8px;
}
.cat-btn.active {
  background: var(--primary);
  color: #fff;
}
```

**Subtab** (`.nav-subtabs`)
```css
.nav-subtabs {
  position: sticky;
  top: 105px;               /* Di bawah kategori */
  z-index: 98;
  background: #f8fafc;
}
.tab-btn.active {
  color: var(--primary);
  background: #e0e7ff;
  border-bottom: 3px solid var(--primary);
}
```

### 4.9 Tabel Linen (baris 360-385)
```css
.linen-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.linen-table th {
  background: #f8fafc;
  border-bottom: 2px solid var(--border);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.3px;
}
.linen-table td {
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
```

### 4.10 Modal System (baris 387-426)
```css
.modal {
  display: none;            /* Default hidden */
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 10000;
  padding: 15px;
  /* Saat .show: display:flex; center kanan-bawah */
}
#customConfirmModal { z-index: 20000; }  /* Selalu di atas modal lain */
.modal-content {
  background: white;
  padding: 28px;
  border-radius: 14px;
  max-width: 750px;
  max-height: 92vh;
  overflow-y: auto;
  animation: slideUp 0.25s ease;   /* Animasi muncul dari bawah */
}
```
- Animasi `slideUp` (translateY 20px → 0 + opacity 0 → 1)
- `#customConfirmModal` punya z-index 20000 agar selalu di atas modal lain

### 4.11 Badge Status (baris 428-451)
```css
.badge-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.status-unpaid  { background: var(--danger); }
.status-paid    { background: var(--success); }
.status-locked  { background: #475569; }
.status-unlocked{ background: var(--warning); }
```

### 4.12 Finance Grid (baris 453-492)
```css
.finance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.finance-box {
  padding: 22px;
  border-radius: var(--radius);
  color: white;
  background: linear-gradient(135deg, ...);
}
.bg-income  { background: linear-gradient(135deg, #10b981, #059669); }
.bg-expense { background: linear-gradient(135deg, #ef4444, #dc2626); }
.bg-profit  { background: linear-gradient(135deg, #3b82f6, #2563eb); }
```

### 4.13 Toast Notifications (baris 519-576)
```css
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.toast {
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  animation: toastIn 0.3s ease;   /* Slide dari kanan */
  min-width: 220px;
}
@keyframes toastIn  { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes toastOut { to { transform: translateX(60px); opacity: 0; } }
```

### 4.14 Responsive Breakpoints (baris 578-667)
**Mobile (max-width: 640px)**
```css
.flex-row { flex-direction: column; }
.card { padding: 16px; }
```

**Mobile Kecil (max-width: 480px)**
```css
.btn-sm { min-height: 40px; padding: 8px 10px; font-size: 12px; }
.cat-btn, .tab-btn { min-height: 44px; padding: 10px 12px; }
```

**Tablet (max-width: 768px)**
```css
.btn { min-height: 44px; }
.linen-table-wrap { display: none; }   /* Sembunyikan tabel desktop */
.linen-card-list { display: block; }   /* Tampilkan card mobile */
.sticky-save-bar {
  position: sticky;          /* Tombol simpan menempel di bawah */
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, #fff 30%);
  backdrop-filter: blur(8px);
}
```

**Desktop (min-width: 1025px)**
```css
.flex-row { flex-direction: row; }
.sticky-save-bar { position: static; }   /* Tidak perlu sticky */
.fab, .fab-menu { display: none; }       /* FAB disembunyikan */
```

### 4.15 Print Rules (baris 669-681)
```css
@media print {
  body { background: white; }
  .no-print,
  #loginPage,
  .nav-tabs,
  header,
  .modal:not(#customConfirmModal) {
    display: none !important;     /* Sembunyikan elemen non-cetak */
  }
}
```

### 4.16 Sticky Save Bar (baris 716-728)
Tombol "Simpan Transaksi" menempel di bawah layar saat scroll di mobile, dengan shadow tipis di atas border.

### 4.17 Drag & Drop Styling (baris 730-738)
```css
.linen-drag-row.dragging {
  opacity: 0.4;
  border: 2px dashed #3b82f6;
  background-color: #eff6ff;
}
.linen-drag-row.over {
  border-top: 3px solid #3b82f6;
}
```
Untuk fitur drag-drop urutan linen di modal edit pelanggan.

### 4.18 FAB (Floating Action Button) (baris 896-953)
```css
.fab {
  position: fixed;
  bottom: 78px;
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 8px 20px rgba(59,130,246,0.4), 0 4px 8px rgba(0,0,0,0.1);
  z-index: 90;
}
.fab.open {
  transform: rotate(45deg);      /* Berubah jadi X */
  background: var(--danger);
}
.fab-menu {
  position: fixed;
  bottom: 144px;
  right: 16px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: all 0.2s;
}
.fab-menu.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
```

### 4.19 Card List untuk Mobile (baris 955-986)
Saat di mobile, tabel linen diganti dengan `.linen-card-list` berisi `.linen-card-item` (layout flex horizontal dengan info di kiri dan input qty di kanan).

### 4.20 Badge Variants & Accessibility (baris 988-1002)
```css
.badge-success { background: #d1fae5; color: #065f46; }   /* AA contrast safe */
.badge-warning { background: #fef3c7; color: #78350f; }
.badge-info    { background: #cffafe; color: #0e7490; }
.badge-danger  { background: #fee2e2; color: #991b1b; }

*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

---

## 5. Logika `script.js` per Modul

File JS berisi **2872 baris** yang dibagi menjadi modul-modul berikut:

### 5.1 Custom Confirm Dialog (baris 1-16)
```javascript
let customConfirmResolve = null;
window.customConfirm = function(message) {
  return new Promise((resolve) => {
    document.getElementById('customConfirmMessage').innerText = message;
    document.getElementById("customConfirmModal").style.display = "flex";
    customConfirmResolve = resolve;
  });
};
window.customConfirmRespond = function(response) {
  document.getElementById("customConfirmModal").style.display = "none";
  if (customConfirmResolve) {
    customConfirmResolve(response);
    customConfirmResolve = null;
  }
};
```
**Fungsi**: Menggantikan `confirm()` native browser yang sering diblokir.
**Pola**: Promise-based — pemanggil menggunakan `await customConfirm("...")` untuk menunggu respons user.

### 5.2 Inisialisasi Data Default (baris 17-42)
```javascript
const DB_DEFAULTS = {
  DB_NOTA: [], DB_BIAYA: [], DB_LOCKS: {}, DB_PAYMENT_STATUS: {},
  DB_KARYAWAN: [], DB_ABSENSI: [], DB_GAJI: [], DB_BACKUP_HISTORY: [],
  DB_PENGATURAN: { 
    tarifInternalHotel: 7000, 
    ongkosPerKg: 1200, 
    direktur: "Bagus Riadi Kurniawan", 
    peralatan: 0 
  },
  DB_KOP: { nama: "", alamat: "", telepon: "", email: "", kontak: "" },
  DB_INVOICE_NUMBERS: {}, DB_INVOICE_COUNTER: {},
  DB_JENIS_NOTA: [
    { name: "REGULER", multiplier: 1, forFlat: false, forReguler: true },
    { name: "FLAT", multiplier: 1, forFlat: true, forReguler: false },
    { name: "FLAT ASLI", multiplier: 1, forFlat: true, forReguler: false },
    { name: "SPOTING", multiplier: 2, forFlat: true, forReguler: true },
    { name: "GUEST LAUNDRY", multiplier: 1, forFlat: true, forReguler: true },
    { name: "NON FLAT", multiplier: 1.5, forFlat: true, forReguler: false },
    { name: "FNB", multiplier: 1.2, forFlat: true, forReguler: false },
  ],
  DB_PELANGGAN: [ /* 3 pelanggan contoh */ ],
  DB_MASTER_LINEN: [ /* 3 linen contoh */ ],
  DB_HARGA_PELANGGAN: {},
  DB_LINEN_PELANGGAN: {},
};
Object.keys(DB_DEFAULTS).forEach((key) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(DB_DEFAULTS[key]));
});
```
**Fungsi**: Seed data awal ke localStorage hanya jika belum ada. Mencegah aplikasi crash di first run.

### 5.3 Helper: Linen per Pelanggan (baris 44-133)
Tiga fungsi utama untuk mengelola linen custom per pelanggan:

```javascript
getLinenPelanggan(pelangganId)     // Ambil daftar linen + urutan untuk pelanggan
saveLinenPelanggan(pelangganId, list)  // Simpan ke localStorage
hasLinenPelangganConfig(pelangganId)   // Cek apakah pelanggan punya konfigurasi sendiri
```

**`initLinenDragDrop(tbody)`**: Inisialisasi HTML5 drag-and-drop untuk baris tabel linen di modal edit pelanggan. Event yang dipasang:
- `dragstart` — simpan elemen sumber, tambah class `.dragging`
- `dragover` — `preventDefault()` untuk mengizinkan drop
- `dragenter` / `dragleave` — toggle class `.over`
- `drop` — hitung posisi drop (atas/bawah) berdasarkan Y cursor, lalu `insertBefore`
- `dragend` — bersihkan semua class sementara

### 5.4 Generator Kode Pelanggan (baris 136-150)
```javascript
function generateKodePelanggan(nama) {
  const GENERIC = ["HOTEL", "HOTELS", "THE", "RS", "RUMAH", "SAKIT", "TAB", "CAPSULE", "CLINIC", "VILLA", "RESORT", "APARTEMEN"];
  const kata = (nama || "").toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  let kode = "";
  for (const k of kata) {
    if (GENERIC.includes(k)) continue;
    kode += k[0];
    if (kode.length >= 5) break;
  }
  return kode || (kata[0] ? kata[0].substring(0, 3) : "PL");
}
```
**Aturan**: Ambil huruf pertama setiap kata yang BUKAN kata generik (HOTEL, RS, dll). Contoh:
- "Tab Capsule Hotel Kayoon" → "K" (hanya "Kayoon" yang tidak generik)
- "Hotel Great" → "G"
- "RS Siti Khodijah" → "SK"

### 5.5 Migrasi & Helper Invoice Number (baris 152-186)
```javascript
function toRoman(monthNum) { /* 1→I, 2→II, ..., 12→XII */ }

async function getInvoiceStableNumber(kode, bln) {
  // Format: 001/PL-GDS/VII/2025
  // - urut: counter per (kode, tahun)
  // - PL-{kode}: kode pelanggan
  // - toRoman(bulan): bulan Romawi
  // - tahun
  // Caching via localStorage DB_INVOICE_NUMBERS & DB_INVOICE_COUNTER
  // Sync ke Supabase tabel invoice_numbers & invoice_counter
}

async function setCounterAwalPelanggan(kode, tahun, nilai) {
  // Set manual counter awal (untuk sinkronisasi dengan invoice fisik)
}
```

**Format nomor invoice**: `XXX/PL-KODE/BULAN_ROMAWI/TAHUN`
Contoh: `001/PL-GDS/VII/2025` = Invoice #1 untuk pelanggan kode GDS bulan Juli 2025.

### 5.6 IndexedDB untuk Logo (baris 192-221)
```javascript
function openKopDB() {
  // Buka database "PelangiLaundry" dengan object store "logo"
}
async function saveLogoToIndexedDB(file) {
  // Konversi file → dataURL → simpan ke IndexedDB
}
async function getLogoFromIndexedDB() {
  // Ambil logo dari IndexedDB, return dataURL atau object URL
}
```
Logo disimpan di IndexedDB (bukan localStorage) karena ukuran bisa besar (base64 image).

### 5.7 Helper Utilities (baris 223-262)
```javascript
function toast(msg, type = "success", dur = 3000) {
  // Buat elemen toast, tambahkan ke #toastContainer, hapus setelah dur ms
}
function loadingThen(label, asyncFn) {
  // Tampilkan toast info + jalankan asyncFn dengan error handling
}
function formatCurrencyInput(input) {
  // Format inputan user jadi "1.000.000" (titik ribuan)
  let v = input.value.replace(/\D/g, "");
  input.value = v ? parseInt(v).toLocaleString("id-ID") : "";
}
function parseCurrencyValue(str) {
  // Parse "1.000.000" → 1000000 (number)
  return parseInt(str.toString().replace(/\./g, "").replace(/[^\d]/g, "")) || 0;
}
function fmtRp(val) {
  // Format number → "Rp 1.000.000" (dengan handle negatif)
  const abs = Math.abs(val);
  const sign = val < 0 ? "- " : "";
  return sign + "Rp " + Math.floor(abs).toLocaleString("id-ID");
}
function terbilang(angka) {
  // Konversi angka → teks bahasa Indonesia
  // 125000 → "seratus dua puluh lima ribu"
  // Rekursif untuk belasan, puluhan, ratusan, ribuan, juta, milyar
}
function generateNotaId(tgl) {
  // Generate ID unik nota: "20250705-1234" (tanggal + random 4 digit)
  return `${tgl.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
}
function setBtnLoading(btn, loading) {
  // Toggle class .loading + disabled pada tombol
}
```

### 5.8 Login & Aplikasi (baris 270-291)
```javascript
function prosesLogin() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  if ((u === "admin" && p === "admin") || (u === "user" && p === "user")) {
    currentUserRole = u;
    document.getElementById("loginError").style.display = "none";
    bukaAplikasi();
  } else {
    document.getElementById("loginError").style.display = "block";
  }
}
```

**`bukaAplikasi()`**:
1. Sembunyikan `#loginPage`, tampilkan `#appContent`
2. Set `#roleBadge` = "👑 ADMIN" atau "👤 USER"
3. Toggle visibility elemen `.admin-only` (sembunyikan jika user, tampilkan jika admin)
4. Set tanggal default (hari ini) untuk semua input date
5. Set range default filter pengeluaran (awal bulan → hari ini)
6. Set range default gaji (hari ini → 13 hari ke depan)
7. Set bulan default untuk invoice/kuitansi
8. Panggil `refreshDataSistem()` untuk sinkronisasi awal
9. Panggil `cekPeringatanBackup()` untuk cek bulan belum di-backup
10. Pindah ke tab "Input Nota"

### 5.9 Refresh Data Sistem (baris 314-340)
Fungsi kritis: `refreshDataSistem()` mengambil semua data dari Supabase secara paralel dengan `Promise.all()`:

```javascript
const [jn, pl, ml, kr, ab, pg, kp, hp, invNum, invCnt, payStat, lk, ut, bh, lpRes] = await Promise.all([
  db.from("jenis_nota").select("*"),
  db.from("pelanggan").select("*"),
  db.from("master_linen").select("*"),
  db.from("karyawan").select("*"),
  db.from("absensi").select("*"),
  db.from("pengaturan").select("*").limit(1),
  db.from("kop").select("*").limit(1),
  db.from("harga_pelanggan").select("*"),
  db.from("invoice_numbers").select("*"),
  db.from("invoice_counter").select("*"),
  db.from("payment_status").select("*"),
  db.from("locks").select("*"),
  db.from("utang").select("*"),
  db.from("backup_history").select("*"),
  db.from("linen_pelanggan").select("*"),
]);
```

Lalu mapping setiap tabel ke format JS dan menyimpan ke localStorage sebagai cache. Setelah refresh:
- Render semua dropdown & tabel
- Set nilai input pengaturan & kop
- Tampilkan logo dari IndexedDB
- Hitung keuangan & render daftar utang

### 5.10 Render Dropdown (baris 342-360)
```javascript
function renderPelangganDropdowns() {
  // Isi 3 dropdown: #pelangganSelect, #invoicePelangganSelect, #kuitansiPelangganSelect
  // Format: "🏨 Nama Hotel" atau "🏥 Nama RS"
  // Pertahankan selected value jika masih ada
}
function renderJenisNotaDropdown(selected = null) {
  // Filter jenis nota berdasarkan tipe & billing pelanggan:
  // - RS → hanya "KILOAN" (disabled)
  // - HOTEL FLAT → hanya yang forFlat=true
  // - HOTEL REGULER → hanya yang forReguler=true
}
function cekTipePelangganInput() {
  // Toggle #formHotel / #formRS berdasarkan tipe pelanggan terpilih
  // Tampilkan info tarif RS jika pelanggan RS
}
```

### 5.11 Render Form Input Linen (baris 370-401)
```javascript
function renderFormLinenInput() {
  // 1. Dapatkan jenis nota & multiplier
  // 2. Dapatkan pelanggan & pelangganId
  // 3. Dapatkan linen_ids yang diatur untuk jenis nota ini
  // 4. Jika linen_ids kosong → tampilkan peringatan "Atur Linen dulu"
  // 5. Irisan: linen per-pelanggan (sorted by urutan) ∩ linen_ids jenis nota
  // 6. Render baris tabel dengan: nomor, nama, harga satuan, input qty
  //    - data-id, data-name, data-price untuk dipakai simpanNotaSistem
}
```

**Aturan irisan linen**:
- Pelanggan mengatur urutan & subset linen mereka sendiri (via `linen_pelanggan`)
- Jenis nota memfilter subset mana yang aktif untuk jenis transaksi ini
- Hasil akhir = irisan keduanya

### 5.12 Simpan Nota (baris 403-441)
```javascript
async function simpanNotaSistem() {
  setBtnLoading(btn, true);
  try {
    // 1. Validasi tanggal & pelanggan
    // 2. Branch berdasarkan tipe pelanggan:
    //    a. RS: total = berat (KG) × tarifRS
    //    b. HOTEL:
    //       - Kalkulasi subtotal per item: qty × hargaSatuan (sudah termasuk multiplier)
    //       - Validasi tidak ada qty negatif
    //       - Validasi total > 0
    //       - Jika FLAT + jenis "FLAT": total diset 0 (gratis, sudah cover flat rate)
    // 3. Generate notaId: "YYYYMMDD-XXXX"
    // 4. Insert ke Supabase tabel nota
    // 5. Reset form & refresh data
    // 6. Update riwayat & keuangan
  } finally { setBtnLoading(btn, false); }
}
```

### 5.13 Cari Nota (baris 443-501)
```javascript
async function cariNotaSistem() {
  // 1. Ambil filter tanggal & nama pelanggan
  // 2. Query Supabase: db.from("nota").select("*").order("tanggal").order("id")
  // 3. Filter tambahan by nama pelanggan di sisi JS (karena relasi)
  // 4. Render baris tabel dengan kolom: No Nota, Tanggal, Pelanggan, Jenis, Total, Aksi
  // 5. Aksi: Detail, Edit, (Hapus khusus admin)
}
```

### 5.14 Lock & Status Invoice (baris 503-547)
```javascript
function getLockKey(pel, bln) { return `${pel}_${bln}`; }
function isInvoiceLocked(pel, bln) { /* cek DB_LOCKS */ }

async function toggleLockInvoice() {
  // Toggle is_locked di Supabase + localStorage
  // Update badge LOCKED/UNLOCKED
  // Re-render invoice
}

async function toggleStatusPembayaran() {
  // Toggle is_paid di Supabase tabel payment_status
  // Update badge BELUM DIBAYAR/LUNAS
  // Recalculate keuangan (karena piutang berubah)
}
```

### 5.15 Hitung Ulang Nota (baris 549-559)
```javascript
function hitungUlangNota(nota) {
  // Re-calculate total nota berdasarkan harga & multiplier TERBARU
  // Dipakai saat invoice ditampilkan jika belum di-lock
  // - Cari multiplier dari jenisNotaList
  // - Cari data pelanggan
  // - Untuk setiap item: update basePrice + recalc subtotal
  // - Update nota.total
}
```

### 5.16 Hapus Nota (baris 561-571)
```javascript
async function hapusNotaDariInvoice(id, asal) {
  if (!await window.customConfirm("Hapus nota ini?")) return;
  await db.from("nota").delete().eq("id", id);
  await refreshDataSistem();
  if (asal === "invoice") hitungDanAmbilInvoice();
  else await cariNotaSistem();
  await hitungMenejemenKeuangan();
}
```

### 5.17 Hitung & Ambil Invoice (baris 573-611)
```javascript
function hitungDanAmbilInvoice() {
  // 1. Filter DB_NOTA by pelanggan & bulan
  // 2. Jika kosong → tampilkan toast warning
  // 3. Update badge lock
  // 4. Jika invoice TIDAK terkunci → hitungUlangNota (recalc dengan harga terbaru)
  // 5. Untuk pelanggan FLAT:
  //    - Jika jenis nota "FLAT" atau "FLAT ASLI" → total diset 0
  //    - Tambahkan baris "Biaya Langganan Flat Bulanan" = flatRate
  // 6. Untuk pelanggan REGULER → total = sum semua nota
  // 7. Render tabel invoice + preview print
  // 8. Update badge status pembayaran
}
```

### 5.18 Generate Kop Surat HTML (baris 613-637)
```javascript
async function generateKopHTML() {
  // Ambil logo dari IndexedDB
  // Ambil data kop dari localStorage DB_KOP
  // Return HTML dengan:
  //   - Logo (kiri, max 65px height)
  //   - Nama usaha (huruf besar, bold, biru navy)
  //   - Alamat, telepon, email, contact person
  //   - Border bawah 3px double #1e3a5f
}
```

### 5.19 Cetak Invoice (Linen Room) (baris 639-688)
Tiga fungsi terkait:
```javascript
async function cetakInvoice()         // Buka window print untuk Linen Room
async function downloadInvoice()      // Download HTML Linen Room
async function downloadLinenRoomExcel() // Download sebagai .xls (Excel)
```

### 5.20 Build Linen Room HTML (baris 690-734)
```javascript
async function buildLinenRoomHTML(pel, bln, logoUrl) {
  // 1. Generate kop HTML
  // 2. Filter nota by pelanggan & bulan
  // 3. Buat grid linen: { linenId: { name, price, qty: {1..31} } }
  //    - Inisialisasi qty 1-31 = 0 untuk setiap linen
  // 4. Untuk setiap nota:
  //    - Skip jika FLAT customer & jenis nota bukan FLAT/FLAT ASLI
  //    - Tambah qty per item ke kolom hari yang sesuai
  // 5. Render tabel dengan:
  //    - Kolom: No, Items, Price, Tanggal 1-31, Total (qty), Amount (qty × price)
  //    - Baris terakhir: TOTAL KESELURUHAN dengan sum per kolom hari
}
```

**Linen Room** adalah rekap harian per linen untuk satu bulan. Format ini khusus untuk pelanggan hotel agar linen room mereka bisa cross-check dengan catatan internal.

### 5.21 Cetak Invoice Pelanggan (baris 736-915)
```javascript
async function cetakInvoicePelanggan() {
  // Buka window print untuk Invoice resmi (format Indonesia)
}

async function buildInvoicePelangganHTML(pel, bln, kopHTML) {
  // 1. Hitung totals per jenis nota
  // 2. Untuk pelanggan FLAT:
  //    - "Biaya Langganan Flat Bulanan" = flatRate
  //    - Skip FLAT/FLAT ASLI dari detail (sudah dicakup)
  // 3. Untuk jenis lain → tampilkan dengan label:
  //    - FLAT → "Biaya Langganan Flat Bulanan"
  //    - NON FLAT → "Cucian Non Flat (Perincian Terlampir)"
  //    - FNB → "Cucian F & B (Perincian Terlampir)"
  //    - SPOTING → "Spotting / Treatment (Perincian Terlampir)"
  // 4. Generate nomor invoice via getInvoiceStableNumber
  // 5. Return HTML lengkap dengan:
  //    - Kop surat
  //    - "INVOICE" header
  //    - Date & Invoice Number
  //    - Attention To (nama, alamat, kota pelanggan)
  //    - Detail Invoice (tabel No, Description, Total Amount)
  //    - Total row
  //    - TERBILANG (dalam huruf)
  //    - Payment Information (bank, account name, account number)
  //    - Signature box (direktur)
}
```

### 5.22 Generate Kuitansi (baris 917-1093)
```javascript
async function buildKuitansiHTML(pel, bln, logoUrl) {
  // 1. Hitung total tagihan (sama seperti invoice)
  // 2. Generate nomor kuitansi (= nomor invoice, dipakai bersama)
  // 3. Tentukan deskripsi berdasarkan tipe pelanggan:
  //    - RS: "Biaya Cuci Linen mulai tgl. X - Y = Z kg @ Rp.tarif,- (Perincian terlampir)"
  //    - HOTEL FLAT: "Biaya Cuci Linen Bulan [Bulan] [Tahun]"
  //    - HOTEL REGULER: "Biaya Cuci Linen Bulan [Bulan] [Tahun] (Perincian Terlampir)"
  // 4. Return HTML legal portrait (215.9mm × 355.6mm) dengan:
  //    - Kop surat
  //    - Tabel: KWITANSI No., TERIMA DARI, SEBESAR (terbilang), UNTUK PEMBAYARAN
  //    - Box "TERBILANG: Rp X.XXX,-"
  //    - Payment Transfer info (jika ada)
  //    - Signature box (Surabaya, [tgl] / [direktur])
}
```

### 5.23 Slip Gaji (baris 1095-1180)
```javascript
async function viewSlipGaji(kId, mulai, selesai) {
  // Buka window print slip gaji per karyawan
}
async function downloadSlipGaji(kId, mulai, selesai) {
  // Download slip gaji sebagai HTML
}
async function buildSlipGajiHTML(kId, mulai, selesai, logoUrl) {
  // Return HTML slip gaji:
  //   - Kop surat
  //   - "SLIP UPAH KARYAWAN"
  //   - Info: Nama, Bagian, Periode
  //   - Tabel: Upah Kerja, Insentif, Lembur, Potongan, Total Diterima
  //   - Terbilang
  //   - REKAPITULASI HARIAN: Tanggal, Status, Kg, Ongkos, Hadir, Upah
}
```

### 5.24 Hitung Manajemen Keuangan (baris 1196-1339) ⭐ FUNC INTI
```javascript
async function hitungMenejemenKeuangan() {
  showLoading("Menghitung keuangan...");
  try {
    // 1. Ambil semua nota & biaya dari Supabase (dengan filter tanggal)
    // 2. Ambil payment_status untuk cek lunas/belum
    
    // 3. Hitung total pendapatan per bulan per pelanggan:
    const totalInvoiceOf = (pData, bln, arrNota) => {
      // Untuk FLAT customer:
      //   - Skip nota FLAT/FLAT ASLI (sudah dicakup flat rate)
      //   - Tambah flatRate
      // Untuk REGULER: sum semua nota
    };
    
    // 4. Penjualan = sum totalInvoiceOf semua pelanggan semua bulan
    // 5. PendapatanLunas = sum yang isLunas=true
    
    // 6. Hitung HPP (Harga Pokok Penjualan):
    const hpp = {
      gajiKaryawan: sumByKat("GAJI BORONGAN"),
      listrik: sumByKat("LISTRIK 1") + sumByKat("LISTRIK 2"),
      gas: sumByKat("GAS"),
      air: sumByKat("AIR"),
      chemical: sumByKat("CHEMICAL"),
      bbm: sumByKat("BBM"),
      plastik: sumByKat("PLASTIK"),
      pph: sumByKat("PPH PS 23"),
    };
    
    // 7. Hitung Biaya Adm & Umum:
    const biayaAdm = {
      gajiTetap: sumByKat("GAJI TETAP"),
      makan: sumByKat("MAKAN"),
      perawatanMesin: sumByKat("PERAWATAN MESIN"),
      iuranSampah: sumByKat("IURAN SAMPAH"),
      iuranRT: sumByKat("IURAN RT"),
      lainLain: sumByKat("LAIN-LAIN"),
    };
    
    // 8. Laba Bersih = Penjualan - HPP - Biaya Adm
    
    // 9. Piutang = sum tagihan yang BELUM lunas
    // 10. Utang = biaya belum lunas + sisa cicilan utang aktif
    // 11. Kas = PendapatanLunas - biaya yang sudah dibayar
    // 12. Modal = Kas + Piutang + Peralatan - Utang
    
    // 13. Update 8 box keuangan
    // 14. Render tabel riwayat pengeluaran
  } finally { hideLoading(); }
}
```

### 5.25 Laporan Laba Rugi & Neraca (baris 1341-1430)
```javascript
async function tampilkanLaporan() {
  // 1. Pastikan hitungMenejemenKeuangan sudah jalan
  // 2. Parse nilai dari 8 box keuangan
  // 3. Render 2 tabel:
  //    a. Laporan Laba Rugi:
  //       - PENJUALAN: Penjualan Jasa
  //       - HPP: Total HPP
  //       - LABA KOTOR = Penjualan - HPP
  //       - BIAYA ADM & UMUM
  //       - LABA BERSIH = Laba Kotor - Biaya Adm
  //    b. Neraca:
  //       - ASET: Kas/Bank + Piutang + Peralatan = Total Aset
  //       - KEWAJIBAN: Utang Usaha
  //       - MODAL: Modal Bersih
  //       - Aset = Kewajiban + Modal
}

async function cetakLaporan() {
  // Buka window print laporan
}
```

### 5.26 CRUD Biaya Operasional (baris 1432-1510)
```javascript
async function simpanBiayaOperasional() {
  // 1. Validasi: tgl, kategori, nominal > 0
  // 2. Jika kategori "LAIN-LAIN" → ambil dari input custom
  // 3. Insert ke Supabase tabel biaya
  // 4. Recalc keuangan
}
async function bukaEditBiaya(id)     // Buka modal edit
async function simpanEditBiaya()     // Update ke Supabase
async function hapusBiaya(id)        // Delete dengan konfirmasi
async function tandaiLunasBiaya(id)  // Set lunas=true
```

### 5.27 Detail & Edit Nota (baris 1512-1610)
```javascript
function bukaModalDetail(id) {
  // Ambil nota dari localStorage, tampilkan item + subtotal + total
}

async function bukaModalEditLinen(id) {
  // 1. Ambil nota dari Supabase
  // 2. Sync ke localStorage cache
  // 3. Jika RS: tampilkan input berat KG
  // 4. Jika HOTEL: render daftar linen (valid + legacy)
  //    - Legacy item = item lama yang tidak lagi valid di jenis nota
  //    - Tetap ditampilkan dengan highlight kuning "⚠ ITEM LAMA"
  // 5. Pasang event listener untuk preview total realtime
}

async function simpanPerubahanQtyNota() {
  // 1. Ambil nota dari Supabase
  // 2. Branch tipe pelanggan:
  //    a. HOTEL FLAT + jenis FLAT: items disimpan dengan basePrice=0, subtotal=0
  //    b. RS: total = berat × tarifRS, items = [{Cucian RS, kg, KG, tarifRS, total}]
  //    c. Lainnya: items = linen yang qty > 0 dengan harga terbaru
  // 3. Update Supabase
  // 4. Refresh data + re-render
}
```

### 5.28 Master Linen (baris 1612-1664)
```javascript
function renderMasterLinenTable()    // Render tabel master linen dengan inline edit
async function tambahLinen()         // Insert ke master_linen
async function updateLinen(id)       // Update nama linen
async function hapusLinen(id)        // Delete dengan konfirmasi
```

### 5.29 Master Jenis Nota (baris 1666-1714)
```javascript
function renderMasterJenisNotaTable()  // Render dengan inline edit
async function addMasterJenisNota() {
  // Insert: { name, multiplier, for_flat, for_reguler }
}
async function updateMasterJenisNota(idx)  // Update by name (primary key)
async function deleteMasterJenisNota(idx)  // Delete dengan konfirmasi
```

### 5.30 Atur Linen per Jenis Nota (baris 1716-1795)
```javascript
function bukaModalAturLinenJenisNota() {
  // 1. Cek admin (akses ditolak jika user)
  // 2. Validasi: masterLinen & jenisNotaList tidak kosong
  // 3. Populate dropdown jenis nota
  // 4. Tampilkan modal
}

function renderCheckboxLinen() {
  // Render semua master linen sebagai checkbox
  // Centang yang sudah ada di jData.linenIds
}

async function simpanAturLinen() {
  // Update linen_ids (array) di tabel jenis_nota
  // Update state lokal + localStorage
  // Re-render form input linen
}
```

### 5.31 Master Pelanggan (baris 1797-2115)
```javascript
function renderDaftarPelanggan() {
  // Smart search: filter by name / kode
  // Render card per pelanggan dengan tombol Edit & Hapus
}

async function tambahPelangganBaru() {
  // Insert: { nama, kode, tipe, billing_system, flat_rate, tarif_rs, alamat, kota }
  // Kode auto-generate jika kosong
}

function autoIsiKodeBaru() {
  // Auto-isi kode pelanggan dari nama (jika input kode kosong)
}

async function hapusPelanggan(id) {
  // Delete dengan konfirmasi
  // Hapus juga harga pelanggan terkait
}

async function bukaModalEditPelanggan(id) {
  // 1. Isi form edit dengan data pelanggan
  // 2. Toggle input flat rate / tarif RS berdasarkan tipe & billing
  // 3. Set counter awal invoice
  // 4. Render tabel harga linen:
  //    - Baris yang sudah ada di daftar (sorted by urutan)
  //    - Baris yang belum masuk daftar
  //    - Checkbox "aktif" untuk toggle linen ini di daftar pelanggan
  //    - Input harga dengan formatCurrencyInput
  //    - Draggable untuk urutan
  // 5. Inisialisasi drag & drop
}

async function simpanDetailPelanggan() {
  // 1. Update tabel pelanggan
  // 2. Hapus + insert ulang harga_pelanggan
  // 3. Simpan urutan linen per-pelanggan ke linen_pelanggan
  // 4. Set counter awal invoice jika diisi
  // 5. Refresh data
}
```

### 5.32 Master Karyawan (baris 2137-2196)
```javascript
function renderMasterKaryawanTable()  // Render tabel karyawan
async function tambahKaryawan()       // Insert { nama, bagian, persentase }
function openEditKaryawanModal(id)    // Buka modal edit
async function updateKaryawanFromModal()  // Update Supabase
async function hapusKaryawan(id)      // Delete dengan konfirmasi
```

### 5.33 Pengaturan Global & Kop Surat (baris 2198-2256)
```javascript
async function simpanPengaturanGlobal() {
  // Update tabel pengaturan (id=1):
  //   - tarif_internal_hotel, ongkos_per_kg
  //   - rekening_name, rekening_no, bank
  //   - direktur, peralatan
}

async function simpanKopSurat() {
  // Update tabel kop (id=1):
  //   - nama, alamat, telepon, email, kontak
  // Jika ada file logo baru:
  //   - Validasi ukuran ≤ 2MB
  //   - Simpan ke IndexedDB
}

async function handleLogoUpload(input) {
  // Preview logo sebelum simpan
}

async function previewLogoFromDB() {
  // Tampilkan logo dari IndexedDB
}
```

### 5.34 Absensi (baris 2258-2288)
```javascript
function renderAbsensiTable() {
  // Untuk setiap karyawan, tampilkan dropdown status (Hadir/Izin/Alpa/Libur)
  // Default "Hadir" jika belum ada absensi
}

async function simpanAbsensi() {
  // Untuk setiap karyawan:
  //   - Delete absensi lama di tanggal tsb
  //   - Insert absensi baru
}
```

### 5.35 Hitung Gaji (baris 2290-2360) ⭐ FUNC INTI
```javascript
function hitungKgHarian(transaksiPeriode, tarifInternal, tglMulai, tglSelesai) {
  // Hitung total KG per tanggal:
  //   - HOTEL FLAT + jenis FLAT → skip (sudah dicakup flat)
  //   - RS → kg = sum qty items
  //   - HOTEL → kg = total / tarifInternal (estimasi KG dari rupiah)
}

async function tampilkanListGajiBaru() {
  // 1. Filter DB_NOTA dalam periode
  // 2. Hitung kgHarian
  // 3. Ambil ongkos per kg dari pengaturan
  // 4. Ambil data gaji tersimpan (untuk insentif/lembur/potongan)
  // 5. Untuk setiap karyawan:
  //    - Loop setiap hari dalam periode
  //    - Cek absensi: jika "Hadir" → upah = (kg × ongkos) / jumlahKaryawanHadir
  //    - Akumulasi totalUpah
  //    - totalDiterima = totalUpah + insentif + lembur - potongan
  // 6. Render tabel rekap + tombol Slip/Download/Edit
}
```

### 5.36 Edit Gaji (baris 2362-2392)
```javascript
function editGajiKaryawan(kId, mulai, selesai) {
  // Set _gajiAktif = { karyawanId, periodeMulai, periodeSelesai, gajiId }
  // Buka modal edit insentif/lembur/potongan
}

async function simpanEditGajiBaru() {
  // Jika gajiId ada → update, jika tidak → insert
}
```

### 5.37 Backup System (baris 2394-2480)
```javascript
function getBackupHistory()         // Ambil array bulan yang sudah di-backup
function renderBackupStatus()       // Render tabel status backup per bulan

async function backupBulan(bln) {
  // 1. Konfirmasi user
  // 2. Backup semua key localStorage ke satu file JSON
  // 3. Download file: pelangi_backup_YYYY-MM.json
  // 4. Hapus data bulan tsb dari Supabase (nota, biaya, absensi, gaji)
  // 5. Hapus dari localStorage
  // 6. Catat ke backup_history
}

async function backupSemuaBulanBelum() {
  // Backup semua bulan yang belum pernah di-backup sekaligus
}

async function backupDanBersihkan() {
  // Backup SEMUA data + hapus SEMUA transaksi (master tetap aman)
}

async function exportAllData() {
  // Export semua 18 tabel Supabase ke satu file JSON
}

async function handleFileImport(input) {
  // 1. Parse JSON
  // 2. Deteksi format:
  //    a. Format exportAllData (langsung tabel Supabase) → upsert langsung
  //    b. Format backupBulan (DB_XXX keys) → transform dulu, lalu upsert
  // 3. Sync ke localStorage
  // 4. Reload page
}
```

### 5.38 Bersihkan Nota Rusak (baris 2568-2586)
```javascript
async function bersihkanNotaRusak() {
  // 1. Ambil semua nota dari Supabase
  // 2. Filter: nota tanpa items atau items kosong
  // 3. Delete nota rusak tersebut
  // 4. Bersihkan juga dari localStorage cache
}
```

### 5.39 Peringatan Backup (baris 2588-2598)
```javascript
function cekPeringatanBackup() {
  // Cek apakah ada transaksi bulan lalu yang belum di-backup
  // Jika ya → tampilkan toast warning
}
```

### 5.40 Manajemen Utang (baris 2600-2680)
```javascript
function getUtangList() / saveUtangList(list)

async function simpanUtang() {
  // 1. Validasi: nama, dari, sampai, cicilan > 0
  // 2. Validasi: sampai >= dari
  // 3. Hitung total bulan = (thn2-thn1)*12 + (bln2-bln1) + 1
  // 4. Insert ke Supabase: { nama, dari, sampai, cicilan, keterangan, sisa_bulan, status: AKTIF }
}

function renderDaftarUtang() {
  // Smart search by nama / keterangan
  // Render tabel dengan kolom: Nama, Periode, Cicilan/Bulan, Sisa Bulan, Sisa Total, Status, Aksi
}

async function bayarCicilan(id) {
  // 1. Konfirmasi
  // 2. Insert ke tabel biaya: kategori="CICILAN UTANG", nominal=cicilan, lunas=true
  // 3. Update utang: sisa_bulan - 1, status = "LUNAS" jika sisa = 0
  // 4. Refresh data + recalc keuangan
}
```

### 5.41 Navigasi Tab (baris 2682-2730)
```javascript
const TAB_CATEGORIES = {
  transaksi: { label: "TRANSAKSI", tabs: [["tab-nota", "📝 Input Nota"], ["tab-rekap", "🔍 Riwayat Nota"]] },
  tagihan:   { label: "TAGIHAN",   tabs: [["tab-invoice", "🧾 Invoice"], ["tab-kuitansi", "📄 Kuitansi"]] },
  keuangan:  { label: "KEUANGAN",  tabs: [["tab-omset", "📊 Dashboard"], ["tab-laporan", "📋 Laporan"], ["tab-utang", "📉 Utang"], ["tab-gaji", "💵 Gaji"]] },
  sistem:    { label: "SISTEM",    tabs: [["tab-master", "🛠️ Master Data"], ["tab-absen", "📅 Absensi"], ["tab-backup", "💾 Backup"]] },
};

function switchCategory(cat) {
  // 1. Update active state + aria-selected untuk tombol kategori
  // 2. Render subtab dinamis berdasarkan TAB_CATEGORIES[cat]
  // 3. Auto-switch ke subtab pertama
}

async function switchTab(tabId) {
  // 1. Sembunyikan semua .tab-content
  // 2. Tampilkan tab aktif
  // 3. Update aria-selected + active untuk .tab-btn
  // 4. Trigger fungsi inisialisasi per tab:
  //    - tab-rekap → cariNotaSistem()
  //    - tab-gaji → tampilkanListGajiBaru()
  //    - tab-omset → hitungMenejemenKeuangan()
  //    - tab-utang → renderDaftarUtang()
  //    - tab-absen → renderAbsensiTable()
  //    - tab-backup → renderBackupStatus()
  //    - tab-laporan → tampilkanLaporan()
  //    - tab-master → renderDaftarPelanggan() + renderMasterLinenTable() + renderMasterJenisNotaTable()
  // 5. Setup FAB untuk tab aktif
}
```

### 5.42 FAB Management (baris 2732-2770)
```javascript
const FAB_CONFIG = {
  "tab-nota":     { icon: "✓", label: "Simpan",            onclick: "simpanNotaSistem()",         variant: "success" },
  "tab-rekap":    { icon: "🔍", label: "Cari",              onclick: "cariNotaSistem()",            variant: "primary" },
  "tab-invoice":  { icon: "🖱️", label: "Hitung Invoice",    onclick: "hitungDanAmbilInvoice()",     variant: "primary" },
  "tab-kuitansi": { icon: "🖨️", label: "Cetak Kuitansi",    onclick: "generateKuitansi()",          variant: "success" },
  "tab-omset":    { icon: "💸", label: "Catat Pengeluaran", onclick: "focusInputPengeluaran()",     variant: "danger" },
  "tab-utang":    { icon: "✓", label: "Simpan Utang",       onclick: "simpanUtang()",               variant: "success" },
  "tab-master":   { icon: "👤", label: "Tambah Pelanggan",  onclick: "focusInputPelangganBaru()",   variant: "success" },
  "tab-absen":    { icon: "💾", label: "Simpan Absensi",    onclick: "simpanAbsensi()",             variant: "success" },
  "tab-backup":   { icon: "📤", label: "Export Semua",      onclick: "exportAllData()",             variant: "success" },
  // tab-laporan & tab-gaji: tidak ada FAB (multiple CTA)
};

function setupFAB(tabId) {
  // Set icon, label, variant, onclick sesuai tab aktif
  // Hidden jika tidak ada config (tab-laporan, tab-gaji)
}
```

### 5.43 Smart Search Pattern (baris 2772-2845)
Aplikasi mengganti tombol "Semua" dengan inline clear (×) untuk UX lebih baik:

```javascript
function onCariPelangganInput()     // Auto-filter riwayat nota
function clearCariPelanggan()       // Clear input + re-render
function onCariPelangganMasterInput() // Auto-filter daftar pelanggan
function onCariUtangInput()         // Auto-filter daftar utang
function onFilterExpInput()         // Auto-filter pengeluaran
function clearFilterExpField(field) // Clear field filter spesifik
```

Setiap input punya tombol × yang muncul hanya jika input tidak kosong (`classList.add("visible")`).

### 5.44 Empty State Helper (baris 2847-2854)
```javascript
function emptyRowHTML(colspan, message, variant = "info") {
  return `<tr><td colspan="${colspan}" style="padding:0;border:0;">
    <div class="info-box ${variant === "info" ? "" : variant}" style="margin:0;border-radius:0;">
      <span>ℹ️</span><span>${message}</span>
    </div>
  </td></tr>`;
}
```
Render pesan kosong yang ramah dengan ikon dan styling.

### 5.45 Modal Close Handlers (baris 2856-2858)
```javascript
function tutupModal(id) { document.getElementById(id).style.display = "none"; }
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m) m.style.display = "none";   // Klik backdrop untuk tutup
  });
});
```

---

## 6. Perhitungan & Formula

### 6.1 Total Nota per Transaksi

#### Untuk Pelanggan RS (Kiloan)
```
total = berat (KG) × tarifRS
items = [{ idMaster: 0, name: "Cucian RS (Kiloan)", qty: berat, unit: "KG", basePrice: tarifRS, subtotal: total }]
```

#### Untuk Pelanggan HOTEL Reguler
```
Untuk setiap linen dengan qty > 0:
  hargaSatuan = hargaPelanggan[pelangganId][linenId] × multiplier(jenisNota)
  subtotal = qty × hargaSatuan
total = sum(subtotal)
```

#### Untuk Pelanggan HOTEL FLAT + Jenis Nota "FLAT"
```
total = 0   (gratis, sudah dicakup flat rate bulanan)
items.forEach(it => it.subtotal = 0)
```

### 6.2 Harga Satuan Linen
```javascript
function getHargaPerPelanggan(pelangganId, linenId, multiplier) {
  const hrg = hargaPelanggan[pelangganId];
  if (hrg && hrg[linenId] !== undefined && hrg[linenId] !== null) {
    return Math.floor(hrg[linenId] * multiplier);
  }
  return 0;  // Default 0 jika belum diatur
}
```

### 6.3 Multiplier Jenis Nota
| Jenis Nota | Multiplier | Keterangan |
|------------|------------|------------|
| REGULER | 1x | Tarif normal |
| FLAT | 1x | Sudah dalam flat rate |
| FLAT ASLI | 1x | Sudah dalam flat rate |
| SPOTING | 2x | Treatment noda (double) |
| GUEST LAUNDRY | 1x | Cucian tamu |
| NON FLAT | 1.5x | Cucian di luar paket flat |
| FNB | 1.2x | Linen F&B |

### 6.4 Total Invoice Bulanan
```
totalInvoice = flatRate (jika FLAT customer) + sum(nota.total untuk jenis non-FLAT)
```

### 6.5 Hitung KG Harian untuk Gaji
```javascript
function hitungKgHarian(transaksiPeriode, tarifInternal, tglMulai, tglSelesai) {
  // kgHarian[tgl] = sum(kg dari setiap nota di tanggal tsb)
  // - HOTEL FLAT + jenis FLAT → skip (sudah dicakup flat rate)
  // - RS → kg = sum(qty items)
  // - HOTEL → kg = total / tarifInternal (estimasi KG dari rupiah)
  //   * tarifInternal default 7000 (dari pengaturan)
}
```

### 6.6 Upah Harian Karyawan
```
upahHarian = (kgHarian[tgl] × ongkosPerKg) / jumlahKaryawanHadir

Kondisi:
- Hanya karyawan dengan status "Hadir" yang dapat upah
- Jika absen (Izin/Alpa/Libur) → upah = 0
- ongkosPerKg default 1200 (dari pengaturan)
```

### 6.7 Total Gaji Diterima
```
totalDiterima = totalUpah + insentif + lembur - potongan
```

### 6.8 Formula Keuangan

#### HPP (Harga Pokok Penjualan)
```
HPP = GAJI BORONGAN + LISTRIK 1 + LISTRIK 2 + GAS + AIR + CHEMICAL + BBM + PLASTIK + PPH PS 23
```

#### Biaya Administrasi & Umum
```
Adm = GAJI TETAP + MAKAN + PERAWATAN MESIN + IURAN SAMPAH + IURAN RT + LAIN-LAIN
```

#### Laba Bersih
```
LabaBersih = Penjualan - HPP - BiayaAdm
```

#### Piutang Usaha
```
Piutang = sum(tagihan bulanan yang BELUM lunas untuk semua pelanggan semua bulan)
```

#### Utang Usaha
```
Utang = sum(biaya dengan lunas=false) + sum(sisaBulan × cicilan untuk utang AKTIF)
```

#### Kas / Bank
```
Kas = PendapatanLunas - BiayaYangSudahDibayar
```

#### Modal Bersih
```
Modal = Kas + Piutang + Peralatan - Utang
```

### 6.9 Total Invoice per Bulan per Pelanggan
```javascript
const totalInvoiceOf = (pData, bln, arrNota) => {
  const isFlat = pData.type === "HOTEL" && pData.billingSystem === "FLAT";
  let total = 0;
  arrNota
    .filter(n => n.pelanggan_id === pData.id && n.tanggal.startsWith(bln))
    .forEach(nota => {
      // Skip FLAT/FLAT ASLI jika pelanggan FLAT (sudah dicakup flat rate)
      if (isFlat && (nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI")) return;
      total += nota.total || 0;
    });
  // Tambah flat rate jika pelanggan FLAT
  if (isFlat) total += pData.flatRate || 0;
  return total;
};
```

### 6.10 Total Bulan Cicilan Utang
```
totalBulan = (tahunSampai - tahunDari) × 12 + (bulanSampai - bulanDari) + 1
sisaTotal = sisaBulan × cicilan
```

### 6.11 Nomor Invoice
```
Format: XXX/PL-KODE/BULAN_ROMAWI/TAHUN
Contoh: 001/PL-GDS/VII/2025

XXX = counter per (kode pelanggan, tahun), 3 digit
PL = prefix tetap
KODE = kode pelanggan (auto-generate dari nama)
BULAN_ROMAWI = I, II, III, ..., XII
TAHUN = 4 digit

Cache di localStorage (DB_INVOICE_NUMBERS, DB_INVOICE_COUNTER) + sync ke Supabase
Sekali nomor di-generate, tidak akan berubah (stable number)
```

### 6.12 Terbilang (Angka → Huruf)
Algoritma rekursif:
```
- 0-11 → "nol", "satu", "dua", ..., "sebelas"
- 12-19 → terbilang(angka-10) + " belas"  (contoh: 15 → "lima belas")
- 20-99 → s[floor(angka/10)] + " puluh" + (sisa ? " " + terbilang(sisa) : "")
- 100-199 → "seratus " + terbilang(angka-100)
- 200-999 → s[floor(angka/100)] + " ratus" + ...
- 1000-1999 → "seribu " + terbilang(angka-1000)
- 1000-999999 → terbilang(floor(angka/1000)) + " ribu" + ...
- 1e6-1e9 → terbilang(floor(angka/1e6)) + " juta" + ...
- ≥ 1e9 → terbilang(floor(angka/1e9)) + " milyar" + ...
```

---

## 7. Relasi `index.html` ↔ `script.js`

### 7.1 Pola Umum
Setiap elemen interaktif di `index.html` memiliki:
- **`id`** unik → diakses via `document.getElementById()` di JS
- **`onclick`** handler → memanggil fungsi global dari script.js
- **`oninput`** / **`onchange`** → untuk auto-filter & format

### 7.2 Tabel Relasi: Element ID ↔ Fungsi JS

#### Login
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#username`, `#password` | `prosesLogin()` | Enter / klik tombol |
| `#loginError` | (di-show/hide oleh prosesLogin) | - |

#### Navigasi
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `.cat-btn[data-cat]` | `switchCategory('...')` | Klik |
| `.tab-btn` | `switchTab('...')` | Klik |
| `#roleBadge` | (diisi oleh bukaAplikasi) | - |
| Tombol Logout | `logout()` | Klik |

#### Tab Nota
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#pelangganSelect` | `cekTipePelangganInput()` | `onchange` |
| `#jenisNota` | `renderFormLinenInput()` | `onchange` |
| `#btnSimpanNota` | `simpanNotaSistem()` | Klik |
| `#tabelLinenInput` | `renderFormLinenInput()` | Auto-render |

#### Tab Riwayat
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#cariTanggal` | `cariNotaSistem()` | Manual klik Cari |
| `#cariPelanggan` | `cariNotaSistem()` | `oninput` (auto) |
| Tombol Cari | `cariNotaSistem()` | Klik |
| Tombol Semua | `tampilkanSemuaNota()` | Klik |
| `#tabelRiwayatNota` | `cariNotaSistem()` | Auto-render |

#### Tab Invoice
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#invoicePelangganSelect` | (manual) | - |
| `#invoiceBulanSelect` | (manual) | - |
| Tombol Hitung Invoice | `hitungDanAmbilInvoice()` | Klik |
| Tombol Ubah Kunci | `toggleLockInvoice()` | Klik |
| Tombol Ubah Status | `toggleStatusPembayaran()` | Klik |
| Tombol Cetak Linen Room | `cetakInvoice()` | Klik |
| Tombol Download LR | `downloadInvoice()` | Klik |
| Tombol Excel | `downloadLinenRoomExcel()` | Klik |
| Tombol Cetak Invoice | `cetakInvoicePelanggan()` | Klik |
| `#invoiceTableBody` | `hitungDanAmbilInvoice()` | Auto-render |
| `#printMonthlyInvoiceArea` | `hitungDanAmbilInvoice()` | Auto-render |

#### Tab Kuitansi
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#kuitansiPelangganSelect`, `#kuitansiBulanSelect` | (manual) | - |
| Tombol Cetak | `generateKuitansi()` | Klik |
| Tombol Download | `downloadKuitansi()` | Klik |

#### Tab Keuangan (Dashboard)
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| 8 finance box (`#boxTotalOmset`, dll) | `hitungMenejemenKeuangan()` | Auto-render |
| `#filterExpMulai`, `#filterExpSelesai`, `#filterExpKat` | `hitungMenejemenKeuangan()` | Change |
| Tombol Filter | `hitungMenejemenKeuangan()` | Klik |
| Tombol Reset | `resetFilterExp()` | Klik |
| `#expKategori` | `toggleCustomExpenseInput()` | `onchange` |
| `#expNominal` | `formatCurrencyInput(this)` | `oninput` |
| Tombol Simpan Pengeluaran | `simpanBiayaOperasional()` | Klik |
| `#tabelRiwayatPengeluaran` | `hitungMenejemenKeuangan()` | Auto-render |

#### Tab Laporan
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| Tombol View | `tampilkanLaporan()` | Klik |
| Tombol Download PDF | `cetakLaporan()` | Klik |
| `#laporanContainer` | `tampilkanLaporan()` | Auto-render |

#### Tab Utang
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| Form Utang (5 input) | - | - |
| Tombol Simpan Utang | `simpanUtang()` | Klik |
| `#tabelDaftarUtang` | `renderDaftarUtang()` | Auto-render |
| Tombol Bayar Cicilan (per row) | `bayarCicilan(${u.id})` | Klik |

#### Tab Master Data
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| Tombol 👔 Linen | `bukaModalMasterLinen()` | Klik |
| Tombol ⚡ Jenis Nota | `bukaModalMasterJenisNota()` | Klik |
| Tombol 📋 Atur Linen | `bukaModalAturLinenJenisNota()` | Klik |
| `#newPelangganName` | `autoIsiKodeBaru()` | `oninput` |
| `#newPelangganType` | `toggleFlatRateInput()` | `onchange` |
| `#newPelangganBilling` | `toggleFlatRateInput()` | `onchange` |
| Tombol Tambah Pelanggan | `tambahPelangganBaru()` | Klik |
| `#newKaryawanNama`, dll | - | - |
| Tombol Tambah Karyawan | `tambahKaryawan()` | Klik |
| `#tabelMasterKaryawan` | `renderMasterKaryawanTable()` | Auto-render |
| 5 input setting (tarif, ongkos, rekening, dll) | `formatCurrencyInput(this)` | `oninput` |
| Tombol Simpan Pengaturan | `simpanPengaturanGlobal()` | Klik |
| 5 input kop surat | - | - |
| `#fileLogoInput` | `handleLogoUpload(this)` | `onchange` |
| Tombol Simpan Kop | `simpanKopSurat()` | Klik |
| Tombol Bersihkan Nota Rusak | `bersihkanNotaRusak()` | Klik |
| `#daftarPelangganContainer` | `renderDaftarPelanggan()` | Auto-render |

#### Tab Absensi
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#absensiTanggal` | `renderAbsensiTable()` | `onchange` |
| `#absensiContainer` | `renderAbsensiTable()` | Auto-render |
| Tombol Simpan Absensi (dynamic) | `simpanAbsensi()` | Klik |

#### Tab Gaji
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#gajiTglMulai`, `#gajiTglSelesai` | - | - |
| Tombol Tampilkan | `tampilkanListGajiBaru()` | Klik |
| `#listGajiContainer` | `tampilkanListGajiBaru()` | Auto-render |

#### Tab Backup
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| Tombol Export Semua | `exportAllData()` | Klik |
| Tombol Import Data | `importDataViaFile()` | Klik |
| Tombol Backup & Bersihkan | `backupDanBersihkan()` | Klik |
| Tombol Backup Semua Bulan Belum | `backupSemuaBulanBelum()` | Klik |
| `#fileImportInput` | `handleFileImport(this)` | `onchange` |
| `#backupStatusArea` | `renderBackupStatus()` | Auto-render |

#### FAB
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#fabBtn` | `toggleFab()` | Klik |
| `.fab-item` | `fabAction('invoice'/'gaji'/'absensi')` | Klik |

#### Modal
| HTML ID | Fungsi JS | Trigger |
|---------|-----------|---------|
| `#detailModal` close button | `tutupModalDetail()` | Klik |
| `#editLinenModal` close button | `tutupModalEdit()` | Klik |
| `#editNotaJenisSelect` | `onEditJenisChange()` | `onchange` |
| Tombol Simpan Perubahan | `simpanPerubahanQtyNota()` | Klik |
| `#editBiayaModal` close button | `tutupModalEditBiaya()` | Klik |
| `#editBiayaKategori` | `toggleEditCustomBiaya()` | `onchange` |
| Tombol Simpan Edit Biaya | `simpanEditBiaya()` | Klik |
| `#editGajiModal` close button | `tutupEditGaji()` | Klik |
| Tombol Simpan Edit Gaji | `simpanEditGajiBaru()` | Klik |
| `#editKaryawanModal` close button | `tutupEditKaryawanModal()` | Klik |
| Tombol Simpan Edit Karyawan | `updateKaryawanFromModal()` | Klik |
| `#modalMasterLinen` close button | `tutupModal('modalMasterLinen')` | Klik |
| Tombol Tambah Linen | `tambahLinen()` | Klik |
| `#modalMasterJenisNota` close button | `tutupModal('modalMasterJenisNota')` | Klik |
| Tombol Tambah Jenis Nota | `addMasterJenisNota()` | Klik |
| `#modalAturLinenJenisNota` close button | `tutupModal('modalAturLinenJenisNota')` | Klik |
| `#aturLinenJenisSelect` | `loadLinenConfigForJenisNota()` | `onchange` |
| Tombol Simpan Atur Linen | `simpanLinenConfigJenisNota()` | Klik |
| `#modalDetailPelanggan` close button | `tutupModal('modalDetailPelanggan')` | Klik |
| `#editPelangganType` | `handleEditTipeChange()` + `handleEditBillingChange()` | `onchange` |
| Tombol Simpan Detail Pelanggan | `simpanDetailPelanggan()` | Klik |

### 7.3 Pola Interaksi Utama

#### Pola 1: Form Submission
```
User isi form → Klik tombol Simpan
   → setBtnLoading(btn, true)
   → Validasi input (toast warning jika gagal)
   → Insert/Update ke Supabase
   → Refresh data dari Supabase
   → Re-render UI
   → setBtnLoading(btn, false)
   → Toast sukses/error
```

#### Pola 2: Auto-Filter (Smart Search)
```
User ketik di input search
   → oninput trigger fungsi onCariXInput()
   → Update tombol clear (×) visibility
   → Re-render daftar dengan filter
   → Jika input kosong → tampilkan semua
```

#### Pola 3: Tab Switching
```
User klik tab → switchTab(tabId)
   → Sembunyikan semua .tab-content
   → Tampilkan tab aktif
   → Update aria-selected + active
   → Trigger fungsi inisialisasi tab (cariNotaSistem, hitungMenejemenKeuangan, dll)
   → Setup FAB untuk tab
```

#### Pola 4: Cetak Dokumen
```
User klik tombol cetak
   → loadingThen(label, asyncFn)
   → Generate HTML lengkap (dengan kop, data, signature)
   → window.open("", "_blank")
   → printWindow.document.write(html)
   → printWindow.document.close()
   → printWindow.onload → printWindow.print()
   → setTimeout 2 detik → printWindow.close()
```

---

## 8. Sistem Penyimpanan Data

### 8.1 Tiga Lapis Penyimpanan

```
┌─────────────────────────────────────────────────────┐
│ Supabase (Cloud - Source of Truth)                  │
│ 18 tabel: nota, biaya, pelanggan, jenis_nota,       │
│ master_linen, karyawan, absensi, gaji, pengaturan,  │
│ kop, harga_pelanggan, linen_pelanggan, utang,       │
│ locks, payment_status, invoice_numbers,             │
│ invoice_counter, backup_history                     │
└──────────────────────┬──────────────────────────────┘
                       │ sync (Promise.all)
┌──────────────────────▼──────────────────────────────┐
│ localStorage (Cache - DB_XXX keys)                  │
│ DB_NOTA, DB_BIAYA, DB_PELANGGAN, DB_JENIS_NOTA,     │
│ DB_MASTER_LINEN, DB_KARYAWAN, DB_ABSENSI, DB_GAJI,  │
│ DB_PENGATURAN, DB_KOP, DB_HARGA_PELANGGAN,          │
│ DB_LINEN_PELANGGAN, DB_UTANG, DB_LOCKS,             │
│ DB_PAYMENT_STATUS, DB_INVOICE_NUMBERS,              │
│ DB_INVOICE_COUNTER, DB_BACKUP_HISTORY               │
└─────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ IndexedDB (Biner - Logo)                            │
│ Database: "PelangiLaundry", Object Store: "logo"    │
│ Key: "kop" → Value: dataURL image                  │
└─────────────────────────────────────────────────────┘
```

### 8.2 Strategi Sinkronisasi
- **Read**: Ambil dari Supabase → cache ke localStorage → baca dari localStorage untuk operasi lokal
- **Write**: Insert/Update ke Supabase → panggil `refreshDataSistem()` untuk update cache
- **Delete**: Delete dari Supabase → refresh cache
- **Offline**: Aplikasi tetap bisa membaca data dari localStorage cache, tapi tidak bisa write

### 8.3 Mengapa Tiga Lapis?
1. **Supabase** → Data persisten lintas device, kolaborasi multi-user
2. **localStorage** → Akses cepat untuk operasi lokal (tanpa round-trip ke server), fallback jika offline
3. **IndexedDB** → Kapasitas besar untuk file biner (logo), tidak muat di localStorage (limit ~5MB)

### 8.4 Backup Format
Backup menghasilkan JSON dengan struktur:
```json
{
  "metadata": { "version": "v24" },
  "data": {
    "DB_NOTA": [...],
    "DB_BIAYA": [...],
    "DB_PELANGGAN": [...],
    ...
  }
}
```

Import mendeteksi 2 format:
- **Format `exportAllData`** (langsung tabel Supabase) → upsert langsung
- **Format `backupBulan`** (DB_XXX keys) → transform ke schema Supabase dulu, lalu upsert

---

## 9. Alur Penggunaan Aplikasi

### 9.1 Alur Login
```
1. User buka halaman → tampil #loginPage
2. Input username/password → Enter atau klik "Masuk"
3. prosesLogin() validasi kredensial
   - Berhasil → bukaAplikasi() → refreshDataSistem()
   - Gagal → tampilkan #loginError
4. Setelah login:
   - admin → semua menu tampil
   - user → menu admin-only disembunyikan
```

### 9.2 Alur Input Transaksi
```
1. Pilih tanggal (default hari ini)
2. Pilih pelanggan → cekTipePelangganInput()
   - HOTEL → tampilkan form linen (tabel)
   - RS → tampilkan form berat KG
3. HOTEL: Pilih jenis nota → renderFormLinenInput()
   - Filter linen: irisan (linen_pelanggan ∩ linen_ids jenis nota)
   - Tampilkan harga satuan per linen (harga × multiplier)
4. Isi qty per linen (atau berat KG untuk RS)
5. Klik "Simpan Transaksi" → simpanNotaSistem()
   - Validasi
   - Generate notaId
   - Insert ke Supabase
   - Reset form
   - Refresh data
   - Re-render riwayat
   - Recalc keuangan
```

### 9.3 Alur Generate Invoice Bulanan
```
1. Tab Invoice → pilih pelanggan & bulan
2. Klik "Hitung Invoice" → hitungDanAmbilInvoice()
   - Filter nota by pelanggan & bulan
   - Jika belum di-lock → hitungUlangNota (recalc harga terbaru)
   - Untuk FLAT customer → set total FLAT=0, tambah baris flat rate
   - Render tabel invoice + preview
3. Lock invoice (opsional) → toggleLockInvoice()
   - Setelah di-lock, nota tidak akan di-recalc lagi
4. Ubah status pembayaran → toggleStatusPembayaran()
   - Memengaruhi perhitungan piutang & kas
5. Cetak/download:
   - Linen Room (rekap harian per linen)
   - Invoice resmi (format Indonesia)
   - Excel/CSV
```

### 9.4 Alur Cetak Kuitansi
```
1. Tab Kuitansi → pilih pelanggan & bulan
2. Klik "Cetak" → generateKuitansi()
   - Hitung total tagihan
   - Generate nomor kuitansi (= nomor invoice)
   - Tentukan deskripsi (RS/FLAT/REGULER)
   - Render HTML legal portrait
   - Buka window print
```

### 9.5 Alur Manajemen Keuangan
```
1. Tab Dashboard → otomatis hitungMenejemenKeuangan()
   - 8 box indikator terisi
   - Tabel riwayat pengeluaran ter-render
2. Filter pengeluaran (opsional):
   - Range tanggal
   - Kategori spesifik
3. Catat pengeluaran baru:
   - Pilih tanggal, kategori, nominal
   - Checklist "Sudah Dibayar" (default yes)
   - Simpan → biaya masuk ke Supabase
   - Recalc keuangan
4. Edit/hapus pengeluaran via tombol di tabel
5. Tandai lunas biaya yang belum dibayar
6. Tab Laporan → view/cetak laporan laba rugi & neraca
```

### 9.6 Alur Manajemen Utang
```
1. Tab Utang → form catat utang baru
   - Isi nama, periode (dari-sampai), cicilan per bulan, keterangan
   - Simpan → hitung total bulan, status AKTIF
2. Daftar utang aktif ditampilkan di tabel
3. Bayar cicilan:
   - Klik "Bayar Cicilan" → konfirmasi
   - Insert ke tabel biaya: kategori "CICILAN UTANG", lunas=true
   - Update utang: sisa_bulan - 1
   - Jika sisa = 0 → status "LUNAS"
   - Recalc keuangan (utang berkurang, kas berkurang)
```

### 9.7 Alur Hitung Gaji
```
1. Tab Gaji → set periode (mulai - selesai)
2. Klik "Tampilkan" → tampilkanListGajiBaru()
   - Filter nota dalam periode
   - Hitung kgHarian per tanggal
   - Untuk setiap karyawan:
     - Loop setiap hari dalam periode
     - Cek absensi
     - Jika Hadir → upah = (kg × ongkos) / jumlah karyawan hadir
     - Akumulasi totalUpah
     - Ambil insentif/lembur/potongan tersimpan
     - Hitung totalDiterima
3. Edit insentif/lembur/potongan via tombol Edit
4. Cetak/download slip gaji per karyawan
```

### 9.8 Alur Backup
```
1. Tab Backup → tampil tabel status backup per bulan
2. Pilih aksi:
   a. Export Semua Data → download JSON semua tabel Supabase
   b. Import Data → upload JSON, sync ke Supabase
   c. Backup & Bersihkan Semua → backup + hapus semua transaksi
   d. Backup Semua Bulan Belum → backup bulk bulan yang belum di-backup
3. Peringatan otomatis:
   - cekPeringatanBackup() di jalankan saat buka aplikasi
   - Jika ada bulan lalu belum di-backup → toast warning
```

### 9.9 Alur Master Data
```
1. Tab Master Data → 5 card tersedia
2. Master Pelanggan:
   - Tambah baru: isi form → kode auto-generate → simpan
   - Edit: klik "Edit & Harga" → modal detail
     - Edit info dasar
     - Atur urutan linen via drag-drop
     - Centang linen aktif
     - Set harga per linen
     - Set counter awal invoice
   - Hapus: konfirmasi → delete + hapus harga terkait
3. Master Karyawan:
   - Tambah: nama, bagian, persentase
   - Edit/hapus via tombol di tabel
4. Master Linen (modal):
   - Tambah linen baru
   - Update nama
   - Hapus
5. Master Jenis Nota (modal):
   - Tambah: nama, multiplier, untuk (Flat/Reg/both)
   - Update/hapus
6. Atur Linen per Jenis Nota (modal):
   - Pilih jenis nota
   - Centang linen yang aktif untuk jenis tsb
   - Simpan → update linen_ids di jenis_nota
7. Pengaturan Sistem:
   - Tarif internal hotel, ongkos per kg
   - Info rekening bank
   - Nama direktur, nilai peralatan
8. Kop Surat:
   - Nama usaha, alamat, kontak
   - Upload logo (≤2MB) → simpan ke IndexedDB
```

### 9.10 Alur Absensi
```
1. Tab Absensi → pilih tanggal
2. Tabel otomatis render semua karyawan
3. Set status per karyawan: Hadir/Izin/Alpa/Libur (default Hadir)
4. Klik "Simpan Absensi"
   - Untuk setiap karyawan: delete absensi lama di tanggal tsb, insert baru
5. Absensi dipakai di perhitungan gaji
```

---

## 📌 Ringkasan Akhir

**Pelangi Laundry v24** adalah aplikasi manajemen laundry yang:

1. **Multi-tipe pelanggan**: Mendukung HOTEL (per pcs linen dengan sistem REGULER/FLAT) dan RS (per kilogram)

2. **Multi-channel storage**: Supabase (cloud) + localStorage (cache) + IndexedDB (logo) untuk redundansi & performa

3. **Multi-role**: admin (akses penuh) & user (hanya transaksi)

4. **Modul lengkap**: Transaksi → Tagihan → Keuangan → Sistem, dengan 11 tab fungsional

5. **Cetak dokumen**: Invoice bulanan, Linen Room, Kuitansi, Slip Gaji, Laporan Laba Rugi & Neraca

6. **Mobile-first**: FAB, sticky save bar, card list di mobile, responsive breakpoints

7. **UX modern**: Toast notifications, custom confirm dialog, smart search, drag-drop urutan linen, empty state ramah

Setiap file memiliki peran jelas:
- **`index.html`** — struktur & layout (1126 baris)
- **`style.css`** — tampilan & responsivitas (1004 baris)
- **`script.js`** — logika bisnis & interaksi (2872 baris)

Ketiganya berinteraksi melalui **ID element** yang menjadi jembatan antara HTML dan JS, dengan pola konsisten: **HTML menyediakan kerangka + onclick handler → JS memanipulasi via getElementById**.

---

*Dokumentasi ini menjelaskan setiap baris kode, fungsi, perhitungan, dan relasi antar file secara komprehensif untuk referensi pengembangan & maintenance.*
