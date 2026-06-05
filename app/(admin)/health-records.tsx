import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, Platform, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, Student, HealthInfo, Vaccination } from '@/contexts/AppDataContext';

const ADMIN_COLOR = '#1a3c5e';

const DEFAULT_HEALTH: HealthInfo = {
  allergies: [],
  conditions: [],
  medications: [],
  doctorName: '',
  doctorPhone: '',
  healthNotes: '',
  vaccinations: [
    { name: 'الحصبة والنكاف والحصبة الألمانية (MMR)', date: '', done: false },
    { name: 'الكزاز والدفتيريا والسعال الديكي', date: '', done: false },
    { name: 'شلل الأطفال', date: '', done: false },
    { name: 'التهاب الكبد B', date: '', done: false },
    { name: 'جدري الماء', date: '', done: false },
  ],
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={tf.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput
          style={[tf.input, { flex: 1, marginBottom: 0 }]}
          value={input}
          onChangeText={setInput}
          placeholder="اكتب ثم اضغط إضافة"
          placeholderTextColor={Colors.textLight}
          textAlign="right"
        />
        <Pressable
          style={tf.addTagBtn}
          onPress={() => {
            if (!input.trim()) return;
            onChange([...tags, input.trim()]);
            setInput('');
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {tags.map((tag, i) => (
          <View key={i} style={tf.tag}>
            <Pressable onPress={() => onChange(tags.filter((_, idx) => idx !== i))}>
              <Ionicons name="close-circle" size={14} color={Colors.danger} />
            </Pressable>
            <Text style={tf.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HealthFormModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const { updateStudent } = useAppData();
  const insets = useSafeAreaInsets();
  const [health, setHealth] = useState<HealthInfo>(student.healthInfo ?? { ...DEFAULT_HEALTH, vaccinations: DEFAULT_HEALTH.vaccinations.map(v => ({ ...v })) });

  const setField = <K extends keyof HealthInfo>(key: K, val: HealthInfo[K]) =>
    setHealth(prev => ({ ...prev, [key]: val }));

  const toggleVaccination = (idx: number) => {
    const updated = health.vaccinations.map((v, i) => i === idx ? { ...v, done: !v.done } : v);
    setField('vaccinations', updated);
  };

  const setVacDate = (idx: number, date: string) => {
    const updated = health.vaccinations.map((v, i) => i === idx ? { ...v, date } : v);
    setField('vaccinations', updated);
  };

  const handleSave = () => {
    updateStudent(student.id, { healthInfo: health });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[tf.container, { paddingTop: insets.top + 16 }]}>
        <View style={tf.header}>
          <Pressable onPress={onClose} style={tf.closeBtn}>
            <Text style={tf.closeTxt}>إلغاء</Text>
          </Pressable>
          <Text style={tf.title}>السجل الصحي — {student.name}</Text>
          <Pressable onPress={handleSave} style={tf.saveBtn}>
            <Text style={tf.saveTxt}>حفظ</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16 }} keyboardShouldPersistTaps="handled">

          <TagInput label="الحساسية" tags={health.allergies} onChange={v => setField('allergies', v)} />
          <TagInput label="الحالات الطبية المزمنة" tags={health.conditions} onChange={v => setField('conditions', v)} />
          <TagInput label="الأدوية الدائمة" tags={health.medications} onChange={v => setField('medications', v)} />

          <Text style={tf.label}>اسم الطبيب</Text>
          <TextInput style={tf.input} value={health.doctorName} onChangeText={v => setField('doctorName', v)} placeholder="اسم الطبيب المعالج" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={tf.label}>هاتف الطبيب</Text>
          <TextInput style={tf.input} value={health.doctorPhone} onChangeText={v => setField('doctorPhone', v)} placeholder="+249..." placeholderTextColor={Colors.textLight} textAlign="right" keyboardType="phone-pad" />

          <Text style={tf.label}>ملاحظات صحية</Text>
          <TextInput style={[tf.input, { height: 80, textAlignVertical: 'top' }]} value={health.healthNotes} onChangeText={v => setField('healthNotes', v)} placeholder="أي ملاحظات صحية مهمة..." placeholderTextColor={Colors.textLight} textAlign="right" multiline />

          <Text style={[tf.label, { marginTop: 8 }]}>جدول التطعيمات</Text>
          {health.vaccinations.map((vac, i) => (
            <View key={i} style={tf.vacRow}>
              <TextInput
                style={tf.vacDate}
                value={vac.date}
                onChangeText={d => setVacDate(i, d)}
                placeholder="تاريخ"
                placeholderTextColor={Colors.textLight}
                textAlign="center"
              />
              <View style={{ flex: 1 }}>
                <Text style={tf.vacName}>{vac.name}</Text>
              </View>
              <Pressable onPress={() => toggleVaccination(i)} style={[tf.vacCheck, vac.done && tf.vacCheckDone]}>
                {vac.done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
            </View>
          ))}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function HealthSummaryCard({ student, onEdit }: { student: Student; onEdit: () => void }) {
  const h = student.healthInfo;
  const hasAlerts = (h?.allergies?.length ?? 0) > 0 || (h?.conditions?.length ?? 0) > 0;
  const vacsDone = h?.vaccinations?.filter(v => v.done).length ?? 0;
  const vacsTotal = h?.vaccinations?.length ?? 0;

  return (
    <Pressable style={[hs.card, hasAlerts && hs.cardAlert]} onPress={onEdit}>
      <View style={hs.top}>
        <View style={hs.actions}>
          <View style={[hs.badge, { backgroundColor: hasAlerts ? Colors.danger + '18' : Colors.success + '18' }]}>
            <MaterialCommunityIcons name={hasAlerts ? 'alert-circle' : 'check-circle'} size={14} color={hasAlerts ? Colors.danger : Colors.success} />
            <Text style={[hs.badgeText, { color: hasAlerts ? Colors.danger : Colors.success }]}>
              {hasAlerts ? 'يحتاج انتباه' : 'سليم'}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={hs.name}>{student.name}</Text>
          <Text style={hs.level}>{student.level}</Text>
        </View>
        <View style={[hs.avatar, { backgroundColor: hasAlerts ? Colors.danger + '20' : Colors.success + '20' }]}>
          <MaterialCommunityIcons name="medical-bag" size={20} color={hasAlerts ? Colors.danger : Colors.success} />
        </View>
      </View>

      {h ? (
        <View style={hs.details}>
          {h.allergies.length > 0 && (
            <View style={hs.detailRow}>
              <Text style={[hs.detailVal, { color: Colors.danger }]}>{h.allergies.join('، ')}</Text>
              <Text style={hs.detailKey}>حساسية:</Text>
            </View>
          )}
          {h.conditions.length > 0 && (
            <View style={hs.detailRow}>
              <Text style={[hs.detailVal, { color: Colors.warning }]}>{h.conditions.join('، ')}</Text>
              <Text style={hs.detailKey}>حالات:</Text>
            </View>
          )}
          {vacsTotal > 0 && (
            <View style={hs.detailRow}>
              <Text style={hs.detailVal}>{vacsDone}/{vacsTotal}</Text>
              <Text style={hs.detailKey}>تطعيمات:</Text>
            </View>
          )}
          {!h.allergies.length && !h.conditions.length && (
            <Text style={hs.noAlerts}>لا توجد تنبيهات صحية</Text>
          )}
        </View>
      ) : (
        <View style={hs.empty}>
          <Ionicons name="add-circle-outline" size={16} color={Colors.textLight} />
          <Text style={hs.emptyText}>اضغط لإضافة السجل الصحي</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HealthRecordsScreen() {
  const insets = useSafeAreaInsets();
  const { students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'alerts' | 'missing'>('all');
  const [editing, setEditing] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !search.trim() || s.name.includes(search.trim());
      if (filter === 'alerts') return matchSearch && ((s.healthInfo?.allergies?.length ?? 0) > 0 || (s.healthInfo?.conditions?.length ?? 0) > 0);
      if (filter === 'missing') return matchSearch && !s.healthInfo;
      return matchSearch;
    });
  }, [students, search, filter]);

  const alertCount = students.filter(s => (s.healthInfo?.allergies?.length ?? 0) > 0 || (s.healthInfo?.conditions?.length ?? 0) > 0).length;
  const missingCount = students.filter(s => !s.healthInfo).length;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0d1f3c', '#1a3c5e', '#1e5080']} style={[s.header, { paddingTop: topPadding + 10 }]}>
        <View style={s.headerTop}>
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{students.length}</Text>
              <Text style={s.statLbl}>إجمالي</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: Colors.danger }]}>{alertCount}</Text>
              <Text style={s.statLbl}>تنبيهات</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: Colors.warning }]}>{missingCount}</Text>
              <Text style={s.statLbl}>ناقصة</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.title}>السجلات الصحية</Text>
            <Text style={s.subtitle}>المعلومات الطبية للطلاب</Text>
          </View>
          <MaterialCommunityIcons name="medical-bag" size={28} color="rgba(255,255,255,0.7)" style={{ marginLeft: 12 }} />
        </View>

        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث عن طالب..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>

        <View style={s.filterRow}>
          {([
            { key: 'all', label: 'الكل' },
            { key: 'alerts', label: `تنبيهات (${alertCount})` },
            { key: 'missing', label: `ناقصة (${missingCount})` },
          ] as const).map(f => (
            <Pressable key={f.key} style={[s.filterTab, filter === f.key && s.filterTabActive]} onPress={() => { setFilter(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Text style={[s.filterTabText, filter === f.key && s.filterTabTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <HealthSummaryCard student={item} onEdit={() => setEditing(item)} />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="medical-bag" size={52} color={Colors.textLight} />
            <Text style={s.emptyText}>لا توجد نتائج</Text>
          </View>
        }
      />

      {editing && <HealthFormModal student={editing} onClose={() => setEditing(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8 },
  stat: { alignItems: 'center', paddingHorizontal: 10 },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  statLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  statDiv: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  subtitle: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#fff', padding: 0 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  filterTabTextActive: { color: ADMIN_COLOR, fontFamily: 'Inter_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
});

const hs = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardAlert: { borderColor: Colors.danger + '40', backgroundColor: '#FFF5F5' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  level: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  actions: { flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  details: { gap: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, alignItems: 'center' },
  detailKey: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  detailVal: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.text, flex: 1, textAlign: 'right' },
  noAlerts: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.success, textAlign: 'right' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },
});

const tf = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'center' },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.danger },
  saveBtn: { backgroundColor: ADMIN_COLOR, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  saveTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  addTagBtn: { backgroundColor: ADMIN_COLOR, width: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.text },
  vacRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  vacCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  vacCheckDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  vacName: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text, textAlign: 'right' },
  vacDate: { width: 80, backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 6, fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.border },
});
