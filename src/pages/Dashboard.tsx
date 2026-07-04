import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    omset: 0,
    hpp: 0,
    adm: 0,
    laba: 0,
    piutang: 0,
    utang: 0,
    kas: 0,
    modal: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculateMetrics() {
      setLoading(true);
      try {
        const [
          { data: notas },
          { data: biayas },
          { data: paymentStatuses },
          { data: utangs },
          { data: pengaturan }
        ] = await Promise.all([
          supabase.from('nota').select('*'),
          supabase.from('biaya').select('*'),
          supabase.from('payment_status').select('*'),
          supabase.from('utang').select('*'),
          supabase.from('pengaturan').select('*').limit(1)
        ]);

        const pg = pengaturan?.[0] || {};
        const peralatan = pg.peralatan || 0;

        // Payment status map
        const paidMap: Record<string, boolean> = {};
        paymentStatuses?.forEach(ps => {
          paidMap[ps.key] = ps.is_paid;
        });

        // 1. Omset (Penjualan Jasa)
        let penjualan = 0;
        let lunasTotal = 0;
        let piutang = 0;

        notas?.forEach(n => {
          penjualan += n.total || 0;
          const key = `${n.pelanggan_id}_${n.tanggal ? n.tanggal.substring(0, 7) : ''}`;
          if (paidMap[key]) {
            lunasTotal += n.total || 0;
          } else {
            piutang += n.total || 0;
          }
        });

        // 2. HPP (GAJI BORONGAN, LISTRIK 1, LISTRIK 2, GAS, AIR, CHEMICAL, BBM, PLASTIK, PPH PS 23)
        const hppCategories = ["GAJI BORONGAN", "LISTRIK 1", "LISTRIK 2", "GAS", "AIR", "CHEMICAL", "BBM", "PLASTIK", "PPH PS 23"];
        let hpp = 0;
        let adm = 0;
        let biayaDibayar = 0;
        let biayaBelumDibayar = 0;

        biayas?.forEach(b => {
          const nominal = b.nominal || 0;
          if (hppCategories.includes(b.kategori)) {
            hpp += nominal;
          } else {
            adm += nominal;
          }

          if (b.lunas) {
            biayaDibayar += nominal;
          } else {
            biayaBelumDibayar += nominal;
          }
        });

        const laba = penjualan - hpp - adm;

        // 3. Utang
        let totalUtang = biayaBelumDibayar;
        utangs?.forEach(u => {
          if (u.status === 'AKTIF') {
            totalUtang += (u.sisa_bulan || 0) * (u.cicilan || 0);
          }
        });

        // 4. Kas & Modal
        const kas = lunasTotal - biayaDibayar;
        const modal = kas + piutang + peralatan - totalUtang;

        setMetrics({
          omset: penjualan,
          hpp,
          adm,
          laba,
          piutang,
          utang: totalUtang,
          kas,
          modal
        });
      } catch (err) {
        console.error('Error calculating metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    calculateMetrics();
  }, []);

  const fmtRp = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? "- " : "";
    return sign + "Rp " + Math.floor(abs).toLocaleString("id-ID");
  };

  if (loading) return <div className="text-gray-500">Loading Dashboard...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Keuangan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Penjualan Bersih (Omset)</h3>
          <p className="text-2xl font-bold text-blue-600">{fmtRp(metrics.omset)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total HPP</h3>
          <p className="text-2xl font-bold text-red-600">{fmtRp(metrics.hpp)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Laba Bersih</h3>
          <p className={`text-2xl font-bold ${metrics.laba >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtRp(metrics.laba)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Piutang Usaha</h3>
          <p className="text-2xl font-bold text-amber-600">{fmtRp(metrics.piutang)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Utang Usaha</h3>
          <p className="text-2xl font-bold text-red-500">{fmtRp(metrics.utang)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Kas / Bank</h3>
          <p className="text-2xl font-bold text-emerald-600">{fmtRp(metrics.kas)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Modal Bersih</h3>
          <p className="text-2xl font-bold text-gray-800">{fmtRp(metrics.modal)}</p>
        </div>
      </div>
    </div>
  );
}
