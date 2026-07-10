-- 006_tambah_kebijakan_rls_finansial.sql

-- Tabel: biaya (Pengeluaran)
-- User hanya bisa lihat, Admin bisa CRUD
CREATE POLICY "biaya_select_authenticated" ON biaya
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "biaya_modify_admin_only" ON biaya
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tabel: utang
CREATE POLICY "utang_select_authenticated" ON utang
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "utang_modify_admin_only" ON utang
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tabel: pengaturan (Hanya Admin yang boleh melihat/mengubah setting harga/pajak)
CREATE POLICY "pengaturan_admin_only" ON pengaturan
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tabel: absensi
CREATE POLICY "absensi_select_authenticated" ON absensi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "absensi_modify_admin_only" ON absensi
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
