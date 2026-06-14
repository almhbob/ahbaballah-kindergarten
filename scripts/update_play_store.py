#!/usr/bin/env python3
"""Upload screenshots and full store listing to Google Play via API."""

import json, sys, os, mimetypes
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

KEY_PATH      = "/home/user/ahbaballah-kindergarten/google-play-key.json"
PACKAGE_NAME  = "com.ahbaballah.kindergarten"
SCREENSHOTS_DIR = "/home/user/ahbaballah-kindergarten/store-screenshots"
SCOPES        = ["https://www.googleapis.com/auth/androidpublisher"]

SHORT_DESC = "نظام إدارة متكامل لرياض الأطفال — طلاب، معلمون، وأولياء أمور"

FULL_DESC = """روضة احباب الله — نظام إدارة رياض الأطفال المتكامل

تطبيق متخصص يُسهِّل إدارة الروضة بشكل احترافي ويُعزِّز التواصل بين الإدارة والمعلمين وأولياء الأمور.

🏫 للمدير:
• لوحة تحكم شاملة مع إحصائيات فورية
• إدارة الطلاب والمعلمين والموظفين
• متابعة الماليات (رسوم الطلاب + المصاريف)
• قبول طلبات التسجيل وإنشاء ملفات الطلاب تلقائياً
• الرد على رسائل أولياء الأمور
• إرسال الإشعارات والأخبار
• لوحة التحليلات والتقارير
• إدارة الجدول الدراسي والفعاليات
• برنامج المكافآت والشهادات التقديرية

👩‍🏫 للمعلمة:
• تسجيل الحضور اليومي بضغطة واحدة
• رصد الدرجات وإضافة مواد مخصصة
• إرسال تقارير يومية لأولياء الأمور
• التقييمات الشاملة

👨‍👩‍👧 لولي الأمر:
• متابعة حضور الطفل وغيابه
• الاطلاع على الدرجات والتقييمات
• قراءة التقارير اليومية
• التواصل المباشر مع الإدارة
• استلام إشعارات فورية

✅ يعمل بدون إنترنت (وضع عدم الاتصال)
✅ واجهة عربية بالكامل
✅ تصميم احترافي يدعم RTL
✅ آمن ومشفر

مصمم خصيصاً للروضات في الوطن العربي."""

creds   = service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

print("🔄 Creating edit...")
edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
edit_id = edit["id"]
print(f"   Edit ID: {edit_id}")

# ── Store listing ──────────────────────────────────────────────────────────
print("📝 Updating store listing...")
service.edits().listings().update(
    packageName=PACKAGE_NAME,
    editId=edit_id,
    language="ar",
    body={
        "language":         "ar",
        "title":            "روضة احباب الله",
        "shortDescription": SHORT_DESC,
        "fullDescription":  FULL_DESC,
    }
).execute()
print("   ✅ Listing updated")

# ── App details (category + privacy policy) ───────────────────────────────
print("📋 Setting app details...")
service.edits().details().update(
    packageName=PACKAGE_NAME,
    editId=edit_id,
    body={
        "defaultLanguage":  "ar",
        "contactEmail":     "almhbob.iii@gmail.com",
        "contactWebsite":   "https://almhbob.github.io/ahbaballah-kindergarten/privacy/",
    }
).execute()
print("   ✅ Details updated")

# ── Screenshots ────────────────────────────────────────────────────────────
print("🖼️  Uploading screenshots...")
image_type = "phoneScreenshots"

# Delete existing screenshots first
try:
    service.edits().images().deleteall(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        language="ar",
        imageType=image_type,
    ).execute()
    print("   Cleared existing screenshots")
except Exception as e:
    print(f"   (No existing screenshots to clear: {e})")

screenshots = sorted([
    f for f in os.listdir(SCREENSHOTS_DIR) if f.endswith(".png")
])

for fname in screenshots:
    fpath = os.path.join(SCREENSHOTS_DIR, fname)
    media = MediaFileUpload(fpath, mimetype="image/png", resumable=False)
    result = service.edits().images().upload(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        language="ar",
        imageType=image_type,
        media_body=media,
    ).execute()
    print(f"   ✅ {fname} → {result['image']['id']}")

# ── Commit ─────────────────────────────────────────────────────────────────
print("🚀 Committing changes...")
commit = service.edits().commit(
    packageName=PACKAGE_NAME,
    editId=edit_id,
).execute()
print(f"   ✅ Committed! Edit ID: {commit['id']}")
print("\n🎉 Play Store listing fully updated!")
