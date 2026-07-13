import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Save, Calendar, DollarSign, Edit, Printer, Download } from 'lucide-react';
import { generateKopHTML, buildSlipGajiHTML, buildSlipGajiTetapHTML, openPrintWindow, downloadHTML } from '../../lib/printUtils';
import { CurrencyInput } from '../../components/CurrencyInput';
import { getLocalDateString } from '../../lib/utils';

interface Karyawan {
  id: number;
  nama: string;
  bagian: string;
  tipe_gaji: string;
  gaji_pokok: number;
}

interface Absensi {
  tanggal: string;
  karyawan_id: number;
  status: string;
}

export default function AbsensiGaji() {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [absensiDate, setAbsensiDate] = useState(getLocalDateString());
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Salary States
  const [gajiMulai, setGajiMulai] = useState(getLocalDateString());
  const [gajiSelesai, setGajiSelesai] = useState(getLocalDateString(new Date(Date.now() + 13 * 24 * 60 * 60 * 1000)));
  const [salaryResults, setSalaryResults] = useState<any[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);

  // Edit Gaji Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeGaji, setActiveGaji] = useState<any>(null);
  const [modalForm, setModalForm] = useState({
    gaji_pokok: 0,
    insentif: 0,
    lembur: 0,
    potongan: 0
  });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('karyawan').select('*').order('nama');
      setKaryawanList(data || []);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchAbsensi() {
      if (karyawanList.length === 0) return;
      const { data } = await supabase
        .from('absensi')
        .select('*')
        .eq('tanggal', absensiDate);

      const attMap: Record<number, string> = {};
      karyawanList.forEach(k => {
        const exist = data?.find(d => d.karyawan_id === k.id);
        attMap[k.id] = exist ? exist.status : 'Hadir';
      });
      setAttendance(attMap);
    }
    fetchAbsensi();
  }, [absensiDate, karyawanList]);

  const handleSaveAbsensi = async () => {
    setLoading(true);
    setMsg('');
    try {
      const rows = Object.entries(attendance).map(([kidStr, status]) => ({
        tanggal: absensiDate,
        karyawan_id: parseInt(kidStr, 10),
        status
      }));
      
      const { error } = await supabase.from('absensi').upsert(rows, { onConflict: 'tanggal,karyawan_id' });
      if (error) throw error;
      
      setMsg('Absensi berhasil disimpan!');
    } catch (err: any) {
      console.error(err);
      setMsg(err.message || 'Gagal menyimpan absensi');
    } finally {
      setLoading(false);
    }
  };

  // Client-side local calculation fallback as requested for local server testing
  const hitungGajiLokal = async () => {
    setCalcLoading(true);
    try {
      const [
        { data: notas },
        { data: absensiList },
        { data: pengaturanData },
        { data: pelangganList },
        { data: dataGaji }
      ] = await Promise.all([
        supabase.from('nota').select('*').gte('tanggal', gajiMulai).lte('tanggal', gajiSelesai),
        supabase.from('absensi').select('*').gte('tanggal', gajiMulai).lte('tanggal', gajiSelesai),
        supabase.from('pengaturan').select('*').limit(1),
        supabase.from('pelanggan').select('*'),
        supabase.from('gaji').select('*').eq('periode_mulai', gajiMulai).eq('periode_selesai', gajiSelesai)
      ]);

      const pg = pengaturanData?.[0] || {};
      const tarifInternal = pg.tarif_internal_hotel || 7000;
      const ongkos = pg.ongkos_per_kg || 1200;

      const pelangganMap = Object.fromEntries(pelangganList?.map(p => [p.id, p]) || []);

      const { data: jnData } = await supabase.from('jenis_nota').select('*');
      const jenisNotaList = jnData || [];

      const kgHarian: Record<string, number> = {};
      const ongkosHarian: Record<string, number> = {};
      
      notas?.forEach((nota) => {
        const tgl = nota.tanggal;
        const pel = pelangganMap[nota.pelanggan_id];
        if (!pel) return;

        const jenisNota = nota.jenis?.toUpperCase();
        // HARUS SAMA DENGAN logika di edge function supabase/functions/gaji-hitung/index.ts
        if (pel.tipe?.toUpperCase() === "HOTEL" && pel.tipe_billing?.toUpperCase() === "FLAT" && jenisNota === "FLAT") return;

        let kg = 0;
        if (jenisNota === "KILOAN") {
          kg = nota.berat_kg || nota.items?.reduce((s: number, it: any) => s + (Number(it.qty) || 0), 0) || 0;
        } else {
          kg = (nota.total || 0) / tarifInternal;
        }

        if (!kgHarian[tgl]) kgHarian[tgl] = 0;
        kgHarian[tgl] += kg;
        if (!ongkosHarian[tgl]) ongkosHarian[tgl] = 0;
        ongkosHarian[tgl] += (kg * ongkos);
      });

      const hasil = karyawanList.map((k) => {
        let totalUpah = 0;
        const rincian = [];
        const current = new Date(gajiMulai);
        const end = new Date(gajiSelesai);

        while (current <= end) {
          const tgl = current.toISOString().slice(0, 10);
          const absen = absensiList?.find((a) => a.tanggal === tgl && a.karyawan_id === k.id);
          const status = absen ? absen.status : "Hadir";
          
          const totalKgHariIni = kgHarian[tgl] || 0;
          const totalOngkosHariIni = ongkosHarian[tgl] || 0;
          const isHadir = status === "Hadir";
          
          let upah = 0;
          let hadirBorongan = 0;
          
          if (isHadir && k.tipe_gaji !== 'Tetap') {
            hadirBorongan = karyawanList.filter(k2 => {
              if (k2.tipe_gaji === 'Tetap') return false;
              const a2 = absensiList?.find((a) => a.tanggal === tgl && a.karyawan_id === k2.id);
              return a2 ? a2.status === "Hadir" : true;
            }).length || 1;
            
            upah = Math.floor((ongkos / hadirBorongan) * totalKgHariIni);
            totalUpah += upah;
          }
          
          rincian.push({ tanggal: tgl, kg: totalKgHariIni, ongkos: totalOngkosHariIni, hadir: isHadir ? 1 : 0, upah, status });
          current.setDate(current.getDate() + 1);
        }

        const simpan = dataGaji?.find((g) => g.karyawan_id === k.id) || {};
        const insentif = simpan.insentif || 0;
        const lembur = simpan.lembur || 0;
        const potongan = simpan.potongan || 0;
        
        const gajiPokok = k.tipe_gaji === 'Tetap' ? (simpan.gaji_pokok ?? k.gaji_pokok ?? 0) : 0;
        const totalDiterima = Math.floor(totalUpah + gajiPokok + insentif + lembur - potongan);

        return {
          karyawan: k,
          totalUpah,
          gajiPokok,
          insentif,
          lembur,
          potongan,
          totalDiterima,
          rincian,
          periodeMulai: gajiMulai,
          periodeSelesai: gajiSelesai,
          gajiId: simpan.id || null
        };
      });

      setSalaryResults(hasil);
    } catch (err) {
      console.error(err);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCalculateGaji = async () => {
    // Try Edge Function first
    setCalcLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gaji-hitung', {
        body: { tglMulai: gajiMulai, tglSelesai: gajiSelesai }
      });
      if (error) throw error;
      setSalaryResults(data);
      setCalcLoading(false);
    } catch (err) {
      console.warn('Edge function failed or not deployed. Falling back to local calculation.', err);
      // Fallback
      hitungGajiLokal();
    }
  };

  const handleEditGaji = (h: any) => {
    setActiveGaji(h);
    setModalForm({
      gaji_pokok: h.gajiPokok || 0,
      insentif: h.insentif,
      lembur: h.lembur,
      potongan: h.potongan
    });
    setIsEditModalOpen(true);
  };

  const handleSaveModalGaji = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGaji) return;

    try {
      if (activeGaji.gajiId) {
        await supabase
          .from('gaji')
          .update(modalForm)
          .eq('id', activeGaji.gajiId);
      } else {
        await supabase
          .from('gaji')
          .insert([{
            karyawan_id: activeGaji.karyawan.id,
            periode_mulai: activeGaji.periodeMulai,
            periode_selesai: activeGaji.periodeSelesai,
            ...modalForm
          }]);
      }
      setIsEditModalOpen(false);
      handleCalculateGaji();
    } catch (err) {
      console.error(err);
    }
  };

  const fmtRp = (val: number) => "Rp " + val.toLocaleString("id-ID");

  const getKop = async () => {
    const { data } = await supabase.from('kop').select('*').limit(1);
    return generateKopHTML(data?.[0] || { nama: 'PELANGI LAUNDRY' }, data?.[0]?.logo_url);
  };

  const handleCetakSlip = async (h: any) => {
    const kopHTML = await getKop();
    const html = h.karyawan.tipe_gaji === 'Tetap' ? buildSlipGajiTetapHTML(h, kopHTML) : buildSlipGajiHTML(h, kopHTML);
    openPrintWindow(html, `Slip Gaji - ${h.karyawan.nama}`);
  };

  const handleDownloadSlip = async (h: any) => {
    const kopHTML = await getKop();
    const html = h.karyawan.tipe_gaji === 'Tetap' ? buildSlipGajiTetapHTML(h, kopHTML) : buildSlipGajiHTML(h, kopHTML);
    downloadHTML(html, `Slip_Gaji_${h.karyawan.nama.replace(/\s/g, '_')}_${h.periodeMulai}_${h.periodeSelesai}.html`);
  };

  return (
    <div className="space-y-8">
      {/* Modul Absensi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} /> Absensi Harian Karyawan
          </h2>
          <input
            type="date"
            value={absensiDate}
            onChange={(e) => setAbsensiDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">{msg}</div>}

        <div className="space-y-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 font-semibold">
                <th className="pb-2">Nama Karyawan</th>
                <th className="pb-2">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {karyawanList.map(k => (
                <tr key={k.id} className="border-b border-gray-50">
                  <td className="py-2.5 text-gray-800">{k.nama}</td>
                  <td className="py-2.5">
                    <select
                      value={attendance[k.id] || 'Hadir'}
                      onChange={(e) => setAttendance({ ...attendance, [k.id]: e.target.value })}
                      className="px-3 py-1 border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="Hadir">Hadir</option>
                      <option value="Izin">Izin</option>
                      <option value="Alpa">Alpa</option>
                      <option value="Libur">Libur</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveAbsensi}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save size={18} /> Simpan Absensi
            </button>
          </div>
        </div>
      </div>

      {/* Modul Gaji */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="text-emerald-600" size={24} /> Perhitungan Gaji Borongan
        </h2>

        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal Mulai</label>
            <input
              type="date"
              value={gajiMulai}
              onChange={(e) => setGajiMulai(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal Selesai</label>
            <input
              type="date"
              value={gajiSelesai}
              onChange={(e) => setGajiSelesai(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
            />
          </div>
          <button
            onClick={handleCalculateGaji}
            disabled={calcLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {calcLoading ? 'Menghitung...' : 'Hitung Gaji'}
          </button>
        </div>

        {salaryResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="pb-2">Nama</th>
                  <th className="pb-2">Tipe Gaji</th>
                  <th className="pb-2">Upah Kerja</th>
                  <th className="pb-2">Gaji Tetap</th>
                  <th className="pb-2">Insentif</th>
                  <th className="pb-2">Lembur</th>
                  <th className="pb-2">Potongan</th>
                  <th className="pb-2">Diterima</th>
                  <th className="pb-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {salaryResults.map((h, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 text-gray-800 font-semibold">{h.karyawan.nama}</td>
                    <td className="py-3 text-gray-800 text-xs">
                      <span className={`px-2 py-1 rounded-full ${h.karyawan.tipe_gaji === 'Tetap' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {h.karyawan.tipe_gaji || 'Borongan'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-800">{h.karyawan.tipe_gaji === 'Tetap' ? '-' : fmtRp(h.totalUpah)}</td>
                    <td className="py-3 text-gray-800">{h.karyawan.tipe_gaji === 'Tetap' ? fmtRp(h.gajiPokok || 0) : '-'}</td>
                    <td className="py-3 text-gray-800">{fmtRp(h.insentif)}</td>
                    <td className="py-3 text-gray-800">{fmtRp(h.lembur)}</td>
                    <td className="py-3 text-red-600">{fmtRp(h.potongan)}</td>
                    <td className="py-3 font-bold text-gray-900">{fmtRp(h.totalDiterima)}</td>
                    <td className="py-3 text-right flex justify-end gap-1.5 items-center">
                      <button
                        onClick={() => handleCetakSlip(h)}
                        className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        title="Cetak Slip HTML"
                      >
                        <Printer size={16} /> Cetak
                      </button>
                      <button
                        onClick={() => handleDownloadSlip(h)}
                        className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        title="Download Slip HTML"
                      >
                        <Download size={16} /> Unduh
                      </button>
                      <button
                        onClick={() => handleEditGaji(h)}
                        className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        title="Edit Komponen Gaji"
                      >
                        <Edit size={16} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Gaji Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Edit Gaji: {activeGaji?.karyawan.nama}</h3>
            <form onSubmit={handleSaveModalGaji}>
              {activeGaji?.karyawan.tipe_gaji === 'Tetap' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Gaji Pokok / Tetap (Periode Ini)</label>
                  <CurrencyInput
                    value={modalForm.gaji_pokok}
                    onChange={(val) => setModalForm({...modalForm, gaji_pokok: val})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Insentif</label>
                <CurrencyInput
                  value={modalForm.insentif}
                  onChange={(val) => setModalForm({...modalForm, insentif: val})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Lembur</label>
                <CurrencyInput
                  value={modalForm.lembur}
                  onChange={(val) => setModalForm({...modalForm, lembur: val})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Potongan</label>
                <CurrencyInput
                  value={modalForm.potongan}
                  onChange={(val) => setModalForm({...modalForm, potongan: val})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
