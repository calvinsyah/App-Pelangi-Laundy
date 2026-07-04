import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Printer, Download } from 'lucide-react';
import { openPrintWindow, downloadHTML } from '../../lib/printUtils';

interface Pelanggan {
  id: number;
  nama: string;
  kode: string;
  tipe: string;
  tipe_billing: string;
  tarif_flat: number;
  tarif_rs: number;
}

export default function Kuitansi() {
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [selectedPelanggan, setSelectedPelanggan] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPelanggan() {
      const { data } = await supabase.from('pelanggan').select('*').order('nama');
      setPelangganList(data?.map(p => ({
        id: p.id,
        nama: p.nama,
        kode: p.kode,
        tipe: p.tipe,
        tipe_billing: p.billing_system || 'Reguler',
        tarif_flat: p.flat_rate || 0,
        tarif_rs: p.tarif_rs || 0
      })) || []);
    }
    fetchPelanggan();
  }, []);

  const terbilang = (angka: number): string => {
    const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    let hasil = "";
    if (angka < 12) {
      hasil = huruf[angka];
    } else if (angka < 20) {
      hasil = terbilang(angka - 10) + " belas";
    } else if (angka < 100) {
      hasil = terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
    } else if (angka < 200) {
      hasil = "seratus " + terbilang(angka - 100);
    } else if (angka < 1000) {
      hasil = terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
    } else if (angka < 2000) {
      hasil = "seribu " + terbilang(angka - 1000);
    } else if (angka < 1000000) {
      hasil = terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
    } else if (angka < 1000000000) {
      hasil = terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
    } else if (angka < 1000000000000) {
      hasil = terbilang(Math.floor(angka / 1000000000)) + " miliar " + terbilang(angka % 1000000000);
    }
    return hasil.trim();
  };

  const toRoman = (num: number): string => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[num] || "";
  };

  const generateNomorKuitansi = async (pel: Pelanggan, bln: string) => {
    const [tahun, bulanStr] = bln.split("-");
    const bulanNum = parseInt(bulanStr, 10);
    const key = `${pel.kode}_${bln}`;
    const counterKey = `${pel.kode}_${tahun}`;

    const { data: cached } = await supabase.from('invoice_numbers').select('nomor').eq('cache_key', key).maybeSingle();
    if (cached) return cached.nomor;

    const { data: counterData } = await supabase.from('invoice_counter').select('nilai').eq('counter_key', counterKey).maybeSingle();
    const currentCounter = (counterData?.nilai || 0) + 1;
    const formattedNo = `${String(currentCounter).padStart(3, "0")}/PL-${pel.kode}/${toRoman(bulanNum)}/${tahun}`;
    
    await supabase.from('invoice_numbers').upsert({ cache_key: key, nomor: formattedNo });
    await supabase.from('invoice_counter').upsert({ counter_key: counterKey, nilai: currentCounter });
    
    return formattedNo;
  };

  const buildKuitansiHTML = async (pelNama: string, bln: string) => {
    const pData = pelangganList.find(p => p.nama === pelNama);
    if (!pData) return '<p>Pelanggan tidak ditemukan</p>';

    const [
      { data: dbNota },
      { data: kopData },
      { data: pengData }
    ] = await Promise.all([
      supabase.from('nota').select('*').eq('pelanggan_id', pData.id).like('tanggal', `${bln}%`).order('tanggal'),
      supabase.from('kop').select('*').limit(1),
      supabase.from('pengaturan').select('*').limit(1)
    ]);

    const notas = dbNota || [];
    const kop = kopData?.[0] || {};
    const pengaturan = pengData?.[0] || {};

    const isFlatCustomer = pData.tipe === "HOTEL" && pData.tipe_billing === "FLAT";
    const flatRate = isFlatCustomer ? pData.tarif_flat : 0;
    
    const totalsPerJenis: Record<string, number> = {};
    notas.forEach((nota) => {
      const j = nota.jenis || 'REGULER';
      if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
      if (isFlatCustomer && (j === "FLAT" || j === "FLAT ASLI")) {
        // Skip
      } else {
        totalsPerJenis[j] += nota.total || 0;
      }
    });

    let totalTagihan = 0;
    if (isFlatCustomer) {
      totalTagihan = flatRate;
      for (const [j, v] of Object.entries(totalsPerJenis)) {
        if (j !== "FLAT" && j !== "FLAT ASLI") totalTagihan += v;
      }
    } else {
      totalTagihan = Object.values(totalsPerJenis).reduce((a, b) => a + b, 0);
    }
    totalTagihan = Math.floor(totalTagihan);

    const nomorKwitansi = await generateNomorKuitansi(pData, bln);
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
        if (n.items && Array.isArray(n.items)) {
          n.items.forEach((it: any) => {
            if (it.unit === "KG") totalKg += it.qty;
          });
        }
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
    const kopHtmlStr = kop.nama ? `
      <div style="display:flex;align-items:center;border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:12px;">
        ${kop.logo_url ? `<img src="${kop.logo_url}" style="max-height:70px;margin-right:16px;">` : ''}
        <div>
          <h1 style="font-size:24px;font-weight:900;color:#1e3a5f;margin-bottom:4px;letter-spacing:0.5px;">${kop.nama}</h1>
          <p style="font-size:12px;color:#475569;margin-bottom:2px;">${kop.alamat || ''}</p>
          <p style="font-size:12px;color:#475569;">📞 ${kop.telepon || ''} | ✉️ ${kop.email || ''}</p>
        </div>
      </div>
    ` : '';

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
          <div style="font-size:11px; margin-top:10px; color:#475569;">
            <p><strong>Pembayaran dapat ditransfer ke:</strong></p>
            <p>${bankName} No. Rek ${bankAccNo} a/n ${bankAccName}</p>
          </div>
          
          <div class="ttd-box">
            <p>Surabaya, ${tglCetak}</p>
            <p style="margin-bottom:60px; margin-top:5px;">Hormat Kami,</p>
            <p><strong>${direktur}</strong></p>
            <div style="border-top:1px solid #000; margin-top:4px; width:100%;"></div>
            <p style="font-size:10px;">Direktur</p>
          </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    if (!selectedPelanggan || !selectedBulan) return alert("Pilih pelanggan dan bulan!");
    setLoading(true);
    try {
      const html = await buildKuitansiHTML(selectedPelanggan, selectedBulan);
      openPrintWindow(html, `Kwitansi - ${selectedPelanggan}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedPelanggan || !selectedBulan) return alert("Pilih pelanggan dan bulan!");
    setLoading(true);
    try {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
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
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Bulan</label>
            <input
              type="month"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="w-full border rounded-lg py-2.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !selectedPelanggan || !selectedBulan}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Printer size={18} /> Cetak
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !selectedPelanggan || !selectedBulan}
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
