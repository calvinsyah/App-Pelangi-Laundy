import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { fmtRp } from '../../lib/utils';
import { generateKopHTML, openPrintWindow } from '../../lib/printUtils';
import { useDashboardMetrics } from '../../lib/queries';
import { useToast } from '../../components/ToastProvider';

export default function Laporan() {
  const [periode, setPeriode] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const { data: metricsData, isLoading, isError, error } = useDashboardMetrics(periode);
  const { toast } = useToast();

  const data = {
    penjualan: metricsData?.omset || 0,
    lunasTotal: metricsData?.omset_lunas || 0,
    totalHPP: metricsData?.hpp || 0,
    totalAdm: metricsData?.adm || 0,
    labaBersih: metricsData?.laba || 0,
    kas: metricsData?.kas || 0,
    piutang: metricsData?.piutang || 0,
    peralatan: metricsData?.peralatan || 0,
    utang: metricsData?.utang || 0,
    modal: metricsData?.modal || 0
  };

  const getKop = async () => {
    const { data } = await supabase.from('kop').select('*').limit(1);
    return generateKopHTML(data?.[0] || { nama: 'PELANGI LAUNDRY' }, data?.[0]?.logo_url);
  };

  const handlePrint = async () => {
    let kopHTML = '';
    try {
      kopHTML = await getKop();
    } catch (err: any) {
      console.error(err);
      toast('Gagal memuat konfigurasi Kop Surat: ' + (err?.message || 'Unknown error'), 'error');
      return;
    }
    const namaBulan = new Date(periode + "-02").toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;max-width:800px;margin:0 auto;">
        ${kopHTML}
        <h2 style="text-align:center;margin:0 0 4px 0;text-decoration:underline;">LAPORAN KEUANGAN</h2>
        <p style="text-align:center;margin:0 0 20px 0;font-size:14px;font-weight:600;">PERIODE: ${namaBulan}</p>
        
        <h3 style="margin-top:10px;margin-bottom:10px;background:#1e3a5f;color:white;padding:5px;">1. LAPORAN LABA RUGI</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td colspan="2" style="font-weight:bold;padding:4px;">PENDAPATAN JASA</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;">Penjualan Lunas</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.lunasTotal)}</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;">Piutang Usaha</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.piutang)}</td>
          </tr>
          <tr style="border-bottom:1px solid #ccc;border-top:1px solid #ccc;font-weight:bold;background:#f8fafc;">
            <td style="padding:4px;padding-left:20px;">Total Penjualan / Omset</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.penjualan)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="font-weight:bold;padding:4px;padding-top:10px;">HARGA POKOK PENJUALAN</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;">Total HPP</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.totalHPP)}</td>
          </tr>
          <tr style="border-bottom:1px solid #ccc;border-top:1px solid #ccc;font-weight:bold;background:#f8fafc;">
            <td style="padding:4px;">LABA KOTOR</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.lunasTotal - data.totalHPP)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="font-weight:bold;padding:4px;padding-top:10px;">BIAYA OPERASIONAL / ADM</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;">Total Biaya Administrasi & Umum</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.totalAdm)}</td>
          </tr>
          <tr style="border-bottom:2px solid #1e3a5f;border-top:2px solid #1e3a5f;font-weight:bold;background:#ecfdf5;color:#065f46;">
            <td style="padding:8px;">LABA BERSIH</td>
            <td style="text-align:right;padding:8px;font-size:15px;">${fmtRp(data.labaBersih)}</td>
          </tr>
        </table>
        
        <h3 style="margin-top:25px;margin-bottom:10px;background:#1e3a5f;color:white;padding:5px;">2. NERACA</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#f1f5f9;font-weight:bold;">
            <td colspan="2" style="padding:5px;border-bottom:1px solid #cbd5e1;">ASET (HARTA)</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;">Kas / Bank</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.kas)}</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;">Piutang Usaha</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.piutang)}</td>
          </tr>
          <tr>
            <td style="padding:4px;padding-left:20px;border-bottom:1px solid #ccc;">Peralatan</td>
            <td style="text-align:right;padding:4px;border-bottom:1px solid #ccc;">${fmtRp(data.peralatan)}</td>
          </tr>
          <tr style="font-weight:bold;">
            <td style="padding:4px;padding-left:20px;">Total Aset</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.kas + data.piutang + data.peralatan)}</td>
          </tr>
          
          <tr style="background:#f1f5f9;font-weight:bold;">
            <td colspan="2" style="padding:5px;border-bottom:1px solid #cbd5e1;border-top:1px solid #cbd5e1;">KEWAJIBAN (UTANG)</td>
          </tr>
          <tr style="border-bottom:1px solid #ccc;">
            <td style="padding:4px;padding-left:20px;">Utang Usaha</td>
            <td style="text-align:right;padding:4px;">${fmtRp(data.utang)}</td>
          </tr>
          
          <tr style="background:#f1f5f9;font-weight:bold;">
            <td colspan="2" style="padding:5px;border-bottom:1px solid #cbd5e1;border-top:1px solid #cbd5e1;">MODAL</td>
          </tr>
          <tr style="font-weight:bold;">
            <td style="padding:4px;padding-left:20px;">Modal Bersih</td>
            <td style="text-align:right;padding:4px;font-size:15px;">${fmtRp(data.modal)}</td>
          </tr>
        </table>
      </div>
    `;
    
    openPrintWindow(html, `Laporan Keuangan - ${namaBulan}`);
  };

  if (isLoading) return <div className="text-gray-500 flex items-center justify-center min-h-[400px]">Loading Laporan...</div>;
  if (isError) return (
    <div className="text-red-500 flex flex-col items-center justify-center min-h-[400px] text-center">
      <p className="font-bold text-lg mb-2">Gagal memuat data laporan</p>
      <p className="text-sm">Pastikan function get_dashboard_metrics sudah di-deploy dengan update terbaru.</p>
      <p className="text-xs mt-2 text-gray-400">{String(error)}</p>
    </div>
  );

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
                  <td className="p-3 pl-8 text-gray-600">Penjualan Jasa (Lunas)</td>
                  <td></td>
                  <td className="p-3 text-right font-medium text-gray-800">{fmtRp(data.lunasTotal)}</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="p-3 pl-8 text-gray-600">Piutang Jasa (Belum Lunas)</td>
                  <td></td>
                  <td className="p-3 text-right font-medium text-gray-500">{fmtRp(data.piutang)}</td>
                </tr>
                <tr className="border-b border-gray-50 font-semibold bg-gray-50/50">
                  <td className="p-3 pl-8 text-gray-700">Total Penjualan Jasa (Omset)</td>
                  <td></td>
                  <td className="p-3 text-right text-gray-700">{fmtRp(data.penjualan)}</td>
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
                  <td className="p-3">LABA KOTOR (CASH BASIS)</td>
                  <td></td>
                  <td className="p-3 text-right">{fmtRp(data.lunasTotal - data.totalHPP)}</td>
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
    </div>
  );
}
