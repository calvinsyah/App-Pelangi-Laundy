# 📦 DOKUMENTASI LENGKAP — PELANGI LAUNDRY v24

> Sistem Manajemen Laundry berbasis Web (HTML + CSS + JavaScript + Supabase)  
> File: `index.html` · `style.css` · `script.js`

---

## DAFTAR ISI

1. [Struktur & Arsitektur Sistem](#1-struktur--arsitektur-sistem)
2. [Lapisan Data (Dual Storage)](#2-lapisan-data-dual-storage)
3. [Tabel Supabase](#3-tabel-supabase)
4. [style.css — Detail Baris per Baris](#4-stylecss--detail-baris-per-baris)
5. [index.html — Struktur DOM](#5-indexhtml--struktur-dom)
6. [script.js Bagian 1 — Inisialisasi & Helper](#6-scriptjs-bagian-1--inisialisasi--helper)
7. [script.js Bagian 2 — Nomor Invoice & Login](#7-scriptjs-bagian-2--nomor-invoice--login)
8. [script.js Bagian 3 — Transaksi Nota](#8-scriptjs-bagian-3--transaksi-nota)
9. [script.js Bagian 4 — Keuangan & Laporan](#9-scriptjs-bagian-4--keuangan--laporan)
10. [script.js Bagian 5 — Gaji & Absensi](#10-scriptjs-bagian-5--gaji--absensi)
11. [script.js Bagian 6 — Cetak & Export Dokumen](#11-scriptjs-bagian-6--cetak--export-dokumen)
12. [script.js Bagian 7 — Backup & Restore](#12-scriptjs-bagian-7--backup--restore)
13. [Navigasi & Flow Lengkap](#13-navigasi--flow-lengkap)
14. [Relasi index.html ↔ script.js (Ringkasan)](#14-relasi-indexhtml--scriptjs-ringkasan)

---

## 1. Struktur & Arsitektur Sistem

Aplikasi ini adalah **Single Page Application (SPA)** berbasis HTML/CSS/JavaScript murni (vanilla), dengan backend **Supabase** (PostgreSQL cloud) sebagai database utama, dan **localStorage** browser sebagai cache lokal. Tiga file bekerja bersama:

| File | Peran |
|---|---|
| `index.html` | Struktur DOM — semua halaman, tab, modal, form |
| `style.css` | Tampilan visual — warna, layout, responsivitas |
| `script.js` | Logika bisnis — CRUD, kalkulasi, render UI |

Ada juga `supabaseClient.js` (tidak diunggah) yang berisi inisialisasi koneksi ke Supabase, mengekspos variabel global `db` yang dipakai di seluruh `script.js`.

---

## 2. Lapisan Data (Dual Storage)

```
[Supabase DB] ←→ [localStorage] ←→ [RAM / Variabel JS]
   (server)         (cache)            (runtime)
```

**Alur kerja:**
- Setiap kali app dibuka → `refreshDataSistem()` menarik semua data dari Supabase → disimpan ke localStorage → di-load ke variabel global.
- Saat user mengubah data → ditulis ke Supabase dulu → localStorage di-update → UI di-render ulang.

**Mengapa dual storage?**  
- Supabase = sumber kebenaran utama, sinkron antar perangkat/pengguna.
- localStorage = cache cepat agar operasi baca (render tabel, hitung invoice, dll) tidak perlu memanggil API berulang kali.

---

## 3. Tabel Supabase

Berdasarkan `refreshDataSistem()` di `script.js`, ada 18 tabel:

| Tabel | Fungsi |
|---|---|
| `nota` | Transaksi harian laundry |
| `pelanggan` | Master data pelanggan (hotel/RS) |
| `jenis_nota` | Jenis layanan (REGULER, FLAT, SPOTING, dll) |
| `master_linen` | Daftar item linen (Sheet King, Pillow Case, dll) |
| `harga_pelanggan` | Harga linen per-pelanggan |
| `linen_pelanggan` | Urutan linen aktif per-pelanggan |
| `karyawan` | Data karyawan |
| `absensi` | Absensi harian karyawan |
| `gaji` | Data gaji + insentif/lembur/potongan |
| `biaya` | Pengeluaran operasional |
| `pengaturan` | Setting global (tarif, rekening, dll) |
| `kop` | Data kop surat untuk cetak |
| `invoice_numbers` | Nomor invoice yang sudah digenerate (cache stabil) |
| `invoice_counter` | Counter nomor invoice per pelanggan/tahun |
| `payment_status` | Status lunas/belum per invoice bulanan |
| `locks` | Status kunci invoice per periode |
| `utang` | Utang usaha dengan tenor cicilan |
| `backup_history` | Riwayat bulan yang sudah di-backup |

---

## 4. style.css — Detail Baris per Baris

### 4.1 CSS Variables (`:root`)

```css
:root {
  --primary:       #0f172a;   /* Biru gelap, warna utama brand */
  --primary-light: #1e293b;   /* Sedikit lebih terang dari primary */
  --accent:        #3b82f6;   /* Biru cerah, untuk tombol & highlight */
  --success:       #10b981;   /* Hijau, untuk status berhasil/lunas */
  --danger:        #ef4444;   /* Merah, untuk hapus/error */
  --warning:       #d97706;   /* Kuning-oranye, untuk peringatan */
  --info:          #0891b2;   /* Cyan, untuk informasi */
  --text:          #1e293b;   /* Warna teks utama */
  --text-light:    #475569;   /* Teks sekunder/placeholder */
  --border:        #e2e8f0;   /* Warna garis border */
  --bg:            #f1f5f9;   /* Background halaman */
  --card:          #ffffff;   /* Background card */
  --radius:        10px;      /* Border-radius standar */
  --shadow:        0 2px 8px rgba(0,0,0,0.08);   /* Bayangan ringan */
  --shadow-md:     0 4px 16px rgba(0,0,0,0.12);  /* Bayangan medium */
}
```

Semua warna dipakai via `var(--nama)` — sehingga mudah diubah di satu tempat dan berlaku ke seluruh halaman.

---

### 4.2 Reset Global (`*`)

```css
* {
  box-sizing: border-box; /* Padding & border masuk dalam ukuran elemen */
  margin: 0;
  padding: 0;
}
```

`box-sizing: border-box` adalah standar modern — mencegah elemen "membesar" karena padding.

---

### 4.3 Body

```css
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);    /* Abu-abu muda */
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  padding-bottom: 60px;     /* Ruang untuk FAB di mobile */
}
```

---

### 4.4 Halaman Login (`#loginPage`)

```css
#loginPage {
  position: fixed; inset: 0;  /* Menutupi seluruh layar */
  background: linear-gradient(135deg, #0f172a 0%, #1a56db 100%); /* Gradien biru */
  display: flex;
  justify-content: center; align-items: center; /* Box login di tengah */
  z-index: 9999;              /* Di atas semua elemen */
  padding: 15px;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 16px;
  width: 100%; max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3); /* Bayangan dramatis */
}

.login-logo { font-size: 48px; text-align: center; margin-bottom: 12px; }
```

---

### 4.5 Header Sticky

```css
header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: #fff;
  height: 53px;
  position: sticky; top: 0; z-index: 100; /* Tetap di atas saat scroll */
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

header h1 { font-size: 18px; font-weight: 700; letter-spacing: 1px; }

.user-badge {
  background: rgba(255,255,255,0.15);
  padding: 4px 12px;
  border-radius: 20px; /* Pil/capsule shape */
  font-size: 13px; font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
}
```

---

### 4.6 Container Utama

```css
.container {
  max-width: 1100px;
  margin: 160px auto 0; /* 160px = ruang untuk header + nav sticky */
  padding: 0 15px;
}
```

---

### 4.7 Card System

```css
.card {
  background: var(--card); /* white */
  border-radius: var(--radius); /* 10px */
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.card-title {
  font-size: 17px;
  border-left: 4px solid var(--accent); /* Garis biru di sisi kiri judul */
  padding-left: 12px;
  margin-bottom: 20px;
  color: var(--primary);
  font-weight: 700;
  display: flex; align-items: center; gap: 8px;
}
```

---

### 4.8 Form & Input

```css
.form-group { margin-bottom: 16px; }

.flex-row {
  display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;
}
.flex-row > .form-group { flex: 1; min-width: 0; }

label, .form-group label {
  display: block;
  font-size: 13px; font-weight: 600;
  margin-bottom: 6px;
  color: var(--text);
}

input[type="text"], input[type="number"], input[type="date"],
input[type="password"], input[type="month"], select, textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

input:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1); /* Glow biru saat fokus */
}

input:disabled, select:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
  color: var(--text-light);
}
```

---

### 4.9 Tombol (`.btn` dan `.btn-sm`)

```css
/* Tombol besar */
.btn {
  min-height: 42px;
  padding: 10px 18px;
  font-size: 14px; font-weight: 600;
  border-radius: 8px; border: 0;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.15s;
}

.btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px); /* Efek "naik" saat hover */
}

.btn-block { width: 100%; } /* Tombol full-width */

/* Varian warna */
.btn-primary   { background: var(--accent);   color: white; }
.btn-success   { background: var(--success);  color: white; }
.btn-danger    { background: var(--danger);   color: white; }
.btn-warning   { background: var(--warning);  color: white; }
.btn-info      { background: var(--info);     color: white; }
.btn-secondary { background: #64748b;         color: white; }
.btn-purple    { background: #8b5cf6;         color: white; }

/* Tombol kecil */
.btn-sm {
  min-height: 36px;
  padding: 8px 12px;
  font-size: 12px; font-weight: 600;
  border-radius: 6px; border: 0;
  color: white; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  transition: all 0.15s;
}
```

---

### 4.10 Navigasi Dua Tingkat (Sticky)

```css
/* Kategori utama (TRANSAKSI, TAGIHAN, KEUANGAN, SISTEM) */
.nav-categories {
  position: sticky;
  top: 53px;    /* Tepat di bawah header (tinggi header = 53px) */
  z-index: 99;
  background: #fff;
  border-bottom: 1px solid var(--border);
  padding: 8px 12px;
  display: flex; gap: 6px;
  overflow-x: auto; /* Scroll horizontal di mobile */
  -webkit-overflow-scrolling: touch;
}

/* Sub-tab di bawah kategori */
.nav-subtabs {
  position: sticky;
  top: 105px;   /* 53px header + ~52px nav-categories */
  z-index: 98;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
  padding: 6px 12px;
  display: flex; gap: 4px;
  overflow-x: auto;
}

/* Tombol kategori */
.cat-btn {
  min-height: 40px;
  padding: 10px 14px;
  font-size: 12px; font-weight: 700;
  text-transform: uppercase;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: transparent; color: var(--text);
  cursor: pointer; transition: all 0.15s;
}
.cat-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.cat-btn:hover:not(.active) { color: var(--accent); border-color: var(--accent); }

/* Tombol subtab */
.tab-btn {
  min-height: 40px;
  padding: 10px 14px;
  font-size: 13px; font-weight: 600;
  border: 0; border-bottom: 3px solid transparent;
  background: transparent; color: var(--text-light);
  border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.tab-btn.active {
  color: var(--primary);
  background: #e0e7ff;
  border-bottom-color: var(--primary); /* Garis bawah biru */
  font-weight: 700;
}
```

Navigasi berlapis 3 level yang semuanya sticky: **header (z:100) → kategori (z:99) → subtab (z:98)**.

---

### 4.11 Tabel Linen (`.linen-table`)

```css
.linen-table { width: 100%; border-collapse: collapse; font-size: 13px; }

.linen-table th {
  background: #f8fafc;
  padding: 11px 14px;
  text-align: left;
  border-bottom: 2px solid var(--border);
  font-weight: 700; color: var(--primary);
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;
}

.linen-table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

/* Table wrapper untuk horizontal scroll */
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 12px;
}
.table-wrap::-webkit-scrollbar { height: 6px; }
.table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
```

---

### 4.12 Modal

```css
.modal {
  display: none; /* Default tersembunyi */
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); /* Overlay gelap */
  justify-content: center; align-items: center;
  z-index: 10000;
  backdrop-filter: blur(2px); /* Blur latar belakang */
}

#customConfirmModal { z-index: 20000; } /* Selalu di atas modal lain */

.modal-content {
  background: white;
  padding: 28px;
  border-radius: 14px;
  width: 100%; max-width: 750px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  position: relative;
  animation: slideUp 0.25s ease; /* Muncul dari bawah */
  max-height: 92vh; overflow-y: auto;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.close-modal {
  position: absolute; top: 14px; right: 18px;
  font-size: 24px; cursor: pointer;
  min-width: 44px; min-height: 44px; /* Touch target memadai */
  display: flex; align-items: center; justify-content: center;
}
```

---

### 4.13 Badge Status

```css
.badge-status {
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700; color: white;
  display: inline-block;
}
.status-unpaid  { background: var(--danger);  }  /* Merah  — Belum Dibayar */
.status-paid    { background: var(--success); }  /* Hijau  — Lunas */
.status-locked  { background: #475569;        }  /* Abu    — Terkunci */
.status-unlocked{ background: var(--warning); }  /* Kuning — Tidak Terkunci */
```

---

### 4.14 Finance Grid (Dashboard Keuangan)

```css
.finance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); /* Responsif otomatis */
  gap: 16px;
  margin-bottom: 24px;
}

.finance-box {
  padding: 22px;
  border-radius: var(--radius);
  color: white;
  overflow: hidden;
}
.finance-box p  { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85; }
.finance-box h3 { font-size: 22px; font-weight: 700; }

/* Warna per kotak */
.bg-income  { background: linear-gradient(135deg, #10b981, #059669); } /* Hijau — Penjualan */
.bg-expense { background: linear-gradient(135deg, #ef4444, #dc2626); } /* Merah — HPP */
.bg-profit  { background: linear-gradient(135deg, #3b82f6, #2563eb); } /* Biru  — Laba */
/* Warna inline untuk: Adm, Piutang, Utang, Kas, Modal */
```

---

### 4.15 Toast Notification

```css
.toast-container {
  position: fixed; bottom: 20px; right: 20px;
  z-index: 99999; /* Paling atas dari semua */
  display: flex; flex-direction: column; gap: 8px;
}

.toast {
  padding: 12px 20px; border-radius: 8px; color: white;
  font-weight: 600; font-size: 14px;
  box-shadow: var(--shadow-md);
  animation: toastIn 0.3s ease;
  display: flex; align-items: center; gap: 8px;
  min-width: 220px;
}

.toast.success { background: var(--success); }
.toast.error   { background: var(--danger);  }
.toast.warning { background: var(--warning); }
.toast.info    { background: var(--info);    }

@keyframes toastIn  { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes toastOut { to   { transform: translateX(60px); opacity: 0; } }
```

---

### 4.16 Button Loading State

```css
.btn.loading {
  pointer-events: none; /* Tidak bisa diklik */
  opacity: 0.7;
}

.btn.loading::after {
  content: '';
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite; /* Spinner */
  margin-left: 6px;
}

.btn:disabled {
  opacity: 0.5; cursor: not-allowed;
  transform: none !important; box-shadow: none !important;
}

@keyframes spin { to { transform: rotate(360deg); } }
```

---

### 4.17 Sticky Save Bar

```css
.sticky-save-bar {
  position: sticky; bottom: 0; z-index: 50;
  background: white;
  padding: 12px 0;
  margin: 0 -24px; padding-left: 24px; padding-right: 24px;
  border-top: 1px solid var(--border);
  box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
}
/* Di desktop (≥1025px): dinonaktifkan, tombol simpan tampil normal */
@media (min-width: 1025px) {
  .sticky-save-bar { position: static; background: transparent; padding: 0; border: none; }
}
```

---

### 4.18 Drag & Drop Linen

```css
.linen-drag-row.dragging {
  opacity: 0.4;
  border: 2px dashed #3b82f6;   /* Garis putus-putus saat sedang di-drag */
  background-color: #eff6ff;
}

.linen-drag-row.over {
  border-top: 3px solid #3b82f6; /* Indikator posisi drop yang dituju */
}
```

---

### 4.19 FAB (Floating Action Button)

```css
.fab {
  position: fixed; bottom: 78px; right: 16px;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--accent); color: #fff;
  border: 0; font-size: 28px; cursor: pointer;
  box-shadow: 0 8px 20px rgba(59,130,246,0.4), 0 4px 8px rgba(0,0,0,0.1);
  z-index: 90;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s, background 0.15s;
}
.fab.open {
  transform: rotate(45deg); /* "+" berputar jadi "×" */
  background: var(--danger);
}

.fab-menu {
  position: fixed; bottom: 144px; right: 16px;
  display: flex; flex-direction: column; gap: 8px;
  z-index: 89;
  opacity: 0; pointer-events: none;
  transform: translateY(10px);
  transition: all 0.2s;
}
.fab-menu.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

.fab-item {
  background: #fff; border: 1px solid var(--border); color: var(--text);
  padding: 8px 14px; border-radius: 24px;
  font-size: 13px; font-weight: 600; min-height: 40px;
  white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  cursor: pointer;
}
```

---

### 4.20 Mobile Card-List Linen

```css
/* Default: hanya card-list yang tampil di mobile */
.linen-table-wrap { display: none; }
.linen-card-list  { display: none; } /* Di mobile: tampil via media query */

@media (max-width: 768px) {
  .linen-table-wrap { display: none; }  /* Sembunyikan tabel */
  .linen-card-list  { display: block; } /* Tampilkan card */
}

.linen-card-item {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
}
.linen-card-item .info .name  { font-weight: 600; font-size: 14px; }
.linen-card-item .info .price { font-size: 12px; color: var(--text-light); margin-top: 2px; }
.linen-card-item input[type="number"] {
  width: 60px; min-height: 36px;
  padding: 6px 8px; font-size: 13px;
  border: 1.5px solid var(--border); border-radius: 6px; text-align: center;
}
```

---

### 4.21 Responsive Breakpoints

| Breakpoint | Aturan Utama |
|---|---|
| `max-width: 480px` | Tombol lebih tinggi (min-height 40-44px), teks lebih kecil |
| `max-width: 640px` | `.flex-row` berubah jadi kolom vertikal; padding card dikurangi |
| `max-width: 768px` | Tabel linen disembunyikan → card-list; modal padding dikecilkan; sticky-save-bar aktif |
| `min-width: 1025px` | FAB disembunyikan (`display: none`); sticky-save-bar dibuat static |

```css
@media print {
  /* Sembunyikan elemen non-cetak saat print */
  .no-print, #loginPage, .nav-tabs, header, .modal:not(#customConfirmModal) {
    display: none !important;
  }
  body { background: white; }
}
```

---

### 4.22 Aksesibilitas (Focus Visible)

```css
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Standar WCAG — outline biru muncul hanya saat navigasi keyboard, tidak saat klik mouse.

---

## 5. index.html — Struktur DOM

### 5.1 Head Section

```html
<!doctype html>
<html lang="id">      <!-- lang="id": bahasa Indonesia, penting untuk aksesibilitas -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- viewport: skala 1:1 di mobile, tidak dizoom otomatis -->
  <title>Pelangi Laundry - v24 Final</title>
  <link rel="stylesheet" href="style.css">
  <!-- CSS di head: dirender sebelum body tampil, mencegah FOUC (Flash of Unstyled Content) -->
</head>
```

---

### 5.2 Toast Container

```html
<div class="toast-container" id="toastContainer"></div>
```

Kosong di HTML — diisi secara dinamis oleh fungsi `toast()` di `script.js` setiap ada notifikasi.

---

### 5.3 Custom Confirm Modal

```html
<div class="modal" id="customConfirmModal">
  <div class="modal-content" style="max-width:400px; text-align:center;">
    <h3 id="customConfirmMessage">Konfirmasi</h3>
    <button class="btn btn-secondary" onclick="customConfirmRespond(false)">Batal</button>
    <button class="btn btn-danger"    onclick="customConfirmRespond(true)">Ya, Lanjutkan</button>
  </div>
</div>
```

Menggantikan `window.confirm()` bawaan browser yang tidak bisa di-styling. Berbasis `Promise` — kode yang memanggil `await customConfirm(...)` akan menunggu hingga user memilih.

---

### 5.4 Halaman Login (`#loginPage`)

```html
<div id="loginPage">
  <div class="login-box">
    <div class="login-logo">🌈</div>
    <h2>Pelangi Laundry</h2>
    <p>Sistem Manajemen Laundry v24</p>

    <!-- Pesan error, default tersembunyi -->
    <div id="loginError" style="display:none; color:var(--danger); ...">
      ⚠️ Username atau Password salah!
    </div>

    <div class="form-group">
      <label>Username</label>
      <!-- onkeydown Enter: langsung prosesLogin() tanpa klik tombol -->
      <input type="text" id="username" onkeydown="if(event.key==='Enter') prosesLogin()">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" onkeydown="if(event.key==='Enter') prosesLogin()">
    </div>
    <button class="btn btn-primary btn-block" onclick="prosesLogin()">Masuk →</button>
  </div>
</div>
```

---

### 5.5 App Content (`#appContent`)

```html
<div id="appContent" style="display:none">
  <!-- Seluruh konten utama. Default tersembunyi, muncul setelah login. -->
```

#### Header:
```html
<header class="no-print">
  <h1>🌈 PELANGI LAUNDRY</h1>
  <div class="header-right">
    <span class="user-badge" id="roleBadge">-</span>   <!-- "👑 ADMIN" atau "👤 USER" -->
    <button class="btn-sm btn-secondary" onclick="logout()">Logout</button>
  </div>
</header>
```

#### Navigasi Dua Tingkat:
```html
<div class="nav-tabs no-print" id="navigationTabs">

  <!-- Kategori utama -->
  <nav class="nav-categories" id="navCategories" role="tablist">
    <button class="cat-btn active"   data-cat="transaksi" onclick="switchCategory('transaksi')">📊 Transaksi</button>
    <button class="cat-btn admin-only" data-cat="tagihan"  onclick="switchCategory('tagihan')"> 🧾 Tagihan</button>
    <button class="cat-btn admin-only" data-cat="keuangan" onclick="switchCategory('keuangan')">💰 Keuangan</button>
    <button class="cat-btn admin-only" data-cat="sistem"   onclick="switchCategory('sistem')">  ⚙️ Sistem</button>
  </nav>

  <!-- Sub-tab: dirender ulang oleh switchCategory() -->
  <nav class="nav-subtabs" id="navSubtabs" role="tablist">
    <!-- Konten dinamis dari JS -->
  </nav>

</div>
```

`admin-only` = class yang disembunyikan untuk role "user" (hanya admin yang bisa akses Tagihan, Keuangan, Sistem).

---

### 5.6 Tab-Tab Konten

Semua tab adalah `div.tab-content` dengan `style="display:none"` default. Satu per satu ditampilkan oleh `switchTab()`:

| ID Tab | Konten |
|---|---|
| `tab-nota` | Form input transaksi baru (linen qty atau berat RS) |
| `tab-rekap` | Riwayat & pencarian nota |
| `tab-invoice` | Invoice tagihan bulanan |
| `tab-kuitansi` | Cetak kuitansi pembayaran |
| `tab-omset` | Dashboard keuangan (8 kotak angka) |
| `tab-laporan` | Laporan Laba Rugi & Neraca |
| `tab-utang` | Manajemen utang usaha + cicilan |
| `tab-master` | Master data: pelanggan, linen, jenis nota, karyawan, pengaturan, kop surat |
| `tab-absen` | Absensi harian karyawan |
| `tab-gaji` | Hitung gaji karyawan per periode |
| `tab-backup` | Backup & restore data JSON |

#### Tab Input Nota — Form Hotel:
```html
<div id="tab-nota" class="tab-content">
  <div class="card">
    <div class="flex-row">
      <div class="form-group" style="flex:1">
        <label>Tanggal</label><input type="date" id="notaTanggal">
      </div>
      <div class="form-group" style="flex:2">
        <label>Pelanggan</label>
        <!-- Diisi oleh renderPelangganDropdowns() -->
        <select id="pelangganSelect" onchange="cekTipePelangganInput()"></select>
      </div>
      <div class="form-group" style="flex:2">
        <label>Jenis Nota</label>
        <!-- Diisi oleh renderJenisNotaDropdown() -->
        <select id="jenisNota" onchange="renderFormLinenInput()"></select>
      </div>
    </div>

    <!-- Form Hotel: tabel linen + input qty -->
    <div id="formHotel">
      <div class="linen-table-wrap"> <!-- Desktop: tabel -->
        <table class="linen-table">
          <tbody id="tabelLinenInput"></tbody> <!-- Diisi dinamis -->
        </table>
      </div>
      <div class="linen-card-list" id="linenCardList"></div> <!-- Mobile: card -->
    </div>

    <!-- Form RS: input berat KG -->
    <div id="formRS" style="display:none">
      <input type="number" id="beratRS" step="0.1" min="0">
      <p id="infoTarifRS"></p>
    </div>

    <!-- Tombol simpan (sticky di mobile) -->
    <div class="sticky-save-bar">
      <button class="btn btn-success btn-block" onclick="simpanNotaSistem()" id="btnSimpanNota">
        ✓ Simpan Transaksi
      </button>
    </div>
  </div>
</div>
```

---

### 5.7 Tab Keuangan — Finance Grid

```html
<div id="tab-omset" class="tab-content">
  <div class="finance-grid">
    <div class="finance-box bg-income"><p>Penjualan Bersih</p><h3 id="boxTotalOmset">Rp 0</h3></div>
    <div class="finance-box bg-expense"><p>Total HPP</p><h3 id="boxTotalHPP">Rp 0</h3></div>
    <div class="finance-box" style="background:linear-gradient(135deg,#f97316,#ea580c)">
      <p>Biaya Adm & Umum</p><h3 id="boxTotalAdm">Rp 0</h3>
    </div>
    <div class="finance-box bg-profit"><p>Laba Bersih</p><h3 id="boxLabaBersih">Rp 0</h3></div>
    <div class="finance-box" style="background:linear-gradient(135deg,#eab308,#ca8a04)">
      <p>Piutang Usaha</p><h3 id="boxPiutang">Rp 0</h3>
    </div>
    <div class="finance-box" style="background:linear-gradient(135deg,#b91c1c,#991b1b)">
      <p>Utang Usaha</p><h3 id="boxTotalUtang">Rp 0</h3>
    </div>
    <div class="finance-box" style="background:linear-gradient(135deg,#0d9488,#0f766e)">
      <p>Kas / Bank</p><h3 id="boxKas">Rp 0</h3>
    </div>
    <div class="finance-box" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)">
      <p>Modal Bersih</p><h3 id="boxModal">Rp 0</h3>
    </div>
  </div>
  <!-- ... form filter & tabel pengeluaran ... -->
</div>
```

---

### 5.8 Modal-Modal (10 Modal Total)

| ID Modal | Fungsi |
|---|---|
| `customConfirmModal` | Dialog konfirmasi (Ya/Batal) |
| `detailModal` | Lihat detail item nota |
| `editLinenModal` | Edit qty linen di nota |
| `editBiayaModal` | Edit data pengeluaran |
| `editGajiModal` | Edit insentif/lembur/potongan karyawan |
| `editKaryawanModal` | Edit data karyawan |
| `modalMasterLinen` | CRUD master daftar linen |
| `modalMasterJenisNota` | CRUD jenis nota (REGULER, FLAT, dll) |
| `modalAturLinenJenisNota` | Pilih linen mana yang aktif per jenis nota |
| `modalDetailPelanggan` | Edit pelanggan + harga linen + urutan drag-drop |

---

### 5.9 FAB (Floating Action Button) — Mobile Only

```html
<button class="fab" id="fabBtn" aria-label="Quick actions" onclick="toggleFab()">
  <span class="fab-icon">+</span>
</button>
<div class="fab-menu" id="fabMenu" role="menu">
  <button class="fab-item" onclick="fabAction('invoice')">🧾 Invoice</button>
  <button class="fab-item" onclick="fabAction('gaji')">💵 Gaji</button>
  <button class="fab-item" onclick="fabAction('absensi')">📅 Absensi</button>
</div>
```

Shortcut navigasi cepat di mobile. Disembunyikan di desktop (≥1025px) via CSS.

---

### 5.10 Script Loading

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- Library Supabase dari CDN -->

<script src="supabaseClient.js"></script>
<!-- Inisialisasi koneksi Supabase, mengekspos variabel global `db` -->

<script src="script.js" defer></script>
<!-- defer: script dijalankan setelah seluruh DOM selesai di-parse
     Ini mencegah error "element not found" karena DOM belum siap -->
```

---

## 6. script.js Bagian 1 — Inisialisasi & Helper

### 6.1 Custom Confirm (Promise-based)

```javascript
let customConfirmResolve = null;

window.customConfirm = function(message) {
  return new Promise((resolve) => {
    document.getElementById('customConfirmMessage').innerText = message;
    document.getElementById('customConfirmModal').style.display = 'flex';
    customConfirmResolve = resolve; // Simpan resolve agar dipanggil saat user klik
  });
};

window.customConfirmRespond = function(response) {
  document.getElementById('customConfirmModal').style.display = 'none';
  if (customConfirmResolve) {
    customConfirmResolve(response); // true = Ya, false = Batal
    customConfirmResolve = null;    // Reset agar tidak terpanggil lagi
  }
};
```

**Cara pakai di kode lain:**
```javascript
if (!await window.customConfirm("Hapus nota ini?")) return;
// Kode lanjut HANYA jika user klik "Ya, Lanjutkan"
```

---

### 6.2 DB_DEFAULTS — Nilai Awal localStorage

```javascript
const DB_DEFAULTS = {
  DB_NOTA: [],
  DB_BIAYA: [],
  DB_LOCKS: {},            // { "namaHotel_2025-01": true/false }
  DB_PAYMENT_STATUS: {},   // { "namaHotel_2025-01": true/false }
  DB_KARYAWAN: [],
  DB_ABSENSI: [],
  DB_GAJI: [],
  DB_BACKUP_HISTORY: [],

  DB_PENGATURAN: {
    tarifInternalHotel: 7000,  // Rp/KG untuk konversi total → KG (hitung gaji)
    ongkosPerKg: 1200,         // Rp/KG untuk upah borongan karyawan
    rekeningName: "",
    rekeningNo: "",
    bank: "",
    direktur: "Bagus Riadi Kurniawan",
    peralatan: 0
  },

  DB_KOP: { nama: "", alamat: "", telepon: "", email: "", kontak: "" },
  DB_INVOICE_NUMBERS: {},  // { "GDS_2025-01": "001/PL-GDS/I/2025" }
  DB_INVOICE_COUNTER: {},  // { "GDS_2025": 3 } — counter per pelanggan per tahun

  DB_JENIS_NOTA: [
    { name: "REGULER",      multiplier: 1,   forFlat: false, forReguler: true  },
    { name: "FLAT",         multiplier: 1,   forFlat: true,  forReguler: false },
    { name: "FLAT ASLI",    multiplier: 1,   forFlat: true,  forReguler: false },
    { name: "SPOTING",      multiplier: 2,   forFlat: true,  forReguler: true  },
    { name: "GUEST LAUNDRY",multiplier: 1,   forFlat: true,  forReguler: true  },
    { name: "NON FLAT",     multiplier: 1.5, forFlat: true,  forReguler: false },
    { name: "FNB",          multiplier: 1.2, forFlat: true,  forReguler: false },
  ],

  DB_PELANGGAN: [
    { id:1, name:"Tab Capsule Hotel Kayoon", type:"HOTEL", billingSystem:"REGULER", flatRate:0, tarifRS:0 },
    { id:2, name:"Hotel Great",              type:"HOTEL", billingSystem:"FLAT",    flatRate:15000000 },
    { id:3, name:"RS Siti Khodijah",         type:"RS",    billingSystem:"REGULER", tarifRS:7000 },
  ],

  DB_MASTER_LINEN: [
    { id:1, name:"Sheet King" },
    { id:2, name:"Pillow Case" },
    { id:3, name:"Bath Towel" },
  ],

  DB_HARGA_PELANGGAN: {},   // { pelangganId: { linenId: harga } }
  DB_LINEN_PELANGGAN: {},   // { pelangganId: [{linenId, urutan}] }
};

// Inisialisasi: set default HANYA jika key belum ada di localStorage
Object.keys(DB_DEFAULTS).forEach((key) => {
  if (!localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify(DB_DEFAULTS[key]));
});
```

---

### 6.3 Variabel Global Runtime

```javascript
let jenisNotaList = [];     // Cache jenis nota dari Supabase
let pelangganList = [];     // Cache pelanggan
let masterLinen = [];       // Cache master linen
let karyawanList = [];      // Cache karyawan
let absensiList = [];       // Cache absensi
let pengaturan = {};        // Setting global
let hargaPelanggan = {};    // Map: { pelangganId: { linenId: harga } }
let currentUserRole = "";   // "admin" atau "user"
let isInvoicePaid = false;  // Status bayar invoice yang sedang dilihat
let _hasilGaji = [];        // Hasil hitung gaji (untuk akses saat cetak slip)
let _gajiAktif = null;      // Referensi gaji yang sedang diedit
```

---

### 6.4 Helper: Linen per Pelanggan

#### `getLinenPelanggan(pelangganId)`
```javascript
function getLinenPelanggan(pelangganId) {
  const db = JSON.parse(localStorage.getItem("DB_LINEN_PELANGGAN") || "{}");
  const list = db[pelangganId];
  if (!list || list.length === 0) {
    // Fallback: tampilkan semua linen dengan urutan default
    return masterLinen.map((m, idx) => ({ linenId: m.id, urutan: idx }));
  }
  return [...list].sort((a, b) => a.urutan - b.urutan); // Urutkan berdasarkan urutan
}
```

#### `saveLinenPelanggan(pelangganId, list)` — Simpan ke localStorage
```javascript
function saveLinenPelanggan(pelangganId, list) {
  const db = JSON.parse(localStorage.getItem("DB_LINEN_PELANGGAN") || "{}");
  db[pelangganId] = list;
  localStorage.setItem("DB_LINEN_PELANGGAN", JSON.stringify(db));
}
```

---

### 6.5 Drag & Drop Linen (`initLinenDragDrop`)

Mengimplementasikan HTML5 Drag and Drop API untuk mengurutkan linen:

```javascript
function initLinenDragDrop(tbody) {
  let dragSrcEl = null;

  tbody.querySelectorAll('.linen-drag-row').forEach(row => {
    row.addEventListener('dragstart', function(e) {
      dragSrcEl = this;
      e.dataTransfer.effectAllowed = 'move';
      this.classList.add('dragging'); // CSS: opacity 0.4 + border putus-putus
      e.dataTransfer.setData('text/plain', ''); // Wajib di Firefox
    });

    row.addEventListener('dragover', function(e) {
      e.preventDefault(); // Izinkan drop
      e.dataTransfer.dropEffect = 'move';
    });

    row.addEventListener('dragenter', function(e) {
      if (dragSrcEl !== this) this.classList.add('over');
    });

    row.addEventListener('dragleave', function(e) {
      this.classList.remove('over');
    });

    row.addEventListener('drop', function(e) {
      e.stopPropagation(); e.preventDefault();
      this.classList.remove('over');
      if (dragSrcEl && dragSrcEl !== this) {
        // Hitung apakah drop di atas/bawah tengah baris
        const rect = this.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        tbody.insertBefore(dragSrcEl, next ? this.nextSibling : this);
      }
    });

    row.addEventListener('dragend', function(e) {
      // Bersihkan semua class sisa
      tbody.querySelectorAll('.linen-drag-row').forEach(r => {
        r.classList.remove('dragging', 'over');
      });
    });
  });
}
```

---

### 6.6 Helper Utility Lengkap

#### `toast(msg, type, dur)` — Notifikasi popup
```javascript
function toast(msg, type = "success", dur = 3000) {
  const icons = { success: "✓", error: "✗", warning: "⚠", info: "ℹ" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById("toastContainer").appendChild(el);
  setTimeout(() => {
    el.style.animation = "toastOut 0.3s ease forwards"; // Animasi keluar
    setTimeout(() => el.remove(), 300);
  }, dur);
}
```

#### `loadingThen(label, asyncFn)` — Wrapper async dengan toast info
```javascript
function loadingThen(label, asyncFn) {
  toast(`${label}...`, "info", 1500); // Tampilkan info sementara
  Promise.resolve(asyncFn()).catch(err => {
    console.error(err);
    toast("Gagal memproses dokumen.", "error");
  });
}
```

#### `formatCurrencyInput(input)` — Format angka saat ketik
```javascript
function formatCurrencyInput(input) {
  let v = input.value.replace(/\D/g, ""); // Hapus semua non-digit
  input.value = v ? parseInt(v).toLocaleString("id-ID") : "";
  // "1500000" → "1.500.000"
}
```

#### `parseCurrencyValue(str)` — Parsing balik ke angka
```javascript
function parseCurrencyValue(str) {
  return parseInt(str.toString().replace(/\./g, "").replace(/[^\d]/g, "")) || 0;
  // "1.500.000" → 1500000
}
```

#### `fmtRp(val)` — Format tampilan Rupiah
```javascript
function fmtRp(val) {
  const abs = Math.abs(val);
  const sign = val < 0 ? "- " : "";
  return sign + "Rp " + Math.floor(abs).toLocaleString("id-ID");
  // -1500000 → "- Rp 1.500.000"
  //  1500000 → "Rp 1.500.000"
}
```

#### `terbilang(angka)` — Angka ke teks Indonesia (rekursif)
```javascript
function terbilang(angka) {
  if (angka === 0) return "nol";
  const s = ["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];
  if (angka < 12)   return s[angka];
  if (angka < 20)   return terbilang(angka - 10) + " belas";          // 12–19
  if (angka < 100)  return s[Math.floor(angka/10)] + " puluh " + terbilang(angka%10);
  if (angka < 200)  return "seratus " + terbilang(angka - 100);
  if (angka < 1000) return s[Math.floor(angka/100)] + " ratus " + terbilang(angka%100);
  if (angka < 2000) return "seribu " + terbilang(angka - 1000);
  if (angka < 1e6)  return terbilang(Math.floor(angka/1000)) + " ribu " + terbilang(angka%1000);
  if (angka < 1e9)  return terbilang(Math.floor(angka/1e6))  + " juta " + terbilang(angka%1e6);
  return terbilang(Math.floor(angka/1e9)) + " milyar " + terbilang(angka%1e9);
}
// Contoh: terbilang(1500000) → "satu juta lima ratus ribu"
```

#### `generateNotaId(tgl)` — ID nota unik
```javascript
function generateNotaId(tgl) {
  return `${tgl.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
  // "2025-01-15" → "20250115-5432"
}
```

#### `setBtnLoading(btn, loading)` — Loading state tombol
```javascript
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) { btn.classList.add('loading'); btn.disabled = true; }
  else         { btn.classList.remove('loading'); btn.disabled = false; }
}
// Pola penggunaan:
// const btn = document.getElementById('btnSimpan');
// setBtnLoading(btn, true);
// try { /* operasi async */ } finally { setBtnLoading(btn, false); }
```

---

### 6.7 IndexedDB untuk Logo (`openKopDB`, `saveLogoToIndexedDB`, `getLogoFromIndexedDB`)

Logo usaha disimpan di **IndexedDB** (bukan localStorage) karena ukurannya bisa besar (base64 image bisa >1MB, sedangkan localStorage limitnya ~5MB total):

```javascript
function openKopDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("PelangiLaundry", 1);
    r.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains("logo"))
        e.target.result.createObjectStore("logo"); // Buat store jika belum ada
    };
    r.onsuccess = (e) => resolve(e.target.result);
    r.onerror   = (e) => reject(e.target.error);
  });
}

async function saveLogoToIndexedDB(file) {
  // Konversi file → base64 DataURL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const db = await openKopDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logo", "readwrite");
    tx.objectStore("logo").put(dataUrl, "kop"); // Key "kop"
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function getLogoFromIndexedDB() {
  try {
    const db = await openKopDB();
    return new Promise((resolve) => {
      const tx = db.transaction("logo", "readonly");
      const req = tx.objectStore("logo").get("kop");
      req.onsuccess = () => {
        const r = req.result;
        if (typeof r === "string") resolve(r);         // String base64
        else if (r instanceof Blob) resolve(URL.createObjectURL(r)); // Blob
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}
```

---

### 6.8 `refreshDataSistem()` — Sinkronisasi Master dari Supabase

Fungsi ini dijalankan setiap login dan setelah setiap operasi write penting. Menarik semua data secara paralel dengan `Promise.all`:

```javascript
async function refreshDataSistem() {
  showLoading("Sinkronisasi data...");
  try {
    // Tarik 15 tabel sekaligus secara paralel
    const [{ data: jn }, { data: pl }, { data: ml }, ...] = await Promise.all([
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

    // Transform format Supabase (snake_case) → format JS (camelCase)
    jenisNotaList = jn.map(j => ({
      name: j.name, multiplier: j.multiplier,
      forFlat: j.for_flat, forReguler: j.for_reguler,
      linen_config: j.linen_config || []
    }));

    pelangganList = pl.map(p => ({
      id: p.id, name: p.nama, kode: p.kode,
      type: p.tipe, billingSystem: p.billing_system,
      flatRate: p.flat_rate, tarifRS: p.tarif_rs,
      alamat: p.alamat, kota: p.kota
    }));

    // ... transformasi tabel lainnya ...

    // Simpan semua ke localStorage sebagai cache
    localStorage.setItem("DB_JENIS_NOTA",    JSON.stringify(jenisNotaList));
    localStorage.setItem("DB_PELANGGAN",     JSON.stringify(pelangganList));
    // ... dst ...

    // Tarik nota terpisah (bisa banyak, jadi dipisah)
    const { data: notaData } = await db.from("nota").select("*");
    localStorage.setItem("DB_NOTA", JSON.stringify((notaData||[]).map(normalizeNota)));

    // Render semua UI
    renderPelangganDropdowns();
    renderJenisNotaDropdown();
    renderFormLinenInput();
    // ... dst ...

  } catch (err) {
    toast("Gagal memuat data dari server.", "error");
  } finally {
    hideLoading();
  }
}
```

#### `showLoading` / `hideLoading` — Overlay Loading
```javascript
function showLoading(text = "Memuat...") {
  let el = document.getElementById("globalLoadingOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "globalLoadingOverlay";
    el.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.75);z-index:9999;...";
    el.innerHTML = `<div style="border-top:4px solid #1e3a5f;border-radius:50%;animation:spin..."></div>
                    <p>${text}</p>`;
    document.body.appendChild(el);
  } else { el.querySelector("p").innerText = text; el.style.display = "flex"; }
}

function hideLoading() {
  const el = document.getElementById("globalLoadingOverlay");
  if (el) el.style.display = "none";
}
```

---

### 6.9 `generateKodePelanggan(nama)` — Auto-generate Kode

```javascript
function generateKodePelanggan(nama) {
  // Kata-kata generik yang diabaikan
  const GENERIC = ["HOTEL","HOTELS","THE","RS","RUMAH","SAKIT","TAB","CAPSULE","CLINIC","VILLA","RESORT","APARTEMEN"];
  const kata = (nama || "").toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  let kode = "";
  for (const k of kata) {
    if (GENERIC.includes(k)) continue; // Lewati kata generik
    kode += k[0]; // Ambil huruf pertama
    if (kode.length >= 5) break;
  }
  return kode || (kata[0] ? kata[0].substring(0, 3) : "PL");
  // "Tab Capsule Hotel Kayoon" → skip "TAB","CAPSULE","HOTEL" → "K" → "KAY" → ... → "K"
  // "Hotel Great" → skip "HOTEL" → "G" → kode = "G"
}
```

---

## 7. script.js Bagian 2 — Nomor Invoice & Login

### 7.1 `toRoman(monthNum)` — Bulan ke Romawi

```javascript
function toRoman(monthNum) {
  const r = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  return r[monthNum] || "";
  // 1→"I", 6→"VI", 12→"XII"
}
```

---

### 7.2 `getInvoiceStableNumber(kode, bln)` — Nomor Invoice Stabil

```javascript
async function getInvoiceStableNumber(kode, bln) {
  // kode = "GDS", bln = "2025-01"
  const [tahunStr, bulanStr] = bln.split("-");
  const tahun    = parseInt(tahunStr, 10);
  const bulanNum = parseInt(bulanStr, 10);
  const cacheKey = `${kode}_${bln}`; // "GDS_2025-01"

  // Langkah 1: Cek cache localStorage — jika sudah ada, kembalikan yang sama (STABLE)
  const cached = JSON.parse(localStorage.getItem("DB_INVOICE_NUMBERS")) || {};
  if (cached[cacheKey]) return cached[cacheKey];

  // Langkah 2: Generate nomor baru
  const counters   = JSON.parse(localStorage.getItem("DB_INVOICE_COUNTER")) || {};
  const counterKey = `${kode}_${tahun}`; // "GDS_2025"
  let urut = (counters[counterKey] || 0) + 1; // Increment counter
  counters[counterKey] = urut;
  localStorage.setItem("DB_INVOICE_COUNTER", JSON.stringify(counters));

  // Format: "001/PL-GDS/I/2025"
  const nomor = `${String(urut).padStart(3,"0")}/PL-${kode}/${toRoman(bulanNum)}/${tahun}`;

  // Simpan ke cache
  cached[cacheKey] = nomor;
  localStorage.setItem("DB_INVOICE_NUMBERS", JSON.stringify(cached));

  // Sync ke Supabase
  await db.from("invoice_numbers").upsert({ cache_key: cacheKey, nomor }, { onConflict: "cache_key" });
  await db.from("invoice_counter").upsert({ counter_key: counterKey, nilai: urut }, { onConflict: "counter_key" });

  return nomor;
}
```

**Mengapa "stable"?**  
Nomor invoice hukumnya tidak boleh berubah setiap kali dicetak ulang. Sistem menyimpan nomor yang sudah pernah digenerate dan mengembalikan yang sama persis.

**Contoh hasil:** `003/PL-GDS/I/2025` = Invoice ke-3, Pelangi Laundry, pelanggan GDS, bulan Januari 2025.

---

### 7.3 `setCounterAwalPelanggan(kode, tahun, nilai)` — Set Nomor Awal

Digunakan saat admin ingin menyambung nomor invoice dengan fisik yang sudah ada:

```javascript
async function setCounterAwalPelanggan(kode, tahun, nilai) {
  const counters = JSON.parse(localStorage.getItem("DB_INVOICE_COUNTER")) || {};
  counters[`${kode}_${tahun}`] = nilai;
  localStorage.setItem("DB_INVOICE_COUNTER", JSON.stringify(counters));
  await db.from("invoice_counter").upsert({ counter_key: `${kode}_${tahun}`, nilai }, { onConflict: "counter_key" });
}
```

---

### 7.4 Login & Logout

```javascript
function prosesLogin() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  if ((u === "admin" && p === "admin") || (u === "user" && p === "user")) {
    currentUserRole = u;
    document.getElementById("loginError").style.display = "none";
    bukaAplikasi();
  } else {
    document.getElementById("loginError").style.display = "block"; // Tampilkan pesan error
  }
}
```

**Dua role yang tersedia:**
- `admin` / `admin` → Akses penuh: Transaksi + Tagihan + Keuangan + Sistem
- `user` / `user` → Hanya tab Transaksi (Input Nota & Riwayat Nota)

```javascript
async function bukaAplikasi() {
  // 1. Sembunyikan login, tampilkan app
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appContent").style.display = "block";

  // 2. Set badge role
  document.getElementById("roleBadge").innerText =
    currentUserRole === "admin" ? "👑 ADMIN" : "👤 USER";

  // 3. Sembunyikan menu admin-only untuk role user
  if (currentUserRole !== "admin")
    document.querySelectorAll(".admin-only").forEach(e => e.style.display = "none");
  else
    document.querySelectorAll(".admin-only").forEach(e => e.style.display = "");

  // 4. Set tanggal default = hari ini di semua input date
  const today = new Date().toISOString().split("T")[0]; // "2025-01-15"
  document.getElementById("notaTanggal").value = today;
  document.getElementById("cariTanggal").value = today;
  document.getElementById("absensiTanggal").value = today;
  document.getElementById("expTanggal").value = today;
  // ... dst ...

  // 5. Set range gaji default: hari ini s/d +13 hari
  const end = new Date(); end.setDate(end.getDate() + 13);
  document.getElementById("gajiTglSelesai").value = end.toISOString().split("T")[0];

  // 6. Set filter pengeluaran: awal bulan ini s/d hari ini
  const now = new Date();
  document.getElementById("filterExpMulai").value =
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  document.getElementById("filterExpSelesai").value = today;

  // 7. Load semua data dari Supabase
  await refreshDataSistem();

  // 8. Cek peringatan backup
  cekPeringatanBackup();

  // 9. Buka tab pertama
  switchTab("tab-nota");
}

function logout() {
  currentUserRole = "";
  isInvoicePaid = false;
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("appContent").style.display = "none";
}
```

---

## 8. script.js Bagian 3 — Transaksi Nota

### 8.1 Render Dropdown Pelanggan

```javascript
function renderPelangganDropdowns() {
  // Update 3 dropdown sekaligus: nota, invoice, kuitansi
  ["pelangganSelect", "invoicePelangganSelect", "kuitansiPelangganSelect"].forEach(id => {
    const sel = document.getElementById(id);
    const prev = sel.value; // Simpan nilai sebelumnya
    sel.innerHTML = "";
    pelangganList.forEach(p => {
      sel.innerHTML += `<option value="${p.name}">
        ${p.type === "HOTEL" ? "🏨" : "🏥"} ${p.name}
      </option>`;
    });
    // Pertahankan pilihan sebelumnya jika masih ada
    if (prev && pelangganList.find(p => p.name === prev)) sel.value = prev;
  });
  cekTipePelangganInput();
}
```

---

### 8.2 `cekTipePelangganInput()` — Tampil Form Sesuai Tipe

```javascript
function cekTipePelangganInput() {
  const pData = pelangganList.find(p => p.name === document.getElementById("pelangganSelect").value);

  if (pData && pData.type === "RS") {
    // Rumah Sakit: tampilkan form kiloan, sembunyikan form hotel
    document.getElementById("formHotel").style.display = "none";
    document.getElementById("formRS").style.display = "block";
    document.getElementById("jenisNota").innerHTML = '<option value="KILOAN">KILOAN</option>';
    document.getElementById("jenisNota").disabled = true;
    document.getElementById("infoTarifRS").innerText =
      `🏥 ${pData.name}: Rp ${(pData.tarifRS||0).toLocaleString("id-ID")} / KG`;
  } else {
    // Hotel: tampilkan form linen
    document.getElementById("formHotel").style.display = "block";
    document.getElementById("formRS").style.display = "none";
    renderJenisNotaDropdown();
  }
  renderFormLinenInput();
}
```

---

### 8.3 `renderJenisNotaDropdown()` — Filter Jenis Nota

```javascript
function renderJenisNotaDropdown(selected = null) {
  const pel = pelangganList.find(p => p.name === document.getElementById("pelangganSelect").value);
  const sel = document.getElementById("jenisNota");
  const prev = selected || sel.value;
  sel.innerHTML = "";

  if (pel && pel.type === "RS") {
    sel.innerHTML = '<option value="KILOAN">KILOAN</option>';
    sel.disabled = true; return;
  }

  sel.disabled = false;
  // Filter: FLAT customer hanya tampilkan jenis yang forFlat=true, dst.
  const filtered = pel && pel.type === "HOTEL"
    ? jenisNotaList.filter(j => pel.billingSystem === "FLAT" ? j.forFlat : j.forReguler)
    : jenisNotaList;

  filtered.forEach(j => {
    sel.innerHTML += `<option value="${j.name}" ${prev === j.name ? "selected" : ""}>
      ${j.name} (${j.multiplier}x)
    </option>`;
  });
}
```

---

### 8.4 `getHargaPerPelanggan(pelangganId, linenId, multiplier)` — Kalkulasi Harga

```javascript
function getHargaPerPelanggan(pelangganId, linenId, multiplier) {
  const hrg = hargaPelanggan[pelangganId];
  if (hrg && hrg[linenId] !== undefined && hrg[linenId] !== null) {
    return Math.floor(hrg[linenId] * multiplier);
    // Harga dasar × multiplier jenis nota
    // Contoh: Sheet King = Rp 5.000, jenis SPOTING (2x) → Rp 10.000
  }
  return 0; // Harga belum diset → tampil 0
}
```

---

### 8.5 `renderFormLinenInput()` — Build Tabel/Card Linen

```javascript
function renderFormLinenInput() {
  const jName = document.getElementById("jenisNota").value;
  const jData = jenisNotaList.find(j => j.name === jName);
  const mult  = jData ? jData.multiplier : 1;

  const pelName = document.getElementById("pelangganSelect").value;
  const pelData = pelangganList.find(p => p.name === pelName);
  const pelId   = pelData ? pelData.id : null;

  if (!pelId) {
    // Tampilkan pesan kosong
    return;
  }

  // Ambil linen aktif untuk pelanggan (sorted by urutan)
  let linenList = getLinenPelanggan(pelId);

  // Filter & urutkan berdasarkan konfigurasi jenis nota (jika ada)
  if (jData?.linen_config?.length > 0) {
    const allowed  = new Set(jData.linen_config.map(c => c.id));
    const orderMap = Object.fromEntries(jData.linen_config.map(c => [c.id, c.urutan]));
    linenList = linenList
      .filter(entry => allowed.has(entry.linenId))
      .sort((a, b) => (orderMap[a.linenId]??999) - (orderMap[b.linenId]??999));
  }

  // Render tabel (desktop) + card-list (mobile)
  linenList.forEach((entry, idx) => {
    const item       = masterLinen.find(m => m.id === entry.linenId);
    if (!item) return;
    const hargaSatuan = getHargaPerPelanggan(pelId, item.id, mult);

    // Baris tabel
    tbody.innerHTML += `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${fmtRp(hargaSatuan)}</td>
        <td>
          <input type="number" class="input-qty linen-item-qty"
            data-id="${item.id}" data-name="${item.name}"
            data-price="${hargaSatuan}" value="0" min="0">
        </td>
      </tr>`;

    // Card mobile
    cardList.innerHTML += `
      <div class="linen-card-item">
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="price">${fmtRp(hargaSatuan)}</div>
        </div>
        <input type="number" class="input-qty linen-item-qty"
          data-id="${item.id}" data-name="${item.name}"
          data-price="${hargaSatuan}" value="0" min="0">
      </div>`;
  });
}
```

---

### 8.6 `simpanNotaSistem()` — Simpan Transaksi

```javascript
async function simpanNotaSistem() {
  const btn = document.getElementById('btnSimpanNota');
  setBtnLoading(btn, true);
  try {
    const tgl = document.getElementById("notaTanggal").value;
    if (!tgl) { toast("Pilih tanggal!", "warning"); return; }

    const pelName = document.getElementById("pelangganSelect").value;
    const pData   = pelangganList.find(p => p.name === pelName);
    const jenis   = document.getElementById("jenisNota").value;
    let items = [], total = 0;

    // ─── CASE 1: Pelanggan RS → berbasis KG ─────────────────────────────
    if (pData && pData.type === "RS") {
      const berat = parseFloat(document.getElementById("beratRS").value) || 0;
      if (berat <= 0) { toast("Berat harus lebih dari 0 KG!", "warning"); return; }
      total = Math.floor(berat * pData.tarifRS);
      // Contoh: 50 KG × Rp 7.000/KG = Rp 350.000
      items.push({ idMaster: 0, name: "Cucian RS (Kiloan)", qty: berat, unit: "KG",
                   basePrice: pData.tarifRS, subtotal: total });
    }

    // ─── CASE 2: Hotel → berbasis jumlah linen (pcs) ────────────────────
    else {
      let hasNegative = false;
      document.querySelectorAll(".linen-item-qty").forEach(inp => {
        const qty = parseInt(inp.value) || 0;
        if (qty < 0) hasNegative = true;
        if (qty > 0) {
          const price = parseInt(inp.getAttribute("data-price"));
          const name  = inp.getAttribute("data-name");
          const idMaster = parseInt(inp.getAttribute("data-id"));
          const sub = Math.floor(qty * price);
          total += sub;
          items.push({ idMaster, name, qty, unit: "Pcs", basePrice: price, subtotal: sub });
        }
      });
      if (hasNegative) { toast("Jumlah item tidak boleh negatif!", "warning"); return; }
      if (total <= 0)  { toast("Masukkan jumlah item!", "warning"); return; }

      // Khusus FLAT customer + jenis nota FLAT → total = 0 (sudah cover flat rate)
      if (pData?.billingSystem === "FLAT" && jenis === "FLAT") {
        total = 0;
        items.forEach(it => it.subtotal = 0);
        toast("Nota FLAT disimpan (total 0).", "info", 2500);
      }
    }

    // ─── Simpan ke Supabase ──────────────────────────────────────────────
    const notaId = generateNotaId(tgl);
    const { error } = await db.from("nota").insert([{
      nota_id: notaId, tanggal: tgl, pelanggan_id: pData.id,
      jenis, total, items: JSON.parse(JSON.stringify(items))
    }]);
    if (error) { toast("Gagal menyimpan nota.", "error"); return; }

    toast(`Transaksi ${notaId} berhasil!`);
    // Reset form
    document.getElementById("beratRS").value = "";
    document.querySelectorAll(".linen-item-qty").forEach(i => i.value = 0);

    // Refresh data & UI
    await refreshDataSistem();
    await cariNotaSistem();
    await hitungMenejemenKeuangan();

  } finally { setBtnLoading(btn, false); }
}
```

---

### 8.7 `cariNotaSistem()` — Cari & Tampilkan Riwayat Nota

```javascript
async function cariNotaSistem() {
  const tgl       = document.getElementById("cariTanggal").value;
  const pelFilter = (document.getElementById("cariPelanggan").value || "").toLowerCase().trim();

  // Query Supabase dengan filter opsional
  let query = db.from("nota").select("*")
    .order("tanggal", { ascending: true })
    .order("id", { ascending: true });
  if (tgl) query = query.eq("tanggal", tgl);
  const { data: notaData } = await query;

  let hasil = notaData || [];

  // Filter nama pelanggan di sisi klien
  if (pelFilter) {
    const mapNama = {};
    pelangganList.forEach(p => mapNama[p.id] = p.name);
    hasil = hasil.filter(n => (mapNama[n.pelanggan_id] || "").toLowerCase().includes(pelFilter));
  }

  // Render tabel
  const tbody = document.getElementById("tabelRiwayatNota");
  tbody.innerHTML = hasil.map(nota => {
    const namaPel = mapNama[nota.pelanggan_id] || "?";
    let aksi = `<button onclick="bukaModalDetail(${nota.id})">Detail</button>
                <button onclick="bukaModalEditLinen(${nota.id})">Edit</button>`;
    if (currentUserRole === "admin")
      aksi += `<button onclick="hapusNotaDariInvoice(${nota.id},'rekap')">Hapus</button>`;
    return `<tr>
      <td><strong>${nota.nota_id}</strong></td>
      <td>${nota.tanggal}</td><td>${namaPel}</td>
      <td>${nota.jenis}</td>
      <td><strong>${fmtRp(nota.total)}</strong></td>
      <td>${aksi}</td>
    </tr>`;
  }).join("");
}
```

---

### 8.8 `hitungDanAmbilInvoice()` — Kompilasi Invoice Bulanan

```javascript
function hitungDanAmbilInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value;
  const bln = document.getElementById("invoiceBulanSelect").value;

  const dbStore = JSON.parse(localStorage.getItem("DB_NOTA") || "[]");
  const semua   = dbStore.filter(n => n.pelanggan === pel && n.tanggal.startsWith(bln));

  const pData         = pelangganList.find(p => p.name === pel);
  const isFlatCustomer = pData?.type === "HOTEL" && pData.billingSystem === "FLAT";
  const invoiceTerkunci = isInvoiceLocked(pel, bln);

  let totalNonFlat = 0;
  semua.forEach(nota => {
    if (!invoiceTerkunci) hitungUlangNota(nota); // Recalculate harga jika invoice belum dikunci

    const isNotaFlat = nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
    if (isFlatCustomer && isNotaFlat) {
      nota.total = 0; // Nota FLAT tidak dijumlahkan (sudah cover flat rate)
    } else {
      totalNonFlat += nota.total;
    }
  });

  // Hitung grand total
  const flatRate  = isFlatCustomer ? (pData.flatRate || 0) : 0;
  const grandTotal = Math.floor(flatRate + totalNonFlat);
  // flatRate = biaya langganan bulanan
  // totalNonFlat = nota non-flat (SPOTING, FNB, NON FLAT)
}
```

---

### 8.9 `hitungUlangNota(nota)` — Recalculate Harga Nota

```javascript
function hitungUlangNota(nota) {
  const jData = jenisNotaList.find(j => j.name === nota.jenis);
  const mult  = jData ? jData.multiplier : 1;
  const pData = pelangganList.find(p => p.name === nota.pelanggan);
  let total = 0;

  nota.items.forEach(it => {
    if (it.idMaster !== 0) { // Bukan RS
      const m = masterLinen.find(l => l.id === it.idMaster);
      if (m && pData) it.basePrice = getHargaPerPelanggan(pData.id, it.idMaster, mult);
    } else { // RS
      if (pData?.type === "RS") it.basePrice = pData.tarifRS;
    }
    it.subtotal = Math.floor((it.qty || 0) * it.basePrice);
    total += it.subtotal;
  });
  nota.total = total;
}
```

---

## 9. script.js Bagian 4 — Keuangan & Laporan

### 9.1 `hitungMenejemenKeuangan()` — Kalkulasi Keuangan Lengkap

```javascript
async function hitungMenejemenKeuangan() {
  showLoading("Menghitung keuangan...");
  try {
    // Ambil nota dari Supabase (data terbaru)
    const { data: dbNota } = await db.from("nota").select("*");

    // Ambil biaya dengan filter periode (dari UI)
    let biayaQuery = db.from("biaya").select("*");
    if (filterMulai)  biayaQuery = biayaQuery.gte("tanggal", filterMulai);
    if (filterSelesai) biayaQuery = biayaQuery.lte("tanggal", filterSelesai);
    const { data: dbBiaya } = await biayaQuery;

    // Ambil payment status
    const { data: paymentStatusData } = await db.from("payment_status").select("*");
    const paymentStatus = {};
    paymentStatusData.forEach(ps => paymentStatus[ps.key] = ps.is_paid);

    // ── Helper: total invoice per pelanggan per bulan ──────────────────
    const totalInvoiceOf = (pData, bln, arrNota) => {
      const isFlat = pData.type === "HOTEL" && pData.billingSystem === "FLAT";
      let total = 0;
      arrNota.filter(n => n.pelanggan_id === pData.id && n.tanggal.startsWith(bln))
        .forEach(nota => {
          if (isFlat && (nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI")) return;
          total += nota.total || 0;
        });
      if (isFlat) total += pData.flatRate || 0;
      return total;
    };

    // ── Kumpulkan semua bulan yang ada transaksi ───────────────────────
    const bulanSet = new Set();
    dbNota.forEach(nota => { if (nota.tanggal) bulanSet.add(nota.tanggal.substring(0, 7)); });

    // ── Hitung total pendapatan & pendapatan lunas ─────────────────────
    let totalPendapatan = 0, pendapatanLunas = 0;
    pelangganList.forEach(p => {
      bulanSet.forEach(bln => {
        const tagihan = totalInvoiceOf(p, bln, dbNota);
        if (tagihan > 0) {
          totalPendapatan += tagihan;
          if (paymentStatus[getLockKey(p.name, bln)]) pendapatanLunas += tagihan;
        }
      });
    });

    // ── Hitung HPP ────────────────────────────────────────────────────
    const sumByKat = (kat) =>
      (dbBiaya||[]).filter(b => b.kategori === kat).reduce((s,b) => s + (b.nominal||0), 0);

    const hpp = {
      gajiKaryawan: sumByKat("GAJI BORONGAN"),
      listrik:      sumByKat("LISTRIK 1") + sumByKat("LISTRIK 2"),
      gas:          sumByKat("GAS"),
      air:          sumByKat("AIR"),
      chemical:     sumByKat("CHEMICAL"),
      bbm:          sumByKat("BBM"),
      plastik:      sumByKat("PLASTIK"),
      pph:          sumByKat("PPH PS 23"),
    };
    const totalHPP = Object.values(hpp).reduce((a,b) => a+b, 0);

    // ── Hitung Biaya Administrasi & Umum ─────────────────────────────
    const biayaAdm = {
      gajiTetap:      sumByKat("GAJI TETAP"),
      makan:          sumByKat("MAKAN"),
      perawatanMesin: sumByKat("PERAWATAN MESIN"),
      iuranSampah:    sumByKat("IURAN SAMPAH"),
      iuranRT:        sumByKat("IURAN RT"),
      lainLain:       sumByKat("LAIN-LAIN"),
    };
    const totalAdm = Object.values(biayaAdm).reduce((a,b) => a+b, 0);

    // ── Rumus utama ───────────────────────────────────────────────────
    const penjualan = totalPendapatan;
    const labaBersih = penjualan - totalHPP - totalAdm;
    //   Laba Kotor  = Penjualan - HPP
    //   Laba Bersih = Laba Kotor - Biaya Adm

    // ── Piutang = tagihan yang BELUM lunas ────────────────────────────
    let piutang = 0;
    pelangganList.forEach(p => {
      bulanSet.forEach(bln => {
        const tagihan = totalInvoiceOf(p, bln, dbNota);
        if (tagihan > 0 && !paymentStatus[getLockKey(p.name, bln)]) piutang += tagihan;
      });
    });

    // ── Utang = biaya belum lunas + sisa cicilan utang aktif ─────────
    let utang = (dbBiaya||[]).filter(b => !b.lunas).reduce((s,b) => s + b.nominal, 0);
    utang += getUtangList().filter(u => u.status === "AKTIF").reduce((s,u) => s + u.sisaBulan * u.cicilan, 0);

    // ── Kas = pendapatan lunas - biaya yang sudah dibayar ────────────
    const biayaDibayar = (dbBiaya||[]).filter(b => b.lunas).reduce((s,b) => s + b.nominal, 0);
    const kas = pendapatanLunas - biayaDibayar;

    // ── Modal Bersih = Kas + Piutang + Peralatan - Utang ─────────────
    const peralatan = parseCurrencyValue(document.getElementById("settingPeralatan")?.value)
                      || pengaturan.peralatan || 0;
    const modal = kas + piutang + peralatan - utang;
    //   (Ini mencerminkan: Aset = Kewajiban + Modal → Neraca sederhana)

    // ── Update UI kotak keuangan ──────────────────────────────────────
    document.getElementById("boxTotalOmset").innerText = fmtRp(penjualan);
    document.getElementById("boxTotalHPP").innerText   = fmtRp(totalHPP);
    document.getElementById("boxTotalAdm").innerText   = fmtRp(totalAdm);
    document.getElementById("boxLabaBersih").innerText = fmtRp(labaBersih);
    document.getElementById("boxPiutang").innerText    = fmtRp(piutang);
    document.getElementById("boxTotalUtang").innerText = fmtRp(utang);
    document.getElementById("boxKas").innerText        = fmtRp(kas);
    document.getElementById("boxModal").innerText      = fmtRp(modal);

    // ── Render tabel riwayat pengeluaran ──────────────────────────────
    // ... render tabel biaya ...

  } catch (err) { toast("Gagal menghitung keuangan.", "error"); }
  finally { hideLoading(); }
}
```

**Ringkasan Formula Keuangan:**
```
Penjualan Bersih = Σ tagihan semua pelanggan semua bulan
Laba Kotor       = Penjualan - Total HPP
Laba Bersih      = Laba Kotor - Total Biaya Adm
Piutang          = Σ tagihan yang BELUM lunas
Kas              = Σ pendapatan yang LUNAS - Σ biaya yang sudah dibayar
Modal Bersih     = Kas + Piutang + Nilai Peralatan - Total Utang
```

---

### 9.2 `tampilkanLaporan()` — Laporan Laba Rugi & Neraca

Membuild HTML tabel laporan keuangan dengan data yang sudah ada di kotak dashboard:

```javascript
async function tampilkanLaporan() {
  await hitungMenejemenKeuangan(); // Pastikan data terbaru
  // Baca nilai dari kotak dashboard
  const penjualan  = parseCurrencyValue(document.getElementById("boxTotalOmset").innerText);
  const totalHPP   = parseCurrencyValue(document.getElementById("boxTotalHPP").innerText);
  const totalAdm   = parseCurrencyValue(document.getElementById("boxTotalAdm").innerText);
  const labaBersih = parseCurrencyValue(document.getElementById("boxLabaBersih").innerText);
  const piutang    = parseCurrencyValue(document.getElementById("boxPiutang").innerText);
  const utang      = parseCurrencyValue(document.getElementById("boxTotalUtang").innerText);
  const kas        = parseCurrencyValue(document.getElementById("boxKas").innerText);
  const modal      = parseCurrencyValue(document.getElementById("boxModal").innerText);
  const peralatan  = pengaturan.peralatan || 0;

  // Render 2 laporan: Laba Rugi + Neraca
  container.innerHTML = `
    <!-- Laporan Laba Rugi -->
    Penjualan Jasa          : ${fmtRp(penjualan)}
    Total HPP               : ${fmtRp(totalHPP)}
    ─────────────────────────────────
    LABA KOTOR              : ${fmtRp(penjualan - totalHPP)}
    Total Biaya Adm & Umum  : ${fmtRp(totalAdm)}
    ─────────────────────────────────
    LABA BERSIH             : ${fmtRp(labaBersih)}

    <!-- Neraca -->
    ASET
      Kas / Bank            : ${fmtRp(kas)}
      Piutang Usaha         : ${fmtRp(piutang)}
      Peralatan             : ${fmtRp(peralatan)}
      ──────────────────────
      Total Aset            : ${fmtRp(kas + piutang + peralatan)}

    KEWAJIBAN
      Utang Usaha           : ${fmtRp(utang)}

    MODAL
      Modal Bersih          : ${fmtRp(modal)}
      Aset = Kewajiban + Modal (persamaan akuntansi dasar)
  `;
}
```

---

## 10. script.js Bagian 5 — Gaji & Absensi

### 10.1 Render & Simpan Absensi

```javascript
function renderAbsensiTable() {
  const tgl = document.getElementById("absensiTanggal").value;
  if (!tgl || karyawanList.length === 0) return;

  let html = '<table class="linen-table"><tr><th>Nama</th><th>Status</th></tr>';
  karyawanList.forEach(k => {
    const exist  = absensiList.find(a => a.tanggal === tgl && a.karyawanId === k.id);
    const status = exist ? exist.status : "Hadir"; // Default: Hadir
    html += `<tr>
      <td>${k.nama}</td>
      <td>
        <select class="absen-status" data-kid="${k.id}">
          ${["Hadir","Izin","Alpa","Libur"].map(s => `<option ${status===s?"selected":""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`;
  });
  html += '</table><button class="btn btn-success" onclick="simpanAbsensi()">Simpan Absensi</button>';
  document.getElementById("absensiContainer").innerHTML = html;
}

async function simpanAbsensi() {
  const tgl = document.getElementById("absensiTanggal").value;
  const promises = [];
  document.querySelectorAll(".absen-status").forEach(sel => {
    const kid = parseInt(sel.getAttribute("data-kid"));
    // Delete lama → insert baru (upsert manual)
    promises.push(
      db.from("absensi").delete().eq("tanggal", tgl).eq("karyawan_id", kid)
        .then(() => db.from("absensi").insert([{ tanggal: tgl, karyawan_id: kid, status: sel.value }]))
    );
  });
  await Promise.all(promises);
  await refreshDataSistem();
  toast("Absensi tersimpan!", "success");
}
```

---

### 10.2 `hitungKgHarian(transaksiPeriode, tarifInternal)` — KG per Hari

```javascript
function hitungKgHarian(transaksiPeriode, tarifInternal) {
  const kgHarian = {};
  transaksiPeriode.forEach(nota => {
    const tgl = nota.tanggal;
    const pel = pelangganList.find(p => p.name === nota.pelanggan);
    if (!pel) return;

    // Lewati nota FLAT (tidak menambah beban kerja nyata)
    if (pel.type === "HOTEL" && pel.billingSystem === "FLAT" && nota.jenis === "FLAT") return;

    let kg = 0;
    if (pel.type === "RS") {
      // RS: jumlah KG langsung dari item
      kg = nota.items.reduce((s, it) => s + (it.qty || 0), 0);
    } else if (pel.type === "HOTEL") {
      // Hotel: konversi total rupiah → KG via tarif internal
      kg = nota.total / (tarifInternal || 7000);
      // Contoh: Rp 350.000 / Rp 7.000/KG = 50 KG
    }
    kgHarian[tgl] = (kgHarian[tgl] || 0) + kg;
  });
  return kgHarian; // { "2025-01-15": 120.5, "2025-01-16": 85.0, ... }
}
```

---

### 10.3 `tampilkanListGajiBaru()` — Hitung Upah Borongan

```javascript
async function tampilkanListGajiBaru() {
  const tglMulai  = document.getElementById("gajiTglMulai").value;
  const tglSelesai= document.getElementById("gajiTglSelesai").value;

  const transaksi = (JSON.parse(localStorage.getItem("DB_NOTA")) || [])
    .filter(n => n.tanggal >= tglMulai && n.tanggal <= tglSelesai);

  const kgHarian = hitungKgHarian(transaksi, pengaturan.tarifInternalHotel || 7000);
  const ongkos   = pengaturan.ongkosPerKg || 1200; // Rp per KG untuk upah

  const { data: dataGaji } = await db.from("gaji").select("*");

  const hasil = karyawanList.map(k => {
    let totalUpah = 0;
    const rincian = [];

    // Iterasi setiap hari dalam periode
    let current = new Date(tglMulai);
    const end   = new Date(tglSelesai);
    while (current <= end) {
      const tgl    = current.toISOString().slice(0, 10);
      const absen  = absensiList.find(a => a.tanggal === tgl && a.karyawanId === k.id);
      const status = absen ? absen.status : "Hadir"; // Default jika tidak ada data: Hadir
      const kg     = kgHarian[tgl] || 0;
      let upah = 0, hadir = 0;

      if (status === "Hadir") {
        // Hitung berapa karyawan yang hadir hari itu
        hadir = karyawanList.filter(k2 => {
          const a2 = absensiList.find(a => a.tanggal === tgl && a.karyawanId === k2.id);
          return a2 ? a2.status === "Hadir" : true;
        }).length || 1;

        upah = Math.floor((kg * ongkos) / hadir);
        // Contoh: 100 KG × Rp 1.200 / 3 hadir = Rp 40.000/orang
        totalUpah += upah;
      }

      rincian.push({ tanggal: tgl, kg, ongkos, hadir, upah, status });
      current.setDate(current.getDate() + 1); // Hari berikutnya
    }

    // Ambil data insentif/lembur/potongan jika sudah disimpan
    const simpan = dataGaji.find(g =>
      g.karyawan_id === k.id &&
      g.periode_mulai === tglMulai &&
      g.periode_selesai === tglSelesai
    ) || {};

    return {
      karyawan:     k,
      totalUpah,
      insentif:     simpan.insentif  || 0,
      lembur:       simpan.lembur    || 0,
      potongan:     simpan.potongan  || 0,
      totalDiterima: Math.floor(totalUpah + (simpan.insentif||0) + (simpan.lembur||0) - (simpan.potongan||0)),
      // Total Diterima = Upah + Insentif + Lembur - Potongan/Kas Bon
      rincian,
      periodeMulai: tglMulai, periodeSelesai: tglSelesai, gajiId: simpan.id
    };
  });

  _hasilGaji = hasil; // Simpan untuk cetak slip nanti
}
```

---

## 11. script.js Bagian 6 — Cetak & Export Dokumen

### 11.1 `generateKopHTML()` — Build HTML Kop Surat

```javascript
async function generateKopHTML() {
  const kop    = JSON.parse(localStorage.getItem("DB_KOP")) || {};
  const logoUrl = await getLogoFromIndexedDB();

  let html = '<div style="display:flex; align-items:center; border-bottom:3px double #1e3a5f; ...">';
  if (logoUrl) {
    html += `<div style="flex-shrink:0; margin-right:20px; border-right:1px solid #ccc;">
      <img src="${logoUrl}" style="max-height:65px; max-width:180px;" alt="Logo">
    </div>`;
  }
  html += '<div style="flex:1;">';
  html += `<h2 style="font-size:18px; font-weight:800; color:#1e3a5f; ...">${kop.nama || "PELANGI LAUNDRY"}</h2>`;
  if (kop.alamat)  html += `<p>${kop.alamat}</p>`;
  if (kop.telepon || kop.email) {
    html += `<p>`;
    if (kop.telepon) html += `Telp: ${kop.telepon}`;
    if (kop.telepon && kop.email) html += " &nbsp;|&nbsp; ";
    if (kop.email)   html += `Email: ${kop.email}`;
    html += `</p>`;
  }
  if (kop.kontak) html += `<p>Contact Person: ${kop.kontak}</p>`;
  html += "</div></div>";
  return html;
}
```

---

### 11.2 `buildLinenRoomHTML(pel, bln, logoUrl)` — Laporan Linen Room

Grid 31 kolom (tanggal 1–31) × baris linen, menampilkan berapa pcs tiap linen per hari:

```javascript
async function buildLinenRoomHTML(pel, bln, logoUrl) {
  const kopHTML = await generateKopHTML();
  const dbNota  = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  const semua   = dbNota.filter(n => n.pelanggan === pel && n.tanggal.startsWith(bln));
  const pData   = pelangganList.find(p => p.name === pel);
  const isFlatCustomer = pData?.type === "HOTEL" && pData.billingSystem === "FLAT";

  // Buat grid: { linenId: { name, price, qty: {1:0, 2:5, ..., 31:0} } }
  const linenUrutan = pData ? getLinenPelanggan(pData.id) : [];
  const orderedLinen = linenUrutan.map(e => masterLinen.find(m => m.id === e.linenId)).filter(Boolean);
  const grid = {};
  orderedLinen.forEach(item => {
    const price = hargaKhusus[item.id] || 0;
    grid[item.id] = { name: item.name, price, qty: {} };
    for (let d = 1; d <= 31; d++) grid[item.id].qty[d] = 0;
  });

  // Isi grid dari nota
  semua.forEach(nota => {
    const day = parseInt(nota.tanggal.split("-")[2], 10);
    if (isFlatCustomer && nota.jenis !== "FLAT") return; // FLAT customer hanya nota FLAT
    nota.items.forEach(it => {
      if (it.idMaster && grid[it.idMaster] && day >= 1 && day <= 31)
        grid[it.idMaster].qty[day] += it.qty || 0;
    });
  });

  // Build HTML tabel
  let html = `...header tabel 31 kolom...`;
  let grandTotalQty = 0, grandTotalAmount = 0;
  orderedLinen.forEach(item => {
    const data = grid[item.id]; if (!data) return;
    let totalQty = 0;
    let rowHtml = "";
    for (let d = 1; d <= 31; d++) {
      const q = data.qty[d];
      rowHtml += `<td>${q > 0 ? q : ""}</td>`;
      totalQty += q;
    }
    if (totalQty === 0 && !isFlatCustomer) return; // Skip baris kosong (kecuali flat customer)
    const amount = totalQty * data.price;
    grandTotalQty += totalQty; grandTotalAmount += amount;
    html += `<tr>...<td>${totalQty}</td><td>${amount.toLocaleString("id-ID")}</td></tr>`;
  });
  // Row total keseluruhan
  html += `<tr>TOTAL KESELURUHAN | ${grandTotalQty} | ${grandTotalAmount}</tr>`;
  return html;
}
```

---

### 11.3 `buildInvoicePelangganHTML(pel, bln, kopHTML)` — Invoice Formal

Mengompilasi semua nota per bulan, dikelompokkan per jenis nota dengan urutan baku:

```javascript
async function buildInvoicePelangganHTML(pel, bln, kopHTML) {
  const semua = dbNota.filter(n => n.pelanggan === pel && n.tanggal.startsWith(bln));

  // Kelompokkan total per jenis nota
  const totalsPerJenis = {};
  semua.forEach(nota => {
    const j = nota.jenis;
    if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
    if (isFlatCustomer && (j === "FLAT" || j === "FLAT ASLI")) return; // Skip flat nota
    totalsPerJenis[j] += nota.total || 0;
  });

  // Urutan tampil di invoice (baku)
  const orderJenis = ["FLAT", "NON FLAT", "FNB", "SPOTING"];
  const labelMap = {
    "FLAT":    "Biaya Langganan Flat Bulanan",
    "NON FLAT":"Cucian Non Flat (Perincian Terlampir)",
    "FNB":     "Cucian F & B (Perincian Terlampir)",
    "SPOTING": "Spotting / Treatment (Perincian Terlampir)",
  };

  let grandTotal = 0, detailRows = "", counter = 1;
  orderJenis.forEach(j => {
    let amount = (j === "FLAT" && isFlatCustomer) ? flatRate : (totalsPerJenis[j] || 0);
    if (amount === 0) return; // Skip jika nol
    grandTotal += amount;
    detailRows += `<tr><td>${counter}</td><td>${labelMap[j]||j}</td><td>${fmtRp(amount)}</td></tr>`;
    counter++;
  });

  // Jenis nota yang tidak ada di orderJenis (custom)
  for (const [jenis, amount] of Object.entries(totalsPerJenis)) {
    if (!orderJenis.includes(jenis) && amount > 0) {
      grandTotal += amount;
      detailRows += `<tr><td>${counter}</td><td>${jenis} (Perincian Terlampir)</td><td>${fmtRp(amount)}</td></tr>`;
      counter++;
    }
  }

  // Generate nomor invoice (stable)
  const invNumber = await getInvoiceStableNumber(kodePel, bln);

  // Return dokumen HTML lengkap dengan CSS inline
  return `<!DOCTYPE html><html>...<body>
    ${kopHTML}
    <h1>INVOICE</h1>
    DATE: ${tglCetak}
    INVOICE NUMBER: ${invNumber}
    CUSTOMER: ${pel}
    Detail tabel...
    TOTAL: ${fmtRp(grandTotal)}
    TERBILANG: === ${terbilang(grandTotal)} rupiah. ===
    Info rekening bank...
    Tanda tangan direktur...
  </body></html>`;
}
```

---

### 11.4 `buildKuitansiHTML(pel, bln, logoUrl)` — Kuitansi Pembayaran

Dokumen hukum penerimaan pembayaran. Berbeda dengan invoice (dokumen tagihan), kuitansi adalah bukti bahwa pembayaran sudah diterima:

```javascript
async function buildKuitansiHTML(pel, bln, logoUrl) {
  // Hitung total tagihan (sama dengan invoice)
  let totalTagihan = isFlatCustomer
    ? flatRate + Σ(totalsPerJenis bukan FLAT)
    : Σ(semua totalsPerJenis);
  totalTagihan = Math.floor(totalTagihan);

  // Deskripsi berbeda berdasarkan tipe pelanggan
  let deskripsi;
  if (pData.type === "RS") {
    deskripsi = `Biaya Cuci Linen mulai tgl. ${fmtTgl(tglAwal)} - ${fmtTgl(tglAkhir)}
                 = ${totalKg} kg @ Rp.${tarifRS},- (Perincian terlampir)`;
  } else if (isFlatCustomer) {
    deskripsi = `Biaya Cuci Linen Bulan ${namaBulan} ${tahunStr}`;
  } else {
    deskripsi = `Biaya Cuci Linen Bulan ${namaBulan} ${tahunStr} (Perincian Terlampir)`;
  }

  const terbilangCaps = /* "Satu juta lima ratus ribu rupiah.-" */

  return `<!DOCTYPE html>...
    ${kopHTML}
    KWITANSI No. : ${nomorKwitansi}
    TERIMA DARI  : ${pel}
    SEBESAR      : ${terbilangCaps}
    UNTUK        : ${deskripsi}
    TERBILANG: Rp ${totalTagihan.toLocaleString("id-ID")},-
    Info rekening + tanda tangan
  ...`;
}
```

---

### 11.5 `buildSlipGajiHTML(kId, mulai, selesai, logoUrl)` — Slip Gaji

```javascript
async function buildSlipGajiHTML(kId, mulai, selesai, logoUrl) {
  const h = _hasilGaji.find(h => h.karyawan.id == kId);
  if (!h) return null;
  const k = h.karyawan;
  const kopHTML = await generateKopHTML();

  return `<!DOCTYPE html><html>...<body>
    ${kopHTML}
    SLIP UPAH KARYAWAN
    Nama: ${k.nama} | Bagian: ${k.bagian} | Periode: ${mulai} s/d ${selesai}

    Upah Kerja : ${fmtRp(h.totalUpah)}
    Insentif   : ${fmtRp(h.insentif)}
    Lembur     : ${fmtRp(h.lembur)}
    Potongan   : ${fmtRp(h.potongan)}
    ──────────────────────────────
    Total Diterima : ${fmtRp(h.totalDiterima)}

    Terbilang: ${terbilang(h.totalDiterima)} rupiah

    REKAPITULASI HARIAN:
    [Tanggal | Status | KG | Ongkos | Hadir | Upah] per hari
  </body></html>`;
}
```

---

### 11.6 `downloadFile(content, filename)` — Trigger Download

```javascript
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/html" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob); // Buat URL sementara
  a.download = filename;
  document.body.appendChild(a);
  a.click();                   // Trigger download otomatis
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href); // Bebaskan memori
  toast("Dokumen diunduh.", "info", 2000);
}
```

---

## 12. script.js Bagian 7 — Backup & Restore

### 12.1 `exportAllData()` — Export Full Supabase

```javascript
async function exportAllData() {
  const tables = [
    "pelanggan","jenis_nota","master_linen","karyawan","absensi",
    "pengaturan","kop","harga_pelanggan","nota","biaya",
    "invoice_numbers","invoice_counter","payment_status","locks",
    "utang","gaji","backup_history","linen_pelanggan"
  ]; // 18 tabel
  const allData = {};
  for (const table of tables) {
    const { data } = await db.from(table).select("*");
    allData[table] = data;
  }
  // Download sebagai JSON
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pelangi_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast("Data berhasil diexport.", "success");
}
```

---

### 12.2 `backupBulan(bln)` — Backup Per Bulan

Urutan operasi:
1. Export semua data → download JSON
2. Hapus data bulan tsb dari Supabase (nota, biaya, absensi, gaji)
3. Catat bulan ke backup_history di Supabase
4. Hapus dari localStorage
5. Catat ke DB_BACKUP_HISTORY localStorage
6. Refresh UI

```javascript
async function backupBulan(bln) {
  if (!await window.customConfirm(`Backup & hapus transaksi bulan ${bln}?`)) return;

  // Export data
  const allData = { metadata: { version: "v24" }, data: {} };
  allKeys.forEach(k => allData.data[k] = JSON.parse(localStorage.getItem(k)));
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
  // ... trigger download ...

  // Hapus dari Supabase
  await db.from("nota").delete().gte("tanggal", `${bln}-01`).lte("tanggal", `${bln}-31`);
  await db.from("biaya").delete().gte("tanggal", `${bln}-01`).lte("tanggal", `${bln}-31`);
  await db.from("absensi").delete().gte("tanggal", `${bln}-01`).lte("tanggal", `${bln}-31`);
  await db.from("gaji").delete().gte("periode_mulai", `${bln}-01`).lte("periode_mulai", `${bln}-31`);
  await db.from("backup_history").insert([{ bulan: bln }]);

  // Hapus dari localStorage
  let dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  dbNota = dbNota.filter(n => n.tanggal?.substring(0,7) !== bln);
  localStorage.setItem("DB_NOTA", JSON.stringify(dbNota));
  // ... dst untuk DB_BIAYA, DB_ABSENSI, DB_GAJI ...

  await refreshDataSistem();
  renderBackupStatus();
  toast(`Backup bulan ${bln} berhasil.`, "success");
}
```

---

### 12.3 `handleFileImport(input)` — Import dari File

Menangani 2 format file backup berbeda:

```javascript
reader.onload = async (e) => {
  const json = JSON.parse(e.target.result);

  // FORMAT 1: exportAllData → key = nama tabel Supabase
  if (!json.data && (json.nota || json.pelanggan || json.biaya)) {
    for (const [table, rows] of Object.entries(json)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      await db.from(table).upsert(rows); // Langsung upsert
    }
  }

  // FORMAT 2: backupBulan → key = DB_XXX → perlu transform ke Supabase format
  else if (json.data) {
    const mapTable = {
      DB_NOTA: "nota", DB_BIAYA: "biaya", DB_PELANGGAN: "pelanggan",
      DB_KARYAWAN: "karyawan", DB_ABSENSI: "absensi",
      DB_JENIS_NOTA: "jenis_nota", DB_MASTER_LINEN: "master_linen",
      DB_HARGA_PELANGGAN: "harga_pelanggan", DB_PENGATURAN: "pengaturan",
      DB_KOP: "kop", DB_UTANG: "utang", DB_LOCKS: "locks",
      DB_PAYMENT_STATUS: "payment_status", DB_INVOICE_NUMBERS: "invoice_numbers",
      DB_INVOICE_COUNTER: "invoice_counter", DB_BACKUP_HISTORY: "backup_history",
      DB_LINEN_PELANGGAN: "linen_pelanggan",
    };

    for (const [key, value] of Object.entries(json.data)) {
      const table = mapTable[key]; if (!table) continue;
      let supabaseRows = [];

      // Transform per tabel (rename field camelCase → snake_case)
      if (table === "pelanggan") {
        supabaseRows = rows.map(r => ({
          id: r.id, nama: r.name, kode: r.kode,
          tipe: r.type, billing_system: r.billingSystem,
          flat_rate: r.flatRate, tarif_rs: r.tarifRS,
          alamat: r.alamat, kota: r.kota
        }));
      } else if (table === "harga_pelanggan") {
        // Object nested → array of rows
        Object.entries(value).forEach(([pid, map]) => {
          Object.entries(map).forEach(([lid, harga]) => {
            supabaseRows.push({ pelanggan_id: parseInt(pid), linen_id: parseInt(lid), harga });
          });
        });
      }
      // ... transformasi per tabel lainnya ...

      if (supabaseRows.length > 0) await db.from(table).upsert(supabaseRows);
    }

    // Update localStorage juga
    Object.entries(json.data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  }

  toast(`Import selesai.`, "success");
  setTimeout(() => location.reload(), 1500);
};
```

---

### 12.4 `cekPeringatanBackup()` — Peringatan Otomatis

```javascript
function cekPeringatanBackup() {
  const dbNota   = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  if (dbNota.length === 0) return;
  const history      = getBackupHistory();
  const today        = new Date();
  const currentMonth = today.toISOString().substring(0, 7); // "2025-01"

  let oldestUnbacked = null;
  for (const nota of dbNota) {
    if (!nota.tanggal) continue;
    const bln = nota.tanggal.substring(0, 7);
    // Cari bulan lalu yang belum di-backup
    if (bln < currentMonth && !history.includes(bln)) {
      oldestUnbacked = bln; break;
    }
  }
  if (oldestUnbacked) {
    toast(`⚠️ Transaksi bulan ${oldestUnbacked} belum di-backup!`, "warning", 6000);
  }
}
```

---

## 13. Navigasi & Flow Lengkap

### 13.1 Struktur Kategori Tab (`TAB_CATEGORIES`)

```javascript
const TAB_CATEGORIES = {
  transaksi: {
    label: "TRANSAKSI",
    tabs: [
      ["tab-nota",  "📝 Input Nota"],
      ["tab-rekap", "🔍 Riwayat Nota"],
    ]
  },
  tagihan: {
    label: "TAGIHAN",
    tabs: [
      ["tab-invoice",  "🧾 Invoice"],
      ["tab-kuitansi", "📄 Kuitansi"],
    ]
  },
  keuangan: {
    label: "KEUANGAN",
    tabs: [
      ["tab-omset",   "📊 Dashboard"],
      ["tab-laporan", "📋 Laporan"],
      ["tab-utang",   "📉 Utang"],
      ["tab-gaji",    "💵 Gaji"],
    ]
  },
  sistem: {
    label: "SISTEM",
    tabs: [
      ["tab-master", "🛠️ Master Data"],
      ["tab-absen",  "📅 Absensi"],
      ["tab-backup", "💾 Backup"],
    ]
  },
};
```

---

### 13.2 `switchCategory(cat)` — Ganti Kategori

```javascript
function switchCategory(cat) {
  // Update aria & CSS aktif pada tombol kategori
  document.querySelectorAll(".cat-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === cat);
    b.setAttribute("aria-selected", b.dataset.cat === cat);
  });

  const info = TAB_CATEGORIES[cat]; if (!info) return;

  // Rebuild sub-tab sesuai kategori baru
  const sub = document.getElementById("navSubtabs");
  sub.innerHTML = `<span class="group-label">${info.label}:</span>` +
    info.tabs.map(t =>
      `<button class="tab-btn" role="tab" aria-selected="false"
       onclick="switchTab('${t[0]}')">${t[1]}</button>`
    ).join("");

  // Buka tab pertama kategori
  switchTab(info.tabs[0][0]);
}
```

---

### 13.3 `switchTab(tabId)` — Pindah Tab & Trigger Fungsi

```javascript
async function switchTab(tabId) {
  // 1. Sembunyikan semua tab
  document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");

  // 2. Tampilkan tab yang diminta
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.style.display = "block";

  // 3. Update aria-selected pada tombol subtab
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  const tabBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  if (tabBtn) { tabBtn.classList.add("active"); tabBtn.setAttribute("aria-selected", "true"); }

  // 4. Update aria kategori yang sedang aktif
  const catInfo = Object.entries(TAB_CATEGORIES)
    .find(([_, v]) => v.tabs.some(t => t[0] === tabId));
  if (catInfo) {
    document.querySelectorAll(".cat-btn").forEach(b => {
      const isActive = b.dataset.cat === catInfo[0];
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive);
    });
  }

  // 5. Jalankan fungsi inisialisasi khusus per tab
  if (tabId === "tab-rekap")   await cariNotaSistem();
  if (tabId === "tab-gaji")    tampilkanListGajiBaru();
  if (tabId === "tab-omset")   await hitungMenejemenKeuangan();
  if (tabId === "tab-utang")   renderDaftarUtang();
  if (tabId === "tab-absen")   renderAbsensiTable();
  if (tabId === "tab-backup")  renderBackupStatus();
  if (tabId === "tab-laporan") await tampilkanLaporan();
  if (tabId === "tab-master")  {
    renderDaftarPelanggan();
    renderMasterLinenTable();
    renderMasterJenisNotaTable();
  }
}
```

---

### 13.4 FAB Functions

```javascript
function toggleFab() {
  const fab  = document.getElementById('fabBtn');
  const menu = document.getElementById('fabMenu');
  if (!fab || !menu) return;
  const isOpen = fab.classList.toggle('open'); // CSS: rotate + warna merah
  menu.classList.toggle('open', isOpen);       // CSS: opacity 1 + pointer-events
  fab.setAttribute('aria-expanded', isOpen);
}

function fabAction(action) {
  toggleFab(); // Tutup menu FAB dulu
  switch (action) {
    case 'invoice':
      switchCategory('tagihan');
      setTimeout(() => switchTab('tab-invoice'), 100); // Delay agar subtab ter-render dulu
      break;
    case 'gaji':
      switchCategory('keuangan');
      setTimeout(() => switchTab('tab-gaji'), 100);
      break;
    case 'absensi':
      switchCategory('sistem');
      setTimeout(() => switchTab('tab-absen'), 100);
      break;
  }
}

// Tutup FAB saat klik di luar area FAB
document.addEventListener('click', (e) => {
  if (fab && menu && !fab.contains(e.target) && !menu.contains(e.target)) {
    fab.classList.remove('open');
    menu.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  }
});

// Tutup FAB saat tekan Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && fab?.classList.contains('open')) {
    fab.classList.remove('open');
    menu.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  }
});
```

---

## 14. Relasi index.html ↔ script.js (Ringkasan)

### Flow Login hingga App

```
User ketik username/password
  → onclick="prosesLogin()"
  → validasi hardcoded ("admin"/"admin" atau "user"/"user")
  → bukaAplikasi()
    → sembunyikan #loginPage, tampilkan #appContent
    → set semua input tanggal = hari ini
    → await refreshDataSistem()  ← TARIK 15 TABEL DARI SUPABASE
      → populate variabel global (jenisNotaList, pelangganList, dll)
      → simpan ke localStorage
      → render semua dropdown & tabel
    → cekPeringatanBackup()
    → switchTab("tab-nota")
```

### Tabel Lengkap: Aksi UI → Fungsi JS → Hasil

| Aksi User di HTML | Fungsi JS yang Dipanggil | Hasil |
|---|---|---|
| Klik "Masuk" / tekan Enter | `prosesLogin()` | Validasi, buka app |
| Pilih pelanggan di dropdown | `cekTipePelangganInput()` | Tampil form Hotel atau RS |
| Pilih jenis nota | `renderFormLinenInput()` | Refresh tabel linen + harga |
| Klik "✓ Simpan Transaksi" | `simpanNotaSistem()` | Insert Supabase, refresh UI |
| Klik "Cari" di riwayat | `cariNotaSistem()` | Query Supabase, render tabel |
| Klik "🖲️ Hitung Invoice" | `hitungDanAmbilInvoice()` | Kompilasi nota → tampil invoice |
| Klik "🔄 Ubah Kunci" | `toggleLockInvoice()` | Upsert Supabase, update badge |
| Klik "🔄 Ubah Status" bayar | `toggleStatusPembayaran()` | Upsert Supabase, update badge |
| Klik "🖨️ Cetak Linen Room" | `cetakInvoice()` | Buka popup print linen room |
| Klik "🧾 Cetak Invoice" | `cetakInvoicePelanggan()` | Buka popup print invoice formal |
| Klik "📥 Excel (.csv)" | `downloadLinenRoomExcel()` | Download file .xls |
| Klik "🖨️ Cetak" kuitansi | `generateKuitansi()` | Buka popup print kuitansi |
| Klik "Filter" pengeluaran | `hitungMenejemenKeuangan()` | Recalculate semua angka |
| Klik "✓ Simpan" pengeluaran | `simpanBiayaOperasional()` | Insert Supabase biaya |
| Klik "Hapus" pengeluaran | `hapusBiaya(id)` | customConfirm → delete Supabase |
| Klik "Tandai Lunas" biaya | `tandaiLunasBiaya(id)` | Update Supabase biaya.lunas=true |
| Klik "👁️ View Laporan" | `tampilkanLaporan()` | Render Laba Rugi + Neraca |
| Klik "🖨️ Download PDF" laporan | `cetakLaporan()` | Buka popup print laporan |
| Klik "✓ Simpan Utang" | `simpanUtang()` | Insert Supabase utang |
| Klik "💸 Bayar Cicilan" | `bayarCicilan(id)` | Insert biaya cicilan + update sisa |
| Tombol kategori nav (atas) | `switchCategory(cat)` | Rebuild subtab + pindah tab |
| Tombol subtab | `switchTab(tabId)` | Sembunyikan semua, tampilkan 1 |
| Klik FAB (+) | `toggleFab()` | Buka/tutup menu shortcut mobile |
| Klik item FAB | `fabAction(action)` | Navigasi cepat ke tab tertentu |
| Klik "✏️ Edit & Harga" pelanggan | `bukaModalEditPelanggan(id)` | Buka modal edit + harga linen |
| Klik "💾 Simpan Pelanggan & Harga" | `simpanDetailPelanggan()` | Update Supabase pelanggan + harga |
| Drag baris linen di modal | `initLinenDragDrop(tbody)` | Reorder DOM via HTML5 DnD |
| Klik "💾 Simpan" konfigurasi linen jenis nota | `simpanLinenConfigJenisNota()` | Update Supabase jenis_nota.linen_config |
| Input tanggal absensi | `renderAbsensiTable()` | Tampil tabel status absensi |
| Klik "Simpan Absensi" | `simpanAbsensi()` | Delete+insert Supabase absensi |
| Klik "📋 Tampilkan" gaji | `tampilkanListGajiBaru()` | Hitung upah borongan per karyawan |
| Klik "Slip" gaji | `viewSlipGaji(kId,mulai,selesai)` | Buka popup print slip gaji |
| Klik "Edit" gaji | `editGajiKaryawan(kId,...)` | Buka modal edit insentif/lembur |
| Klik "📤 Export Semua Data" | `exportAllData()` | Download JSON dari 18 tabel Supabase |
| Klik "📥 Import Data" | `importDataViaFile()` | Trigger file picker |
| Pilih file import | `handleFileImport(input)` | Parse JSON, upsert ke Supabase |
| Klik "🧹 Backup & Bersihkan Semua" | `backupDanBersihkan()` | Export + hapus semua transaksi |
| Klik "📅 Backup Semua Bulan Belum" | `backupSemuaBulanBelum()` | Export + hapus bulan yang belum backup |
| Klik "🧹 Bersihkan Nota Rusak" | `bersihkanNotaRusak()` | Hapus nota tanpa items |
| Klik "×" di modal | `tutupModal(id)` | `display = "none"` |
| Klik overlay modal | Event listener `.modal click` | Tutup modal jika klik di luar |
| Klik "Ya, Lanjutkan" di confirm | `customConfirmRespond(true)` | Resolve Promise dengan `true` |
| Klik "Batal" di confirm | `customConfirmRespond(false)` | Resolve Promise dengan `false` |

---

---

## 15. Fungsi-Fungsi yang Belum Dicakup (Bagian Lanjutan)

### 15.1 `normalizeNota(n)` — Normalisasi Data Nota dari Supabase

```javascript
function normalizeNota(n) {
  if (!n) return n;
  return {
    id:          n.id,
    notaId:      n.notaId || n.nota_id,     // Dua format: camelCase & snake_case
    nota_id:     n.nota_id || n.notaId,
    tanggal:     n.tanggal,
    pelanggan_id: n.pelanggan_id,
    pelanggan:   n.pelanggan || namaPelangganById(n.pelanggan_id) || "",
    // Jika field pelanggan (nama string) kosong, cari dari pelangganList via ID
    jenis:       n.jenis,
    total:       n.total || 0,
    items:       Array.isArray(n.items) ? n.items : []
  };
}

function namaPelangganById(id) {
  const p = pelangganList.find((p) => p.id === id);
  return p ? p.name : "";
}
```

Fungsi ini penting karena data di Supabase disimpan dengan `pelanggan_id` (angka), sedangkan banyak logika di JS memakai field `pelanggan` (nama string). `normalizeNota` menjembatani keduanya.

---

### 15.2 `migratePelangganKode()` — Migrasi Otomatis Kode Pelanggan

```javascript
function migratePelangganKode() {
  let pel = [];
  try { pel = JSON.parse(localStorage.getItem("DB_PELANGGAN")) || []; }
  catch { pel = []; }
  let changed = false;
  pel.forEach((p) => {
    if (!p.kode) {
      p.kode = generateKodePelanggan(p.name); // Auto-generate kode jika belum ada
      changed = true;
    }
  });
  if (changed) localStorage.setItem("DB_PELANGGAN", JSON.stringify(pel));
}
migratePelangganKode(); // Dipanggil langsung saat file dimuat (auto-run)
```

Dipanggil sekali saat `script.js` di-load. Memastikan semua pelanggan lama (sebelum fitur kode ditambahkan) mendapatkan kode secara otomatis tanpa perlu intervensi user.

---

### 15.3 `tampilkanSemuaNota()` — Reset Filter Riwayat

```javascript
async function tampilkanSemuaNota() {
  document.getElementById("cariTanggal").value = "";   // Kosongkan filter tanggal
  document.getElementById("cariPelanggan").value = ""; // Kosongkan filter nama
  await cariNotaSistem();                              // Tampilkan semua nota
}
```

Dipanggil tombol "Tampilkan Semua" di tab Riwayat Nota.

---

### 15.4 `getLockKey(pel, bln)`, `isInvoiceLocked(pel, bln)` — Kunci Invoice

```javascript
function getLockKey(pel, bln) {
  return `${pel}_${bln}`; // "Hotel Great_2025-01"
}

function isInvoiceLocked(pel, bln) {
  const locks = JSON.parse(localStorage.getItem("DB_LOCKS") || "{}");
  return locks[getLockKey(pel, bln)] === true;
}
```

Kunci invoice berfungsi untuk **membekukan harga** — setelah invoice dikunci, `hitungDanAmbilInvoice()` tidak akan memanggil `hitungUlangNota()` sehingga harga tidak berubah meski master harga diubah.

---

### 15.5 `toggleLockInvoice()` — Toggle Kunci Invoice

```javascript
async function toggleLockInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value;
  const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) { toast("Pilih bulan!", "warning"); return; }

  const key = getLockKey(pel, bln);
  const newLockState = !isInvoiceLocked(pel, bln); // Balik status

  const { error } = await db.from("locks").upsert(
    { key, is_locked: newLockState },
    { onConflict: "key" }   // Jika sudah ada key yang sama, update (bukan insert baru)
  );
  if (error) { toast("Gagal mengupdate kunci.", "error"); return; }

  // Update UI badge & recalculate
  updateLockBadgeDisplay(pel, bln);
  hitungDanAmbilInvoice();
}
```

---

### 15.6 `toggleStatusPembayaran()` — Toggle Lunas / Belum Bayar

```javascript
async function toggleStatusPembayaran() {
  isInvoicePaid = !isInvoicePaid; // Balik status lokal
  const pel = document.getElementById("invoicePelangganSelect").value;
  const bln = document.getElementById("invoiceBulanSelect").value;

  if (bln) {
    const key = getLockKey(pel, bln);
    await db.from("payment_status").upsert(
      { key, is_paid: isInvoicePaid },
      { onConflict: "key" }
    );
    updateStatusBadgeOnly(); // Update badge tanpa reload
    // Update cache localStorage juga
    const payStat = JSON.parse(localStorage.getItem("DB_PAYMENT_STATUS")) || {};
    payStat[key] = isInvoicePaid;
    localStorage.setItem("DB_PAYMENT_STATUS", JSON.stringify(payStat));
    toast(isInvoicePaid ? "Status: LUNAS." : "Status: BELUM DIBAYAR.", "info");
    await hitungMenejemenKeuangan(); // Update Kas & Piutang
  }
}
```

**Efek terhadap keuangan:**
- Saat LUNAS → `pendapatanLunas` bertambah → Kas bertambah, Piutang berkurang
- Saat balik ke BELUM DIBAYAR → kebalikannya

---

### 15.7 `updateLockBadgeDisplay` & `updateStatusBadgeOnly`

```javascript
function updateLockBadgeDisplay(pel, bln) {
  const badge = document.getElementById("lockStatusBadge");
  if (isInvoiceLocked(pel, bln)) {
    badge.innerText = "LOCKED";
    badge.className = "badge-status status-locked"; // Abu-abu
  } else {
    badge.innerText = "UNLOCKED";
    badge.className = "badge-status status-unlocked"; // Kuning
  }
}

function updateStatusBadgeOnly() {
  const badge = document.getElementById("statusCurrentBadge");
  badge.innerText = isInvoicePaid ? "LUNAS" : "BELUM DIBAYAR";
  badge.className = isInvoicePaid ? "badge-status status-paid" : "badge-status status-unpaid";
}
```

Keduanya hanya update DOM badge tanpa memanggil API — cepat karena tidak ada network call.

---

### 15.8 `cetakInvoice()` & `downloadInvoice()` — Cetak Linen Room

```javascript
async function cetakInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value;
  const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) return toast("Pilih bulan!", "warning");

  loadingThen("Menyiapkan Linen Room", async () => {
    const logoUrl = await getLogoFromIndexedDB();
    const html = await buildLinenRoomHTML(pel, bln, logoUrl);
    // Buka popup baru untuk print
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return toast("Popup diblokir!", "warning");
    printWindow.document.write(`<!DOCTYPE html><html>...${html}...</html>`);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print(); // Trigger dialog print browser
      setTimeout(() => printWindow.close(), 2000);
    };
  });
}

async function downloadInvoice() {
  // Sama dengan cetakInvoice tapi download sebagai .html bukan buka popup print
  loadingThen("Menyiapkan download Linen Room", async () => {
    const html = await buildLinenRoomHTML(pel, bln, logoUrl);
    const fullHTML = `<!DOCTYPE html><html>...${html}...</html>`;
    downloadFile(fullHTML, `LinenRoom_${pel.replace(/\s/g,"_")}_${bln}.html`);
  });
}
```

**Pola `loadingThen`:** Tampilkan toast "...memuat..." → jalankan fungsi async → jika error, tampilkan toast error. Ini agar UI tidak terasa beku saat proses cetak berlangsung.

---

### 15.9 `downloadLinenRoomExcel()` — Export ke Excel (.xls)

```javascript
async function downloadLinenRoomExcel() {
  loadingThen("Menyiapkan file Excel", async () => {
    const html = await buildLinenRoomHTML(pel, bln, logoUrl);
    // Parse HTML → ambil hanya elemen <table>
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const table = tempDiv.querySelector("table");
    if (!table) return toast("Gagal membuat file", "error");

    // Bungkus dalam format HTML khusus yang bisa dibuka Excel
    const excelHTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; }
          th { background: #1e3a5f; color: white; padding: 5px; border: 1px solid #999; }
          td { padding: 4px; border: 1px solid #ccc; }
        </style>
      </head>
      <body>${table.outerHTML}</body>
    </html>`;

    // Mime type khusus Excel (binary format lama, lebih kompatibel)
    const blob = new Blob([excelHTML], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `LinenRoom_${pel.replace(/\s/g,"_")}_${bln}.xls`; // .xls bukan .xlsx
    a.click();
  });
}
```

Ini bukan file Excel asli (XLSX), melainkan file HTML dengan MIME type Excel — teknik ini memungkinkan browser membuka file di Excel secara langsung tanpa library tambahan seperti SheetJS.

---

### 15.10 `cetakInvoicePelanggan()` & `downloadKuitansi()` — Cetak Invoice & Kuitansi Formal

```javascript
async function cetakInvoicePelanggan() {
  const pel = document.getElementById("invoicePelangganSelect").value;
  const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) { toast("Pilih bulan!", "warning"); return; }

  loadingThen("Menyiapkan Invoice", async () => {
    const kopHTML = await generateKopHTML();
    const html = await buildInvoicePelangganHTML(pel, bln, kopHTML);
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) { toast("Popup diblokir!", "warning"); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
      setTimeout(() => printWindow.close(), 2000);
    };
  });
}

async function downloadKuitansi() {
  loadingThen("Menyiapkan download Kuitansi", async () => {
    const logoUrl = await getLogoFromIndexedDB();
    const html = await buildKuitansiHTML(pel, bln, logoUrl);
    downloadFile(html, `Kuitansi_${pel.replace(/\s/g,"_")}_${bln}.html`);
  });
}
```

**Perbedaan `cetakInvoicePelanggan` vs `cetakInvoice`:**
- `cetakInvoice` → mencetak **Linen Room** (tabel 31 hari, detail per item per hari)
- `cetakInvoicePelanggan` → mencetak **Invoice Formal** (ringkasan per jenis nota, dengan nomor invoice, tanda tangan)

---

### 15.11 `namaPeriode(bln)` — Format Nama Bulan

```javascript
function namaPeriode(bln) {
  const [y, m] = bln.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 2)
    .toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  // "2025-01" → "Januari 2025"
}
```

---

### 15.12 `updateKopInPreview(containerId)` — Preview Kop di Halaman

```javascript
async function updateKopInPreview(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = await generateKopHTML(); // Isi container dengan HTML kop
}
```

Dipanggil setelah `hitungDanAmbilInvoice()` untuk menampilkan kop surat di preview invoice yang terlihat di halaman (sebelum cetak).

---

### 15.13 `simpanBiayaOperasional()` — Simpan Pengeluaran

```javascript
async function simpanBiayaOperasional() {
  const btn = document.getElementById('btnSimpanBiaya');
  setBtnLoading(btn, true);
  try {
    const tgl   = document.getElementById("expTanggal").value;
    // Kategori: jika "LAIN-LAIN" dipilih → pakai input custom, huruf besar
    const kat   = document.getElementById("expKategori").value === "LAIN-LAIN"
      ? document.getElementById("expKategoriCustom").value.toUpperCase()
      : document.getElementById("expKategori").value;
    const nominal = parseCurrencyValue(document.getElementById("expNominal").value);
    const lunas   = document.getElementById("expLunas").checked; // Checkbox "Sudah Dibayar"

    if (!tgl || !kat || nominal <= 0) { toast("Data tidak lengkap!", "warning"); return; }

    await db.from("biaya").insert([{ tanggal: tgl, kategori: kat, nominal, lunas }]);
    document.getElementById("expNominal").value = ""; // Reset field nominal
    toast("Biaya disimpan!");
    await hitungMenejemenKeuangan(); // Recalculate keuangan
  } finally { setBtnLoading(btn, false); }
}
```

---

### 15.14 `bukaEditBiaya(id)`, `simpanEditBiaya()`, `hapusBiaya(id)`, `tandaiLunasBiaya(id)` — CRUD Pengeluaran

```javascript
// Buka modal edit
async function bukaEditBiaya(id) {
  const { data } = await db.from("biaya").select("*").eq("id", id);
  const b = data?.[0]; if (!b) return;
  // Isi form dengan data yang ada
  document.getElementById("editBiayaId").value     = id;
  document.getElementById("editBiayaTanggal").value = b.tanggal;
  document.getElementById("editBiayaNominal").value = b.nominal.toLocaleString("id-ID");
  document.getElementById("editBiayaKategori").value = b.kategori;
  document.getElementById("editBiayaModal").style.display = "flex";
}

// Simpan perubahan
async function simpanEditBiaya() {
  const id      = parseInt(document.getElementById("editBiayaId").value);
  const tanggal = document.getElementById("editBiayaTanggal").value;
  const nominal = parseCurrencyValue(document.getElementById("editBiayaNominal").value);
  const kategori = document.getElementById("editBiayaKategori").value === "LAIN-LAIN"
    ? document.getElementById("editBiayaCustomText").value.toUpperCase()
    : document.getElementById("editBiayaKategori").value;
  await db.from("biaya").update({ tanggal, kategori, nominal }).eq("id", id);
  tutupModalEditBiaya();
  toast("Pengeluaran diupdate!");
  await hitungMenejemenKeuangan();
}

// Hapus (dengan konfirmasi)
async function hapusBiaya(id) {
  if (!await window.customConfirm("Hapus pengeluaran ini?")) return;
  await db.from("biaya").delete().eq("id", id);
  toast("Pengeluaran dihapus.", "success");
  await hitungMenejemenKeuangan();
}

// Tandai lunas tanpa hapus
async function tandaiLunasBiaya(id) {
  await db.from("biaya").update({ lunas: true }).eq("id", id);
  // Efek: biaya masuk hitungan biayaDibayar → mengurangi Kas
  toast("Biaya ditandai lunas.");
  await hitungMenejemenKeuangan();
}
```

---

### 15.15 `bukaModalDetail(id)` — Popup Detail Nota

```javascript
function bukaModalDetail(id) {
  const nota = (JSON.parse(localStorage.getItem("DB_NOTA") || "[]")).find(n => n.id === id);
  if (!nota) return;
  document.getElementById("modalNotaTitle").innerText = `Detail Nota: ${nota.notaId}`;
  document.getElementById("modalNotaMeta").innerHTML =
    `<strong>Pelanggan:</strong> ${nota.pelanggan} |
     <strong>Tanggal:</strong> ${nota.tanggal} |
     <strong>Layanan:</strong> ${nota.jenis}`;
  const tbody = document.getElementById("modalLinenBody");
  tbody.innerHTML = nota.items
    .map(it => `<tr>
      <td>${it.name}</td>
      <td style="text-align:center;">${it.qty} ${it.unit}</td>
      <td>${fmtRp(it.subtotal)}</td>
    </tr>`)
    .join("");
  // Tambah baris total
  tbody.innerHTML += `<tr style="background:#f8fafc;font-weight:700;">
    <td colspan="2">TOTAL</td><td>${fmtRp(nota.total)}</td>
  </tr>`;
  document.getElementById("detailModal").style.display = "flex";
}
```

Membaca dari localStorage (bukan langsung Supabase) karena data sudah ada di cache — lebih cepat.

---

### 15.16 `onEditJenisChange()` & `simpanPerubahanQtyNota()` — Edit Nota

#### `onEditJenisChange()` — Update Harga saat Jenis Nota Diubah di Modal Edit

```javascript
function onEditJenisChange() {
  const id = parseInt(document.getElementById("editNotaTargetId").value);
  const nota = (JSON.parse(localStorage.getItem("DB_NOTA") || "[]")).find(n => n.id === id);
  const pData = pelangganList.find(p => p.name === nota.pelanggan);
  if (pData && pData.type === "RS") return; // RS tidak punya pilihan jenis

  const jenisBaru = document.getElementById("editNotaJenisSelect").value;
  const jData = jenisNotaList.find(j => j.name === jenisBaru);
  const mult = jData ? jData.multiplier : 1;

  // Update label harga di tabel dan card-list sesuai multiplier baru
  const inputs = document.querySelectorAll(".modal-edit-qty");
  inputs.forEach(inp => {
    const mid = parseInt(inp.getAttribute("data-masterid"));
    const newPrice = getHargaPerPelanggan(pData.id, mid, mult);
    // Update label harga di tabel (desktop)
    const labels = document.querySelectorAll(".price-label");
    // ... update setiap label
  });
  hitungTotalEditPreview(); // Hitung ulang total preview
}
```

#### `simpanPerubahanQtyNota()` — Simpan Perubahan Edit Nota

```javascript
async function simpanPerubahanQtyNota() {
  const id = parseInt(document.getElementById("editNotaTargetId").value);

  // Ambil nota dari Supabase (bukan localStorage) untuk memastikan data terbaru
  const { data: notaList } = await db.from("nota").select("*").eq("id", id);
  const nota = notaList[0];
  const pData = pelangganList.find(p => p.id === nota.pelanggan_id);

  nota.jenis = document.getElementById("editNotaJenisSelect").value;
  const mult = jenisNotaList.find(j => j.name === nota.jenis)?.multiplier || 1;
  let total = 0;

  // CASE Hotel FLAT → total tetap 0
  if (pData.type === "HOTEL" && pData.billingSystem === "FLAT" && nota.jenis === "FLAT") {
    const items = [];
    document.querySelectorAll(".modal-edit-qty").forEach(inp => {
      const qty = parseInt(inp.value) || 0;
      if (qty > 0) {
        const mid = parseInt(inp.getAttribute("data-masterid"));
        items.push({ idMaster: mid, name: masterLinen.find(m=>m.id===mid)?.name||"",
                     qty, unit: "Pcs", basePrice: 0, subtotal: 0 });
      }
    });
    nota.items = items; total = 0;
  }
  // CASE RS → hitung berdasarkan KG
  else if (pData.type === "RS") {
    const kg = parseFloat(document.querySelector(".modal-edit-qty")?.value) || 0;
    if (kg <= 0) { toast("Berat harus > 0 KG!", "warning"); return; }
    total = Math.floor(kg * pData.tarifRS);
    nota.items = [{ idMaster: 0, name: "Cucian RS", qty: kg, unit: "KG",
                   basePrice: pData.tarifRS, subtotal: total }];
  }
  // CASE Hotel reguler → hitung per item
  else {
    const items = [];
    document.querySelectorAll(".modal-edit-qty").forEach(inp => {
      const qty = parseInt(inp.value) || 0;
      if (qty > 0) {
        const mid = parseInt(inp.getAttribute("data-masterid"));
        const price = getHargaPerPelanggan(pData.id, mid, mult);
        const sub = Math.floor(qty * price); total += sub;
        items.push({ idMaster: mid, name: masterLinen.find(m=>m.id===mid)?.name||"",
                     qty, unit: "Pcs", basePrice: price, subtotal: sub });
      }
    });
    nota.items = items;
  }
  nota.total = total;

  // Update ke Supabase
  await db.from("nota").update({ jenis: nota.jenis, total: nota.total, items: nota.items }).eq("id", id);
  toast("Nota diupdate!", "success");
  tutupModalEdit();
  await refreshDataSistem();
  await cariNotaSistem();
  await hitungMenejemenKeuangan();
}
```

---

### 15.17 Master Data — CRUD Linen, Jenis Nota, Pelanggan

#### Linen

```javascript
// Tambah linen baru
async function tambahLinen() {
  const name = document.getElementById("newLinenName").value.trim();
  if (!name) return toast("Nama linen wajib!", "warning");
  const { data, error } = await db.from("master_linen").insert([{ name }]).select();
  if (!error) {
    masterLinen.push({ id: data[0].id, name: data[0].name }); // Tambah ke cache
    renderMasterLinenTable();
    renderFormLinenInput(); // Refresh form input agar linen baru muncul
  }
}

// Update nama linen
async function updateLinen(id) {
  const newName = document.getElementById(`linenName-${id}`).value.trim();
  await db.from("master_linen").update({ name: newName }).eq("id", id);
  masterLinen.find(m => m.id === id).name = newName; // Update cache
  renderMasterLinenTable();
  renderFormLinenInput();
}

// Hapus linen
async function hapusLinen(id) {
  if (!await window.customConfirm("Hapus linen ini?")) return;
  await db.from("master_linen").delete().eq("id", id);
  masterLinen = masterLinen.filter(m => m.id !== id); // Hapus dari cache
  renderMasterLinenTable();
  renderFormLinenInput();
}
```

#### Jenis Nota

```javascript
// Tambah jenis nota baru
async function addMasterJenisNota() {
  const name   = document.getElementById("newJenisNotaName").value.trim().toUpperCase();
  const mult   = parseFloat(document.getElementById("newJenisNotaMultiplier").value);
  const forVal = document.getElementById("newJenisNotaFor").value; // "both", "flat", "reguler"
  const forFlat    = forVal !== "reguler";
  const forReguler = forVal !== "flat";
  await db.from("jenis_nota").insert([{ name, multiplier: mult, for_flat: forFlat, for_reguler: forReguler }]);
  // ...tambah ke jenisNotaList...
}

// Update jenis nota (nama, multiplier, untuk siapa)
async function updateMasterJenisNota(idx) {
  const jenis = jenisNotaList[idx];
  const name   = document.getElementById(`jnName-${idx}`).value.toUpperCase();
  const mult   = parseFloat(document.getElementById(`jnMult-${idx}`).value);
  const forVal = document.getElementById(`jnFor-${idx}`).value;
  await db.from("jenis_nota")
    .update({ name, multiplier: mult, for_flat: forVal !== "reguler", for_reguler: forVal !== "flat" })
    .eq("name", jenis.name); // Filter by nama lama (bukan id karena jenis nota tidak punya id numerik)
  jenis.name = name; jenis.multiplier = mult;
  // ...update cache & re-render...
}
```

**Catatan penting:** `jenis_nota` di-filter/update menggunakan field `name` (bukan `id`) karena tabel ini menggunakan nama sebagai identifier utama.

---

### 15.18 Atur Linen per Jenis Nota (`linen_config`)

Fitur ini memungkinkan admin memilih linen mana yang tampil di form input untuk jenis nota tertentu, dengan urutan custom.

```javascript
// Buka modal atur linen
function bukaModalAturLinenJenisNota() {
  renderAturLinenJenisNotaDropdown(); // Isi dropdown jenis nota
  loadLinenConfigForJenisNota();      // Load checkboxes
  document.getElementById("modalAturLinenJenisNota").style.display = "flex";
}

// Load checkbox linen untuk jenis nota yang dipilih
function loadLinenConfigForJenisNota() {
  const jenisName = document.getElementById("aturLinenJenisSelect").value;
  const jenis = jenisNotaList.find(j => j.name === jenisName);
  const config = jenis?.linen_config || []; // Array { id, urutan }
  const selectedIds = new Set(config.map(c => c.id));
  const orderMap = Object.fromEntries(config.map(c => [c.id, c.urutan]));

  // Sort: linen yang sudah dikonfigurasi tampil dahulu (berurutan)
  const sortedLinen = [...masterLinen].sort((a, b) => {
    const oa = orderMap[a.id] ?? 999;
    const ob = orderMap[b.id] ?? 999;
    return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
  });

  // Render checkbox dengan badge urutan
  const html = sortedLinen.map((m, idx) => `
    <label ...>
      <input type="checkbox" value="${m.id}" ${selectedIds.has(m.id) ? "checked" : ""}>
      <span>${m.name}</span>
      ${selectedIds.has(m.id) ? `<span class="urutan-badge">${orderMap[m.id]+1}</span>` : ""}
    </label>
  `).join("");
  document.getElementById("aturLinenCheckboxes").innerHTML = html;
}

// Auto-update badge urutan saat centang/uncentang
function updateLinenConfigOrder() {
  let urutan = 0;
  document.querySelectorAll("#aturLinenCheckboxes label").forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    const badge = item.querySelector('.urutan-badge');
    if (cb.checked) {
      // Tambah/update badge nomor urutan
      if (!badge) { /* buat badge baru */ }
      item.querySelector('.urutan-badge').textContent = ++urutan;
      item.style.background = '#f0fdf4'; // Hijau muda saat dicentang
    } else {
      if (badge) badge.remove(); // Hapus badge jika tidak dicentang
      item.style.background = 'transparent';
    }
  });
}

// Simpan konfigurasi ke Supabase (field linen_config di tabel jenis_nota)
async function simpanLinenConfigJenisNota() {
  const jenisName = document.getElementById("aturLinenJenisSelect").value;
  const linenConfig = [];
  let urutan = 0;
  document.querySelectorAll("#aturLinenCheckboxes label").forEach(label => {
    const cb = label.querySelector('input[type="checkbox"]');
    if (cb.checked) linenConfig.push({ id: parseInt(cb.value), urutan: urutan++ });
  });
  // Simpan array { id, urutan } ke field JSONB linen_config di Supabase
  await db.from("jenis_nota").update({ linen_config: linenConfig }).eq("name", jenisName);
  // Update cache lokal
  const j = jenisNotaList.find(x => x.name === jenisName);
  if (j) j.linen_config = linenConfig;
  localStorage.setItem("DB_JENIS_NOTA", JSON.stringify(jenisNotaList));
  toast("Linen per jenis nota disimpan.", "success");
}
```

**Struktur `linen_config` di Supabase:** disimpan sebagai kolom JSONB di tabel `jenis_nota`:
```json
[
  { "id": 1, "urutan": 0 },
  { "id": 3, "urutan": 1 },
  { "id": 5, "urutan": 2 }
]
```

---

### 15.19 Master Pelanggan — CRUD Lengkap

#### `tambahPelangganBaru()`

```javascript
async function tambahPelangganBaru() {
  const name    = document.getElementById("newPelangganName").value.trim();
  const type    = document.getElementById("newPelangganType").value;     // "HOTEL" / "RS"
  const billing = document.getElementById("newPelangganBilling").value;  // "FLAT" / "REGULER"
  const flatRate = parseCurrencyValue(document.getElementById("newFlatRate").value);
  const tarifRS  = parseCurrencyValue(document.getElementById("newTarifRS").value);
  const alamat  = document.getElementById("newPelangganAlamat").value.trim();
  const kota    = document.getElementById("newPelangganKota").value.trim();
  const kodeRaw = document.getElementById("newPelangganKode").value.trim().toUpperCase();
  const kode    = kodeRaw || generateKodePelanggan(name); // Auto jika kosong

  await db.from("pelanggan").insert([{
    nama: name, kode, tipe: type, billing_system: billing,
    flat_rate: flatRate, tarif_rs: tarifRS, alamat, kota
  }]);
  // ...tambah ke pelangganList, re-render...
}
```

#### `autoIsiKodeBaru()` — Auto-generate Kode saat Ketik Nama

```javascript
function autoIsiKodeBaru() {
  const nameInput = document.getElementById("newPelangganName");
  const kodeInput = document.getElementById("newPelangganKode");
  // Hanya auto-isi jika field kode masih kosong (tidak tumpuk yang manual)
  if (!kodeInput.value.trim()) {
    kodeInput.value = generateKodePelanggan(nameInput.value);
  }
}
```

Dipanggil via `oninput` pada field nama pelanggan baru.

#### `bukaModalEditPelanggan(id)` — Buka Modal Edit dengan Tabel Harga + DragDrop

```javascript
function bukaModalEditPelanggan(id) {
  const p = pelangganList.find(p => p.id === id);
  // Isi semua field modal dengan data pelanggan
  document.getElementById("editPelangganId").value     = id;
  document.getElementById("editPelangganName").value   = p.name;
  document.getElementById("editPelangganKode").value   = p.kode;
  // ...dst...

  // Load counter nomor invoice saat ini
  const counters = JSON.parse(localStorage.getItem("DB_INVOICE_COUNTER")) || {};
  const counterKey = `${p.kode}_${new Date().getFullYear()}`;
  document.getElementById("editPelangganCounter").value = counters[counterKey] ?? "";

  // Build tabel harga linen per pelanggan
  const savedList = getLinenPelanggan(id); // Linen yang sudah ada di konfigurasi
  const savedIds  = new Set(savedList.map(e => e.linenId));
  const inList    = savedList.map(e => masterLinen.find(m => m.id === e.linenId)).filter(Boolean);
  const notInList = masterLinen.filter(m => !savedIds.has(m.id)); // Linen yang belum masuk
  const allForRender = [...inList, ...notInList]; // Yang sudah ada di atas, sisanya di bawah

  const hargaMap = hargaPelanggan[id] || {};
  tbody.innerHTML = allForRender.map(m => {
    const isChecked = savedIds.has(m.id);
    const harga = hargaMap[m.id] || 0;
    return `<tr draggable="true" class="linen-drag-row" data-linen-id="${m.id}">
      <td class="drag-handle">⠿</td>
      <td><input type="checkbox" class="linen-active-cb" data-linen-id="${m.id}" ${isChecked ? "checked" : ""}></td>
      <td>${m.name}</td>
      <td><input type="text" class="harga-input" data-linen-id="${m.id}"
          value="${harga.toLocaleString("id-ID")}" oninput="formatCurrencyInput(this)"></td>
    </tr>`;
  }).join("");

  initLinenDragDrop(tbody); // Aktifkan drag & drop
  document.getElementById("modalDetailPelanggan").style.display = "flex";
}
```

#### `simpanDetailPelanggan()` — Simpan Edit + Harga + Urutan Linen

Ini fungsi terpanjang di bagian master data — melakukan 5 operasi Supabase sekaligus:

```javascript
async function simpanDetailPelanggan() {
  const id = parseInt(document.getElementById("editPelangganId").value);

  // 1. Update data dasar pelanggan
  await db.from("pelanggan").update({
    nama, kode, tipe, billing_system, flat_rate, tarif_rs, alamat, kota
  }).eq("id", id);

  // 2. Simpan harga linen baru
  const hargaBaru = {};
  document.querySelectorAll(".harga-input").forEach(inp => {
    hargaBaru[inp.dataset.linenId] = parseCurrencyValue(inp.value);
  });
  await db.from("harga_pelanggan").delete().eq("pelanggan_id", id); // Hapus lama
  await db.from("harga_pelanggan").insert(
    Object.entries(hargaBaru).map(([linenId, harga]) =>
      ({ pelanggan_id: id, linen_id: parseInt(linenId), harga })
    )
  ); // Insert baru

  // 3. Simpan urutan linen dari tabel drag-drop
  const activeLinenList = [];
  let urutanIndex = 0;
  document.querySelectorAll("#tabelHargaLinen tr.linen-drag-row").forEach(row => {
    const cb = row.querySelector(".linen-active-cb");
    if (cb && cb.checked) {
      activeLinenList.push({ linenId: parseInt(cb.dataset.linenId), urutan: urutanIndex++ });
    }
  });
  saveLinenPelanggan(id, activeLinenList); // Simpan ke localStorage
  await db.from("linen_pelanggan").delete().eq("pelanggan_id", id); // Hapus lama di Supabase
  await db.from("linen_pelanggan").insert(
    activeLinenList.map(item => ({
      pelanggan_id: id, linen_id: item.linenId, urutan: item.urutan
    }))
  ); // Insert baru

  // 4. Update counter nomor invoice jika diisi
  const counterVal = parseInt(document.getElementById("editPelangganCounter").value, 10);
  if (!isNaN(counterVal)) {
    await setCounterAwalPelanggan(kode, new Date().getFullYear(), counterVal);
  }

  // 5. Refresh semua data & UI
  await refreshDataSistem();
  tutupModal("modalDetailPelanggan");
  toast("Pelanggan & harga disimpan.");
}
```

---

### 15.20 Master Karyawan — CRUD

```javascript
function renderMasterKaryawanTable() {
  const tbody = document.getElementById("tabelMasterKaryawan");
  tbody.innerHTML = karyawanList.map(k =>
    `<tr>
      <td>${k.nama}</td>
      <td>${k.bagian || "-"}</td>
      <td>${k.persentase}%</td>     <!-- Persentase tidak aktif dipakai di hitung gaji, hanya data -->
      <td>
        <button onclick="openEditKaryawanModal(${k.id})">Edit</button>
        <button onclick="hapusKaryawan(${k.id})">Hapus</button>
      </td>
    </tr>`
  ).join("");
}

// Tambah karyawan baru → insert Supabase
async function tambahKaryawan() {
  const nama = document.getElementById("newKaryawanNama").value.trim();
  const bagian = document.getElementById("newKaryawanBagian").value;     // Dropdown bagian
  const persentase = parseFloat(document.getElementById("newKaryawanPersen").value);
  await db.from("karyawan").insert([{ nama, bagian, persentase }]);
  // ...tambah ke cache, render...
}

// Edit karyawan via modal
function openEditKaryawanModal(id) {
  const k = karyawanList.find(k => k.id === id);
  document.getElementById("editKaryawanId").value      = id;
  document.getElementById("editKaryawanNama").value    = k.nama;
  document.getElementById("editKaryawanBagian").value  = k.bagian || "";
  document.getElementById("editKaryawanPersen").value  = k.persentase;
  document.getElementById("editKaryawanModal").style.display = "flex";
}

async function updateKaryawanFromModal() {
  const id = parseInt(document.getElementById("editKaryawanId").value);
  const nama = document.getElementById("editKaryawanNama").value.trim();
  const bagian = document.getElementById("editKaryawanBagian").value.trim();
  const persentase = parseFloat(document.getElementById("editKaryawanPersen").value);
  await db.from("karyawan").update({ nama, bagian, persentase }).eq("id", id);
  // Update cache & render
  const k = karyawanList.find(k => k.id === id);
  k.nama = nama; k.bagian = bagian; k.persentase = persentase;
  renderMasterKaryawanTable();
  tutupEditKaryawanModal();
}
```

---

### 15.21 Pengaturan Global & Kop Surat

#### `simpanPengaturanGlobal()`

```javascript
async function simpanPengaturanGlobal() {
  const updates = {
    tarif_internal_hotel: parseCurrencyValue(document.getElementById("settingTarifHotel").value),
    // Tarif konversi Rp → KG untuk hitung gaji karyawan
    ongkos_per_kg: parseCurrencyValue(document.getElementById("settingOngkosPerKg").value),
    // Ongkos borongan per KG
    rekening_name: document.getElementById("settingRekeningName").value.trim(),
    rekening_no:   document.getElementById("settingRekeningNo").value.trim(),
    bank:          document.getElementById("settingBank").value.trim(),
    direktur:      document.getElementById("settingDirektur").value.trim(),
    peralatan:     parseCurrencyValue(document.getElementById("settingPeralatan").value),
    // Nilai peralatan masuk sebagai Aset di Neraca
  };
  await db.from("pengaturan").update(updates).eq("id", 1); // Hanya ada 1 row pengaturan
  pengaturan = { ...pengaturan, ...updates }; // Merge ke cache
  toast("Pengaturan disimpan!", "success");
}
```

Tabel `pengaturan` hanya punya **1 baris** (`id = 1`). Ini pola "singleton" — tidak perlu insert, selalu update baris yang sama.

#### `simpanKopSurat()`

```javascript
async function simpanKopSurat() {
  const updates = {
    nama: document.getElementById("kopNama").value.trim(),
    alamat: document.getElementById("kopAlamat").value.trim(),
    telepon: document.getElementById("kopTelepon").value.trim(),
    email: document.getElementById("kopEmail").value.trim(),
    kontak: document.getElementById("kopContact").value.trim(),
  };
  await db.from("kop").update(updates).eq("id", 1); // Singleton seperti pengaturan
  localStorage.setItem("DB_KOP", JSON.stringify(updates)); // Update cache

  // Jika ada file logo baru → simpan ke IndexedDB
  const fileInput = document.getElementById("fileLogoInput");
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) { toast("Ukuran logo maksimal 2 MB.", "warning"); return; }
    await saveLogoToIndexedDB(file); // Base64 → IndexedDB
  }
  toast("Kop surat disimpan.", "success");
  previewLogoFromDB(); // Refresh preview logo di halaman
}
```

#### `previewLogoFromDB()` & `handleLogoUpload(input)`

```javascript
// Preview logo yang ada di IndexedDB saat halaman dibuka
async function previewLogoFromDB() {
  const logoUrl = await getLogoFromIndexedDB();
  if (logoUrl) {
    document.getElementById("logoPreview").src = logoUrl;
    document.getElementById("logoPreviewContainer").style.display = "block";
    document.getElementById("logoStatus").innerText = "Logo tersimpan";
  } else {
    document.getElementById("logoPreviewContainer").style.display = "none";
    document.getElementById("logoStatus").innerText = "Belum ada logo";
  }
}

// Preview langsung saat user pilih file (sebelum simpan)
async function handleLogoUpload(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById("logoPreview").src = e.target.result; // Data URL sementara
    document.getElementById("logoPreviewContainer").style.display = "block";
    document.getElementById("logoStatus").innerText = file.name;
  };
  reader.readAsDataURL(file);
}
```

---

### 15.22 Modul Utang — CRUD + Bayar Cicilan

#### `simpanUtang()` — Catat Utang Baru

```javascript
async function simpanUtang() {
  const nama  = document.getElementById("utangNama").value.trim();
  const dari  = document.getElementById("utangDari").value;    // Bulan mulai: "2025-01"
  const sampai= document.getElementById("utangSampai").value;  // Bulan selesai: "2025-06"
  const cicilan = parseCurrencyValue(document.getElementById("utangCicilan").value);
  const keterangan = document.getElementById("utangKeterangan").value.trim();

  if (sampai < dari) { toast("Bulan selesai tidak boleh lebih kecil!", "warning"); return; }

  // Hitung total bulan cicilan
  const [thn1,bln1] = dari.split("-").map(Number);
  const [thn2,bln2] = sampai.split("-").map(Number);
  const totalBulan = (thn2-thn1)*12 + (bln2-bln1) + 1;
  // Contoh: 2025-01 s/d 2025-06 = 6 bulan

  await db.from("utang").insert([{
    nama, dari, sampai, cicilan, keterangan,
    sisa_bulan: totalBulan, // Berapa bulan yang masih harus dibayar
    status: "AKTIF"
  }]);
}
```

#### `bayarCicilan(id)` — Catat Pembayaran Cicilan

```javascript
async function bayarCicilan(id) {
  const { data: utangList } = await db.from("utang").select("*").eq("id", id);
  const utang = utangList[0];
  if (!await window.customConfirm(`Bayar cicilan "${utang.nama}" sebesar ${fmtRp(utang.cicilan)}?`)) return;

  // 1. Catat cicilan sebagai pengeluaran (biaya yang sudah lunas)
  await db.from("biaya").insert([{
    tanggal: new Date().toISOString().split("T")[0],
    kategori: "CICILAN UTANG",
    nominal: utang.cicilan,
    lunas: true, // Langsung lunas
    keterangan: `Cicilan: ${utang.nama}`
  }]);

  // 2. Kurangi sisa bulan
  const sisaBaru = utang.sisa_bulan - 1;
  const statusBaru = sisaBaru <= 0 ? "LUNAS" : "AKTIF"; // Lunas jika sudah 0 bulan tersisa
  await db.from("utang").update({ sisa_bulan: Math.max(0, sisaBaru), status: statusBaru }).eq("id", id);

  await refreshDataSistem();
  await hitungMenejemenKeuangan();
  toast("Cicilan dibayar & tercatat di pengeluaran.", "success");
}
```

**Efek terhadap neraca:**
- Cicilan yang dibayar → masuk `biaya` dengan `lunas: true` → mengurangi `kas`
- Sisa cicilan berkurang → `utang` berkurang → meningkatkan `modal`

#### `hitungTotalUtang()`

```javascript
function hitungTotalUtang() {
  const utangList = getUtangList();
  let total = 0;
  utangList.forEach(u => {
    if (u.status === "AKTIF") total += u.sisaBulan * u.cicilan;
    // Contoh: 4 bulan sisa × Rp 2.000.000/bulan = Rp 8.000.000 sisa utang
  });
  const el = document.getElementById("boxTotalUtang");
  if (el) el.innerText = fmtRp(total);
}
```

---

### 15.23 Gaji — `editGajiKaryawan()` & `simpanEditGajiBaru()`

```javascript
function editGajiKaryawan(kId, mulai, selesai) {
  const h = _hasilGaji.find(h =>
    h.karyawan.id == kId && h.periodeMulai === mulai && h.periodeSelesai === selesai
  );
  if (!h) return;

  // Simpan referensi ke state edit aktif
  _gajiAktif = { karyawanId: kId, periodeMulai: mulai, periodeSelesai: selesai, gajiId: h.gajiId };

  document.getElementById("editGajiId").value       = h.gajiId || "";
  document.getElementById("editGajiInsentif").value = h.insentif.toLocaleString("id-ID");
  document.getElementById("editGajiLembur").value   = h.lembur.toLocaleString("id-ID");
  document.getElementById("editGajiPotongan").value = h.potongan.toLocaleString("id-ID");
  document.getElementById("editGajiModal").style.display = "flex";
}

async function simpanEditGajiBaru() {
  const updates = {
    insentif: parseCurrencyValue(document.getElementById("editGajiInsentif").value),
    lembur:   parseCurrencyValue(document.getElementById("editGajiLembur").value),
    potongan: parseCurrencyValue(document.getElementById("editGajiPotongan").value),
  };

  if (_gajiAktif.gajiId) {
    // Sudah ada record → UPDATE
    await db.from("gaji").update(updates).eq("id", _gajiAktif.gajiId);
  } else {
    // Belum ada record → INSERT baru
    await db.from("gaji").insert([{
      karyawan_id:    _gajiAktif.karyawanId,
      periode_mulai:  _gajiAktif.periodeMulai,
      periode_selesai: _gajiAktif.periodeSelesai,
      ...updates
    }]);
  }

  tutupEditGaji();
  await tampilkanListGajiBaru(); // Recalculate dan re-render tabel gaji
  toast("Data gaji disimpan.", "success");
}
```

**Struktur tabel `gaji` di Supabase:**
| Kolom | Tipe | Keterangan |
|---|---|---|
| `karyawan_id` | int | FK ke tabel karyawan |
| `periode_mulai` | date | Tanggal mulai (mis. 2025-01-01) |
| `periode_selesai` | date | Tanggal selesai (mis. 2025-01-14) |
| `insentif` | numeric | Bonus tambahan |
| `lembur` | numeric | Upah lembur |
| `potongan` | numeric | Kas bon / potong gaji |

`Total Diterima = Upah Harian + Insentif + Lembur - Potongan`

---

### 15.24 Backup — Fungsi Lengkap

#### `renderBackupStatus()` — Tabel Status Backup per Bulan

```javascript
function renderBackupStatus() {
  const dbNota  = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  const history = getBackupHistory(); // Array bulan yang sudah di-backup: ["2025-01", "2025-02"]
  const bulanSet = new Set();
  dbNota.forEach(n => { if (n.tanggal) bulanSet.add(n.tanggal.substring(0,7)); });
  const bulanList = Array.from(bulanSet).sort(); // Urutkan ascending

  let html = '<table class="linen-table"><thead><tr><th>Bulan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
  bulanList.forEach(bln => {
    const sudah = history.includes(bln);
    html += `<tr>
      <td>${bln}</td>
      <td>${sudah ? "✅ Sudah di-backup" : "❌ Belum di-backup"}</td>
      <td>${!sudah ? `<button onclick="backupBulan('${bln}')">📤 Backup Bulan Ini</button>` : ""}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("backupStatusArea").innerHTML = html;
}
```

#### `backupSemuaBulanBelum()` — Backup Semua yang Belum

```javascript
async function backupSemuaBulanBelum() {
  const dbNota  = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  const history = getBackupHistory();
  const bulanSet = new Set();
  dbNota.forEach(n => { if (n.tanggal) bulanSet.add(n.tanggal.substring(0,7)); });
  const belum = Array.from(bulanSet).filter(bln => !history.includes(bln));

  if (belum.length === 0) { toast("Semua bulan sudah di-backup.", "info"); return; }

  if (!await window.customConfirm(
    `Backup & hapus ${belum.length} bulan: (${belum.join(", ")})?`
  )) return;

  // Export semua data ke 1 file JSON
  const allData = { metadata: { version: "v24" }, data: {} };
  const allKeys = ["DB_NOTA", "DB_BIAYA", "DB_LOCKS", ...];
  allKeys.forEach(k => allData.data[k] = JSON.parse(localStorage.getItem(k)));
  // Download file
  const a = document.createElement("a");
  a.download = `pelangi_backup_${belum.join("_")}.json`;
  a.click();

  // Hapus per bulan dari Supabase (dalam loop)
  for (const b of belum) {
    await db.from("nota").delete().gte("tanggal", `${b}-01`).lte("tanggal", `${b}-31`);
    await db.from("biaya").delete().gte("tanggal", `${b}-01`).lte("tanggal", `${b}-31`);
    await db.from("absensi").delete().gte("tanggal", `${b}-01`).lte("tanggal", `${b}-31`);
    await db.from("gaji").delete().gte("periode_mulai",`${b}-01`).lte("periode_mulai",`${b}-31`);
    await db.from("backup_history").delete().eq("bulan", b);
    await db.from("backup_history").insert([{ bulan: b }]);
  }
  // Hapus dari localStorage
  // Update backup history
  await refreshDataSistem();
  renderBackupStatus();
}
```

#### `backupDanBersihkan()` — Backup Full + Hapus Semua Transaksi

```javascript
async function backupDanBersihkan() {
  if (!await window.customConfirm(
    "BACKUP SEMUA DATA LALU HAPUS SEMUA TRANSAKSI? Data master TETAP AMAN."
  )) return;

  // Export semua data
  // ...download JSON...

  // Hapus SEMUA transaksi dari Supabase (bukan per bulan)
  await db.from("nota").delete().filter("id", "not.is", null);       // Hapus semua nota
  await db.from("biaya").delete().filter("id", "not.is", null);      // Hapus semua biaya
  await db.from("absensi").delete().gte("tanggal", "1900-01-01");    // Hapus semua absensi
  await db.from("gaji").delete().filter("id", "not.is", null);       // Hapus semua gaji
  await db.from("payment_status").delete().filter("key", "not.is", null);
  await db.from("locks").delete().filter("key", "not.is", null);
  await db.from("backup_history").delete().filter("bulan", "not.is", null);

  // Kosongkan localStorage (kecuali master data)
  const keysToClear = ["DB_NOTA", "DB_BIAYA", "DB_ABSENSI", "DB_GAJI", "DB_PAYMENT_STATUS", "DB_LOCKS"];
  keysToClear.forEach(k => localStorage.setItem(k, JSON.stringify([])));
  // DB_PELANGGAN, DB_MASTER_LINEN, DB_KARYAWAN, DB_PENGATURAN, dll → TIDAK dihapus

  await refreshDataSistem();
}
```

#### `bersihkanNotaRusak()` — Bersihkan Data Korup

```javascript
async function bersihkanNotaRusak() {
  const { data: notaData } = await db.from("nota").select("*");

  // Nota "rusak" = nota tanpa items (array kosong atau null)
  const rusak = (notaData || []).filter(n =>
    !n.items || (Array.isArray(n.items) && n.items.length === 0)
  );

  if (rusak.length > 0) {
    for (const n of rusak) await db.from("nota").delete().eq("id", n.id);
    toast(`${rusak.length} nota rusak dihapus.`, "success");
  } else {
    toast("Tidak ada nota rusak.", "info");
  }

  // Bersihkan localStorage juga
  let localNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  localNota = localNota.filter(n => n.notaId && n.items && n.items.length > 0);
  localStorage.setItem("DB_NOTA", JSON.stringify(localNota));

  await cariNotaSistem();
}
```

---

### 15.25 Event Listeners Global

```javascript
// ─── Tutup modal saat klik overlay (latar gelap) ─────────────────────────
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", (e) => {
    if (e.target === m) m.style.display = "none"; // Klik tepat di overlay (bukan konten)
  });
});

// ─── Tutup FAB saat klik di luar area FAB ────────────────────────────────
document.addEventListener("click", (e) => {
  const fab  = document.getElementById("fabBtn");
  const menu = document.getElementById("fabMenu");
  if (fab && menu && !fab.contains(e.target) && !menu.contains(e.target)) {
    fab.classList.remove("open");
    menu.classList.remove("open");
    fab.setAttribute("aria-expanded", "false");
  }
});

// ─── Tutup FAB saat tekan Escape ─────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const fab  = document.getElementById("fabBtn");
    const menu = document.getElementById("fabMenu");
    if (fab && fab.classList.contains("open")) {
      fab.classList.remove("open");
      menu.classList.remove("open");
      fab.setAttribute("aria-expanded", "false");
    }
  }
});
```

---

### 15.26 Aksesibilitas — `window.switchTab` Override

```javascript
// Simpan referensi fungsi asli
const originalSwitchTab = window.switchTab;

// Override dengan versi yang juga update aria-selected
window.switchTab = async function(tabId) {
  await originalSwitchTab(tabId); // Jalankan fungsi asli dulu

  // Update aria-selected pada semua tombol subtab
  document.querySelectorAll(".tab-btn").forEach(btn => {
    const onclick = btn.getAttribute("onclick") || "";
    const isActive = onclick.includes(tabId);
    btn.setAttribute("aria-selected", isActive);
    btn.classList.toggle("active", isActive);
  });

  // Update aria-selected pada tombol kategori
  document.querySelectorAll(".cat-btn").forEach(btn => {
    const isActive = TAB_CATEGORIES[btn.dataset.cat]?.tabs.some(t => t[0] === tabId);
    btn.setAttribute("aria-selected", isActive);
    btn.classList.toggle("active", isActive);
  });
};
```

Ini adalah **Decorator Pattern** — fungsi asli dibungkus (`wrapped`) dengan fungsi baru yang menambahkan perilaku aksesibilitas tanpa mengubah logika inti. `aria-selected` penting untuk screen reader agar bisa memberitahu pengguna tab mana yang sedang aktif.

---

## 16. Ringkasan Arsitektur Pattern

| Pattern | Implementasi | Lokasi |
|---|---|---|
| **Singleton** | Tabel `pengaturan` & `kop` hanya 1 row | Supabase + `refreshDataSistem` |
| **Cache-Aside** | Supabase → localStorage → variabel global | `refreshDataSistem` |
| **Promise-based Dialog** | `customConfirm` sebagai pengganti `window.confirm()` | Awal `script.js` |
| **Decorator Pattern** | `window.switchTab` override untuk aksesibilitas | Akhir `script.js` |
| **Stable Key** | Nomor invoice tidak berubah setelah dibuat | `getInvoiceStableNumber` |
| **Optimistic UI** | Badge status update langsung, sync Supabase belakang | `toggleStatusPembayaran` |
| **Dual Storage** | IndexedDB untuk logo (besar), localStorage untuk data JSON | `saveLogoToIndexedDB` |
| **Soft Delete** | Backup = export + hapus (bukan benar-benar dihapus permanen dari JSON) | `backupBulan` |
| **Auto-Migration** | `migratePelangganKode()` dijalankan otomatis saat load | Awal `script.js` |
| **Upsert** | `onConflict: "key"` untuk locks & payment_status | `toggleLockInvoice` |
| **Parallel Fetch** | `Promise.all` untuk tarik 15 tabel sekaligus | `refreshDataSistem` |

---

