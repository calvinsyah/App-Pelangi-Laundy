import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  // login
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD
  });
  
  if (authErr) {
    console.error("Auth Error:", authErr.message);
    return;
  }

  // Find customer
  const { data: customers, error: cErr } = await supabase
    .from('pelanggan')
    .select('*')
    .ilike('nama', '%great%');
    
  if (cErr || !customers || customers.length === 0) {
    console.log("Customer not found or error:", cErr);
    return;
  }

  const customer = customers[0];
  console.log("Found Customer:", customer.nama, "| Tipe:", customer.tipe, "| Billing:", customer.tipe_billing);

  // Find notes
  const { data: notas, error: nErr } = await supabase
    .from('nota')
    .select('id, nota_id, tanggal, jenis, total, berat_kg, jenis_nota_id, items')
    .eq('pelanggan_id', customer.id)
    .order('tanggal', { ascending: false })
    .limit(10);
    
  if (nErr) {
    console.error("Nota error:", nErr);
    return;
  }
  
  console.log(`\nLast ${notas.length} notas for this customer:`);
  notas.forEach(n => {
    let status = "MASUK GAJI";
    let kg = 0;
    
    // Exact logic from gaji-hitung
    const tipePel = customer.tipe?.toUpperCase() || "";
    const billingPel = customer.tipe_billing?.toUpperCase() || "";
    const jenisNota = n.jenis?.toUpperCase() || "";
    
    if (tipePel === "HOTEL" && billingPel === "FLAT" && jenisNota === "FLAT") {
       status = "DIABAIKAN (Hotel Flat & Nota Flat)";
    } else {
       if (jenisNota === "KILOAN") {
          kg = Number(n.berat_kg) || (n.items?.reduce((s, it) => s + (Number(it.qty) || 0), 0)) || 0;
       } else {
          kg = (n.total || 0) / 7000; // assuming tarif 7000 for display
       }
    }
    
    console.log(`- Nota ID: ${n.nota_id} | Tanggal: ${n.tanggal} | Jenis: ${jenisNota} | Total: Rp ${n.total} | Input Kg: ${n.berat_kg} => ${status} (Dihitung: ${kg} Kg)`);
  });
}

main();
