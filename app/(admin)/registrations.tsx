import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  Modal, ScrollView, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, RegistrationRequest, RegistrationStatus } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

type Tab = 'pending' | 'approved' | 'rejected';

const TAB_CONFIG: { key: Tab; label: string; color: string; icon: string }[] = [
  { key: 'pending',  label: 'قيد المراجعة', color: Colors.warning, icon: 'timer-sand' },
  { key: 'approved', label: 'مقبول',         color: Colors.success, icon: 'check-circle' },
  { key: 'rejected', label: 'مرفوض',         color: Colors.danger,  icon: 'close-circle' },
];

const LEVEL_COLOR: Record<string, string> = {
  'براعم':       '#EC4899',
  'مستوى أول':  '#3B82F6',
  'مستوى ثاني': '#10B981',
};

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const cfg =
    status === 'approved' ? { label: 'مقبول',         color: Colors.success, bg: '#ECFDF5' } :
    status === 'rejected' ? { label: 'مرفوض',         color: Colors.danger,  bg: '#FEF2F2' } :
                            { label: 'قيد المراجعة',  color: Colors.warning, bg: '#FFFBEB' };
  return (
    <View style={[sBadge.wrap, { backgroundColor: cfg.bg }]}>
      <Text style={[sBadge.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}
const sBadge = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  text: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});

function RequestCard({
  req,
  onPress,
}: {
  req: RegistrationRequest;
  onPress: () => void;
}) {
  const lc = LEVEL_COLOR[req.requestedLevel] ?? Colors.accent;
  return (
    <Pressable style={card.wrap} onPress={onPress}>
      <View style={[card.accent, { backgroundColor: lc }]} />
      <View style={card.body}>
        <View style={card.row}>
          <StatusBadge status={req.status} />
          <Text style={card.name}>{req.childName}</Text>
        </View>
        <View style={card.metaRow}>
          <View style={[card.levelBadge, { backgroundColor: lc + '18', borderColor: lc + '50' }]}>
            <Text style={[card.levelText, { color: lc }]}>{req.requestedLevel}</Text>
          </View>
          <Text style={card.meta}>{req.gender} · {req.birthDate}</Text>
        </View>
        <View style={card.row}>
          <Text style={card.date}>{new Date(req.createdAt).toLocaleDateString('ar-SA')}</Text>
          <Text style={card.parent}>{req.parentName} · {req.parentPhone}</Text>
        </View>
        {req.rejectionReason ? (
          <Text style={card.rejection} numberOfLines={1}>سبب الرفض: {req.rejectionReason}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
const card = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16, marginHorizontal: 16, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  accent: { width: 5 },
  body: { flex: 1, padding: 14, gap: 7 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text },
  parent: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  meta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  levelText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  date: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  rejection: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.danger, textAlign: 'right' },
});

function DetailModal({
  req,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: {
  req: RegistrationRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const lc = LEVEL_COLOR[req.requestedLevel] ?? Colors.accent;

  const InfoRow = ({ icon, label, value, color }: { icon: string; label: string; value?: string; color?: string }) => (
    value ? (
      <View style={detail.infoRow}>
        <Text style={[detail.infoVal, color ? { color } : {}]}>{value}</Text>
        <View style={detail.infoLeft}>
          <Text style={detail.infoLabel}>{label}</Text>
          <MaterialCommunityIcons name={icon as any} size={16} color={Colors.textLight} />
        </View>
      </View>
    ) : null
  );

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[detail.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={detail.handle} />
        <View style={detail.titleRow}>
          <Pressable onPress={onClose} style={detail.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.text} />
          </Pressable>
          <Text style={detail.title}>تفاصيل طلب التسجيل</Text>
          <StatusBadge status={req.status} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <LinearGradient colors={['#040b3c', '#0c1155']} style={detail.heroCard}>
            <View style={[detail.levelCircle, { backgroundColor: lc + '25', borderColor: lc }]}>
              <Text style={[detail.levelCircleText, { color: lc }]}>{req.requestedLevel}</Text>
            </View>
            <Text style={detail.heroName}>{req.childName}</Text>
            <Text style={detail.heroSub}>{req.gender} · تاريخ الميلاد: {req.birthDate}</Text>
            <Text style={detail.heroDate}>تاريخ التقديم: {new Date(req.createdAt).toLocaleDateString('ar-SA')}</Text>
          </LinearGradient>

          <View style={detail.section}>
            <Text style={detail.sectionTitle}>بيانات الطفل</Text>
            <InfoRow icon="account-child"      label="الاسم الكامل"      value={req.childName} />
            <InfoRow icon="cake-variant"       label="تاريخ الميلاد"     value={req.birthDate} />
            <InfoRow icon="gender-male-female" label="الجنس"              value={req.gender} />
            <InfoRow icon="school"             label="المستوى المطلوب"    value={req.requestedLevel} color={lc} />
          </View>

          <View style={detail.section}>
            <Text style={detail.sectionTitle}>بيانات ولي الأمر</Text>
            <InfoRow icon="account"            label="اسم ولي الأمر"     value={req.parentName} />
            <InfoRow icon="phone"              label="رقم الهاتف"         value={req.parentPhone} />
            <InfoRow icon="account-heart"      label="صلة القرابة"        value={req.parentRelation} />
            <InfoRow icon="email"              label="البريد الإلكتروني"  value={req.parentEmail} />
          </View>

          {req.notes ? (
            <View style={detail.section}>
              <Text style={detail.sectionTitle}>ملاحظات</Text>
              <Text style={detail.noteText}>{req.notes}</Text>
            </View>
          ) : null}

          {req.rejectionReason ? (
            <View style={[detail.section, { borderRightColor: Colors.danger, borderRightWidth: 3 }]}>
              <Text style={[detail.sectionTitle, { color: Colors.danger }]}>سبب الرفض</Text>
              <Text style={detail.noteText}>{req.rejectionReason}</Text>
            </View>
          ) : null}

          {req.status === 'pending' && (
            <View style={detail.actions}>
              {!showRejectInput ? (
                <>
                  <Pressable
                    style={[detail.actionBtn, { backgroundColor: Colors.success }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onApprove(); }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={detail.actionBtnText}>قبول الطلب</Text>
                  </Pressable>
                  <Pressable
                    style={[detail.actionBtn, { backgroundColor: Colors.danger }]}
                    onPress={() => setShowRejectInput(true)}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={detail.actionBtnText}>رفض الطلب</Text>
                  </Pressable>
                </>
              ) : (
                <View style={detail.rejectBox}>
                  <Text style={detail.rejectLabel}>سبب الرفض (اختياري):</Text>
                  <TextInput
                    style={detail.rejectInput}
                    placeholder="اكتب سبب الرفض..."
                    placeholderTextColor={Colors.textLight}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    multiline
                    textAlign="right"
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable style={[detail.actionBtn, { flex: 1, backgroundColor: Colors.danger }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onReject(rejectReason); }}>
                      <Text style={detail.actionBtnText}>تأكيد الرفض</Text>
                    </Pressable>
                    <Pressable style={[detail.actionBtn, { backgroundColor: Colors.borderLight }]}
                      onPress={() => setShowRejectInput(false)}>
                      <Text style={[detail.actionBtnText, { color: Colors.text }]}>إلغاء</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          <Pressable
            style={detail.deleteBtn}
            onPress={() => {
              Alert.alert('حذف الطلب', 'هل تريد حذف هذا الطلب نهائياً؟', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حذف', style: 'destructive', onPress: onDelete },
              ]);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={detail.deleteBtnText}>حذف الطلب</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const detail = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  handle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { flex: 1, fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'center' },
  closeBtn: { padding: 4 },
  heroCard: { margin: 16, borderRadius: 20, padding: 20, alignItems: 'center', gap: 6 },
  levelCircle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, marginBottom: 4 },
  levelCircleText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  heroName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  heroSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  heroDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)' },
  section: { backgroundColor: Colors.surface, borderRadius: 16, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.textSecondary, padding: 14, paddingBottom: 8, textAlign: 'right' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 120 },
  infoLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  infoVal: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text, textAlign: 'right', marginRight: 8 },
  noteText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, padding: 14, textAlign: 'right', lineHeight: 22 },
  actions: { marginHorizontal: 16, marginBottom: 12, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  rejectBox: { gap: 10 },
  rejectLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  rejectInput: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.borderLight, textAlignVertical: 'top' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, marginHorizontal: 16, marginBottom: 8 },
  deleteBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.danger },
});

export default function RegistrationsScreen() {
  const insets = useSafeAreaInsets();
  const { registrationRequests, updateRegistrationRequest, removeRegistrationRequest } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [tab, setTab] = useState<Tab>('pending');
  const [selected, setSelected] = useState<RegistrationRequest | null>(null);

  const filtered = useMemo(() =>
    registrationRequests.filter(r => r.status === tab),
    [registrationRequests, tab]
  );

  const counts = useMemo(() => ({
    pending:  registrationRequests.filter(r => r.status === 'pending').length,
    approved: registrationRequests.filter(r => r.status === 'approved').length,
    rejected: registrationRequests.filter(r => r.status === 'rejected').length,
  }), [registrationRequests]);

  const handleApprove = (id: string) => {
    updateRegistrationRequest(id, { status: 'approved', approvedAt: new Date().toISOString() });
    setSelected(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReject = (id: string, reason: string) => {
    updateRegistrationRequest(id, { status: 'rejected', rejectionReason: reason || 'لم يُحدد سبب' });
    setSelected(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  return (
    <View style={sty.container}>
      <LinearGradient colors={['#030612', '#050c38', '#0d1463']} style={[sty.header, { paddingTop: topPadding + 12 }]}>
        <Text style={sty.headerTitle}>طلبات التسجيل</Text>
        <Text style={sty.headerSub}>{registrationRequests.length} طلب إجمالي</Text>

        <View style={sty.tabs}>
          {TAB_CONFIG.map(t => (
            <Pressable
              key={t.key}
              style={[sty.tabBtn, tab === t.key && { backgroundColor: t.color + '22', borderColor: t.color + '60' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.key); }}
            >
              <MaterialCommunityIcons name={t.icon as any} size={14} color={tab === t.key ? t.color : Colors.textLight} />
              <Text style={[sty.tabText, tab === t.key && { color: t.color }]}>{t.label}</Text>
              {counts[t.key] > 0 && (
                <View style={[sty.badge, { backgroundColor: t.color }]}>
                  <Text style={sty.badgeText}>{counts[t.key]}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={[sty.list, { paddingBottom: bottomPadding }]}
        renderItem={({ item }) => (
          <RequestCard
            req={item}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(item); }}
          />
        )}
        ListEmptyComponent={
          <View style={sty.empty}>
            <MaterialCommunityIcons name="inbox-outline" size={52} color={Colors.textLight} />
            <Text style={sty.emptyText}>لا توجد طلبات {TAB_CONFIG.find(t => t.key === tab)?.label}</Text>
          </View>
        }
      />

      {selected && (
        <DetailModal
          req={selected}
          onClose={() => setSelected(null)}
          onApprove={() => handleApprove(selected.id)}
          onReject={(reason) => handleReject(selected.id, reason)}
          onDelete={() => { removeRegistrationRequest(selected.id); setSelected(null); }}
        />
      )}
    </View>
  );
}

const sty = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'right', marginBottom: 2 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  tabText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.textLight },
  badge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' },
  list: { paddingTop: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
});
