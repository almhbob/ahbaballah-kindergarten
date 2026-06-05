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
import { useAppData, ConsentRequest, ConsentResponse } from '@/contexts/AppDataContext';

const CONSENT_COLOR = '#0f766e';

const LEVELS = ['الكل', 'براعم', 'مستوى أول', 'مستوى ثاني'];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function ConsentFormModal({ editing, onClose }: { editing: ConsentRequest | null; onClose: () => void }) {
  const { addConsentRequest, updateConsentRequest, students } = useAppData();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [eventDate, setEventDate] = useState(editing?.eventDate ?? '');
  const [targetLevel, setTargetLevel] = useState(editing?.targetLevel ?? 'الكل');

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال عنوان الطلب'); return; }
    if (!eventDate.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال تاريخ الحدث'); return; }

    const targetStudents = students.filter(s => targetLevel === 'الكل' || s.level === targetLevel);
    const responses: ConsentResponse[] = targetStudents.map(s => ({
      studentId: s.id,
      parentName: s.parentName,
      response: 'pending',
    }));

    if (editing) {
      updateConsentRequest(editing.id, { title: title.trim(), description: description.trim(), eventDate, targetLevel });
    } else {
      addConsentRequest({
        id: genId(),
        title: title.trim(),
        description: description.trim(),
        eventDate,
        targetLevel,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
        responses,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[mf.container, { paddingTop: insets.top + 16 }]}>
        <View style={mf.header}>
          <Pressable onPress={onClose} style={mf.closeBtn}><Text style={mf.closeTxt}>إلغاء</Text></Pressable>
          <Text style={mf.title}>{editing ? 'تعديل طلب الموافقة' : 'طلب موافقة جديد'}</Text>
          <Pressable onPress={handleSave} style={mf.saveBtn}><Text style={mf.saveTxt}>إنشاء</Text></Pressable>
        </View>
        <ScrollView style={{ flex: 1, padding: 18 }} keyboardShouldPersistTaps="handled">
          <Text style={mf.label}>عنوان الطلب *</Text>
          <TextInput style={mf.input} value={title} onChangeText={setTitle} placeholder="مثال: رحلة مدرسية إلى الحديقة" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={mf.label}>وصف الحدث</Text>
          <TextInput style={[mf.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="تفاصيل الحدث والمعلومات المهمة..." placeholderTextColor={Colors.textLight} textAlign="right" multiline />

          <Text style={mf.label}>تاريخ الحدث *</Text>
          <TextInput style={mf.input} value={eventDate} onChangeText={setEventDate} placeholder="2026-04-20" placeholderTextColor={Colors.textLight} textAlign="center" />

          <Text style={mf.label}>المستوى المستهدف</Text>
          <View style={mf.pillRow}>
            {LEVELS.map(l => (
              <Pressable key={l} style={[mf.pill, targetLevel === l && mf.pillActive]} onPress={() => setTargetLevel(l)}>
                <Text style={[mf.pillText, targetLevel === l && mf.pillTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function ConsentDetailModal({ request, onClose }: { request: ConsentRequest; onClose: () => void }) {
  const { updateConsentRequest } = useAppData();
  const insets = useSafeAreaInsets();
  const approved = request.responses.filter(r => r.response === 'approved').length;
  const rejected = request.responses.filter(r => r.response === 'rejected').length;
  const pending = request.responses.filter(r => r.response === 'pending').length;
  const total = request.responses.length;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[md.container, { paddingTop: insets.top + 16 }]}>
        <View style={md.header}>
          <Pressable onPress={onClose} style={md.closeBtn}><Text style={md.closeTxt}>إغلاق</Text></Pressable>
          <Text style={md.title} numberOfLines={1}>{request.title}</Text>
          {request.status === 'active' && (
            <Pressable onPress={() => { updateConsentRequest(request.id, { status: 'closed' }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onClose(); }} style={md.closeReqBtn}>
              <Text style={md.closeReqTxt}>إغلاق الطلب</Text>
            </Pressable>
          )}
        </View>

        <View style={md.statsRow}>
          {[
            { label: 'وافق', count: approved, color: Colors.success },
            { label: 'رفض', count: rejected, color: Colors.danger },
            { label: 'لم يرد', count: pending, color: Colors.warning },
          ].map((st, i) => (
            <View key={i} style={md.statBox}>
              <Text style={[md.statVal, { color: st.color }]}>{st.count}</Text>
              <Text style={md.statLbl}>{st.label}</Text>
            </View>
          ))}
          <View style={md.statBox}>
            <Text style={md.statVal}>{total > 0 ? Math.round((approved / total) * 100) : 0}%</Text>
            <Text style={md.statLbl}>نسبة الموافقة</Text>
          </View>
        </View>

        {total > 0 && (
          <View style={md.progressBar}>
            <View style={{ flex: approved, backgroundColor: Colors.success, height: 6 }} />
            <View style={{ flex: rejected, backgroundColor: Colors.danger, height: 6 }} />
            <View style={{ flex: pending, backgroundColor: Colors.warning, height: 6 }} />
          </View>
        )}

        <FlatList
          data={request.responses}
          keyExtractor={item => item.studentId}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const icon = item.response === 'approved' ? 'checkmark-circle' : item.response === 'rejected' ? 'close-circle' : 'time';
            const color = item.response === 'approved' ? Colors.success : item.response === 'rejected' ? Colors.danger : Colors.warning;
            const label = item.response === 'approved' ? 'وافق' : item.response === 'rejected' ? 'رفض' : 'لم يرد';
            return (
              <View style={md.responseRow}>
                <View style={[md.statusBadge, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon as any} size={14} color={color} />
                  <Text style={[md.statusText, { color }]}>{label}</Text>
                </View>
                {item.note ? <Text style={md.note}>{item.note}</Text> : null}
                <Text style={md.parentName}>{item.parentName}</Text>
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

function ConsentCard({ request, onView, onEdit, onDelete }: {
  request: ConsentRequest;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const approved = request.responses.filter(r => r.response === 'approved').length;
  const total = request.responses.length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const isActive = request.status === 'active';

  return (
    <Pressable style={[cc.card, !isActive && cc.cardClosed]} onPress={onView}>
      <View style={cc.top}>
        <View style={cc.actions}>
          {isActive && (
            <Pressable onPress={onEdit} style={cc.iconBtn}>
              <Ionicons name="create-outline" size={14} color={Colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={onDelete} style={cc.iconBtn}>
            <Ionicons name="trash-outline" size={14} color={Colors.danger} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={cc.title}>{request.title}</Text>
          <Text style={cc.meta}>{request.eventDate} · {request.targetLevel}</Text>
        </View>
        <View style={[cc.statusDot, { backgroundColor: isActive ? Colors.success : Colors.textLight }]} />
      </View>

      <View style={cc.progressRow}>
        <Text style={cc.pct}>{pct}%</Text>
        <View style={cc.progressTrack}>
          <View style={[cc.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={cc.progressLabel}>{approved}/{total} موافقة</Text>
      </View>

      <View style={cc.footer}>
        <Text style={cc.footerText}>{request.createdAt}</Text>
        <View style={[cc.statusBadge, { backgroundColor: isActive ? Colors.success + '18' : Colors.textLight + '18' }]}>
          <Text style={[cc.statusText, { color: isActive ? Colors.success : Colors.textLight }]}>{isActive ? 'نشط' : 'مغلق'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { consentRequests, removeConsentRequest } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ConsentRequest | null>(null);
  const [viewing, setViewing] = useState<ConsentRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');

  const filtered = useMemo(() =>
    consentRequests.filter(r => filterStatus === 'all' || r.status === filterStatus),
    [consentRequests, filterStatus]
  );

  const activeCount = consentRequests.filter(r => r.status === 'active').length;

  const handleDelete = (req: ConsentRequest) => {
    Alert.alert('حذف الطلب', `هل تريد حذف "${req.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removeConsentRequest(req.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#042f2e', '#0f766e', '#14a99a']} style={[s.header, { paddingTop: topPadding + 10 }]}>
        <View style={s.headerTop}>
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{consentRequests.length}</Text>
              <Text style={s.statLbl}>إجمالي</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: '#6EE7B7' }]}>{activeCount}</Text>
              <Text style={s.statLbl}>نشطة</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.title}>طلبات الموافقة</Text>
            <Text style={s.subtitle}>رحلات وأنشطة وفعاليات</Text>
          </View>
          <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="rgba(255,255,255,0.7)" style={{ marginLeft: 12 }} />
        </View>

        <View style={s.filterRow}>
          {([{ k: 'all', l: 'الكل' }, { k: 'active', l: 'نشطة' }, { k: 'closed', l: 'مغلقة' }] as const).map(f => (
            <Pressable key={f.k} style={[s.filterTab, filterStatus === f.k && s.filterTabActive]} onPress={() => setFilterStatus(f.k)}>
              <Text style={[s.filterTabText, filterStatus === f.k && s.filterTabTextActive]}>{f.l}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Pressable style={s.addBtn} onPress={() => { setEditing(null); setShowForm(true); }}>
            <LinearGradient colors={[CONSENT_COLOR, '#0a8a82']} style={s.addBtnGrad}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.addBtnText}>إنشاء طلب موافقة جديد</Text>
            </LinearGradient>
          </Pressable>
        }
        renderItem={({ item }) => (
          <ConsentCard
            request={item}
            onView={() => setViewing(item)}
            onEdit={() => { setEditing(item); setShowForm(true); }}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={52} color={Colors.textLight} />
            <Text style={s.emptyText}>لا توجد طلبات موافقة بعد</Text>
            <Text style={s.emptyHint}>اضغط الزر أعلاه لإنشاء أول طلب</Text>
          </View>
        }
      />

      {showForm && <ConsentFormModal editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {viewing && <ConsentDetailModal request={viewing} onClose={() => setViewing(null)} />}
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
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  filterTabTextActive: { color: CONSENT_COLOR, fontFamily: 'Inter_700Bold' },
  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },
});

const cc = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardClosed: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  title: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  meta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.success, borderRadius: 3 },
  pct: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.success, width: 36, textAlign: 'right' },
  progressLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});

const md = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.primary },
  closeReqBtn: { backgroundColor: Colors.danger + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  closeReqTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.danger },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, margin: 16, borderRadius: 16, padding: 12 },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.text },
  statLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  progressBar: { flexDirection: 'row', marginHorizontal: 16, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  responseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  parentName: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  note: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, flex: 1, textAlign: 'right' },
});

const mf = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.danger },
  saveBtn: { backgroundColor: CONSENT_COLOR, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  saveTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 18 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: CONSENT_COLOR, borderColor: CONSENT_COLOR },
  pillText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },
});
