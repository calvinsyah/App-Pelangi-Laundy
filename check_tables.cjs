const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const t1 = await supabase.from('linen_pelanggan').select('*').limit(1);
  const t2 = await supabase.from('harga_pelanggan').select('*').limit(1);
  console.log('linen_pelanggan:', t1.data, t1.error);
  console.log('harga_pelanggan:', t2.data, t2.error);
}
check();
