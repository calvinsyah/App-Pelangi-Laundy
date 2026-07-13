-- 20260713000010_add_unique_absensi_tanggal_karyawan.sql

-- Menambahkan constraint UNIQUE pada kombinasi tanggal dan karyawan_id 
-- di tabel absensi untuk mengizinkan operasi UPSERT (ON CONFLICT).

ALTER TABLE public.absensi
ADD CONSTRAINT absensi_tanggal_karyawan_id_key UNIQUE (tanggal, karyawan_id);
