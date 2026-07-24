# Panduan Deployment & Rilis - Pelangi Laundry

## 1. Persyaratan Lingkungan (Environment)
- **Node.js:** v18.x atau v20.x LTS
- **Package Manager:** npm v9+
- **Instance Supabase:** PostgreSQL 15+ dengan ekstensi aktif (`pgcrypto`, `uuid-ossp`).

## 2. Langkah Verifikasi Build Lokal

Sebelum melakukan rilis ke lingkungan staging atau produksi, jalankan pemeriksaan build:

```bash
# 1. Install dependensi
npm install

# 2. Pemeriksaan Tipe & Linting
npm run lint

# 3. Eksekusi Pengujian Unit
npm run test

# 4. Production Build
npm run build
```

## 3. Prosedur Deployment Migrasi Database

Seluruh file migrasi berada di folder `supabase/migrations/` dan diurutkan secara kronologis.

### Deployment melalui Supabase CLI (Direkomendasikan):
```bash
supabase db push
```

### Deployment Manual melalui SQL Editor Supabase:
1. Buka Supabase Dashboard -> SQL Editor.
2. Eksekusi file migrasi SQL secara berurutan mulai dari `001_profiles_and_roles.sql` hingga file migrasi terakhir `20260714000001_invoice_rs_custom_range.sql`.
3. Verifikasi izin tabel dan pembuatan fungsi RPC.

## 4. Deployment Frontend (Vercel / Netlify / Server Statis)

### Konfigurasi Vercel / Netlify
- **Perintah Build:** `npm run build`
- **Direktori Output:** `dist`
- **Perintah Install:** `npm install`
- **Variabel Lingkungan:** Atur `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada pengaturan platform deployment.

### Aturan Rewrite Rute Single Page Application (SPA)
Pastikan seluruh rute selain aset statis mengarah kembali ke `/index.html`:

**Vercel (`vercel.json`):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify (`public/_redirects`):**
```
/*    /index.html   200
```
