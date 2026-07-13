-- 20260713000007_add_unique_kode_invoice.sql

-- Menambahkan constraint UNIQUE pada kolom kode_invoice di tabel pelanggan
ALTER TABLE public.pelanggan
ADD CONSTRAINT pelanggan_kode_invoice_key UNIQUE (kode_invoice);
