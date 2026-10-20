import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { makeApiUrl } from '@/lib/query-client';
import { registerAndSaveToken } from '@/lib/push-service';

export type UserRole = 'admin' | 'teacher' | 'parent' | 'guest';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
  teacherClass?: string;
}

export interface ApiAuthResult {
  ok: boolean;
  user?: {
    id: number | string;
    full_name: string;
    email?: string;
    phone?: string;
    role: UserRole;
    linked_id?: string | null;
    teacher_class?: string | null;
    disabled?: boolean;
  };
  error?: string;
}

export interface LoginEvent {
  role: UserRole;
  date: string;
  timestamp: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isBiometricEnabled: boolean;
  loginHistory: LoginEvent[];
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: (user: AuthUser) => Promise<void>;
  disableBiometric: () => Promise<void>;
  getBiometricUser: () => Promise<AuthUser | null>;
  apiLogin: (role: UserRole, credential: string, password: string) => Promise<ApiAuthResult>;
  apiRegister: (data: { full_name: string; email?: string; phone?: string; role: UserRole; password: string; linked_id?: string }) => Promise<ApiAuthResult>;
  apiLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BIOMETRIC_KEY = 'biometric_user';
const BIOMETRIC_FLAG = 'biometric_enabled';
const LOGIN_HISTORY_KEY = 'login_history';
const MAX_HISTORY = 200;
const AUTH_USER_KEY = 'auth_user';
const SERVER_ROLES: UserRole[] = ['admin', 'teacher', 'parent'];

async function secureSet(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureDel(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

function parseServerUser(value: unknown): ApiAuthResult['user'] | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const id = candidate.id;
  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    String(id).trim() === '' ||
    typeof candidate.full_name !== 'string' ||
    !candidate.full_name.trim() ||
    !SERVER_ROLES.includes(candidate.role as UserRole)
  ) return null;
  const linkedId = typeof candidate.linked_id === 'string' && candidate.linked_id.trim()
    ? candidate.linked_id.trim()
    : null;
  return {
    id,
    full_name: candidate.full_name.trim(),
    email: typeof candidate.email === 'string' ? candidate.email : undefined,
    phone: typeof candidate.phone === 'string' ? candidate.phone : undefined,
    role: candidate.role as UserRole,
    linked_id: linkedId,
    teacher_class: typeof candidate.teacher_class === 'string' && candidate.teacher_class.trim()
      ? candidate.teacher_class.trim()
      : null,
    disabled: typeof candidate.disabled === 'boolean' ? candidate.disabled : undefined,
  };
}

function toAuthUser(user: NonNullable<ApiAuthResult['user']>): AuthUser {
  if ((user.role === 'parent' || user.role === 'teacher') && !user.linked_id) {
    throw new Error('الحساب غير مرتبط بملف صالح على الخادم؛ يرجى التواصل مع الإدارة');
  }
  return {
    id: String(user.id),
    name: user.full_name,
    role: user.role,
    ...(user.role === 'parent' && user.linked_id ? { studentId: user.linked_id } : {}),
    ...(user.role === 'teacher' && user.teacher_class ? { teacherClass: user.teacher_class } : {}),
  };
}

async function getServerSession(expectedRole?: UserRole) {
  const response = await fetch(makeApiUrl('/api/auth/me'), { credentials: 'include' });
  if (!response.ok) throw new Error('لا توجد جلسة صالحة على الخادم');
  const body = await response.json();
  const serverUser = parseServerUser(body?.user);
  if (!body?.ok || !serverUser) throw new Error('استجابة جلسة الخادم غير صالحة');
  if (typeof serverUser.disabled !== 'boolean') {
    throw new Error('تعذّر التحقق من حالة الحساب على الخادم');
  }
  if (serverUser.disabled) throw new Error('هذا الحساب موقوف على الخادم');
  if ((serverUser.role === 'parent' || serverUser.role === 'teacher') && !serverUser.linked_id) {
    throw new Error('الحساب غير مرتبط بملف صالح على الخادم؛ يرجى التواصل مع الإدارة');
  }
  if (expectedRole && serverUser.role !== expectedRole) {
    throw new Error('دور الحساب على الخادم لا يطابق الحساب المطلوب');
  }
  return serverUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        // A cached user is display data only; the server session is the authority.
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        const serverUser = await getServerSession();
        const authUser = toAuthUser(serverUser);
        setUser(authUser);
        if (authUser.role !== 'guest') {
          registerAndSaveToken(
            authUser.id,
            authUser.role,
            authUser.studentId,
          ).catch(() => {});
        }
      } catch {
        setUser(null);
      }
      try {
        const flag = await secureGet(BIOMETRIC_FLAG);
        setIsBiometricEnabled(flag === 'true');
        const hist = await AsyncStorage.getItem(LOGIN_HISTORY_KEY);
        if (hist) {
          const parsed: unknown = JSON.parse(hist);
          if (Array.isArray(parsed)) setLoginHistory(parsed as LoginEvent[]);
        }
      } catch {
        setIsBiometricEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, []);

  const recordLogin = async (role: UserRole) => {
    const event: LoginEvent = {
      role,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };
    setLoginHistory(prev => {
      const updated = [event, ...prev].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const login = async (userData: AuthUser) => {
    if (!SERVER_ROLES.includes(userData.role)) {
      throw new Error('هذا النوع من الحسابات لا يدعم تسجيل الدخول على الخادم');
    }
    const serverUser = await getServerSession(userData.role);
    if (String(serverUser.id) !== userData.id) {
      throw new Error('هوية الحساب على الخادم لا تطابق الحساب المطلوب');
    }
    const authUser = toAuthUser(serverUser);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setUser(authUser);
    await recordLogin(authUser.role);
    if (authUser.role !== 'guest') {
      registerAndSaveToken(authUser.id, authUser.role, authUser.studentId).catch(() => {});
    }
  };

  const clearLocalAuth = async () => {
    const results = await Promise.allSettled([
      AsyncStorage.removeItem(AUTH_USER_KEY),
      secureDel(BIOMETRIC_KEY),
      secureDel(BIOMETRIC_FLAG),
    ]);
    setUser(null);
    setIsBiometricEnabled(false);
    if (results.some(result => result.status === 'rejected')) {
      throw new Error('تعذّر حذف بعض بيانات المصادقة المحفوظة على هذا الجهاز');
    }
  };

  const apiLogout = async () => {
    let serverError: Error | null = null;
    try {
      const response = await fetch(makeApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) {
        serverError = new Error(body?.error || 'تعذّر إنهاء جلسة الخادم');
      }
    } catch {
      serverError = new Error('تعذّر الاتصال بالخادم لتسجيل الخروج');
    }
    let clearError: Error | null = null;
    try {
      await clearLocalAuth();
    } catch (error) {
      clearError = error instanceof Error ? error : new Error('تعذّر حذف بيانات المصادقة المحلية');
    }
    if (serverError || clearError) {
      Alert.alert('تعذّر تسجيل الخروج', (serverError ?? clearError)?.message ?? 'يرجى المحاولة مجدداً');
    }
  };

  const logout = async () => apiLogout();

  const apiLogin = async (role: UserRole, credential: string, password: string): Promise<ApiAuthResult> => {
    if (!SERVER_ROLES.includes(role)) return { ok: false, error: 'نوع الحساب غير صالح' };
    try {
      const response = await fetch(makeApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, credential, password }),
        credentials: 'include',
      });
      const body = await response.json();
      if (!response.ok || body?.ok !== true) {
        return { ok: false, error: typeof body?.error === 'string' ? body.error : 'بيانات الدخول غير صحيحة' };
      }
      const loginUser = parseServerUser(body.user);
      if (!loginUser || loginUser.role !== role) {
        return { ok: false, error: 'استجابة تسجيل الدخول من الخادم غير صالحة' };
      }
      if (loginUser.disabled) return { ok: false, error: 'هذا الحساب موقوف على الخادم' };
      const sessionUser = await getServerSession(role);
      if (String(sessionUser.id) !== String(loginUser.id)) {
        return { ok: false, error: 'جلسة الخادم لا تطابق الحساب الذي تم التحقق منه' };
      }
      if (String(sessionUser.linked_id ?? '') !== String(loginUser.linked_id ?? '')) {
        return { ok: false, error: 'بيانات الربط في جلسة الخادم غير متطابقة' };
      }
      return { ok: true, user: loginUser };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error && error.message
          ? error.message
          : 'تعذّر الاتصال بالخادم',
      };
    }
  };

  const apiRegister = async (data: {
    full_name: string; email?: string; phone?: string;
    role: UserRole; password: string; linked_id?: string;
  }): Promise<ApiAuthResult> => {
    try {
      const response = await fetch(makeApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      const body = await response.json();
      if (!response.ok || body?.ok !== true) {
        return { ok: false, error: typeof body?.error === 'string' ? body.error : 'تعذّر إنشاء الحساب' };
      }
      const registeredUser = parseServerUser(body.user);
      return registeredUser ? { ok: true, user: registeredUser } : { ok: false, error: 'استجابة التسجيل من الخادم غير صالحة' };
    } catch {
      return { ok: false, error: 'تعذّر الاتصال بالخادم' };
    }
  };

  const enableBiometric = async (userData: AuthUser) => {
    if (!SERVER_ROLES.includes(userData.role)) {
      throw new Error('لا يمكن تفعيل البصمة لهذا النوع من الحسابات');
    }
    const serverUser = await getServerSession(userData.role);
    await secureSet(BIOMETRIC_KEY, JSON.stringify(toAuthUser(serverUser)));
    await secureSet(BIOMETRIC_FLAG, 'true');
    setIsBiometricEnabled(true);
  };

  const disableBiometric = async () => {
    await secureDel(BIOMETRIC_KEY);
    await secureDel(BIOMETRIC_FLAG);
    setIsBiometricEnabled(false);
  };

  const getBiometricUser = useCallback(async (): Promise<AuthUser | null> => {
    const data = await secureGet(BIOMETRIC_KEY);
    if (!data) return null;
    try {
      const cached = JSON.parse(data) as AuthUser;
      if (typeof cached.id !== 'string' || typeof cached.name !== 'string' || !SERVER_ROLES.includes(cached.role)) {
        return null;
      }
      return cached;
    } catch {
      return null;
    }
  }, []);

  const value = {
    user, isLoading, isBiometricEnabled, loginHistory,
    login, logout, enableBiometric, disableBiometric, getBiometricUser,
    apiLogin, apiRegister, apiLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
