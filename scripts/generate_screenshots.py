#!/usr/bin/env python3
"""Generate professional Play Store screenshots and set full store listing via Google Play API."""

import json, os, io, base64, textwrap
from PIL import Image, ImageDraw, ImageFont

# ── Colours ────────────────────────────────────────────────────────────────
BG       = "#0F2B4E"
PRIMARY  = "#1A6B5C"
ACCENT   = "#4ADE80"
WHITE    = "#FFFFFF"
LGRAY    = "#CBD5E1"
CARD     = "#1E3A5F"
W, H     = 1080, 1920

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0+radius, y0, x1-radius, y1], fill=fill)
    draw.rectangle([x0, y0+radius, x1, y1-radius], fill=fill)
    draw.ellipse([x0, y0, x0+2*radius, y0+2*radius], fill=fill)
    draw.ellipse([x1-2*radius, y0, x1, y0+2*radius], fill=fill)
    draw.ellipse([x0, y1-2*radius, x0+2*radius, y1], fill=fill)
    draw.ellipse([x1-2*radius, y1-2*radius, x1, y1], fill=fill)

def make_base():
    img = Image.new("RGB", (W, H), hex2rgb(BG))
    d   = ImageDraw.Draw(img)
    # subtle gradient overlay
    for i in range(H // 2):
        alpha = int(30 * (1 - i / (H // 2)))
        d.line([(0, i), (W, i)], fill=(255, 255, 255, alpha))
    return img, d

def add_header(d, title, subtitle):
    # header bar
    d.rectangle([(0,0),(W,260)], fill=hex2rgb(PRIMARY))
    # app name
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
        font_sm  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        font_xs  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        font_big = font_sm = font_xs = ImageFont.load_default()
    d.text((W//2, 110), title,    fill=hex2rgb(WHITE), font=font_big, anchor="mm")
    d.text((W//2, 190), subtitle, fill=hex2rgb(LGRAY), font=font_sm,  anchor="mm")
    return font_big, font_sm, font_xs

def add_bottom_bar(d):
    d.rectangle([(0, H-120),(W, H)], fill=hex2rgb(PRIMARY))
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        f = ImageFont.load_default()
    d.text((W//2, H-60), "روضة احباب الله  |  نظام إدارة متكامل",
           fill=hex2rgb(ACCENT), font=f, anchor="mm")

def stat_card(d, x, y, value, label, font_v, font_l):
    draw_rounded_rect(d, [x, y, x+220, y+160], 20, hex2rgb(CARD))
    d.text((x+110, y+70),  value, fill=hex2rgb(ACCENT), font=font_v, anchor="mm")
    d.text((x+110, y+130), label, fill=hex2rgb(LGRAY),  font=font_l, anchor="mm")

def row_item(d, y, icon, text, font):
    draw_rounded_rect(d, [60, y, W-60, y+90], 14, hex2rgb(CARD))
    d.text((140, y+45), icon, fill=hex2rgb(ACCENT), font=font, anchor="mm")
    d.text((200, y+45), text, fill=hex2rgb(WHITE),  font=font, anchor="lm")

# ── Screen 1 — Dashboard ──────────────────────────────────────────────────
def screen1():
    img, d = make_base()
    try:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
        fm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
        fx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        fb = fm = fs = fx = ImageFont.load_default()

    add_header(d, "لوحة التحكم", "Dashboard — Admin Panel")

    # Stats row
    stats = [("48", "طالب"), ("6", "معلمين"), ("92%", "حضور"), ("12", "إشعار")]
    for i, (v, l) in enumerate(stats):
        stat_card(d, 40 + i*260, 310, v, l, fm, fx)

    # Sections
    sections = [
        ("■", "إدارة الطلاب والسجلات الأكاديمية"),
        ("■", "متابعة الحضور اليومي"),
        ("■", "إدارة الماليات والرسوم"),
        ("■", "التواصل مع أولياء الأمور"),
        ("■", "التقارير والتحليلات"),
        ("■", "إرسال الإشعارات والأخبار"),
    ]
    for i, (icon, text) in enumerate(sections):
        row_item(d, 530 + i*120, icon, text, fs)

    add_bottom_bar(d)
    return img

# ── Screen 2 — Students ───────────────────────────────────────────────────
def screen2():
    img, d = make_base()
    try:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 52)
        fm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        fx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except:
        fb = fm = fs = fx = ImageFont.load_default()

    add_header(d, "سجل الطلاب", "Students Registry")

    students = [
        ("أ", "أحمد محمد العمر",    "روضة أ", "95%", "#10B981"),
        ("س", "سارة عبدالله",        "روضة ب", "88%", "#3B82F6"),
        ("م", "محمد علي",            "تمهيدي", "72%", "#F59E0B"),
        ("ن", "نورة الزهراني",       "روضة أ", "98%", "#10B981"),
        ("خ", "خالد السعيد",         "روضة ب", "65%", "#EF4444"),
        ("ف", "فاطمة الحربي",        "تمهيدي", "91%", "#10B981"),
    ]
    for i, (init, name, level, pct, col) in enumerate(students):
        y = 300 + i * 230
        draw_rounded_rect(d, [40, y, W-40, y+200], 18, hex2rgb(CARD))
        # avatar
        d.ellipse([70, y+40, 170, y+140], fill=hex2rgb(PRIMARY))
        d.text((120, y+90), init, fill=hex2rgb(ACCENT), font=fb, anchor="mm")
        # name & level
        d.text((210, y+70),  name,  fill=hex2rgb(WHITE), font=fm, anchor="lm")
        d.text((210, y+120), level, fill=hex2rgb(LGRAY), font=fx, anchor="lm")
        # percentage
        d.text((W-80, y+90), pct, fill=hex2rgb(col), font=fb, anchor="rm")

    add_bottom_bar(d)
    return img

# ── Screen 3 — Grades ─────────────────────────────────────────────────────
def screen3():
    img, d = make_base()
    try:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 52)
        fm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        fx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except:
        fb = fm = fs = fx = ImageFont.load_default()

    add_header(d, "سجل الدرجات", "Grades — Teacher Panel")

    subjects = [
        ("الرياضيات",    18, 20, "#10B981"),
        ("اللغة العربية", 16, 20, "#3B82F6"),
        ("العلوم",        14, 20, "#F59E0B"),
        ("التربية الفنية",19, 20, "#10B981"),
        ("الأنشطة",       20, 20, "#10B981"),
    ]
    for i, (sub, sc, tot, col) in enumerate(subjects):
        y = 310 + i * 250
        draw_rounded_rect(d, [40, y, W-40, y+210], 18, hex2rgb(CARD))
        d.text((W-80, y+60),  sub,             fill=hex2rgb(WHITE),  font=fm, anchor="rm")
        d.text((W-80, y+120), f"{sc}/{tot}",   fill=hex2rgb(col),    font=fb, anchor="rm")
        # progress bar
        bar_w = W - 160
        d.rectangle([80, y+160, 80+bar_w, y+185], fill=hex2rgb(CARD))
        draw_rounded_rect(d, [80, y+160, 80+int(bar_w*sc/tot), y+185], 8, hex2rgb(col))

    add_bottom_bar(d)
    return img

# ── Screen 4 — Finance ────────────────────────────────────────────────────
def screen4():
    img, d = make_base()
    try:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 52)
        fm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
        fx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        fb = fm = fs = fx = ImageFont.load_default()

    add_header(d, "الماليات", "Finance Management")

    # summary cards
    draw_rounded_rect(d, [40, 300, W//2-20, 500], 18, hex2rgb(PRIMARY))
    d.text((W//4, 370),  "48,000",  fill=hex2rgb(WHITE), font=fb, anchor="mm")
    d.text((W//4, 450),  "إجمالي الرسوم", fill=hex2rgb(LGRAY), font=fx, anchor="mm")

    draw_rounded_rect(d, [W//2+20, 300, W-40, 500], 18, hex2rgb(CARD))
    d.text((3*W//4, 370), "12,500", fill=hex2rgb(ACCENT), font=fb, anchor="mm")
    d.text((3*W//4, 450), "المحصّل",      fill=hex2rgb(LGRAY), font=fx, anchor="mm")

    items = [
        ("أحمد العمر",   "2,000 ج.س", "مدفوع",   "#10B981"),
        ("سارة عبدالله", "2,000 ج.س", "جزئي",    "#F59E0B"),
        ("محمد علي",     "2,000 ج.س", "متأخر",   "#EF4444"),
        ("نورة الزهراني","2,000 ج.س", "مدفوع",   "#10B981"),
        ("خالد السعيد",  "2,000 ج.س", "مدفوع",   "#10B981"),
        ("فاطمة الحربي", "2,000 ج.س", "جزئي",    "#F59E0B"),
    ]
    for i, (name, amt, status, col) in enumerate(items):
        y = 540 + i * 190
        draw_rounded_rect(d, [40, y, W-40, y+160], 14, hex2rgb(CARD))
        d.text((W-80,  y+50),  name,   fill=hex2rgb(WHITE),  font=fs, anchor="rm")
        d.text((W-80,  y+110), amt,    fill=hex2rgb(LGRAY),  font=fx, anchor="rm")
        draw_rounded_rect(d, [60, y+55, 240, y+115], 10, tuple(int(c*0.2) for c in hex2rgb(col)))
        d.text((150, y+85), status, fill=hex2rgb(col), font=fx, anchor="mm")

    add_bottom_bar(d)
    return img

# ── Screen 5 — Parent View ────────────────────────────────────────────────
def screen5():
    img, d = make_base()
    try:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 52)
        fm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
        fx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        fb = fm = fs = fx = ImageFont.load_default()

    add_header(d, "واجهة ولي الأمر", "Parent Dashboard")

    # child info card
    draw_rounded_rect(d, [40, 300, W-40, 520], 20, hex2rgb(PRIMARY))
    d.ellipse([80, 340, 200, 460], fill=hex2rgb(CARD))
    d.text((140, 400), "أ", fill=hex2rgb(ACCENT), font=fb, anchor="mm")
    d.text((W-80, 370), "أحمد محمد",  fill=hex2rgb(WHITE), font=fm, anchor="rm")
    d.text((W-80, 440), "روضة أ  |  حضور: 95%", fill=hex2rgb(LGRAY), font=fx, anchor="rm")

    items = [
        ("■", "التقرير اليومي",      "أداء ممتاز اليوم في الحصص"),
        ("■", "آخر درجة",            "الرياضيات: 18/20 — ممتاز"),
        ("■", "الحضور هذا الشهر",    "22 يوم حضور من 23 يوم"),
        ("■", "رسالة من المعلمة",    "الطالب مجتهد ومتعاون"),
        ("■", "موعد الاجتماع القادم","الاثنين 16 يونيو - 10 صباحاً"),
    ]
    for i, (ico, title, detail) in enumerate(items):
        y = 570 + i * 225
        draw_rounded_rect(d, [40, y, W-40, y+195], 16, hex2rgb(CARD))
        d.text((W-80, y+60),  title,  fill=hex2rgb(WHITE),  font=fm, anchor="rm")
        d.text((W-80, y+120), detail, fill=hex2rgb(LGRAY),  font=fx, anchor="rm")
        d.rectangle([60, y+145, W-60, y+148], fill=hex2rgb(PRIMARY))

    add_bottom_bar(d)
    return img

# ── Screen 6 — Notifications ──────────────────────────────────────────────
def screen6():
    img, d = make_base()
    try:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 52)
        fm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
        fx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        fb = fm = fs = fx = ImageFont.load_default()

    add_header(d, "الإشعارات", "Notifications & Inbox")

    notifs = [
        ("#10B981", "رد من الإدارة", "تم الرد على استفساركم", "منذ 5 دقائق"),
        ("#3B82F6", "تقرير يومي",    "تقرير أحمد ليوم الأحد جاهز", "منذ ساعة"),
        ("#F59E0B", "تذكير",         "موعد دفع الرسوم الشهر القادم", "أمس"),
        ("#10B981", "خبر مدرسي",     "رحلة علمية يوم الخميس القادم", "أمس"),
        ("#EF4444", "غياب",          "تم تسجيل غياب خالد السعيد", "2 يونيو"),
        ("#10B981", "شهادة تقدير",   "حصل أحمد على شهادة تميز", "1 يونيو"),
    ]
    for i, (col, title, body, time) in enumerate(notifs):
        y = 300 + i * 235
        draw_rounded_rect(d, [40, y, W-40, y+205], 16, hex2rgb(CARD))
        d.rectangle([40, y, 52, y+205], fill=hex2rgb(col))
        d.text((W-80, y+55),  title, fill=hex2rgb(WHITE), font=fm, anchor="rm")
        d.text((W-80, y+115), body,  fill=hex2rgb(LGRAY), font=fs, anchor="rm")
        d.text((W-80, y+165), time,  fill=hex2rgb(col),   font=fx, anchor="rm")

    add_bottom_bar(d)
    return img

# ── Generate all screens ───────────────────────────────────────────────────
OUT = "/home/user/ahbaballah-kindergarten/store-screenshots"
os.makedirs(OUT, exist_ok=True)

screens = [
    ("01_dashboard.png",     screen1),
    ("02_students.png",      screen2),
    ("03_grades.png",        screen3),
    ("04_finance.png",       screen4),
    ("05_parent.png",        screen5),
    ("06_notifications.png", screen6),
]

for name, fn in screens:
    img = fn()
    img.save(os.path.join(OUT, name), "PNG", quality=95)
    print(f"✅ {name}")

print(f"\nAll screenshots saved to {OUT}")
