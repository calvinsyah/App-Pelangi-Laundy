import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [periode, setPeriode] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
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
          { data: pengaturan },
          { data: pelangganData }
        ] = await Promise.all([
          supabase.from('nota').select('*').like('tanggal', `${periode}%`),
          supabase.from('biaya').select('*').like('tanggal', `${periode}%`),
          supabase.from('payment_status').select('*'),
          supabase.from('utang').select('*'),
          supabase.from('pengaturan').select('*').limit(1),
          supabase.from('pelanggan').select('*')
        ]);

        const pg = pengaturan?.[0] || {};
        const peralatan = pg.peralatan || 0;

        const paymentStatusMap: Record<string, boolean> = {};
        paymentStatuses?.forEach(ps => {
          paymentStatusMap[ps.key] = ps.is_paid;
        });
        
        // Helper to check if a bill is paid
        const isLunas = (pelangganNama: string, bulanYYYYMM: string) => {
          return paymentStatusMap[`${pelangganNama}_${bulanYYYYMM}`] === true;
        };

        const pelangganList = pelangganData || [];

        // Helper to get total invoice per customer per month
        const totalInvoiceOf = (pData: any, bln: string, arrNota: any[]) => {
          if (!pData) return 0;
          const isFlat = pData.tipe === "HOTEL" && pData.billing_system === "FLAT";
          let total = 0;
          
          arrNota
            .filter((n) => n.pelanggan_id === pData.id && n.tanggal && n.tanggal.startsWith(bln))
            .forEach((nota) => {
              if (isFlat && (nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI")) return;
              total += nota.total || 0;
            });
            
          if (isFlat) {
            total += pData.flat_rate || 0;
          }
          return total;
        };

        // Extract unique months from notas
        const bulanSet = new Set<string>();
        notas?.forEach((nota) => {
          if (nota.tanggal) bulanSet.add(nota.tanggal.substring(0, 7));
        });

        // 1. Omset (Penjualan Bersih)
        let totalPendapatan = 0;
        let pendapatanLunas = 0;
        let piutang = 0;

        pelangganList.forEach((p) => {
          bulanSet.forEach((bln) => {
            const tagihan = totalInvoiceOf(p, bln, notas || []);
            if (tagihan > 0) {
              totalPendapatan += tagihan;
              if (isLunas(p.nama, bln)) {
                pendapatanLunas += tagihan;
              } else {
                piutang += tagihan;
              }
            }
          });
        });

        const penjualan = totalPendapatan;
        const biayaFiltered = biayas || [];
        
        const sumByKat = (kat: string) => {
          return biayaFiltered.filter((b) => b.kategori === kat).reduce((s, b) => s + (b.nominal || 0), 0);
        };

        // 2. HPP
        const totalHPP = 
          sumByKat("GAJI BORONGAN") + 
          sumByKat("LISTRIK 1") + 
          sumByKat("LISTRIK 2") + 
          sumByKat("GAS") + 
          sumByKat("AIR") + 
          sumByKat("CHEMICAL") + 
          sumByKat("BBM") + 
          sumByKat("PLASTIK") + 
          sumByKat("PPH PS 23");

        // Biaya Adm
        const totalAdm = 
          sumByKat("GAJI TETAP") + 
          sumByKat("MAKAN") + 
          sumByKat("PERAWATAN MESIN") + 
          sumByKat("IURAN SAMPAH") + 
          sumByKat("IURAN RT") + 
          sumByKat("LAIN-LAIN");

        // Laba Bersih
        const laba = penjualan - totalHPP - totalAdm;

        // 3. Utang
        let utang = biayaFiltered.filter((b) => !b.lunas).reduce((s, b) => s + (b.nominal || 0), 0);
        utangs?.forEach((u) => {
          if (u.status === "AKTIF") {
            utang += (u.sisa_bulan || 0) * (u.cicilan || 0);
          }
        });

        // 4. Kas & Modal
        const biayaDibayar = biayaFiltered.filter((b) => b.lunas).reduce((s, b) => s + (b.nominal || 0), 0);
        const kas = pendapatanLunas - biayaDibayar;
        const modal = kas + piutang + peralatan - utang;

        setMetrics({
          omset: penjualan,
          hpp: totalHPP,
          adm: totalAdm,
          laba,
          piutang,
          utang,
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
  }, [periode]);

  const fmtRp = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? "- " : "";
    return sign + "Rp " + Math.floor(abs).toLocaleString("id-ID");
  };

  if (loading) return <div className="text-gray-500">Loading Dashboard...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Keuangan</h2>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <label className="text-sm font-semibold text-gray-600">Periode:</label>
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-gray-800 font-bold outline-none cursor-pointer"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Penjualan Bersih (Omset)</h3>
          <p className="text-2xl font-bold text-blue-600">{fmtRp(metrics.omset)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total HPP</h3>
          <p className="text-2xl font-bold text-red-600">{fmtRp(metrics.hpp)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{background: 'linear-gradient(135deg, #f97316, #ea580c)'}}>
          <h3 className="text-sm font-medium text-orange-100 mb-1">Biaya Adm & Umum</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.adm)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Laba Bersih</h3>
          <p className={`text-2xl font-bold ${metrics.laba >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtRp(metrics.laba)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{background: 'linear-gradient(135deg, #eab308, #ca8a04)'}}>
          <h3 className="text-sm font-medium text-yellow-100 mb-1">Piutang Usaha</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.piutang)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{background: 'linear-gradient(135deg, #b91c1c, #991b1b)'}}>
          <h3 className="text-sm font-medium text-red-100 mb-1">Utang Usaha</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.utang)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{background: 'linear-gradient(135deg, #0d9488, #0f766e)'}}>
          <h3 className="text-sm font-medium text-teal-100 mb-1">Kas / Bank</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.kas)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{background: 'linear-gradient(135deg, #7c3aed, #6d28d9)'}}>
          <h3 className="text-sm font-medium text-purple-100 mb-1">Modal Bersih</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.modal)}</p>
        </div>
      </div>
    </div>
  );
}
