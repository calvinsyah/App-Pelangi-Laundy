-- 003_enable_rls_semua_tabel.sql
-- Jalankan untuk SEMUA 18 tabel existing: nota, biaya, gaji, absensi,
-- karyawan, pelanggan, master_linen, harga_pelanggan, linen_pelanggan,
-- jenis_nota, pengaturan, kop, invoice_numbers, invoice_counter,
-- payment_status, locks, utang, backup_history

alter table nota enable row level security;
alter table biaya enable row level security;
alter table gaji enable row level security;
alter table absensi enable row level security;
alter table karyawan enable row level security;
alter table pelanggan enable row level security;
alter table master_linen enable row level security;
alter table harga_pelanggan enable row level security;
alter table linen_pelanggan enable row level security;
alter table jenis_nota enable row level security;
alter table pengaturan enable row level security;
alter table kop enable row level security;
alter table invoice_numbers enable row level security;
alter table invoice_counter enable row level security;
alter table payment_status enable row level security;
alter table locks enable row level security;
alter table utang enable row level security;
alter table backup_history enable row level security;

-- Contoh kebijakan: nota (SELECT/INSERT untuk admin & user, UPDATE/DELETE admin saja)
create policy "nota_select_all_login" on nota
  for select using (auth.role() = 'authenticated');

create policy "nota_insert_all_login" on nota
  for insert with check (auth.role() = 'authenticated');

create policy "nota_update_admin_only" on nota
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "nota_delete_admin_only" on nota
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Contoh kebijakan lebih ketat: gaji & karyawan (admin only, tanpa kecuali)
create policy "gaji_admin_only" on gaji
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "karyawan_admin_only" on karyawan
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
