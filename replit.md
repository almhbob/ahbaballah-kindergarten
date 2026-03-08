# روضة أحباب الله - الخاصة

## Overview
A comprehensive Arabic school management app for "روضة أحباب الله الخاصة" kindergarten located in صفيتة الغنوماب, built with Expo React Native.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express.js (port 5000) - serves API and landing page
- **Storage**: AsyncStorage for local data persistence
- **State**: React Context (AuthContext, AppDataContext)

## User Roles
1. **Admin (مدير)** - Full access: dashboard, employees, finance, news, inbox
2. **Teacher (معلم)** - Class schedule, student notebook, grades, curriculum
3. **Parent (ولي أمر)** - Child profile, daily reports, messages, notifications

## Key Features
- Role-based login with three account types
- Admin dashboard with stats, employee management, payroll calculation, financial tracking
- Teacher interface with daily schedule, student follow-up notebook, grade entry, curriculum planning
- Parent portal with child profile, daily reports (food/learning/mood), direct messaging, news/notifications
- Automatic payroll calculation based on attendance/absence
- Permission system: each role sees only their relevant data

## Demo Accounts
- Admin: username `admin`, password `1234`
- Teacher: username `teacher1`, password `1234`
- Parent: username `parent1`, password `1234`

## Color Theme
- Primary: #0F2B4E (Deep Navy)
- Accent: #F4A01C (Amber Gold)
- Teacher theme: #1A6B5C (Teal)
- Parent theme: #7B3FA0 (Purple)

## Routes
- `/login` - Role selection & login
- `/(admin)/` - Admin dashboard, employees, finance, news, inbox
- `/(teacher)/` - Schedule, students, grades, curriculum
- `/(parent)/` - Child home, reports, messages, notifications

## Tech Stack
- Expo SDK (React Native + Web)
- expo-router (file-based routing)
- @tanstack/react-query
- expo-haptics, expo-linear-gradient
- expo-glass-effect (iOS 26 liquid glass tabs)
- AsyncStorage (local persistence)
- Inter font family
