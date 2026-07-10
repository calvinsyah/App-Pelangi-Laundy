# Prompt: Eksekusi AGENTS.md Sampai Selesai

> Cara pakai: buka repo ini di Claude Code (atau agent lain) dari root folder, lalu tempel prompt di bawah ini sebagai instruksi pertama. Pastikan `AGENTS.md` dan `SECURITY.md` sudah ada di root repo sebelum menjalankan.

---

```
Baca file AGENTS.md di root repo ini sampai tuntas sebelum melakukan apa pun. File itu adalah sumber kebenaran untuk konteks proyek, larangan, dan checklist tugas yang perlu dikerjakan.

Tugasmu: jalankan SEMUA item di §6 (Tugas Pembersihan Repo) pada AGENTS.md secara berurutan, sampai selesai, dengan aturan berikut:

ATURAN KERJA
1. Kerjakan satu sub-bagian dalam satu waktu (6.1 → 6.2 → 6.3 → 6.5 → 6.6), dalam urutan itu. LEWATI 6.4 (penghapusan riwayat Git) — jangan dikerjakan otomatis, cukup laporkan langkahnya di akhir sebagai rekomendasi manual, karena bersifat destruktif (mengubah histori Git + butuh force-push) dan wajib saya setujui secara eksplisit dan terpisah.
2. Sebelum menghapus file apa pun (index.html, script.js, style.css, file .bak, folder "file update/", "versi_lama/"), verifikasi dulu bahwa file tersebut memang tidak dipakai oleh build aktif (cek referensi di src/main.tsx, vite.config, dan index.html root) — laporkan hasil verifikasi sebelum menghapus.
3. Jangan pernah menuliskan kredensial (password, API key) ke file apa pun, termasuk commit message, comment, atau log kerja. Saat membersihkan note.txt (6.3), ganti isinya dengan catatan kerja biasa tanpa kredensial — JANGAN hapus filenya sepenuhnya kecuali saya minta, cukup hilangkan bagian kredensialnya.
4. Setiap kali membuat/mengubah migration database (kalau relevan di langkah lain), ikuti format penomoran yang sudah ada di supabase/migrations/.
5. Setelah 6.1–6.3 selesai, jalankan `npm run lint` dan pastikan tidak ada error baru akibat perubahanmu, sebelum lanjut ke commit (6.5).
6. Tulis pesan commit dalam Bahasa Indonesia, jelas, per-langkah (jangan digabung jadi satu commit raksasa) — misal commit terpisah untuk "hapus file legacy", "perbaiki .env.example", "bersihkan note.txt".
7. JANGAN push otomatis. Setelah semua commit siap secara lokal, berhenti dan tunggu saya review sebelum `git push`.
8. Untuk 6.6 (LICENSE), jangan pilih lisensi sendiri — tanyakan preferensi saya dulu (MIT vs tanpa lisensi eksplisit) sebelum membuat filenya.

SETELAH SELESAI, LAPORKAN:
- Daftar file yang dihapus/diubah per langkah, dengan alasan singkat.
- Hasil verifikasi langkah 2 (bukti bahwa file yang dihapus memang tidak dipakai build aktif).
- Output `npm run lint` setelah perubahan.
- Daftar commit yang sudah dibuat secara lokal (belum di-push), dengan hash & pesan commit masing-masing.
- Ringkasan langkah 6.4 yang PERLU saya setujui manual, termasuk perintah persis yang harus dijalankan dan risikonya (rujuk ke penjelasan destruktif di AGENTS.md §6.4 dan SECURITY.md temuan #1).
- Rekomendasi apakah checklist §6 di AGENTS.md sudah bisa dianggap selesai, atau ada item yang perlu saya putuskan lebih dulu.

Jika di tengah proses kamu menemukan sesuatu yang ambigu, tidak sesuai dengan yang dijelaskan di AGENTS.md, atau berisiko (misalnya ternyata file yang katanya "legacy" ternyata masih dirujuk di suatu tempat), STOP dan tanyakan ke saya sebelum melanjutkan — jangan menebak.
```

---

## Prompt Lanjutan (opsional) — Setelah §6 Selesai

Kalau ingin lanjut ke perbaikan keamanan di `SECURITY.md` setelah housekeeping selesai, gunakan prompt terpisah ini (jangan digabung dengan yang di atas, supaya agent tidak mengerjakan terlalu banyak sekaligus):

```
Baca SECURITY.md di root repo. Kerjakan perbaikan sesuai "Urutan Prioritas Perbaikan" mulai dari prioritas 3 (perbaikan AuthContext.tsx) — prioritas 1 dan 2 (ganti password, hapus note.txt dari histori) saya tangani manual sendiri karena menyangkut kredensial dan riwayat Git.

Untuk setiap temuan yang kamu perbaiki:
1. Tunjukkan dulu diff yang direncanakan sebelum mengeksekusi, kalau perubahan menyangkut kebijakan RLS (SQL) atau logika otorisasi — ini berdampak langsung ke keamanan data produksi.
2. Buat migration SQL baru (jangan edit migration lama) dengan penomoran lanjutan dari file terakhir di supabase/migrations/.
3. Setelah perbaikan kode (bukan SQL), jalankan npm run lint sebelum commit.
4. Commit terpisah per temuan, dengan referensi nomor temuan dari SECURITY.md di pesan commit (contoh: "fix(security): temuan #2 - hapus hardcode email admin di AuthContext").
5. Jangan jalankan migration ke database produksi/staging secara otomatis — cukup siapkan file migration-nya, saya yang akan apply manual lewat Supabase CLI/dashboard.

Berhenti setelah setiap temuan selesai dikerjakan dan laporkan hasilnya, jangan lanjut ke temuan berikutnya tanpa konfirmasi saya — karena ini menyangkut sistem yang sudah dipakai untuk data finansial nyata.
```
