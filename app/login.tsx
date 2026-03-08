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
import { Colors, Gradients } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const ROLES: { id: UserRole; label: string; subtitle: string; icon: string; gradient: readonly [string, string] }[] = [
  { id: 'admin',   label: 'مدير / مشرف',    subtitle: 'الوصول الكامل',         icon: 'shield-check',   gradient: ['#1a1f5c', '#252b7a'] },
  { id: 'teacher', label: 'معلم / معلمة',    subtitle: 'إدارة الفصل',           icon: 'school',         gradient: ['#1A6B5C', '#1f7d6b'] },
  { id: 'parent',  label: 'ولي الأمر',       subtitle: 'متابعة الطفل',          icon: 'account-heart',  gradient: ['#7B3FA0', '#8e4db8'] },
];

const DEMO_ACCOUNTS = {
  admin:   { id: 'admin_1',   name: 'أ. سلوى أحمد داموس', role: 'admin'   as UserRole },
  teacher: { id: 'teacher_1', name: 'أ. نورة السبيعي',     role: 'teacher' as UserRole, teacherClass: 'KG2' },
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
    const user = DEMO_ACCOUNTS[selectedRole];
    await login(user);
    setIsLoading(false);
    if (selectedRole === 'admin') router.replace('/(admin)');
    else if (selectedRole === 'teacher') router.replace('/(teacher)');
    else router.replace('/(parent)');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#0d1143', '#1a1f5c', '#222980']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & School Name */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlowRing} />
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/logo2.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.appName}>روضة أحباب الله</Text>
            <Text style={styles.tagline}>الخاصة — صفيتة الغنوماب</Text>
            <View style={styles.mottoRow}>
              <View style={styles.mottoDot} />
              <Text style={styles.mottoText}>جودة</Text>
              <View style={styles.mottoDot} />
              <Text style={styles.mottoText}>التزام</Text>
              <View style={styles.mottoDot} />
              <Text style={styles.mottoText}>تميز</Text>
            </View>
          </View>

          {/* Role cards */}
          <Text style={styles.sectionLabel}>اختر نوع حسابك</Text>
          <View style={styles.rolesRow}>
            {ROLES.map(role => {
              const active = selectedRole === role.id;
              return (
                <Pressable
                  key={role.id}
                  style={({ pressed }) => [styles.roleCard, { opacity: pressed ? 0.88 : 1 }]}
                  onPress={() => handleRoleSelect(role.id)}
                >
                  <LinearGradient
                    colors={active ? role.gradient : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.05)']}
                    style={[styles.roleGrad, active && styles.roleGradActive]}
                  >
                    {active && (
                      <View style={styles.roleCheck}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                    <View style={[styles.roleIconBg, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <MaterialCommunityIcons
                        name={role.icon as any}
                        size={26}
                        color={active ? '#fff' : 'rgba(255,255,255,0.6)'}
                      />
                    </View>
                    <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{role.label}</Text>
                    <Text style={styles.roleSub}>{role.subtitle}</Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* Login form */}
          <View style={styles.formCard}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.45)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="اسم المستخدم"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textAlign="right"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputRow}>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="rgba(255,255,255,0.45)" />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.loginBtn, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#ca9928', '#b8841c', '#a07018']}
              style={styles.loginBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <View style={styles.dots}>
                  <View style={styles.dot} />
                  <View style={[styles.dot, { opacity: 0.65 }]} />
                  <View style={[styles.dot, { opacity: 0.3 }]} />
                </View>
              ) : (
                <Text style={styles.loginBtnText}>دخول ←</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* WhatsApp contact */}
          <Pressable
            style={({ pressed }) => [styles.whatsappCard, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => Linking.openURL('https://wa.me/249917545129')}
          >
            <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
            <View style={styles.whatsappInfo}>
              <Text style={styles.whatsappName}>أ. سلوى أحمد داموس</Text>
              <Text style={styles.whatsappSub}>إدارة الروضة — واتساب</Text>
            </View>
            <Text style={styles.whatsappNum}>+249917545129</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, alignItems: 'center' },

  circle1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(202,153,40,0.07)', top: -60, right: -80,
  },
  circle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 100, left: -60,
  },

  header: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logoGlowRing: {
    position: 'absolute',
    width: 158, height: 158, borderRadius: 79,
    borderWidth: 1.5, borderColor: 'rgba(202,153,40,0.3)',
  },
  logoContainer: {
    width: 136, height: 136, borderRadius: 68,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#ca9928',
    overflow: 'hidden',
  },
  logoImage: { width: 124, height: 124 },
  appName: {
    fontSize: 26, fontFamily: 'Inter_700Bold', color: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? { textShadow: '0px 1px 8px rgba(202,153,40,0.4)' }
      : { textShadowColor: 'rgba(202,153,40,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }),
    marginBottom: 4,
  },
  tagline: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  mottoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mottoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ca9928' },
  mottoText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#ca9928', letterSpacing: 0.3 },

  sectionLabel: {
    fontSize: 13, fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.55)', alignSelf: 'flex-end', marginBottom: 10,
  },
  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
  roleCard: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  roleGrad: {
    paddingVertical: 16, paddingHorizontal: 6,
    alignItems: 'center', gap: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  roleGradActive: { borderColor: 'rgba(255,255,255,0.3)' },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  roleIconBg: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  roleLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  roleLabelActive: { color: '#FFFFFF' },
  roleSub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  formCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12, overflow: 'hidden',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 52 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 14 },
  inputIcon: { marginLeft: 10 },
  input: {
    flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular',
    color: '#FFFFFF', paddingVertical: 0,
  },

  loginBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  loginBtnGrad: { height: 56, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },

  whatsappCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(37,211,102,0.09)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(37,211,102,0.22)',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  whatsappInfo: { flex: 1, alignItems: 'flex-end' },
  whatsappName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  whatsappSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  whatsappNum: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#25D366', writingDirection: 'ltr' },
});
