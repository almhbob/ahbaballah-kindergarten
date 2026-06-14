import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData } from '@/contexts/AppDataContext';
import { uploadFile } from '@/lib/uploads';

type Level = 'براعم' | 'مستوى أول' | 'مستوى ثاني';
type Gender = 'ذكر' | 'أنثى';

const LEVELS: Level[] = ['براعم', 'مستوى أول', 'مستوى ثاني'];
const GENDERS: Gender[] = ['ذكر', 'أنثى'];
const AGE_HINTS: Record<Level, string> = {
  'براعم': '٣ – ٤ سنوات', 'مستوى أول': '٤ – ٥ سنوات', 'مستوى ثاني': '٥ – ٦ سنوات',
};
const DOCS = [
  { key: 'birth',      label: 'شهادة الميلاد',          required: true },
  { key: 'id',         label: 'هوية ولي الأمر',          required: true },
  { key: 'passport',   label: 'جواز سفر الطفل',          required: false },
  { key: 'health',     label: 'دفتر التطعيمات',           required: false },
  { key: 'photo',      label: 'صورة شخصية للطفل',        required: false },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}{required && <Text style={f.req}> *</Text>}</Text>
      {children}
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  req: { color: Colors.danger },
});

export default function EnrollmentRequestScreen() {
  const insets = useSafeAreaInsets();
  const { addRegistrationRequest } = useAppData();

  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<Level>('براعم');
  const [gender, setGender] = useState<Gender>('ذكر');
  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('');
  const [notes, setNotes] = useState('');
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'docs' | 'done'>('form');
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  async function pickDoc(key: string) {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('تنبيه', 'نحتاج إذن الوصول إلى المعرض');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return;
      setUploadingDoc(key);
      const url = await uploadFile(result.assets[0].uri, {
        name: `reg_${key}_${Date.now()}.jpg`,
        mime: 'image/jpeg',
      });
      setDocs(prev => ({ ...prev, [key]: url }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Alert.alert('فشل الرفع', e?.message || 'تعذّر رفع المستند، حاول مجدداً');
    } finally {
      setUploadingDoc(null);
    }
  }

  function validateForm(): string | null {
    if (!childName.trim()) return 'أدخل اسم الطفل';
    if (!parentName.trim()) return 'أدخل اسم ولي الأمر';
    if (!phone.trim()) return 'أدخل رقم الهاتف';
    return null;
  }

  function submitRequest() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const docPayload: Record<string, string> = {};
    Object.entries(docs).forEach(([k, v]) => { if (v) docPayload[k] = v; });
    setTimeout(() => {
      addRegistrationRequest({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        childName: childName.trim(),
        parentName: parentName.trim(),
        parentPhone: phone.trim(),
        parentRelation: 'ولي أمر',
        requestedLevel: level,
        gender,
        birthDate: birthDate.trim(),
        nationality: nationality.trim() || undefined,
        notes: notes.trim() || undefined,
        documents: Object.keys(docPayload).length ? docPayload : undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
      setStep('done');
    }, 400);
  }

  if (step === 'done') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#030612', '#0a1050', '#0d1463']} style={StyleSheet.absoluteFill} />
        <View style={[s.doneWrap, { paddingTop: topPadding + 60, paddingBottom: bottomPadding }]}>
          <View style={s.doneIcon}>
            <LinearGradient colors={['#10B981', '#059669']} style={s.doneGrad}>
              <Ionicons name="checkmark" size={52} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={s.doneTitle}>تم إرسال طلبك!</Text>
          <Text style={s.doneSub}>سيتواصل معك فريق الروضة قريباً على الرقم{'\n'}<Text style={{ color: Colors.accent }}>{phone}</Text></Text>
          <Pressable style={s.doneBtn} onPress={() => router.back()}>
            <LinearGradient colors={['#a07018', '#c9952a', '#e8b84b']} style={s.doneBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.doneBtnText}>العودة للرئيسية</Text>
              <Ionicons name="home-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#030612', '#0a1050', '#0d1463']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPadding + 16, paddingBottom: bottomPadding, gap: 16 }}
        >
          <View style={s.headerRow}>
            <Pressable onPress={() => (step === 'docs' ? setStep('form') : router.back())} style={s.backBtn}>
              <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Text style={s.headerTitle}>
              {step === 'form' ? 'طلب تسجيل طالب جديد' : 'رفع المستندات'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={s.stepRow}>
            {[{ n: '١', label: 'البيانات' }, { n: '٢', label: 'المستندات' }].map((st, i) => (
              <View key={i} style={s.stepItem}>
                <View style={[s.stepCircle, i === (step === 'form' ? 0 : 1) && s.stepCircleActive]}>
                  <Text style={[s.stepNum, i === (step === 'form' ? 0 : 1) && s.stepNumActive]}>{st.n}</Text>
                </View>
                <Text style={[s.stepLabel, i === (step === 'form' ? 0 : 1) && s.stepLabelActive]}>{st.label}</Text>
              </View>
            ))}
            <View style={s.stepLine} />
          </View>

          {step === 'form' ? (
            <>
              <Field label="الاسم الكامل للطفل" required>
                <View style={s.inputBox}>
                  <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
                  <TextInput style={s.input} value={childName} onChangeText={setChildName} placeholder="أدخل اسم الطفل" placeholderTextColor="rgba(255,255,255,0.25)" textAlign="right" />
                </View>
              </Field>

              <Field label="اسم ولي الأمر" required>
                <View style={s.inputBox}>
                  <Ionicons name="person-add-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
                  <TextInput style={s.input} value={parentName} onChangeText={setParentName} placeholder="أدخل اسم ولي الأمر" placeholderTextColor="rgba(255,255,255,0.25)" textAlign="right" />
                </View>
              </Field>

              <Field label="رقم الهاتف" required>
                <View style={s.inputBox}>
                  <Ionicons name="call-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
                  <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" placeholderTextColor="rgba(255,255,255,0.25)" keyboardType="phone-pad" textAlign="right" />
                </View>
              </Field>

              <Field label="المستوى الدراسي" required>
                <View style={s.chipRow}>
                  {LEVELS.map(lv => (
                    <Pressable key={lv} style={[s.chip, level === lv && s.chipActive]} onPress={() => setLevel(lv)}>
                      <Text style={[s.chipText, level === lv && s.chipTextActive]}>{lv}</Text>
                      {level === lv && <Text style={s.chipHint}>{AGE_HINTS[lv]}</Text>}
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label="الجنس">
                <View style={s.chipRow}>
                  {GENDERS.map(g => (
                    <Pressable key={g} style={[s.chip, gender === g && s.chipActive]} onPress={() => setGender(g)}>
                      <Text style={[s.chipText, gender === g && s.chipTextActive]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label="تاريخ الميلاد">
                <View style={s.inputBox}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
                  <TextInput style={s.input} value={birthDate} onChangeText={setBirthDate} placeholder="مثال: 2020-03-15" placeholderTextColor="rgba(255,255,255,0.25)" textAlign="right" />
                </View>
              </Field>

              <Field label="الجنسية">
                <View style={s.inputBox}>
                  <MaterialCommunityIcons name="flag-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
                  <TextInput style={s.input} value={nationality} onChangeText={setNationality} placeholder="مثال: سوداني" placeholderTextColor="rgba(255,255,255,0.25)" textAlign="right" />
                </View>
              </Field>

              <Field label="ملاحظات إضافية">
                <View style={[s.inputBox, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                  <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="أي معلومات إضافية تودّ إضافتها" placeholderTextColor="rgba(255,255,255,0.25)" multiline textAlign="right" />
                </View>
              </Field>

              <Pressable
                style={({ pressed }) => [s.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => {
                  const err = validateForm();
                  if (err) { Alert.alert('تنبيه', err); return; }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep('docs');
                }}
              >
                <LinearGradient colors={['#a07018', '#c9952a', '#e8b84b']} style={s.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.nextBtnText}>التالي: رفع المستندات</Text>
                  <Ionicons name="arrow-back" size={18} color="#fff" style={{ marginRight: 4 }} />
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.docsHint}>الوثائق المطلوبة (مطلوبة <Text style={{ color: Colors.danger }}>*</Text> )</Text>
              {DOCS.map(doc => {
                const uri = docs[doc.key];
                const isUploading = uploadingDoc === doc.key;
                return (
                  <Pressable key={doc.key} style={[s.docItem, isUploading && { opacity: 0.7 }]} onPress={() => !isUploading && pickDoc(doc.key)} disabled={isUploading}>
                    {uri ? (
                      <Image source={{ uri }} style={s.docThumb} resizeMode="cover" />
                    ) : (
                      <View style={s.docIcon}>
                        <MaterialCommunityIcons
                          name={isUploading ? 'cloud-upload-outline' : 'file-upload-outline'}
                          size={24}
                          color={'rgba(255,255,255,0.3)'}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.docLabel}>
                        {doc.label}
                        {doc.required && <Text style={{ color: Colors.danger }}> *</Text>}
                      </Text>
                      <Text style={s.docSub}>
                        {isUploading ? 'جاري الرفع...' : uri ? 'تم الرفع ✓' : 'اضغط لاختيار الصورة'}
                      </Text>
                    </View>
                    <Ionicons name={uri ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={uri ? Colors.success : 'rgba(255,255,255,0.3)'} />
                  </Pressable>
                );
              })}

              <Pressable
                style={({ pressed }) => [s.nextBtn, { opacity: pressed || loading ? 0.8 : 1 }]}
                onPress={submitRequest}
                disabled={loading}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={s.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.nextBtnText}>{loading ? 'جاري الإرسال...' : 'إرسال طلب التسجيل'}</Text>
                  <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                </LinearGradient>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, alignItems: 'center', position: 'relative', marginVertical: 4 },
  stepLine: { position: 'absolute', top: 16, left: '35%', right: '35%', height: 2, backgroundColor: 'rgba(255,255,255,0.15)', zIndex: -1 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  stepCircleActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepNum: { fontSize: 14, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.4)' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.35)' },
  stepLabelActive: { color: '#fff' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, height: 48 },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  chipActive: { backgroundColor: Colors.accent + '30', borderColor: Colors.accent },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.5)' },
  chipTextActive: { color: '#fff' },
  chipHint: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.accent, marginTop: 1 },
  nextBtn: { marginTop: 8 },
  nextBtnGrad: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  docsHint: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  docIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  docThumb: { width: 44, height: 44, borderRadius: 10 },
  docLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff', textAlign: 'right' },
  docSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.4)', marginTop: 2, textAlign: 'right' },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  doneIcon: { marginBottom: 8 },
  doneGrad: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  doneSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  doneBtn: { width: '100%' },
  doneBtnGrad: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
