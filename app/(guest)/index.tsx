import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Image, Linking, Alert, Animated, Dimensions, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAppData, RegistrationRequest } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';
import { fsGetReviews } from '@/lib/firestore-service';

const { width: W } = Dimensions.get('window');

// ─── CONSTANTS (قابلة للتعديل بسهولة) ────────────────────────────────────────

const HERO = {
  title:   'نظم إدارة رياض الأطفال',
  city:    'صفيتة الغنوماب',
  slogan:  'نبني جيلاً واثقاً ومبدعاً',
  desc:    'بيئة تعليمية حاضنة تجمع بين الأصالة والحداثة — نُعلّم أطفالنا القيم والعلم والإبداع منذ سنواتهم الأولى',
};

const STATS = [
  { value: '+150', label: 'طفل سعيد',        icon: 'emoticon-happy-outline', color: '#3B82F6' },
  { value: '12',   label: 'معلمة متخصصة',    icon: 'account-tie',           color: '#8B5CF6' },
  { value: '8',    label: 'سنوات خبرة',      icon: 'star',                  color: '#F59E0B' },
  { value: '3',    label: 'مستويات',         icon: 'layers',                color: '#10B981' },
];

const SERVICES = [
  { icon: 'book-open-variant', color: '#3B82F6', title: 'منهج متكامل',     desc: 'مناهج معتمدة تجمع اللغة العربية والإنجليزية والتربية الإسلامية' },
  { icon: 'palette',           color: '#8B5CF6', title: 'فنون إبداعية',    desc: 'رسم وتشكيل وأنشطة تُنمّي الإبداع والموهبة' },
  { icon: 'run-fast',          color: '#10B981', title: 'أنشطة بدنية',     desc: 'ملعب مجهّز ونشاطات يومية تبني اللياقة' },
  { icon: 'cellphone',         color: '#F59E0B', title: 'تعلّم رقمي',      desc: 'ألعاب تعليمية تفاعلية تُحفّز حب الاستكشاف' },
  { icon: 'food-apple',        color: '#EF4444', title: 'وجبات صحية',      desc: 'وجبات مغذية يومية وفق مواصفات التغذية السليمة' },
  { icon: 'shield-check',      color: '#06B6D4', title: 'بيئة آمنة',       desc: 'كاميرات مراقبة وطواقم متخصصة لسلامة أطفالنا' },
  { icon: 'account-heart',     color: '#EC4899', title: 'معلمات مؤهّلات',  desc: 'متخصصات في التربية وتعليم الأطفال المبكر' },
  { icon: 'bus',               color: '#7C3AED', title: 'مواصلات',         desc: 'حافلات تصل جميع أحياء صفيتة بأمان وراحة' },
];

const LEVELS = [
  { level: 'براعم',       age: '3 – 4 سنوات', color: '#EC4899', icon: 'flower',          desc: 'الاكتشاف والبناء الأول للشخصية' },
  { level: 'مستوى أول',  age: '4 – 5 سنوات', color: '#3B82F6', icon: 'numeric-1-circle', desc: 'بناء المهارات الأساسية والقراءة والكتابة' },
  { level: 'مستوى ثاني', age: '5 – 6 سنوات', color: '#10B981', icon: 'numeric-2-circle', desc: 'الاستعداد للمرحلة الابتدائية بثقة' },
];

const WHY_US = [
  { icon: 'certificate',         text: 'منهج مرخّص ومعتمد من وزارة التربية' },
  { icon: 'mosque',              text: 'بيئة إسلامية أصيلة تُعزّز القيم والأخلاق' },
  { icon: 'bell-ring',           text: 'تواصل مستمر مع أولياء الأمور عبر التطبيق' },
  { icon: 'party-popper',        text: 'نشاطات ترفيهية وثقافية طوال العام' },
  { icon: 'stethoscope',         text: 'كشوفات طبية دورية ومتابعة صحية' },
  { icon: 'cash-multiple',       text: 'رسوم مناسبة مع إمكانية تقسيط الأقساط' },
];

const STEPS = [
  { num: '١', title: 'التواصل',  icon: 'phone',           color: '#3B82F6', desc: 'اتصل أو راسلنا عبر واتساب لمعرفة التفاصيل' },
  { num: '٢', title: 'الزيارة',  icon: 'map-marker',      color: '#8B5CF6', desc: 'جولة في الروضة للتعرّف على البيئة والمعلمات' },
  { num: '٣', title: 'التسجيل',  icon: 'file-document',   color: '#F59E0B', desc: 'أكمل نموذج التسجيل وأحضر الوثائق المطلوبة' },
  { num: '٤', title: 'الانضمام', icon: 'account-check',   color: '#10B981', desc: 'مرحباً بطفلك في عائلة نظم إدارة رياض الأطفال 🎉' },
];

const FALLBACK_REVIEWS = [
  { name: 'أم عبدالله', text: 'ابني تغيّر كثيراً من حيث الثقة بالنفس والتواصل، الشكر لكل المعلمات.', stars: 5 },
  { name: 'أم سلطان',  text: 'روضة رائعة، الاهتمام بالأطفال واضح ومستوى التعليم ممتاز بكل المقاييس.', stars: 5 },
  { name: 'أم محمد',   text: 'من أفضل ما في الروضة التواصل المستمر مع الأهل وإشعارنا بكل شيء.', stars: 5 },
];

const NEWS_ICONS: Record<string, { icon: string; color: string }> = {
  trip:     { icon: 'bus',               color: Colors.success },
  activity: { icon: 'star',              color: '#3B82F6' },
  general:  { icon: 'newspaper-variant', color: Colors.accent },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function openLink(url: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else Alert.alert('تعذّر الفتح', url);
  } catch { Alert.alert('خطأ', url); }
}

function StarsRow({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Ionicons key={s} name={s <= count ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );
}

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: Colors.accent,
      transform: [{ scale }],
    }} />
  );
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

function SectionHeader({ title, sub, light = false }: { title: string; sub?: string; light?: boolean }) {
  return (
    <View style={sh.wrap}>
      <View style={sh.line} />
      <View style={sh.textWrap}>
        <Text style={[sh.title, light && { color: '#fff' }]}>{title}</Text>
        {sub ? <Text style={[sh.sub, light && { color: 'rgba(255,255,255,0.65)' }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  wrap:    { marginBottom: 18, marginTop: 8 },
  line:    { height: 3, width: 36, backgroundColor: Colors.accent, borderRadius: 2, alignSelf: 'flex-end', marginBottom: 8 },
  textWrap:{ alignItems: 'flex-end' },
  title:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  sub:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 3, textAlign: 'right', lineHeight: 18 },
});

// ─── REGISTRATION FORM ───────────────────────────────────────────────────────

type Level = 'براعم' | 'مستوى أول' | 'مستوى ثاني';
type Gender = 'ذكر' | 'أنثى';
const FORM_LEVELS: Level[] = ['براعم', 'مستوى أول', 'مستوى ثاني'];
const RELATIONS = ['الأب', 'الأم', 'الجد', 'الجدة', 'الأخ', 'الأخت', 'العم', 'العمة', 'الخال', 'الخالة', 'ولي أمر آخر'];
const LEVEL_COLORS: Record<string, string> = { 'براعم': '#EC4899', 'مستوى أول': '#3B82F6', 'مستوى ثاني': '#10B981' };

interface FormState {
  childName: string; birthDate: string; gender: Gender | '';
  requestedLevel: Level | ''; parentName: string;
  parentPhone: string; parentRelation: string; parentEmail: string; notes: string;
}
const EMPTY_FORM: FormState = {
  childName: '', birthDate: '', gender: '', requestedLevel: '',
  parentName: '', parentPhone: '', parentRelation: '', parentEmail: '', notes: '',
};

function RegistrationModal({ visible, onClose, onSubmit }: {
  visible: boolean; onClose: () => void; onSubmit: (f: FormState) => void;
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
    if (!form.requestedLevel)    { Alert.alert('تنبيه', 'الرجاء اختيار المستوى'); return false; }
    return true;
  };
  const validateStep2 = () => {
    if (!form.parentName.trim())  { Alert.alert('تنبيه', 'الرجاء إدخال اسم ولي الأمر'); return false; }
    if (!form.parentPhone.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال رقم الهاتف'); return false; }
    if (!form.parentRelation)     { Alert.alert('تنبيه', 'الرجاء تحديد صلة القرابة'); return false; }
    return true;
  };
  const handleClose = () => { setForm(EMPTY_FORM); setStep(1); setSubmitted(false); onClose(); };

  const InputField = ({ label, icon, placeholder, value, onChange, keyboardType = 'default' }: any) => (
    <View style={fm.fieldWrap}>
      <View style={fm.fieldHeader}>
        <MaterialCommunityIcons name={icon} size={14} color={Colors.textSecondary} />
        <Text style={fm.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={fm.input} placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        value={value} onChangeText={onChange}
        keyboardType={keyboardType} textAlign="right"
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[fm.container, { paddingBottom: insets.bottom + 12 }]}>
          <View style={fm.handle} />
          <View style={fm.titleRow}>
            <Pressable onPress={handleClose} style={fm.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={fm.title}>طلب التسجيل</Text>
              {!submitted && (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {[1, 2].map(s => (
                    <View key={s} style={[fm.stepDot, step >= s && fm.stepDotActive, step === s && { width: 28 }]} />
                  ))}
                </View>
              )}
            </View>
            <View style={{ width: 32 }} />
          </View>

          {submitted ? (
            <View style={fm.successWrap}>
              <LinearGradient colors={['#040b3c', '#0c1155', '#1a237e']} style={fm.successCard}>
                <View style={fm.successIconWrap}>
                  <Ionicons name="checkmark" size={36} color="#fff" />
                </View>
                <Text style={fm.successTitle}>تم الإرسال بنجاح!</Text>
                <Text style={fm.successText}>
                  شكراً لاهتمامك بنظم إدارة رياض الأطفال.{'\n'}سيتواصل معك فريق الإدارة قريباً.
                </Text>
                <View style={fm.successInfo}>
                  <Text style={fm.successRow}>📋  {form.childName}</Text>
                  <Text style={fm.successRow}>📱  {form.parentPhone}</Text>
                </View>
                <Pressable style={fm.successBtn} onPress={handleClose}>
                  <Text style={fm.successBtnText}>العودة للرئيسية</Text>
                </Pressable>
              </LinearGradient>
            </View>
          ) : step === 1 ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={fm.scroll} keyboardShouldPersistTaps="handled">
              <Text style={fm.stepLabel}><Text style={fm.stepNum}>١ / ٢  </Text>بيانات الطفل</Text>

              <InputField label="اسم الطفل الكامل *" icon="account-child" placeholder="أدخل اسم الطفل" value={form.childName} onChange={(v: string) => set('childName', v)} />
              <InputField label="تاريخ الميلاد *" icon="cake-variant" placeholder="مثال: 2021-03-15" value={form.birthDate} onChange={(v: string) => set('birthDate', v)} />

              <View style={fm.fieldWrap}>
                <View style={fm.fieldHeader}>
                  <MaterialCommunityIcons name="gender-male-female" size={14} color={Colors.textSecondary} />
                  <Text style={fm.fieldLabel}>الجنس *</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['ذكر', 'أنثى'] as Gender[]).map(g => (
                    <Pressable key={g}
                      style={[fm.optBtn, form.gender === g && { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('gender', g); }}>
                      <Text style={{ fontSize: 22 }}>{g === 'ذكر' ? '👦' : '👧'}</Text>
                      <Text style={[fm.optTxt, form.gender === g && { color: Colors.primary, fontFamily: 'Inter_700Bold' }]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={fm.fieldWrap}>
                <View style={fm.fieldHeader}>
                  <MaterialCommunityIcons name="school" size={14} color={Colors.textSecondary} />
                  <Text style={fm.fieldLabel}>المستوى المطلوب *</Text>
                </View>
                {FORM_LEVELS.map(lv => {
                  const lc = LEVEL_COLORS[lv]; const sel = form.requestedLevel === lv;
                  return (
                    <Pressable key={lv}
                      style={[fm.levelBtn, { borderColor: sel ? lc : Colors.borderLight, backgroundColor: sel ? lc + '12' : Colors.surface }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('requestedLevel', lv); }}>
                      <Text style={[fm.levelTxt, { color: sel ? lc : Colors.textSecondary }]}>{lv}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={fm.nextBtn} onPress={() => { if (validateStep1()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(2); } }}>
                <Text style={fm.nextBtnTxt}>التالي</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={fm.scroll} keyboardShouldPersistTaps="handled">
              <Text style={fm.stepLabel}><Text style={fm.stepNum}>٢ / ٢  </Text>بيانات ولي الأمر</Text>

              <InputField label="اسم ولي الأمر *" icon="account" placeholder="أدخل الاسم كاملاً" value={form.parentName} onChange={(v: string) => set('parentName', v)} />
              <InputField label="رقم الهاتف *" icon="phone" placeholder="+249..." value={form.parentPhone} onChange={(v: string) => set('parentPhone', v)} keyboardType="phone-pad" />
              <InputField label="البريد الإلكتروني" icon="email" placeholder="اختياري" value={form.parentEmail} onChange={(v: string) => set('parentEmail', v)} keyboardType="email-address" />

              <View style={fm.fieldWrap}>
                <View style={fm.fieldHeader}>
                  <MaterialCommunityIcons name="account-heart" size={14} color={Colors.textSecondary} />
                  <Text style={fm.fieldLabel}>صلة القرابة *</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RELATIONS.map(rel => (
                    <Pressable key={rel}
                      style={[fm.relBtn, form.parentRelation === rel && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('parentRelation', rel); }}>
                      <Text style={[fm.relTxt, form.parentRelation === rel && { color: Colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{rel}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={fm.fieldWrap}>
                <View style={fm.fieldHeader}>
                  <MaterialCommunityIcons name="note-text" size={14} color={Colors.textSecondary} />
                  <Text style={fm.fieldLabel}>ملاحظات إضافية</Text>
                </View>
                <TextInput
                  style={[fm.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="أي معلومات إضافية..."
                  placeholderTextColor={Colors.textLight}
                  value={form.notes} onChangeText={v => set('notes', v)}
                  multiline textAlign="right"
                />
              </View>

              <View style={fm.summaryBox}>
                <Text style={fm.summaryTitle}>ملخص الطلب</Text>
                {[
                  ['اسم الطفل', form.childName], ['الميلاد', form.birthDate],
                  ['الجنس', form.gender],        ['المستوى', form.requestedLevel],
                ].map(([lbl, val], i) => (
                  <View key={i} style={fm.summaryRow}>
                    <Text style={fm.summaryVal}>{val || '—'}</Text>
                    <Text style={fm.summaryLbl}>{lbl}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={fm.backBtn} onPress={() => setStep(1)}>
                  <Ionicons name="chevron-back" size={18} color={Colors.text} />
                  <Text style={fm.backBtnTxt}>السابق</Text>
                </Pressable>
                <Pressable style={[fm.nextBtn, { flex: 1 }]}
                  onPress={() => {
                    if (!validateStep2()) return;
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onSubmit(form); setSubmitted(true);
                  }}>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={fm.nextBtnTxt}>إرسال الطلب</Text>
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
  container:    { flex: 1, backgroundColor: Colors.background },
  handle:       { width: 44, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title:        { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text },
  closeBtn:     { padding: 4 },
  stepDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderLight },
  stepDotActive:{ backgroundColor: Colors.primary },
  scroll:       { padding: 20, paddingBottom: 44 },
  stepLabel:    { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', marginBottom: 22 },
  stepNum:      { fontFamily: 'Inter_700Bold', color: Colors.primary },
  fieldWrap:    { marginBottom: 18 },
  fieldHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-end' },
  fieldLabel:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  input:        { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  optBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderLight },
  optTxt:       { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  levelBtn:     { padding: 13, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', marginBottom: 8 },
  levelTxt:     { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  relBtn:       { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  relTxt:       { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.text },
  summaryBox:   { backgroundColor: '#040b3c', borderRadius: 16, padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.accent, textAlign: 'right', marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLbl:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' },
  summaryVal:   { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  nextBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16 },
  nextBtnTxt:   { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  backBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.surface, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  backBtnTxt:   { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  successWrap:  { flex: 1, padding: 20, justifyContent: 'center' },
  successCard:  { borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  successIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' },
  successText:  { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },
  successInfo:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, width: '100%', gap: 8 },
  successRow:   { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.9)', textAlign: 'right' },
  successBtn:   { backgroundColor: Colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 22, marginTop: 4 },
  successBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function GuestHomeScreen() {
  const insets        = useSafeAreaInsets();
  const { logout }    = useAuth();
  const { news, schoolInfo, banners, addRegistrationRequest } = useAppData();
  const topPadding    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const [activeTesti, setActiveTesti] = useState(0);
  const [showRegForm, setShowRegForm] = useState(false);

  const { data: liveReviews } = useQuery<{ id: string; parentName: string; childName: string; content: string; rating: number }[]>({
    queryKey: ['firestore/reviews'],
    queryFn: () => fsGetReviews(),
    staleTime: 60_000,
  });

  const testimonials = (liveReviews && liveReviews.length > 0)
    ? liveReviews.map(r => ({ name: r.parentName, text: r.content, stars: r.rating }))
    : FALLBACK_REVIEWS;

  const safeIdx  = Math.min(activeTesti, testimonials.length - 1);
  const phone    = schoolInfo?.phone ?? '';
  const waNumber = phone.replace(/[^0-9]/g, '');

  const handleRegSubmit = (form: FormState) => {
    const id  = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const req: RegistrationRequest = {
      id, createdAt: new Date().toISOString(), status: 'pending',
      childName: form.childName, birthDate: form.birthDate,
      gender: form.gender as 'ذكر' | 'أنثى',
      requestedLevel: form.requestedLevel as RegistrationRequest['requestedLevel'],
      parentName: form.parentName, parentPhone: form.parentPhone,
      parentRelation: form.parentRelation,
      parentEmail: form.parentEmail || undefined,
      notes: form.notes || undefined,
    };
    addRegistrationRequest(req);
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>

        {/* ════════════════════════ HERO ════════════════════════ */}
        <LinearGradient colors={['#030612', '#080f3a', '#0c1155']} style={[s.hero, { paddingTop: topPadding + 10 }]}>

          {/* دوائر زخرفية */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(201,149,42,0.06)' }} />
            <View style={{ position: 'absolute', left: -40, bottom: 20, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(59,130,246,0.06)' }} />
          </View>

          {/* شريط علوي */}
          <View style={s.heroBar}>
            <Pressable style={s.loginPill}
              onPress={async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); await logout(); router.replace('/login'); }}>
              <Ionicons name="log-in-outline" size={15} color={Colors.accent} />
              <Text style={s.loginPillTxt}>تسجيل الدخول</Text>
            </Pressable>
            <View style={s.heroBarRight}>
              <Text style={s.heroTitle}>{HERO.title}</Text>
              <Text style={s.heroCity}>{HERO.city}</Text>
            </View>
            <HexFrame size={52} fill="rgba(255,255,255,0.08)" stroke={Colors.accent} strokeWidth={1.5}>
              <Image source={require('@/assets/images/logo_main.png')} style={{ width: 38, height: 38 }} resizeMode="contain" />
            </HexFrame>
          </View>

          {/* شعار */}
          <View style={s.sloganRow}>
            <PulsingDot />
            <Text style={s.sloganTxt}>{HERO.slogan}</Text>
            <PulsingDot />
          </View>

          {/* وصف */}
          <Text style={s.heroDesc}>{HERO.desc}</Text>

          {/* أزرار */}
          <View style={s.heroActions}>
            <Pressable style={s.btnRegister}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowRegForm(true); }}>
              <LinearGradient colors={[Colors.accent, '#b8841c']} style={s.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <MaterialCommunityIcons name="account-plus" size={17} color="#fff" />
                <Text style={s.btnTxt}>سجّل طفلك</Text>
              </LinearGradient>
            </Pressable>
            {phone ? (
              <Pressable style={s.btnWa}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openLink(`https://wa.me/${waNumber}`); }}>
                <Ionicons name="logo-whatsapp" size={17} color="#fff" />
                <Text style={s.btnTxt}>واتساب</Text>
              </Pressable>
            ) : null}
          </View>

          {/* ملاحظة زائر */}
          <View style={s.guestBadge}>
            <Ionicons name="eye-outline" size={13} color={Colors.accent} />
            <Text style={s.guestBadgeTxt}>تصفح حر — سجّل دخولك للوصول الكامل</Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.accent }}>دخول</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ════════════════════════ STATS ════════════════════════ */}
        <View style={s.statsWrap}>
          {STATS.map((st, i) => (
            <View key={i} style={s.statBox}>
              <LinearGradient colors={[st.color + '22', st.color + '08']} style={s.statIconWrap}>
                <MaterialCommunityIcons name={st.icon as any} size={20} color={st.color} />
              </LinearGradient>
              <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.body}>

          {/* ════════════════════════ BANNERS ════════════════════════ */}
          {banners.filter(b => b.active).length > 0 && (
            <View style={s.section}>
              <SectionHeader title="إعلانات وعروض" />
              {banners.filter(b => b.active).map(banner => {
                const bColor = banner.type === 'alert' ? Colors.danger : banner.type === 'offer' ? Colors.success : banner.type === 'event' ? '#3B82F6' : Colors.accent;
                return (
                  <Pressable key={banner.id} style={[s.bannerCard, { borderRightColor: bColor }]}
                    onPress={() => banner.link ? openLink(banner.link) : undefined}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={s.bannerTitle}>{banner.title}</Text>
                      {banner.subtitle ? <Text style={s.bannerSub}>{banner.subtitle}</Text> : null}
                    </View>
                    <View style={[s.bannerEmoji, { backgroundColor: bColor + '18' }]}>
                      <Text style={{ fontSize: 24 }}>
                        {banner.type === 'alert' ? '⚠️' : banner.type === 'offer' ? '🎁' : banner.type === 'event' ? '🎉' : '📢'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ════════════════════════ SERVICES ════════════════════════ */}
          <View style={s.section}>
            <SectionHeader title="خدماتنا" sub="بيئة شاملة تغطي جميع احتياجات طفلك التعليمية والترفيهية والصحية" />
            <View style={s.servGrid}>
              {SERVICES.map((sv, i) => (
                <View key={i} style={s.servCard}>
                  <View style={[s.servIcon, { backgroundColor: sv.color + '18' }]}>
                    <MaterialCommunityIcons name={sv.icon as any} size={24} color={sv.color} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.servTitle}>{sv.title}</Text>
                    <Text style={s.servDesc}>{sv.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ════════════════════════ LEVELS ════════════════════════ */}
          <View style={s.section}>
            <SectionHeader title="المستويات الدراسية" sub="ثلاثة مستويات مصمّمة لتناسب مراحل نمو طفلك" />
            <View style={s.levelsRow}>
              {LEVELS.map((lv, i) => (
                <LinearGradient key={i} colors={[lv.color + '22', lv.color + '0a']} style={s.levelCard}>
                  <MaterialCommunityIcons name={lv.icon as any} size={28} color={lv.color} />
                  <Text style={[s.levelName, { color: lv.color }]}>{lv.level}</Text>
                  <Text style={s.levelAge}>{lv.age}</Text>
                  <Text style={s.levelDesc}>{lv.desc}</Text>
                </LinearGradient>
              ))}
            </View>
          </View>

          {/* ════════════════════════ WHY US ════════════════════════ */}
          <View style={s.section}>
            <LinearGradient colors={['#040b3c', '#0c1155', '#111d7a']} style={s.whyCard}>
              <SectionHeader title="لماذا نحن؟" light />
              {WHY_US.map((w, i) => (
                <View key={i} style={s.whyRow}>
                  <Text style={s.whyTxt}>{w.text}</Text>
                  <View style={s.whyDot}>
                    <MaterialCommunityIcons name={w.icon as any} size={15} color="#030612" />
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* ════════════════════════ TESTIMONIALS ════════════════════════ */}
          <View style={s.section}>
            <SectionHeader title="آراء أولياء الأمور" sub="ثقتهم بنا هي أكبر إنجازاتنا" />
            <View style={s.testiCard}>
              <View style={s.testiQuoteWrap}>
                <MaterialCommunityIcons name="format-quote-open" size={32} color={Colors.accent + '40'} />
              </View>
              <StarsRow count={testimonials[safeIdx]?.stars ?? 5} />
              <Text style={s.testiTxt}>{testimonials[safeIdx]?.text}</Text>
              <View style={s.testiFooter}>
                <View style={s.testiDots}>
                  {testimonials.map((_, i) => (
                    <Pressable key={i} onPress={() => setActiveTesti(i)}>
                      <View style={[s.dot, i === activeTesti && s.dotActive]} />
                    </Pressable>
                  ))}
                </View>
                <View style={s.testiNameWrap}>
                  <MaterialCommunityIcons name="account-circle" size={20} color={Colors.primary} />
                  <Text style={s.testiName}>{testimonials[safeIdx]?.name}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ════════════════════════ STEPS ════════════════════════ */}
          <View style={s.section}>
            <SectionHeader title="خطوات التسجيل" sub="التسجيل سهل وسريع — أربع خطوات فقط" />
            {STEPS.map((st, i) => (
              <View key={i} style={s.stepRow}>
                {i < STEPS.length - 1 && <View style={[s.stepLine, { backgroundColor: st.color + '40' }]} />}
                <View style={s.stepContent}>
                  <Text style={s.stepTitle}>{st.title}</Text>
                  <Text style={s.stepDesc}>{st.desc}</Text>
                </View>
                <LinearGradient colors={[st.color, st.color + 'aa']} style={s.stepCircle}>
                  <MaterialCommunityIcons name={st.icon as any} size={20} color="#fff" />
                </LinearGradient>
              </View>
            ))}
          </View>

          {/* ════════════════════════ NEWS ════════════════════════ */}
          {news.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="آخر الأخبار والفعاليات" />
              {news.slice(0, 4).map(item => {
                const cfg = NEWS_ICONS[item.type] ?? NEWS_ICONS.general;
                return (
                  <View key={item.id} style={s.newsCard}>
                    <View style={s.newsRight}>
                      <Text style={s.newsTitle}>{item.title}</Text>
                      {item.body ? <Text style={s.newsBody} numberOfLines={2}>{item.body}</Text> : null}
                      <Text style={s.newsDate}>{item.date}</Text>
                    </View>
                    <View style={[s.newsIcon, { backgroundColor: cfg.color + '18' }]}>
                      <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ════════════════════════ INFO ════════════════════════ */}
          <View style={s.section}>
            <SectionHeader title="معلومات التواصل" />
            <View style={s.infoCard}>
              {[
                { icon: 'school-outline',  color: Colors.primary,  val: schoolInfo?.name ?? 'نظم إدارة رياض الأطفال', action: undefined },
                { icon: 'location-outline',color: Colors.success,  val: schoolInfo?.location ?? 'صفيتة الغنوماب', action: undefined },
                { icon: 'call-outline',    color: '#3B82F6',       val: phone || 'غير محدد', action: phone ? () => openLink(`tel:${phone}`) : undefined },
                { icon: 'mail-outline',    color: Colors.accent,   val: schoolInfo?.email ?? 'غير محدد', action: schoolInfo?.email ? () => openLink(`mailto:${schoolInfo.email}`) : undefined },
              ].map((row, i, arr) => (
                <Pressable key={i} style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}
                  onPress={row.action} disabled={!row.action}>
                  <Text style={[s.infoVal, row.action ? { color: row.color } : {}]}>{row.val}</Text>
                  <View style={[s.infoIconWrap, { backgroundColor: row.color + '15' }]}>
                    <Ionicons name={row.icon as any} size={17} color={row.color} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ════════════════════════ CTA ════════════════════════ */}
          <View style={s.ctaWrap}>
            <LinearGradient colors={['#040b3c', '#0c1155', '#1a237e']} style={s.ctaCard}>
              <View style={s.ctaIconBg}>
                <MaterialCommunityIcons name="account-child-circle" size={48} color={Colors.accent} />
              </View>
              <Text style={s.ctaTitle}>سجّل طفلك الآن</Text>
              <Text style={s.ctaSub}>الأماكن محدودة — لا تفوّت الفرصة</Text>

              <Pressable style={s.ctaMainBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push('/enrollment-request'); }}>
                <LinearGradient colors={[Colors.accent, '#b8841c']} style={s.ctaMainBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <MaterialCommunityIcons name="file-document-edit" size={18} color="#fff" />
                  <Text style={s.ctaMainBtnTxt}>تعبئة استمارة التسجيل</Text>
                </LinearGradient>
              </Pressable>

              <View style={s.ctaRow}>
                {phone ? (
                  <Pressable style={s.ctaWaBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openLink(`https://wa.me/${waNumber}`); }}>
                    <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                    <Text style={s.ctaSecBtnTxt}>واتساب</Text>
                  </Pressable>
                ) : null}
                <Pressable style={s.ctaLoginBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace('/login'); }}>
                  <Ionicons name="person-circle-outline" size={16} color={Colors.accent} />
                  <Text style={[s.ctaSecBtnTxt, { color: Colors.accent }]}>دخول ولي الأمر</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>

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

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#F8F9FC' },

  // ── Hero ──
  hero:      { paddingHorizontal: 20, paddingBottom: 24 },
  heroBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  heroBarRight: { flex: 1, alignItems: 'flex-end' },
  heroTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#ffffff' },
  heroCity:  { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)', marginTop: 2 },
  loginPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(201,149,42,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(201,149,42,0.30)' },
  loginPillTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.accent },
  sloganRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 12 },
  sloganTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.accent, letterSpacing: 0.3 },
  heroDesc:  { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.68)', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  heroActions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 16 },
  btnRegister: { borderRadius: 26, overflow: 'hidden' },
  btnGrad:   { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 22, paddingVertical: 13 },
  btnWa:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 26 },
  btnTxt:    { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  guestBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(201,149,42,0.10)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(201,149,42,0.22)' },
  guestBadgeTxt: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', flex: 1, textAlign: 'right' },

  // ── Stats ──
  statsWrap: { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#EAECF0' },
  statBox:   { flex: 1, alignItems: 'center', gap: 5 },
  statIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statVal:   { fontSize: 17, fontFamily: 'Inter_700Bold' },
  statLbl:   { fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center' },

  // ── Layout ──
  body:      { paddingHorizontal: 18, paddingTop: 22 },
  section:   { marginBottom: 28 },

  // ── Banners ──
  bannerCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderRightWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  bannerTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'right', marginBottom: 3 },
  bannerSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'right' },
  bannerEmoji: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },

  // ── Services ──
  servGrid:  { gap: 10 },
  servCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  servIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  servTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 4 },
  servDesc:  { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6B7280', lineHeight: 18 },

  // ── Levels ──
  levelsRow: { flexDirection: 'row', gap: 10 },
  levelCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 },
  levelName: { fontSize: 13, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  levelAge:  { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#6B7280', textAlign: 'center' },
  levelDesc: { fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center', lineHeight: 14, marginTop: 2 },

  // ── Why ──
  whyCard:   { borderRadius: 22, padding: 22 },
  whyRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  whyTxt:    { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'right', lineHeight: 20 },
  whyDot:    { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },

  // ── Testimonials ──
  testiCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  testiQuoteWrap: { alignSelf: 'flex-end', marginBottom: 10 },
  testiTxt:     { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#374151', textAlign: 'right', lineHeight: 24, marginTop: 10, marginBottom: 16 },
  testiFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  testiNameWrap:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  testiName:    { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  testiDots:    { flexDirection: 'row', gap: 6 },
  dot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive:    { backgroundColor: Colors.accent, width: 22, borderRadius: 3.5 },

  // ── Steps ──
  stepRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, position: 'relative' },
  stepLine:    { position: 'absolute', right: 23, top: 48, width: 2, height: 26, borderRadius: 1 },
  stepCircle:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  stepContent: { flex: 1, alignItems: 'flex-end', paddingTop: 4 },
  stepTitle:   { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 4 },
  stepDesc:    { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'right', lineHeight: 19 },

  // ── News ──
  newsCard:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  newsIcon:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  newsRight: { flex: 1, alignItems: 'flex-end' },
  newsTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'right', marginBottom: 4 },
  newsBody:  { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'right', lineHeight: 17, marginBottom: 4 },
  newsDate:  { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },

  // ── Info ──
  infoCard:    { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoVal:     { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: '#111827', textAlign: 'right', marginRight: 12 },
  infoIconWrap:{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // ── CTA ──
  ctaWrap:         { marginBottom: 8 },
  ctaCard:         { borderRadius: 24, padding: 28, alignItems: 'center' },
  ctaIconBg:       { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(201,149,42,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ctaTitle:        { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 6 },
  ctaSub:          { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.70)', marginBottom: 22, textAlign: 'center' },
  ctaMainBtn:      { borderRadius: 24, overflow: 'hidden', width: '100%', marginBottom: 14 },
  ctaMainBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaMainBtnTxt:   { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  ctaRow:          { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  ctaWaBtn:        { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22 },
  ctaLoginBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  ctaSecBtnTxt:    { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
});
