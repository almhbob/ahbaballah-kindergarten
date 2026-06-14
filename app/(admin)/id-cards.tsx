import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, Alert, Dimensions, Modal, ScrollView,
  ActivityIndicator, TextInput, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, Employee, Student } from '@/contexts/AppDataContext';
import IDCard, { IDCardPerson, IDCardOverride } from '@/components/IDCard';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 40;

const ACCESS_OPTIONS = ['الروضة', 'الاجتماعات', 'الاحتفالات', 'الأنشطة'];
const YEAR_OPTIONS = ['2024 – 2025', '2025 – 2026', '2026 – 2027'];

type Tab = 'employees' | 'parents';

function employeeToPerson(e: Employee): IDCardPerson {
  return {
    type: 'employee',
    id: e.id,
    name: e.name,
    role: e.role,
    level: e.level,
    phone: e.phone,
    email: e.email,
  };
}
function studentToParentPerson(s: Student): IDCardPerson {
  return {
    type: 'parent',
    id: `parent_${s.id}`,
    name: s.parentName,
    studentName: s.name,
    studentLevel: s.level,
    phone: s.parentPhone,
  };
}

export default function IDCardsScreen() {
  const insets = useSafeAreaInsets();
  const { employees, students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [tab, setTab] = useState<Tab>('employees');
  const [previewPerson, setPreviewPerson] = useState<IDCardPerson | null>(null);
  const [editPerson, setEditPerson] = useState<IDCardPerson | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Per-person overrides stored by person.id
  const [overrides, setOverrides] = useState<Record<string, IDCardOverride>>({});

  // Edit form state
  const [editAccess, setEditAccess] = useState<string[]>([]);
  const [editYear, setEditYear] = useState(YEAR_OPTIONS[1]);
  const [editNote, setEditNote] = useState('');

  const cardRef = useRef<View>(null);

  const persons: IDCardPerson[] = tab === 'employees'
    ? employees.map(employeeToPerson)
    : students.map(studentToParentPerson);

  function openPreview(person: IDCardPerson) {
    setPreviewPerson(person);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openEdit(person: IDCardPerson) {
    const ov = overrides[person.id];
    const defaultAccess = person.type === 'employee'
      ? ['الروضة', 'الاجتماعات', 'الاحتفالات']
      : ['الاجتماعات', 'الاحتفالات'];
    setEditAccess(ov?.accessList ?? [...defaultAccess]);
    setEditYear(ov?.year ?? YEAR_OPTIONS[1]);
    setEditNote(ov?.note ?? '');
    setEditPerson(person);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function saveEdit() {
    if (!editPerson) return;
    setOverrides(prev => ({
      ...prev,
      [editPerson.id]: {
        accessList: editAccess,
        year: editYear,
        note: editNote.trim() || undefined,
      },
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditPerson(null);
  }

  function toggleAccess(item: string) {
    setEditAccess(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
    );
  }

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    if (Platform.OS === 'web') {
      Alert.alert('تنبيه', 'التحميل متاح على الجهاز المحمول فقط');
      return;
    }
    try {
      setDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: Math.round(1080 * (214 / 340)),
      });
      await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'مشاركة البطاقة' });
    } catch {
      Alert.alert('خطأ', 'تعذّر تحميل البطاقة، حاول مجدداً');
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#050919', '#0D1830', '#162040']}
        style={[s.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.75)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>بطاقات الهوية</Text>
            <Text style={s.headerSub}>بطاقات دخول رسمية معتمدة</Text>
          </View>
          <MaterialCommunityIcons name="card-account-details" size={24} color="#D4AC3A" />
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {([
            { key: 'employees' as Tab, label: 'الموظفون', icon: 'account-tie', count: employees.length },
            { key: 'parents'   as Tab, label: 'أولياء الأمور', icon: 'account-child', count: students.length },
          ]).map(t => (
            <Pressable
              key={t.key}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
              onPress={() => { setTab(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <MaterialCommunityIcons name={t.icon as any} size={16} color={tab === t.key ? '#D4AC3A' : 'rgba(255,255,255,0.45)'} />
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
              <View style={[s.tabBadge, tab === t.key && s.tabBadgeActive]}>
                <Text style={s.tabBadgeTxt}>{t.count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* ── Card list ── */}
      <FlatList
        data={persons}
        keyExtractor={p => p.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="card-off" size={44} color={Colors.textLight} />
            <Text style={s.emptyText}>لا توجد بيانات</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.cardWrap}>
            <IDCard person={item} targetWidth={CARD_W} override={overrides[item.id]} />
            <View style={s.cardActions}>
              <Pressable style={s.actionBtn} onPress={() => openPreview(item)}>
                <Ionicons name="eye-outline" size={15} color={Colors.textSecondary} />
                <Text style={[s.actionTxt, { color: Colors.textSecondary }]}>معاينة</Text>
              </Pressable>
              <View style={s.actionDivider} />
              <Pressable style={s.actionBtn} onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={15} color={Colors.primary} />
                <Text style={[s.actionTxt, { color: Colors.primary }]}>تعديل</Text>
              </Pressable>
              <View style={s.actionDivider} />
              <Pressable style={s.actionBtn} onPress={() => { openPreview(item); }}>
                <Ionicons name="download-outline" size={15} color="#D4AC3A" />
                <Text style={[s.actionTxt, { color: '#D4AC3A' }]}>تحميل</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* ── Preview + Download Modal ── */}
      <Modal visible={!!previewPerson} transparent animationType="slide" statusBarTranslucent>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: bottomPad + 12 }]}>
            <View style={s.sheetHandle} />

            {/* Header */}
            <View style={s.sheetHeaderRow}>
              <Pressable style={s.iconBtn} onPress={() => setPreviewPerson(null)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
              <Text style={s.sheetTitle}>{previewPerson?.name}</Text>
              <Pressable
                style={[s.iconBtn, { backgroundColor: Colors.primary + '18' }]}
                onPress={() => { setPreviewPerson(null); if (previewPerson) openEdit(previewPerson); }}
              >
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
              </Pressable>
            </View>

            {/* Card preview with ref for capture */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
              {previewPerson && (
                <IDCard
                  ref={cardRef}
                  person={previewPerson}
                  targetWidth={CARD_W}
                  override={overrides[previewPerson.id]}
                />
              )}
            </ScrollView>

            {/* Download button */}
            <Pressable
              style={[s.dlBtn, downloading && { opacity: 0.6 }]}
              onPress={handleDownload}
              disabled={downloading}
            >
              <LinearGradient
                colors={['#8B6914', '#C49A2A', '#D4AC3A', '#C49A2A']}
                style={s.dlGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {downloading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <MaterialCommunityIcons name="download" size={20} color="#fff" />
                      <Text style={s.dlTxt}>تحميل ومشاركة</Text>
                    </>
                }
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal visible={!!editPerson} transparent animationType="slide" statusBarTranslucent>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: bottomPad + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <Pressable style={s.iconBtn} onPress={() => setEditPerson(null)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
              <Text style={s.sheetTitle}>تعديل البطاقة</Text>
              <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#D4AC3A" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Access permissions */}
              <Text style={s.fieldLabel}>صلاحيات الدخول</Text>
              <View style={s.accessGrid}>
                {ACCESS_OPTIONS.map(item => (
                  <Pressable
                    key={item}
                    style={[s.accessChip, editAccess.includes(item) && s.accessChipActive]}
                    onPress={() => { toggleAccess(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Ionicons
                      name={editAccess.includes(item) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={editAccess.includes(item) ? '#D4AC3A' : Colors.textLight}
                    />
                    <Text style={[s.accessChipTxt, editAccess.includes(item) && { color: '#D4AC3A' }]}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Validity year */}
              <Text style={s.fieldLabel}>سنة الصلاحية</Text>
              <View style={s.yearRow}>
                {YEAR_OPTIONS.map(y => (
                  <Pressable
                    key={y}
                    style={[s.yearChip, editYear === y && s.yearChipActive]}
                    onPress={() => { setEditYear(y); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[s.yearChipTxt, editYear === y && { color: '#D4AC3A' }]}>{y}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom note */}
              <Text style={s.fieldLabel}>ملاحظة (اختياري)</Text>
              <TextInput
                style={s.noteInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="أضف ملاحظة على البطاقة..."
                placeholderTextColor={Colors.textLight}
                textAlign="right"
                maxLength={60}
              />

              {/* Save */}
              <Pressable style={s.saveBtn} onPress={saveEdit}>
                <LinearGradient
                  colors={['#163424', '#204C34', '#2A6444']}
                  style={s.saveGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={s.saveTxt}>حفظ التعديلات</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', marginTop: 1 },

  tabs: { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  tabBtnActive: { backgroundColor: 'rgba(180,130,20,0.18)', borderWidth: 1, borderColor: 'rgba(180,130,20,0.45)' },
  tabLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.45)' },
  tabLabelActive: { color: '#D4AC3A' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: 'rgba(180,130,20,0.35)' },
  tabBadgeTxt: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff' },

  list: { padding: 20, gap: 14, paddingBottom: 100 },

  cardWrap: { gap: 6 },
  cardActions: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  actionTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  actionDivider: { width: 1, backgroundColor: Colors.border },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textLight },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  dlBtn: { borderRadius: 14, overflow: 'hidden' },
  dlGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  dlTxt: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },

  fieldLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 8, marginTop: 16 },

  accessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accessChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.background,
  },
  accessChipActive: { borderColor: '#D4AC3A', backgroundColor: '#D4AC3A10' },
  accessChipTxt: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  yearRow: { flexDirection: 'row', gap: 10 },
  yearChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.background,
  },
  yearChipActive: { borderColor: '#D4AC3A', backgroundColor: '#D4AC3A10' },
  yearChipTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  noteInput: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },

  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20, marginBottom: 4 },
  saveGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  saveTxt: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
