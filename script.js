
let customConfirmResolve = null;
window.customConfirm = function(message) {
  return new Promise((resolve) => {
    console.log('customConfirm called with message:', message); document.getElementById('customConfirmMessage').innerText = message;
    document.getElementById("customConfirmModal").style.display = "flex";
    customConfirmResolve = resolve;
  });
};
window.customConfirmRespond = function(response) {
  document.getElementById("customConfirmModal").style.display = "none";
  if (customConfirmResolve) {
    customConfirmResolve(response);
    customConfirmResolve = null;
  }
};
// ==================== INISIALISASI DATA ====================
const DB_DEFAULTS = {
  DB_NOTA: [], DB_BIAYA: [], DB_LOCKS: {}, DB_PAYMENT_STATUS: {},
  DB_KARYAWAN: [], DB_ABSENSI: [], DB_GAJI: [], DB_BACKUP_HISTORY: [],
  DB_PENGATURAN: { tarifInternalHotel: 7000, ongkosPerKg: 1200, rekeningName: "", rekeningNo: "", bank: "", direktur: "Bagus Riadi Kurniawan", peralatan: 0 },
  DB_KOP: { nama: "", alamat: "", telepon: "", email: "", kontak: "" },
  DB_INVOICE_NUMBERS: {}, DB_INVOICE_COUNTER: {},
  DB_JENIS_NOTA: [
    { name: "REGULER", multiplier: 1, forFlat: false, forReguler: true },
    { name: "FLAT", multiplier: 1, forFlat: true, forReguler: false },
    { name: "FLAT ASLI", multiplier: 1, forFlat: true, forReguler: false },
    { name: "SPOTING", multiplier: 2, forFlat: true, forReguler: true },
    { name: "GUEST LAUNDRY", multiplier: 1, forFlat: true, forReguler: true },
    { name: "NON FLAT", multiplier: 1.5, forFlat: true, forReguler: false },
    { name: "FNB", multiplier: 1.2, forFlat: true, forReguler: false },
  ],
  DB_PELANGGAN: [
    { id: 1, name: "Tab Capsule Hotel Kayoon", type: "HOTEL", billingSystem: "REGULER", flatRate: 0, tarifRS: 0, alamat: "", kota: "" },
    { id: 2, name: "Hotel Great", type: "HOTEL", billingSystem: "FLAT", flatRate: 15000000, tarifRS: 0, alamat: "", kota: "" },
    { id: 3, name: "RS Siti Khodijah", type: "RS", billingSystem: "REGULER", flatRate: 0, tarifRS: 7000, alamat: "", kota: "" },
  ],
  DB_MASTER_LINEN: [ { id: 1, name: "Sheet King" }, { id: 2, name: "Pillow Case" }, { id: 3, name: "Bath Towel" } ],
  DB_HARGA_PELANGGAN: {},
  DB_LINEN_PELANGGAN: {},
};
Object.keys(DB_DEFAULTS).forEach((key) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(DB_DEFAULTS[key])); });

// ==================== HELPER: LINEN PER PELANGGAN ====================
/**
 * Ambil daftar linen untuk pelanggan tertentu (sorted by urutan).
 * Jika belum ada konfigurasi, kembalikan semua masterLinen.
 * @param {number} pelangganId
 * @returns {Array<{linenId: number, urutan: number}>}
 */
function getLinenPelanggan(pelangganId) {
  const db = JSON.parse(localStorage.getItem("DB_LINEN_PELANGGAN") || "{}");
  const list = db[pelangganId];
  if (!list || list.length === 0) {
    // Fallback: semua masterLinen dengan urutan default
    return masterLinen.map((m, idx) => ({ linenId: m.id, urutan: idx }));
  }
  return [...list].sort((a, b) => a.urutan - b.urutan);
}

/**
 * Simpan daftar linen per-pelanggan ke localStorage.
 * @param {number} pelangganId
 * @param {Array<{linenId: number, urutan: number}>} list
 */
function saveLinenPelanggan(pelangganId, list) {
  const db = JSON.parse(localStorage.getItem("DB_LINEN_PELANGGAN") || "{}");
  db[pelangganId] = list;
  localStorage.setItem("DB_LINEN_PELANGGAN", JSON.stringify(db));
}

/**
 * Cek apakah pelanggan sudah punya konfigurasi linen sendiri.
 * @param {number} pelangganId
 * @returns {boolean}
 */
function hasLinenPelangganConfig(pelangganId) {
  const db = JSON.parse(localStorage.getItem("DB_LINEN_PELANGGAN") || "{}");
  return db[pelangganId] && db[pelangganId].length > 0;
}

/**
 * Inisialisasi drag & drop untuk baris tabel linen di modal edit pelanggan.
 * @param {HTMLElement} tbody
 */
function initLinenDragDrop(tbody) {
  let dragSrcEl = null;

  tbody.querySelectorAll('.linen-drag-row').forEach(row => {
    row.addEventListener('dragstart', function(e) {
      dragSrcEl = this;
      e.dataTransfer.effectAllowed = 'move';
      this.classList.add('dragging');
      // Set simple text to allow dragging in Firefox
      e.dataTransfer.setData('text/plain', '');
    });

    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return false;
    });

    row.addEventListener('dragenter', function(e) {
      if (dragSrcEl !== this) {
        this.classList.add('over');
      }
    });

    row.addEventListener('dragleave', function(e) {
      this.classList.remove('over');
    });

    row.addEventListener('drop', function(e) {
      e.stopPropagation();
      e.preventDefault();
      this.classList.remove('over');
      if (dragSrcEl && dragSrcEl !== this) {
        const rect = this.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        tbody.insertBefore(dragSrcEl, next ? this.nextSibling : this);
      }
      return false;
    });

    row.addEventListener('dragend', function(e) {
      tbody.querySelectorAll('.linen-drag-row').forEach(r => {
        r.classList.remove('dragging');
        r.classList.remove('over');
      });
    });
  });
}


function generateKodePelanggan(nama) {
  const GENERIC = ["HOTEL", "HOTELS", "THE", "RS", "RUMAH", "SAKIT", "TAB", "CAPSULE", "CLINIC", "VILLA", "RESORT", "APARTEMEN"];
  const kata = (nama || "").toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  let kode = "";
  for (const k of kata) { if (GENERIC.includes(k)) continue; kode += k[0]; if (kode.length >= 5) break; }
  return kode || (kata[0] ? kata[0].substring(0, 3) : "PL");
}
function migratePelangganKode() {
  let pel = [];
  try { pel = JSON.parse(localStorage.getItem("DB_PELANGGAN")) || []; } catch { pel = []; }
  let changed = false;
  pel.forEach((p) => { if (!p.kode) { p.kode = generateKodePelanggan(p.name); changed = true; } });
  if (changed) localStorage.setItem("DB_PELANGGAN", JSON.stringify(pel));
}
migratePelangganKode();

function toRoman(monthNum) {
  const r = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return r[monthNum] || "";
}
async function getInvoiceStableNumber(kode, bln) {
  if (!kode || !bln) return "";
  const [tahunStr, bulanStr] = bln.split("-");
  const tahun = parseInt(tahunStr, 10);
  const bulanNum = parseInt(bulanStr, 10);
  const cacheKey = `${kode}_${bln}`;
  const cached = JSON.parse(localStorage.getItem("DB_INVOICE_NUMBERS")) || {};
  if (cached[cacheKey]) return cached[cacheKey];
  const counters = JSON.parse(localStorage.getItem("DB_INVOICE_COUNTER")) || {};
  const counterKey = `${kode}_${tahun}`;
  let urut = (counters[counterKey] || 0) + 1;
  counters[counterKey] = urut;
  localStorage.setItem("DB_INVOICE_COUNTER", JSON.stringify(counters));
  const nomor = `${String(urut).padStart(3, "0")}/PL-${kode}/${toRoman(bulanNum)}/${tahun}`;
  cached[cacheKey] = nomor;
  localStorage.setItem("DB_INVOICE_NUMBERS", JSON.stringify(cached));
  // Sync ke Supabase
  try {
    await db.from("invoice_numbers").upsert({ cache_key: cacheKey, nomor }, { onConflict: "cache_key" });
    await db.from("invoice_counter").upsert({ counter_key: counterKey, nilai: urut }, { onConflict: "counter_key" });
  } catch (err) { console.error("Gagal sync invoice number ke Supabase:", err); }
  return nomor;
}
async function setCounterAwalPelanggan(kode, tahun, nilai) {
  const counters = JSON.parse(localStorage.getItem("DB_INVOICE_COUNTER")) || {};
  counters[`${kode}_${tahun}`] = nilai;
  localStorage.setItem("DB_INVOICE_COUNTER", JSON.stringify(counters));
  try {
    await db.from("invoice_counter").upsert({ counter_key: `${kode}_${tahun}`, nilai }, { onConflict: "counter_key" });
  } catch (err) { console.error("Gagal sync counter ke Supabase:", err); }
}

let jenisNotaList = [], pelangganList = [], masterLinen = [], karyawanList = [], absensiList = [], pengaturan = {}, hargaPelanggan = {};
let currentUserRole = "", isInvoicePaid = false, _hasilGaji = [];
let _gajiAktif = null; // FIX: Prevent reference error

function openKopDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("PelangiLaundry", 1);
    r.onupgradeneeded = (e) => { if (!e.target.result.objectStoreNames.contains("logo")) e.target.result.createObjectStore("logo"); };
    r.onsuccess = (e) => resolve(e.target.result);
    r.onerror = (e) => reject(e.target.error);
  });
}
async function saveLogoToIndexedDB(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
  });
  const db = await openKopDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logo", "readwrite");
    const store = tx.objectStore("logo");
    store.put(dataUrl, "kop");
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
async function getLogoFromIndexedDB() {
  try {
    const db = await openKopDB();
    return new Promise((resolve) => {
      const tx = db.transaction("logo", "readonly"); const store = tx.objectStore("logo"); const req = store.get("kop");
      req.onsuccess = () => { const r = req.result; if (typeof r === "string") resolve(r); else if (r instanceof Blob) resolve(URL.createObjectURL(r)); else resolve(null); };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

function toast(msg, type = "success", dur = 3000) {
  const icons = { success: "✓", error: "✗", warning: "⚠", info: "ℹ" };
  const el = document.createElement("div");
  el.className = `toast ${type}`; el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById("toastContainer").appendChild(el);
  setTimeout(() => { el.style.animation = "toastOut 0.3s ease forwards"; setTimeout(() => el.remove(), 300); }, dur);
}
function loadingThen(label, asyncFn) {
  toast(`${label}...`, "info", 1500);
  Promise.resolve(asyncFn()).catch((err) => { console.error(err); toast("Gagal memproses dokumen.", "error"); });
}
function formatCurrencyInput(input) { let v = input.value.replace(/\D/g, ""); input.value = v ? parseInt(v).toLocaleString("id-ID") : ""; }
function parseCurrencyValue(str) { if (!str) return 0; return parseInt(str.toString().replace(/\./g, "").replace(/[^\d]/g, "")) || 0; }
function fmtRp(val) { const abs = Math.abs(val); const sign = val < 0 ? "- " : ""; return sign + "Rp " + Math.floor(abs).toLocaleString("id-ID"); }
function terbilang(angka) {
  if (angka === 0) return "nol";
  const s = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (angka < 12) return s[angka];
  if (angka < 20) return terbilang(angka - 10) + " belas";
  if (angka < 100) return s[Math.floor(angka / 10)] + " puluh " + terbilang(angka % 10);
  if (angka < 200) return "seratus " + terbilang(angka - 100);
  if (angka < 1000) return s[Math.floor(angka / 100)] + " ratus " + terbilang(angka % 100);
  if (angka < 2000) return "seribu " + terbilang(angka - 1000);
  if (angka < 1e6) return (terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000));
  if (angka < 1e9) return (terbilang(Math.floor(angka / 1e6)) + " juta " + terbilang(angka % 1e6));
  return (terbilang(Math.floor(angka / 1e9)) + " milyar " + terbilang(angka % 1e9));
}
function generateNotaId(tgl) { return `${tgl.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`; }

// ==================== HELPER: BUTTON LOADING STATE ====================
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function namaPelangganById(id) { const p = pelangganList.find((p) => p.id === id); return p ? p.name : ""; }
function normalizeNota(n) {
  if (!n) return n;
  return { id: n.id, notaId: n.notaId || n.nota_id, nota_id: n.nota_id || n.notaId, tanggal: n.tanggal, pelanggan_id: n.pelanggan_id, pelanggan: n.pelanggan || namaPelangganById(n.pelanggan_id) || "", jenis: n.jenis, total: n.total || 0, items: Array.isArray(n.items) ? n.items : [] };
}

function prosesLogin() {
  const u = document.getElementById("username").value.trim(), p = document.getElementById("password").value;
  if ((u === "admin" && p === "admin") || (u === "user" && p === "user")) {
    currentUserRole = u; document.getElementById("loginError").style.display = "none"; bukaAplikasi();
  } else { document.getElementById("loginError").style.display = "block"; }
}
async function bukaAplikasi() {
  document.getElementById("loginPage").style.display = "none"; document.getElementById("appContent").style.display = "block";
  document.getElementById("roleBadge").innerText = currentUserRole === "admin" ? "👑 ADMIN" : "👤 USER";
  if (currentUserRole !== "admin") document.querySelectorAll(".admin-only").forEach((e) => (e.style.display = "none"));
  else document.querySelectorAll(".admin-only").forEach((e) => (e.style.display = ""));
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("notaTanggal").value = today; document.getElementById("cariTanggal").value = today;
  document.getElementById("absensiTanggal").value = today; document.getElementById("expTanggal").value = today; document.getElementById("gajiTglMulai").value = today;
  const end = new Date(); end.setDate(end.getDate() + 13); document.getElementById("gajiTglSelesai").value = end.toISOString().split("T")[0];
  document.getElementById("invoiceBulanSelect").value = today.substring(0, 7); document.getElementById("kuitansiBulanSelect").value = today.substring(0, 7);
  const now = new Date(); document.getElementById("filterExpMulai").value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]; document.getElementById("filterExpSelesai").value = today;
  await refreshDataSistem();
  cekPeringatanBackup();
  switchTab("tab-nota");
}
function logout() { currentUserRole = ""; isInvoicePaid = false; document.getElementById("loginPage").style.display = "flex"; document.getElementById("appContent").style.display = "none"; }

function showLoading(text = "Memuat...") {
  let el = document.getElementById("globalLoadingOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "globalLoadingOverlay";
    el.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;";
    el.innerHTML = `<div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #1e3a5f;border-radius:50%;animation:spin 1s linear infinite;"></div><p style="margin-top:12px;font-size:14px;color:#1e3a5f;font-weight:600;">${text}</p>`;
    document.body.appendChild(el);
  } else { el.querySelector("p").innerText = text; el.style.display = "flex"; }
}
function hideLoading() {
  const el = document.getElementById("globalLoadingOverlay");
  if (el) el.style.display = "none";
}
if (!document.getElementById("spinStyle")) {
  const style = document.createElement("style");
  style.id = "spinStyle";
  style.textContent = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

async function refreshDataSistem() {
  showLoading("Sinkronisasi data...");
  try {
    const [{ data: jn }, { data: pl }, { data: ml }, { data: kr }, { data: ab }, { data: pg }, { data: kp }, { data: hp }, { data: invNum }, { data: invCnt }, { data: payStat }, { data: lk }, { data: ut }, { data: bh }, { data: lpRes }] = await Promise.all([
      db.from("jenis_nota").select("*"), db.from("pelanggan").select("*"), db.from("master_linen").select("*"), db.from("karyawan").select("*"), db.from("absensi").select("*"), db.from("pengaturan").select("*").limit(1), db.from("kop").select("*").limit(1), db.from("harga_pelanggan").select("*"), db.from("invoice_numbers").select("*"), db.from("invoice_counter").select("*"), db.from("payment_status").select("*"), db.from("locks").select("*"), db.from("utang").select("*"), db.from("backup_history").select("*"), db.from("linen_pelanggan").select("*").then(r => r.error ? { data: [] } : r).catch(() => ({ data: [] }))
    ]);
    jenisNotaList = jn.map((j) => ({ name: j.name, multiplier: j.multiplier, forFlat: j.for_flat, forReguler: j.for_reguler, linenIds: Array.isArray(j.linen_ids) ? j.linen_ids.map(Number) : [] }));
    pelangganList = pl.map((p) => ({ id: p.id, name: p.nama, kode: p.kode, type: p.tipe, billingSystem: p.billing_system, flatRate: p.flat_rate, tarifRS: p.tarif_rs, alamat: p.alamat, kota: p.kota }));
    masterLinen = ml.map((m) => ({ id: m.id, name: m.name }));
    karyawanList = kr.map((k) => ({ id: k.id, nama: k.nama, bagian: k.bagian, persentase: k.persentase }));
    absensiList = ab.map((a) => ({ tanggal: a.tanggal, karyawanId: a.karyawan_id, status: a.status }));
    const pgRow = pg[0] || {};
    pengaturan = { tarifInternalHotel: pgRow.tarif_internal_hotel || 7000, ongkosPerKg: pgRow.ongkos_per_kg || 1200, rekeningName: pgRow.rekening_name || "", rekeningNo: pgRow.rekening_no || "", bank: pgRow.bank || "", direktur: pgRow.direktur || "Bagus Riadi Kurniawan", peralatan: pgRow.peralatan || 0 };
    const kopRow = kp[0] || {};
    const kop = { nama: kopRow.nama || "", alamat: kopRow.alamat || "", telepon: kopRow.telepon || "", email: kopRow.email || "", kontak: kopRow.kontak || "" };
    localStorage.setItem("DB_KOP", JSON.stringify(kop));
    hargaPelanggan = {}; hp.forEach((h) => { if (!hargaPelanggan[h.pelanggan_id]) hargaPelanggan[h.pelanggan_id] = {}; hargaPelanggan[h.pelanggan_id][h.linen_id] = h.harga; });
    const lpMap = {}; (lpRes || []).forEach((row) => { if (!lpMap[row.pelanggan_id]) lpMap[row.pelanggan_id] = []; lpMap[row.pelanggan_id].push({ linenId: row.linen_id, urutan: row.urutan }); }); localStorage.setItem("DB_LINEN_PELANGGAN", JSON.stringify(lpMap));
    const invNumObj = {}; invNum.forEach((inv) => { invNumObj[inv.cache_key] = inv.nomor; }); localStorage.setItem("DB_INVOICE_NUMBERS", JSON.stringify(invNumObj));
    const invCntObj = {}; invCnt.forEach((c) => { invCntObj[c.counter_key] = c.nilai; }); localStorage.setItem("DB_INVOICE_COUNTER", JSON.stringify(invCntObj));
    const payStatObj = {}; payStat.forEach((ps) => { payStatObj[ps.key] = ps.is_paid; }); localStorage.setItem("DB_PAYMENT_STATUS", JSON.stringify(payStatObj));
    const lockObj = {}; lk.forEach((l) => { lockObj[l.key] = l.is_locked; }); localStorage.setItem("DB_LOCKS", JSON.stringify(lockObj));
    localStorage.setItem("DB_UTANG", JSON.stringify(ut.map((u) => ({ id: u.id, nama: u.nama, dari: u.dari, sampai: u.sampai, cicilan: u.cicilan, keterangan: u.keterangan, sisaBulan: u.sisa_bulan, status: u.status }))));
    localStorage.setItem("DB_BACKUP_HISTORY", JSON.stringify(bh.map((b) => b.bulan)));
    localStorage.setItem("DB_JENIS_NOTA", JSON.stringify(jenisNotaList)); localStorage.setItem("DB_PELANGGAN", JSON.stringify(pelangganList)); localStorage.setItem("DB_MASTER_LINEN", JSON.stringify(masterLinen)); localStorage.setItem("DB_KARYAWAN", JSON.stringify(karyawanList)); localStorage.setItem("DB_ABSENSI", JSON.stringify(absensiList)); localStorage.setItem("DB_PENGATURAN", JSON.stringify(pengaturan)); localStorage.setItem("DB_HARGA_PELANGGAN", JSON.stringify(hargaPelanggan));
    const { data: notaData } = await db.from("nota").select("*");
    localStorage.setItem("DB_NOTA", JSON.stringify((notaData || []).map(normalizeNota)));
    renderPelangganDropdowns(); renderJenisNotaDropdown(); renderFormLinenInput(); renderMasterLinenTable(); renderMasterJenisNotaTable(); renderMasterKaryawanTable(); renderDaftarPelanggan();
    if (document.getElementById("absensiTanggal").value) renderAbsensiTable();
    await hitungMenejemenKeuangan(); renderDaftarUtang();
    document.getElementById("settingTarifHotel").value = (pengaturan.tarifInternalHotel || 7000).toLocaleString("id-ID"); document.getElementById("settingOngkosPerKg").value = (pengaturan.ongkosPerKg || 1200).toLocaleString("id-ID");
    document.getElementById("settingRekeningName").value = pengaturan.rekeningName || ""; document.getElementById("settingRekeningNo").value = pengaturan.rekeningNo || "";
    document.getElementById("settingBank").value = pengaturan.bank || ""; document.getElementById("settingDirektur").value = pengaturan.direktur || ""; document.getElementById("settingPeralatan").value = (pengaturan.peralatan || 0).toLocaleString("id-ID");
    document.getElementById("kopNama").value = kop.nama; document.getElementById("kopAlamat").value = kop.alamat; document.getElementById("kopTelepon").value = kop.telepon; document.getElementById("kopEmail").value = kop.email; document.getElementById("kopContact").value = kop.kontak;
    previewLogoFromDB();
  } catch (err) { console.error("Gagal memuat data:", err); toast("Gagal memuat data dari server. Periksa koneksi.", "error"); }
  finally { hideLoading(); }
}

function renderPelangganDropdowns() {
  ["pelangganSelect", "invoicePelangganSelect", "kuitansiPelangganSelect"].forEach((id) => {
    const sel = document.getElementById(id); const prev = sel.value; sel.innerHTML = "";
    pelangganList.forEach((p) => { sel.innerHTML += `<option value="${p.name}">${p.type === "HOTEL" ? "🏨" : "🏥"} ${p.name}</option>`; });
    if (prev && pelangganList.find((p) => p.name === prev)) sel.value = prev;
  });
  cekTipePelangganInput();
}
function renderJenisNotaDropdown(selected = null) {
  const pel = pelangganList.find((p) => p.name === document.getElementById("pelangganSelect").value);
  const sel = document.getElementById("jenisNota"); const prev = selected || sel.value; sel.innerHTML = "";
  if (pel && pel.type === "RS") { sel.innerHTML = '<option value="KILOAN">KILOAN</option>'; sel.disabled = true; return; }
  sel.disabled = false;
  const filtered = pel && pel.type === "HOTEL" ? jenisNotaList.filter((j) => pel.billingSystem === "FLAT" ? j.forFlat : j.forReguler) : jenisNotaList;
  filtered.forEach((j) => { sel.innerHTML += `<option value="${j.name}" ${prev === j.name ? "selected" : ""}>${j.name} (${j.multiplier}x)</option>`; });
}
function cekTipePelangganInput() {
  const pData = pelangganList.find((p) => p.name === document.getElementById("pelangganSelect").value);
  if (pData && pData.type === "RS") {
    document.getElementById("jenisNota").innerHTML = '<option value="KILOAN">KILOAN</option>'; document.getElementById("jenisNota").disabled = true;
    document.getElementById("formHotel").style.display = "none"; document.getElementById("formRS").style.display = "block";
    document.getElementById("infoTarifRS").innerText = `🏥 ${pData.name}: Rp ${(pData.tarifRS || 0).toLocaleString("id-ID")} / KG`;
  } else { document.getElementById("formHotel").style.display = "block"; document.getElementById("formRS").style.display = "none"; renderJenisNotaDropdown(); }
  renderFormLinenInput();
}
function getHargaPerPelanggan(pelangganId, linenId, multiplier) {
  const hrg = hargaPelanggan[pelangganId];
  if (hrg && hrg[linenId] !== undefined && hrg[linenId] !== null) { return Math.floor(hrg[linenId] * multiplier); } return 0;
}
function renderFormLinenInput() {
  const jName = document.getElementById("jenisNota").value;
  const jData = jenisNotaList.find((j) => j.name === jName);
  const mult = jData ? jData.multiplier : 1;
  const pelName = document.getElementById("pelangganSelect").value;
  const pelData = pelangganList.find((p) => p.name === pelName);
  const pelId = pelData ? pelData.id : null;
  const tbody = document.getElementById("tabelLinenInput");
  tbody.innerHTML = "";

  if (!pelId) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:20px;">Pilih pelanggan terlebih dahulu.</td></tr>';
    return;
  }

  // === Filter linen berdasarkan jenis nota (linen_ids) ===
  // Jika jenis nota belum diatur (linen_ids kosong), tidak ada linen yang muncul.
  const linenIdsJenis = (jData && Array.isArray(jData.linenIds)) ? jData.linenIds : [];

  if (linenIdsJenis.length === 0) {
    const isAdmin = currentUserRole === "admin";
    const pesan = isAdmin
      ? `⚠️ Belum ada linen diatur untuk jenis nota "<strong>${jName || '-'}</strong>". Klik tombol <strong>📋 Atur Linen</strong> di menu Master Data untuk mengaturnya.`
      : `⚠️ Belum ada linen diatur untuk jenis nota "<strong>${jName || '-'}</strong>". Hubungi Admin untuk mengaturnya.`;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#b45309;background:#fffbeb;padding:24px;border:2px dashed #fde68a;">${pesan}</td></tr>`;
    return;
  }

  // === Irisan: linen per-pelanggan (sorted) ∩ linen_ids jenis nota ===
  // Pelanggan mengatur urutan & subset linen mereka sendiri,
  // jenis nota memfilter subset mana yang aktif untuk jenis transaksi ini.
  const linenList = getLinenPelanggan(pelId).filter((entry) => linenIdsJenis.includes(entry.linenId));

  if (linenList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#b45309;background:#fffbeb;padding:20px;border:1px dashed #fde68a;">
      ℹ️ Tidak ada linen yang cocok antara pengaturan pelanggan & jenis nota "<strong>${jName}</strong>".<br>
      <small>Pelanggan hanya punya linen di luar daftar jenis nota, atau jenis nota tidak mengizinkan linen pelanggan.</small>
    </td></tr>`;
    return;
  }

  linenList.forEach((entry, idx) => {
    const item = masterLinen.find((m) => m.id === entry.linenId);
    if (!item) return;
    const hargaSatuan = getHargaPerPelanggan(pelId, item.id, mult);
    tbody.innerHTML += `<tr><td>${idx + 1}</td><td><strong>${item.name}</strong></td><td>${fmtRp(hargaSatuan)}</td><td><input type="number" class="input-qty linen-item-qty" data-id="${item.id}" data-name="${item.name}" data-price="${hargaSatuan}" value="0" min="0"></td></tr>`;
  });
}


async function simpanNotaSistem() {
  const btn = document.getElementById('btnSimpanNota');
  setBtnLoading(btn, true);
  try {
    const tgl = document.getElementById("notaTanggal").value;
    if (!tgl) { toast("Pilih tanggal!", "warning"); return; }
    const pelName = document.getElementById("pelangganSelect").value; const pData = pelangganList.find((p) => p.name === pelName);
    const jenis = document.getElementById("jenisNota").value;
    let items = [], total = 0;
    if (pData && pData.type === "RS") {
      const berat = parseFloat(document.getElementById("beratRS").value) || 0;
      if (berat <= 0) { toast("Berat harus lebih dari 0 KG!", "warning"); return; }
      total = Math.floor(berat * pData.tarifRS);
      items.push({ idMaster: 0, name: "Cucian RS (Kiloan)", qty: berat, unit: "KG", basePrice: pData.tarifRS, subtotal: total });
    } else {
      let hasNegative = false;
      document.querySelectorAll(".linen-item-qty").forEach((inp) => {
        const qty = parseInt(inp.value) || 0;
        if (qty < 0) hasNegative = true;
        if (qty > 0) {
          const price = parseInt(inp.getAttribute("data-price")), name = inp.getAttribute("data-name"), idMaster = parseInt(inp.getAttribute("data-id"));
          const sub = Math.floor(qty * price); total += sub;
          items.push({ idMaster, name, qty, unit: "Pcs", basePrice: price, subtotal: sub });
        }
      });
      if (hasNegative) { toast("Jumlah item tidak boleh negatif!", "warning"); return; }
      if (total <= 0) { toast("Masukkan jumlah item!", "warning"); return; }
      if (pData && pData.type === "HOTEL" && pData.billingSystem === "FLAT" && jenis === "FLAT") { total = 0; items.forEach((it) => (it.subtotal = 0)); toast("Nota FLAT disimpan (total 0).", "info", 2500); }
    }
    const notaId = generateNotaId(tgl);
    const newNota = { nota_id: notaId, tanggal: tgl, pelanggan_id: pData.id, jenis, total, items: JSON.parse(JSON.stringify(items)) };
    const { error } = await db.from("nota").insert([newNota]);
    if (error) { console.error("Gagal menyimpan nota:", error); toast("Gagal menyimpan nota. Silakan coba lagi.", "error"); return; }
    toast(`Transaksi ${notaId} berhasil!`);
    document.getElementById("beratRS").value = ""; document.querySelectorAll(".linen-item-qty").forEach((i) => (i.value = 0));
    await refreshDataSistem(); // FIX: Sinkronisasi data ke localStorage setelah insert
    await cariNotaSistem();
    await hitungMenejemenKeuangan();
  } finally {
    setBtnLoading(btn, false);
  }
}

async function cariNotaSistem() {
  const tgl = document.getElementById("cariTanggal").value;
  const pelFilter = (document.getElementById("cariPelanggan").value || "").toLowerCase().trim();
  let query = db.from("nota").select("*").order("tanggal", { ascending: true }).order("id", { ascending: true });
  if (tgl) query = query.eq("tanggal", tgl);
  const { data: notaData, error } = await query;
  if (error) { console.error("Gagal mengambil nota:", error); toast("Gagal memuat riwayat nota.", "error"); return; }
  let hasil = notaData || [];
  if (pelFilter) {
    const mapNama = {}; pelangganList.forEach((p) => { mapNama[p.id] = p.name; });
    hasil = hasil.filter((n) => { const nama = mapNama[n.pelanggan_id] || ""; return nama.toLowerCase().includes(pelFilter); });
  }
  const tbody = document.getElementById("tabelRiwayatNota");
  if (hasil.length === 0) {
    const hint = (tgl || pelFilter) ? `Tidak ada transaksi cocok dengan filter saat ini. <button class="btn-link" onclick="clearCariPelanggan();document.getElementById('cariTanggal').value='';cariNotaSistem()">Tampilkan semua</button>` : `Belum ada transaksi tersimpan. Buat nota baru di tab "Input Nota".`;
    tbody.innerHTML = emptyRowHTML(6, hint, "info");
    return;
  }
  const mapNama = {}; pelangganList.forEach((p) => { mapNama[p.id] = p.name; });
  tbody.innerHTML = hasil.map((nota) => {
    const namaPel = mapNama[nota.pelanggan_id] || "?";
    let aksi = `<button class="btn-sm btn-primary" onclick="bukaModalDetail(${nota.id})">Detail</button> <button class="btn-sm btn-primary" onclick="bukaModalEditLinen(${nota.id})">Edit</button>`;
    if (currentUserRole === "admin") aksi += ` <button class="btn-sm btn-danger" onclick="hapusNotaDariInvoice(${nota.id},'rekap')">Hapus</button>`;
    return `<tr>
      <td data-label="No Nota"><strong>${nota.nota_id}</strong></td>
      <td data-label="Tanggal">${nota.tanggal}</td>
      <td data-label="Pelanggan">${namaPel}</td>
      <td data-label="Jenis">${nota.jenis}</td>
      <td data-label="Total"><strong>${fmtRp(nota.total)}</strong></td>
      <td data-label="Aksi" data-full-width style="white-space:nowrap;">${aksi}</td>
    </tr>`;
  }).join("");
}
// tampilkanSemuaNota() tetap dipertahankan untuk backward-compat (dipakai internal oleh kode lain)
async function tampilkanSemuaNota() { document.getElementById("cariTanggal").value = ""; document.getElementById("cariPelanggan").value = ""; updateCariPelangganClearBtn(); await cariNotaSistem(); }

function getLockKey(pel, bln) { return `${pel}_${bln}`; }
function isInvoiceLocked(pel, bln) { const locks = JSON.parse(localStorage.getItem("DB_LOCKS") || "{}"); return locks[getLockKey(pel, bln)] === true; }
async function toggleLockInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value; const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) { toast("Pilih bulan!", "warning"); return; }
  const key = getLockKey(pel, bln); const newLockState = !isInvoiceLocked(pel, bln);
  const { error } = await db.from("locks").upsert({ key, is_locked: newLockState }, { onConflict: "key" });
  if (error) { console.error("Gagal mengupdate kunci invoice:", error); toast("Gagal mengupdate kunci.", "error"); return; }
  updateLockBadgeDisplay(pel, bln); hitungDanAmbilInvoice();
}
function updateLockBadgeDisplay(pel, bln) {
  const badge = document.getElementById("lockStatusBadge");
  if (isInvoiceLocked(pel, bln)) { badge.innerText = "LOCKED"; badge.className = "badge-status status-locked"; }
  else { badge.innerText = "UNLOCKED"; badge.className = "badge-status status-unlocked"; }
}
function updateStatusBadgeOnly() {
  const badge = document.getElementById("statusCurrentBadge");
  badge.innerText = isInvoicePaid ? "LUNAS" : "BELUM DIBAYAR";
  badge.className = isInvoicePaid ? "badge-status status-paid" : "badge-status status-unpaid";
}
async function toggleStatusPembayaran() {
  isInvoicePaid = !isInvoicePaid;
  const pel = document.getElementById("invoicePelangganSelect").value; const bln = document.getElementById("invoiceBulanSelect").value;
  if (bln) {
    const key = getLockKey(pel, bln);
    const { error } = await db.from("payment_status").upsert({ key, is_paid: isInvoicePaid }, { onConflict: "key" });
    if (error) { console.error("Gagal mengupdate status pembayaran:", error); toast("Gagal mengupdate status.", "error"); return; }
    updateStatusBadgeOnly();
    const payStat = JSON.parse(localStorage.getItem("DB_PAYMENT_STATUS")) || {};
    payStat[key] = isInvoicePaid; localStorage.setItem("DB_PAYMENT_STATUS", JSON.stringify(payStat));
    toast(isInvoicePaid ? "Status diubah menjadi LUNAS." : "Status diubah menjadi BELUM DIBAYAR.", "info");
    await hitungMenejemenKeuangan();
  }
}
function hitungUlangNota(nota) {
  const jData = jenisNotaList.find((j) => j.name === nota.jenis); const mult = jData ? jData.multiplier : 1;
  const pData = pelangganList.find((p) => p.name === nota.pelanggan);
  let total = 0;
  nota.items.forEach((it) => {
    if (it.idMaster !== 0) { const m = masterLinen.find((l) => l.id === it.idMaster); if (m && pData) it.basePrice = getHargaPerPelanggan(pData.id, it.idMaster, mult); }
    else { if (pData && pData.type === "RS") it.basePrice = pData.tarifRS; }
    it.subtotal = Math.floor((it.qty || 0) * it.basePrice); total += it.subtotal;
  });
  nota.total = total;
}

async function hapusNotaDariInvoice(id, asal) {
  if (!await window.customConfirm("Hapus nota ini?")) return;
  const { error } = await db.from("nota").delete().eq("id", id);
  if (error) { console.error("Gagal menghapus nota:", error); toast("Gagal menghapus nota.", "error"); return; }
  toast("Nota dihapus.");
  await refreshDataSistem(); // FIX: Sinkronisasi data ke localStorage setelah delete
  if (asal === "invoice") hitungDanAmbilInvoice();
  else await cariNotaSistem();
  await hitungMenejemenKeuangan();
}

function hitungDanAmbilInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value; const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) { toast("Pilih bulan!", "warning"); return; }
  const dbStore = JSON.parse(localStorage.getItem("DB_NOTA") || "[]"); const semua = dbStore.filter((n) => n.pelanggan === pel && n.tanggal.startsWith(bln));
  if (semua.length === 0) { document.getElementById("invoiceListCard").style.display = "none"; document.getElementById("invoiceResultCard").style.display = "none"; toast("Tidak ada transaksi pada periode ini.", "warning"); return; }
  const pData = pelangganList.find((p) => p.name === pel);
  const isFlatCustomer = pData && pData.type === "HOTEL" && pData.billingSystem === "FLAT";
  updateLockBadgeDisplay(pel, bln); const invoiceTerkunci = isInvoiceLocked(pel, bln);
  const tbody = document.getElementById("invoiceTableBody"); tbody.innerHTML = "";
  let totalNonFlat = 0;
  semua.forEach((nota) => {
    if (!invoiceTerkunci) hitungUlangNota(nota);
    const isNotaFlat = nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI";
    if (isFlatCustomer && isNotaFlat) { nota.total = 0; } else { totalNonFlat += nota.total; }
    tbody.innerHTML += `<tr><td><strong>${nota.notaId}</strong></td><td>${nota.tanggal}</td><td>${nota.jenis}</td><td><strong>${isFlatCustomer && isNotaFlat ? "0 (Flat)" : fmtRp(nota.total)}</strong></td><td><button class="btn-sm btn-primary" onclick="bukaModalDetail(${nota.id})">Detail</button></td></tr>`;
  });
  document.getElementById("invoiceListCard").style.display = "block";
  const flatRate = isFlatCustomer ? pData.flatRate || 0 : 0;
  const notaNonFlat = isFlatCustomer ? semua.filter((n) => n.jenis !== "FLAT" && n.jenis !== "FLAT ASLI") : semua;
  let rows = "";
  if (isFlatCustomer && flatRate > 0) { rows += `<tr style="background:#eff6ff;"><td colspan="4"><strong>Biaya Langganan Flat Bulanan</strong></td><td align="right"><strong>${fmtRp(flatRate)}</strong></td></tr>`; }
  notaNonFlat.forEach((nota, idx) => {
    const rincian = nota.items.map((it) => `${it.name} (${it.qty} ${it.unit}) @${fmtRp(it.basePrice)}`).join("<br>");
    rows += `<tr><td align="center">${idx + 1}</td><td>${nota.tanggal}</td><td><strong>${nota.notaId}-${nota.jenis}</strong></td><td>${rincian}</td><td align="right">${fmtRp(nota.total)}</td></tr>`;
  });
  const grandTotal = Math.floor(flatRate + totalNonFlat);
  const namaBulan = new Date(bln + "-02").toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();
  document.getElementById("printMonthlyInvoiceArea").innerHTML = `
        <div id="kopContainerInvoice"></div>
        <div style="margin-bottom:24px;">
            <h1 style="font-size:22px;color:#1e3a5f;">PELANGI LAUNDRY</h1>
            <h2 style="font-size:17px;margin:4px 0;">INVOICE TAGIHAN</h2>
            <p style="font-size:14px;color:#64748b;">Periode: ${namaBulan}</p>
            <p style="font-size:14px;">Kepada Yth: <strong>${pel}</strong></p>
        </div>
        <table class="linen-table" style="font-size:14px;">
            <thead><tr><th>#</th><th>Tanggal</th><th>No Nota</th><th>Rincian</th><th style="text-align:right;">Subtotal</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="font-weight:700;font-size:15px;"><td colspan="4" align="right">TOTAL TAGIHAN</td><td align="right">${fmtRp(grandTotal)}</td></tr></tfoot>
        </table>`;
  updateKopInPreview("kopContainerInvoice");
  document.getElementById("invoiceResultCard").style.display = "block";
  const paymentStatus = JSON.parse(localStorage.getItem("DB_PAYMENT_STATUS")) || {};
  isInvoicePaid = paymentStatus[getLockKey(pel, bln)] || false;
  updateStatusBadgeOnly();
}

async function generateKopHTML() {
  const kop = JSON.parse(localStorage.getItem("DB_KOP")) || {}; const logoUrl = await getLogoFromIndexedDB();
  let html = '<div style="display:flex; align-items:center; border-bottom: 3px double #1e3a5f; margin-bottom: 18px; margin-top: 10px; padding-bottom: 12px;">';
  if (logoUrl) { html += `<div style="flex-shrink:0; margin-right: 20px; padding-right: 20px; border-right: 1px solid #ccc;"><img src="${logoUrl}" style="max-height: 65px; max-width: 180px;" alt="Logo"></div>`; }
  html += '<div style="flex:1;">';
  if (kop.nama) { html += `<h2 style="margin:0; font-size: 18px; font-weight: 800; color: #1e3a5f; letter-spacing: 1px; text-transform: uppercase;">${kop.nama}</h2>`; }
  else { html += '<h2 style="margin:0; font-size: 18px; font-weight: 800; color: #1e3a5f; letter-spacing: 1px;">PELANGI LAUNDRY</h2>'; }
  if (kop.alamat) html += `<p style="margin: 3px 0 0 0; font-size: 13px; color: #334155;">${kop.alamat}</p>`;
  if (kop.telepon || kop.email) {
    html += '<p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">';
    if (kop.telepon) html += `Telp: ${kop.telepon}`; if (kop.telepon && kop.email) html += " &nbsp;|&nbsp; ";
    if (kop.email) html += `Email: ${kop.email}`; html += "</p>";
  }
  if (kop.kontak) { html += `<p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Contact Person: ${kop.kontak}</p>`; }
  html += "</div></div>";
  return html;
}
async function updateKopInPreview(containerId) { const container = document.getElementById(containerId); if (!container) return; container.innerHTML = await generateKopHTML(); }

async function cetakInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value; const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) return toast("Pilih bulan!", "warning");
  loadingThen("Menyiapkan Linen Room", async () => {
    const logoUrl = await getLogoFromIndexedDB(); const html = await buildLinenRoomHTML(pel, bln, logoUrl);
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return toast("Popup diblokir!", "warning");
    printWindow.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Linen Room - ${pel} - ${bln}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;margin:10px;color:#1e293b;background:white;}@media print{body{margin:0;padding:10px;}}</style></head><body>${html}</body></html>`);
    printWindow.document.close(); printWindow.onload = function () { printWindow.print(); setTimeout(function () { printWindow.close(); }, 2000); };
  });
}

async function downloadInvoice() {
  const pel = document.getElementById("invoicePelangganSelect").value; const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) return toast("Pilih bulan!", "warning");
  loadingThen("Menyiapkan download Linen Room", async () => {
    const logoUrl = await getLogoFromIndexedDB(); const html = await buildLinenRoomHTML(pel, bln, logoUrl);
    const fullHTML = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Linen Room - ${pel} - ${bln}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;margin:10px;color:#1e293b;}</style></head><body>${html}</body></html>`;
    downloadFile(fullHTML, `LinenRoom_${pel.replace(/\s/g, "_")}_${bln}.html`);
  });
}

async function downloadLinenRoomExcel() {
  const pel = document.getElementById("invoicePelangganSelect").value; const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) return toast("Pilih bulan!", "warning");
  loadingThen("Menyiapkan file Excel", async () => {
    const logoUrl = await getLogoFromIndexedDB(); const html = await buildLinenRoomHTML(pel, bln, logoUrl);
    const tempDiv = document.createElement("div"); tempDiv.innerHTML = html; const table = tempDiv.querySelector("table");
    if (!table) return toast("Gagal membuat file", "error");
    const excelHTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>table { border-collapse: collapse; } th { background: #1e3a5f; color: white; padding: 5px; border: 1px solid #999; } td { padding: 4px; border: 1px solid #ccc; }</style></head><body>${table.outerHTML}</body></html>`;
    const blob = new Blob([excelHTML], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `LinenRoom_${pel.replace(/\s/g, "_")}_${bln}.xls`;
    a.click(); toast("File Excel siap dikirim.", "success");
  });
}

async function buildLinenRoomHTML(pel, bln, logoUrl) {
  const kopHTML = await generateKopHTML();
  const dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  const semua = dbNota.filter((n) => n.pelanggan === pel && n.tanggal.startsWith(bln));
  const pData = pelangganList.find((p) => p.name === pel);
  const isFlatCustomer = pData && pData.type === "HOTEL" && pData.billingSystem === "FLAT";
  const hargaPelangganData = JSON.parse(localStorage.getItem("DB_HARGA_PELANGGAN")) || {};
  const hargaKhusus = hargaPelangganData[pData?.id] || {};
  const currentMasterLinen = JSON.parse(localStorage.getItem("DB_MASTER_LINEN")) || [];
  // Gunakan urutan linen per-pelanggan
  const linenUrutan = pData ? getLinenPelanggan(pData.id) : currentMasterLinen.map((m, i) => ({ linenId: m.id, urutan: i }));
  const orderedLinen = linenUrutan.map(e => currentMasterLinen.find(m => m.id === e.linenId)).filter(Boolean);
  const grid = {};
  orderedLinen.forEach((item) => {
    const price = hargaKhusus[item.id] || 0;
    grid[item.id] = { name: item.name, price: price, qty: {} };
    for (let d = 1; d <= 31; d++) grid[item.id].qty[d] = 0;
  });
  semua.forEach((nota) => {
    const day = parseInt(nota.tanggal.split("-")[2], 10);
    if (isFlatCustomer && nota.jenis !== "FLAT") return;
    nota.items.forEach((it) => { if (it.idMaster && grid[it.idMaster] && day >= 1 && day <= 31) grid[it.idMaster].qty[day] += it.qty || 0; });
  });
  const namaBulan = new Date(bln + "-02").toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();
  let html = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;margin:0 auto;max-width:100%;">
        ${kopHTML}
        <h2 style="text-align:center;margin:0 0 4px 0;">LINEN ROOM</h2>
        <p style="text-align:center;margin:0 0 12px 0;font-size:14px;">${pel} | ${namaBulan}</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:auto;border:1px solid #999;">
            <thead><tr style="background:#1e3a5f;color:white;"><th style="padding:5px 4px;text-align:center;width:30px;border:1px solid #999;">No</th><th style="padding:5px 4px;text-align:left;min-width:120px;border:1px solid #999;">ITEMS</th><th style="padding:5px 4px;text-align:right;width:60px;border:1px solid #999;">Price</th>`;
  for (let d = 1; d <= 31; d++) html += `<th style="padding:5px 2px;text-align:center;width:22px;border:1px solid #999;">${d}</th>`;
  html += `<th style="padding:5px 4px;text-align:right;width:50px;border:1px solid #999;">Total</th><th style="padding:5px 4px;text-align:right;width:80px;border:1px solid #999;">Amount</th></tr></thead><tbody>`;
  let grandTotalQty = 0, grandTotalAmount = 0, rowNum = 0;
  orderedLinen.forEach((item) => {
    const data = grid[item.id]; if (!data) return;
    let totalQty = 0, rowHtml = "";
    for (let d = 1; d <= 31; d++) { const q = data.qty[d]; rowHtml += `<td style="padding:3px 2px;text-align:center;border:1px solid #ccc;">${q > 0 ? q : ""}</td>`; totalQty += q; }
    if (totalQty === 0 && !isFlatCustomer) return;
    rowNum++; const amount = totalQty * data.price; grandTotalQty += totalQty; grandTotalAmount += amount;
    html += `<tr><td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${rowNum}</td><td style="padding:5px 4px;border:1px solid #ccc;">${data.name}</td><td style="padding:5px 4px;text-align:right;border:1px solid #ccc;">${data.price.toLocaleString("id-ID")}</td>${rowHtml}<td style="padding:5px 4px;text-align:right;font-weight:600;border:1px solid #ccc;">${totalQty}</td><td style="padding:5px 4px;text-align:right;font-weight:600;border:1px solid #ccc;">${amount.toLocaleString("id-ID")}</td></tr>`;
  });
  html += `<tr style="background:#1e3a5f;color:white;font-weight:700;"><td colspan="3" style="padding:6px 4px;text-align:right;border:1px solid #999;">TOTAL KESELURUHAN</td>`;
  for (let d = 1; d <= 31; d++) { let dayTotal = 0; orderedLinen.forEach((item) => { if (grid[item.id]) dayTotal += grid[item.id].qty[d] || 0; }); html += `<td style="padding:6px 2px;text-align:center;border:1px solid #999;">${dayTotal > 0 ? dayTotal : ""}</td>`; }
  html += `<td style="padding:6px 4px;text-align:right;border:1px solid #999;">${grandTotalQty}</td><td style="padding:6px 4px;text-align:right;border:1px solid #999;">${grandTotalAmount.toLocaleString("id-ID")}</td></tr></tbody></table></div>`;
  return html;
}


async function cetakInvoicePelanggan() {
  const pel = document.getElementById("invoicePelangganSelect").value;
  const bln = document.getElementById("invoiceBulanSelect").value;
  if (!bln) {
    toast("Pilih bulan!", "warning");
    return;
  }
  loadingThen("Menyiapkan Invoice", async () => {
    const kopHTML = await generateKopHTML();
    const html = await buildInvoicePelangganHTML(pel, bln, kopHTML);
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast("Popup diblokir!", "warning");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
      setTimeout(function () {
        printWindow.close();
      }, 2000);
    };
  });
}

async function buildInvoicePelangganHTML(pel, bln, kopHTML) {
  const dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  const semua = dbNota.filter(
    (n) => n.pelanggan === pel && n.tanggal.startsWith(bln),
  );
  const pData = pelangganList.find((p) => p.name === pel);
  const pengaturan = JSON.parse(localStorage.getItem("DB_PENGATURAN")) || {};
  const isFlatCustomer =
    pData && pData.type === "HOTEL" && pData.billingSystem === "FLAT";
  const flatRate = isFlatCustomer ? pData.flatRate || 0 : 0;

  const totalsPerJenis = {};
  semua.forEach((nota) => {
    const j = nota.jenis;
    if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
    if (isFlatCustomer && (j === "FLAT" || j === "FLAT ASLI")) {
    } else {
      totalsPerJenis[j] += nota.total || 0;
    }
  });

  const labelMap = {
    FLAT: "Biaya Langganan Flat Bulanan",
    "NON FLAT": "Cucian Non Flat (Perincian Terlampir)",
    FNB: "Cucian F & B (Perincian Terlampir)",
    SPOTING: "Spotting / Treatment (Perincian Terlampir)",
  };
  const orderJenis = ["FLAT", "NON FLAT", "FNB", "SPOTING"];

  let grandTotal = 0;
  let detailRows = "";
  let counter = 1;

  orderJenis.forEach((j) => {
    let amount = 0;
    if (j === "FLAT" && isFlatCustomer) {
      amount = flatRate;
    } else {
      amount = totalsPerJenis[j] || 0;
    }
    if (j === "FLAT" && !isFlatCustomer && amount === 0) return;
    if (j !== "FLAT" && amount === 0) return;
    grandTotal += amount;
    detailRows += `
        <tr>
            <td style="text-align:center; padding: 8px 10px;">${counter}</td>
            <td style="padding: 8px 10px;">${labelMap[j] || j}</td>
            <td style="text-align:right; padding: 8px 10px; font-weight: 600;">${fmtRp(amount)}</td>
        </tr>`;
    counter++;
  });

  for (const [jenis, amount] of Object.entries(totalsPerJenis)) {
    if (!orderJenis.includes(jenis) && amount > 0) {
      grandTotal += amount;
      detailRows += `
            <tr>
                <td style="text-align:center; padding: 8px 10px;">${counter}</td>
                <td style="padding: 8px 10px;">${jenis} (Perincian Terlampir)</td>
                <td style="text-align:right; padding: 8px 10px; font-weight: 600;">${fmtRp(amount)}</td>
            </tr>`;
      counter++;
    }
  }

  const kodePel = pData?.kode || generateKodePelanggan(pel);
  const invNumber = await getInvoiceStableNumber(kodePel, bln);
  const tglCetak = new Date()
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
  const direktur = pengaturan.direktur || "Bagus Riadi Kurniawan";
  const alamat = pData?.alamat || "";
  const kota = pData?.kota || "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Invoice ${pel} - ${bln}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            margin: 20px 25px;
            color: #1e293b;
            font-size: 14px;
            background: #fff;
        }
        @media print {
            body { margin: 10mm 15mm; }
            @page { margin: 10mm; }
        }
        .divider { border-top: 2px solid #1e3a5f; margin: 10px 0; }
        .divider-double { border-top: 3px double #1e3a5f; margin: 14px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .info-table td { padding: 5px 0; vertical-align: top; }
        .info-table .label-col { width: 170px; font-weight: 700; color: #1e3a5f; }
        h1 {
            text-align: center;
            font-size: 22px;
            color: #1e3a5f;
            margin: 10px 0;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .detail-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            border: 1.5px solid #334155;
        }
        .detail-table thead th {
            background: #1e3a5f;
            color: white;
            padding: 9px 10px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #334155;
        }
        .detail-table tbody td {
            border: 1px solid #cbd5e1;
            font-size: 13px;
        }
        .detail-table tbody tr:nth-child(even) { background: #f8fafc; }
        .total-row td {
            font-size: 16px;
            font-weight: 800;
            padding: 10px;
        }
        .footer-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 20px;
        }
        .payment-info {
            width: 48%;
            font-size: 13px;
        }
        .payment-info p {
            margin: 4px 0;
        }
        .signature {
            width: 48%;
            text-align: right;
        }
        .signature-box {
            display: inline-block;
            text-align: center;
            min-width: 200px;
        }
        .signature-line { border-top: 1px solid #000; margin: 60px 0 5px 0; }
        .signature-name { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
        .signature-title { font-size: 12px; color: #64748b; }
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
    <div class="divider-double"></div>
    <h3 style="font-size:15px; margin:10px 0; color:#1e3a5f;">ATTENTION TO</h3>
    <table class="info-table">
        <tr><td class="label-col">CUSTOMER NAME</td><td>: &nbsp; <strong>${pel}</strong></td></tr>
        ${alamat ? `<tr><td class="label-col">ADDRESS</td><td>: &nbsp; ${alamat}</td></tr>` : ""}
        ${kota ? `<tr><td class="label-col">CITY</td><td>: &nbsp; ${kota}</td></tr>` : ""}
    </table>
    <div class="divider-double"></div>
    <h3 style="font-size:15px; margin:10px 0; color:#1e3a5f;">DETAIL INVOICE</h3>
    <table class="detail-table">
        <thead>
            <tr><th style="width:40px;">NO</th><th>DESCRIPTION</th><th style="width:170px;">TOTAL AMOUNT</th></tr>
        </thead>
        <tbody>${detailRows}</tbody>
        <tfoot>
            <tr class="total-row" style="background:#e2e8f0;">
                <td colspan="2" style="text-align:right; font-size:15px;">TOTAL &nbsp; :</td>
                <td style="text-align:right; font-size:16px;">${fmtRp(grandTotal)}</td>
            </tr>
        </tfoot>
    </table>
    <div class="divider-double"></div>
    <p style="margin:12px 0; font-size:14px;">
        <strong>TERBILANG :</strong> &nbsp; ===== ${terbilang(grandTotal)} rupiah. - =====
    </p>
    <div class="divider-double"></div>

    <div class="footer-row">
        <div class="payment-info">
            <p><strong>PAYMENT INFORMATION</strong></p>
            <p>Bank Name: ${pengaturan.bank || "-"}</p>
            <p>Account Name: ${pengaturan.rekeningName || "-"}</p>
            <p>Account Number: ${pengaturan.rekeningNo || "-"}</p>
        </div>
        <div class="signature">
            <div class="signature-box">
                <p style="margin-bottom:5px;">Mengetahui,</p>
                <div class="signature-line"></div>
                <p class="signature-name">${direktur}</p>
                <p class="signature-title">Direktur</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function namaPeriode(bln) {
  const [y, m] = bln.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 2).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" },
  );
}

// ==================== KUITANSI ====================
async function generateKuitansi() {
  const pel = document.getElementById("kuitansiPelangganSelect").value;
  const bln = document.getElementById("kuitansiBulanSelect").value;
  if (!bln) {
    toast("Pilih bulan!", "warning");
    return;
  }
  loadingThen("Menyiapkan Kuitansi", async () => {
    const logoUrl = await getLogoFromIndexedDB();
    const html = await buildKuitansiHTML(pel, bln, logoUrl);
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast("Popup diblokir!", "warning");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
      setTimeout(function () {
        printWindow.close();
      }, 2000);
    };
  });
}

async function downloadKuitansi() {
  const pel = document.getElementById("kuitansiPelangganSelect").value;
  const bln = document.getElementById("kuitansiBulanSelect").value;
  if (!bln) {
    toast("Pilih bulan!", "warning");
    return;
  }
  loadingThen("Menyiapkan download Kuitansi", async () => {
    const logoUrl = await getLogoFromIndexedDB();
    const html = await buildKuitansiHTML(pel, bln, logoUrl);
    downloadFile(html, `Kuitansi_${pel.replace(/\\s/g, "_")}_${bln}.html`);
  });
}

async function buildKuitansiHTML(pel, bln, logoUrl) {
  const kopHTML = await generateKopHTML();
  const kop = JSON.parse(localStorage.getItem("DB_KOP")) || {};
  const pengaturan = JSON.parse(localStorage.getItem("DB_PENGATURAN")) || {};
  const dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
  const semua = dbNota.filter(
    (n) => n.pelanggan === pel && n.tanggal.startsWith(bln),
  );
  const pData = pelangganList.find((p) => p.name === pel);

  if (!pData) return '<p style="color:red;">Pelanggan tidak ditemukan.</p>';

  const isFlatCustomer =
    pData.type === "HOTEL" && pData.billingSystem === "FLAT";
  const flatRate = isFlatCustomer ? pData.flatRate || 0 : 0;
  const totalsPerJenis = {};
  semua.forEach((nota) => {
    const j = nota.jenis;
    if (!totalsPerJenis[j]) totalsPerJenis[j] = 0;
    if (isFlatCustomer && j === "FLAT") {
    } else {
      totalsPerJenis[j] += nota.total || 0;
    }
  });

  let totalTagihan = 0;
  if (isFlatCustomer) {
    totalTagihan = flatRate;
    for (const [j, v] of Object.entries(totalsPerJenis)) {
      if (j !== "FLAT") totalTagihan += v;
    }
  } else {
    totalTagihan = Object.values(totalsPerJenis).reduce((a, b) => a + b, 0);
  }
  totalTagihan = Math.floor(totalTagihan);

  const kode = pData.kode || generateKodePelanggan(pData.name);
  const nomorKwitansi = await getInvoiceStableNumber(kode, bln);
  const tglCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const [tahunStr, bulanStr] = bln.split("-");
  const bulanNum = parseInt(bulanStr, 10);
  const namaBulan = new Date(
    parseInt(tahunStr, 10),
    bulanNum - 1,
    1,
  ).toLocaleDateString("id-ID", { month: "long" });

  const terbilangText = terbilang(totalTagihan);
  const terbilangCaps =
    terbilangText.charAt(0).toUpperCase() +
    terbilangText.slice(1) +
    " rupiah.-";
  const direktur = pengaturan.direktur || "Bagus Riadi Kurniawan";
  const bankName = pengaturan.bank || "";
  const bankAccName = pengaturan.rekeningName || "";
  const bankAccNo = pengaturan.rekeningNo || "";

  let deskripsi = "";
  if (pData.type === "RS") {
    const totalKg = semua.reduce(
      (s, n) =>
        s +
        (n.items?.reduce((a, it) => a + (it.unit === "KG" ? it.qty : 0), 0) ||
          0),
      0,
    );
    const tarifRS = pData.tarifRS || 0;
    const tglArr = semua.map((n) => n.tanggal).sort();
    const tglAwal = tglArr[0] || "";
    const tglAkhir = tglArr[tglArr.length - 1] || "";
    const fmtTgl = (t) => {
      const d = new Date(t + "T00:00:00");
      const blnNama = d.toLocaleDateString("id-ID", { month: "long" });
      return `${d.getDate()} ${blnNama} ${d.getFullYear()}`;
    };
    deskripsi = `Biaya Cuci Linen mulai tgl. ${fmtTgl(tglAwal)} - ${fmtTgl(tglAkhir)} = ${totalKg.toFixed(0)} kg @ Rp.${tarifRS.toLocaleString("id-ID")},- (Perincian terlampir)`;
  } else if (isFlatCustomer) {
    deskripsi = `Biaya Cuci Linen Bulan ${namaBulan} ${tahunStr}`;
  } else {
    deskripsi = `Biaya Cuci Linen Bulan ${namaBulan} ${tahunStr} (Perincian Terlampir)`;
  }

  // Margin kecil untuk cetak dua kuitansi
  const widthMM = 215.9;
  const heightMM = 355.6;
  const marginAtas = 5;
  const marginKiri = 5;

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kwitansi - ${pel} - ${bln}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            color: #1e293b;
            font-size: 12px;
            background: #fff;
            width: ${widthMM}mm;
            min-height: ${heightMM}mm;
            padding: ${marginAtas}mm ${marginKiri}mm;
            margin: 0;
        }
        @page { size: legal portrait; margin: 0; }
        @media print {
            body {
                width: 100%;
                min-height: auto;
                padding: ${marginAtas}mm ${marginKiri}mm;
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        .divider { border-top: 1px dashed #999; margin: 10px 0; }
        .kwitansi-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .kwitansi-table td { padding: 4px 2px; vertical-align: top; font-size: 12px; }
        .kwitansi-table .label-kolom { width: 135px; font-weight: 600; color: #1e3a5f; white-space: nowrap; }
        .jumlah-box {
            border: 2px solid #334155;
            padding: 8px 10px;
            margin: 8px 0;
            background: #fafbfc;
            border-radius: 4px;
            text-align: left;
            font-size: 14px;
            font-weight: 700;
        }
        .footer-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 15px;
        }
        .payment-info {
            width: 48%;
            font-size: 11px;
        }
        .payment-info p {
            margin: 2px 0;
        }
        .signature {
            width: 48%;
            text-align: right;
        }
        .signature-box { display: inline-block; text-align: center; min-width: 170px; }
        .signature-line { border-top: 1px solid #000; margin: 50px 0 5px 0; }
        .signature-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
        .signature-title { font-size: 11px; color: #64748b; }
        .payment-info-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        .payment-info-table td { padding: 1px 0; }
    </style>
</head>
<body>
    ${kopHTML}
    <table class="kwitansi-table">
        <tr><td class="label-kolom">KWITANSI No.</td><td>: &nbsp; <strong>${nomorKwitansi}</strong></td></tr>
        <tr><td colspan="2" style="height:4px;"></td></tr>
        <tr><td class="label-kolom">TERIMA DARI</td><td>: &nbsp; <strong>${pel}</strong></td></tr>
        <tr><td colspan="2" style="height:4px;"></td></tr>
        <tr><td class="label-kolom">SEBESAR</td><td>: &nbsp; <strong>${terbilangCaps}</strong></td></tr>
        <tr><td colspan="2" style="height:6px;"></td></tr>
        <tr><td class="label-kolom">UNTUK PEMBAYARAN</td><td>: &nbsp; ${deskripsi}</td></tr>
    </table>
    <div class="jumlah-box">TERBILANG : Rp ${totalTagihan.toLocaleString("id-ID")},-</div>
    <div class="divider"></div>

    <div class="footer-row">
        <div class="payment-info">
            ${
              bankName
                ? `
            <p><strong>Payment Transfer to :</strong></p>
            <table class="payment-info-table">
                <tr><td>Bank Name</td><td>: ${bankName}</td></tr>
                <tr><td>Account Name</td><td>: ${bankAccName}</td></tr>
                <tr><td>Account Number</td><td>: ${bankAccNo}</td></tr>
            </table>`
                : ""
            }
        </div>
        <div class="signature">
            <div class="signature-box">
                <p style="margin-bottom:3px; font-size:11px;">Surabaya, ${tglCetak}</p>
                <div class="signature-line"></div>
                <p class="signature-name">${direktur}</p>
                <p class="signature-title">Direktur</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ==================== SLIP GAJI ====================
async function viewSlipGaji(kId, mulai, selesai) {
  loadingThen("Menyiapkan Slip Gaji", async () => {
    const logoUrl = await getLogoFromIndexedDB();
    const html = await buildSlipGajiHTML(kId, mulai, selesai, logoUrl);
    if (!html) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast("Popup diblokir!", "warning");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
      setTimeout(function () {
        printWindow.close();
      }, 2000);
    };
  });
}

async function downloadSlipGaji(kId, mulai, selesai) {
  loadingThen("Menyiapkan download Slip Gaji", async () => {
    const logoUrl = await getLogoFromIndexedDB();
    const html = await buildSlipGajiHTML(kId, mulai, selesai, logoUrl);
    if (!html) return;
    const h = _hasilGaji.find((h) => h.karyawan.id == kId);
    if (!h) return;
    const namaFile = `Slip_Gaji_${h.karyawan.nama.replace(/\\s/g, "_")}_${mulai}_${selesai}.html`;
    downloadFile(html, namaFile);
  });
}

async function buildSlipGajiHTML(kId, mulai, selesai, logoUrl) {
  const h = _hasilGaji.find((h) => h.karyawan.id == kId);
  if (!h) return null;
  const k = h.karyawan;
  const kopHTML = await generateKopHTML();
  let slipHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Slip Gaji ${k.nama}</title>
    <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:20px;} table{width:100%;border-collapse:collapse;} th{background:#1e3a5f;color:white;padding:8px;} td{padding:8px;border-bottom:1px solid #ddd;} @media print{body{margin:0;padding:10px;}}</style></head><body>
    ${kopHTML}
    <h2>SLIP UPAH KARYAWAN</h2>
    <p>Nama: ${k.nama} | Bagian: ${k.bagian || "-"} | Periode: ${mulai} s/d ${selesai}</p>
    <table>
        <tr><td>Upah Kerja</td><td>${fmtRp(h.totalUpah)}</td></tr>
        <tr><td>Insentif</td><td>${fmtRp(h.insentif)}</td></tr>
        <tr><td>Lembur</td><td>${fmtRp(h.lembur)}</td></tr>
        <tr><td>Potongan</td><td>${fmtRp(h.potongan)}</td></tr>
        <tr style="font-weight:700;"><td>Total Diterima</td><td>${fmtRp(h.totalDiterima)}</td></tr>
    </table>
    <p>Terbilang: ${terbilang(h.totalDiterima)} rupiah</p>
    <div class="page-break"></div>
    <h3>REKAPITULASI HARIAN</h3>
    <table><tr><th>Tanggal</th><th>Status</th><th>Kg</th><th>Ongkos</th><th>Hadir</th><th>Upah</th></tr>
    ${h.rincian.map((r) => `<tr><td>${r.tanggal}</td><td>${r.status}</td><td>${r.kg.toFixed(1)}</td><td>${fmtRp(r.ongkos)}</td><td>${r.hadir}</td><td>${fmtRp(r.upah)}</td></tr>`).join("")}
    </table></body></html>`;
  return slipHTML;
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast("Dokumen diunduh.", "info", 2000);
}

// ==================== KEUANGAN ====================
async function hitungMenejemenKeuangan() {
  showLoading("Menghitung keuangan...");
  try {
    const { data: dbNota, error: notaError } = await db.from("nota").select("*");
    if (notaError) { console.error("Gagal mengambil nota:", notaError); return; }

    const filterMulai = document.getElementById("filterExpMulai")?.value;
    const filterSelesai = document.getElementById("filterExpSelesai")?.value;

    let biayaQuery = db.from("biaya").select("*");
    if (filterMulai) biayaQuery = biayaQuery.gte("tanggal", filterMulai);
    if (filterSelesai) biayaQuery = biayaQuery.lte("tanggal", filterSelesai);

    const { data: dbBiaya, error: biayaError } = await biayaQuery;
    if (biayaError) { console.error("Gagal mengambil biaya:", biayaError); return; }

    const { data: paymentStatusData, error: payError } = await db.from("payment_status").select("*");
    if (payError) { console.error("Gagal mengambil payment status:", payError); return; }

    const paymentStatus = {};
    paymentStatusData.forEach((ps) => { paymentStatus[ps.key] = ps.is_paid; });
    const isLunas = (nama, bln) => paymentStatus[getLockKey(nama, bln)] === true;

    const totalInvoiceOf = (pData, bln, arrNota) => {
      if (!pData) return 0;
      const isFlat = pData.type === "HOTEL" && pData.billingSystem === "FLAT";
      let total = 0;
      arrNota.filter((n) => n.pelanggan_id === pData.id && n.tanggal.startsWith(bln)).forEach((nota) => {
        if (isFlat && (nota.jenis === "FLAT" || nota.jenis === "FLAT ASLI")) return;
        total += nota.total || 0;
      });
      if (isFlat) total += pData.flatRate || 0;
      return total;
    };

    const bulanSet = new Set();
    dbNota.forEach((nota) => { if (nota.tanggal) bulanSet.add(nota.tanggal.substring(0, 7)); });

    let totalPendapatan = 0, pendapatanLunas = 0;
    pelangganList.forEach((p) => {
      bulanSet.forEach((bln) => {
        const tagihan = totalInvoiceOf(p, bln, dbNota);
        if (tagihan > 0) { totalPendapatan += tagihan; if (isLunas(p.name, bln)) pendapatanLunas += tagihan; }
      });
    });
    const penjualan = totalPendapatan;
    const biayaFiltered = dbBiaya || [];
    const sumByKat = (kat) => biayaFiltered.filter((b) => b.kategori === kat).reduce((s, b) => s + (b.nominal || 0), 0);

    const hpp = {
      gajiKaryawan: sumByKat("GAJI BORONGAN"), listrik: sumByKat("LISTRIK 1") + sumByKat("LISTRIK 2"), gas: sumByKat("GAS"), air: sumByKat("AIR"), chemical: sumByKat("CHEMICAL"), bbm: sumByKat("BBM"), plastik: sumByKat("PLASTIK"), pph: sumByKat("PPH PS 23"),
    };
    const totalHPP = Object.values(hpp).reduce((a, b) => a + b, 0);

    const biayaAdm = {
      gajiTetap: sumByKat("GAJI TETAP"), makan: sumByKat("MAKAN"), perawatanMesin: sumByKat("PERAWATAN MESIN"), iuranSampah: sumByKat("IURAN SAMPAH"), iuranRT: sumByKat("IURAN RT"), lainLain: sumByKat("LAIN-LAIN"),
    };
    const totalAdm = Object.values(biayaAdm).reduce((a, b) => a + b, 0);
    const labaBersih = penjualan - totalHPP - totalAdm;

    let piutang = 0;
    pelangganList.forEach((p) => {
      bulanSet.forEach((bln) => {
        const tagihan = totalInvoiceOf(p, bln, dbNota);
        if (tagihan > 0 && !isLunas(p.name, bln)) { piutang += tagihan; }
      });
    });

    let utang = biayaFiltered.filter((b) => !b.lunas).reduce((s, b) => s + b.nominal, 0);
    if (typeof getUtangList === "function") {
      utang += getUtangList().filter((u) => u.status === "AKTIF").reduce((s, u) => s + u.sisaBulan * u.cicilan, 0);
    }

    const biayaDibayar = biayaFiltered.filter((b) => b.lunas).reduce((s, b) => s + b.nominal, 0);
    const kas = pendapatanLunas - biayaDibayar;
    const peralatan = parseCurrencyValue(document.getElementById("settingPeralatan")?.value) || pengaturan.peralatan || 0;
    const modal = kas + piutang + peralatan - utang;

    document.getElementById("boxTotalOmset").innerText = fmtRp(penjualan); document.getElementById("boxTotalHPP").innerText = fmtRp(totalHPP); document.getElementById("boxTotalAdm").innerText = fmtRp(totalAdm); document.getElementById("boxLabaBersih").innerText = fmtRp(labaBersih); document.getElementById("boxPiutang").innerText = fmtRp(piutang); document.getElementById("boxTotalUtang").innerText = fmtRp(utang); document.getElementById("boxKas").innerText = fmtRp(kas); document.getElementById("boxModal").innerText = fmtRp(modal);

    const tbody = document.getElementById("tabelRiwayatPengeluaran");
    if (!tbody) return;
    if (biayaFiltered.length === 0) {
      const hasFilter = document.getElementById("filterExpMulai")?.value || document.getElementById("filterExpSelesai")?.value || document.getElementById("filterExpKat")?.value;
      const hint = hasFilter ? "Tidak ada pengeluaran cocok dengan filter. <button class=\"btn-link\" onclick=\"resetFilterExp()\">Reset filter</button>" : "Belum ada pengeluaran tercatat. Catat pengeluaran baru di atas.";
      tbody.innerHTML = emptyRowHTML(5, hint, "info");
    } else {
      tbody.innerHTML = biayaFiltered.map((b) => {
        const status = b.lunas ? '<span class="badge-status status-paid">LUNAS</span>' : '<span class="badge-status status-unpaid">BELUM LUNAS</span>';
        const btnLunas = b.lunas ? "" : `<button class="btn-sm btn-success" onclick="tandaiLunasBiaya(${b.id})">Tandai Lunas</button>`;
        return `<tr>
          <td data-label="Tanggal">${b.tanggal}</td>
          <td data-label="Kategori">${b.kategori}</td>
          <td data-label="Nominal">${fmtRp(b.nominal)}</td>
          <td data-label="Status">${status}</td>
          <td data-label="Aksi" data-full-width style="white-space:nowrap;"><button class="btn-sm btn-primary" onclick="bukaEditBiaya(${b.id})">Edit</button> <button class="btn-sm btn-danger" onclick="hapusBiaya(${b.id})">Hapus</button> ${btnLunas}</td>
        </tr>`;
      }).join("");
    }
  } catch (err) { console.error("Gagal menghitung keuangan:", err); toast("Gagal menghitung keuangan. Periksa koneksi.", "error"); }
  finally { hideLoading(); }
}

async function tampilkanLaporan() {
  const container = document.getElementById("laporanContainer");
  if (!container) return;
  await hitungMenejemenKeuangan();
  const penjualan = parseCurrencyValue(document.getElementById("boxTotalOmset").innerText);
  const totalHPP = parseCurrencyValue(document.getElementById("boxTotalHPP").innerText);
  const totalAdm = parseCurrencyValue(document.getElementById("boxTotalAdm").innerText);
  const labaBersih = parseCurrencyValue(document.getElementById("boxLabaBersih").innerText);
  const piutang = parseCurrencyValue(document.getElementById("boxPiutang").innerText);
  const utang = parseCurrencyValue(document.getElementById("boxTotalUtang").innerText);
  const kas = parseCurrencyValue(document.getElementById("boxKas").innerText);
  const modal = parseCurrencyValue(document.getElementById("boxModal").innerText);
  const peralatan = pengaturan.peralatan || 0;

  container.innerHTML = `
        <div class="card" style="margin-top:20px;">
            <div class="card-title">📊 Laporan Laba Rugi</div>
            <table class="linen-table">
                <tr><td colspan="3"><strong>1. PENJUALAN</strong></td></tr>
                <tr><td style="padding-left:20px;">Penjualan Jasa</td><td></td><td style="text-align:right;">${fmtRp(penjualan)}</td></tr>
                <tr><td colspan="3"><strong>2. HARGA POKOK PENJUALAN (HPP)</strong></td></tr>
                <tr><td style="padding-left:20px;">Total HPP</td><td></td><td style="text-align:right;">${fmtRp(totalHPP)}</td></tr>
                <tr style="font-weight:700; background:#f0f0f0;"><td>LABA KOTOR</td><td></td><td style="text-align:right;">${fmtRp(penjualan - totalHPP)}</td></tr>
                <tr><td colspan="3"><strong>3. BIAYA ADMINISTRASI & UMUM</strong></td></tr>
                <tr><td style="padding-left:20px;">Total Biaya Administrasi & Umum</td><td></td><td style="text-align:right;">${fmtRp(totalAdm)}</td></tr>
                <tr style="font-weight:700; background:#e0f0e0;"><td>LABA BERSIH</td><td></td><td style="text-align:right;">${fmtRp(labaBersih)}</td></tr>
            </table>
        </div>
        <div class="card" style="margin-top:20px;">
            <div class="card-title">⚖️ Neraca</div>
            <table class="linen-table">
                <tr style="background:#e2e8f0;"><td colspan="2"><strong>ASET (Harta)</strong></td></tr>
                <tr><td style="padding-left:20px;">Kas / Bank</td><td style="text-align:right;">${fmtRp(kas)}</td></tr>
                <tr><td style="padding-left:20px;">Piutang Usaha</td><td style="text-align:right;">${fmtRp(piutang)}</td></tr>
                <tr><td style="padding-left:20px;">Peralatan</td><td style="text-align:right;">${fmtRp(peralatan)}</td></tr>
                <tr style="font-weight:700;"><td>Total Aset</td><td style="text-align:right;">${fmtRp(kas + piutang + peralatan)}</td></tr>
                <tr style="background:#e2e8f0;"><td colspan="2"><strong>KEWAJIBAN (Utang)</strong></td></tr>
                <tr><td style="padding-left:20px;">Utang Usaha</td><td style="text-align:right;">${fmtRp(utang)}</td></tr>
                <tr style="background:#e2e8f0;"><td colspan="2"><strong>MODAL</strong></td></tr>
                <tr style="font-weight:700;"><td>Modal Bersih</td><td style="text-align:right;">${fmtRp(modal)}</td></tr>
                <tr style="background:#f8fafc;"><td colspan="2"><small>Aset = Kewajiban + Modal</small></td></tr>
            </table>
        </div>
    `;
}

async function cetakLaporan() {
  await tampilkanLaporan();
  const konten = document.getElementById("laporanContainer").innerHTML;
  const printWindow = window.open("", "_blank", "width=900,height=700");
  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laporan Keuangan</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ccc; padding: 6px; }
                th { background: #1e3a5f; color: white; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h2 style="text-align:center;">Laporan Keuangan</h2>
            ${konten}
        </body>
        </html>
    `);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}

async function simpanBiayaOperasional() {
  const btn = document.getElementById('btnSimpanBiaya');
  setBtnLoading(btn, true);
  try {
    const tgl = document.getElementById("expTanggal").value;
    const kat = document.getElementById("expKategori").value === "LAIN-LAIN" ? document.getElementById("expKategoriCustom").value.toUpperCase() : document.getElementById("expKategori").value;
    const nominal = parseCurrencyValue(document.getElementById("expNominal").value);
    const lunas = document.getElementById("expLunas").checked;
    if (!tgl || !kat || nominal <= 0) { toast("Data tidak lengkap!", "warning"); return; }
    const { error } = await db.from("biaya").insert([{ tanggal: tgl, kategori: kat, nominal, lunas }]);
    if (error) { console.error("Gagal menyimpan biaya:", error); toast("Gagal menyimpan biaya.", "error"); return; }
    document.getElementById("expNominal").value = ""; toast("Biaya disimpan!", "success");
    await hitungMenejemenKeuangan();
  } finally {
    setBtnLoading(btn, false);
  }
}

/* resetFilterExp() — kompatibilitas: reset semua field filter pengeluaran */
async function resetFilterExp() {
  ["filterExpMulai", "filterExpSelesai", "filterExpKat"].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
  updateFilterExpClearBtns();
  await hitungMenejemenKeuangan();
}
function toggleCustomExpenseInput() { document.getElementById("groupCustomExpense").style.display = document.getElementById("expKategori").value === "LAIN-LAIN" ? "block" : "none"; }

async function bukaEditBiaya(id) {
  const { data } = await db.from("biaya").select("*").eq("id", id);
  const b = data?.[0];
  if (!b) return;
  document.getElementById("editBiayaId").value = id;
  document.getElementById("editBiayaTanggal").value = b.tanggal;
  document.getElementById("editBiayaNominal").value = b.nominal.toLocaleString("id-ID");
  document.getElementById("editBiayaKategori").value = b.kategori;
  document.getElementById("editBiayaModal").style.display = "flex";
}
function toggleEditCustomBiaya() { document.getElementById("editGroupCustomBiaya").style.display = document.getElementById("editBiayaKategori").value === "LAIN-LAIN" ? "block" : "none"; }

async function simpanEditBiaya() {
  const btn = document.getElementById('btnSimpanEditBiaya');
  setBtnLoading(btn, true);
  try {
    const id = parseInt(document.getElementById("editBiayaId").value);
    const tanggal = document.getElementById("editBiayaTanggal").value;
    const nominal = parseCurrencyValue(document.getElementById("editBiayaNominal").value);
    const kategori = document.getElementById("editBiayaKategori").value === "LAIN-LAIN" ? document.getElementById("editBiayaCustomText").value.toUpperCase() : document.getElementById("editBiayaKategori").value;
    const { error } = await db.from("biaya").update({ tanggal, kategori, nominal }).eq("id", id);
    if (error) { console.error("Gagal mengupdate biaya:", error); toast("Gagal mengupdate biaya.", "error"); return; }
    tutupModalEditBiaya(); toast("Pengeluaran diupdate!", "success"); await hitungMenejemenKeuangan();
  } finally {
    setBtnLoading(btn, false);
  }
}

function tutupModalEditBiaya() { document.getElementById("editBiayaModal").style.display = "none"; }

async function hapusBiaya(id) {
  if (!await window.customConfirm("Hapus pengeluaran ini?")) return;
  const { error } = await db.from("biaya").delete().eq("id", id);
  if (error) { console.error("Gagal menghapus biaya:", error); toast("Gagal menghapus biaya.", "error"); return; }
  toast("Pengeluaran dihapus.", "success"); await hitungMenejemenKeuangan();
}
async function tandaiLunasBiaya(id) {
  const { error } = await db.from("biaya").update({ lunas: true }).eq("id", id);
  if (error) { console.error("Gagal menandai lunas:", error); toast("Gagal menandai lunas.", "error"); return; }
  toast("Biaya ditandai lunas."); await hitungMenejemenKeuangan();
}

function bukaModalDetail(id) {
  const nota = (JSON.parse(localStorage.getItem("DB_NOTA") || "[]")).find((n) => n.id === id);
  if (!nota) return;
  document.getElementById("modalNotaTitle").innerText = `Detail Nota: ${nota.notaId}`;
  document.getElementById("modalNotaMeta").innerHTML = `<strong>Pelanggan:</strong> ${nota.pelanggan} | <strong>Tanggal:</strong> ${nota.tanggal} | <strong>Layanan:</strong> ${nota.jenis}`;
  const tbody = document.getElementById("modalLinenBody");
  tbody.innerHTML = nota.items.map((it) => `<tr><td>${it.name}</td><td style="text-align:center;">${it.qty} ${it.unit}</td><td>${fmtRp(it.subtotal)}</td></tr>`).join("");
  tbody.innerHTML += `<tr style="background:#f8fafc;font-weight:700;"><td colspan="2">TOTAL</td><td>${fmtRp(nota.total)}</td></tr>`;
  document.getElementById("detailModal").style.display = "flex";
}

function tutupModalDetail() { document.getElementById("detailModal").style.display = "none"; }

function onEditJenisChange() {
  const id = parseInt(document.getElementById("editNotaTargetId").value);
  const nota = (JSON.parse(localStorage.getItem("DB_NOTA") || "[]")).find((n) => n.id === id);
  if (!nota) return;
  const pData = pelangganList.find((p) => p.name === nota.pelanggan);
  if (pData && pData.type === "RS") return;

  // Re-render daftar linen (filter irisan + legacy highlight)
  renderEditLinenList(nota, pData);

  // Re-bind event listeners
  document.querySelectorAll(".modal-edit-qty").forEach((inp) => { inp.addEventListener("input", hitungTotalEditPreview); });
  hitungTotalEditPreview();
}

async function simpanPerubahanQtyNota() {
  const btn = document.getElementById('btnSimpanEditNota');
  setBtnLoading(btn, true);
  try {
    const id = parseInt(document.getElementById("editNotaTargetId").value);
    const { data: notaList, error: fetchError } = await db.from("nota").select("*").eq("id", id);
    if (fetchError || !notaList || notaList.length === 0) { toast("Nota tidak ditemukan!", "error"); return; }
    const nota = notaList[0];
    const pData = pelangganList.find((p) => p.id === nota.pelanggan_id);
    if (!pData) { toast("Data pelanggan tidak ditemukan!", "error"); return; }
    nota.jenis = document.getElementById("editNotaJenisSelect").value;
    const jData = jenisNotaList.find((j) => j.name === nota.jenis);
    const mult = jData ? jData.multiplier : 1;
    let total = 0;
    if (pData.type === "HOTEL" && pData.billingSystem === "FLAT" && nota.jenis === "FLAT") {
      const items = [];
      document.querySelectorAll(".modal-edit-qty").forEach((inp) => {
        const qty = parseInt(inp.value) || 0;
        if (qty > 0) {
          const mid = parseInt(inp.getAttribute("data-masterid"));
          items.push({ idMaster: mid, name: masterLinen.find((m) => m.id === mid)?.name || "", qty, unit: "Pcs", basePrice: 0, subtotal: 0 });
        }
      });
      nota.items = items; total = 0;
    } else if (pData.type === "RS") {
      const kg = parseFloat(document.querySelector(".modal-edit-qty")?.value) || 0;
      if (kg <= 0) { toast("Berat harus lebih dari 0 KG!", "warning"); return; }
      total = Math.floor(kg * pData.tarifRS);
      nota.items = [{ idMaster: 0, name: "Cucian RS", qty: kg, unit: "KG", basePrice: pData.tarifRS, subtotal: total }];
    } else {
      const items = [];
      let hasNegative = false;
      document.querySelectorAll(".modal-edit-qty").forEach((inp) => {
        const qty = parseInt(inp.value) || 0;
        if (qty < 0) hasNegative = true;
        if (qty > 0) {
          const mid = parseInt(inp.getAttribute("data-masterid"));
          const price = getHargaPerPelanggan(pData.id, mid, mult);
          const sub = Math.floor(qty * price); total += sub;
          items.push({ idMaster: mid, name: masterLinen.find((m) => m.id === mid)?.name || "", qty, unit: "Pcs", basePrice: price, subtotal: sub });
        }
      });
      if (hasNegative) { toast("Jumlah item tidak boleh negatif!", "warning"); return; }
      if (items.length === 0) { toast("Masukkan minimal satu item!", "warning"); return; }
      nota.items = items;
    }
    nota.total = total;
    const { error: updateError } = await db.from("nota").update({ jenis: nota.jenis, total: nota.total, items: nota.items }).eq("id", id);
    if (updateError) { console.error("Gagal mengupdate nota:", updateError); toast("Gagal mengupdate nota.", "error"); return; }
    toast("Nota diupdate!", "success"); tutupModalEdit();
    await refreshDataSistem(); // FIX: Sinkronisasi data ke localStorage setelah edit
    await cariNotaSistem(); await hitungMenejemenKeuangan();
  } finally {
    setBtnLoading(btn, false);
  }
}

async function hitungTotalEditPreview() {
  const id = parseInt(document.getElementById("editNotaTargetId").value);
  const { data: notaList } = await db.from("nota").select("pelanggan_id").eq("id", id);
  if (!notaList || notaList.length === 0) return;
  const pData = pelangganList.find((p) => p.id === notaList[0].pelanggan_id);
  if (!pData) return;
  const jenis = document.getElementById("editNotaJenisSelect").value;
  const jData = jenisNotaList.find((j) => j.name === jenis);
  const mult = jData ? jData.multiplier : 1;
  let total = 0;
  if (pData.type === "HOTEL" && pData.billingSystem === "FLAT" && jenis === "FLAT") { total = 0; }
  else if (pData.type === "RS") { const kg = parseFloat(document.querySelector(".modal-edit-qty")?.value) || 0; total = Math.floor(kg * (pData.tarifRS || 0)); }
  else {
    document.querySelectorAll(".modal-edit-qty").forEach((inp) => {
      const qty = parseInt(inp.value) || 0;
      if (qty > 0) { const mid = parseInt(inp.getAttribute("data-masterid")); const price = getHargaPerPelanggan(pData.id, mid, mult); total += Math.floor(qty * price); }
    });
  }
  document.getElementById("editNotaTotalPreview").innerText = "Total: " + fmtRp(total);
}
function tutupModalEdit() { document.getElementById("editLinenModal").style.display = "none"; }

function renderMasterLinenTable() {
  const tbody = document.getElementById("tabelMasterLinen"); if (!tbody) return;
  if (!masterLinen.length) { tbody.innerHTML = emptyRowHTML(3, "Belum ada master linen. Tambahkan linen baru di atas."); return; }
  tbody.innerHTML = masterLinen.map((m, i) => `<tr><td>${i + 1}</td><td><input type="text" id="linenName-${m.id}" value="${m.name}" style="width:100%;padding:6px;"></td><td style="text-align:center;white-space:nowrap;"><button class="btn btn-primary btn-sm" onclick="updateLinen(${m.id})">Update</button> <button class="btn btn-danger btn-sm" onclick="hapusLinen(${m.id})">Hapus</button></td></tr>`).join("");
}

function renderMasterJenisNotaTable() {
  const tbody = document.getElementById("tabelMasterJenisNota"); if (!tbody) return;
  if (!jenisNotaList.length) { tbody.innerHTML = emptyRowHTML(4, "Belum ada jenis nota. Tambahkan jenis nota baru di atas."); return; }
  tbody.innerHTML = jenisNotaList.map((j, idx) => `<tr><td><input type="text" id="jnName-${idx}" value="${j.name}" style="width:90px;padding:6px;"></td><td><select id="jnMult-${idx}" style="padding:6px;">${[1, 1.5, 2, 2.5, 3, 4].map((v) => `<option value="${v}" ${j.multiplier === v ? "selected" : ""}>${v}x</option>`).join("")}</select></td><td><select id="jnFor-${idx}" style="padding:6px;"><option value="both" ${j.forFlat && j.forReguler ? "selected" : ""}>Flat+Reg</option><option value="flat" ${j.forFlat && !j.forReguler ? "selected" : ""}>Flat</option><option value="reguler" ${!j.forFlat && j.forReguler ? "selected" : ""}>Reguler</option></select></td><td style="text-align:center;white-space:nowrap;"><button class="btn btn-primary btn-sm" onclick="updateMasterJenisNota(${idx})">Update</button> <button class="btn btn-danger btn-sm" onclick="deleteMasterJenisNota(${idx})">Hapus</button></td></tr>`).join("");
}

async function tambahLinen() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const name = document.getElementById("newLinenName").value.trim();
    if (!name) return toast("Nama linen wajib!", "warning");
    const { data, error } = await db.from("master_linen").insert([{ name }]).select();
    if (error) { console.error("Gagal menambah linen:", error); toast("Gagal menambah linen.", "error"); return; }
    masterLinen.push({ id: data[0].id, name: data[0].name });
    renderMasterLinenTable(); renderFormLinenInput(); document.getElementById("newLinenName").value = ""; toast("Linen ditambahkan.");
  } finally {
    setBtnLoading(btn, false);
  }
}

async function updateLinen(id) {
  const lin = masterLinen.find((m) => m.id === id); if (!lin) return;
  const newName = document.getElementById(`linenName-${id}`).value.trim();
  const { error } = await db.from("master_linen").update({ name: newName }).eq("id", id);
  if (error) { console.error("Gagal mengupdate linen:", error); toast("Gagal mengupdate linen.", "error"); return; }
  lin.name = newName; renderMasterLinenTable(); renderFormLinenInput(); toast("Linen diupdate.");
}

async function hapusLinen(id) {
  if (!await window.customConfirm("Hapus linen ini?")) return;
  const { error } = await db.from("master_linen").delete().eq("id", id);
  if (error) { console.error("Gagal menghapus linen:", error); toast("Gagal menghapus linen.", "error"); return; }
  masterLinen = masterLinen.filter((m) => m.id !== id); renderMasterLinenTable(); renderFormLinenInput(); toast("Linen dihapus.");
}

async function addMasterJenisNota() {
  const name = document.getElementById("newJenisNotaName").value.trim().toUpperCase();
  if (!name) return toast("Nama wajib!", "warning");
  const mult = parseFloat(document.getElementById("newJenisNotaMultiplier").value);
  const forVal = document.getElementById("newJenisNotaFor").value;
  const forFlat = forVal !== "reguler"; const forReguler = forVal !== "flat";
  const { data, error } = await db.from("jenis_nota").insert([{ name, multiplier: mult, for_flat: forFlat, for_reguler: forReguler }]).select();
  if (error) { console.error("Gagal menambah jenis nota:", error); toast("Gagal menambah jenis nota.", "error"); return; }
  const newJenis = data[0];
  jenisNotaList.push({ name: newJenis.name, multiplier: newJenis.multiplier, forFlat: newJenis.for_flat, forReguler: newJenis.for_reguler });
  renderMasterJenisNotaTable(); document.getElementById("newJenisNotaName").value = ""; toast("Jenis nota ditambahkan!", "success");
}

async function updateMasterJenisNota(idx) {
  const jenis = jenisNotaList[idx];
  const name = document.getElementById(`jnName-${idx}`).value.toUpperCase();
  const mult = parseFloat(document.getElementById(`jnMult-${idx}`).value);
  const forVal = document.getElementById(`jnFor-${idx}`).value;
  const { error } = await db.from("jenis_nota").update({ name, multiplier: mult, for_flat: forVal !== "reguler", for_reguler: forVal !== "flat" }).eq("name", jenis.name);
  if (error) { console.error("Gagal mengupdate jenis nota:", error); toast("Gagal mengupdate jenis nota.", "error"); return; }
  jenis.name = name; jenis.multiplier = mult; jenis.forFlat = forVal !== "reguler"; jenis.forReguler = forVal !== "flat";
  renderMasterJenisNotaTable(); renderJenisNotaDropdown(); renderFormLinenInput();
  toast("Jenis nota berhasil diupdate!", "success");
}

async function deleteMasterJenisNota(idx) {
  if (!await window.customConfirm("Hapus jenis nota ini?")) return;
  const jenis = jenisNotaList[idx];
  const { error } = await db.from("jenis_nota").delete().eq("name", jenis.name);
  if (error) { console.error("Gagal menghapus jenis nota:", error); toast("Gagal menghapus jenis nota.", "error"); return; }
  jenisNotaList.splice(idx, 1); renderMasterJenisNotaTable();
}

function bukaModalMasterLinen() { renderMasterLinenTable(); document.getElementById("modalMasterLinen").style.display = "flex"; }
function bukaModalMasterJenisNota() { renderMasterJenisNotaTable(); document.getElementById("modalMasterJenisNota").style.display = "flex"; }

// ==================== MODAL: ATUR LINEN PER JENIS NOTA ====================
function bukaModalAturLinen() {
  // Hanya admin yang boleh akses
  if (currentUserRole !== "admin") {
    toast("Akses ditolak. Fitur ini khusus Admin.", "error");
    return;
  }
  // Cek apakah ada master linen
  if (!masterLinen || masterLinen.length === 0) {
    toast("Belum ada master linen. Tambahkan linen terlebih dahulu.", "warning");
    return;
  }
  // Cek apakah ada jenis nota
  if (!jenisNotaList || jenisNotaList.length === 0) {
    toast("Belum ada jenis nota. Tambahkan jenis nota terlebih dahulu.", "warning");
    return;
  }

  // Populate dropdown jenis nota
  const sel = document.getElementById("aturLinenJenisSelect");
  sel.innerHTML = '<option value="">-- Pilih jenis nota --</option>' +
    jenisNotaList.map((j) => `<option value="${j.name}">${j.name} (${j.multiplier}x)${j.linenIds && j.linenIds.length ? ' • ' + j.linenIds.length + ' linen' : ''}</option>`).join("");
  sel.value = "";

  // Tampilkan info
  document.getElementById("aturLinenInfo").style.display = "block";

  // Reset state checkbox list
  document.getElementById("aturLinenCheckboxList").innerHTML = "";
  document.getElementById("aturLinenEmptyState").style.display = "none";
  document.getElementById("aturLinenCounter").innerText = "0 dari 0 linen dipilih";

  // Buka modal
  document.getElementById("modalAturLinenJenisNota").style.display = "flex";
}

function renderCheckboxLinen() {
  const jenisName = document.getElementById("aturLinenJenisSelect").value;
  const container = document.getElementById("aturLinenCheckboxList");
  const emptyState = document.getElementById("aturLinenEmptyState");
  const counter = document.getElementById("aturLinenCounter");

  // Reset
  container.innerHTML = "";

  if (!jenisName) {
    emptyState.style.display = "none";
    counter.innerText = "0 dari 0 linen dipilih";
    return;
  }

  if (!masterLinen || masterLinen.length === 0) {
    emptyState.style.display = "block";
    counter.innerText = "0 dari 0 linen dipilih";
    return;
  }

  emptyState.style.display = "none";

  // Ambil linenIds yang sudah disimpan untuk jenis nota terpilih
  const jData = jenisNotaList.find((j) => j.name === jenisName);
  const savedIds = (jData && Array.isArray(jData.linenIds)) ? jData.linenIds : [];

  // Render semua master linen sebagai checkbox
  container.innerHTML = masterLinen.map((m) => {
    const isChecked = savedIds.includes(m.id);
    return `
      <label class="atur-linen-item${isChecked ? ' checked' : ''}">
        <input type="checkbox" value="${m.id}" ${isChecked ? 'checked' : ''} onchange="updateAturLinenCounter(this)">
        <span class="atur-linen-name">${m.name}</span>
      </label>`;
  }).join("");

  updateAturLinenCounter();
}

function updateAturLinenCounter() {
  const total = masterLinen.length;
  const checked = document.querySelectorAll('#aturLinenCheckboxList input[type="checkbox"]:checked').length;
  document.getElementById("aturLinenCounter").innerText = `${checked} dari ${total} linen dipilih`;
}

async function simpanAturLinen() {
  const btn = document.getElementById("btnSimpanAturLinen");
  setBtnLoading(btn, true);
  try {
    const jenisName = document.getElementById("aturLinenJenisSelect").value;
    if (!jenisName) {
      toast("Pilih jenis nota terlebih dahulu!", "warning");
      return;
    }

    // Kumpulkan ID linen yang dicentang
    const linenIds = Array.from(document.querySelectorAll('#aturLinenCheckboxList input[type="checkbox"]:checked'))
      .map((inp) => parseInt(inp.value))
      .filter((n) => !isNaN(n));

    // Update ke Supabase
    const { error } = await db.from("jenis_nota")
      .update({ linen_ids: linenIds })
      .eq("name", jenisName);

    if (error) {
      console.error("Gagal menyimpan atur linen:", error);
      toast("Gagal menyimpan pengaturan linen.", "error");
      return;
    }

    // Update state lokal
    const jData = jenisNotaList.find((j) => j.name === jenisName);
    if (jData) jData.linenIds = linenIds;

    // Sync ke localStorage
    localStorage.setItem("DB_JENIS_NOTA", JSON.stringify(jenisNotaList));

    // Tutup modal & re-render form input linen
    tutupModal("modalAturLinenJenisNota");
    renderFormLinenInput();

    toast(`Pengaturan linen untuk "${jenisName}" disimpan! (${linenIds.length} linen)`, "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

function renderDaftarPelanggan() {
  const container = document.getElementById("daftarPelangganContainer");
  if (!pelangganList.length) {
    container.innerHTML = `<div class="info-box"><span>ℹ️</span><span>Belum ada pelanggan. Tambahkan pelanggan baru di bawah.</span></div>`;
    return;
  }
  // SMART SEARCH: filter by name / kode
  const q = (document.getElementById("cariPelangganMaster")?.value || "").toLowerCase().trim();
  let list = pelangganList;
  if (q) {
    list = pelangganList.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.kode || "").toLowerCase().includes(q)
    );
  }
  if (list.length === 0) {
    container.innerHTML = `<div class="info-box warning"><span>🔍</span><span>Tidak ada pelanggan cocok dengan "<strong>${q}</strong>". <button class="btn-link" onclick="clearCariPelangganMaster()">Tampilkan semua</button></span></div>`;
    return;
  }
  container.innerHTML = list.map((p) => `<div class="pelanggan-card">
        <div class="pelanggan-info">
            <div class="pelanggan-name">
                ${p.name}
                ${p.kode ? `<span class="kode-chip">${p.kode}</span>` : ""}
            </div>
            <div class="pelanggan-meta">
                <span>${p.type}</span>
                <span class="billing-chip">${p.billingSystem}</span>
                ${p.type === "HOTEL" && p.billingSystem === "FLAT" ? `<span>Flat: ${fmtRp(p.flatRate)}</span>` : ""}
                ${p.type === "RS" ? `<span>Tarif: ${fmtRp(p.tarifRS)}/Kg</span>` : ""}
            </div>
        </div>
        <div class="pelanggan-actions">
            <button class="btn-sm btn-primary" onclick="bukaModalEditPelanggan(${p.id})">✏️ Edit & Harga</button>
            <button class="btn-sm btn-danger" onclick="hapusPelanggan(${p.id})" title="Hapus" aria-label="Hapus pelanggan ${p.name}">🗑️</button>
        </div>
    </div>`).join("");
}

async function tambahPelangganBaru() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const name = document.getElementById("newPelangganName").value.trim();
    if (!name) return toast("Nama wajib!", "warning");
    const type = document.getElementById("newPelangganType").value;
    const billing = document.getElementById("newPelangganBilling").value;
    const flatRate = parseCurrencyValue(document.getElementById("newFlatRate").value);
    const tarifRS = parseCurrencyValue(document.getElementById("newTarifRS").value);
    const alamat = document.getElementById("newPelangganAlamat").value.trim();
    const kota = document.getElementById("newPelangganKota").value.trim();
    const kodeRaw = document.getElementById("newPelangganKode").value.trim().toUpperCase();
    const kode = kodeRaw || generateKodePelanggan(name);

    const { data, error } = await db.from("pelanggan").insert([{ nama: name, kode, tipe: type, billing_system: billing, flat_rate: flatRate, tarif_rs: tarifRS, alamat, kota }]).select();
    if (error) { console.error("Gagal menambah pelanggan:", error); toast("Gagal menambah pelanggan.", "error"); return; }
    const newPel = data[0];
    pelangganList.push({ id: newPel.id, name: newPel.nama, kode: newPel.kode, type: newPel.tipe, billingSystem: newPel.billing_system, flatRate: newPel.flat_rate, tarifRS: newPel.tarif_rs, alamat: newPel.alamat, kota: newPel.kota });
    renderDaftarPelanggan(); renderPelangganDropdowns();
    document.getElementById("newPelangganName").value = ""; document.getElementById("newPelangganKode").value = ""; document.getElementById("newFlatRate").value = ""; document.getElementById("newTarifRS").value = ""; document.getElementById("newPelangganAlamat").value = ""; document.getElementById("newPelangganKota").value = "";
    toast("Pelanggan ditambahkan!");
  } finally {
    setBtnLoading(btn, false);
  }
}

function autoIsiKodeBaru() {
  const nameInput = document.getElementById("newPelangganName"); const kodeInput = document.getElementById("newPelangganKode");
  if (!kodeInput.value.trim()) { kodeInput.value = generateKodePelanggan(nameInput.value); }
}

async function hapusPelanggan(id) {
  if (!await window.customConfirm("Hapus pelanggan ini? Data harga juga akan dihapus.")) return;
  const { error } = await db.from("pelanggan").delete().eq("id", id);
  if (error) { console.error("Gagal menghapus pelanggan:", error); toast("Gagal menghapus pelanggan.", "error"); return; }
  pelangganList = pelangganList.filter((p) => p.id !== id); delete hargaPelanggan[id];
  renderDaftarPelanggan(); renderPelangganDropdowns(); toast("Pelanggan dihapus.");
}

async function bukaModalEditLinen(id) {
  const { data: notaList, error } = await db.from("nota").select("*").eq("id", id);
  if (error || !notaList || notaList.length === 0) { toast("Nota tidak ditemukan!", "error"); return; }
  const nota = notaList[0];
  document.getElementById("editNotaTargetId").value = id;
  const pData = pelangganList.find((p) => p.id === nota.pelanggan_id);
  if (!pData) { toast("Data pelanggan tidak ditemukan!", "error"); return; }

  const editSelect = document.getElementById("editNotaJenisSelect"); editSelect.innerHTML = "";
  if (pData.type === "RS") { editSelect.disabled = true; editSelect.innerHTML = '<option value="KILOAN">KILOAN</option>'; }
  else {
    editSelect.disabled = false;
    const filtered = jenisNotaList.filter((j) => pData.billingSystem === "FLAT" ? j.forFlat : j.forReguler);
    filtered.forEach((j) => { editSelect.innerHTML += `<option value="${j.name}" ${j.name === nota.jenis ? "selected" : ""}>${j.name} (${j.multiplier}x)</option>`; });
  }

  // Update localStorage cache dengan nota terbaru dari DB supaya onEditJenisChange dapat data segar
  try {
    const cacheNota = JSON.parse(localStorage.getItem("DB_NOTA") || "[]");
    const normalized = normalizeNota(nota);
    const idx = cacheNota.findIndex((n) => n.id === nota.id);
    if (idx >= 0) cacheNota[idx] = normalized; else cacheNota.push(normalized);
    localStorage.setItem("DB_NOTA", JSON.stringify(cacheNota));
  } catch (e) { console.warn("Gagal sync cache nota:", e); }

  const container = document.getElementById("editLinenModalBody"); container.innerHTML = "";
  if (pData.type === "RS") {
    const qtyRS = nota.items[0]?.qty || 0;
    container.innerHTML = `<div class="form-group"><label>Berat (KG)</label><input type="number" step="0.1" class="modal-edit-qty" value="${qtyRS}"></div>`;
  } else {
    // Render linen list pakai helper yang sama dengan onEditJenisChange (filter + legacy)
    renderEditLinenList(nota, pData);
  }

  const jenisSelect = document.getElementById("editNotaJenisSelect");
  if (jenisSelect) { jenisSelect.addEventListener("change", () => { onEditJenisChange(); hitungTotalEditPreview(); }); }
  document.querySelectorAll(".modal-edit-qty").forEach((inp) => { inp.addEventListener("input", hitungTotalEditPreview); });
  hitungTotalEditPreview(); document.getElementById("editLinenModal").style.display = "flex";
}

/**
 * Helper: Render daftar linen di modal Edit Nota.
 * Menerapkan filter irisan (linen_pelanggan ∩ linen_ids jenis),
 * dengan item lama yang tidak lagi valid tetap ditampilkan (highlight kuning, editable).
 */
function renderEditLinenList(nota, pData) {
  const jenisName = document.getElementById("editNotaJenisSelect").value || nota.jenis;
  const jData = jenisNotaList.find((j) => j.name === jenisName);
  const mult = jData ? jData.multiplier : 1;
  const container = document.getElementById("editLinenModalBody");
  container.innerHTML = "";

  if (!masterLinen || masterLinen.length === 0) {
    container.innerHTML = "<p>Master linen belum tersedia.</p>";
    return;
  }

  // 1. Daftar linen yang valid untuk jenis nota (urutan sesuai config per-pelanggan)
  const linenIdsJenis = (jData && Array.isArray(jData.linenIds)) ? jData.linenIds : [];
  const validLinenList = getLinenPelanggan(pData.id).filter((entry) => linenIdsJenis.includes(entry.linenId));
  const validIds = new Set(validLinenList.map((e) => e.linenId));

  // 2. Item lama dari nota yang TIDAK lagi valid (di-skip oleh filter) — tetap tampil dengan highlight kuning
  const legacyItems = (nota.items || []).filter((it) => it.idMaster && !validIds.has(it.idMaster));

  // 3. Header info jika ada item legacy
  if (legacyItems.length > 0) {
    container.innerHTML += `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#92400e;">
        ⚠️ <strong>${legacyItems.length} item lama</strong> tidak lagi termasuk dalam pengaturan jenis nota "${jenisName}".<br>
        Item tetap ditampilkan (highlight kuning) & dapat diedit — set qty ke <strong>0</strong> untuk menghapus, atau biarkan tetap jika masih ingin disimpan.
      </div>`;
  }

  // 4. Tampilkan legacy items TERLEBIH DAHULU (di atas, dengan highlight kuning)
  legacyItems.forEach((it) => {
    const m = masterLinen.find((ml) => ml.id === it.idMaster);
    const nama = m ? m.name : it.name;
    const hargaSatuan = getHargaPerPelanggan(pData.id, it.idMaster, mult);
    container.innerHTML += `
      <div class="form-group linen-edit-row legacy-item">
        <label>${nama} <span style="color:#b45309;font-size:11px;font-weight:700;">⚠ ITEM LAMA</span></label>
        <input type="number" class="modal-edit-qty" data-masterid="${it.idMaster}" value="${it.qty}" min="0">
        <span class="price-label">@ ${fmtRp(hargaSatuan)}</span>
      </div>`;
  });

  // 5. Tampilkan linen yang valid
  if (validLinenList.length === 0 && legacyItems.length === 0) {
    container.innerHTML += `
      <div style="text-align:center;color:#b45309;background:#fffbeb;padding:20px;border:2px dashed #fde68a;border-radius:6px;font-size:13px;">
        ⚠️ Tidak ada linen yang diatur untuk jenis nota "<strong>${jenisName}</strong>".<br>
        <small>Atur linen via Master Data → 📋 Atur Linen terlebih dahulu.</small>
      </div>`;
  } else {
    validLinenList.forEach((entry) => {
      const m = masterLinen.find((ml) => ml.id === entry.linenId);
      if (!m) return;
      const exist = (nota.items || []).find((it) => it.idMaster === m.id);
      const qty = exist ? exist.qty : 0;
      const hargaSatuan = getHargaPerPelanggan(pData.id, m.id, mult);
      container.innerHTML += `
        <div class="form-group linen-edit-row">
          <label>${m.name}</label>
          <input type="number" class="modal-edit-qty" data-masterid="${m.id}" value="${qty}" min="0">
          <span class="price-label">@ ${fmtRp(hargaSatuan)}</span>
        </div>`;
    });
  }
}

async function simpanDetailPelanggan() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const id = parseInt(document.getElementById("editPelangganId").value);
    const p = pelangganList.find((p) => p.id === id); if (!p) return;
    const nama = document.getElementById("editPelangganName").value.trim();
    const kodeBaru = document.getElementById("editPelangganKode").value.trim().toUpperCase();
    const kode = kodeBaru || generateKodePelanggan(nama);
    const tipe = document.getElementById("editPelangganType").value;
    const billing = document.getElementById("editPelangganBilling").value;
    const flatRate = parseCurrencyValue(document.getElementById("editFlatRate").value);
    const tarifRS = parseCurrencyValue(document.getElementById("editTarifRS").value);
    const alamat = document.getElementById("editPelangganAlamat").value.trim();
    const kota = document.getElementById("editPelangganKota").value.trim();

    const { error } = await db.from("pelanggan").update({ nama, kode, tipe, billing_system: billing, flat_rate: flatRate, tarif_rs: tarifRS, alamat, kota }).eq("id", id);
    if (error) { console.error("Gagal mengupdate pelanggan:", error); toast("Gagal mengupdate pelanggan.", "error"); return; }

    const hargaBaru = {};
    document.querySelectorAll(".harga-input").forEach((inp) => { const linenId = parseInt(inp.dataset.linenId); const harga = parseCurrencyValue(inp.value); hargaBaru[linenId] = harga; });
    await db.from("harga_pelanggan").delete().eq("pelanggan_id", id);
    const hargaInsert = Object.entries(hargaBaru).map(([linenId, harga]) => ({ pelanggan_id: id, linen_id: parseInt(linenId), harga }));
    if (hargaInsert.length > 0) { await db.from("harga_pelanggan").insert(hargaInsert); }

    p.name = nama; p.kode = kode; p.type = tipe; p.billingSystem = billing; p.flatRate = flatRate; p.tarifRS = tarifRS; p.alamat = alamat; p.kota = kota;
    hargaPelanggan[id] = hargaBaru;
    localStorage.setItem("DB_HARGA_PELANGGAN", JSON.stringify(hargaPelanggan)); localStorage.setItem("DB_PELANGGAN", JSON.stringify(pelangganList));

    // Simpan urutan linen per-pelanggan dari tabel detail pelanggan
    const activeLinenList = [];
    let urutanIndex = 0;
    document.querySelectorAll("#tabelHargaLinen tr.linen-drag-row").forEach((row) => {
      const cb = row.querySelector(".linen-active-cb");
      if (cb && cb.checked) {
        const linenId = parseInt(cb.dataset.linenId);
        activeLinenList.push({ linenId, urutan: urutanIndex });
        urutanIndex++;
      }
    });
    saveLinenPelanggan(id, activeLinenList);

    // Sync ke Supabase tabel 'linen_pelanggan'
    try {
      await db.from("linen_pelanggan").delete().eq("pelanggan_id", id);
      const linenInsert = activeLinenList.map(item => ({
        pelanggan_id: id,
        linen_id: item.linenId,
        urutan: item.urutan
      }));
      if (linenInsert.length > 0) {
        const { error: syncError } = await db.from("linen_pelanggan").insert(linenInsert);
        if (syncError) console.error("Gagal sync ke tabel linen_pelanggan Supabase:", syncError);
      }
    } catch (err) {
      console.error("Gagal sync Supabase (tabel mungkin belum terbuat):", err);
    }

    const counterVal = parseInt(document.getElementById("editPelangganCounter").value, 10);
    if (!isNaN(counterVal)) { const tahun = new Date().getFullYear(); await setCounterAwalPelanggan(kode, tahun, counterVal); }

    await refreshDataSistem(); tutupModal("modalDetailPelanggan"); renderDaftarPelanggan(); renderPelangganDropdowns(); renderFormLinenInput(); toast("Pelanggan & harga disimpan.");
  } finally {
    setBtnLoading(btn, false);
  }
}

function handleEditTipeChange() {
  const tipe = document.getElementById("editPelangganType").value;
  document.getElementById("editGroupFlat").style.display = tipe === "HOTEL" ? "block" : "none";
  document.getElementById("editGroupTarif").style.display = tipe === "RS" ? "block" : "none";
}
function toggleFlatRateInput() {
  const tipe = document.getElementById("newPelangganType").value; const billing = document.getElementById("newPelangganBilling").value;
  const showFlat = tipe === "HOTEL" && billing === "FLAT"; const showRS = tipe === "RS";
  document.getElementById("groupFlatRate").style.display = showFlat ? "block" : "none"; document.getElementById("groupTarifRS").style.display = showRS ? "block" : "none";
}

function bukaModalEditPelanggan(id) {
  const p = pelangganList.find((p) => p.id === id);
  if (!p) { toast("Pelanggan tidak ditemukan!", "error"); return; }
  document.getElementById("editPelangganId").value = id; document.getElementById("editPelangganName").value = p.name || ""; document.getElementById("editPelangganKode").value = p.kode || ""; document.getElementById("editPelangganType").value = p.type || "HOTEL"; document.getElementById("editPelangganBilling").value = p.billingSystem || "REGULER"; document.getElementById("editFlatRate").value = (p.flatRate || 0).toLocaleString("id-ID"); document.getElementById("editTarifRS").value = (p.tarifRS || 0).toLocaleString("id-ID"); document.getElementById("editPelangganAlamat").value = p.alamat || ""; document.getElementById("editPelangganKota").value = p.kota || "";
  handleEditTipeChange(); handleEditBillingChange();
  const counters = JSON.parse(localStorage.getItem("DB_INVOICE_COUNTER")) || {}; const tahun = new Date().getFullYear(); const counterKey = `${p.kode}_${tahun}`;
  document.getElementById("editPelangganCounter").value = counters[counterKey] != null ? counters[counterKey] : "";
  const hargaMap = hargaPelanggan[id] || {};
  const tbody = document.getElementById("tabelHargaLinen");
  if (!masterLinen.length) {
    tbody.innerHTML = '<tr><td colspan="4">Belum ada master linen.</td></tr>';
  } else {
    // Ambil konfigurasi linen per-pelanggan
    const savedList = getLinenPelanggan(id);
    const savedIds = new Set(savedList.map(e => e.linenId));
    // Baris yang sudah ada di daftar pelanggan (sesuai urutan)
    const inList = savedList.map(e => masterLinen.find(m => m.id === e.linenId)).filter(Boolean);
    // Baris yang belum masuk daftar (dari masterLinen)
    const notInList = masterLinen.filter(m => !savedIds.has(m.id));
    const allForRender = [...inList, ...notInList];
    tbody.innerHTML = allForRender.map((m) => {
      const isChecked = savedIds.has(m.id);
      const harga = hargaMap[m.id] || 0;
      return `<tr draggable="true" data-linen-id="${m.id}" class="linen-drag-row" style="cursor:grab;">
        <td style="width:28px;text-align:center;font-size:18px;color:#aaa;cursor:grab;" class="drag-handle">⠿</td>
        <td style="width:30px;text-align:center;"><input type="checkbox" class="linen-active-cb" data-linen-id="${m.id}" ${isChecked ? "checked" : ""}></td>
        <td>${m.name}</td>
        <td><input type="text" class="harga-input" data-linen-id="${m.id}" value="${harga.toLocaleString("id-ID")}" oninput="formatCurrencyInput(this)"></td>
      </tr>`;
    }).join("");
    // Inisialisasi drag & drop
    initLinenDragDrop(tbody);
  }
  document.getElementById("modalDetailPelanggan").style.display = "flex";
}

function handleEditBillingChange() {
  const tipe = document.getElementById("editPelangganType").value; const billing = document.getElementById("editPelangganBilling").value;
  document.getElementById("editGroupFlat").style.display = tipe === "HOTEL" && billing === "FLAT" ? "block" : "none"; document.getElementById("editGroupTarif").style.display = tipe === "RS" ? "block" : "none";
}

function renderMasterKaryawanTable() {
  const tbody = document.getElementById("tabelMasterKaryawan");
  if (!karyawanList.length) { tbody.innerHTML = emptyRowHTML(4, "Belum ada karyawan. Tambahkan karyawan baru di atas."); return; }
  tbody.innerHTML = karyawanList.map((k) => `<tr>
    <td data-label="Nama">${k.nama}</td>
    <td data-label="Bagian">${k.bagian || "-"}</td>
    <td data-label="Persentase">${k.persentase}%</td>
    <td data-label="Aksi" data-full-width style="white-space:nowrap;"><button class="btn-sm btn-primary" onclick="openEditKaryawanModal(${k.id})">Edit</button> <button class="btn-sm btn-danger" onclick="hapusKaryawan(${k.id})">Hapus</button></td>
  </tr>`).join("");
}

async function tambahKaryawan() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const nama = document.getElementById("newKaryawanNama").value.trim(); if (!nama) return toast("Nama wajib!", "warning");
    const bagian = document.getElementById("newKaryawanBagian").value; const persentase = parseFloat(document.getElementById("newKaryawanPersen").value);
    const { data, error } = await db.from("karyawan").insert([{ nama, bagian, persentase }]).select();
    if (error) { console.error("Gagal menambah karyawan:", error); toast("Gagal menambah karyawan.", "error"); return; }
    karyawanList.push({ id: data[0].id, nama, bagian, persentase });
    renderMasterKaryawanTable(); document.getElementById("newKaryawanNama").value = ""; toast("Karyawan ditambahkan.");
  } finally {
    setBtnLoading(btn, false);
  }
}

function openEditKaryawanModal(id) {
  const k = karyawanList.find((k) => k.id === id); document.getElementById("editKaryawanId").value = id; document.getElementById("editKaryawanNama").value = k.nama; document.getElementById("editKaryawanBagian").value = k.bagian || ""; document.getElementById("editKaryawanPersen").value = k.persentase; document.getElementById("editKaryawanModal").style.display = "flex";
}

async function updateKaryawanFromModal() {
  const id = parseInt(document.getElementById("editKaryawanId").value); const k = karyawanList.find((k) => k.id === id);
  const nama = document.getElementById("editKaryawanNama").value.trim(); const bagian = document.getElementById("editKaryawanBagian").value.trim(); const persentase = parseFloat(document.getElementById("editKaryawanPersen").value);
  const { error } = await db.from("karyawan").update({ nama, bagian, persentase }).eq("id", id);
  if (error) { console.error("Gagal mengupdate karyawan:", error); toast("Gagal mengupdate karyawan.", "error"); return; }
  k.nama = nama; k.bagian = bagian; k.persentase = persentase; renderMasterKaryawanTable(); tutupEditKaryawanModal();
}
function tutupEditKaryawanModal() { document.getElementById("editKaryawanModal").style.display = "none"; }

async function hapusKaryawan(id) {
  if (!await window.customConfirm("Hapus karyawan ini?")) return;
  const { error } = await db.from("karyawan").delete().eq("id", id);
  if (error) { console.error("Gagal menghapus karyawan:", error); toast("Gagal menghapus karyawan.", "error"); return; }
  karyawanList = karyawanList.filter((k) => k.id !== id); renderMasterKaryawanTable();
}

async function simpanPengaturanGlobal() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const updates = {
      tarif_internal_hotel: parseCurrencyValue(document.getElementById("settingTarifHotel").value), ongkos_per_kg: parseCurrencyValue(document.getElementById("settingOngkosPerKg").value), rekening_name: document.getElementById("settingRekeningName").value.trim(), rekening_no: document.getElementById("settingRekeningNo").value.trim(), bank: document.getElementById("settingBank").value.trim(), direktur: document.getElementById("settingDirektur").value.trim(), peralatan: parseCurrencyValue(document.getElementById("settingPeralatan").value),
    };
    const { error } = await db.from("pengaturan").update(updates).eq("id", 1);
    if (error) { console.error("Gagal menyimpan pengaturan:", error); toast("Gagal menyimpan pengaturan.", "error"); return; }
    pengaturan = { ...pengaturan, ...updates }; toast("Pengaturan disimpan!", "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

async function simpanKopSurat() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const updates = { nama: document.getElementById("kopNama").value.trim(), alamat: document.getElementById("kopAlamat").value.trim(), telepon: document.getElementById("kopTelepon").value.trim(), email: document.getElementById("kopEmail").value.trim(), kontak: document.getElementById("kopContact").value.trim() };
    const { error } = await db.from("kop").update(updates).eq("id", 1);
    if (error) { console.error("Gagal menyimpan kop surat:", error); toast("Gagal menyimpan kop surat.", "error"); return; }
    localStorage.setItem("DB_KOP", JSON.stringify(updates));
    const fileInput = document.getElementById("fileLogoInput");
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) { toast("Ukuran logo maksimal 2 MB.", "warning"); return; }
      await saveLogoToIndexedDB(file);
    }
    toast("Kop surat disimpan.", "success"); previewLogoFromDB();
  } finally {
    setBtnLoading(btn, false);
  }
}

async function handleLogoUpload(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) { document.getElementById("logoPreview").src = e.target.result; document.getElementById("logoPreviewContainer").style.display = "block"; document.getElementById("logoStatus").innerText = file.name; };
  reader.readAsDataURL(file);
}

async function previewLogoFromDB() {
  const logoUrl = await getLogoFromIndexedDB();
  if (logoUrl) { document.getElementById("logoPreview").src = logoUrl; document.getElementById("logoPreviewContainer").style.display = "block"; document.getElementById("logoStatus").innerText = "Logo tersimpan"; }
  else { document.getElementById("logoPreviewContainer").style.display = "none"; document.getElementById("logoStatus").innerText = "Belum ada logo"; }
}

function renderAbsensiTable() {
  const tgl = document.getElementById("absensiTanggal").value;
  if (!tgl || karyawanList.length === 0) return;
  let html = '<table class="linen-table"><tr><th>Nama</th><th>Status</th></tr>';
  karyawanList.forEach((k) => {
    const exist = absensiList.find((a) => a.tanggal === tgl && a.karyawanId === k.id); const status = exist ? exist.status : "Hadir";
    html += `<tr><td>${k.nama}</td><td><select class="absen-status" data-kid="${k.id}">${["Hadir", "Izin", "Alpa", "Libur"].map((s) => `<option ${status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`;
  });
  html += '</table><button class="btn btn-success" onclick="simpanAbsensi()">Simpan Absensi</button>';
  document.getElementById("absensiContainer").innerHTML = html;
}

async function simpanAbsensi() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const tgl = document.getElementById("absensiTanggal").value; const promises = [];
    document.querySelectorAll(".absen-status").forEach((sel) => {
      const kid = parseInt(sel.getAttribute("data-kid"));
      promises.push(db.from("absensi").delete().eq("tanggal", tgl).eq("karyawan_id", kid).then(() => db.from("absensi").insert([{ tanggal: tgl, karyawan_id: kid, status: sel.value }])));
    });
    await Promise.all(promises); await refreshDataSistem(); toast("Absensi tersimpan!", "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

function hitungKgHarian(transaksiPeriode, tarifInternal, tglMulai, tglSelesai) {
  const kgHarian = {};
  transaksiPeriode.forEach((nota) => {
    const tgl = nota.tanggal; const pel = pelangganList.find((p) => p.name === nota.pelanggan); if (!pel) return;
    if (pel.type === "HOTEL" && pel.billingSystem === "FLAT" && nota.jenis === "FLAT") return;
    let kg = 0;
    if (pel.type === "RS") { kg = nota.items.reduce((s, it) => s + (it.qty || 0), 0); }
    else if (pel.type === "HOTEL") { kg = nota.total / (tarifInternal || 7000); }
    if (!kgHarian[tgl]) kgHarian[tgl] = 0; kgHarian[tgl] += kg;
  });
  return kgHarian;
}

async function tampilkanListGajiBaru() {
  const tglMulai = document.getElementById("gajiTglMulai").value; const tglSelesai = document.getElementById("gajiTglSelesai").value;
  if (!tglMulai || !tglSelesai || tglMulai > tglSelesai) return toast("Periode tidak valid!", "warning");
  if (karyawanList.length === 0) return;
  const transaksi = (JSON.parse(localStorage.getItem("DB_NOTA")) || []).filter((n) => n.tanggal >= tglMulai && n.tanggal <= tglSelesai);
  const kgHarian = hitungKgHarian(transaksi, pengaturan.tarifInternalHotel || 7000, tglMulai, tglSelesai);
  const ongkos = pengaturan.ongkosPerKg || 1200;
  const { data: dataGaji } = await db.from("gaji").select("*");
  const hasil = karyawanList.map((k) => {
    let totalUpah = 0; const rincian = []; let current = new Date(tglMulai); const end = new Date(tglSelesai);
    while (current <= end) {
      const tgl = current.toISOString().slice(0, 10);
      const absen = absensiList.find((a) => a.tanggal === tgl && a.karyawanId === k.id); const status = absen ? absen.status : "Hadir";
      const kg = kgHarian[tgl] || 0; let upah = 0, hadir = 0;
      if (status === "Hadir") {
        hadir = karyawanList.filter((k2) => {
          const a2 = absensiList.find((a) => a.tanggal === tgl && a.karyawanId === k2.id);
          return a2 ? a2.status === "Hadir" : true;
        }).length || 1;
        upah = Math.floor((kg * ongkos) / hadir); totalUpah += upah;
      }
      rincian.push({ tanggal: tgl, kg, ongkos, hadir, upah, status }); current.setDate(current.getDate() + 1);
    }
    const simpan = dataGaji.find((g) => g.karyawan_id === k.id && g.periode_mulai === tglMulai && g.periode_selesai === tglSelesai) || {};
    return { karyawan: k, totalUpah, insentif: simpan.insentif || 0, lembur: simpan.lembur || 0, potongan: simpan.potongan || 0, totalDiterima: Math.floor(totalUpah + (simpan.insentif || 0) + (simpan.lembur || 0) - (simpan.potongan || 0)), rincian, periodeMulai: tglMulai, periodeSelesai: tglSelesai, gajiId: simpan.id };
  });
  _hasilGaji = hasil;
  const container = document.getElementById("listGajiContainer");
  container.innerHTML = `<table class="linen-table"><tr><th>Nama</th><th>Upah</th><th>Insentif</th><th>Lembur</th><th>Potongan</th><th>Diterima</th><th>Aksi</th></tr>` +
    hasil.map((h) => `<tr><td>${h.karyawan.nama}</td><td>${fmtRp(h.totalUpah)}</td><td>${fmtRp(h.insentif)}</td><td>${fmtRp(h.lembur)}</td><td>${fmtRp(h.potongan)}</td><td><strong>${fmtRp(h.totalDiterima)}</strong></td><td><button class="btn-sm btn-primary" onclick="viewSlipGaji(${h.karyawan.id},'${tglMulai}','${tglSelesai}')">Slip</button> <button class="btn-sm btn-success" onclick="downloadSlipGaji(${h.karyawan.id},'${tglMulai}','${tglSelesai}')">⬇️ Download</button> <button class="btn-sm btn-primary" onclick="editGajiKaryawan(${h.karyawan.id},'${tglMulai}','${tglSelesai}')">Edit</button></td></tr>`).join("") + "</table>";
}

function editGajiKaryawan(kId, mulai, selesai) {
  const h = _hasilGaji.find((h) => h.karyawan.id == kId && h.periodeMulai === mulai && h.periodeSelesai === selesai);
  if (!h) return;
  _gajiAktif = { karyawanId: kId, periodeMulai: mulai, periodeSelesai: selesai, gajiId: h.gajiId };
  
  document.getElementById("editGajiId").value = h.gajiId || ""; 
  document.getElementById("editGajiInsentif").value = h.insentif.toLocaleString("id-ID"); 
  document.getElementById("editGajiLembur").value = h.lembur.toLocaleString("id-ID"); 
  document.getElementById("editGajiPotongan").value = h.potongan.toLocaleString("id-ID"); 
  document.getElementById("editGajiModal").style.display = "flex";
}

async function simpanEditGajiBaru() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const updates = { insentif: parseCurrencyValue(document.getElementById("editGajiInsentif").value), lembur: parseCurrencyValue(document.getElementById("editGajiLembur").value), potongan: parseCurrencyValue(document.getElementById("editGajiPotongan").value) };
    if (_gajiAktif.gajiId) {
      const { error } = await db.from("gaji").update(updates).eq("id", _gajiAktif.gajiId);
      if (error) { console.error("Gagal mengupdate gaji:", error); toast("Gagal mengupdate gaji.", "error"); return; }
    } else {
      const { error } = await db.from("gaji").insert([{ karyawan_id: _gajiAktif.karyawanId, periode_mulai: _gajiAktif.periodeMulai, periode_selesai: _gajiAktif.periodeSelesai, ...updates }]);
      if (error) { console.error("Gagal menyimpan gaji:", error); toast("Gagal menyimpan gaji.", "error"); return; }
    }
    tutupEditGaji(); await tampilkanListGajiBaru(); toast("Data gaji disimpan.", "success");
  } finally {
    setBtnLoading(btn, false);
  }
}
function tutupEditGaji() { document.getElementById("editGajiModal").style.display = "none"; }

function getBackupHistory() { return JSON.parse(localStorage.getItem("DB_BACKUP_HISTORY")) || []; }
function saveBackupHistory(history) { localStorage.setItem("DB_BACKUP_HISTORY", JSON.stringify(history)); }

function renderBackupStatus() {
  const dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || []; const history = getBackupHistory();
  const bulanSet = new Set(); dbNota.forEach((n) => { if (n.tanggal) bulanSet.add(n.tanggal.substring(0, 7)); });
  const bulanList = Array.from(bulanSet).sort();
  if (bulanList.length === 0) { document.getElementById("backupStatusArea").innerHTML = "<p>Tidak ada data transaksi.</p>"; return; }
  let html = '<table class="linen-table"><thead><tr><th>Bulan</th><th>Status Backup</th><th>Aksi</th></tr></thead><tbody>';
  bulanList.forEach((bln) => {
    const sudah = history.includes(bln);
    const status = sudah ? '<span style="color:var(--success);">✅ Sudah di-backup</span>' : '<span style="color:var(--danger);">❌ Belum di-backup</span>';
    const tombol = sudah ? "" : `<button class="btn-sm btn-secondary" onclick="backupBulan('${bln}')">📤 Backup Bulan Ini</button>`;
    html += `<tr><td>${bln}</td><td>${status}</td><td>${tombol}</td></tr>`;
  });
  html += "</tbody></table>"; document.getElementById("backupStatusArea").innerHTML = html;
}

async function backupBulan(bln) {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    if (!await window.customConfirm(`Backup & hapus transaksi bulan ${bln}? Data master tetap aman.`)) return;
    const allData = { metadata: { version: "v24" }, data: {} };
    const allKeys = ["DB_NOTA", "DB_BIAYA", "DB_LOCKS", "DB_PAYMENT_STATUS", "DB_KARYAWAN", "DB_ABSENSI", "DB_GAJI", "DB_PENGATURAN", "DB_JENIS_NOTA", "DB_PELANGGAN", "DB_MASTER_LINEN", "DB_HARGA_PELANGGAN", "DB_KOP", "DB_UTANG", "DB_LINEN_PELANGGAN"];
    allKeys.forEach((k) => (allData.data[k] = JSON.parse(localStorage.getItem(k))));
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pelangi_backup_${bln}.json`; a.click();
    // Hapus dari Supabase
    try {
      await db.from("nota").delete().gte("tanggal", `${bln}-01`).lte("tanggal", `${bln}-31`);
      await db.from("biaya").delete().gte("tanggal", `${bln}-01`).lte("tanggal", `${bln}-31`);
      await db.from("absensi").delete().gte("tanggal", `${bln}-01`).lte("tanggal", `${bln}-31`);
      await db.from("gaji").delete().gte("periode_mulai", `${bln}-01`).lte("periode_mulai", `${bln}-31`);
      await db.from("backup_history").delete().eq("bulan", bln);
      await db.from("backup_history").insert([{ bulan: bln }]);
    } catch (err) { console.error("Gagal menghapus dari Supabase:", err); toast("Gagal sinkronisasi hapus ke Supabase.", "error"); }
    let dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
    dbNota = dbNota.filter((n) => !n.tanggal || n.tanggal.substring(0, 7) !== bln); localStorage.setItem("DB_NOTA", JSON.stringify(dbNota));
    ["DB_BIAYA", "DB_ABSENSI", "DB_GAJI"].forEach((k) => {
      let arr = JSON.parse(localStorage.getItem(k)) || []; arr = arr.filter((item) => { const tgl = item.tanggal || ""; return !tgl.startsWith(bln); }); localStorage.setItem(k, JSON.stringify(arr));
    });
    const history = getBackupHistory(); if (!history.includes(bln)) { history.push(bln); saveBackupHistory(history); }
    await refreshDataSistem(); renderBackupStatus(); toast(`Backup bulan ${bln} berhasil.`, "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

async function backupSemuaBulanBelum() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || []; const history = getBackupHistory();
    const bulanSet = new Set(); dbNota.forEach((n) => { if (n.tanggal) bulanSet.add(n.tanggal.substring(0, 7)); });
    const belum = Array.from(bulanSet).filter((bln) => !history.includes(bln));
    if (belum.length === 0) { toast("Semua bulan sudah di-backup.", "info"); return; }
    if (!await window.customConfirm(`Backup & hapus ${belum.length} bulan yang belum di-backup? (${belum.join(", ")})`)) return;
    const allData = { metadata: { version: "v24" }, data: {} };
    const allKeys = ["DB_NOTA", "DB_BIAYA", "DB_LOCKS", "DB_PAYMENT_STATUS", "DB_KARYAWAN", "DB_ABSENSI", "DB_GAJI", "DB_PENGATURAN", "DB_JENIS_NOTA", "DB_PELANGGAN", "DB_MASTER_LINEN", "DB_HARGA_PELANGGAN", "DB_KOP", "DB_UTANG", "DB_LINEN_PELANGGAN"];
    allKeys.forEach((k) => (allData.data[k] = JSON.parse(localStorage.getItem(k))));
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pelangi_backup_${belum.join("_")}.json`; a.click();
    // Hapus dari Supabase per bulan
    try {
      for (const b of belum) {
        await db.from("nota").delete().gte("tanggal", `${b}-01`).lte("tanggal", `${b}-31`);
        await db.from("biaya").delete().gte("tanggal", `${b}-01`).lte("tanggal", `${b}-31`);
        await db.from("absensi").delete().gte("tanggal", `${b}-01`).lte("tanggal", `${b}-31`);
        await db.from("gaji").delete().gte("periode_mulai", `${b}-01`).lte("periode_mulai", `${b}-31`);
        await db.from("backup_history").delete().eq("bulan", b);
        await db.from("backup_history").insert([{ bulan: b }]);
      }
    } catch (err) { console.error("Gagal menghapus dari Supabase:", err); toast("Gagal sinkronisasi hapus ke Supabase.", "error"); }
    let dbNota2 = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
    dbNota2 = dbNota2.filter((n) => !n.tanggal || !belum.includes(n.tanggal.substring(0, 7))); localStorage.setItem("DB_NOTA", JSON.stringify(dbNota2));
    ["DB_BIAYA", "DB_ABSENSI", "DB_GAJI"].forEach((k) => {
      let arr = JSON.parse(localStorage.getItem(k)) || []; arr = arr.filter((item) => { const tgl = item.tanggal || ""; return !belum.some((b) => tgl.startsWith(b)); }); localStorage.setItem(k, JSON.stringify(arr));
    });
    const newHistory = getBackupHistory(); belum.forEach((b) => { if (!newHistory.includes(b)) newHistory.push(b); }); saveBackupHistory(newHistory);
    await refreshDataSistem(); renderBackupStatus(); toast(`Backup ${belum.length} bulan berhasil!`, "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

async function backupDanBersihkan() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    if (!await window.customConfirm("BACKUP SEMUA DATA LALU HAPUS SEMUA TRANSAKSI? Tindakan ini tidak bisa dibatalkan. Data master (pelanggan, linen, karyawan, pengaturan) TETAP AMAN.")) return;
    const allData = { metadata: { version: "v24" }, data: {} };
    const allKeys = ["DB_NOTA", "DB_BIAYA", "DB_LOCKS", "DB_PAYMENT_STATUS", "DB_KARYAWAN", "DB_ABSENSI", "DB_GAJI", "DB_PENGATURAN", "DB_JENIS_NOTA", "DB_PELANGGAN", "DB_MASTER_LINEN", "DB_HARGA_PELANGGAN", "DB_KOP", "DB_UTANG", "DB_LINEN_PELANGGAN"];
    allKeys.forEach((k) => (allData.data[k] = JSON.parse(localStorage.getItem(k))));
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pelangi_backup_full_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    // Hapus semua transaksi dari Supabase
    try {
      await db.from("nota").delete().filter("id", "not.is", null);
      await db.from("biaya").delete().filter("id", "not.is", null);
      await db.from("absensi").delete().gte("tanggal", "1900-01-01");
      await db.from("gaji").delete().filter("id", "not.is", null);
      await db.from("payment_status").delete().filter("key", "not.is", null);
      await db.from("locks").delete().filter("key", "not.is", null);
      await db.from("backup_history").delete().filter("bulan", "not.is", null);
    } catch (err) { console.error("Gagal menghapus dari Supabase:", err); toast("Gagal sinkronisasi hapus ke Supabase.", "error"); }
    const keysToClear = ["DB_NOTA", "DB_BIAYA", "DB_ABSENSI", "DB_GAJI", "DB_PAYMENT_STATUS", "DB_LOCKS"];
    keysToClear.forEach((k) => localStorage.setItem(k, JSON.stringify([])));
    await refreshDataSistem(); renderBackupStatus(); toast("Backup berhasil & transaksi dibersihkan!", "success", 4000);
  } finally {
    setBtnLoading(btn, false);
  }
}

async function exportAllData() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const tables = ["pelanggan", "jenis_nota", "master_linen", "karyawan", "absensi", "pengaturan", "kop", "harga_pelanggan", "nota", "biaya", "invoice_numbers", "invoice_counter", "payment_status", "locks", "utang", "gaji", "backup_history", "linen_pelanggan"];
    const allData = {};
    for (const table of tables) { const { data } = await db.from(table).select("*"); allData[table] = data; }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pelangi_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast("Data berhasil diexport.", "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

function importDataViaFile() { document.getElementById("fileImportInput").click(); }
async function handleFileImport(input) {
  const file = input.files[0]; const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target.result);
      let syncCount = 0;
      toast("Memulai sinkronisasi ke Supabase...", "info", 2000);
      // Format exportAllData (langsung tabel Supabase)
      if (!json.data && (json.nota || json.pelanggan || json.biaya)) {
        for (const [table, rows] of Object.entries(json)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;
          const { error } = await db.from(table).upsert(rows);
          if (error) console.error(`Gagal upsert ${table}:`, error);
          else syncCount += rows.length;
        }
      } else if (json.data) {
        // Format backupBulan (DB_XXX keys) → transform ke Supabase
        const mapTable = {
          DB_NOTA: "nota", DB_BIAYA: "biaya", DB_KARYAWAN: "karyawan",
          DB_ABSENSI: "absensi", DB_GAJI: "gaji", DB_PENGATURAN: "pengaturan",
          DB_JENIS_NOTA: "jenis_nota", DB_PELANGGAN: "pelanggan",
          DB_MASTER_LINEN: "master_linen", DB_HARGA_PELANGGAN: "harga_pelanggan",
          DB_KOP: "kop", DB_UTANG: "utang", DB_LOCKS: "locks",
          DB_PAYMENT_STATUS: "payment_status", DB_INVOICE_NUMBERS: "invoice_numbers",
          DB_INVOICE_COUNTER: "invoice_counter", DB_BACKUP_HISTORY: "backup_history",
          DB_LINEN_PELANGGAN: "linen_pelanggan"
        };
        for (const [key, value] of Object.entries(json.data)) {
          const table = mapTable[key]; if (!table) continue;
          let rows = [];
          if (Array.isArray(value)) rows = value;
          else if (typeof value === "object" && value !== null) rows = [value];
          if (rows.length === 0) continue;
          let supabaseRows = [];
          if (table === "pelanggan") {
            supabaseRows = rows.map((r) => ({ id: r.id, nama: r.name, kode: r.kode, tipe: r.type, billing_system: r.billingSystem, flat_rate: r.flatRate, tarif_rs: r.tarifRS, alamat: r.alamat, kota: r.kota }));
          } else if (table === "jenis_nota") {
            supabaseRows = rows.map((r) => ({ name: r.name, multiplier: r.multiplier, for_flat: r.forFlat, for_reguler: r.forReguler }));
          } else if (table === "master_linen") {
            supabaseRows = rows.map((r) => ({ id: r.id, name: r.name }));
          } else if (table === "karyawan") {
            supabaseRows = rows.map((r) => ({ id: r.id, nama: r.nama, bagian: r.bagian, persentase: r.persentase }));
          } else if (table === "nota") {
            supabaseRows = rows.map((r) => ({ id: r.id, nota_id: r.notaId || r.nota_id, tanggal: r.tanggal, pelanggan_id: r.pelanggan_id, jenis: r.jenis, total: r.total, items: r.items }));
          } else if (table === "absensi") {
            supabaseRows = rows.map((r) => ({ tanggal: r.tanggal, karyawan_id: r.karyawanId, status: r.status }));
          } else if (table === "harga_pelanggan") {
            supabaseRows = [];
            Object.entries(value).forEach(([pid, map]) => {
              Object.entries(map).forEach(([lid, harga]) => { supabaseRows.push({ pelanggan_id: parseInt(pid), linen_id: parseInt(lid), harga }); });
            });
          } else if (table === "pengaturan") {
            supabaseRows = [{ id: 1, tarif_internal_hotel: value.tarifInternalHotel, ongkos_per_kg: value.ongkosPerKg, rekening_name: value.rekeningName, rekening_no: value.rekeningNo, bank: value.bank, direktur: value.direktur, peralatan: value.peralatan }];
          } else if (table === "kop") {
            supabaseRows = [{ id: 1, nama: value.nama, alamat: value.alamat, telepon: value.telepon, email: value.email, kontak: value.kontak }];
          } else if (table === "utang") {
            supabaseRows = rows.map((r) => ({ id: r.id, nama: r.nama, dari: r.dari, sampai: r.sampai, cicilan: r.cicilan, keterangan: r.keterangan, sisa_bulan: r.sisaBulan, status: r.status }));
          } else if (table === "locks") {
            supabaseRows = Object.entries(value).map(([k, v]) => ({ key: k, is_locked: v }));
          } else if (table === "payment_status") {
            supabaseRows = Object.entries(value).map(([k, v]) => ({ key: k, is_paid: v }));
          } else if (table === "linen_pelanggan") {
            supabaseRows = [];
            Object.entries(value).forEach(([pid, list]) => {
              if (Array.isArray(list)) {
                list.forEach((item) => {
                  supabaseRows.push({ pelanggan_id: parseInt(pid), linen_id: item.linenId, urutan: item.urutan });
                });
              }
            });
          } else if (table === "invoice_numbers") {
            supabaseRows = Object.entries(value).map(([k, v]) => ({ cache_key: k, nomor: v }));
          } else if (table === "invoice_counter") {
            supabaseRows = Object.entries(value).map(([k, v]) => ({ counter_key: k, nilai: v }));
          } else if (table === "backup_history") {
            supabaseRows = rows.map((b) => ({ bulan: b }));
          } else {
            supabaseRows = rows;
          }
          if (supabaseRows.length > 0) {
            const { error } = await db.from(table).upsert(supabaseRows);
            if (error) console.error(`Gagal upsert ${table}:`, error);
            else syncCount += supabaseRows.length;
          }
        }
      }
      if (json.data) {
        Object.entries(json.data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      }
      toast(`Import selesai. ${syncCount} baris disinkronkan ke Supabase.`, "success");
      setTimeout(() => location.reload(), 1500);
    } catch (err) { console.error(err); toast("File tidak valid atau gagal sync!", "error"); }
  };
  reader.readAsText(file);
}
async function bersihkanNotaRusak() {
  try {
    const { data: notaData, error } = await db.from("nota").select("*");
    if (error) throw error;
    const rusak = (notaData || []).filter((n) => !n.items || (Array.isArray(n.items) && n.items.length === 0));
    if (rusak.length > 0) {
      for (const n of rusak) { await db.from("nota").delete().eq("id", n.id); }
      toast(`${rusak.length} nota rusak dihapus dari Supabase.`, "success");
    } else { toast("Tidak ada nota rusak.", "info"); }
    // FIX: Renamed 'db' to 'localNota' to avoid shadowing the global Supabase client variable
    let localNota = JSON.parse(localStorage.getItem("DB_NOTA")) || [];
    localNota = localNota.filter((n) => n.notaId && n.items && n.items.length > 0);
    localStorage.setItem("DB_NOTA", JSON.stringify(localNota));
    await cariNotaSistem();
  } catch (err) { console.error(err); toast("Gagal membersihkan nota rusak.", "error"); }
}

function cekPeringatanBackup() {
  const dbNota = JSON.parse(localStorage.getItem("DB_NOTA")) || []; if (dbNota.length === 0) return;
  const history = getBackupHistory(); const today = new Date(); const currentMonth = today.toISOString().substring(0, 7); let oldestUnbacked = null;
  for (const nota of dbNota) {
    if (!nota.tanggal) continue; const bln = nota.tanggal.substring(0, 7);
    if (bln < currentMonth && !history.includes(bln)) { oldestUnbacked = bln; break; }
  }
  if (oldestUnbacked) { toast(`⚠️ Transaksi bulan ${oldestUnbacked} belum di-backup!`, "warning", 6000); }
}

function getUtangList() { return JSON.parse(localStorage.getItem("DB_UTANG")) || []; }
function saveUtangList(list) { localStorage.setItem("DB_UTANG", JSON.stringify(list)); }

async function simpanUtang() {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const nama = document.getElementById("utangNama").value.trim(); const dari = document.getElementById("utangDari").value; const sampai = document.getElementById("utangSampai").value; const cicilan = parseCurrencyValue(document.getElementById("utangCicilan").value); const keterangan = document.getElementById("utangKeterangan").value.trim();
    if (!nama || !dari || !sampai || cicilan <= 0) { toast("Lengkapi semua data dengan benar!", "warning"); return; }
    if (sampai < dari) { toast("Bulan selesai tidak boleh lebih kecil dari bulan mulai!", "warning"); return; }
    const [thn1, bln1] = dari.split("-").map(Number); const [thn2, bln2] = sampai.split("-").map(Number); const totalBulan = (thn2 - thn1) * 12 + (bln2 - bln1) + 1;
    const { error } = await db.from("utang").insert([{ nama, dari, sampai, cicilan, keterangan, sisa_bulan: totalBulan, status: "AKTIF" }]);
    if (error) { console.error("Gagal menyimpan utang:", error); toast("Gagal menyimpan utang.", "error"); return; }
    await refreshDataSistem(); toast("Utang berhasil dicatat!"); document.getElementById("utangNama").value = ""; document.getElementById("utangCicilan").value = ""; document.getElementById("utangKeterangan").value = "";
  } finally {
    setBtnLoading(btn, false);
  }
}

function renderDaftarUtang() {
  const utangList = getUtangList(); const tbody = document.getElementById("tabelDaftarUtang"); if (!tbody) return;
  if (utangList.length === 0) { tbody.innerHTML = emptyRowHTML(7, "Belum ada utang tercatat. Tambahkan utang baru di atas."); return; }
  // SMART SEARCH: filter by nama / keterangan
  const q = (document.getElementById("cariUtang")?.value || "").toLowerCase().trim();
  let list = utangList;
  if (q) {
    list = utangList.filter((u) =>
      (u.nama || "").toLowerCase().includes(q) ||
      (u.keterangan || "").toLowerCase().includes(q)
    );
  }
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:0;border:0;">
      <div class="info-box warning" style="margin:0;border-radius:0;">
        <span>🔍</span><span>Tidak ada utang cocok dengan "<strong>${q}</strong>". <button class="btn-link" onclick="clearCariUtang()">Tampilkan semua</button></span>
      </div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((u) => {
    const sisaTotal = u.sisaBulan * u.cicilan;
    const statusBadge = u.status === "LUNAS" ? '<span class="badge-status status-paid">LUNAS</span>' : '<span class="badge-status status-unpaid">AKTIF</span>';
    const bayarBtn = u.status === "AKTIF" ? `<button class="btn-sm btn-secondary" onclick="bayarCicilan(${u.id})">💸 Bayar Cicilan</button>` : "";
    return `<tr>
      <td data-label="Nama"><strong>${u.nama}</strong>${u.keterangan ? `<br><small>${u.keterangan}</small>` : ""}</td>
      <td data-label="Periode">${u.dari} s/d ${u.sampai}</td>
      <td data-label="Cicilan/Bulan">${fmtRp(u.cicilan)}</td>
      <td data-label="Sisa Bulan">${u.sisaBulan} bulan</td>
      <td data-label="Sisa Total">${fmtRp(sisaTotal)}</td>
      <td data-label="Status">${statusBadge}</td>
      <td data-label="Aksi" data-full-width>${bayarBtn}</td>
    </tr>`;
  }).join("");
}

async function bayarCicilan(id) {
  const btn = event?.target?.closest('button');
  setBtnLoading(btn, true);
  try {
    const { data: utangList } = await db.from("utang").select("*").eq("id", id);
    if (!utangList || utangList.length === 0) return; const utang = utangList[0]; if (utang.status === "LUNAS") return;
    if (!await window.customConfirm(`Bayar cicilan untuk "${utang.nama}" sebesar ${fmtRp(utang.cicilan)}?`)) return;
    const { error: biayaError } = await db.from("biaya").insert([{ tanggal: new Date().toISOString().split("T")[0], kategori: "CICILAN UTANG", nominal: utang.cicilan, lunas: true, keterangan: `Cicilan: ${utang.nama}` }]);
    if (biayaError) { console.error("Gagal mencatat biaya cicilan:", biayaError); toast("Gagal mencatat biaya cicilan.", "error"); return; }
    const sisaBaru = utang.sisa_bulan - 1; const statusBaru = sisaBaru <= 0 ? "LUNAS" : "AKTIF";
    const { error: updateError } = await db.from("utang").update({ sisa_bulan: Math.max(0, sisaBaru), status: statusBaru }).eq("id", id);
    if (updateError) { console.error("Gagal mengupdate utang:", updateError); toast("Gagal mengupdate utang.", "error"); return; }
    await refreshDataSistem(); await hitungMenejemenKeuangan(); toast("Cicilan dibayar & tercatat di pengeluaran.", "success");
  } finally {
    setBtnLoading(btn, false);
  }
}

function hitungTotalUtang() {
  const utangList = getUtangList(); let total = 0;
  utangList.forEach((u) => { if (u.status === "AKTIF") { total += u.sisaBulan * u.cicilan; } });
  const el = document.getElementById("boxTotalUtang"); if (el) el.innerText = fmtRp(total);
}

const TAB_CATEGORIES = {
  transaksi: { label: "TRANSAKSI", tabs: [["tab-nota", "📝 Input Nota"], ["tab-rekap", "🔍 Riwayat Nota"]] },
  tagihan: { label: "TAGIHAN", tabs: [["tab-invoice", "🧾 Invoice"], ["tab-kuitansi", "📄 Kuitansi"]] },
  keuangan: { label: "KEUANGAN", tabs: [["tab-omset", "📊 Dashboard"], ["tab-laporan", "📋 Laporan"], ["tab-utang", "📉 Utang"], ["tab-gaji", "💵 Gaji"]] },
  sistem: { label: "SISTEM", tabs: [["tab-master", "🛠️ Master Data"], ["tab-absen", "📅 Absensi"], ["tab-backup", "💾 Backup"]] },
};

function switchCategory(cat) {
  // FIX: update aria-selected + active state, render subtabs dengan aria
  document.querySelectorAll(".cat-btn").forEach((b) => {
    const isActive = b.dataset.cat === cat;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  const info = TAB_CATEGORIES[cat]; if (!info) return;
  const sub = document.getElementById("navSubtabs");
  sub.innerHTML = `<span class="group-label">${info.label}:</span>` + info.tabs.map((t) =>
    `<button class="tab-btn" role="tab" aria-selected="false" aria-controls="${t[0]}" onclick="switchTab('${t[0]}')">${t[1]}</button>`
  ).join("");
  switchTab(info.tabs[0][0]);
}

async function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((el) => (el.style.display = "none"));
  const activeTab = document.getElementById(tabId); if (activeTab) activeTab.style.display = "block";
  // FIX: update aria-selected + active state untuk semua tab-btn
  document.querySelectorAll(".tab-btn").forEach((b) => {
    const isActive = b.getAttribute("onclick") === `switchTab('${tabId}')`;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  if (tabId === "tab-rekap") { await cariNotaSistem(); updateCariPelangganClearBtn(); }
  if (tabId === "tab-gaji") tampilkanListGajiBaru();
  if (tabId === "tab-omset") { await hitungMenejemenKeuangan(); updateFilterExpClearBtns(); }
  if (tabId === "tab-utang") { renderDaftarUtang(); updateCariUtangClearBtn(); }
  if (tabId === "tab-absen") renderAbsensiTable();
  if (tabId === "tab-backup") renderBackupStatus();
  if (tabId === "tab-laporan") { await tampilkanLaporan(); }
  if (tabId === "tab-master") {
    renderDaftarPelanggan(); renderMasterLinenTable(); renderMasterJenisNotaTable();
    updateCariPelangganMasterClearBtn();
  }
  setupFAB(tabId);
}

/* ============================================================
   FAB Management — Primary CTA per tab (mobile thumb-reach only)
   Pola: 1 primary action per tab, floating, accessible.
   Tab tanpa primary action yang jelas → FAB di-hidden (jangan dipaksa).
   ============================================================ */
const FAB_CONFIG = {
  "tab-nota":     { icon: "✓", label: "Simpan",            onclick: "simpanNotaSistem()",         variant: "success" },
  "tab-rekap":    { icon: "🔍", label: "Cari",              onclick: "cariNotaSistem()",            variant: "primary" },
  "tab-invoice":  { icon: "🖱️", label: "Hitung Invoice",    onclick: "hitungDanAmbilInvoice()",     variant: "primary" },
  "tab-kuitansi": { icon: "🖨️", label: "Cetak Kuitansi",    onclick: "generateKuitansi()",          variant: "success" },
  "tab-omset":    { icon: "💸", label: "Catat Pengeluaran", onclick: "focusInputPengeluaran()",     variant: "danger" },
  "tab-utang":    { icon: "✓", label: "Simpan Utang",       onclick: "simpanUtang()",               variant: "success" },
  "tab-master":   { icon: "👤", label: "Tambah Pelanggan",  onclick: "focusInputPelangganBaru()",   variant: "success" },
  "tab-absen":    { icon: "💾", label: "Simpan Absensi",    onclick: "simpanAbsensi()",             variant: "success" },
  "tab-backup":   { icon: "📤", label: "Export Semua",      onclick: "exportAllData()",             variant: "success" },
  // tab-laporan & tab-gaji: tidak ada primary CTA tunggal yang cocok → FAB di-hidden (jangan dipaksa)
};
function setupFAB(tabId) {
  const fab = document.getElementById("globalFab");
  if (!fab) return;
  const cfg = FAB_CONFIG[tabId];
  if (!cfg) { fab.style.display = "none"; return; }
  document.getElementById("fabIcon").textContent = cfg.icon;
  document.getElementById("fabLabel").textContent = cfg.label;
  fab.className = `fab no-print fab-${cfg.variant}`;
  fab.onclick = () => { try { window.eval(cfg.onclick); } catch (e) { console.error("FAB onclick error:", e); } };
  fab.style.display = "flex";
}
function focusInputPengeluaran() {
  const el = document.getElementById("expNominal");
  if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
}
function focusInputPelangganBaru() {
  const el = document.getElementById("newPelangganName");
  if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
}

/* ============================================================
   SMART SEARCH PATTERN — ganti tombol "Semua" dengan inline clear (×)
   Pola: input oninput → auto-filter; × → clear & re-render.
   Logika bisnis cariNotaSistem() TIDAK berubah — tetap handle
   "input kosong = tampilkan semua".
   ============================================================ */

/* --- Riwayat Nota: Pelanggan search + clear --- */
function onCariPelangganInput() {
  updateCariPelangganClearBtn();
  cariNotaSistem();
}
function updateCariPelangganClearBtn() {
  const input = document.getElementById("cariPelanggan");
  const clearBtn = document.getElementById("cariPelangganClear");
  if (!input || !clearBtn) return;
  if (input.value.trim() !== "") clearBtn.classList.add("visible");
  else clearBtn.classList.remove("visible");
}
function clearCariPelanggan() {
  const input = document.getElementById("cariPelanggan");
  if (input) input.value = "";
  updateCariPelangganClearBtn();
  cariNotaSistem();
}

/* --- Daftar Pelanggan: search + clear --- */
function onCariPelangganMasterInput() {
  updateCariPelangganMasterClearBtn();
  renderDaftarPelanggan();
}
function updateCariPelangganMasterClearBtn() {
  const input = document.getElementById("cariPelangganMaster");
  const clearBtn = document.getElementById("cariPelangganMasterClear");
  if (!input || !clearBtn) return;
  if (input.value.trim() !== "") clearBtn.classList.add("visible");
  else clearBtn.classList.remove("visible");
}
function clearCariPelangganMaster() {
  const input = document.getElementById("cariPelangganMaster");
  if (input) input.value = "";
  updateCariPelangganMasterClearBtn();
  renderDaftarPelanggan();
}

/* --- Daftar Utang: search + clear --- */
function onCariUtangInput() {
  updateCariUtangClearBtn();
  renderDaftarUtang();
}
function updateCariUtangClearBtn() {
  const input = document.getElementById("cariUtang");
  const clearBtn = document.getElementById("cariUtangClear");
  if (!input || !clearBtn) return;
  if (input.value.trim() !== "") clearBtn.classList.add("visible");
  else clearBtn.classList.remove("visible");
}
function clearCariUtang() {
  const input = document.getElementById("cariUtang");
  if (input) input.value = "";
  updateCariUtangClearBtn();
  renderDaftarUtang();
}

/* --- Riwayat Pengeluaran: auto-filter on change + inline clear per field --- */
function onFilterExpInput() {
  updateFilterExpClearBtns();
  hitungMenejemenKeuangan();
}
function updateFilterExpClearBtns() {
  const fields = [
    { id: "filterExpMulai",   clearId: "filterExpMulaiClear" },
    { id: "filterExpSelesai", clearId: "filterExpSelesaiClear" },
    { id: "filterExpKat",     clearId: "filterExpKatClear" },
  ];
  fields.forEach((f) => {
    const el = document.getElementById(f.id);
    const btn = document.getElementById(f.clearId);
    if (!el || !btn) return;
    if (el.value && el.value.trim() !== "") btn.classList.add("visible");
    else btn.classList.remove("visible");
  });
}
function clearFilterExpField(field) {
  if (field === "mulai")   document.getElementById("filterExpMulai").value = "";
  if (field === "selesai") document.getElementById("filterExpSelesai").value = "";
  if (field === "kat")     document.getElementById("filterExpKat").value = "";
  updateFilterExpClearBtns();
  hitungMenejemenKeuangan();
}

/* ============================================================
   INFO-BOX EMPTY STATE — render pesan kosong yang lebih ramah
   ============================================================ */
function emptyRowHTML(colspan, message, variant = "info") {
  return `<tr><td colspan="${colspan}" style="padding:0;border:0;">
    <div class="info-box ${variant === "info" ? "" : variant}" style="margin:0;border-radius:0;">
      <span>ℹ️</span><span>${message}</span>
    </div>
  </td></tr>`;
}

function tutupModal(id) { document.getElementById(id).style.display = "none"; }
document.querySelectorAll(".modal").forEach((m) => { m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; }); });
