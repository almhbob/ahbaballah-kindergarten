const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const file = 'file://' + path.resolve(__dirname, '..', 'docs/marketing/poster.html');
  const out = path.resolve(__dirname, '..', 'docs/marketing/poster.png');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  await page.goto(file, { waitUntil: 'networkidle0', timeout: 60000 });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise(r => setTimeout(r, 800));

  const el = await page.$('.poster');
  await el.screenshot({ path: out, type: 'png', omitBackground: false });
  await browser.close();

  const stat = fs.statSync(out);
  console.log('OK', out, stat.size);
})().catch(e => { console.error(e); process.exit(1); });
