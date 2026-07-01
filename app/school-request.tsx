import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Platform, Alert, ActivityIndicator, Animated, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fsAddSchoolRequest } from '@/lib/firestore-service';
import { pickAndUploadImage } from '@/lib/uploads';
import { SUBSCRIPTION_TIERS, TIER_ORDER } from '@/lib/subscription-tiers';

// ─── Color presets ─────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { primary: '#0c1155', accent: '#c9952a', label: 'كحلي ذهبي' },
  { primary: '#1a472a', accent: '#f0c040', label: 'أخضر ذهبي' },
  { primary: '#6b21a8', accent: '#fbbf24', label: 'بنفسجي ذهبي' },
  { primary: '#7c2d12', accent: '#fcd34d', label: 'بني ذهبي' },
  { primary: '#0f4c75', accent: '#e8a838', label: 'أزرق ذهبي' },
  { primary: '#1e3a5f', accent: '#f97316', label: 'كحلي برتقالي' },
  { primary: '#134e4a', accent: '#34d399', label: 'تيل أخضر' },
  { primary: '#1e1b4b', accent: '#818cf8', label: 'نيلي أرجواني' },
];

const SCHOOL_TYPES = ['أهلية', 'حكومية', 'دولية', 'مختلطة'];
const CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الطائف', 'تبوك', 'بريدة', 'أبها', 'حائل', 'جازان', 'نجران', 'الجبيل', 'ينبع', 'أخرى'];

interface FormData {
  school_name: string;
  school_type: string;
  city: string;
  address: string;
  license_number: string;
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  slogan: string;
  principal_name: string;
  school_motto: string;
  letterhead_address: string;
  stamp_info: string;
  requested_tier: string;
  wants_trial: boolean;
}

const INITIAL: FormData = {
  school_name: '', school_type: 'أهلية', city: '', address: '', license_number: '',
  admin_name: '', admin_phone: '', admin_email: '',
  logo_url: '', primary_color: '#0c1155', accent_color: '#c9952a', slogan: '',
  principal_name: '', school_motto: '', letterhead_address: '', stamp_info: '',
  requested_tier: 'trial', wants_trial: true,
};

// ─── Step Header ────────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.dot, i <= current && s.dotActive, i === current && s.dotCurrent]} />
      ))}
    </View>
  );
}

// ─── Section Label ───────────────────────────────────────────────────────────────
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={s.label}>
      {text}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
    </Text>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, required, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
  required?: boolean; autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={s.fieldWrap}>
      <Label text={label} required={required} />
      <TextInput
        style={[s.input, multiline && s.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor="rgba(255,255,255,0.25)"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlign="right"
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

// ─── Chip Selector ───────────────────────────────────────────────────────────────
function ChipRow({ label, options, value, onSelect }: {
  label: string; options: string[]; value: string; onSelect: (v: string) => void;
}) {
  return (
    <View style={s.fieldWrap}>
      <Label text={label} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {options.map(opt => (
          <Pressable key={opt} onPress={() => onSelect(opt)}
            style={[s.chip, value === opt && s.chipActive]}>
            <Text style={[s.chipTxt, value === opt && s.chipTxtActive]}>{opt}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Step 1 — School Info ────────────────────────────────────────────────────────
function Step1({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  return (
    <View style={s.stepBody}>
      <View style={s.stepHeader}>
        <MaterialCommunityIcons name="school-outline" size={28} color="#c9952a" />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={s.stepTitle}>معلومات الروضة</Text>
          <Text style={s.stepSub}>البيانات الأساسية للمؤسسة التعليمية</Text>
        </View>
      </View>
      <Field label="اسم الروضة" value={data.school_name} onChangeText={v => set({ school_name: v })}
        placeholder="مثال: روضة النجوم المضيئة" required />
      <ChipRow label="نوع الروضة" options={SCHOOL_TYPES} value={data.school_type} onSelect={v => set({ school_type: v })} />
      <ChipRow label="المدينة" options={CITIES} value={data.city} onSelect={v => set({ city: v })} />
      <Field label="العنوان التفصيلي" value={data.address} onChangeText={v => set({ address: v })}
        placeholder="الحي، الشارع، رقم المبنى" multiline />
      <Field label="رقم الترخيص (اختياري)" value={data.license_number} onChangeText={v => set({ license_number: v })}
        placeholder="رقم ترخيص وزارة التعليم" keyboardType="default" />
    </View>
  );
}

// ─── Step 2 — Admin Info ─────────────────────────────────────────────────────────
function Step2({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  return (
    <View style={s.stepBody}>
      <View style={s.stepHeader}>
        <MaterialCommunityIcons name="account-cog-outline" size={28} color="#c9952a" />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={s.stepTitle}>بيانات المسؤول</Text>
          <Text style={s.stepSub}>معلومات الشخص المسؤول عن الإدارة</Text>
        </View>
      </View>
      <Field label="الاسم الكامل" value={data.admin_name} onChangeText={v => set({ admin_name: v })}
        placeholder="اسم مدير/مديرة الروضة" required />
      <Field label="رقم الجوال" value={data.admin_phone} onChangeText={v => set({ admin_phone: v })}
        placeholder="05XXXXXXXX" keyboardType="phone-pad" required autoCapitalize="none" />
      <Field label="البريد الإلكتروني" value={data.admin_email} onChangeText={v => set({ admin_email: v })}
        placeholder="admin@school.com" keyboardType="email-address" required autoCapitalize="none" />

    </View>
  );
}

// ─── Step 3 — Branding ──────────────────────────────────────────────────────────
function Step3({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadImage('school-request-logo');
      if (result?.publicUrl) set({ logo_url: result.publicUrl });
    } catch (err) {
      Alert.alert('خطأ', 'فشل رفع الصورة، حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={s.stepBody}>
      <View style={s.stepHeader}>
        <MaterialCommunityIcons name="palette-outline" size={28} color="#c9952a" />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={s.stepTitle}>الهوية البصرية</Text>
          <Text style={s.stepSub}>شعار الروضة وألوانها تظهر عند تسجيل الدخول وفي جميع الوثائق</Text>
        </View>
      </View>

      {/* Logo Upload */}
      <Label text="شعار الروضة" />
      <Pressable onPress={handleLogoUpload} style={s.logoUpload} disabled={uploading}>
        {data.logo_url ? (
          <Image source={{ uri: data.logo_url }} style={s.logoPreview} resizeMode="contain" />
        ) : (
          <View style={s.logoPlaceholder}>
            {uploading
              ? <ActivityIndicator color="#c9952a" />
              : <>
                  <MaterialCommunityIcons name="image-plus" size={32} color="rgba(201,149,42,0.60)" />
                  <Text style={s.logoPlaceholderTxt}>اضغط لرفع الشعار</Text>
                  <Text style={s.logoPlaceholderSub}>PNG أو JPG — يظهر عند تسجيل الدخول</Text>
                </>
            }
          </View>
        )}
        {data.logo_url && (
          <Pressable onPress={() => set({ logo_url: '' })} style={s.logoRemove}>
            <Ionicons name="close-circle" size={22} color="#ef4444" />
          </Pressable>
        )}
      </Pressable>

      {/* Color Presets */}
      <Label text="نظام الألوان" />
      <View style={s.colorGrid}>
        {COLOR_PRESETS.map((preset, i) => {
          const isSelected = data.primary_color === preset.primary && data.accent_color === preset.accent;
          return (
            <Pressable key={i} onPress={() => set({ primary_color: preset.primary, accent_color: preset.accent })}
              style={[s.colorCard, isSelected && s.colorCardActive]}>
              <View style={s.colorSwatches}>
                <View style={[s.swatch, { backgroundColor: preset.primary }]} />
                <View style={[s.swatch, { backgroundColor: preset.accent }]} />
              </View>
              <Text style={s.colorLabel}>{preset.label}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={16} color="#c9952a" style={s.colorCheck} />}
            </Pressable>
          );
        })}
      </View>

      {/* Preview */}
      <View style={s.fieldWrap}>
        <Label text="معاينة هوية الروضة" />
        <LinearGradient colors={[data.primary_color, data.primary_color + 'cc']}
          style={s.previewCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {data.logo_url
            ? <Image source={{ uri: data.logo_url }} style={{ width: 52, height: 52, borderRadius: 12 }} resizeMode="contain" />
            : <View style={[s.previewLogo, { borderColor: data.accent_color }]}>
                <MaterialCommunityIcons name="school" size={26} color={data.accent_color} />
              </View>
          }
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text style={[s.previewName, { color: '#fff' }]}>{data.school_name || 'اسم الروضة'}</Text>
            <Text style={[s.previewSlogan, { color: data.accent_color }]}>{data.slogan || 'شعار الروضة'}</Text>
          </View>
        </LinearGradient>
      </View>

      <Field label="شعار الروضة / الموتو" value={data.slogan} onChangeText={v => set({ slogan: v })}
        placeholder="مثال: نبني الجيل بالعلم والأخلاق" />
    </View>
  );
}

// ─── Step 4 — Document Info ──────────────────────────────────────────────────────
function Step4({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  return (
    <View style={s.stepBody}>
      <View style={s.stepHeader}>
        <MaterialCommunityIcons name="file-document-outline" size={28} color="#c9952a" />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={s.stepTitle}>بيانات الوثائق</Text>
          <Text style={s.stepSub}>تظهر هذه البيانات في الشهادات والبطاقات والأوراق المطبوعة</Text>
        </View>
      </View>

      <Field label="اسم المدير/المديرة للوثائق" value={data.principal_name}
        onChangeText={v => set({ principal_name: v })}
        placeholder="الاسم الذي يظهر في الشهادات والتقارير" />

      <Field label="رسالة الروضة (للوثائق)" value={data.school_motto}
        onChangeText={v => set({ school_motto: v })}
        placeholder="مثال: نسعى لتنشئة جيل متميز في بيئة آمنة ومحفّزة"
        multiline />

      <Field label="العنوان الكامل للمراسلات" value={data.letterhead_address}
        onChangeText={v => set({ letterhead_address: v })}
        placeholder="المملكة العربية السعودية — الرياض — حي النرجس — ص.ب..."
        multiline />

      <Field label="رقم الختم / السجل التجاري" value={data.stamp_info}
        onChangeText={v => set({ stamp_info: v })}
        placeholder="رقم يظهر أسفل الوثائق الرسمية" />

    </View>
  );
}

// ─── Step 5 — Package ────────────────────────────────────────────────────────────
function Step5({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  return (
    <View style={s.stepBody}>
      <View style={s.stepHeader}>
        <MaterialCommunityIcons name="tag-multiple-outline" size={28} color="#c9952a" />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={s.stepTitle}>اختيار الباقة</Text>
          <Text style={s.stepSub}>يمكنك البدء بالتجربة المجانية ثم الترقية في أي وقت</Text>
        </View>
      </View>

      {/* Trial Toggle */}
      <Pressable onPress={() => set({ wants_trial: true, requested_tier: 'trial' })}
        style={[s.trialCard, data.wants_trial && s.trialCardActive]}>
        <LinearGradient
          colors={data.wants_trial ? ['#064e3b', '#065f46'] : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.03)']}
          style={s.trialInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={s.trialLeft}>
            <View style={[s.trialIconWrap, data.wants_trial && { backgroundColor: 'rgba(52,211,153,0.20)' }]}>
              <MaterialCommunityIcons name="gift-outline" size={24} color={data.wants_trial ? '#34d399' : 'rgba(255,255,255,0.30)'} />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={[s.trialTitle, data.wants_trial && { color: '#34d399' }]}>ابدأ مجاناً</Text>
              <Text style={[s.trialSub, data.wants_trial && { color: 'rgba(52,211,153,0.70)' }]}>
                30 يوماً تجريبية بدون بطاقة ائتمانية
              </Text>
            </View>
          </View>
          <View style={[s.trialBadge, data.wants_trial && { backgroundColor: 'rgba(52,211,153,0.20)', borderColor: 'rgba(52,211,153,0.50)' }]}>
            <Text style={[s.trialBadgeTxt, data.wants_trial && { color: '#34d399' }]}>مجاني</Text>
          </View>
        </LinearGradient>
      </Pressable>

      <Text style={s.orDivider}>— أو اختر باقة مدفوعة —</Text>

      {TIER_ORDER.filter(t => t !== 'trial').map(tierId => {
        const tier = SUBSCRIPTION_TIERS[tierId];
        const isSelected = !data.wants_trial && data.requested_tier === tierId;
        return (
          <Pressable key={tierId}
            onPress={() => set({ requested_tier: tierId, wants_trial: false })}
            style={[s.tierCard, isSelected && { borderColor: tier.color + '80', backgroundColor: tier.color + '10' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={[s.tierBadge, { backgroundColor: tier.color + '20', borderColor: tier.color + '50' }]}>
                <Text style={[s.tierBadgeTxt, { color: tier.color }]}>{tier.badgeAr}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={tier.color} />}
                <View style={[s.tierIconWrap, { backgroundColor: tier.color + '15' }]}>
                  <Text style={{ fontSize: 20 }}>{tier.emoji}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.tierName}>{tier.nameAr}</Text>
                  <Text style={s.tierDesc}>{tier.description}</Text>
                </View>
              </View>
            </View>
            <View style={s.tierLimits}>
              {[
                { icon: 'account-group', val: tier.limits.students === -1 ? 'غير محدود' : `${tier.limits.students} طالب`, label: 'الطلاب' },
                { icon: 'human-male-board', val: tier.limits.teachers === -1 ? 'غير محدود' : `${tier.limits.teachers} معلم`, label: 'المعلمون' },
                { icon: 'account-multiple', val: tier.limits.parents === -1 ? 'غير محدود' : `${tier.limits.parents} ولي`, label: 'أولياء الأمور' },
              ].map(item => (
                <View key={item.label} style={s.tierLimitItem}>
                  <Text style={s.tierLimitVal}>{item.val}</Text>
                  <MaterialCommunityIcons name={item.icon as any} size={14} color="rgba(255,255,255,0.35)" />
                </View>
              ))}
            </View>
            <View style={s.tierFeatures}>
              {[
                { key: 'customBranding', label: 'هوية بصرية خاصة' },
                { key: 'analytics',      label: 'تقارير وإحصائيات' },
                { key: 'multiAdmin',     label: 'متعدد الإدارات' },
                { key: 'exportData',     label: 'تصدير البيانات' },
              ].map(f => (
                <View key={f.key} style={s.tierFeatureRow}>
                  <Text style={s.tierFeatureLabel}>{f.label}</Text>
                  <Ionicons
                    name={(tier as any)[f.key] ? 'checkmark-circle' : 'close-circle-outline'}
                    size={14}
                    color={(tier as any)[f.key] ? '#34d399' : 'rgba(255,255,255,0.20)'}
                  />
                </View>
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────────────
function SuccessScreen({ schoolName }: { schoolName: string }) {
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center', padding: 32, paddingBottom: botPad + 32 }}>
      <LinearGradient colors={['#030612', '#04110a', '#041a10', '#030612']}
        style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }], opacity: opacAnim }}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={72} color="#34d399" />
        </View>
        <Text style={s.successTitle}>تم استلام طلبك!</Text>
        <Text style={s.successSchool}>{schoolName}</Text>
        <Text style={s.successBody}>
          سيراجع فريقنا طلبكم ويتواصل معكم خلال 24 ساعة على البريد الإلكتروني المُسجَّل لإتمام عملية التفعيل.
        </Text>
        <View style={s.successSteps}>
          {[
            { icon: 'mail-outline',       label: 'مراجعة الطلب — 24 ساعة' },
            { icon: 'call-outline',        label: 'التواصل وتأكيد البيانات' },
            { icon: 'shield-checkmark-outline', label: 'تفعيل الحساب وبدء الاستخدام' },
          ].map((step, i) => (
            <View key={i} style={s.successStep}>
              <Ionicons name={step.icon as any} size={16} color="#34d399" />
              <Text style={s.successStepTxt}>{step.label}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => router.replace('/platform')}
          style={({ pressed }) => [s.successBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient colors={['#064e3b', '#065f46', '#047857']}
            style={s.successBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.successBtnTxt}>العودة للرئيسية</Text>
            <Ionicons name="home-outline" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────────
const STEPS = ['معلومات الروضة', 'بيانات المسؤول', 'الهوية البصرية', 'بيانات الوثائق', 'الباقة المطلوبة'];

export default function SchoolRequestScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [step,       setStep]       = useState(0);
  const [data,       setData]       = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const set = (patch: Partial<FormData>) => setData(prev => ({ ...prev, ...patch }));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!data.school_name.trim()) return 'أدخل اسم الروضة';
      if (!data.city) return 'اختر مدينة الروضة';
    }
    if (step === 1) {
      if (!data.admin_name.trim()) return 'أدخل اسم المسؤول';
      if (!data.admin_phone.trim()) return 'أدخل رقم الجوال';
      if (!data.admin_email.trim() || !data.admin_email.includes('@')) return 'أدخل بريداً إلكترونياً صحيحاً';
    }
    return null;
  };

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const err = validateStep();
    if (err) { Alert.alert('تنبيه', err); return; }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) {
      setStep(s => s - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fsAddSchoolRequest(data as unknown as Record<string, unknown>);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (err) {
      Alert.alert('خطأ', 'تعذّر إرسال الطلب، تحقق من الإنترنت وأعد المحاولة');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return <SuccessScreen schoolName={data.school_name} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#030612' }}>
      <LinearGradient
        colors={['#030612', '#060c28', '#0a1050', '#060c28', '#030612']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={prevStep} style={s.headerBack}>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.60)" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>طلب انضمام روضة</Text>
          <Text style={s.headerSub}>{STEPS[step]}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <Text style={s.progressTxt}>{step + 1} / {STEPS.length}</Text>
      </View>
      <StepDots total={STEPS.length} current={step} />

      {/* Content */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 100 }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && <Step1 data={data} set={set} />}
        {step === 1 && <Step2 data={data} set={set} />}
        {step === 2 && <Step3 data={data} set={set} />}
        {step === 3 && <Step4 data={data} set={set} />}
        {step === 4 && <Step5 data={data} set={set} />}
      </ScrollView>

      {/* Bottom Action */}
      <View style={[s.bottomBar, { paddingBottom: botPad + 12 }]}>
        <Pressable onPress={nextStep} disabled={submitting}
          style={({ pressed }) => [s.nextBtn, { opacity: pressed || submitting ? 0.80 : 1 }]}>
          <LinearGradient
            colors={step === STEPS.length - 1 ? ['#064e3b', '#065f46', '#047857'] : ['#0c1155', '#1e2480', '#2a33a0']}
            style={s.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={s.nextBtnTxt}>
                    {step === STEPS.length - 1 ? 'إرسال الطلب' : 'التالي'}
                  </Text>
                  <Ionicons
                    name={step === STEPS.length - 1 ? 'send' : 'arrow-back'}
                    size={18} color="#fff"
                  />
                </>
            }
          </LinearGradient>
        </Pressable>
        {step > 0 && (
          <Pressable onPress={prevStep} style={s.prevBtn}>
            <Text style={s.prevBtnTxt}>السابق</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(201,149,42,0.70)', marginTop: 2 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  progressBar:  { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#c9952a', borderRadius: 2 },
  progressTxt:  { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(201,149,42,0.60)', width: 32, textAlign: 'right' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: 'rgba(201,149,42,0.40)' },
  dotCurrent: { width: 18, backgroundColor: '#c9952a' },

  stepBody: { paddingTop: 20, gap: 0 },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(201,149,42,0.06)', borderRadius: 16,
    padding: 16, marginBottom: 22,
    borderWidth: 1, borderColor: 'rgba(201,149,42,0.15)',
  },
  stepTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff' },
  stepSub:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.40)', marginTop: 3, lineHeight: 16 },

  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)', marginBottom: 8, textAlign: 'right' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, fontFamily: 'Inter_400Regular', color: '#fff',
  },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 12 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive:    { backgroundColor: 'rgba(201,149,42,0.18)', borderColor: 'rgba(201,149,42,0.50)' },
  chipTxt:       { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.55)' },
  chipTxtActive: { color: '#c9952a', fontFamily: 'Inter_700Bold' },

  logoUpload: {
    height: 130, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed',
    borderColor: 'rgba(201,149,42,0.40)', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(201,149,42,0.04)', marginBottom: 18, overflow: 'hidden',
  },
  logoPreview:      { width: '100%', height: '100%' },
  logoPlaceholder:  { alignItems: 'center', gap: 8 },
  logoPlaceholderTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(201,149,42,0.60)' },
  logoPlaceholderSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.25)' },
  logoRemove: { position: 'absolute', top: 8, left: 8 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  colorCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'flex-end', gap: 8, position: 'relative',
  },
  colorCardActive: { borderColor: 'rgba(201,149,42,0.50)', backgroundColor: 'rgba(201,149,42,0.08)' },
  colorSwatches:   { flexDirection: 'row', gap: 6 },
  swatch:          { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  colorLabel:      { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.50)' },
  colorCheck:      { position: 'absolute', top: 8, left: 8 },

  previewCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  previewLogo: {
    width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 2,
  },
  previewName:   { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  previewSlogan: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right' },

  trialCard:       { borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  trialCardActive: { borderColor: 'rgba(52,211,153,0.40)' },
  trialInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  trialLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trialIconWrap: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  trialTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.50)' },
  trialSub:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.30)', marginTop: 2 },
  trialBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  trialBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },

  orDivider: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.25)', marginBottom: 16, letterSpacing: 1 },

  tierCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14,
  },
  tierIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tierBadge:    { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tierBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  tierName:     { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'right' },
  tierDesc:     { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.40)', textAlign: 'right', marginTop: 2 },

  tierLimits: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  tierLimitItem: { alignItems: 'center', gap: 4 },
  tierLimitVal:  { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff', textAlign: 'center' },

  tierFeatures: { gap: 6 },
  tierFeatureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  tierFeatureLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: 'rgba(3,6,18,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  nextBtn:     { borderRadius: 16, overflow: 'hidden' },
  nextBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 15 },
  nextBtnTxt:  { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  prevBtn:     { alignItems: 'center', paddingVertical: 8 },
  prevBtnTxt:  { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.35)' },

  successIcon:  { marginBottom: 22 },
  successTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 6, textAlign: 'center' },
  successSchool:{ fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#34d399', marginBottom: 16, textAlign: 'center' },
  successBody:  {
    fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  successSteps: {
    width: '100%', gap: 10, backgroundColor: 'rgba(52,211,153,0.06)',
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(52,211,153,0.20)', marginBottom: 28,
  },
  successStep:    { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'flex-end' },
  successStepTxt: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)' },
  successBtn:     { width: '100%', borderRadius: 16, overflow: 'hidden' },
  successBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 15 },
  successBtnTxt:  { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
