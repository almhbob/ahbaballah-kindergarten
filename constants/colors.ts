import { Platform, StyleSheet } from 'react-native';

const PRIMARY = "#1a1f5c";
const ACCENT = "#ca9928";
const SUCCESS = "#10B981";
const DANGER = "#EF4444";
const WARNING = "#F59E0B";

export const Colors = {
  primary: PRIMARY,
  primaryLight: "#252b7a",
  primaryDark: "#0d1143",
  accent: ACCENT,
  accentLight: "#d4af5a",
  accentMuted: "#b8941f",
  success: SUCCESS,
  danger: DANGER,
  warning: WARNING,
  background: "#F4F6FC",
  surface: "#FFFFFF",
  surfaceAlt: "#EFF2FA",
  border: "#DDE3F0",
  borderLight: "#EBF0FA",
  text: "#0C1340",
  textSecondary: "#5A6490",
  textLight: "#9BA3C7",
  textInverse: "#FFFFFF",
  tabBar: PRIMARY,
  tabBarActive: ACCENT,
  tabBarInactive: "rgba(255,255,255,0.5)",
  // Role colours
  teacher: "#1A6B5C",
  teacherDark: "#0d3d35",
  parent: "#7B3FA0",
  parentDark: "#4a1e6b",
};

// Cross-platform shadow helper
const _sm = Platform.OS === 'web'
  ? { boxShadow: '0px 1px 6px rgba(26,31,92,0.07)' }
  : { shadowColor: '#1a1f5c', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

const _md = Platform.OS === 'web'
  ? { boxShadow: '0px 2px 10px rgba(26,31,92,0.1)' }
  : { shadowColor: '#1a1f5c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 };

const _lg = Platform.OS === 'web'
  ? { boxShadow: '0px 4px 20px rgba(26,31,92,0.14)' }
  : { shadowColor: '#1a1f5c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 6 };

export const Shadows = { sm: _sm, md: _md, lg: _lg };

// Gradient presets per role
export const Gradients = {
  admin: ['#0d1143', '#1a1f5c', '#252b7a'] as const,
  teacher: ['#0d3d35', '#1A6B5C', '#1f7d6b'] as const,
  parent: ['#3b1660', '#7B3FA0', '#8e4db8'] as const,
  gold: ['#ca9928', '#b8841c', '#a07018'] as const,
};

export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.accent,
    tabIconDefault: Colors.tabBarInactive,
    tabIconSelected: Colors.tabBarActive,
  },
};
