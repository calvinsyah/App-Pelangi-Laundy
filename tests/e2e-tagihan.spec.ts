import { test, expect } from '@playwright/test';

test.describe('Modul Tagihan (Invoice & Kuitansi) - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Buka aplikasi dan login
    await page.goto('/');
    
    // Tunggu render
    await page.waitForTimeout(1000);
    
    await page.locator('label:has-text("Email")').locator('..').locator('input').fill(process.env.TEST_EMAIL!);
    await page.locator('label:has-text("Password")').locator('..').locator('input').fill(process.env.TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Pastikan dashboard termuat (cek tulisan Dashboard)
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Membuka dan memproses halaman Invoice', async ({ page }) => {
    // Navigasi langsung ke URL Invoice
    await page.goto('/tagihan/invoice');
    
    // Pastikan judul halaman Invoice tampil
    await expect(page.getByRole('heading', { name: 'Modul Tagihan & Laporan' })).toBeVisible();

    // Pilih pelanggan pertama dari dropdown (native select)
    const selectPelanggan = page.locator('select').first();
    await expect(selectPelanggan).toBeVisible();
    await selectPelanggan.selectOption({ index: 1 });
    
    await page.waitForTimeout(1500); // tunggu fetch selesai

    // Pastikan tombol-tombol aksi cetak tersedia
    const cetakInvoiceBtn = page.getByRole('button', { name: /Cetak Invoice/i });
    await expect(cetakInvoiceBtn).toBeVisible();
    
    const isInvoiceDisabled = await cetakInvoiceBtn.isDisabled();
    if (!isInvoiceDisabled) {
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        cetakInvoiceBtn.click()
      ]);

      if (popup) {
        await popup.waitForLoadState();
        await popup.close();
      }
    }

    await page.getByRole('button', { name: 'Laporan Linen Room' }).click();
    const cetakLinenBtn = page.getByRole('button', { name: /Cetak Linen/i });
    await expect(cetakLinenBtn).toBeVisible();


  });

  test('Membuka dan memproses halaman Kuitansi', async ({ page }) => {
    // Navigasi langsung ke URL Kuitansi
    await page.goto('/tagihan/kuitansi');
    
    // Pastikan judul halaman Kuitansi tampil
    await expect(page.getByRole('heading', { name: 'Cetak Kuitansi' })).toBeVisible();

    // Pilih pelanggan pertama dari dropdown
    const selectPelanggan = page.locator('select').first();
    await expect(selectPelanggan).toBeVisible();
    await selectPelanggan.selectOption({ index: 1 });
    
    await page.waitForTimeout(1500);

    // Tombol Cetak
    const cetakKwitansiBtn = page.getByRole('button', { name: 'Cetak', exact: true });
    await expect(cetakKwitansiBtn).toBeVisible();

    const isKwitansiDisabled = await cetakKwitansiBtn.isDisabled();
    if (!isKwitansiDisabled) {
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        cetakKwitansiBtn.click()
      ]);

      if (popup) {
        await popup.waitForLoadState();
        await popup.close();
      }
    }
  });
});
