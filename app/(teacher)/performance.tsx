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

export default function TeacherPerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const teacherClass = (user as any)?.teacherClass as string | undefined;
  const myStudents = teacherClass ? students.filter(s => s.level === teacherClass) : students;

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjectStats = useMemo(() => {
    return SUBJECTS.map(sub => {
      const grades = myStudents.flatMap(s =>
        s.grades.filter(g => g.subject === sub).map(g => Math.round((g.score / g.total) * 100))
      );
      if (grades.length === 0) return { subject: sub, avg: 0, max: 0, min: 0, passing: 0, count: 0 };
      const avg = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
      const passing = grades.filter(g => g >= 60).length;
      return { subject: sub, avg, max: Math.max(...grades), min: Math.min(...grades), passing, count: grades.length };
    }).sort((a, b) => b.avg - a.avg);
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

  const behaviorColors: Record<string, string> = {
    'ممتاز': Colors.success, 'جيد': '#3B82F6', 'مقبول': Colors.warning, 'يحتاج متابعة': Colors.danger,
  };

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
            { label: 'متوسط الدرجات', value: `${overallAvg}%`, icon: 'chart-arc',        color: '#FFD700' },
            { label: 'متوسط الحضور',  value: `${attendanceAvg}%`, icon: 'calendar-check', color: '#6EE7B7' },
            { label: 'عدد الطلاب',    value: String(myStudents.length), icon: 'account-group', color: '#93C5FD' },
          ].map((stat, i) => (
            <View key={i} style={s.statBox}>
              <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPadding }}>
        <Text style={s.sectionTitle}>أداء المواد</Text>
        {subjectStats.map((sub, i) => (
          <Pressable key={sub.subject} style={s.subjectCard}
            onPress={() => { setSelectedSubject(selectedSubject === sub.subject ? null : sub.subject); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <View style={s.subjectTop}>
              <View style={s.rankBadge}>
                <Text style={s.rankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.subjectRow}>
                  <Text style={[s.subjectAvg, { color: sub.avg >= 80 ? Colors.success : sub.avg >= 60 ? Colors.warning : Colors.danger }]}>
                    {sub.avg}%
                  </Text>
                  <Text style={s.subjectName}>{sub.subject}</Text>
                </View>
                <Bar pct={sub.avg} color={sub.avg >= 80 ? Colors.success : sub.avg >= 60 ? Colors.warning : Colors.danger} />
              </View>
            </View>
            {selectedSubject === sub.subject && sub.count > 0 && (
              <View style={s.subjectDetail}>
                <View style={s.detailRow}><Text style={s.detailLabel}>أعلى درجة</Text><Text style={[s.detailValue, { color: Colors.success }]}>{sub.max}%</Text></View>
                <View style={s.detailRow}><Text style={s.detailLabel}>أدنى درجة</Text><Text style={[s.detailValue, { color: Colors.danger }]}>{sub.min}%</Text></View>
                <View style={s.detailRow}><Text style={s.detailLabel}>عدد الاختبارات</Text><Text style={s.detailValue}>{sub.count}</Text></View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>نسبة النجاح</Text>
                  <Text style={[s.detailValue, { color: Colors.success }]}>{sub.count > 0 ? Math.round((sub.passing / sub.count) * 100) : 0}%</Text>
                </View>
              </View>
            )}
          </Pressable>
        ))}

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
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
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
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  behaviorCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  behaviorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  behaviorCount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  behaviorLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight, width: 90, textAlign: 'right' },
  topStudentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: Colors.border },
  topRank: { fontSize: 18, fontFamily: 'Inter_700Bold', width: 30, textAlign: 'center' },
  topStudentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  topStudentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  topAvgBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  topAvg: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});
