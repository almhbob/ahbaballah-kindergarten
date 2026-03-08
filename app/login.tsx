import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const ROLES: { id: UserRole; label: string; subtitle: string; icon: string; color: string }[] = [
  { id: 'admin', label: 'مدير / مشرف', subtitle: 'الوصول الكامل', icon: 'shield-check', color: '#0F2B4E' },
  { id: 'teacher', label: 'معلم / معلمة', subtitle: 'إدارة الفصل والطلاب', icon: 'school', color: '#1A6B5C' },
  { id: 'parent', label: 'ولي الأمر', subtitle: 'متابعة الطفل', icon: 'account-heart', color: '#7B3FA0' },
];

const DEMO_ACCOUNTS = {
  admin: { id: 'admin_1', name: 'أ. سلمى القحطاني', role: 'admin' as UserRole },
  teacher: { id: 'teacher_1', name: 'أ. نورة السبيعي', role: 'teacher' as UserRole, teacherClass: 'KG2' },
  parent: { id: 'parent_s1', name: 'محمد العمري', role: 'parent' as UserRole, studentId: 's1' },
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
    if (!selectedRole) {
      Alert.alert('تنبيه', 'الرجاء اختيار نوع الحساب');
      return;
    }
    if (!username || !password) {
      Alert.alert('تنبيه', 'الرجاء إدخال بيانات الدخول');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
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
        colors={['#0F2B4E', '#1A3A5C', '#0D3B6E']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="school" size={48} color={Colors.accent} />
            </View>
            <Text style={styles.appName}>مدرستي</Text>
            <Text style={styles.tagline}>نظام إدارة الروضة الذكي</Text>
          </View>

          <Text style={styles.sectionLabel}>اختر نوع حسابك</Text>

          <View style={styles.rolesRow}>
            {ROLES.map(role => (
              <Pressable
                key={role.id}
                style={({ pressed }) => [
                  styles.roleCard,
                  selectedRole === role.id && styles.roleCardSelected,
                  { opacity: pressed ? 0.85 : 1 }
                ]}
                onPress={() => handleRoleSelect(role.id)}
              >
                {selectedRole === role.id && (
                  <View style={styles.roleCheckmark}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                  </View>
                )}
                <MaterialCommunityIcons
                  name={role.icon as any}
                  size={30}
                  color={selectedRole === role.id ? Colors.accent : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.roleLabel, selectedRole === role.id && styles.roleLabelActive]}>
                  {role.label}
                </Text>
                <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="اسم المستخدم"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textAlign="right"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.loginBtn, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.accent, '#E8900A']}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <View style={styles.loadingDots}>
                    <View style={styles.dot} />
                    <View style={[styles.dot, { opacity: 0.7 }]} />
                    <View style={[styles.dot, { opacity: 0.4 }]} />
                  </View>
                ) : (
                  <Text style={styles.loginBtnText}>دخول</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.hint}>تجربة: اختر دوراً وسيتم ملء البيانات تلقائياً</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,160,28,0.3)',
  },
  appName: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
    width: '100%',
  },
  roleCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    backgroundColor: 'rgba(244,160,28,0.12)',
    borderColor: Colors.accent,
  },
  roleCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  roleLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  roleLabelActive: {
    color: '#FFFFFF',
  },
  roleSubtitle: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  loginBtn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  loginBtnGradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
});
