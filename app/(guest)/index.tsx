import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Image, Linking, Alert, Animated, Dimensions, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, RegistrationRequest } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');

async function openLink(url: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else Alert.alert('تعذّر الفتح', url);
  } catch { Alert.alert('خطأ', url); }
}

const SERVICES = [
  { icon: 'book-open-variant',   color: '#3B82F6', bg: '#EFF6FF', title: 'منهج متكامل',      desc: 'مناهج معتمدة تجمع بين اللغة العربية والإنجليزية والتربية الإسلامية والرياضيات' },
  { icon: 'palette',             color: '#8B5CF6', bg: '#F5F3FF', title: 'الفنون الإبداعية',  desc: 'حصص رسم وتشكيل وموسيقى تُنمّي الموهبة والإبداع لدى طفلك' },
  { icon: 'run-fast',            color: '#10B981', bg: '#ECFDF5', title: 'الأنشطة البدنية',   desc: 'ملعب مجهّز ونشاطات حركية يومية تبني اللياقة والروح الرياضية' },
  { icon: 'tablet-ipad',         color: '#F59E0B', bg: '#FFFBEB', title: 'التعلم الرقمي',     desc: 'أجهزة لوحية وألعاب تعليمية تفاعلية لتحفيز حب التعلم' },
  { icon: 'food-apple',          color: '#EF4444', bg: '#FEF2F2', title: 'وجبات صحية',        desc: 'وجبات مغذية يومية مُعدّة وفق مواصفات التغذية السليمة للأطفال' },
  { icon: 'shield-check',        color: '#06B6D4', bg: '#F0FDFA', title: 'بيئة آمنة',          desc: 'كاميرات مراقبة وطواقم متخصصة لضمان سلامة أطفالنا طوال اليوم' },
  { icon: 'account-heart',       color: '#EC4899', bg: '#FDF2F8', title: 'معلمات مؤهّلات',    desc: 'كادر تدريسي من المعلمات المتخصصات في التربية وتعليم الأطفال المبكر' },
  { icon: 'bus',                 color: '#7C3AED', bg: '#F5F3FF', title: 'خدمة المواصلات',   desc: 'حافلات مدرسية مجهزة تصل إلى جميع أحياء صفيتة بأمان وراحة' },
];

const STATS = [
  { value: '+150',   label: 'طفل سعيد',         icon: 'emoticon-happy-outline',   color: '#3B82F6' },
  { value: '12',     label: 'معلمة متخصصة',      icon: 'account-tie',             color: '#8B5CF6' },
  { value: '8',      label: 'سنوات خبرة',        icon: 'star',                    color: Colors.accent },
  { value: '3',      label: 'مستويات دراسية',    icon: 'layers',                  color: '#10B981' },
];

const LEVELS = [
  { level: 'براعم',         age: '3 – 4 سنوات', color: '#EC4899', bg: '#FDF2F8', icon: 'flower' },
  { level: 'مستوى أول',    age: '4 – 5 سنوات', color: '#3B82F6', bg: '#EFF6FF', icon: 'numeric-1-circle' },
  { level: 'مستوى ثاني',   age: '5 – 6 سنوات', color: '#10B981', bg: '#ECFDF5', icon: 'numeric-2-circle' },
];

const TESTIMONIALS = [
  { name: 'أم عبدالله',  text: 'ابني تغيّر كثيراً من حيث الثقة بالنفس والتواصل مع الآخرين، الشكر لكل المعلمات.', stars: 5 },
  { name: 'أم سلطان',   text: 'روضة رائعة، الاهتمام بالأطفال واضح جداً ومستوى التعليم ممتاز بكل المقاييس.', stars: 5 },
  { name: 'أم محمد',    text: 'من أفضل ما في الروضة التواصل المستمر مع الأهل وإشعارنا بكل صغيرة وكبيرة.', stars: 5 },
];

const STEPS = [
  { num: '١', title: 'التواصل',   desc: 'اتصل أو راسلنا عبر واتساب لمعرفة التفاصيل' },
  { num: '٢', title: 'الزيارة',   desc: 'قم بجولة في الروضة وتعرّف على البيئة والمعلمات' },
  { num: '٣', title: 'التسجيل',   desc: 'أكمل نموذج التسجيل وأحضر الوثائق المطلوبة' },
  { num: '٤', title: 'الانضمام',  desc: 'مرحباً بطفلك في عائلة روضة أحباب الله' },
];

function StarsRow({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginBottom: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Ionicons key={i} name="star" size={12} color={Colors.accent} />
      ))}
    </View>
  );
}

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent, transform: [{ scale }] }} />;
}

const NEWS_ICONS: Record<string, { icon: string; color: string }> = {
  trip:     { icon: 'bus',               color: Colors.success },
  activity: { icon: 'star',              color: '#3B82F6' },
  general:  { icon: 'newspaper-variant', color: Colors.accent },
};

// ─── REGISTRATION FORM ───────────────────────────────────────────────────────

type Level = 'براعم' | 'مستوى أول' | 'مستوى ثاني';
type Gender = 'ذكر' | 'أنثى';

const FORM_LEVELS: Level[] = ['براعم', 'مستوى أول', 'مستوى ثاني'];
const RELATIONS = ['الأب', 'الأم', 'الجد', 'الجدة', 'الأخ', 'الأخت', 'العم', 'العمة', 'الخال', 'الخالة', 'ولي أمر آخر'];

interface FormState {
  childName: string;
  birthDate: string;
  gender: Gender | '';
  requestedLevel: Level | '';
  parentName: string;
  parentPhone: string;
  parentRelation: string;
  parentEmail: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  childName: '', birthDate: '', gender: '', requestedLevel: '',
  parentName: '', parentPhone: '', parentRelation: '', parentEmail: '', notes: '',
};

function RegistrationModal({ visible, onClose, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (f: FormState) => void;
}) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const validateStep1 = () => {
    if (!form.childName.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال اسم الطفل'); return false; }
    if (!form.birthDate.trim())  { Alert.alert('تنبيه', 'الرجاء إدخال تاريخ الميلاد'); return false; }
    if (!form.gender)            { Alert.alert('تنبيه', 'الرجاء تحديد جنس الطفل'); return false; }
    if (!form.requestedLevel)    { Alert.alert('تنبيه', 'الرجاء اختيار المستوى المطلوب'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.parentName.trim())  { Alert.alert('تنبيه', 'الرجاء إدخال اسم ولي الأمر'); return false; }
    if (!form.parentPhone.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال رقم الهاتف'); return false; }
    if (!form.parentRelation)     { Alert.alert('تنبيه', 'الرجاء تحديد صلة القرابة'); return false; }
    return true;
  };

  const handleClose = () => {
    setForm(EMPTY_FORM); setStep(1); setSubmitted(false); onClose();
  };

  const LEVEL_COLOR: Record<string, string> = {
    'براعم': '#EC4899', 'مستوى أول': '#3B82F6', 'مستوى ثاني': '#10B981',
  };

  const Field = ({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) => (
    <View style={fm.fieldWrap}>
      <View style={fm.fieldHeader}>
        <MaterialCommunityIcons name={icon as any} size={14} color={Colors.textSecondary} />
        <Text style={fm.fieldLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );

  const InputField = ({ label, icon, placeholder, value, onChange, keyboardType = 'default' }: any) => (
    <Field label={label} icon={icon}>
      <TextInput
        style={fm.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        textAlign="right"
      />
    </Field>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[fm.container, { paddingBottom: insets.bottom + 12 }]}>
          <View style={fm.handle} />
          <View style={fm.titleRow}>
            <Pressable onPress={handleClose} style={fm.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={fm.title}>استمارة طلب التسجيل</Text>
              {!submitted && (
                <View style={fm.stepIndicator}>
                  {[1, 2].map(s => (
                    <View key={s} style={[fm.stepDot, step >= s && fm.stepDotActive,
                      step === s && { width: 24 }]} />
                  ))}
                </View>
              )}
            </View>
            <View style={{ width: 28 }} />
          </View>

          {submitted ? (
            <View style={fm.successWrap}>
              <LinearGradient colors={['#040b3c', '#0c1155']} style={fm.successCard}>
                <Text style={{ fontSize: 56 }}>✅</Text>
                <Text style={fm.successTitle}>تم إرسال الطلب بنجاح!</Text>
                <Text style={fm.successText}>
                  شكراً لاهتمامك بالتسجيل في روضة أحباب الله.{'\n'}
                  سيقوم فريق الإدارة بمراجعة طلبك والتواصل معك قريباً.
                </Text>
                <View style={fm.successInfo}>
                  <Text style={fm.successInfoText}>📋 اسم الطفل: {form.childName}</Text>
                  <Text style={fm.successInfoText}>📱 هاتف التواصل: {form.parentPhone}</Text>
                </View>
                <Pressable style={fm.successBtn} onPress={handleClose}>
                  <Text style={fm.successBtnText}>العودة للرئيسية</Text>
                </Pressable>
              </LinearGradient>
            </View>
          ) : step === 1 ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={fm.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={fm.stepTitle}>
                <Text style={fm.stepNum}>الخطوة ١ من ٢  </Text>بيانات الطفل
              </Text>

              <InputField label="اسم الطفل الكامل *" icon="account-child" placeholder="أدخل اسم الطفل كاملاً" value={form.childName} onChange={(v: string) => set('childName', v)} />
              <InputField label="تاريخ الميلاد *" icon="cake-variant" placeholder="مثال: 2021-03-15" value={form.birthDate} onChange={(v: string) => set('birthDate', v)} />

              <Field label="الجنس *" icon="gender-male-female">
                <View style={fm.optionRow}>
                  {(['ذكر', 'أنثى'] as Gender[]).map(g => (
                    <Pressable key={g}
                      style={[fm.optionBtn, form.gender === g && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('gender', g); }}>
                      <Text style={fm.optionIcon}>{g === 'ذكر' ? '👦' : '👧'}</Text>
                      <Text style={[fm.optionText, form.gender === g && { color: Colors.primary, fontFamily: 'Inter_700Bold' }]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label="المستوى الدراسي المطلوب *" icon="school">
                <View style={fm.levelRow}>
                  {FORM_LEVELS.map(lv => {
                    const lc = LEVEL_COLOR[lv];
                    const sel = form.requestedLevel === lv;
                    return (
                      <Pressable key={lv}
                        style={[fm.levelBtn, { borderColor: sel ? lc : Colors.borderLight, backgroundColor: sel ? lc + '15' : Colors.surface }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('requestedLevel', lv); }}>
                        <Text style={[fm.levelText, { color: sel ? lc : Colors.textSecondary }]}>{lv}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Pressable style={fm.nextBtn}
                onPress={() => { if (validateStep1()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(2); } }}>
                <Text style={fm.nextBtnText}>التالي</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={fm.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={fm.stepTitle}>
                <Text style={fm.stepNum}>الخطوة ٢ من ٢  </Text>بيانات ولي الأمر
              </Text>

              <InputField label="اسم ولي الأمر *" icon="account" placeholder="أدخل الاسم كاملاً" value={form.parentName} onChange={(v: string) => set('parentName', v)} />
              <InputField label="رقم الهاتف *" icon="phone" placeholder="+249..." value={form.parentPhone} onChange={(v: string) => set('parentPhone', v)} keyboardType="phone-pad" />
              <InputField label="البريد الإلكتروني" icon="email" placeholder="اختياري" value={form.parentEmail} onChange={(v: string) => set('parentEmail', v)} keyboardType="email-address" />

              <Field label="صلة القرابة بالطفل *" icon="account-heart">
                <View style={fm.relationsGrid}>
                  {RELATIONS.map(rel => (
                    <Pressable key={rel}
                      style={[fm.relBtn, form.parentRelation === rel && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('parentRelation', rel); }}>
                      <Text style={[fm.relText, form.parentRelation === rel && { color: Colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{rel}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label="ملاحظات إضافية" icon="note-text">
                <TextInput
                  style={[fm.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="أي معلومات إضافية تودّ إخبارنا بها..."
                  placeholderTextColor={Colors.textLight}
                  value={form.notes}
                  onChangeText={v => set('notes', v)}
                  multiline
                  textAlign="right"
                />
              </Field>

              <View style={fm.summaryBox}>
                <Text style={fm.summaryTitle}>ملخص الطلب</Text>
                {[
                  { label: 'اسم الطفل', value: form.childName },
                  { label: 'تاريخ الميلاد', value: form.birthDate },
                  { label: 'الجنس', value: form.gender },
                  { label: 'المستوى المطلوب', value: form.requestedLevel },
                ].map((row, i) => (
                  <View key={i} style={fm.summaryRow}>
                    <Text style={fm.summaryVal}>{row.value || '—'}</Text>
                    <Text style={fm.summaryLabel}>{row.label}:</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={fm.backBtn} onPress={() => setStep(1)}>
                  <Ionicons name="chevron-back" size={18} color={Colors.text} />
                  <Text style={fm.backBtnText}>السابق</Text>
                </Pressable>
                <Pressable style={[fm.nextBtn, { flex: 1 }]}
                  onPress={() => {
                    if (!validateStep2()) return;
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onSubmit(form);
                    setSubmitted(true);
                  }}>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={fm.nextBtnText}>إرسال الطلب</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fm = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  handle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text },
  closeBtn: { padding: 4, width: 28 },
  stepIndicator: { flexDirection: 'row', gap: 5, marginTop: 5 },
  stepDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.borderLight },
  stepDotActive: { backgroundColor: Colors.primary },
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepTitle: { fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  stepNum: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  fieldWrap: { marginBottom: 18 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-end' },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  input: { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  optionRow: { flexDirection: 'row', gap: 12 },
  optionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderLight },
  optionIcon: { fontSize: 22 },
  optionText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  levelRow: { gap: 8 },
  levelBtn: { padding: 13, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  levelText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  relationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  relText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.text },
  summaryBox: { backgroundColor: '#040b3c', borderRadius: 16, padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.accent, textAlign: 'right', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  summaryVal: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16 },
  nextBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.surface, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  backBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  successWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  successCard: { borderRadius: 24, padding: 28, alignItems: 'center', gap: 10 },
  successTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', marginTop: 8 },
  successText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  successInfo: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, width: '100%', gap: 8, marginTop: 6 },
  successInfoText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)', textAlign: 'right' },
  successBtn: { backgroundColor: Colors.accent, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 20, marginTop: 8 },
  successBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { news, schoolInfo, banners, addRegistrationRequest } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 20;
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [showRegForm, setShowRegForm] = useState(false);

  const phone = schoolInfo?.phone ?? '';
  const waNumber = phone.replace(/[^0-9]/g, '');

  const handleRegSubmit = (form: FormState) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const req: RegistrationRequest = {
      id,
      createdAt: new Date().toISOString(),
      status: 'pending',
      childName:       form.childName,
      birthDate:       form.birthDate,
      gender:          form.gender as 'ذكر' | 'أنثى',
      requestedLevel:  form.requestedLevel as RegistrationRequest['requestedLevel'],
      parentName:      form.parentName,
      parentPhone:     form.parentPhone,
      parentRelation:  form.parentRelation,
      parentEmail:     form.parentEmail || undefined,
      notes:           form.notes || undefined,
    };
    addRegistrationRequest(req);
  };

  return (
    <View style={sty.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>

        {/* ─── HERO ─── */}
        <LinearGradient colors={['#030612', '#050c38', '#0d1463']} style={[sty.hero, { paddingTop: topPadding + 12 }]}>
          <View style={sty.heroTop}>
            <Pressable
              onPress={async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); await logout(); router.replace('/login'); }}
              style={sty.loginBtn}
            >
              <Text style={sty.loginBtnText}>تسجيل الدخول</Text>
              <Ionicons name="log-in-outline" size={16} color={Colors.accent} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={sty.heroTitle}>روضة أحباب الله</Text>
              <Text style={sty.heroSub}>صفيتة الغنوماب</Text>
            </View>
            <HexFrame size={54} fill="#FFFFFF" stroke={Colors.accent} strokeWidth={2}>
              <Image source={require('@/assets/images/logo_main.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />
            </HexFrame>
          </View>

          <View style={sty.heroSlogan}>
            <PulsingDot />
            <Text style={sty.heroSloganText}>نبني جيلاً واثقاً ومبدعاً</Text>
            <PulsingDot />
          </View>

          <Text style={sty.heroDesc}>
            بيئة تعليمية حاضنة تجمع بين الأصالة والحداثة — نُعلّم أطفالنا القيم والعلم والإبداع منذ سنواتهم الأولى
          </Text>

          <View style={sty.heroActions}>
            <Pressable
              style={sty.heroBtnRegister}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowRegForm(true); }}
            >
              <MaterialCommunityIcons name="account-plus" size={17} color="#fff" />
              <Text style={sty.heroBtnPrimaryText}>سجّل طفلك الآن</Text>
            </Pressable>
            {phone ? (
              <Pressable
                style={sty.heroBtnWhatsApp}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openLink(`https://wa.me/${waNumber}`); }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={sty.heroBtnPrimaryText}>واتساب</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={sty.guestNote}>
            <Ionicons name="eye-outline" size={14} color={Colors.accent} />
            <Text style={sty.guestNoteText}>تصفح حر — سجّل دخولك للوصول الكامل</Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.accent }}>دخول</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ─── STATS ─── */}
        <View style={sty.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={sty.statBox}>
              <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
              <Text style={[sty.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={sty.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={sty.body}>

          {/* ─── BANNERS ─── */}
          {banners.filter(b => b.active).length > 0 && (
            <>
              <Text style={sty.sectionTitle}>إعلانات وعروض</Text>
              {banners.filter(b => b.active).map(banner => (
                <Pressable
                  key={banner.id}
                  style={[sty.bannerCard, { borderRightColor:
                    banner.type === 'alert' ? Colors.danger :
                    banner.type === 'offer' ? Colors.success :
                    banner.type === 'event' ? '#3B82F6' : Colors.accent,
                  }]}
                  onPress={() => banner.link ? openLink(banner.link) : undefined}
                >
                  <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
                    <Text style={sty.bannerTitle}>{banner.title}</Text>
                    {banner.subtitle ? <Text style={sty.bannerSub}>{banner.subtitle}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 30 }}>
                    {banner.type === 'alert' ? '⚠️' : banner.type === 'offer' ? '🎁' : banner.type === 'event' ? '🎉' : '📢'}
                  </Text>
                </Pressable>
              ))}
            </>
          )}

          {/* ─── SERVICES ─── */}
          <Text style={sty.sectionTitle}>خدماتنا</Text>
          <Text style={sty.sectionDesc}>نوفّر بيئة شاملة تغطي جميع احتياجات طفلك التعليمية والترفيهية والصحية</Text>
          <View style={sty.servicesGrid}>
            {SERVICES.map((s, i) => (
              <View key={i} style={[sty.serviceCard, { borderTopColor: s.color }]}>
                <View style={[sty.serviceIconWrap, { backgroundColor: s.bg }]}>
                  <MaterialCommunityIcons name={s.icon as any} size={24} color={s.color} />
                </View>
                <Text style={sty.serviceTitle}>{s.title}</Text>
                <Text style={sty.serviceDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>

          {/* ─── LEVELS ─── */}
          <Text style={sty.sectionTitle}>المستويات الدراسية</Text>
          <Text style={sty.sectionDesc}>ثلاثة مستويات مصمّمة لتناسب مراحل نمو طفلك</Text>
          {LEVELS.map((lv, i) => (
            <View key={i} style={[sty.levelCard, { borderRightColor: lv.color }]}>
              <View style={[sty.levelIconWrap, { backgroundColor: lv.bg }]}>
                <MaterialCommunityIcons name={lv.icon as any} size={22} color={lv.color} />
              </View>
              <View style={sty.levelText}>
                <Text style={[sty.levelName, { color: lv.color }]}>{lv.level}</Text>
                <Text style={sty.levelAge}>{lv.age}</Text>
              </View>
            </View>
          ))}

          {/* ─── WHY US ─── */}
          <LinearGradient colors={['#040b3c', '#0c1155', '#111d7a']} style={sty.whyCard}>
            <Text style={sty.whyTitle}>لماذا روضة أحباب الله؟</Text>
            {[
              'منهج دراسي مرخّص ومعتمد من وزارة التربية',
              'بيئة إسلامية أصيلة تُعزّز القيم والأخلاق',
              'تواصل مستمر مع أولياء الأمور عبر التطبيق',
              'نشاطات ترفيهية وثقافية طوال العام الدراسي',
              'كشوفات طبية دورية ومتابعة صحية للأطفال',
              'رسوم مناسبة مع إمكانية تقسيط الأقساط',
            ].map((point, i) => (
              <View key={i} style={sty.whyRow}>
                <Text style={sty.whyText}>{point}</Text>
                <View style={sty.whyCheck}>
                  <Ionicons name="checkmark" size={14} color="#030612" />
                </View>
              </View>
            ))}
          </LinearGradient>

          {/* ─── TESTIMONIALS ─── */}
          <Text style={sty.sectionTitle}>آراء أولياء الأمور</Text>
          <Text style={sty.sectionDesc}>ثقتهم بنا هي أكبر إنجازاتنا</Text>
          <View style={sty.testimonialCard}>
            <StarsRow count={TESTIMONIALS[activeTestimonial].stars} />
            <Text style={sty.testimonialText}>"{TESTIMONIALS[activeTestimonial].text}"</Text>
            <Text style={sty.testimonialName}>— {TESTIMONIALS[activeTestimonial].name}</Text>
            <View style={sty.testimonialDots}>
              {TESTIMONIALS.map((_, i) => (
                <Pressable key={i} onPress={() => setActiveTestimonial(i)}>
                  <View style={[sty.dot, i === activeTestimonial && sty.dotActive]} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── REGISTRATION STEPS ─── */}
          <Text style={sty.sectionTitle}>خطوات التسجيل</Text>
          <Text style={sty.sectionDesc}>التسجيل سهل وسريع — أربع خطوات فقط</Text>
          {STEPS.map((st, i) => (
            <View key={i} style={sty.stepRow}>
              {i < STEPS.length - 1 && <View style={sty.stepLine} />}
              <View style={sty.stepRight}>
                <Text style={sty.stepTitle}>{st.title}</Text>
                <Text style={sty.stepDesc}>{st.desc}</Text>
              </View>
              <LinearGradient colors={[Colors.accent, '#b8841c']} style={sty.stepNum}>
                <Text style={sty.stepNumText}>{st.num}</Text>
              </LinearGradient>
            </View>
          ))}

          {/* ─── NEWS ─── */}
          {news.length > 0 && (
            <>
              <Text style={sty.sectionTitle}>آخر الأخبار والفعاليات</Text>
              {news.slice(0, 4).map(item => {
                const cfg = NEWS_ICONS[item.type] ?? NEWS_ICONS.general;
                return (
                  <View key={item.id} style={sty.newsCard}>
                    <View><Text style={sty.newsDate}>{item.date}</Text></View>
                    <View style={sty.newsMid}>
                      <Text style={sty.newsTitle}>{item.title}</Text>
                      {item.body ? <Text style={sty.newsBody} numberOfLines={2}>{item.body}</Text> : null}
                    </View>
                    <View style={[sty.newsIconWrap, { backgroundColor: cfg.color + '15' }]}>
                      <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* ─── INFO ─── */}
          <Text style={sty.sectionTitle}>معلومات التواصل</Text>
          <View style={sty.infoCard}>
            {[
              { icon: 'school',   color: Colors.primary, val: schoolInfo?.name ?? 'روضة أحباب الله',    action: undefined },
              { icon: 'location', color: Colors.success, val: schoolInfo?.location ?? 'صفيتة الغنوماب', action: undefined },
              { icon: 'call',     color: '#3B82F6',      val: phone || 'غير محدد', action: phone ? () => openLink(`tel:${phone}`) : undefined },
              { icon: 'mail',     color: Colors.accent,  val: schoolInfo?.email ?? 'غير محدد', action: schoolInfo?.email ? () => openLink(`mailto:${schoolInfo.email}`) : undefined },
            ].map((row, i) => (
              <Pressable key={i} style={sty.infoRow} onPress={row.action} disabled={!row.action}>
                <Text style={[sty.infoVal, row.action ? { color: row.color } : {}]}>{row.val}</Text>
                <View style={[sty.infoIcon, { backgroundColor: row.color + '15' }]}>
                  <Ionicons name={row.icon as any} size={16} color={row.color} />
                </View>
              </Pressable>
            ))}
          </View>

          {/* ─── CTA ─── */}
          <LinearGradient colors={[Colors.accent, '#b8841c', '#8B5A0A']} style={sty.ctaCard}>
            <MaterialCommunityIcons name="account-child" size={44} color="#fff" />
            <Text style={sty.ctaTitle}>سجّل طفلك الآن</Text>
            <Text style={sty.ctaSub}>
              الأماكن محدودة — لا تفوّت فرصة انضمام طفلك إلى عائلة أحباب الله
            </Text>
            <Pressable
              style={sty.ctaMainBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowRegForm(true); }}
            >
              <MaterialCommunityIcons name="file-document-edit" size={18} color={Colors.accent} />
              <Text style={[sty.ctaBtnText, { color: Colors.accent }]}>تعبئة استمارة التسجيل</Text>
            </Pressable>
            <View style={sty.ctaRow}>
              {phone ? (
                <Pressable style={sty.ctaBtnWhatsApp} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openLink(`https://wa.me/${waNumber}`); }}>
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={sty.ctaBtnText}>واتساب</Text>
                </Pressable>
              ) : null}
              <Pressable style={sty.ctaBtnLogin} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace('/login'); }}>
                <Ionicons name="person-circle-outline" size={16} color={Colors.accent} />
                <Text style={[sty.ctaBtnText, { color: Colors.accent }]}>دخول ولي الأمر</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      <RegistrationModal
        visible={showRegForm}
        onClose={() => setShowRegForm(false)}
        onSubmit={handleRegSubmit}
      />
    </View>
  );
}

const sty = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  heroTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  heroSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(201,149,42,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(201,149,42,0.35)' },
  loginBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.accent },
  heroSlogan: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10 },
  heroSloganText: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.accent, textAlign: 'center' },
  heroDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 18 },
  heroActions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 14 },
  heroBtnRegister: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  heroBtnWhatsApp: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#25D366', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24 },
  heroBtnPrimaryText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  guestNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(201,149,42,0.10)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(201,149,42,0.2)' },
  guestNoteText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', flex: 1, textAlign: 'right' },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  body: { padding: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 4, marginTop: 4 },
  sectionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginBottom: 14, lineHeight: 20 },
  bannerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderRightWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bannerTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  bannerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 3, textAlign: 'right' },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  serviceCard: { width: (W - 52) / 2, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  serviceIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 10 },
  serviceTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 5 },
  serviceDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 17 },
  levelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderRightWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  levelIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  levelText: { flex: 1, alignItems: 'flex-end' },
  levelName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  levelAge: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  whyCard: { borderRadius: 20, padding: 20, marginBottom: 24 },
  whyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'right', marginBottom: 14 },
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  whyText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'right', lineHeight: 20 },
  whyCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  testimonialCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, alignItems: 'flex-end' },
  testimonialText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', lineHeight: 22, marginBottom: 8 },
  testimonialName: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  testimonialDots: { flexDirection: 'row', gap: 6, marginTop: 14, alignSelf: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.borderLight },
  dotActive: { backgroundColor: Colors.accent, width: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, position: 'relative' },
  stepLine: { position: 'absolute', right: 21, top: 46, width: 2, height: 28, backgroundColor: Colors.borderLight },
  stepNum: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  stepNumText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  stepRight: { flex: 1, alignItems: 'flex-end', paddingTop: 4 },
  stepTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text, marginBottom: 3 },
  stepDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 19 },
  newsCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 },
  newsIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  newsMid: { flex: 1, alignItems: 'flex-end' },
  newsTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  newsBody: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginTop: 4 },
  newsDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoVal: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text, textAlign: 'right', marginRight: 10 },
  infoIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ctaCard: { borderRadius: 22, padding: 26, alignItems: 'center', gap: 8, marginBottom: 8 },
  ctaTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  ctaSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  ctaMainBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 22, marginTop: 6 },
  ctaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  ctaBtnWhatsApp: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#25D366', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 20 },
  ctaBtnLogin: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  ctaBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
});
