#!/usr/bin/env python3
"""Upload screenshots and store listing using raw JWT auth (no cryptography lib needed)."""

import json, time, base64, struct, os, sys, urllib.request, urllib.error

KEY_PATH      = "/home/user/ahbaballah-kindergarten/google-play-key.json"
PACKAGE_NAME  = "com.ahbaballah.kindergarten"
SCREENSHOTS_DIR = "/home/user/ahbaballah-kindergarten/store-screenshots"

# ── Pure-python RSA signing via subprocess openssl ─────────────────────────
import subprocess, tempfile

def make_jwt(key_data: dict) -> str:
    header  = {"alg": "RS256", "typ": "JWT"}
    now     = int(time.time())
    payload = {
        "iss":   key_data["client_email"],
        "sub":   key_data["client_email"],
        "aud":   "https://oauth2.googleapis.com/token",
        "iat":   now,
        "exp":   now + 3600,
        "scope": "https://www.googleapis.com/auth/androidpublisher",
    }
    b64 = lambda d: base64.urlsafe_b64encode(json.dumps(d, separators=(",",":")).encode()).rstrip(b"=").decode()
    msg = f"{b64(header)}.{b64(payload)}"

    # write private key to temp file and sign with openssl
    with tempfile.NamedTemporaryFile(mode="w", suffix=".pem", delete=False) as f:
        f.write(key_data["private_key"])
        key_file = f.name
    try:
        sig = subprocess.check_output(
            ["openssl", "dgst", "-sha256", "-sign", key_file],
            input=msg.encode()
        )
    finally:
        os.unlink(key_file)

    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()
    return f"{msg}.{sig_b64}"

def get_token(key_data: dict) -> str:
    import urllib.parse as urlparse
    jwt = make_jwt(key_data)
    data = urlparse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion":  jwt,
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["access_token"]

def api(method, url, token, body=None, data=None, content_type="application/json"):
    import urllib.parse
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        payload = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
        req.data = payload
    elif data is not None:
        req.add_header("Content-Type", content_type)
        req.data = data
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"   HTTP {e.code}: {e.read().decode()[:300]}")
        return None

import urllib.parse

BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3"

with open(KEY_PATH) as f:
    key_data = json.load(f)

print("🔑 Getting access token...")
token = get_token(key_data)
print("   ✅ Token obtained")

# Create edit
print("🔄 Creating edit...")
edit = api("POST", f"{BASE}/applications/{PACKAGE_NAME}/edits", token, body={})
if not edit:
    sys.exit(1)
edit_id = edit["id"]
print(f"   Edit ID: {edit_id}")

# Store listing
print("📝 Updating store listing (Arabic)...")
listing_body = {
    "language": "ar",
    "title": "روضة احباب الله",
    "shortDescription": "نظام إدارة متكامل لرياض الأطفال — طلاب، معلمون، وأولياء أمور",
    "fullDescription": """روضة احباب الله — نظام إدارة رياض الأطفال المتكامل

تطبيق متخصص يُسهِّل إدارة الروضة ويُعزِّز التواصل بين الإدارة والمعلمين وأولياء الأمور.

للمدير:
• لوحة تحكم شاملة مع إحصائيات فورية
• إدارة الطلاب والمعلمين والموظفين
• متابعة الماليات (رسوم + مصاريف)
• قبول طلبات التسجيل تلقائياً
• الرد على رسائل أولياء الأمور
• التحليلات والتقارير الشاملة
• الجدول الدراسي والفعاليات
• الشهادات التقديرية وبطاقات الهوية
• السجلات الصحية

للمعلمة:
• تسجيل الحضور بضغطة واحدة
• رصد الدرجات وإضافة مواد مخصصة
• إرسال تقارير يومية لأولياء الأمور
• التقييمات الشاملة

لولي الأمر:
• متابعة حضور الطفل وغيابه
• الاطلاع على الدرجات والتقييمات
• التواصل المباشر مع الإدارة
• إشعارات فورية

يعمل بدون إنترنت — واجهة عربية كاملة — آمن ومشفر
مصمم خصيصاً للروضات في الوطن العربي."""
}
r = api("PUT",
    f"{BASE}/applications/{PACKAGE_NAME}/edits/{edit_id}/listings/ar",
    token, body=listing_body)
print("   ✅ Listing updated" if r else "   ❌ Failed")

# App details
print("📋 Setting contact/privacy details...")
details = api("PUT",
    f"{BASE}/applications/{PACKAGE_NAME}/edits/{edit_id}/details",
    token,
    body={
        "defaultLanguage": "ar",
        "contactEmail": "almhbob.iii@gmail.com",
        "contactWebsite": "https://almhbob.github.io/ahbaballah-kindergarten/privacy/",
    })
print("   ✅ Details set" if details else "   ⚠️  Details (non-critical)")

# Screenshots
print("🖼️  Uploading screenshots...")
IMG_TYPE = "phoneScreenshots"
UPLOAD_BASE = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3"

# clear existing screenshots
api("DELETE",
    f"{BASE}/applications/{PACKAGE_NAME}/edits/{edit_id}/listings/ar/images/{IMG_TYPE}",
    token)

screenshots = sorted(f for f in os.listdir(SCREENSHOTS_DIR) if f.endswith(".png"))
for fname in screenshots:
    fpath = os.path.join(SCREENSHOTS_DIR, fname)
    with open(fpath, "rb") as f:
        img_data = f.read()
    upload_url = (
        f"{UPLOAD_BASE}/applications/{PACKAGE_NAME}/edits/{edit_id}"
        f"/listings/ar/images/{IMG_TYPE}?uploadType=media"
    )
    r = api("POST", upload_url, token, data=img_data, content_type="image/png")
    print(f"   {'✅' if r else '❌'} {fname}")

# Commit
print("🚀 Committing edit...")
commit = api("POST",
    f"{BASE}/applications/{PACKAGE_NAME}/edits/{edit_id}:commit",
    token)
print(f"   ✅ Committed: {commit}" if commit else "   ❌ Commit failed")
print("\n🎉 Done!")
