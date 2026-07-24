# Arsitektur Keamanan & Kebijakan - Pelangi Laundry

## 1. Otentikasi & Struktur Otorisasi

- **Penyedia Identitas:** Supabase Auth (`supabase.auth`).
- **Manajemen Sesi:** Caching token local storage dengan refresh otomatis yang dikelola oleh `@supabase/supabase-js`.
- **Verifikasi Peran (Role):** Dikontrol melalui tabel `profiles` yang terhubung ke `auth.users(id)`. Peran yang didukung mencakup `admin` dan `operator` / `kasir`.
- **Auth Context Wrapper:** `AuthContext.tsx` mengelola inisialisasi, event login/logout, listening sesi, dan pembatasan akses berbasis peran.

## 2. Kebijakan Row Level Security (RLS)

Seluruh tabel produksi telah diaktifkan RLS (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).

### Ringkasan Kebijakan RLS Utama:

| Tabel | Nama Kebijakan (Policy) | Peran Berizin | Kondisi / Ekspresi |
|---|---|---|---|
| `pelanggan` | `Authenticated users read/write` | `authenticated` | `auth.role() = 'authenticated'` |
| `nota` | `Authenticated users full access` | `authenticated` | `auth.role() = 'authenticated'` |
| `locks_payment` | `Authenticated users manage locks` | `authenticated` | `auth.role() = 'authenticated'` |
| `master_linen` | `Authenticated users read/write` | `authenticated` | `auth.role() = 'authenticated'` |
| `linen_harga_pelanggan` | `Authenticated users full access` | `authenticated` | `auth.role() = 'authenticated'` |
| `pengeluaran_harian` | `Authenticated users manage expenses` | `authenticated` | `auth.role() = 'authenticated'` |

## 3. Sanitasi Data & Mitigasi XSS

- Escape HTML: Fungsi `escapeHtml()` pada `src/lib/utils.ts` membersihkan seluruh masukan dinamis pengguna sebelum dibuat menjadi string HTML pada jendela cetak (`printUtils.ts`).
- Auto-escaping React JSX: Komponen bawaan React JSX mencegah injeksi skrip HTML secara otomatis.

## 4. Kebijakan Pembersihan Kredensial & Histori Git

- **Tanpa Kredensial Hardcode:** Dilarang keras menyimpan password, email admin, atau token rahasia pada kode sumber, histori commit, maupun file dokumentasi.
- **Pembersihan Histori Git:** Pembersihan histori destruktif (`git filter-repo` / BFG) wajib disetujui secara eksplisit sebelum melakukan force-push jika terdapat kredensial lama di histori git.
- **Aturan Pembersihan `note.txt`:** File `note.txt` yang berisi kredensial wajib dibersihkan dan diganti dengan catatan operasional biasa tanpa kredensial atau password nyata.
