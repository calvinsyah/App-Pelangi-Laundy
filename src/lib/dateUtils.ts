export const getLastDayOfMonth = (periodeYYYYMM: string): string => {
  const [y, m] = periodeYYYYMM.split('-').map(Number);
  return `${periodeYYYYMM}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

export const getMonthRange = (periode: string) => ({
  start: `${periode}-01`,
  end: getLastDayOfMonth(periode)
});

/**
 * Format rentang tanggal ke label Indonesia.
 * "2026-05-26", "2026-06-25" → "26 Mei 2026 - 25 Juni 2026"
 */
export const formatDateRange = (start: string, end: string): string => {
  const fmt = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'long' })} ${d.getFullYear()}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
};

/**
 * Konversi rentang tanggal ke romawi bulan untuk nomor dokumen.
 * Bulan & tahun sama → "V"
 * Bulan beda, tahun sama → "V-VI"
 * Lintas tahun → "XII-I" (tahun invoice = tahun tanggalAkhir)
 */
export const toRomanMonthRange = (start: string, end: string): { roman: string; tahun: number } => {
  const romans = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const ds = new Date(start + 'T00:00:00');
  const de = new Date(end + 'T00:00:00');
  const ms = ds.getMonth() + 1;
  const me = de.getMonth() + 1;
  const tahun = de.getFullYear();

  if (ms === me && ds.getFullYear() === de.getFullYear()) {
    return { roman: romans[ms], tahun };
  }
  return { roman: `${romans[ms]}-${romans[me]}`, tahun };
};

/**
 * Build cache/lock key dari rentang tanggal.
 * "2026-05-26", "2026-06-25" → "2026-05-26_2026-06-25"
 */
export const buildPeriodKey = (start: string, end: string): string =>
  `${start}_${end}`;

/**
 * Validasi: tanggalAkhir >= tanggalMulai.
 */
export const isValidRange = (start: string, end: string): boolean =>
  end >= start;
