import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, buildHonorBoard, HonorEntry, ParentHonorEntry } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

type Tab = 'مستوى ثاني' | 'مستوى أول' | 'براعم' | 'parents';

const LEVEL_META: Record<string, { color: string; grad: readonly [string, string] }> = {
  'مستوى ثاني': { color: '#3B82F6', grad: ['#1D4ED8', '#3B82F6'] },
  'مستوى أول':  { color: '#10B981', grad: ['#059669', '#10B981'] },
  'براعم':      { color: '#F59E0B', grad: ['#D97706', '#F59E0B'] },
};

const BADGE_COLORS = ['#FFD700', '#A8B8C8', '#CD7F32'];
const MEDALS = ['🥇', '🥈', '🥉'];

// ─── Sparkle particle (one animated dot) ──────────────────────────────────
function Sparkle({ delay, x, y, size, color }: {
  delay: number; x: number; y: number; size: number; color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const scale  = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1.4, 0.4] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity, transform: [{ scale }, { translateY }],
      }}
    />
  );
}

// ─── Pulsing glow ring around the #1 avatar ───────────────────────────────
function GlowRing({ color, size }: { color: string; size: number }) {
  const pulse = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.8, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size + 20, height: size + 20,
        borderRadius: (size + 20) / 2,
        backgroundColor: color + '30',
        transform: [{ scale: pulse }],
        alignSelf: 'center',
      }}
    />
  );
}

// ─── Animated score counter ────────────────────────────────────────────────
function AnimatedScore({ target, color }: { target: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const listener = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(anim, {
      toValue: target,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(listener);
  }, [target]);

  return (
    <Text style={[scoreCounterStyles.score, { color }]}>{display}</Text>
  );
}
const scoreCounterStyles = StyleSheet.create({
  score: { fontSize: 20, fontFamily: 'Inter_700Bold' },
});

// ─── Single podium column (extracted to avoid hook-in-map) ─────────────────
function PodiumColumn({
  entry, pos, isParent, height, medal, badgeColor, isFirst,
}: {
  entry: HonorEntry | ParentHonorEntry;
  pos: number; isParent: boolean;
  height: number; medal: string; badgeColor: string; isFirst: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: pos * 120, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: pos * 120, useNativeDriver: true }),
    ]).start();
  }, []);

  const getName = () => isParent
    ? (entry as ParentHonorEntry).parentName
    : (entry as HonorEntry).studentName;
  const getSub = () => isParent
    ? `طفل: ${(entry as ParentHonorEntry).studentName.split(' ')[0]}`
    : `${(entry as HonorEntry).gradeAvg}%`;

  const initials = getName().split(' ').slice(0, 2).map((w: string) => w[0]).join('');
  const hexSize = isFirst ? 64 : 52;

  return (
    <Animated.View style={[podStyles.col, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {isFirst && <GlowRing color={badgeColor} size={hexSize + 12} />}
      <Text style={podStyles.medal}>{medal}</Text>
      <HexFrame
        size={hexSize}
        fill={badgeColor + '25'}
        stroke={badgeColor}
        strokeWidth={isFirst ? 2.5 : 2}
      >
        <Text style={[podStyles.initials, { fontSize: isFirst ? 20 : 15, color: badgeColor }]}>{initials}</Text>
      </HexFrame>
      <Text style={[podStyles.name, { fontSize: isFirst ? 11 : 10 }]} numberOfLines={2}>
        {getName().split(' ').slice(0, 2).join('\n')}
      </Text>
      <Text style={podStyles.sub}>{getSub()}</Text>
      <View style={[podStyles.block, {
        height,
        backgroundColor: badgeColor + '18',
        borderTopColor: badgeColor,
      }]}>
        <AnimatedScore target={entry.score} color={badgeColor} />
        <Text style={podStyles.blockLabel}>نقطة</Text>
      </View>
    </Animated.View>
  );
}

const podStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 12 },
  col: { flex: 1, alignItems: 'center', gap: 4, position: 'relative' },
  medal: { fontSize: 24 },
  initials: { fontFamily: 'Inter_700Bold' },
  name: { fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center', lineHeight: 15 },
  sub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  block: {
    width: '88%', borderTopWidth: 3,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingTop: 8,
  },
  blockLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
});

// ─── Podium (3 columns, order: 2nd, 1st, 3rd) ─────────────────────────────
function Podium({ entries, isParent }: {
  entries: (HonorEntry | ParentHonorEntry)[];
  isParent: boolean;
}) {
  const top3 = entries.slice(0, 3);
  if (top3.length < 2) return null;

  const ORDER = [1, 0, 2];
  const HEIGHTS = [90, 124, 70];

  return (
    <View style={podStyles.wrap}>
      {ORDER.map((idx, pos) => {
        const entry = top3[idx];
        if (!entry) return <View key={pos} style={{ flex: 1 }} />;
        return (
          <PodiumColumn
            key={idx}
            entry={entry}
            pos={pos}
            isParent={isParent}
            height={HEIGHTS[pos]}
            medal={MEDALS[pos]}
            badgeColor={BADGE_COLORS[pos]}
            isFirst={pos === 1}
          />
        );
      })}
    </View>
  );
}

// ─── Animated leaderboard row ──────────────────────────────────────────────
function AnimatedRow({ children, index }: { children: React.ReactNode; index: number }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Student honor row ─────────────────────────────────────────────────────
function StudentRow({ entry, rank }: { entry: HonorEntry; rank: number }) {
  const initials = entry.studentName.split(' ').slice(0, 2).map(w => w[0]).join('');
  const color = LEVEL_META[entry.level]?.color ?? Colors.primary;
  const isTop = rank <= 3;
  const medalOrRank = isTop ? MEDALS[rank - 1] : `#${rank}`;

  return (
    <View style={[rowStyles.card, isTop && { borderWidth: 1, borderColor: BADGE_COLORS[rank - 1] + '50' }]}>
      <View style={[rowStyles.rankBox, { backgroundColor: isTop ? BADGE_COLORS[rank - 1] + '20' : Colors.surfaceAlt }]}>
        <Text style={[rowStyles.rankTxt, { color: isTop ? BADGE_COLORS[rank - 1] : Colors.textSecondary }]}>
          {medalOrRank}
        </Text>
      </View>
      <HexFrame size={46} fill={color + '18'} stroke={color + '55'} strokeWidth={1.5}>
        <Text style={[rowStyles.avatarTxt, { color }]}>{initials}</Text>
      </HexFrame>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{entry.studentName}</Text>
        <View style={rowStyles.pills}>
          <Pill icon="school-outline" color={Colors.info}    text={`${entry.gradeAvg}%`} />
          <Pill icon="calendar-outline" color={Colors.success} text={`${entry.attendance}%`} />
          <BehaviorPill behavior={entry.behavior} />
        </View>
        <ScoreTrack value={entry.score} color={color} />
      </View>
      <View style={rowStyles.scoreWrap}>
        <AnimatedScore target={entry.score} color={color} />
        <Text style={rowStyles.scoreLbl}>نقطة</Text>
      </View>
    </View>
  );
}

// ─── Parent honor row ──────────────────────────────────────────────────────
function ParentRow({ entry, rank }: { entry: ParentHonorEntry; rank: number }) {
  const initials = entry.parentName.split(' ').slice(0, 2).map(w => w[0]).join('');
  const color = '#9C27B0';
  const isTop = rank <= 3;
  const medalOrRank = isTop ? MEDALS[rank - 1] : `#${rank}`;

  return (
    <View style={[rowStyles.card, isTop && { borderWidth: 1, borderColor: BADGE_COLORS[rank - 1] + '50' }]}>
      <View style={[rowStyles.rankBox, { backgroundColor: isTop ? BADGE_COLORS[rank - 1] + '20' : Colors.surfaceAlt }]}>
        <Text style={[rowStyles.rankTxt, { color: isTop ? BADGE_COLORS[rank - 1] : Colors.textSecondary }]}>
          {medalOrRank}
        </Text>
      </View>
      <HexFrame size={46} fill="#FCE4FF" stroke="#9C27B080" strokeWidth={1.5}>
        <Text style={[rowStyles.avatarTxt, { color }]}>{initials}</Text>
      </HexFrame>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{entry.parentName}</Text>
        <Text style={rowStyles.sub}>طفل: {entry.studentName.split(' ').slice(0, 2).join(' ')}</Text>
        <View style={rowStyles.pills}>
          <Pill icon="star-outline"       color="#F59E0B" text={`طفل ${entry.childScore}`} />
          <Pill icon="chatbubbles-outline" color="#3B82F6" text={`${entry.messageCount} رسالة`} />
        </View>
        <ScoreTrack value={entry.score} color={color} />
      </View>
      <View style={rowStyles.scoreWrap}>
        <AnimatedScore target={entry.score} color={color} />
        <Text style={rowStyles.scoreLbl}>نقطة</Text>
      </View>
    </View>
  );
}

function Pill({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={[rowStyles.pill, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={9} color={color} />
      <Text style={[rowStyles.pillTxt, { color }]}>{text}</Text>
    </View>
  );
}

function BehaviorPill({ behavior }: { behavior: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    'ممتاز': { color: Colors.success, bg: '#ECFDF5' },
    'جيد':   { color: Colors.info,    bg: '#EFF6FF' },
    'مقبول': { color: Colors.warning,  bg: '#FFFBEB' },
    'يحتاج متابعة': { color: Colors.danger, bg: '#FEF2F2' },
  };
  const m = map[behavior] ?? { color: Colors.textSecondary, bg: Colors.surfaceAlt };
  return (
    <View style={[rowStyles.pill, { backgroundColor: m.bg }]}>
      <Text style={[rowStyles.pillTxt, { color: m.color }]}>{behavior}</Text>
    </View>
  );
}

function ScoreTrack({ value, color }: { value: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, { toValue: value, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  const width = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={trackStyles.track}>
      <Animated.View style={[trackStyles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}
const trackStyles = StyleSheet.create({
  track: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  fill: { height: 4, borderRadius: 2 },
});

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 12, gap: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(12,17,85,0.07)' }
      : { shadowColor: '#0c1155', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }),
  },
  rankBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  avatarTxt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 3 },
  sub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginBottom: 3 },
  pills: { flexDirection: 'row', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap', marginBottom: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  pillTxt: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  scoreWrap: { alignItems: 'center', minWidth: 44 },
  scoreLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
});

// ─── Congratulations banner (top 1 celebration) ───────────────────────────
function CongratsBanner({ name, score, color }: { name: string; score: number; color: string }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [name]);

  const firstName = name.split(' ')[0];

  return (
    <Animated.View style={[bannerStyles.wrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.05)']}
        style={bannerStyles.grad}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={bannerStyles.emoji}>🎉</Text>
        <View style={bannerStyles.textWrap}>
          <Text style={bannerStyles.congrats}>تهانينا!</Text>
          <Text style={bannerStyles.name}>{firstName} في المركز الأول</Text>
          <Text style={bannerStyles.score}>بمجموع {score} نقطة</Text>
        </View>
        <Text style={bannerStyles.emoji}>🌟</Text>
      </LinearGradient>
    </Animated.View>
  );
}
const bannerStyles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#FFD70040' },
  grad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  emoji: { fontSize: 28 },
  textWrap: { alignItems: 'center', flex: 1 },
  congrats: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#B8860B' },
  name: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center', marginTop: 2 },
  score: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
});

// ─── Sparkle overlay ───────────────────────────────────────────────────────
const SPARKLE_CONFIGS = [
  { delay: 0,    x: 20,  y: 30, size: 7,  color: '#FFD700' },
  { delay: 200,  x: 120, y: 10, size: 5,  color: '#FFA500' },
  { delay: 400,  x: 220, y: 40, size: 8,  color: '#FFD700' },
  { delay: 600,  x: 300, y: 15, size: 5,  color: '#FFF8DC' },
  { delay: 150,  x: 60,  y: 60, size: 4,  color: '#FFD700' },
  { delay: 350,  x: 170, y: 55, size: 6,  color: '#FFA500' },
  { delay: 550,  x: 270, y: 35, size: 4,  color: '#FFD700' },
  { delay: 750,  x: 340, y: 60, size: 7,  color: '#FFF8DC' },
];

// ─── Trophy shimmer ────────────────────────────────────────────────────────
function TrophyShimmer() {
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotateDeg = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] });
  const scale = rotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });

  return (
    <Animated.View style={{ transform: [{ rotate: rotateDeg }, { scale }] }}>
      <Text style={{ fontSize: 36 }}>🏆</Text>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function HonorScreen() {
  const insets = useSafeAreaInsets();
  const { students, messages } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;
  const [tab, setTab] = useState<Tab>('مستوى ثاني');
  const [listKey, setListKey] = useState(0);

  const { byLevel, parents } = useMemo(
    () => buildHonorBoard(students, messages),
    [students, messages]
  );

  const handleTab = useCallback((t: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTab(t);
    setListKey(k => k + 1);
  }, []);

  const TABS: { key: Tab; label: string; icon: string; color: string }[] = [
    { key: 'مستوى ثاني', label: 'مستوى ثاني', icon: 'star',    color: '#3B82F6' },
    { key: 'مستوى أول',  label: 'مستوى أول',  icon: 'leaf',    color: '#10B981' },
    { key: 'براعم',      label: 'براعم',       icon: 'heart',   color: '#F59E0B' },
    { key: 'parents',    label: 'الأم المثالية', icon: 'ribbon', color: '#9C27B0' },
  ];

  const isParentTab = tab === 'parents';
  const currentList = isParentTab ? parents : (byLevel[tab] ?? []);
  const activeColor = isParentTab ? '#9C27B0' : LEVEL_META[tab]?.color ?? Colors.primary;
  const headerGrad: readonly [string, string, string] = isParentTab
    ? ['#3b1660', '#7B3FA0', '#9C27B0']
    : ['#030c38', '#0d1463', '#1a1f6e'];
  const topEntry = currentList[0];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* ── Animated Header ── */}
      <LinearGradient colors={headerGrad} style={[styles.header, { paddingTop: topPadding + 10 }]}>

        {/* Sparkles overlay */}
        <View style={styles.sparkleContainer} pointerEvents="none">
          {SPARKLE_CONFIGS.map((s, i) => (
            <Sparkle key={i} {...s} />
          ))}
        </View>

        {/* Title row */}
        <View style={styles.titleRow}>
          <TrophyShimmer />
          <View style={styles.titleText}>
            <Text style={styles.title}>لوحة الشرف</Text>
            <Text style={styles.subtitle}>
              {isParentTab ? 'أكثر الأمهات تفاعلاً ومتابعةً' : `أبطال ${tab}`}
            </Text>
          </View>
          <View style={styles.crownBadge}>
            <Text style={{ fontSize: 22 }}>👑</Text>
          </View>
        </View>

        {/* Criteria chips */}
        <View style={styles.criteriaRow}>
          {isParentTab ? (
            <>
              <CriteriaChip label="أداء الطفل" value="80%" color="#FFD700" />
              <CriteriaChip label="المتابعة" value="20%" color="#A8B8C8" />
            </>
          ) : (
            <>
              <CriteriaChip label="الدرجات" value="45%" color="#FFD700" />
              <CriteriaChip label="الحضور" value="30%" color="#10B981" />
              <CriteriaChip label="السلوك" value="15%" color="#F59E0B" />
              <CriteriaChip label="الواجبات" value="10%" color="#A8B8C8" />
            </>
          )}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => handleTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={13} color={tab === t.key ? '#fff' : 'rgba(255,255,255,0.55)'} />
              <Text style={[styles.tabLbl, tab === t.key && styles.tabLblActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottomPadding + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Congratulations banner for #1 */}
        {topEntry && (
          <CongratsBanner
            key={`banner-${tab}`}
            name={isParentTab ? (topEntry as ParentHonorEntry).parentName : (topEntry as HonorEntry).studentName}
            score={topEntry.score}
            color={activeColor}
          />
        )}

        {/* Animated podium */}
        <Podium key={`podium-${tab}`} entries={currentList} isParent={isParentTab} />

        {/* Leaderboard section title */}
        {currentList.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionLine, { backgroundColor: activeColor }]} />
            <Text style={[styles.sectionTitle, { color: activeColor }]}>القائمة التنافسية</Text>
            <View style={[styles.sectionLine, { backgroundColor: activeColor }]} />
          </View>
        )}

        {/* Animated list */}
        {currentList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 52 }}>🏅</Text>
            <Text style={styles.emptyTitle}>لا توجد بيانات كافية</Text>
            <Text style={styles.emptySub}>أضف طلاباً وأولياء أمور لتفعيل لوحة الشرف</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }} key={listKey}>
            {currentList.map((entry, i) =>
              isParentTab ? (
                <AnimatedRow key={(entry as ParentHonorEntry).studentId + 'p'} index={i}>
                  <ParentRow entry={entry as ParentHonorEntry} rank={i + 1} />
                </AnimatedRow>
              ) : (
                <AnimatedRow key={(entry as HonorEntry).studentId} index={i}>
                  <StudentRow entry={entry as HonorEntry} rank={i + 1} />
                </AnimatedRow>
              )
            )}
          </View>
        )}

        {/* Info card */}
        {currentList.length > 0 && (
          <View style={[styles.infoCard, { borderColor: activeColor + '30' }]}>
            <View style={styles.infoHeaderRow}>
              <Ionicons name="information-circle" size={18} color={activeColor} />
              <Text style={[styles.infoTitle, { color: activeColor }]}>كيف يُحسب التقييم؟</Text>
            </View>
            {isParentTab ? (
              <>
                <InfoRow icon="star"        color="#F59E0B" label="أداء الطفل الأكاديمي والسلوكي" value="80 نقطة" />
                <InfoRow icon="chatbubbles" color="#3B82F6" label="عدد رسائل المتابعة"             value="20 نقطة" />
              </>
            ) : (
              <>
                <InfoRow icon="school"          color="#3B82F6" label="متوسط الدرجات"          value="45 نقطة" />
                <InfoRow icon="calendar-outline" color={Colors.success} label="نسبة الحضور"    value="30 نقطة" />
                <InfoRow icon="happy"            color="#F59E0B" label="تقييم السلوك"          value="15 نقطة" />
                <InfoRow icon="book"             color="#8B5CF6" label="إنجاز الواجبات"        value="10 نقطة" />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CriteriaChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.criteriaChip}>
      <Text style={[styles.criteriaVal, { color }]}>{value}</Text>
      <Text style={styles.criteriaLbl}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={13} color={color} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12, overflow: 'hidden' },
  sparkleContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  titleText: { flex: 1, alignItems: 'flex-end' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2, textAlign: 'right' },
  crownBadge: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  criteriaRow: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginBottom: 12, flexWrap: 'wrap' },
  criteriaChip: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center',
  },
  criteriaVal: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  criteriaLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  tabRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  tabLbl: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' },
  tabLblActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  body: { padding: 16, gap: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 4 },
  sectionLine: { flex: 1, height: 1.5, opacity: 0.4 },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptySub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center', paddingHorizontal: 20 },
  infoCard: {
    marginTop: 20, backgroundColor: Colors.surface,
    borderRadius: 18, padding: 16, borderWidth: 1, gap: 10,
  },
  infoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 },
  infoTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right' },
  infoValue: { fontSize: 12, fontFamily: 'Inter_700Bold', minWidth: 60, textAlign: 'left' },
});
