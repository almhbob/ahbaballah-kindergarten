import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, SchoolEvent } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';

const EVENT_COLORS: Record<SchoolEvent['type'], string> = {
  exam:     '#EF4444',
  event:    '#F59E0B',
  activity: '#10B981',
  holiday:  '#6366F1',
};
const EVENT_LABELS: Record<SchoolEvent['type'], string> = {
  exam:     'اختبار',
  event:    'فعالية',
  activity: 'نشاط',
  holiday:  'عطلة',
};
const EVENT_ICONS: Record<SchoolEvent['type'], string> = {
  exam:     'pencil-outline',
  event:    'star-outline',
  activity: 'walk',
  holiday:  'umbrella-outline',
};

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAY_LABELS = ['ح','ن','ث','ر','خ','ج','س'];

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 6); }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface EventFormState {
  title: string;
  date: string;
  time: string;
  type: SchoolEvent['type'];
  description: string;
}

const EMPTY_FORM: EventFormState = { title: '', date: '', time: '', type: 'event', description: '' };

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { schoolEvents, addSchoolEvent, removeSchoolEvent } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;
  const isAdmin = user?.role === 'admin';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const eventsByDate = useMemo(() => {
    const map: Record<string, SchoolEvent[]> = {};
    schoolEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [schoolEvents]);

  function prevMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  function fmtDate(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  function handleAddEvent() {
    if (!form.title.trim() || !form.date.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال العنوان والتاريخ');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      Alert.alert('تنبيه', 'صيغة التاريخ يجب أن تكون YYYY-MM-DD');
      return;
    }
    addSchoolEvent({ id: genId(), title: form.title.trim(), date: form.date.trim(), type: form.type, description: form.description.trim() || undefined, time: form.time.trim() || undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSelectedDate(form.date.trim());
  }

  function handleDelete(id: string) {
    Alert.alert('حذف الفعالية', 'هل أنت متأكد من حذف هذه الفعالية؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removeSchoolEvent(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030612', '#080f2a', '#0d1a42']} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>التقويم المدرسي</Text>
            <Text style={s.headerSub}>{AR_MONTHS[month]} {year}</Text>
          </View>
          {isAdmin ? (
            <Pressable style={s.addBtn} onPress={() => { setForm({ ...EMPTY_FORM, date: selectedDate ?? fmtDate(year, month, today.getDate()) }); setShowForm(true); }}>
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          ) : <View style={s.addBtn} />}
        </View>

        <View style={s.monthNav}>
          <Pressable style={s.navBtn} onPress={nextMonth}><Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" /></Pressable>
          <Text style={s.monthTitle}>{AR_MONTHS[month]} {year}</Text>
          <Pressable style={s.navBtn} onPress={prevMonth}><Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" /></Pressable>
        </View>

        <View style={s.dayLabels}>
          {DAY_LABELS.map(d => <Text key={d} style={s.dayLbl}>{d}</Text>)}
        </View>

        <View style={s.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={`e${i}`} style={s.cell} />;
            const dateStr = fmtDate(year, month, day);
            const events = eventsByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <Pressable key={i} style={[s.cell, isSelected && s.cellSelected, isToday && !isSelected && s.cellToday]}
                onPress={() => { setSelectedDate(dateStr === selectedDate ? null : dateStr); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Text style={[s.cellText, isSelected && s.cellTextSelected, isToday && !isSelected && s.cellTextToday]}>{day}</Text>
                {events.length > 0 && (
                  <View style={s.dotRow}>
                    {events.slice(0, 3).map((ev, di) => (
                      <View key={di} style={[s.dot, { backgroundColor: EVENT_COLORS[ev.type] }]} />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.body, { paddingBottom: bottomPadding }]}>
        {selectedDate ? (
          <>
            <Text style={s.sectionTitle}>
              {selectedEvents.length === 0 ? 'لا توجد فعاليات لهذا اليوم' : `فعاليات ${selectedDate}`}
            </Text>
            {selectedEvents.map(ev => (
              <View key={ev.id} style={s.eventCard}>
                <View style={[s.eventStripe, { backgroundColor: EVENT_COLORS[ev.type] }]} />
                <View style={[s.eventIcon, { backgroundColor: EVENT_COLORS[ev.type] + '20' }]}>
                  <MaterialCommunityIcons name={EVENT_ICONS[ev.type] as any} size={22} color={EVENT_COLORS[ev.type]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.eventTopRow}>
                    <View style={[s.typePill, { backgroundColor: EVENT_COLORS[ev.type] + '20' }]}>
                      <Text style={[s.typeText, { color: EVENT_COLORS[ev.type] }]}>{EVENT_LABELS[ev.type]}</Text>
                    </View>
                    {ev.time && <Text style={s.timeText}>🕘 {ev.time}</Text>}
                  </View>
                  <Text style={s.eventTitle}>{ev.title}</Text>
                  {ev.description ? <Text style={s.eventDesc}>{ev.description}</Text> : null}
                </View>
                {isAdmin && (
                  <Pressable style={s.deleteBtn} onPress={() => handleDelete(ev.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            ))}
            {isAdmin && selectedEvents.length === 0 && (
              <Pressable style={s.addEventBtn} onPress={() => { setForm({ ...EMPTY_FORM, date: selectedDate }); setShowForm(true); }}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
                <Text style={s.addEventBtnText}>إضافة فعالية لهذا اليوم</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={s.sectionTitle}>الفعاليات القادمة</Text>
            {schoolEvents.filter(e => e.date >= todayStr).slice(0, 10).map(ev => (
              <Pressable key={ev.id} style={s.eventCard} onPress={() => setSelectedDate(ev.date)}>
                <View style={[s.eventStripe, { backgroundColor: EVENT_COLORS[ev.type] }]} />
                <View style={[s.eventIcon, { backgroundColor: EVENT_COLORS[ev.type] + '20' }]}>
                  <MaterialCommunityIcons name={EVENT_ICONS[ev.type] as any} size={22} color={EVENT_COLORS[ev.type]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.eventTopRow}>
                    <View style={[s.typePill, { backgroundColor: EVENT_COLORS[ev.type] + '20' }]}>
                      <Text style={[s.typeText, { color: EVENT_COLORS[ev.type] }]}>{EVENT_LABELS[ev.type]}</Text>
                    </View>
                    <Text style={s.dateChip}>{ev.date.slice(5)}</Text>
                  </View>
                  <Text style={s.eventTitle}>{ev.title}</Text>
                  {ev.description ? <Text style={s.eventDesc} numberOfLines={1}>{ev.description}</Text> : null}
                </View>
                {isAdmin && (
                  <Pressable style={s.deleteBtn} onPress={() => handleDelete(ev.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                )}
              </Pressable>
            ))}
            {schoolEvents.filter(e => e.date >= todayStr).length === 0 && (
              <View style={s.empty}>
                <Ionicons name="calendar-outline" size={48} color={Colors.textLight} />
                <Text style={s.emptyText}>لا توجد فعاليات قادمة</Text>
              </View>
            )}
          </>
        )}

        <View style={s.legendRow}>
          {(Object.keys(EVENT_LABELS) as SchoolEvent['type'][]).map(t => (
            <View key={t} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: EVENT_COLORS[t] }]} />
              <Text style={s.legendText}>{EVENT_LABELS[t]}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>إضافة فعالية جديدة</Text>

            <Text style={s.label}>العنوان *</Text>
            <TextInput style={s.input} placeholder="مثال: اختبار الرياضيات" placeholderTextColor="#666" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} textAlign="right" />

            <Text style={s.label}>التاريخ * (YYYY-MM-DD)</Text>
            <TextInput style={s.input} placeholder="2026-04-20" placeholderTextColor="#666" value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} keyboardType="numeric" textAlign="right" />

            <Text style={s.label}>الوقت (اختياري)</Text>
            <TextInput style={s.input} placeholder="09:00" placeholderTextColor="#666" value={form.time} onChangeText={v => setForm(f => ({ ...f, time: v }))} textAlign="right" />

            <Text style={s.label}>النوع</Text>
            <View style={s.typeRow}>
              {(Object.keys(EVENT_LABELS) as SchoolEvent['type'][]).map(t => (
                <Pressable key={t} style={[s.typePillBtn, form.type === t && { backgroundColor: EVENT_COLORS[t] }]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}>
                  <Text style={[s.typePillBtnText, form.type === t && { color: '#fff' }]}>{EVENT_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>الوصف (اختياري)</Text>
            <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} placeholder="تفاصيل إضافية..." placeholderTextColor="#666" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline textAlign="right" />

            <View style={s.modalBtns}>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={handleAddEvent}>
                <LinearGradient colors={['#ca9928','#b8841c']} style={s.saveBtnGrad}>
                  <Text style={s.saveBtnText}>حفظ</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 },
  monthTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  dayLabels: { flexDirection: 'row', marginBottom: 6 },
  dayLbl: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.45)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  cellSelected: { backgroundColor: Colors.accent, borderRadius: 8 },
  cellToday: { borderWidth: 1.5, borderColor: Colors.accent, borderRadius: 8 },
  cellText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)' },
  cellTextSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
  cellTextToday: { color: Colors.accent },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  body: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.textLight, textAlign: 'right', marginBottom: 4 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: Colors.border },
  eventStripe: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0, top: 0, bottom: 0 },
  eventIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  timeText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  dateChip: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  eventTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  eventDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 2 },
  deleteBtn: { padding: 6 },
  addEventBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1.5, borderColor: Colors.accent + '50', borderRadius: 12, borderStyle: 'dashed' },
  addEventBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.accent },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 8 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'center', marginBottom: 4 },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight, textAlign: 'right' },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typePillBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  typePillBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: Colors.background, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  saveBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { padding: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
