import { supabase } from './supabaseClient';
import { toRoman } from './utils';
import { toRomanMonthRange } from './dateUtils';

/**
 * Tipe periode untuk generateDocumentNumber.
 * mode 'bulan' = jalur lama (HOTEL), mode 'range' = jalur baru (RS).
 */
export type Periode =
  | { mode: 'bulan'; bulan: string }
  | { mode: 'range'; tanggalMulai: string; tanggalAkhir: string };

/**
 * Helper terpusat untuk men-generate nomor dokumen (Invoice atau Kwitansi).
 * Menggunakan RPC 'generate_document_number' untuk menjamin increment yang atomik.
 *
 * @param tipeDoc 'INV' untuk Invoice, 'KWT' untuk Kwitansi
 * @param kodeInvoice Kode unik pelanggan (mis: 'HG', 'RS')
 * @param periode Periode dalam format union Periode
 * @returns Nomor dokumen utuh, misal: '001/PL-INV-HG/VI/2026'
 */
export const generateDocumentNumber = async (
  tipeDoc: 'INV' | 'KWT',
  kodeInvoice: string,
  periode: Periode
): Promise<string> => {
  if (!kodeInvoice) return "";

  let cacheKey: string;
  let counterKey: string;
  let romanPart: string;
  let tahun: number;

  if (periode.mode === 'bulan') {
    const bln = periode.bulan;
    if (!bln) return "";
    const [tahunStr, bulanStr] = bln.split("-");
    tahun = parseInt(tahunStr, 10);
    const bulanNum = parseInt(bulanStr, 10);
    cacheKey = `${tipeDoc}_${kodeInvoice}_${bln}`;
    counterKey = `${tipeDoc}_${kodeInvoice}_${tahun}`;
    romanPart = toRoman(bulanNum);
  } else {
    // mode === 'range'
    const { tanggalMulai, tanggalAkhir } = periode;
    if (!tanggalMulai || !tanggalAkhir) return "";
    const rangeInfo = toRomanMonthRange(tanggalMulai, tanggalAkhir);
    tahun = rangeInfo.tahun;
    romanPart = rangeInfo.roman;
    cacheKey = `${tipeDoc}_${kodeInvoice}_${tanggalMulai}_${tanggalAkhir}`;
    counterKey = `${tipeDoc}_${kodeInvoice}_${tahun}`;
  }

  try {
    // 1. Cek cache di tabel invoice_numbers
    const { data: cached } = await supabase
      .from('invoice_numbers')
      .select('nomor')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (cached && cached.nomor) return cached.nomor;

    // 2. Jika belum ada, ambil counter terbaru secara atomik
    const { data: currentCounter, error } = await supabase
      .rpc('generate_document_number', { p_counter_key: counterKey });

    if (error || currentCounter === null) {
      console.error(`Error generating document number for ${tipeDoc}:`, error);
      return `ERR/${tipeDoc}-${kodeInvoice}/${romanPart}/${tahun}`;
    }
    
    // 3. Format nomor baru
    const nomor = `${String(currentCounter).padStart(3, "0")}/PL-${tipeDoc}-${kodeInvoice}/${romanPart}/${tahun}`;

    // 4. Simpan ke database
    await supabase.from('invoice_numbers').upsert({ cache_key: cacheKey, nomor });

    return nomor;
  } catch (err) {
    console.error("Gagal generateDocumentNumber:", err);
    return "";
  }
};


/**
 * Hitung ulang total nota berdasarkan harga dan multiplier terbaru
 */
export const hitungUlangNota = (
  nota: any,
  jenisNotaMap: Record<number, any>,
  hargaKhusus: Record<number, number>
) => {
  if (!nota || !nota.items) return nota;

  const jenis = jenisNotaMap[nota.jenis]; // ID jenis nota atau cari berdasarkan nama
  // Jika jenis == FLAT atau FLAT ASLI dan pelanggan = HOTEL -> subtotal items tetap dihitung tapi total nota 0 atau biarkan saja tergantung logic.
  // Biasa kita update subtotal dan total berdasarkan hargaKhusus.
  
  let newTotal = 0;
  const newItems = nota.items.map((item: any) => {
    // Jika tidak ada ID master, abaikan
    if (!item.idMaster) return item;
    
    const hargaSatuan = hargaKhusus[item.idMaster] || 0;
    // Multiplier bisa diambil dari item.multiplier atau dari jenis nota
    const multiplier = item.multiplier || 1;
    const qty = item.qty || 0;
    
    const subtotal = hargaSatuan * qty * multiplier;
    newTotal += subtotal;
    
    return { ...item, harga: hargaSatuan, subtotal };
  });

  return {
    ...nota,
    items: newItems,
    total: newTotal
  };
};

/**
 * Hitung total keseluruhan invoice pelanggan dalam 1 bulan
 */
export const totalInvoiceOf = (pData: any, bln: string, arrNota: any[]): number => {
  if (!pData || !arrNota) return 0;
  const isFlatCustomer = pData.tipe === "HOTEL" && pData.tipe_billing === "FLAT";
  const flatRate = pData.tarif_flat || 0;

  let totalTagihan = 0;
  const totalsPerJenis: Record<string, number> = {};

  arrNota.forEach((nota) => {
    const j = nota.jenis || 'REGULER';
    if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
    if (isFlatCustomer && (j === "FLAT" || j === "FLAT ASLI")) {
      // Abaikan untuk akumulasi
    } else {
      totalsPerJenis[j] += nota.total || 0;
    }
  });

  if (isFlatCustomer) {
    totalTagihan = flatRate;
    for (const [j, v] of Object.entries(totalsPerJenis)) {
      if (j !== "FLAT" && j !== "FLAT ASLI") totalTagihan += v;
    }
  } else {
    totalTagihan = Object.values(totalsPerJenis).reduce((a, b) => a + b, 0);
  }

  return Math.floor(totalTagihan);
};
