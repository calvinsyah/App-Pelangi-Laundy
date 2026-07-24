# Arsitektur Sistem - Pelangi Laundry

## 1. Ringkasan
Aplikasi Pelangi Laundry adalah sistem POS (Point of Sale), Manajemen Tagihan/Invoice, Pengelolaan Keuangan, dan Penggajian Karyawan berbasis web (SPA) untuk operasional laundry skala Hotel, Rumah Sakit (RS), dan Pelanggan Reguler.

## 2. Stack Teknologi

| Lapisan | Teknologi | Fungsi |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript 5.8 | UI Utama & Type Safety |
| **Build Tool** | Vite 6.2 | Pengembang Lokal & Production Bundling |
| **Styling** | TailwindCSS 4.1 | Sistem Desain Utility-First |
| **State & Async Data** | TanStack React Query 5.101 | Manajemen Caching & State Server |
| **Ikon & Animasi** | Lucide React + Motion 12.23 | Ikon UI & Mikro-animasi |
| **Backend & Database** | Supabase (PostgreSQL 15+) | BaaS: Otentikasi, Database, Storage, RPC |
| **Pengujian** | Vitest + Playwright | Pengujian Unit & End-to-End (E2E) |

## 3. Arsitektur Sistem Tingkat Tinggi

```
[ Web Browser / Klien ]
       │
       ├─► React 19 SPA (Vite)
       │     ├─ Halaman (Dashboard, Master, Transaksi, Tagihan, Keuangan, Sistem)
       │     ├─ Context (AuthContext)
       │     └─ Utility Libs (invoiceUtils, printUtils, utils, dateUtils)
       │
       └─► Klien Supabase (JS SDK v2)
             ├─ API HTTPS (REST / Realtime)
             ├─ Kebijakan Keamanan Keamanan Tingkat Baris (RLS)
             └─ Database RPC (generate_document_number, get_dashboard_summary, dll)
```

## 4. Struktur Direktori Kode

```
pelangi-laundry-app/
├── docs/                      # Dokumentasi umum proyek
│   └── system_docs/           # Dokumentasi spesifikasi sistem terstruktur
├── src/
│   ├── components/            # Komponen UI bersama (Layout, AuthContext, Dialog)
│   ├── lib/                   # Modul bantuan (utils, invoiceUtils, printUtils, dateUtils)
│   ├── pages/                 # Komponen halaman berdasarkan domain fitur
│   │   ├── keuangan/          # AbsensiGaji, Laporan, Pengeluaran, Utang
│   │   ├── master/            # MasterPelanggan, MasterLinen, MasterKaryawan, MasterJenisNota
│   │   ├── sistem/            # Backup, Pengaturan
│   │   ├── tagihan/           # Tagihan, Kuitansi
│   │   └── transaksi/         # InputNota, RiwayatNota
│   ├── App.tsx                # Rute React Router v7 & pembungkus layout
│   └── main.tsx               # Entrypoint aplikasi
├── supabase/
│   └── migrations/            # 29 file migrasi SQL & skema database
├── tests/                     # File pengujian E2E Playwright
├── package.json
└── vite.config.ts
```

## 5. Titik Integrasi & Alur Data

1. **Alur Otentikasi:**
   - Supabase Auth mengelola token otentikasi pengguna.
   - `AuthContext.tsx` mengelola persistensi sesi dan login/logout.
2. **Alur Penomoran Dokumen:**
   - Klien memanggil `generateDocumentNumber()` di `invoiceUtils.ts`.
   - Fungsi RPC `generate_document_number` menambah counter secara atomik pada tabel `document_counters`.
   - Hasil diformat (`001/PL-INV-HG/VI/2026`) dan disimpan pada cache tabel `invoice_numbers`.
3. **Cetak & Ekspor Tagihan:**
   - String HTML dibuat di sisi klien menggunakan `printUtils.ts`.
   - Pemanggilan `window.print()` dipicu via popup/iframe khusus cetak.
