import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';

const TEACHER_COLOR = '#1A6B5C';

const SUBJECTS = ['الرياضيات', 'اللغة العربية', 'العلوم', 'التربية الإسلامية', 'اللغة الإنجليزية'];

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', flex: 1 }}>
      <View style={{ height: 8, width: `${pct}%` as any, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

function MiniDonut({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: Colors.border }} />
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: color, borderTopColor: 'transparent', borderLeftColor: pct > 50 ? color : 'transparent', transform: [{ rotate: `${(pct / 100) * 360}deg` }] }} />
      <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color }}>{pct}%</Text>
    </View>
  );
}

type Tab = 'grades' | 'behavior' | 'atrisk' | 'homework';

export default function TeacherPerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const teacherClass = (user as any)?.teacherClass as string | undefined;
  const myStudents = teacherClass ? students.filter(s => s.level === teacherClass) : students;

  const [activeTab, setActiveTab] = useState<Tab>('grades');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const subjectStats = useMemo(() => {
    return SUBJECTS.map(sub => {
      const grades = myStudents.flatMap(s =>
        s.grades.filter(g => g.subject === sub).map(g => Math.round((g.score / g.total) * 100))
      );
      if (grades.length === 0) return { subject: sub, avg: 0, max: 0, min: 0, passing: 0, count: 0 };
      const avg = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
      const passing = grades.filter(g => g >= 60).length;
      return { subject: sub, avg, max: Math.max(...grades), min: Math.min(...grades), passing, count: grades.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);
  }, [myStudents]);

  const overallAvg = useMemo(() => {
    const all = myStudents.flatMap(s => s.grades.map(g => Math.round((g.score / g.total) * 100)));
    return all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [myStudents]);

  const behaviorDist = useMemo(() => {
    const counts: Record<string, number> = { 'ممتاز': 0, 'جيد': 0, 'مقبول': 0, 'يحتاج متابعة': 0 };
    myStudents.forEach(s => { counts[s.behavior] = (counts[s.behavior] ?? 0) + 1; });
    return counts;
  }, [myStudents]);

  const attendanceAvg = useMemo(() => {
    if (!myStudents.length) return 0;
    return Math.round(myStudents.reduce((a, s) => a + s.attendance, 0) / myStudents.length);
  }, [myStudents]);

  const topStudents = useMemo(() => {
    return [...myStudents]
      .map(s => {
        const all = s.grades.map(g => Math.round((g.score / g.total) * 100));
        const avg = all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
        return { ...s, avg };
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [myStudents]);

  const atRiskStudents = useMemo(() => {
    return myStudents
      .map(s => {
        const all = s.grades.map(g => Math.round((g.score / g.total) * 100));
        const avg = all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
        const risks: string[] = [];
        if (s.attendance < 75) risks.push('حضور منخفض');
        if (avg > 0 && avg < 60) risks.push('درجات ضعيفة');
        if (s.behavior === 'يحتاج متابعة') risks.push('سلوك يحتاج متابعة');
        if (s.homework === 'لم ينجز') risks.push('واجبات غير منجزة');
        return { ...s, avg, risks };
      })
      .filter(s => s.risks.length > 0)
      .sort((a, b) => b.risks.length - a.risks.length);
  }, [myStudents]);

  const homeworkStats = useMemo(() => {
    const done = myStudents.filter(s => s.homework === 'منجز').length;
    const partial = myStudents.filter(s => s.homework === 'ناقص').length;
    const missing = myStudents.filter(s => s.homework === 'لم ينجز').length;
    const total = myStudents.length;
    return { done, partial, missing, total, donePct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [myStudents]);

  const behaviorColors: Record<string, string> = {
    'ممتاز': Colors.success, 'جيد': '#3B82F6', 'مقبول': Colors.warning, 'يحتاج متابعة': Colors.danger,
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'grades',   label: 'الدرجات',   icon: 'chart-bar' },
    { key: 'behavior', label: 'السلوك',    icon: 'emoticon-outline' },
    { key: 'homework', label: 'الواجبات',  icon: 'book-check-outline' },
    { key: 'atrisk',   label: `خطر (${atRiskStudents.length})`, icon: 'alert-circle-outline' },
  ];

  return (
    <View style={s.container}>
      <LinearGradient colors={['#061e1a','#0d3d35',TEACHER_COLOR]} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>تحليل الأداء</Text>
            <Text style={s.headerSub}>{teacherClass ?? 'جميع الفصول'} — {myStudents.length} طالب</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.statsRow}>
          {[
            { label: 'متوسط الدرجات',  value: `${overallAvg}%`,      icon: 'chart-arc',         color: '#FFD700' },
            { label: 'متوسط الحضور',   value: `${attendanceAvg}%`,   icon: 'calendar-check',    color: '#6EE7B7' },
            { label: 'عدد الطلاب',     value: String(myStudents.length), icon: 'account-group', color: '#93C5FD' },
            { label: 'في خطر',         value: String(atRiskStudents.length), icon: 'alert-circle', color: atRiskStudents.length > 0 ? '#FCA5A5' : '#6EE7B7' },
          ].map((stat, i) => (
            <View key={i} style={s.statBox}>
              <MaterialCommunityIcons name={stat.icon as any} size={18} color={stat.color} />
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => { setActiveTab(tab.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <MaterialCommunityIcons name={tab.icon as any} size={14} color={activeTab === tab.key ? TEACHER_COLOR : 'rgba(255,255,255,0.7)'} />
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPadding }}>

        {activeTab === 'grades' && (
          <>
            <Text style={s.sectionTitle}>أداء المواد الدراسية</Text>
            {subjectStats.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialCommunityIcons name="chart-bar" size={40} color={Colors.textLight} />
                <Text style={s.emptyText}>لا توجد درجات مسجلة بعد</Text>
              </View>
            ) : (
              subjectStats.map((sub, i) => (
                <Pressable key={sub.subject} style={s.subjectCard}
                  onPress={() => { setExpandedSubject(expandedSubject === sub.subject ? null : sub.subject); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={s.subjectTop}>
                    <View style={s.rankBadge}><Text style={s.rankText}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={s.subjectRow}>
                        <Text style={[s.subjectAvg, { color: sub.avg >= 80 ? Colors.success : sub.avg >= 60 ? Colors.warning : Colors.danger }]}>{sub.avg}%</Text>
                        <Text style={s.subjectName}>{sub.subject}</Text>
                      </View>
                      <Bar pct={sub.avg} color={sub.avg >= 80 ? Colors.success : sub.avg >= 60 ? Colors.warning : Colors.danger} />
                    </View>
                  </View>
                  {expandedSubject === sub.subject && (
                    <View style={s.subjectDetail}>
                      {[
                        { label: 'أعلى درجة', value: `${sub.max}%`, color: Colors.success },
                        { label: 'أدنى درجة', value: `${sub.min}%`, color: Colors.danger },
                        { label: 'عدد الاختبارات', value: String(sub.count), color: Colors.text },
                        { label: 'نسبة النجاح', value: `${sub.count > 0 ? Math.round((sub.passing / sub.count) * 100) : 0}%`, color: Colors.success },
                      ].map((d, di) => (
                        <View key={di} style={s.detailRow}>
                          <Text style={[s.detailValue, { color: d.color }]}>{d.value}</Text>
                          <Text style={s.detailLabel}>{d.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              ))
            )}

            <Text style={s.sectionTitle}>أفضل 5 طلاب</Text>
            {topStudents.map((st, i) => (
              <View key={st.id} style={s.topStudentRow}>
                <Text style={[s.topRank, { color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : Colors.textLight }]}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.topStudentName}>{st.name}</Text>
                  <Text style={s.topStudentLevel}>{st.level}</Text>
                </View>
                <View style={[s.topAvgBadge, { backgroundColor: st.avg >= 80 ? Colors.success + '20' : Colors.warning + '20' }]}>
                  <Text style={[s.topAvg, { color: st.avg >= 80 ? Colors.success : Colors.warning }]}>{st.avg}%</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'behavior' && (
          <>
            <Text style={s.sectionTitle}>توزيع السلوك</Text>
            <View style={s.behaviorCard}>
              {Object.entries(behaviorDist).map(([beh, count]) => (
                <View key={beh} style={s.behaviorRow}>
                  <View style={{ width: 60, alignItems: 'flex-end' }}>
                    <Text style={[s.behaviorCount, { color: behaviorColors[beh] }]}>{count}</Text>
                  </View>
                  <Bar pct={myStudents.length > 0 ? (count / myStudents.length) * 100 : 0} color={behaviorColors[beh]} />
                  <Text style={s.behaviorLabel}>{beh}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>معدلات الحضور</Text>
            <View style={s.attendanceCard}>
              {[
                { label: 'ممتاز (≥90%)', count: myStudents.filter(s => s.attendance >= 90).length, color: Colors.success },
                { label: 'جيد (75-89%)', count: myStudents.filter(s => s.attendance >= 75 && s.attendance < 90).length, color: Colors.warning },
                { label: 'ضعيف (<75%)', count: myStudents.filter(s => s.attendance < 75).length, color: Colors.danger },
              ].map((att, i) => (
                <View key={i} style={s.attRow}>
                  <Text style={[s.attCount, { color: att.color }]}>{att.count}</Text>
                  <Bar pct={myStudents.length > 0 ? (att.count / myStudents.length) * 100 : 0} color={att.color} />
                  <Text style={s.attLabel}>{att.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'homework' && (
          <>
            <Text style={s.sectionTitle}>إنجاز الواجبات</Text>
            <View style={s.hwCard}>
              <View style={s.hwTop}>
                <MiniDonut pct={homeworkStats.donePct} color={Colors.success} size={72} />
                <View style={{ flex: 1, gap: 10 }}>
                  {[
                    { label: 'منجز', count: homeworkStats.done, color: Colors.success },
                    { label: 'ناقص', count: homeworkStats.partial, color: Colors.warning },
                    { label: 'لم ينجز', count: homeworkStats.missing, color: Colors.danger },
                  ].map((hw, i) => (
                    <View key={i} style={s.hwRow}>
                      <Text style={[s.hwCount, { color: hw.color }]}>{hw.count}</Text>
                      <Bar pct={homeworkStats.total > 0 ? (hw.count / homeworkStats.total) * 100 : 0} color={hw.color} />
                      <Text style={s.hwLabel}>{hw.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Text style={s.sectionTitle}>الطلاب الذين لم ينجزوا الواجبات</Text>
            {myStudents.filter(s => s.homework !== 'منجز').length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialCommunityIcons name="check-all" size={36} color={Colors.success} />
                <Text style={[s.emptyText, { color: Colors.success }]}>جميع الطلاب أنجزوا واجباتهم</Text>
              </View>
            ) : (
              myStudents.filter(s => s.homework !== 'منجز').map(st => (
                <View key={st.id} style={s.hwStudentRow}>
                  <View style={[s.hwStatusDot, { backgroundColor: st.homework === 'ناقص' ? Colors.warning : Colors.danger }]} />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.hwStudentName}>{st.name}</Text>
                    <Text style={s.hwStudentLevel}>{st.level}</Text>
                  </View>
                  <View style={[s.hwBadge, { backgroundColor: st.homework === 'ناقص' ? Colors.warning + '18' : Colors.danger + '18' }]}>
                    <Text style={[s.hwBadgeText, { color: st.homework === 'ناقص' ? Colors.warning : Colors.danger }]}>{st.homework}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'atrisk' && (
          <>
            <Text style={s.sectionTitle}>
              {atRiskStudents.length > 0 ? `الطلاب الذين يحتاجون متابعة (${atRiskStudents.length})` : 'الطلاب في خطر'}
            </Text>
            {atRiskStudents.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialCommunityIcons name="shield-check" size={48} color={Colors.success} />
                <Text style={[s.emptyText, { color: Colors.success }]}>ممتاز! لا يوجد طلاب في وضع خطر</Text>
                <Text style={s.emptySubText}>جميع الطلاب يؤدون بشكل مقبول</Text>
              </View>
            ) : (
              atRiskStudents.map(st => (
                <View key={st.id} style={s.riskCard}>
                  <View style={s.riskTop}>
                    <View style={s.riskBadge}>
                      <Text style={s.riskBadgeText}>{st.risks.length}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={s.riskName}>{st.name}</Text>
                      <Text style={s.riskLevel}>{st.level} · حضور: {st.attendance}% · معدل: {st.avg}%</Text>
                    </View>
                  </View>
                  <View style={s.riskTags}>
                    {st.risks.map((r, ri) => (
                      <View key={ri} style={s.riskTag}>
                        <Ionicons name="warning" size={11} color={Colors.danger} />
                        <Text style={s.riskTagText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  statLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  tabsRow: { gap: 8, paddingRight: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: TEACHER_COLOR, fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', borderRightWidth: 3, borderRightColor: TEACHER_COLOR, paddingRight: 10 },
  subjectCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.textLight },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subjectName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  subjectAvg: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  subjectDetail: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  behaviorCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  behaviorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  behaviorCount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  behaviorLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight, width: 90, textAlign: 'right' },
  attendanceCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attCount: { fontSize: 16, fontFamily: 'Inter_700Bold', width: 26, textAlign: 'right' },
  attLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textLight, width: 80, textAlign: 'right' },
  hwCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  hwTop: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  hwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hwCount: { fontSize: 14, fontFamily: 'Inter_700Bold', width: 24, textAlign: 'right' },
  hwLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight, width: 60, textAlign: 'right' },
  hwStudentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: Colors.border },
  hwStatusDot: { width: 10, height: 10, borderRadius: 5 },
  hwStudentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  hwStudentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  hwBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hwBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  topStudentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: Colors.border },
  topRank: { fontSize: 18, fontFamily: 'Inter_700Bold', width: 30, textAlign: 'center' },
  topStudentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  topStudentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  topAvgBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  topAvg: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  riskCard: { backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.danger + '30' },
  riskTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  riskBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  riskBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  riskName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  riskLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  riskTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  riskTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.danger + '12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  riskTagText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.danger },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'center' },
  emptySubText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
});
