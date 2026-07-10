import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    env[key] = val;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || '';
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'] || '';
const email = env['TEST_EMAIL'] || '';
const password = env['TEST_PASSWORD'] || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('harga_pelanggan')
    .select('linen_id, harga, master_linen(nama)')
    .eq('pelanggan_id', 10);

  if (error) {
    console.error('Error fetching prices:', error);
  } else {
    console.log('Prices for STASIUN KOTA HOTEL (ID 10):');
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
