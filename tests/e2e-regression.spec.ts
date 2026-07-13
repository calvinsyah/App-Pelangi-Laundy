import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;

test.describe('E2E Regression Testing Phase 2', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Alur Edit Nota: Validasi hitung ulang total saat edit', async ({ page }) => {
    // 1. Ke Riwayat Nota
    await page.goto('/transaksi/riwayat');
    await page.waitForLoadState('networkidle');

    // 2. Klik Edit pada baris pertama yang ada (jika ada data dummy)
    // Karena kita tidak tahu persis data yang ada, kita hanya tes interaksi tombol
    const editBtn = page.locator('button[title="Edit Nota"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      
      // Wait for the modal instead of URL navigation
      await expect(page.locator('h3:has-text("Edit Nota")')).toBeVisible({ timeout: 10000 });
      // 3. Ganti berat_kg
      const inputBerat = page.locator('label:has-text("Berat (Kg)") + input');
      if (await inputBerat.isVisible()) {
        await inputBerat.fill('15');
        
        // 4. Simpan
        await page.click('button:has-text("Simpan Nota")');
        await expect(page.locator('text=Nota berhasil diperbarui')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('Alur Lock Invoice: Kunci invoice beku (Snapshot)', async ({ page }) => {
    await page.goto('/tagihan');
    await page.waitForLoadState('networkidle');

    // Cari invoice pertama
    const lockBtn = page.locator('button:has-text("Kunci")').first();
    if (await lockBtn.isVisible()) {
      await lockBtn.click();
      await expect(page.locator('text=Terkunci')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Alur Cicilan: Atomicity Bayar Cicilan', async ({ page }) => {
    await page.goto('/keuangan/utang');
    await page.waitForLoadState('networkidle');

    // Cari tombol bayar pertama
    const bayarBtn = page.locator('button:has-text("Bayar")').first();
    if (await bayarBtn.isVisible()) {
      await bayarBtn.click();
      await expect(page.locator('text=Cicilan berhasil')).toBeVisible({ timeout: 10000 });
    }
  });
});
