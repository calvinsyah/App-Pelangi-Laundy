import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lock, Unlock, Check, X, FileText, Printer, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { generateKopHTML, openPrintWindow, buildLinenRoomHTML, buildInvoicePelangganHTML } from '../../lib/printUtils';
import { fmtRp, toRoman } from '../../lib/utils';
import { generateDocumentNumber } from '../../lib/invoiceUtils';
import { useToast } from '../../components/ToastProvider';

interface Pelanggan {
  id: number;
  nama: string;
  kode_invoice: string;
  tipe: string;
  tipe_billing: string;
  tarif_flat: number;
  tarif_rs?: number;
  alamat?: string;
  kota?: string;
}

const calculateTotal = (nota: any, pel: any) => {
  if (pel?.tipe?.toUpperCase() === 'RS' && nota.items === null) {
    return (nota.berat_kg || 0) * (pel.tarif_rs || 0);
  }
  if (nota.items && Array.isArray(nota.items)) {
    let total = 0;
    nota.items.forEach((item: any) => {
      total += (item.harga || item.basePrice || 0) * (item.qty || 0);
    });
    return total;
  }
  return nota.total || 0;
};

export default function Tagihan() {
  const { toast } = useToast();
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [selectedPelanggan, setSelectedPelanggan] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  
  const [activeTab, setActiveTab] = useState<'invoice' | 'linen_room'>('invoice');
  const [selectedJenisNota, setSelectedJenisNota] = useState('');

  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const [jenisNotaList, setJenisNotaList] = useState<any[]>([]);

  // Filter data for Linen Room based on selectedJenisNota
  const filteredInvoiceData = selectedJenisNota
    ? invoiceData.filter(n => n.jenis === selectedJenisNota)
    : invoiceData;

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('pelanggan').select('*').order('nama');
      // Map to correct properties
      setPelangganList(data?.map(p => ({
        id: p.id,
        nama: p.nama,
        kode_invoice: p.kode_invoice,
        tipe: p.tipe,
        tipe_billing: p.tipe_billing || 'Reguler',
        tarif_flat: p.tarif_flat || 0,
        tarif_rs: p.tarif_rs || 0,
        alamat: p.alamat || '',
        kota: p.kota || ''
      })) || []);

      const { data: jnData } = await supabase.from('jenis_nota').select('*');
      setJenisNotaList(jnData || []);
    }
    fetchData();
  }, []);

  const checkIsNotaFlat = (nota: any) => {
    return nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
  };



  const fetchInvoice = async () => {
    if (!selectedPelanggan || !selectedBulan) return;
    setLoading(true);

    try {
      const pel = pelangganList.find(p => p.nama === selectedPelanggan);
      if (!pel) return;

      // 1. Get status lock & bayar
      const [lockRes, payRes] = await Promise.all([
        supabase.from('locks').select('is_locked, snapshot_data').eq('pelanggan_id', pel.id).eq('bulan', selectedBulan).maybeSingle(),
        supabase.from('payment_status').select('is_paid').eq('pelanggan_id', pel.id).eq('bulan', selectedBulan).maybeSingle()
      ]);

      const locked = lockRes.data?.is_locked || false;
      const snap = lockRes.data?.snapshot_data || null;
      const paid = payRes.data?.is_paid || false;
      setIsLocked(locked);
      setSnapshotData(snap);
      setIsPaid(paid);

      // 2. Fetch all nota in that month or use snapshot
      if (locked && snap && (snap as any).notas) {
        setInvoiceData((snap as any).notas);
        setInvoiceNumber((snap as any).invoiceNumber || await generateDocumentNumber('INV', pel.kode_invoice, selectedBulan));
      } else {
        const startDate = `${selectedBulan}-01`;
        const year = parseInt(selectedBulan.split('-')[0]);
        const month = parseInt(selectedBulan.split('-')[1]);
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const { data: notas, error: notaErr } = await supabase
          .from('nota')
          .select('*')
          .eq('pelanggan_id', pel.id)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)
          .order('tanggal', { ascending: true });

        if (notaErr) throw notaErr;

        setInvoiceData(notas || []);

        const noInv = await generateDocumentNumber('INV', pel.kode_invoice, selectedBulan);
        setInvoiceNumber(noInv);
      }

    } catch (err) {
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [selectedPelanggan, selectedBulan, pelangganList]);

  const handleToggleLock = async () => {
    const rawPel = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!rawPel) return;

    // Build the legacy key for backward compatibility
    const lockKey = `${selectedPelanggan}_${selectedBulan}`;
    const newLock = !isLocked;
    
    let newSnapshot = snapshotData;
    if (newLock) {
      // Create full snapshot when locking
      newSnapshot = {
        tarif_rs: rawPel.tarif_rs,
        tarif_flat: rawPel.tarif_flat,
        tipe_billing: rawPel.tipe_billing,
        tipe: rawPel.tipe,
        notas: invoiceData,
        invoiceNumber: invoiceNumber
      };
    }

    // We must pass key because it is still the primary key, but we also pass pelanggan_id and bulan
    const { error } = await supabase.from('locks').upsert({ 
      key: lockKey, 
      pelanggan_id: rawPel.id,
      bulan: selectedBulan,
      is_locked: newLock,
      snapshot_data: newSnapshot 
    });
    if (error) {
      toast(error.message || 'Gagal mengubah status kunci invoice');
    } else {
      setIsLocked(newLock);
      setSnapshotData(newSnapshot);
    }
  };

  const handleTogglePaid = async () => {
    const rawPel = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!rawPel) return;

    const lockKey = `${selectedPelanggan}_${selectedBulan}`;
    const newPaid = !isPaid;
    const { error } = await supabase.from('payment_status').upsert({ 
      key: lockKey, 
      pelanggan_id: rawPel.id,
      bulan: selectedBulan,
      is_paid: newPaid 
    });
    if (error) {
      toast(error.message || 'Gagal mengubah status pelunasan invoice');
    } else {
      setIsPaid(newPaid);
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
    }
  };

  const handleDownloadExcel = async () => {
    const rawPelData = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!rawPelData || filteredInvoiceData.length === 0) return;
    const pelData = { ...rawPelData, ...(snapshotData || {}) };
    
    setLoading(true);
    try {
      const { data: kopData } = await supabase.from('kop').select('*').maybeSingle();
      const kopHTML = generateKopHTML(kopData || { nama: 'PELANGI LAUNDRY' }, kopData?.logo_url);
      const html = await buildLinenRoomHTML(pelData, selectedBulan, filteredInvoiceData, kopHTML, selectedJenisNota);
      
      // Extract the table from HTML to put into Excel
      // We can do this easily by wrapping it
      const excelHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; }
            th { background: #1e3a5f; color: white; padding: 5px; border: 1px solid #999; }
            td { padding: 4px; border: 1px solid #ccc; }
          </style>
        </head>
        <body>
          <h2>Linen Room - ${pelData.nama} - ${selectedBulan} ${selectedJenisNota ? `(${selectedJenisNota})` : ''}</h2>
          ${html.match(/<table[\s\S]*?<\/table>/)?.[0] || '<table><tr><td>Gagal mengambil tabel</td></tr></table>'}
        </body>
        </html>
      `;

      const blob = new Blob([excelHTML], { type: "application/vnd.ms-excel" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `LinenRoom_${pelData.nama.replace(/\s/g, "_")}_${selectedBulan}.xls`;
      a.click();
    } catch (err: any) {
      toast(err.message || 'Gagal mengunduh Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleCetakLinenRoom = async () => {
    const rawPelData = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!rawPelData || filteredInvoiceData.length === 0) return;
    const pelData = { ...rawPelData, ...(snapshotData || {}) };
    setLoading(true);
    try {
      const { data: kopData } = await supabase.from('kop').select('*').maybeSingle();
      const kopHTML = generateKopHTML(kopData || { nama: 'PELANGI LAUNDRY' }, kopData?.logo_url);
      const html = await buildLinenRoomHTML(pelData, selectedBulan, filteredInvoiceData, kopHTML, selectedJenisNota);
      openPrintWindow(html, `Linen Room - ${pelData.nama}`);
    } catch (err: any) {
      toast(err.message || 'Gagal mencetak Linen Room');
    } finally {
      setLoading(false);
    }
  };

  const handleCetakInvoice = async () => {
    const rawPelData = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!rawPelData || invoiceData.length === 0) return;
    const pelData = { ...rawPelData, ...(snapshotData || {}) };
    setLoading(true);
    try {
      const { data: kopData } = await supabase.from('kop').select('*').maybeSingle();
      const kopHTML = generateKopHTML(kopData || { nama: 'PELANGI LAUNDRY' }, kopData?.logo_url);
      const html = await buildInvoicePelangganHTML(pelData, selectedBulan, invoiceData, kopHTML, invoiceNumber);
      openPrintWindow(html, `Invoice - ${pelData.nama}`);
    } catch (err: any) {
      toast(err.message || 'Gagal mencetak Invoice');
    } finally {
      setLoading(false);
    }
  };


  const rawPel = pelangganList.find(p => p.nama === selectedPelanggan);
  const pel = rawPel ? { ...rawPel, ...(snapshotData || {}) } : undefined;
  const isFlatCustomer = pel?.tipe_billing?.toUpperCase() === 'FLAT';
  const flatRate = isFlatCustomer ? pel?.tarif_flat || 0 : 0;
  
  let totalNonFlat = 0;
  invoiceData.forEach(nota => {
    const isNotaFlat = checkIsNotaFlat(nota);
    const itemTotal = calculateTotal(nota, pel);
    if (!(isFlatCustomer && isNotaFlat)) {
      totalNonFlat += itemTotal;
    }
  });

  const grandTotal = flatRate + totalNonFlat;

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Modul Tagihan & Laporan</h2>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'invoice' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('invoice')}
        >
          Invoice Bulanan
        </button>
        <button
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'linen_room' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('linen_room')}
        >
          Laporan Linen Room
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Pelanggan</label>
            <select
              value={selectedPelanggan}
              onChange={(e) => setSelectedPelanggan(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Pelanggan --</option>
              {pelangganList.map(p => (
                <option key={p.id} value={p.nama}>{p.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Bulan Tagihan</label>
            <input
              type="month"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activeTab === 'linen_room' && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Nota (Filter)</label>
              <select
                value={selectedJenisNota}
                onChange={(e) => setSelectedJenisNota(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Semua Jenis Nota --</option>
                {jenisNotaList.map(jn => (
                  <option key={jn.id} value={jn.nama}>{jn.nama}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedPelanggan && activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Detail Rincian Invoice</h3>
              <div className="text-sm font-semibold text-gray-500">{invoiceNumber}</div>
            </div>

            {loading ? (
              <div className="text-gray-500">Loading invoice data...</div>
            ) : invoiceData.length === 0 ? (
              <div className="text-gray-500">Tidak ada nota pada bulan ini.</div>
            ) : (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600 font-medium">
                      <th className="pb-2">Tanggal</th>
                      <th className="pb-2">Jenis</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFlatCustomer && flatRate > 0 && (
                      <tr className="border-b border-gray-50 bg-blue-50">
                        <td className="py-2 text-gray-800 font-semibold" colSpan={2}>Biaya Langganan Flat Bulanan</td>
                        <td className="py-2 text-right text-gray-800 font-semibold">{fmtRp(flatRate)}</td>
                      </tr>
                    )}
                    {invoiceData.map((nota, idx) => {
                      const isNotaFlat = checkIsNotaFlat(nota);
                      const itemTotal = calculateTotal(nota, pel);
                      const displayTotal = isFlatCustomer && isNotaFlat ? 0 : itemTotal;
                      
                      return (
                        <tr key={nota.id} className="border-b border-gray-50">
                          <td className="py-2 text-gray-800">{new Date(nota.tanggal).toLocaleDateString('id-ID')}</td>
                          <td className="py-2 text-gray-600">
                            {nota.jenis} {isFlatCustomer && isNotaFlat && <span className="text-xs text-blue-500 ml-1">(Flat)</span>}
                          </td>
                          <td className="py-2 text-right font-medium text-gray-800">{fmtRp(displayTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-gray-900 border-t border-gray-200">
                      <td className="pt-2" colSpan={2}>Grand Total</td>
                      <td className="pt-2 text-right">{fmtRp(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Status & Kontrol</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Kunci Invoice</span>
                  <button
                    onClick={handleToggleLock}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors ${
                      isLocked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isLocked ? (
                      <><Lock size={16} /> LOCKED</>
                    ) : (
                      <><Unlock size={16} /> UNLOCKED</>
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Status Pembayaran</span>
                  <button
                    onClick={handleTogglePaid}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors ${
                      isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    {isPaid ? (
                      <><Check size={16} /> LUNAS</>
                    ) : (
                      <><X size={16} /> BELUM BAYAR</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Dokumen Invoice</h3>
              <div className="space-y-3">
                <button
                  onClick={handleCetakInvoice}
                  disabled={loading || invoiceData.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <FileText size={18} /> Cetak Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPelanggan && activeTab === 'linen_room' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Detail Laporan Linen Room</h3>
            </div>

            {loading ? (
              <div className="text-gray-500">Loading data...</div>
            ) : filteredInvoiceData.length === 0 ? (
              <div className="text-gray-500">Tidak ada nota pada bulan ini untuk filter tersebut.</div>
            ) : (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600 font-medium">
                      <th className="pb-2">Tanggal</th>
                      <th className="pb-2">Jenis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoiceData.map((nota, idx) => (
                      <tr key={nota.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-800">{new Date(nota.tanggal).toLocaleDateString('id-ID')}</td>
                        <td className="py-2 text-gray-600">{nota.jenis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Cetak & Unduh</h3>
              <div className="space-y-3">
                <button
                  onClick={handleCetakLinenRoom}
                  disabled={loading || filteredInvoiceData.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Printer size={18} /> Cetak Linen Room
                </button>
                <button
                  onClick={handleDownloadExcel}
                  disabled={loading || filteredInvoiceData.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download size={18} /> Unduh Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
