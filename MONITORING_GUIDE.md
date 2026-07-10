# Monitoring Guide

Panduan singkat untuk developer dalam memantau aplikasi Pelangi Laundry.

## Checklist Monitoring

- [ ] **Cara cek error log di dashboard Cloudflare Pages:**
  1. Buka dashboard Cloudflare.
  2. Buka project Pages Anda.
  3. Pergi ke tab **Deployments** dan klik deployment terbaru untuk melihat log, atau tab **Functions** untuk log API/Pages Functions jika digunakan.

- [ ] **Cara cek Auth & Postgres logs di dashboard Supabase:**
  1. Buka dashboard project Anda di Supabase.
  2. Di sidebar kiri, klik menu **Logs**.
  3. Anda dapat memilih **Auth Logs** untuk pantauan login/register, dan **Postgres Logs** untuk error query database.

- [ ] **Prosedur Rollback Deployment di Cloudflare:**
  1. Buka project Pages Anda di Cloudflare.
  2. Klik tab **Deployments**.
  3. Cari versi deployment sebelumnya yang diketahui berfungsi dengan baik.
  4. Klik ikon titik tiga pada baris deployment tersebut, lalu pilih **Rollback**.
