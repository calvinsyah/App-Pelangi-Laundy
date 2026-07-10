Berdasarkan analisis mendalam terhadap struktur kode, logika bisnis, dan konfigurasi backend pada repository `calvinsyah/App-Pelangi-Laundy`, saya menyusun dokumen analisis keamanan lengkap. Aplikasi Anda memiliki **beberapa kerentanan kritis** yang harus segera ditangani, terutama mengingat aplikasi ini mengelola data finansial (keuangan, gaji, utang).

Berikut adalah file Markdown (`SECURITY_FIX.md`) yang siap Anda simpan di repository.

---

````markdown
# 🔒 Keamanan Kode & Perbaikan (Security Fix)

### Aplikasi Pelangi Laundry (App-Pelangi-Laundy)

> Repo: https://github.com/calvinsyah/App-Pelangi-Laundy
> Stack: React 19 · TypeScript · Vite · Supabase (PostgreSQL, Auth, RLS, Edge Functions)
> Tanggal Analisis: 2026-07-10

---

## 1. Ringkasan Eksekutif (Executive Summary)

Secara fungsional, aplikasi sudah dapat berjalan, namun dari perspektif keamanan terdapat **celah kritis (Critical Vulnerabilities)** yang dapat dieksploitasi oleh pengguna biasa (role `user`) untuk mengakses atau memanipulasi data finansial.

**3 Ancaman Terbesar (Top 3 Threats):**

1. **Client-Side Authorization Bypass:** Penentuan status admin dilakukan di frontend (`AuthContext.tsx`) berdasarkan email. Pengguna biasa dapat dengan mudah memodifikasi kode di browser mereka untuk menjadi admin dan mengakses halaman keuangan/gaji.
2. **Row Level Security (RLS) Tidak Lengkap:** File migrasi `003_enable_rls_semua_tabel.sql` mengaktifkan RLS namun hanya mendefinisikan policy untuk 3 tabel (`nota`, `gaji`, `karyawan`). Tabel finansial lain seperti `biaya`, `utang`, dan `pengaturan` terbuka untuk diakses oleh semua pengguna yang terautentikasi.
3. **Cross-Site Scripting (XSS) via Print Utility:** Fungsi cetak kuitansi/tagihan (`printUtils.ts`) menggunakan `document.write()` tanpa melakukan _sanitization_ terhadap input pengguna (nama pelanggan, alamat), memungkinkan eksekusi script jahat.

Dokumen ini merinci kerentanan tersebut dan memberikan solusi perbaikan (fix) yang langsung dapat diimplementasikan.

---

## 2. Daftar Kerentanan (Vulnerability Index)

| #   | Kerentanan                                       | Lokasi                                    | Severity (CVSS) | Status |
| --- | ------------------------------------------------ | ----------------------------------------- | --------------- | ------ |
| 1   | Client-Side Admin Role Bypass                    | `src/components/AuthContext.tsx`          | 🔴 Kritis (8.1) | Open   |
| 2   | Missing RLS Policies on Financial Tables         | `supabase/migrations/003_enable...sql`    | 🔴 Kritis (7.5) | Open   |
| 3   | Edge Function Missing Role Validation            | `supabase/functions/gaji-hitung/index.ts` | 🔴 Kritis (7.5) | Open   |
| 4   | Bypassing Server-Side Validation (Direct Insert) | `src/pages/transaksi/InputNota.tsx`       | 🟠 Tinggi (6.5) | Open   |
| 5   | DOM-Based Cross-Site Scripting (XSS)             | `src/lib/printUtils.ts`                   | 🟠 Tinggi (6.1) | Open   |
| 6   | Unhandled Error Leakage                          | `src/components/ToastProvider.tsx`        | 🟡 Sedang (4.3) | Open   |
| 7   | Sensitive Data in LocalStorage/State             | `src/App.tsx`                             | 🟡 Sedang (4.0) | Open   |

---

## 3. Detail Kerentanan & Solusi (Detailed Fixes)

### 🔴 1. Client-Side Admin Role Bypass

**Lokasi:** `src/components/AuthContext.tsx:36-38`
**Deskripsi:**
Logika menentukan apakah pengguna adalah admin dilakukan dengan mengecek email di sisi klien.

```ts
// KODE RENTAN
const rawRole = (user?.user_metadata?.role as "admin" | "user") || "user";
const role = user?.email === "admin@email.com" ? "admin" : rawRole;
const isAdmin = role === "admin";
```
````

Pengguna biasa dapat membuka DevTools, mengubah state React, atau memodifikasi `user_metadata` (jika RLS untuk tabel profiles longgar) untuk mengakses komponen `<AdminRoute>` dan melihat data gaji/keuangan.

**Solusi / Fix:**

1. Hapus pengecekan email di frontend. Frontend hanya boleh membaca role dari database/Supabase Auth.
2. Pastikan role `admin` hanya bisa di-set oleh admin lain atau superadmin di Supabase Dashboard.
3. **Wajib:** Kunci tabel `profiles` dengan RLS ketat (lihat poin #2).

```ts
// PERBAIKAN (AuthContext.tsx)
const rawRole = (user?.user_metadata?.role as "admin" | "user") || "user";
const isAdmin = rawRole === "admin"; // Hilangkan pengecekan email!
```

---

### 🔴 2. Missing RLS Policies on Financial Tables

**Lokasi:** `supabase/migrations/003_enable_rls_semua_tabel.sql`
**Deskripsi:**
RLS diaktifkan pada 18 tabel, tetapi policy (kebijakan) hanya dibuat untuk `nota`, `gaji`, dan `karyawan`. Saat RLS diaktifkan tanpa policy, tabel akan terkunci (amannya). NAMUN, jika tabel seperti `biaya`, `utang`, `pengaturan` memiliki policy default atau policy `authenticated` yang longgar, user biasa bisa membaca/mengubah data finansial.

**Solusi / Fix:**
Buat file migrasi baru `006_tambah_kebijakan_rls_finansial.sql` dan jalankan di Supabase.

```sql
-- 006_tambah_kebijakan_rls_finansial.sql

-- Tabel: biaya (Pengeluaran)
-- User hanya bisa lihat, Admin bisa CRUD
CREATE POLICY "biaya_select_authenticated" ON biaya
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "biaya_modify_admin_only" ON biaya
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tabel: utang
CREATE POLICY "utang_select_authenticated" ON utang
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "utang_modify_admin_only" ON utang
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tabel: pengaturan (Hanya Admin yang boleh melihat/mengubah setting harga/pajak)
CREATE POLICY "pengaturan_admin_only" ON pengaturan
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tabel: absensi
CREATE POLICY "absensi_select_authenticated" ON absensi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "absensi_modify_admin_only" ON absensi
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

### 🔴 3. Edge Function Missing Role Validation

**Lokasi:** `supabase/functions/gaji-hitung/index.ts`
**Deskripsi:**
Edge function ini menghitung gaji karyawan. Fungsi ini memverifikasi bahwa pengguna terautentikasi (`auth.getUser()`), tetapi **tidak memverifikasi apakah pengguna adalah admin**. Jika user biasa mengetahui endpoint fungsi ini, mereka bisa menghitung dan melihat gaji semua karyawan.

**Solusi / Fix:**
Tambahkan pengecekan role dari tabel `profiles` di dalam Edge Function.

```ts
// PERBAIKAN (supabase/functions/gaji-hitung/index.ts)
// Setelah auth.getUser() sukses...

const { data: profileData, error: profileErr } = await supabaseClient
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (profileErr || !profileData) {
  throw new Error("Profil pengguna tidak ditemukan");
}

if (profileData.role !== "admin") {
  return new Response(
    JSON.stringify({
      error: "Akses ditolak. Hanya admin yang bisa menghitung gaji.",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// Lanjutkan dengan logika penghitungan gaji...
```

---

### 🟠 4. Bypassing Server-Side Validation (Direct Insert)

**Lokasi:** `src/pages/transaksi/InputNota.tsx:248`
**Deskripsi:**
Anda memiliki Edge Function `nota-create` yang berisi validasi server-side (qty > 0, dll). Namun, di `InputNota.tsx`, Anda **tidak memanggil** edge function tersebut dan langsung melakukan insert ke database.

```ts
// KODE RENTAN
const { error: notaErr } = await supabase
  .from("nota")
  .insert([{ ...notaData, nota_id }]);
```

Pengguna jahat bisa memodifikasi request payload di network tab (misalnya set `total: -1000` atau `qty: null`) dan mengirimkannya langsung ke Supabase, melewati validasi UI.

**Solusi / Fix:**
Opsi A (Disarankan): Gunakan Edge Function yang sudah ada.

```ts
// PERBAIKAN (InputNota.tsx)
try {
  const { data, error } = await supabase.functions.invoke("nota-create", {
    body: { tanggal, pelanggan_id, jenis_nota_id, berat_kg, items, isFlat },
  });
  if (error) throw error;
  toast("Nota berhasil disimpan!", "success");
} catch (err) {
  // handle error
}
```

Opsi B: Tambahkan _Database Constraint_ di PostgreSQL untuk mencegah nilai negatif/null.

```sql
ALTER TABLE nota ADD CONSTRAINT chk_total_positive CHECK (total >= 0);
```

---

### 🟠 5. DOM-Based Cross-Site Scripting (XSS)

**Lokasi:** `src/lib/printUtils.ts:27, 37`
**Deskripsi:**
Fungsi `openPrintWindow` dan `downloadHTML` menyuntikkan (inject) string HTML ke jendela baru menggunakan `document.write()`.

```ts
// KODE RENTAN
const fullHtml = `<html><head><title>${title}</title></head><body>${html}</body></html>`;
printWindow.document.write(fullHtml);
```

Jika `html` mengandung nama pelanggan seperti `<script>alert('XSS')</script>`, script tersebut akan dieksekusi di browser.

**Solusi / Fix:**
Lakukan _HTML Escaping_ pada semua data yang diambil dari database sebelum dimasukkan ke template HTML. Buat fungsi utility `escapeHtml`.

```ts
// TAMBAHKAN di src/lib/utils.ts
export const escapeHtml = (unsafe: string): string => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// GUNAKAN di printUtils.ts saat membangun HTML
// Contoh:
const namaPelanggan = escapeHtml(pel.nama);
const alamat = escapeHtml(pel.alamat);
```

---

### 🟡 6. Unhandled Error Leakage

**Lokasi:** `src/components/ToastProvider.tsx` & multiple pages (e.g., `InputNota.tsx:258`)
**Deskripsi:**
Error dari Supabase atau network langsung ditampilkan ke pengguna via toast.

```ts
// KODE RENTAN
toast(err.message || "Terjadi kesalahan", "error");
```

Pesan error Supabase terkadang mengandung informasi skema database yang sensitif (misal: `violates foreign key constraint "nota_pelanggan_id_fkey"`).

**Solusi / Fix:**
Buat pemetaan pesan error. Jangan tampilkan `err.message` secara mentah.

```ts
// PERBAIKAN
const getSafeErrorMessage = (err: any): string => {
  const code = err?.code;
  if (code === "23505") return "Data sudah ada (duplikat).";
  if (code === "23503") return "Data referensi tidak valid.";
  if (err.message.includes("JWT expired"))
    return "Sesi habis, silakan login kalu.";
  return "Terjadi kesalahan sistem. Coba lagi.";
};

// Penggunaan:
toast(getSafeErrorMessage(err), "error");
console.error("Detail error asli:", err); // Simpan untuk debugging developer
```

---

## 4. Checklist Penerapan Keamanan (Implementation Checklist)

Tindakan yang harus segera dilakukan oleh developer:

- [ ] **Database:** Jalankan migrasi RLS untuk tabel `biaya`, `utang`, `pengaturan`, `absensi`, dan `pelanggan`.
- [ ] **Database:** Pastikan tabel `profiles` memiliki policy: user hanya bisa update row miliknya sendiri (untuk foto profil, dll), dan tidak bisa mengubah kolom `role`.
- [ ] **Frontend:** Hapus logika `(user?.email === 'admin@email.com')` di `AuthContext.tsx`.
- [ ] **Frontend:** Terapkan `escapeHtml()` di semua fungsi cetak (`printUtils.ts`).
- [ ] **Backend (Edge Function):** Tambahkan validasi `role === 'admin'` di awal eksekusi fungsi `gaji-hitung`.
- [ ] **Frontend:** Ubah cara insert nota agar memanggil Edge Function `nota-create` (atau tambahkan DB constraint).
- [ ] **Frontend:** Sanitasi pesan error Supabase sebelum ditampilkan ke UI.

---

## 5. Kesimpulan

Keamanan aplikasi Pelangi Laundry saat ini sangat bergantung pada **"Security through Obscurity"** (mengharapkan user tidak tahu struktur database). Dengan memperbaiki RLS di sisi database dan menghapus pengecekan role di sisi frontend, aplikasi akan memiliki lapisan keamanan yang ketat.

**Prinsip emas yang harus diingat:** _Jangan pernah mempercayai data yang berasal dari klien (frontend). Semua validasi dan otorisasi harus diperketat di sisi server (Supabase RLS & Edge Functions)._

```

---

### Penjelasan Tambahan untuk Anda:
1. **Mengapa ini sangat penting?** Aplikasi Anda menggunakan Supabase. Karena Supabase client langsung berinteraksi dengan database dari browser, maka **RLS (Row Level Security)** adalah benteng pertahanan utama Anda. Jika RLS tidak disetel, siapa pun yang punya link aplikasi dan login bisa melihat semua data.
2. **Tentang Auth Bypass:** User dengan niat jahat hanya perlu membuka inspect element, mengubah variabel React, atau mendaftar dengan email admin tiruan untuk masuk ke dashboard keuangan Anda. Fix di atas memblok hal tersebut.
3. **Tentang XSS:** Karena aplikasi laundry mencetak kuitansi, orang bisa memasukkan nama pelanggan dengan script jahat (misal saat input data pelanggan), yang nanti akan berjalan saat Anda mencetak tagihan. `escapeHtml` akan menetralisir itu.

Silakan simpan file ini sebagai `SECURITY_FIX.md` di root repository Anda.
```
