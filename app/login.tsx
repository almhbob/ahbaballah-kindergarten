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
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const ROLES: {
  id: UserRole; label: string; subtitle: string; icon: string;
  grad: readonly [string, string, string]; glow: string; hexFill: string;
}[] = [
  { id: 'admin',   label: 'المدير',      subtitle: 'وصول كامل',    icon: 'shield-check',  grad: ['#0c1155','#1e2480','#2a33a0'], glow: '#3B82F6', hexFill: '#1e2480' },
  { id: 'teacher', label: 'المعلمة',     subtitle: 'إدارة الفصل',  icon: 'school',        grad: ['#0d3d35','#1A6B5C','#22866f'], glow: '#10B981', hexFill: '#1A6B5C' },
  { id: 'parent',  label: 'ولي الأمر',   subtitle: 'متابعة الطفل', icon: 'account-heart', grad: ['#3b1660','#7B3FA0','#9250bc'], glow: '#A855F7', hexFill: '#7B3FA0' },
];

const DEMO_ACCOUNTS = {
  admin:   { id: 'admin_1',   name: 'أ. سلوى أحمد داموس', role: 'admin'   as UserRole },
  teacher: { id: 'teacher_1', name: 'أ. نورة السبيعي',     role: 'teacher' as UserRole, teacherClass: 'مستوى ثاني' },
  parent:  { id: 'parent_s1', name: 'محمد العمري',         role: 'parent'  as UserRole, studentId: 's1' },
};

function HexDecor({ size, x, y, opacity }: { size: number; x: number; y: number; opacity: number }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, opacity }}>
      <HexFrame size={size} fill="transparent" stroke="rgba(201,149,42,0.6)" strokeWidth={1.5} />
    </View>
  );
}

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
      <LinearGradient
        colors={['#030612', '#060c28', '#0a1050']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Hexagonal background decorations */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <HexDecor size={160} x={-50} y={-40} opacity={0.12} />
        <HexDecor size={90}  x={280} y={60}  opacity={0.09} />
        <HexDecor size={120} x={-30} y={420} opacity={0.08} />
        <HexDecor size={70}  x={310} y={380} opacity={0.10} />
        <HexDecor size={50}  x={160} y={160} opacity={0.06} />
        <HexDecor size={200} x={100} y={600} opacity={0.05} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo hexagon ── */}
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
              <Image
                source={require('@/assets/images/logo_new.jpg')}
                style={s.logoImg}
                resizeMode="contain"
              />
            </HexFrame>

            {/* Outer ring hex */}
            <View style={s.outerHexRing} pointerEvents="none">
              <HexFrame size={162} fill="transparent" stroke="rgba(201,149,42,0.22)" strokeWidth={1} />
            </View>
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

          {/* Section divider */}
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
                    {active && <View style={[s.roleGlowTop, { backgroundColor: role.glow + '28' }]} />}

                    {/* Hexagonal icon */}
                    <HexFrame
                      size={54}
                      fill={active ? role.hexFill : 'rgba(255,255,255,0.06)'}
                      stroke={active ? role.glow + '80' : 'rgba(255,255,255,0.12)'}
                      strokeWidth={1.5}
                    >
                      <MaterialCommunityIcons
                        name={role.icon as any}
                        size={24}
                        color={active ? '#fff' : 'rgba(255,255,255,0.40)'}
                      />
                    </HexFrame>

                    <Text style={[s.roleLabel, active && s.roleLabelActive]}>{role.label}</Text>
                    <Text style={s.roleSub}>{role.subtitle}</Text>
                    {active && <View style={[s.roleActiveDot, { backgroundColor: role.glow }]} />}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* Login form */}
          <View style={s.formWrap}>
            <View style={[s.scanLine, { backgroundColor: activeRole ? activeRole.glow + '70' : Colors.accent + '70' }]} />
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
            <HexFrame size={38} fill="rgba(37,211,102,0.15)" stroke="rgba(37,211,102,0.35)" strokeWidth={1.5}>
              <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            </HexFrame>
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
              <Text style={s.waName}>أ. سلوى أحمد داموس</Text>
              <Text style={s.waSub}>مديرة الروضة — واتساب</Text>
            </View>
            <Text style={s.waNum}>+249917545129</Text>
          </Pressable>

          {/* Version tag */}
          <View style={s.versionRow}>
            <HexFrame size={10} fill="rgba(201,149,42,0.4)" stroke="rgba(201,149,42,0.6)" strokeWidth={1} />
            <Text style={s.versionTxt}>v2.0 — Ahbab Allah Kindergarten System</Text>
            <HexFrame size={10} fill="rgba(201,149,42,0.4)" stroke="rgba(201,149,42,0.6)" strokeWidth={1} />
          </View>
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
  roleGlowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 44, borderRadius: 16,
  },
  roleLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  roleLabelActive: { color: '#FFFFFF' },
  roleSub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.28)', textAlign: 'center' },
  roleActiveDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

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

  loginBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  loginGrad: {
    height: 54, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6,
  },
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

  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  versionTxt: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.22)', letterSpacing: 0.3 },
});
