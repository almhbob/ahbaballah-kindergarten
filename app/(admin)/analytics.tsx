import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData } from '@/contexts/AppDataContext';

const LEVEL_COLORS: Record<string, string> = {
  'براعم': '#EC4899', 'مستوى أول': '#3B82F6', 'مستوى ثاني': '#10B981',
};

function StatCard({ label, value, icon, color, sub }: { label: string; value: string; icon: string; color: string; sub?: string }) {
  return (
    <View style={[sc.card, { borderLeftColor: color }]}>
      <View style={[sc.icon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sc.label}>{label}</Text>
        {sub && <Text style={sc.sub}>{sub}</Text>}
      </View>
      <Text style={[sc.value, { color }]}>{value}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4 },
  icon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  sub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 1 },
  value: { fontSize: 20, fontFamily: 'Inter_700Bold' },
});

function BarChart({ data, max, color }: { data: { label: string; value: number }[]; max: number; color: string }) {
  return (
    <View style={{ gap: 8 }}>
      {data.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, width: 60, textAlign: 'right' }} numberOfLines={1}>{item.label}</Text>
          <View style={{ flex: 1, height: 10, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden' }}>
            <View style={{ height: 10, width: `${max > 0 ? (item.value / max) * 100 : 0}%` as any, backgroundColor: color, borderRadius: 5 }} />
          </View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color, width: 30, textAlign: 'left' }}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { students, employees, messages, schoolEvents, meetings, registrationRequests } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const totalStudents = students.length;
  const avgAttendance = totalStudents > 0
    ? Math.round(students.reduce((a, s) => a + s.attendance, 0) / totalStudents) : 0;

  const byLevel = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => { map[s.level] = (map[s.level] ?? 0) + 1; });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [students]);

  const byBehavior = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => { map[s.behavior] = (map[s.behavior] ?? 0) + 1; });
    return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [students]);

  const gradeDistrib = useMemo(() => {
    const bins = [
      { label: '90-100', min: 90, max: 100, count: 0 },
      { label: '75-89',  min: 75, max: 89,  count: 0 },
      { label: '60-74',  min: 60, max: 74,  count: 0 },
      { label: '0-59',   min: 0,  max: 59,  count: 0 },
    ];
    students.forEach(s => {
      if (s.grades.length === 0) return;
      const avg = Math.round(s.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / s.grades.length);
      const bin = bins.find(b => avg >= b.min && avg <= b.max);
      if (bin) bin.count++;
    });
    return bins.map(b => ({ label: b.label, value: b.count }));
  }, [students]);

  const pendingRegs = registrationRequests.filter(r => r.status === 'pending').length;
  const approvedRegs = registrationRequests.filter(r => r.status === 'approved').length;

  const totalPayroll = employees.reduce((a, e) => a + e.salary, 0);
  const avgSalary = employees.length > 0 ? Math.round(totalPayroll / employees.length) : 0;

  const upcomingEvents = schoolEvents.filter(e => e.date >= new Date().toISOString().split('T')[0]).length;

  const behaviorColors: Record<string, string> = {
    'ممتاز': Colors.success, 'جيد': '#3B82F6', 'مقبول': Colors.warning, 'يحتاج متابعة': Colors.danger,
  };

  const hwDist = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => { map[s.homework] = (map[s.homework] ?? 0) + 1; });
    return map;
  }, [students]);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030612','#050c38','#0d1463']} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>التحليلات والإحصائيات</Text>
            <Text style={s.headerSub}>نظرة شاملة على أداء الروضة</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.heroStats}>
          {[
            { label: 'طلاب',    value: String(totalStudents), color: '#93C5FD' },
            { label: 'حضور متوسط', value: `${avgAttendance}%`, color: '#6EE7B7' },
            { label: 'موظفون', value: String(employees.length), color: '#C4B5FD' },
            { label: 'فعاليات', value: String(upcomingEvents), color: '#FCD34D' },
          ].map((st, i) => (
            <View key={i} style={s.heroStatItem}>
              <Text style={[s.heroStatValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.heroStatLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPadding }}>
        <Text style={s.sectionTitle}>مؤشرات الطلاب</Text>
        <StatCard label="إجمالي الطلاب" value={String(totalStudents)} icon="account-group" color="#3B82F6" sub="في جميع المستويات" />
        <StatCard label="متوسط الحضور" value={`${avgAttendance}%`} icon="calendar-check" color={avgAttendance >= 85 ? Colors.success : Colors.warning} sub="عبر جميع الفصول" />
        <StatCard label="طلاب بسلوك ممتاز" value={String(students.filter(s => s.behavior === 'ممتاز').length)} icon="star" color={Colors.success} sub={`${totalStudents > 0 ? Math.round((students.filter(s => s.behavior === 'ممتاز').length / totalStudents) * 100) : 0}% من الإجمالي`} />
        <StatCard label="واجبات منجزة" value={String(hwDist['منجز'] ?? 0)} icon="book-check" color="#3B82F6" sub={`متأخرة: ${hwDist['لم ينجز'] ?? 0} · ناقصة: ${hwDist['ناقص'] ?? 0}`} />

        <Text style={s.sectionTitle}>توزيع الطلاب بالمستوى</Text>
        <View style={s.card}>
          {byLevel.map((item, i) => (
            <View key={i} style={[s.levelRow, i > 0 && s.rowSep]}>
              <View style={[s.levelDot, { backgroundColor: LEVEL_COLORS[item.label] ?? Colors.accent }]} />
              <Text style={s.levelLabel}>{item.label}</Text>
              <View style={{ flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 }}>
                <View style={{ height: 8, width: `${totalStudents > 0 ? (item.value / totalStudents) * 100 : 0}%` as any, backgroundColor: LEVEL_COLORS[item.label] ?? Colors.accent, borderRadius: 4 }} />
              </View>
              <Text style={s.levelCount}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>توزيع الدرجات</Text>
        <View style={s.card}>
          <BarChart data={gradeDistrib} max={totalStudents} color={Colors.accent} />
        </View>

        <Text style={s.sectionTitle}>السلوك العام</Text>
        <View style={s.card}>
          <BarChart
            data={byBehavior}
            max={Math.max(...byBehavior.map(b => b.value), 1)}
            color={Colors.success}
          />
        </View>

        <Text style={s.sectionTitle}>مؤشرات الموظفين</Text>
        <StatCard label="إجمالي الموظفين" value={String(employees.length)} icon="account-tie" color="#8B5CF6" />
        <StatCard label="إجمالي الرواتب" value={`${totalPayroll.toLocaleString('ar-SA')} ج.س`} icon="cash-multiple" color={Colors.success} sub={`متوسط: ${avgSalary.toLocaleString('ar-SA')} ج.س`} />
        <StatCard label="متوسط الغياب" value={`${employees.length > 0 ? Math.round(employees.reduce((a, e) => a + e.daysAbsent, 0) / employees.length) : 0} يوم`} icon="calendar-remove" color={Colors.warning} />

        <Text style={s.sectionTitle}>مؤشرات التسجيل</Text>
        <StatCard label="طلبات التسجيل" value={String(registrationRequests.length)} icon="account-plus" color="#6366F1" sub={`قيد المراجعة: ${pendingRegs} · مقبول: ${approvedRegs}`} />

        <Text style={s.sectionTitle}>التواصل</Text>
        <StatCard label="إجمالي الرسائل" value={String(messages.length)} icon="message-text" color="#EC4899" sub="بين الإدارة وأولياء الأمور" />
        <StatCard label="الاجتماعات" value={String(meetings.length)} icon="account-group" color="#F59E0B" />
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
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 },
  heroStatItem: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  heroStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', borderRightWidth: 3, borderRightColor: Colors.accent, paddingRight: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  levelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  rowSep: { borderTopWidth: 1, borderTopColor: Colors.border },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  levelLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.text, width: 80, textAlign: 'right', marginLeft: 8 },
  levelCount: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, width: 24, textAlign: 'right' },
});
