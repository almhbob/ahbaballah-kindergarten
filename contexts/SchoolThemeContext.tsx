import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseReady } from '@/lib/firebase';
import { getActiveSchoolId, loadActiveSchoolId, persistActiveSchoolId } from '@/lib/active-school';
import {
  fsSaveSchoolBranding, fsListenSchoolBranding,
  fsRegisterSchool, fsListSchools, fsUpdateSchoolRegistry, fsDeleteSchoolRegistry,
} from '@/lib/firestore-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolBranding {
  schoolId:     string;
  name:         string;
  logoUrl?:     string;
  slogan?:      string;
  primaryColor: string;
  accentColor:  string;
  darkGrad1:    string;
  darkGrad2:    string;
  teacherColor: string;
  parentColor:  string;
}

export interface SchoolRegistration {
  id:           string;
  name:         string;
  logoUrl?:     string;
  primaryColor: string;
  accentColor:  string;
  adminPhone:   string;
  adminEmail?:  string;
  tier:         'trial' | 'basic' | 'professional' | 'enterprise';
  status:       'active' | 'trial' | 'suspended';
  createdAt:    string;
  expiresAt?:   string;
  notes?:       string;
}

export interface DynamicTheme {
  primary:          string;
  primaryLight:     string;
  primaryDark:      string;
  primaryDeep:      string;
  accent:           string;
  accentLight:      string;
  accentGlow:       string;
  darkSurface:      string;
  darkSurfaceAlt:   string;
  darkBorder:       string;
  glowNavy:         string;
  glowGold:         string;
  tabBar:           string;
  tabBarActive:     string;
  teacher:          string;
  parent:           string;
  adminGrad:        readonly [string, string, string];
  adminBrightGrad:  readonly [string, string, string];
  goldGrad:         readonly [string, string, string, string];
}

interface SchoolThemeContextValue {
  branding:         SchoolBranding;
  theme:            DynamicTheme;
  schools:          SchoolRegistration[];
  activeSchoolId:   string;
  updateBranding:   (patch: Partial<SchoolBranding>) => Promise<void>;
  switchSchool:     (schoolId: string) => Promise<void>;
  registerSchool:   (school: SchoolRegistration) => Promise<void>;
  editSchoolEntry:  (id: string, patch: Partial<SchoolRegistration>) => Promise<void>;
  removeSchool:     (id: string) => Promise<void>;
  refreshSchools:   () => Promise<void>;
}

// ─── Preset Palettes ─────────────────────────────────────────────────────────

export const COLOR_PRESETS: { label: string; primary: string; accent: string; dark1: string; dark2: string; teacher: string; parent: string }[] = [
  { label: 'أحباب الله (بحري ذهبي)',   primary: '#0c1155', accent: '#c9952a', dark1: '#030612', dark2: '#050919', teacher: '#1A6B5C', parent: '#7B3FA0' },
  { label: 'الزمرد والكهرمان',          primary: '#064e3b', accent: '#f59e0b', dark1: '#012b1e', dark2: '#023828', teacher: '#065f46', parent: '#6d28d9' },
  { label: 'البنفسجي الملكي',           primary: '#4c1d95', accent: '#ec4899', dark1: '#1e0847', dark2: '#2d0f6b', teacher: '#1A6B5C', parent: '#be185d' },
  { label: 'أزرق المحيط والسماوي',     primary: '#1e3a8a', accent: '#06b6d4', dark1: '#0a1f50', dark2: '#0f2566', teacher: '#065f46', parent: '#7c3aed' },
  { label: 'الوردي الدافئ',             primary: '#881337', accent: '#f97316', dark1: '#3b0516', dark2: '#5c0b22', teacher: '#14532d', parent: '#86198f' },
  { label: 'الفيروزي والزيتوني',        primary: '#134e4a', accent: '#84cc16', dark1: '#052e2c', dark2: '#0a3c3a', teacher: '#164e63', parent: '#7e22ce' },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_BRANDING: SchoolBranding = {
  schoolId:     'ahbabullah',
  name:         'روضة أحباب الله',
  slogan:       'جودة • التزام • تميز',
  primaryColor: '#0c1155',
  accentColor:  '#c9952a',
  darkGrad1:    '#030612',
  darkGrad2:    '#050919',
  teacherColor: '#1A6B5C',
  parentColor:  '#7B3FA0',
};

const BRANDING_KEY = 'school_branding_v2';

function deriveDynamicTheme(b: SchoolBranding): DynamicTheme {
  const hex = (color: string, alpha: number): string => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const bl = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${bl},${alpha})`;
  };
  const lighten = (color: string, amount: number): string => {
    const r = Math.min(255, parseInt(color.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(color.slice(3, 5), 16) + amount);
    const bl = Math.min(255, parseInt(color.slice(5, 7), 16) + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  };
  const darken = (color: string, amount: number): string => {
    const r = Math.max(0, parseInt(color.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(color.slice(3, 5), 16) - amount);
    const bl = Math.max(0, parseInt(color.slice(5, 7), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  };

  return {
    primary:         b.primaryColor,
    primaryLight:    lighten(b.primaryColor, 30),
    primaryDark:     darken(b.primaryColor, 20),
    primaryDeep:     darken(b.primaryColor, 40),
    accent:          b.accentColor,
    accentLight:     lighten(b.accentColor, 30),
    accentGlow:      lighten(b.accentColor, 15),
    darkSurface:     lighten(b.darkGrad1, 20),
    darkSurfaceAlt:  lighten(b.darkGrad1, 35),
    darkBorder:      'rgba(255,255,255,0.10)',
    glowNavy:        hex(b.primaryColor, 0.55),
    glowGold:        hex(b.accentColor, 0.35),
    tabBar:          darken(b.darkGrad1, 5),
    tabBarActive:    b.accentColor,
    teacher:         b.teacherColor,
    parent:          b.parentColor,
    adminGrad:       [b.darkGrad1, b.darkGrad2, b.primaryColor] as const,
    adminBrightGrad: [b.darkGrad2, b.primaryColor, lighten(b.primaryColor, 30)] as const,
    goldGrad:        [darken(b.accentColor, 40), darken(b.accentColor, 20), b.accentColor, lighten(b.accentColor, 20)] as const,
  };
}

// ─── Demo School Default ───────────────────────────────────────────────────────

export const DEMO_SCHOOL_REGISTRATION: SchoolRegistration = {
  id:           'demo',
  name:         'روضة تجريبية — نُظُم',
  primaryColor: '#064e3b',
  accentColor:  '#f59e0b',
  adminPhone:   '+000000000',
  tier:         'trial',
  status:       'trial',
  createdAt:    '2026-01-01',
  notes:        'روضة تجريبية لعرض النظام على العملاء الجدد',
};

export const AHBABULLAH_REGISTRATION: SchoolRegistration = {
  id:           'ahbabullah',
  name:         'روضة أحباب الله الخاصة',
  primaryColor: '#0c1155',
  accentColor:  '#c9952a',
  adminPhone:   '+249917545129',
  adminEmail:   'Ahbaballah2026@hotmail.com',
  tier:         'professional',
  status:       'active',
  createdAt:    '2015-01-01',
  notes:        'صفيتة الغنوماب — السودان',
};

// ─── Context ──────────────────────────────────────────────────────────────────

const SchoolThemeContext = createContext<SchoolThemeContextValue | null>(null);

export function useSchoolTheme(): SchoolThemeContextValue {
  const ctx = useContext(SchoolThemeContext);
  if (!ctx) throw new Error('useSchoolTheme must be used inside SchoolThemeProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SchoolThemeProvider({ children }: { children: ReactNode }) {
  const [branding,       setBranding]       = useState<SchoolBranding>(DEFAULT_BRANDING);
  const [schools,        setSchools]        = useState<SchoolRegistration[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState('ahbabullah');

  // Load branding from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const id = await loadActiveSchoolId();
      setActiveSchoolId(id);
      try {
        const raw = await AsyncStorage.getItem(`${BRANDING_KEY}_${id}`);
        if (raw) setBranding(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // Listen to Firestore branding for active school
  useEffect(() => {
    if (!isFirebaseReady()) return;
    const unsub = fsListenSchoolBranding(activeSchoolId, (b) => {
      if (b) {
        setBranding(b);
        AsyncStorage.setItem(`${BRANDING_KEY}_${activeSchoolId}`, JSON.stringify(b)).catch(() => {});
      }
    });
    return unsub;
  }, [activeSchoolId]);

  const updateBranding = useCallback(async (patch: Partial<SchoolBranding>) => {
    const updated: SchoolBranding = { ...branding, ...patch, schoolId: activeSchoolId };
    setBranding(updated);
    await AsyncStorage.setItem(`${BRANDING_KEY}_${activeSchoolId}`, JSON.stringify(updated));
    await fsSaveSchoolBranding(updated).catch(() => {});
  }, [branding, activeSchoolId]);

  const switchSchool = useCallback(async (schoolId: string) => {
    await persistActiveSchoolId(schoolId);
    setActiveSchoolId(schoolId);
    try {
      const raw = await AsyncStorage.getItem(`${BRANDING_KEY}_${schoolId}`);
      if (raw) setBranding(JSON.parse(raw));
      else setBranding({ ...DEFAULT_BRANDING, schoolId });
    } catch {
      setBranding({ ...DEFAULT_BRANDING, schoolId });
    }
  }, []);

  const refreshSchools = useCallback(async () => {
    if (!isFirebaseReady()) return;
    const list = await fsListSchools().catch(() => []);
    if (list.length === 0) {
      await fsRegisterSchool(AHBABULLAH_REGISTRATION).catch(() => {});
      await fsRegisterSchool(DEMO_SCHOOL_REGISTRATION).catch(() => {});
      setSchools([AHBABULLAH_REGISTRATION, DEMO_SCHOOL_REGISTRATION]);
    } else {
      const hasDemo = list.some(s => s.id === 'demo');
      const hasAhbab = list.some(s => s.id === 'ahbabullah');
      const updated = [...list];
      if (!hasAhbab) {
        await fsRegisterSchool(AHBABULLAH_REGISTRATION).catch(() => {});
        updated.push(AHBABULLAH_REGISTRATION);
      }
      if (!hasDemo) {
        await fsRegisterSchool(DEMO_SCHOOL_REGISTRATION).catch(() => {});
        updated.push(DEMO_SCHOOL_REGISTRATION);
      }
      setSchools(updated);
    }
  }, []);

  useEffect(() => { refreshSchools(); }, []);

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
