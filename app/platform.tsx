import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  ScrollView, Animated, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSchoolTheme } from '@/contexts/SchoolThemeContext';
import HexFrame from '@/components/HexFrame';

const FEATURES = [
  { icon: 'shield-account',   color: '#818CF8', label: 'صلاحيات متعددة',  sub: 'إدارة • معلمة • ولي أمر' },
  { icon: 'chart-bar',        color: '#34D399', label: 'تقارير فورية',    sub: 'إحصائيات تفاعلية' },
  { icon: 'palette',          color: '#F59E0B', label: 'هوية بصرية خاصة', sub: 'ألوان وشعار لكل روضة' },
  { icon: 'database-lock',    color: '#F472B6', label: 'عزل تام للبيانات', sub: 'كل روضة في بيئتها' },
  { icon: 'cellphone-check',  color: '#60A5FA', label: 'متوافق مع الجوال', sub: 'iOS و Android' },
  { icon: 'cloud-sync',       color: '#A78BFA', label: 'مزامنة سحابية',   sub: 'Firebase في الوقت الحقيقي' },
];

function HexDecor({ size, x, y, opacity }: { size: number; x: number; y: number; opacity: number }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, opacity }} pointerEvents="none">
      <HexFrame size={size} fill="transparent" stroke="rgba(201,149,42,0.55)" strokeWidth={1.5} />
    </View>
  );
}

export default function PlatformScreen() {
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === 'web' ? 67 : insets.top;
  const botPad  = Platform.OS === 'web' ? 34 : insets.bottom;
  const { schools, switchSchool } = useSchoolTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const goSchoolLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pulse();
    router.push('/school-login');
  };

  const goUserLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/login');
  };

  const goDemo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const demo = schools.find(s => s.id === 'demo');
    if (demo) await switchSchool('demo');
    router.push('/login');
  };

  const goSchoolRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/school-request');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#030612' }}>
      <LinearGradient
        colors={['#030612', '#060c28', '#0a1050', '#060c28', '#030612']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <HexDecor size={180} x={-60}  y={-50}  opacity={0.10} />
        <HexDecor size={100} x={280}  y={50}   opacity={0.08} />
        <HexDecor size={130} x={-40}  y={380}  opacity={0.07} />
        <HexDecor size={80}  x={300}  y={360}  opacity={0.09} />
        <HexDecor size={60}  x={160}  y={170}  opacity={0.05} />
        <HexDecor size={220} x={80}   y={580}  opacity={0.04} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad + 20, paddingBottom: botPad + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Platform Logo */}
        <Animated.View style={[s.logoSection, { transform: [{ scale: scaleAnim }] }]}>
          <HexFrame
            size={130}
            fill="#FFFFFF"
            stroke="#c9952a"
            strokeWidth={3}
            style={{
              ...(Platform.OS === 'web'
                ? { filter: 'drop-shadow(0 0 24px rgba(201,149,42,0.55))' } as any
                : { shadowColor: '#c9952a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 12 }),
            }}
          >
            <Image source={require('@/assets/images/logo_main.png')} style={s.logoImg} resizeMode="contain" />
          </HexFrame>
          <View style={s.outerRing} pointerEvents="none">
            <HexFrame size={152} fill="transparent" stroke="rgba(201,149,42,0.20)" strokeWidth={1} />
          </View>
        </Animated.View>

        {/* Platform Name */}
        <View style={s.titleBlock}>
          <View style={s.platformBadge}>
            <MaterialCommunityIcons name="domain" size={11} color="#e8b84b" />
            <Text style={s.platformBadgeTxt}>منصة متعددة الروضات</Text>
          </View>
          <Text style={s.platformName}>نُظُم</Text>
          <Text style={s.platformSub}>نظام إدارة الروضات الاحترافي</Text>
          <View style={s.platformLine} />
          <Text style={s.platformTagline}>إدارة ذكية • هوية بصرية مستقلة • بيانات معزولة</Text>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          {[
            { value: schools.length > 0 ? `${schools.length}` : '—', label: 'روضة مسجّلة', color: '#818CF8' },
            { value: '٤',   label: 'أدوار وصلاحيات', color: '#34D399' },
            { value: '١٠٠٪', label: 'عزل البيانات',  color: '#F59E0B' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Main Actions */}
        <View style={s.actionsBlock}>
          {/* School Admin Login */}
          <Pressable onPress={goSchoolLogin} style={({ pressed }) => [s.mainBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <LinearGradient
              colors={['#0c1155', '#1e2480', '#2a33a0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.mainBtnGrad}
            >
              <View style={s.mainBtnIcon}>
                <MaterialCommunityIcons name="domain" size={22} color="#c9952a" />
              </View>
              <View style={s.mainBtnText}>
                <Text style={s.mainBtnTitle}>دخول روضة</Text>
                <Text style={s.mainBtnSub}>لمديري الروضات المشتركة</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.40)" />
            </LinearGradient>
          </Pressable>

          {/* Staff / Parent Login */}
          <Pressable onPress={goUserLogin} style={({ pressed }) => [s.mainBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <LinearGradient
              colors={['#1a0e3a', '#3b1f7a', '#4c28a0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.mainBtnGrad}
            >
              <View style={[s.mainBtnIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                <Ionicons name="people" size={22} color="#A855F7" />
              </View>
              <View style={s.mainBtnText}>
                <Text style={s.mainBtnTitle}>دخول الموظفين وأولياء الأمور</Text>
                <Text style={s.mainBtnSub}>معلمة • ولي أمر • زائر</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.40)" />
            </LinearGradient>
          </Pressable>

          {/* Demo */}
          <Pressable onPress={goDemo} style={({ pressed }) => [s.demoBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={s.demoBtnInner}>
              <MaterialCommunityIcons name="flask-outline" size={18} color="#34D399" />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.demoBtnTitle}>تجربة مجانية</Text>
                <Text style={s.demoBtnSub}>اكتشف النظام قبل الاشتراك</Text>
              </View>
              <View style={s.demoBadge}>
                <Text style={s.demoBadgeTxt}>DEMO</Text>
              </View>
            </View>
          </Pressable>

          {/* Join Request */}
          <Pressable onPress={goSchoolRequest} style={({ pressed }) => [s.joinBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={s.joinBtnInner}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#c9952a" />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.joinBtnTitle}>اطلب انضمام روضتك</Text>
                <Text style={s.joinBtnSub}>سجّل روضتك في المنصة وابدأ مجاناً</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color="rgba(201,149,42,0.50)" />
            </View>
          </Pressable>
        </View>

        {/* Features Grid */}
        <View style={s.featuresBlock}>
          <Text style={s.featuresTitle}>مميزات المنصة</Text>
          <View style={s.featGrid}>
            {FEATURES.map(f => (
              <View key={f.label} style={s.featCard}>
                <View style={[s.featIcon, { backgroundColor: f.color + '18' }]}>
                  <MaterialCommunityIcons name={f.icon as any} size={20} color={f.color} />
                </View>
                <Text style={s.featLabel}>{f.label}</Text>
                <Text style={s.featSub}>{f.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>© 2026 نُظُم — جميع الحقوق محفوظة</Text>
          <Text style={s.footerDev}>Developed by Ali Alnassar • DigitalMind Systems</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20 },

  logoSection: {
    width: 155, height: 155, alignItems: 'center', justifyContent: 'center',
    marginBottom: 22, position: 'relative',
  },
  outerRing: { position: 'absolute', top: 1.5, left: 1.5 },
  logoImg: { width: 96, height: 96 },

  titleBlock: { alignItems: 'center', marginBottom: 24, width: '100%' },
  platformBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,149,42,0.12)', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)',
    marginBottom: 10,
  },
  platformBadgeTxt: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#e8b84b', letterSpacing: 0.5 },
  platformName: {
    fontSize: 42, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 30px rgba(201,149,42,0.60)' } as any
      : { textShadowColor: 'rgba(201,149,42,0.60)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 }),
  },
  platformSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 4, marginBottom: 14 },
  platformLine: { width: 50, height: 1.5, backgroundColor: '#c9952a', opacity: 0.6, marginBottom: 10 },
  platformTagline: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(201,149,42,0.65)', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 24 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statVal:   { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  statLabel: { fontSize: 9,  fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.40)', textAlign: 'center' },

  actionsBlock: { width: '100%', gap: 12, marginBottom: 28 },
  mainBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  mainBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  mainBtnIcon: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(201,149,42,0.15)',
  },
  mainBtnText: { flex: 1, alignItems: 'flex-end' },
  mainBtnTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginBottom: 2 },
  mainBtnSub:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)' },

  demoBtn: {
    width: '100%', borderRadius: 16,
    backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.30)',
  },
  demoBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  demoBtnTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#34D399' },
  demoBtnSub:   { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(52,211,153,0.60)', marginTop: 2 },
  demoBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.40)',
  },
  demoBadgeTxt: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#34D399', letterSpacing: 1 },

  joinBtn: {
    width: '100%', borderRadius: 16,
    backgroundColor: 'rgba(201,149,42,0.07)', borderWidth: 1.5, borderColor: 'rgba(201,149,42,0.25)',
  },
  joinBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  joinBtnTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#c9952a' },
  joinBtnSub:   { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(201,149,42,0.55)', marginTop: 2 },

  featuresBlock: { width: '100%', marginBottom: 24 },
  featuresTitle: {
    fontSize: 14, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.55)',
    textAlign: 'right', marginBottom: 14, letterSpacing: 0.5,
  },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14, gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'flex-end',
  },
  featIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  featLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right' },
  featSub:   { fontSize: 9,  fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.35)', textAlign: 'right' },

  footer: { alignItems: 'center', gap: 5, paddingTop: 12 },
  footerTxt: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.25)' },
  footerDev: { fontSize: 9,  fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.15)', letterSpacing: 0.3 },
});
