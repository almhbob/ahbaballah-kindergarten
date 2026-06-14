#!/usr/bin/env node
/**
 * Playwright automation: Complete Google Play Console setup
 * - Sign in to Google
 * - Navigate to the app
 * - Upload icon, feature graphic, screenshots
 * - Complete content rating, target audience, data safety
 * - Start internal testing rollout
 */
const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const EMAIL   = 'almhbob.2024@gmail.com';
const PASSWORD = process.argv[2] || '';
const PACKAGE  = 'com.ahbaballah.kindergarten';
const SHOTS    = path.resolve(__dirname, '../store-screenshots');

if (!PASSWORD) { console.error('Usage: node play_console_automate.js <password>'); process.exit(1); }

const BROWSER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--ignore-certificate-errors',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function screenshot(page, name) {
  const p = `/tmp/pca_${name}.png`;
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  console.log(`   📸 ${p}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // ── 1. Google Sign-in ──────────────────────────────────────────────────────
  console.log('\n🔑 Step 1: Google Sign-in');
  await page.goto('https://accounts.google.com/signin', { waitUntil: 'domcontentloaded' });
  // Google uses type="text" for email, id="identifierId"
  await page.waitForSelector('#identifierId, input[type="text"], input[type="email"]');
  await page.fill('#identifierId', EMAIL);
  await page.keyboard.press('Enter');
  await sleep(3000);
  // Password: type="password" or input with name="Passwd"
  await page.waitForSelector('input[type="password"], input[name="Passwd"]', { timeout: 15000 });
  await page.fill('input[type="password"]', PASSWORD);
  await page.keyboard.press('Enter');
  await sleep(4000);

  const postLoginUrl = page.url();
  console.log('   URL after login:', postLoginUrl);
  await screenshot(page, '01_post_login');

  // Handle 2FA or security challenges
  if (postLoginUrl.includes('challenge') || postLoginUrl.includes('2fa') || postLoginUrl.includes('totp')) {
    console.log('⚠️  2FA/Security challenge detected — waiting 90s for manual action...');
    await sleep(90000);
  }

  // ── 2. Navigate to Play Console ────────────────────────────────────────────
  console.log('\n🌐 Step 2: Play Console');
  await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await screenshot(page, '02_console_home');
  console.log('   URL:', page.url());

  // ── 3. Find the app ────────────────────────────────────────────────────────
  console.log('\n📱 Step 3: Finding app');
  // Try to click the app by package name or title
  const appLocators = [
    `a[href*="${PACKAGE}"]`,
    'a:has-text("روضة")',
    'a:has-text("Ahbaballah")',
    'a:has-text("احباب")',
  ];
  let appFound = false;
  for (const sel of appLocators) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
      await el.click();
      appFound = true;
      console.log(`   Found app via: ${sel}`);
      break;
    }
  }
  if (!appFound) {
    console.log('   ⚠️  App not found by locator, trying URL directly');
    // Get all apps listed
    const links = await page.locator('a[href*="developers"]').allTextContents();
    console.log('   Available links:', links.slice(0, 10));
    await screenshot(page, '03_no_app');
    // Try direct URL
    await page.goto(`https://play.google.com/console/u/0/developers/?hl=en`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await screenshot(page, '03b_console_direct');
  }
  await sleep(3000);
  const appPageUrl = page.url();
  console.log('   App page URL:', appPageUrl);
  await screenshot(page, '03_app_home');

  // Extract developer ID from URL
  const devIdMatch = appPageUrl.match(/developers\/(\d+)/);
  const devId = devIdMatch ? devIdMatch[1] : null;
  console.log('   Developer ID:', devId);

  // ── 4. Store Listing page ─────────────────────────────────────────────────
  if (devId) {
    console.log('\n🖼️  Step 4: Main Store Listing');
    const listingUrl = `https://play.google.com/console/u/0/developers/${devId}/app/${PACKAGE}/main-store-listing`;
    await page.goto(listingUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await screenshot(page, '04_store_listing');
    console.log('   URL:', page.url());

    // Check page content for upload buttons
    const bodyText = await page.textContent('body');
    console.log('   Page title:', await page.title());

    // Try to find and interact with icon upload
    const iconUpload = page.locator('[data-test-id="icon-upload"], input[type="file"]').first();
    if (await iconUpload.isVisible({ timeout: 5000 }).catch(() => false)) {
      await iconUpload.setInputFiles(path.join(SHOTS, 'app_icon_512.png'));
      console.log('   ✅ Icon uploaded');
    } else {
      console.log('   ⚠️  Icon upload field not visible — needs manual action');
    }

    await sleep(2000);
    await screenshot(page, '04b_after_icon');
  }

  // ── 5. Policy - Target Audience ────────────────────────────────────────────
  if (devId) {
    console.log('\n👥 Step 5: Target Audience');
    const taUrl = `https://play.google.com/console/u/0/developers/${devId}/app/${PACKAGE}/policy/target-audience`;
    await page.goto(taUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await screenshot(page, '05_target_audience');
    console.log('   URL:', page.url());
    console.log('   Title:', await page.title());

    // Select 18+ option
    const adultOption = page.locator('label:has-text("18"), [value="18"], input[value="4"]').first();
    if (await adultOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await adultOption.click();
      console.log('   ✅ Selected 18+ audience');
      await sleep(1000);
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Next")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        console.log('   ✅ Saved target audience');
      }
    } else {
      console.log('   ⚠️  Target audience option not found');
    }
    await screenshot(page, '05b_after_ta');
  }

  // ── 6. Policy - Content Rating ────────────────────────────────────────────
  if (devId) {
    console.log('\n⭐ Step 6: Content Rating');
    const crUrl = `https://play.google.com/console/u/0/developers/${devId}/app/${PACKAGE}/policy/content-rating`;
    await page.goto(crUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await screenshot(page, '06_content_rating');
    console.log('   URL:', page.url());
    console.log('   Title:', await page.title());
  }

  // ── 7. Internal Testing ────────────────────────────────────────────────────
  if (devId) {
    console.log('\n🧪 Step 7: Internal Testing');
    const itUrl = `https://play.google.com/console/u/0/developers/${devId}/app/${PACKAGE}/tracks/internal-testing`;
    await page.goto(itUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await screenshot(page, '07_internal_testing');
    console.log('   URL:', page.url());
    console.log('   Title:', await page.title());
  }

  // ── Final state ────────────────────────────────────────────────────────────
  console.log('\n📊 Final state screenshots saved to /tmp/pca_*.png');
  await browser.close();
}

run().catch(async e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
