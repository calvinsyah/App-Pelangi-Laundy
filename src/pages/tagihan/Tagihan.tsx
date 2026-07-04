import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lock, Unlock, Check, X, FileText, Printer, Download } from 'lucide-react';

interface Pelanggan {
  id: number;
  nama: string;
  kode: string;
  tipe: string;
  tipe_billing: string;
  tarif_flat: number;
}

export default function Tagihan() {
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPelanggan, setSelectedPelanggan] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  useEffect(() => {
    async function fetchPelanggan() {
      const { data } = await supabase.from('pelanggan').select('*').order('nama');
      // Map to correct properties
      setPelangganList(data?.map(p => ({
        id: p.id,
        nama: p.nama,
        kode: p.kode,
        tipe: p.tipe,
        tipe_billing: p.billing_system || 'Reguler',
        tarif_flat: p.flat_rate || 0
      })) || []);
    }
    fetchPelanggan();
  }, []);

  const toRoman = (num: number): string => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[num] || "";
  };

  const getInvoiceNumber = async (pel: Pelanggan, bln: string) => {
    const [tahun, bulanStr] = bln.split("-");
    const bulanNum = parseInt(bulanStr, 10);
    const key = `${pel.kode}_${bln}`;
    const counterKey = `${pel.kode}_${tahun}`;

    // Get existing cache
    const { data: cached } = await supabase
      .from('invoice_numbers')
      .select('nomor')
      .eq('cache_key', key)
      .maybeSingle();

    if (cached) return cached.nomor;

    // Get counter
    const { data: counterData } = await supabase
      .from('invoice_counter')
      .select('nilai')
      .eq('counter_key', counterKey)
      .maybeSingle();

    const currentCounter = (counterData?.nilai || 0) + 1;

    const formattedNo = `${String(currentCounter).padStart(3, "0")}/PL-${pel.kode}/${toRoman(bulanNum)}/${tahun}`;

    // Save back
    await supabase.from('invoice_numbers').upsert({ cache_key: key, nomor: formattedNo });
    await supabase.from('invoice_counter').upsert({ counter_key: counterKey, nilai: currentCounter });

    return formattedNo;
  };

  const fetchInvoice = async () => {
    if (!selectedPelanggan || !selectedBulan) return;
    setLoading(true);

    try {
      const pel = pelangganList.find(p => p.nama === selectedPelanggan);
      if (!pel) return;

      // 1. Get status lock & bayar
      const lockKey = `${selectedPelanggan}_${selectedBulan}`;
      const [lockRes, payRes] = await Promise.all([
        supabase.from('locks').select('is_locked').eq('key', lockKey).maybeSingle(),
        supabase.from('payment_status').select('is_paid').eq('key', lockKey).maybeSingle()
      ]);

      const locked = lockRes.data?.is_locked || false;
      const paid = payRes.data?.is_paid || false;
      setIsLocked(locked);
      setIsPaid(paid);

      // 2. Fetch all nota in that month
      const { data: notas, error: notaErr } = await supabase
        .from('nota')
        .select('*')
        .eq('pelanggan_id', pel.id)
        .like('tanggal', `${selectedBulan}%`);

      if (notaErr) throw notaErr;

      setInvoiceData(notas || []);

      const noInv = await getInvoiceNumber(pel, selectedBulan);
      setInvoiceNumber(noInv);

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
    const lockKey = `${selectedPelanggan}_${selectedBulan}`;
    const newLock = !isLocked;
    const { error } = await supabase.from('locks').upsert({ key: lockKey, is_locked: newLock });
    if (!error) {
      setIsLocked(newLock);
    }
  };

  const handleTogglePaid = async () => {
    const lockKey = `${selectedPelanggan}_${selectedBulan}`;
    const newPaid = !isPaid;
    const { error } = await supabase.from('payment_status').upsert({ key: lockKey, is_paid: newPaid });
    if (!error) {
      setIsPaid(newPaid);
    }
  };

  const handleDownloadExcel = () => {
    let rows = '';
    const pel = pelangganList.find(p => p.nama === selectedPelanggan);
    const isFlatCustomer = pel?.tipe_billing === 'Flat';
    const flatRate = isFlatCustomer ? pel?.tarif_flat || 0 : 0;

    if (isFlatCustomer && flatRate > 0) {
      rows += `<tr><td colspan="3">Biaya Langganan Flat Bulanan</td><td align="right">${flatRate}</td></tr>`;
    }

    invoiceData.forEach((nota, idx) => {
      const isNotaFlat = nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
      rows += `<tr>
        <td>${idx + 1}</td>
        <td>${new Date(nota.tanggal).toLocaleDateString('id-ID')}</td>
        <td>${nota.jenis}</td>
        <td align="right">${isFlatCustomer && isNotaFlat ? 0 : (nota.total || 0)}</td>
      </tr>`;
    });

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
        <h2>Linen Room - ${selectedPelanggan} - ${selectedBulan}</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" align="right"><strong>Total</strong></td>
              <td align="right"><strong>${grandTotal}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHTML], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `LinenRoom_${selectedPelanggan.replace(/\s/g, "_")}_${selectedBulan}.xls`;
    a.click();
  };

  const fmtRp = (val: number) => "Rp " + Math.floor(val).toLocaleString("id-ID");

  const pel = pelangganList.find(p => p.nama === selectedPelanggan);
  const isFlatCustomer = pel?.tipe_billing === 'Flat';
  const flatRate = isFlatCustomer ? pel?.tarif_flat || 0 : 0;
  
  let totalNonFlat = 0;
  invoiceData.forEach(nota => {
    const isNotaFlat = nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
    if (!(isFlatCustomer && isNotaFlat)) {
      totalNonFlat += nota.total || 0;
    }
  });

  const grandTotal = flatRate + totalNonFlat;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Modul Tagihan (Invoice)</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {selectedPelanggan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Detail Rincian</h3>
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
                    {invoiceData.map(nota => {
                      const isNotaFlat = nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
                      return (
                        <tr key={nota.id} className="border-b border-gray-50">
                          <td className="py-2 text-gray-800">{new Date(nota.tanggal).toLocaleDateString('id-ID')}</td>
                          <td className="py-2 text-gray-800">{nota.jenis}</td>
                          <td className="py-2 text-right text-gray-800">
                            {isFlatCustomer && isNotaFlat ? '0 (Flat)' : fmtRp(nota.total || 0)}
                          </td>
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
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Dokumen</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={18} /> Cetak Invoice / Kwitansi
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  <Download size={18} /> Unduh Excel (Linen Room)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
