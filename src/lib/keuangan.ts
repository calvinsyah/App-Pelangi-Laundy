export const HPP_CATEGORIES = [
  "GAS",
  "AIR",
  "LISTRIK 1",
  "LISTRIK 2",
  "CHEMICAL",
  "BBM",
  "PLASTIK",
  "PPH PS 23",
  "GAJI BORONGAN"
];

export const ADM_CATEGORIES = [
  "GAJI TETAP",
  "MAKAN",
  "PERAWATAN MESIN",
  "IURAN SAMPAH",
  "IURAN RT",
  "LAIN-LAIN"
];

export const checkIsNotaFlat = (nota: any) =>
  nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";

export const hitungTagihan = (pData: any, arrNota: any[], prefixBln: string, hargaPelanggan?: any[]) => {
  if (!pData) return 0;
  const isRS = pData.tipe?.toUpperCase() === 'RS';
  const isFlat = pData.tipe_billing?.toUpperCase() === 'FLAT';
  const notasCust = arrNota.filter((n: any) => n.pelanggan_id === pData.id && n.tanggal && n.tanggal.startsWith(prefixBln));
  if (notasCust.length === 0 && !isFlat) return 0;

  let total = 0;

  if (isRS) {
    notasCust.forEach((nota: any) => {
      if (nota.items && Array.isArray(nota.items)) {
        nota.items.forEach((it: any) => {
          const hp = hargaPelanggan?.find((h: any) => h.pelanggan_id === pData.id && h.linen_id === it.linen_id);
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
    notasCust.forEach((nota: any) => {
      if (!checkIsNotaFlat(nota)) {
        total += nota.total || 0;
      }
    });
  } else {
    notasCust.forEach((nota: any) => {
      total += nota.total || 0;
    });
  }
  return total;
};
