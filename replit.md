# نظم إدارة رياض الأطفال - الخاصة

## Overview
تطبيق إدارة نظم إدارة رياض الأطفال الخاصة في صفيتة الغنوماب — بني بـ Expo React Native + Express.js + PostgreSQL.

## Architecture
- **Frontend**: Expo Router (file-based routing), React Native + Web
- **Backend**: Express.js (port 5000) — REST API + landing page
- **Database**: PostgreSQL (Replit cloud DB) via pg Pool
- **State**: AppDataContext (React Context) — persists to AsyncStorage + PostgreSQL cloud (app_state table)
- **Auth**: Dual-layer — local AppDataContext + backend PostgreSQL users table

## User Roles & Login
| Role | Login field | Password |
|------|-------------|----------|
| Admin (أدمن) | username: `admin` (or Firebase school login) | set at first login — see docs/SECURITY.md |
| Teacher (معلمة) | email | temporary password issued by the admin, changed at first login |
| Parent (ولي أمر) | phone | temporary password issued by the admin, changed at first login |
| Guest (ضيف) | No login needed | — |

All credentials are verified **on the server only** and stored as bcrypt hashes.
See [docs/SECURITY.md](docs/SECURITY.md) for the security model and deployment checklist.

## API Routes
All routes require a bearer token (`Authorization: Bearer <token>`) unless marked public.
- `POST /api/auth/login` (public, rate-limited) — returns a signed token
- `POST /api/auth/activate` (public, rate-limited) — first-time activation with the school's temporary password
- `POST /api/auth/change-password`, `GET /api/auth/me`
- `POST /api/auth/firebase-login` — exchanges a Firebase ID token (school admin) for a token
- `POST /api/auth/developer-unlock` (admin) → short-lived developer token; `POST /api/auth/developer-password` (developer)
- `POST /api/auth/reset-password` (admin) — issue a temporary password for a teacher/parent
- `GET /api/state` — role-filtered school state (public keys only when anonymous)
- `PUT /api/state/:key` — role-checked writes; `DELETE /api/state/:key` (admin)
- `POST /api/state/registration-request` (public, rate-limited) — enrolment form
- `GET /api/reviews` (public), `POST /api/reviews` (rate-limited), `GET /api/reviews/all`, `PATCH /api/reviews/:id/approve`, `DELETE /api/reviews/:id` (admin)
- `POST /api/files/upload` (signed in)
- `POST /api/school-requests` (public, rate-limited); `GET/PATCH/DELETE /api/school-requests` (developer)
- `POST /api/push/*` (admin/teacher)
- `GET /api/health`

## Database Tables
- `users` — auth accounts (admin, teacher, parent)
- `reviews` — parent reviews (approved auto)
- `school_state` — per-school app state (JSON key-value, no passwords)
- `credentials` — bcrypt password hashes (admin, teachers, parents, defaults, developer)
- `school_requests` — school registration requests (full provisioning: status, subscription_start/end, approved_school_id, initial_password)

## School Registration & Provisioning Flow
1. School fills `app/school-request.tsx` → 5-step form → saved to `school_requests` DB table
2. Developer opens panel → "طلبات الانضمام" section → reviews request
3. Developer presses "موافقة وتفعيل" → `approveAndProvisionSchool()` runs:
   - Generates unique `schoolId` and `initialPassword`
   - Creates `SchoolRegistration` entry (Firebase + AsyncStorage via `registerSchool()`)
   - Tries Firebase Auth account creation (optional, graceful fail)
   - PATCHes DB: sets status='approved', subscription_start/end, approved_school_id, initial_password
4. `CredentialsModal` shows: schoolId, email, phone, password, subscription dates — all copyable
5. School card in "إدارة الروضات" gets a "تجديد" button → `RenewalModal` → tier + months selection

## Key Features
- **Admin**: Dashboard stats, student management, employee management, finance/payroll, news, inbox, meetings, schedule, graduation, transport, banners, registration requests, developer panel, analytics dashboard, bulk notifications, calendar, photo gallery, **bulk fee reminders via push notifications**
- **Teacher**: Class schedule, student notebook, grades, attendance, curriculum planner, performance analytics, **QR code attendance scanner**, **educational resource sharing**
- **Parent**: Child profile (ملف الطالب), daily reports, messages, notifications, fees tracker, write reviews

## Push Notification System (Added)
- **Backend**: `server/push-routes.ts` — 5 endpoints: `/send`, `/broadcast`, `/attendance-alert`, `/payment-reminder`, `/daily-report`
- **Client Service**: `lib/push-service.ts` — token registry (AsyncStorage), per-role token lookup, server API calls
- **Auto Triggers**:
  - When teacher saves daily report → parent notified automatically
  - When student attendance drops below 70% → parent alerted
  - When admin records fee payment with remaining balance → parent notified
  - Admin can send bulk reminders to all parents with outstanding fees
- **Token Registration**: Happens automatically on login for all roles (admin/teacher/parent)

## QR Attendance Scanner (Added)
- File: `app/(teacher)/qr-scan.tsx`
- Camera-based QR code reader (expo-camera barcode scanner)
- Scans student QR codes to mark attendance (حاضر/متأخر/غائب)
- Animated scan line, corner brackets, real-time feedback card
- Recent scans history panel
- Accessible via QR button in teacher's students screen

## Teacher Resource Sharing (Added)
- File: `app/(teacher)/resources.tsx`
- New "الموارد" tab in teacher navigation
- Supports 5 resource types: Note, Worksheet, Link, PDF, Image
- Filter by subject, level, type, or search text
- Like/unlike resources, delete own resources
- Organized content with author attribution and timestamps
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
- Admin must set a strong password at first login (see docs/SECURITY.md)
- Firebase project: ahbabullah-e85a6
- All AsyncStorage saves also sync to PostgreSQL (per school, role-checked) via /api/state
- Frontend ENOENT error on Metro watcher: transient, restart frontend workflow resolves it
- expo-notifications registered for push on admin login
