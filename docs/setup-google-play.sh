#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# أداة إعداد Google Play Service Account التلقائية — نظم إدارة رياض الأطفال
# شغّلها من: https://shell.cloud.google.com
# الأمر: bash <(curl -fsSL https://raw.githubusercontent.com/almhbob/ahbaballah-kindergarten/main/docs/setup-google-play.sh)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_ID="ahbabullah-e85a6"
SA_NAME="google-play-publisher"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="/tmp/google-play-key-$$.json"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     إعداد Google Play Service Account تلقائياً      ║"
echo "║         نظم إدارة رياض الأطفال — ahbabullah-e85a6          ║"
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
    --display-name="Google Play Publisher — نظم إدارة رياض الأطفال" \
    --project="$PROJECT_ID" --quiet
  echo "     ✅ تم إنشاء: $SA_EMAIL"
fi

echo ""
echo "⚡ [4/5] الصلاحيات..."
# Least privilege: publishing needs NO Google Cloud IAM role. Access is granted
# only inside Google Play Console (Release Manager) — see the last step below.
echo "     ✅ لا حاجة لصلاحيات Cloud إضافية"

echo ""
echo "⚡ [5/5] إنشاء JSON Key وإرساله تلقائياً..."
rm -f "$KEY_FILE"
gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL" --project="$PROJECT_ID" --quiet

# The key is NEVER sent to the app server. Upload it straight to GitHub Secrets
# with the GitHub CLI (available in Cloud Shell), then delete the local copy.
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  gh secret set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY --repo almhbob/ahbaballah-kindergarten < "$KEY_FILE"
  echo "     ✅ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY أُضيف إلى GitHub Secrets"
else
  echo "     ⚠️  GitHub CLI غير مسجّل الدخول. شغّل: gh auth login"
  echo "     ثم: gh secret set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY --repo almhbob/ahbaballah-kindergarten < $KEY_FILE"
  echo "     (احذف الملف بعدها: rm -f $KEY_FILE)"
  exit 1
fi
rm -f "$KEY_FILE"

echo ""
echo "الخطوة الأخيرة (في Google Play Console):"
echo "1. افتح: https://play.google.com/console/developers/api-access"
echo "2. ابحث عن: $SA_EMAIL"
echo "3. اضغط 'Grant access' ثم 'Release Manager'"
echo ""
