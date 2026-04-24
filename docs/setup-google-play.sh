#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# أداة إعداد Google Play Service Account التلقائية — روضة أحباب الله
# شغّلها من: https://shell.cloud.google.com
# الأمر: bash <(curl -fsSL https://raw.githubusercontent.com/almhbob/ahbaballah-kindergarten/main/docs/setup-google-play.sh)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_ID="ahbabullah-e85a6"
SA_NAME="google-play-publisher"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="/tmp/google-play-key-$$.json"
SERVER_URL="https://2be55d0a-6bcf-41e3-b926-62f595b1feef-00-37br86ji98cvi.sisko.replit.dev/api/setup/google-play-key"

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
gcloud config set project "$PROJECT_ID" --quiet 2>/dev/null
echo "     ✅ المشروع: $PROJECT_ID"

echo ""
echo "⚡ [2/5] تفعيل Cloud IAM API..."
gcloud services enable iam.googleapis.com androidpublisher.googleapis.com --quiet 2>/dev/null || true
echo "     ✅ APIs مُفعّلة"

echo ""
echo "⚡ [3/5] إنشاء Service Account..."
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  echo "     ✅ الحساب موجود: $SA_EMAIL"
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Google Play Publisher — روضة أحباب الله" \
    --project="$PROJECT_ID" --quiet
  echo "     ✅ تم إنشاء: $SA_EMAIL"
fi

echo ""
echo "⚡ [4/5] منح صلاحيات IAM..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/firebase.admin" --quiet 2>/dev/null || true
echo "     ✅ صلاحيات مُضافة"

echo ""
echo "⚡ [5/5] إنشاء JSON Key وإرساله تلقائياً..."
rm -f "$KEY_FILE"
gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL" --project="$PROJECT_ID" --quiet

KEY_CONTENT=$(cat "$KEY_FILE")
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"key\": $(python3 -c "import json,sys; print(json.dumps(open('$KEY_FILE').read()))")}" 2>/dev/null)

rm -f "$KEY_FILE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "     ✅ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY أُضيف إلى GitHub Secrets!"
  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║              ✅ اكتمل الإعداد بنجاح!                ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "الخطوة الأخيرة (في Google Play Console):"
  echo "1. افتح: https://play.google.com/console/developers/api-access"
  echo "2. ابحث عن: $SA_EMAIL"
  echo "3. اضغط 'Grant access' ثم 'Release Manager'"
  echo ""
  echo "لبدء أول بناء تلقائي:"
  echo "https://github.com/almhbob/ahbaballah-kindergarten/actions/workflows/build-android.yml"
else
  echo "     ⚠️  فشل الإرسال التلقائي — افتح الصفحة لإضافته يدوياً:"
  echo "     https://2be55d0a-6bcf-41e3-b926-62f595b1feef-00-37br86ji98cvi.sisko.replit.dev/api/setup/page"
fi
echo ""
