# دليل إعداد الأسرار — أتمتة النشر على Google Play
**الهدف:** تفعيل النشر التلقائي بمجرد رفع إصدار جديد على GitHub

---

## الخطوة 1 — الحصول على EXPO_TOKEN

1. افتح: **https://expo.dev/settings/access-tokens**
2. اضغط **Create Token**
3. الاسم: `github-actions-ahbaballah`
4. انسخ التوكن وسمّيه `EXPO_TOKEN`

---

## الخطوة 2 — إنشاء حساب Google Play Developer

1. افتح: **https://play.google.com/console/signup**
2. سجّل بحساب: `almhbob.iii@gmail.com`
3. ادفع: **25 دولار** (مرة واحدة فقط)
4. أكمل بيانات المطور:
   - الاسم: `Ahbabullah Kindergarten`

---

## الخطوة 3 — إنشاء Service Account (المفتاح التلقائي)

### أ) في Google Cloud Console

1. افتح: **https://console.cloud.google.com**
2. اختر مشروع Firebase الخاص بالروضة
3. من القائمة: **IAM & Admin → Service Accounts**
4. اضغط **Create Service Account**:
   - الاسم: `google-play-publisher`
   - الوصف: `Google Play auto-publish for Ahbaballah`
5. انتقل لصفحة الـ Service Account المُنشأ
6. من تبويب **Keys** → **Add Key → Create new key → JSON**
7. ستُحمَّل ملف JSON — **احفظه بأمان**

### ب) في Google Play Console

1. افتح: **https://play.google.com/console**
2. اذهب: **Setup → API access**
3. اربط بمشروع Google Cloud الخاص بك
4. ابحث عن الـ Service Account المُنشأ
5. اضغط **Grant access**
6. الصلاحية المطلوبة: **Release Manager**
7. احفظ

---

## الخطوة 4 — إضافة الأسرار لـ GitHub

افتح: **https://github.com/almhbob/ahbaballah-kindergarten/settings/secrets/actions**

أضف هذه الأسرار واحداً بواحد:

| اسم السر | المصدر | الشرح |
|---|---|---|
| `EXPO_TOKEN` | expo.dev/settings | توكن Expo |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | ملف JSON كاملاً | مفتاح Google Play |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console | مفتاح Firebase |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console | نطاق Auth |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console | معرف المشروع |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Console | Storage |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | Sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase Console | App ID |

> للحصول على قيم Firebase: افتح Firebase Console → إعدادات المشروع → تطبيقاتك

---

## الخطوة 5 — تفعيل GitHub Pages (لسياسة الخصوصية)

1. افتح: **https://github.com/almhbob/ahbaballah-kindergarten/settings/pages**
2. Source: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/ (root)**
5. احفظ

**رابط سياسة الخصوصية بعد التفعيل:**
```
https://almhbob.github.io/ahbaballah-kindergarten/docs/privacy/
```

---

## الخطوة 6 — تشغيل النشر التلقائي

### طريقة أ: إنشاء Git Tag (الطريقة الموصى بها)

```bash
# من جهازك المحلي بعد تحميل المشروع
git tag v1.0.0
git push origin v1.0.0
```

سيتشغل تلقائياً:
1. ✅ فحص TypeScript
2. ✅ بناء APK للاختبار
3. ✅ بناء AAB لـ Google Play
4. ✅ رفعه لـ Google Play (Internal Track)
5. ✅ إنشاء GitHub Release

### طريقة ب: يدوياً من GitHub Actions

1. افتح: **https://github.com/almhbob/ahbaballah-kindergarten/actions**
2. اختر **Build Android — بناء تطبيق أندرويد**
3. اضغط **Run workflow**
4. اختر Profile: `play-store`
5. Submit: ✅ نعم

---

## الخطوة 7 — متابعة حالة البناء

- **EAS Dashboard:** https://expo.dev/accounts/almhbob2026/projects/ahbaballah-kindergarten/builds
- **GitHub Actions:** https://github.com/almhbob/ahbaballah-kindergarten/actions
- **Google Play Console:** https://play.google.com/console

---

## ملخص الروابط المهمة

| الرابط | الاستخدام |
|---|---|
| [Expo Dashboard](https://expo.dev/accounts/almhbob2026) | متابعة البناء |
| [Google Play Console](https://play.google.com/console) | إدارة التطبيق |
| [GitHub Actions](https://github.com/almhbob/ahbaballah-kindergarten/actions) | سجلات النشر |
| [Firebase Console](https://console.firebase.google.com) | قاعدة البيانات |
| [سياسة الخصوصية](https://almhbob.github.io/ahbaballah-kindergarten/docs/privacy/) | مطلوبة لـ Google Play |

---

*بعد اكتمال هذه الخطوات — النشر سيكون تلقائياً بالكامل بمجرد إنشاء Git Tag جديد*
