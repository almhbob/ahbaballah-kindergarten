import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { registerAndSaveToken } from '@/lib/push-service';
import { apiJson, setAuthToken, loadAuthToken, onUnauthorized, getAuthToken } from '@/lib/api';
import { getActiveSchoolId } from '@/lib/active-school';

export type UserRole = 'admin' | 'teacher' | 'parent' | 'guest';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
  teacherClass?: string;
}

export interface SignInResult {
  ok: boolean;
  user?: AuthUser;
  mustChangePassword?: boolean;
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
  /** True until the user replaces a temporary/default password. */
  mustChangePassword: boolean;
  isBiometricEnabled: boolean;
  loginHistory: LoginEvent[];
  /** Sets the local session (used after a successful server sign-in, and for guests). */
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  /** Server-verified sign in. */
  signIn: (role: Exclude<UserRole, 'guest'>, credential: string, password: string) => Promise<SignInResult>;
  /** First-time activation using the temporary password issued by the school. */
  activateAccount: (role: 'teacher' | 'parent', credential: string, tempPassword: string, newPassword: string) => Promise<SignInResult>;
  /** Exchanges a Firebase ID token (school admin login) for an API session. */
  signInWithFirebase: (idToken: string) => Promise<SignInResult & { schoolId?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  enableBiometric: (user: AuthUser) => Promise<void>;
  disableBiometric: () => Promise<void>;
  getBiometricUser: () => Promise<AuthUser | null>;
  /** Signs in using the credentials saved for biometric login. */
  biometricSignIn: () => Promise<SignInResult>;
  /** Kept for backwards compatibility with screens that call it on logout. */
  apiLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BIOMETRIC_KEY = 'biometric_user';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';
const BIOMETRIC_FLAG = 'biometric_enabled';

async function secureSet(key: string, value: string) {
  if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureDel(key: string) {
  if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

const LOGIN_HISTORY_KEY = 'login_history';
const MUST_CHANGE_KEY = 'must_change_password';

async function persistMustChange(v: boolean) {
  if (v) await AsyncStorage.setItem(MUST_CHANGE_KEY, '1');
  else await AsyncStorage.removeItem(MUST_CHANGE_KEY);
}
const MAX_HISTORY = 200;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChange] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await loadAuthToken();
        const data = await AsyncStorage.getItem('auth_user');
        if (data) {
          const saved = JSON.parse(data) as AuthUser;
          // Sessions from older app versions have no server token: require a fresh sign-in.
          if (saved.role === 'guest' || token) setUser(saved);
          else await AsyncStorage.removeItem('auth_user');
        }
        setMustChange((await AsyncStorage.getItem(MUST_CHANGE_KEY)) === '1');
        const flag = await secureGet(BIOMETRIC_FLAG);
        setIsBiometricEnabled(flag === 'true');
        const hist = await AsyncStorage.getItem(LOGIN_HISTORY_KEY);
        if (hist) setLoginHistory(JSON.parse(hist));
      } catch {
        await AsyncStorage.removeItem('auth_user');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const recordLogin = (role: UserRole) => {
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

  const login = useCallback(async (userData: AuthUser) => {
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    recordLogin(userData.role);
    if (userData.role !== 'guest') {
      registerAndSaveToken(
        userData.id,
        userData.role as 'admin' | 'teacher' | 'parent',
        userData.studentId,
      ).catch(() => {});
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('auth_user');
    await persistMustChange(false);
    setMustChange(false);
    await setAuthToken(null);
    setUser(null);
  }, []);

  // Token expired or revoked → drop the local session.
  useEffect(() => onUnauthorized(() => { logout().catch(() => {}); }), [logout]);

  const finishSignIn = useCallback(async (json: any): Promise<SignInResult> => {
    if (!json?.ok || !json.token || !json.user) {
      return { ok: false, error: json?.error || 'تعذّر تسجيل الدخول' };
    }
    await persistMustChange(!!json.mustChangePassword);
    setMustChange(!!json.mustChangePassword);
    await setAuthToken(json.token);
    const u = json.user as AuthUser;
    await login(u);
    // Keep the biometric copy of the token fresh.
    if ((await secureGet(BIOMETRIC_FLAG)) === 'true') {
      const saved = await secureGet(BIOMETRIC_KEY);
      if (saved && (JSON.parse(saved) as AuthUser).id === u.id) await secureSet(BIOMETRIC_TOKEN_KEY, json.token);
    }
    return { ok: true, user: u, mustChangePassword: !!json.mustChangePassword };
  }, [login]);

  const signIn = useCallback(async (role: Exclude<UserRole, 'guest'>, credential: string, password: string) => {
    const json = await apiJson('/api/auth/login', {
      method: 'POST',
      json: { role, credential, password, schoolId: getActiveSchoolId() },
    });
    return finishSignIn(json);
  }, [finishSignIn]);

  const activateAccount = useCallback(async (role: 'teacher' | 'parent', credential: string, tempPassword: string, newPassword: string) => {
    const json = await apiJson('/api/auth/activate', {
      method: 'POST',
      json: { role, credential, tempPassword, newPassword, schoolId: getActiveSchoolId() },
    });
    return finishSignIn(json);
  }, [finishSignIn]);

  const signInWithFirebase = useCallback(async (idToken: string) => {
    const json = await apiJson('/api/auth/firebase-login', { method: 'POST', json: { idToken } });
    const r = await finishSignIn(json);
    return { ...r, schoolId: (json as any).schoolId };
  }, [finishSignIn]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const json = await apiJson<{ token?: string }>('/api/auth/change-password', { method: 'POST', json: { currentPassword, newPassword } });
    if (json.ok && json.token) {
      await persistMustChange(false);
      setMustChange(false);
      await setAuthToken(json.token);
    }
    return { ok: !!json.ok, error: json.error };
  }, []);

  const apiLogout = useCallback(async () => {
    await apiJson('/api/auth/logout', { method: 'POST' });
  }, []);

  const enableBiometric = useCallback(async (userData: AuthUser) => {
    const token = getAuthToken();
    if (!token) return;
    await secureSet(BIOMETRIC_KEY, JSON.stringify(userData));
    await secureSet(BIOMETRIC_TOKEN_KEY, token);
    await secureSet(BIOMETRIC_FLAG, 'true');
    setIsBiometricEnabled(true);
  }, []);

  const disableBiometric = useCallback(async () => {
    await secureDel(BIOMETRIC_KEY);
    await secureDel(BIOMETRIC_TOKEN_KEY);
    await secureSet(BIOMETRIC_FLAG, 'false');
    setIsBiometricEnabled(false);
  }, []);

  const getBiometricUser = useCallback(async (): Promise<AuthUser | null> => {
    const data = await secureGet(BIOMETRIC_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  }, []);

  const biometricSignIn = useCallback(async (): Promise<SignInResult> => {
    const token = await secureGet(BIOMETRIC_TOKEN_KEY);
    const saved = await getBiometricUser();
    if (!token || !saved) return { ok: false, error: 'لا توجد بيانات بصمة محفوظة، سجّل الدخول بكلمة المرور' };
    await setAuthToken(token);
    // Validate the stored token with the server before trusting it.
    const me = await apiJson('/api/auth/me');
    if (!me.ok) {
      await setAuthToken(null);
      await disableBiometric();
      return { ok: false, error: 'انتهت صلاحية جلسة البصمة، سجّل الدخول بكلمة المرور ثم فعّل البصمة مجدداً' };
    }
    const u = (me as any).user as AuthUser;
    await login(u);
    return { ok: true, user: u };
  }, [getBiometricUser, disableBiometric, login]);

  const value = useMemo(() => ({
    user, isLoading, mustChangePassword, isBiometricEnabled, loginHistory,
    login, logout, signIn, activateAccount, signInWithFirebase, changePassword,
    enableBiometric, disableBiometric, getBiometricUser, biometricSignIn, apiLogout,
  }), [user, isLoading, mustChangePassword, isBiometricEnabled, loginHistory, login, logout, signIn, activateAccount,
    signInWithFirebase, changePassword, enableBiometric, disableBiometric, getBiometricUser, biometricSignIn, apiLogout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
