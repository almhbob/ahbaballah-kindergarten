#!/usr/bin/env python3
"""Upload store listing + screenshots to Google Play (clean approach)."""

import json, time, base64, os, subprocess, tempfile
import urllib.request, urllib.parse, urllib.error

PACKAGE = "com.ahbaballah.kindergarten"
KEY_PATH = "/home/user/ahbaballah-kindergarten/google-play-key.json"
SHOTS_DIR = "/home/user/ahbaballah-kindergarten/store-screenshots"
BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3"
UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3"

with open(KEY_PATH) as f:
    key_data = json.load(f)

def make_jwt():
    header = {"alg": "RS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "iss": key_data["client_email"], "sub": key_data["client_email"],
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now, "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/androidpublisher",
    }
    b64 = lambda d: base64.urlsafe_b64encode(
        json.dumps(d, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()
    msg = f"{b64(header)}.{b64(payload)}"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".pem", delete=False) as f:
        f.write(key_data["private_key"]); kf = f.name
    sig = subprocess.check_output(["openssl", "dgst", "-sha256", "-sign", kf], input=msg.encode())
    os.unlink(kf)
    return f"{msg}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"

def get_token():
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": make_jwt(),
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["access_token"]

def call(method, url, token, body=None, raw=None, ct="application/json"):
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    elif raw is not None:
        req.data = raw
        req.add_header("Content-Type", ct)
    try:
        with urllib.request.urlopen(req) as r:
            content = r.read()
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"   HTTP {e.code} @ {url.split('/')[-1][:40]}: {err[:120]}")
        return None

print("🔑 Getting token...")
token = get_token()
print("   ✅ OK")

# ── Create edit ────────────────────────────────────────────────────────────
print("🔄 Creating edit...")
edit = call("POST", f"{BASE}/applications/{PACKAGE}/edits", token, body={})
eid = edit["id"]
print(f"   Edit: {eid}")

# ── Store listing (Arabic) ─────────────────────────────────────────────────
print("📝 Store listing...")
r = call("PUT", f"{BASE}/applications/{PACKAGE}/edits/{eid}/listings/ar", token, body={
    "language": "ar",
    "title": "روضة احباب الله",
    "shortDescription": "نظام إدارة متكامل لرياض الأطفال — طلاب، معلمون، وأولياء أمور",
    "fullDescription": (
        "روضة احباب الله — نظام إدارة رياض الأطفال المتكامل\n\n"
        "للمدير:\n"
        "• لوحة تحكم شاملة مع إحصائيات فورية\n"
        "• إدارة الطلاب والمعلمين\n"
        "• متابعة الماليات والرسوم\n"
        "• قبول طلبات التسجيل تلقائياً\n"
        "• التحليلات والتقارير والجدول الدراسي\n"
        "• الشهادات التقديرية وبطاقات الهوية\n\n"
        "للمعلمة:\n"
        "• تسجيل الحضور بضغطة واحدة\n"
        "• رصد الدرجات وإضافة مواد مخصصة\n"
        "• تقارير يومية لأولياء الأمور\n\n"
        "لولي الأمر:\n"
        "• متابعة الحضور والدرجات\n"
        "• التواصل مع الإدارة\n"
        "• إشعارات فورية\n\n"
        "يعمل بدون إنترنت — واجهة عربية كاملة — آمن ومشفر\n"
        "مصمم للروضات في الوطن العربي."
    ),
})
print("   ✅ Listing set" if r else "   ❌ Listing failed")

# ── Upload screenshots ─────────────────────────────────────────────────────
print("🖼️  Uploading screenshots...")
shots = sorted(f for f in os.listdir(SHOTS_DIR) if f.endswith(".png"))
for fname in shots:
    with open(os.path.join(SHOTS_DIR, fname), "rb") as f:
        data = f.read()
    url = f"{UPLOAD}/applications/{PACKAGE}/edits/{eid}/listings/ar/images/phoneScreenshots?uploadType=media"
    r = call("POST", url, token, raw=data, ct="image/png")
    print(f"   {'✅' if r else '❌'} {fname}")

# ── Details ────────────────────────────────────────────────────────────────
print("📋 Setting details...")
call("PUT", f"{BASE}/applications/{PACKAGE}/edits/{eid}/details", token, body={
    "defaultLanguage": "ar",
    "contactEmail": "almhbob.iii@gmail.com",
    "contactWebsite": "https://almhbob.github.io/ahbaballah-kindergarten/privacy/",
})

# ── Commit ─────────────────────────────────────────────────────────────────
print("🚀 Committing...")
r = call("POST", f"{BASE}/applications/{PACKAGE}/edits/{eid}:commit", token)
print(f"   ✅ Done! Edit: {r.get('id','?')}" if r else "   ❌ Commit failed")
print("\n🎉 Store listing complete!")
