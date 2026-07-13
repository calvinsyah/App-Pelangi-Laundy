# Rencana Perbaikan — Tab Keuangan

> Sumber: hasil audit "cek dan analisa tab keuangan" (App Pelangi Laundry).
> Cakupan file: `src/pages/keuangan/Pengeluaran.tsx`, `src/pages/keuangan/Utang.tsx`, `src/pages/keuangan/AbsensiGaji.tsx`, `src/pages/keuangan/Laporan.tsx`, `src/lib/keuangan.ts`, RPC `get_dashboard_metrics`, edge function `supabase/functions/gaji-hitung/index.ts`.
> Dokumen ini adalah **sumber kebenaran tunggal** untuk pekerjaan perbaikan tab Keuangan. Agent WAJIB membaca dokumen ini sampai tuntas sebelum mengubah satu baris kode atau satu migration pun.
>
> **Lihat juga (WAJIB dicek statusnya dulu sebelum mulai):**
> - `PERBAIKAN_TAB_TAGIHAN.md` — Task 1 di dokumen itu **sudah mencakup** perbaikan skema kunci `payment_status` (dari nama pelanggan ke `pelanggan_id`) termasuk bagian join di RPC `get_dashboard_metrics`. **JANGAN membuat task duplikat untuk itu di dokumen ini.** Kalau Task 1 di `PERBAIKAN_TAB_TAGIHAN.md` belum selesai/disetujui, Task 2 di dokumen ini (Neraca all-time) HARUS menunggu sampai itu selesai — lihat detail di Task 2.
> - `TUTUP_BUKU_PLAN.md` — rencana jangka panjang mengganti agregat all-time dengan tabel `saldo_tahunan`. Task 2 di dokumen ini adalah **perbaikan taktis/sementara** (benarkan periode Neraca), BUKAN pengganti rencana tutup buku. Jangan menganggap Task 2 selesai berarti `TUTUP_BUKU_PLAN.md` tidak perlu lagi dikerjakan, dan jangan mengerjakan `TUTUP_BUKU_PLAN.md` sebagai bagian dari dokumen ini tanpa saya minta eksplisit.
> - Jangan mengerjakan dokumen ini bersamaan dengan `PERBAIKAN_TAB_TRANSAKSI.md`/`PERBAIKAN_TAB_TAGIHAN.md` dalam satu sesi kerja yang sama, kecuali saya minta eksplisit.

## HIERARKI DOKUMEN & ATURAN PUSH

> **Aturan hierarki:** Dokumen ini (`tab review/PERBAIKAN_TAB_KEUANGAN.md`) adalah **sumber kebenaran dan aturan** untuk pekerjaan tab ini. File `.md` apa pun di luar folder `tab review/` — termasuk `AGENTS.md`, `HANDOFF.md`, `CODE_EFFICIENCY.md`, `MAINTENANCE_PLAN.md`, `prd_final.md`, `MONITORING_GUIDE.md`, `SECURITY_FIX.md`, `README.md`, dan file `.md` lainnya di root repo — hanya berfungsi sebagai **referensi/konteks**, BUKAN sebagai sumber aturan kerja. Kalau ada konflik antara isi dokumen ini dengan file `.md` di luar, **dokumen ini yang berlaku**.

> **Aturan push:** Agent TIDAK BOLEH melakukan `git push` dalam kondisi apa pun. Setelah semua commit lokal siap, agent WAJIB berhenti dan menunggu konfirmasi eksplisit dari saya sebelum push. **Saya yang menentukan kapan push dilakukan.**

---

## ATURAN KERJA (WAJIB DIIKUTI SELURUHNYA)

1. **Satu task, satu waktu.** Kerjakan sesuai urutan nomor di bawah. Jangan mengerjakan dua task sekaligus. Setelah satu task selesai, STOP dan tunggu konfirmasi saya sebelum lanjut ke task berikutnya.

2. **Gate 0 — deklarasi rencana sebelum eksekusi.** Sebelum mengubah kode/membuat migration apa pun untuk sebuah task, tampilkan dulu ke saya:
   - File apa saja yang akan disentuh.
   - Ringkasan perubahan.
   - Apakah task ini melibatkan **operasi tulis/migrasi ke database produksi**, dan tabel/RPC apa saja yang terdampak.
   - Untuk task yang punya "Pertanyaan yang WAJIB dijawab" (lihat masing-masing task), jawaban saya harus didapat SEBELUM Gate 0 dianggap selesai.
   - Tunggu saya bilang "lanjut" / "approved" sebelum mulai edit file atau membuat migration.

3. **Migration SQL / perubahan RPC = tampilkan diff dulu, tidak langsung apply.** Buat file migration BARU (jangan edit migration lama), penomoran lanjutan dari file terakhir di `supabase/migrations/`. Tampilkan isi migration untuk saya review. JANGAN menjalankan migration ke database (via CLI/dashboard/MCP). Kalau ada task yang butuh edge function baru atau perubahan edge function yang sudah ada (mis. `gaji-hitung`), buat file function BARU dan tampilkan untuk saya review — **JANGAN men-deploy edge function ke Supabase produksi** secara otomatis. Saya yang apply migration dan deploy edge function secara manual setelah review.

4. **Task di dokumen ini fokus ke tab Keuangan.** Jangan menyentuh file di tab Transaksi, Tagihan, atau Sistem kecuali task secara eksplisit menyebutkannya (lihat pengecualian di Task 2 terkait RPC bersama). Kalau ragu, tanyakan dulu.

5. **Tidak ada perubahan di luar file yang disebutkan di task.** Temuan lain yang ditemukan saat mengerjakan dicatat sebagai "Ditemukan tapi di luar scope" di laporan akhir, bukan diperbaiki langsung.

6. **Jangan melakukan refactor besar di luar yang diminta task**, kecuali task secara eksplisit mengizinkan (lihat Task 8, konsolidasi kategori).

7. **Lint & build sebelum commit.** Jalankan `npm run lint` untuk perubahan non-SQL, pastikan tidak ada error baru.

8. **Commit terpisah per task, pesan dalam Bahasa Indonesia**, format:
   `fix(keuangan): temuan #<nomor> - <ringkasan singkat>`
   Untuk task multi-langkah, beri suffix `(1/2)`, `(2/2)`, dst. di pesan commit.

9. **JANGAN push otomatis.** Setelah commit lokal siap, berhenti dan tunggu saya review sebelum `git push`.

10. **Kalau ambigu, ragu, atau menemukan sesuatu yang tidak terduga** (terutama untuk task yang menyangkut angka finansial/payroll), **STOP dan tanyakan ke saya. Jangan menebak, jangan mengambil keputusan desain/bisnis sendiri.**

11. **Setiap task WAJIB diakhiri dengan laporan berisi:**
    - File yang diubah + ringkasan perubahan per file.
    - Hasil `npm run lint`.
    - Hash & pesan commit lokal (belum di-push).
    - Isi migration SQL yang menunggu di-apply manual oleh saya (kalau ada).
    - Temuan di luar scope (kalau ada).

---

## DAFTAR TASK (urut prioritas: Kritis → Rendah)

### Task 1 — [KRITIS] Jadikan pembayaran cicilan utang satu operasi atomik

**Masalah:** `bayarMutation` di `Utang.tsx` melakukan 2 write terpisah tanpa transaksi: insert ke `biaya` (kategori "CICILAN UTANG") lalu update `utang.sisa_bulan`/`status`. Kalau write kedua gagal setelah yang pertama sukses, tercatat biaya cicilan tanpa `sisa_bulan` berkurang.

**Target perbaikan:**
- Buat RPC Postgres (mis. `bayar_cicilan_utang(p_utang_id bigint)`) yang melakukan kedua operasi (insert `biaya` + update `utang`) dalam satu transaksi SQL (fungsi plpgsql biasa sudah atomik per-invocation, tidak perlu `BEGIN/COMMIT` manual). Fungsi ini yang menghitung `newSisa`/`newStatus` di server (bukan dikirim dari client), untuk sekaligus menutup celah race condition di Task 2.
- Ganti `bayarMutation` di `Utang.tsx` supaya memanggil RPC ini (`supabase.rpc('bayar_cicilan_utang', { p_utang_id: u.id })`) alih-alih dua panggilan `.insert()`/`.update()` terpisah.
- RPC mengembalikan baris `utang` terbaru (`sisa_bulan`, `status`) supaya `onSuccess` di frontend tetap bisa menampilkan pesan "Sisa: X bulan" tanpa perlu refetch tambahan.

**Batasan eksplisit:** Jangan ubah kategori "CICILAN UTANG" atau field lain yang ditulis ke `biaya`. Jangan ubah logika `calculateSisaBulan` (perhitungan tenor saat create/edit utang) — itu di luar scope task ini.

**Acceptance criteria:**
- Simulasikan RPC gagal di tengah jalan (mis. matikan sementara salah satu bagian) → tidak ada baris `biaya` "CICILAN UTANG" yang tercatat tanpa `sisa_bulan` ikut berkurang, dan sebaliknya.
- Alur bayar cicilan normal dari UI tetap menampilkan toast sukses dengan sisa bulan yang benar.

---

### Task 2 — [KRITIS] Neraca (Kas/Piutang/Utang/Modal) di Laporan Keuangan harus "as of" akhir periode terpilih, bukan all-time real-time

**Masalah:** Di RPC `get_dashboard_metrics`, field `kas`, `piutang`, `utang` (bagian biaya), dan `modal` tidak difilter `bulan = p_periode` — menjumlahkan seluruh histori tanpa batas tanggal, sehingga memilih bulan lampau di dropdown Laporan tidak mengubah angka Neraca (selalu posisi hari ini).

**Prasyarat:** Task ini **menunggu** Task 1 di `PERBAIKAN_TAB_TAGIHAN.md` (migrasi kunci `payment_status` ke `pelanggan_id`) selesai & sudah di-apply ke database oleh saya. Kalau belum, STOP di Gate 0 dan laporkan status ketergantungan ini — jangan mengerjakan RPC ini di atas skema kunci lama yang akan segera diganti, supaya tidak ada dua migration yang saling tumpang tindih mengubah fungsi yang sama.

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0):**
- Definisi "as of akhir periode" yang benar: apakah `kas`/`piutang`/`utang` untuk periode `p_periode` dihitung dari SEMUA transaksi dengan tanggal `<= akhir bulan p_periode` (kumulatif sampai akhir periode itu, definisi Neraca yang standar), ATAU ada definisi lain yang saya maksud? Konfirmasi dulu sebelum menulis SQL-nya.
- Apakah perbaikan taktis ini cukup untuk sekarang (masih full-scan tabel `nota`/`biaya` tapi dengan filter tanggal `<=`), atau saya ingin sekalian menunda task ini sampai `TUTUP_BUKU_PLAN.md` (`saldo_tahunan`) dikerjakan? Ini keputusan prioritas saya, bukan agent.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:**
> - Definisi "as of" → **kumulatif `<= akhir bulan p_periode`** (definisi Neraca standar). Tidak ada definisi lain.
> - Prioritas → **perbaiki sekarang** (jangan tunggu `TUTUP_BUKU_PLAN.md`), TAPI desain migration harus **mudah digantikan oleh `saldo_tahunan` nanti** — dokumentasikan di komentar SQL bahwa ini perbaikan taktis/sementara yang akan digantikan tutup buku. Jangan membuat perubahan yang akan menyulitkan migrasi ke `saldo_tahunan` di masa depan.

**Target perbaikan (setelah pertanyaan terjawab & prasyarat terpenuhi):**
- Migration baru untuk `get_dashboard_metrics`: ubah subquery `kas`, `piutang`, `utang` (bagian `biaya_calc`), dan `modal` supaya menyertakan filter tanggal `<=` akhir bulan `p_periode` (bukan cuma `= p_periode`), sesuai definisi yang dikonfirmasi.
- `active_utang` (dari `utang_pinjaman`) sudah punya filter `inserted_at <=` — pastikan konsisten dengan definisi "as of" yang sama, sesuaikan kalau perlu.
- Jangan ubah bagian `omset`/`hpp`/`adm`/`laba` yang sudah benar difilter per bulan.

**Batasan eksplisit:** Jangan implementasikan `saldo_tahunan`/tutup buku di task ini — itu domain `TUTUP_BUKU_PLAN.md`, dokumen terpisah, dan butuh persetujuan saya secara terpisah.

**Acceptance criteria:**
- Pilih bulan lampau di Laporan Keuangan → angka Kas/Piutang/Utang/Modal berubah mengikuti posisi "as of akhir bulan tersebut", bukan selalu sama dengan hari ini.
- Pilih bulan berjalan (bulan sekarang) → angka Neraca sama seperti sebelum perbaikan (tidak ada regresi untuk kasus yang paling sering dipakai).
- Bandingkan manual 2-3 bulan sampel data lama vs perhitungan manual dari `biaya`/`nota` untuk verifikasi.

---

### Task 3 — [TINGGI] Cegah double-submit pada tombol "Bayar" cicilan

**Masalah:** Tombol Bayar di `Utang.tsx` tidak di-`disabled` berdasarkan status mutation berjalan — dobel klik cepat berpotensi memicu dua eksekusi.

**Catatan:** Kerjakan task ini **setelah** Task 1 selesai (karena begitu Task 1 selesai, race condition-nya sudah tertutup lewat RPC atomik — task ini murni soal UX pencegahan double-submit di sisi client sebagai lapisan tambahan, bukan lagi soal integritas data).

**Target perbaikan:**
- Tambahkan `disabled={bayarMutation.isPending}` (atau state loading sejenis) pada tombol "Bayar" per baris, plus indikator visual (misal teks berubah jadi "Memproses...") selama mutation berjalan.

**Acceptance criteria:** Klik cepat berulang pada tombol Bayar untuk baris yang sama hanya memicu satu request; tombol nonaktif sesaat setelah diklik sampai selesai.

---

### Task 4 — [TINGGI] Ganti pola Simpan Absensi dari delete+insert menjadi upsert, dengan pelaporan error per-karyawan

**Masalah:** `handleSaveAbsensi` menjalankan `delete()` lalu `insert()` terpisah per karyawan lewat `Promise.all` paralel. Kalau `insert` satu karyawan gagal setelah `delete`-nya sukses, absensi karyawan itu hilang tanpa keterangan jelas siapa yang gagal.

**Sebelum eksekusi, agent WAJIB mengecek dulu (laporkan di Gate 0):** apakah ada UNIQUE constraint pada `(tanggal, karyawan_id)` di tabel `absensi` saat ini. Kalau belum ada, ini prasyarat untuk `upsert` bekerja benar dengan `onConflict`.

**Target perbaikan:**
1. Kalau belum ada UNIQUE constraint → siapkan migration untuk menambahkannya (tampilkan dulu, jangan langsung apply, sesuai aturan kerja no. 3). Sebelum migration dibuat, jalankan skrip verifikasi read-only untuk memastikan tidak ada duplikat existing di `(tanggal, karyawan_id)` yang akan membuat constraint gagal dibuat — laporkan hasilnya.
2. Ganti `handleSaveAbsensi` dari pola delete+insert menjadi satu panggilan `supabase.from('absensi').upsert(rows, { onConflict: 'tanggal,karyawan_id' })` dengan `rows` berisi seluruh entri karyawan sekaligus (bukan `Promise.all` per-karyawan).
3. Tangani `{ error }` hasil upsert dengan pesan yang jelas (bukan generik) kalau gagal.

**Batasan eksplisit:** Jangan ubah opsi status kehadiran (`Hadir`/`Izin`/`Alpa`/`Libur`) atau UI tabel absensi.

**Acceptance criteria:**
- Simpan absensi untuk beberapa karyawan sekaligus, termasuk yang sudah punya entri hari itu (update) dan yang belum (insert baru) → semua tersimpan benar dalam satu operasi.
- Simulasikan kegagalan (mis. matikan koneksi di tengah proses) → tidak ada kondisi "data terhapus tapi tidak tergantikan"; upsert bersifat all-or-nothing per request.

---

### Task 5 — [TINGGI] Samakan aturan pengecualian nota Flat antara edge function `gaji-hitung` dan fallback client `hitungGajiLokal`

**Masalah:** Edge function mengecualikan nota dari kalkulasi kg kalau `tipe pelanggan === HOTEL && billing === FLAT && jenis === FLAT`. Fallback client (`hitungGajiLokal` di `AbsensiGaji.tsx`) cuma cek `billing === FLAT && jenis === FLAT` (tanpa syarat HOTEL) — hasil gaji borongan bisa beda tergantung jalur mana yang kebetulan jalan.

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0):** Aturan mana yang benar secara bisnis — apakah pengecualian nota Flat dari kalkulasi kg memang seharusnya hanya berlaku untuk pelanggan tipe HOTEL (seperti di edge function), atau seharusnya berlaku untuk semua tipe pelanggan dengan billing Flat (seperti di fallback lokal)? Jangan asumsikan salah satu benar — dua-duanya sudah ada di produksi dan mungkin salah satunya yang justru salah.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** Aturan yang benar adalah **edge function** — pengecualian nota Flat dari kalkulasi kg hanya berlaku untuk pelanggan **tipe HOTEL dengan billing FLAT** (`tipe === HOTEL && billing === FLAT && jenis === FLAT`). Ini adalah kustomisasi per pelanggan: pelanggan hotel yang menggunakan billing flat tidak dihitung kilogramnya. **Fallback lokal (`hitungGajiLokal`) yang perlu diperbaiki** — tambahkan syarat `tipe === HOTEL` yang selama ini hilang.

**Target perbaikan (setelah aturan bisnis dikonfirmasi):**
- Samakan logika pengecualian di kedua tempat sesuai jawaban di atas.
- Sebagai perbaikan struktural (diizinkan eksplisit untuk task ini): pertimbangkan memindahkan fallback `hitungGajiLokal` supaya memanggil logika yang SAMA dengan edge function — kalau tidak memungkinkan dalam waktu terbatas (edge function pakai Deno, frontend pakai browser), minimal ekstrak aturan pengecualian ini ke satu konstanta/fungsi kecil yang didokumentasikan jelas di kedua file dengan komentar "HARUS SAMA DENGAN [file lain], baris X" supaya mudah dicek manual kalau salah satu berubah lagi nanti.

**Batasan eksplisit:** Jangan ubah logika kalkulasi upah borongan (`ongkos / hadirBorongan * kg`) atau logika gaji tetap — hanya bagian pengecualian nota Flat ini.

**Acceptance criteria:**
- Hitung gaji periode yang sama dua kali: sekali biarkan edge function jalan normal, sekali paksa fallback lokal jalan (simulasikan edge function gagal) → hasil `totalUpah`/`totalDiterima` untuk semua karyawan **identik** di kedua jalur.

---

### Task 6 — [SEDANG] Cegah status Utang desync dari `sisa_bulan`

**Masalah:** Field `status` (AKTIF/LUNAS) bisa diubah manual lewat dropdown di form edit, padahal `bayarMutation`/RPC (setelah Task 1) men-derive status otomatis dari `sisa_bulan`.

**Target perbaikan:**
- Ubah dropdown `status` di form edit `Utang.tsx` menjadi read-only/tampilan saja (bukan input bebas) — status hanya berubah otomatis lewat proses bayar cicilan (Task 1) atau override manual `sisa_bulan` (lihat Task 7) yang ikut menghitung ulang status saat disimpan.
- Kalau saya ingin tetap ada opsi override manual status untuk kasus khusus (mis. utang dilunasi sekaligus di luar sistem), tanyakan dulu preferensinya — jangan hilangkan kemampuan itu tanpa konfirmasi kalau ternyata itu dipakai untuk skenario nyata.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** **Override manual status tetap ada** untuk kasus khusus (mis. utang dilunasi sekaligus di luar sistem). Implementasi yang tepat: dropdown `status` tetap bisa diedit, TAPI **saat menyimpan** — kalau `sisa_bulan` = 0, sistem otomatis set status ke LUNAS (walau dropdown-nya diisi AKTIF); kalau `sisa_bulan` > 0, set AKTIF. Dengan kata lain: override manual status **melalui `sisa_bulan`** adalah cara yang benar, bukan override dropdown langsung tanpa perubahan `sisa_bulan`.

**Acceptance criteria:** Mengedit `sisa_bulan` secara manual ke 0 dan menyimpan → `status` otomatis berubah jadi LUNAS tanpa perlu diset manual terpisah (dan sebaliknya, konsisten).

---

### Task 7 — [SEDANG] `sisa_bulan` tidak boleh tertimpa diam-diam saat tanggal tenor diedit

**Masalah:** `handleDariChange`/`handleSampaiChange` otomatis menimpa `sisa_bulan` kapan pun tanggal "Mulai"/"Tenor Hingga" diubah, walau pengguna sudah mengisi `sisa_bulan` manual sebelumnya di sesi edit yang sama.

**Target perbaikan:**
- Saat mode edit (`editId` tidak null): jangan auto-overwrite `sisa_bulan` ketika tanggal diubah — tampilkan saja nilai hasil hitung baru sebagai saran/placeholder (mis. teks kecil "Saran: X bulan berdasarkan tanggal baru"), biarkan pengguna yang memutuskan apakah mau menerapkannya ke field `sisa_bulan`.
- Saat mode tambah baru (`!editId`): perilaku auto-hitung yang sudah ada tetap dipertahankan seperti sekarang (field tetap `readOnly` mengikuti tanggal).

**Acceptance criteria:** Buka edit data utang lama, ubah `sisa_bulan` secara manual, lalu ubah tanggal "Tenor Hingga" → nilai `sisa_bulan` yang sudah diisi manual tidak berubah otomatis.

---

### Task 8 — [SEDANG] Tangani error pada `getKop()` di Laporan.tsx dan AbsensiGaji.tsx

**Masalah:** `getKop()` di kedua file memanggil `supabase.from('kop').select('*').limit(1)` tanpa try/catch di pemanggilnya (`handlePrint`, `handleCetakSlip`, `handleDownloadSlip`) — kalau gagal, proses cetak gagal tanpa pesan jelas ke pengguna.

**Target perbaikan:**
- Bungkus pemanggil `getKop()` di keempat fungsi (`handlePrint` di Laporan.tsx; `handleCetakSlip`, `handleDownloadSlip` di AbsensiGaji.tsx) dengan try/catch, tampilkan toast/pesan error yang jelas kalau gagal (Laporan.tsx dan AbsensiGaji.tsx belum tentu punya `useToast` — cek dulu, tambahkan importnya kalau belum ada, jangan pakai `alert()`).

**Batasan eksplisit:** Jangan ubah isi/format dokumen cetak, hanya penanganan error.

**Acceptance criteria:** Simulasikan tabel `kop` bermasalah → cetak Laporan/Slip Gaji menampilkan pesan error yang jelas, bukan gagal diam-diam atau macet.

---

### Task 9 — [RENDAH] Bereskan `lib/keuangan.ts` yang jadi dead code & konsolidasikan sumber kategori HPP/ADM

**Masalah:** `HPP_CATEGORIES`, `ADM_CATEGORIES`, `hitungTagihan`, `checkIsNotaFlat` di `lib/keuangan.ts` tidak diimpor/dipakai di mana pun. Daftar kategori yang benar-benar aktif malah di-hardcode terpisah di SQL `get_dashboard_metrics` dan di `CATEGORIES` (`Pengeluaran.tsx`) — tiga sumber kebenaran berbeda.

**Pertanyaan yang WAJIB dijawab saya sebelum agent mulai (masukkan di Gate 0):** Apakah `hitungTagihan` di file ini memang sudah sepenuhnya digantikan oleh `calculateTotal` versi lokal di `Tagihan.tsx`/`Kuitansi.tsx`/`RiwayatNota.tsx` (aman dihapus), atau ada rencana pemakaian ke depan yang saya tahu tapi belum kelihatan di kode? Jangan hapus fungsi tanpa konfirmasi ini.

> ✅ **KEPUTUSAN SUDAH DIAMBIL:** Kalau `hitungTagihan` memang dead code (tidak ada import aktif di seluruh `src/`) → **hapus saja**, pastikan tidak berdampak ke app. Agent WAJIB memverifikasi dulu dengan grep seluruh `src/` untuk memastikan tidak ada import/pemanggilan tersembunyi, laporkan hasilnya di Gate 0 sebelum menghapus. Jika ditemukan ada yang masih memakainya, STOP dan laporkan ke saya.

**Target perbaikan (setelah dikonfirmasi):**
- Kalau memang dead code dan aman dihapus: hapus `hitungTagihan` dari `lib/keuangan.ts` (fungsi ini saja, bukan seluruh file).
- Pertahankan & jadikan `HPP_CATEGORIES`/`ADM_CATEGORIES` di `lib/keuangan.ts` sebagai **satu-satunya sumber kebenaran** di sisi TypeScript: ganti `CATEGORIES` di `Pengeluaran.tsx` untuk meng-import dari sini (gabungan `HPP_CATEGORIES` + `ADM_CATEGORIES`, plus kategori non-finansial kalau ada yang tidak masuk keduanya — cek dulu apakah semua 15 kategori di `Pengeluaran.tsx` saat ini benar-benar terklasifikasi HPP/ADM tanpa sisa).
- Untuk SQL `get_dashboard_metrics`: **jangan diubah di task ini** kecuali sebagai catatan komentar SQL yang merujuk ke `lib/keuangan.ts` sebagai sumber kebenaran daftar kategori (SQL tetap hardcode karena tidak bisa langsung import dari TS, tapi minimal didokumentasikan supaya kalau kategori berubah, ada jejak "juga update RPC ini").

**Batasan eksplisit:** Jangan ubah SQL function `get_dashboard_metrics` selain menambah komentar. Jangan ubah `checkIsNotaFlat` di file-file yang sudah punya versi lokalnya masing-masing (itu di luar scope task ini, sudah dicatat sebagai temuan terpisah di analisis tab Tagihan).

**Acceptance criteria:**
- `Pengeluaran.tsx` tetap menampilkan 15 kategori yang sama seperti sebelumnya, sekarang bersumber dari `lib/keuangan.ts`.
- `npm run lint`/build tidak error karena import yang berubah.

---

### Task 10 — [RENDAH] Bersihkan import yang tidak terpakai

**Target perbaikan:** Hapus import `formatCurrencyInput`, `parseCurrencyValue` yang tidak dipakai langsung di `Pengeluaran.tsx` dan `Utang.tsx` (cek dulu betul-betul tidak dipakai di file itu sebelum menghapus).

**Acceptance criteria:** `npm run lint` tidak error, tidak ada perubahan perilaku aplikasi.

---

## TIDAK TERMASUK DALAM DOKUMEN INI (sengaja tidak dijadikan task)

- **Perbaikan kunci `payment_status` dari nama ke `pelanggan_id`** — sudah dicakup Task 1 di `PERBAIKAN_TAB_TAGIHAN.md`, jangan diduplikasi di sini.
- **Implementasi `saldo_tahunan`/tutup buku penuh** — domain `TUTUP_BUKU_PLAN.md`, dokumen & persetujuan terpisah.
- **Perubahan siapa yang boleh mengakses tab Keuangan** (tetap admin-only via `AdminRoute`, tidak diubah oleh dokumen ini).
- **Duplikasi `calculateTotal`/`checkIsNotaFlat` di tab Tagihan** — dicatat di analisis tab Tagihan, bukan tab Keuangan, tidak dikerjakan dari dokumen ini.

Kalau nanti agent atau saya ingin menambah task baru untuk tab Keuangan, tambahkan sebagai task baru di dokumen ini, jangan bikin dokumen `.md` terpisah untuk tab yang sama.
