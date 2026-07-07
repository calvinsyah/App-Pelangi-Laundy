const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role to bypass RLS for backup

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const tables = [
  "pelanggan", "jenis_nota", "master_linen", "karyawan", "absensi", 
  "pengaturan", "kop", "harga_pelanggan", "linen_pelanggan", "pelanggan_nota_linen", "nota", "biaya", 
  "payment_status", "locks", "utang", "gaji", "invoice_numbers", "invoice_counter", "backup_history"
];

async function runBackup() {
  const backupData = {};
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Failed to backup table ${table}:`, error);
    } else {
      backupData[table] = data;
    }
  }

  const dir = path.join(__dirname, '../backups');
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }

  const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(path.join(dir, fileName), JSON.stringify(backupData, null, 2));
  console.log(`Backup saved to backups/${fileName}`);
}

runBackup();
