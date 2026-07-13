import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Download, Upload, RefreshCw, Trash2, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [notaMonths, setNotaMonths] = useState<string[]>([]);
  const [backedUpMonths, setBackedUpMonths] = useState<string[]>([]);
  const [purgeMonth, setPurgeMonth] = useState('');
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const tables = [
    "pelanggan", "jenis_nota", "master_linen", "karyawan", "absensi", 
    "pengaturan", "kop", "harga_pelanggan", "linen_pelanggan", "pelanggan_nota_linen", "nota", "biaya", 
    "payment_status", "locks", "utang", "gaji", "invoice_numbers", "invoice_counter", "backup_history"
  ];

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: notaData, error } = await supabase.rpc('get_unique_nota_months');
      if (!error && notaData) {
        setNotaMonths(notaData.map((row: any) => row.bulan));
      }

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
      
      const ok = await confirm('Apakah file JSON berhasil terunduh dan tersimpan di perangkat Anda?');
      if (ok) {
        const bulanLalu = new Date().toISOString().substring(0, 7);
        const { data: existing } = await supabase.from('backup_history').select('bulan').eq('bulan', bulanLalu).maybeSingle();
        if (!existing) {
          await supabase.from('backup_history').insert({ bulan: bulanLalu });
        }
        toast('Ekspor seluruh data selesai dan tercatat!', 'success');
        fetchStatus();
      } else {
        toast('Pencatatan backup dibatalkan.', 'info');
      }
      
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

        const payloads: { table: string, rows: any[] }[] = [];

        // FORMAT 1: exportAllData → key = nama tabel Supabase (New Format)
        if (!json.data && (json.nota || json.pelanggan || json.biaya)) {
          for (const [table, rows] of Object.entries(json)) {
            if (!Array.isArray(rows) || (rows as any[]).length === 0) continue;
            payloads.push({ table, rows });
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
            DB_PELANGGAN_NOTA_LINEN: "pelanggan_nota_linen",
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
              payloads.push({ table, rows: supabaseRows });
            }
          }
        }

        if (payloads.length === 0) {
          toast('File backup tidak valid atau kosong.', 'error');
          setLoading(false);
          return;
        }

        const ringkasan = payloads.map(p => `- ${p.table}: ${p.rows.length} baris`).join('\n');
        const ok = await confirm(`Preview Impor:\n${ringkasan}\n\nPerhatian: Operasi ini bersifat MERGE (Timpa). Data dengan ID yang sama akan diperbarui, data baru akan ditambah. Lanjutkan proses impor?`);
        
        if (!ok) {
          setLoading(false);
          return;
        }

        const { error } = await supabase.rpc('restore_import_atomic', { p_payload: payloads });
        
        if (error) {
          console.error("Failed to restore via RPC:", error);
          toast(`Impor gagal: ${error.message}`, 'error');
          setLoading(false);
          return;
        }

        syncCount = payloads.reduce((acc, p) => acc + p.rows.length, 0);
        toast(`Impor (Merge) selesai! Berhasil memproses ${syncCount} baris.`, 'success');
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

  const handlePurgeDataLama = async () => {
    if (!purgeMonth) {
      toast('Silakan pilih bulan batas pembersihan!', 'error');
      return;
    }
    
    const ok1 = await confirm(`Apakah Anda yakin ingin menghapus SEMUA data transaksi (Nota, Biaya, Gaji, Absensi) sebelum bulan ${purgeMonth}?`);
    if (!ok1) return;

    const ok2 = await confirm('Tindakan ini permanen. Pastikan Anda sudah mem-backup data pada periode tersebut. Lanjutkan?');
    if (!ok2) return;

    setLoading(true);
    toast(`Menghapus transaksi sebelum ${purgeMonth}...`, 'info');
    
    try {
      const purgeDateLimit = `${purgeMonth}-01`;
      const errors: string[] = [];
      
      const { error: errNota } = await supabase.from('nota').delete().lt('tanggal', purgeDateLimit);
      if (errNota) errors.push(`Nota: ${errNota.message}`);

      const { error: errBiaya } = await supabase.from('biaya').delete().lt('tanggal', purgeDateLimit);
      if (errBiaya) errors.push(`Biaya: ${errBiaya.message}`);

      const { error: errGaji } = await supabase.from('gaji').delete().lt('periode_mulai', purgeDateLimit);
      if (errGaji) errors.push(`Gaji: ${errGaji.message}`);

      const { error: errAbsensi } = await supabase.from('absensi').delete().lt('tanggal', purgeDateLimit);
      if (errAbsensi) errors.push(`Absensi: ${errAbsensi.message}`);

      const { error: errLocks } = await supabase.from('locks').delete().lt('bulan', purgeMonth);
      if (errLocks) errors.push(`Locks: ${errLocks.message}`);

      const { error: errPayment } = await supabase.from('payment_status').delete().lt('bulan', purgeMonth);
      if (errPayment) errors.push(`Payment Status: ${errPayment.message}`);

      const { data: invData, error: invFetchErr } = await supabase.from('invoice_numbers').select('cache_key');
      if (invFetchErr) {
        errors.push(`Invoice Numbers Fetch: ${invFetchErr.message}`);
      } else if (invData) {
        const keysToDelete = invData
          .filter(r => {
            const match = r.cache_key.match(/_(\d{4}-\d{2})$/);
            return match && match[1] < purgeMonth;
          })
          .map(r => r.cache_key);

        if (keysToDelete.length > 0) {
          const { error: errInvDelete } = await supabase.from('invoice_numbers').delete().in('cache_key', keysToDelete);
          if (errInvDelete) errors.push(`Invoice Numbers Delete: ${errInvDelete.message}`);
        }
      }
      
      if (errors.length > 0) {
        toast(`Gagal membersihkan tabel: ${errors.join(', ')}`, 'error');
      } else {
        toast(`Data transaksi sebelum ${purgeMonth} berhasil dibersihkan.`, 'success');
      }
      fetchStatus();
      setPurgeMonth('');
    } catch (e) {
      console.error(e);
      toast('Gagal membersihkan data.', 'error');
    }
    setLoading(false);
  };

  const handleBersihkanData = async () => {
    const ok1 = await confirm('PERINGATAN KERAS! Apakah Anda yakin ingin MENGHAPUS SEMUA DATA TRANSAKSI?');
    if (!ok1) return;
    
    const ok2 = await confirm('Tindakan ini tidak bisa dibatalkan. Pastikan Anda sudah mengekspor data backup. Lanjutkan?');
    if (!ok2) return;
    
    setLoading(true);
    toast('Membersihkan data...', 'info');
    try {
      const errors: string[] = [];

      const { error: errNota } = await supabase.from('nota').delete().neq('id', 0);
      if (errNota) errors.push(`Nota: ${errNota.message}`);

      const { error: errBiaya } = await supabase.from('biaya').delete().neq('id', 0);
      if (errBiaya) errors.push(`Biaya: ${errBiaya.message}`);

      const { error: errGaji } = await supabase.from('gaji').delete().neq('id', 0);
      if (errGaji) errors.push(`Gaji: ${errGaji.message}`);

      const { error: errAbsensi } = await supabase.from('absensi').delete().neq('id', 0);
      if (errAbsensi) errors.push(`Absensi: ${errAbsensi.message}`);

      const { error: errLocks } = await supabase.from('locks').delete().neq('key', '');
      if (errLocks) errors.push(`Locks: ${errLocks.message}`);

      const { error: errPayment } = await supabase.from('payment_status').delete().neq('key', '');
      if (errPayment) errors.push(`Payment Status: ${errPayment.message}`);

      const { error: errInvNum } = await supabase.from('invoice_numbers').delete().neq('cache_key', '');
      if (errInvNum) errors.push(`Invoice Numbers: ${errInvNum.message}`);

      const { error: errInvCount } = await supabase.from('invoice_counter').delete().neq('counter_key', '');
      if (errInvCount) errors.push(`Invoice Counter: ${errInvCount.message}`);

      if (errors.length > 0) {
        toast(`Gagal membersihkan tabel: ${errors.join(', ')}`, 'error');
      } else {
        toast('Data transaksi berhasil dibersihkan.', 'success');
      }
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
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${bulan}-${String(lastDay).padStart(2, '0')}`;

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
      const masterTables = [
        "pelanggan", "jenis_nota", "master_linen", "karyawan", "pengaturan", 
        "kop", "harga_pelanggan", "linen_pelanggan", "pelanggan_nota_linen", 
        "payment_status", "locks", "utang", "invoice_numbers", "invoice_counter"
      ];
      for (const table of masterTables) {
        const { data } = await supabase.from(table).select('*');
        allData[table] = data;
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pelangi_backup_${bulan}.json`;
      a.click();
      
      const ok = await confirm(`Apakah file backup bulan ${bulan} berhasil terunduh dan tersimpan?`);
      if (ok) {
        const { data: existing } = await supabase.from('backup_history').select('bulan').eq('bulan', bulan).maybeSingle();
        if (!existing) {
          await supabase.from('backup_history').insert({ bulan });
        }
        toast(`Backup bulan ${bulan} selesai dicatat!`, 'success');
        fetchStatus();
      } else {
        toast('Pencatatan backup dibatalkan.', 'info');
      }
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
      const { data: notaData } = await supabase.from("nota").select("*, pelanggan(nama)");
      
      const rusak = (notaData || []).filter((n) => {
        // Nota Kiloan/RS valid jika memiliki berat_kg > 0
        const isNotaKiloanValid = n.berat_kg !== null && n.berat_kg > 0;
        
        // Nota Reguler/Flat valid jika memiliki items > 0
        const isNotaItemsValid = n.items && Array.isArray(n.items) && n.items.length > 0;

        // Nota dianggap rusak jika tidak valid Kiloan dan tidak valid Reguler/Flat
        return !isNotaKiloanValid && !isNotaItemsValid;
      });

      if (rusak.length > 0) {
        const maxDisplay = 15;
        const rincianList = rusak.slice(0, maxDisplay).map((r: any) => 
          `- ${r.nota_id || 'Tanpa ID'} (${r.tanggal}) - ${r.pelanggan?.nama || 'Tanpa Nama'}`
        );
        let rincian = rincianList.join('\n');
        if (rusak.length > maxDisplay) {
          rincian += `\n... dan ${rusak.length - maxDisplay} nota lainnya`;
        }

        const ok = await confirm(`Ditemukan ${rusak.length} nota rusak (kosong tanpa berat/item):\n\n${rincian}\n\nHapus nota-nota ini secara permanen?`);
        if (!ok) {
          setLoading(false);
          return;
        }

        const ids = rusak.map((r: any) => r.id);
        const { error } = await supabase.from("nota").delete().in("id", ids);

        if (error) {
          toast(`Gagal menghapus batch nota rusak: ${error.message}`, "error");
        } else {
          toast(`${rusak.length} nota rusak dihapus dari database.`, "success");
        }
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
          <h3 className="text-lg font-bold text-gray-700 font-sans">Impor Data (Merge / Sinkronisasi)</h3>
          <p className="text-sm text-gray-500">
            Unggah file backup JSON yang sebelumnya diekspor untuk melakukan sinkronisasi/merge ke database. Tindakan ini HANYA akan menimpa data yang memiliki kecocokan ID, atau menambah baris baru. <strong>Ini BUKAN pemulihan titik-waktu penuh yang menghapus/me-reset data saat ini.</strong>
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

        <div className="border-t border-orange-100 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-orange-700">Hapus Data Transaksi Lama (Archive)</h3>
          <p className="text-sm text-orange-600">
            Pilih bulan. Semua transaksi (Nota, Pengeluaran, Gaji) <strong>sebelum</strong> bulan yang dipilih akan dihapus permanen. Gunakan fitur ini untuk menghemat kapasitas database.
          </p>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Batas Waktu (Sebelum Bulan Ini)</label>
              <input
                type="month"
                value={purgeMonth}
                onChange={(e) => setPurgeMonth(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-2 border"
                disabled={loading}
              />
            </div>
            <button
              onClick={handlePurgeDataLama}
              disabled={loading || !purgeMonth}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Calendar size={18} /> Hapus Data Lama
            </button>
          </div>
        </div>

        <div className="border-t border-red-100 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-red-700">Bersihkan Semua Data (Maintenance)</h3>
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
