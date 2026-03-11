import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

type RegRole = 'parent' | 'teacher';

const ROLES: { id: RegRole; label: string; icon: string; color: string; grad: readonly [string, string] }[] = [
  { id: 'parent',  label: 'ولي أمر', icon: 'account-heart', color: '#A855F7', grad: ['#3b1660', '#7B3FA0'] },
  { id: 'teacher', label: 'معلمة',   icon: 'school',        color: '#10B981', grad: ['#0d3d35', '#1A6B5C'] },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { apiRegister } = useAuth();
  const { students, updateStudent, employees, updateEmployee } = useAppData();

  const [role, setRole] = useState<RegRole>('parent');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [isLoading, setIsLoading] = useState(false);

  const activeRole = ROLES.find(r => r.id === role)!;

  const handleSubmit = async () => {
    const cred = credential.trim();
    const pass = password.trim();
    const conf = confirm.trim();

    if (!cred) {
      Alert.alert('تنبيه', role === 'parent' ? 'أدخل رقم الهاتف' : 'أدخل البريد الإلكتروني');
      return;
    }
    if (pass.length < 4) {
      Alert.alert('تنبيه', 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (pass !== conf) {
      Alert.alert('تنبيه', 'كلمة المرور وتأكيدها غير متطابقين');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 700));

    if (role === 'parent') {
      const stu = students.find(s => s.parentPhone && s.parentPhone.replace(/\s/g, '') === cred.replace(/\s/g, ''));
      if (!stu) {
        setIsLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('غير مسجّل', 'رقم الهاتف غير موجود في النظام\nيرجى التواصل مع الإدارة لتسجيل بياناتك');
        return;
      }
      updateStudent(stu.id, { parentPassword: pass });
      const apiRes = await apiRegister({
        full_name: stu.parentName,
        phone: cred.replace(/\s/g, ''),
        role: 'parent',
        password: pass,
        linked_id: stu.id,
      }).catch(() => ({ ok: false, error: 'خطأ في الاتصال' }));
      if (!apiRes.ok && apiRes.error !== 'هذا الحساب مسجّل مسبقاً، سجّل الدخول مباشرة') {
        console.warn('[register] API sync failed:', apiRes.error);
      }
    } else {
      const emp = employees.find(e => e.email && e.email.toLowerCase() === cred.toLowerCase());
      if (!emp) {
        setIsLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('غير مسجّل', 'البريد الإلكتروني غير موجود في النظام\nيرجى التواصل مع الإدارة لإضافة حسابك');
        return;
      }
      updateEmployee(emp.id, { password: pass });
      const apiRes = await apiRegister({
        full_name: emp.name,
        email: cred.toLowerCase(),
        role: 'teacher',
        password: pass,
        linked_id: emp.id,
      }).catch(() => ({ ok: false, error: 'خطأ في الاتصال' }));
      if (!apiRes.ok && apiRes.error !== 'هذا الحساب مسجّل مسبقاً، سجّل الدخول مباشرة') {
        console.warn('[register] API sync failed:', apiRes.error);
      }
    }

    setIsLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('done');
  };

  if (step === 'done') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#030612', '#060c28', '#0a1050']} style={StyleSheet.absoluteFill} />
        <View style={[s.successWrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
          <View style={s.successIcon}>
            <LinearGradient colors={['#10B981', '#059669']} style={s.successGrad}>
              <Ionicons name="checkmark" size={52} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={s.successTitle}>تم إنشاء الحساب!</Text>
          <Text style={s.successSub}>
            {role === 'parent'
              ? 'يمكنك الآن تسجيل الدخول برقم هاتفك وكلمة المرور الجديدة'
              : 'يمكنك الآن تسجيل الدخول ببريدك الإلكتروني وكلمة المرور الجديدة'}
          </Text>
          <Pressable
            style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.replace('/login')}
          >
            <LinearGradient colors={['#a07018', '#c9952a', '#e8b84b']} style={s.backGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.backTxt}>الذهاب لتسجيل الدخول</Text>
              <Ionicons name="arrow-back" size={18} color="#fff" style={{ marginRight: 4 }} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#030612', '#060c28', '#0a1050']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scroll, {
            paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 16,
            paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24,
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable
              style={({ pressed }) => [s.backArrow, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Text style={s.headerTitle}>إنشاء حساب</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Logo small */}
          <View style={s.logoRow}>
            <HexFrame size={72} fill="rgba(255,255,255,0.06)" stroke="rgba(201,149,42,0.4)" strokeWidth={1.5}>
              <MaterialCommunityIcons name="account-plus" size={30} color="rgba(201,149,42,0.9)" />
            </HexFrame>
            <View style={{ alignItems: 'center' }}>
              <Text style={s.subTitle}>روضة أحباب الله</Text>
              <Text style={s.subText}>أنشئ حسابك للوصول للنظام</Text>
            </View>
          </View>

          {/* Role Selector */}
          <Text style={s.label}>نوع الحساب</Text>
          <View style={s.rolesRow}>
            {ROLES.map(r => {
              const active = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => [s.roleBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => { setRole(r.id); setCredential(''); }}
                >
                  <LinearGradient
                    colors={active ? r.grad : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                    style={[s.roleBtnInner, active && { borderColor: r.color + '60' }]}
                  >
                    <HexFrame size={40} fill={active ? r.color + '30' : 'transparent'} stroke={active ? r.color + '70' : 'rgba(255,255,255,0.15)'} strokeWidth={1.5}>
                      <MaterialCommunityIcons name={r.icon as any} size={18} color={active ? r.color : 'rgba(255,255,255,0.35)'} />
                    </HexFrame>
                    <Text style={[s.roleLbl, active && { color: '#fff' }]}>{r.label}</Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* Fields */}
          <Text style={s.label}>{role === 'parent' ? 'رقم الهاتف المسجّل' : 'البريد الإلكتروني المسجّل'}</Text>
          <View style={s.fieldBox}>
            <Ionicons
              name={role === 'parent' ? 'call-outline' : 'mail-outline'}
              size={17}
              color="rgba(255,255,255,0.4)"
              style={{ marginLeft: 14 }}
            />
            <TextInput
              style={s.input}
              placeholder={role === 'parent' ? '+249 XXX XXX XXX' : 'email@ahbaballah.edu'}
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={credential}
              onChangeText={setCredential}
              autoCapitalize="none"
              keyboardType={role === 'parent' ? 'phone-pad' : 'email-address'}
              textAlign="right"
            />
          </View>

          <Text style={[s.label, { marginTop: 14 }]}>كلمة المرور الجديدة</Text>
          <View style={s.fieldBox}>
            <Pressable onPress={() => setShowPass(!showPass)} style={{ marginLeft: 14 }}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={17} color="rgba(255,255,255,0.4)" />
            </Pressable>
            <TextInput
              style={s.input}
              placeholder="4 أحرف على الأقل"
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              textAlign="right"
            />
          </View>

          <Text style={[s.label, { marginTop: 14 }]}>تأكيد كلمة المرور</Text>
          <View style={[s.fieldBox, confirm && password && {
            borderColor: confirm === password ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
          }]}>
            <Pressable onPress={() => setShowConfirm(!showConfirm)} style={{ marginLeft: 14 }}>
              <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={17} color="rgba(255,255,255,0.4)" />
            </Pressable>
            <TextInput
              style={s.input}
              placeholder="أعد كتابة كلمة المرور"
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              textAlign="right"
            />
            {confirm.length > 0 && (
              <Ionicons
                name={confirm === password ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={confirm === password ? '#10B981' : '#EF4444'}
                style={{ marginRight: 14 }}
              />
            )}
          </View>

          {/* Info note */}
          <View style={s.noteBox}>
            <Ionicons name="information-circle-outline" size={15} color="rgba(201,149,42,0.7)" style={{ marginLeft: 6 }} />
            <Text style={s.noteTxt}>
              {role === 'parent'
                ? 'يجب أن يكون رقم هاتفك مسجّلاً مسبقاً من قِبل إدارة الروضة'
                : 'يجب أن يكون بريدك الإلكتروني مضافاً من قِبل الإدارة'}
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [s.submitBtn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#a07018', '#c9952a', '#e8b84b']}
              style={s.submitGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <View style={s.dots}>
                  {[1, 0.6, 0.3].map((op, i) => <View key={i} style={[s.dot, { opacity: op }]} />)}
                </View>
              ) : (
                <>
                  <Text style={s.submitTxt}>إنشاء الحساب</Text>
                  <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 4 }} />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable style={s.loginLink} onPress={() => router.back()}>
            <Text style={s.loginLinkTxt}>
              لديك حساب؟ <Text style={s.loginLinkBold}>تسجيل الدخول</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginBottom: 24,
  },
  backArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28, alignSelf: 'flex-end' },
  subTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'right' },
  subText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginTop: 3 },

  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)', marginBottom: 8, alignSelf: 'flex-end', width: '100%', textAlign: 'right' },

  rolesRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 20 },
  roleBtn: { flex: 1 },
  roleBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  roleLbl: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.4)' },

  fieldBox: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    height: 52, marginBottom: 4,
  },
  input: {
    flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular',
    color: '#fff', paddingHorizontal: 12,
  },

  noteBox: {
    width: '100%', flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(201,149,42,0.07)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(201,149,42,0.18)',
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 18, marginBottom: 22,
  },
  noteTxt: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'right', lineHeight: 17 },

  submitBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  submitGrad: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  submitTxt: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  loginLink: { paddingVertical: 8 },
  loginLinkTxt: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)' },
  loginLinkBold: { fontFamily: 'Inter_700Bold', color: '#dfb04a' },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIcon: { borderRadius: 60, overflow: 'hidden', marginBottom: 28 },
  successGrad: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 14, textAlign: 'center' },
  successSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  backBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  backGrad: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  backTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
