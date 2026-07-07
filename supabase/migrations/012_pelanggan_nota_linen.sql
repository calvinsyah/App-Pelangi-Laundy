-- 012_pelanggan_nota_linen.sql

CREATE TABLE pelanggan_nota_linen (
  id BIGSERIAL PRIMARY KEY,
  pelanggan_id BIGINT NOT NULL REFERENCES pelanggan(id) ON DELETE CASCADE,
  jenis_nota_id BIGINT NOT NULL REFERENCES jenis_nota(id) ON DELETE CASCADE,
  linen_id BIGINT NOT NULL REFERENCES master_linen(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL DEFAULT 0,
  UNIQUE(pelanggan_id, jenis_nota_id, linen_id)
);

-- RLS
ALTER TABLE pelanggan_nota_linen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pelanggan_nota_linen_all" ON pelanggan_nota_linen
  FOR ALL USING (true) WITH CHECK (true);

-- Hapus konfigurasi global lama dari jenis_nota karena sudah tidak dipakai
ALTER TABLE jenis_nota DROP COLUMN IF EXISTS linen_config;
