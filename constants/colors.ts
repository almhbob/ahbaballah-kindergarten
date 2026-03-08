const PRIMARY = "#0F2B4E";
const ACCENT = "#F4A01C";
const SUCCESS = "#10B981";
const DANGER = "#EF4444";
const WARNING = "#F59E0B";

export const Colors = {
  primary: PRIMARY,
  primaryLight: "#1A3A5C",
  primaryDark: "#081A30",
  accent: ACCENT,
  accentLight: "#FBBF24",
  success: SUCCESS,
  danger: DANGER,
  warning: WARNING,
  background: "#F8F9FC",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  text: "#0F172A",
  textSecondary: "#64748B",
  textLight: "#94A3B8",
  textInverse: "#FFFFFF",
  tabBar: PRIMARY,
  tabBarActive: ACCENT,
  tabBarInactive: "rgba(255,255,255,0.5)",
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
