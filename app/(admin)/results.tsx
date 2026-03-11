import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { useAppData, YearlySnapshot } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const LEVEL_COLORS: Record<string, string> = {
  'براعم':      '#F59E0B',
  'مستوى أول': '#10B981',
  'مستوى ثاني':'#3B82F6',
};
const LEVELS = ['براعم', 'مستوى أول', 'مستوى ثاني'];

function buildCurrentSnapshot(students: ReturnType<typeof useAppData>['students']): YearlySnapshot {
  const year = String(new Date().getFullYear());
  const levels: YearlySnapshot['levels'] = {};
  for (const level of LEVELS) {
    const group = students.filter(s => s.level === level);
    if (group.length === 0) continue;
    const avgGrade = Math.round(
      group.reduce((sum, s) => {
        if (s.grades.length === 0) return sum + 0;
        return sum + s.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / s.grades.length;
      }, 0) / group.length
    );
    const avgAttendance = Math.round(group.reduce((a, s) => a + s.attendance, 0) / group.length);
    const subjectMap: Record<string, number[]> = {};
    group.forEach(s => s.grades.forEach(g => {
      if (!subjectMap[g.subject]) subjectMap[g.subject] = [];
      subjectMap[g.subject].push((g.score / g.total) * 100);
    }));
    const subjects = Object.entries(subjectMap).map(([name, vals]) => ({
      name,
      avg: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length),
    }));
    levels[level] = { avgGrade, avgAttendance, studentCount: group.length, subjects };
  }
  if (Object.keys(levels).length === 0) {
    LEVELS.forEach(l => {
      levels[l] = { avgGrade: 0, avgAttendance: 0, studentCount: 0, subjects: [] };
    });
  }
  return { year, levels };
}

function BarChart({ snapshots, metric }: { snapshots: YearlySnapshot[]; metric: 'avgGrade' | 'avgAttendance' }) {
  const BAR_W = 24;
  const GAP = 8;
  const GROUP_GAP = 20;
  const H = 160;
  const PADDING_L = 32;
  const PADDING_B = 30;
  const years = snapshots.map(s => s.year);
  const groups = LEVELS;
  const totalW = groups.length * (snapshots.length * (BAR_W + GAP) + GROUP_GAP);
  const svgW = Math.max(totalW + PADDING_L + 10, 300);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
      <Svg width={svgW} height={H + PADDING_B + 10} style={{ overflow: 'visible' }}>
        {[0, 25, 50, 75, 100].map(v => (
          <G key={v}>
            <Line x1={PADDING_L} y1={H - (v / 100) * H} x2={svgW} y2={H - (v / 100) * H} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
            <SvgText x={PADDING_L - 4} y={H - (v / 100) * H + 4} fill={Colors.textLight} fontSize={9} textAnchor="end">{v}</SvgText>
          </G>
        ))}
        {groups.map((level, gi) => {
          const groupX = PADDING_L + gi * (snapshots.length * (BAR_W + GAP) + GROUP_GAP);
          return (
            <G key={level}>
              {snapshots.map((snap, yi) => {
                const val = snap.levels[level]?.[metric] ?? 0;
                const barH = (val / 100) * H;
                const x = groupX + yi * (BAR_W + GAP);
                const color = LEVEL_COLORS[level];
                const opacity = 0.5 + 0.5 * (yi / Math.max(1, snapshots.length - 1));
                return (
                  <G key={yi}>
                    <Rect x={x} y={H - barH} width={BAR_W} height={barH} rx={4} fill={color} opacity={opacity} />
                    <SvgText x={x + BAR_W / 2} y={H - barH - 4} fill={Colors.textSecondary} fontSize={9} textAnchor="middle">{val}%</SvgText>
                    <SvgText x={x + BAR_W / 2} y={H + 14} fill={Colors.textLight} fontSize={8} textAnchor="middle">{snap.year.slice(2)}</SvgText>
                  </G>
                );
              })}
              <SvgText
                x={groupX + (snapshots.length * (BAR_W + GAP)) / 2 - GAP / 2}
                y={H + 26}
                fill={LEVEL_COLORS[level]}
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
              >{level}</SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

function LevelCard({ level, data, rank }: { level: string; data: YearlySnapshot['levels'][string]; rank: number }) {
  const color = LEVEL_COLORS[level];
  const attColor = data.avgAttendance >= 90 ? Colors.success : data.avgAttendance >= 75 ? Colors.warning : Colors.danger;
  const gradeColor = data.avgGrade >= 85 ? Colors.success : data.avgGrade >= 70 ? Colors.warning : Colors.danger;
  return (
    <View style={[sty.levelCard, { borderTopColor: color }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={[sty.rankBadge, { backgroundColor: color + '20' }]}>
          <Text style={[sty.rankText, { color }]}>#{rank}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={sty.levelName}>{level}</Text>
          <Text style={sty.levelCount}>{data.studentCount} طالب</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={[sty.metricBox, { flex: 1, backgroundColor: gradeColor + '12' }]}>
          <Text style={[sty.metricVal, { color: gradeColor }]}>{data.avgGrade}%</Text>
          <Text style={sty.metricLbl}>المعدل</Text>
        </View>
        <View style={[sty.metricBox, { flex: 1, backgroundColor: attColor + '12' }]}>
          <Text style={[sty.metricVal, { color: attColor }]}>{data.avgAttendance}%</Text>
          <Text style={sty.metricLbl}>الحضور</Text>
        </View>
      </View>
      {data.subjects.length > 0 && (
        <View style={{ gap: 6 }}>
          {data.subjects.slice(0, 4).map(sub => (
            <View key={sub.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[sty.subScore, { color: sub.avg >= 85 ? Colors.success : sub.avg >= 70 ? Colors.warning : Colors.danger }]}>{sub.avg}%</Text>
              <View style={{ flex: 1, height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${sub.avg}%`, height: 6, backgroundColor: color, borderRadius: 3, opacity: 0.8 }} />
              </View>
              <Text style={sty.subName}>{sub.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { students, yearlySnapshots } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const currentSnap = useMemo(() => buildCurrentSnapshot(students), [students]);
  const allSnapshots = useMemo(() => {
    const base = yearlySnapshots.filter(s => s.year !== currentSnap.year);
    return [...base, currentSnap].sort((a, b) => a.year.localeCompare(b.year));
  }, [yearlySnapshots, currentSnap]);

  const [selectedYear, setSelectedYear] = useState<string>(currentSnap.year);
  const [metric, setMetric] = useState<'avgGrade' | 'avgAttendance'>('avgGrade');

  const selectedSnap = useMemo(
    () => allSnapshots.find(s => s.year === selectedYear) ?? currentSnap,
    [allSnapshots, selectedYear, currentSnap]
  );

  const sortedLevels = useMemo(() =>
    LEVELS.filter(l => selectedSnap.levels[l]).sort(
      (a, b) => (selectedSnap.levels[b]?.avgGrade ?? 0) - (selectedSnap.levels[a]?.avgGrade ?? 0)
    ),
    [selectedSnap]
  );

  const overallAvg = useMemo(() => {
    const vals = LEVELS.map(l => selectedSnap.levels[l]?.avgGrade ?? 0).filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : 0;
  }, [selectedSnap]);

  const totalStudents = useMemo(
    () => LEVELS.reduce((a, l) => a + (selectedSnap.levels[l]?.studentCount ?? 0), 0),
    [selectedSnap]
  );

  return (
    <View style={sty.container}>
      <LinearGradient colors={['#030612', '#050c38', '#0d1463']} style={[sty.header, { paddingTop: topPadding + 12 }]}>
        <View style={sty.headerRow}>
          <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={sty.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={sty.headerTitle}>تحليل النتائج</Text>
            <Text style={sty.headerSub}>مقارنة الأداء بين السنوات والمستويات</Text>
          </View>
          <MaterialCommunityIcons name="chart-bar" size={26} color={Colors.accent} style={{ marginRight: 4 }} />
        </View>

        <View style={sty.summaryRow}>
          <View style={sty.summaryItem}>
            <Text style={sty.summaryVal}>{overallAvg}%</Text>
            <Text style={sty.summaryLbl}>المعدل العام</Text>
          </View>
          <View style={sty.summaryDivider} />
          <View style={sty.summaryItem}>
            <Text style={sty.summaryVal}>{totalStudents}</Text>
            <Text style={sty.summaryLbl}>إجمالي الطلاب</Text>
          </View>
          <View style={sty.summaryDivider} />
          <View style={sty.summaryItem}>
            <Text style={sty.summaryVal}>{allSnapshots.length}</Text>
            <Text style={sty.summaryLbl}>سنوات البيانات</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, gap: 8, flexDirection: 'row' }}>
          {allSnapshots.map(s => (
            <Pressable
              key={s.year}
              style={[sty.yearChip, selectedYear === s.year && sty.yearChipActive]}
              onPress={() => { Haptics.selectionAsync(); setSelectedYear(s.year); }}
            >
              <Text style={[sty.yearChipText, selectedYear === s.year && sty.yearChipTextActive]}>
                {s.year === currentSnap.year ? `${s.year} (حالي)` : s.year}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={sty.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[sty.metricChip, metric === 'avgGrade' && sty.metricChipActive]}
                onPress={() => setMetric('avgGrade')}
              >
                <Text style={[sty.metricChipText, metric === 'avgGrade' && { color: '#fff' }]}>الدرجات</Text>
              </Pressable>
              <Pressable
                style={[sty.metricChip, metric === 'avgAttendance' && sty.metricChipActive]}
                onPress={() => setMetric('avgAttendance')}
              >
                <Text style={[sty.metricChipText, metric === 'avgAttendance' && { color: '#fff' }]}>الحضور</Text>
              </Pressable>
            </View>
            <Text style={sty.cardTitle}>مقارنة المستويات</Text>
          </View>

          <BarChart snapshots={allSnapshots} metric={metric} />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {LEVELS.map(level => (
              <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: LEVEL_COLORS[level] }} />
                <Text style={{ fontSize: 11, color: Colors.textSecondary, fontFamily: 'Inter_400Regular' }}>{level}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 10, color: Colors.textLight, fontFamily: 'Inter_400Regular', marginRight: 'auto' }}>اللون الفاتح = سنة أقدم</Text>
          </View>
        </View>

        <Text style={sty.sectionTitle}>تفاصيل العام {selectedYear}</Text>

        {sortedLevels.length === 0 ? (
          <View style={sty.emptyBox}>
            <MaterialCommunityIcons name="chart-bar-stacked" size={48} color={Colors.textLight} />
            <Text style={sty.emptyText}>لا توجد بيانات لهذا العام</Text>
          </View>
        ) : (
          sortedLevels.map((level, idx) => (
            <LevelCard key={level} level={level} data={selectedSnap.levels[level]} rank={idx + 1} />
          ))
        )}

        <Text style={sty.sectionTitle}>أفضل الطلاب أداءً {selectedYear === currentSnap.year ? '(الحالي)' : ''}</Text>
        {selectedYear === currentSnap.year ? (
          students
            .filter(s => s.grades.length > 0)
            .map(s => ({ ...s, avg: Math.round(s.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / s.grades.length) }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5)
            .map((s, idx) => (
              <View key={s.id} style={sty.topStudentRow}>
                <View style={[sty.topRank, { backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7F32' : Colors.borderLight }]}>
                  <Text style={[sty.topRankText, { color: idx < 3 ? '#fff' : Colors.textLight }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={sty.topName}>{s.name}</Text>
                  <Text style={sty.topLevel}>{s.level}</Text>
                </View>
                <View style={[sty.topScore, { backgroundColor: s.avg >= 85 ? Colors.success + '15' : s.avg >= 70 ? Colors.warning + '15' : Colors.danger + '15' }]}>
                  <Text style={[sty.topScoreText, { color: s.avg >= 85 ? Colors.success : s.avg >= 70 ? Colors.warning : Colors.danger }]}>{s.avg}%</Text>
                </View>
              </View>
            ))
        ) : (
          <View style={sty.emptyBox}>
            <MaterialCommunityIcons name="account-star-outline" size={36} color={Colors.textLight} />
            <Text style={sty.emptyText}>بيانات الطلاب التفصيلية غير متاحة للسنوات السابقة</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const sty = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 6, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  summaryRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.accent },
  summaryLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  yearChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  yearChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.65)' },
  yearChipTextActive: { color: '#fff', fontFamily: 'Inter_700Bold' },
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text },
  metricChip: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.borderLight, borderRadius: 14 },
  metricChipActive: { backgroundColor: Colors.primary },
  metricChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 12, marginTop: 4 },
  levelCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  rankBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  rankText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  levelName: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text },
  levelCount: { fontSize: 11, color: Colors.textLight, fontFamily: 'Inter_400Regular' },
  metricBox: { borderRadius: 12, padding: 10, alignItems: 'center' },
  metricVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  metricLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  subName: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', minWidth: 70 },
  subScore: { fontSize: 11, fontFamily: 'Inter_700Bold', minWidth: 36, textAlign: 'left' },
  topStudentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 8, gap: 12 },
  topRank: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  topRankText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  topName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  topLevel: { fontSize: 11, color: Colors.textLight, fontFamily: 'Inter_400Regular' },
  topScore: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  topScoreText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  emptyBox: { alignItems: 'center', padding: 32, gap: 10 },
  emptyText: { fontSize: 13, color: Colors.textLight, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
