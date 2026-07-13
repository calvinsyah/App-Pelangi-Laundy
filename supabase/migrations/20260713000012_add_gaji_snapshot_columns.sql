-- Add snapshot columns for tarif to gaji table
ALTER TABLE gaji
ADD COLUMN IF NOT EXISTS tarif_internal_hotel_snapshot numeric,
ADD COLUMN IF NOT EXISTS ongkos_per_kg_snapshot numeric;
