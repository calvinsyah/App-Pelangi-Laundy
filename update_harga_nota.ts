import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Read .env file manually
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

if (!supabaseUrl || !supabaseAnonKey || !email || !password) {
  console.error('Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  try {
    console.log('Sedang login ke database...');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      console.error('Login gagal:', authError.message);
      process.exit(1);
    }
    console.log('Login berhasil!\n');

    const notaIdInput = await askQuestion('Masukkan Nota ID (contoh: 20260625-5717): ');
    if (!notaIdInput.trim()) {
      console.log('Nota ID tidak boleh kosong.');
      process.exit(1);
    }

    // Fetch the nota
    const { data: nota, error: fetchError } = await supabase
      .from('nota')
      .select('*')
      .eq('nota_id', notaIdInput.trim())
      .single();

    if (fetchError || !nota) {
      console.error('Nota tidak ditemukan atau error:', fetchError?.message || 'Tidak ada data');
      process.exit(1);
    }

    console.log('\n=== DETAIL NOTA ===');
    console.log(`ID Database   : ${nota.id}`);
    console.log(`Nota ID       : ${nota.nota_id}`);
    console.log(`Tanggal       : ${nota.tanggal}`);
    console.log(`Jenis Nota    : ${nota.jenis}`);
    console.log(`Status Bayar  : ${nota.status_bayar}`);
    console.log(`Total Saat Ini: Rp ${nota.total?.toLocaleString('id-ID')}`);

    if (nota.berat_kg !== null) {
      // Kiloan/RS
      console.log(`Tipe Nota     : KILOAN`);
      console.log(`Berat (Kg)    : ${nota.berat_kg} kg`);
      const tarifPerKg = nota.berat_kg > 0 ? Math.round(nota.total / nota.berat_kg) : 0;
      console.log(`Tarif per Kg  : Rp ${tarifPerKg.toLocaleString('id-ID')}`);
      console.log('-------------------');

      const choice = await askQuestion('\nApakah ingin mengubah (1) Tarif per Kg atau (2) Total Nota langsung? (Ketik 1 atau 2): ');
      if (choice === '1') {
        const newTarifInput = await askQuestion('Masukkan tarif per Kg baru (Rp): ');
        const newTarif = parseInt(newTarifInput);
        if (isNaN(newTarif) || newTarif < 0) {
          console.log('Tarif tidak valid.');
          process.exit(1);
        }
        const newTotal = Math.round(nota.berat_kg * newTarif);
        console.log(`Total baru akan dihitung: ${nota.berat_kg} kg * Rp ${newTarif.toLocaleString('id-ID')} = Rp ${newTotal.toLocaleString('id-ID')}`);
        
        const confirm = await askQuestion('Apakah Anda yakin ingin memperbarui nota? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          const { error: updateError } = await supabase
            .from('nota')
            .update({ total: newTotal })
            .eq('id', nota.id);

          if (updateError) {
            console.error('Gagal memperbarui nota:', updateError.message);
          } else {
            console.log('Nota berhasil diperbarui!');
          }
        } else {
          console.log('Dibatalkan.');
        }
      } else if (choice === '2') {
        const newTotalInput = await askQuestion('Masukkan total nota baru (Rp): ');
        const newTotal = parseInt(newTotalInput);
        if (isNaN(newTotal) || newTotal < 0) {
          console.log('Total tidak valid.');
          process.exit(1);
        }

        const confirm = await askQuestion('Apakah Anda yakin ingin memperbarui nota? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          const { error: updateError } = await supabase
            .from('nota')
            .update({ total: newTotal })
            .eq('id', nota.id);

          if (updateError) {
            console.error('Gagal memperbarui nota:', updateError.message);
          } else {
            console.log('Nota berhasil diperbarui!');
          }
        } else {
          console.log('Dibatalkan.');
        }
      } else {
        console.log('Pilihan tidak valid.');
      }
    } else {
      // Satuan/Linen
      console.log(`Tipe Nota     : SATUAN/LINEN`);
      const items = nota.items || [];
      if (items.length === 0) {
        console.log('Nota ini tidak memiliki item.');
        process.exit(0);
      }

      console.log('Daftar Item:');
      items.forEach((item: any, idx: number) => {
        console.log(`[${idx + 1}] Nama: ${item.nama} | Qty: ${item.qty} | Harga Satuan: Rp ${item.harga.toLocaleString('id-ID')} | Subtotal: Rp ${(item.harga * item.qty).toLocaleString('id-ID')}`);
      });
      console.log('-------------------');

      const itemIdxInput = await askQuestion('Pilih nomor item yang ingin diubah harganya (1-' + items.length + '): ');
      const itemIdx = parseInt(itemIdxInput) - 1;
      if (isNaN(itemIdx) || itemIdx < 0 || itemIdx >= items.length) {
        console.log('Pilihan item tidak valid.');
        process.exit(1);
      }

      const selectedItem = items[itemIdx];
      console.log(`\nAnda memilih: ${selectedItem.nama}`);
      console.log(`Harga saat ini: Rp ${selectedItem.harga.toLocaleString('id-ID')}`);
      
      const newPriceInput = await askQuestion('Masukkan harga satuan baru (Rp): ');
      const newPrice = parseInt(newPriceInput);
      if (isNaN(newPrice) || newPrice < 0) {
        console.log('Harga tidak valid.');
        process.exit(1);
      }

      // Update the price in the array
      const updatedItems = [...items];
      updatedItems[itemIdx] = {
        ...selectedItem,
        harga: newPrice
      };

      // Recalculate total
      const newTotal = updatedItems.reduce((sum: number, it: any) => sum + (it.harga * (it.qty || 0)), 0);
      console.log(`\nTotal baru nota akan menjadi: Rp ${newTotal.toLocaleString('id-ID')}`);

      const confirm = await askQuestion('Apakah Anda yakin ingin memperbarui nota? (y/n): ');
      if (confirm.toLowerCase() === 'y') {
        const { error: updateError } = await supabase
          .from('nota')
          .update({
            items: updatedItems,
            total: newTotal
          })
          .eq('id', nota.id);

        if (updateError) {
          console.error('Gagal memperbarui nota:', updateError.message);
        } else {
          console.log('Nota berhasil diperbarui!');
        }
      } else {
        console.log('Dibatalkan.');
      }
    }

  } catch (err: any) {
    console.error('Terjadi kesalahan:', err.message);
  } finally {
    rl.close();
  }
}

main();
