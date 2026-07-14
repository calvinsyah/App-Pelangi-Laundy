import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Printer, Download } from 'lucide-react';
import { openPrintWindow, downloadHTML, generateKopHTML } from '../../lib/printUtils';
import { toRoman, terbilang, getLocalDateString } from '../../lib/utils';
import { generateDocumentNumber } from '../../lib/invoiceUtils';
import { getMonthRange } from '../../lib/dateUtils';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialog';

interface Pelanggan {
  id: number;
  nama: string;
  kode_invoice: string;
  tipe: string;
  tipe_billing: string;
  tarif_flat: number;
  tarif_rs: number;
  alamat?: string;
  kota?: string;
}

export default function Kuitansi() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [selectedPelanggan, setSelectedPelanggan] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(new Date().toISOString().substring(0, 7));
  const [tanggalMulai, setTanggalMulai] = useState(getMonthRange(new Date().toISOString().substring(0, 7)).start);
  const [tanggalAkhir, setTanggalAkhir] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPelanggan() {
      const { data } = await supabase.from('pelanggan').select('*').order('nama');
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
    }
    fetchPelanggan();
  }, []);



  const buildKuitansiHTML = async (pelNama: string, bln: string) => {
    const pData = pelangganList.find(p => p.nama === pelNama);
    if (!pData) return '<p>Pelanggan tidak ditemukan</p>';

    const isRS = pData.tipe?.toUpperCase() === 'RS';
    const startDate = isRS ? tanggalMulai : `${bln}-01`;
    const endDate = isRS ? tanggalAkhir : getMonthRange(bln).end;
    const year = parseInt(bln.split('-')[0]);

    const [
      { data: dbNota },
      { data: kopData },
      { data: pengData },
      { data: jnData }
    ] = await Promise.all([
      supabase.from('nota').select('*').eq('pelanggan_id', pData.id).gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal'),
      supabase.from('kop').select('*').limit(1),
      supabase.from('pengaturan').select('*').limit(1),
      supabase.from('jenis_nota').select('*')
    ]);

    const notas = dbNota || [];
    const kop = kopData?.[0] || {};
    const pengaturan = pengData?.[0] || {};
    const jenisNotaList = jnData || [];

    const isFlatCustomer = pData.tipe_billing?.toUpperCase() === "FLAT";
    const flatRate = isFlatCustomer ? pData.tarif_flat : 0;

    const checkIsNotaFlat = (nota: any) => {
      return nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
    };
    
    const totalsPerJenis: Record<string, number> = {};
    notas.forEach((nota) => {
      const j = nota.jenis || 'REGULER';
      if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
      if (isFlatCustomer && checkIsNotaFlat(nota)) {
        // Skip
      } else {
        let t = 0;
        if (pData.tipe === 'RS' && nota.items === null) {
          t = (nota.berat_kg || 0) * (pData.tarif_rs || 0);
        } else if (nota.items && Array.isArray(nota.items)) {
          nota.items.forEach((it: any) => {
            t += (it.harga || it.basePrice || 0) * (it.qty || 0);
          });
        } else {
          t = nota.total || 0;
        }
        totalsPerJenis[j] += t;
      }
    });

    let totalTagihan = 0;
    if (isFlatCustomer) {
      totalTagihan = flatRate;
      for (const [j, v] of Object.entries(totalsPerJenis)) {
        totalTagihan += v; // totalsPerJenis already excluded flat bills above
      }
    } else {
      totalTagihan = Object.values(totalsPerJenis).reduce((a, b) => a + b, 0);
    }
    totalTagihan = Math.floor(totalTagihan);

    const periode = isRS ? { mode: 'range' as const, tanggalMulai, tanggalAkhir } : { mode: 'bulan' as const, bulan: bln };
    const nomorKwitansi = await generateDocumentNumber('KWT', pData.kode_invoice, periode);
    const [tahunStr, bulanStr] = bln.split("-");
    const bulanNum = parseInt(bulanStr, 10);
    const namaBulan = new Date(parseInt(tahunStr, 10), bulanNum - 1, 1).toLocaleDateString("id-ID", { month: "long" });

    const terbilangText = terbilang(totalTagihan);
    const terbilangCaps = terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1) + " rupiah.-";
    const direktur = pengaturan.direktur || "Bagus Riadi Kurniawan";
    const bankName = pengaturan.bank || "";
    const bankAccName = pengaturan.rekening_name || "";
    const bankAccNo = pengaturan.rekening_no || "";

    let deskripsi = "";
    if (pData.tipe === "RS") {
      let totalKg = 0;
      notas.forEach(n => {
        // Nota RS disimpan dengan items=null dan berat_kg terisi
        totalKg += n.berat_kg || 0;
      });
      const tarifRS = pData.tarif_rs || 0;
      const tglAwal = notas.length > 0 ? notas[0].tanggal : "";
      const tglAkhir = notas.length > 0 ? notas[notas.length - 1].tanggal : "";
      const fmtTgl = (t: string) => {
        if (!t) return "";
        const d = new Date(t + "T00:00:00");
        return `${d.getDate()} ${d.toLocaleDateString("id-ID", { month: "long" })} ${d.getFullYear()}`;
      };
      deskripsi = `Biaya Cuci Linen mulai tgl. ${fmtTgl(tglAwal)} - ${fmtTgl(tglAkhir)} = ${totalKg.toFixed(0)} kg @ Rp.${tarifRS.toLocaleString("id-ID")},- (Perincian terlampir)`;
    } else if (isFlatCustomer) {
      deskripsi = `Biaya Cuci Linen Bulan ${namaBulan} ${tahunStr}`;
    } else {
      deskripsi = `Biaya Cuci Linen Bulan ${namaBulan} ${tahunStr} (Perincian Terlampir)`;
    }

    const tglCetak = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    
    // Generate Kop HTML
    const kopHtmlStr = generateKopHTML(kop, kop?.logo_url);

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <title>Kwitansi - ${pelNama} - ${bln}</title>
          <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; padding: 20px; }
              .kwitansi-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              .kwitansi-table td { padding: 4px 2px; vertical-align: top; }
              .label-kolom { width: 135px; font-weight: 600; color: #1e3a5f; white-space: nowrap; }
              .jumlah-box { border: 2px solid #334155; padding: 8px 10px; margin: 8px 0; background: #fafbfc; border-radius: 4px; }
              .ttd-box { float: right; width: 220px; text-align: center; margin-top: 10px; }
          </style>
      </head>
      <body>
          ${kopHtmlStr}
          <div style="text-align:center; margin: 15px 0;">
            <h2 style="font-size:18px; text-transform:uppercase; letter-spacing:2px; text-decoration:underline;">Kwitansi</h2>
            <p>No: ${nomorKwitansi}</p>
          </div>
          <table class="kwitansi-table">
            <tr><td class="label-kolom">Telah terima dari</td><td>:</td><td><strong>${pelNama}</strong></td></tr>
            <tr><td class="label-kolom">Uang sebanyak</td><td>:</td><td style="font-style:italic;">== ${terbilangCaps} ==</td></tr>
            <tr><td class="label-kolom">Untuk pembayaran</td><td>:</td><td>${deskripsi}</td></tr>
          </table>
          
          <div class="jumlah-box">
            <span style="font-size:16px; font-weight:900;">Terbilang: Rp. ${totalTagihan.toLocaleString('id-ID')},-</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 30px; padding-top: 10px; border-top: 1px solid #cbd5e1;">
            <div style="flex: 1; font-size: 13px;">
                <p style="font-weight: 700; color: #1e3a5f; margin-bottom: 8px;">Payment Transfer to :</p>
                <table style="border-collapse: collapse; font-size: 13px;">
                    <tr><td style="padding: 2px 10px 2px 0; color: #334155;">Bank Name</td><td style="color: #334155;">: ${bankName}</td></tr>
                    <tr><td style="padding: 2px 10px 2px 0; color: #334155;">Account Name</td><td style="color: #334155;">: ${bankAccName}</td></tr>
                    <tr><td style="padding: 2px 10px 2px 0; color: #334155;">Account Number</td><td style="color: #334155;">: ${bankAccNo}</td></tr>
                </table>
            </div>
            <div style="text-align: center; min-width: 200px;">
                <div style="margin-bottom: 2px;">Surabaya, ${tglCetak}</div>
                <div style="font-weight: 700; margin-bottom: 60px;">Pelangi Laundry</div>
                <div style="border-top: 1px solid #000; margin: 0 0 5px 0;"></div>
                <div style="font-weight: 700;">${direktur}</div>
                <div style="font-size: 12px; color: #64748b;">Direktur</div>
            </div>
          </div>
      </body>
      </html>
    `;
  };

  const checkPaymentStatus = async (pelangganId: number, bulan: string) => {
    const pData = pelangganList.find(p => p.id === pelangganId);
    const isRS = pData?.tipe?.toUpperCase() === 'RS';
    
    const payQuery = supabase.from('payment_status').select('is_paid').eq('pelanggan_id', pelangganId);
    
    if (isRS) {
      const fallbackBulan = tanggalMulai.substring(0, 7);
      payQuery.or(`and(tanggal_mulai.eq.${tanggalMulai},tanggal_akhir.eq.${tanggalAkhir}),and(bulan.eq.${fallbackBulan},tanggal_mulai.is.null)`);
    } else {
      payQuery.eq('bulan', bulan);
    }
    
    const { data } = await payQuery.maybeSingle();
    return data?.is_paid || false;
  };

  const handlePrint = async () => {
    if (!selectedPelanggan || !selectedBulan) return toast("Pilih pelanggan dan bulan!");
    const pData = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!pData) return;

    setLoading(true);
    try {
      const isPaid = await checkPaymentStatus(pData.id, selectedBulan);
      if (!isPaid) {
        const ok = await confirm("Periode ini belum ditandai Lunas di Tagihan. Tetap cetak kwitansi?");
        if (!ok) return;
      }
      const html = await buildKuitansiHTML(selectedPelanggan, selectedBulan);
      openPrintWindow(html, `Kwitansi - ${selectedPelanggan}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedPelanggan || !selectedBulan) return toast("Pilih pelanggan dan bulan!");
    const pData = pelangganList.find(p => p.nama === selectedPelanggan);
    if (!pData) return;

    setLoading(true);
    try {
      const isPaid = await checkPaymentStatus(pData.id, selectedBulan);
      if (!isPaid) {
        const ok = await confirm("Periode ini belum ditandai Lunas di Tagihan. Tetap cetak kwitansi?");
        if (!ok) return;
      }
      const html = await buildKuitansiHTML(selectedPelanggan, selectedBulan);
      downloadHTML(html, `Kuitansi_${selectedPelanggan.replace(/\s/g, '_')}_${selectedBulan}.html`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Cetak Kuitansi</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 lg:col-span-3">
            <label className="block text-gray-700 text-sm font-bold mb-2">Pelanggan</label>
            <select
              value={selectedPelanggan}
              onChange={(e) => setSelectedPelanggan(e.target.value)}
              className="w-full border rounded-lg py-2.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Pelanggan</option>
              {pelangganList.map(p => (
                <option key={p.id} value={p.nama}>{p.nama}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-8 lg:col-span-5">
            <label className="block text-gray-700 text-sm font-bold mb-2">Periode</label>
            {pelangganList.find(p => p.nama === selectedPelanggan)?.tipe?.toUpperCase() === 'RS' ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full border rounded-lg py-2.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500 font-bold">-</span>
                <input
                  type="date"
                  value={tanggalAkhir}
                  onChange={(e) => setTanggalAkhir(e.target.value)}
                  className="w-full border rounded-lg py-2.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <input
                type="month"
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="w-full border rounded-lg py-2.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          <div className="flex gap-2 md:col-span-12 lg:col-span-4">
            <button
              onClick={handlePrint}
              disabled={loading || !selectedPelanggan || (!selectedBulan && !tanggalMulai)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Printer size={18} /> Cetak
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !selectedPelanggan || (!selectedBulan && !tanggalMulai)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Download size={18} /> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
