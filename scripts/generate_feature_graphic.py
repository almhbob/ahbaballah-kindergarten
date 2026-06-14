#!/usr/bin/env python3
"""Generate 1024x500 feature graphic for Google Play Store."""

from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = "/home/user/ahbaballah-kindergarten/store-screenshots"
DOCS_DIR = "/home/user/ahbaballah-kindergarten/docs/screenshots"

BG      = (15, 43, 78)       # #0F2B4E
PRIMARY = (26, 107, 92)      # #1A6B5C
ACCENT  = (74, 222, 128)     # #4ADE80
WHITE   = (255, 255, 255)
DARK    = (10, 30, 55)

W, H = 1024, 500

def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def make_feature_graphic():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Background gradient circles (decorative)
    for r in range(400, 50, -30):
        alpha = int(255 * (1 - r/400) * 0.15)
        circle_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cd = ImageDraw.Draw(circle_img)
        cx, cy = W//2, H//2
        cd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(*PRIMARY, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), circle_img).convert("RGB")
        draw = ImageDraw.Draw(img)

    # Top accent bar
    draw.rectangle([0, 0, W, 6], fill=ACCENT)

    # Left decorative panel
    draw.rectangle([0, 0, 200, H], fill=(*DARK, ))
    draw.rectangle([200, 0, 204, H], fill=PRIMARY)

    # Icon circle on left
    cx, cy = 100, H//2
    r = 60
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=PRIMARY)
    draw.ellipse([cx-r+3, cy-r+3, cx+r-3, cy+r-3], outline=ACCENT, width=3)

    # Kindergarten emoji symbol area
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        font_tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except:
        font_large = font_medium = font_small = font_tiny = ImageFont.load_default()

    # "K" in icon circle
    draw.text((cx, cy), "K", font=font_large, fill=ACCENT, anchor="mm")

    # Main title (Arabic text as transliteration since PIL may not render RTL)
    title_lines = [
        ("Rawdat Ahbaballah", font_large, ACCENT, 320, 130),
        ("روضة أحباب الله", font_large, WHITE, 320, 180),
    ]

    # English subtitle
    draw.text((320, 130), "Rawdat Ahbaballah", font=font_large, fill=ACCENT)
    draw.text((320, 180), "روضة أحباب الله", font=font_large, fill=WHITE)

    # Divider
    draw.rectangle([315, 225, 900, 228], fill=PRIMARY)

    # Feature bullets
    features = [
        ("• نظام إدارة متكامل", 245),
        ("• طلاب • معلمون • أولياء أمور", 278),
        ("• تعمل بدون إنترنت", 311),
    ]
    for text, y in features:
        draw.text((320, y), text, font=font_medium, fill=(180, 220, 200))

    # Right side feature icons strip
    icons = [
        ("\U0001f4ca", "Analytics", 740, 160),
        ("\U0001f4da", "Grades",    840, 160),
        ("\U0001f4b0", "Finance",   740, 260),
        ("\U0001f514", "Notify",    840, 260),
        ("\U0001f3eb", "Classes",   740, 360),
        ("\U0001f91d", "Parents",   840, 360),
    ]
    for emoji, label, x, y in icons:
        # Icon box
        draw.rounded_rectangle([x-35, y-35, x+35, y+35], radius=12, fill=(26, 55, 90))
        draw.rounded_rectangle([x-35, y-35, x+35, y+35], radius=12, outline=PRIMARY, width=2)
        draw.text((x, y-8), emoji, font=font_medium, fill=WHITE, anchor="mm")
        draw.text((x, y+20), label, font=font_tiny, fill=(150, 180, 160), anchor="mm")

    # Bottom bar
    draw.rectangle([0, H-40, W, H], fill=DARK)
    draw.rectangle([0, H-40, W, H-38], fill=PRIMARY)
    draw.text((W//2, H-20), "com.ahbaballah.kindergarten  |  Education",
              font=font_tiny, fill=(100, 140, 120), anchor="mm")

    return img

print("Generating feature graphic (1024x500)...")
fg = make_feature_graphic()
out1 = os.path.join(OUT_DIR, "00_feature_graphic.png")
out2 = os.path.join(DOCS_DIR, "00_feature_graphic.png")
fg.save(out1)
fg.save(out2)
print(f"✅ Saved to {out1}")
print(f"✅ Saved to {out2}")
print("Feature graphic size:", fg.size)
