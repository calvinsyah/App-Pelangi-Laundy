-- Tambah kolom pelanggan_id dan bulan ke tabel locks dan payment_status
ALTER TABLE public.locks 
ADD COLUMN pelanggan_id bigint REFERENCES public.pelanggan(id),
ADD COLUMN bulan text;

ALTER TABLE public.payment_status 
ADD COLUMN pelanggan_id bigint REFERENCES public.pelanggan(id),
ADD COLUMN bulan text;

-- Backfill locks
UPDATE public.locks l
SET 
  pelanggan_id = p.id,
  bulan = substring(l.key from '_([0-9]{4}-[0-9]{2})$')
FROM public.pelanggan p
WHERE lower(trim(regexp_replace(l.key, '_[0-9]{4}-[0-9]{2}$', ''))) = lower(trim(p.nama));

UPDATE public.locks
SET bulan = substring(key from '_([0-9]{4}-[0-9]{2})$')
WHERE bulan IS NULL;

-- Backfill payment_status
UPDATE public.payment_status ps
SET 
  pelanggan_id = p.id,
  bulan = substring(ps.key from '_([0-9]{4}-[0-9]{2})$')
FROM public.pelanggan p
WHERE lower(trim(regexp_replace(ps.key, '_[0-9]{4}-[0-9]{2}$', ''))) = lower(trim(p.nama));

UPDATE public.payment_status
SET bulan = substring(key from '_([0-9]{4}-[0-9]{2})$')
WHERE bulan IS NULL;
