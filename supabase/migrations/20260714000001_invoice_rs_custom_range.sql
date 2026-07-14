-- Migrasi: tambah kolom tanggal_mulai & tanggal_akhir di locks dan payment_status
-- untuk mendukung invoice RS berbasis rentang tanggal (bukan bulanan).
-- Kolom & index lama (bulan) TIDAK disentuh — HOTEL tetap pakai jalur lama.

ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS tanggal_mulai date,
  ADD COLUMN IF NOT EXISTS tanggal_akhir date;

ALTER TABLE public.payment_status
  ADD COLUMN IF NOT EXISTS tanggal_mulai date,
  ADD COLUMN IF NOT EXISTS tanggal_akhir date;

-- Unique index baru khusus baris RS (kolom lama bulan + index lamanya tetap utuh untuk HOTEL)
CREATE UNIQUE INDEX IF NOT EXISTS locks_pelanggan_range_idx
  ON public.locks (pelanggan_id, tanggal_mulai, tanggal_akhir)
  WHERE tanggal_mulai IS NOT NULL AND tanggal_akhir IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_status_pelanggan_range_idx
  ON public.payment_status (pelanggan_id, tanggal_mulai, tanggal_akhir)
  WHERE tanggal_mulai IS NOT NULL AND tanggal_akhir IS NOT NULL;
