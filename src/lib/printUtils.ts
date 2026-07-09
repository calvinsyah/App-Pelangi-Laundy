/**
 * Print & Download Utilities for Pelangi Laundry
 */
import { supabase } from './supabaseClient';
import { fmtRp, terbilang } from './utils';
/**
 * Generate HTML kop surat persis seperti v24
 */
export const generateKopHTML = (kop: any, logoUrl?: string | null): string => {
  if (!kop || !kop.nama) return "";

  const logoHtml = logoUrl
    ? `<div style="padding-right: 20px; border-right: 1px solid #ccc; margin-right: 20px; display: flex; align-items: center; justify-content: center;">
         <img src="${logoUrl}" alt="Logo" style="max-height: 70px;">
       </div>`
    : '';

  return `
    <div style="display: flex; align-items: center; border-bottom: 3px double #1e3a5f; padding-bottom: 15px; margin-bottom: 15px;">
      ${logoHtml}
      <div style="line-height: 1.4;">
        <h1 style="font-size: 24px; font-weight: 900; color: #1e3a5f; margin: 0 0 6px 0; letter-spacing: 1px; text-transform: uppercase;">
          ${kop.nama}
        </h1>
        <p style="font-size: 13px; color: #334155; margin: 0;">
          ${kop.alamat || ''}
        </p>
        <p style="font-size: 13px; color: #334155; margin: 0;">
          Telp: ${kop.telepon || ''} | Email: ${kop.email || ''}
        </p>
        <p style="font-size: 13px; color: #334155; margin: 0;">
          Contact Person: ${kop.kontak || ''}
        </p>
      </div>
    </div>
  `;
};

/**
 * Buka window baru untuk cetak HTML
 */
export const openPrintWindow = (html: string, title: string = "Print") => {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    alert("Popup diblokir! Tolong izinkan pop-up untuk situs ini.");
    return;
  }

  // Wrap in basic HTML structure if not already a full document
  const fullHtml = html.includes("<html") ? html : `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 10px; color: #1e293b; background: white; }
        @media print { body { margin: 0; padding: 10px; } }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `;

  printWindow.document.write(fullHtml);
  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.print();
    setTimeout(function () {
      printWindow.close();
    }, 2000);
  };
};

/**
 * Download string HTML sebagai file .html
 */
export const downloadHTML = (html: string, filename: string) => {
  const fullHtml = html.includes("<html") ? html : `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 10px; color: #1e293b; background: white; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `;

  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Download HTML Table string sebagai Excel (.xls)
 */
export const downloadExcel = (htmlTable: string, filename: string) => {
  const excelHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; } 
        th { background: #1e3a5f; color: white; padding: 5px; border: 1px solid #999; } 
        td { padding: 4px; border: 1px solid #ccc; }
      </style>
    </head>
    <body>
      ${htmlTable}
    </body>
    </html>
  `;

  const blob = new Blob([excelHTML], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const buildLinenRoomHTML = async (
  pel: any,
  bln: string,
  notas: any[],
  kopHTML: string
): Promise<string> => {
  const isFlatCustomer = pel.tipe?.toUpperCase() === "HOTEL" && pel.tipe_billing?.toUpperCase() === "FLAT";

  // Ambil master linen dan konfigurasi pelanggan
  const [mlRes, lpRes, hpRes] = await Promise.all([
    supabase.from('master_linen').select('*').order('id'),
    supabase.from('linen_pelanggan').select('*').eq('pelanggan_id', pel.id),
    supabase.from('harga_pelanggan').select('*').eq('pelanggan_id', pel.id)
  ]);

  const masterLinen = mlRes.data || [];
  const linenP = lpRes.data || [];
  const hargaP = hpRes.data || [];

  // Urutkan linen sesuai konfigurasi
  let config = masterLinen.map(ml => {
    const lp = linenP.find(x => x.linen_id === ml.id);
    const hp = hargaP.find(x => x.linen_id === ml.id);
    return {
      id: ml.id,
      nama: ml.nama,
      urutan: lp ? lp.urutan : 999,
      harga: hp ? hp.harga : 0
    };
  });
  config.sort((a, b) => {
    if (a.urutan === b.urutan) return a.id - b.id;
    return a.urutan - b.urutan;
  });

  const grid: Record<number, any> = {};
  config.forEach(item => {
    grid[item.id] = { name: item.nama, price: item.harga, qty: {} };
    for (let d = 1; d <= 31; d++) grid[item.id].qty[d] = 0;
  });

  // Agregasi qty
  notas.forEach(nota => {
    const dateObj = new Date(nota.tanggal);
    const day = dateObj.getDate();

    // Linen room HANYA mengambil nota FLAT ASLI secara absolut
    if (nota.jenis?.toUpperCase() !== "FLAT ASLI") return;

    if (nota.items && Array.isArray(nota.items)) {
      nota.items.forEach((it: any) => {
        if (it.linen_id && grid[it.linen_id] && day >= 1 && day <= 31) {
          grid[it.linen_id].qty[day] += it.qty || 0;
        }
      });
    }
  });

  const namaBulan = new Date(bln + "-02").toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();

  let html = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;margin:0 auto;max-width:100%;">
    ${kopHTML}
    <h2 style="text-align:center;margin:0 0 4px 0;">LINEN ROOM</h2>
    <p style="text-align:center;margin:0 0 12px 0;font-size:14px;">${pel.nama} | ${namaBulan}</p>
    <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:auto;border:1px solid #999;">
      <thead>
        <tr style="background:#1e3a5f;color:white;">
          <th style="padding:5px 4px;text-align:center;width:30px;border:1px solid #999;">No</th>
          <th style="padding:5px 4px;text-align:left;min-width:120px;border:1px solid #999;">ITEMS</th>
          <th style="padding:5px 4px;text-align:right;width:60px;border:1px solid #999;">Price</th>`;

  for (let d = 1; d <= 31; d++) html += `<th style="padding:5px 2px;text-align:center;width:22px;border:1px solid #999;">${d}</th>`;
  html += `<th style="padding:5px 4px;text-align:right;width:50px;border:1px solid #999;">Total</th>
           <th style="padding:5px 4px;text-align:right;width:80px;border:1px solid #999;">Amount</th>
        </tr>
      </thead>
      <tbody>`;

  let grandTotalQty = 0, grandTotalAmount = 0, rowNum = 0;

  config.forEach(item => {
    const data = grid[item.id];
    if (!data) return;

    let totalQty = 0, rowHtml = "";
    for (let d = 1; d <= 31; d++) {
      const q = data.qty[d];
      rowHtml += `<td style="padding:3px 2px;text-align:center;border:1px solid #ccc;">${q > 0 ? q : ""}</td>`;
      totalQty += q;
    }

    if (totalQty === 0) return;

    rowNum++;
    const amount = totalQty * data.price;
    grandTotalQty += totalQty;
    grandTotalAmount += amount;

    html += `<tr>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${rowNum}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${data.name}</td>
      <td style="padding:5px 4px;text-align:right;border:1px solid #ccc;">${fmtRp(data.price).replace('Rp ', '')}</td>
      ${rowHtml}
      <td style="padding:5px 4px;text-align:right;font-weight:600;border:1px solid #ccc;">${totalQty}</td>
      <td style="padding:5px 4px;text-align:right;font-weight:600;border:1px solid #ccc;">${fmtRp(amount).replace('Rp ', '')}</td>
    </tr>`;
  });

  html += `<tr style="background:#1e3a5f;color:white;font-weight:700;">
    <td colspan="3" style="padding:6px 4px;text-align:right;border:1px solid #999;">TOTAL KESELURUHAN</td>`;

  for (let d = 1; d <= 31; d++) {
    let dayTotal = 0;
    config.forEach(item => {
      if (grid[item.id]) dayTotal += grid[item.id].qty[d] || 0;
    });
    html += `<td style="padding:6px 2px;text-align:center;border:1px solid #999;">${dayTotal > 0 ? dayTotal : ""}</td>`;
  }

  html += `<td style="padding:6px 4px;text-align:right;border:1px solid #999;">${grandTotalQty}</td>
    <td style="padding:6px 4px;text-align:right;border:1px solid #999;">${fmtRp(grandTotalAmount).replace('Rp ', '')}</td>
    </tr></tbody></table></div>`;

  return html;
};

export const buildInvoicePelangganHTML = async (
  pel: any,
  bln: string,
  notas: any[],
  kopHTML: string,
  invNumber: string
): Promise<string> => {
  const { data: pg } = await supabase.from('pengaturan').select('*').limit(1).maybeSingle();
  const bankName = pg?.bank || "";
  const bankAccName = pg?.rekening_name || "";
  const bankAccNo = pg?.rekening_no || "";
  const direktur = pg?.direktur || "Bagus Riadi Kurniawan";

  const isFlatCustomer = pel.tipe_billing?.toUpperCase() === 'FLAT';
  const flatRate = isFlatCustomer ? pel.tarif_flat || 0 : 0;

  const { data: jnData } = await supabase.from('jenis_nota').select('*');
  const jenisNotaList = jnData || [];

  const checkIsNotaFlat = (nota: any) => {
    return nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
  };

  const totalsPerJenis: Record<string, number> = {};
  notas.forEach((nota) => {
    const j = nota.jenis || 'KILOAN';
    if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
    if (isFlatCustomer && checkIsNotaFlat(nota)) {
      // dihandle terpisah via flatRate
    } else {
      totalsPerJenis[j] += nota.total || 0; // Pastikan nota.total sudah dihitung sebelum dilempar ke sini
    }
  });

  let grandTotal = 0;
  let detailRows = "";
  let counter = 1;

  if (isFlatCustomer && flatRate > 0) {
    grandTotal += flatRate;
    detailRows += `
        <tr>
            <td style="text-align:center; padding: 8px 10px;">${counter}</td>
            <td style="padding: 8px 10px;">FLAT </td>
            <td style="text-align:right; padding: 8px 10px; font-weight: 600;">${fmtRp(flatRate)}</td>
        </tr>`;
    counter++;
  }

  for (const [jenis, amount] of Object.entries(totalsPerJenis)) {
    if (amount > 0) {
      grandTotal += amount;
      // Jika label aslinya KILOAN, kita bisa tampilkan Kiloan, atau gunakan langsung
      const isRsKiloan = pel.tipe?.toUpperCase() === 'RS' && jenis === 'KILOAN';
      const labelDesc = isRsKiloan ? `Biaya Cuci Linen Kiloan RS` : `${jenis} (Perincian Terlampir)`;

      detailRows += `
            <tr>
                <td style="text-align:center; padding: 8px 10px;">${counter}</td>
                <td style="padding: 8px 10px;">${labelDesc}</td>
                <td style="text-align:right; padding: 8px 10px; font-weight: 600;">${fmtRp(amount)}</td>
            </tr>`;
      counter++;
    }
  }

  const tglCetak = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Invoice ${pel.nama} - ${bln}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px 25px; color: #1e293b; font-size: 14px; background: #fff; }
        @media print { body { margin: 10mm 15mm; } @page { margin: 10mm; } }
        .divider { border-top: 2px solid #1e3a5f; margin: 10px 0; }
        .divider-double { border-top: 3px double #1e3a5f; margin: 14px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .info-table td { padding: 5px 0; vertical-align: top; }
        .info-table .label-col { width: 170px; font-weight: 700; color: #1e3a5f; }
        h1 { text-align: center; font-size: 22px; color: #1e3a5f; margin: 10px 0; letter-spacing: 2px; text-transform: uppercase; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1.5px solid #334155; }
        .detail-table thead th { background: #1e3a5f; color: white; padding: 9px 10px; font-size: 13px; text-transform: uppercase; border: 1px solid #334155; }
        .detail-table tbody td { border: 1px solid #cbd5e1; font-size: 13px; }
        .total-row td { font-size: 16px; font-weight: 800; padding: 10px; }
        .signature-box { display: inline-block; text-align: center; min-width: 200px; }
        .signature-line { border-top: 1px solid #000; margin: 60px 0 5px 0; }
    </style>
</head>
<body>
    ${kopHTML}
    <h1>INVOICE</h1>
    <div class="divider"></div>
    <table class="info-table">
        <tr><td class="label-col">DATE</td><td>: &nbsp; ${tglCetak}</td></tr>
        <tr><td class="label-col">INVOICE NUMBER</td><td>: &nbsp; <strong>${invNumber}</strong></td></tr>
    </table>
    <div style="border-top: 1px solid #cbd5e1; margin-top: 15px; padding-top: 10px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px;">ATTENTION TO :</div>
        <div style="font-size: 14px; margin-bottom: 3px;">${pel.nama}</div>
        ${pel.alamat ? `<div style="font-size: 14px; margin-bottom: 3px;">${pel.alamat}</div>` : ""}
        ${pel.kota ? `<div style="font-size: 14px; margin-bottom: 3px;">${pel.kota}</div>` : ""}
    </div>
    <div style="border-top: 1px solid #cbd5e1; margin-top: 10px; margin-bottom: 15px;"></div>
    
    <table class="detail-table">
        <thead>
            <tr>
                <th style="width: 50px;">NO</th>
                <th style="text-align: left;">DESCRIPTION</th>
                <th style="text-align: right; width: 180px;">TOTAL AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            ${detailRows}
            <tr class="total-row">
                <td colspan="2" style="text-align:right; border: 1px solid #cbd5e1;">TOTAL</td>
                <td style="text-align:right; border: 1px solid #cbd5e1;">${fmtRp(grandTotal)}</td>
            </tr>
        </tbody>
    </table>
    
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
            <div class="signature-line"></div>
            <div style="font-weight: 700;">${direktur}</div>
            <div style="font-size: 12px; color: #64748b;">Direktur</div>
        </div>
    </div>
</body>
</html>`;
};

export const buildSlipGajiHTML = (h: any, kopHTML: string): string => {
  if (!h) return '';
  const k = h.karyawan;

  let slipHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Slip Gaji ${k.nama}</title>
  <style>
    body { font-family:'Segoe UI',Arial,sans-serif; margin:20px; color:#1e293b; } 
    table { width:100%; border-collapse:collapse; margin-bottom: 15px; } 
    th { background:#1e3a5f; color:white; padding:8px; border: 1px solid #cbd5e1; } 
    td { padding:8px; border:1px solid #cbd5e1; } 
    @media print { body { margin:0; padding:10px; } }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
    ${kopHTML}
    <h2 style="text-align:center; color:#1e3a5f; text-decoration:underline;">SLIP UPAH KARYAWAN</h2>
    <p><strong>Nama:</strong> ${k.nama} &nbsp;|&nbsp; <strong>Bagian:</strong> ${k.bagian || "-"} &nbsp;|&nbsp; <strong>Periode:</strong> ${h.periodeMulai} s/d ${h.periodeSelesai}</p>
    <table>
        <tr><td>Upah Kerja</td><td style="text-align:right;">${fmtRp(h.totalUpah)}</td></tr>
        <tr><td>Insentif</td><td style="text-align:right;">${fmtRp(h.insentif)}</td></tr>
        <tr><td>Lembur</td><td style="text-align:right;">${fmtRp(h.lembur)}</td></tr>
        <tr><td>Potongan</td><td style="text-align:right; color:red;">${fmtRp(h.potongan)}</td></tr>
        <tr style="font-weight:700; background:#f1f5f9;"><td>Total Diterima</td><td style="text-align:right; font-size:16px;">${fmtRp(h.totalDiterima)}</td></tr>
    </table>
    <p style="font-style:italic; font-weight:600; padding: 10px; background:#f8fafc; border: 1px dashed #cbd5e1;">Terbilang: ${terbilang(h.totalDiterima)} rupiah</p>
    <div class="page-break"></div>
    <h3 style="color:#1e3a5f; margin-top:20px;">REKAPITULASI HARIAN</h3>
    <table>
      <tr>
        <th>Tanggal</th>
        <th>Status</th>
        <th>Kg</th>
        <th>Ongkos</th>
        <th>Hadir</th>
        <th>Upah</th>
      </tr>
      ${h.rincian.map((r: any) => `
      <tr>
        <td>${r.tanggal}</td>
        <td>${r.status}</td>
        <td style="text-align:center;">${r.kg.toFixed(1)}</td>
        <td style="text-align:right;">${fmtRp(r.ongkos)}</td>
        <td style="text-align:center;">${r.hadir}</td>
        <td style="text-align:right;">${fmtRp(r.upah)}</td>
      </tr>`).join("")}
    </table>
</body>
</html>`;
  return slipHTML;
};

export const buildSlipGajiTetapHTML = (h: any, kopHTML: string): string => {
  if (!h) return '';
  const k = h.karyawan;

  let slipHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Slip Gaji Tetap ${k.nama}</title>
  <style>
    body { font-family:'Segoe UI',Arial,sans-serif; margin:20px; color:#1e293b; } 
    table { width:100%; border-collapse:collapse; margin-bottom: 15px; } 
    th { background:#1e3a5f; color:white; padding:8px; border: 1px solid #cbd5e1; } 
    td { padding:8px; border:1px solid #cbd5e1; } 
    @media print { body { margin:0; padding:10px; } }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
    ${kopHTML}
    <h2 style="text-align:center; color:#1e3a5f; text-decoration:underline;">SLIP GAJI TETAP</h2>
    <p><strong>Nama:</strong> ${k.nama} &nbsp;|&nbsp; <strong>Bagian:</strong> ${k.bagian || "-"} &nbsp;|&nbsp; <strong>Periode:</strong> ${h.periodeMulai} s/d ${h.periodeSelesai}</p>
    <table>
        <tr><td>Gaji Pokok / Tetap</td><td style="text-align:right;">${fmtRp(h.gajiPokok || 0)}</td></tr>
        <tr><td>Insentif</td><td style="text-align:right;">${fmtRp(h.insentif)}</td></tr>
        <tr><td>Lembur</td><td style="text-align:right;">${fmtRp(h.lembur)}</td></tr>
        <tr><td>Potongan</td><td style="text-align:right; color:red;">${fmtRp(h.potongan)}</td></tr>
        <tr style="font-weight:700; background:#f1f5f9;"><td>Total Diterima</td><td style="text-align:right; font-size:16px;">${fmtRp(h.totalDiterima)}</td></tr>
    </table>
    <p style="font-style:italic; font-weight:600; padding: 10px; background:#f8fafc; border: 1px dashed #cbd5e1;">Terbilang: ${terbilang(h.totalDiterima)} rupiah</p>
    
    <h3 style="color:#1e3a5f; margin-top:20px;">REKAPITULASI KEHADIRAN</h3>
    <table>
      <tr>
        <th>Tanggal</th>
        <th>Status Kehadiran</th>
      </tr>
      ${h.rincian.map((r: any) => `
      <tr>
        <td style="text-align:center;">${r.tanggal}</td>
        <td style="text-align:center;">${r.status}</td>
      </tr>`).join("")}
    </table>
</body>
</html>`;
  return slipHTML;
};
