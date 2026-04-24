const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const file = 'file://' + path.resolve(__dirname, '..', 'docs/marketing/brochure.html');
  const out = path.resolve(__dirname, '..', 'docs/marketing/brochure.pdf');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.goto(file, { waitUntil: 'networkidle0', timeout: 90000 });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise(r => setTimeout(r, 1000));

  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });

  await browser.close();
  console.log('OK', out, fs.statSync(out).size);
})().catch(e => { console.error(e); process.exit(1); });
