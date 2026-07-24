-- 20260725000002_audit_triggers.sql

-- 1. Buat fungsi trigger untuk mencatat audit log
CREATE OR REPLACE FUNCTION log_audit()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_action text;
  v_old_data jsonb := null;
  v_new_data jsonb := null;
BEGIN
  -- Ambil user id dari sesi auth Supabase
  v_user_id := auth.uid();
  
  -- Tentukan tipe aksi
  v_action := TG_OP;
  
  -- Ambil data lama/baru sesuai aksi
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_new_data := to_jsonb(NEW);
  END IF;

  -- Masukkan ke tabel audit_log
  INSERT INTO audit_log (actor_id, aksi, tabel, row_id, nilai_sebelum, nilai_sesudah)
  VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME::text,
    COALESCE(v_new_data->>'id', v_old_data->>'id'),
    v_old_data,
    v_new_data
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Terapkan trigger ke tabel nota
DROP TRIGGER IF EXISTS audit_nota_trigger ON nota;
CREATE TRIGGER audit_nota_trigger
AFTER INSERT OR UPDATE OR DELETE ON nota
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- 3. Terapkan trigger ke tabel pelanggan
DROP TRIGGER IF EXISTS audit_pelanggan_trigger ON pelanggan;
CREATE TRIGGER audit_pelanggan_trigger
AFTER INSERT OR UPDATE OR DELETE ON pelanggan
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- 4. Terapkan trigger ke tabel locks
DROP TRIGGER IF EXISTS audit_locks_trigger ON locks;
CREATE TRIGGER audit_locks_trigger
AFTER INSERT OR UPDATE OR DELETE ON locks
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- 5. RLS untuk audit_log
-- SELECT: Hanya admin
-- INSERT: Semua login (lewat trigger)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "audit_log_insert_auth" ON audit_log;
CREATE POLICY "audit_log_insert_auth" ON audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
