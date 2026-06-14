import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  TextInput, Modal, FlatList, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, Certificate, CertificateTemplate } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import CertificateCard, { CERT_TEMPLATES } from '@/components/CertificateCard';
import * as Haptics from 'expo-haptics';

const TEACHER_COLOR = '#1A6B5C';

type Tab = 'issue' | 'mine';

export default function TeacherCertificatesScreen() {
  const insets = useSafeAreaInsets();
  const { students, certificates, addCertificate, schoolInfo } = useAppData();
  const { user } = useAuth();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>('issue');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate>('excellence');
  const [certTitle, setCertTitle] = useState('');
  const [certMessage, setCertMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCert, setViewCert] = useState<Certificate | null>(null);

  const teacherClass = (user as any)?.teacherClass;
  const myStudents = teacherClass ? students.filter(s => s.level === teacherClass) : students;

  const myCerts = useMemo(() =>
    certificates.filter(c => c.recipientType === 'teacher' && c.recipientId === user?.id && c.status === 'approved'),
    [certificates, user?.id]
  );

  const myRequestedCerts = useMemo(() =>
    certificates.filter(c => c.issuedById === user?.id),
    [certificates, user?.id]
  );

  function handleIssueRequest() {
    if (!selectedStudent || !certTitle.trim()) {
      Alert.alert('تنبيه', 'يرجى اختيار الطالب وكتابة عنوان الشهادة');
      return;
    }
    const cert: Certificate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      title: certTitle.trim(),
      template: selectedTemplate,
      recipientId: selectedStudent.id,
      recipientName: selectedStudent.name,
      recipientType: 'student',
      issuedBy: user?.name ?? 'معلمة',
      issuedById: user?.id ?? '',
      issuedByRole: 'teacher',
      message: certMessage.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
    };
    addCertificate(cert);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    resetForm();
    Alert.alert('تم الإرسال', 'تم إرسال طلب الشهادة للإدارة للاعتماد');
    setTab('mine');
  }

  function resetForm() {
    setSelectedStudent(null);
    setCertTitle('');
    setCertMessage('');
    setSelectedTemplate('excellence');
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'issue', label: 'إصدار شهادة' },
    { key: 'mine',  label: 'شهاداتي' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#061e1a', '#0d3d35', TEACHER_COLOR]} style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={styles.headerTitle}>الشهادات التحفيزية</Text>
          <MaterialCommunityIcons name="certificate" size={24} color="#6EE7B7" />
        </View>

        <View style={styles.tabs}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => { setTab(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* ── ISSUE TAB ── */}
      {tab === 'issue' && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Template picker */}
          <Text style={styles.sectionLabel}>نوع الشهادة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.templateRow}>
              {(Object.entries(CERT_TEMPLATES) as [CertificateTemplate, typeof CERT_TEMPLATES[CertificateTemplate]][]).map(([key, tmpl]) => (
                <Pressable
                  key={key}
                  style={[styles.templateChip, selectedTemplate === key && { borderColor: tmpl.colors[1], borderWidth: 2 }]}
                  onPress={() => { setSelectedTemplate(key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <LinearGradient colors={[tmpl.colors[0], tmpl.colors[1]]} style={styles.templateIcon}>
                    <MaterialCommunityIcons name={tmpl.icon as any} size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.templateLabel}>{tmpl.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Student list */}
          <Text style={styles.sectionLabel}>اختر الطالب</Text>
          {myStudents.map(s => (
            <Pressable
              key={s.id}
              style={[styles.recipientRow, selectedStudent?.id === s.id && styles.recipientRowActive]}
              onPress={() => setSelectedStudent({ id: s.id, name: s.name })}
            >
              <View style={[styles.recipientAvatar, selectedStudent?.id === s.id && { backgroundColor: TEACHER_COLOR }]}>
                <Text style={styles.recipientAvatarText}>{s.name.charAt(0)}</Text>
              </View>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>{s.name}</Text>
                <Text style={styles.recipientLevel}>{s.level}</Text>
              </View>
              {selectedStudent?.id === s.id && <Ionicons name="checkmark-circle" size={20} color={TEACHER_COLOR} />}
            </Pressable>
          ))}

          <Pressable
            style={[styles.issueBtn, { opacity: selectedStudent ? 1 : 0.5 }]}
            onPress={() => selectedStudent && setShowModal(true)}
          >
            <MaterialCommunityIcons name="certificate-outline" size={20} color="#fff" />
            <Text style={styles.issueBtnText}>طلب إصدار الشهادة</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── MINE TAB ── */}
      {tab === 'mine' && (
        <FlatList
          data={[
            ...myCerts.map(c => ({ ...c, _section: 'received' as const })),
            ...myRequestedCerts.map(c => ({ ...c, _section: 'requested' as const })),
          ]}
          keyExtractor={c => c.id + c._section}
          contentContainerStyle={[styles.body, { gap: 8 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            myCerts.length > 0 ? (
              <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>شهاداتي المستلمة من الإدارة ({myCerts.length})</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => { setViewCert(item); setShowViewModal(true); }}>
              <CertificateCard cert={item} compact schoolName={schoolInfo.name} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="certificate-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>لا توجد شهادات بعد</Text>
            </View>
          }
        />
      )}

      {/* Issue Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.sheetTitle}>تفاصيل الشهادة</Text>
            </View>
            <Text style={styles.sheetSubtitle}>الطالب: {selectedStudent?.name}</Text>

            <Text style={styles.fieldLabel}>عنوان الشهادة *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: الطالب المتفوق، الطفل المبدع..."
              value={certTitle}
              onChangeText={setCertTitle}
              textAlign="right"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.fieldLabel}>رسالة تحفيزية (اختياري)</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="اكتب كلمة تشجيعية..."
              value={certMessage}
              onChangeText={setCertMessage}
              textAlign="right"
              multiline
              placeholderTextColor={Colors.textLight}
            />

            <Pressable style={[styles.issueBtn, { marginTop: 8 }]} onPress={handleIssueRequest}>
              <MaterialCommunityIcons name="send" size={18} color="#fff" />
              <Text style={styles.issueBtnText}>إرسال للاعتماد</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* View Certificate Modal */}
      <Modal visible={showViewModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowViewModal(false)}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: topPadding + 20 }}>
            {viewCert && (
              <CertificateCard cert={viewCert} schoolName={schoolInfo.name} principalName={schoolInfo.principalName} />
            )}
            <Pressable style={[styles.issueBtn, { marginHorizontal: 16 }]} onPress={() => setShowViewModal(false)}>
              <Text style={styles.issueBtnText}>إغلاق</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center', flex: 1 },
  tabs: { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  tabBtnActive: { backgroundColor: '#10B981' },
  tabLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)' },
  tabLabelActive: { color: '#fff' },

  body: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 10, marginTop: 4 },

  templateRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 2, paddingBottom: 4 },
  templateChip: { alignItems: 'center', gap: 6, borderRadius: 12, padding: 10, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, minWidth: 80 },
  templateIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  templateLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'center' },

  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  recipientRowActive: { borderColor: TEACHER_COLOR, backgroundColor: TEACHER_COLOR + '12' },
  recipientAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  recipientAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  recipientInfo: { flex: 1, alignItems: 'flex-end' },
  recipientName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  recipientLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  issueBtn: { backgroundColor: TEACHER_COLOR, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  issueBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textLight },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text },
  sheetSubtitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'right', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 14 },
});
