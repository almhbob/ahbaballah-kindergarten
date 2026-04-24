import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, Platform, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { useSchoolTheme, COLOR_PRESETS, SchoolBranding } from '@/contexts/SchoolThemeContext';
import { uploadSchoolLogo } from '@/lib/firebase-storage';
import SchoolBrandHeader from '@/components/SchoolBrandHeader';
import * as Haptics from 'expo-haptics';

function hexValid(h: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(h);
}

function ColorSwatch({ color, label, selected, onPress }: {
  color: string; label: string; selected?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.swatch, selected && s.swatchSelected]}>
      <View style={[s.swatchDot, { backgroundColor: color }]} />
      {selected && (
        <View style={s.swatchCheck}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

function PreviewCard({ draft }: { draft: SchoolBranding }) {
  return (
    <View style={s.previewWrap}>
      <LinearGradient
        colors={[draft.darkGrad1, draft.darkGrad2, draft.primaryColor]}
        style={s.previewGrad}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={s.previewHeader}>
          {draft.logoUrl ? (
            <Image source={{ uri: draft.logoUrl }} style={s.previewLogo} resizeMode="contain" />
          ) : (
            <View style={[s.previewLogoPlaceholder, { borderColor: draft.accentColor }]}>
              <MaterialCommunityIcons name="school" size={22} color={draft.accentColor} />
            </View>
          )}
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={s.previewName} numberOfLines={1}>{draft.name || 'اسم الروضة'}</Text>
            <Text style={[s.previewSlogan, { color: draft.accentColor }]} numberOfLines={1}>
              {draft.slogan || 'الشعار هنا'}
            </Text>
          </View>
        </View>
        <View style={s.previewTabs}>
          {['الرئيسية', 'الطلاب', 'الأخبار'].map((tab, i) => (
            <View key={tab} style={[s.previewTab, i === 0 && { borderBottomColor: draft.accentColor, borderBottomWidth: 2 }]}>
              <Text style={[s.previewTabTxt, { color: i === 0 ? draft.accentColor : 'rgba(255,255,255,0.45)' }]}>{tab}</Text>
            </View>
          ))}
        </View>
        <View style={s.previewBadge}>
          <Text style={s.previewBadgeTxt}>معاينة مباشرة</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function BrandingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const { branding, updateBranding, theme, activeSchoolId } = useSchoolTheme();

  const [draft, setDraft]             = useState<SchoolBranding>({ ...branding });
  const [saving, setSaving]           = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [primaryHex, setPrimaryHex]   = useState(branding.primaryColor);
  const [accentHex, setAccentHex]     = useState(branding.accentColor);

  const patch = useCallback(<K extends keyof SchoolBranding>(key: K, val: SchoolBranding[K]) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  }, []);

  const handlePickLogo = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى مكتبة الصور');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setUploadingLogo(true);
      const url = await uploadSchoolLogo(activeSchoolId, result.assets[0].uri);
      patch('logoUrl', url);
      Alert.alert('تم الرفع ✓', 'تم رفع الشعار. اضغط حفظ لتطبيقه.');
    } catch {
      Alert.alert('خطأ', 'فشل رفع الشعار. تحقق من الاتصال بالإنترنت.');
    } finally {
      setUploadingLogo(false);
    }
  }, [activeSchoolId, patch]);

  const handleCameraLogo = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الكاميرا');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setUploadingLogo(true);
      const url = await uploadSchoolLogo(activeSchoolId, result.assets[0].uri);
      patch('logoUrl', url);
      Alert.alert('تم الرفع ✓', 'تم رفع الشعار. اضغط حفظ لتطبيقه.');
    } catch {
      Alert.alert('خطأ', 'فشل رفع الشعار.');
    } finally {
      setUploadingLogo(false);
    }
  }, [activeSchoolId, patch]);

  const applyPreset = (p: typeof COLOR_PRESETS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next: Partial<SchoolBranding> = {
      primaryColor: p.primary, accentColor: p.accent,
      darkGrad1: p.dark1, darkGrad2: p.dark2,
      teacherColor: p.teacher, parentColor: p.parent,
    };
    setDraft(prev => ({ ...prev, ...next }));
    setPrimaryHex(p.primary);
    setAccentHex(p.accent);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الروضة');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSaving(true);
    try {
      await updateBranding(draft);
      Alert.alert('تم الحفظ ✓', 'تم تحديث هوية الروضة البصرية وحفظها في Firebase');
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ، تحقق من الاتصال');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient
        colors={[draft.darkGrad1, draft.darkGrad2, draft.primaryColor]}
        style={[s.header, { paddingTop: topPad + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.headerTitle}>الهوية البصرية</Text>
            <Text style={s.headerSub}>تخصيص مظهر الروضة</Text>
          </View>
          <Pressable style={[s.saveHeaderBtn, { backgroundColor: draft.accentColor }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.saveHeaderTxt}>حفظ</Text>
            }
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Preview */}
        <PreviewCard draft={draft} />

        {/* School Brand Header Preview */}
        <View style={s.card}>
          <Text style={s.cardTitle}>مساحة شعار الروضة المشتركة</Text>
          <Text style={s.cardSub}>
            هذا هو الإطار الذي يظهر في جميع شاشات النظام. اضغط على مساحة الشعار لرفع شعار روضتك.
          </Text>
          <SchoolBrandHeader editable />
        </View>

        {/* School Identity */}
        <View style={s.card}>
          <Text style={s.cardTitle}>معلومات الهوية</Text>

          <Text style={s.label}>اسم الروضة *</Text>
          <TextInput
            style={s.input} value={draft.name} textAlign="right"
            onChangeText={v => patch('name', v)}
            placeholder="نظم إدارة رياض الأطفال"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={s.label}>الشعار / الرؤية</Text>
          <TextInput
            style={s.input} value={draft.slogan ?? ''} textAlign="right"
            onChangeText={v => patch('slogan', v)}
            placeholder="جودة • التزام • تميز"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={s.label}>شعار الروضة</Text>

          {/* Logo preview */}
          <View style={s.logoPickerWrap}>
            {uploadingLogo ? (
              <View style={s.logoUploading}>
                <ActivityIndicator color={draft.accentColor} size="large" />
                <Text style={[s.logoUploadingTxt, { color: draft.accentColor }]}>جاري رفع الشعار...</Text>
              </View>
            ) : draft.logoUrl ? (
              <Image source={{ uri: draft.logoUrl }} style={s.logoPreviewBig} resizeMode="contain" />
            ) : (
              <View style={[s.logoEmpty, { borderColor: draft.accentColor + '50' }]}>
                <MaterialCommunityIcons name="image-plus" size={36} color={draft.accentColor} style={{ opacity: 0.6 }} />
                <Text style={[s.logoEmptyTxt, { color: draft.accentColor }]}>لا يوجد شعار</Text>
              </View>
            )}
          </View>

          {/* Upload buttons */}
          <View style={s.logoActRow}>
            <Pressable
              onPress={handlePickLogo}
              disabled={uploadingLogo}
              style={({ pressed }) => [s.logoBtn, { borderColor: draft.accentColor + '60', opacity: pressed || uploadingLogo ? 0.7 : 1 }]}
            >
              <Ionicons name="images-outline" size={18} color={draft.accentColor} />
              <Text style={[s.logoBtnTxt, { color: draft.accentColor }]}>من المعرض</Text>
            </Pressable>
            <Pressable
              onPress={handleCameraLogo}
              disabled={uploadingLogo}
              style={({ pressed }) => [s.logoBtn, { borderColor: draft.accentColor + '60', opacity: pressed || uploadingLogo ? 0.7 : 1 }]}
            >
              <Ionicons name="camera-outline" size={18} color={draft.accentColor} />
              <Text style={[s.logoBtnTxt, { color: draft.accentColor }]}>التقاط صورة</Text>
            </Pressable>
            {!!draft.logoUrl && (
              <Pressable
                onPress={() => patch('logoUrl', '')}
                style={({ pressed }) => [s.logoBtn, { borderColor: Colors.danger + '60', opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                <Text style={[s.logoBtnTxt, { color: Colors.danger }]}>حذف</Text>
              </Pressable>
            )}
          </View>

          {/* Optional manual URL override */}
          <Text style={[s.label, { marginTop: 8 }]}>أو أدخل رابط الشعار يدوياً</Text>
          <TextInput
            style={s.input} value={draft.logoUrl ?? ''} textAlign="left"
            onChangeText={v => patch('logoUrl', v)}
            placeholder="https://example.com/logo.png"
            placeholderTextColor={Colors.textLight}
            keyboardType="url" autoCapitalize="none"
          />
        </View>

        {/* Color Presets */}
        <View style={s.card}>
          <Text style={s.cardTitle}>لوحات الألوان الجاهزة</Text>
          <Text style={s.cardSub}>اختر هوية بصرية جاهزة أو خصص ألوانك الخاصة أدناه</Text>

          {COLOR_PRESETS.map((preset, i) => {
            const isSelected =
              draft.primaryColor === preset.primary &&
              draft.accentColor  === preset.accent;
            return (
              <Pressable
                key={i}
                style={[s.presetRow, isSelected && { borderColor: preset.accent, backgroundColor: preset.primary + '10' }]}
                onPress={() => applyPreset(preset)}
              >
                <View style={s.presetColors}>
                  <View style={[s.presetDot, { backgroundColor: preset.dark1 }]} />
                  <View style={[s.presetDot, { backgroundColor: preset.primary }]} />
                  <View style={[s.presetDot, { backgroundColor: preset.accent }]} />
                </View>
                <Text style={[s.presetLabel, isSelected && { color: Colors.text, fontFamily: 'Inter_700Bold' }]}>
                  {preset.label}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={preset.accent} />}
              </Pressable>
            );
          })}
        </View>

        {/* Custom Colors */}
        <View style={s.card}>
          <Text style={s.cardTitle}>ألوان مخصصة</Text>
          <Text style={s.cardSub}>أدخل قيمة Hex مثل #0c1155</Text>

          <Text style={s.label}>اللون الرئيسي (Primary)</Text>
          <View style={s.hexRow}>
            <View style={[s.hexPreview, { backgroundColor: hexValid(primaryHex) ? primaryHex : '#ccc' }]} />
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0, fontFamily: 'Inter_500Medium', letterSpacing: 1 }]}
              value={primaryHex}
              onChangeText={v => {
                setPrimaryHex(v);
                if (hexValid(v)) patch('primaryColor', v);
              }}
              placeholder="#0c1155"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none" maxLength={7} textAlign="left"
            />
          </View>

          <Text style={[s.label, { marginTop: 12 }]}>اللون المميز (Accent)</Text>
          <View style={s.hexRow}>
            <View style={[s.hexPreview, { backgroundColor: hexValid(accentHex) ? accentHex : '#ccc' }]} />
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0, fontFamily: 'Inter_500Medium', letterSpacing: 1 }]}
              value={accentHex}
              onChangeText={v => {
                setAccentHex(v);
                if (hexValid(v)) patch('accentColor', v);
              }}
              placeholder="#c9952a"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none" maxLength={7} textAlign="left"
            />
          </View>

          {/* Role Colors */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>لون المعلمة</Text>
              <View style={s.hexRow}>
                <View style={[s.hexPreview, { backgroundColor: draft.teacherColor }]} />
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={draft.teacherColor}
                  onChangeText={v => { if (hexValid(v)) patch('teacherColor', v); else patch('teacherColor', v); }}
                  autoCapitalize="none" maxLength={7} textAlign="left"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>لون ولي الأمر</Text>
              <View style={s.hexRow}>
                <View style={[s.hexPreview, { backgroundColor: draft.parentColor }]} />
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={draft.parentColor}
                  onChangeText={v => { if (hexValid(v)) patch('parentColor', v); else patch('parentColor', v); }}
                  autoCapitalize="none" maxLength={7} textAlign="left"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Gradient Dark Colors */}
        <View style={s.card}>
          <Text style={s.cardTitle}>ألوان الخلفية الداكنة</Text>
          <Text style={s.cardSub}>تحكم في ألوان التدرج في لوحات المدير والهيدر</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>الداكن الأول</Text>
              <View style={s.hexRow}>
                <View style={[s.hexPreview, { backgroundColor: hexValid(draft.darkGrad1) ? draft.darkGrad1 : '#ccc' }]} />
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={draft.darkGrad1} autoCapitalize="none" maxLength={7} textAlign="left"
                  onChangeText={v => patch('darkGrad1', v)}
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>الداكن الثاني</Text>
              <View style={s.hexRow}>
                <View style={[s.hexPreview, { backgroundColor: hexValid(draft.darkGrad2) ? draft.darkGrad2 : '#ccc' }]} />
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={draft.darkGrad2} autoCapitalize="none" maxLength={7} textAlign="left"
                  onChangeText={v => patch('darkGrad2', v)}
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave} disabled={saving}
          style={({ pressed }) => [s.saveFab, { opacity: pressed || saving ? 0.75 : 1 }]}
        >
          <LinearGradient
            colors={[draft.darkGrad1, draft.primaryColor]}
            style={s.saveFabGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                <MaterialCommunityIcons name="content-save-check" size={20} color={draft.accentColor} />
                <Text style={[s.saveFabTxt, { color: draft.accentColor }]}>حفظ الهوية البصرية</Text>
              </>
            }
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingHorizontal: 20, paddingBottom: 18, overflow: 'hidden' },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:  { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub:    { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  backBtn:      { padding: 6 },
  saveHeaderBtn:{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveHeaderTxt:{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },

  card:         { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: Colors.border },
  cardTitle:    { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  cardSub:      { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginBottom: 8 },

  label:        { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 4, marginTop: 4 },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 12,
    fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 8,
  },

  hexRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hexPreview:   { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },

  presetRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 8, gap: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  presetColors: { flexDirection: 'row', gap: 4 },
  presetDot:    { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: Colors.border },
  presetLabel:  { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'right' },

  swatch:       { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', position: 'relative', overflow: 'visible' },
  swatchSelected:{ borderColor: Colors.text },
  swatchDot:    { width: '100%', height: '100%', borderRadius: 6 },
  swatchCheck:  { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.text, justifyContent: 'center', alignItems: 'center' },

  previewWrap:  { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  previewGrad:  { padding: 16, gap: 12 },
  previewHeader:{ flexDirection: 'row', alignItems: 'center' },
  previewLogo:  { width: 44, height: 44, borderRadius: 10 },
  previewLogoPlaceholder: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  previewName:  { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  previewSlogan:{ fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  previewTabs:  { flexDirection: 'row', gap: 16 },
  previewTab:   { paddingBottom: 8 },
  previewTabTxt:{ fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  previewBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  previewBadgeTxt: { fontSize: 9, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },

  logoPreview:  { width: '100%', height: 80, borderRadius: 10, backgroundColor: Colors.surfaceAlt, marginTop: 4, marginBottom: 4 },
  logoPickerWrap: {
    width: '100%', height: 130, borderRadius: 14, overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5,
    borderColor: Colors.borderLight, borderStyle: 'dashed',
    marginBottom: 10, justifyContent: 'center', alignItems: 'center',
  },
  logoPreviewBig:   { width: '100%', height: '100%' },
  logoUploading:    { alignItems: 'center', gap: 8 },
  logoUploadingTxt: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  logoEmpty:        { alignItems: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderRadius: 14, padding: 24 },
  logoEmptyTxt:     { fontSize: 12, fontFamily: 'Inter_400Regular' },
  logoActRow:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  logoBtn:     {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    backgroundColor: Colors.surfaceAlt,
  },
  logoBtnTxt:  { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  saveFab:      { borderRadius: 14, overflow: 'hidden' },
  saveFabGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  saveFabTxt:   { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
