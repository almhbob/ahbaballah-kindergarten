import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  TextInput, Modal, FlatList, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, Certificate, CertificateTemplate } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import CertificateCard, { CERT_TEMPLATES } from '@/components/CertificateCard';
import CertificateLuxury from '@/components/CertificateLuxury';
import { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing';
import * as Haptics from 'expo-haptics';

const SCREEN_W = Dimensions.get('window').width;

const ADMIN_COLOR = Colors.primary;

type Tab = 'issue' | 'pending' | 'issued';
type IssueTarget = 'teacher' | 'parent';

export default function AdminCertificatesScreen() {
  const insets = useSafeAreaInsets();
  const { employees, students, certificates, addCertificate, updateCertificate, removeCertificate, schoolInfo } = useAppData();
  const { user } = useAuth();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>('issue');
  const [issueTarget, setIssueTarget] = useState<IssueTarget>('teacher');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const [editCert, setEditCert] = useState<Certificate | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const certCaptureRef = useRef<View>(null);

  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate>('excellence');
  const [certTitle, setCertTitle] = useState('');
  const [certMessage, setCertMessage] = useState('');

  const pendingCerts = useMemo(() => certificates.filter(c => c.status === 'pending'), [certificates]);
  const issuedCerts  = useMemo(() => certificates.filter(c => c.status === 'approved' || c.status === 'rejected'), [certificates]);

  const teacherRecipients = employees.filter(e => e.role.includes('معلمة') || e.role.includes('مساعدة'));
  const parentRecipients  = students.map(s => ({ id: `parent_${s.id}`, name: s.parentName }));

  const recipients = issueTarget === 'teacher' ? teacherRecipients.map(e => ({ id: e.id, name: e.name })) : parentRecipients;

  function handleIssue() {
    if (!selectedRecipient || !certTitle.trim()) {
      Alert.alert('تنبيه', 'يرجى اختيار المستلم وكتابة عنوان الشهادة');
      return;
    }
    const cert: Certificate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      title: certTitle.trim(),
      template: selectedTemplate,
      recipientId: selectedRecipient.id,
      recipientName: selectedRecipient.name,
      recipientType: issueTarget,
      issuedBy: user?.name ?? 'الإدارة',
      issuedById: 'admin',
      issuedByRole: 'admin',
      message: certMessage.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'approved',
    };
    addCertificate(cert);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    resetForm();
    setTab('issued');
  }

  function resetForm() {
    setSelectedRecipient(null);
    setCertTitle('');
    setCertMessage('');
    setSelectedTemplate('excellence');
  }

  function handleApprove(id: string) {
    updateCertificate(id, { status: 'approved' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleReject(id: string) {
    updateCertificate(id, { status: 'rejected' });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function openEdit(cert: Certificate) {
    setEditCert(cert);
    setEditTitle(cert.title);
    setEditMessage(cert.message ?? '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function saveEdit() {
    if (!editCert || !editTitle.trim()) return;
    updateCertificate(editCert.id, { title: editTitle.trim(), message: editMessage.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditCert(null);
    if (viewCert?.id === editCert.id) {
      setViewCert(prev => prev ? { ...prev, title: editTitle.trim(), message: editMessage.trim() } : null);
    }
  }

  function handleDelete(id: string) {
    Alert.alert('حذف الشهادة', 'هل أنت متأكد من حذف هذه الشهادة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: () => {
          removeCertificate(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          if (viewCert?.id === id) setShowViewModal(false);
        }
      },
    ]);
  }

  const handleDownload = useCallback(async (cert: Certificate) => {
    if (Platform.OS === 'web') {
      Alert.alert('تنبيه', 'التحميل متاح على الجهاز المحمول فقط');
      return;
    }
    try {
      setDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(certCaptureRef, {
        format: 'png', quality: 1, result: 'tmpfile',
        width: 1080, height: Math.round(1080 * 1.41),
      });
      await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'مشاركة الشهادة' });
    } catch {
      Alert.alert('خطأ', 'تعذّر تحميل الشهادة');
    } finally {
      setDownloading(false);
    }
  }, []);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'issue',   label: 'إصدار' },
    { key: 'pending', label: 'طلبات', count: pendingCerts.length },
    { key: 'issued',  label: 'الصادرة' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#050919', '#0a1128', ADMIN_COLOR + '80']} style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={styles.headerTitle}>الشهادات التحفيزية</Text>
          <MaterialCommunityIcons name="certificate" size={24} color={Colors.accent} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => { setTab(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              {!!t.count && t.count > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{t.count}</Text></View>
              )}
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* ── ISSUE TAB ── */}
      {tab === 'issue' && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Target selector */}
          <Text style={styles.sectionLabel}>إصدار شهادة لـ</Text>
          <View style={styles.targetRow}>
            {(['teacher', 'parent'] as IssueTarget[]).map(t => (
              <Pressable
                key={t}
                style={[styles.targetBtn, issueTarget === t && styles.targetBtnActive]}
                onPress={() => { setIssueTarget(t); setSelectedRecipient(null); }}
              >
                <Ionicons
                  name={t === 'teacher' ? 'school' : 'people'}
                  size={20}
                  color={issueTarget === t ? '#fff' : Colors.textSecondary}
                />
                <Text style={[styles.targetLabel, issueTarget === t && { color: '#fff' }]}>
                  {t === 'teacher' ? 'معلمة' : 'ولي أمر'}
                </Text>
              </Pressable>
            ))}
          </View>

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

          {/* Recipient list */}
          <Text style={styles.sectionLabel}>اختر المستلم</Text>
          {recipients.map(r => (
            <Pressable
              key={r.id}
              style={[styles.recipientRow, selectedRecipient?.id === r.id && styles.recipientRowActive]}
              onPress={() => setSelectedRecipient(r)}
            >
              <View style={[styles.recipientAvatar, selectedRecipient?.id === r.id && { backgroundColor: ADMIN_COLOR }]}>
                <Text style={styles.recipientAvatarText}>{r.name.charAt(0)}</Text>
              </View>
              <Text style={styles.recipientName}>{r.name}</Text>
              {selectedRecipient?.id === r.id && <Ionicons name="checkmark-circle" size={20} color={ADMIN_COLOR} />}
            </Pressable>
          ))}

          {/* Issue button */}
          <Pressable
            style={[styles.issueBtn, { opacity: selectedRecipient ? 1 : 0.5 }]}
            onPress={() => selectedRecipient && setShowModal(true)}
          >
            <MaterialCommunityIcons name="certificate-outline" size={20} color="#fff" />
            <Text style={styles.issueBtnText}>إصدار الشهادة</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── PENDING TAB ── */}
      {tab === 'pending' && (
        <FlatList
          data={pendingCerts}
          keyExtractor={c => c.id}
          contentContainerStyle={[styles.body, { gap: 12 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.pendingCard}>
              <CertificateCard cert={item} compact schoolName={schoolInfo.name} />
              <Text style={styles.pendingIssuer}>طلب من: {item.issuedBy}</Text>
              <View style={styles.pendingActions}>
                <Pressable style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                  <Ionicons name="close" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>رفض</Text>
                </Pressable>
                <Pressable style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>اعتماد</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="inbox-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>لا توجد طلبات معلّقة</Text>
            </View>
          }
        />
      )}

      {/* ── ISSUED TAB ── */}
      {tab === 'issued' && (
        <FlatList
          data={issuedCerts}
          keyExtractor={c => c.id}
          contentContainerStyle={[styles.body, { gap: 8 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View>
              <Pressable onPress={() => { setViewCert(item); setShowViewModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <CertificateCard cert={item} compact schoolName={schoolInfo.name} />
              </Pressable>
              <View style={styles.certActions}>
                <Pressable style={styles.certActionBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={15} color={Colors.primary} />
                  <Text style={[styles.certActionText, { color: Colors.primary }]}>تعديل</Text>
                </Pressable>
                <View style={styles.certActionDivider} />
                <Pressable style={styles.certActionBtn} onPress={() => { setViewCert(item); setShowViewModal(true); }}>
                  <Ionicons name="eye-outline" size={15} color={Colors.textSecondary} />
                  <Text style={[styles.certActionText, { color: Colors.textSecondary }]}>معاينة</Text>
                </Pressable>
                <View style={styles.certActionDivider} />
                <Pressable style={styles.certActionBtn} onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  <Text style={[styles.certActionText, { color: '#ef4444' }]}>حذف</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="certificate-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>لا توجد شهادات صادرة بعد</Text>
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
            <Text style={styles.sheetSubtitle}>المستلم: {selectedRecipient?.name}</Text>

            <Text style={styles.fieldLabel}>عنوان الشهادة *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: معلمة الشهر، ولي الأمر المثالي..."
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

            <Pressable style={[styles.issueBtn, { marginTop: 8 }]} onPress={handleIssue}>
              <MaterialCommunityIcons name="certificate" size={20} color="#fff" />
              <Text style={styles.issueBtnText}>إصدار الشهادة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* View Certificate Modal */}
      <Modal visible={showViewModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.viewSheet, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 12 }]}>
            <View style={styles.sheetHandle} />

            {/* Sheet header actions */}
            <View style={styles.viewSheetHeader}>
              <Pressable style={styles.viewActionBtn} onPress={() => setShowViewModal(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.viewSheetTitle}>معاينة الشهادة</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[styles.viewActionBtn, { backgroundColor: Colors.primary + '15' }]}
                  onPress={() => { setShowViewModal(false); if (viewCert) openEdit(viewCert); }}
                >
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.viewActionBtn, { backgroundColor: '#ef444415' }]}
                  onPress={() => viewCert && handleDelete(viewCert.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            </View>

            {/* Luxury Certificate Preview */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {viewCert && (
                <CertificateLuxury
                  ref={certCaptureRef}
                  cert={viewCert}
                  schoolName={schoolInfo.name}
                  principalName={schoolInfo.principalName}
                  targetWidth={SCREEN_W - 40}
                />
              )}
            </ScrollView>

            {/* Download button */}
            <Pressable
              style={[styles.downloadBtn, { marginHorizontal: 16, marginTop: 8 }, downloading && { opacity: 0.6 }]}
              onPress={() => viewCert && handleDownload(viewCert)}
              disabled={downloading}
            >
              <LinearGradient colors={['#7c3aed', Colors.primary, Colors.accent]} style={styles.downloadGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="download" size={18} color="#fff" />
                    <Text style={styles.downloadBtnText}>تحميل ومشاركة</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Certificate Modal */}
      <Modal visible={!!editCert} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setEditCert(null)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.sheetTitle}>تعديل الشهادة</Text>
              <MaterialCommunityIcons name="certificate-outline" size={20} color={Colors.accent} />
            </View>
            <Text style={styles.sheetSubtitle}>المستلم: {editCert?.recipientName}</Text>

            <Text style={styles.fieldLabel}>عنوان الشهادة *</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              textAlign="right"
              placeholderTextColor={Colors.textLight}
              placeholder="عنوان الشهادة..."
            />

            <Text style={styles.fieldLabel}>الرسالة التحفيزية (اختياري)</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              value={editMessage}
              onChangeText={setEditMessage}
              textAlign="right"
              multiline
              placeholderTextColor={Colors.textLight}
              placeholder="اكتب رسالة تشجيعية..."
            />

            <Pressable
              style={[styles.issueBtn, { marginTop: 8, opacity: editTitle.trim() ? 1 : 0.5 }]}
              onPress={saveEdit}
              disabled={!editTitle.trim()}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.issueBtnText}>حفظ التعديلات</Text>
            </Pressable>
          </View>
        </View>
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
  tabs: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabBtnActive: { backgroundColor: Colors.accent },
  tabLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)' },
  tabLabelActive: { color: '#fff' },
  tabBadge: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff' },

  body: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 10, marginTop: 4 },

  targetRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  targetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center' },
  targetBtnActive: { backgroundColor: ADMIN_COLOR, borderColor: ADMIN_COLOR },
  targetLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  templateRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 2, paddingBottom: 4 },
  templateChip: { alignItems: 'center', gap: 6, borderRadius: 12, padding: 10, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, minWidth: 80 },
  templateIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  templateLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'center' },

  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  recipientRowActive: { borderColor: ADMIN_COLOR, backgroundColor: ADMIN_COLOR + '12' },
  recipientAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  recipientAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  recipientName: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },

  issueBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  issueBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },

  pendingCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.border },
  pendingIssuer: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  pendingActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ef4444', borderRadius: 10, padding: 10 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', borderRadius: 10, padding: 10 },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },

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

  certActions: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 10, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  certActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  certActionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  certActionDivider: { width: 1, backgroundColor: Colors.border },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  viewSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  viewSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  viewSheetTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text },
  viewActionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  downloadBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  downloadGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  downloadBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
