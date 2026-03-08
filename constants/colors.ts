import { Platform } from 'react-native';

// ─── Palette derived from the school logo ──────────────────────────────────
// Logo dominant colors: deep navy #000f5a / #0c1155  +  gold #d2a52d / #c9952a
const PRIMARY      = "#0c1155";   // deep navy (from logo)
const PRIMARY_DARK = "#040b3c";   // darkest navy
const PRIMARY_LIGHT = "#1e2480";  // lighter navy highlight
const ACCENT       = "#c9952a";   // warm gold (from logo)
const ACCENT_LIGHT = "#dfb04a";
const ACCENT_MUTED = "#a87d1a";

export const Colors = {
  primary:       PRIMARY,
  primaryLight:  PRIMARY_LIGHT,
  primaryDark:   PRIMARY_DARK,
  accent:        ACCENT,
  accentLight:   ACCENT_LIGHT,
  accentMuted:   ACCENT_MUTED,
  success:  "#10B981",
  danger:   "#EF4444",
  warning:  "#F59E0B",
  background: "#F3F5FB",
  surface:    "#FFFFFF",
  surfaceAlt: "#EDF0FA",
  border:     "#D8DEEF",
  borderLight:"#E8ECF7",
  text:           "#080F3A",
  textSecondary:  "#505A8C",
  textLight:      "#95A0C5",
  textInverse:    "#FFFFFF",
  tabBar:         PRIMARY,
  tabBarActive:   ACCENT,
  tabBarInactive: "rgba(255,255,255,0.5)",
  teacher: "#1A6B5C",
  teacherDark: "#0d3d35",
  parent: "#7B3FA0",
  parentDark: "#4a1e6b",
};

// ─── Cross-platform shadow helper ──────────────────────────────────────────
export const Shadows = {
  sm: Platform.OS === 'web'
    ? { boxShadow: '0px 1px 6px rgba(12,17,85,0.08)' }
    : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  md: Platform.OS === 'web'
    ? { boxShadow: '0px 2px 10px rgba(12,17,85,0.12)' }
    : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  lg: Platform.OS === 'web'
    ? { boxShadow: '0px 4px 20px rgba(12,17,85,0.15)' }
    : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 },
};

// ─── Gradient presets ──────────────────────────────────────────────────────
export const Gradients = {
  admin:   ['#040b3c', '#0c1155', '#1e2480'] as const,
  teacher: ['#0d3d35', '#1A6B5C', '#1f7d6b'] as const,
  parent:  ['#3b1660', '#7B3FA0', '#8e4db8'] as const,
  gold:    ['#a87d1a', '#c9952a', '#dfb04a'] as const,
};

export default {
  light: {
    text:           Colors.text,
    background:     Colors.background,
    tint:           Colors.accent,
    tabIconDefault: Colors.tabBarInactive,
    tabIconSelected: Colors.tabBarActive,
  },
};
