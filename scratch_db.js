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

  const { data, error } = await supabase.from('nota').select('*').limit(1);
  console.log("Nota row:", data);
  console.log("Error:", error);
}

main();
