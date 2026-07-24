# Pengujian & Quality Assurance - Pelangi Laundry

## 1. Stack Pengujian
- **Pengujian Unit & Komponen:** Vitest 4.1 + React Testing Library 16.3 + JSDOM.
- **Pengujian End-to-End (E2E):** Playwright 1.61.

## 2. Peta Direktori File Pengujian

```
pelangi-laundry-app/
├── src/
│   └── lib/
│       └── utils.test.ts          # Pengujian unit fungsi helper & format
└── tests/                         # File spesifikasi pengujian E2E Playwright
    ├── e2e-crud-nota.spec.ts      # Pengujian E2E pembuatan, ubah, hapus nota
    ├── e2e-manual-goals.spec.ts   # Pengujian E2E target manual & update status
    ├── e2e-regression.spec.ts     # Pengujian regresi umum sistem
    ├── e2e-tabs.spec.ts           # Pengujian integritas tab navigasi & rute
    └── e2e-tagihan.spec.ts        # Pengujian E2E Tagihan, Kwitansi, & RS Range Kustom
```

## 3. Menjalankan Pengujian Unit

Eksekusi Vitest test runner:

```bash
# Jalankan seluruh pengujian unit sekali
npm run test

# Jalankan pengujian unit dalam mode watch
npx vitest
```

Cakupan pengujian unit mencakup fungsi `terbilang()`, `fmtRp()`, `toRoman()`, `generateKodePelanggan()`, `escapeHtml()`, dan `parseCurrencyValue()`.

## 4. Menjalankan Pengujian End-to-End (E2E) Playwright

Pastikan server pengembang lokal atau lingkungan target telah aktif sebelum menjalankan pengujian E2E:

```bash
# Atur kredensial pengujian pada .env
TEST_EMAIL="admin@pelangilaundry.com"
TEST_PASSWORD="secretpassword"

# Jalankan seluruh pengujian E2E Playwright secara headless
npx playwright test

# Jalankan pengujian E2E dengan mode UI interaktif
npx playwright test --ui

# Jalankan spesifikasi pengujian E2E tertentu
npx playwright test tests/e2e-tagihan.spec.ts
```

## 5. Pedoman Pengujian Berkelanjutan
- Selalu jalankan `npm run lint` dan `npm run test` sebelum membuat commit atau push kode.
- Pastikan seluruh file tes Playwright lulus tanpa adanya kegagalan acak (flaky test).
