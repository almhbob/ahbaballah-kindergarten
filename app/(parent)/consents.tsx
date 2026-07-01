import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData, ConsentRequest } from '@/contexts/AppDataContext';

const PARENT_COLOR = '#7B3FA0';

function ConsentResponseModal({ request, studentId, parentName, onClose }: {
  request: ConsentRequest;
  studentId: string;
  parentName: string;
  onClose: () => void;
}) {
  const { respondConsent } = useAppData();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRespond = (resp: 'approved' | 'rejected') => {
    setLoading(true);
    respondConsent(request.id, {
      studentId,
      parentName,
      response: resp,
      respondedAt: new Date().toISOString().split('T')[0],
      note: note.trim() || undefined,
    });
    Haptics.notificationAsync(
      resp === 'approved' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[m.container, { paddingTop: insets.top + 16 }]}>
        <View style={m.header}>
          <Pressable onPress={onClose} style={m.closeBtn}><Text style={m.closeTxt}>رجوع</Text></Pressable>
          <Text style={m.title} numberOfLines={1}>{request.title}</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={{ padding: 18 }}>
          <View style={m.infoCard}>
            <View style={m.infoRow}>
              <Text style={m.infoVal}>{request.eventDate}</Text>
              <Text style={m.infoKey}>تاريخ الحدث:</Text>
            </View>
            <View style={m.infoRow}>
              <Text style={m.infoVal}>{request.targetLevel}</Text>
              <Text style={m.infoKey}>المستوى:</Text>
            </View>
          </View>

          {request.description ? (
            <View style={m.descCard}>
              <Text style={m.descText}>{request.description}</Text>
            </View>
          ) : null}

          <Text style={m.label}>ملاحظة (اختياري)</Text>
          <TextInput
            style={m.input}
            value={note}
            onChangeText={setNote}
            placeholder="يمكنك إضافة ملاحظة..."
            placeholderTextColor={Colors.textLight}
            textAlign="right"
            multiline
          />

          <View style={m.actionRow}>
            <Pressable style={m.rejectBtn} onPress={() => handleRespond('rejected')} disabled={loading}>
              <Ionicons name="close-circle" size={20} color={Colors.danger} />
              <Text style={m.rejectText}>رفض</Text>
            </Pressable>
            <Pressable style={m.approveBtn} onPress={() => handleRespond('approved')} disabled={loading}>
              <LinearGradient colors={[PARENT_COLOR, '#9B59B6']} style={m.approveBtnGrad}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={m.approveText}>موافقة</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ConsentsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { consentRequests, students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [responding, setResponding] = useState<ConsentRequest | null>(null);

  const child = user?.studentId ? (students.find(s => s.id === user.studentId) ?? null) : null;

  const myRequests = useMemo(() => {
    if (!child) return [];
    return consentRequests
      .filter(r => r.status === 'active' && (r.targetLevel === 'الكل' || r.targetLevel === child.level))
      .map(r => {
        const myResponse = r.responses.find(res => res.studentId === child.id);
        return { ...r, myResponse: myResponse?.response ?? 'pending' };
      });
  }, [consentRequests, child]);

  const pendingCount = myRequests.filter(r => r.myResponse === 'pending').length;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#2d0e4e', '#4a1880', PARENT_COLOR]} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{myRequests.length}</Text>
              <Text style={s.statLbl}>إجمالي</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: '#FCD34D' }]}>{pendingCount}</Text>
              <Text style={s.statLbl}>بانتظارك</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.title}>طلبات الموافقة</Text>
            <Text style={s.subtitle}>رحلات وأنشطة وفعاليات</Text>
          </View>
          <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="rgba(255,255,255,0.7)" style={{ marginLeft: 12 }} />
        </View>
      </LinearGradient>

      <FlatList
        data={myRequests}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPending = item.myResponse === 'pending';
          const isApproved = item.myResponse === 'approved';
          const statusColor = isApproved ? Colors.success : isPending ? Colors.warning : Colors.danger;
          const statusLabel = isApproved ? 'وافقت' : isPending ? 'بانتظار ردك' : 'رفضت';
          const statusIcon = isApproved ? 'checkmark-circle' : isPending ? 'time' : 'close-circle';

          return (
            <Pressable
              style={[c.card, isPending && c.cardPending]}
              onPress={() => { if (isPending) setResponding(item); }}
            >
              <View style={c.top}>
                <View style={[c.statusBadge, { backgroundColor: statusColor + '18' }]}>
                  <Ionicons name={statusIcon as any} size={14} color={statusColor} />
                  <Text style={[c.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={c.title}>{item.title}</Text>
                  <Text style={c.meta}>{item.eventDate} · {item.targetLevel}</Text>
                </View>
              </View>
              {item.description ? (
                <Text style={c.description} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {isPending && (
                <View style={c.actionHint}>
                  <Ionicons name="finger-print" size={14} color={PARENT_COLOR} />
                  <Text style={c.actionHintText}>اضغط للرد على الطلب</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={52} color={Colors.textLight} />
            <Text style={s.emptyText}>لا توجد طلبات موافقة حالياً</Text>
            <Text style={s.emptyHint}>ستظهر هنا طلبات الموافقة على الرحلات والأنشطة</Text>
          </View>
        }
      />

      {responding && child && (
        <ConsentResponseModal
          request={responding}
          studentId={child.id}
          parentName={child.parentName}
          onClose={() => setResponding(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8 },
  stat: { alignItems: 'center', paddingHorizontal: 10 },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  statLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  statDiv: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  subtitle: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center', paddingHorizontal: 20 },
});

const c = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardPending: { borderColor: PARENT_COLOR + '40', backgroundColor: '#FAF5FF' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  meta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  description: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 20, marginBottom: 8 },
  actionHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 },
  actionHintText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: PARENT_COLOR },
});

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.primary },
  infoCard: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' },
  infoKey: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  infoVal: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text },
  descCard: { backgroundColor: PARENT_COLOR + '10', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: PARENT_COLOR + '30' },
  descText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', lineHeight: 22 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 8, textAlign: 'right' },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 24, borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  approveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  approveText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.danger + '12', borderRadius: 14, borderWidth: 1, borderColor: Colors.danger + '30', paddingVertical: 14 },
  rejectText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.danger },
});
