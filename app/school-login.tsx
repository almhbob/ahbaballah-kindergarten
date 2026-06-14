import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolTheme } from '@/contexts/SchoolThemeContext';
import { schoolAdminSignIn } from '@/lib/school-auth';

export default function SchoolLoginScreen() {
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === 'web' ? 67 : insets.top;
  const botPad  = Platform.OS === 'web' ? 34 : insets.bottom;

  const { login } = useAuth();
  const { switchSchool } = useSchoolTheme();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    const result = await schoolAdminSignIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'خطأ في تسجيل الدخول');
      return;
    }
    if (result.schoolId) {
      await switchSchool(result.schoolId);
    }
    await login({
      id:   result.schoolId ?? 'school-admin',
      name: result.displayName ?? 'مدير الروضة',
      role: 'admin',
    });
    router.replace('/(admin)');
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#030612', '#0c1155', '#1e2480']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.headerGrad, { paddingTop: topPad + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.60)" />
        </Pressable>
        <View style={s.logoWrap}>
          <View style={s.logoIcon}>
            <MaterialCommunityIcons name="domain" size={36} color="#c9952a" />
          </View>
          <View style={s.platformBadge}>
            <Text style={s.platformBadgeTxt}>نُظُم — رياض الأطفال</Text>
          </View>
          <Text style={s.title}>دخول مدير الروضة</Text>
          <Text style={s.subtitle}>أدخل البريد الإلكتروني وكلمة مرور حساب روضتك</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Email */}
          <Text style={s.label}>البريد الإلكتروني</Text>
          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={email}
              onChangeText={v => { setEmail(v); setError(''); }}
              placeholder="admin@myschool.edu"
              placeholderTextColor={Colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="left"
            />
          </View>

          {/* Password */}
          <Text style={s.label}>كلمة المرور</Text>
          <View style={s.inputRow}>
            <Pressable onPress={() => setShowPw(p => !p)} style={s.inputIcon}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
            </Pressable>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={v => { setPassword(v); setError(''); }}
              placeholder="••••••••"
              placeholderTextColor={Colors.textLight}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              textAlign="right"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
          </View>

          {/* Error */}
          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* Login button */}
          <Pressable style={s.loginBtn} onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={['#c9952a', '#a87820', '#c9952a']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.loginGrad}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <MaterialCommunityIcons name="login" size={18} color="#fff" />
                    <Text style={s.loginTxt}>دخول</Text>
                  </>
              }
            </LinearGradient>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerGrad: { paddingBottom: 32, paddingHorizontal: 20 },
  backBtn:    { alignSelf: 'flex-start', padding: 4, marginBottom: 20 },
  logoWrap:   { alignItems: 'center' },
  logoIcon: {
    width: 72, height: 72, borderRadius: 36, marginBottom: 14,
    backgroundColor: 'rgba(201,149,42,0.12)', borderWidth: 2, borderColor: 'rgba(201,149,42,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },
  platformBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(201,149,42,0.12)', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)',
    marginBottom: 10,
  },
  platformBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#e8b84b', letterSpacing: 0.5 },
  title:    { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)', textAlign: 'center' },

  body:  { padding: 24 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 18, paddingHorizontal: 12,
  },
  inputIcon: { padding: 4 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, marginHorizontal: 8 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, justifyContent: 'flex-end' },
  errorTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.danger },

  loginBtn:  { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  loginGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  loginTxt:  { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },

});
