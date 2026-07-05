-- 009_rls_invoice_tables.sql
-- Menambahkan kebijakan RLS untuk invoice_numbers dan invoice_counter

create policy "invoice_numbers_all" on invoice_numbers for all using (auth.role() = 'authenticated');

create policy "invoice_counter_all" on invoice_counter for all using (auth.role() = 'authenticated');
