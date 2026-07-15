-- Insert Dummy Karyawan
INSERT INTO public.karyawan (nama, bagian, tipe_gaji, gaji_pokok) VALUES
('Budi Santoso', 'Cuci', 'Borongan', 0),
('Siti Aminah', 'Setrika', 'Borongan', 0),
('Agus Supriyadi', 'Kurir', 'Harian', 1500000);

-- Insert Dummy Absensi
INSERT INTO public.absensi (tanggal, karyawan_id, status) VALUES
(CURRENT_DATE - INTERVAL '2 days', 1, 'Hadir'),
(CURRENT_DATE - INTERVAL '1 days', 1, 'Hadir'),
(CURRENT_DATE, 1, 'Hadir'),
(CURRENT_DATE - INTERVAL '2 days', 2, 'Hadir'),
(CURRENT_DATE - INTERVAL '1 days', 2, 'Izin'),
(CURRENT_DATE, 2, 'Hadir');

-- Insert Dummy Gaji
INSERT INTO public.gaji (karyawan_id, periode_mulai, periode_selesai, insentif, lembur, potongan, gaji_pokok) VALUES
(1, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE, 50000, 0, 0, 0),
(2, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE, 0, 0, 0, 0);
