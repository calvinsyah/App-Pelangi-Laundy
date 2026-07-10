-- 20260711000001_dashboard_rpc.sql

CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_periode text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result json;
BEGIN
    WITH nota_calculated AS (
        SELECT
            n.id AS nota_id,
            n.pelanggan_id,
            to_char(n.tanggal::date, 'YYYY-MM') AS bulan,
            n.jenis,
            p.tipe,
            p.tipe_billing,
            p.tarif_rs,
            p.tarif_flat,
            CASE
                WHEN upper(p.tipe) = 'RS' THEN
                    CASE
                        WHEN jsonb_typeof(n.items) = 'array' THEN
                            COALESCE((
                                SELECT sum(COALESCE((item->>'qty')::numeric, 0) * COALESCE(hp.harga, 0))
                                FROM jsonb_array_elements(n.items) AS item
                                LEFT JOIN harga_pelanggan hp ON hp.pelanggan_id = n.pelanggan_id AND hp.linen_id = (item->>'linen_id')::bigint
                            ), 0)
                        ELSE
                            COALESCE(NULLIF(n.total, 0), (n.berat_kg * p.tarif_rs), 0)
                    END
                WHEN upper(p.tipe_billing) = 'FLAT' THEN
                    CASE
                        WHEN upper(n.jenis) IN ('FLAT', 'FLAT ASLI') THEN 0
                        ELSE COALESCE(n.total, 0)
                    END
                ELSE
                    COALESCE(n.total, 0)
            END AS nota_value
        FROM nota n
        JOIN pelanggan p ON n.pelanggan_id = p.id
        WHERE n.tanggal IS NOT NULL
    ),
    tagihan_per_bulan AS (
        SELECT
            nc.pelanggan_id,
            nc.bulan,
            MAX(nc.tipe_billing) AS tipe_billing,
            MAX(nc.tarif_flat) AS tarif_flat,
            SUM(nc.nota_value) AS sum_nota_value,
            COALESCE((
                SELECT is_paid
                FROM payment_status ps
                WHERE ps.key = ((SELECT nama FROM pelanggan WHERE id = nc.pelanggan_id) || '_' || nc.bulan)
            ), false) AS is_paid
        FROM nota_calculated nc
        GROUP BY nc.pelanggan_id, nc.bulan
    ),
    tagihan_final AS (
        SELECT
            pelanggan_id,
            bulan,
            is_paid,
            CASE
                WHEN upper(tipe_billing) = 'FLAT' THEN COALESCE(tarif_flat, 0) + sum_nota_value
                ELSE sum_nota_value
            END AS tagihan
        FROM tagihan_per_bulan
    ),
    biaya_calc AS (
        SELECT
            to_char(tanggal::date, 'YYYY-MM') AS bulan,
            kategori,
            COALESCE(nominal, 0) AS nominal,
            COALESCE(lunas, false) AS lunas
        FROM biaya
    ),
    utang_pinjaman AS (
        SELECT
            COALESCE(sisa_bulan, 0) * COALESCE(cicilan, 0) AS active_utang
        FROM utang
        WHERE status = 'AKTIF'
        AND inserted_at <= (p_periode || '-01')::date + interval '1 month' - interval '1 second'
    ),
    pengaturan_calc AS (
        SELECT COALESCE(peralatan, 0) AS peralatan FROM pengaturan LIMIT 1
    )
    SELECT json_build_object(
        'omset', COALESCE((SELECT sum(tagihan) FROM tagihan_final WHERE bulan = p_periode), 0),
        'hpp', COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE bulan = p_periode AND kategori IN ('GAS','AIR','LISTRIK 1','LISTRIK 2','CHEMICAL','BBM','PLASTIK','PPH PS 23','GAJI BORONGAN')), 0),
        'adm', COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE bulan = p_periode AND kategori IN ('GAJI TETAP','MAKAN','PERAWATAN MESIN','IURAN SAMPAH','IURAN RT','LAIN-LAIN')), 0),
        'laba', COALESCE((SELECT sum(tagihan) FROM tagihan_final WHERE bulan = p_periode AND is_paid = true), 0)
                - COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE bulan = p_periode AND kategori IN ('GAS','AIR','LISTRIK 1','LISTRIK 2','CHEMICAL','BBM','PLASTIK','PPH PS 23','GAJI BORONGAN')), 0)
                - COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE bulan = p_periode AND kategori IN ('GAJI TETAP','MAKAN','PERAWATAN MESIN','IURAN SAMPAH','IURAN RT','LAIN-LAIN')), 0),
        'kas', COALESCE((SELECT sum(tagihan) FROM tagihan_final WHERE is_paid = true), 0)
               - COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE lunas = true), 0),
        'piutang', COALESCE((SELECT sum(tagihan) FROM tagihan_final WHERE is_paid = false), 0),
        'utang', COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE lunas = false), 0)
                 + COALESCE((SELECT sum(active_utang) FROM utang_pinjaman), 0),
        'modal', (COALESCE((SELECT sum(tagihan) FROM tagihan_final WHERE is_paid = true), 0) - COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE lunas = true), 0)) -- kas
                 + COALESCE((SELECT sum(tagihan) FROM tagihan_final WHERE is_paid = false), 0) -- piutang
                 + COALESCE((SELECT peralatan FROM pengaturan_calc), 0) -- peralatan
                 - (COALESCE((SELECT sum(nominal) FROM biaya_calc WHERE lunas = false), 0) + COALESCE((SELECT sum(active_utang) FROM utang_pinjaman), 0)) -- utang
    ) INTO result;

    RETURN result;
END;
$$;

-- Security hardening
REVOKE EXECUTE ON FUNCTION get_dashboard_metrics(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(text) TO authenticated;
