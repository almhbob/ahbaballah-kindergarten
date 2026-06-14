#!/usr/bin/env node
/**
 * Playwright automation: Complete Google Play Console setup
 * Usage: node play_console_automate.js <password> [2fa_code]
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EMAIL    = 'almhbob.2024@gmail.com';
const PASSWORD = process.argv[2];
const PACKAGE  = 'com.ahbaballah.kindergarten';
const SHOTS    = path.resolve(__dirname, '../store-screenshots');

if (!PASSWORD) { console.error('Usage: node play_console_automate.js <password>'); process.exit(1); }

const CONSOLE_URL = `https://play.google.com/console/u/0/developers`;

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // ── 1. Google Sign-in ──────────────────────────────────────────
  console.log('🔑 Signing in to Google...');
  await page.goto('https://accounts.google.com/signin');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', EMAIL);
  await page.click('button:has-text("Next"), #identifierNext');
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Next"), #passwordNext');

  // Wait for redirect — may need 2FA
  await page.waitForTimeout(3000);

  // Check for 2FA
  const url = page.url();
  if (url.includes('challenge') || url.includes('2fa') || url.includes('signin/v2/challenge')) {
    console.log('⚠️  2FA detected. URL:', url);
    // Take screenshot so user can see what's needed
    await page.screenshot({ path: '/tmp/play_console_2fa.png' });
    console.log('Screenshot saved to /tmp/play_console_2fa.png');
    // Wait up to 60 seconds for manual 2FA completion
    console.log('Waiting 60s for 2FA...');
    await page.waitForURL('**myaccount**', { timeout: 60000 }).catch(() => {});
  }

  // Navigate to Play Console
  console.log('🌐 Opening Play Console...');
  await page.goto('https://play.google.com/console');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/console_home.png' });
  console.log('   Screenshot: /tmp/console_home.png');

  // Find the app
  console.log('📱 Navigating to app...');
  const appLink = page.locator(`a[href*="${PACKAGE}"], a:has-text("روضة"), a:has-text("Ahbaballah"), a:has-text("Kindergarten")`).first();
  await appLink.waitFor({ timeout: 15000 });
  await appLink.click();
  await page.waitForLoadState('networkidle');

  const appUrl = page.url();
  console.log('   App URL:', appUrl);
  await page.screenshot({ path: '/tmp/app_home.png' });

  // Extract app-specific base URL
  const appBase = appUrl.replace(/\/[^\/]+$/, '');

  // ── 2. Main store listing: Icon + Feature Graphic + Screenshots ─
  console.log('🖼️  Uploading store assets...');
  await page.goto(`https://play.google.com/console${appUrl.split('console')[1].split('/')[0]}/${PACKAGE}/main-store-listing`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/store_listing.png' });
  console.log('   Screenshot: /tmp/store_listing.png');

  // ── 3. Take screenshot of current state for diagnosis ──────────
  await page.screenshot({ path: '/tmp/final_state.png', fullPage: true });
  console.log('   Final screenshot: /tmp/final_state.png');
  console.log('   Current URL:', page.url());

  await browser.close();
  console.log('✅ Browser automation complete');
}

run().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
