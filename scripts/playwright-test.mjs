import { chromium } from 'playwright';

(async () => {
  console.log('Starting Playwright test for https://app-pelangi-laundy.pages.dev ...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to the web app...');
    const response = await page.goto('https://app-pelangi-laundy.pages.dev', { waitUntil: 'networkidle' });
    
    console.log('Response Status:', response.status());
    const title = await page.title();
    console.log('Page Title:', title);
    
    // Check if we are redirected to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('Successfully redirected to the login page.');
      
      // Check if email and password inputs exist
      const emailInput = await page.locator('input[type="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      
      console.log(`Found ${emailInput} email input(s) and ${passwordInput} password input(s).`);
      
      if (emailInput > 0 && passwordInput > 0) {
        console.log('Login form verified successfully.');
      } else {
        console.log('Could not find login form elements.');
      }
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'playwright-test-result.png', fullPage: true });
    console.log('Screenshot saved as playwright-test-result.png');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await browser.close();
    console.log('Test completed.');
  }
})();
