import { test, expect } from '@playwright/test';

const ROUTES = [
  '/transaksi/input',
  '/transaksi/riwayat',
  '/dashboard',
  '/tagihan/invoice',
  '/tagihan/kuitansi',
  '/keuangan/pengeluaran',
  '/keuangan/laporan',
  '/keuangan/utang',
  '/keuangan/gaji',
  '/master/linen',
  '/master/karyawan',
  '/master/jenis-nota',
  '/master/pelanggan',
  '/sistem/backup',
  '/sistem/pengaturan'
];

test.describe('E2E Tabs Testing', () => {
  test('should login and successfully navigate to all tabs', async ({ page }) => {
    // 1. Navigate to the app (will redirect to login)
    await page.goto('/');
    
    // 2. Perform Login
    console.log('Logging in...');
    await page.waitForURL('**/login');
    
    await page.fill('input[type="email"]', process.env.TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD!);
    await page.click('button:has-text("Sign In"), button[type="submit"]');
    
    // Wait for successful login (wait until not on login page)
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    const currentUrlAfterLogin = page.url();
    expect(currentUrlAfterLogin).not.toContain('/login');
    
    console.log('Login successful. Iterating through routes...');

    // 3. Iterate through all routes
    for (const route of ROUTES) {
      console.log(`Testing route: ${route}`);
      
      // Navigate to the route
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      
      // Basic checks
      expect(response?.status()).toBeLessThan(400); // Ensure no 404 or 500 errors
      
      // Ensure we haven't been kicked back to login unexpectedly
      expect(page.url()).not.toContain('/login');
      
      // Take a screenshot of each tab for manual verification
      const screenshotName = route.replace(/\//g, '_').substring(1);
      await page.screenshot({ path: `test-results/screenshots/${screenshotName}.png`, fullPage: true });
      
      console.log(`Route ${route} passed.`);
    }
  });
});
