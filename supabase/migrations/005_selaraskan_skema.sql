-- 005_selaraskan_skema.sql
-- Menyelaraskan nama kolom database existing dengan nama kolom yang diekspektasikan oleh kode frontend React

-- 1. master_linen: name -> nama
ALTER TABLE master_linen RENAME COLUMN name TO nama;

-- 2. jenis_nota: name -> nama, for_reguler -> berlaku_reguler, for_flat -> berlaku_flat
ALTER TABLE jenis_nota RENAME COLUMN name TO nama;
ALTER TABLE jenis_nota RENAME COLUMN for_reguler TO berlaku_reguler;
ALTER TABLE jenis_nota RENAME COLUMN for_flat TO berlaku_flat;

-- 3. pelanggan: kode -> kode_invoice, billing_system -> tipe_billing, flat_rate -> tarif_flat
ALTER TABLE pelanggan RENAME COLUMN kode TO kode_invoice;
ALTER TABLE pelanggan RENAME COLUMN billing_system TO tipe_billing;
ALTER TABLE pelanggan RENAME COLUMN flat_rate TO tarif_flat;

-- 4. nota: tambah kolom pendukung react
ALTER TABLE nota ADD COLUMN IF NOT EXISTS berat_kg NUMERIC DEFAULT 0;
ALTER TABLE nota ADD COLUMN IF NOT EXISTS status_bayar TEXT DEFAULT 'Belum';
ALTER TABLE nota ADD COLUMN IF NOT EXISTS jenis_nota_id BIGINT REFERENCES jenis_nota(id);

-- Sinkronisasi data jenis_nota_id untuk nota lama berdasarkan jenis text
UPDATE nota SET jenis_nota_id = (SELECT id FROM jenis_nota WHERE nama = nota.jenis LIMIT 1);
