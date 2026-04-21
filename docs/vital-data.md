# البيانات الحيوية — تطبيق روضة أحباب الله
**تاريخ الإصدار:** 21 أبريل 2026  
**حالة المشروع:** جاهز للنشر

---

## 1. هوية التطبيق

| الحقل | القيمة |
|---|---|
| اسم التطبيق | روضة أحباب الله — الخاصة |
| اسم الحزمة (Android) | `com.ahbaballah.kindergarten` |
| معرف الحزمة (iOS) | `com.ahbaballah.kindergarten` |
| الإصدار (Version Name) | `1.0.0` |
| رقم الإصدار (Version Code) | `1` |
| رمز التطبيق (Slug) | `ahbaballah-kindergarten` |
| مالك حساب Expo | `almhbob2026` |
| معرف مشروع EAS | `49375b1b-0c16-4d1a-bb25-2b5e7af08864` |
| مخطط الروابط (Scheme) | `ahbaballah` |

---

## 2. بيانات المدرسة

| الحقل | القيمة |
|---|---|
| اسم الروضة | روضة أحباب الله — الخاصة |
| اسم المديرة | أ. سلوى أحمد داموس |
| رقم الهاتف | +249917545129 |
| البريد الإلكتروني | Ahbaballah2026@hotmail.com |
| الشعار | جودة • التزام • تميز |
| الموقع | صفيتة الغنوماب، السودان |
| العام الدراسي | 2025–2026 |

---

## 3. بنية المستخدمين وكلمات المرور الافتراضية

| نوع المستخدم | طريقة الدخول | كلمة المرور الافتراضية |
|---|---|---|
| المدير (Admin) | رمز الإدارة | `1234` |
| المطور (Developer) | رمز المطور | `dev@2026` |
| المعلمة | البريد الإلكتروني + كلمة مرور | `1234` |
| ولي الأمر | رقم الطالب + كلمة مرور | `1234` |
| الزائر (Guest) | بدون كلمة مرور | — |

> ⚠️ يجب تغيير كلمات المرور الافتراضية عند الإطلاق الرسمي

---

## 4. Firebase — الإعداد الحالي

| الخدمة | الحالة |
|---|---|
| Firebase Project ID | مُعيَّن في متغيرات البيئة |
| Firestore Database | نشط — `schools/ahbabullah/...` |
| Firebase Auth | نشط — Email/Password |
| Firebase Storage | نشط — لتخزين الصور |
| Firebase Cloud Messaging | مدمج عبر Expo Notifications |

**مسار بيانات Firestore:**
```
/schools/{schoolId}/
  ├── students/
  ├── employees/
  ├── messages/
  ├── news/
  ├── inbox/
  ├── registrationRequests/
  ├── schoolEvents/
  ├── galleryPhotos/
  └── config/branding
/schoolRegistry/
/schoolAccounts/
```

---

## 5. المكتبات والتقنيات الرئيسية

| التقنية | الإصدار | الاستخدام |
|---|---|---|
| Expo SDK | 54 | إطار العمل الأساسي |
| React Native | 0.81.5 | واجهة المستخدم |
| Expo Router | 6.x | التنقل بين الشاشات |
| Firebase | 12.x | قاعدة البيانات + Auth |
| TanStack Query | 5.x | إدارة حالة الخادم |
| Express.js | 5.x | الخادم الخلفي |
| Drizzle ORM | 0.39.x | قاعدة البيانات المحلية |

---

## 6. هيكل الشاشات

```
app/
├── (admin)/          ← لوحة الإدارة الكاملة
│   ├── dashboard     ← الإحصائيات العامة
│   ├── students      ← إدارة الطلاب
│   ├── employees     ← إدارة الموظفين
│   ├── inbox         ← صندوق الوارد
│   ├── messages      ← المحادثات
│   ├── news          ← الأخبار والإعلانات
│   ├── schedule      ← الجدول الدراسي
│   ├── calendar      ← التقويم
│   ├── meetings      ← الاجتماعات
│   ├── transport     ← النقل المدرسي
│   ├── gallery       ← معرض الصور
│   ├── branding      ← هوية الروضة
│   └── developer     ← إعدادات المطور
│
├── (teacher)/        ← بوابة المعلمة
│   ├── students      ← طلاب الفصل
│   ├── schedule      ← الجدول اليومي
│   └── messages      ← التواصل
│
├── (parent)/         ← بوابة ولي الأمر
│   ├── child         ← متابعة الطفل
│   ├── reports       ← التقارير اليومية
│   ├── honor         ← لوحة الشرف
│   ├── fees          ← الرسوم
│   └── messages      ← التواصل
│
└── (guest)/          ← واجهة الزائر
    ├── register      ← التسجيل الإلكتروني
    └── info          ← معلومات الروضة
```

---

## 7. متغيرات البيئة المطلوبة

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
EXPO_PUBLIC_DOMAIN=
```

---

## 8. مستودع GitHub

| الحقل | القيمة |
|---|---|
| المستودع | `almhbob/ahbaballah-kindergarten` |
| الفرع الرئيسي | `main` |
| آخر إصدار مرفوع | تحسين Firebase — 21 أبريل 2026 |

---

## 9. أصول التطبيق (Assets)

| الملف | المسار | الاستخدام |
|---|---|---|
| أيقونة التطبيق | `assets/images/icon.png` | الأيقونة الرئيسية |
| Splash Screen | `assets/images/splash-icon.png` | شاشة البداية |
| أيقونة أندرويد | `assets/images/android-icon-foreground.png` | Adaptive Icon |
| خلفية أيقونة أندرويد | `assets/images/android-icon-background.png` | Adaptive Icon |
| Favicon | `assets/images/favicon.png` | الويب |

---

## 10. منافذ الخوادم (Development)

| الخادم | المنفذ |
|---|---|
| Expo Dev Server | `8081` |
| Express Backend | `5000` |

---

*تم إعداد هذا المستند بواسطة نظام الإدارة التقني — روضة أحباب الله*
