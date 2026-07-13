import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runTest() {
  console.log('--- Memulai Test Race Condition ---');
  
  // 1. Setup Data Dummy (Auth using TEST_EMAIL)
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });
  
  if (authErr) {
    console.error('Auth Error:', authErr.message);
    return;
  }
  
  console.log('✅ Auth Berhasil');
  
  // Bikin data utang dummy
  const { data: utangData, error: utangErr } = await supabase.from('utang').insert([{
    nama: 'Dummy Race Condition',
    cicilan: 100000,
    sisa_bulan: 10,
    keterangan: 'dummy',
    dari: '2026-07-01',
    sampai: '2027-04-01',
    status: 'AKTIF'
  }]).select().single();
  
  if (utangErr) {
    console.error('Gagal bikin utang dummy:', utangErr.message);
    return;
  }
  
  const utangId = utangData.id;
  console.log(`✅ Utang dummy dibuat (ID: ${utangId}) - Sisa Bulan: 10`);
  
  // 2. Tembak RPC bersamaan (Simulasi Race Condition)
  console.log('🚀 Menembak RPC bayar_cicilan_utang 3x bersamaan...');
  
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      supabase.rpc('bayar_cicilan_utang', { 
        p_utang_id: utangId, 
        p_tanggal: '2026-07-13' 
      })
    );
  }
  
  const results = await Promise.allSettled(promises);
  
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((res, i) => {
    if (res.status === 'fulfilled' && !res.value.error) {
      console.log(`Request ${i + 1} Berhasil. Sisa Bulan menjadi: ${res.value.data.sisa_bulan}`);
      successCount++;
    } else {
      const err = res.status === 'fulfilled' ? res.value.error.message : res.reason;
      console.log(`Request ${i + 1} Gagal (Diharapkan jika row dilock):`, err);
      failCount++;
    }
  });
  
  console.log(`\nRingkasan Request: ${successCount} sukses, ${failCount} gagal/tertahan lock`);
  
  // 3. Verifikasi Akhir
  const { data: utangAkhir } = await supabase.from('utang').select('sisa_bulan').eq('id', utangId).single();
  console.log(`\nSisa Bulan Aktual di DB: ${utangAkhir.sisa_bulan}`);
  
  // Harusnya 10 - successCount
  const expectedSisa = 10 - successCount;
  if (utangAkhir.sisa_bulan === expectedSisa) {
    console.log('✅ Test Passed: Tidak terjadi pemotongan ganda yang tidak terdata.');
  } else {
    console.error('❌ Test Failed: Terjadi Race Condition!');
  }
  
  // 4. Teardown
  await supabase.from('utang').delete().eq('id', utangId);
  console.log('🧹 Teardown: Data dummy dihapus.');
}

runTest();
