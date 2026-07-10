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

  const [pel, lin] = await Promise.all([
    supabase.from('pelanggan').select('id, nama, tipe'),
    supabase.from('master_linen').select('id, nama')
  ]);

  console.log('\n=== PELANGGAN ===');
  console.log(JSON.stringify(pel.data, null, 2));

  console.log('\n=== MASTER LINEN ===');
  console.log(JSON.stringify(lin.data, null, 2));
}

main();
