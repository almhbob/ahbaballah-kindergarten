import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Redirect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shown after signing in with a temporary or default password.
 * The user must choose a personal password before using the app.
 */
export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { user, changePassword, logout } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role === 'guest') return <Redirect href="/login" />;

  const goHome = () => {
    if (user.role === 'admin') router.replace('/(admin)');
    else if (user.role === 'teacher') router.replace('/(teacher)');
    else router.replace('/(parent)');
  };

  const submit = async () => {
    setError('');
    if (!current) { setError('أدخل كلمة المرور الحالية (المؤقتة)'); return; }
    if (next.length < 6) { setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return; }
    if (next !== confirm) { setError('كلمة المرور الجديدة وتأكيدها غير متطابقين'); return; }
    setBusy(true);
    const r = await changePassword(current, next);
    setBusy(false);
    if (!r.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(r.error ?? 'تعذّر تغيير كلمة المرور');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goHome();
  };

  const field = (label: string, value: string, onChange: (v: string) => void, icon: string) => (
    <>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <Pressable onPress={() => setShow(v => !v)} style={s.inputIcon} accessibilityLabel="إظهار كلمة المرور">
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
        </Pressable>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={v => { onChange(v); setError(''); }}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          textAlign="right"
        />
        <MaterialCommunityIcons name={icon as any} size={18} color={Colors.textLight} style={s.inputIcon} />
      </View>
    </>
  );

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#030612', '#0c1155', '#1e2480']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.headerGrad, { paddingTop: topPad + 24 }]}
      >
        <View style={s.logoWrap}>
          <View style={s.logoIcon}>
            <MaterialCommunityIcons name="shield-key" size={34} color="#c9952a" />
          </View>
          <Text style={s.title}>تعيين كلمة مرور جديدة</Text>
          <Text style={s.subtitle}>
            لحماية حسابك وبيانات الأطفال، يجب اختيار كلمة مرور خاصة بك{'\n'}بدلاً من كلمة المرور المؤقتة
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {field('كلمة المرور الحالية (المؤقتة)', current, setCurrent, 'lock-outline')}
          {field('كلمة المرور الجديدة', next, setNext, 'lock-plus-outline')}
          {field('تأكيد كلمة المرور الجديدة', confirm, setConfirm, 'lock-check-outline')}

          <Text style={s.hint}>6 أحرف على الأقل، ولا تستخدم كلمات مرور سهلة مثل 123456</Text>

          {!!error && (
            <View style={s.errorRow}>
              <Text style={s.errorTxt}>{error}</Text>
              <Ionicons name="alert-circle" size={15} color={Colors.danger} />
            </View>
          )}

          <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            <LinearGradient colors={['#c9952a', '#a87820']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>حفظ والمتابعة</Text>}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={async () => { await logout(); router.replace('/login'); }} style={s.logoutBtn}>
            <Text style={s.logoutTxt}>تسجيل الخروج</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerGrad: { paddingBottom: 28, paddingHorizontal: 20 },
  logoWrap: { alignItems: 'center' },
  logoIcon: {
    width: 68, height: 68, borderRadius: 34, marginBottom: 14,
    backgroundColor: 'rgba(201,149,42,0.12)', borderWidth: 2, borderColor: 'rgba(201,149,42,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 21, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 19 },
  body: { padding: 24 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16, paddingHorizontal: 12,
  },
  inputIcon: { padding: 4 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, marginHorizontal: 8 },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginBottom: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, justifyContent: 'flex-end' },
  errorTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.danger, flexShrink: 1, textAlign: 'right' },
  btn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  btnGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  btnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  logoutBtn: { alignItems: 'center', padding: 8 },
  logoutTxt: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textLight },
});
