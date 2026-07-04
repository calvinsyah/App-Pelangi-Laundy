# Option A Preview — Bottom Navigation + Card Tables + Sticky Action Bar

## 1. Bottom Navigation Bar (Mobile ≤768px)

```
┌─────────────────────────────────────────┐
│  🌈 PELANGI LAUNDRY              [👤ADMIN]│  ← Sticky header (existing)
├─────────────────────────────────────────┤
│                                         │
│     TAB CONTENT AREA                    │
│     (scrollable)                        │
│                                         │
│  ┌─────────────────────────────────┐    │  ← Sticky Action Bar (forms only)
│  │ [  batal  ]  [ ✓ Simpan ]       │    │     Full-width stacked on mobile
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  🏠  🧾  💰  ⚙️  👤   ← BOTTOM NAV BAR  │  ← FIXED, always visible
│  Trans Tag  Keu  Sys  Pro              │     5 slots, 48×48px min, labels 11px
└─────────────────────────────────────────┘
```

**CSS Variables:**
```css
:root {
  --nav-height: 64px;
  --nav-item-min: 48px;
  --nav-label-size: 11px;
  --nav-icon-size: 22px;
  --action-bar-height: 60px;
}
```

**HTML Structure:**
```html
<!-- Mobile only: bottom nav -->
<nav class="bottom-nav no-print" id="bottomNav" aria-label="Navigasi utama">
  <a href="#tab-transaksi" class="nav-item active" data-tab="transaksi" role="tab" aria-selected="true">
    <span class="nav-icon">🏠</span>
    <span class="nav-label">Transaksi</span>
  </a>
  <a href="#tab-tagihan" class="nav-item admin-only" data-tab="tagihan" role="tab">
    <span class="nav-icon">🧾</span>
    <span class="nav-label">Tagihan</span>
  </a>
  <a href="#tab-keuangan" class="nav-item admin-only" data-tab="keuangan" role="tab">
    <span class="nav-icon">💰</span>
    <span class="nav-label">Keuangan</span>
  </a>
  <a href="#tab-sistem" class="nav-item admin-only" data-tab="sistem" role="tab">
    <span class="nav-icon">⚙️</span>
    <span class="nav-label">Sistem</span>
  </a>
  <a href="#tab-profil" class="nav-item" data-tab="profil" role="tab">
    <span class="nav-icon">�">👤</span>
    <span class="nav-label">Profil</span>
  </a>
</nav>
```

**Desktop (≥768px):** `.bottom-nav { display: none; }` — existing top tabs remain.

---

## 2. Segmented Sub-Tab (Inside Each Tab)

```
┌─────────────────────────────────────────┐
│  📝 Input Transaksi Baru                │  ← Card title
├─────────────────────────────────────────┤
│  [ 📝 Input    ] [ 🔍 Riwayat ]         │  ← Segmented control
│   (active)       (inactive)              │     Full-width, 48px height
├─────────────────────────────────────────┤
│  Form fields...                         │
│  ...                                    │
├─────────────────────────────────────────┤
│  [  batal  ]  [ ✓ Simpan ]              │  ← Sticky Action Bar
└─────────────────────────────────────────┘
```

**CSS:**
```css
.segmented {
  display: flex;
  gap: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 2px;
  margin-bottom: 16px;
}
.segmented button {
  flex: 1;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--text-light);
  font-weight: 600;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.15s;
}
.segmented button[aria-selected="true"] {
  background: var(--card);
  color: var(--primary);
  box-shadow: var(--shadow);
}
```

---

## 3. Card Table Layout (Mobile ≤640px)

**Before (Current):**
```
┌────┬─────────────┬──────────┬────────┐
│ #  │ Nama Linen  │ Harga    │ Jumlah │
├────┼─────────────┼──────────┼────────┤
│ 1  │ Sheet King  │ Rp 5.000 │ [  0 ] │  ← Horizontal scroll needed
│ 2  │ Pillowcase  │ Rp 3.000 │ [  0 ] │
│ 3  │ Towel Bath  │ Rp 8.000 │ [  0 ] │
└────┴─────────────┴──────────┴────────┘
```

**After (Card List):**
```
┌─────────────────────────────────────────┐
│  1. Sheet King                    #1    │
│  ─────────────────────────────────      │
│  Harga:     Rp 5.000                    │
│  Jumlah:    [  0 ]  ← input full-width  │
├─────────────────────────────────────────┤
│  2. Pillowcase                    #2    │
│  ─────────────────────────────────      │
│  Harga:     Rp 3.000                    │
│  Jumlah:    [  0 ]                      │
├─────────────────────────────────────────┤
│  3. Towel Bath                      #3  │
│  ─────────────────────────────────      │
│  Harga:     Rp 8.000                    │
│  Jumlah:    [  0 ]                      │
└─────────────────────────────────────────┘
```

**Implementation (JS injects `data-label`):**
```js
function renderFormLinenInput() {
  // ... existing logic ...
  linenList.forEach((entry, idx) => {
    const item = masterLinen.find(m => m.id === entry.linenId);
    if (!item) return;
    const harga = getHargaPerPelanggan(pelId, item.id, mult);
    tbody.innerHTML += `
      <tr>
        <td data-label="#">${idx + 1}</td>
        <td data-label="Nama Linen"><strong>${item.name}</strong></td>
        <td data-label="Harga Satuan">${fmtRp(harga)}</td>
        <td data-label="Jumlah" style="text-align:center">
          <input type="number" class="input-qty linen-item-qty" 
                 data-id="${item.id}" data-name="${item.name}" 
                 data-price="${harga}" value="0" min="0"
                 style="width:100%; padding:12px; font-size:16px;">
        </td>
      </tr>
    `;
  });
}
```

**CSS (Mobile Card Flip):**
```css
@media (max-width: 640px) {
  .linen-table { display: block; }
  .linen-table thead { display: none; }
  .linen-table tbody { display: block; }
  .linen-table tr {
    display: block;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 12px;
    padding: 12px 16px;
    box-shadow: var(--shadow);
  }
  .linen-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed var(--border);
    font-size: 15px;
  }
  .linen-table td:last-child { border-bottom: none; }
  .linen-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-light);
    font-size: 13px;
    min-width: 80px;
  }
  .linen-table .input-qty {
    width: 100%;
    max-width: 120px;
    padding: 12px;
    font-size: 16px;  /* prevents iOS zoom */
    text-align: center;
  }
}
```

---

## 4. Bottom Sheet Modal (Mobile)

```
┌─────────────────────────────────────────┐
│  Page content (dimmed, scroll locked)   │
│  ─────────────────────────────────────  │
│  ┌───────────────────────────────────┐  │  ← Backdrop tap = close
│  │  📋 Atur Linen per Jenis Nota  ≡  │  │  ← Drag handle (visual)
│  ├───────────────────────────────────┤  │
│  │  Jenis Nota  ▼ [REGULER       ]   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ ☑ Sheet King        ①     │  │  │
│  │  │ ☑ Pillowcase        ②     │  │  │  ← Scrollable content
│  │  │ ☐ Towel Bath                │  │  │     max-height 75vh
│  │  │ ☐ Blanket                 │  │  │
│  │  └─────────────────────────────┘  │  │
│  ├───────────────────────────────────┤  │
│  │        [ 💾 Simpan ]              │  │  ← Sticky footer in sheet
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**CSS:**
```css
@media (max-width: 640px) {
  .modal { 
    align-items: flex-end; 
    padding: 0; 
  }
  .modal-content {
    width: 100%;
    max-width: 100%;
    max-height: 85vh;
    border-radius: 16px 16px 0 0;
    animation: slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .close-modal { display: none; }  /* swipe/backdrop to dismiss */
  .modal-content::before {
    content: '';
    display: block;
    width: 40px; height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 8px auto 16px;
  }
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* Swipe down to dismiss - JS handles */
.modal-content.swipe-dismiss { transition: transform 0.2s ease; }
```

**JS Swipe Dismiss (lightweight):**
```js
let swipeStartY = 0;
document.querySelectorAll('.modal-content').forEach(el => {
  el.addEventListener('touchstart', e => { swipeStartY = e.touches[0].clientY; }, {passive: true});
  el.addEventListener('touchmove', e => {
    const delta = e.touches[0].clientY - swipeStartY;
    if (delta > 0) {
      el.style.transform = `translateY(${Math.min(delta, 100)}px)`;
      el.style.transition = 'none';
    }
  }, {passive: true});
  el.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientY - swipeStartY;
    el.style.transition = 'transform 0.2s ease';
    if (delta > 80) {
      el.style.transform = 'translateY(100%)';
      setTimeout(() => tutupModal(el.closest('.modal').id), 200);
    } else {
      el.style.transform = 'translateY(0)';
    }
  });
});
```

---

## 5. Sticky Action Bar (Forms)

```
┌─────────────────────────────────────────┐
│  Form fields...                         │
│  ...                                    │
│  ─────────────────────────────────────  │  ← Gradient fade hint
│  [  batal  ]  [ ✓ Simpan Transaksi ]    │  ← Sticky, z-index 50
└─────────────────────────────────────────┘
```

**CSS:**
```css
.form-sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 50;
  background: linear-gradient(to top, var(--card) 85%, transparent);
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  border-top: 1px solid var(--border);
  box-shadow: 0 -2px 8px rgba(0,0,0,.05);
}
.form-sticky-footer .btn { flex: 1; min-height: 48px; font-size: 16px; }

@media (min-width: 641px) {
  .form-sticky-footer {
    position: static;
    background: none;
    padding: 0;
    box-shadow: none;
    border-top: none;
    justify-content: flex-end;
  }
  .form-sticky-footer .btn { flex: none; min-width: 140px; }
}
```

**HTML (wrap existing save button):**
```html
<div class="form-sticky-footer no-print">
  <button class="btn btn-secondary" onclick="tutupModal('modalAturLinenJenisNota')">Batal</button>
  <button id="btnSimpanLinenConfig" class="btn btn-success" onclick="simpanLinenConfigJenisNota()">💾 Simpan</button>
</div>
```

---

## 6. Touch Target & Typography Audit (All Breakpoints)

| Element | Current | Option A Target | CSS Fix |
|---------|---------|-----------------|---------|
| `.btn` | 11px pad, 15px font | **48×48px, 16px** | `min-height:48px; font-size:16px; padding:12px 20px` |
| `.btn-sm` | 6px pad, 13px font | **44×44px, 14px** | `min-height:44px; font-size:14px; padding:10px 16px` |
| `.close-modal` | 24×24px | **44×44px** | Already: `min-width:44px; min-height:44px` ✅ |
| `select`, `input` | 10px pad, 15px font | **48px, 16px** | `min-height:48px; font-size:16px; padding:12px 14px` |
| `.tab-btn`, `.cat-btn` | 9px/8px pad | **48px, 15px** | `min-height:48px; padding:12px 16px; font-size:15px` |
| Base font | 15px | **16px** | `html { font-size: 16px; }` |
| Label font | 14px | **15px** | `label { font-size: 15px; }` |
| Badge font | 11-12px | **13px** | `.badge-status { font-size: 13px; padding: 6px 14px; }` |

**Safe Area Insets (iOS):**
```css
@supports (padding: max(0px)) {
  .bottom-nav { padding-bottom: max(8px, env(safe-area-inset-bottom)); }
  .form-sticky-footer { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
  .modal-content { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
}
```

---

## 7. Print Styles (No Changes to Existing)

```css
@media print {
  .bottom-nav,
  .form-sticky-footer,
  .modal:not(#customConfirmModal),
  .no-print,
  header,
  .nav-tabs { display: none !important; }
  .modal-content { max-height: none; box-shadow: none; border: none; }
  body { padding-bottom: 0; }
}
```

---

## 8. Responsive Breakpoint Strategy

| Breakpoint | Nav | Tables | Modals | Forms |
|------------|-----|--------|--------|-------|
| **≤480px** | Bottom nav 5 items, labels 10px | Card list | Bottom sheet 90vh | Sticky footer stacked |
| **481-640px** | Bottom nav 5 items, labels 11px | Card list | Bottom sheet 85vh | Sticky footer stacked |
| **641-768px** | Bottom nav 5 items, labels 11px | Table + sticky col | Center modal 750px | Sticky footer inline |
| **769-1024px** | **Top tabs (current)** | Table | Center modal | Inline |
| **≥1025px** | **Top tabs (current)** | Table | Center modal | Inline |

**Media Queries:**
```css
/* Mobile first - bottom nav default */
.bottom-nav { display: flex; }
.nav-tabs { display: none; }

@media (min-width: 769px) {
  .bottom-nav { display: none; }
  .nav-tabs { display: flex; }
  .segmented { max-width: 300px; }
  .form-sticky-footer { position: static; }
  .modal { align-items: center; }
  .modal-content { max-width: 750px; border-radius: 14px; }
  .close-modal { display: flex; }
}
```

---

## 9. Migration Checklist (Implementation Order)

| Phase | Files | Tasks |
|-------|-------|-------|
| **1. Foundation** | `style.css`, `index.html` | CSS vars, bottom nav HTML, media queries |
| **2. Segmented** | `index.html`, `script.js` | Replace `.nav-subtabs` with segmented control per tab |
| **3. Card Tables** | `script.js` (render functions) | Inject `data-label`, wrap tables in responsive container |
| **4. Bottom Sheets** | `style.css`, `script.js` | Modal responsive + swipe dismiss JS |
| **5. Sticky Footers** | `index.html` (forms) | Wrap save/cancel in `.form-sticky-footer` |
| **6. Touch/Type Audit** | `style.css` | Global min-height, font-size, safe-area |
| **7. QA** | - | Test 360px, 375px, 414px, 768px, 1024px, print |

---

## 10. Visual Summary — Key Screens Mobile

### Home / Transaksi Tab
```
┌─────────────────────────────────────────┐
│ 🌈 PELANGI LAUNDRY               [ADMIN]│
├─────────────────────────────────────────┤
│  [ 📝 Input ] [ 🔍 Riwayat ]            │  ← Segmented
├─────────────────────────────────────────┤
│  Tanggal: [ 2025-01-15 ▼ ]              │
│  Pelanggan: [ Hotel Grand ▼ ]           │
│  Jenis Nota: [ REGULER ▼ ]              │
├─────────────────────────────────────────┤
│  1. Sheet King                      #1  │
│  Harga:    Rp 5.000                     │
│  Jumlah:   [  0 ]                       │
│  ─────────────────────────────────      │
│  2. Pillowcase                      #2  │
│  Harga:    Rp 3.000                     │
│  Jumlah:   [  0 ]                       │
├─────────────────────────────────────────┤
│  [  batal  ]  [ ✓ Simpan Transaksi ]    │  ← Sticky
├─────────────────────────────────────────┤
│  🏠  🧾  💰  ⚙️  👤                      │  ← Bottom nav
└─────────────────────────────────────────┘
```

### Master Data → Atur Linen (Bottom Sheet)
```
┌─────────────────────────────────────────┐
│  Content dimmed...                      │
│  ┌───────────────────────────────────┐  │
│  │  📋 Atur Linen per Jenis Nota  ≡  │  │
│  │  Jenis Nota: [ REGULER ▼ ]        │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ ☑ Sheet King           ①  │  │  │
│  │  │ ☑ Pillowcase           ②  │  │  │
│  │  │ ☐ Towel Bath                │  │  │
│  │  │ ☐ Blanket                   │  │  │
│  │  └─────────────────────────────┘  │  │
│  ├───────────────────────────────────┤  │
│  │       [ 💾 Simpan ]               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## ❓ Clarification Needed Before Implementation

1. **Sub-tab labels** — Keep emoji + text (`📝 Input Nota`) or shorten mobile (`📝 Input`)?
2. **Bottom nav "Profil"** — Contents: Role badge, Logout, Versi app, Theme toggle?
3. **Admin-only tabs** — Hide bottom nav items for non-admin (CSS `.admin-only { display: none }` toggled by JS)?
4. **Riwayat Nota table** — Also card flip? (6 columns: No Nota, Tanggal, Pelanggan, Jenis, Total, Aksi)
5. **Invoice/Kuitansi tables** — Same card treatment?
6. **Phase priority** — Nav shell first, then tables, then modals?

---

**Ready to proceed with Phase 1 (Foundation + Nav Shell) when you confirm.**