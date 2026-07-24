-- 20260725000001_rbac_ketat_rls.sql
-- Implementasi RBAC ketat: Kasir hanya bisa select dan insert nota. Master data, hapus nota, dll hanya admin.

-- 1. Hapus semua policy lama yang bertentangan atau terlalu longgar
DROP POLICY IF EXISTS "nota_update_all_login" ON nota;
DROP POLICY IF EXISTS "nota_delete_all_login" ON nota;
DROP POLICY IF EXISTS "nota_update_admin_only" ON nota;
DROP POLICY IF EXISTS "nota_delete_admin_only" ON nota;
DROP POLICY IF EXISTS "nota_insert_all_login" ON nota;
DROP POLICY IF EXISTS "pelanggan_nota_linen_all" ON pelanggan_nota_linen;
DROP POLICY IF EXISTS "invoice_numbers_all" ON invoice_numbers;
DROP POLICY IF EXISTS "invoice_counter_all" ON invoice_counter;

-- 2. Kebijakan Tabel: nota
-- INSERT: Semua login (Admin + Kasir) bisa membuat nota
-- UPDATE/DELETE: Hanya admin
CREATE POLICY "nota_insert_auth" ON nota FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "nota_update_admin" ON nota FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "nota_delete_admin" ON nota FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Kebijakan Tabel: pelanggan_nota_linen
-- Catatan: Postgres RLS menggunakan permissive OR (secara default).
-- Policy SELECT (semua auth) digabung dengan policy ALL (admin) berarti kasir HANYA dapat select, 
-- dan admin dapat melakukan segalanya (select + insert/update/delete).
CREATE POLICY "pelanggan_nota_linen_select_auth" ON pelanggan_nota_linen FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pelanggan_nota_linen_modify_admin" ON pelanggan_nota_linen FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Kebijakan Tabel: invoice_numbers
-- SELECT/INSERT: Semua login (untuk generate invoice number baru saat buat nota/kwitansi)
-- UPDATE/DELETE: Hanya admin
CREATE POLICY "invoice_numbers_select_auth" ON invoice_numbers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "invoice_numbers_insert_auth" ON invoice_numbers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "invoice_numbers_modify_admin" ON invoice_numbers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "invoice_numbers_delete_admin" ON invoice_numbers FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Kebijakan Tabel: invoice_counter (Tabel ini diakses oleh fungsi RPC generate_document_number, 
-- biasanya dijalankan dengan SECURITY DEFINER, tetapi mari amankan direct access-nya)
CREATE POLICY "invoice_counter_select_auth" ON invoice_counter FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "invoice_counter_update_auth" ON invoice_counter FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "invoice_counter_admin" ON invoice_counter FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
