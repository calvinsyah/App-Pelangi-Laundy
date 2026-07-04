-- 008_jenis_nota_config.sql
ALTER TABLE jenis_nota ADD COLUMN IF NOT EXISTS linen_config JSONB DEFAULT '[]'::jsonb;

-- Ensure KILOAN exists for RS type customers
INSERT INTO jenis_nota (nama, multiplier, berlaku_reguler, berlaku_flat, linen_config)
SELECT 'KILOAN', 1, true, false, '[]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM jenis_nota WHERE nama = 'KILOAN'
);
