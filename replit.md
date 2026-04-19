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
- `/(admin)/` — admin dashboard tabs
- `/(teacher)/` — teacher interface tabs
- `/(parent)/` — parent portal tabs
- `/(guest)/` — public landing page

## Important Notes
- School email: Ahbaballah2026@hotmail.com
- Default admin password: 1234 (configurable via developer panel)
- All AsyncStorage saves also sync to PostgreSQL cloud via /api/state
- Frontend ENOENT error on Metro watcher: transient, restart frontend workflow resolves it
