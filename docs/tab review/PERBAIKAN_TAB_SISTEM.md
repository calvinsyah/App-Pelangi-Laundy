# Rencana Perbaikan — Tab Sistem

> Sumber: hasil audit "cek dan analisa tab sistem" (App Pelangi Laundry).
> Cakupan file: `src/pages/sistem/Backup.tsx`, `src/pages/sistem/Pengaturan.tsx`.
> Dokumen ini adalah **sumber kebenaran tunggal** untuk pekerjaan perbaikan tab Sistem. Agent WAJIB membaca dokumen ini sampai tuntas sebelum mengubah satu baris kode pun.
>
> **Lihat juga:** `PERBAIKAN_TAB_TRANSAKSI.md`, `PERBAIKAN_TAB_TAGIHAN.md`, `PERBAIKAN_TAB_KEUANGAN.md`. Jangan mengerjakan dokumen ini bersamaan dengan salah satu dari ketiganya dalam satu sesi kerja, kecuali saya minta eksplisit.

---

## HIERARKI DOKUMEN & ATURAN PUSH

> **Aturan hierarki:** Dokumen ini (`tab review/PERBAIKAN_TAB_SISTEM.md`) adalah **sumber kebenaran dan aturan** untuk pekerjaan tab ini. File `.md` apa pun di luar folder `tab review/` — termasuk `AGENTS.md`, `HANDOFF.md`, `CODE_EFFICIENCY.md`, `MAINTENANCE_PLAN.md`, `prd_final.md`, `MONITORING_GUIDE.md`, `SECURITY_FIX.md`, `README.md`, dan file `.md` lainnya di root repo — hanya berfungsi sebagai **referensi/konteks**, BUKAN sebagai sumber aturan kerja. Kalau ada konflik antara isi dokumen ini dengan file `.md` di luar, **dokumen ini yang berlaku**.

> **Aturan push:** Agent TIDAK BOLEH melakukan `git push` dalam kondisi apa pun. Setelah semua commit lokal siap, agent WAJIB berhenti dan menunggu konfirmasi eksplisit dari saya sebelum push. **Saya yang menentukan kapan push dilakukan.**

---

## 0. PERINGATAN KHUSUS — TAB INI PALING BERISIKO DI SELURUH APLIKASI

Halaman ini (`Backup.tsx` khususnya) adalah satu-satunya tempat di aplikasi yang bisa **menghapus atau menimpa seluruh database produksi dalam satu klik**. Ini juga persis area yang berkaitan dengan insiden produksi sebelumnya (write tak terkendali ke Supabase live). Untuk SEMUA task di dokumen ini, aturan tambahan berikut berlaku di atas "ATURAN KERJA" umum:

- **Tidak ada eksekusi coba-coba di database produksi/staging manapun.** Kalau agent perlu menguji perilaku baru (restore, purge, dsb.), agent WAJIB menyatakan secara eksplisit di Gate 0 bahwa pengujian akan dilakukan dengan cara aman (mis. data dummy di environment lokal/terpisah, atau sekadar membaca kode tanpa eksekusi nyata) — JANGAN pernah menguji fitur hapus/restore terhadap database yang sedang dipakai untuk data transaksi nyata.
- **Setiap task yang mengubah perilaku hapus/restore/purge WAJIB menyertakan rencana rollback tertulis** di Gate 0: kalau perubahan ini ternyata bermasalah setelah di-deploy, bagaimana cara membatalkannya (revert commit, revert migration, dsb.)?
- Kalau task menyebutkan "tampilkan diff dulu" atau "Gate 0", ini BUKAN formalitas — untuk tab ini, anggap sebagai pemeriksaan keselamatan yang keras. Jangan pernah melompati langkah ini walau task terlihat sederhana.

---

## ATURAN KERJA (WAJIB DIIKUTI SELURUHNYA)

1. **Satu task, satu waktu.** Kerjakan sesuai urutan nomor di bawah. Jangan mengerjakan dua task sekaligus. Setelah satu task selesai, STOP dan tunggu konfirmasi saya sebelum lanjut ke task berikutnya.

2. **Gate 0 — deklarasi rencana sebelum eksekusi.** Sebelum mengubah kode apa pun untuk sebuah task, tampilkan dulu ke saya:
   - File apa saja yang akan disentuh.
   - Ringkasan perubahan.
   - Untuk task terkait restore/purge (Task 1-5): rencana rollback (lihat §0) dan konfirmasi cara pengujian yang aman.
   - Untuk task yang punya "Pertanyaan yang WAJIB dijawab" (lihat masing-masing task), jawaban saya harus didapat SEBELUM Gate 0 dianggap selesai.
   - Tunggu saya bilang "lanjut" / "approved" sebelum mulai edit file.

3. **Migration SQL = tampilkan diff dulu, tidak langsung apply.** Kalau ada task yang butuh RPC/edge function baru (lihat Task 2), buat file migration/function BARU, tampilkan untuk saya review. JANGAN menjalankan migration atau men-deploy edge function ke database/project produksi — saya yang lakukan manual setelah review.

4. **Tidak ada perubahan di luar file yang disebutkan di task.** Temuan lain yang ditemukan saat mengerjakan (termasuk di tab lain) dicatat sebagai "Ditemukan tapi di luar scope", bukan diperbaiki langsung.

5. **Jangan menambah fitur yang tidak diminta**, sekecil apa pun, terutama di area hapus/restore. Contoh: jangan menambahkan tombol "hapus semua" versi baru, jangan menambahkan opsi restore yang tidak disebutkan di task, walau menurut agent itu "berguna".

6. **Lint & build sebelum commit.** Jalankan `npm run lint`, pastikan tidak ada error baru.

7. **Commit terpisah per task, pesan dalam Bahasa Indonesia**, format:
   `fix(sistem): temuan #<nomor> - <ringkasan singkat>`

8. **JANGAN push otomatis.** Setelah commit lokal siap, berhenti dan tunggu saya review sebelum `git push`.

9. **Kalau ambigu, ragu, atau menemukan sesuatu yang tidak terduga, STOP dan tanyakan ke saya.** Untuk tab ini lebih dari tab manapun: **lebih baik bertanya berkali-kali daripada menebak sekali.**

10. **Setiap task WAJIB diakhiri dengan laporan berisi:**
    - File yang diubah + ringkasan perubahan per file.
    - Hasil `npm run lint`.
    - Hash & pesan commit lokal (belum di-push).
    - Isi migration/edge function yang menunggu di-apply/deploy manual oleh saya (kalau ada).
    - Rencana rollback (untuk Task 1-5).
    - Temuan di luar scope (kalau ada).

---

## DAFTAR TASK (urut prioritas: Kritis → Rendah)

### Task 1 — [KRITIS] Tambahkan konfirmasi keras + preview sebelum eksekusi Impor/Restore

**Masalah:** `handleFileImport` langsung menjalankan `.upsert()` ke semua tabel yang cocok begitu file JSON diparse — tidak ada `confirm()` sama sekali, padahal ini operasi yang bisa menimpa seluruh database.

**Target perbaikan:**
- Setelah file dipilih & berhasil diparse, **jangan langsung eksekusi**. Tampilkan dulu ringkasan preview ke pengguna: daftar nama tabel yang terdeteksi di file, dan jumlah baris per tabel yang akan di-upsert (hitung dari hasil parse JSON, sebelum kirim ke Supabase).
- Tambahkan dialog konfirmasi (pakai `useConfirm` yang sudah dipakai di bagian lain `Backup.tsx`) dengan teks yang eksplisit menyebutkan jumlah tabel & baris yang akan terdampak, dan bahwa data dengan ID yang sama akan **ditimpa**.
- Hanya setelah pengguna konfirmasi, baru jalankan proses upsert yang sudah ada.

**Batasan eksplisit:** Task ini HANYA menambahkan lapisan preview+konfirmasi. Jangan ubah logika parsing/transform FORMAT 1 / FORMAT 2 yang sudah ada, jangan ubah ke mekanisme restore baru (itu Task 2).

**Acceptance criteria:**
- Pilih file backup JSON → muncul ringkasan ("File ini berisi X baris di tabel `nota`, Y baris di tabel `biaya`, ...") dan dialog konfirmasi, sebelum ada satu pun `.upsert()` terkirim ke Supabase.
- Klik "Batal" pada dialog konfirmasi → tidak ada perubahan apa pun di database (verifikasi dengan memantau network request, harus nihil `upsert`).

---

### Task 2 — [KRITIS] Jadikan proses restore atomik & benahi penanganan error per-tabel

**Masalah:** Restore memproses tabel satu-per-satu di client tanpa transaksi — kalau satu tabel gagal upsert, proses tetap lanjut ke tabel berikutnya (errornya cuma `console.error`, tidak terlihat pengguna), sehingga hasil restore bisa jadi campuran sebagian-berhasil-sebagian-gagal tanpa pengguna sadar.

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0) — ini keputusan arsitektur, jangan diasumsikan:**
1. Apakah restore harus **all-or-nothing** (kalau satu tabel gagal, SEMUA perubahan dibatalkan/rollback), atau cukup **dilaporkan dengan jelas per tabel** (mana yang berhasil, mana yang gagal, tanpa rollback otomatis)? All-or-nothing lebih aman tapi butuh proses restore dipindah ke server (edge function/RPC yang menerima seluruh JSON dan menjalankan dalam satu transaksi Postgres) — perubahan arsitektur lebih besar. Opsi kedua lebih sederhana (tetap di client) tapi tidak benar-benar atomik.
2. Apakah restore tetap bersifat **merge (upsert)** seperti sekarang (baris yang sudah dihapus dari database setelah backup diambil TIDAK dikembalikan), atau saya ingin restore yang benar-benar mengembalikan ke kondisi persis seperti file backup (termasuk menghapus baris yang tidak ada di file)? **Kalau tetap merge**, task ini juga harus memperbaiki teks di UI (baris "Tindakan ini akan menimpa data yang memiliki kecocokan ID") supaya secara eksplisit menyebutkan bahwa ini BUKAN restore penuh — untuk mencegah pengguna salah paham soal apa yang sebenarnya terjadi.

> ✅ **KEPUTUSAN SUDAH DIAMBIL (rekomendasi diterima):**
> - Arsitektur → **all-or-nothing via edge function `restore-import`**. Alasan: data finansial produksi — partial restore lebih berbahaya dari restore yang gagal total. Edge function juga konsisten dengan pola server-side lain di proyek (nota-create, gaji-hitung). Agent wajib tampilkan rancangan edge function di Gate 0 sebelum mulai.
> - Mode → tetap **merge (upsert)**. Baris yang tidak ada di file backup TIDAK dihapus dari database. Ini perilaku yang lebih aman.
> - UI → update teks agar eksplisit menyebutkan ini adalah **"Import/Merge"**, BUKAN restore penuh. Contoh: *"Data dari file akan di-merge ke database. Data yang tidak ada di file backup tidak akan dihapus."*

**Target perbaikan (setelah kedua pertanyaan di atas terjawab, sesuai jawabannya):**
- Kalau all-or-nothing dipilih: buat edge function baru (mis. `restore-import`) yang menerima payload JSON lengkap, memvalidasi struktur dasarnya (setidaknya: setiap value per tabel harus array), lalu menjalankan seluruh upsert dalam satu transaksi Postgres (rollback total kalau satu bagian gagal). `handleFileImport` di frontend berubah jadi memanggil edge function ini, bukan loop `.upsert()` langsung dari client.
- Kalau laporan-per-tabel dipilih (tanpa rollback): tetap proses di client, tapi kumpulkan hasil sukses/gagal per tabel ke sebuah array, dan setelah semua selesai tampilkan **ringkasan detail** ke pengguna (bukan cuma total `syncCount`) — tabel mana saja yang gagal, dan pesan error singkatnya, ditampilkan di UI (bukan cuma `console.error`).
- Update teks UI sesuai jawaban pertanyaan #2 di atas.

**Batasan eksplisit:** Jangan implementasikan mode "replace penuh termasuk hapus baris yang tidak ada di file" kecuali secara eksplisit dipilih di pertanyaan #2 — dan kalau dipilih, ini kemungkinan besar perlu jadi task/dokumen tersendiri karena kompleksitasnya (perlu strategi per-tabel: tabel apa yang aman di-replace-penuh vs yang tidak, terutama untuk tabel dengan foreign key). Jangan mencoba menyelesaikan itu sekaligus di task ini kalau ternyata itu jawabannya — laporkan ke saya bahwa ini perlu dipecah jadi task terpisah.

**Acceptance criteria:**
- Simulasikan satu tabel gagal di-upsert (mis. paksa error dengan data yang sengaja tidak valid untuk satu tabel) → sesuai keputusan arsitektur: baik seluruh restore dibatalkan (all-or-nothing), atau pengguna melihat dengan jelas tabel mana yang gagal dan mana yang berhasil (bukan cuma toast sukses generik).

---

### Task 3 — [KRITIS] Perbaiki penanganan error di operasi hapus permanen (`handlePurgeDataLama`, `handleBersihkanData`)

**Masalah:** Kedua fungsi memanggil beberapa `.delete()` berturut-turut tanpa pernah membaca `{ error }` hasilnya — kegagalan RLS/constraint/jaringan tidak akan tertangkap oleh try/catch (Supabase client tidak melempar exception untuk error query biasa), sehingga toast "berhasil dibersihkan" bisa muncul walau datanya masih ada.

**Target perbaikan:**
- Untuk setiap panggilan `.delete()` di `handlePurgeDataLama` (`nota`, `biaya`, `gaji`, `absensi`) dan `handleBersihkanData` (`nota`, `biaya`, `gaji`, `absensi`): tangkap `{ error }` dari masing-masing panggilan.
- Kalau ada satu atau lebih yang gagal, tampilkan toast yang menyebutkan secara spesifik tabel mana yang gagal dihapus (bukan pesan generik "Gagal membersihkan data"), dan JANGAN tampilkan toast sukses kalau ada satu pun yang gagal.
- Kumpulkan semua error dulu (jalankan semua delete, catat errornya masing-masing) baru laporkan gabungan di akhir — supaya tabel-tabel lain yang berhasil tetap diberi tahu statusnya, bukan berhenti di kegagalan pertama tanpa mencoba yang lain (kecuali task ini diputuskan lain — kalau ragu urutan/strategi ini, tanyakan dulu).

**Batasan eksplisit:** Jangan ubah kondisi filter (`lt('tanggal', ...)`, `neq('id', 0)`) atau tabel mana saja yang dihapus — itu di luar scope task ini.

**Acceptance criteria:**
- Simulasikan salah satu `.delete()` gagal (mis. lewat RLS yang sengaja dibatasi sementara di environment testing) → toast menunjukkan tabel mana yang gagal, TIDAK menampilkan pesan sukses penuh.
- Kasus normal (semua delete berhasil) tetap menampilkan pesan sukses seperti sebelumnya.

---

### Task 4 — [TINGGI] Status "Terbackup" tidak boleh ditandai sukses hanya dari trigger `a.click()`

**Masalah:** `backup_history` ditulis sebagai "sukses" begitu proses trigger-download JS selesai tanpa error — bukan konfirmasi file benar-benar tersimpan ke disk pengguna.

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0):** Browser tidak menyediakan API standar untuk memastikan file benar-benar tersimpan setelah `a.click()` (ini keterbatasan platform, bukan sesuatu yang bisa "diperbaiki" sepenuhnya di kode). Opsi realistis yang ingin saya pakai yang mana:
   - (a) Tambahkan konfirmasi manual: setelah unduhan dipicu, tampilkan dialog "Apakah file berhasil terunduh?" dengan tombol Ya/Tidak, dan hanya tulis `backup_history` kalau pengguna klik Ya.
   - (b) Biarkan penandaan otomatis seperti sekarang, tapi ubah label di UI dari "Terbackup" (final, meyakinkan) menjadi sesuatu yang lebih jujur seperti "Unduhan Dipicu" dengan catatan kecil bahwa ini belum tentu berarti file tersimpan.
   - (c) Opsi lain yang saya tentukan sendiri.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** **Opsi (a) — konfirmasi manual.** Setelah unduhan dipicu, tampilkan dialog "Apakah file berhasil terunduh?" dengan tombol Ya/Tidak. Hanya tulis `backup_history` kalau pengguna klik Ya.

**Target perbaikan:** Implementasikan opsi (a) di atas.

**Acceptance criteria:** Klik backup → unduhan dipicu → muncul dialog konfirmasi "Apakah file berhasil terunduh?" → klik Ya → `backup_history` ditulis. Klik Tidak → `backup_history` tidak ditulis.

---

### Task 5 — [TINGGI] Samakan cakupan tabel antara backup penuh dan backup per-bulan

**Masalah:** `masterTables` di `handleBackupBulan` melewatkan `linen_pelanggan`, `locks`, `invoice_numbers`, `invoice_counter`, `backup_history` yang ada di daftar `tables` untuk Ekspor Semua Data.

**Target perbaikan:**
- Tambahkan tabel yang hilang ke `masterTables` di `handleBackupBulan`, kecuali `backup_history` itu sendiri (tidak perlu backup rekursif ke tabel status backup). Untuk `locks`/`invoice_numbers`/`invoice_counter`, pertimbangkan apakah perlu difilter per bulan (seperti `nota`/`biaya`) atau tetap full-table seperti tabel master lain — samakan pola dengan `payment_status`/`utang` yang sudah ada di `masterTables` saat ini (full-table, tidak difilter tanggal).

**Batasan eksplisit:** Jangan ubah struktur file JSON yang dihasilkan (nama key tetap nama tabel), supaya tetap kompatibel dengan mekanisme restore FORMAT 1 yang sudah ada.

**Acceptance criteria:** Backup per-bulan untuk satu bulan sampel menghasilkan file yang mencakup semua tabel yang sama seperti Ekspor Semua Data (minus `backup_history`), dibandingkan daftar isi file JSON sebelum & sesudah perbaikan.

---

### Task 6 — [TINGGI] Tarif di Pengaturan tidak boleh memengaruhi payroll periode yang sudah dihitung sebelumnya

**Masalah:** `tarif_internal_hotel` dan `ongkos_per_kg` selalu dibaca dari nilai terkini oleh kalkulasi gaji — tidak ada snapshot historis, sehingga menghitung ulang gaji periode lama setelah tarif diubah menghasilkan angka berbeda dari yang sudah pernah dibayarkan.

**Catatan:** Task ini menyentuh `Pengaturan.tsx` (tab Sistem, tempat tarif diubah) DAN logika kalkulasi gaji (`AbsensiGaji.tsx`/edge function `gaji-hitung`, tab Keuangan). Task ini **diizinkan secara eksplisit** menyentuh bagian penyimpanan tarif di kedua sisi untuk kebutuhan snapshot, TAPI JANGAN memperbaiki temuan lain apa pun di `AbsensiGaji.tsx` di luar bagian ini (lihat `PERBAIKAN_TAB_KEUANGAN.md` untuk temuan lain di file itu, termasuk Task 5 di dokumen itu soal perbedaan aturan HOTEL — jangan digabung, itu task terpisah).

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0):**
- Apakah cukup menyimpan snapshot `tarif_internal_hotel`/`ongkos_per_kg` yang dipakai ke tabel `gaji` pada saat gaji periode tersebut pertama kali dihitung/disimpan (mis. kolom baru `tarif_internal_hotel_snapshot`, `ongkos_per_kg_snapshot`), lalu perhitungan ULANG untuk periode yang SUDAH punya baris `gaji` tersimpan memakai nilai snapshot itu (bukan nilai terkini)? Ini pendekatan yang disarankan, tapi konfirmasi dulu ke saya sebelum dikerjakan.
- Untuk periode yang BELUM pernah dihitung/disimpan sama sekali, tetap pakai tarif terkini seperti sekarang (masuk akal, karena belum ada snapshot untuk dipakai) — konfirmasi ini juga sesuai harapan saya.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:**
> - Pendekatan **kolom snapshot di tabel `gaji`** dikonfirmasi: tambah `tarif_internal_hotel_snapshot` dan `ongkos_per_kg_snapshot` ke tabel `gaji`.
> - Logika: periode sudah punya baris `gaji` tersimpan → pakai nilai snapshot. Periode baru (belum ada baris `gaji`) → pakai tarif terkini dari `pengaturan`, simpan sekaligus sebagai snapshot.
> - Pastikan konsistensi: edge function `gaji-hitung` dan fallback `hitungGajiLokal` dan `handleSaveModalGaji` semua harus menggunakan logika snapshot yang sama (berkorelasi).

**Target perbaikan (setelah dikonfirmasi):**
- Migration baru: tambah kolom snapshot tarif di tabel `gaji`.
- `handleCalculateGaji`/`hitungGajiLokal`/edge function `gaji-hitung`: kalau untuk periode tersebut sudah ada baris `gaji` tersimpan dengan snapshot tarif, pakai nilai snapshot itu untuk kalkulasi ulang, bukan `pengaturan` terkini. Kalau belum ada baris tersimpan (periode baru pertama kali dihitung), pakai `pengaturan` terkini SEKALIGUS simpan sebagai snapshot begitu baris `gaji` pertama untuk periode itu dibuat (lewat `handleSaveModalGaji`).

**Batasan eksplisit:** Jangan ubah cara `insentif`/`lembur`/`potongan`/`gaji_pokok` disimpan (itu sudah per-periode dengan benar). Jangan sentuh Task 5 di `PERBAIKAN_TAB_KEUANGAN.md` (perbedaan aturan HOTEL) — kerjakan terpisah.

**Acceptance criteria:**
- Hitung & simpan gaji untuk bulan berjalan, lalu ubah `ongkos_per_kg` di Pengaturan, lalu hitung ulang gaji untuk bulan yang SUDAH tersimpan tadi → hasil `totalUpah` tetap sama seperti sebelum tarif diubah.
- Hitung gaji untuk bulan yang belum pernah dihitung sama sekali setelah tarif diubah → menggunakan tarif BARU (perilaku ini tidak berubah).

---

### Task 7 — [SEDANG] Preview & batch delete untuk "Bersihkan Nota Rusak"

**Masalah:** `handleBersihkanNotaRusak` menghapus satu-per-satu via loop `for...of` berurutan tanpa preview daftar nota yang akan dihapus.

**Target perbaikan:**
- Sebelum menghapus, tampilkan daftar nota yang terdeteksi "rusak" (minimal: `nota_id`, tanggal, pelanggan) ke pengguna lewat dialog konfirmasi, supaya bisa ditinjau dulu sebelum permanen terhapus.
- Ganti loop `for...of` sekuensial menjadi satu panggilan `delete().in('id', arrayOfIds)`.

**Acceptance criteria:** Klik "Bersihkan Nota Rusak" → muncul daftar nota yang akan dihapus dengan tombol konfirmasi, baru setelah dikonfirmasi terhapus dalam satu operasi batch.

---

### Task 8 — [SEDANG] Bersihkan metadata yatim (`payment_status`/`locks`/dst.) saat purge periode lama

**Masalah:** Purge `nota`/`biaya`/`gaji`/`absensi` tidak ikut membersihkan `payment_status`/`locks`/`invoice_numbers`/`invoice_counter` untuk periode yang sama.

**Catatan:** Task ini bergantung pada skema `pelanggan_id` (bukan nama) di `payment_status`/`locks` yang dikerjakan di Task 1 `PERBAIKAN_TAB_TAGIHAN.md`. Kalau task itu belum selesai, STOP di Gate 0 dan laporkan ketergantungan ini.

**Target perbaikan (setelah prasyarat terpenuhi):**
- Tambahkan penghapusan baris `payment_status`/`locks` yang `bulan`-nya lebih lama dari `purgeMonth` di `handlePurgeDataLama`, dengan pengecekan `{ error }` mengikuti pola Task 3.
- `invoice_numbers`/`invoice_counter` sifatnya counter per tahun, bukan per transaksi — ~~cek dulu ke saya apakah aman dihapus untuk tahun-tahun yang datanya sudah purge total, atau sebaiknya dibiarkan~~

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** `invoice_numbers`/`invoice_counter` untuk tahun-tahun yang datanya sudah purge total → **aman dihapus**. Tambahkan penghapusan counter per tahun yang relevan bersama purge.

**Acceptance criteria:** Purge data sebelum bulan X → baris `payment_status`/`locks` untuk bulan-bulan sebelum X juga ikut terhapus, sisanya (bulan X ke atas) tetap ada.

---

### Task 9 — [SEDANG] Validasi rentang nilai input numerik di Pengaturan Global

**Target perbaikan:** Tambahkan validasi sederhana (mis. tidak boleh negatif, tidak boleh 0 untuk `ongkos_per_kg`/`tarif_internal_hotel` karena dipakai sebagai pembagi/pengali di kalkulasi gaji & harga) sebelum `handleSaveSettings` menyimpan — tampilkan toast/pesan error kalau tidak valid, jangan biarkan tersimpan.

**Acceptance criteria:** Coba simpan `ongkos_per_kg` = 0 atau negatif → muncul pesan error, data tidak tersimpan sampai diperbaiki.

---

### Task 10 — [SEDANG] Hapus logo lama saat logo baru diunggah

**Target perbaikan:** Di `handleLogoUpload`, sebelum/sesudah upload logo baru berhasil, hapus file logo lama dari bucket `assets` (pakai `supabase.storage.from('assets').remove([oldPath])`) — path lama bisa didapat dari `logoUrl` state yang sudah ada, ekstrak path relatif dari URL publiknya.

**Batasan eksplisit:** Kalau ekstraksi path dari public URL ternyata tidak straightforward/berisiko salah hapus file yang salah, STOP dan laporkan ke saya alih-alih menebak — jangan sampai menghapus file yang salah.

**Acceptance criteria:** Unggah logo baru dua kali berturut-turut → hanya ada satu file logo yang tersisa di bucket `assets` untuk usaha ini (bisa diverifikasi lewat Supabase Storage dashboard).

---

### Task 11 — [RENDAH] Validasi tipe file logo yang lebih ketat

**Target perbaikan:** Tambahkan pengecekan `file.type.startsWith('image/')` di `handleLogoUpload` sebelum upload (selain cek ukuran yang sudah ada), sebagai lapisan tambahan di atas atribut HTML `accept` yang mudah dilewati.

**Acceptance criteria:** Mencoba unggah file non-gambar (mis. `.txt` yang di-rename jadi `.png`) tetap tertolak dengan pesan error yang jelas kalau `file.type` terdeteksi bukan gambar.

---

### Task 12 — [RENDAH] Batasi query `fetchStatus()` di Backup.tsx

**Target perbaikan:** Tambahkan `.limit()` yang wajar pada `supabase.from('nota').select('tanggal')` di `fetchStatus()`, ATAU (lebih baik) ganti pendekatannya memakai `distinct`/RPC ringan untuk mengambil daftar bulan unik langsung dari server alih-alih menarik seluruh kolom `tanggal` ke client untuk di-`Set()`-kan.

**Batasan eksplisit:** Kalau memilih membuat RPC baru untuk ini, ikuti aturan migration (§"ATURAN KERJA" no. 3) — tampilkan dulu, jangan langsung apply.

**Acceptance criteria:** Halaman Backup tetap menampilkan daftar bulan yang sama seperti sebelumnya, dengan jumlah data yang ditarik dari server jauh lebih kecil (bisa dibandingkan dari ukuran response network sebelum & sesudah).

---

## TIDAK TERMASUK DALAM DOKUMEN INI (sengaja tidak dijadikan task)

- **Mode restore "replace penuh" (termasuk menghapus baris yang tidak ada di file backup)** — hanya dikerjakan kalau eksplisit dipilih di Task 2, dan kemungkinan besar perlu dipecah jadi dokumen rencana tersendiri karena kompleksitasnya.
- **Perbedaan aturan HOTEL antara edge function `gaji-hitung` dan fallback lokal** — itu Task 5 di `PERBAIKAN_TAB_KEUANGAN.md`, jangan digabung ke Task 6 dokumen ini walau sama-sama menyentuh kalkulasi gaji.
- **Perubahan siapa yang boleh mengakses tab Sistem** (tetap admin-only via `AdminRoute`, tidak diubah oleh dokumen ini).
- **Soft-delete/undo penuh untuk data transaksi** — di luar scope, perlu perubahan skema besar yang belum diputuskan.

Kalau nanti agent atau saya ingin menambah task baru untuk tab Sistem, tambahkan sebagai task baru di dokumen ini, jangan bikin dokumen `.md` terpisah untuk tab yang sama.
