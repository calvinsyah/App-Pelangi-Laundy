-- Mengambil daftar bulan (YYYY-MM) unik dari tabel nota
CREATE OR REPLACE FUNCTION get_unique_nota_months()
RETURNS TABLE (bulan text)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT DISTINCT to_char(tanggal, 'YYYY-MM') AS bulan
  FROM public.nota
  WHERE tanggal IS NOT NULL
  ORDER BY bulan DESC;
$$;

-- Security hardening
REVOKE EXECUTE ON FUNCTION get_unique_nota_months() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_unique_nota_months() TO authenticated;
