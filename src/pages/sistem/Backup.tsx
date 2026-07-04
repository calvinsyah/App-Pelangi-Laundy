import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Download, Upload, RefreshCw } from 'lucide-react';

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const tables = [
    "pelanggan", "jenis_nota", "master_linen", "karyawan", "absensi", 
    "pengaturan", "kop", "harga_pelanggan", "nota", "biaya", 
    "payment_status", "locks", "utang", "gaji", "backup_history"
  ];

  const handleExport = async () => {
    setLoading(true);
    setMsg('Mengekspor data...');
    try {
      const allData: Record<string, any> = {};
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error) {
          allData[table] = data;
        }
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pelangi_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setMsg('Ekspor selesai!');
    } catch (err) {
      console.error(err);
      setMsg('Ekspor gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMsg('Mengimpor data...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        let syncCount = 0;

        for (const [table, rows] of Object.entries(json)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;
          
          // Delete old data before inserting if needed, or upsert directly
          const { error } = await supabase.from(table).upsert(rows);
          if (error) {
            console.error(`Failed to import table ${table}:`, error);
          } else {
            syncCount += rows.length;
          }
        }

        setMsg(`Impor selesai! Berhasil menyinkronkan ${syncCount} baris.`);
      } catch (err) {
        console.error(err);
        setMsg('Gagal membaca file atau mengimpor data.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Backup & Restore Data</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">{msg}</div>}

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-700">Ekspor Semua Data</h3>
          <p className="text-sm text-gray-500">
            Unduh seluruh data sistem dalam bentuk file JSON. File ini dapat digunakan untuk memulihkan data jika database Anda mengalami masalah.
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download size={18} /> Ekspor Data ke JSON
          </button>
        </div>

        <div className="border-t border-gray-100 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-700 font-sans">Impor Data (Restore)</h3>
          <p className="text-sm text-gray-500">
            Unggah file backup JSON yang sebelumnya diekspor untuk memperbarui database Supabase Anda. Tindakan ini akan menimpa data yang memiliki kecocokan ID.
          </p>
          <label className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-lg cursor-pointer transition-colors">
            <Upload size={18} /> Pilih File Backup JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
