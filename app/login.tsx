import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Linking, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth, UserRole, AuthUser } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useSchoolTheme } from '@/contexts/SchoolThemeContext';
import { Colors } from '@/constants/colors';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const ROLES: {
  id: UserRole; label: string; subtitle: string; icon: string;
  grad: readonly [string, string, string]; glow: string; hexFill: string;
  fieldLabel: string; fieldPlaceholder: string; fieldType: 'default' | 'email-address' | 'phone-pad';
  fieldIcon: string;
}[] = [
  {
    id: 'admin',
    label: 'الإدارة',
    subtitle: 'وصول كامل',
    icon: 'shield-check',
    grad: ['#0c1155', '#1e2480', '#2a33a0'],
    glow: '#3B82F6',
    hexFill: '#1e2480',
    fieldLabel: 'اسم المستخدم',
    fieldPlaceholder: 'admin',
    fieldType: 'default',
    fieldIcon: 'person-outline',
  },
  {
    id: 'teacher',
    label: 'معلمة',
    subtitle: 'إدارة الفصل',
    icon: 'school',
    grad: ['#0d3d35', '#1A6B5C', '#22866f'],
    glow: '#10B981',
    hexFill: '#1A6B5C',
    fieldLabel: 'البريد الإلكتروني',
    fieldPlaceholder: 'noura@ahbaballah.edu',
    fieldType: 'email-address',
    fieldIcon: 'mail-outline',
  },
  {
    id: 'parent',
    label: 'ولي أمر',
    subtitle: 'متابعة الطفل',
    icon: 'account-heart',
    grad: ['#3b1660', '#7B3FA0', '#9250bc'],
    glow: '#A855F7',
    hexFill: '#7B3FA0',
    fieldLabel: 'رقم الهاتف',
    fieldPlaceholder: '+249 XXX XXX XXX',
    fieldType: 'phone-pad',
    fieldIcon: 'call-outline',
  },
];

const ab = StyleSheet.create({
  card: {
    width: '100%', borderRadius: 24, overflow: 'hidden', marginBottom: 24,
    borderWidth: 1.5, borderColor: 'rgba(201,149,42,0.40)',
    shadowColor: '#c9952a', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 18, elevation: 12,
  },
  topGrad: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 18 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,149,42,0.18)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(201,149,42,0.40)',
  },
  pillTxt: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#e8b84b', letterSpacing: 0.5 },
  verBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  verTxt: { fontSize: 9, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.45)' },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  logoWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(201,149,42,0.60)',
    shadowColor: '#c9952a', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50, shadowRadius: 12, elevation: 8,
  },
  logo: { width: 52, height: 52 },
  heroText: { flex: 1, alignItems: 'flex-end' },
  schoolName: { fontSize: 19, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 3 },
  schoolSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', textAlign: 'right', marginBottom: 8 },
  mottoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end' },
  mottoChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(201,149,42,0.15)', borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)',
  },
  mottoTxt: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#dfb04a' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickCard: {
    flex: 1, alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  quickLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  quickValue: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'center' },

  actRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  actBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 14, borderWidth: 1.5,
  },
  actWa: { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.35)' },
  actCall: { backgroundColor: 'rgba(201,149,42,0.12)', borderColor: 'rgba(201,149,42,0.35)' },
  actTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  expandTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 7, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  expandTriggerTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(201,149,42,0.70)' },

  detailsWrap: { backgroundColor: '#F8FAFC', paddingHorizontal: 18, paddingBottom: 4 },
  detailSection: { paddingTop: 16, paddingBottom: 6 },
  detailSectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: Colors.textLight, textAlign: 'right', marginBottom: 10, letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  detailTexts: { flex: 1, alignItems: 'flex-end', gap: 1 },

  footerGrad: { paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', gap: 4 },
  footerLine1: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.35)' },
  footerLine2: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.22)', letterSpacing: 0.3 },
});


function AboutCard() {
  const [expanded, setExpanded] = useState(false);
  const { branding } = useSchoolTheme();

  const openLink = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
    } catch { /* ignore */ }
  };

  const mottoWords = (branding.slogan ?? 'جودة • التزام • تميز').split('•').map(w => w.trim()).filter(Boolean);
  const sections = ['معلومات المؤسسة', 'معلومات التطبيق'];

  const dynamicDetails = [
    { icon: 'layers',     iconBg: '#FEF2F2', iconColor: '#EF4444', label: 'الإصدار', value: 'v2.0 — 2026',               section: 'معلومات التطبيق' },
    { icon: 'code-slash', iconBg: '#F0FDFA', iconColor: '#14B8A6', label: 'المطوّر', value: 'Ali Alnassar — DigitalMind', section: 'معلومات التطبيق' },
    { icon: 'business',   iconBg: '#EFF6FF', iconColor: '#3B82F6', label: 'الروضة',  value: branding.name,               section: 'معلومات المؤسسة' },
    { icon: 'globe',      iconBg: '#ECFDF5', iconColor: '#10B981', label: 'المنصة',  value: 'نُظُم — رياض الأطفال',       section: 'معلومات المؤسسة' },
  ];

  return (
    <View style={ab.card}>
      <LinearGradient
        colors={['#040924', '#0c1155', '#161f7a', '#0c1155', '#040924']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={ab.topGrad}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ position: 'absolute', right: -22, top: -22, opacity: 0.15 }}>
            <HexFrame size={100} fill="transparent" stroke="#c9952a" strokeWidth={1.5} />
          </View>
          <View style={{ position: 'absolute', left: -14, bottom: -14, opacity: 0.09 }}>
            <HexFrame size={74} fill="transparent" stroke="#ffffff" strokeWidth={1} />
          </View>
        </View>

        <View style={ab.badgeRow}>
          <View style={ab.verBadge}>
            <Text style={ab.verTxt}>v2.0 • 2026</Text>
          </View>
          <View style={ab.pill}>
            <MaterialCommunityIcons name="information-outline" size={11} color="#e8b84b" />
            <Text style={ab.pillTxt}>عن التطبيق</Text>
          </View>
        </View>

        <View style={ab.heroRow}>
          <View style={ab.logoWrap}>
            {branding.logoUrl
              ? <Image source={{ uri: branding.logoUrl }} style={ab.logo} resizeMode="contain" />
              : <Image source={require('@/assets/images/logo_main.png')} style={ab.logo} resizeMode="contain" />
            }
          </View>
          <View style={ab.heroText}>
            <Text style={ab.schoolName} numberOfLines={2}>{branding.name}</Text>
            <Text style={ab.schoolSub} numberOfLines={1}>{branding.slogan ?? 'نظام إداري متكامل'}</Text>
            <View style={ab.mottoRow}>
              {mottoWords.map(w => (
                <View key={w} style={ab.mottoChip}><Text style={ab.mottoTxt}>{w}</Text></View>
              ))}
            </View>
          </View>
        </View>

        <View style={ab.divider} />

        <View style={ab.quickRow}>
          {[
            { icon: 'domain',    label: 'المنصة',   value: 'نُظُم',   color: '#818CF8' },
            { icon: 'star',      label: 'الجودة',   value: 'ممتاز',  color: '#34D399' },
            { icon: 'calendar',  label: 'الإصدار',  value: '2026',   color: '#FCD34D' },
          ].map(q => (
            <View key={q.label} style={ab.quickCard}>
              <MaterialCommunityIcons name={q.icon as any} size={18} color={q.color} />
              <Text style={ab.quickValue}>{q.value}</Text>
              <Text style={ab.quickLabel}>{q.label}</Text>
            </View>
          ))}
        </View>

        <View style={ab.actRow}>
          <Pressable
            style={[ab.actBtn, ab.actWa]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openLink('https://wa.me/249917545129'); }}
          >
            <MaterialCommunityIcons name="whatsapp" size={17} color="#25D366" />
            <Text style={[ab.actTxt, { color: '#25D366' }]}>واتساب</Text>
          </Pressable>
          <Pressable
            style={[ab.actBtn, ab.actCall]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openLink('tel:+249917545129'); }}
          >
            <Ionicons name="call" size={15} color="#e8b84b" />
            <Text style={[ab.actTxt, { color: '#e8b84b' }]}>اتصال</Text>
          </Pressable>
        </View>

        <Pressable
          style={ab.expandTrigger}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(e => !e); }}
        >
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="rgba(201,149,42,0.70)" />
          <Text style={ab.expandTriggerTxt}>{expanded ? 'إخفاء التفاصيل' : 'تفاصيل إضافية'}</Text>
        </Pressable>
      </LinearGradient>

      {expanded && (
        <View style={ab.detailsWrap}>
          {sections.map(sec => {
            const items = dynamicDetails.filter(d => d.section === sec);
            return (
              <View key={sec} style={ab.detailSection}>
                <Text style={ab.detailSectionTitle}>{sec.toUpperCase()}</Text>
                {items.map((item, i) => (
                  <View key={i} style={[ab.detailRow, i < items.length - 1 && ab.detailRowBorder]}>
                    <View style={ab.detailTexts}>
                      <Text style={ab.detailValue}>{item.value}</Text>
                      <Text style={ab.detailLabel}>{item.label}</Text>
                    </View>
                    <View style={[ab.detailIconWrap, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.iconColor} />
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* ══ FOOTER ══ */}
      <LinearGradient colors={['#040924', '#0c1155']} style={ab.footerGrad}>
        <Text style={ab.footerLine1}>© 2026 جميع الحقوق محفوظة — نُظُم · {branding.name}</Text>
        <Text style={ab.footerLine2}>Developed by Ali Alnassar • DigitalMind Systems</Text>
      </LinearGradient>
    </View>
  );
}

function HexDecor({ size, x, y, opacity }: { size: number; x: number; y: number; opacity: number }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, opacity }}>
      <HexFrame size={size} fill="transparent" stroke="rgba(201,149,42,0.6)" strokeWidth={1.5} />
    </View>
  );
}


export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, apiLogin, isBiometricEnabled, enableBiometric, getBiometricUser } = useAuth();
  const { students, employees, appSettings } = useAppData();
  const { branding } = useSchoolTheme();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricUser, setBiometricUser] = useState<AuthUser | null>(null);
  const [hasBiometricHW, setHasBiometricHW] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      const hasHW = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometricHW(hasHW && enrolled);
      if (isBiometricEnabled) {
        const saved = await getBiometricUser();
        setBiometricUser(saved);
      }
    };
    checkBiometric();
  }, [isBiometricEnabled]);

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تسجيل الدخول بالبصمة',
        cancelLabel: 'إلغاء',
        fallbackLabel: 'كلمة المرور',
        disableDeviceFallback: false,
      });
      if (result.success && biometricUser) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(biometricUser);
        if (biometricUser.role === 'admin') router.replace('/(admin)');
        else if (biometricUser.role === 'teacher') router.replace('/(teacher)');
        else router.replace('/(parent)');
      }
    } catch {
      Alert.alert('خطأ', 'تعذّر تسجيل الدخول بالبصمة');
    }
  };

  const offerBiometricEnable = (authUser: AuthUser) => {
    if (!hasBiometricHW || isBiometricEnabled) return;
    Alert.alert(
      'تسجيل الدخول بالبصمة',
      'هل تريد تفعيل تسجيل الدخول بالبصمة في المرات القادمة؟',
      [
        { text: 'لاحقاً', style: 'cancel' },
        {
          text: 'تفعيل',
          onPress: async () => {
            await enableBiometric(authUser);
            setBiometricUser(authUser);
          },
        },
      ],
    );
  };

  const activeRole = ROLES.find(r => r.id === selectedRole);

  const handleRoleSelect = (role: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
    setPassword('');
    setCredential('');
  };

  const handleLogin = async () => {
    if (!selectedRole) { Alert.alert('تنبيه', 'الرجاء اختيار نوع الحساب'); return; }
    const trimCred = credential.trim().toLowerCase();
    const trimPass = password.trim();
    if (!trimCred || !trimPass) { Alert.alert('تنبيه', 'الرجاء إدخال بيانات الدخول كاملة'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));

    let authUser = null;

    if (selectedRole === 'admin') {
      const adminPass = appSettings?.adminPassword || '1234';
      if ((trimCred === 'admin' || trimCred === 'administrator') && trimPass === adminPass) {
        authUser = { id: 'admin_1', name: 'أ. سلوى أحمد داموس', role: 'admin' as UserRole };
      }
    } else if (selectedRole === 'teacher') {
      const emp = employees.find(e => e.email && e.email.toLowerCase() === trimCred);
      if (emp && (emp.password || '1234') === trimPass) {
        if (emp.disabled) {
          setIsLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('الحساب موقوف', 'تم إيقاف هذا الحساب من قِبل الإدارة. يرجى التواصل مع الإدارة.');
          return;
        }
        authUser = {
          id: emp.id,
          name: emp.name,
          role: 'teacher' as UserRole,
          teacherClass: emp.level,
        };
      }
    } else if (selectedRole === 'parent') {
      const rawCred = credential.trim();
      const stu = students.find(s => s.parentPhone && s.parentPhone.replace(/\s/g, '') === rawCred.replace(/\s/g, ''));
      if (stu && (stu.parentPassword || '1234') === trimPass) {
        if (stu.parentDisabled) {
          setIsLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('الحساب موقوف', 'تم إيقاف هذا الحساب من قِبل الإدارة. يرجى التواصل مع الإدارة.');
          return;
        }
        authUser = {
          id: `parent_${stu.id}`,
          name: stu.parentName,
          role: 'parent' as UserRole,
          studentId: stu.id,
        };
      }
    }

    setIsLoading(false);

    if (!authUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'خطأ في تسجيل الدخول',
        selectedRole === 'teacher'
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : selectedRole === 'parent'
            ? 'رقم الهاتف غير مسجّل أو كلمة المرور خاطئة'
            : 'اسم المستخدم أو كلمة المرور غير صحيحة',
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await login(authUser);
    apiLogin(selectedRole, credential.trim(), password.trim()).catch(() => {});
    offerBiometricEnable(authUser);
    if (selectedRole === 'admin') router.replace('/(admin)');
    else if (selectedRole === 'teacher') router.replace('/(teacher)');
    else router.replace('/(parent)');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#030612', '#060c28', '#0a1050']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <HexDecor size={160} x={-50}  y={-40}  opacity={0.12} />
        <HexDecor size={90}  x={280}  y={60}   opacity={0.09} />
        <HexDecor size={120} x={-30}  y={420}  opacity={0.08} />
        <HexDecor size={70}  x={310}  y={380}  opacity={0.10} />
        <HexDecor size={50}  x={160}  y={160}  opacity={0.06} />
        <HexDecor size={200} x={100}  y={600}  opacity={0.05} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={s.logoSection}>
            <HexFrame
              size={140}
              fill="#FFFFFF"
              stroke="#c9952a"
              strokeWidth={3}
              style={{
                ...(Platform.OS === 'web'
                  ? { filter: 'drop-shadow(0 0 20px rgba(201,149,42,0.5))' } as any
                  : { shadowColor: '#c9952a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 10 }),
              }}
            >
              {branding.logoUrl
                ? <Image source={{ uri: branding.logoUrl }} style={s.logoImg} resizeMode="contain" />
                : <Image source={require('@/assets/images/logo_main.png')} style={s.logoImg} resizeMode="contain" />
              }
            </HexFrame>
            <View style={s.outerHexRing} pointerEvents="none">
              <HexFrame size={162} fill="transparent" stroke="rgba(201,149,42,0.22)" strokeWidth={1} />
            </View>
          </View>

          {/* ── School Name (dynamic) ── */}
          <View style={s.schoolNameBlock}>
            <Text style={s.schoolAr} numberOfLines={2}>{branding.name}</Text>
            <View style={s.schoolLine} />
            <Text style={s.schoolSub} numberOfLines={1}>{branding.slogan ?? 'نظام إداري متكامل'}</Text>
          </View>

          <View style={s.mottoRow}>
            {(branding.slogan ?? 'جودة • التزام • تميز').split('•').map(w => w.trim()).filter(Boolean).map((w, i) => (
              <View key={i} style={s.mottoChip}>
                <Text style={s.mottoChipText}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={s.dividerFull}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>اختر نوع حسابك</Text>
            <View style={s.dividerLine} />
          </View>

          {/* ── Role Cards ── */}
          <View style={s.rolesRow}>
            {ROLES.map(role => {
              const active = selectedRole === role.id;
              return (
                <Pressable
                  key={role.id}
                  style={({ pressed }) => [s.roleCard, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => handleRoleSelect(role.id)}
                >
                  <LinearGradient
                    colors={active ? role.grad : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                    style={[s.roleInner, active && { borderColor: role.glow + '70' }]}
                  >
                    {active && <View style={[s.roleGlowTop, { backgroundColor: role.glow + '28' }]} />}
                    <HexFrame
                      size={54}
                      fill={active ? role.hexFill : 'rgba(255,255,255,0.06)'}
                      stroke={active ? role.glow + '80' : 'rgba(255,255,255,0.12)'}
                      strokeWidth={1.5}
                    >
                      <MaterialCommunityIcons name={role.icon as any} size={24} color={active ? '#fff' : 'rgba(255,255,255,0.40)'} />
                    </HexFrame>
                    <Text style={[s.roleLabel, active && s.roleLabelActive]}>{role.label}</Text>
                    <Text style={s.roleSub}>{role.subtitle}</Text>
                    {active && <View style={[s.roleActiveDot, { backgroundColor: role.glow }]} />}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* ── Login Form ── */}
          <View style={s.formWrap}>
            <View style={[s.scanLine, { backgroundColor: activeRole ? activeRole.glow + '70' : Colors.accent + '70' }]} />

            {/* Credential field: phone / email / username */}
            <View style={s.inputRow}>
              <Ionicons
                name={(activeRole?.fieldIcon ?? 'person-outline') as any}
                size={17}
                color="rgba(255,255,255,0.4)"
                style={{ marginLeft: 12 }}
              />
              <TextInput
                style={s.input}
                placeholder={activeRole?.fieldPlaceholder ?? 'البريد / الهاتف'}
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={credential}
                onChangeText={setCredential}
                autoCapitalize="none"
                keyboardType={activeRole?.fieldType ?? 'default'}
                textAlign="right"
              />
            </View>

            <View style={s.inputDivider} />

            {/* Password field */}
            <View style={s.inputRow}>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ marginLeft: 12 }}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={17} color="rgba(255,255,255,0.4)" />
              </Pressable>
              <TextInput
                style={s.input}
                placeholder="كلمة المرور"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
            </View>
          </View>

          {/* ── Login Button ── */}
          <Pressable
            style={({ pressed }) => [s.loginBtn, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient colors={['#a07018', '#c9952a', '#e8b84b']} style={s.loginGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading ? (
                <View style={s.dots}>
                  {[1, 0.6, 0.3].map((op, i) => <View key={i} style={[s.dot, { opacity: op }]} />)}
                </View>
              ) : (
                <>
                  <Text style={s.loginTxt}>دخول</Text>
                  <Ionicons name="arrow-back" size={18} color="#fff" style={{ marginRight: 4 }} />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* ── Biometric Login ── */}
          {biometricUser && (
            <>
              <View style={s.bioSepRow}>
                <View style={s.bioSepLine} />
                <Text style={s.bioSepTxt}>أو</Text>
                <View style={s.bioSepLine} />
              </View>
              <Pressable
                style={({ pressed }) => [s.bioBtn, { opacity: pressed ? 0.82 : 1 }]}
                onPress={handleBiometricLogin}
              >
                <View style={s.bioBtnInner}>
                  <View style={s.bioIconWrap}>
                    <Ionicons name="finger-print" size={30} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.bioBtnTitle}>دخول بالبصمة</Text>
                    <Text style={s.bioBtnSub}>{biometricUser.name}</Text>
                  </View>
                </View>
              </Pressable>
            </>
          )}

          {/* ── Create Account ── */}
          <Pressable
            style={({ pressed }) => [s.signupLink, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/register')}
          >
            <Ionicons name="person-add-outline" size={15} color="rgba(201,149,42,0.8)" />
            <Text style={s.signupLinkTxt}>
              لا تملك حساباً؟{'  '}
              <Text style={s.signupLinkBold}>إنشاء حساب جديد</Text>
            </Text>
          </Pressable>

          {/* ── Guest Access ── */}
          <Pressable
            style={({ pressed }) => [s.guestBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await login({ id: 'guest', name: 'زائر', role: 'guest' });
              router.replace('/(guest)' as any);
            }}
          >
            <Ionicons name="eye-outline" size={15} color="rgba(255,255,255,0.45)" />
            <Text style={s.guestBtnTxt}>تصفح كضيف</Text>
          </Pressable>

          <AboutCard />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20, alignItems: 'center' },

  logoSection: {
    width: 165, height: 165,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, position: 'relative',
  },
  outerHexRing: { position: 'absolute', top: 1.5, left: 1.5 },
  logoImg: { width: 104, height: 104 },

  schoolNameBlock: { alignItems: 'center', marginBottom: 12 },
  schoolAr: {
    fontSize: 26, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginBottom: 6,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 2px 12px rgba(201,149,42,0.50)' } as any
      : { textShadowColor: 'rgba(201,149,42,0.50)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 }),
  },
  schoolLine: { width: 60, height: 1.5, backgroundColor: '#c9952a', marginBottom: 6, opacity: 0.7 },
  schoolSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)' },

  mottoRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  mottoChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(201,149,42,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)',
  },
  mottoChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#dfb04a', letterSpacing: 0.5 },

  dividerFull: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 14, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.35)' },

  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 18, width: '100%' },
  roleCard: { flex: 1 },
  roleInner: {
    paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 8,
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', position: 'relative',
  },
  roleGlowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 44, borderRadius: 16 },
  roleLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  roleLabelActive: { color: '#FFFFFF' },
  roleSub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.28)', textAlign: 'center' },
  roleActiveDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

  formWrap: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 10, overflow: 'hidden',
  },
  scanLine: { height: 2, width: '100%' },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 52 },
  inputDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16 },
  input: {
    flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular',
    color: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 0,
  },

  loginBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  loginGrad: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  loginTxt: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  waCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(37,211,102,0.07)',
    borderRadius: 13, borderWidth: 1, borderColor: 'rgba(37,211,102,0.18)',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginBottom: 16,
  },
  waName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  waSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.40)', marginTop: 1 },
  waNum: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#25D366' },

  signupLink: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 10,
  },
  signupLinkTxt: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)' },
  signupLinkBold: { fontFamily: 'Inter_700Bold', color: '#dfb04a' },

  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  versionTxt: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.22)', letterSpacing: 0.3 },

  guestBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, marginBottom: 10,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  guestBtnTxt: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.40)' },

  bioSepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  bioSepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  bioSepTxt: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.35)' },
  bioBtn: {
    width: '100%', borderRadius: 18, marginBottom: 14,
    backgroundColor: 'rgba(201,149,42,0.10)', borderWidth: 1.5,
    borderColor: 'rgba(201,149,42,0.35)',
  },
  bioBtnInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  bioIconWrap: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(201,149,42,0.15)', borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)',
  },
  bioBtnTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginBottom: 3 },
  bioBtnSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(201,149,42,0.85)' },
});

