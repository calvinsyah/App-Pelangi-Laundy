-- Hapus policy lama yang membatasi update & delete nota hanya untuk admin
drop policy if exists "nota_update_admin_only" on nota;
drop policy if exists "nota_delete_admin_only" on nota;

-- Buat policy baru: Semua user yang sudah login (termasuk kasir/staf) bisa update & delete
create policy "nota_update_all_login" on nota
  for update using (auth.role() = 'authenticated');

create policy "nota_delete_all_login" on nota
  for delete using (auth.role() = 'authenticated');
