import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, ScrollView, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Meeting } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

const TODAY = new Date().toISOString().split('T')[0];

const TYPE_META: Record<Meeting['type'], { label: string; color: string; icon: string }> = {
  parent:  { label: 'أولياء الأمور', color: '#3B82F6', icon: 'account-child'     },
  staff:   { label: 'الكادر التعليمي', color: '#10B981', icon: 'account-group'   },
  admin:   { label: 'إداري',           color: '#8B5CF6', icon: 'briefcase'        },
  other:   { label: 'أخرى',            color: '#F59E0B', icon: 'calendar-star'   },
};

const STATUS_META: Record<Meeting['status'], { label: string; color: string }> = {
  upcoming:  { label: 'قادم',   color: '#3B82F6' },
  done:      { label: 'منتهي', color: '#10B981' },
  cancelled: { label: 'ملغي',  color: Colors.danger },
};

type TabKey = 'upcoming' | 'done' | 'all';

export default function MeetingsScreen() {
  const insets = useSafeAreaInsets();
  const { meetings, addMeeting, updateMeeting, removeMeeting } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [tab, setTab] = useState<TabKey>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...meetings].sort((a, b) => a.date.localeCompare(b.date));
    if (tab === 'upcoming') return sorted.filter(m => m.status === 'upcoming');
    if (tab === 'done')     return sorted.filter(m => m.status !== 'upcoming');
    return sorted;
  }, [meetings, tab]);

  const todayMeetings = meetings.filter(m => m.date === TODAY && m.status === 'upcoming');
  const upcoming = meetings.filter(m => m.status === 'upcoming').length;

  const handleDelete = (m: Meeting) => {
    Alert.alert('حذف الاجتماع', `هل تريد حذف "${m.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removeMeeting(m.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  const handleStatusToggle = (m: Meeting) => {
    const next = m.status === 'upcoming' ? 'done' : m.status === 'done' ? 'cancelled' : 'upcoming';
    updateMeeting(m.id, { status: next });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#1a0a3c', '#2d1060', '#3d1a6e']} style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerStats}>
            <View style={styles.hStat}>
              <Text style={styles.hStatVal}>{upcoming}</Text>
              <Text style={styles.hStatLbl}>قادم</Text>
            </View>
            <View style={styles.hDivider} />
            <View style={styles.hStat}>
              <Text style={styles.hStatVal}>{todayMeetings.length}</Text>
              <Text style={styles.hStatLbl}>اليوم</Text>
            </View>
            <View style={styles.hDivider} />
            <View style={styles.hStat}>
              <Text style={styles.hStatVal}>{meetings.length}</Text>
              <Text style={styles.hStatLbl}>الإجمالي</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.titleText}>الاجتماعات</Text>
            <Text style={styles.titleSub}>وإدارة الأجندة</Text>
          </View>
        </View>

        {todayMeetings.length > 0 && (
          <View style={styles.todayBanner}>
            <MaterialCommunityIcons name="bell-ring" size={15} color="#FFD700" />
            <Text style={styles.todayText}>
              {todayMeetings.length === 1
                ? `اليوم: ${todayMeetings[0].title} — ${todayMeetings[0].time}`
                : `لديك ${todayMeetings.length} اجتماعات اليوم`}
            </Text>
          </View>
        )}

        <View style={styles.tabRow}>
          {([['upcoming', 'القادمة'], ['done', 'المنتهية'], ['all', 'الكل']] as [TabKey, string][]).map(([key, label]) => (
            <Pressable key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        ListHeaderComponent={
          <Pressable style={styles.addBtn} onPress={() => { setEditing(null); setShowForm(true); }}>
            <LinearGradient colors={['#ca9928', '#b8841c']} style={styles.addBtnGrad}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>إضافة اجتماع جديد</Text>
            </LinearGradient>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد اجتماعات</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type];
          const statusMeta = STATUS_META[item.status];
          const isToday = item.date === TODAY;
          return (
            <View style={[styles.card, isToday && item.status === 'upcoming' && styles.cardToday, { borderRightColor: meta.color }]}>
              <View style={styles.cardLeft}>
                <Pressable onPress={() => handleDelete(item)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                </Pressable>
                <Pressable onPress={() => { setEditing(item); setShowForm(true); }} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={15} color={Colors.primary} />
                </Pressable>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Pressable onPress={() => handleStatusToggle(item)} style={[styles.statusBadge, { backgroundColor: statusMeta.color + '22', borderColor: statusMeta.color }]}>
                    <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </Pressable>
                  <View style={[styles.typeBadge, { backgroundColor: meta.color + '18' }]}>
                    <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
                    <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{item.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={isToday ? '#FFD700' : Colors.textSecondary} />
                    <Text style={[styles.metaText, isToday && { color: '#FFD700', fontFamily: 'Inter_600SemiBold' }]}>
                      {isToday ? 'اليوم' : item.date}
                    </Text>
                  </View>
                  {item.location ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{item.location}</Text>
                    </View>
                  ) : null}
                </View>
                {item.notes ? (
                  <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
                ) : null}
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <MeetingFormModal
        visible={showForm}
        editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={data => {
          if (editing) {
            updateMeeting(editing.id, data);
          } else {
            addMeeting({ id: genId(), status: 'upcoming', ...data } as Meeting);
          }
          setShowForm(false);
          setEditing(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

function MeetingFormModal({ visible, editing, onClose, onSave }: {
  visible: boolean;
  editing: Meeting | null;
  onClose: () => void;
  onSave: (data: Partial<Meeting>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<Meeting['type']>('staff');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Meeting['status']>('upcoming');

  React.useEffect(() => {
    if (editing) {
      setTitle(editing.title); setDate(editing.date); setTime(editing.time);
      setLocation(editing.location); setType(editing.type);
      setNotes(editing.notes); setStatus(editing.status);
    } else {
      setTitle(''); setDate(TODAY); setTime('09:00');
      setLocation(''); setType('staff'); setNotes(''); setStatus('upcoming');
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال عنوان الاجتماع'); return; }
    if (!date.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال تاريخ الاجتماع'); return; }
    onSave({ title: title.trim(), date: date.trim(), time: time.trim(), location: location.trim(), type, notes: notes.trim(), status });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[fStyles.container, { paddingTop: insets.top + 16 }]}>
        <View style={fStyles.header}>
          <Pressable onPress={onClose} style={fStyles.closeBtn}>
            <Text style={fStyles.closeTxt}>إلغاء</Text>
          </Pressable>
          <Text style={fStyles.title}>{editing ? 'تعديل الاجتماع' : 'اجتماع جديد'}</Text>
          <Pressable onPress={handleSave} style={fStyles.saveBtn}>
            <Text style={fStyles.saveTxt}>حفظ</Text>
          </Pressable>
        </View>

        <ScrollView style={fStyles.body} keyboardShouldPersistTaps="handled">
          <Text style={fStyles.label}>عنوان الاجتماع *</Text>
          <TextInput style={fStyles.input} value={title} onChangeText={setTitle} placeholder="مثال: اجتماع أولياء الأمور" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fStyles.label}>نوع الاجتماع</Text>
          <View style={fStyles.pillRow}>
            {(Object.entries(TYPE_META) as [Meeting['type'], typeof TYPE_META[Meeting['type']]][]).map(([key, meta]) => (
              <Pressable
                key={key}
                style={[fStyles.pill, type === key && { backgroundColor: meta.color, borderColor: meta.color }]}
                onPress={() => setType(key)}
              >
                <Text style={[fStyles.pillText, type === key && { color: '#fff' }]}>{meta.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fStyles.label}>التاريخ</Text>
              <TextInput style={fStyles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textLight} textAlign="right" keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fStyles.label}>الوقت</Text>
              <TextInput style={fStyles.input} value={time} onChangeText={setTime} placeholder="09:00" placeholderTextColor={Colors.textLight} textAlign="right" keyboardType="numbers-and-punctuation" />
            </View>
          </View>

          <Text style={fStyles.label}>المكان</Text>
          <TextInput style={fStyles.input} value={location} onChangeText={setLocation} placeholder="مثال: قاعة الاجتماعات" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fStyles.label}>الحالة</Text>
          <View style={fStyles.pillRow}>
            {(Object.entries(STATUS_META) as [Meeting['status'], typeof STATUS_META[Meeting['status']]][]).map(([key, meta]) => (
              <Pressable
                key={key}
                style={[fStyles.pill, status === key && { backgroundColor: meta.color, borderColor: meta.color }]}
                onPress={() => setStatus(key)}
              >
                <Text style={[fStyles.pillText, status === key && { color: '#fff' }]}>{meta.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={fStyles.label}>ملاحظات / أجندة</Text>
          <TextInput
            style={[fStyles.input, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]}
            value={notes} onChangeText={setNotes}
            placeholder="بنود الأجندة والملاحظات..."
            placeholderTextColor={Colors.textLight}
            textAlign="right" multiline
          />
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
  headerStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 0 },
  hStat: { alignItems: 'center', paddingHorizontal: 10 },
  hStatVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#ca9928' },
  hStatLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  hDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  todayBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  todayText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#FFD700', textAlign: 'right' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  tabActive: { backgroundColor: '#ca9928' },
  tabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.75)' },
  tabTextActive: { color: '#111444', fontFamily: 'Inter_600SemiBold' },
  list: { padding: 16 },
  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, borderRightWidth: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardToday: { backgroundColor: '#fffef5' },
  cardLeft: { flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, alignItems: 'flex-end' },
  cardTop: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 8, textAlign: 'right' },
  cardMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  cardNotes: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginTop: 4, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight },
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
  pillText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
});
