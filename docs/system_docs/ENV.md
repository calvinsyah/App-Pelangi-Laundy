# Referensi Variabel Lingkungan (ENV) - Pelangi Laundry

## 1. Ringkasan
Aplikasi Pelangi Laundry memerlukan variabel lingkungan untuk koneksi Supabase di sisi klien serta eksekusi pengujian otomatis (E2E testing).

## 2. Daftar Variabel Lingkungan

| Nama Variabel | Wajib | Cakupan (Scope) | Deskripsi |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Ya | Klien (Build & Runtime) | URL instance Supabase (misal: `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Ya | Klien (Build & Runtime) | Supabase Public Anonymous API Key |
| `TEST_EMAIL` | Opsional | E2E Testing (Playwright) | Email akun admin untuk pengujian |
| `TEST_PASSWORD` | Opsional | E2E Testing (Playwright) | Password akun admin untuk pengujian |

## 3. Contoh File Konfigurasi

### `.env` (Lingkungan Lokal - JANGAN DICOMMIT)
```env
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

TEST_EMAIL="admin@pelangilaundry.com"
TEST_PASSWORD="secretpassword"
```

### `.env.example` (Template - AMAN DICOMMIT)
```env
VITE_SUPABASE_URL="your_supabase_url"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"

TEST_EMAIL="your_test_email"
TEST_PASSWORD="your_test_password"
```

## 4. Aturan Keamanan Kredensial

1. Jangan pernah memasukkan `VITE_SUPABASE_ANON_KEY` atau kredensial produksi nyata ke dalam repository git.
2. Hindari penggunaan `SUPABASE_SERVICE_ROLE_KEY` pada kode frontend React. Hanya gunakan anon key.
3. Selalu perbarui `.env.example` apabila ada penambahan variabel lingkungan baru.
