# PRD — Restrukturisasi Pelangi Laundry
### (Versi Final — Hasil Verifikasi Langsung + Kolaborasi PRD Claude & PRD Z.ai)

| | |
|---|---|
| **Produk** | Sistem Manajemen Laundry "Pelangi Laundry" |
| **Repo** | github.com/calvinsyah/App-Pelangi-Laundy |
| **Pilot** | app-pelangi-laundy.vercel.app ("Pelangi Laundry — v25 Enhanced Progressive") |
| **Versi Dokumen** | 2.0 — Final, gabungan & terverifikasi |
| **Tanggal** | 4 Juli 2026 |
| **Target Biaya Infrastruktur** | Rp 0 / bulan |
| **Status** | Draft final untuk review pemilik produk |

---

## 0. Tentang Dokumen Ini

Anda sudah punya dua PRD — satu dari Claude, satu dari Z.ai. Sebelum menulis ulang, saya (Claude) melakukan **verifikasi independen** terhadap klaim-klaim di kedua dokumen itu:

1. Mengambil struktur file repo GitHub Anda langsung (root directory listing).
2. Membaca isi `package.json` yang sebenarnya ter-commit di repo.
3. Mengambil HTML halaman pilot yang live di Vercel dan mencocokkan dengan daftar fitur di kedua PRD.
4. Mengecek **kebijakan terbaru** (per pertengahan 2026) dari Vercel dan Cloudflare soal penggunaan komersial di tier gratis — ini poin yang disebut salah satu PRD tapi tidak disinggung sama sekali oleh PRD yang lain, jadi perlu dipastikan siapa yang benar.

Hasilnya: **kedua PRD ternyata akurat** pada bagian audit teknis (struktur kode, celah keamanan, daftar fitur) — keduanya secara independen menemukan temuan yang sama persis, yang justru memperkuat validitasnya. Perbedaan besar ada di **arsitektur yang diusulkan** dan **kelengkapan artefak implementasi**. Dokumen ini menggabungkan kekuatan keduanya, memperbaiki titik lemah masing-masing, dan menambahkan satu keputusan yang belum final di keduanya: **RLS-native (Supabase Auth) vs Custom Backend (Next.js API routes)**.

---

## 1. Ringkasan Perbandingan: PRD Claude vs PRD Z.ai

| Aspek | PRD Claude | PRD Z.ai | Verdict |
|---|---|---|---|
| **Kedalaman audit keamanan** | Sangat detail, dengan penjelasan *mengapa* anon key publik bukan masalah utama (RLS yang esensial) — pemahaman konsep paling matang | Detail, plus menemukan **3 bug fungsional konkret** (`toRoman()` syntax error, nota FLAT total 0 tersimpan, localStorage stale) yang PRD Claude tidak sebutkan | 🤝 **Gabungkan** — konsep keamanan dari Claude + temuan bug dari Z.ai |
| **Arsitektur diusulkan** | Tetap pola Supabase (BaaS): Supabase Auth + RLS + Edge Function untuk logika sensitif. Klien tetap bicara langsung ke Supabase (dengan JWT) | Tambah backend penuh: Next.js API routes + JWT/bcrypt custom + service_role key, klien **tidak pernah** bicara ke Supabase langsung | ⚠️ **Perlu keputusan eksplisit** — lihat §5. Ini beda filosofi, bukan sekadar beda selera |
| **Kelengkapan skema database (SQL)** | Tidak menyertakan SQL sama sekali — hanya daftar nama tabel dari observasi | Menyertakan rancangan migration SQL cukup rinci (RLS policy, tabel baru: `users`, `audit_log`, dll.) | ✅ **Z.ai lebih unggul** — diadopsi sebagai basis §7 |
| **Spesifikasi API/route** | Tidak ada endpoint API konkret (karena arsitekturnya memang tanpa backend custom) | Daftar folder `app/api/**/route.ts` sangat rinci per modul | ✅ **Z.ai lebih unggul untuk opsi custom backend**; diadaptasi jadi daftar Edge Function di §9 untuk opsi Supabase-native |
| **Rencana migrasi** | Berbasis fase & minggu, dengan **Fase 0 "mitigasi darurat 1–2 hari"** sebelum rewrite penuh — poin krusial yang tidak ada di Z.ai | Berbasis fase & jam kerja granular (total ~160 jam / 9 minggu) — sangat berguna untuk estimasi effort/biaya waktu | 🤝 **Gabungkan** — darurat dulu (Claude), lalu breakdown jam (Z.ai) |
| **Isu hosting Vercel Hobby untuk pemakaian komersial** | Diangkat sebagai risiko nyata, rekomendasi pindah ke Cloudflare Pages | **Tidak disinggung sama sekali** — asumsinya tetap Vercel Free tanpa syarat | ✅ **Saya verifikasi: Claude benar.** Lihat kotak verifikasi di §5.4 |
| **Kriteria akhir/acceptance criteria** | Checklist naratif per fase (cutover checklist) | Checklist **grep-able** yang bisa dijalankan sebagai perintah literal (`grep -r "SERVICE_ROLE_KEY" .next/`) — jauh lebih dapat diverifikasi otomatis | ✅ **Z.ai lebih unggul** — diadopsi di §15 |
| **Kepatuhan data pribadi (UU PDP)** | Disinggung eksplisit (data gaji karyawan, UU No. 27/2022) | Tidak disinggung | ✅ **Claude lebih lengkap** — dipertahankan |
| **Estimasi biaya waktu/effort** | Tidak ada estimasi jam sama sekali, hanya rentang minggu | Sangat rinci per task (jam) | ✅ **Z.ai lebih unggul** — diadopsi |

**Kesimpulan pembanding**: Tidak ada yang "menang telak". PRD Claude lebih kuat di *strategi, prinsip keamanan, dan manajemen risiko transisi*. PRD Z.ai lebih kuat di *artefak teknis siap-eksekusi* (SQL, API, estimasi jam, kriteria verifikasi otomatis). PRD final ini mengambil yang terbaik dari keduanya, plus **satu keputusan arsitektur eksplisit** yang keduanya belum benar-benar adu-argumenkan satu sama lain (§5).

---

## 2. Hasil Audit Aplikasi Saat Ini (Terverifikasi)

### 2.1 Yang Saya Konfirmasi Langsung
- Struktur repo root: `index.html`, `script.js`, `style.css`, `supabaseClient.js`, `package.json`, `tsconfig.json`, `vite.config.ts`, `metadata.json`, `note.txt`, `.env.example` — **cocok dengan deskripsi kedua PRD**.
- Isi `package.json` **cocok persis** dengan klaim PRD Claude: dependency `@google/genai`, `express`, `ws` memang ada tapi tidak relevan dengan aplikasi laundry (sisa boilerplate template AI Studio/Gemini) — bukan salah baca.
- Halaman pilot yang live (judul asli: **"Pelangi Laundry - v25 Enhanced Progressive"**) memuat seluruh modul yang disebut kedua PRD: Transaksi (Input Nota, Riwayat Nota), Tagihan (Invoice, Linen Room, Kuitansi), Keuangan (Dashboard, Pengeluaran, Laporan, Utang), Sistem (Master Linen/Jenis Nota/Pelanggan/Karyawan, Pengaturan, Kop Surat, Absensi & Gaji, Backup/Restore). Ini memperkuat bahwa **daftar fitur di §10 dokumen ini akurat dan lengkap**.
- **Kebijakan Vercel Hobby (dicek ulang, berlaku 2026)**: dinyatakan eksplisit di Fair Use Guidelines dan Terms of Service Vercel bahwa *"Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan."* Definisi "commercial usage" mencakup segala penggunaan untuk keuntungan finansial siapa pun yang terlibat dalam proyek — ini **cocok persis dengan kasus Anda** (aplikasi operasional bisnis laundry nyata). PRD Z.ai tidak menyebut ini sama sekali; **PRD Claude benar mengangkatnya sebagai risiko**.
- **Kebijakan Cloudflare Pages (dicek ulang)**: tier gratis mengizinkan bandwidth tak terbatas dan secara eksplisit mengizinkan penggunaan komersial — jadi rekomendasi Claude untuk pindah ke Cloudflare Pages **valid secara teknis dan legal**.

### 2.2 Ringkasan Temuan Keamanan (Gabungan, Diurutkan Berdasarkan Keparahan)

| # | Severity | Temuan | Sumber |
|---|---|---|---|
| 1 | 🔴 Kritis | Tidak ada verifikasi identitas di level backend/database — kemungkinan besar tanpa Supabase Auth, status RLS tidak dapat diverifikasi dari kode klien | Claude + Z.ai |
| 2 | 🔴 Kritis | Login `admin/admin` & `user/user` dicek 100% di JavaScript sisi klien, password plaintext, tanpa hashing | Claude + Z.ai |
| 3 | 🔴 Kritis | Role-based access control murni kosmetik (`display:none` via CSS/JS) — bisa dibypass dari DevTools Console | Claude + Z.ai |
| 4 | 🟠 Tinggi | Supabase URL + anon key ter-hardcode di `supabaseClient.js`, ter-commit ke repo publik | Claude + Z.ai |
| 5 | 🟠 Tinggi | ~61 titik penggunaan `innerHTML` tanpa sanitasi → potensi *stored XSS* dari nama pelanggan/karyawan/deskripsi biaya | Claude |
| 6 | 🟡 Sedang | Tidak ada rate-limit/lockout percobaan login → rentan brute force | Claude + Z.ai |
| 7 | 🟡 Sedang | Tidak ada audit trail aksi pengguna (hapus nota, ubah gaji, dll.) | Claude + Z.ai |
| 8 | 🟡 Sedang | Tidak ada backup otomatis (hanya export manual JSON) | Claude |
| 9 | 🟡 Sedang | Skema database tidak version-controlled (tidak ada file SQL di repo) | Claude |
| 10 | 🟡 Sedang | CORS Supabase masih terbuka (belum dibatasi ke domain produksi) | Z.ai |
| 11 | 🟢 Rendah | Duplikasi data ke `localStorage` sebagai cache manual → risiko data basi antar device/tab | Claude + Z.ai |
| 12 | 🟢 Rendah | Logo perusahaan hanya di IndexedDB lokal (tidak sinkron antar device) | Claude |
| 13 | 🟢 Rendah | Kode monolitik satu file besar (`script.js` ±2.750–2.900 baris), tanpa automated test | Claude + Z.ai |
| 14 | 🟢 Rendah | Dependency tidak terpakai (`@google/genai`, `express`, `ws`) memperluas permukaan serangan *supply chain* tanpa manfaat | Claude |
| 15 | ℹ️ Info | Vercel Hobby plan resmi hanya untuk non-komersial — aplikasi ini dipakai untuk operasional bisnis nyata (**terverifikasi berlaku 2026**) | Claude (terverifikasi) |

### 2.3 Bug Fungsional yang Ditemukan Z.ai (Perlu Diperbaiki Saat Rewrite)

| # | Bug | Dampak | Perbaikan |
|---|---|---|---|
| B1 | Kesalahan penulisan (typo) di fungsi `toRoman()` (mis. referensi variabel yang salah nama) | Penomoran invoice format Romawi berpotensi salah/gagal | Tulis ulang fungsi dengan unit test |
| B2 | Nota jenis FLAT dengan total Rp 0 bisa tersimpan tanpa peringatan | Data transaksi tidak valid masuk ke laporan keuangan | Validasi wajib: total > 0 atau minimal 1 item, baik di klien maupun server |
| B3 | `localStorage` bisa berisi data basi (stale) jika request ke Supabase gagal, tapi UI tetap menampilkan data lama tanpa indikasi | Staf bisa bekerja dengan data yang sudah tidak akurat tanpa sadar | Hilangkan pola cache manual, ganti dengan TanStack Query (auto-invalidation + indikator loading/error eksplisit) |

---

## 3. Tujuan & Ruang Lingkup

### 3.1 Tujuan Restrukturisasi
1. **Menutup seluruh celah keamanan kritis** (autentikasi nyata, otorisasi nyata, tanpa kredensial hardcoded).
2. **Memindahkan logika bisnis yang berkaitan dengan uang** (nomor invoice, kalkulasi total, kalkulasi gaji) ke sisi yang tidak bisa dimanipulasi client-side.
3. **Mempertahankan 100% fitur bisnis yang sudah berjalan** — *feature parity*, bukan membangun ulang dari nol.
4. **Menjaga biaya infrastruktur Rp 0/bulan**, termasuk memastikan pilihan hosting **tidak melanggar ketentuan layanan** penyedia (poin yang sebelumnya terlewat).
5. **Kode modular, terketik (TypeScript), teruji otomatis**, skema database version-controlled sebagai kode.
6. Memperbaiki 3 bug fungsional yang ditemukan (§2.3).

### 3.2 Di Luar Ruang Lingkup Fase Ini
- Multi-cabang / multi-tenant.
- Aplikasi mobile native (PWA dianggap cukup).
- Payment gateway (QRIS, dll.) — kandidat roadmap berikutnya.
- Fitur AI/Gemini — tidak ada bukti dipakai di aplikasi saat ini, dependency-nya dihapus.

---

## 4. Pengguna & Peran

| Peran | Akses |
|---|---|
| **Admin** | Semua modul: Transaksi, Tagihan, Keuangan, Master Data, Payroll, Pengaturan, Backup/Restore, hapus data |
| **Staf/Kasir ("user")** | Modul Transaksi & Tagihan (input nota, cari riwayat, cetak); **tanpa** akses Keuangan/Master Data/Payroll/Pengaturan/hapus data |

**Perubahan penting**: setiap staf memiliki **akun individual** (bukan lagi satu akun `user` bersama) agar aksi bisa diaudit ("siapa menghapus nota ini?") dan akses bisa dicabut per orang saat ada staf keluar.

---

## 5. Keputusan Arsitektur — Titik Krusial yang Belum Diputuskan di Kedua PRD Sebelumnya

Ini bagian paling penting dari kolaborasi ini. Kedua PRD sebelumnya **memilih arsitektur berbeda tanpa membandingkannya secara eksplisit** satu sama lain. Berikut perbandingannya apa adanya, supaya Anda (atau tim Anda) yang memutuskan dengan mata terbuka:

### 5.1 Opsi A — "Supabase-native" (pendekatan PRD Claude)
Klien (React SPA) tetap bicara **langsung** ke Supabase, tapi kali ini lewat **Supabase Auth** (bukan hardcode) dan dilindungi **Row Level Security (RLS)** di setiap tabel. Logika sensitif (nomor invoice, kalkulasi gaji, aksi destruktif) dipindah ke **Supabase Edge Function**.

| Kelebihan | Kekurangan |
|---|---|
| Lebih sedikit kode untuk ditulis & dirawat (tidak perlu bangun sistem login sendiri) | Klien tetap butuh koneksi langsung ke Supabase (walau ini memang cara Supabase dirancang dipakai) |
| Memakai Supabase Auth yang sudah matang & teruji jutaan aplikasi (hashing, session, refresh token, reset password, rate limit dasar) — risiko bug keamanan buatan sendiri jauh lebih kecil | Perlu belajar menulis RLS policy SQL dengan benar (sekali di awal) |
| Estimasi effort implementasi lebih rendah (cocok untuk 1 developer, budget waktu terbatas) | Struktur skema & sebagian logika "terlihat" oleh siapa pun yang membuka DevTools Network tab (walau sudah dilindungi RLS, bukan celah, tapi kurang "privat" secara kosmetik) |
| Selaras dengan filosofi asli Supabase sebagai *Backend-as-a-Service* | |

### 5.2 Opsi B — "Custom Backend" (pendekatan PRD Z.ai)
Ditambahkan Next.js API routes sebagai lapisan server. Klien **tidak pernah** bicara ke Supabase; semua lewat `/api/*`, yang di baliknya memakai `service_role key` (bypass RLS) + JWT/bcrypt buatan sendiri.

| Kelebihan | Kekurangan |
|---|---|
| Struktur endpoint API konvensional, familiar bagi developer berlatar backend tradisional | **Menulis ulang sistem login/session sendiri (JWT + bcrypt) berisiko bug keamanan baru** — ini justru area yang paling sering jadi sumber celah kritis di aplikasi buatan sendiri, dibanding memakai Supabase Auth yang sudah battle-tested |
| Struktur database & business logic tidak terekspos sama sekali ke browser (defense-in-depth tambahan) | Effort jauh lebih besar (~160 jam menurut estimasi Z.ai sendiri) untuk fitur yang sebenarnya sudah disediakan gratis oleh Supabase Auth |
| Mudah menambah integrasi pihak ketiga di masa depan (WhatsApp API, payment gateway) karena sudah ada lapisan server | **Kontradiksi internal**: jika semua akses lewat `service_role key` (yang memang didesain *melewati* RLS), maka mengaktifkan RLS di semua tabel (klaim G2 di PRD Z.ai) menjadi **lapisan cadangan yang tidak benar-benar ditegakkan** di jalur utama — otorisasi sebenarnya sepenuhnya bergantung pada kebenaran kode middleware JWT, bukan pada RLS. Ini bukan berarti salah, tapi PRD Z.ai perlu jujur bahwa RLS di sini adalah *safety net*, bukan garda utama |
| Tetap bisa pakai Vercel (tidak perlu pindah hosting) | Serverless function usage (Vercel) ikut terhitung ke kuota gratis — masih aman di skala 1 laundry, tapi jadi satu variabel lagi untuk dipantau |

### 5.3 Rekomendasi Final

> ✅ **Rekomendasi: Opsi A (Supabase-native) sebagai arsitektur utama**, dengan alasan utama **manajemen risiko keamanan** — bukan karena Opsi B salah, tapi karena membangun ulang sistem autentikasi dari nol (JWT + bcrypt custom) menambah permukaan risiko baru yang sebenarnya tidak perlu, ketika Supabase Auth sudah menyediakan solusi gratis, teruji, dan cukup untuk kebutuhan aplikasi 1 laundry ini. Untuk tim kecil/solo developer dengan target Rp 0 dan waktu terbatas, **less custom code = less bug**.
>
> Namun, **artefak teknis dari PRD Z.ai (skema SQL, daftar endpoint, breakdown jam kerja, acceptance criteria grep-able) tetap dipakai penuh** di dokumen ini — hanya diadaptasi dari "Next.js API routes" menjadi "Supabase Edge Functions + RLS policy", tanpa kehilangan kedalaman teknisnya.
>
> Jika tim Anda punya latar belakang backend tradisional (Node/Express) dan lebih nyaman dengan pola REST API eksplisit, **Opsi B tetap merupakan pilihan yang valid dan aman** — asal disiplin: jangan pernah expose `service_role key` ke klien, dan tetap tulis RLS sebagai lapisan kedua meski tidak jadi garda utama.

### 5.4 Verifikasi Kebijakan Hosting (Rp 0 yang Sesungguhnya Rp 0)

| Provider | Tier Gratis | Boleh Komersial? | Status Verifikasi |
|---|---|---|---|
| **Vercel Hobby** | 100 GB bandwidth, 1 seat | ❌ **Tidak** — Terms of Service & Fair Use Guidelines Vercel eksplisit menyatakan Hobby "restricted to non-commercial personal use only"; commercial usage wajib Pro/Enterprise (mulai $20/bulan/seat — **bukan Rp 0**) | Dicek ulang, berlaku 2026 |
| **Cloudflare Pages** | Bandwidth tidak terbatas | ✅ **Ya**, eksplisit mengizinkan pemakaian komersial di tier gratis | Dicek ulang, berlaku 2026 |

**Implikasi konkret**: karena aplikasi ini dipakai untuk operasional bisnis laundry yang menghasilkan pendapatan, memakai Vercel Hobby untuk versi produksi **berisiko melanggar ToS** (Vercel berhak menonaktifkan deployment tanpa pemberitahuan). Ini bukan nasihat hukum — Vercel jarang menegakkan ini secara agresif untuk skala sangat kecil — tapi untuk benar-benar menjamin biaya **Rp 0 tanpa risiko**, dokumen ini merekomendasikan **Cloudflare Pages** sebagai hosting frontend utama.

---

## 6. Tech Stack Final (Target: Rp 0/bulan)

| Layer | Pilihan | Biaya | Catatan |
|---|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Rp 0 | Sudah ada di `package.json`, tinggal benar-benar dipakai |
| Styling | Tailwind CSS v4 | Rp 0 | Migrasikan token warna dari `style.css` lama ke `tailwind.config` agar tampilan familiar bagi staf |
| Data fetching/cache | TanStack Query | Rp 0 | Ganti pola manual "fetch → simpan ke localStorage" (perbaiki bug B3) |
| Form & validasi | React Hook Form + Zod | Rp 0 | Skema Zod yang sama dipakai ulang untuk validasi di Edge Function |
| **Autentikasi** | **Supabase Auth** (email + password) | Rp 0 (hingga 50.000 MAU) | Ganti login hardcoded; password di-hash otomatis (bcrypt), JWT dengan expiry |
| Database | Supabase Postgres | Rp 0 (500 MB) | Volume data 1 laundry jauh di bawah batas selama bertahun-tahun |
| **Otorisasi** | **Row Level Security (RLS)** | Rp 0 | Garda utama — lihat §8 |
| Logika bisnis sensitif | **Supabase Edge Functions** (Deno/TS) | Rp 0 (500rb invocation/bulan) | Nomor invoice, kalkulasi gaji, aksi destruktif — lihat §9 |
| File storage | Supabase Storage | Rp 0 (1 GB) | Logo & arsip PDF, ganti IndexedDB lokal |
| **Hosting frontend** | **Cloudflare Pages** | Rp 0, bandwidth tak terbatas, **komersial diizinkan** | Lihat §5.4 |
| PDF generator | `@react-pdf/renderer` | Rp 0 | Ganti `window.print()` popup agar hasil cetak konsisten & bisa diarsipkan |
| Excel export | `xlsx` (SheetJS) | Rp 0 | Export Linen Room ke .csv/.xlsx |
| Backup terjadwal | GitHub Actions (cron) → dump ke repo privat/Cloudflare R2 | Rp 0 | Mengatasi ketiadaan backup otomatis Supabase free tier |
| CI/CD | GitHub Actions | Rp 0 | Lint, type-check, unit test, build otomatis |
| Testing | Vitest + Playwright | Rp 0 | Playwright sudah ada di `package.json` |
| Monitoring (opsional) | Sentry free tier | Rp 0 (5.000 event/bulan) | Opsional |
| Domain | `*.pages.dev` gratis | Rp 0 | Domain kustom (`.id`/`.com`) opsional, satu-satunya item berpotensi berbayar |

**Total biaya wajib: Rp 0/bulan.**

---

## 7. Skema Database (Migration SQL — Diadaptasi dari PRD Z.ai)

Tulis sebagai file `supabase/migrations/*.sql` version-controlled, bukan hanya di dashboard.

```sql
-- 001_profiles_and_roles.sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- 002_audit_log.sql
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  aksi text not null,               -- 'DELETE', 'UPDATE', dll.
  tabel text not null,
  row_id text,
  nilai_sebelum jsonb,
  nilai_sesudah jsonb,
  created_at timestamptz default now()
);

-- 003_enable_rls_semua_tabel.sql
-- Jalankan untuk SEMUA 18 tabel existing: nota, biaya, gaji, absensi,
-- karyawan, pelanggan, master_linen, harga_pelanggan, linen_pelanggan,
-- jenis_nota, pengaturan, kop, invoice_numbers, invoice_counter,
-- payment_status, locks, utang, backup_history
alter table nota enable row level security;
-- ...ulangi untuk setiap tabel

-- Contoh kebijakan: nota (SELECT/INSERT untuk admin & user, UPDATE/DELETE admin saja)
create policy "nota_select_all_login" on nota
  for select using (auth.role() = 'authenticated');

create policy "nota_insert_all_login" on nota
  for insert with check (auth.role() = 'authenticated');

create policy "nota_update_delete_admin_only" on nota
  for update, delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Contoh kebijakan lebih ketat: gaji & karyawan (admin only, tanpa kecuali)
create policy "gaji_admin_only" on gaji
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
```

> **Prinsip kunci (dari PRD Claude, tetap berlaku)**: anon key Supabase memang didesain publik — masalahnya bukan di situ, tapi di **tidak adanya RLS**. Solusinya bukan "menyembunyikan" anon key (mustahil untuk app client-side), tapi memastikan **setiap tabel** punya RLS yang benar dan default-deny.

---

## 8. Spesifikasi Keamanan (Checklist Gabungan)

| # | Item | Prioritas |
|---|---|---|
| 1 | Aktifkan Supabase Auth, hapus login hardcoded | Wajib |
| 2 | Aktifkan RLS di **semua 18+ tabel**, default deny | Wajib |
| 3 | Pastikan `service_role key` **tidak pernah** ada di kode frontend/bundle | Wajib |
| 4 | Pindahkan penomoran invoice & kalkulasi gaji ke Edge Function | Wajib |
| 5 | Ganti `innerHTML` manual dengan JSX/React (anti-XSS otomatis) | Wajib |
| 6 | Tambahkan tabel & pencatatan `audit_log` untuk aksi admin & data finansial | Direkomendasikan |
| 7 | Backup terjadwal otomatis (GitHub Actions) | Wajib |
| 8 | Rotasi anon key & connection string lama setelah migrasi | Wajib |
| 9 | Validasi input Zod di klien **dan** `CHECK` constraint di database (perbaiki bug B2 — total nota FLAT tidak boleh 0) | Wajib |
| 10 | Batasi CORS Supabase ke domain produksi saja | Direkomendasikan |
| 11 | CAPTCHA (Cloudflare Turnstile, gratis) di form login | Opsional |
| 12 | Sentry / error monitoring | Opsional |
| 13 | Hapus dependency tak terpakai (`@google/genai`, `express`, `ws`) + jadwalkan `npm audit` di CI | Direkomendasikan |
| 14 | Kebijakan data pribadi internal untuk data gaji/karyawan sesuai semangat UU PDP (No. 27/2022): batasi akses hanya admin, sediakan mekanisme hapus data karyawan nonaktif | Direkomendasikan |

---

## 9. Logika Bisnis Sensitif → Edge Function (Diadaptasi dari Daftar API Z.ai)

Daftar berikut awalnya dirancang Z.ai sebagai Next.js API routes; di sini diadaptasi menjadi Supabase Edge Functions agar sejalan dengan Opsi A (§5.3), sambil mempertahankan cakupan modul yang sama lengkapnya:

| Function | Tugas |
|---|---|
| `nota-create` | Validasi & simpan nota baru (cek total > 0 — perbaiki bug B2), hitung total server-side |
| `invoice-hitung` | Hitung invoice bulanan per pelanggan, generate nomor invoice (perbaiki bug B1 pada `toRoman()`) |
| `invoice-lock` | Kunci/buka invoice — verifikasi ulang role admin di server, bukan hanya di tombol UI |
| `gaji-hitung` | Kalkulasi gaji (persentase + insentif + lembur − potongan) — wajib unit test karena paling sensitif terhadap kesalahan hitung |
| `backup-export` / `backup-bersihkan` | Aksi destruktif "Backup & Bersihkan Semua Data" — verifikasi role admin di server sebelum eksekusi |
| `audit-log-write` | Dipanggil otomatis (trigger Postgres atau dari tiap Edge Function di atas) untuk mencatat siapa-apa-kapan |

Semua fungsi ini dipanggil dari klien lewat Supabase JS SDK (`supabase.functions.invoke(...)`) dengan JWT sesi yang sudah login — Edge Function memverifikasi ulang role dari tabel `profiles`, tidak pernah mempercayai parameter role yang dikirim klien.

---

## 10. Spesifikasi Fungsional per Modul (Feature Parity — Wajib 100%)

### 10.1 Transaksi
- Input Nota Baru: tanggal, pelanggan, jenis nota, kuantitas per linen (Reguler) atau berat cucian Kg (RS/Flat). **Validasi total > 0 wajib (perbaikan bug B2).**
- Riwayat Nota: pencarian by tanggal/pelanggan (urut tanggal terlama→terbaru, termasuk saat pencarian), detail item per nota, admin bisa hapus/edit nota.

### 10.2 Tagihan
- Hitung Invoice Tagihan Bulanan per pelanggan per periode. **Perbaiki bug penomoran Romawi (B1).**
- Kunci (lock) invoice; status bayar (lunas/belum).
- Cetak: Linen Room, Invoice, Kuitansi via `@react-pdf/renderer` (ganti `window.print()` popup agar hasil konsisten & bisa diarsipkan ke Supabase Storage); Download Linen Room & Excel.

### 10.3 Keuangan
- Dashboard: Penjualan Bersih, Total HPP, Biaya Admin & Umum, Laba Bersih, Piutang Usaha, Utang Usaha, Kas/Bank, Modal Bersih.
- Catat & filter pengeluaran per kategori (Gas, Air, Listrik 1/2, Chemical, BBM, Plastik, PPh Ps 23, Gaji Borongan/Tetap, Makan, Perawatan Mesin, Iuran Sampah/RT, Lain-lain).
- Laporan Keuangan (laba rugi & neraca) dengan opsi cetak/download PDF.
- Manajemen Utang Usaha: nama, tenor, cicilan/bulan, sisa bulan & sisa total, status.

### 10.4 Master Data & Sistem
- Master Linen (CRUD).
- Master Jenis Nota (nama layanan, multiplier 1x–4x, berlaku Flat/Reguler/keduanya).
- Atur Linen per Jenis Nota.
- Daftar Pelanggan: nama instansi, kode invoice, tipe Hotel/RS, billing Reguler/Flat, flat rate/tarif per Kg, alamat, kota; daftar harga linen per pelanggan dengan urutan drag & drop; nomor invoice berikutnya per tahun (untuk migrasi dari sistem manual).
- Master Karyawan (nama, bagian, persentase komisi).
- Pengaturan Sistem: tarif internal hotel/Kg, ongkos/Kg untuk gaji, info rekening bank, nama direktur, nilai peralatan.
- Kop Surat: nama usaha, alamat, telepon, email, contact person, logo (upload ke Supabase Storage, bukan lagi IndexedDB lokal).
- Maintenance: bersihkan nota rusak/korup.
- Absensi Harian & Hitung Gaji (periode custom, insentif/lembur/potongan per karyawan).
- Backup & Restore: export/import JSON tetap ada sebagai portabilitas data milik pengguna, **ditambah** backup otomatis terjadwal (GitHub Actions).

---

## 11. Struktur Proyek (Folder Layout)

```
pelangi-laundry/
├── supabase/
│   ├── migrations/          # SQL version-controlled (lihat §7)
│   └── functions/           # Edge Functions (lihat §9)
│       ├── nota-create/
│       ├── invoice-hitung/
│       ├── invoice-lock/
│       ├── gaji-hitung/
│       └── backup-export/
├── src/
│   ├── pages/                # Transaksi, Tagihan, Keuangan, Sistem
│   ├── components/
│   │   ├── ui/                # komponen dasar (button, modal, table)
│   │   ├── transaksi/
│   │   ├── tagihan/
│   │   ├── keuangan/
│   │   └── master/
│   ├── services/              # wrapper Supabase query per domain
│   ├── hooks/                 # TanStack Query hooks
│   ├── types/                 # Supabase generated types + domain types
│   ├── lib/
│   │   ├── supabaseClient.ts  # hanya anon key (aman, dilindungi RLS)
│   │   └── validations/       # skema Zod
│   └── App.tsx
├── .github/workflows/         # CI/CD + backup terjadwal
├── .env.example
└── package.json
```

---

## 12. Rencana Migrasi Bertahap

### Fase 0 — Mitigasi Darurat (1–2 hari, sebelum apa pun di bawah)
1. Cek status RLS di dashboard Supabase. Jika belum aktif, aktifkan dengan kebijakan default **tolak semua** sementara.
2. Jika aplikasi harus tetap berjalan, aktifkan Supabase Auth lebih dulu (meski UI login belum diganti) dan wajibkan JWT valid di RLS sementara.
3. Cek log akses Supabase (jika tersedia) untuk indikasi akses mencurigakan sebelumnya.
4. Ganti password sementara `admin`/`user` ke sesuatu yang tidak trivial — **tambal sulam**, bukan solusi permanen.
5. Rencanakan rotasi anon key & connection string setelah arsitektur baru siap.

### Fase 1 — Fondasi (Minggu 1–2, ~25 jam)
| Task | Estimasi |
|---|---|
| Setup React + TS + Vite + Tailwind, struktur folder modular | 4 jam |
| Tulis migration SQL (skema existing + RLS + tabel baru `profiles`/`audit_log`) | 6 jam |
| Implementasi Supabase Auth + halaman login baru | 5 jam |
| Setup CI (lint, type-check, unit test dasar) | 3 jam |
| Rate limiting & CAPTCHA opsional di login | 2 jam |
| Shared components (toast, confirm dialog, loading) | 3 jam |
| Middleware role-guard route | 2 jam |

### Fase 2 — Modul Inti: Transaksi & Master Data (Minggu 3–4, ~40 jam)
| Task | Estimasi |
|---|---|
| Master Linen, Jenis Nota, Karyawan CRUD | 8 jam |
| Master Pelanggan CRUD + harga linen + drag & drop | 9 jam |
| Input Nota Hotel & RS + validasi total > 0 (fix B2) | 8 jam |
| Riwayat Nota + filter + edit + hapus | 9 jam |
| Edge Function `nota-create` + unit test | 6 jam |

### Fase 3 — Tagihan & Keuangan (Minggu 5–6, ~38 jam)
| Task | Estimasi |
|---|---|
| Invoice bulanan (hitung, lock, status, nomor Romawi — fix B1) | 9 jam |
| Dashboard Keuangan (8 metrik) | 4 jam |
| Pengeluaran (CRUD, filter, 16 kategori) | 8 jam |
| Laporan Laba Rugi & Neraca | 7 jam |
| Utang Usaha | 3 jam |
| Absensi & Edge Function `gaji-hitung` + unit test | 7 jam |

### Fase 4 — Cetak, Backup & Polish (Minggu 7–8, ~45 jam)
| Task | Estimasi |
|---|---|
| Cetak Invoice/Kuitansi/Slip Gaji/Laporan via `@react-pdf/renderer` | 16 jam |
| Download Linen Room Excel | 3 jam |
| Export/Import/Backup JSON + backup terjadwal GitHub Actions | 8 jam |
| Pengaturan Sistem + Kop Surat + Logo (ke Supabase Storage) | 5 jam |
| Responsive polish & cross-browser testing | 4 jam |
| Perbaikan bug B3 (hilangkan localStorage manual, pindah ke TanStack Query) | 4 jam |
| Buffer/polish tambahan | 5 jam |

### Fase 5 — Migrasi Data, Cutover & Audit Keamanan (Minggu 9)
- [ ] Jalankan migration di project Supabase yang sama (atau project kedua untuk staging dulu — masih Rp 0).
- [ ] UAT paralel: staf mencoba aplikasi baru berdampingan dengan yang lama.
- [ ] Semua staf punya akun individual & bisa login.
- [ ] RLS teruji untuk kedua peran, termasuk uji eksplisit "user tidak bisa akses data gaji".
- [ ] Backup otomatis berjalan minimal 1× sukses.
- [ ] Rotasi anon key & connection string lama.
- [ ] DNS/domain diarahkan ke Cloudflare Pages.
- [ ] Nonaktifkan (jangan hapus) kode lama, arsipkan di branch terpisah.

**Total estimasi: ~148 jam kerja aktif dalam 9 minggu** (di luar Fase 0 darurat) — cocok untuk 1 developer paruh-waktu atau dipercepat dengan 2 orang.

---

## 13. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| Performa | Halaman utama < 2 detik di 4G biasa; query riwayat nota dipaginasi (hindari `select("*")` tanpa batas) |
| Ketersediaan | Tidak ada SLA formal di free tier — dapat diterima untuk skala 1 laundry; akses harian rutin mencegah Supabase project "pause" otomatis setelah 7 hari idle |
| Kompatibilitas | Chrome/Edge/Safari terbaru, desktop & tablet (staf sering pakai tablet di kasir) |
| Aksesibilitas | Pertahankan/lanjutkan kontras warna AA yang sudah ada di CSS lama |
| Pemeliharaan | Kode modular per domain, TypeScript, minimal 1 unit test per fungsi kalkulasi keuangan/gaji |
| Portabilitas data | Export/import JSON tetap dipertahankan sebagai hak milik data pengguna |
| Offline (opsional) | PWA dengan penyimpanan lokal sementara untuk input nota saat koneksi terputus singkat — bukan wajib fase ini |

---

## 14. Risiko & Mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Kebocoran data selama masa transisi (app lama masih tanpa RLS) | Tinggi jika tidak segera ditangani | Tinggi | Eksekusi Fase 0 (§12) secepatnya, terpisah dari jadwal rewrite penuh |
| Feature regression saat rewrite | Sedang | Tinggi | Checklist feature-parity §10, UAT paralel per fase |
| Kesalahan migrasi data historis | Sedang | Tinggi (data keuangan) | Uji di project Supabase kedua (gratis) dulu; backup manual sebelum migrasi |
| Resistensi staf terhadap UI baru | Sedang | Sedang | Pertahankan token warna & alur kerja semirip mungkin, masa UAT paralel |
| Melebihi batas free tier di masa depan | Rendah (1–2 tahun ke depan) | Rendah–Sedang | Pemantauan bulanan dashboard Supabase/Cloudflare |
| Vercel Hobby dianggap melanggar ToS untuk pemakaian komersial | Rendah ditegakkan untuk skala kecil, tapi **kebijakannya nyata dan terverifikasi** | Rendah–Sedang (deployment bisa dinonaktifkan sepihak) | Pindah ke Cloudflare Pages (§5.4) |
| Bug keamanan baru dari sistem auth custom (jika memilih Opsi B) | Sedang | Tinggi | Jika tetap pilih Opsi B, wajib security review eksternal untuk modul JWT/bcrypt sebelum go-live |
| Scope creep | Sedang | Sedang | Disiplin ikuti PRD ini sebagai acuan, fitur baru masuk roadmap §16 |

---

## 15. Kriteria Penerimaan (Acceptance Criteria)

### 15.1 Keamanan (Wajib)
- [ ] `grep -r "SUPABASE_SERVICE_ROLE_KEY" src/` → **0 hasil** (jika pakai Opsi A, key ini bahkan tidak boleh ada di frontend sama sekali)
- [ ] RLS aktif di seluruh tabel (verifikasi via `select * from pg_policies`)
- [ ] Password tersimpan ter-hash (bcrypt via Supabase Auth), bukan plaintext
- [ ] Login gagal 5× → rate limited / lockout sementara
- [ ] Tidak ada kredensial hardcoded tersisa di kode (`grep -ri "admin.*admin\|password.*=.*['\"]" src/`)

### 15.2 Feature Parity (Wajib)
- [ ] 100% fitur v25 berfungsi identik (lihat checklist §10)
- [ ] Bug B1 (`toRoman`), B2 (nota FLAT total 0), B3 (localStorage stale) — semua diperbaiki dan ada unit test regresi

### 15.3 Biaya (Wajib)
- [ ] Total biaya bulanan: **Rp 0**
- [ ] Hosting: Cloudflare Pages (bukan Vercel Hobby untuk produksi)
- [ ] Supabase: Free tier

### 15.4 Performa
- [ ] Lighthouse Performance > 80
- [ ] Lighthouse Accessibility > 80

---

## 16. Roadmap Setelah Fase 1 (Di Luar Ruang Lingkup PRD Ini)
- Multi-cabang (akan mendorong ke Supabase Pro jika storage/MAU membesar).
- Integrasi pembayaran (QRIS) untuk pelunasan invoice langsung dari sistem.
- Notifikasi WhatsApp/email otomatis untuk invoice jatuh tempo.
- Dashboard analitik lebih mendalam (tren pemakaian linen, top pelanggan).
- Aplikasi mobile ringan (PWA installable) untuk staf lapangan.

---

## 17. Lampiran

### 17.1 Daftar Tabel Database (Observasi Kode)
`nota`, `biaya`, `gaji`, `absensi`, `karyawan`, `pelanggan`, `master_linen`, `harga_pelanggan`, `linen_pelanggan`, `jenis_nota`, `pengaturan`, `kop`, `invoice_numbers`, `invoice_counter`, `payment_status`, `locks`, `utang`, `backup_history` — ditambah `profiles` dan `audit_log` (baru).

> Kolom detail tiap tabel existing perlu dikonfirmasi langsung dari dashboard Supabase (tidak ada file skema di repo saat ini) sebagai langkah pertama Fase 1.

### 17.2 Dependency yang Direkomendasikan Dihapus
`@google/genai`, `express`, `ws`, dan file boilerplate AI Studio yang tidak dipakai (`src/App.tsx` jika kosong, `metadata.json` bagian Gemini).

### 17.3 Glossary
| Istilah | Definisi |
|---|---|
| Nota | Bukti transaksi laundry per order |
| Invoice | Tagihan bulanan ke pelanggan |
| Kuitansi | Bukti pembayaran |
| Flat Rate | Tarif tetap per bulan (hotel) |
| Reguler | Tarif per item/pcs (hotel) |
| RLS | Row Level Security (kontrol akses baris di PostgreSQL) |
| Service Role Key | Kunci Supabase yang bypass RLS — hanya boleh dipakai di server, tidak pernah di klien |
| Edge Function | Fungsi server ringan (Deno) yang berjalan di infrastruktur Supabase |

### 17.4 Operasional Pasca-Peluncuran
- **Bulanan**: cek dashboard usage Supabase (DB size, bandwidth, MAU) dan Cloudflare Pages.
- **Mingguan**: pastikan backup otomatis (GitHub Actions) sukses.
- **Saat staf keluar/masuk**: update akun & peran di tabel `profiles`, jangan lagi ganti password bersama.

---

*Dokumen ini disusun berdasarkan: (1) audit langsung terhadap struktur repo `calvinsyah/App-Pelangi-Laundy` dan isi `package.json`; (2) pemeriksaan langsung halaman pilot di `app-pelangi-laundy.vercel.app`; (3) verifikasi kebijakan terkini (2026) dari Vercel dan Cloudflare terkait penggunaan komersial di tier gratis; (4) sintesis dan perbandingan kritis terhadap dua PRD yang sudah ada (Claude v1.0 dan Z.ai v1.1). Detail konfigurasi RLS/Auth Supabase yang sebenarnya di dashboard tidak dapat diverifikasi dari luar kode klien — admin disarankan mengecek langsung dashboard Supabase sebagai langkah pertama Fase 0.*
