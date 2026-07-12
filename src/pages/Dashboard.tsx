import React, { useState } from 'react';
import { fmtRp } from '../lib/utils';
import { useDashboardMetrics } from '../lib/queries';

export default function Dashboard() {
  const [periode, setPeriode] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const { data: metricsData, isLoading, isError, error } = useDashboardMetrics(periode);
  const loading = isLoading;
  
  const metrics = metricsData || {
    omset: 0,
    hpp: 0,
    adm: 0,
    laba: 0,
    piutang: 0,
    utang: 0,
    kas: 0,
    modal: 0
  };


  if (loading) return <div className="text-gray-500 flex items-center justify-center min-h-[400px]">Loading Dashboard...</div>;
  if (isError) return (
    <div className="text-red-500 flex flex-col items-center justify-center min-h-[400px] text-center">
      <p className="font-bold text-lg mb-2">Gagal memuat data dashboard</p>
      <p className="text-sm">Pastikan function get_dashboard_metrics sudah di-deploy.</p>
      <p className="text-xs mt-2 text-gray-400">{String(error)}</p>
    </div>
  );

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
