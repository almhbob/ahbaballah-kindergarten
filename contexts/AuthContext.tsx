import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'teacher' | 'parent';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
  teacherClass?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('auth_user').then((data) => {
      if (data) setUser(JSON.parse(data));
      setIsLoading(false);
    });
  }, []);

  const login = async (userData: AuthUser) => {
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
