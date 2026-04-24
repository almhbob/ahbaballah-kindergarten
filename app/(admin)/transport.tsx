import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  Alert, Modal, ScrollView, TextInput, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, TransportRoute } from '@/contexts/AppDataContext';

const TRANSPORT_COLOR = '#0D7C4A';
const TRANSPORT_LIGHT = '#E8F8F0';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

type Tab = 'routes' | 'subscribers';

const EMPTY_ROUTE: Omit<TransportRoute, 'id'> = {
  name: '',
  areas: [],
  driverName: '',
  driverPhone: '',
  morningTime: '07:00',
  afternoonTime: '13:30',
  monthlyFee: 2000,
  capacity: 15,
  notes: '',
  active: true,
};

export default function TransportScreen() {
  const insets = useSafeAreaInsets();
  const {
    transportRoutes, transportSubscriptions, students,
    addTransportRoute, updateTransportRoute, removeTransportRoute,
  } = useAppData();

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [tab, setTab] = useState<Tab>('routes');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TransportRoute | null>(null);

  const [form, setForm] = useState<Omit<TransportRoute, 'id'>>(EMPTY_ROUTE);
  const [areasText, setAreasText] = useState('');

  const totalSubscribers = transportSubscriptions.length;
  const activeRoutes = transportRoutes.filter(r => r.active).length;

  const subscribersByRoute = useMemo(() => {
    const map: Record<string, typeof students> = {};
    transportRoutes.forEach(r => { map[r.id] = []; });
    transportSubscriptions.forEach(sub => {
      const student = students.find(s => s.id === sub.studentId);
      if (student && map[sub.routeId]) map[sub.routeId].push(student);
    });
    return map;
  }, [transportRoutes, transportSubscriptions, students]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_ROUTE);
    setAreasText('');
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openEdit(route: TransportRoute) {
    setEditing(route);
    setForm({ ...route });
    setAreasText(route.areas.join('، '));
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSave() {
    if (!form.name.trim()) { Alert.alert('تنبيه', 'أدخل اسم الخط'); return; }
    if (!form.driverName.trim()) { Alert.alert('تنبيه', 'أدخل اسم السائق'); return; }
    if (!form.driverPhone.trim()) { Alert.alert('تنبيه', 'أدخل رقم هاتف السائق'); return; }

    const areas = areasText.split(/[،,]/).map(a => a.trim()).filter(Boolean);
    const finalForm = { ...form, areas };

    if (editing) {
      updateTransportRoute(editing.id, finalForm);
    } else {
      addTransportRoute({ id: genId(), ...finalForm });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  }

  function handleDelete(route: TransportRoute) {
    Alert.alert('حذف الخط', `هل أنت متأكد من حذف "${route.name}"؟ سيُلغى اشتراك جميع الطلاب فيه.`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: () => {
          removeTransportRoute(route.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        },
      },
    ]);
  }

  async function callDriver(phone: string) {
    try {
      const url = `tel:${phone}`;
      const can = await Linking.canOpenURL(url);
      if (can) { await Linking.openURL(url); }
      else { Alert.alert('اتصال', `رقم السائق: ${phone}`); }
    } catch {
      Alert.alert('اتصال', `رقم السائق: ${phone}`);
    }
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={['#07311E', '#0D4D2C', '#116638']}
        style={[s.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.75)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>برنامج الترحيل</Text>
            <Text style={s.headerSub}>نظم إدارة رياض الأطفال — الخاصة</Text>
          </View>
          <Pressable onPress={openAdd} style={s.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <MaterialCommunityIcons name="bus-school" size={22} color="#68D89A" />
            <Text style={s.statVal}>{transportRoutes.length}</Text>
            <Text style={s.statLbl}>خط</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <MaterialCommunityIcons name="bus-clock" size={22} color="#68D89A" />
            <Text style={s.statVal}>{activeRoutes}</Text>
            <Text style={s.statLbl}>نشط</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Ionicons name="people" size={22} color="#68D89A" />
            <Text style={s.statVal}>{totalSubscribers}</Text>
            <Text style={s.statLbl}>مشترك</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {([
            { key: 'routes' as Tab, label: 'الخطوط', icon: 'bus' },
            { key: 'subscribers' as Tab, label: 'المشتركون', icon: 'people' },
          ]).map(t => (
            <Pressable
              key={t.key}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
              onPress={() => { setTab(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name={t.icon as any} size={15} color={tab === t.key ? '#68D89A' : 'rgba(255,255,255,0.4)'} />
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Routes tab */}
      {tab === 'routes' && (
        <FlatList
          data={transportRoutes}
          keyExtractor={r => r.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <MaterialCommunityIcons name="bus-school" size={48} color={Colors.textLight} />
              <Text style={s.emptyTxt}>لا توجد خطوط بعد</Text>
              <Text style={s.emptyHint}>اضغط + لإضافة خط ترحيل جديد</Text>
            </View>
          }
          renderItem={({ item: route }) => {
            const subs = subscribersByRoute[route.id] ?? [];
            const fill = Math.round((subs.length / route.capacity) * 100);
            return (
              <View style={[s.routeCard, !route.active && s.routeCardInactive]}>
                {/* Route header */}
                <View style={s.routeCardHeader}>
                  <View style={[s.routeIconWrap, { backgroundColor: route.active ? TRANSPORT_COLOR + '18' : Colors.border }]}>
                    <MaterialCommunityIcons name="bus-school" size={24} color={route.active ? TRANSPORT_COLOR : Colors.textLight} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.routeName}>{route.name}</Text>
                      {!route.active && (
                        <View style={s.inactiveBadge}>
                          <Text style={s.inactiveBadgeTxt}>متوقف</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.routeAreas} numberOfLines={1}>{route.areas.join(' · ')}</Text>
                  </View>
                  <Pressable
                    style={[s.toggleActive, { backgroundColor: route.active ? '#E8F8F0' : '#FEF2F2' }]}
                    onPress={() => updateTransportRoute(route.id, { active: !route.active })}
                  >
                    <Ionicons
                      name={route.active ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={route.active ? TRANSPORT_COLOR : Colors.danger}
                    />
                  </Pressable>
                </View>

                {/* Times & fee */}
                <View style={s.routeInfo}>
                  <View style={s.infoChip}>
                    <Ionicons name="sunny" size={13} color="#F59E0B" />
                    <Text style={s.infoChipTxt}>ذهاب {route.morningTime}</Text>
                  </View>
                  <View style={s.infoChip}>
                    <Ionicons name="moon" size={13} color="#6366F1" />
                    <Text style={s.infoChipTxt}>عودة {route.afternoonTime}</Text>
                  </View>
                  <View style={[s.infoChip, { backgroundColor: TRANSPORT_LIGHT }]}>
                    <MaterialCommunityIcons name="cash" size={13} color={TRANSPORT_COLOR} />
                    <Text style={[s.infoChipTxt, { color: TRANSPORT_COLOR }]}>{route.monthlyFee.toLocaleString()} ج.س/شهر</Text>
                  </View>
                </View>

                {/* Driver row */}
                <View style={s.driverRow}>
                  <View style={s.driverInfo}>
                    <Ionicons name="person-circle" size={16} color={Colors.textSecondary} />
                    <Text style={s.driverName}>{route.driverName}</Text>
                  </View>
                  <Pressable style={s.callBtn} onPress={() => callDriver(route.driverPhone)}>
                    <Ionicons name="call" size={14} color={TRANSPORT_COLOR} />
                    <Text style={s.callBtnTxt}>{route.driverPhone}</Text>
                  </Pressable>
                </View>

                {/* Capacity bar */}
                <View style={s.capacityRow}>
                  <Text style={s.capacityTxt}>{subs.length} / {route.capacity} مقعد</Text>
                  <Text style={s.capacityPct}>{fill}%</Text>
                </View>
                <View style={s.capacityTrack}>
                  <View style={[s.capacityFill, { width: `${Math.min(fill, 100)}%` as any, backgroundColor: fill >= 100 ? Colors.danger : fill >= 70 ? Colors.warning : TRANSPORT_COLOR }]} />
                </View>

                {route.notes ? (
                  <Text style={s.routeNotes} numberOfLines={1}>📋 {route.notes}</Text>
                ) : null}

                {/* Actions */}
                <View style={s.routeActions}>
                  <Pressable style={s.actionBtn} onPress={() => openEdit(route)}>
                    <Ionicons name="create-outline" size={15} color={Colors.primary} />
                    <Text style={[s.actionTxt, { color: Colors.primary }]}>تعديل</Text>
                  </Pressable>
                  <View style={s.actionDivider} />
                  <Pressable style={s.actionBtn} onPress={() => handleDelete(route)}>
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                    <Text style={[s.actionTxt, { color: Colors.danger }]}>حذف</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Subscribers tab */}
      {tab === 'subscribers' && (
        <FlatList
          data={transportRoutes}
          keyExtractor={r => r.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textLight} />
              <Text style={s.emptyTxt}>لا توجد خطوط</Text>
            </View>
          }
          renderItem={({ item: route }) => {
            const subs = subscribersByRoute[route.id] ?? [];
            return (
              <View style={s.subRouteGroup}>
                <View style={s.subRouteHeader}>
                  <MaterialCommunityIcons name="bus-school" size={18} color={TRANSPORT_COLOR} />
                  <Text style={s.subRouteName}>{route.name}</Text>
                  <View style={s.subCountBadge}>
                    <Text style={s.subCountTxt}>{subs.length} طالب</Text>
                  </View>
                </View>
                {subs.length === 0 ? (
                  <Text style={s.noSubsTxt}>لا يوجد مشتركون في هذا الخط</Text>
                ) : (
                  subs.map(student => (
                    <View key={student.id} style={s.subStudentRow}>
                      <View style={s.subStudentAvatar}>
                        <Text style={s.subStudentInitial}>{student.name[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.subStudentName}>{student.name}</Text>
                        <Text style={s.subStudentLevel}>{student.level} · {student.parentName}</Text>
                      </View>
                      <Pressable onPress={async () => {
                        try {
                          const url = `tel:${student.parentPhone}`;
                          const can = await Linking.canOpenURL(url);
                          if (can) { await Linking.openURL(url); }
                          else { Alert.alert('اتصال', `هاتف ولي أمر ${student.name}: ${student.parentPhone}`); }
                        } catch {
                          Alert.alert('اتصال', `هاتف ولي أمر ${student.name}: ${student.parentPhone}`);
                        }
                      }}>
                        <Ionicons name="call-outline" size={18} color={TRANSPORT_COLOR} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" statusBarTranslucent>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: bottomPad + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <Pressable style={s.iconBtn} onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
              <Text style={s.sheetTitle}>{editing ? 'تعديل الخط' : 'إضافة خط جديد'}</Text>
              <MaterialCommunityIcons name="bus-school" size={20} color={TRANSPORT_COLOR} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'اسم الخط *', key: 'name', placeholder: 'مثال: خط الشمال' },
                { label: 'اسم السائق *', key: 'driverName', placeholder: 'الاسم الكامل للسائق' },
                { label: 'هاتف السائق *', key: 'driverPhone', placeholder: '+249...' },
                { label: 'موعد الذهاب', key: 'morningTime', placeholder: '07:00' },
                { label: 'موعد العودة', key: 'afternoonTime', placeholder: '13:30' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={s.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={s.input}
                    value={String((form as any)[field.key] ?? '')}
                    onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textLight}
                    textAlign="right"
                  />
                </View>
              ))}

              <Text style={s.fieldLabel}>الرسوم الشهرية (ج.س)</Text>
              <TextInput
                style={s.input}
                value={String(form.monthlyFee)}
                onChangeText={v => setForm(prev => ({ ...prev, monthlyFee: Number(v) || 0 }))}
                keyboardType="numeric"
                placeholderTextColor={Colors.textLight}
                textAlign="right"
              />

              <Text style={s.fieldLabel}>السعة القصوى</Text>
              <TextInput
                style={s.input}
                value={String(form.capacity)}
                onChangeText={v => setForm(prev => ({ ...prev, capacity: Number(v) || 1 }))}
                keyboardType="numeric"
                placeholderTextColor={Colors.textLight}
                textAlign="right"
              />

              <Text style={s.fieldLabel}>المناطق المغطاة (افصل بفاصلة)</Text>
              <TextInput
                style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                value={areasText}
                onChangeText={setAreasText}
                placeholder="الحي الشمالي، شارع المدارس، حي الزهور"
                placeholderTextColor={Colors.textLight}
                textAlign="right"
                multiline
              />

              <Text style={s.fieldLabel}>ملاحظات</Text>
              <TextInput
                style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={v => setForm(prev => ({ ...prev, notes: v }))}
                placeholder="لون الحافلة، رقم اللوحة..."
                placeholderTextColor={Colors.textLight}
                textAlign="right"
                multiline
              />

              {/* Active toggle */}
              <View style={s.toggleRow}>
                <Text style={s.fieldLabel}>الخط نشط</Text>
                <Pressable
                  style={[s.togglePill, form.active && s.togglePillActive]}
                  onPress={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                >
                  <Text style={[s.toggleTxt, form.active && { color: '#fff' }]}>
                    {form.active ? 'نعم' : 'لا'}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={s.saveBtn} onPress={handleSave}>
                <LinearGradient
                  colors={['#07311E', '#0D4D2C', '#116638']}
                  style={s.saveGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={s.saveTxt}>{editing ? 'حفظ التعديلات' : 'إضافة الخط'}</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', marginTop: 1, textAlign: 'center' },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 12, marginBottom: 12, gap: 4,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  statLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  tabs: { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  tabBtnActive: { backgroundColor: 'rgba(13,124,74,0.35)', borderWidth: 1, borderColor: 'rgba(13,124,74,0.6)' },
  tabLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.45)' },
  tabLabelActive: { color: '#68D89A' },

  list: { padding: 16, gap: 14, paddingBottom: 100 },

  routeCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, gap: 10,
  },
  routeCardInactive: { opacity: 0.7 },
  routeCardHeader: { flexDirection: 'row', alignItems: 'center' },
  routeIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  routeName: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text },
  routeAreas: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  toggleActive: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  inactiveBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.danger },

  routeInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  infoChipTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  driverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  driverName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: TRANSPORT_LIGHT, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  callBtnTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: TRANSPORT_COLOR },

  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capacityTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  capacityPct: { fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.text },
  capacityTrack: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: 3 },

  routeNotes: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  routeActions: {
    flexDirection: 'row', borderTopWidth: 1,
    borderColor: Colors.border, paddingTop: 10, marginTop: 2,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  actionDivider: { width: 1, backgroundColor: Colors.border },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textLight },
  emptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },

  subRouteGroup: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  subRouteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: TRANSPORT_LIGHT,
    borderBottomWidth: 1, borderColor: Colors.border + '80',
  },
  subRouteName: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold', color: TRANSPORT_COLOR },
  subCountBadge: {
    backgroundColor: TRANSPORT_COLOR + '20', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  subCountTxt: { fontSize: 11, fontFamily: 'Inter_700Bold', color: TRANSPORT_COLOR },
  noSubsTxt: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center', padding: 14 },
  subStudentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: Colors.border + '50',
  },
  subStudentAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: TRANSPORT_COLOR + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  subStudentInitial: { fontSize: 14, fontFamily: 'Inter_700Bold', color: TRANSPORT_COLOR },
  subStudentName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  subStudentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 1 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 8, maxHeight: '92%',
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  fieldLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text,
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  togglePill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  togglePillActive: { backgroundColor: TRANSPORT_COLOR, borderColor: TRANSPORT_COLOR },
  toggleTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 22, marginBottom: 4 },
  saveGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  saveTxt: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
