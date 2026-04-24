import { Router } from "express";
import sodium from "libsodium-wrappers";

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

    // Encrypt directly in-process (no child process needed)
    await sodium.ready;
    const pub = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const msg = sodium.from_string(secretValue);
    const enc = sodium.crypto_box_seal(msg, pub);
    const encrypted = sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);

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

router.get("/script", (_req, res) => {
  const baseDomain = process.env.REPLIT_DEV_DOMAIN
    || (process.env.REPLIT_DOMAINS || "").split(",")[0]?.trim();
  const domain = `https://${baseDomain}:5000`;

  const script = `#!/bin/bash
set -e
PROJECT_ID="ahbabullah-e85a6"
SA_NAME="google-play-publisher"
SA_EMAIL="\${SA_NAME}@\${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="/tmp/google-play-key-\$\$.json"
SERVER_URL="${domain}/api/setup/google-play-key"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     إعداد Google Play Service Account تلقائياً      ║"
echo "║         روضة أحباب الله — ahbabullah-e85a6          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

if ! command -v gcloud &>/dev/null; then
  echo "❌ gcloud غير متاح. شغّل من: https://shell.cloud.google.com"
  exit 1
fi

echo "⚡ [1/5] ضبط مشروع Google Cloud..."
gcloud config set project "\$PROJECT_ID" --quiet 2>/dev/null
echo "     ✅ المشروع: \$PROJECT_ID"

echo ""
echo "⚡ [2/5] تفعيل Cloud IAM API..."
gcloud services enable iam.googleapis.com androidpublisher.googleapis.com --quiet 2>/dev/null || true
echo "     ✅ APIs مُفعّلة"

echo ""
echo "⚡ [3/5] إنشاء Service Account..."
if gcloud iam service-accounts describe "\$SA_EMAIL" --project="\$PROJECT_ID" &>/dev/null; then
  echo "     ✅ الحساب موجود: \$SA_EMAIL"
else
  gcloud iam service-accounts create "\$SA_NAME" \\
    --display-name="Google Play Publisher — روضة أحباب الله" \\
    --project="\$PROJECT_ID" --quiet
  echo "     ✅ تم إنشاء: \$SA_EMAIL"
fi

echo ""
echo "⚡ [4/5] منح صلاحيات IAM..."
gcloud projects add-iam-policy-binding "\$PROJECT_ID" \\
  --member="serviceAccount:\$SA_EMAIL" \\
  --role="roles/firebase.admin" --quiet 2>/dev/null || true
echo "     ✅ صلاحيات مُضافة"

echo ""
echo "⚡ [5/5] إنشاء JSON Key وإرساله تلقائياً..."
rm -f "\$KEY_FILE"
gcloud iam service-accounts keys create "\$KEY_FILE" \\
  --iam-account="\$SA_EMAIL" --project="\$PROJECT_ID" --quiet

RESPONSE=\$(curl -s -X POST "\$SERVER_URL" \\
  -H "Content-Type: application/json" \\
  -d "{\\"key\\": \$(python3 -c "import json,sys; print(json.dumps(open('/tmp/google-play-key-\$\$.json').read()))")}" 2>/dev/null)

rm -f "\$KEY_FILE"

if echo "\$RESPONSE" | grep -q '"ok":true'; then
  echo "     ✅ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY أُضيف إلى GitHub Secrets!"
  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║              ✅ اكتمل الإعداد بنجاح!                ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "الخطوة الأخيرة (في Google Play Console):"
  echo "1. افتح: https://play.google.com/console/developers/api-access"
  echo "2. ابحث عن: \$SA_EMAIL"
  echo "3. اضغط Grant access ثم Release Manager"
  echo ""
  echo "لبدء أول بناء تلقائي:"
  echo "https://github.com/almhbob/ahbaballah-kindergarten/actions/workflows/build-android.yml"
else
  echo "     ⚠️ فشل الإرسال التلقائي. الرد: \$RESPONSE"
  echo "     افتح: ${domain}/api/setup/page لإضافته يدوياً"
fi
echo ""
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(script);
});

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

    <div class="cloud-cmd" id="cloudCmd" onclick="copyCmd(this)" title="اضغط للنسخ">
bash &lt;(curl -fsSL https://2be55d0a-6bcf-41e3-b926-62f595b1feef-00-37br86ji98cvi.sisko.replit.dev:5000/api/setup/script)
    </div>
    <script>
      // Make the command dynamic based on current origin
      try {
        const cmd = document.getElementById('cloudCmd');
        const base = window.location.hostname + ':5000';
        cmd.textContent = 'bash <(curl -fsSL https://' + base + '/api/setup/script)';
      } catch(e) {}
    </script>
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
