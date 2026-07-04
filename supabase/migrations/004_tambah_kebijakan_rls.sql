-- 004_tambah_kebijakan_rls.sql
-- Menambahkan kebijakan RLS untuk tabel lainnya agar data dapat diakses oleh user/admin

-- Kebijakan untuk pelanggan
create policy "pelanggan_select_all" on pelanggan for select using (auth.role() = 'authenticated');
create policy "pelanggan_admin_all" on pelanggan for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk master_linen
create policy "master_linen_select_all" on master_linen for select using (auth.role() = 'authenticated');
create policy "master_linen_admin_all" on master_linen for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk jenis_nota
create policy "jenis_nota_select_all" on jenis_nota for select using (auth.role() = 'authenticated');
create policy "jenis_nota_admin_all" on jenis_nota for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk harga_pelanggan
create policy "harga_pelanggan_select_all" on harga_pelanggan for select using (auth.role() = 'authenticated');
create policy "harga_pelanggan_admin_all" on harga_pelanggan for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk linen_pelanggan
create policy "linen_pelanggan_select_all" on linen_pelanggan for select using (auth.role() = 'authenticated');
create policy "linen_pelanggan_admin_all" on linen_pelanggan for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk pengaturan
create policy "pengaturan_select_all" on pengaturan for select using (auth.role() = 'authenticated');
create policy "pengaturan_admin_all" on pengaturan for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk kop
create policy "kop_select_all" on kop for select using (auth.role() = 'authenticated');
create policy "kop_admin_all" on kop for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk locks
create policy "locks_select_all" on locks for select using (auth.role() = 'authenticated');
create policy "locks_admin_all" on locks for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk payment_status
create policy "payment_status_select_all" on payment_status for select using (auth.role() = 'authenticated');
create policy "payment_status_admin_all" on payment_status for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk absensi
create policy "absensi_select_all" on absensi for select using (auth.role() = 'authenticated');
create policy "absensi_insert_all" on absensi for insert with check (auth.role() = 'authenticated');
create policy "absensi_admin_all" on absensi for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk biaya (operasional)
create policy "biaya_admin_all" on biaya for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk utang
create policy "utang_admin_all" on utang for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Kebijakan untuk backup_history
create policy "backup_history_admin_all" on backup_history for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
