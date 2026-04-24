import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, Student } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';

const LEVELS = ['الكل', 'براعم', 'مستوى أول', 'مستوى ثاني'];

const LEVEL_COLORS: Record<string, string> = {
  'براعم':       '#F59E0B',
  'مستوى أول':  '#10B981',
  'مستوى ثاني': '#3B82F6',
};

const BEH_COLORS: Record<string, string> = {
  'ممتاز':         '#10B981',
  'جيد':           '#3B82F6',
  'مقبول':         '#F59E0B',
  'يحتاج متابعة': '#EF4444',
};

const HW_COLORS: Record<string, string> = {
  'منجز':    '#10B981',
  'ناقص':    '#F59E0B',
  'لم ينجز': '#EF4444',
};

function buildHTMLReport(students: Student[], filterLevel: string, schoolName: string, principalName: string, location: string): string {
  const date = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const filtered = filterLevel === 'الكل' ? students : students.filter(s => s.level === filterLevel);

  const groupBy = (arr: Student[], key: string) => {
    return arr.reduce((acc, s) => {
      const k = (s as any)[key] as string;
      if (!acc[k]) acc[k] = [];
      acc[k].push(s);
      return acc;
    }, {} as Record<string, Student[]>);
  };

  const byLevel = filterLevel === 'الكل' ? groupBy(filtered, 'level') : { [filterLevel]: filtered };
  const levelOrder = ['براعم', 'مستوى أول', 'مستوى ثاني'];
  const sortedLevels = levelOrder.filter(l => byLevel[l]);

  const avgAtt = filtered.length > 0
    ? Math.round(filtered.reduce((a, s) => a + s.attendance, 0) / filtered.length)
    : 0;
  const excellentCount = filtered.filter(s => s.behavior === 'ممتاز').length;

  let tablesHtml = '';
  for (const lvl of sortedLevels) {
    const slist = byLevel[lvl];
    const lvlAvg = slist.length > 0
      ? Math.round(slist.reduce((a, s) => a + s.attendance, 0) / slist.length)
      : 0;
    const rows = slist.map((s, i) => {
      const gradePct = s.grades.length > 0
        ? Math.round(s.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / s.grades.length)
        : null;
      const behColor = s.behavior === 'ممتاز' ? '#10B981' : s.behavior === 'جيد' ? '#3B82F6' : s.behavior === 'مقبول' ? '#D97706' : '#DC2626';
      const hwColor  = s.homework === 'منجز' ? '#10B981' : s.homework === 'ناقص' ? '#D97706' : '#DC2626';
      const attColor = s.attendance >= 90 ? '#10B981' : s.attendance >= 75 ? '#D97706' : '#DC2626';
      return `
        <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td class="center">${i + 1}</td>
          <td class="name">${s.name}</td>
          <td>${s.parentName}</td>
          <td class="center"><span class="att" style="color:${attColor}">${s.attendance}%</span></td>
          <td class="center"><span class="pill" style="color:${behColor};border-color:${behColor}20;background:${behColor}12">${s.behavior}</span></td>
          <td class="center"><span class="pill" style="color:${hwColor};border-color:${hwColor}20;background:${hwColor}12">${s.homework}</span></td>
          <td class="center">${gradePct !== null ? `<b>${gradePct}%</b>` : '<span class="na">—</span>'}</td>
          <td class="notes">${s.notes || '—'}</td>
        </tr>`;
    }).join('');

    tablesHtml += `
      <div class="level-block">
        <div class="level-header">
          <span class="level-title">${lvl}</span>
          <span class="level-meta">${slist.length} طالب · متوسط الحضور ${lvlAvg}%</span>
        </div>
        <table>
          <thead>
            <tr>
              <th width="40">#</th>
              <th>اسم الطالب</th>
              <th>ولي الأمر</th>
              <th width="70">الحضور</th>
              <th width="90">السلوك</th>
              <th width="90">الواجبات</th>
              <th width="70">المعدل</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>قائمة الطلاب — ${schoolName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      font-size: 13px;
      direction: rtl;
    }
    .page { max-width: 1000px; margin: 0 auto; padding: 20px; }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #0c1155 0%, #1e2480 60%, #2a33a0 100%);
      border-radius: 16px;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
      color: white;
    }
    .header-logo {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 800; color: #0c1155;
      flex-shrink: 0;
    }
    .header-text { flex: 1; }
    .header-school { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .header-sub { font-size: 13px; opacity: 0.75; margin-bottom: 2px; }
    .header-meta { font-size: 12px; opacity: 0.6; }
    .header-date { text-align: left; font-size: 12px; opacity: 0.7; }

    /* ── Summary Cards ── */
    .summary { display: flex; gap: 12px; margin-bottom: 20px; }
    .sum-card {
      flex: 1; background: white; border-radius: 12px;
      padding: 16px; text-align: center;
      box-shadow: 0 1px 8px rgba(12,17,85,0.08);
      border: 1px solid #e2e8f0;
    }
    .sum-val { font-size: 26px; font-weight: 800; color: #0c1155; }
    .sum-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* ── Level Block ── */
    .level-block { margin-bottom: 24px; }
    .level-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px;
      background: #0c1155;
      border-radius: 10px 10px 0 0;
      color: white;
    }
    .level-title { font-size: 15px; font-weight: 700; }
    .level-meta { font-size: 12px; opacity: 0.7; }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 0 0 10px 10px; overflow: hidden; box-shadow: 0 1px 8px rgba(12,17,85,0.08); }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-align: right; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .row-odd  td { background: #fafbff; }
    .row-even td { background: #ffffff; }
    .name { font-weight: 700; color: #0c1155; }
    .center { text-align: center; }
    .att { font-weight: 700; font-size: 13px; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; }
    .na { color: #94a3b8; }
    .notes { color: #475569; font-size: 11px; max-width: 140px; }

    /* ── Footer ── */
    .footer {
      margin-top: 24px;
      padding: 16px 20px;
      background: white;
      border-radius: 12px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11px; color: #94a3b8;
      box-shadow: 0 1px 8px rgba(12,17,85,0.06);
    }
    .footer-signature { font-weight: 700; color: #0c1155; font-size: 12px; }
    .footer-line { font-size: 10px; margin-top: 4px; color: #94a3b8; }
    .sig-line { border-top: 1px dashed #cbd5e1; width: 140px; margin-top: 28px; margin-bottom: 4px; }

    /* ── Print Rules ── */
    @media print {
      body { background: white; font-size: 11px; }
      .page { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .level-block { page-break-inside: avoid; }
      .header { background: #0c1155 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .level-header { background: #0c1155 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div style="flex:1">
        <div class="header-school">🌟 ${schoolName}</div>
        <div class="header-sub">المديرة: ${principalName} · ${location}</div>
        <div class="header-meta">تاريخ الإصدار: ${date}</div>
      </div>
      <div class="header-date">
        <div style="font-size:14px;font-weight:700">قائمة الطلاب</div>
        <div style="opacity:.65;margin-top:4px">${filterLevel === 'الكل' ? 'جميع المستويات' : filterLevel}</div>
      </div>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="sum-card">
        <div class="sum-val">${filtered.length}</div>
        <div class="sum-lbl">إجمالي الطلاب</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" style="color:#10B981">${avgAtt}%</div>
        <div class="sum-lbl">متوسط الحضور</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" style="color:#F59E0B">${excellentCount}</div>
        <div class="sum-lbl">سلوك ممتاز</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" style="color:#3B82F6">${sortedLevels.length}</div>
        <div class="sum-lbl">مستويات</div>
      </div>
    </div>

    <!-- Tables -->
    ${tablesHtml}

    <!-- Footer -->
    <div class="footer">
      <div>
        <div class="footer-signature">${principalName}</div>
        <div class="footer-line">المديرة / التوقيع</div>
        <div class="sig-line"></div>
      </div>
      <div style="text-align:center;color:#94a3b8">
        <div>تم إنشاء هذه القائمة بتاريخ ${date}</div>
        <div style="margin-top:4px">نظم إدارة رياض الأطفال — الخاصة</div>
      </div>
      <div style="text-align:left">
        <div class="footer-signature">ختم الروضة</div>
        <div class="footer-line">الإدارة</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={[styles.statBadge, { borderColor: color + '30' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const { students, schoolInfo } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [filterLevel, setFilterLevel] = useState<string>('الكل');
  const [isPrinting, setIsPrinting] = useState(false);

  const filtered = useMemo(
    () => filterLevel === 'الكل' ? students : students.filter(s => s.level === filterLevel),
    [students, filterLevel]
  );

  const byLevel = useMemo(() => {
    return ['براعم', 'مستوى أول', 'مستوى ثاني'].map(lvl => ({
      lvl,
      list: filtered.filter(s => s.level === lvl),
    })).filter(g => g.list.length > 0);
  }, [filtered]);

  const avgAtt = filtered.length > 0
    ? Math.round(filtered.reduce((a, s) => a + s.attendance, 0) / filtered.length)
    : 0;

  const excellentCount = filtered.filter(s => s.behavior === 'ممتاز').length;

  const handlePrint = async () => {
    if (filtered.length === 0) {
      Alert.alert('تنبيه', 'لا يوجد طلاب للطباعة في المستوى المحدد');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPrinting(true);
    try {
      const html = buildHTMLReport(
        students,
        filterLevel,
        schoolInfo.name,
        schoolInfo.principalName,
        schoolInfo.location,
      );
      if (Platform.OS === 'web') {
        const w = (window as any).open('', '_blank', 'width=900,height=700');
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          setTimeout(() => w.print(), 600);
        }
      } else {
        await Print.printAsync({ html, useMarkupFormatter: true });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('خطأ', 'تعذّر فتح نافذة الطباعة');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#030612', '#050c38', '#0d1463']}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>تصدير بيانات الطلاب</Text>
            <Text style={styles.headerSub}>{schoolInfo.name}</Text>
          </View>
          <HexFrame size={42} fill="rgba(255,255,255,0.07)" stroke={Colors.accent + '60'} strokeWidth={1.5}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.accent} />
          </HexFrame>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBadge value={String(filtered.length)} label="طالب" color="#60A5FA" />
          <StatBadge value={`${avgAtt}%`} label="حضور" color="#34D399" />
          <StatBadge value={String(excellentCount)} label="ممتاز" color={Colors.accent} />
          <StatBadge value={String(byLevel.length)} label="مستوى" color="#C084FC" />
        </View>

        {/* Level Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {LEVELS.map(lvl => (
            <Pressable
              key={lvl}
              style={[styles.filterChip, filterLevel === lvl && styles.filterChipActive]}
              onPress={() => { setFilterLevel(lvl); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.filterChipText, filterLevel === lvl && styles.filterChipTextActive]}>{lvl}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Preview List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: bottomPadding + 100 }]}
      >
        {byLevel.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-search-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا يوجد طلاب في هذا المستوى</Text>
          </View>
        ) : (
          byLevel.map(({ lvl, list }) => (
            <View key={lvl} style={styles.levelBlock}>
              {/* Level Header */}
              <View style={[styles.levelHeader, { backgroundColor: (LEVEL_COLORS[lvl] ?? Colors.primary) + '18', borderColor: (LEVEL_COLORS[lvl] ?? Colors.primary) + '40' }]}>
                <Text style={[styles.levelCount, { color: LEVEL_COLORS[lvl] ?? Colors.primary }]}>{list.length} طالب</Text>
                <Text style={[styles.levelTitle, { color: LEVEL_COLORS[lvl] ?? Colors.primary }]}>{lvl}</Text>
              </View>

              {/* Column Headers */}
              <View style={styles.colHeaders}>
                <Text style={[styles.colH, { flex: 2.5 }]}>الاسم</Text>
                <Text style={[styles.colH, { flex: 1.5, textAlign: 'center' }]}>الحضور</Text>
                <Text style={[styles.colH, { flex: 1.8, textAlign: 'center' }]}>السلوك</Text>
                <Text style={[styles.colH, { flex: 1.8, textAlign: 'center' }]}>الواجب</Text>
                <Text style={[styles.colH, { flex: 1.5, textAlign: 'center' }]}>المعدل</Text>
              </View>

              {/* Student Rows */}
              {list.map((s, i) => {
                const gradePct = s.grades.length > 0
                  ? Math.round(s.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / s.grades.length)
                  : null;
                const attColor = s.attendance >= 90 ? Colors.success : s.attendance >= 75 ? Colors.warning : Colors.danger;
                const behColor = BEH_COLORS[s.behavior] ?? Colors.textSecondary;
                const hwColor  = HW_COLORS[s.homework]  ?? Colors.textSecondary;

                return (
                  <View key={s.id} style={[styles.studentRow, { backgroundColor: i % 2 === 0 ? Colors.surface : Colors.surfaceAlt }]}>
                    <View style={{ flex: 2.5 }}>
                      <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.studentParent} numberOfLines={1}>{s.parentName}</Text>
                    </View>
                    <Text style={[styles.attCell, { flex: 1.5, color: attColor }]}>{s.attendance}%</Text>
                    <View style={{ flex: 1.8, alignItems: 'center' }}>
                      <Text style={[styles.pill, { color: behColor, borderColor: behColor + '40', backgroundColor: behColor + '12' }]}>{s.behavior}</Text>
                    </View>
                    <View style={{ flex: 1.8, alignItems: 'center' }}>
                      <Text style={[styles.pill, { color: hwColor, borderColor: hwColor + '40', backgroundColor: hwColor + '12' }]}>{s.homework}</Text>
                    </View>
                    <Text style={[styles.gradeCell, { flex: 1.5, color: gradePct !== null ? (gradePct >= 90 ? Colors.success : gradePct >= 70 ? Colors.warning : Colors.danger) : Colors.textLight }]}>
                      {gradePct !== null ? `${gradePct}%` : '—'}
                    </Text>
                  </View>
                );
              })}

              {/* Level Footer */}
              <View style={styles.levelFooter}>
                <Text style={styles.levelFooterText}>
                  متوسط الحضور:{' '}
                  <Text style={{ color: Colors.primary, fontFamily: 'Inter_700Bold' }}>
                    {list.length > 0 ? Math.round(list.reduce((a, s) => a + s.attendance, 0) / list.length) : 0}%
                  </Text>
                  {'  ·  '}
                  سلوك ممتاز:{' '}
                  <Text style={{ color: Colors.success, fontFamily: 'Inter_700Bold' }}>
                    {list.filter(s => s.behavior === 'ممتاز').length}
                  </Text>
                  {'  ·  '}
                  واجب منجز:{' '}
                  <Text style={{ color: '#3B82F6', fontFamily: 'Inter_700Bold' }}>
                    {list.filter(s => s.homework === 'منجز').length}
                  </Text>
                </Text>
              </View>
            </View>
          ))
        )}

        {filtered.length > 0 && (
          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textLight} />
            <Text style={styles.footerNoteText}>
              اضغط على زر الطباعة لفتح نافذة الطباعة بتنسيق احترافي قابل للطباعة والحفظ كـ PDF
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Print Button */}
      <View style={[styles.printBar, { paddingBottom: bottomPadding + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.printBtn, { opacity: pressed || isPrinting ? 0.8 : 1 }]}
          onPress={handlePrint}
          disabled={isPrinting}
        >
          <LinearGradient colors={['#0c1155', '#1e2480']} style={styles.printBtnGrad}>
            <MaterialCommunityIcons
              name={isPrinting ? 'loading' : 'printer'}
              size={22}
              color={Colors.accent}
            />
            <Text style={styles.printBtnText}>
              {isPrinting ? 'جارٍ فتح الطباعة...' : `طباعة القائمة (${filtered.length} طالب)`}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 16, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { padding: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 19, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', textAlign: 'right', marginTop: 1 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBadge: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1,
  },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  filterRow: { paddingBottom: 4, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.65)' },
  filterChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  body: { padding: 16, gap: 16 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight },

  levelBlock: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  levelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
    borderWidth: 1, borderBottomWidth: 0,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  levelTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  levelCount: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  colHeaders: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  colH: { fontSize: 10, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },

  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  studentName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  studentParent: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 1 },
  attCell: { textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 13 },
  pill: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 20, borderWidth: 1,
    overflow: 'hidden',
  },
  gradeCell: { textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 13 },

  levelFooter: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  levelFooterText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right' },

  footerNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.borderLight,
  },
  footerNoteText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },

  printBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    ...(Platform.OS === 'web' ? { boxShadow: '0 -4px 20px rgba(12,17,85,0.10)' } as any : {
      shadowColor: '#0c1155', shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.10, shadowRadius: 12, elevation: 10,
    }),
  },
  printBtn: { borderRadius: 16, overflow: 'hidden' },
  printBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  printBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
});
