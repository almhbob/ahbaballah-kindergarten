import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Linking, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const ROLES: {
  id: UserRole; label: string; subtitle: string; icon: string;
  grad: readonly [string, string, string]; glow: string;
}[] = [
  { id: 'admin',   label: 'المدير',      subtitle: 'وصول كامل',   icon: 'shield-check',  grad: ['#0c1155','#1e2480','#2a33a0'], glow: '#3B82F6' },
  { id: 'teacher', label: 'المعلمة',     subtitle: 'إدارة الفصل', icon: 'school',        grad: ['#0d3d35','#1A6B5C','#22866f'], glow: '#10B981' },
  { id: 'parent',  label: 'ولي الأمر',   subtitle: 'متابعة الطفل',icon: 'account-heart', grad: ['#3b1660','#7B3FA0','#9250bc'], glow: '#A855F7' },
];

const DEMO_ACCOUNTS = {
  admin:   { id: 'admin_1',   name: 'أ. سلوى أحمد داموس', role: 'admin'   as UserRole },
  teacher: { id: 'teacher_1', name: 'أ. نورة السبيعي',     role: 'teacher' as UserRole, teacherClass: 'مستوى ثاني' },
  parent:  { id: 'parent_s1', name: 'محمد العمري',         role: 'parent'  as UserRole, studentId: 's1' },
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
    if (role === 'admin') setUsername('admin');
    else if (role === 'teacher') setUsername('teacher1');
    else setUsername('parent1');
    setPassword('1234');
  };

  const handleLogin = async () => {
    if (!selectedRole) { Alert.alert('تنبيه', 'الرجاء اختيار نوع الحساب'); return; }
    if (!username || !password) { Alert.alert('تنبيه', 'الرجاء إدخال بيانات الدخول'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 700));
    await login(DEMO_ACCOUNTS[selectedRole]);
    setIsLoading(false);
    if (selectedRole === 'admin') router.replace('/(admin)');
    else if (selectedRole === 'teacher') router.replace('/(teacher)');
    else router.replace('/(parent)');
  };

  const activeRole = ROLES.find(r => r.id === selectedRole);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Deep space background */}
      <LinearGradient
        colors={['#030612', '#060c28', '#0a1050']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Grid lines */}
      <View style={s.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[s.gridLine, { top: `${i * 14}%` as any }]} />
        ))}
      </View>

      {/* Glow orbs */}
      <View style={s.orb1} pointerEvents="none" />
      <View style={s.orb2} pointerEvents="none" />
      {activeRole && (
        <View style={[s.activeOrb, { backgroundColor: activeRole.glow + '20' }]} pointerEvents="none" />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={s.logoSection}>
            {/* Outer glow ring */}
            <View style={s.outerRing} />
            <View style={s.midRing} />
            {/* Logo frame */}
            <View style={s.logoFrame}>
              <Image
                source={require('@/assets/images/logo_new.jpg')}
                style={s.logoImg}
                resizeMode="contain"
              />
            </View>
            {/* Gold accent corners */}
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
          </View>

          {/* School name */}
          <View style={s.schoolNameBlock}>
            <Text style={s.schoolAr}>روضة أحباب الله</Text>
            <View style={s.schoolLine} />
            <Text style={s.schoolSub}>الخاصة — صفيتة الغنوماب</Text>
          </View>

          {/* Motto chips */}
          <View style={s.mottoRow}>
            {['جودة', 'التزام', 'تميز'].map((w, i) => (
              <View key={i} style={s.mottoChip}>
                <Text style={s.mottoChipText}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={s.dividerFull}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>اختر نوع حسابك</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Role cards */}
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
                    {active && <View style={[s.roleGlowTop, { backgroundColor: role.glow + '30' }]} />}
                    <View style={[s.roleIconWrap, active && { borderColor: role.glow + '60', backgroundColor: role.glow + '25' }]}>
                      <MaterialCommunityIcons
                        name={role.icon as any}
                        size={28}
                        color={active ? '#fff' : 'rgba(255,255,255,0.45)'}
                      />
                    </View>
                    <Text style={[s.roleLabel, active && s.roleLabelActive]}>{role.label}</Text>
                    <Text style={s.roleSub}>{role.subtitle}</Text>
                    {active && (
                      <View style={[s.roleActiveDot, { backgroundColor: role.glow }]} />
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* Login form */}
          <View style={s.formWrap}>
            {/* Scanline top */}
            <View style={[s.scanLine, { backgroundColor: activeRole ? activeRole.glow + '60' : Colors.accent + '60' }]} />

            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={17} color="rgba(255,255,255,0.4)" style={{ marginLeft: 12 }} />
              <TextInput
                style={s.input}
                placeholder="اسم المستخدم"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textAlign="right"
              />
            </View>
            <View style={s.inputDivider} />
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

          {/* Login button */}
          <Pressable
            style={({ pressed }) => [s.loginBtn, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#a07018', '#c9952a', '#e8b84b']}
              style={s.loginGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <View style={s.dots}>
                  {[1, 0.6, 0.3].map((op, i) => (
                    <View key={i} style={[s.dot, { opacity: op }]} />
                  ))}
                </View>
              ) : (
                <>
                  <Text style={s.loginTxt}>دخول</Text>
                  <Ionicons name="arrow-back" size={18} color="#fff" style={{ marginRight: 4 }} />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* WhatsApp card */}
          <Pressable
            style={({ pressed }) => [s.waCard, { opacity: pressed ? 0.82 : 1 }]}
            onPress={() => Linking.openURL('https://wa.me/249917545129')}
          >
            <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
              <Text style={s.waName}>أ. سلوى أحمد داموس</Text>
              <Text style={s.waSub}>مديرة الروضة — واتساب</Text>
            </View>
            <Text style={s.waNum}>+249917545129</Text>
          </Pressable>

          {/* Version tag */}
          <View style={s.versionRow}>
            <View style={s.versionDot} />
            <Text style={s.versionTxt}>v2.0 — Ahbab Allah Kindergarten System</Text>
            <View style={s.versionDot} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20, alignItems: 'center' },

  // Background elements
  gridOverlay: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.025)' },
  orb1: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(30,36,128,0.18)', top: -100, right: -100,
  },
  orb2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(201,149,42,0.09)', bottom: 60, left: -70,
  },
  activeOrb: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    bottom: -100, right: -100,
  },

  // Logo
  logoSection: {
    width: 156, height: 156,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, position: 'relative',
  },
  outerRing: {
    position: 'absolute', width: 156, height: 156, borderRadius: 78,
    borderWidth: 1, borderColor: 'rgba(201,149,42,0.18)',
  },
  midRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1.5, borderColor: 'rgba(201,149,42,0.35)',
  },
  logoFrame: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#c9952a',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 24px rgba(201,149,42,0.45)' } as any
      : { shadowColor: '#c9952a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8 }),
  },
  logoImg: { width: 112, height: 112 },

  // Corner accents
  corner: { position: 'absolute', width: 12, height: 12 },
  cornerTL: { top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#c9952a', borderTopLeftRadius: 3 },
  cornerTR: { top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#c9952a', borderTopRightRadius: 3 },
  cornerBL: { bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#c9952a', borderBottomLeftRadius: 3 },
  cornerBR: { bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#c9952a', borderBottomRightRadius: 3 },

  // School name
  schoolNameBlock: { alignItems: 'center', marginBottom: 12 },
  schoolAr: {
    fontSize: 26, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginBottom: 6,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 2px 12px rgba(201,149,42,0.50)' } as any
      : { textShadowColor: 'rgba(201,149,42,0.50)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 }),
  },
  schoolLine: { width: 60, height: 1.5, backgroundColor: '#c9952a', marginBottom: 6, opacity: 0.7 },
  schoolSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)' },

  // Motto
  mottoRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  mottoChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(201,149,42,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)',
  },
  mottoChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#dfb04a', letterSpacing: 0.5 },

  // Section divider
  dividerFull: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 14, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.35)' },

  // Role cards
  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 18, width: '100%' },
  roleCard: { flex: 1 },
  roleInner: {
    paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 8,
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', position: 'relative',
  },
  roleGlowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 40, borderRadius: 16,
  },
  roleIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  roleLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  roleLabelActive: { color: '#FFFFFF' },
  roleSub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.28)', textAlign: 'center' },
  roleActiveDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

  // Form
  formWrap: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 14, overflow: 'hidden',
  },
  scanLine: { height: 2, width: '100%' },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 52 },
  inputDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16 },
  input: {
    flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular',
    color: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 0,
  },

  // Login button
  loginBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  loginGrad: {
    height: 54, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6,
  },
  loginTxt: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  // WhatsApp
  waCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(37,211,102,0.07)',
    borderRadius: 13, borderWidth: 1, borderColor: 'rgba(37,211,102,0.18)',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginBottom: 16,
  },
  waName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  waSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.40)', marginTop: 1 },
  waNum: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#25D366' },

  // Version
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  versionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(201,149,42,0.5)' },
  versionTxt: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.22)', letterSpacing: 0.3 },
});
