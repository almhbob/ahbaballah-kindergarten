import React, { useMemo, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useAppData, Student } from '@/contexts/AppDataContext';

const PARENT_COLOR = '#7B3FA0';

function GradeBar({ score, total, color }: { score: number; total: number; color: string }) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={pb.barTrack}>
        <View style={[pb.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[pb.score, { color }]}>{score}/{total}</Text>
    </View>
  );
}

function EditProfileModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const { updateStudent } = useAppData();
  const insets = useSafeAreaInsets();
  const [parentName, setParentName] = useState(student.parentName);
  const [parentPhone, setParentPhone] = useState(student.parentPhone);
  const [emergencyPhone, setEmergencyPhone] = useState(student.emergencyPhone ?? '');
  const [parentRelation, setParentRelation] = useState(student.parentRelation ?? '');

  const handleSave = () => {
    if (!parentName.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال الاسم'); return; }
    updateStudent(student.id, {
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      emergencyPhone: emergencyPhone.trim() || undefined,
      parentRelation: parentRelation.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[ef.container, { paddingTop: insets.top + 16 }]}>
        <View style={ef.header}>
          <Pressable onPress={onClose} style={ef.closeBtn}><Text style={ef.closeTxt}>إلغاء</Text></Pressable>
          <Text style={ef.title}>تعديل بياناتي</Text>
          <Pressable onPress={handleSave} style={ef.saveBtn}><Text style={ef.saveTxt}>حفظ</Text></Pressable>
        </View>
        <ScrollView style={{ flex: 1, padding: 18 }} keyboardShouldPersistTaps="handled">
          <Text style={ef.label}>الاسم الكامل *</Text>
          <TextInput style={ef.input} value={parentName} onChangeText={setParentName} placeholder="اسم ولي الأمر" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={ef.label}>رقم الجوال</Text>
          <TextInput style={ef.input} value={parentPhone} onChangeText={setParentPhone} placeholder="+249..." placeholderTextColor={Colors.textLight} textAlign="right" keyboardType="phone-pad" />

          <Text style={ef.label}>جوال الطوارئ</Text>
          <TextInput style={ef.input} value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="+249... (جوال بديل)" placeholderTextColor={Colors.textLight} textAlign="right" keyboardType="phone-pad" />

          <Text style={ef.label}>صفة ولي الأمر</Text>
          <View style={ef.pillRow}>
            {['الأب', 'الأم', 'الجد', 'الجدة', 'الأخ', 'أخرى'].map(rel => (
              <Pressable key={rel} style={[ef.pill, parentRelation === rel && ef.pillActive]} onPress={() => setParentRelation(rel)}>
                <Text style={[ef.pillText, parentRelation === rel && ef.pillTextActive]}>{rel}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ChildProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { students, appSettings, consentRequests } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [showEdit, setShowEdit] = useState(false);

  const child = students.find(s => s.id === user?.studentId) || students[0] || null;

  const avgGrade = useMemo(() => {
    if (!child?.grades?.length) return 0;
    return Math.round(child.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / child.grades.length);
  }, [child?.grades]);

  const pendingConsents = useMemo(() => {
    if (!child) return 0;
    return consentRequests.filter(r =>
      r.status === 'active' &&
      (r.targetLevel === 'الكل' || r.targetLevel === child.level) &&
      r.responses.find(res => res.studentId === child.id)?.response === 'pending'
    ).length;
  }, [consentRequests, child]);

  if (!child) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={s.emptyText}>لا توجد بيانات طالب مرتبطة بهذا الحساب</Text>
      </View>
    );
  }

  const behColor = { 'ممتاز': Colors.success, 'جيد': '#3B82F6', 'مقبول': Colors.warning, 'يحتاج متابعة': Colors.danger }[child.behavior] ?? Colors.textLight;
  const hwColor = { 'منجز': Colors.success, 'ناقص': Colors.warning, 'لم ينجز': Colors.danger }[child.homework] ?? Colors.textLight;
  const attColor = child.attendance >= 90 ? Colors.success : child.attendance >= 75 ? Colors.warning : Colors.danger;
  const latestAssessment = child.assessments.length > 0 ? child.assessments[child.assessments.length - 1] : null;
  const latestReport = child.dailyReports.length > 0 ? child.dailyReports[child.dailyReports.length - 1] : null;
  const health = child.healthInfo;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#2d0e4e', '#4a1880', PARENT_COLOR]} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>ملف الطالب</Text>
            <Text style={s.headerSub}>{appSettings.academicYear ?? '2025-2026'}</Text>
          </View>
          <Pressable onPress={() => setShowEdit(true)} style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={s.childCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{child.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.childName}>{child.name}</Text>
            <Text style={s.childLevel}>{child.level}</Text>
            {child.gender && <Text style={s.childMeta}>{child.gender}{child.nationality ? ` · ${child.nationality}` : ''}</Text>}
            {child.bloodType && <Text style={s.childMeta}>فصيلة الدم: {child.bloodType}</Text>}
          </View>
        </View>

        <View style={s.parentInfoRow}>
          <MaterialCommunityIcons name="account-tie" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={s.parentInfoText}>{child.parentName}{child.parentRelation ? ` (${child.parentRelation})` : ''} · {child.parentPhone}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPadding }}>

        {pendingConsents > 0 && (
          <Pressable style={s.consentBanner} onPress={() => router.push('/(parent)/consents')}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.consentBannerTitle}>لديك {pendingConsents} طلب موافقة بانتظارك</Text>
              <Text style={s.consentBannerSub}>اضغط للرد على طلبات الرحلات والأنشطة</Text>
            </View>
            <View style={s.consentBannerIcon}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={PARENT_COLOR} />
              {pendingConsents > 0 && (
                <View style={s.consentBadge}><Text style={s.consentBadgeText}>{pendingConsents}</Text></View>
              )}
            </View>
          </Pressable>
        )}

        <Text style={s.sectionTitle}>نظرة عامة</Text>
        <View style={s.overviewGrid}>
          {[
            { icon: 'calendar-check', label: 'الحضور', value: `${child.attendance}%`, color: attColor },
            { icon: 'chart-bar',      label: 'المعدل',  value: `${avgGrade}%`,          color: avgGrade >= 80 ? Colors.success : Colors.warning },
            { icon: 'emoticon',       label: 'السلوك',  value: child.behavior,           color: behColor },
            { icon: 'book-check',     label: 'الواجبات',value: child.homework,            color: hwColor },
          ].map((item, i) => (
            <View key={i} style={s.overviewCard}>
              <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
              <Text style={[s.overviewValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.overviewLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {health && (
          <>
            <Text style={s.sectionTitle}>المعلومات الصحية</Text>
            <View style={s.healthCard}>
              {health.allergies.length > 0 && (
                <View style={s.healthRow}>
                  <View style={s.healthAlertTags}>
                    {health.allergies.map((a, i) => (
                      <View key={i} style={[s.healthTag, { backgroundColor: Colors.danger + '18' }]}>
                        <Text style={[s.healthTagText, { color: Colors.danger }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.healthKey}>حساسية:</Text>
                </View>
              )}
              {health.conditions.length > 0 && (
                <View style={s.healthRow}>
                  <View style={s.healthAlertTags}>
                    {health.conditions.map((c, i) => (
                      <View key={i} style={[s.healthTag, { backgroundColor: Colors.warning + '18' }]}>
                        <Text style={[s.healthTagText, { color: Colors.warning }]}>{c}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.healthKey}>حالات طبية:</Text>
                </View>
              )}
              {health.medications.length > 0 && (
                <View style={s.healthRow}>
                  <View style={s.healthAlertTags}>
                    {health.medications.map((m, i) => (
                      <View key={i} style={[s.healthTag, { backgroundColor: '#3B82F620' }]}>
                        <Text style={[s.healthTagText, { color: '#3B82F6' }]}>{m}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.healthKey}>أدوية:</Text>
                </View>
              )}
              {health.doctorName && (
                <View style={[s.healthRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10, marginTop: 4 }]}>
                  <Text style={s.healthVal}>{health.doctorName} · {health.doctorPhone}</Text>
                  <Text style={s.healthKey}>الطبيب:</Text>
                </View>
              )}
              {!health.allergies.length && !health.conditions.length && !health.medications.length && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.success }}>لا توجد تنبيهات صحية</Text>
                </View>
              )}
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>سجل الدرجات</Text>
        {child.grades.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا توجد درجات مسجلة بعد</Text></View>
        ) : (
          <View style={s.card}>
            {child.grades.map((g, i) => {
              const pct = g.total > 0 ? Math.round((g.score / g.total) * 100) : 0;
              const gc = pct >= 80 ? Colors.success : pct >= 60 ? Colors.warning : Colors.danger;
              return (
                <View key={i} style={[s.gradeRow, i > 0 && s.gradeSep]}>
                  <Text style={s.gradeDate}>{g.date}</Text>
                  <GradeBar score={g.score} total={g.total} color={gc} />
                  <Text style={s.gradeSubject}>{g.subject}</Text>
                </View>
              );
            })}
          </View>
        )}

        {latestAssessment && (
          <>
            <Text style={s.sectionTitle}>آخر تقييم شامل</Text>
            <View style={s.card}>
              <View style={s.assRow}>
                <Text style={s.assDate}>{latestAssessment.date}</Text>
                <View style={[s.assBadge, { backgroundColor: latestAssessment.levelLabel === 'ممتاز' ? Colors.success + '20' : Colors.warning + '20' }]}>
                  <Text style={[s.assBadgeText, { color: latestAssessment.levelLabel === 'ممتاز' ? Colors.success : Colors.warning }]}>{latestAssessment.levelLabel}</Text>
                </View>
              </View>
              {[
                { label: 'الحروف',    score: latestAssessment.lettersScore, max: latestAssessment.lettersMax },
                { label: 'الأرقام',   score: latestAssessment.numbersScore, max: latestAssessment.numbersMax },
                { label: 'الرياضيات', score: latestAssessment.mathScore,    max: latestAssessment.mathMax },
              ].map((a, i) => {
                const pct = a.max > 0 ? Math.round((a.score / a.max) * 100) : 0;
                return (
                  <View key={i} style={s.assItem}>
                    <Text style={s.assItemLabel}>{a.label}</Text>
                    <GradeBar score={a.score} total={a.max} color={pct >= 80 ? Colors.success : Colors.warning} />
                  </View>
                );
              })}
              <View style={s.assTotalRow}>
                <Text style={s.assTotalLabel}>المجموع الكلي</Text>
                <Text style={s.assTotalValue}>{latestAssessment.totalScore}/{latestAssessment.totalMax}</Text>
              </View>
            </View>
          </>
        )}

        {latestReport && (
          <>
            <Text style={s.sectionTitle}>آخر تقرير يومي</Text>
            <View style={s.card}>
              <Text style={s.reportDate}>{latestReport.date}</Text>
              <View style={s.reportGrid}>
                {[
                  { icon: 'food-apple',          label: 'الطعام', value: latestReport.ate,     color: Colors.success },
                  { icon: 'book-open-variant',    label: 'التعلم', value: latestReport.learned, color: '#3B82F6' },
                  { icon: 'emoticon-happy-outline',label: 'المزاج', value: latestReport.mood,    color: PARENT_COLOR },
                ].map((item, i) => (
                  <View key={i} style={s.reportItem}>
                    <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                    <Text style={s.reportLabel}>{item.label}</Text>
                    <Text style={[s.reportValue, { color: item.color }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
              {latestReport.behaviorNote ? (
                <View style={s.noteRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.textLight} />
                  <Text style={s.noteText}>{latestReport.behaviorNote}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {child.notes ? (
          <>
            <Text style={s.sectionTitle}>ملاحظات المعلمة</Text>
            <View style={[s.card, s.notesCard]}>
              <Ionicons name="document-text-outline" size={18} color={PARENT_COLOR} />
              <Text style={s.notesText}>{child.notes}</Text>
            </View>
          </>
        ) : null}

        <Text style={s.sectionTitle}>روابط سريعة</Text>
        <View style={s.quickRow}>
          <Pressable style={s.quickBtn} onPress={() => { router.push('/(parent)/fees'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color={Colors.success} />
            <Text style={s.quickBtnText}>الرسوم</Text>
          </Pressable>
          <Pressable style={s.quickBtn} onPress={() => { router.push('/(parent)/report'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <MaterialCommunityIcons name="clipboard-text" size={20} color="#3B82F6" />
            <Text style={s.quickBtnText}>سجل المتابعة</Text>
          </Pressable>
          <Pressable style={s.quickBtn} onPress={() => { router.push('/(parent)/consents'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={PARENT_COLOR} />
            <Text style={s.quickBtnText}>الموافقات</Text>
            {pendingConsents > 0 && (
              <View style={s.quickBadge}><Text style={s.quickBadgeText}>{pendingConsents}</Text></View>
            )}
          </Pressable>
          <Pressable style={s.quickBtn} onPress={() => { router.push('/(parent)/messages'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.warning} />
            <Text style={s.quickBtnText}>التواصل</Text>
          </Pressable>
        </View>
      </ScrollView>

      {showEdit && <EditProfileModal student={child} onClose={() => setShowEdit(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  childCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, marginBottom: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#fff' },
  childName: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff' },
  childLevel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  childMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  parentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  parentInfoText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  consentBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: PARENT_COLOR + '12', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: PARENT_COLOR + '30' },
  consentBannerTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: PARENT_COLOR },
  consentBannerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  consentBannerIcon: { position: 'relative' },
  consentBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  consentBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', borderRightWidth: 3, borderRightColor: PARENT_COLOR, paddingRight: 10 },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  overviewCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border },
  overviewValue: { fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  overviewLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  healthCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  healthRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'flex-start' },
  healthKey: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, paddingTop: 2, minWidth: 70, textAlign: 'right' },
  healthVal: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, flex: 1, textAlign: 'right' },
  healthAlertTags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  healthTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  healthTagText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  gradeRow: { gap: 4, paddingVertical: 8 },
  gradeSep: { borderTopWidth: 1, borderTopColor: Colors.border },
  gradeSubject: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  gradeDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  assRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  assDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  assBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  assBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  assItem: { gap: 4, marginBottom: 8 },
  assItemLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  assTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  assTotalLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  assTotalValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: PARENT_COLOR },
  reportDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginBottom: 10 },
  reportGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  reportItem: { alignItems: 'center', gap: 4 },
  reportLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  reportValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  noteRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: Colors.background, borderRadius: 8, padding: 8 },
  noteText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  notesCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  notesText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', lineHeight: 20 },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6, padding: 12, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  quickBtnText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.textLight, textAlign: 'center' },
  quickBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: Colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  quickBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' },
});

const pb = StyleSheet.create({
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  score: { fontSize: 12, fontFamily: 'Inter_600SemiBold', minWidth: 40, textAlign: 'left' },
});

const ef = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.danger },
  saveBtn: { backgroundColor: PARENT_COLOR, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 18, borderWidth: 1, borderColor: Colors.border },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 18 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: PARENT_COLOR, borderColor: PARENT_COLOR },
  pillText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },
});
