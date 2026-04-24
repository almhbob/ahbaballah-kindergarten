import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, Pressable,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSchoolTheme } from '@/contexts/SchoolThemeContext';
import { uploadFile } from '@/lib/uploads';

const SYSTEM_LOGO = require('@/assets/images/system-logo.png');

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemMark() {
  return (
    <View style={s.systemMark}>
      <Image source={SYSTEM_LOGO} style={s.systemLogo} resizeMode="contain" />
      <View style={s.systemTxt}>
        <Text style={s.systemLabel}>POWERED BY</Text>
        <Text style={s.systemName}>نظم إدارة رياض الأطفال</Text>
      </View>
    </View>
  );
}

function SchoolLogoSlot({
  logoUrl,
  schoolName,
  accentColor,
  editable,
  onUpload,
  uploading,
}: {
  logoUrl?: string;
  schoolName: string;
  accentColor: string;
  editable?: boolean;
  onUpload?: (url: string) => void;
  uploading?: boolean;
}) {
  return (
    <View style={s.schoolSlot}>
      <View style={s.logoWrap}>
        {uploading ? (
          <ActivityIndicator color={accentColor} />
        ) : logoUrl ? (
          <Image source={{ uri: logoUrl }} style={s.schoolLogoImg} resizeMode="contain" />
        ) : (
          <View style={[s.logoPlaceholder, { borderColor: accentColor }]}>
            <MaterialCommunityIcons name="school" size={28} color={accentColor} />
          </View>
        )}
        {editable && !uploading && (
          <View style={[s.editBadge, { backgroundColor: accentColor }]}>
            <Ionicons name="camera" size={11} color="#fff" />
          </View>
        )}
      </View>
      <View style={s.schoolTxtWrap}>
        <Text style={s.schoolName} numberOfLines={1}>{schoolName || 'اسم الروضة'}</Text>
        <Text style={[s.schoolSub, { color: accentColor }]} numberOfLines={1}>
          لوحة الإدارة
        </Text>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  /** Show edit button to upload a new school logo */
  editable?: boolean;
  /** Compact single-row mode for screen headers */
  compact?: boolean;
  /** Override school name (uses theme name by default) */
  schoolName?: string;
}

export default function SchoolBrandHeader({ editable = false, compact = false, schoolName }: Props) {
  const { branding, theme, updateBranding } = useSchoolTheme();
  const [uploading, setUploading] = useState(false);

  const name = schoolName || branding.name || 'الروضة';
  const logoUrl = branding.logoUrl;
  const accent = theme.accent;
  const primary = theme.primary;

  async function handleLogoPress() {
    if (!editable) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول إلى مكتبة الصور');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setUploading(true);
      const uri = res.assets[0].uri;
      const publicUrl = await uploadFile(uri, { name: 'school-logo.jpg', mime: 'image/jpeg' });
      await updateBranding({ ...branding, logoUrl: publicUrl });
    } catch (err: any) {
      Alert.alert('فشل الرفع', err?.message || 'يرجى المحاولة مجدداً');
    } finally {
      setUploading(false);
    }
  }

  if (compact) {
    return (
      <View style={[s.compact, { borderBottomColor: `${primary}22` }]}>
        <Pressable onPress={handleLogoPress} disabled={!editable}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={s.compactLogo} resizeMode="contain" />
          ) : (
            <View style={[s.compactLogoPlaceholder, { borderColor: accent }]}>
              <MaterialCommunityIcons name="school" size={18} color={accent} />
            </View>
          )}
          {uploading && (
            <View style={s.compactSpinner}>
              <ActivityIndicator size="small" color={accent} />
            </View>
          )}
          {editable && !uploading && (
            <View style={[s.editBadgeSmall, { backgroundColor: accent }]}>
              <Ionicons name="camera" size={9} color="#fff" />
            </View>
          )}
        </Pressable>
        <Text style={[s.compactName, { color: '#fff' }]} numberOfLines={1}>{name}</Text>
        <View style={{ flex: 1 }} />
        <Image source={SYSTEM_LOGO} style={s.compactSystem} resizeMode="contain" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[branding.darkGrad1, branding.darkGrad2, primary] as [string, string, string]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.container}
    >
      {/* School branding slot */}
      <Pressable onPress={handleLogoPress} disabled={!editable} style={s.left}>
        <SchoolLogoSlot
          logoUrl={logoUrl}
          schoolName={name}
          accentColor={accent}
          editable={editable}
          onUpload={() => {}}
          uploading={uploading}
        />
      </Pressable>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: `${accent}40` }]} />

      {/* System mark */}
      <View style={s.right}>
        <SystemMark />
      </View>

      {/* Gold accent line */}
      <View style={[s.accentLine, { backgroundColor: accent }]} />
    </LinearGradient>
  );
}

// ─── Sub-export: lightweight header bar for use inside Stack screens ──────────

export function BrandHeaderBar({ title }: { title?: string }) {
  const { branding, theme } = useSchoolTheme();
  return (
    <View style={[s.headerBar, { backgroundColor: branding.darkGrad1, borderBottomColor: `${theme.accent}30` }]}>
      {branding.logoUrl ? (
        <Image source={{ uri: branding.logoUrl }} style={s.headerBarLogo} resizeMode="contain" />
      ) : (
        <View style={[s.headerBarLogoPlaceholder, { borderColor: theme.accent }]}>
          <MaterialCommunityIcons name="school" size={16} color={theme.accent} />
        </View>
      )}
      <Text style={s.headerBarTitle} numberOfLines={1}>
        {title || branding.name || 'الروضة'}
      </Text>
      <Image source={SYSTEM_LOGO} style={s.headerBarSystem} resizeMode="contain" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Full card
  container: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  left: { flex: 1 },
  right: { flex: 1, alignItems: 'flex-start' },
  divider: { width: 1, height: 54, borderRadius: 1 },
  accentLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },

  // School slot
  schoolSlot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: { width: 58, height: 58, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  schoolLogoImg: { width: 58, height: 58, borderRadius: 14 },
  logoPlaceholder: {
    width: 58, height: 58, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  editBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  schoolTxtWrap: { flex: 1 },
  schoolName: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 3 },
  schoolSub: { fontSize: 12, fontWeight: '600', opacity: 0.9 },

  // System mark
  systemMark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  systemLogo: { width: 36, height: 36, borderRadius: 10 },
  systemTxt: {},
  systemLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  systemName: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '700', marginTop: 1 },

  // Compact bar
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  compactLogo: { width: 34, height: 34, borderRadius: 8 },
  compactLogoPlaceholder: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1.5, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  compactSpinner: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' },
  editBadgeSmall: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  compactName: { fontSize: 15, fontWeight: '800' },
  compactSystem: { width: 26, height: 26, borderRadius: 7, opacity: 0.75 },

  // Header bar
  headerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBarLogo: { width: 32, height: 32, borderRadius: 8 },
  headerBarLogoPlaceholder: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerBarTitle: { color: '#fff', fontSize: 15, fontWeight: '800', flex: 1 },
  headerBarSystem: { width: 28, height: 28, borderRadius: 8, opacity: 0.7 },
});
