import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Dimensions,
  ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';

const { width: W } = Dimensions.get('window');

export const ONBOARDING_KEY = 'onboarding_done_v1';

const STEPS = [
  {
    icon:        'domain',
    color:       '#0c1155',
    gradColors:  ['#030612', '#0c1155', '#1e2480'] as [string, string, string],
    title:       'مرحباً بك في نظام نظم إدارة رياض الأطفال',
    subtitle:    'نظام إداري متكامل لإدارة الروضات الخاصة',
    desc:        'ستتمكن من إدارة الطلاب، المعلمات، الأولياء، الحضور، الرواتب، والمزيد — كل شيء في مكان واحد.',
    feature:     null,
  },
  {
    icon:        'account-group',
    color:       '#1d6954',
    gradColors:  ['#0a1f1b', '#0e3d30', '#1d6954'] as [string, string, string],
    title:       'إدارة شاملة للطلاب',
    subtitle:    'أضف وتابع كل طالب بسهولة',
    desc:        'سجّل بيانات الطلاب الكاملة، تابع الحضور يومياً، وتابع السلوك والواجبات. يمكنك أيضاً تصدير التقارير ومشاركتها مع الأهالي.',
    feature:     'استخدم رمز QR لتسريع تسجيل الحضور',
  },
  {
    icon:        'bell-ring',
    color:       '#7c3aed',
    gradColors:  ['#1a0a38', '#3d1a8c', '#7c3aed'] as [string, string, string],
    title:       'تواصل فوري مع الأهالي',
    subtitle:    'إشعارات ورسائل في وقتها',
    desc:        'أرسل إشعارات جماعية أو فردية للأهالي والمعلمات. شارك أخبار الروضة وفعالياتها، وتلقَّ استفساراتهم عبر صندوق الوارد.',
    feature:     'يمكن إرسال إشعار لمجموعة محددة أو للجميع',
  },
  {
    icon:        'cash-multiple',
    color:       '#d97706',
    gradColors:  ['#1a0e00', '#6b3800', '#d97706'] as [string, string, string],
    title:       'إدارة مالية احترافية',
    subtitle:    'رواتب، رسوم، وتقارير مالية',
    desc:        'تابع رواتب المعلمات وحضورهن، وأنشئ تقارير مالية شاملة. جميع الأرقام بالريال السعودي مع رسوم بيانية تفاعلية.',
    feature:     'يُرفع الراتب تلقائياً عند تعديل المسمى الوظيفي',
  },
  {
    icon:        'shield-check',
    color:       '#c9952a',
    gradColors:  ['#1a1200', '#6b4a00', '#c9952a'] as [string, string, string],
    title:       'أنت جاهز للانطلاق!',
    subtitle:    'ابدأ الآن وأضف مدرستك',
    desc:        'إعدادات النظام، إضافة المعلمات والطلاب، وتخصيص هوية الروضة البصرية — كل ذلك في متناول يدك.',
    feature:     null,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const current = STEPS[step];

  const goTo = (idx: number) => {
    setStep(idx);
    scrollRef.current?.scrollTo({ x: idx * W, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(admin)');
  };

  const isLast = step === STEPS.length - 1;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={current.gradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.gradBg, { paddingTop: topPad }]}
      >
        {/* Skip button */}
        {!isLast && (
          <Pressable style={s.skipBtn} onPress={finish}>
            <Text style={s.skipTxt}>تخطي</Text>
          </Pressable>
        )}

        {/* Icon */}
        <View style={[s.iconCircle, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }]}>
          <MaterialCommunityIcons name={current.icon as any} size={54} color="#fff" />
        </View>

        <Text style={s.title}>{current.title}</Text>
        <Text style={s.subtitle}>{current.subtitle}</Text>
      </LinearGradient>

      {/* Content */}
      <View style={[s.card, { paddingBottom: botPad }]}>
        <Text style={s.desc}>{current.desc}</Text>
        {current.feature && (
          <View style={s.featureBox}>
            <MaterialCommunityIcons name="lightbulb-on" size={16} color="#d97706" />
            <Text style={s.featureTxt}>{current.feature}</Text>
          </View>
        )}

        {/* Dots */}
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={s.btnRow}>
          {step > 0 && (
            <Pressable style={s.btnBack} onPress={() => goTo(step - 1)}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            style={[s.btnNext, isLast && s.btnFinish]}
            onPress={() => isLast ? finish() : goTo(step + 1)}
          >
            <Text style={s.btnNextTxt}>{isLast ? 'ابدأ الآن' : 'التالي'}</Text>
            {!isLast && <Ionicons name="chevron-back" size={18} color="#fff" style={{ marginRight: 4 }} />}
            {isLast && <MaterialCommunityIcons name="rocket-launch" size={18} color="#fff" style={{ marginRight: 4 }} />}
          </Pressable>
        </View>

        {/* Privacy note */}
        <Pressable onPress={() => router.push('/privacy')} style={s.privacyLink}>
          <MaterialCommunityIcons name="shield-check-outline" size={13} color={Colors.textLight} />
          <Text style={s.privacyTxt}>سياسة الخصوصية وشروط الاستخدام</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  gradBg:  { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32, minHeight: 340 },

  skipBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, marginBottom: 20,
  },
  skipTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' },

  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 22,
  },
  title:    { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  card: {
    flex: 1, backgroundColor: Colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
    marginTop: -16,
  },
  desc: {
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary,
    lineHeight: 24, textAlign: 'right', marginBottom: 16,
  },
  featureBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a',
    padding: 12, marginBottom: 16,
  },
  featureTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#92400e', flex: 1, textAlign: 'right' },

  dots:    { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderLight },
  dotActive: { width: 22, backgroundColor: Colors.primary },

  btnRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  btnBack:  {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  btnNext: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, height: 50, borderRadius: 14, backgroundColor: Colors.primary,
  },
  btnFinish:  { backgroundColor: '#c9952a' },
  btnNextTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },

  privacyLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16,
  },
  privacyTxt:  { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
});
