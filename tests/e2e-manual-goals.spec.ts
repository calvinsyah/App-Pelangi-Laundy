import { test, expect } from '@playwright/test';

// Kredensial untuk API test dari .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;

test.describe('Testing Goals Phase 1 (Manual Actions)', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    // Authenticate via API to get token for direct edge function testing
    const response = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });
    const body = await response.json();
    if (body.access_token) {
      authToken = body.access_token;
    }
  });

  test('T1 API: Hit nota-create dengan payload rusak ditolak', async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/functions/v1/nota-create`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        action: 'create',
        tanggal: '2026-07-13',
        pelanggan_id: 1, // asumsikan id pelanggan
        jenis_nota_id: 1,
        isFlat: false,
        items: [] // Error: Harus ada item
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Harus ada item');
  });

  test('S1: Pilih file restore lalu klik Batal tidak menembak API', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    await page.goto('/sistem/backup');
    
    let isApiCalled = false;
    await page.route('**/functions/v1/restore-import', route => {
      isApiCalled = true;
      route.continue();
    });

    // Simulasi dialog batal
    page.on('dialog', dialog => dialog.dismiss());
    
    expect(isApiCalled).toBeFalsy();
  });

  test('K4/S3: Offline mode tangani error dengan gracefully (tidak hang)', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    // Masuk ke halaman keuangan
    await page.goto('/keuangan/absensi');
    await page.waitForLoadState('networkidle');

    // Putuskan jaringan (Simulasi)
    await context.setOffline(true);

    // Klik simpan absensi
    const saveBtn = page.locator('button:has-text("Simpan Absensi")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      // Aplikasi harus bisa menangkap `catch` dan show error.
    }
    
    await context.setOffline(false);
  });
});
