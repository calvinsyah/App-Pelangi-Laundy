-- 20260713000006_split_invoice_kwitansi.sql

-- 1. Backfill data lama (semua dianggap sebagai Invoice sehingga diberi prefix INV_)
UPDATE public.invoice_counter 
SET counter_key = 'INV_' || counter_key 
WHERE counter_key NOT LIKE 'INV_%' AND counter_key NOT LIKE 'KWT_%';

UPDATE public.invoice_numbers 
SET cache_key = 'INV_' || cache_key 
WHERE cache_key NOT LIKE 'INV_%' AND cache_key NOT LIKE 'KWT_%';

-- 2. Buat fungsi RPC untuk auto-increment yang atomik
CREATE OR REPLACE FUNCTION generate_document_number(p_counter_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_new_val integer;
BEGIN
    INSERT INTO public.invoice_counter (counter_key, nilai)
    VALUES (p_counter_key, 1)
    ON CONFLICT (counter_key) DO UPDATE
    SET nilai = invoice_counter.nilai + 1
    RETURNING nilai INTO v_new_val;
    
    RETURN v_new_val;
END;
$$;

-- Security hardening (jika dipanggil dari client)
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_document_number(text) TO authenticated;
