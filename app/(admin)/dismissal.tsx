import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import {
  checkoutStudent, DismissalRecord, DismissalStudent, fetchDismissalStudents, fetchTodayDismissals,
} from '@/lib/dismissal';

export default function StudentDismissalScreen() {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<DismissalStudent[]>([]);
  const [records, setRecords] = useState<DismissalRecord[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DismissalStudent | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [authorizedPickupConfirmed, setAuthorizedPickupConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roster, today] = await Promise.all([fetchDismissalStudents(), fetchTodayDismissals()]);
      setStudents(roster);
      setRecords(today.dismissals);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر الاتصال بخدمة الانصراف');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const dismissedIds = useMemo(() => new Set(records.map(record => record.studentId)), [records]);
  const filteredStudents = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return students.filter(student =>
      !search || `${student.name} ${student.level}`.toLocaleLowerCase().includes(search),
    );
  }, [students, query]);
  const pendingCount = students.filter(student => !dismissedIds.has(student.id)).length;

  const openConfirmation = (student: DismissalStudent) => {
    setSelected(student);
    setReceiverName('');
    setRelationship('');
    setAuthorizedPickupConfirmed(false);
    setError('');
    setNotice('');
  };

  const closeConfirmation = () => {
    if (submitting) return;
    setSelected(null);
  };

  const submitCheckout = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const record = await checkoutStudent(selected.id, {
        receiverName,
        receiverRelationship: relationship,
        confirmedAuthorizedPickup: authorizedPickupConfirmed,
      });
      setRecords(previous => [...previous, record]);
      setSelected(null);
      setNotice(`تم تسجيل انصراف ${selected.name} الساعة ${new Date(record.dismissedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر تسجيل الانصراف');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 20 : 8) + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} maxFontSizeMultiplier={1.5}>انصراف الطلاب</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.5}>تسجيل استلام الطالب والتحقق من المستلم</Text>
        </View>
        <MaterialCommunityIcons name="account-arrow-right" size={30} color={Colors.accent} />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.pendingCard]}>
                <Text style={[styles.statValue, { color: '#B45309' }]}>{loading ? '—' : pendingCount}</Text>
                <Text style={styles.statLabel}>بانتظار الانصراف</Text>
              </View>
              <View style={[styles.statCard, styles.doneCard]}>
                <Text style={[styles.statValue, { color: Colors.success }]}>{loading ? '—' : records.length}</Text>
                <Text style={styles.statLabel}>تم انصرافهم اليوم</Text>
              </View>
            </View>

            {error ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable accessibilityRole="button" onPress={() => void loadData()} style={styles.retryButton}>
                  <Text style={styles.retryText}>إعادة المحاولة</Text>
                </Pressable>
              </View>
            ) : null}
            {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={Colors.textLight} />
              <TextInput
                accessibilityLabel="البحث عن طالب"
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث باسم الطالب أو المستوى"
                placeholderTextColor={Colors.textLight}
                style={styles.searchInput}
                textAlign="right"
                allowFontScaling
                returnKeyType="search"
              />
            </View>
            <Text style={styles.sectionTitle}>قائمة الطلاب</Text>
          </View>
        }
        ListEmptyComponent={
          loading
            ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
            : !error
              ? <Text style={styles.emptyText}>{students.length ? 'لا يوجد طلاب يطابقون البحث' : 'لا توجد قائمة طلاب متاحة'}</Text>
              : null
        }
        renderItem={({ item }) => {
          const dismissed = dismissedIds.has(item.id);
          const record = records.find(entry => entry.studentId === item.id);
          return (
            <View style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} maxFontSizeMultiplier={1.7}>{item.name}</Text>
                {!!item.level && <Text style={styles.studentLevel}>{item.level}</Text>}
                {dismissed && record ? (
                  <Text style={styles.recordMeta}>
                    {`استلم: ${record.receiverName} · ${new Date(record.dismissedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                  </Text>
                ) : null}
              </View>
              {dismissed ? (
                <View style={styles.dismissedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={styles.dismissedText}>تم الاستلام</Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`تسجيل انصراف ${item.name}`}
                  onPress={() => openConfirmation(item)}
                  style={({ pressed }) => [styles.checkoutButton, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.checkoutText}>انصراف</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListFooterComponent={<Text style={styles.privacyNote}>بيانات الانصراف محفوظة على الخادم، ولا يتم تسجيل العملية عند تعذّر الاتصال.</Text>}
      />

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeConfirmation}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modal, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
          <View style={styles.modalHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={closeConfirmation} style={styles.closeButton}>
              <Ionicons name="close" size={23} color={Colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>تأكيد انصراف الطالب</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.modalStudent}>{selected?.name}</Text>
          <Text style={styles.formLabel}>اسم الشخص المستلم</Text>
          <TextInput
            accessibilityLabel="اسم الشخص المستلم"
            value={receiverName}
            onChangeText={setReceiverName}
            placeholder="الاسم الكامل"
            style={styles.input}
            textAlign="right"
            allowFontScaling
            maxLength={120}
            autoCapitalize="words"
          />
          <Text style={styles.formLabel}>صلة القرابة أو العلاقة</Text>
          <TextInput
            accessibilityLabel="صلة القرابة أو العلاقة"
            value={relationship}
            onChangeText={setRelationship}
            placeholder="مثال: الأب، الأم، السائق المعتمد"
            style={styles.input}
            textAlign="right"
            allowFontScaling
            maxLength={80}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: authorizedPickupConfirmed }}
            onPress={() => setAuthorizedPickupConfirmed(value => !value)}
            style={styles.acknowledgement}
          >
            <View style={[styles.checkbox, authorizedPickupConfirmed && styles.checkboxChecked]}>
              {authorizedPickupConfirmed ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </View>
            <Text style={styles.acknowledgementText}>
              أؤكد أنني تحققت بنفسي من هوية المستلم وأنه مخوّل باستلام هذا الطالب.
            </Text>
          </Pressable>
          {error ? <Text accessibilityRole="alert" style={styles.modalError}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={submitting || !authorizedPickupConfirmed || receiverName.trim().length < 2 || relationship.trim().length < 2}
            onPress={() => void submitCheckout()}
            style={({ pressed }) => [
              styles.confirmButton,
              (submitting || !authorizedPickupConfirmed || receiverName.trim().length < 2 || relationship.trim().length < 2) && styles.disabledButton,
              pressed && !submitting && { opacity: 0.8 },
            ]}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>تأكيد تسجيل الانصراف</Text>}
          </Pressable>
          <Text style={styles.warningText}>لن يُسجّل الانصراف إلا بعد حفظه بنجاح على الخادم.</Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 20, backgroundColor: '#050c38' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: { fontSize: 21, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'right' },
  subtitle: { marginTop: 3, fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minHeight: 88, borderRadius: 16, padding: 13, alignItems: 'flex-end', justifyContent: 'center', borderWidth: 1 },
  pendingCard: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  doneCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statValue: { fontSize: 27, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'right' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, minHeight: 52, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, minHeight: 48, color: Colors.text, fontSize: 15, fontFamily: 'Inter_400Regular' },
  sectionTitle: { marginTop: 20, marginBottom: 10, fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right' },
  studentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 15, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  studentInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  studentName: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right' },
  studentLevel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right' },
  recordMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  checkoutButton: { minHeight: 44, minWidth: 76, paddingHorizontal: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  checkoutText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  dismissedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ECFDF5' },
  dismissedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.success, textAlign: 'right' },
  emptyText: { padding: 24, textAlign: 'center', fontSize: 15, color: Colors.textSecondary },
  errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, padding: 13, borderRadius: 13, marginBottom: 14, alignItems: 'flex-end', gap: 8 },
  errorText: { color: Colors.danger, fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  retryButton: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#fff' },
  retryText: { color: Colors.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  notice: { backgroundColor: '#ECFDF5', color: '#047857', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 14, textAlign: 'right' },
  privacyNote: { marginTop: 12, paddingHorizontal: 4, color: Colors.textLight, fontSize: 12, lineHeight: 19, textAlign: 'right' },
  modal: { flexGrow: 1, backgroundColor: Colors.background, paddingHorizontal: 20, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 12 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  modalStudent: { color: Colors.primary, fontSize: 21, fontFamily: 'Inter_700Bold', textAlign: 'right', marginBottom: 24 },
  formLabel: { color: Colors.text, fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, fontSize: 16, color: Colors.text },
  acknowledgement: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 22, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  checkbox: { width: 26, height: 26, borderWidth: 2, borderColor: Colors.primary, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary },
  acknowledgementText: { flex: 1, color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  modalError: { marginTop: 12, fontSize: 14, color: Colors.danger, textAlign: 'right' },
  confirmButton: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success, marginTop: 22 },
  disabledButton: { opacity: 0.45 },
  confirmText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  warningText: { color: Colors.textLight, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
});
