-- 010_gaji_tetap_borongan.sql
-- Menghapus persentase, menambahkan tipe_gaji dan gaji_pokok

ALTER TABLE karyawan DROP COLUMN IF EXISTS persentase;
ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS tipe_gaji TEXT DEFAULT 'Borongan';
ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS gaji_pokok NUMERIC DEFAULT 0;

ALTER TABLE gaji ADD COLUMN IF NOT EXISTS gaji_pokok NUMERIC DEFAULT 0;

-- Memaksa Supabase mereload schema cache agar React tidak error
NOTIFY pgrst, 'reload schema';
