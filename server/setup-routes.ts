import { Router } from "express";
import { execSync } from "child_process";

const router = Router();

const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = "almhbob/ahbaballah-kindergarten";
const SECRET_NAME = "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY";

async function addGithubSecret(secretValue: string): Promise<{ ok: boolean; message: string }> {
  if (!GITHUB_PAT) return { ok: false, message: "GITHUB_PAT غير متوفر في البيئة" };

  try {
    const pubKeyRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/public-key`,
      { headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github+json" } }
    );
    const { key, key_id } = (await pubKeyRes.json()) as { key: string; key_id: string };

    const script = `
const sodium = require('libsodium-wrappers');
sodium.ready.then(() => {
  const pub = sodium.from_base64('${key}', sodium.base64_variants.ORIGINAL);
  const msg = sodium.from_string(${JSON.stringify(secretValue)});
  const enc = sodium.crypto_box_seal(msg, pub);
  console.log(sodium.to_base64(enc, sodium.base64_variants.ORIGINAL));
});`;

    const encrypted = execSync(`node -e "${script.replace(/"/g, '\\"')}"`, {
      timeout: 15000,
      encoding: "utf8",
    }).trim();

    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/${SECRET_NAME}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ encrypted_value: encrypted, key_id }),
      }
    );

    if (putRes.status === 201 || putRes.status === 204) {
      return { ok: true, message: `✅ ${SECRET_NAME} أُضيف إلى GitHub Secrets بنجاح!` };
    } else {
      const err = await putRes.text();
      return { ok: false, message: `فشل رفع الـ Secret: ${err}` };
    }
  } catch (e: any) {
    return { ok: false, message: `خطأ: ${e.message}` };
  }
}

router.get("/page", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعداد Google Play — روضة أحباب الله</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 600px; width: 100%; border: 1px solid #334155; }
    h1 { font-size: 24px; color: #f8fafc; margin-bottom: 8px; }
    p { color: #94a3b8; margin-bottom: 24px; line-height: 1.6; }
    .steps { background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .step { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
    .step-num { background: #1A6B5C; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; flex-shrink: 0; margin-top: 2px; }
    .step-text { color: #cbd5e1; font-size: 14px; line-height: 1.5; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .cloud-cmd { background: #0f172a; border: 1px solid #1A6B5C; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; color: #86efac; margin: 16px 0; word-break: break-all; cursor: pointer; }
    textarea { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; color: #e2e8f0; font-family: monospace; font-size: 12px; resize: vertical; height: 200px; margin-bottom: 16px; }
    textarea:focus { outline: none; border-color: #1A6B5C; }
    button { background: #1A6B5C; color: white; border: none; border-radius: 8px; padding: 14px 28px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s; }
    button:hover { background: #155a4d; }
    button:disabled { background: #334155; cursor: not-allowed; }
    .result { margin-top: 16px; padding: 16px; border-radius: 8px; display: none; }
    .result.success { background: #052e16; border: 1px solid #16a34a; color: #86efac; }
    .result.error { background: #1c0a0a; border: 1px solid #dc2626; color: #fca5a5; }
    .divider { text-align: center; color: #475569; margin: 24px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚙️ إعداد Google Play — خطوة واحدة أخيرة</h1>
    <p>كل الإعدادات اكتملت ما عدا Google Play Service Account Key. الخيار الأسهل هو Google Cloud Shell.</p>

    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">افتح <a href="https://shell.cloud.google.com" target="_blank">Google Cloud Shell</a> وانسخ هذا الأمر:</div>
      </div>
    </div>

    <div class="cloud-cmd" onclick="copyCmd(this)" title="اضغط للنسخ">
bash &lt;(curl -fsSL https://raw.githubusercontent.com/almhbob/ahbaballah-kindergarten/main/docs/setup-google-play.sh)
    </div>
    <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">🔒 السكريبت يُنشئ الـ Service Account ويعيد لك الـ JSON Key</p>

    <div class="divider">— أو أضف الـ Key يدوياً —</div>

    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">افتح <a href="https://console.cloud.google.com/iam-admin/serviceaccounts?project=ahbabullah-e85a6" target="_blank">Google Cloud Console</a></div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">اضغط على Service Account → Keys → Add Key → JSON</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">الصق محتوى الـ JSON هنا:</div>
      </div>
    </div>

    <textarea id="keyInput" placeholder='{ "type": "service_account", "project_id": "ahbabullah-e85a6", ... }'></textarea>
    <button onclick="uploadKey()" id="uploadBtn">رفع الـ Key إلى GitHub تلقائياً</button>
    <div class="result" id="result"></div>
  </div>

  <script>
    function copyCmd(el) {
      const text = el.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        el.style.borderColor = '#22c55e';
        el.textContent = '✅ تم النسخ!';
        setTimeout(() => { el.style.borderColor = '#1A6B5C'; el.textContent = text; }, 2000);
      });
    }

    async function uploadKey() {
      const key = document.getElementById('keyInput').value.trim();
      if (!key) { alert('الرجاء لصق محتوى الـ JSON Key'); return; }
      try { JSON.parse(key); } catch(e) { alert('الـ JSON غير صحيح — تأكد من النسخ الكامل'); return; }

      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      btn.textContent = 'جارٍ الرفع...';

      try {
        const res = await fetch('/api/setup/google-play-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        const resultEl = document.getElementById('result');
        resultEl.style.display = 'block';
        if (data.ok) {
          resultEl.className = 'result success';
          resultEl.textContent = data.message;
          btn.textContent = '✅ تم!';
        } else {
          resultEl.className = 'result error';
          resultEl.textContent = data.message;
          btn.disabled = false;
          btn.textContent = 'إعادة المحاولة';
        }
      } catch(e) {
        alert('خطأ في الاتصال بالخادم');
        btn.disabled = false;
        btn.textContent = 'إعادة المحاولة';
      }
    }
  </script>
</body>
</html>`);
});

router.post("/google-play-key", async (req, res) => {
  const { key } = req.body as { key: string };
  if (!key) return res.status(400).json({ ok: false, message: "الـ Key مطلوب" });

  try {
    JSON.parse(key);
  } catch {
    return res.status(400).json({ ok: false, message: "الـ JSON غير صحيح" });
  }

  const result = await addGithubSecret(key);
  res.json(result);
});

export default router;
