#!/usr/bin/env python3
"""Complete Play Store setup: screenshots + release promotion."""

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
        "iss": key_data["client_email"],
        "sub": key_data["client_email"],
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/androidpublisher",
    }
    b64 = lambda d: base64.urlsafe_b64encode(
        json.dumps(d, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()
    msg = f"{b64(header)}.{b64(payload)}"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".pem", delete=False) as f:
        f.write(key_data["private_key"])
        kf = f.name
    sig = subprocess.check_output(
        ["openssl", "dgst", "-sha256", "-sign", kf], input=msg.encode()
    )
    os.unlink(kf)
    return f"{msg}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"


def get_token():
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": make_jwt(),
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
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
        print(f"   HTTP {e.code} @ {url}: {err[:400]}")
        return None


print("=" * 60)
print("🔑 Getting token...")
token = get_token()
print("   ✅ Token OK")

# ── Create edit ────────────────────────────────────────────────
print("\n🔄 Creating edit...")
edit = call("POST", f"{BASE}/applications/{PACKAGE}/edits", token, body={})
if not edit:
    print("❌ Cannot create edit — check permissions")
    exit(1)
eid = edit["id"]
print(f"   Edit ID: {eid}")

# ── List existing image types to discover valid values ──────────
print("\n🔍 Listing image types for 'ar' listing...")
for img_type in ["phoneScreenshots", "sevenInchScreenshots", "tenInchScreenshots",
                  "tvScreenshots", "wearScreenshots", "icon", "featureGraphic",
                  "promoGraphic", "tvBanner"]:
    r = call("GET",
             f"{BASE}/applications/{PACKAGE}/edits/{eid}/listings/ar/images/{img_type}",
             token)
    if r is not None:
        count = len(r.get("images", []))
        print(f"   {img_type}: {count} image(s)")
    else:
        print(f"   {img_type}: ❌ not accessible")

# ── Attempt screenshot upload ───────────────────────────────────
print("\n🖼️  Uploading screenshots...")
shots = sorted(f for f in os.listdir(SHOTS_DIR) if f.endswith(".png"))
success_count = 0

for fname in shots:
    fpath = os.path.join(SHOTS_DIR, fname)
    with open(fpath, "rb") as f:
        data = f.read()

    # Try media upload
    url = (f"{UPLOAD}/applications/{PACKAGE}/edits/{eid}"
           f"/listings/ar/images/phoneScreenshots?uploadType=media")
    r = call("POST", url, token, raw=data, ct="image/png")
    if r:
        print(f"   ✅ {fname} → {r.get('image', {}).get('id', '?')}")
        success_count += 1
    else:
        print(f"   ❌ {fname} — upload failed")
        break

if success_count > 0:
    # Commit if any uploads succeeded
    print(f"\n🚀 Committing ({success_count} screenshots uploaded)...")
    r = call("POST", f"{BASE}/applications/{PACKAGE}/edits/{eid}:commit", token)
    print(f"   ✅ Committed: {r.get('id','?')}" if r else "   ❌ Commit failed")
else:
    # No screenshots — try to get current tracks info and promote release
    print("\n⚠️  Screenshot upload failed. Checking tracks...")

    # Check internal track
    r = call("GET", f"{BASE}/applications/{PACKAGE}/edits/{eid}/tracks/internal", token)
    if r:
        print(f"   Internal track: {json.dumps(r, ensure_ascii=False, indent=2)}")
    else:
        print("   Internal track: not found")

    # Check production track
    r = call("GET", f"{BASE}/applications/{PACKAGE}/edits/{eid}/tracks/production", token)
    if r:
        print(f"   Production track: {json.dumps(r, ensure_ascii=False, indent=2)}")

    # Try to list all tracks
    r = call("GET", f"{BASE}/applications/{PACKAGE}/edits/{eid}/tracks", token)
    if r:
        print(f"   All tracks: {json.dumps(r, ensure_ascii=False, indent=2)}")

    # Abandon this edit (no changes)
    call("DELETE", f"{BASE}/applications/{PACKAGE}/edits/{eid}", token)
    print("   Edit abandoned (no changes)")

print("\n✅ Script complete")
