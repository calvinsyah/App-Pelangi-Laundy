-- 20260713000015_pelanggan_jenis_nota_config.sql
-- Konfigurasi per-pelanggan: nota mana yang masuk perhitungan gaji

CREATE TABLE IF NOT EXISTS pelanggan_jenis_nota_config (
  id            BIGSERIAL PRIMARY KEY,
  pelanggan_id  BIGINT NOT NULL REFERENCES pelanggan(id) ON DELETE CASCADE,
  jenis_nota_id BIGINT NOT NULL REFERENCES jenis_nota(id) ON DELETE CASCADE,
  hitung_gaji   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(pelanggan_id, jenis_nota_id)
);

ALTER TABLE pelanggan_jenis_nota_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pjnc_all" ON pelanggan_jenis_nota_config
  FOR ALL USING (true) WITH CHECK (true);

-- Migrasi data lama:
-- Pelanggan HOTEL+FLAT + jenis nota 'FLAT' → hitung_gaji = false
-- (backward compat dengan logika hardcoded sebelumnya)
INSERT INTO pelanggan_jenis_nota_config (pelanggan_id, jenis_nota_id, hitung_gaji)
SELECT p.id, jn.id, false
FROM pelanggan p
CROSS JOIN jenis_nota jn
WHERE upper(p.tipe) = 'HOTEL'
  AND upper(p.tipe_billing) = 'FLAT'
  AND upper(jn.nama) = 'FLAT'
ON CONFLICT (pelanggan_id, jenis_nota_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
