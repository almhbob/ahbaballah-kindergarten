# روضة أحباب الله - الخاصة

## Overview
تطبيق إدارة روضة أحباب الله الخاصة في صفيتة الغنوماب — بني بـ Expo React Native + Express.js + PostgreSQL.

## Architecture
- **Frontend**: Expo Router (file-based routing), React Native + Web
- **Backend**: Express.js (port 5000) — REST API + landing page
- **Database**: PostgreSQL (Replit cloud DB) via pg Pool
- **State**: AppDataContext (React Context) — persists to AsyncStorage + PostgreSQL cloud (app_state table)
- **Auth**: Dual-layer — local AppDataContext + backend PostgreSQL users table

## User Roles & Login
| Role | Login field | Default password |
|------|-------------|-----------------|
| Admin (أدمن) | username: `admin` | `1234` |
| Teacher (معلمة) | email (e.g. `noura@ahbaballah.edu`) | `1234` |
| Parent (ولي أمر) | phone (e.g. `+249912345678`) | `1234` |
| Guest (ضيف) | No login needed | — |

Admin password can be changed from Settings → Developer panel → Admin password.

## API Routes
- `POST /api/auth/register` — create teacher/parent account
- `POST /api/auth/login` — authenticate
- `GET/PUT /api/state/:key` — cloud state sync (19 keys)
- `GET/POST /api/reviews` — parent reviews
- `GET/PATCH/DELETE /api/reviews/:id` — review management
- `POST /api/files/upload` — file uploads
- `GET /api/health` — health check

## Database Tables
- `users` — auth accounts (admin, teacher, parent)
- `reviews` — parent reviews (approved auto)
- `app_state` — cloud-synced app state (JSON key-value)

## Key Features
- **Admin**: Dashboard stats, student management, employee management, finance/payroll, news, inbox, meetings, schedule, graduation, transport, banners, registration requests, developer panel, analytics dashboard, bulk notifications, calendar, photo gallery
- **Teacher**: Class schedule, student notebook, grades, attendance, curriculum planner, performance analytics
- **Parent**: Child profile (ملف الطالب), daily reports, messages, notifications, fees tracker, write reviews
- **Guest**: Landing page with school info, services, levels, reviews, registration timeline, enrollment request form (with document upload)

## Firebase Integration
- **SDK**: `firebase` JS SDK (Expo Go compatible — no native build required)
- **Config**: env vars with `EXPO_PUBLIC_FIREBASE_*` prefix (set in Replit Secrets)
- **Project**: `ahbabullah-e85a6` (Firestore + Storage)
- **Files**:
  - `lib/firebase.ts` — init, getDb(), getFirebaseStorage(), isFirebaseReady()
  - `lib/firestore-service.ts` — CRUD + real-time listeners for all collections
  - `components/FirebaseSyncStatus.tsx` — sync indicator + bulk upload button (on admin home)
  - `firestore.rules` — Firestore security rules (open for now, tighten before prod)
- **Data model**: `schools/ahbabullah/{collection}/{docId}`
  - Collections: students, employees, messages, news, inbox, registrationRequests, schoolEvents, galleryPhotos
- **Sync strategy**: Local state (AsyncStorage) + Express API + Firestore (triple-layer). Firestore listeners override local on mount. Each write goes to all three.
- **Missing**: EXPO_PUBLIC_FIREBASE_API_KEY must be added to Replit Secrets

## School Branding & Multi-School System
- **Architecture**: `SchoolThemeContext` provides `branding` + `DynamicTheme` to entire app
- **Active school**: stored in `lib/active-school.ts` (module var + AsyncStorage `active_school_id`)
- **Firestore paths**:
  - Branding: `schools/{schoolId}/config/branding`
  - School registry: `schoolRegistry/{schoolId}` (root level — cross-school)
- **Color presets**: 6 curated palettes in `COLOR_PRESETS` array (SchoolThemeContext)
- **Hooks**: `useSchoolTheme()` → `{ branding, theme, schools, activeSchoolId, updateBranding, switchSchool, registerSchool, ... }`
- **DynamicTheme**: `primary`, `accent`, `adminGrad`, `goldGrad`, etc. — derived from branding colors
- **Key files**:
  - `lib/active-school.ts` — active schoolId module
  - `contexts/SchoolThemeContext.tsx` — full branding system
  - `app/(admin)/branding.tsx` — visual identity editor (logo, colors, preview)
  - Developer panel → "إدارة الروضات (SaaS)" section — add/edit/delete/switch schools
- **Multi-school SaaS**: Developer panel allows registering unlimited schools, each with unique ID, colors, subscription status, expiry date
- **Subscription tiers**: `lib/subscription-tiers.ts` — Trial/Basic/Professional/Enterprise with student/teacher/gallery limits and SAR pricing
- **Firebase Auth per-school**: `lib/school-auth.ts` — `createSchoolAdminAccount()` creates Firebase Auth user linked to schoolId in `schoolAccounts/{uid}`; `schoolAdminSignIn()` returns schoolId + tier
- **School login screen**: `app/school-login.tsx` — Firebase Auth login for school admins (routes to /(admin) after auth)
- **Firestore rules**: `schoolAccounts/{uid}` — users can only read their own account doc; school data fully accessible (tighten in production)
- **Capacity system**: `checkCapacity(current, limit)` + `capacityColor()` — shows % bars on school cards; unlimited tier shows ∞
- **SaaS overview chips**: developer panel shows tier distribution (🆓/⭐/💎/🏆) + total count + school-login button

## Screens Added (Recent)
- `app/(admin)/analytics.tsx` — comprehensive admin analytics dashboard
- `app/(admin)/notifications-send.tsx` — bulk notification sender
- `app/(parent)/fees.tsx` — tuition fees tracker with installments
- `app/(parent)/profile.tsx` — comprehensive child profile screen
- `app/(teacher)/performance.tsx` — class performance analytics
- `app/enrollment-request.tsx` — enrollment request form with document upload (2-step: data + docs)

## Color Theme
- Primary: `#0c1155` (Deep Navy)
- Accent: `#c9952a` (Gold)
- Teacher: `#1A6B5C` (Teal)
- Parent: `#7B3FA0` (Purple)

## Routes
- `/login` — role selection & login
- `/register` — create teacher/parent account
- `/school-login` — Firebase Auth login for school admins
- `/privacy` — Privacy Policy & Terms of Service (Arabic, tabbed)
- `/onboarding` — 5-step onboarding guide for new school admins
- `/(admin)/` — admin dashboard tabs
- `/(teacher)/` — teacher interface tabs
- `/(parent)/` — parent portal tabs
- `/(guest)/` — public landing page

## SaaS Multi-Tenant Features
- `lib/subscription-tiers.ts` — 4 tiers: Trial/Basic(99)/Pro(199)/Enterprise(349)
- `lib/school-auth.ts` — Firebase Auth per-school admin accounts
- `lib/notifications.ts` — Push notifications via expo-notifications
- `components/SubscriptionExpiryBanner.tsx` — Warning banner when subscription expires ≤14 days
- Admin dashboard shows live subscription expiry warning

## Important Notes
- School email: Ahbaballah2026@hotmail.com
- Default admin password: 1234 (configurable via developer panel)
- Firebase project: ahbabullah-e85a6
- All AsyncStorage saves also sync to PostgreSQL cloud via /api/state
- Frontend ENOENT error on Metro watcher: transient, restart frontend workflow resolves it
- expo-notifications registered for push on admin login
