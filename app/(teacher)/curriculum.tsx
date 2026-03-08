import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, ScheduleDay, ScheduleLevel, SchedulePeriod } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

const DAYS: ScheduleDay[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const LEVELS: ScheduleLevel[] = ['براعم', 'مستوى أول', 'مستوى ثاني'];

const LEVEL_COLORS: Record<ScheduleLevel, string> = {
  'براعم':       '#F59E0B',
  'مستوى أول':  '#10B981',
  'مستوى ثاني': '#3B82F6',
};

const TYPE_META: Record<SchedulePeriod['type'], { icon: string; color: string; bg: string }> = {
  lesson:   { icon: 'book-open-variant', color: Colors.primary,  bg: '#EFF6FF' },
  break:    { icon: 'coffee-outline',    color: '#F59E0B',        bg: '#FFFBEB' },
  activity: { icon: 'palette-outline',   color: '#8B5CF6',        bg: '#F5F3FF' },
};

const NOW_HOUR = new Date().getHours();
const NOW_MIN  = new Date().getMinutes();
const NOW_STR  = `${String(NOW_HOUR).padStart(2,'0')}:${String(NOW_MIN).padStart(2,'0')}`;

function isCurrent(start: string, end: string) {
  return NOW_STR >= start && NOW_STR < end;
}

export default function CurriculumScreen() {
  const insets = useSafeAreaInsets();
  const { schedule, addPeriod, updatePeriod, removePeriod } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [day, setDay] = useState<ScheduleDay>('الأحد');
  const [level, setLevel] = useState<ScheduleLevel>('مستوى أول');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SchedulePeriod | null>(null);

  const dayPeriods = useMemo(() =>
    [...schedule]
      .filter(p => p.day === day && p.level === level)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedule, day, level]
  );

  const totalLessons = dayPeriods.filter(p => p.type === 'lesson').length;
  const hasCurrentPeriod = dayPeriods.some(p => isCurrent(p.startTime, p.endTime));

  const handleDelete = (p: SchedulePeriod) => {
    Alert.alert('حذف الحصة', `هل تريد حذف حصة "${p.subject}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removePeriod(p.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#061e1a', '#0a2e28', '#0f3d35']} style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerStats}>
            <View style={styles.hStat}>
              <Text style={styles.hStatVal}>{totalLessons}</Text>
              <Text style={styles.hStatLbl}>حصص</Text>
            </View>
            <View style={styles.hDivider} />
            <View style={styles.hStat}>
              <Text style={styles.hStatVal}>{dayPeriods.length}</Text>
              <Text style={styles.hStatLbl}>إجمالي</Text>
            </View>
            {hasCurrentPeriod && (
              <>
                <View style={styles.hDivider} />
                <View style={styles.hStat}>
                  <MaterialCommunityIcons name="play-circle" size={16} color="#10B981" />
                  <Text style={[styles.hStatLbl, { color: '#10B981' }]}>جارية</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.titleText}>جدول الحصص</Text>
            <Text style={styles.titleSub}>إعدادات وتنسيق</Text>
          </View>
        </View>

        <View style={styles.levelRow}>
          {LEVELS.map(l => (
            <Pressable
              key={l}
              style={[styles.levelTab, level === l && { backgroundColor: LEVEL_COLORS[l] }]}
              onPress={() => { setLevel(l); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.levelTabText, level === l && { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
          {DAYS.map(d => (
            <Pressable
              key={d}
              style={[styles.dayTab, day === d && styles.dayTabActive]}
              onPress={() => { setDay(d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.dayTabText, day === d && styles.dayTabTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.addBtn} onPress={() => { setEditing(null); setShowForm(true); }}>
          <LinearGradient colors={['#ca9928', '#b8841c']} style={styles.addBtnGrad}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>إضافة حصة ليوم {day} — {level}</Text>
          </LinearGradient>
        </Pressable>

        {dayPeriods.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد حصص لهذا اليوم</Text>
            <Text style={styles.emptyHint}>اضغط على الزر أعلاه لإضافة حصة</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {dayPeriods.map((period, idx) => {
              const meta = TYPE_META[period.type];
              const current = isCurrent(period.startTime, period.endTime);
              return (
                <View key={period.id} style={styles.timelineRow}>
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeStart, current && { color: '#10B981', fontFamily: 'Inter_700Bold' }]}>{period.startTime}</Text>
                    {idx < dayPeriods.length - 1 && <View style={[styles.timeLine, current && { backgroundColor: '#10B981' }]} />}
                    <Text style={styles.timeEnd}>{period.endTime}</Text>
                  </View>
                  <View style={[styles.periodCard, current && styles.periodCardCurrent, { borderLeftColor: meta.color, borderLeftWidth: 3 }]}>
                    {current && (
                      <View style={styles.currentBadge}>
                        <MaterialCommunityIcons name="play-circle" size={11} color="#10B981" />
                        <Text style={styles.currentBadgeText}>الآن</Text>
                      </View>
                    )}
                    <View style={styles.periodTop}>
                      <View style={styles.periodActions}>
                        <Pressable onPress={() => handleDelete(period)} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={13} color={Colors.danger} />
                        </Pressable>
                        <Pressable onPress={() => { setEditing(period); setShowForm(true); }} style={styles.iconBtn}>
                          <Ionicons name="create-outline" size={13} color={Colors.primary} />
                        </Pressable>
                      </View>
                      <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
                        <MaterialCommunityIcons name={meta.icon as any} size={16} color={meta.color} />
                      </View>
                    </View>
                    <Text style={[styles.periodSubject, current && { color: '#10B981' }]}>{period.subject}</Text>
                    <View style={styles.periodMeta}>
                      <Text style={styles.periodTime}>{period.startTime} – {period.endTime}</Text>
                      <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.typePillText, { color: meta.color }]}>
                          {period.type === 'lesson' ? 'حصة' : period.type === 'break' ? 'استراحة' : 'نشاط'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <PeriodFormModal
        visible={showForm}
        editing={editing}
        defaultDay={day}
        defaultLevel={level}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={data => {
          if (editing) {
            updatePeriod(editing.id, data);
          } else {
            addPeriod({ id: genId(), ...data } as SchedulePeriod);
          }
          setShowForm(false);
          setEditing(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

function PeriodFormModal({ visible, editing, defaultDay, defaultLevel, onClose, onSave }: {
  visible: boolean;
  editing: SchedulePeriod | null;
  defaultDay: ScheduleDay;
  defaultLevel: ScheduleLevel;
  onClose: () => void;
  onSave: (data: Partial<SchedulePeriod>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [day, setDay] = useState<ScheduleDay>(defaultDay);
  const [level, setLevel] = useState<ScheduleLevel>(defaultLevel);
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('08:15');
  const [type, setType] = useState<SchedulePeriod['type']>('lesson');

  React.useEffect(() => {
    if (editing) {
      setSubject(editing.subject); setDay(editing.day); setLevel(editing.level);
      setStartTime(editing.startTime); setEndTime(editing.endTime); setType(editing.type);
    } else {
      setSubject(''); setDay(defaultDay); setLevel(defaultLevel);
      setStartTime('07:30'); setEndTime('08:15'); setType('lesson');
    }
  }, [editing, visible, defaultDay, defaultLevel]);

  const handleSave = () => {
    if (!subject.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال اسم المادة'); return; }
    onSave({ subject: subject.trim(), day, level, startTime, endTime, type });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[fStyles.container, { paddingTop: insets.top + 16 }]}>
        <View style={fStyles.header}>
          <Pressable onPress={onClose} style={fStyles.closeBtn}>
            <Text style={fStyles.closeTxt}>إلغاء</Text>
          </Pressable>
          <Text style={fStyles.title}>{editing ? 'تعديل الحصة' : 'حصة جديدة'}</Text>
          <Pressable onPress={handleSave} style={fStyles.saveBtn}>
            <Text style={fStyles.saveTxt}>حفظ</Text>
          </Pressable>
        </View>

        <ScrollView style={fStyles.body} keyboardShouldPersistTaps="handled">
          <Text style={fStyles.label}>المادة / النشاط *</Text>
          <TextInput style={fStyles.input} value={subject} onChangeText={setSubject} placeholder="مثال: لغة عربية" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fStyles.label}>نوع الحصة</Text>
          <View style={fStyles.pillRow}>
            {(['lesson', 'break', 'activity'] as SchedulePeriod['type'][]).map(t => {
              const m = TYPE_META[t];
              const labels = { lesson: 'حصة دراسية', break: 'استراحة', activity: 'نشاط' };
              return (
                <Pressable key={t} style={[fStyles.pill, type === t && { backgroundColor: m.color, borderColor: m.color }]} onPress={() => setType(t)}>
                  <Text style={[fStyles.pillText, type === t && { color: '#fff' }]}>{labels[t]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={fStyles.label}>اليوم</Text>
          <View style={fStyles.pillRow}>
            {DAYS.map(d => (
              <Pressable key={d} style={[fStyles.pill, day === d && fStyles.pillActive]} onPress={() => setDay(d)}>
                <Text style={[fStyles.pillText, day === d && fStyles.pillTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={fStyles.label}>المستوى</Text>
          <View style={fStyles.pillRow}>
            {LEVELS.map(l => (
              <Pressable key={l} style={[fStyles.pill, level === l && { backgroundColor: LEVEL_COLORS[l], borderColor: LEVEL_COLORS[l] }]} onPress={() => setLevel(l)}>
                <Text style={[fStyles.pillText, level === l && { color: '#fff' }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fStyles.label}>وقت البداية</Text>
              <TextInput style={fStyles.input} value={startTime} onChangeText={setStartTime} placeholder="07:30" placeholderTextColor={Colors.textLight} textAlign="center" keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fStyles.label}>وقت الانتهاء</Text>
              <TextInput style={fStyles.input} value={endTime} onChangeText={setEndTime} placeholder="08:15" placeholderTextColor={Colors.textLight} textAlign="center" keyboardType="numbers-and-punctuation" />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  titleBlock: { flex: 1, alignItems: 'flex-end' },
  titleText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  titleSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  headerStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8, gap: 0 },
  hStat: { alignItems: 'center', paddingHorizontal: 8 },
  hStatVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#10B981' },
  hStatLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  hDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  levelTab: { flex: 1, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  levelTabText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  dayScroll: { gap: 8, paddingRight: 4 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  dayTabActive: { backgroundColor: '#ca9928' },
  dayTabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  dayTabTextActive: { color: '#111', fontFamily: 'Inter_700Bold' },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  timeCol: { width: 44, alignItems: 'center', paddingTop: 4 },
  timeStart: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'center' },
  timeLine: { flex: 1, width: 2, backgroundColor: Colors.borderLight, marginVertical: 2, minHeight: 16 },
  timeEnd: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  periodCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  periodCardCurrent: { backgroundColor: '#F0FFF8', borderColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end', marginBottom: 6 },
  currentBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#10B981' },
  periodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  periodActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  typeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  periodSubject: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  periodMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typePillText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});

const fStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.danger },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 18, borderWidth: 1, borderColor: Colors.border },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 18 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },
});
