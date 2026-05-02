import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseReady } from '@/lib/firebase';
import { loadActiveSchoolId, persistActiveSchoolId } from '@/lib/active-school';
import {
  fsSaveSchoolBranding, fsListenSchoolBranding,
  fsRegisterSchool, fsListSchools, fsUpdateSchoolRegistry, fsDeleteSchoolRegistry,
} from '@/lib/firestore-service';

export interface SchoolBranding {
  schoolId: string;
  name: string;
  logoUrl?: string;
  slogan?: string;
  primaryColor: string;
  accentColor: string;
  darkGrad1: string;
  darkGrad2: string;
  teacherColor: string;
  parentColor: string;
}

export interface SchoolRegistration {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  adminPhone: string;
  adminEmail?: string;
  country?: string;
  city?: string;
  tier: 'trial' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended';
  createdAt: string;
  expiresAt?: string;
  notes?: string;
}

export interface DynamicTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryDeep: string;
  accent: string;
  accentLight: string;
  accentGlow: string;
  darkSurface: string;
  darkSurfaceAlt: string;
  darkBorder: string;
  glowNavy: string;
  glowGold: string;
  tabBar: string;
  tabBarActive: string;
  teacher: string;
  parent: string;
  adminGrad: readonly [string, string, string];
  adminBrightGrad: readonly [string, string, string];
  goldGrad: readonly [string, string, string, string];
}

interface SchoolThemeContextValue {
  branding: SchoolBranding;
  theme: DynamicTheme;
  schools: SchoolRegistration[];
  activeSchoolId: string;
  updateBranding: (patch: Partial<SchoolBranding>) => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  registerSchool: (school: SchoolRegistration) => Promise<void>;
  editSchoolEntry: (id: string, patch: Partial<SchoolRegistration>) => Promise<void>;
  removeSchool: (id: string) => Promise<void>;
  refreshSchools: () => Promise<void>;
}

export const COLOR_PRESETS: { label: string; primary: string; accent: string; dark1: string; dark2: string; teacher: string; parent: string }[] = [
  { label: 'Global Navy Gold', primary: '#0c1155', accent: '#c9952a', dark1: '#030612', dark2: '#050919', teacher: '#1A6B5C', parent: '#7B3FA0' },
  { label: 'Emerald Amber', primary: '#064e3b', accent: '#f59e0b', dark1: '#012b1e', dark2: '#023828', teacher: '#065f46', parent: '#6d28d9' },
  { label: 'Royal Purple', primary: '#4c1d95', accent: '#ec4899', dark1: '#1e0847', dark2: '#2d0f6b', teacher: '#1A6B5C', parent: '#be185d' },
  { label: 'Ocean Blue', primary: '#1e3a8a', accent: '#06b6d4', dark1: '#0a1f50', dark2: '#0f2566', teacher: '#065f46', parent: '#7c3aed' },
  { label: 'Warm Rose', primary: '#881337', accent: '#f97316', dark1: '#3b0516', dark2: '#5c0b22', teacher: '#14532d', parent: '#86198f' },
  { label: 'Teal Olive', primary: '#134e4a', accent: '#84cc16', dark1: '#052e2c', dark2: '#0a3c3a', teacher: '#164e63', parent: '#7e22ce' },
];

export const DEFAULT_BRANDING: SchoolBranding = {
  schoolId: 'global',
  name: 'Global Kindergarten Management System',
  slogan: 'Quality • Care • Growth',
  primaryColor: '#0c1155',
  accentColor: '#c9952a',
  darkGrad1: '#030612',
  darkGrad2: '#050919',
  teacherColor: '#1A6B5C',
  parentColor: '#7B3FA0',
};

const BRANDING_KEY = 'school_branding_v2';
const GLOBAL_SCHOOL_ID = 'global';

function safeHex(color: string, fallback = '#0c1155') {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function deriveDynamicTheme(b: SchoolBranding): DynamicTheme {
  const hex = (color: string, alpha: number): string => {
    const safe = safeHex(color);
    const r = parseInt(safe.slice(1, 3), 16);
    const g = parseInt(safe.slice(3, 5), 16);
    const bl = parseInt(safe.slice(5, 7), 16);
    return `rgba(${r},${g},${bl},${alpha})`;
  };
  const lighten = (color: string, amount: number): string => {
    const safe = safeHex(color);
    const r = Math.min(255, parseInt(safe.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(safe.slice(3, 5), 16) + amount);
    const bl = Math.min(255, parseInt(safe.slice(5, 7), 16) + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  };
  const darken = (color: string, amount: number): string => {
    const safe = safeHex(color);
    const r = Math.max(0, parseInt(safe.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(safe.slice(3, 5), 16) - amount);
    const bl = Math.max(0, parseInt(safe.slice(5, 7), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  };

  return {
    primary: b.primaryColor,
    primaryLight: lighten(b.primaryColor, 30),
    primaryDark: darken(b.primaryColor, 20),
    primaryDeep: darken(b.primaryColor, 40),
    accent: b.accentColor,
    accentLight: lighten(b.accentColor, 30),
    accentGlow: lighten(b.accentColor, 15),
    darkSurface: lighten(b.darkGrad1, 20),
    darkSurfaceAlt: lighten(b.darkGrad1, 35),
    darkBorder: 'rgba(255,255,255,0.10)',
    glowNavy: hex(b.primaryColor, 0.55),
    glowGold: hex(b.accentColor, 0.35),
    tabBar: darken(b.darkGrad1, 5),
    tabBarActive: b.accentColor,
    teacher: b.teacherColor,
    parent: b.parentColor,
    adminGrad: [b.darkGrad1, b.darkGrad2, b.primaryColor] as const,
    adminBrightGrad: [b.darkGrad2, b.primaryColor, lighten(b.primaryColor, 30)] as const,
    goldGrad: [darken(b.accentColor, 40), darken(b.accentColor, 20), b.accentColor, lighten(b.accentColor, 20)] as const,
  };
}

const SchoolThemeContext = createContext<SchoolThemeContextValue | null>(null);

export function useSchoolTheme(): SchoolThemeContextValue {
  const ctx = useContext(SchoolThemeContext);
  if (!ctx) throw new Error('useSchoolTheme must be used inside SchoolThemeProvider');
  return ctx;
}

export function SchoolThemeProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<SchoolBranding>(DEFAULT_BRANDING);
  const [schools, setSchools] = useState<SchoolRegistration[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState(GLOBAL_SCHOOL_ID);

  useEffect(() => {
    (async () => {
      const id = (await loadActiveSchoolId()) || GLOBAL_SCHOOL_ID;
      setActiveSchoolId(id);
      try {
        const raw = await AsyncStorage.getItem(`${BRANDING_KEY}_${id}`);
        if (raw) setBranding(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!isFirebaseReady() || !activeSchoolId) return;
    const unsub = fsListenSchoolBranding(activeSchoolId, (b) => {
      if (b) {
        setBranding(b);
        AsyncStorage.setItem(`${BRANDING_KEY}_${activeSchoolId}`, JSON.stringify(b)).catch(() => {});
      }
    });
    return unsub;
  }, [activeSchoolId]);

  const updateBranding = useCallback(async (patch: Partial<SchoolBranding>) => {
    const updated: SchoolBranding = { ...branding, ...patch, schoolId: activeSchoolId || GLOBAL_SCHOOL_ID };
    setBranding(updated);
    await AsyncStorage.setItem(`${BRANDING_KEY}_${updated.schoolId}`, JSON.stringify(updated));
    await fsSaveSchoolBranding(updated).catch(() => {});
  }, [branding, activeSchoolId]);

  const switchSchool = useCallback(async (schoolId: string) => {
    const nextId = schoolId || GLOBAL_SCHOOL_ID;
    await persistActiveSchoolId(nextId);
    setActiveSchoolId(nextId);
    try {
      const raw = await AsyncStorage.getItem(`${BRANDING_KEY}_${nextId}`);
      if (raw) setBranding(JSON.parse(raw));
      else setBranding({ ...DEFAULT_BRANDING, schoolId: nextId });
    } catch {
      setBranding({ ...DEFAULT_BRANDING, schoolId: nextId });
    }
  }, []);

  const refreshSchools = useCallback(async () => {
    if (!isFirebaseReady()) {
      setSchools([]);
      return;
    }
    const list = await fsListSchools().catch(() => []);
    setSchools(list);
  }, []);

  useEffect(() => { refreshSchools(); }, [refreshSchools]);

  const registerSchool = useCallback(async (school: SchoolRegistration) => {
    await fsRegisterSchool(school);
    setSchools(prev => [...prev.filter(s => s.id !== school.id), school]);
  }, []);

  const editSchoolEntry = useCallback(async (id: string, patch: Partial<SchoolRegistration>) => {
    await fsUpdateSchoolRegistry(id, patch);
    setSchools(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const removeSchool = useCallback(async (id: string) => {
    await fsDeleteSchoolRegistry(id);
    setSchools(prev => prev.filter(s => s.id !== id));
  }, []);

  const theme = deriveDynamicTheme(branding);

  return (
    <SchoolThemeContext.Provider value={{
      branding, theme, schools, activeSchoolId,
      updateBranding, switchSchool,
      registerSchool, editSchoolEntry, removeSchool,
      refreshSchools,
    }}>
      {children}
    </SchoolThemeContext.Provider>
  );
}
