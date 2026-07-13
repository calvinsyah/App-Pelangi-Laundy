-- Migration: restore_import_atomic
-- PERINGATAN KHUSUS UNTUK RPC RESTORE: locks/payment_status masih skema LAMA.
-- Saat ini menggunakan ON CONFLICT (key). Nanti setelah Task 1 Tagihan selesai,
-- ubah conflict target pada tabel locks dan payment_status menjadi ON CONFLICT (pelanggan_id, bulan).

CREATE OR REPLACE FUNCTION restore_import_atomic(p_payload JSONB)
RETURNS VOID AS $$
DECLARE
  elem JSONB;
  t_name TEXT;
  t_rows JSONB;
BEGIN
  -- Validasi role admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin yang dapat menjalankan restore data.';
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(p_payload)
  LOOP
    t_name := elem->>'table';
    t_rows := elem->'rows';

    IF jsonb_array_length(t_rows) = 0 THEN
      CONTINUE;
    END IF;

    BEGIN
      IF t_name = 'absensi' THEN
        INSERT INTO absensi (
          "id", "inserted_at", "tanggal", "karyawan_id", "status"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "tanggal" date, "karyawan_id" bigint, "status" text
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "tanggal" = EXCLUDED."tanggal",
          "karyawan_id" = EXCLUDED."karyawan_id",
          "status" = EXCLUDED."status";
        CONTINUE;
      END IF;

      IF t_name = 'backup_history' THEN
        INSERT INTO backup_history (
          "bulan"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "bulan" text
        )
        ON CONFLICT (bulan) DO NOTHING;
        CONTINUE;
      END IF;

      IF t_name = 'biaya' THEN
        INSERT INTO biaya (
          "id", "inserted_at", "tanggal", "kategori", "nominal", "lunas"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "tanggal" date, "kategori" text, "nominal" numeric, "lunas" boolean
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "tanggal" = EXCLUDED."tanggal",
          "kategori" = EXCLUDED."kategori",
          "nominal" = EXCLUDED."nominal",
          "lunas" = EXCLUDED."lunas";
        CONTINUE;
      END IF;

      IF t_name = 'gaji' THEN
        INSERT INTO gaji (
          "id", "inserted_at", "karyawan_id", "periode_mulai", "periode_selesai", "insentif", "lembur", "potongan", "gaji_pokok"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "karyawan_id" bigint, "periode_mulai" date, "periode_selesai" date, "insentif" numeric, "lembur" numeric, "potongan" numeric, "gaji_pokok" numeric
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "karyawan_id" = EXCLUDED."karyawan_id",
          "periode_mulai" = EXCLUDED."periode_mulai",
          "periode_selesai" = EXCLUDED."periode_selesai",
          "insentif" = EXCLUDED."insentif",
          "lembur" = EXCLUDED."lembur",
          "potongan" = EXCLUDED."potongan",
          "gaji_pokok" = EXCLUDED."gaji_pokok";
        CONTINUE;
      END IF;

      IF t_name = 'harga_pelanggan' THEN
        INSERT INTO harga_pelanggan (
          "pelanggan_id", "linen_id", "harga"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "pelanggan_id" bigint, "linen_id" bigint, "harga" numeric
        )
        ON CONFLICT (pelanggan_id, linen_id)
        DO UPDATE SET
          "harga" = EXCLUDED."harga";
        CONTINUE;
      END IF;

      IF t_name = 'invoice_counter' THEN
        INSERT INTO invoice_counter (
          "counter_key", "nilai"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "counter_key" text, "nilai" integer
        )
        ON CONFLICT (counter_key)
        DO UPDATE SET
          "nilai" = EXCLUDED."nilai";
        CONTINUE;
      END IF;

      IF t_name = 'invoice_numbers' THEN
        INSERT INTO invoice_numbers (
          "cache_key", "nomor"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "cache_key" text, "nomor" text
        )
        ON CONFLICT (cache_key)
        DO UPDATE SET
          "nomor" = EXCLUDED."nomor";
        CONTINUE;
      END IF;

      IF t_name = 'jenis_nota' THEN
        INSERT INTO jenis_nota (
          "id", "inserted_at", "nama", "multiplier", "berlaku_flat", "berlaku_reguler"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "nama" text, "multiplier" double precision, "berlaku_flat" boolean, "berlaku_reguler" boolean
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "nama" = EXCLUDED."nama",
          "multiplier" = EXCLUDED."multiplier",
          "berlaku_flat" = EXCLUDED."berlaku_flat",
          "berlaku_reguler" = EXCLUDED."berlaku_reguler";
        CONTINUE;
      END IF;

      IF t_name = 'karyawan' THEN
        INSERT INTO karyawan (
          "id", "inserted_at", "nama", "bagian", "tipe_gaji", "gaji_pokok"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "nama" text, "bagian" text, "tipe_gaji" text, "gaji_pokok" numeric
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "nama" = EXCLUDED."nama",
          "bagian" = EXCLUDED."bagian",
          "tipe_gaji" = EXCLUDED."tipe_gaji",
          "gaji_pokok" = EXCLUDED."gaji_pokok";
        CONTINUE;
      END IF;

      IF t_name = 'kop' THEN
        INSERT INTO kop (
          "id", "nama", "alamat", "telepon", "email", "kontak", "logo_url"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" integer, "nama" text, "alamat" text, "telepon" text, "email" text, "kontak" text, "logo_url" text
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "nama" = EXCLUDED."nama",
          "alamat" = EXCLUDED."alamat",
          "telepon" = EXCLUDED."telepon",
          "email" = EXCLUDED."email",
          "kontak" = EXCLUDED."kontak",
          "logo_url" = EXCLUDED."logo_url";
        CONTINUE;
      END IF;

      IF t_name = 'linen_pelanggan' THEN
        INSERT INTO linen_pelanggan (
          "pelanggan_id", "linen_id", "urutan"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "pelanggan_id" bigint, "linen_id" bigint, "urutan" integer
        )
        ON CONFLICT (pelanggan_id, linen_id)
        DO UPDATE SET
          "urutan" = EXCLUDED."urutan";
        CONTINUE;
      END IF;

      IF t_name = 'locks' THEN
        INSERT INTO locks (
          "key", "is_locked", "snapshot_data", "pelanggan_id", "bulan"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "key" text, "is_locked" boolean, "snapshot_data" jsonb, "pelanggan_id" bigint, "bulan" text
        )
        ON CONFLICT (key)
        DO UPDATE SET
          "is_locked" = EXCLUDED."is_locked",
          "snapshot_data" = EXCLUDED."snapshot_data",
          "pelanggan_id" = EXCLUDED."pelanggan_id",
          "bulan" = EXCLUDED."bulan";
        CONTINUE;
      END IF;

      IF t_name = 'master_linen' THEN
        INSERT INTO master_linen (
          "id", "inserted_at", "nama"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "nama" text
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "nama" = EXCLUDED."nama";
        CONTINUE;
      END IF;

      IF t_name = 'nota' THEN
        INSERT INTO nota (
          "id", "inserted_at", "nota_id", "tanggal", "pelanggan_id", "jenis", "total", "items", "berat_kg", "status_bayar", "jenis_nota_id"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "nota_id" text, "tanggal" date, "pelanggan_id" bigint, "jenis" text, "total" numeric, "items" jsonb, "berat_kg" numeric, "status_bayar" text, "jenis_nota_id" bigint
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "nota_id" = EXCLUDED."nota_id",
          "tanggal" = EXCLUDED."tanggal",
          "pelanggan_id" = EXCLUDED."pelanggan_id",
          "jenis" = EXCLUDED."jenis",
          "total" = EXCLUDED."total",
          "items" = EXCLUDED."items",
          "berat_kg" = EXCLUDED."berat_kg",
          "status_bayar" = EXCLUDED."status_bayar",
          "jenis_nota_id" = EXCLUDED."jenis_nota_id";
        CONTINUE;
      END IF;

      IF t_name = 'payment_status' THEN
        INSERT INTO payment_status (
          "key", "is_paid", "pelanggan_id", "bulan"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "key" text, "is_paid" boolean, "pelanggan_id" bigint, "bulan" text
        )
        ON CONFLICT (key)
        DO UPDATE SET
          "is_paid" = EXCLUDED."is_paid",
          "pelanggan_id" = EXCLUDED."pelanggan_id",
          "bulan" = EXCLUDED."bulan";
        CONTINUE;
      END IF;

      IF t_name = 'pelanggan' THEN
        INSERT INTO pelanggan (
          "id", "inserted_at", "nama", "kode_invoice", "tipe", "tipe_billing", "tarif_flat", "tarif_rs", "alamat", "kota"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "nama" text, "kode_invoice" text, "tipe" text, "tipe_billing" text, "tarif_flat" numeric, "tarif_rs" numeric, "alamat" text, "kota" text
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "nama" = EXCLUDED."nama",
          "kode_invoice" = EXCLUDED."kode_invoice",
          "tipe" = EXCLUDED."tipe",
          "tipe_billing" = EXCLUDED."tipe_billing",
          "tarif_flat" = EXCLUDED."tarif_flat",
          "tarif_rs" = EXCLUDED."tarif_rs",
          "alamat" = EXCLUDED."alamat",
          "kota" = EXCLUDED."kota";
        CONTINUE;
      END IF;

      IF t_name = 'pelanggan_nota_linen' THEN
        INSERT INTO pelanggan_nota_linen (
          "pelanggan_id", "jenis_nota_id", "linen_id", "urutan"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "pelanggan_id" bigint, "jenis_nota_id" bigint, "linen_id" bigint, "urutan" integer
        )
        ON CONFLICT (pelanggan_id, jenis_nota_id, linen_id)
        DO UPDATE SET
          "urutan" = EXCLUDED."urutan";
        CONTINUE;
      END IF;

      IF t_name = 'pengaturan' THEN
        INSERT INTO pengaturan (
          "id", "tarif_internal_hotel", "ongkos_per_kg", "rekening_name", "rekening_no", "bank", "direktur", "peralatan"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" integer, "tarif_internal_hotel" numeric, "ongkos_per_kg" numeric, "rekening_name" text, "rekening_no" text, "bank" text, "direktur" text, "peralatan" numeric
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "tarif_internal_hotel" = EXCLUDED."tarif_internal_hotel",
          "ongkos_per_kg" = EXCLUDED."ongkos_per_kg",
          "rekening_name" = EXCLUDED."rekening_name",
          "rekening_no" = EXCLUDED."rekening_no",
          "bank" = EXCLUDED."bank",
          "direktur" = EXCLUDED."direktur",
          "peralatan" = EXCLUDED."peralatan";
        CONTINUE;
      END IF;

      IF t_name = 'utang' THEN
        INSERT INTO utang (
          "id", "inserted_at", "nama", "dari", "sampai", "cicilan", "keterangan", "sisa_bulan", "status"
        )
        SELECT * FROM jsonb_to_recordset(t_rows) AS x(
          "id" bigint, "inserted_at" timestamptz, "nama" text, "dari" text, "sampai" text, "cicilan" numeric, "keterangan" text, "sisa_bulan" integer, "status" text
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "inserted_at" = EXCLUDED."inserted_at",
          "nama" = EXCLUDED."nama",
          "dari" = EXCLUDED."dari",
          "sampai" = EXCLUDED."sampai",
          "cicilan" = EXCLUDED."cicilan",
          "keterangan" = EXCLUDED."keterangan",
          "sisa_bulan" = EXCLUDED."sisa_bulan",
          "status" = EXCLUDED."status";
        CONTINUE;
      END IF;

      RAISE EXCEPTION 'Unknown table % in backup payload', t_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Gagal restore tabel %: %', t_name, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

REVOKE EXECUTE ON FUNCTION restore_import_atomic(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_import_atomic(JSONB) TO authenticated;
