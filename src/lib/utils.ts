/**
 * Shared Utilities for Pelangi Laundry
 */

/**
 * Konversi angka ke teks terbilang bahasa Indonesia.
 */
export const terbilang = (angka: number): string => {
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
  } else if (angka < 1000000000000000) {
    hasil = terbilang(Math.floor(angka / 1000000000000)) + " triliun " + terbilang(angka % 1000000000000);
  }
  return hasil.trim();
};

/**
 * Format angka ke Rupiah.
 * Contoh: 1000000 -> "Rp 1.000.000"
 */
export const fmtRp = (val: number): string => {
  if (isNaN(val)) return "Rp 0";
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formatted = Math.floor(absVal).toLocaleString("id-ID");
  return isNegative ? `- Rp ${formatted}` : `Rp ${formatted}`;
};

/**
 * Konversi bulan (1-12) ke angka romawi (I-XII).
 */
export const toRoman = (num: number): string => {
  const r = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return r[num] || "";
};

/**
 * Generate ID unik untuk Nota (format: YYYYMMDD-XXXX).
 */
export const generateNotaId = (tanggalStr: string): string => {
  const d = new Date(tanggalStr);
  const yyyy = d.getFullYear().toString();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${yyyy}${mm}${dd}-${randomStr}`;
};

/**
 * Auto-generate kode pelanggan dari nama.
 * Skip kata generik seperti HOTEL, RS, dll.
 */
export const generateKodePelanggan = (nama: string): string => {
  const GENERIC = ["HOTEL", "HOTELS", "THE", "RS", "RUMAH", "SAKIT", "TAB", "CAPSULE", "CLINIC", "VILLA", "RESORT", "APARTEMEN", "KLINIK"];
  const kata = (nama || "").toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  let kode = "";
  for (const k of kata) { 
    if (GENERIC.includes(k)) continue; 
    kode += k[0]; 
    if (kode.length >= 5) break; 
  }
  return kode || (kata[0] ? kata[0].substring(0, 3) : "PL");
};

/**
 * Parse input string ke angka (misal "1.000.000" -> 1000000).
 */
export const parseCurrencyValue = (str: string): number => {
  if (!str) return 0;
  const parsed = parseInt(str.replace(/\./g, ""), 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format value input text ke format currency dengan titik (tanpa Rp).
 * Cocok untuk dipakai di dalam onChange <input type="text" />
 */
export const formatCurrencyInput = (value: string | number): string => {
  if (value === undefined || value === null) return '';
  const strVal = value.toString().replace(/\D/g, "");
  if (!strVal) return "";
  return parseInt(strVal, 10).toLocaleString("id-ID");
};
