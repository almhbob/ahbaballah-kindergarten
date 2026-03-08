import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/colors';
import { useAppData, buildHonorBoard, HonorEntry, ParentHonorEntry } from '@/contexts/AppDataContext';

const LEVELS = ['مستوى ثاني', 'مستوى أول', 'براعم'];

const LEVEL_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  'مستوى ثاني': { label: 'مستوى ثاني', color: '#3B82F6', bg: '#EFF6FF', icon: 'star-circle' },
  'مستوى أول':  { label: 'مستوى أول',  color: '#10B981', bg: '#ECFDF5', icon: 'leaf-circle' },
  'براعم':      { label: 'براعم',      color: '#F59E0B', bg: '#FFFBEB', icon: 'heart-circle' },
};

const BADGE_META = {
  ذهبي:   { color: '#FFD700', bg: '#FFF8DC', icon: 'trophy',       rank: '🥇' },
  فضي:    { color: '#A8B8C8', bg: '#F0F4F8', icon: 'medal',        rank: '🥈' },
  برونزي: { color: '#CD7F32', bg: '#FDF5EC', icon: 'medal-outline', rank: '🥉' },
};

type Tab = 'مستوى ثاني' | 'مستوى أول' | 'براعم' | 'parents';

// ─── Podium component ──────────────────────────────────────────────────────
function Podium({ entries, isParent = false }: {
  entries: (HonorEntry | ParentHonorEntry)[];
  isParent?: boolean;
}) {
  const top3 = entries.slice(0, 3);
  const order = [1, 0, 2]; // show 2nd, 1st, 3rd
  const heights = [90, 120, 70];
  const badgeColors = ['#A8B8C8', '#FFD700', '#CD7F32'];
  const medals = ['🥈', '🥇', '🥉'];

  if (top3.length === 0) return null;

  const getName = (e: HonorEntry | ParentHonorEntry) =>
    isParent ? (e as ParentHonorEntry).parentName : (e as HonorEntry).studentName;
  const getSub = (e: HonorEntry | ParentHonorEntry) =>
    isParent
      ? `طفل: ${(e as ParentHonorEntry).studentName.split(' ')[0]}`
      : `${(e as HonorEntry).level} • ${(e as HonorEntry).gradeAvg}%`;

  return (
    <View style={podStyles.wrap}>
      {order.map((idx, pos) => {
        const entry = top3[idx];
        if (!entry) return <View key={pos} style={{ flex: 1 }} />;
        const initials = getName(entry).split(' ').slice(0, 2).map(w => w[0]).join('');
        return (
          <View key={pos} style={podStyles.col}>
            <Text style={podStyles.medal}>{medals[pos]}</Text>
            <View style={[podStyles.avatar, {
              backgroundColor: badgeColors[pos] + '22',
              borderColor: badgeColors[pos],
              width: pos === 1 ? 60 : 50,
              height: pos === 1 ? 60 : 50,
              borderRadius: pos === 1 ? 30 : 25,
            }]}>
              <Text style={[podStyles.initials, { fontSize: pos === 1 ? 20 : 16, color: badgeColors[pos] }]}>
                {initials}
              </Text>
            </View>
            <Text style={[podStyles.name, { fontSize: pos === 1 ? 12 : 10 }]} numberOfLines={2}>
              {getName(entry).split(' ').slice(0, 2).join('\n')}
            </Text>
            <Text style={podStyles.subName}>{getSub(entry)}</Text>
            <View style={[podStyles.podiumBlock, {
              height: heights[pos],
              backgroundColor: badgeColors[pos] + '22',
              borderTopColor: badgeColors[pos],
            }]}>
              <Text style={[podStyles.scoreText, { color: badgeColors[pos] }]}>{entry.score}</Text>
              <Text style={podStyles.scoreLabel}>نقطة</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const podStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 16 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  medal: { fontSize: 22 },
  avatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Inter_700Bold' },
  name: { fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center', lineHeight: 16 },
  subName: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  podiumBlock: {
    width: '90%', borderTopWidth: 3, borderTopLeftRadius: 8, borderTopRightRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingTop: 8,
  },
  scoreText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  scoreLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
});

// ─── Score bar ────────────────────────────────────────────────────────────
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${value}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const barStyles = StyleSheet.create({
  track: { flex: 1, height: 5, backgroundColor: '#E8EDF8', borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  fill: { height: 5, borderRadius: 3 },
});

// ─── Student honor row ────────────────────────────────────────────────────
function StudentRow({ entry, rank }: { entry: HonorEntry; rank: number }) {
  const meta = entry.badge ? BADGE_META[entry.badge] : null;
  const initials = entry.studentName.split(' ').slice(0, 2).map(w => w[0]).join('');
  return (
    <View style={rowStyles.card}>
      <View style={[rowStyles.rankBadge, meta ? { backgroundColor: meta.bg } : { backgroundColor: Colors.surfaceAlt }]}>
        <Text style={[rowStyles.rankNum, { color: meta ? meta.color : Colors.textSecondary }]}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </Text>
      </View>
      <View style={[rowStyles.avatar, { backgroundColor: (LEVEL_META[entry.level]?.color ?? '#888') + '18' }]}>
        <Text style={[rowStyles.avatarText, { color: LEVEL_META[entry.level]?.color ?? '#888' }]}>{initials}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{entry.studentName}</Text>
        <View style={rowStyles.pillRow}>
          <View style={[rowStyles.pill, { backgroundColor: Colors.surfaceAlt }]}>
            <Ionicons name="school-outline" size={9} color={Colors.textSecondary} />
            <Text style={rowStyles.pillTxt}>{entry.gradeAvg}%</Text>
          </View>
          <View style={[rowStyles.pill, { backgroundColor: Colors.surfaceAlt }]}>
            <Ionicons name="calendar-outline" size={9} color={Colors.textSecondary} />
            <Text style={rowStyles.pillTxt}>{entry.attendance}%</Text>
          </View>
          <View style={[rowStyles.pill, {
            backgroundColor:
              entry.behavior === 'ممتاز' ? '#ECFDF5' : entry.behavior === 'جيد' ? '#EFF6FF' : '#FFF8DC',
          }]}>
            <Text style={[rowStyles.pillTxt, {
              color: entry.behavior === 'ممتاز' ? Colors.success : entry.behavior === 'جيد' ? '#3B82F6' : Colors.warning,
            }]}>{entry.behavior}</Text>
          </View>
        </View>
        <ScoreBar value={entry.score} color={LEVEL_META[entry.level]?.color ?? '#888'} />
      </View>
      <View style={rowStyles.scoreBox}>
        <Text style={rowStyles.score}>{entry.score}</Text>
        <Text style={rowStyles.scoreLabel}>نقطة</Text>
      </View>
    </View>
  );
}

// ─── Parent honor row ─────────────────────────────────────────────────────
function ParentRow({ entry, rank }: { entry: ParentHonorEntry; rank: number }) {
  const meta = entry.badge ? BADGE_META[entry.badge] : null;
  const initials = entry.parentName.split(' ').slice(0, 2).map(w => w[0]).join('');
  return (
    <View style={rowStyles.card}>
      <View style={[rowStyles.rankBadge, meta ? { backgroundColor: meta.bg } : { backgroundColor: Colors.surfaceAlt }]}>
        <Text style={[rowStyles.rankNum, { color: meta ? meta.color : Colors.textSecondary }]}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </Text>
      </View>
      <View style={[rowStyles.avatar, { backgroundColor: '#FCE4FF' }]}>
        <Text style={[rowStyles.avatarText, { color: '#9C27B0' }]}>{initials}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{entry.parentName}</Text>
        <Text style={rowStyles.subText}>طفل: {entry.studentName.split(' ').slice(0, 2).join(' ')}</Text>
        <View style={rowStyles.pillRow}>
          <View style={[rowStyles.pill, { backgroundColor: '#FFF8DC' }]}>
            <Ionicons name="star-outline" size={9} color="#F59E0B" />
            <Text style={[rowStyles.pillTxt, { color: '#92680B' }]}>أداء الطفل {entry.childScore}</Text>
          </View>
          <View style={[rowStyles.pill, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="chatbubbles-outline" size={9} color="#3B82F6" />
            <Text style={[rowStyles.pillTxt, { color: '#1D4ED8' }]}>{entry.messageCount} رسالة</Text>
          </View>
        </View>
        <ScoreBar value={entry.score} color="#9C27B0" />
      </View>
      <View style={rowStyles.scoreBox}>
        <Text style={[rowStyles.score, { color: '#9C27B0' }]}>{entry.score}</Text>
        <Text style={rowStyles.scoreLabel}>نقطة</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 16, padding: 12, gap: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 6px rgba(26,31,92,0.07)' }
      : { shadowColor: '#1a1f5c', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 }),
  },
  rankBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 3, textAlign: 'right' },
  subText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginBottom: 3 },
  pillRow: { flexDirection: 'row', gap: 4, justifyContent: 'flex-end', marginBottom: 4, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  pillTxt: { fontSize: 9, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  scoreBox: { alignItems: 'center', minWidth: 44 },
  score: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.primary },
  scoreLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
});

// ─── Main screen ──────────────────────────────────────────────────────────
export default function HonorScreen() {
  const insets = useSafeAreaInsets();
  const { students, messages } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;
  const [tab, setTab] = useState<Tab>('مستوى ثاني');

  const { byLevel, parents } = useMemo(
    () => buildHonorBoard(students, messages),
    [students, messages]
  );

  const tabs: { key: Tab; label: string; icon: string; color: string }[] = [
    { key: 'مستوى ثاني',     label: 'مستوى ثاني',     icon: 'star',        color: '#3B82F6' },
    { key: 'مستوى أول',     label: 'مستوى أول',     icon: 'leaf',        color: '#10B981' },
    { key: 'براعم', label: 'براعم',    icon: 'heart',       color: '#F59E0B' },
    { key: 'parents', label: 'الأم المثالية', icon: 'ribbon', color: '#9C27B0' },
  ];

  const currentStudents = tab !== 'parents' ? (byLevel[tab] ?? []) : [];
  const isParentTab = tab === 'parents';
  const activeColor = isParentTab ? '#9C27B0'
    : LEVEL_META[tab]?.color ?? Colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={isParentTab ? ['#3b1660', '#7B3FA0', '#9C27B0'] : ['#0d1143', '#1a1f5c', '#252b7a']}
        style={[styles.header, { paddingTop: topPadding + 10 }]}
      >
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {isParentTab ? 'لوحة الأم المثالية' : `لوحة شرف ${LEVEL_META[tab]?.label ?? tab}`}
            </Text>
            <Text style={styles.headerSub}>تقييم تلقائي • يُحدَّث فورياً</Text>
          </View>
          <View style={styles.trophyBadge}>
            <Text style={styles.trophyEmoji}>🏆</Text>
          </View>
        </View>

        {/* Score criteria legend */}
        <View style={styles.criteriaRow}>
          {isParentTab ? (
            <>
              <CriteriaChip label="أداء الطفل" value="80%" />
              <CriteriaChip label="المتابعة" value="20%" />
            </>
          ) : (
            <>
              <CriteriaChip label="الدرجات" value="45%" />
              <CriteriaChip label="الحضور" value="30%" />
              <CriteriaChip label="السلوك" value="15%" />
              <CriteriaChip label="الواجبات" value="10%" />
            </>
          )}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
          {tabs.map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={13} color={tab === t.key ? '#fff' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottomPadding + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Podium */}
        {(isParentTab ? parents : currentStudents).length >= 2 && (
          <Podium entries={isParentTab ? parents : currentStudents} isParent={isParentTab} />
        )}

        {/* Full leaderboard */}
        <Text style={styles.sectionTitle}>
          {isParentTab ? 'القائمة التنافسية الكاملة' : 'ترتيب الطلاب'}
        </Text>

        {(isParentTab ? parents : currentStudents).length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="trophy-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد بيانات كافية للترتيب</Text>
            <Text style={styles.emptySubText}>أضف طلاباً وأولياء أمور لتفعيل لوحة الشرف</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {isParentTab
              ? parents.map((e, i) => <ParentRow key={e.studentId} entry={e} rank={i + 1} />)
              : currentStudents.map((e, i) => <StudentRow key={e.studentId} entry={e} rank={i + 1} />)
            }
          </View>
        )}

        {/* Scoring info card */}
        <View style={[styles.infoCard, { borderColor: activeColor + '30' }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={18} color={activeColor} />
            <Text style={[styles.infoTitle, { color: activeColor }]}>كيف يُحسب التقييم؟</Text>
          </View>
          {isParentTab ? (
            <View style={styles.infoRows}>
              <InfoRow icon="star" color="#F59E0B" label="أداء الطفل الأكاديمي والسلوكي" value="80 نقطة" />
              <InfoRow icon="chatbubbles" color="#3B82F6" label="عدد رسائل المتابعة" value="20 نقطة" />
              <InfoRow icon="trophy" color="#FFD700" label="الحد الأقصى للتقييم" value="100 نقطة" />
            </View>
          ) : (
            <View style={styles.infoRows}>
              <InfoRow icon="school" color="#3B82F6" label="متوسط الدرجات الأكاديمية" value="45 نقطة" />
              <InfoRow icon="calendar-check" color={Colors.success} label="نسبة الحضور" value="30 نقطة" />
              <InfoRow icon="happy" color="#F59E0B" label="تقييم السلوك" value="15 نقطة" />
              <InfoRow icon="book" color="#8B5CF6" label="إنجاز الواجبات" value="10 نقطة" />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function CriteriaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.criteriaChip}>
      <Text style={styles.criteriaVal}>{value}</Text>
      <Text style={styles.criteriaLbl}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerText: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  trophyBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  trophyEmoji: { fontSize: 24 },
  criteriaRow: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginBottom: 12 },
  criteriaChip: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center',
  },
  criteriaVal: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#FFD700' },
  criteriaLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  tabScroll: { marginHorizontal: -4 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  tabLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.65)' },
  tabLabelActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text,
    textAlign: 'right', marginBottom: 12,
  },
  list: { gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptySubText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  infoCard: {
    marginTop: 20, backgroundColor: Colors.surface,
    borderRadius: 18, padding: 16, borderWidth: 1,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 14 },
  infoTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  infoRows: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right' },
  infoValue: { fontSize: 12, fontFamily: 'Inter_700Bold', minWidth: 58, textAlign: 'left' },
});
