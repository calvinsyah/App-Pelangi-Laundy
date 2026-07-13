-- 20260713000008_rpc_bayar_cicilan_utang.sql

-- Membuat RPC untuk pembayaran cicilan utang secara atomik
-- Ini akan mencegah skenario partial failure (biaya tercatat tapi sisa bulan utang tidak berkurang)

CREATE OR REPLACE FUNCTION public.bayar_cicilan_utang(p_utang_id bigint, p_tanggal text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_utang record;
    v_new_sisa int;
    v_new_status text;
BEGIN
    -- Ambil data utang saat ini dengan lock untuk update
    SELECT * INTO v_utang FROM public.utang WHERE id = p_utang_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utang dengan id % tidak ditemukan', p_utang_id;
    END IF;

    IF v_utang.sisa_bulan <= 0 THEN
        RAISE EXCEPTION 'Utang sudah lunas';
    END IF;

    -- Hitung sisa dan status baru
    v_new_sisa := v_utang.sisa_bulan - 1;
    IF v_new_sisa <= 0 THEN
        v_new_status := 'LUNAS';
    ELSE
        v_new_status := 'AKTIF';
    END IF;

    -- Insert ke tabel biaya (sebagai pengeluaran cicilan)
    INSERT INTO public.biaya (kategori, nominal, lunas, tanggal)
    VALUES ('CICILAN UTANG', v_utang.cicilan, true, p_tanggal);

    -- Update tabel utang
    UPDATE public.utang 
    SET sisa_bulan = v_new_sisa, 
        status = v_new_status 
    WHERE id = p_utang_id;

    -- Return JSON status terbaru
    RETURN json_build_object(
        'sisa_bulan', v_new_sisa,
        'status', v_new_status
    );
END;
$$;
