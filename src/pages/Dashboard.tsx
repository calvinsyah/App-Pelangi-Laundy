import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fmtRp } from '../lib/utils';

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
        const blnPrefix = periode;
        const year = parseInt(periode.split('-')[0]);
        const month = parseInt(periode.split('-')[1]);
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${periode}-${String(lastDay).padStart(2, '0')}`;

        // Fetch paginated all-time data to avoid 1000 row limits
        const fetchAll = async (table: string, dateCol: string) => {
          let allData: any[] = [];
          let from = 0;
          let step = 1000;
          while (true) {
            const { data, error } = await supabase.from(table).select('*').lte(dateCol, endDate).range(from, from + step - 1);
            if (error || !data || data.length === 0) break;
            allData = [...allData, ...data];
            if (data.length < step) break;
            from += step;
          }
          return allData;
        };

        const [
          allNotas,
          allBiayas,
          { data: paymentStatuses },
          { data: utangs },
          { data: pengaturan },
          { data: pelangganData },
          { data: hargaPelanggan },
          { data: jenisNotaData }
        ] = await Promise.all([
          fetchAll('nota', 'tanggal'),
          fetchAll('biaya', 'tanggal'),
          supabase.from('payment_status').select('*').limit(10000),
          supabase.from('utang').select('*').lte('inserted_at', endDate + 'T23:59:59').limit(10000),
          supabase.from('pengaturan').select('*').limit(1),
          supabase.from('pelanggan').select('*').limit(10000),
          supabase.from('harga_pelanggan').select('*').limit(10000),
          supabase.from('jenis_nota').select('*')
        ]);

        const jenisNotaList = jenisNotaData || [];
        const checkIsNotaFlat = (nota: any) => {
          return nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
        };

        const pg = pengaturan?.[0] || {};
        const peralatan = pg.peralatan || 0;
        const pelangganList = pelangganData || [];

        const paymentStatusMap: Record<string, boolean> = {};
        paymentStatuses?.forEach(ps => {
          paymentStatusMap[ps.key] = ps.is_paid;
        });
        const isLunas = (pelangganNama: string, blnYYYYMM: string) => {
          return paymentStatusMap[`${pelangganNama}_${blnYYYYMM}`] === true;
        };

        // Helper to calculate Tagihan for a specific customer in a specific month
        const hitungTagihan = (pData: any, arrNota: any[], prefixBln: string) => {
          if (!pData) return 0;
          const isRS = pData.tipe?.toUpperCase() === 'RS';
          const isFlat = pData.tipe_billing?.toUpperCase() === 'FLAT';
          const notasCust = arrNota.filter((n) => n.pelanggan_id === pData.id && n.tanggal && n.tanggal.startsWith(prefixBln));
          if (notasCust.length === 0 && !isFlat) return 0;

          let total = 0;

          if (isRS) {
            notasCust.forEach((nota) => {
              if (nota.items && Array.isArray(nota.items)) {
                nota.items.forEach((it: any) => {
                  const hp = hargaPelanggan?.find(h => h.pelanggan_id === pData.id && h.linen_id === it.linen_id);
                  const price = hp ? hp.harga : 0;
                  total += (it.qty || 0) * price;
                });
              } else {
                total += nota.total || (nota.berat_kg || 0) * (pData.tarif_rs || 0);
              }
            });
          } else if (isFlat) {
            if (notasCust.length > 0) {
              total += pData.tarif_flat || 0;
            }
            notasCust.forEach((nota) => {
              if (!checkIsNotaFlat(nota)) {
                total += nota.total || 0;
              }
            });
          } else {
            notasCust.forEach((nota) => {
              total += nota.total || 0;
            });
          }
          return total;
        };

        // Extract all unique months
        const allBulanSet = new Set<string>();
        allNotas.forEach((nota) => {
          if (nota.tanggal) allBulanSet.add(nota.tanggal.substring(0, 7));
        });
        allBulanSet.add(blnPrefix);

        let totalOmsetBulanIni = 0;
        let totalOmsetLunasBulanIni = 0;
        let totalPendapatanLunasAllTime = 0;
        let piutangAllTime = 0;

        pelangganList.forEach((p) => {
          allBulanSet.forEach((bln) => {
            const tagihan = hitungTagihan(p, allNotas, bln);
            if (tagihan > 0) {
              if (bln === blnPrefix) {
                totalOmsetBulanIni += tagihan;
                if (isLunas(p.nama, bln)) {
                  totalOmsetLunasBulanIni += tagihan;
                }
              }
              if (isLunas(p.nama, bln)) {
                totalPendapatanLunasAllTime += tagihan;
              } else {
                piutangAllTime += tagihan;
              }
            }
          });
        });

        // 1. Laba / Rugi (Periode Ini Saja)
        const biayasBulanIni = allBiayas.filter(b => b.tanggal && b.tanggal.startsWith(blnPrefix));
        const sumByKatBulanIni = (kat: string) => {
          return biayasBulanIni.filter((b) => b.kategori === kat).reduce((s, b) => s + (b.nominal || 0), 0);
        };

        const totalHPP =
          sumByKatBulanIni("GAJI BORONGAN") +
          sumByKatBulanIni("LISTRIK 1") +
          sumByKatBulanIni("LISTRIK 2") +
          sumByKatBulanIni("GAS") +
          sumByKatBulanIni("AIR") +
          sumByKatBulanIni("CHEMICAL") +
          sumByKatBulanIni("BBM") +
          sumByKatBulanIni("PLASTIK");

        const totalPajak = sumByKatBulanIni("PPH PS 23");

        const totalAdm =
          sumByKatBulanIni("GAJI TETAP") +
          sumByKatBulanIni("MAKAN") +
          sumByKatBulanIni("PERAWATAN MESIN") +
          sumByKatBulanIni("IURAN SAMPAH") +
          sumByKatBulanIni("IURAN RT") +
          sumByKatBulanIni("LAIN-LAIN");
        // Kategori "CICILAN UTANG" sengaja tidak dimasukkan agar tidak memotong Laba Bersih

        const laba = totalOmsetLunasBulanIni - totalHPP - totalAdm - totalPajak;

        // 2. Neraca (Kumulatif All-Time)
        const biayaLunasAllTime = allBiayas.filter((b) => b.lunas).reduce((s, b) => s + (b.nominal || 0), 0);
        const biayaBelumLunasAllTime = allBiayas.filter((b) => !b.lunas).reduce((s, b) => s + (b.nominal || 0), 0);

        let utangPinjamanActive = 0;
        utangs?.forEach((u) => {
          if (u.status === "AKTIF") {
            utangPinjamanActive += (u.sisa_bulan || 0) * (u.cicilan || 0);
          }
        });

        const utang = biayaBelumLunasAllTime + utangPinjamanActive;
        const kas = totalPendapatanLunasAllTime - biayaLunasAllTime; // "CICILAN UTANG" otomatis mengurangi kas karena ada di tabel biaya
        const modal = kas + piutangAllTime + peralatan - utang;

        setMetrics({
          omset: totalOmsetBulanIni,
          hpp: totalHPP,
          adm: totalAdm,
          laba,
          piutang: piutangAllTime,
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

  if (loading) return <div className="text-gray-500 flex items-center justify-center min-h-[400px]">Loading Dashboard...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Keuangan</h2>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <label className="text-sm font-semibold text-gray-600">Periode (Laba/Rugi):</label>
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-gray-800 font-bold outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500 font-medium">Laporan Laba / Rugi (Bulan {periode})</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Penjualan Bersih (Omset)</h3>
          <p className="text-2xl font-bold text-blue-600">{fmtRp(metrics.omset)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total HPP</h3>
          <p className="text-2xl font-bold text-red-600">{fmtRp(metrics.hpp)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
          <h3 className="text-sm font-medium text-orange-100 mb-1">Biaya Adm & Umum</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.adm)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Laba Bersih</h3>
          <p className={`text-2xl font-bold ${metrics.laba >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtRp(metrics.laba)}
          </p>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500 font-medium">Neraca / Posisi Keuangan (Kumulatif All-Time hingga {periode})</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
          <h3 className="text-sm font-medium text-teal-100 mb-1">Saldo Kas / Bank</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.kas)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}>
          <h3 className="text-sm font-medium text-yellow-100 mb-1">Total Piutang Usaha</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.piutang)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #b91c1c, #991b1b)' }}>
          <h3 className="text-sm font-medium text-red-100 mb-1">Total Utang Usaha</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.utang)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
          <h3 className="text-sm font-medium text-purple-100 mb-1">Modal Bersih (Ekuitas)</h3>
          <p className="text-2xl font-bold text-white">{fmtRp(metrics.modal)}</p>
        </div>
      </div>
    </div>
  );
}
