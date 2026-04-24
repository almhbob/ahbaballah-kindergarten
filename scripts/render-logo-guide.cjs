const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Embed logo as base64 so it loads in headless chromium
const logoB64 = 'data:image/png;base64,' + fs.readFileSync(
  path.resolve(__dirname, '..', 'assets/images/system-logo.png')
).toString('base64');

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Tajawal',sans-serif;background:#f4f5fb;color:#0e1330;-webkit-font-smoothing:antialiased}
  .wrap{width:1200px;padding:48px}
  h1{font-size:28px;font-weight:900;color:#0c1155;margin-bottom:4px}
  .sub{color:#6b7280;font-size:14px;margin-bottom:36px;font-weight:600;letter-spacing:1px}
  .row{display:flex;gap:20px;margin-bottom:20px;align-items:stretch}
  .box{background:#fff;border-radius:18px;padding:28px;flex:1;border:1px solid #e5e7f0}
  .box-dark{background:#0c1155;border-color:#1a2278}
  .box-gray{background:#1e293b;border-color:#334155}
  .box-title{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:18px}
  .box-dark .box-title,.box-gray .box-title{color:rgba(255,255,255,0.45)}
  .logo-lg{width:120px;height:120px;border-radius:28px;display:block;object-fit:cover}
  .logo-md{width:72px;height:72px;border-radius:18px;display:block;object-fit:cover}
  .logo-sm{width:44px;height:44px;border-radius:12px;display:block;object-fit:cover}
  .logo-xs{width:28px;height:28px;border-radius:8px;display:block;object-fit:cover}
  .sizes{display:flex;align-items:flex-end;gap:24px}
  .size-item{display:flex;flex-direction:column;align-items:center;gap:8px}
  .size-lbl{font-size:11px;color:#9ca3af;font-weight:600}
  .lockup{display:flex;align-items:center;gap:14px}
  .brand-en{font-size:11px;letter-spacing:3px;font-weight:700;opacity:0.5}
  .brand-ar-dark{font-size:20px;font-weight:900;color:#0c1155}
  .brand-ar-light{font-size:20px;font-weight:900;color:#fff}
  .header-bar{
    background:linear-gradient(135deg,#070a24,#0c1155);border-radius:14px;
    padding:16px 22px;display:flex;align-items:center;gap:14px;
    border:1px solid rgba(255,255,255,0.06);margin-bottom:12px;
  }
  .school-logo-ph{
    width:40px;height:40px;border-radius:10px;
    border:1.5px dashed #c9952a;
    display:flex;align-items:center;justify-content:center;
    font-size:20px;background:rgba(201,149,42,0.1);
    flex-shrink:0;
  }
  .htxt{flex:1;margin-right:4px}
  .hname{color:#fff;font-size:15px;font-weight:800}
  .hsub{color:rgba(255,255,255,0.45);font-size:11px;margin-top:2px;font-weight:600}
  .divv{width:1px;height:36px;background:rgba(255,255,255,0.12);margin:0 6px}
  .sys-mark{display:flex;flex-direction:column;align-items:flex-start;margin-right:4px}
  .powered{font-size:8px;color:rgba(255,255,255,0.35);letter-spacing:2px;font-weight:700;text-transform:uppercase}
  .sys-name{font-size:11px;color:rgba(255,255,255,0.75);font-weight:700;margin-top:2px}
  .palette{display:flex;gap:10px}
  .swatch{flex:1;height:54px;border-radius:10px;display:flex;align-items:flex-end;padding:6px 8px}
  .swatch span{font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.4)}
  .footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:32px;padding-top:20px;border-top:1px solid #e5e7f0}
</style>
</head>
<body>
<div class="wrap">
  <h1>دليل الهوية البصرية</h1>
  <p class="sub">BRAND IDENTITY GUIDE · نظم إدارة رياض الأطفال · 2026</p>

  <div class="row">
    <div class="box" style="flex:2">
      <div class="box-title">أحجام الشعار المعتمدة</div>
      <div class="sizes">
        <div class="size-item">
          <img class="logo-lg" src="${logoB64}" />
          <span class="size-lbl">120px — App Icon</span>
        </div>
        <div class="size-item">
          <img class="logo-md" src="${logoB64}" />
          <span class="size-lbl">72px — Header</span>
        </div>
        <div class="size-item">
          <img class="logo-sm" src="${logoB64}" />
          <span class="size-lbl">44px — Tab Bar</span>
        </div>
        <div class="size-item">
          <img class="logo-xs" src="${logoB64}" />
          <span class="size-lbl">28px — Mini</span>
        </div>
      </div>
    </div>
    <div class="box box-dark" style="flex:1">
      <div class="box-title">على الكحلي</div>
      <img class="logo-lg" src="${logoB64}" />
    </div>
    <div class="box box-gray" style="flex:1">
      <div class="box-title">على الداكن</div>
      <img class="logo-lg" src="${logoB64}" />
    </div>
  </div>

  <div class="row">
    <div class="box" style="flex:2">
      <div class="box-title">الشعار مع الاسم — Lockup (فاتح)</div>
      <div class="lockup">
        <img class="logo-md" src="${logoB64}" />
        <div>
          <div class="brand-en" style="color:#9ca3af">SCHOOL · MANAGEMENT</div>
          <div class="brand-ar-dark">نظم إدارة رياض الأطفال</div>
        </div>
      </div>
    </div>
    <div class="box box-dark" style="flex:2">
      <div class="box-title">الشعار مع الاسم — Lockup (كحلي)</div>
      <div class="lockup">
        <img class="logo-md" src="${logoB64}" />
        <div>
          <div class="brand-en">SCHOOL · MANAGEMENT</div>
          <div class="brand-ar-light">نظم إدارة رياض الأطفال</div>
        </div>
      </div>
    </div>
  </div>

  <div class="box" style="margin-bottom:20px">
    <div class="box-title">مساحة شعار الروضة المشتركة — عينات تطبيق حي</div>
    <div class="header-bar">
      <div class="school-logo-ph">🏫</div>
      <div class="htxt">
        <div class="hname">روضة النجوم المضيئة</div>
        <div class="hsub">لوحة الإدارة</div>
      </div>
      <div class="divv"></div>
      <img style="width:34px;height:34px;border-radius:10px;opacity:0.85;object-fit:cover" src="${logoB64}" />
      <div class="sys-mark">
        <div class="powered">POWERED BY</div>
        <div class="sys-name">نظم إدارة رياض الأطفال</div>
      </div>
    </div>
    <div class="header-bar" style="background:linear-gradient(135deg,#0d2b1a,#1A6B5C)">
      <div style="width:40px;height:40px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🌟</div>
      <div class="htxt">
        <div class="hname">روضة براعم الإيمان</div>
        <div class="hsub">لوحة الإدارة</div>
      </div>
      <div class="divv"></div>
      <img style="width:34px;height:34px;border-radius:10px;opacity:0.85;object-fit:cover" src="${logoB64}" />
      <div class="sys-mark">
        <div class="powered">POWERED BY</div>
        <div class="sys-name">نظم إدارة رياض الأطفال</div>
      </div>
    </div>
    <div class="header-bar" style="background:linear-gradient(135deg,#2d0d4a,#7B3FA0)">
      <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎓</div>
      <div class="htxt">
        <div class="hname">مدرسة الرسالة الابتدائية</div>
        <div class="hsub">لوحة الإدارة</div>
      </div>
      <div class="divv"></div>
      <img style="width:34px;height:34px;border-radius:10px;opacity:0.85;object-fit:cover" src="${logoB64}" />
      <div class="sys-mark">
        <div class="powered">POWERED BY</div>
        <div class="sys-name">نظم إدارة رياض الأطفال</div>
      </div>
    </div>
  </div>

  <div class="box">
    <div class="box-title">لوحة الألوان الرسمية</div>
    <div class="palette">
      <div class="swatch" style="background:#0c1155"><span>#0c1155 الكحلي الرئيسي</span></div>
      <div class="swatch" style="background:#1a2278"><span>#1a2278 الكحلي الفاتح</span></div>
      <div class="swatch" style="background:#c9952a"><span>#c9952a الذهبي</span></div>
      <div class="swatch" style="background:#e8c66a"><span>#e8c66a ذهبي فاتح</span></div>
      <div class="swatch" style="background:#1A6B5C"><span>#1A6B5C أخضر المعلمة</span></div>
      <div class="swatch" style="background:#7B3FA0"><span>#7B3FA0 بنفسجي الأمر</span></div>
    </div>
  </div>

  <p class="footer">© 2026 نظم إدارة رياض الأطفال — جميع حقوق الهوية البصرية محفوظة</p>
</div>
</body>
</html>`;

(async () => {
  const out = path.resolve(__dirname, '..', 'docs/marketing/logo-guide.png');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome',
    args: ['--no-sandbox','--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: out, fullPage: true, type: 'png' });
  await browser.close();
  console.log('OK', out, fs.statSync(out).size);
})().catch(e => { console.error(e); process.exit(1); });
