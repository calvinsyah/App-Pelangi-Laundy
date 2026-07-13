# Rencana Perbaikan — Tab Transaksi

> Sumber: hasil audit "cek dan analisa tab transaksi" (App Pelangi Laundry).
> Cakupan file: `src/pages/transaksi/InputNota.tsx`, `src/pages/transaksi/RiwayatNota.tsx`, `supabase/functions/nota-create/index.ts`.
> Dokumen ini adalah **sumber kebenaran tunggal** untuk pekerjaan perbaikan tab Transaksi. Agent WAJIB membaca dokumen ini sampai tuntas sebelum mengubah satu baris kode pun.

---

## HIERARKI DOKUMEN & ATURAN PUSH

> **Aturan hierarki:** Dokumen ini (`tab review/PERBAIKAN_TAB_TRANSAKSI.md`) adalah **sumber kebenaran dan aturan** untuk pekerjaan tab ini. File `.md` apa pun di luar folder `tab review/` — termasuk `AGENTS.md`, `HANDOFF.md`, `CODE_EFFICIENCY.md`, `MAINTENANCE_PLAN.md`, `prd_final.md`, `MONITORING_GUIDE.md`, `SECURITY_FIX.md`, `README.md`, dan file `.md` lainnya di root repo — hanya berfungsi sebagai **referensi/konteks**, BUKAN sebagai sumber aturan kerja. Kalau ada konflik antara isi dokumen ini dengan file `.md` di luar, **dokumen ini yang berlaku**.

> **Aturan push:** Agent TIDAK BOLEH melakukan `git push` dalam kondisi apa pun. Setelah semua commit lokal siap, agent WAJIB berhenti dan menunggu konfirmasi eksplisit dari saya sebelum push. **Saya yang menentukan kapan push dilakukan.**

---

## 0. KEPUTUSAN YANG SUDAH DIAMBIL — JANGAN DIUBAH

**Temuan "Non-admin bisa UPDATE/DELETE nota siapapun" (RLS `nota_update_all_login` / `nota_delete_all_login` di migration `011_allow_user_edit_nota.sql`) BUKAN BUG. Ini keputusan desain yang disengaja oleh pemilik produk.**

Aturan mutlak untuk agent:
- JANGAN membuat migration baru yang mengubah, membatasi, drop, atau menimpa policy `nota_update_all_login` dan `nota_delete_all_login`.
- JANGAN menambahkan pengecekan `isAdmin` di frontend (`RiwayatNota.tsx`) untuk menyembunyikan/menonaktifkan tombol Edit atau Hapus nota berdasarkan role.
- JANGAN mengusulkan "mengembalikan ke admin-only" sebagai bagian dari task manapun di bawah, walau tergoda karena ini terkait keamanan. Kalau menurut agent ada dampak dari keputusan ini ke task lain, CATAT sebagai observasi di laporan akhir, JANGAN diperbaiki tanpa diminta eksplisit.
- Kolom `isAdmin` yang saat ini di-destructure tapi tidak dipakai di `RiwayatNota.tsx` (baris 26) boleh dihapus HANYA jika task terkait (§2, dead code) secara eksplisit menyebutkannya. Jangan hapus sebagai "bonus" di task lain.

---

## ATURAN KERJA (WAJIB DIIKUTI SELURUHNYA)

1. **Satu task, satu waktu.** Kerjakan sesuai urutan nomor di bawah (1 → 2 → ... ). Jangan mengerjakan dua task sekaligus dalam satu batch, walau terlihat berhubungan. Setelah satu task selesai, STOP dan tunggu konfirmasi saya sebelum lanjut ke task berikutnya.

2. **Gate 0 — deklarasi rencana sebelum eksekusi.** Sebelum mengubah kode apa pun untuk sebuah task, tampilkan dulu ke saya:
   - File apa saja yang akan disentuh.
   - Ringkasan perubahan (bukan full diff dulu, cukup poin-poin).
   - Apakah task ini melibatkan **operasi tulis ke database produksi** (migration SQL, backfill data, dsb). Jika ya, nyatakan eksplisit: "Task ini melibatkan write ke database" dan sebutkan tabel yang terdampak.
   - Tunggu saya bilang "lanjut" / "approved" sebelum mulai edit file.

3. **Migration SQL = tampilkan diff dulu, tidak langsung apply.** Untuk task yang butuh perubahan skema (mis. unique constraint di §6), buat file migration BARU (jangan edit migration lama), dengan penomoran lanjutan dari file terakhir di `supabase/migrations/`. Tampilkan isi migration untuk saya review. JANGAN menjalankan migration ke database (via CLI/dashboard/MCP). Kalau ada task yang butuh edge function baru atau perubahan edge function yang sudah ada, buat file function BARU dan tampilkan untuk saya review — **JANGAN men-deploy edge function ke Supabase produksi** secara otomatis. Saya yang apply migration dan deploy edge function secara manual setelah review.

4. **Tidak ada perubahan di luar file yang disebutkan di task.** Kalau agent menemukan bug lain di luar scope task yang sedang dikerjakan (termasuk isu-isu lain dari tab Transaksi yang belum jadi giliran, atau isu di tab lain seperti Tagihan/Keuangan/Sistem), JANGAN diperbaiki. Catat di laporan akhir task sebagai "Ditemukan tapi di luar scope" dengan lokasi file+baris, biar saya bikin task terpisah kalau perlu.

5. **Jangan menyentuh business logic yang tidak disebutkan.** Contoh: kalau task-nya soal `status_bayar` (§3), jangan ikut mengubah cara `total` dihitung. Perbaikan harus seminimal mungkin (surgical), bukan refactor besar-besaran, kecuali task secara eksplisit meminta refactor (lihat §9).

6. **Lint & build sebelum commit.** Setelah perubahan kode (non-SQL), jalankan `npm run lint` dan pastikan tidak ada error baru. Kalau ada error yang tidak berhubungan dengan perubahan agent, laporkan tapi jangan ikut memperbaikinya kecuali diminta.

7. **Commit terpisah per task, pesan dalam Bahasa Indonesia**, dengan format:
   `fix(transaksi): temuan #<nomor> - <ringkasan singkat>`
   Contoh: `fix(transaksi): temuan #2 - validasi ulang total di server saat edit nota`
   Jangan menggabungkan beberapa temuan ke satu commit.

8. **JANGAN push otomatis.** Setelah commit lokal siap, berhenti dan tunggu saya review sebelum `git push`.

9. **Kalau ambigu, ragu, atau menemukan sesuatu yang tidak sesuai dengan yang dijelaskan di sini** (misalnya ternyata ada dependensi lain yang tidak terduga, atau perbaikan yang diminta ternyata butuh mengubah tabel yang dipakai fitur lain), **STOP dan tanyakan ke saya. Jangan menebak, jangan mengambil keputusan desain sendiri.**

10. **Setiap task WAJIB diakhiri dengan laporan berisi:**
    - File yang diubah + ringkasan perubahan per file.
    - Hasil `npm run lint`.
    - Hash & pesan commit lokal (belum di-push).
    - Apakah ada migration SQL yang menunggu di-apply manual oleh saya, beserta isi filenya.
    - Temuan di luar scope (kalau ada), sesuai aturan §4.

---

## DAFTAR TASK (urut prioritas: Kritis → Tinggi → Sedang → Rendah)

### Task 1 — [KRITIS] Validasi & hitung ulang `total` di server saat edit nota

**Masalah:** Saat create, `total` dihitung ulang & divalidasi server-side lewat edge function `nota-create`. Saat edit, `InputNota.tsx` menulis langsung `supabase.from('nota').update(notaData)` dari client — `total` dipercaya mentah-mentah dari browser, tidak divalidasi ulang di server.

**Target perbaikan:**
- Buat jalur update yang juga melewati validasi/hitung-ulang server-side — opsi yang disarankan: perluas edge function `nota-create` (atau buat edge function baru `nota-update`) yang menerima `nota_id` + payload, menghitung ulang `total` dari `berat_kg`/`items`/tarif pelanggan di server (logika yang sama seperti create), lalu baru melakukan `update`.
- `InputNota.tsx` pada cabang edit (baris area `handleSubmit` yang memanggil `.update()`) diubah untuk memanggil edge function tersebut, bukan `supabase.from('nota').update()` langsung.
- **Tidak mengubah RLS `nota_update_all_login`** (lihat §0) — siapa saja yang sudah bisa edit nota tetap bisa, tapi nilai `total` yang tersimpan sekarang divalidasi server, bukan dipercaya dari client.

**Batasan eksplisit:** Jangan ubah cabang create (`nota-create` yang sudah ada) kecuali sekadar merapikan agar bisa dipakai bersama (mis. ekstrak fungsi hitung total ke helper). Jangan ubah field lain (`status_bayar`, dsb) — itu task terpisah (§3).

**Acceptance criteria:**
- Mengubah `total` dari DevTools/network request langsung saat edit tidak lagi tersimpan; server yang menentukan nilai final berdasarkan `berat_kg`/`items` dan tarif pelanggan yang valid.
- Alur edit normal dari UI (tanpa manipulasi) tetap menghasilkan nilai `total` yang sama seperti sebelumnya untuk kasus-kasus yang sudah ada (regression check manual: edit satu nota KILOAN dan satu nota dengan items, bandingkan total sebelum/sesudah perubahan kode).

---

### Task 2 — [KRITIS] Batasi query Riwayat Nota agar tidak unbounded

**Masalah:** `fetchNota()` di `RiwayatNota.tsx` menarik seluruh tabel `nota` (join `pelanggan`+`jenis_nota`) tanpa `.limit()`/pagination saat tidak ada filter bulan/pelanggan.

**Target perbaikan:**
- Tambahkan default filter bulan ke **bulan berjalan** saat halaman pertama kali dibuka (state awal `filterBulan` tidak lagi kosong, isi dengan bulan saat ini — pola yang sama seperti `Pengeluaran.tsx` yang sudah pakai `getFirstDayOfMonthString()`).
- Tambahkan `.limit()` yang wajar (misal 500) sebagai pengaman tambahan di query, bahkan ketika filter bulan aktif.
- Search nama pelanggan tetap boleh client-side seperti sekarang (itu bukan bagian task ini — lihat §8 kalau mau diperbaiki jadi server-side, task terpisah), tapi harus bekerja di atas data yang sudah dibatasi bulan, bukan seluruh tabel.

**Batasan eksplisit:** Jangan ubah struktur kolom tabel, jangan ubah `InputNota.tsx`. Jangan implementasikan pagination penuh (infinite scroll/next-prev) kecuali diminta — cukup default-filter + limit pengaman.

**Acceptance criteria:**
- Buka halaman Riwayat Nota tanpa memilih filter apa pun → hanya menarik data bulan berjalan, bukan seluruh histori.
- Ada indikator/label yang jelas di UI bahwa filter bulan default sedang aktif (supaya pengguna non-teknis tidak bingung kenapa transaksi lama tidak muncul).

---

### Task 3 — [TINGGI] Perbaiki `status_bayar` yang selalu ter-reset ke 'Belum'

**Masalah:** `notaData` di `InputNota.tsx` (dipakai untuk insert maupun update) selalu menetapkan `status_bayar: 'Belum'` (hardcoded), dengan komentar yang mengklaim mencegah perubahan status kalau sudah 'Lunas' — padahal logika itu tidak pernah diimplementasikan.

**Sebelum eksekusi, agent WAJIB konfirmasi dulu ke saya:** apakah kolom `status_bayar` pada tabel `nota` ini masih dipakai di alur bisnis mana pun (hasil audit sebelumnya menunjukkan tidak ada tempat lain yang membaca kolom ini — status pembayaran sungguhan tampaknya dilacak via tabel `payment_status` terpisah). **Jangan berasumsi sendiri** — tanyakan, karena keputusan perbaikannya beda:
  - Kalau memang dead/legacy column → task-nya menghapus penulisan `status_bayar` dari `notaData` (dan hapus komentar menyesatkan tersebut), bukan mencoba "memperbaiki" logika proteksinya.
  - Kalau ternyata masih dipakai di suatu tempat yang belum ketahuan → task-nya baru benar-benar mengimplementasikan proteksi "jangan reset ke Belum kalau sudah Lunas" saat edit.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** `status_bayar` adalah **dead column** — tidak dipakai di alur bisnis mana pun. Target perbaikan yang berlaku: **hapus penulisan `status_bayar: 'Belum'` dari `notaData`** dan **hapus komentar menyesatkan** di sekitarnya. JANGAN mengimplementasikan proteksi "jangan reset ke Belum". Agent tidak perlu konfirmasi lagi untuk poin ini.

**Batasan eksplisit:** Jangan sentuh field lain di `notaData`. Jangan ubah tabel `payment_status`.

**Acceptance criteria:** Penulisan `status_bayar` (dan komentar terkait) tidak ada lagi di `notaData`. Field lain di `notaData` tidak berubah. `npm run lint` tidak error.

---

### Task 4 — [TINGGI] Samakan urutan fallback harga item (`harga` vs `basePrice`)

**Masalah:** `calculateTotal()` di `RiwayatNota.tsx` pakai `item.harga || item.basePrice`, tapi modal detail (render breakdown item) di file yang sama pakai `item.basePrice || item.harga` — urutan terbalik, bisa membuat subtotal per-item di popup detail tidak sama dengan total di baris tabel.

**Target perbaikan:**
- Samakan urutan fallback di kedua tempat menjadi `item.harga || item.basePrice` (ikuti pola yang sudah dipakai di `Tagihan.tsx`/`Kuitansi.tsx` supaya konsisten satu aplikasi).
- Cari apakah ada tempat lain di `RiwayatNota.tsx` yang menghitung harga item dengan urutan berbeda, dan samakan juga — tapi HANYA di dalam file ini (jangan ubah `Tagihan.tsx`/`Kuitansi.tsx`, itu di luar scope tab Transaksi).

**Acceptance criteria:** Buka detail nota yang punya item dengan kedua field (`harga` dan `basePrice`) terisi berbeda → subtotal di popup detail harus sama dengan yang dipakai di total baris/tfoot.

---

### Task 5 — [TINGGI] Cegah tabrakan `nota_id`

**Masalah:** `nota_id` dibuat di client sebagai `tanggal + random 4 digit (1000-9999)` tanpa cek collision/retry.

**Sebelum eksekusi, agent WAJIB mengecek dulu (dan laporkan ke saya sebelum lanjut):** apakah ada UNIQUE constraint di kolom ini di database saat ini (cek `information_schema` atau minta saya konfirmasi lewat Supabase dashboard — jangan asumsikan dari migration files saja karena tabel `nota` dasarnya dibuat di luar folder migrations).

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** **Tidak ada UNIQUE constraint** pada `nota_id` — hanya primary key yang aktif. Agent tidak perlu mengecek lagi. Langsung siapkan migration SQL untuk menambahkan UNIQUE constraint (tampilkan dulu, jangan apply).

**Target perbaikan:**
- Siapkan migration SQL untuk menambahkan UNIQUE constraint pada `nota_id` (ikuti aturan §"ATURAN KERJA" no. 3, jangan langsung apply).
- Pindahkan generate `nota_id` ke edge function `nota-create` (server-side), dengan retry (maksimal 3x percobaan dengan angka random baru) kalau insert gagal karena duplikat, sebelum menyerah dan mengembalikan error ke client.

**Batasan eksplisit:** Jangan ubah format `nota_id` (tetap `tanggal-random4digit`), cukup pindahkan ke server + tambah retry + (kalau perlu) constraint.

**Acceptance criteria:** Simulasi generate nota_id yang collide (bisa dites manual dengan insert row ber-ID sama sebelum submit) → sistem retry otomatis dan tetap berhasil menyimpan nota dengan ID baru, tanpa error yang sampai ke pengguna.

---

### Task 6 — [SEDANG] Konfirmasi ulang untuk delete nota (tanpa soft-delete)

**Catatan:** Berdasarkan diskusi awal, soft-delete penuh (kolom `deleted_at`, dsb) adalah perubahan skema besar — JANGAN dikerjakan di task ini kecuali saya minta eksplisit terpisah. Task ini hanya memperkuat konfirmasi di sisi UI.

**Target perbaikan:**
- Perkuat teks `confirm()` saat hapus nota di `RiwayatNota.tsx` agar eksplisit menyebutkan bahwa aksi ini permanen dan tidak bisa dibatalkan (samakan gaya dengan konfirmasi di `Backup.tsx` untuk aksi hapus permanen).

**Acceptance criteria:** Klik Hapus nota → dialog konfirmasi menyebutkan eksplisit kata "permanen"/"tidak bisa dibatalkan".

---

### Task 7 — [SEDANG] Urutan default Riwayat Nota: terbaru dulu

**Target perbaikan:** Ubah `order('tanggal', { ascending: true })` menjadi `ascending: false` di `fetchNota()`.

**Batasan eksplisit:** Task ini kecil dan berdiri sendiri — jangan digabung dengan Task 2 walau sama-sama menyentuh `fetchNota()`. Tetap dua commit terpisah.

**Acceptance criteria:** Buka Riwayat Nota → transaksi terbaru muncul di baris paling atas.

---

### Task 8 — [RENDAH] Perbaiki `colSpan` yang salah

**Target perbaikan:** Ubah `colSpan={7}` pada baris loading/empty state di `RiwayatNota.tsx` menjadi `colSpan={6}` (sesuai jumlah kolom header aktual).

**Acceptance criteria:** Saat data kosong/loading, baris pesan melebar penuh sejajar dengan lebar tabel (bukan menyisakan celah kolom kosong).

---

## TIDAK TERMASUK DALAM DOKUMEN INI (sengaja tidak dijadikan task)

- **Duplikasi logika `calculateTotal`/`checkIsNotaFlat` lintas file** (`RiwayatNota.tsx`, `Tagihan.tsx`, `Kuitansi.tsx`) — perbaikannya (ekstrak ke util bersama) menyentuh file di luar tab Transaksi, perlu dokumen rencana terpisah yang mencakup tab Tagihan juga.
- **Pencarian nama pelanggan yang masih client-side saja** — disinggung di Task 2 tapi tidak diperbaiki jadi server-side query di dokumen ini; buat task terpisah kalau diperlukan.
- **Isu RLS "Non-admin bisa UPDATE/DELETE nota siapapun"** — lihat §0, ini keputusan final, bukan bug.

Kalau nanti agent atau saya ingin menambah task baru untuk tab Transaksi, tambahkan sebagai task baru di dokumen ini (jangan bikin dokumen `.md` terpisah untuk tab yang sama), supaya tetap satu sumber kebenaran.
