# Rencana Perbaikan — Tab Tagihan

> Sumber: hasil audit "cek dan analisa tab tagihan" (App Pelangi Laundry).
> Cakupan file: `src/pages/tagihan/Tagihan.tsx`, `src/pages/tagihan/Kuitansi.tsx`, dan tabel/migration terkait (`locks`, `payment_status`, `invoice_numbers`, `invoice_counter`).
> Dokumen ini adalah **sumber kebenaran tunggal** untuk pekerjaan perbaikan tab Tagihan. Agent WAJIB membaca dokumen ini sampai tuntas sebelum mengubah satu baris kode atau satu migration pun.
>
> **Lihat juga:** `PERBAIKAN_TAB_TRANSAKSI.md` — kalau dokumen itu ada di repo dan belum selesai dikerjakan, JANGAN mengerjakan dokumen ini secara bersamaan. Selesaikan satu dokumen rencana penuh dulu (atau minta konfirmasi eksplisit dari saya kalau memang ingin paralel).

---

## HIERARKI DOKUMEN & ATURAN PUSH

> **Aturan hierarki:** Dokumen ini (`tab review/PERBAIKAN_TAB_TAGIHAN.md`) adalah **sumber kebenaran dan aturan** untuk pekerjaan tab ini. File `.md` apa pun di luar folder `tab review/` — termasuk `AGENTS.md`, `HANDOFF.md`, `CODE_EFFICIENCY.md`, `MAINTENANCE_PLAN.md`, `prd_final.md`, `MONITORING_GUIDE.md`, `SECURITY_FIX.md`, `README.md`, dan file `.md` lainnya di root repo — hanya berfungsi sebagai **referensi/konteks**, BUKAN sebagai sumber aturan kerja. Kalau ada konflik antara isi dokumen ini dengan file `.md` di luar, **dokumen ini yang berlaku**.

> **Aturan push:** Agent TIDAK BOLEH melakukan `git push` dalam kondisi apa pun. Setelah semua commit lokal siap, agent WAJIB berhenti dan menunggu konfirmasi eksplisit dari saya sebelum push. **Saya yang menentukan kapan push dilakukan.**

---

## 0. PERINGATAN KHUSUS — DUA TASK DI DOKUMEN INI BERSIFAT SENSITIF SECARA DATA

Task 1 dan Task 2 di bawah bukan sekadar perbaikan bug kode — keduanya butuh **migrasi skema + migrasi data** pada tabel yang sudah berisi data produksi nyata (`locks`, `payment_status`, `invoice_numbers`, `invoice_counter`). Kesalahan di sini bisa membuat status lunas/lock invoice pelanggan hilang atau nomor invoice yang sudah tercetak berubah maknanya secara retroaktif. Untuk KEDUA task ini, aturan tambahan berikut berlaku di atas "ATURAN KERJA" umum:

- Agent WAJIB membuat **skrip verifikasi read-only dulu** (query `SELECT`, bukan `UPDATE`/`INSERT`) untuk melaporkan ke saya: berapa banyak baris `locks`/`payment_status` yang ada saat ini, dan berapa yang key-nya **tidak** bisa dipetakan dengan pasti ke satu `pelanggan_id` (misal karena nama pelanggan sudah berubah, atau ada dua pelanggan dengan nama identik). Laporkan daftar key yang ambigu ini secara eksplisit sebelum lanjut.
- Migrasi data (backfill) HARUS bersifat **non-destruktif**: kolom/format lama tidak boleh dihapus di migration yang sama dengan penambahan kolom/format baru. Hapus kolom lama paling cepat di migration terpisah, di sesi kerja terpisah, setelah saya konfirmasi hasil backfill sudah benar.
- Setelah migration backfill dibuat (bukan di-apply — lihat "ATURAN KERJA" no. 3), agent WAJIB menyertakan **query verifikasi** yang bisa saya jalankan manual di Supabase dashboard untuk mengecek hasil backfill sebelum saya apply ke produksi.

---

## ATURAN KERJA (WAJIB DIIKUTI SELURUHNYA)

1. **Satu task, satu waktu.** Kerjakan sesuai urutan nomor di bawah. Jangan mengerjakan dua task sekaligus. Setelah satu task selesai, STOP dan tunggu konfirmasi saya sebelum lanjut ke task berikutnya.

2. **Gate 0 — deklarasi rencana sebelum eksekusi.** Sebelum mengubah kode/membuat migration apa pun untuk sebuah task, tampilkan dulu ke saya:
   - File apa saja yang akan disentuh (termasuk kalau menyentuh file di tab lain — lihat aturan §4 di bawah).
   - Ringkasan perubahan.
   - Apakah task ini melibatkan **operasi tulis/migrasi ke database produksi**, dan tabel apa saja yang terdampak.
   - Untuk Task 1 & 2: hasil skrip verifikasi read-only (lihat §0) HARUS ditampilkan di Gate 0 ini, sebelum saya memutuskan lanjut atau tidak.
   - Tunggu saya bilang "lanjut" / "approved" sebelum mulai edit file atau membuat migration.

3. **Migration SQL = tampilkan diff dulu, tidak langsung apply.** Buat file migration BARU (jangan edit migration lama), penomoran lanjutan dari file terakhir di `supabase/migrations/`. Tampilkan isi migration untuk saya review. JANGAN menjalankan migration ke database (via CLI/dashboard/MCP), dan untuk Task 1 & 2 saya akan apply secara bertahap (backfill dulu, verifikasi, baru migration berikutnya) — jangan asumsikan saya apply semua migration task tersebut sekaligus. Kalau ada task yang butuh edge function baru atau perubahan edge function yang sudah ada, buat file function BARU dan tampilkan untuk saya review — **JANGAN men-deploy edge function ke Supabase produksi** secara otomatis. Saya yang apply migration dan deploy edge function secara manual setelah review.

4. **Task di dokumen ini fokus ke tab Tagihan.** Task 1 (lihat detail di bawah) punya keterkaitan langsung dengan RPC `get_dashboard_metrics` yang dipakai tab Keuangan/Dashboard, karena bug yang sama ada di sana. Perbaikan RPC tersebut **diizinkan secara eksplisit** sebagai bagian dari Task 1 (supaya tidak ada dua sumber kebenaran yang beda untuk skema key yang sama), TAPI JANGAN memperbaiki temuan lain apa pun di tab Keuangan/Dashboard di luar bagian RPC yang persis berkaitan dengan skema key ini. Kalau ragu apakah sesuatu termasuk "berkaitan langsung", tanyakan dulu — jangan menebak.

5. **Tidak ada perubahan di luar file/tabel yang disebutkan di task.** Temuan lain yang ditemukan saat mengerjakan (termasuk isu di tab Transaksi, Keuangan, atau Sistem) dicatat sebagai "Ditemukan tapi di luar scope" di laporan akhir, bukan diperbaiki langsung.

6. **Jangan melakukan refactor besar di luar yang diminta task.** Perbaikan harus seminimal & seaman mungkin untuk mencapai acceptance criteria.

7. **Lint & build sebelum commit.** Jalankan `npm run lint` untuk perubahan non-SQL, pastikan tidak ada error baru.

8. **Commit terpisah per task, pesan dalam Bahasa Indonesia**, format:
   `fix(tagihan): temuan #<nomor> - <ringkasan singkat>`
   Untuk Task 1 & 2 yang punya beberapa langkah (migration backfill, lalu migration cleanup, lalu perubahan kode), buat commit terpisah per langkah, bukan satu commit besar — beri suffix contoh `(1/3)`, `(2/3)`, `(3/3)` di pesan commit supaya urutannya jelas.

9. **JANGAN push otomatis.** Setelah commit lokal siap, berhenti dan tunggu saya review sebelum `git push`.

10. **Kalau ambigu, ragu, atau menemukan sesuatu yang tidak terduga** (terutama untuk Task 1 & 2 yang menyangkut data produksi), **STOP dan tanyakan ke saya. Jangan menebak, jangan mengambil keputusan desain sendiri, jangan mengasumsikan "yang paling masuk akal" tanpa konfirmasi — terutama soal bagaimana menangani key yang ambigu/tidak bisa dipetakan.**

11. **Setiap task WAJIB diakhiri dengan laporan berisi:**
    - File yang diubah + ringkasan perubahan per file.
    - Hasil `npm run lint`.
    - Hash & pesan commit lokal (belum di-push).
    - Isi migration SQL yang menunggu di-apply manual oleh saya (kalau ada), plus query verifikasi terkait.
    - Temuan di luar scope (kalau ada).

---

## DAFTAR TASK (urut prioritas: Kritis → Rendah)

### Task 1 — [KRITIS] Ganti kunci `locks`/`payment_status` dari nama pelanggan menjadi `pelanggan_id`

**Masalah:** `lockKey`/kunci `payment_status` dibentuk sebagai `${nama_pelanggan}_${bulan}` di `Tagihan.tsx`, dan pola identik dipakai di RPC `get_dashboard_metrics` (migration `20260713000001_update_dashboard_rpc_for_laporan.sql`, baris yang men-join ke `payment_status` pakai `nama`). Rename nama pelanggan atau nama kembar menyebabkan status lock/lunas historis salah kaprah atau tertimpa pelanggan lain.

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0, jangan diasumsikan):**
- Untuk key lama yang ambigu (hasil skrip verifikasi §0) — apakah didiamkan dulu (biarkan `pelanggan_id` NULL, saya perbaiki manual satu-satu), atau ada aturan pencocokan lain yang saya mau pakai?
- Format `key` text (`nama_bulan`) apakah tetap dipertahankan sebagai kolom warisan (untuk kompatibilitas mundur/audit) atau boleh digantikan penuh oleh kombinasi `pelanggan_id + bulan`?

> ✅ **KEPUTUSAN SUDAH DIAMBIL:**
> - Key ambigu (0 atau >1 kandidat) → **biarkan `pelanggan_id` NULL**. Agent cukup melaporkan daftar key ambigu di laporan, tidak perlu aturan pencocokan lain.
> - Kolom `key` text lama → **dipertahankan sebagai kolom warisan** (kompatibilitas mundur/audit). JANGAN hapus di task ini.

**Target perbaikan (langkah berurutan, tiap langkah = Gate 0 + commit terpisah):**
1. **Migration A (backfill, additive-only):** tambah kolom `pelanggan_id` (nullable, FK ke `pelanggan.id`) di tabel `locks` dan `payment_status`. Isi backfill dengan mencocokkan bagian nama di `key` terhadap `pelanggan.nama` saat ini. Baris yang tidak match pasti (0 atau >1 kandidat) dibiarkan `pelanggan_id NULL` dan didaftar di laporan.
2. **Kode aplikasi:** `Tagihan.tsx` dan `Kuitansi.tsx` diubah supaya baca/tulis `locks`/`payment_status` menggunakan `pelanggan_id` (dari `p.id`, bukan `p.nama`) + `bulan`, bukan lagi menyusun string `key` dari nama. Dropdown pelanggan (`selectedPelanggan`) tetap boleh pakai `nama` untuk keperluan tampilan/filter nota, tapi **operasi lock/payment harus lewat id**, bukan nama — kalau perlu, simpan `selectedPelangganId` terpisah dari `selectedPelanggan` (nama, untuk filter nota by nama seperti sekarang, di luar scope untuk diubah).
3. **RPC `get_dashboard_metrics`:** ubah join ke `payment_status` supaya pakai `pelanggan_id` juga (lihat §4 aturan kerja — ini satu-satunya bagian RPC yang boleh disentuh dari dokumen ini).
4. **Migration B (constraint, HANYA setelah saya konfirmasi backfill benar):** tambah `UNIQUE(pelanggan_id, bulan)` (WHERE `pelanggan_id IS NOT NULL`) di kedua tabel untuk mencegah duplikat ke depannya. JANGAN drop kolom `key` lama di migration ini — itu langkah terpisah lagi yang saya putuskan nanti.

**Batasan eksplisit:** Jangan hapus kolom `key` lama di task ini. Jangan ubah UI lock/payment selain mekanisme kuncinya (tombol, teks, alur tetap sama).

**Acceptance criteria:**
- Ubah nama pelanggan di Master Pelanggan → status lock/lunas invoice bulan-bulan sebelumnya untuk pelanggan itu **tidak berubah**.
- Dua pelanggan dengan nama yang sengaja dibuat identik (untuk testing) → status lock/lunas masing-masing tidak saling menimpa.
- Angka di Laporan Keuangan (omset lunas, kas, piutang) untuk bulan yang datanya sudah pernah di-backfill tetap konsisten dengan sebelum perubahan (dibandingkan manual untuk 1-2 bulan sampel).

---

### Task 2 — [KRITIS] Pisahkan & amankan penomoran Invoice vs Kwitansi

**Masalah:** `getInvoiceNumber` (Tagihan.tsx) dan `generateNomorKuitansi` (Kuitansi.tsx) berbagi `cache_key`/`counter_key` yang sama (`${kode_invoice}_${bln}` / `${kode_invoice}_${tahun}`) tanpa prefix jenis dokumen — Invoice dan Kwitansi bisa dapat nomor identik. Selain itu proses baca-lalu-tulis counter tidak atomik (race condition kalau digenerate hampir bersamaan).

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0):**
- Apakah Invoice dan Kwitansi memang **harus** punya urutan nomor terpisah (mis. `INV/2026/001` vs `KWT/2026/001`), atau sebenarnya dulu memang dimaksudkan berbagi satu nomor dokumen (satu invoice = satu kwitansi = nomor sama, by design)? Ini keputusan bisnis, jangan diasumsikan oleh agent.
- Format nomor yang diinginkan (prefix, jumlah digit, reset tahunan) — konfirmasi ke saya, jangan menebak dari format lama.

> ✅ **KEPUTUSAN SUDAH DIAMBIL (lengkap):**
> - Invoice dan Kwitansi → **pisahkan**, nomor harus berbeda (prefix berbeda per jenis dokumen).
> - Format: prefix `INV-` untuk Invoice, `KWT-` untuk Kwitansi. Reset tahunan. Agent tidak perlu konfirmasi format ini lagi di Gate 0.

**Target perbaikan (setelah pertanyaan di atas terjawab):**
1. Kalau jawabannya "harus terpisah": ubah `cache_key`/`counter_key` di kedua file supaya menyertakan prefix jenis dokumen (mis. `INV_${kode_invoice}_${bln}` vs `KWT_${kode_invoice}_${bln}`), lewat migration data (tabel `invoice_numbers`/`invoice_counter` yang sudah ada isinya perlu dipetakan ulang keynya — bukan sekadar ubah kode, existing rows juga perlu di-backfill key barunya, ikuti pola non-destruktif seperti Task 1).
2. Buat RPC Postgres (`SECURITY DEFINER` atau `INVOKER` sesuai pola RPC lain di proyek ini) yang melakukan increment counter secara atomik (`INSERT ... ON CONFLICT (counter_key) DO UPDATE SET counter = counter + 1 RETURNING counter`), lalu ganti `getInvoiceNumber`/`generateNomorKuitansi` di kedua file untuk memanggil RPC ini, bukan lagi baca-lalu-tulis manual dari client.
3. Konsolidasikan logika ke satu helper (boleh taruh di `src/lib/`) yang dipakai kedua file, supaya tidak ada dua implementasi yang bisa drift lagi — ini pengecualian yang diizinkan terhadap aturan "jangan refactor besar" karena memang akar masalahnya duplikasi ini.

**Batasan eksplisit:** Jangan ubah format tampilan nomor invoice di dokumen cetak selain bagian yang memang perlu berubah sesuai keputusan di atas (prefix). Jangan sentuh `nota_id` (itu domain Task 5 di `PERBAIKAN_TAB_TRANSAKSI.md`, dokumen berbeda).

**Acceptance criteria:**
- Generate Invoice dan Kwitansi untuk pelanggan+bulan yang sama menghasilkan nomor sesuai keputusan bisnis yang dikonfirmasi (beda prefix ATAU sama persis, sesuai jawaban pertanyaan di atas) — bukan tabrakan tak disengaja seperti sekarang.
- Simulasi generate dua invoice untuk pelanggan berbeda "bersamaan" (dua tab browser / dua request cepat berurutan) tidak menghasilkan nomor duplikat.

---

### Task 3 — [KRITIS] "Kunci Invoice" harus benar-benar membekukan data, bukan cuma tarif

**Masalah:** `handleToggleLock` cuma menyimpan snapshot tarif pelanggan, sementara `invoiceData` tetap di-fetch live dari `nota` tiap kali halaman dibuka — invoice yang sudah "LOCKED" tetap berubah isinya kalau nota di bulan itu diedit/dihapus/ditambah dari tab Transaksi.

**Catatan penting:** Nota di tab Transaksi bisa diedit/dihapus oleh siapa saja secara desain (lihat `PERBAIKAN_TAB_TRANSAKSI.md` §0) — task ini **tidak** mencoba mencegah nota diedit. Task ini soal memastikan invoice yang sudah dikunci **menampilkan data yang dibekukan saat dikunci**, terlepas dari perubahan nota sesudahnya.

**Sebelum eksekusi, agent WAJIB tunjukkan dulu ke saya (di Gate 0):**
- Rancangan skema snapshot: apa saja yang perlu disimpan di `locks.snapshot_data` supaya invoice yang sudah dikunci bisa ditampilkan ulang persis seperti saat dikunci (daftar nota_id yang termasuk, item & harga masing-masing, subtotal, total) — bukan cuma tarif seperti sekarang.
- Perilaku yang diinginkan kalau invoice sedang LOCKED lalu dibuka lagi: apakah tampilkan snapshot beku sepenuhnya, atau tampilkan snapshot TAPI dengan indikator visual kalau data live nota sudah berbeda dari snapshot (peringatan "data nota berubah sejak dikunci")? Ini pilihan UX, saya yang putuskan, jangan diasumsikan.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:**
> - Perilaku invoice LOCKED → **snapshot beku penuh**. Render sepenuhnya dari data yang disimpan saat Kunci ditekan. Tidak perlu indikator "data berubah". Tujuan: harga di invoice bulan ini dan sebelumnya tidak berubah walau ada perubahan di bulan berikutnya.
> - Skema snapshot: agent WAJIB menampilkan rancangan `snapshot_data` di Gate 0 sebelum mulai (keputusan di atas hanya soal perilaku, bukan soal skema teknis).

**Target perbaikan (setelah rancangan disetujui):**
- Perluas `snapshot_data` (atau kolom baru) di `locks` untuk menyimpan hasil `invoiceData` lengkap saat tombol Kunci ditekan.
- `Tagihan.tsx`: kalau status invoice LOCKED, render dari `snapshot_data` yang tersimpan, bukan dari query live ke `nota` — query live hanya dipakai saat status belum/sudah di-unlock.
- Tombol "Unlock" tetap ada seperti sekarang (untuk kembali ke mode live/edit), sesuai perilaku yang sudah ada.

**Batasan eksplisit:** Jangan mengubah kapan/siapa yang boleh Lock/Unlock (tetap admin-only sesuai RLS yang sudah ada). Jangan mencoba mencegah edit nota di tab Transaksi.

**Acceptance criteria:**
- Kunci sebuah invoice, lalu edit/hapus salah satu nota di bulan tersebut dari tab Transaksi → buka lagi invoice yang terkunci tadi, isinya **tidak berubah** (tetap sesuai kondisi saat dikunci).
- Unlock invoice tersebut → sekarang menampilkan data live (termasuk perubahan nota tadi), sesuai perilaku unlock yang sudah ada.

---

### Task 4 — [TINGGI] Tangani error yang gagal di handler cetak/unduh (Tagihan.tsx)

**Masalah:** `handleDownloadExcel`, `handleCetakLinenRoom`, `handleCetakInvoice` tidak dibungkus try/catch/finally — kalau query `kop` (`.single()`) gagal, `setLoading(false)` tidak pernah jalan, tombol macet permanen tanpa pesan error.

**Target perbaikan:**
- Bungkus ketiga fungsi dengan try/catch/finally: `finally` memastikan `setLoading(false)` selalu jalan; `catch` menampilkan toast error yang jelas ke pengguna (pakai `useToast` yang sudah ada di komponen lain seperti `Pengeluaran.tsx`/`Utang.tsx` — cek dulu apakah `Tagihan.tsx` sudah mengimpor `useToast`, kalau belum tambahkan importnya).
- Ganti `.single()` pada query `kop` menjadi `.maybeSingle()` (pola yang sudah dipakai di `Pengaturan.tsx`) supaya tidak error kalau baris `kop` kosong, dan tangani kasus `null` dengan fallback nama default (samakan pola dengan `getKop()` di `Laporan.tsx`/`AbsensiGaji.tsx`).

**Batasan eksplisit:** Jangan ubah isi/format dokumen yang dihasilkan (Excel/HTML cetak), hanya soal penanganan error & loading state.

**Acceptance criteria:**
- Simulasikan tabel `kop` kosong (hapus sementara isinya di environment testing) → klik cetak/unduh tidak lagi macet di "Loading...", muncul toast error yang jelas, tombol kembali bisa diklik.

---

### Task 5 — [TINGGI] Beri feedback saat aksi Lock/Paid ditolak (defense-in-depth)

**Konteks:** Halaman ini sudah dibatasi lewat `AdminRoute` di routing, jadi risiko utamanya rendah untuk pemakaian normal lewat UI. Task ini tetap dikerjakan sebagai lapisan pengaman tambahan (defense-in-depth) untuk kasus akses langsung ke API/RLS menolak karena sebab lain (mis. sesi admin kedaluwarsa saat aksi diklik).

**Target perbaikan:**
- `handleToggleLock` dan `handleTogglePaid`: tangkap `{ error }` dari `.upsert()` dan tampilkan toast error yang jelas kalau gagal (jangan diamkan seperti sekarang), pakai `useToast` yang sudah ada.

**Batasan eksplisit:** Jangan tambahkan pengecekan `isAdmin` manual di frontend untuk task ini — cukup tangani hasil error dari server. Kalau menurut agent perlu penambahan pengecekan role di frontend, tanyakan dulu, jangan tambahkan sendiri.

**Acceptance criteria:** Aksi Lock/Unlock atau ubah status bayar yang gagal di server (simulasikan dengan mencabut sesi/token) menampilkan toast error, bukan diam tanpa keterangan.

---

### Task 6 — [TINGGI] Tambahkan validasi unik untuk `kode_invoice`

**Masalah:** Tidak ada UNIQUE constraint pada `pelanggan.kode_invoice`, padahal dipakai sebagai bagian kunci penomoran invoice/kwitansi.

**Catatan:** Task ini berkaitan dengan Task 2 — kerjakan **setelah** Task 2 selesai dan disetujui, karena skema `counter_key`/`cache_key` mungkin berubah bentuknya di Task 2.

**Sebelum eksekusi, agent WAJIB jalankan skrip verifikasi read-only:** cek apakah ada `kode_invoice` yang sudah duplikat di data produksi saat ini. Kalau ada, laporkan daftarnya ke saya dulu — jangan langsung buat constraint yang akan gagal di-apply atau memaksa saya memperbaiki data secara terburu-buru.

**Target perbaikan:** Migration baru menambahkan `UNIQUE` constraint pada `pelanggan.kode_invoice` (setelah data existing dipastikan bersih dari duplikat oleh saya).

**Acceptance criteria:** Mencoba menyimpan pelanggan baru dengan `kode_invoice` yang sudah dipakai pelanggan lain menghasilkan error yang jelas di form Master Pelanggan (di luar scope kalau perlu perbaikan UI form-nya — cukup pastikan errornya tidak crash aplikasi, tampilkan toast generik kalau perlu).

---

### Task 7 — [SEDANG] Ganti `alert()` di Kuitansi.tsx dengan sistem toast

**Target perbaikan:** Ganti pemanggilan `alert(...)` untuk validasi ("Pilih pelanggan dan bulan!", dsb.) di `Kuitansi.tsx` dengan `useToast` (pola sama seperti komponen lain di aplikasi).

**Acceptance criteria:** Validasi gagal (belum pilih pelanggan/bulan) menampilkan toast, bukan dialog `alert()` browser bawaan.

---

### Task 8 — [SEDANG] Peringatan saat cetak Kwitansi untuk periode yang belum LUNAS

**Target perbaikan:** `Kuitansi.tsx` membaca status `payment_status` untuk pelanggan+bulan terpilih (pakai skema `pelanggan_id` hasil Task 1, JANGAN pakai skema nama lama). Kalau status belum LUNAS, tampilkan peringatan/konfirmasi sebelum mencetak ("Periode ini belum ditandai Lunas di Tagihan. Tetap cetak kwitansi?") — bukan blokir keras, karena staf mungkin punya alasan sah (mis. bayar tunai dan Tagihan belum sempat diupdate).

**Catatan:** Task ini butuh Task 1 selesai lebih dulu (karena butuh cara baca `payment_status` yang benar berdasarkan id).

**Acceptance criteria:** Coba cetak Kwitansi untuk pelanggan+bulan yang status Tagihan-nya masih "Belum Bayar" → muncul dialog konfirmasi peringatan sebelum lanjut cetak.

---

### Task 9 — [RENDAH] Hapus import `toRoman` yang redundan di Tagihan.tsx

**Target perbaikan:** Hapus definisi lokal `toRoman` di `Tagihan.tsx` yang menutupi (shadow) import dari `lib/utils`, pastikan pemakaian di file tetap memakai versi dari `lib/utils` dan hasilnya tidak berubah.

**Acceptance criteria:** Nomor romawi yang tampil di dokumen cetak (kalau dipakai) tetap sama persis sebelum & sesudah perubahan.

---

## TIDAK TERMASUK DALAM DOKUMEN INI (sengaja tidak dijadikan task)

- **Konsolidasi penuh `calculateTotal`/`checkIsNotaFlat` ke util bersama** di luar yang secara eksplisit disebutkan Task 2 (penomoran) — kalau agent melihat peluang konsolidasi lebih luas saat mengerjakan Task 2, catat sebagai "di luar scope", jangan langsung dikerjakan.
- **Perbaikan lain di RPC `get_dashboard_metrics`** (termasuk isu agregat all-time yang sudah teridentifikasi terpisah di analisis tab Keuangan) — HANYA bagian join `payment_status` yang boleh disentuh di Task 1 sesuai §4.
- **Perubahan siapa yang boleh mengakses tab Tagihan** (tetap admin-only via `AdminRoute`, tidak diubah oleh dokumen ini).

Kalau nanti agent atau saya ingin menambah task baru untuk tab Tagihan, tambahkan sebagai task baru di dokumen ini, jangan bikin dokumen `.md` terpisah untuk tab yang sama.
