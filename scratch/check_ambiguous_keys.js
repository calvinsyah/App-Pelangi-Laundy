import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    if (email && password) {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        console.error("Auth error:", authErr.message);
        return;
      }
    }

    const { data: pelanggan, error: errPelanggan } = await supabase.from('pelanggan').select('id, nama');
    const { data: locks, error: errLocks } = await supabase.from('locks').select('*').limit(1);
    
    if (locks && locks.length > 0) {
      console.log("Locks schema:", Object.keys(locks[0]));
    }

    const ambiguousPayments = [];
    const matchedPayments = [];
    if (payments) {
      payments.forEach(p => {
        const parts = p.key.split('_');
        if (parts.length >= 2) {
          const bulan = parts.pop();
          const nama = parts.join('_').trim().toLowerCase();
          
          const matches = pelangganMap.get(nama) || [];
          if (matches.length === 1) {
            matchedPayments.push(p.key);
          } else {
            ambiguousPayments.push({ key: p.key, matches: matches.length });
          }
        } else {
          ambiguousPayments.push({ key: p.key, matches: 0, reason: "Invalid format" });
        }
      });
    }

    console.log("\n=== HASIL UNTUK TABEL LOCKS ===");
    console.log(`Total matched: ${matchedLocks.length}`);
    console.log(`Total ambiguous: ${ambiguousLocks.length}`);
    ambiguousLocks.forEach(a => console.log(` - ${a.key} (Matches: ${a.matches})`));

    console.log("\n=== HASIL UNTUK TABEL PAYMENT_STATUS ===");
    console.log(`Total matched: ${matchedPayments.length}`);
    console.log(`Total ambiguous: ${ambiguousPayments.length}`);
    ambiguousPayments.forEach(a => console.log(` - ${a.key} (Matches: ${a.matches})`));

  } catch (err) {
    console.error("Error:", err);
  }
}

check();
