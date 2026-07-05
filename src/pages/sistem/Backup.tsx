import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Download, Upload, RefreshCw, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [notaMonths, setNotaMonths] = useState<string[]>([]);
  const [backedUpMonths, setBackedUpMonths] = useState<string[]>([]);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const tables = [
    "pelanggan", "jenis_nota", "master_linen", "karyawan", "absensi", 
    "pengaturan", "kop", "harga_pelanggan", "linen_pelanggan", "nota", "biaya", 
    "payment_status", "locks", "utang", "gaji", "invoice_numbers", "invoice_counter", "backup_history"
  ];

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: notaData } = await supabase.from('nota').select('tanggal');
      const months = new Set<string>();
      notaData?.forEach(n => {
        if (n.tanggal) months.add(n.tanggal.substring(0, 7));
      });
      setNotaMonths(Array.from(months).sort().reverse());

      const { data: backupData } = await supabase.from('backup_history').select('bulan');
      setBackedUpMonths(backupData?.map(b => b.bulan) || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    toast('Mengekspor data...', 'info');
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
      toast('Ekspor seluruh data selesai!', 'success');
      
      const bulanLalu = new Date().toISOString().substring(0, 7);
      await supabase.from('backup_history').upsert({ bulan: bulanLalu, tanggal_backup: new Date().toISOString() });
      fetchStatus();
      
    } catch (err) {
      console.error(err);
      toast('Ekspor gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    toast('Mengimpor data...', 'info');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        let syncCount = 0;

        // FORMAT 1: exportAllData → key = nama tabel Supabase (New Format)
        if (!json.data && (json.nota || json.pelanggan || json.biaya)) {
          for (const [table, rows] of Object.entries(json)) {
            if (!Array.isArray(rows) || (rows as any[]).length === 0) continue;
            const { error } = await supabase.from(table).upsert(rows);
            if (error) console.error(`Failed to import table ${table}:`, error);
            else syncCount += (rows as any[]).length;
          }
        }
        // FORMAT 2: backupBulan → key = DB_XXX → perlu transform ke Supabase format (Legacy Format)
        else if (json.data) {
          const mapTable: Record<string, string> = {
            DB_NOTA: "nota", DB_BIAYA: "biaya", DB_PELANGGAN: "pelanggan",
            DB_KARYAWAN: "karyawan", DB_ABSENSI: "absensi",
            DB_JENIS_NOTA: "jenis_nota", DB_MASTER_LINEN: "master_linen",
            DB_HARGA_PELANGGAN: "harga_pelanggan", DB_PENGATURAN: "pengaturan",
            DB_KOP: "kop", DB_UTANG: "utang", DB_LOCKS: "locks",
            DB_PAYMENT_STATUS: "payment_status", DB_INVOICE_NUMBERS: "invoice_numbers",
            DB_INVOICE_COUNTER: "invoice_counter", DB_BACKUP_HISTORY: "backup_history",
            DB_LINEN_PELANGGAN: "linen_pelanggan",
          };

          for (const [key, value] of Object.entries(json.data)) {
            const table = mapTable[key]; 
            if (!table) continue;
            let supabaseRows: any[] = [];
            const rows = value as any;

            if (table === "pelanggan" && Array.isArray(rows)) {
              supabaseRows = rows.map((r: any) => ({
                id: r.id, 
                nama: r.name || r.nama, 
                kode_invoice: r.kode || r.kode_invoice,
                tipe: r.type || r.tipe, 
                tipe_billing: r.billingSystem || r.tipe_billing || r.billing_system || 'Reguler',
                tarif_flat: r.flatRate || r.tarif_flat || r.flat_rate || 0, 
                tarif_rs: r.tarifRS || r.tarif_rs || 0,
                alamat: r.alamat || '', 
                kota: r.kota || ''
              }));
            } else if (table === "harga_pelanggan") {
              if (Array.isArray(rows)) {
                supabaseRows = rows;
              } else if (typeof rows === 'object' && rows !== null) {
                // Object nested → array of rows
                Object.entries(rows).forEach(([pid, map]: [string, any]) => {
                  Object.entries(map).forEach(([lid, harga]) => {
                    supabaseRows.push({ pelanggan_id: parseInt(pid), linen_id: parseInt(lid), harga });
                  });
                });
              }
            } else if (Array.isArray(rows)) {
              supabaseRows = rows;
            }

            if (supabaseRows.length > 0) {
              const { error } = await supabase.from(table).upsert(supabaseRows);
              if (error) console.error(`Failed to import legacy table ${table}:`, error);
              else syncCount += supabaseRows.length;
            }
          }
        }

        toast(`Impor selesai! Berhasil menyinkronkan ${syncCount} baris.`, 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        toast('Gagal membaca file atau mengimpor data.', 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleBersihkanData = async () => {
    const ok1 = await confirm('PERINGATAN KERAS! Apakah Anda yakin ingin MENGHAPUS SEMUA DATA TRANSAKSI?');
    if (!ok1) return;
    
    const ok2 = await confirm('Tindakan ini tidak bisa dibatalkan. Pastikan Anda sudah mengekspor data backup. Lanjutkan?');
    if (!ok2) return;
    
    setLoading(true);
    toast('Membersihkan data...', 'info');
    try {
      await supabase.from('nota').delete().neq('id', 0);
      await supabase.from('biaya').delete().neq('id', 0);
      await supabase.from('gaji').delete().neq('id', 0);
      await supabase.from('absensi').delete().neq('id', 0);
      toast('Data transaksi berhasil dibersihkan.', 'success');
    } catch (e) {
      toast('Gagal membersihkan data.', 'error');
    }
    setLoading(false);
  };

  const handleBackupBulan = async (bulan: string) => {
    setLoading(true);
    toast(`Menyiapkan backup bulan ${bulan}...`, 'info');
    try {
      const allData: Record<string, any> = {};
      
      // Ambil transaksi hanya untuk bulan ini
      const startDate = `${bulan}-01`;
      const year = parseInt(bulan.split('-')[0]);
      const month = parseInt(bulan.split('-')[1]);
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const [
        { data: nota }, { data: biaya }, { data: gaji }, { data: absensi }
      ] = await Promise.all([
        supabase.from('nota').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('biaya').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('gaji').select('*').gte('periode_mulai', startDate).lte('periode_mulai', endDate),
        supabase.from('absensi').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
      ]);
      allData['nota'] = nota;
      allData['biaya'] = biaya;
      allData['gaji'] = gaji;
      allData['absensi'] = absensi;

      // Ambil master data full
      const masterTables = ["pelanggan", "jenis_nota", "master_linen", "karyawan", "pengaturan", "kop", "harga_pelanggan", "payment_status", "utang"];
      for (const table of masterTables) {
        const { data } = await supabase.from(table).select('*');
        allData[table] = data;
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pelangi_backup_${bulan}.json`;
      a.click();
      
      await supabase.from('backup_history').upsert({ bulan, tanggal_backup: new Date().toISOString() });
      toast(`Backup bulan ${bulan} selesai!`, 'success');
      fetchStatus();
    } catch (err) {
      console.error(err);
      toast('Backup gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBersihkanNotaRusak = async () => {
    setLoading(true);
    try {
      const { data: notaData } = await supabase.from("nota").select("*");
      
      const rusak = (notaData || []).filter((n) => {
        // Nota Kiloan/RS valid jika memiliki berat_kg > 0
        const isNotaKiloanValid = n.berat_kg !== null && n.berat_kg > 0;
        
        // Nota Reguler/Flat valid jika memiliki items > 0
        const isNotaItemsValid = n.items && Array.isArray(n.items) && n.items.length > 0;

        // Nota dianggap rusak jika tidak valid Kiloan dan tidak valid Reguler/Flat
        return !isNotaKiloanValid && !isNotaItemsValid;
      });

      if (rusak.length > 0) {
        for (const n of rusak) {
          await supabase.from("nota").delete().eq("id", n.id);
        }
        toast(`${rusak.length} nota rusak dihapus dari database.`, "success");
      } else {
        toast("Tidak ada nota rusak.", "info");
      }
    } catch (err) {
      console.error(err);
      toast("Gagal membersihkan nota rusak.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Backup & Restore Data</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">

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

        <div className="border-t border-gray-100 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-700">Tabel Status Backup per Bulan</h3>
          <p className="text-sm text-gray-500 mb-2">Penting: Lakukan backup secara berkala untuk setiap bulan transaksi.</p>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="py-2.5 px-4">Bulan</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {notaMonths.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">Belum ada transaksi tercatat.</td>
                  </tr>
                ) : (
                  notaMonths.map(bln => {
                    const isBackedUp = backedUpMonths.includes(bln);
                    return (
                      <tr key={bln} className="border-b border-gray-50">
                        <td className="py-2.5 px-4 font-medium text-gray-800">{bln}</td>
                        <td className="py-2.5 px-4">
                          {isBackedUp ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-md text-sm font-semibold">
                              <CheckCircle size={14} /> Terbackup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded-md text-sm font-semibold">
                              <AlertTriangle size={14} /> Belum
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleBackupBulan(bln)}
                            disabled={loading}
                            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Backup
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-red-100 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-red-700">Bersihkan Data (Maintenance)</h3>
          <p className="text-sm text-red-500">
            Peringatan: Tindakan ini akan <strong>menghapus SEMUA data transaksi</strong> di dalam aplikasi (Nota, Pengeluaran, Gaji). Data Master (Pelanggan, Karyawan, dll) akan tetap aman. Harap lakukan Backup terlebih dahulu!
          </p>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handleBersihkanData}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} /> Bersihkan Semua Data Transaksi
            </button>
            <button
              onClick={handleBersihkanNotaRusak}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} /> Bersihkan Nota Rusak (Kosong)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
