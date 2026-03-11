import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getApiUrl } from '@/lib/query-client';

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
  user?: { id: number; full_name: string; email?: string; phone?: string; role: UserRole; linked_id?: string | null };
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

const LOGIN_HISTORY_KEY = 'login_history';
const MAX_HISTORY = 200;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);

  useEffect(() => {
    const init = async () => {
      const data = await AsyncStorage.getItem('auth_user');
      if (data) setUser(JSON.parse(data));
      const flag = await secureGet(BIOMETRIC_FLAG);
      setIsBiometricEnabled(flag === 'true');
      const hist = await AsyncStorage.getItem(LOGIN_HISTORY_KEY);
      if (hist) setLoginHistory(JSON.parse(hist));
      setIsLoading(false);
    };
    init();
  }, []);

  const recordLogin = async (role: UserRole) => {
    const event: LoginEvent = {
      role,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };
    setLoginHistory(prev => {
      const updated = [event, ...prev].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (userData: AuthUser) => {
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    await recordLogin(userData.role);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
  };

  const apiLogin = async (role: UserRole, credential: string, password: string): Promise<ApiAuthResult> => {
    try {
      const url = new URL('/api/auth/login', getApiUrl()).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, credential, password }),
        credentials: 'include',
      });
      const json = await res.json();
      return json;
    } catch {
      return { ok: false, error: 'تعذّر الاتصال بالخادم' };
    }
  };

  const apiRegister = async (data: {
    full_name: string; email?: string; phone?: string;
    role: UserRole; password: string; linked_id?: string;
  }): Promise<ApiAuthResult> => {
    try {
      const url = new URL('/api/auth/register', getApiUrl()).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      const json = await res.json();
      return json;
    } catch {
      return { ok: false, error: 'تعذّر الاتصال بالخادم' };
    }
  };

  const apiLogout = async () => {
    try {
      const url = new URL('/api/auth/logout', getApiUrl()).toString();
      await fetch(url, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
  };

  const enableBiometric = async (userData: AuthUser) => {
    await secureSet(BIOMETRIC_KEY, JSON.stringify(userData));
    await secureSet(BIOMETRIC_FLAG, 'true');
    setIsBiometricEnabled(true);
  };

  const disableBiometric = async () => {
    await secureDel(BIOMETRIC_KEY);
    await secureSet(BIOMETRIC_FLAG, 'false');
    setIsBiometricEnabled(false);
  };

  const getBiometricUser = async (): Promise<AuthUser | null> => {
    const data = await secureGet(BIOMETRIC_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  };

  const value = useMemo(() => ({
    user, isLoading, isBiometricEnabled, loginHistory,
    login, logout, enableBiometric, disableBiometric, getBiometricUser,
    apiLogin, apiRegister, apiLogout,
  }), [user, isLoading, isBiometricEnabled, loginHistory]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
