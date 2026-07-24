# PLAN FINAL: Invoice Pelanggan RS Berbasis Rentang Tanggal (bukan Bulanan)

Status: **DISETUJUI — siap eksekusi mulai Batch 1 (§8), Gate 0 per batch tetap berlaku**
Sumber: plan awal Calvin + plan awal Claude, digabung + ditambal 5 celah hasil review silang. Keputusan terbuka sudah dikonfirmasi (§9).

---

## 1. Ringkasan

Pelanggan **RS**: periode invoice tidak lagi dipatok ke bulan kalender (`YYYY-MM`), tapi ke **rentang tanggal bebas** (tanggal mulai – tanggal akhir) yang diinput user, boleh lintas bulan/tahun.
Pelanggan **HOTEL**: **tidak berubah sama sekali** — tetap `<input type="month">`, tetap kolom `bulan`, tetap format nomor 1-bulan-romawi.

---

## 2. Ringkasan Perubahan (Sebelum vs Sesudah)

| Aspek | Sebelum | Sesudah — RS | Sesudah — HOTEL |
|---|---|---|---|
| Input periode | `<input type="month">` untuk semua | 2× `<input type="date">` (mulai & akhir) | Tetap `<input type="month">` |
| Query nota | `tanggal` antara tgl-1 s/d akhir bulan | `tanggal` antara `tanggal_mulai` s/d `tanggal_akhir` bebas | Tidak berubah |
| Total tagihan | `berat_kg × tarif_rs` per nota | Sama persis, tidak berubah (sudah period-agnostic) | Tidak berubah |
| Nomor invoice | `001/PL-INV-RHS/VI/2026` | `001/PL-INV-RHS/V-VI/2026` (rentang romawi, lintas tahun ikut tahun `tanggal_akhir`) | Tidak berubah |
| Lock key | `(pelanggan_id, bulan)` | `(pelanggan_id, tanggal_mulai, tanggal_akhir)` — kolom baru | Tidak berubah |
| Payment key | `(pelanggan_id, bulan)` | `(pelanggan_id, tanggal_mulai, tanggal_akhir)` — kolom baru | Tidak berubah |
| Invoice cache key | `{tipeDoc}_{kode}_{bulan}` | `{tipeDoc}_{kode}_{tanggal_mulai}_{tanggal_akhir}` | Tidak berubah |
| Cetak invoice | Tanpa baris periode eksplisit | + baris `Periode: 26 Mei 2026 s/d 25 Juni 2026` | + baris `Periode: Juni 2026` (format lama) |
| Data lama RS (bulanan) | — | Tetap tersimpan, dibaca via fallback (`tanggal_mulai IS NULL` → pakai `bulan`) | — |
| **Validasi overlap periode RS** | **Tidak ada** | **Baru: dicek sebelum lock, ditolak/diperingatkan kalau beririsan** | — |
| Linen Room (tab ke-2 Tagihan.tsx) | Filter per bulan | **Tidak berubah** — RS tidak pakai linen room (nota RS `items = null`) | Tidak berubah |

---

## 3. Temuan Teknis yang Mendasari Plan Ini

1. `locks` & `payment_status` punya `UNIQUE(pelanggan_id, bulan)`, `bulan` = text `YYYY-MM` → tidak cocok untuk RS multi-periode/lintas-bulan. **→ solusi: kolom baru, bukan re-use `bulan`.**
2. `generateDocumentNumber()` mem-parsing `bln.split("-")` untuk tahun & romawi bulan → akan salah/rusak kalau dikasih rentang. **→ solusi: mode eksplisit, lihat §5.3.**
3. `calculateTotal` RS = `berat_kg × tarif_rs`, sudah **period-agnostic** — tidak perlu diubah.
4. RS tidak pernah pakai `tipe_billing = 'FLAT'` (flat hanya HOTEL) → tidak perlu menangani kasus flat untuk RS.
5. `Laporan.tsx` & `Dashboard.tsx` **dikonfirmasi tidak membaca** `locks`/`payment_status` sama sekali → perubahan ini **tidak berisiko** terhadap kerja tutup buku/dashboard yang sedang berjalan.
6. `printUtils.buildInvoicePelangganHTML` & slip gaji sudah punya preseden field `periodeMulai`/`periodeSelesai` → dipakai ulang polanya untuk konsistensi.
7. `src/lib/dateUtils.ts` **sudah ada** (isinya baru `getLastDayOfMonth`/`getMonthRange`) → fungsi baru ditambahkan ke file ini, bukan file baru.
8. `tests/e2e-tagihan.spec.ts` **sudah ada** dan memilih pelanggan dengan `selectOption({index: 1})` secara buta → berisiko gagal diam-diam begitu UI jadi kondisional per tipe pelanggan. Perlu disesuaikan (§8).

---

## 4. Skema Database

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_invoice_rs_custom_range.sql

ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS tanggal_mulai date,
  ADD COLUMN IF NOT EXISTS tanggal_akhir date;

ALTER TABLE public.payment_status
  ADD COLUMN IF NOT EXISTS tanggal_mulai date,
  ADD COLUMN IF NOT EXISTS tanggal_akhir date;

-- Unique baru khusus baris RS (kolom lama `bulan` + index lamanya tetap utuh untuk HOTEL)
CREATE UNIQUE INDEX IF NOT EXISTS locks_pelanggan_range_idx
  ON public.locks (pelanggan_id, tanggal_mulai, tanggal_akhir)
  WHERE tanggal_mulai IS NOT NULL AND tanggal_akhir IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_status_pelanggan_range_idx
  ON public.payment_status (pelanggan_id, tanggal_mulai, tanggal_akhir)
  WHERE tanggal_mulai IS NOT NULL AND tanggal_akhir IS NOT NULL;
```

Catatan penamaan: kolom pakai `tanggal_mulai`/`tanggal_akhir` (bukan `start_date`/`end_date`) supaya konsisten dengan konvensi skema yang sudah ada (`tanggal`, `bulan`, `tarif`, `pelanggan`, dll semuanya Bahasa Indonesia).

Index & kolom `bulan` yang lama **tidak disentuh** — invoice HOTEL lama maupun baru berjalan seperti sekarang, 100% backward compatible. Data RS lama yang sudah pernah di-lock bulanan tetap terbaca lewat fallback (§6).

---

## 5. Perubahan per File

### 5.1 `src/lib/dateUtils.ts` — tambah helper (fungsi baru, file sudah ada)
- `formatDateRange(start, end)` → `"26 Mei 2026 - 25 Juni 2026"`
- `toRomanMonthRange(start, end)`:
  - bulan & tahun sama → `"V"`
  - bulan beda, tahun sama → `"V-VI"`
  - lintas tahun → `"XII-I"`, **tahun invoice mengikuti tahun `tanggal_akhir`** (mis. `26 Des 2026 - 15 Jan 2027` → `XII-I/2027`)
- `buildPeriodKey(start, end)` → `"2026-05-26_2026-06-25"` (dipakai untuk cache key & lock key)
- `isValidRange(start, end)` → validasi `end >= start` (lihat §5.4)

### 5.2 `src/lib/printUtils.ts`
- `buildInvoicePelangganHTML(pel, bln, notas, kopHTML, invNumber, periodeRange?)` — parameter baru opsional `{ tanggalMulai, tanggalAkhir }`.
  - RS: label `Biaya Cuci Linen Kiloan RS (26 Mei 2026 - 25 Juni 2026)`, baris `Periode: ...` di body, title HTML pakai rentang.
  - HOTEL: tidak berubah.
- `buildKuitansiHTML` (di `Kuitansi.tsx`, dipanggil dari sana) — pola sama.

### 5.3 `src/lib/invoiceUtils.ts` — `generateDocumentNumber`, mode eksplisit (perbaikan celah #2)
Alih-alih menerima `bulan` dan `startDate/endDate` sekaligus (ambigu, tidak jelas mana yang menang), signature dibuat **satu parameter periode dengan mode eksplisit**:

```ts
type Periode =
  | { mode: 'bulan'; bulan: string }                         // HOTEL, jalur lama
  | { mode: 'range'; tanggalMulai: string; tanggalAkhir: string }; // RS, jalur baru

generateDocumentNumber(tipeDoc: 'INV' | 'KWT', kodeInvoice: string, periode: Periode): Promise<string>
```
- Mode `bulan` → perilaku identik dengan sekarang (tidak ada regresi untuk HOTEL).
- Mode `range` → `cacheKey = {tipeDoc}_{kode}_{tanggalMulai}_{tanggalAkhir}`, `counterKey = {tipeDoc}_{kode}_{tahun}` (tahun dari `tanggalAkhir`), format nomor pakai `toRomanMonthRange`.
- Tidak ada state ambigu karena hanya satu mode yang bisa aktif per pemanggilan.

### 5.4 `src/pages/tagihan/Tagihan.tsx`
- State baru: `tanggalMulai`, `tanggalAkhir`. Default: tanggal 1 bulan berjalan s/d hari ini (bisa diubah bebas oleh user).
- Render kondisional berdasarkan `pel.tipe`:
  - `RS` → 2 `<input type="date">`.
  - `HOTEL` → tetap `<input type="month">`, tidak berubah.
- **Validasi sebelum fetch/lock**: `tanggalAkhir >= tanggalMulai` (pakai `isValidRange`), tampilkan pesan error kalau tidak valid.
- `fetchInvoice()`: RS pakai `tanggalMulai`/`tanggalAkhir` langsung sebagai filter query nota; cek lock/payment via `(pelanggan_id, tanggal_mulai, tanggal_akhir)`.
- **Validasi overlap (perbaikan celah #1 — WAJIB, bukan opsional):** sebelum `handleToggleLock` mengunci periode baru untuk RS, query semua `locks` milik `pelanggan_id` yang sama dengan `tanggal_mulai IS NOT NULL`, cek kondisi beririsan:
  `tanggal_mulai_baru <= tanggal_akhir_lama AND tanggal_akhir_baru >= tanggal_mulai_lama`.
  - Kalau ditemukan overlap → **blokir** proses lock (bukan cuma warning), tampilkan periode yang bentrok ke user, karena ini menyangkut potensi tagihan ganda ke pelanggan (uang riil, bukan sekadar UX). Kalau ke depan ada kasus sah yang butuh override, itu bisa jadi keputusan eksplisit terpisah, bukan default.
- `handleToggleLock` / `handleTogglePaid`: RS → upsert `locks`/`payment_status` dengan `tanggal_mulai`/`tanggal_akhir` terisi, `bulan` dikosongkan; snapshot ikut simpan `tanggalMulai`/`tanggalAkhir`. HOTEL tidak berubah.
- `handleCetakInvoice`: RS kirim `{ mode: 'range', tanggalMulai, tanggalAkhir }` ke `generateDocumentNumber` dan `periodeRange` ke `buildInvoicePelangganHTML`.

### 5.5 `src/pages/tagihan/Kuitansi.tsx`
Perubahan simetris dengan §5.4: date-range picker untuk RS, `checkPaymentStatus` menerima varian by-range, `generateDocumentNumber` mode `range`, deskripsi kuitansi tetap ambil tanggal pertama/terakhir dari nota aktual (perilaku ini sudah benar di kode sekarang, tidak perlu diubah — hanya sumber tanggalnya sekarang dari input user, bukan hasil hitung otomatis 1 bulan).

### 5.6 Tidak berubah (dikonfirmasi)
`MasterPelanggan.tsx`, `Laporan.tsx`, `Dashboard.tsx` — tidak bergantung pada `locks`/`payment_status`.

---

## 6. Fallback Data Lama

Baris `locks`/`payment_status` RS yang sudah ada (format lama, `bulan` terisi, `tanggal_mulai` NULL) **tidak dimigrasi paksa**. UI baru: kalau user membuka riwayat dan `tanggal_mulai IS NULL`, tampilkan berdasarkan `bulan` seperti perilaku lama (read path tetap jalan). Hanya alur input **baru** untuk RS yang memakai rentang tanggal.

---

## 7. Validasi Input Tambahan

- `tanggalAkhir >= tanggalMulai`, wajib sebelum fetch/lock.
- Overlap check (§5.4) — wajib, **blokir total** jika bentrok (lihat §9.1).
- Tidak ada batas panjang rentang (tidak ada warning untuk periode "terlalu panjang") — rentang tanggal sepenuhnya mengikuti kebutuhan user, tidak dibatasi sistem (lihat §9.4).

---

## 8. Rencana Eksekusi (batch, commit terpisah, sesuai Gate 0 — no push tanpa approval per batch)

1. **Migrasi DB** — `tanggal_mulai`/`tanggal_akhir` + unique index di `locks` & `payment_status`. *(review & approve dulu sebelum `db push`)*
2. **Helper** — `dateUtils.ts` (formatDateRange, toRomanMonthRange, buildPeriodKey, isValidRange) + `invoiceUtils.ts` (`generateDocumentNumber` mode `bulan`/`range`).
3. **Tagihan.tsx** — UI kondisional, fetch by range, overlap check, lock/payment by range.
4. **Kuitansi.tsx** — perubahan simetris.
5. **printUtils.ts** — baris periode di cetak invoice & kuitansi.
6. **Update `tests/e2e-tagihan.spec.ts`** — pilih pelanggan HOTEL dan RS secara eksplisit (bukan `index: 1` buta), tambah skenario date-range untuk RS.
7. **Verifikasi manual** (checklist):
   - Pilih RS → muncul 2 date picker; pilih HOTEL → tetap month picker.
   - Fetch invoice RS dengan rentang custom → nota sesuai rentang.
   - Coba lock periode RS yang beririsan dengan periode terkunci lain → **ditolak**.
   - Lock/tandai lunas RS → tersimpan dengan `tanggal_mulai`/`tanggal_akhir`.
   - Cetak invoice & kuitansi RS → nomor format `V-VI/2026`, label ada periode.
   - Data RS lama (bulanan) tetap bisa dibuka lewat fallback.
   - `npm run lint` bersih, e2e Tagihan lulus.
8. **Commit terpisah per batch** (Bahasa Indonesia, sesuai konvensi):
   1. `feat(db): tambah kolom tanggal_mulai & tanggal_akhir di locks dan payment_status`
   2. `feat(utils): helper date range di dateUtils dan mode range di generateDocumentNumber`
   3. `feat(tagihan): date range picker + validasi overlap untuk invoice pelanggan RS`
   4. `feat(kuitansi): date range picker untuk kwitansi pelanggan RS`
   5. `feat(print): tampilkan periode date range di cetak invoice & kwitansi RS`
   6. `test(e2e): sesuaikan e2e-tagihan untuk skenario HOTEL vs RS`

---

## 9. Keputusan — DIKONFIRMASI CALVIN

1. **Overlap = blokir total.** Kalau rentang RS baru beririsan dengan periode yang sudah terkunci, proses lock **ditolak**, bukan sekadar warning. Tidak ada jalur override di versi pertama ini.
2. **Setuju** — kolom pakai `tanggal_mulai`/`tanggal_akhir` (Indonesia, konsisten dengan skema yang ada).
3. **Sudah pas** — default rentang saat form dibuka: tanggal 1 bulan berjalan s/d hari ini, tetap bisa diubah bebas oleh user.
4. **Tidak ada batas/warning rentang "terlalu panjang".** Panjang rentang sepenuhnya mengikuti kebutuhan user, sistem tidak membatasi atau memperingatkan.

Status: plan ini **siap dieksekusi**. Mulai dari Batch 1 (migrasi DB), berhenti untuk approval eksplisit sebelum lanjut ke batch berikutnya, sesuai alur Gate 0.
