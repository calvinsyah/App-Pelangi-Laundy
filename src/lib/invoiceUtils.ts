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


