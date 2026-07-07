import { test, expect } from '@playwright/test';

const TEST_CUSTOMER_NAME = '[E2E-TEST] RS Dummy Automation';



test('Flow CRUD Nota', async ({ page }) => {
  test.setTimeout(60000); // Allow more time for full flow

  // 1. LOGIN
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('input[type="email"]', 'admin@email.com');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button:has-text("Sign In"), button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  
  // 2. CREATE MASTER PELANGGAN
  await page.goto('/master/pelanggan');
  await page.click('button:has-text("Tambah Pelanggan")');
  await page.fill('label:has-text("Nama Instansi") + input', TEST_CUSTOMER_NAME);
  await page.fill('label:has-text("Kode Invoice") + input', 'E2E-001');
  
  // Select Tipe RS
  await page.selectOption('label:has-text("Tipe") + select', 'RS');
  
  // Fill Tarif per Kg (Using strict locator to ensure it finds the correct currency input which might not be direct sibling)
  await page.locator('label', { hasText: 'Tarif per Kg (Rp)' }).locator('..').locator('input').fill('5000');
  
  await page.click('button:has-text("Simpan")');
  // Wait for success toast or modal to close
  await page.waitForSelector(`text=${TEST_CUSTOMER_NAME}`, { timeout: 10000 });

  // 3. INPUT NOTA BARU
  await page.goto('/transaksi/input');
  
  // Pilih pelanggan dummy
  // Select option using the label text or just by value if known, but label is safer.
  await page.locator('label:has-text("Pelanggan") + select').selectOption({ label: `${TEST_CUSTOMER_NAME} (RS)` });
  
  // Isi berat (kg)
  await page.fill('label:has-text("Berat (Kg)") + input', '10');
  
  await page.click('button:has-text("Simpan Nota")');
  
  // Wait for success
  await page.waitForSelector('text=Nota berhasil disimpan!', { timeout: 10000 });

  // 4. VERIFY & TEARDOWN: RIWAYAT NOTA
  await page.goto('/transaksi/riwayat');
  await page.fill('input[placeholder="Cari nama pelanggan..."]', TEST_CUSTOMER_NAME);
  
  // Wait for the row to appear
  await page.waitForSelector(`td:has-text("${TEST_CUSTOMER_NAME}")`, { timeout: 10000 });
  
  // Click delete button inside that row
  const row = page.locator('tr').filter({ hasText: TEST_CUSTOMER_NAME }).first();
  await row.locator('button[title="Hapus Nota"]').click();
  
  // Confirm deletion
  await page.click('button:has-text("Lanjutkan")');
  await page.waitForSelector('text=Nota berhasil dihapus', { timeout: 10000 });

  // 5. TEARDOWN: MASTER PELANGGAN
  await page.goto('/master/pelanggan');
  await page.fill('input[placeholder="Cari pelanggan..."]', TEST_CUSTOMER_NAME);
  
  await page.waitForSelector(`td:has-text("${TEST_CUSTOMER_NAME}")`, { timeout: 10000 });
  
  const pelangganRow = page.locator('tr').filter({ hasText: TEST_CUSTOMER_NAME }).first();
  await pelangganRow.locator('button[title="Hapus Pelanggan"]').click();
  
  // Confirm deletion
  await page.click('button:has-text("Lanjutkan")');
  
  // Wait for row to disappear
  await page.waitForSelector(`td:has-text("${TEST_CUSTOMER_NAME}")`, { state: 'hidden', timeout: 10000 });
  
  console.log('E2E CRUD Mark & Sweep completed successfully.');
});
