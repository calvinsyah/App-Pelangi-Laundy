# 🤝 Panduan Serah Terima (Handoff Document)
**Aplikasi Pelangi Laundry**

Dokumen ini ditulis dengan bahasa yang sangat sederhana (beginner-friendly) agar pemilik aplikasi atau programmer baru dapat memahami bagaimana aplikasi ini bekerja, apa saja risikonya, dan bagaimana cara memodifikasinya dengan aman di masa depan.

---

## 1. Peta File (File Map)
Bagian ini menjelaskan di mana Anda bisa menemukan file-file penting pembentuk aplikasi.

* **File/Folder Terkait:**
  * `src/pages/` : Kumpulan file untuk tampilan halaman (misal: halaman Kasir, Gaji, Master Data).
  * `src/components/` : Potongan tampilan yang dipakai berulang kali (misal: Tombol, Form, Menu Samping/Sidebar).
  * `supabase/` : File konfigurasi dan *database* (termasuk aturan keamanan).
* **Fungsi Singkat:** 
  Menyimpan struktur visual dan kerangka aplikasi. Ibarat membangun rumah, ini adalah denah kamar dan perabotannya.
* **Risiko yang Perlu Dicek:** 
  Menghapus file di dalam folder `src/pages/` secara tidak sengaja dapat membuat menu tertentu di aplikasi menjadi "Not Found" atau *blank putih*.
* **Cara Aman Mengubahnya:** 
  Jika Anda ingin mengubah warna, teks, atau letak tombol, carilah file berakhiran `.tsx` di folder `src/pages/`. Lakukan perubahan kecil, lalu lihat hasilnya di komputer lokal (jalankan `npm run dev`). Jika gagal atau tampilannya berantakan, gunakan tombol *Undo* (Ctrl+Z) di editor Anda sebelum menyimpannya.

---

## 2. Alur Data (Data Flow)
Bagian ini menjelaskan bagaimana data kasir/nota dikirim dari layar ke tempat penyimpanan (*database*).

* **File Terkait:** 
  * `src/lib/supabase.ts` (konektor ke database)
  * `src/pages/transaksi/InputNota.tsx` (layar input kasir)
  * `supabase/functions/nota-create/` (fungsi pemeriksa di sisi server)
* **Fungsi Singkat:** 
  Mengatur jembatan pengiriman data. Saat tombol "Simpan" diklik di layar, aplikasi akan membungkus data cucian tersebut dan mengirimkannya ke server Supabase untuk disimpan secara permanen.
* **Risiko yang Perlu Dicek:** 
  Jika Anda menambah kolom isian baru di layar (misalnya isian "Diskon Khusus") tetapi lupa menambahkan kolom tersebut di tabel Supabase, aplikasi akan *error* saat Anda mencoba menyimpan data.
* **Cara Aman Mengubahnya:** 
  Tambahkan kolom baru di *database* Supabase terlebih dahulu (via dashboard Supabase). Setelah database siap menerima data baru, barulah ubah kode di aplikasi (`InputNota.tsx`) agar mengirimkan data sesuai dengan kolom yang baru dibuat.

---

## 3. Alur Login & Akses (Auth Flow)
Bagian ini mengatur siapa saja yang boleh masuk dan apa yang boleh mereka lihat.

* **File Terkait:** 
  * `src/components/AuthContext.tsx`
  * `src/App.tsx`
  * File berakhiran `.sql` di dalam folder `supabase/migrations/`
* **Fungsi Singkat:** 
  Bertindak sebagai "Satpam" aplikasi. Memastikan bahwa Karyawan biasa hanya bisa mengakses fitur kasir, sedangkan Admin (Pemilik) bisa mengakses menu sensitif seperti Laporan Keuangan dan Penggajian.
* **Risiko yang Perlu Dicek:** 
  Mengotak-atik file keamanan ini bisa sangat berbahaya. Jika salah ketik, karyawan biasa mungkin bisa menembus masuk dan melihat laporan gaji atau bahkan menghapus data keuangan perusahaan.
* **Cara Aman Mengubahnya:** 
  Jangan pernah menulis email atau *password* secara langsung (hardcode) ke dalam file kode aplikasi. Biarkan aplikasi membaca peran (*role*) langsung dari database. Jika Anda ingin mengubah hak akses, ubahlah via fitur RLS (Row Level Security) yang ada di panduan SQL, bukan mengubah logika if/else di frontend.

---

## 4. Peta Risiko (Risk Map)
Bagian ini memetakan area mana saja di dalam aplikasi yang paling rentan terhadap masalah jika diubah sembarangan.

* **File Terkait:** 
  * `src/lib/printUtils.ts` (fitur cetak struk/kuitansi)
  * `supabase/functions/gaji-hitung/` (logika penghitungan upah borongan)
* **Fungsi Singkat:** 
  Fungsi-fungsi kritis. `printUtils` mengubah data tak kasat mata menjadi struk fisik di printer, sedangkan `gaji-hitung` menentukan seberapa besar upah yang akan diterima karyawan.
* **Risiko yang Perlu Dicek:** 
  Sistem cetak struk rentan terhadap injeksi kode jahat (XSS) jika pelanggan memberi nama yang mengandung simbol pemrograman. Sedangkan penghitung gaji rentan terhadap "salah hitung massal" jika rumus pembagiannya tidak sengaja terhapus.
* **Cara Aman Mengubahnya:** 
  * **Struk Cetak:** Jika ingin mengubah desain cetakan, pastikan variabel nama/alamat pelanggan dibungkus dalam fungsi `escapeHtml(...)` agar simbol berbahaya dinetralkan (seperti yang sudah diterapkan saat ini).
  * **Gaji:** Jangan pernah menguji perubahan rumus gaji langsung pada *database* produksi (asli). Selalu jalankan di *environment* lokal (komputer sendiri) dan uji dengan angka contoh sebelum diunggah (*deploy*).

---

## 5. Panduan Mengubah Kode (Change Guide)
Langkah-langkah baku jika suatu saat Anda mempekerjakan *programmer* baru atau ingin bereksperimen sendiri.

* **File Terkait:** 
  * `package.json` (daftar alat bantu/library eksternal)
  * `.env` (berisi kunci rahasia penyambung aplikasi)
* **Fungsi Singkat:** 
  Menyimpan pengaturan dasar mesin penggerak aplikasi dan daftar alat bantu (seperti *library* kalender, grafik) yang di-*install*.
* **Risiko yang Perlu Dicek:** 
  File `.env` berisi kunci (API Key) ke *database* Anda. Jika file ini tidak sengaja terunggah ke tempat umum (seperti GitHub publik), peretas bisa mengambil alih data Anda. Selain itu, meng-install terlalu banyak library di `package.json` bisa membuat aplikasi menjadi lelet.
* **Cara Aman Mengubahnya:** 
  1. Pastikan file `.env` selalu masuk ke dalam daftar pengecualian di file `.gitignore`.
  2. Gunakan perintah Git cabang baru (`git checkout -b fitur-baru`) jika ingin mencoba membuat fitur. Jangan langsung mengubah kode di cabang utama (`main`).
  3. Setelah fitur baru selesai dan sukses berjalan di komputer Anda, jalankan `npm run build` dan `npm run lint` untuk memastikan tidak ada *error* tersembunyi sebelum kode diserahkan ke *server* utama.
