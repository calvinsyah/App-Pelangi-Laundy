-- 20260713000005_add_unique_locks_payment.sql

-- 1. Hapus duplikat dari payment_status (simpan yang is_paid = true jika ada duplikat)
WITH duplicates AS (
  SELECT ctid,
         ROW_NUMBER() OVER (
           PARTITION BY pelanggan_id, bulan
           ORDER BY is_paid DESC, key ASC
         ) as rn
  FROM public.payment_status
  WHERE pelanggan_id IS NOT NULL
)
DELETE FROM public.payment_status
WHERE ctid IN (SELECT ctid FROM duplicates WHERE rn > 1);

-- 2. Hapus duplikat dari locks (simpan yang is_locked = true jika ada duplikat)
WITH duplicates AS (
  SELECT ctid,
         ROW_NUMBER() OVER (
           PARTITION BY pelanggan_id, bulan
           ORDER BY is_locked DESC, key ASC
         ) as rn
  FROM public.locks
  WHERE pelanggan_id IS NOT NULL
)
DELETE FROM public.locks
WHERE ctid IN (SELECT ctid FROM duplicates WHERE rn > 1);

-- 3. Tambah constraint UNIQUE parsial untuk mencegah duplikat di masa depan
CREATE UNIQUE INDEX IF NOT EXISTS locks_pelanggan_id_bulan_idx ON public.locks (pelanggan_id, bulan) WHERE pelanggan_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_status_pelanggan_id_bulan_idx ON public.payment_status (pelanggan_id, bulan) WHERE pelanggan_id IS NOT NULL;
