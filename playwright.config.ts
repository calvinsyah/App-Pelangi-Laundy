import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.development for tests
dotenv.config({ path: path.resolve(__dirname, '.env.development') });

// GUARD: Mencegah E2E test berjalan di database produksi
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
if (supabaseUrl.includes('supabase.co')) {
  console.error('CRITICAL ERROR: Playwright is trying to run against a production Supabase instance.');
  console.error('Aborting tests to prevent data pollution. Please ensure you are using a local Supabase (127.0.0.1) in .env.development.');
  process.exit(1);
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
