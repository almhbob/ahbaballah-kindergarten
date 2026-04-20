# دليل النشر الآلي — روضة أحباب الله

## الإعداد المطلوب (مرة واحدة فقط)

### 1. الحصول على EXPO_TOKEN
1. افتح https://expo.dev/accounts/almhbob2026/settings/access-tokens
2. أنشئ Token جديد باسم "GitHub Actions"
3. انسخ القيمة

### 2. إعداد Google Play Console
1. افتح https://play.google.com/console
2. أنشئ حساباً للتطبيق (إن لم يكن موجوداً)
   - Package Name: `com.ahbaballah.kindergarten`
3. انتقل إلى: Setup → API access → Create new service account
4. احفظ الـ JSON key كـ `google-play-key.json`

### 3. إضافة Secrets في GitHub
افتح: https://github.com/almhbob/ahbaballah-kindergarten/settings/secrets/actions

أضف هذه الـ Secrets:

| اسم السر | القيمة |
|---------|--------|
| `EXPO_TOKEN` | التوكن من expo.dev |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | مفتاح Firebase |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | محتوى ملف JSON كاملاً |

---

## طريقة النشر

### نشر تلقائي (الأفضل)
```bash
# أنشئ tag بإصدار جديد
git tag v1.0.1
git push origin v1.0.1
```
يعمل تلقائياً:
- ✅ فحص TypeScript
- ✅ بناء APK للاختبار
- ✅ بناء AAB لـ Google Play
- ✅ إنشاء GitHub Release
- ✅ رفع على Google Play (internal track)

### نشر يدوي
1. افتح: https://github.com/almhbob/ahbaballah-kindergarten/actions
2. اختر "Build Android" أو "Publish Stores"
3. اضغط "Run workflow"
4. اختر البروفايل والـ Track

---

## البروفايلات المتاحة

| البروفايل | النوع | الاستخدام |
|-----------|-------|-----------|
| `development` | APK | للتطوير والاختبار المحلي |
| `preview` | APK | للاختبار الداخلي مع الفريق |
| `apk` | APK | توزيع مباشر (خارج المتجر) |
| `play-store` | AAB | النشر على Google Play |
| `app-store` | IPA | النشر على App Store (iOS) |

---

## مراقبة البناء
- EAS Dashboard: https://expo.dev/accounts/almhbob2026/projects/ahbaballah-kindergarten/builds
- GitHub Actions: https://github.com/almhbob/ahbaballah-kindergarten/actions

---

## الإصدارات
- زد `versionCode` في `app.json` → `android.versionCode` مع كل إصدار جديد
- زد `version` في `app.json` للإصدار الظاهر للمستخدم

---

*تطوير: م / عاصم عبدالرحمن محمد | 2026*
