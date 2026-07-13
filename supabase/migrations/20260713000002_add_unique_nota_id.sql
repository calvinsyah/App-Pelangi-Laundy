-- Menambahkan UNIQUE constraint pada kolom nota_id di tabel nota
ALTER TABLE public.nota
ADD CONSTRAINT nota_nota_id_key UNIQUE (nota_id);
