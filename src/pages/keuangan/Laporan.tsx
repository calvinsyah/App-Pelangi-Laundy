import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { fmtRp } from '../../lib/utils';

export default function Laporan() {
  const [data, setData] = useState({
    penjualan: 0,
    totalHPP: 0,
    totalAdm: 0,
    labaBersih: 0,
    kas: 0,
    piutang: 0,
    peralatan: 0,
    utang: 0,
    modal: 0
  });
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      const startDate = `${periode}-01`;
      const year = parseInt(periode.split('-')[0]);
      const month = parseInt(periode.split('-')[1]);
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const [
        { data: notas },
        { data: biayas },
        { data: paymentStatuses },
        { data: utangs },
        { data: pengaturan },
        { data: pelanggan }
      ] = await Promise.all([
        supabase.from('nota').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('biaya').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('payment_status').select('*'),
        supabase.from('utang').select('*'),
        supabase.from('pengaturan').select('*').limit(1),
        supabase.from('pelanggan').select('id, nama')
      ]);

      const pg = pengaturan?.[0] || {};
      const peralatan = pg.peralatan || 0;
      const pelangganMap = Object.fromEntries(pelanggan?.map(p => [p.id, p]) || []);

      const paidMap: Record<string, boolean> = {};
      paymentStatuses?.forEach(ps => {
        paidMap[ps.key] = ps.is_paid;
      });

      let penjualan = 0;
      let lunasTotal = 0;
      let piutang = 0;

      // Group notas by pelanggan_id
      const notaByPelanggan: Record<number, any[]> = {};
      notas?.forEach(n => {
        if (!notaByPelanggan[n.pelanggan_id]) notaByPelanggan[n.pelanggan_id] = [];
        notaByPelanggan[n.pelanggan_id].push(n);
      });
      const { data: jnData } = await supabase.from('jenis_nota').select('*');
      const jenisNotaList = jnData || [];

      const checkIsNotaFlat = (nota: any) => {
        return nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
      };

      Object.keys(notaByPelanggan).forEach(pidStr => {
        const pid = parseInt(pidStr, 10);
        const p = pelangganMap[pid];
        if (!p) return;
        
        const isFlat = p.tipe_billing?.toUpperCase() === "FLAT";
        let customerTotal = 0;
        const arrNota = notaByPelanggan[pid];
        let hasTransaction = false;
        
        arrNota.forEach(n => {
          hasTransaction = true;
          if (isFlat && checkIsNotaFlat(n)) return;
          customerTotal += n.total || 0;
        });
        
        if (isFlat && hasTransaction) {
          customerTotal += p.tarif_flat || 0;
        }
        
        penjualan += customerTotal;
        const key = `${p.nama}_${periode}`;
        if (paidMap[key]) {
          lunasTotal += customerTotal;
        } else {
          piutang += customerTotal;
        }
      });

      const hppCategories = ["GAS", "AIR", "LISTRIK 1", "LISTRIK 2", "CHEMICAL", "BBM", "PLASTIK", "PPH PS 23", "GAJI BORONGAN"];
      let totalHPP = 0;
      let totalAdm = 0;
      let biayaDibayar = 0;
      let biayaBelumDibayar = 0;

      biayas?.forEach(b => {
        const nominal = b.nominal || 0;
        if (hppCategories.includes(b.kategori)) {
          totalHPP += nominal;
        } else {
          totalAdm += nominal;
        }

        if (b.lunas) {
          biayaDibayar += nominal;
        } else {
          biayaBelumDibayar += nominal;
        }
      });

      const labaBersih = penjualan - totalHPP - totalAdm;

      let utang = biayaBelumDibayar;
      utangs?.forEach(u => {
        if (u.status === 'AKTIF') {
          utang += (u.sisa_bulan || 0) * (u.cicilan || 0);
        }
      });

      const kas = lunasTotal - biayaDibayar;
      const modal = kas + piutang + peralatan - utang;

      setData({
        penjualan,
        totalHPP,
        totalAdm,
        labaBersih,
        kas,
        piutang,
        peralatan,
        utang,
        modal
      });
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
  }, [periode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h2>
        <div className="flex gap-4 items-center">
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cetak Laporan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading Laporan...</div>
      ) : (
        <div className="space-y-6">
          {/* Laba Rugi */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">📊 Laporan Laba Rugi</h3>
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="p-3 font-semibold" colSpan={3}>1. PENJUALAN</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Penjualan Jasa</td>
                  <td></td>
                  <td className="p-3 text-right font-medium text-gray-800">{fmtRp(data.penjualan)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold" colSpan={3}>2. HARGA POKOK PENJUALAN (HPP)</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Total HPP</td>
                  <td></td>
                  <td className="p-3 text-right font-medium text-gray-800">{fmtRp(data.totalHPP)}</td>
                </tr>
                <tr className="bg-gray-50 font-bold border-b border-gray-200">
                  <td className="p-3">LABA KOTOR</td>
                  <td></td>
                  <td className="p-3 text-right">{fmtRp(data.penjualan - data.totalHPP)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold" colSpan={3}>3. BIAYA ADMINISTRASI & UMUM</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Total Biaya Administrasi & Umum</td>
                  <td></td>
                  <td className="p-3 text-right font-medium text-gray-800">{fmtRp(data.totalAdm)}</td>
                </tr>
                <tr className="bg-green-50 text-green-800 font-bold border-b border-green-200">
                  <td className="p-3">LABA BERSIH</td>
                  <td></td>
                  <td className="p-3 text-right">{fmtRp(data.labaBersih)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Neraca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">⚖️ Neraca</h3>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="bg-gray-100 font-semibold text-gray-700">
                  <td className="p-3" colSpan={2}>ASET (Harta)</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Kas / Bank</td>
                  <td className="p-3 text-right text-gray-800">{fmtRp(data.kas)}</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Piutang Usaha</td>
                  <td className="p-3 text-right text-gray-800">{fmtRp(data.piutang)}</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Peralatan</td>
                  <td className="p-3 text-right text-gray-800">{fmtRp(data.peralatan)}</td>
                </tr>
                <tr className="font-bold border-b border-gray-200">
                  <td className="p-3">Total Aset</td>
                  <td className="p-3 text-right">{fmtRp(data.kas + data.piutang + data.peralatan)}</td>
                </tr>
                <tr className="bg-gray-100 font-semibold text-gray-700">
                  <td className="p-3" colSpan={2}>KEWAJIBAN (Utang)</td>
                </tr>
                <tr className="border-b border-gray-50 font-medium">
                  <td className="p-3 pl-8 text-gray-600">Utang Usaha</td>
                  <td className="p-3 text-right text-gray-800">{fmtRp(data.utang)}</td>
                </tr>
                <tr className="bg-gray-100 font-semibold text-gray-700">
                  <td className="p-3" colSpan={2}>MODAL</td>
                </tr>
                <tr className="font-bold bg-gray-50 border-b border-gray-200">
                  <td className="p-3">Modal Bersih</td>
                  <td className="p-3 text-right">{fmtRp(data.modal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
