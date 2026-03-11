import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, ScrollView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '@/constants/colors';
import { useAppData, Student } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type LocationStatus = 'checking' | 'inside' | 'outside' | 'denied' | 'web';

const BEHAVIOR_COLORS = {
  'ممتاز': { color: Colors.success, bg: '#ECFDF5' },
  'جيد': { color: '#3B82F6', bg: '#EFF6FF' },
  'مقبول': { color: Colors.warning, bg: '#FFFBEB' },
  'يحتاج متابعة': { color: Colors.danger, bg: '#FEF2F2' },
};

const HOMEWORK_COLORS = {
  'منجز': { color: Colors.success, bg: '#ECFDF5' },
  'ناقص': { color: Colors.warning, bg: '#FFFBEB' },
  'لم ينجز': { color: Colors.danger, bg: '#FEF2F2' },
};

const LEVEL_COLORS: Record<string, string> = {
  'براعم': '#F59E0B', 'مستوى أول': '#10B981', 'مستوى ثاني': '#3B82F6',
};

function StudentCard({ student, onPress }: { student: Student; onPress: () => void }) {
  const bh = BEHAVIOR_COLORS[student.behavior];
  const hw = HOMEWORK_COLORS[student.homework];
  const lc = LEVEL_COLORS[student.level] || '#1A6B5C';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1, borderRightColor: lc }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.attendanceBadge, { backgroundColor: student.attendance > 90 ? '#ECFDF5' : student.attendance > 80 ? '#FFFBEB' : '#FEF2F2' }]}>
          <Text style={[styles.attendanceText, { color: student.attendance > 90 ? Colors.success : student.attendance > 80 ? Colors.warning : Colors.danger }]}>
            {student.attendance}%
          </Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentLevel}>{student.level}</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: lc + '18', borderColor: lc + '40' }]}>
          <Text style={[styles.avatarText, { color: lc }]}>{student.name.charAt(0)}</Text>
        </View>
      </View>
      <View style={styles.cardBadges}>
        <View style={[styles.badge, { backgroundColor: hw.bg }]}>
          <Text style={[styles.badgeText, { color: hw.color }]}>الواجب: {student.homework}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: bh.bg }]}>
          <Text style={[styles.badgeText, { color: bh.color }]}>السلوك: {student.behavior}</Text>
        </View>
      </View>
      {student.notes ? (
        <Text style={styles.notesPreview} numberOfLines={1}>ملاحظة: {student.notes}</Text>
      ) : null}
    </Pressable>
  );
}

export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const { students, updateStudent, schoolInfo } = useAppData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editBehavior, setEditBehavior] = useState<Student['behavior']>('ممتاز');
  const [editHomework, setEditHomework] = useState<Student['homework']>('منجز');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportAte, setReportAte] = useState('');
  const [reportLearned, setReportLearned] = useState('');
  const [reportMood, setReportMood] = useState('');
  const [locStatus, setLocStatus] = useState<LocationStatus>(Platform.OS === 'web' ? 'web' : 'checking');
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const locInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const schoolLat = schoolInfo.lat ?? 34.8167;
  const schoolLng = schoolInfo.lng ?? 36.1167;
  const radius = schoolInfo.attendanceRadius ?? 300;
  const isInsideSchool = locStatus === 'inside' || locStatus === 'web';

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocStatus('denied'); return; }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const d = haversineMeters(pos.coords.latitude, pos.coords.longitude, schoolLat, schoolLng);
        setDistanceM(Math.round(d));
        setLocStatus(d <= radius ? 'inside' : 'outside');
      } catch { setLocStatus('outside'); }
    };

    checkLocation();
    locInterval.current = setInterval(checkLocation, 60000);
    return () => { if (locInterval.current) clearInterval(locInterval.current); };
  }, [schoolLat, schoolLng, radius]);

  const filtered = students.filter(s => s.name.includes(search) || s.level.includes(search));

  const openEdit = (s: Student) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(s);
    setEditNotes(s.notes);
    setEditBehavior(s.behavior);
    setEditHomework(s.homework);
  };

  const handleSave = () => {
    if (!selected) return;
    const todayReport = {
      date: reportDate,
      ate: reportAte || 'أكل وجبته',
      learned: reportLearned || 'متابعة المنهج',
      behaviorNote: editNotes,
      mood: reportMood || 'طبيعي',
    };
    updateStudent(selected.id, {
      notes: editNotes,
      behavior: editBehavior,
      homework: editHomework,
      dailyReports: [todayReport, ...selected.dailyReports].slice(0, 30),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelected(null);
    setReportAte('');
    setReportLearned('');
    setReportMood('');
    setEditNotes('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={styles.certBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(teacher)/certificates'); }}
          >
            <MaterialCommunityIcons name="certificate" size={14} color="#6EE7B7" />
            <Text style={styles.certBtnText}>الشهادات</Text>
          </Pressable>
          <Text style={styles.headerTitle}>دفتر المتابعة</Text>
        </View>

        {/* ── Location Status Bar ── */}
        {locStatus !== 'web' && (
          <View style={[styles.locBar, {
            backgroundColor: locStatus === 'inside' ? 'rgba(16,185,129,0.18)' :
              locStatus === 'checking' ? 'rgba(255,255,255,0.10)' :
              locStatus === 'denied' ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)',
          }]}>
            <Ionicons
              name={locStatus === 'inside' ? 'location' : locStatus === 'checking' ? 'time-outline' : locStatus === 'denied' ? 'warning-outline' : 'lock-closed'}
              size={14}
              color={locStatus === 'inside' ? '#10B981' : locStatus === 'checking' ? '#9CA3AF' : locStatus === 'denied' ? '#F59E0B' : '#EF4444'}
            />
            <Text style={[styles.locBarTxt, {
              color: locStatus === 'inside' ? '#10B981' : locStatus === 'checking' ? '#9CA3AF' : locStatus === 'denied' ? '#F59E0B' : '#EF4444',
            }]}>
              {locStatus === 'inside' ? `داخل الروضة${distanceM !== null ? ` — ${distanceM} م` : ''}` :
               locStatus === 'checking' ? 'جارٍ التحقق من الموقع...' :
               locStatus === 'denied' ? 'تسجيل الحضور يتطلب تفعيل الموقع' :
               `خارج الروضة — تسجيل الحضور مقيّد${distanceM !== null ? ` (${distanceM} م)` : ''}`}
            </Text>
          </View>
        )}

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث بالاسم أو المستوى..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <StudentCard student={item} onPress={() => openEdit(item)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-search" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد نتائج</Text>
          </View>
        }
      />

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
                <Text style={styles.sheetTitle}>{selected?.name}</Text>
              </View>

              <Text style={styles.fieldLabel}>السلوك</Text>
              <View style={styles.optionsRow}>
                {(['ممتاز', 'جيد', 'مقبول', 'يحتاج متابعة'] as Student['behavior'][]).map(b => (
                  <Pressable
                    key={b}
                    style={[styles.option, editBehavior === b && { backgroundColor: BEHAVIOR_COLORS[b].bg, borderColor: BEHAVIOR_COLORS[b].color }]}
                    onPress={() => { setEditBehavior(b); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.optionText, editBehavior === b && { color: BEHAVIOR_COLORS[b].color, fontFamily: 'Inter_700Bold' }]}>{b}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>الواجبات</Text>
              <View style={styles.optionsRow}>
                {(['منجز', 'ناقص', 'لم ينجز'] as Student['homework'][]).map(h => (
                  <Pressable
                    key={h}
                    style={[styles.option, editHomework === h && { backgroundColor: HOMEWORK_COLORS[h].bg, borderColor: HOMEWORK_COLORS[h].color }]}
                    onPress={() => { setEditHomework(h); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.optionText, editHomework === h && { color: HOMEWORK_COLORS[h].color, fontFamily: 'Inter_700Bold' }]}>{h}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>تقرير اليوم - ماذا أكل؟</Text>
              <TextInput style={styles.textInput} placeholder="أكل وجبته كاملة..." placeholderTextColor={Colors.textLight} value={reportAte} onChangeText={setReportAte} textAlign="right" />

              <Text style={styles.fieldLabel}>ماذا تعلم اليوم؟</Text>
              <TextInput style={styles.textInput} placeholder="تعلم الأعداد..." placeholderTextColor={Colors.textLight} value={reportLearned} onChangeText={setReportLearned} textAlign="right" />

              <Text style={styles.fieldLabel}>مزاج الطفل</Text>
              <View style={styles.optionsRow}>
                {['سعيد', 'هادئ', 'نشيط', 'متعب', 'متحمس'].map(m => (
                  <Pressable
                    key={m}
                    style={[styles.option, reportMood === m && { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}
                    onPress={() => { setReportMood(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.optionText, reportMood === m && { color: '#3B82F6', fontFamily: 'Inter_700Bold' }]}>{m}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>ملاحظات المعلمة</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="ملاحظات سلوكية أو أكاديمية..."
                placeholderTextColor={Colors.textLight}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                textAlign="right"
                textAlignVertical="top"
              />

              {!isInsideSchool && locStatus !== 'checking' && (
                <View style={styles.lockNotice}>
                  <Ionicons name="lock-closed" size={18} color="#EF4444" />
                  <Text style={styles.lockNoticeTxt}>
                    {locStatus === 'denied'
                      ? 'يجب تفعيل الموقع الجغرافي لتسجيل الحضور'
                      : 'تسجيل الحضور متاح فقط داخل الروضة'}
                  </Text>
                </View>
              )}
              <Pressable
                style={[styles.saveBtn, !isInsideSchool && locStatus !== 'checking' && styles.saveBtnDisabled]}
                onPress={() => {
                  if (!isInsideSchool && locStatus !== 'checking') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert('مقيّد', 'تسجيل الحضور والغياب متاح فقط داخل الروضة');
                    return;
                  }
                  handleSave();
                }}
              >
                {!isInsideSchool && locStatus !== 'checking'
                  ? <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.6)" />
                  : null}
                <Text style={styles.saveBtnText}>
                  {isInsideSchool || locStatus === 'checking' ? 'حفظ المتابعة' : 'حفظ مقيّد'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: '#1A6B5C', paddingHorizontal: 20, paddingBottom: 20 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right' },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(110,231,183,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(110,231,183,0.3)' },
  certBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6EE7B7' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#FFFFFF' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, shadowColor: '#1A6B5C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderRightWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  avatarText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  studentInfo: { flex: 1, alignItems: 'flex-end' },
  studentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  studentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  attendanceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  attendanceText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  cardBadges: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  notesPreview: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '95%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8, marginTop: 12 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  option: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  optionText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  textInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#1A6B5C', borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20, flexDirection: 'row', gap: 8 },
  saveBtnDisabled: { backgroundColor: '#9CA3AF', opacity: 0.75 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  locBar: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  locBarTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  lockNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  lockNoticeTxt: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: '#EF4444', textAlign: 'right' },
});
