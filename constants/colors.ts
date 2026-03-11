import { Platform } from 'react-native';

// ─── Futuristic Palette — derived from school logo (navy + gold) ────────────
const PRIMARY       = "#0c1155";
const PRIMARY_DARK  = "#050919";
const PRIMARY_DEEP  = "#030612";
const PRIMARY_LIGHT = "#1e2480";
const PRIMARY_MID   = "#0d1870";

const ACCENT        = "#c9952a";
const ACCENT_LIGHT  = "#e8b84b";
const ACCENT_MUTED  = "#a87d1a";
const ACCENT_GLOW   = "#dfb04a";

// Glass / Frost tokens
const GLASS_LIGHT   = "rgba(255,255,255,0.07)";
const GLASS_BORDER  = "rgba(255,255,255,0.13)";
const GLASS_STRONG  = "rgba(255,255,255,0.11)";
const GLOW_NAVY     = "rgba(30,36,128,0.55)";
const GLOW_GOLD     = "rgba(201,149,42,0.35)";

export const Colors = {
  primary:       PRIMARY,
  primaryLight:  PRIMARY_LIGHT,
  primaryDark:   PRIMARY_DARK,
  primaryDeep:   PRIMARY_DEEP,
  primaryMid:    PRIMARY_MID,

  accent:        ACCENT,
  accentLight:   ACCENT_LIGHT,
  accentMuted:   ACCENT_MUTED,
  accentGlow:    ACCENT_GLOW,

  success:  "#10B981",
  danger:   "#EF4444",
  warning:  "#F59E0B",
  info:     "#3B82F6",

  // Light surface (parent/teacher/body)
  background:  "#F2F4FB",
  surface:     "#FFFFFF",
  surfaceAlt:  "#EDF0FA",
  border:      "#D5DCEF",
  borderLight: "#E6EBFA",

  // Dark surface (admin dark cards)
  darkSurface:     "#0d1463",
  darkSurfaceAlt:  "#111a7a",
  darkBorder:      "rgba(255,255,255,0.10)",

  // Glass
  glass:       GLASS_LIGHT,
  glassBorder: GLASS_BORDER,
  glassStrong: GLASS_STRONG,
  glowNavy:    GLOW_NAVY,
  glowGold:    GLOW_GOLD,

  text:           "#080F3A",
  textSecondary:  "#4A5490",
  textLight:      "#8A94C0",
  textInverse:    "#FFFFFF",
  textGold:       ACCENT,

  tabBar:         PRIMARY_DARK,
  tabBarActive:   ACCENT,
  tabBarInactive: "rgba(255,255,255,0.45)",

  backgroundSecondary: "#E8EBF5",

  teacher:     "#1A6B5C",
  teacherDark: "#0d3d35",
  parent:      "#7B3FA0",
  parentDark:  "#4a1e6b",
};

// ─── Cross-platform shadow helper ──────────────────────────────────────────
export const Shadows = {
  sm: Platform.OS === 'web'
    ? { boxShadow: '0px 1px 8px rgba(12,17,85,0.10)' }
    : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 5, elevation: 2 },
  md: Platform.OS === 'web'
    ? { boxShadow: '0px 3px 14px rgba(12,17,85,0.14)' }
    : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 4 },
  lg: Platform.OS === 'web'
    ? { boxShadow: '0px 6px 24px rgba(12,17,85,0.18)' }
    : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8 },
  glow: Platform.OS === 'web'
    ? { boxShadow: '0px 0px 20px rgba(201,149,42,0.30)' }
    : { shadowColor: '#c9952a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  glowBlue: Platform.OS === 'web'
    ? { boxShadow: '0px 0px 18px rgba(30,36,128,0.50)' }
    : { shadowColor: '#1e2480', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.50, shadowRadius: 14, elevation: 6 },
};

// ─── Gradient presets ──────────────────────────────────────────────────────
export const Gradients = {
  admin:       ['#030612', '#050919', '#0c1155'] as const,
  adminBright: ['#050919', '#0c1155', '#1e2480'] as const,
  teacher:     ['#0a2e28', '#0d3d35', '#1A6B5C'] as const,
  parent:      ['#2a0d4a', '#4a1e6b', '#7B3FA0'] as const,
  gold:        ['#7a5a0a', '#a87d1a', '#c9952a', '#dfb04a'] as const,
  goldSheen:   ['#c9952a', '#e8b84b', '#c9952a'] as const,
  dark:        ['#030612', '#070d2e', '#0c1155'] as const,
  glass:       ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] as const,
};

export default {
  light: {
    text:            Colors.text,
    background:      Colors.background,
    tint:            Colors.accent,
    tabIconDefault:  Colors.tabBarInactive,
    tabIconSelected: Colors.tabBarActive,
  },
};
