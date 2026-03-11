import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert,
  Switch, TextInput, Modal, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { useAppData, Banner, BannerType, AppSettings, DEFAULT_APP_SETTINGS } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

const BANNER_TYPES: { id: BannerType; label: string; emoji: string; color: string }[] = [
  { id: 'offer', label: 'عرض',   emoji: '🎁', color: Colors.success },
  { id: 'alert', label: 'تنبيه', emoji: '⚠️', color: Colors.danger },
  { id: 'event', label: 'فعالية', emoji: '🎉', color: '#3B82F6' },
  { id: 'ad',    label: 'إعلان', emoji: '📢', color: Colors.accent },
];

function BannerFormModal({ visible, editing, onClose, onSave }: {
  visible: boolean; editing: Banner | null;
  onClose: () => void;
  onSave: (data: Omit<Banner, 'id' | 'date'>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle]       = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType]         = useState<BannerType>('ad');
  const [link, setLink]         = useState('');
  const [active, setActive]     = useState(true);

  React.useEffect(() => {
    if (editing) {
      setTitle(editing.title); setSubtitle(editing.subtitle ?? '');
      setType(editing.type);   setLink(editing.link ?? ''); setActive(editing.active);
    } else {
      setTitle(''); setSubtitle(''); setType('ad'); setLink(''); setActive(true);
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('تنبيه', 'أدخل عنوان الإعلان'); return; }
    onSave({ title: title.trim(), subtitle: subtitle.trim() || undefined, type, link: link.trim() || undefined, active });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top + 16 }}>
        <View style={m.modalHead}>
          <Pressable onPress={handleSave} style={m.saveBtn}>
            <Text style={m.saveBtnTxt}>حفظ</Text>
          </Pressable>
          <Text style={m.modalTitle}>{editing ? 'تعديل إعلان' : 'إعلان جديد'}</Text>
          <Pressable onPress={onClose}><Text style={m.cancelTxt}>إلغاء</Text></Pressable>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={m.label}>نوع الإعلان</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {BANNER_TYPES.map(bt => (
              <Pressable key={bt.id}
                style={[m.typeChip, type === bt.id && { backgroundColor: bt.color, borderColor: bt.color }]}
                onPress={() => setType(bt.id)}>
                <Text>{bt.emoji}</Text>
                <Text style={[m.typeText, type === bt.id && { color: '#fff' }]}>{bt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={m.label}>عنوان الإعلان *</Text>
          <TextInput style={m.input} value={title} onChangeText={setTitle}
            placeholder="مثال: عرض خاص للتسجيل المبكر" placeholderTextColor={Colors.textLight} textAlign="right" />
          <Text style={m.label}>الوصف (اختياري)</Text>
          <TextInput style={m.input} value={subtitle} onChangeText={setSubtitle}
            placeholder="نص توضيحي إضافي..." placeholderTextColor={Colors.textLight} textAlign="right" />
          <Text style={m.label}>رابط (اختياري)</Text>
          <TextInput style={m.input} value={link} onChangeText={setLink}
            placeholder="https://..." placeholderTextColor={Colors.textLight} keyboardType="url" autoCapitalize="none" textAlign="left" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: Colors.success }} />
            <Text style={m.label}>تفعيل الإعلان</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const pg = StyleSheet.create({
  root: { flex: 1 },
  grad: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(201,149,42,0.12)', borderWidth: 2, borderColor: 'rgba(201,149,42,0.40)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 22,
    shadowColor: '#c9952a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.50, shadowRadius: 18, elevation: 10,
  },
  title:    { fontSize: 22, fontFamily: 'Inter_700Bold',    color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', marginBottom: 32, textAlign: 'center', lineHeight: 20 },
  inputWrap: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(201,149,42,0.35)', marginBottom: 14, paddingHorizontal: 16,
  },
  inputWrapErr: { borderColor: Colors.danger + '80' },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_500Medium', color: '#FFFFFF', textAlign: 'center', letterSpacing: 4 },
  eyeBtn:    { padding: 6 },
  unlockBtn: {
    width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 14,
  },
  unlockGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  unlockTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  errTxt:    { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.danger, marginBottom: 16, textAlign: 'center' },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  backTxt:   { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.35)' },
  dotsRow:   { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(201,149,42,0.30)' },
  dotFilled: { backgroundColor: '#c9952a' },
});

function PasswordGate({ correctPassword, onUnlock }: { correctPassword: string; onUnlock: () => void }) {
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === 'web' ? 67 : insets.top;
  const [pass,    setPass]    = useState('');
  const [show,    setShow]    = useState(false);
  const [error,   setError]   = useState(false);
  const [shaking, setShaking] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    setShaking(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60,  useNativeDriver: true }),
    ]).start(() => setShaking(false));
  };

  const handleUnlock = () => {
    if (pass === correctPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(true);
      setPass('');
      shake();
      setTimeout(() => setError(false), 2500);
    }
  };

  const dots = Array.from({ length: Math.min(pass.length, correctPassword.length) });

  return (
    <View style={pg.root}>
      <LinearGradient
        colors={['#020817', '#040f30', '#0d1a6e', '#040f30', '#020817']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[pg.grad, { paddingTop: topPad + 20 }]}
      >
        <View style={pg.iconWrap}>
          <MaterialCommunityIcons name="shield-lock" size={38} color="#c9952a" />
        </View>

        <Text style={pg.title}>لوحة المطوّر</Text>
        <Text style={pg.subtitle}>هذه المنطقة مقيّدة{'\n'}أدخل كلمة مرور المطوّر للمتابعة</Text>

        <View style={pg.dotsRow}>
          {Array.from({ length: correctPassword.length }).map((_, i) => (
            <View key={i} style={[pg.dot, i < pass.length && pg.dotFilled]} />
          ))}
        </View>

        <Animated.View style={{ width: '100%', transform: [{ translateX: shakeAnim }] }}>
          <View style={[pg.inputWrap, error && pg.inputWrapErr]}>
            <TextInput
              style={pg.inputField}
              value={pass}
              onChangeText={v => { setError(false); setPass(v); }}
              secureTextEntry={!show}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.20)"
              autoFocus
              onSubmitEditing={handleUnlock}
              returnKeyType="go"
            />
            <Pressable onPress={() => setShow(s => !s)} style={pg.eyeBtn}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.40)" />
            </Pressable>
          </View>
        </Animated.View>

        {error && <Text style={pg.errTxt}>كلمة مرور خاطئة — حاول مجدداً</Text>}

        <Pressable style={pg.unlockBtn} onPress={handleUnlock}>
          <LinearGradient colors={['#c9952a', '#a87820', '#c9952a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pg.unlockGrad}>
            <MaterialCommunityIcons name="lock-open" size={18} color="#fff" />
            <Text style={pg.unlockTxt}>فتح اللوحة</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={pg.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.35)" />
          <Text style={pg.backTxt}>رجوع</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

type SectionKey = 'stats' | 'school' | 'features' | 'security' | 'banners' | 'dev' | 'data' | 'sysinfo' | 'danger';

const SECTIONS: { key: SectionKey; icon: string; iconLib: 'ion' | 'mci'; label: string; color: string }[] = [
  { key: 'stats',    icon: 'bar-chart',          iconLib: 'ion', label: 'إحصاءات التطبيق',   color: '#3B82F6' },
  { key: 'school',   icon: 'school',              iconLib: 'mci', label: 'إعدادات المدرسة',   color: '#10B981' },
  { key: 'features', icon: 'toggle-switch',       iconLib: 'mci', label: 'مفاتيح الميزات',    color: '#8B5CF6' },
  { key: 'security', icon: 'shield-lock',         iconLib: 'mci', label: 'الأمان وكلمات المرور', color: '#F59E0B' },
  { key: 'banners',  icon: 'bullhorn',            iconLib: 'mci', label: 'الإعلانات والبنرات', color: Colors.accent },
  { key: 'dev',      icon: 'code-braces',         iconLib: 'mci', label: 'معلومات المطوّر',   color: '#14B8A6' },
  { key: 'data',     icon: 'database',            iconLib: 'mci', label: 'إدارة البيانات',    color: '#6366F1' },
  { key: 'sysinfo',  icon: 'information-outline', iconLib: 'mci', label: 'معلومات النظام',    color: '#64748B' },
  { key: 'danger',   icon: 'alert-circle',        iconLib: 'mci', label: 'منطقة الخطر',       color: Colors.danger },
];

function SectionHeader({ sectionKey, open, onToggle }: { sectionKey: SectionKey; open: boolean; onToggle: () => void }) {
  const cfg = SECTIONS.find(s => s.key === sectionKey)!;
  return (
    <Pressable style={[sty.secHead, open && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textLight} />
      <View style={{ flex: 1 }} />
      <Text style={sty.secHeadTxt}>{cfg.label}</Text>
      <View style={[sty.secIconWrap, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}>
        {cfg.iconLib === 'mci'
          ? <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
          : <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />}
      </View>
    </Pressable>
  );
}

export default function DeveloperScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const {
    students, employees, news, meetings, banners, registrationRequests,
    addBanner, updateBanner, removeBanner, resetAllData,
    schoolInfo, setSchoolInfo,
    appSettings, updateAppSettings,
  } = useAppData();

  const [unlocked,       setUnlocked]       = useState(false);
  const [open,           setOpen]           = useState<Record<SectionKey, boolean>>({
    stats: true, school: false, features: false, security: false,
    banners: false, dev: false, data: false, sysinfo: false, danger: false,
  });
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner,  setEditingBanner]  = useState<Banner | null>(null);
  const [schoolDraft,    setSchoolDraft]    = useState({ ...schoolInfo });
  const [devDraft,       setDevDraft]       = useState({
    developerName:  appSettings.developerName,
    developerPhone: appSettings.developerPhone,
    developerEmail: appSettings.developerEmail,
    appVersion:     appSettings.appVersion,
    academicYear:   appSettings.academicYear,
  });
  const [secDraft, setSecDraft] = useState({
    adminPassword:          appSettings.adminPassword,
    developerPassword:      appSettings.developerPassword,
    defaultTeacherPassword: appSettings.defaultTeacherPassword,
    defaultParentPassword:  appSettings.defaultParentPassword,
  });

  const toggle = (key: SectionKey) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  if (!unlocked) {
    return <PasswordGate correctPassword={appSettings.developerPassword} onUnlock={() => setUnlocked(true)} />;
  }

  const handleSaveBanner = (data: Omit<Banner, 'id' | 'date'>) => {
    if (editingBanner) {
      updateBanner(editingBanner.id, data);
    } else {
      addBanner({ id: genId(), date: new Date().toISOString().split('T')[0], ...data });
    }
    setShowBannerForm(false);
  };

  const confirmDelete = (title: string, onConfirm: () => void) =>
    Alert.alert('تأكيد الحذف', `${title}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: onConfirm },
    ]);

  const clearCategory = async (key: string, label: string) => {
    Alert.alert(`حذف ${label}`, `سيتم حذف جميع ${label} المحلية. المتابعة؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem(key);
          Alert.alert('تم', `تم حذف ${label} بنجاح`);
        }
      },
    ]);
  };

  const stats = [
    { label: 'الطلاب',        value: students.length,                              icon: 'account-school',     color: '#3B82F6' },
    { label: 'الموظفون',      value: employees.length,                             icon: 'badge-account',      color: '#8B5CF6' },
    { label: 'الأخبار',       value: news.length,                                  icon: 'newspaper-variant',  color: Colors.accent },
    { label: 'الاجتماعات',    value: meetings.length,                              icon: 'calendar-clock',     color: Colors.success },
    { label: 'الإعلانات',     value: banners.length,                               icon: 'bullhorn',           color: '#F97316' },
    { label: 'الطلبات',       value: registrationRequests.length,                  icon: 'clipboard-list',     color: '#EC4899' },
    { label: 'الإعلانات الفعالة', value: banners.filter(b => b.active).length,    icon: 'bullhorn-outline',   color: '#0EA5E9' },
    { label: 'طلبات معلّقة',  value: registrationRequests.filter(r => r.status === 'pending').length, icon: 'clock-outline', color: '#F59E0B' },
  ];

  const featureToggles: { key: keyof AppSettings; label: string; sub: string; icon: string; color: string }[] = [
    { key: 'gpsAttendanceEnabled',    label: 'قيد الحضور بـ GPS',    sub: 'يُلزم المعلم بالتحقق من موقعه',       icon: 'map-marker-radius', color: '#10B981' },
    { key: 'biometricLoginEnabled',   label: 'تسجيل بصمة الإصبع',   sub: 'دخول سريع بالبصمة أو الوجه',          icon: 'fingerprint',       color: '#6366F1' },
    { key: 'guestAccessEnabled',      label: 'الوصول كزائر',        sub: 'تصفح التطبيق دون حساب',                icon: 'account-eye',       color: '#0EA5E9' },
    { key: 'bannersEnabled',          label: 'عرض الإعلانات',        sub: 'بنرات وعروض على الصفحة الرئيسية',     icon: 'billboard',         color: '#F59E0B' },
    { key: 'onlineRegistrationEnabled', label: 'التسجيل الإلكتروني', sub: 'تسجيل الطلاب عبر التطبيق',            icon: 'form-select',       color: '#EC4899' },
    { key: 'bannerAutoplay',          label: 'تشغيل تلقائي للبنرات', sub: 'تدوير البنرات تلقائياً',              icon: 'play-circle',       color: '#8B5CF6' },
    { key: 'maintenanceMode',         label: 'وضع الصيانة',          sub: 'يُقيّد الوصول للمستخدمين',            icon: 'tools',             color: Colors.danger },
  ];

  const sysInfo = [
    { label: 'المنصة',       value: Platform.OS === 'web' ? 'الويب 🌐' : Platform.OS === 'ios' ? 'iOS 🍎' : 'Android 🤖' },
    { label: 'SDK',          value: 'Expo SDK 54' },
    { label: 'قاعدة البيانات', value: 'PostgreSQL + AsyncStorage' },
    { label: 'إصدار التطبيق', value: appSettings.appVersion },
    { label: 'العام الدراسي', value: appSettings.academicYear },
    { label: 'اللغة',        value: 'TypeScript + React Native' },
  ];

  return (
    <View style={sty.root}>
      <LinearGradient
        colors={['#020817', '#040f30', '#0d1a6e']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[sty.header, { paddingTop: topPad + 10 }]}
      >
        <View style={sty.headerRow}>
          <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={sty.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={sty.headerTitle}>لوحة المطوّر</Text>
            <Text style={sty.headerSub}>إعدادات شاملة للتطبيق</Text>
          </View>
          <View style={sty.devBadge}>
            <MaterialCommunityIcons name="code-braces" size={20} color="#c9952a" />
          </View>
        </View>

        <View style={sty.headerChips}>
          {[`v${appSettings.appVersion}`, appSettings.academicYear, Platform.OS.toUpperCase()].map(c => (
            <View key={c} style={sty.headerChip}>
              <Text style={sty.headerChipTxt}>{c}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══ STATS ══ */}
        <SectionHeader sectionKey="stats" open={open.stats} onToggle={() => toggle('stats')} />
        {open.stats && (
          <View style={sty.secBody}>
            <View style={sty.statsGrid}>
              {stats.map(s => (
                <View key={s.label} style={[sty.statCard, { borderTopColor: s.color }]}>
                  <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                  <Text style={[sty.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={sty.statLbl}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ SCHOOL SETTINGS ══ */}
        <SectionHeader sectionKey="school" open={open.school} onToggle={() => toggle('school')} />
        {open.school && (
          <View style={sty.secBody}>
            {[
              { field: 'name',          label: 'اسم المدرسة',        placeholder: 'روضة أحباب الله' },
              { field: 'principalName', label: 'اسم المديرة',        placeholder: 'أ. سلوى داموس' },
              { field: 'phone',         label: 'رقم الهاتف',         placeholder: '+249 900 000 000' },
              { field: 'email',         label: 'البريد الإلكتروني',  placeholder: 'info@school.edu' },
              { field: 'location',      label: 'الموقع الجغرافي',    placeholder: 'صفيتة الغنوماب' },
              { field: 'motto',         label: 'الشعار / الرؤية',    placeholder: 'جودة • التزام • تميز' },
            ].map(({ field, label, placeholder }) => (
              <View key={field} style={sty.fieldWrap}>
                <Text style={sty.fieldLabel}>{label}</Text>
                <TextInput
                  style={sty.input}
                  value={(schoolDraft as any)[field] ?? ''}
                  onChangeText={v => setSchoolDraft(p => ({ ...p, [field]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textLight}
                  textAlign="right"
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[sty.fieldWrap, { flex: 1 }]}>
                <Text style={sty.fieldLabel}>خط العرض (Lat)</Text>
                <TextInput
                  style={sty.input}
                  value={schoolDraft.lat?.toString() ?? ''}
                  onChangeText={v => setSchoolDraft(p => ({ ...p, lat: parseFloat(v) || undefined }))}
                  placeholder="34.8167" placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad" textAlign="left"
                />
              </View>
              <View style={[sty.fieldWrap, { flex: 1 }]}>
                <Text style={sty.fieldLabel}>خط الطول (Lng)</Text>
                <TextInput
                  style={sty.input}
                  value={schoolDraft.lng?.toString() ?? ''}
                  onChangeText={v => setSchoolDraft(p => ({ ...p, lng: parseFloat(v) || undefined }))}
                  placeholder="36.1167" placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad" textAlign="left"
                />
              </View>
            </View>
            <View style={sty.fieldWrap}>
              <Text style={sty.fieldLabel}>نطاق الحضور (متر)</Text>
              <TextInput
                style={sty.input}
                value={schoolDraft.attendanceRadius?.toString() ?? ''}
                onChangeText={v => setSchoolDraft(p => ({ ...p, attendanceRadius: parseInt(v) || undefined }))}
                placeholder="300" placeholderTextColor={Colors.textLight}
                keyboardType="number-pad" textAlign="right"
              />
            </View>
            <Pressable style={sty.saveGreenBtn} onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSchoolInfo(schoolDraft);
              Alert.alert('تم الحفظ', 'تم تحديث معلومات المدرسة بنجاح ✓');
            }}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={sty.saveGreenBtnTxt}>حفظ معلومات المدرسة</Text>
            </Pressable>
          </View>
        )}

        {/* ══ FEATURE TOGGLES ══ */}
        <SectionHeader sectionKey="features" open={open.features} onToggle={() => toggle('features')} />
        {open.features && (
          <View style={sty.secBody}>
            {featureToggles.map(ft => (
              <View key={ft.key} style={sty.toggleRow}>
                <Switch
                  value={!!appSettings[ft.key]}
                  onValueChange={v => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateAppSettings({ [ft.key]: v });
                  }}
                  trackColor={{ true: ft.color, false: Colors.border }}
                  thumbColor="#fff"
                />
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 1 }}>
                  <Text style={sty.toggleLabel}>{ft.label}</Text>
                  <Text style={sty.toggleSub}>{ft.sub}</Text>
                </View>
                <View style={[sty.toggleIcon, { backgroundColor: ft.color + '18' }]}>
                  <MaterialCommunityIcons name={ft.icon as any} size={18} color={ft.color} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══ SECURITY ══ */}
        <SectionHeader sectionKey="security" open={open.security} onToggle={() => toggle('security')} />
        {open.security && (
          <View style={sty.secBody}>
            <View style={sty.securityNote}>
              <MaterialCommunityIcons name="shield-alert" size={16} color="#F59E0B" />
              <Text style={sty.securityNoteTxt}>هذه الكلمات السرية الافتراضية. كل حساب له كلمته الخاصة من إعدادات المستخدمين.</Text>
            </View>
            {[
              { field: 'adminPassword',          label: 'كلمة مرور المدير',           icon: 'shield-crown',       color: Colors.primary },
              { field: 'developerPassword',      label: 'كلمة مرور المطوّر',          icon: 'code-braces',        color: '#c9952a' },
              { field: 'defaultTeacherPassword', label: 'كلمة مرور المعلمين (افتراضي)', icon: 'school',           color: '#10B981' },
              { field: 'defaultParentPassword',  label: 'كلمة مرور الوالدين (افتراضي)', icon: 'account-multiple', color: '#8B5CF6' },
            ].map(({ field, label, icon, color }) => (
              <View key={field} style={sty.fieldWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 6 }}>
                  <Text style={sty.fieldLabel}>{label}</Text>
                  <MaterialCommunityIcons name={icon as any} size={14} color={color} />
                </View>
                <TextInput
                  style={[sty.input, { borderColor: color + '40' }]}
                  value={(secDraft as any)[field]}
                  onChangeText={v => setSecDraft(p => ({ ...p, [field]: v }))}
                  secureTextEntry placeholder="••••••" placeholderTextColor={Colors.textLight}
                  textAlign="right"
                />
              </View>
            ))}
            <Pressable style={[sty.saveGreenBtn, { backgroundColor: '#F59E0B' }]} onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              updateAppSettings(secDraft);
              Alert.alert('تم الحفظ', 'تم تحديث كلمات المرور الافتراضية ✓');
            }}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#fff" />
              <Text style={sty.saveGreenBtnTxt}>حفظ إعدادات الأمان</Text>
            </Pressable>
          </View>
        )}

        {/* ══ BANNERS ══ */}
        <SectionHeader sectionKey="banners" open={open.banners} onToggle={() => toggle('banners')} />
        {open.banners && (
          <View style={sty.secBody}>
            <Pressable style={sty.addBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingBanner(null); setShowBannerForm(true); }}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={sty.addBtnTxt}>إضافة إعلان جديد</Text>
            </Pressable>

            {banners.length === 0 ? (
              <View style={sty.emptyBox}>
                <MaterialCommunityIcons name="bullhorn-outline" size={36} color={Colors.textLight} />
                <Text style={sty.emptyTxt}>لا توجد إعلانات بعد</Text>
              </View>
            ) : banners.map(banner => {
              const cfg = BANNER_TYPES.find(t => t.id === banner.type) ?? BANNER_TYPES[3];
              return (
                <View key={banner.id} style={[sty.bannerRow, { borderRightColor: cfg.color }, !banner.active && { opacity: 0.5 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pressable onPress={() => confirmDelete('حذف الإعلان', () => removeBanner(banner.id))} style={sty.iconBtn}>
                      <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                    </Pressable>
                    <Pressable onPress={() => { setEditingBanner(banner); setShowBannerForm(true); }} style={sty.iconBtn}>
                      <Ionicons name="create-outline" size={15} color={Colors.primary} />
                    </Pressable>
                    <Switch value={banner.active} onValueChange={v => updateBanner(banner.id, { active: v })}
                      trackColor={{ true: Colors.success }} style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', marginHorizontal: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={sty.bannerTitle}>{banner.title}</Text>
                      <Text>{cfg.emoji}</Text>
                    </View>
                    {banner.subtitle ? <Text style={sty.bannerSub}>{banner.subtitle}</Text> : null}
                    <View style={[sty.typePill, { backgroundColor: cfg.color + '15' }]}>
                      <Text style={[sty.typePillTxt, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ══ DEVELOPER INFO ══ */}
        <SectionHeader sectionKey="dev" open={open.dev} onToggle={() => toggle('dev')} />
        {open.dev && (
          <View style={sty.secBody}>
            {[
              { field: 'developerName',  label: 'اسم المطوّر',           placeholder: 'Ali Alnassar' },
              { field: 'developerPhone', label: 'هاتف المطوّر',          placeholder: '+966 5XX XXX XXXX' },
              { field: 'developerEmail', label: 'بريد المطوّر',          placeholder: 'dev@example.com' },
              { field: 'appVersion',     label: 'إصدار التطبيق',        placeholder: '2.0.0' },
              { field: 'academicYear',   label: 'العام الدراسي الحالي',  placeholder: '2025-2026' },
            ].map(({ field, label, placeholder }) => (
              <View key={field} style={sty.fieldWrap}>
                <Text style={sty.fieldLabel}>{label}</Text>
                <TextInput
                  style={sty.input}
                  value={(devDraft as any)[field]}
                  onChangeText={v => setDevDraft(p => ({ ...p, [field]: v }))}
                  placeholder={placeholder} placeholderTextColor={Colors.textLight}
                  textAlign="right" autoCapitalize="none"
                />
              </View>
            ))}
            <Pressable style={[sty.saveGreenBtn, { backgroundColor: '#14B8A6' }]} onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              updateAppSettings(devDraft);
              Alert.alert('تم الحفظ', 'تم تحديث معلومات المطوّر ✓');
            }}>
              <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
              <Text style={sty.saveGreenBtnTxt}>حفظ معلومات المطوّر</Text>
            </Pressable>
          </View>
        )}

        {/* ══ DATA MANAGEMENT ══ */}
        <SectionHeader sectionKey="data" open={open.data} onToggle={() => toggle('data')} />
        {open.data && (
          <View style={sty.secBody}>
            <Text style={sty.secNote}>حذف فئة معينة من البيانات المحلية (لن تُحذف الديموهات التجريبية)</Text>
            {[
              { key: 'app_students',              label: 'بيانات الطلاب',     icon: 'account-school',   color: '#3B82F6' },
              { key: 'app_employees',             label: 'بيانات الموظفين',   icon: 'badge-account',    color: '#8B5CF6' },
              { key: 'app_news',                  label: 'الأخبار والإعلانات',icon: 'newspaper-variant',color: Colors.accent },
              { key: 'app_meetings',              label: 'سجل الاجتماعات',    icon: 'calendar-clock',   color: Colors.success },
              { key: 'app_banners',               label: 'البنرات الإعلانية', icon: 'bullhorn',         color: '#F97316' },
              { key: 'app_registration_requests', label: 'طلبات التسجيل',    icon: 'clipboard-list',   color: '#EC4899' },
              { key: 'login_history',             label: 'سجل تسجيل الدخول', icon: 'history',          color: '#64748B' },
              { key: 'app_certificates',          label: 'الشهادات',          icon: 'certificate',      color: '#F59E0B' },
              { key: 'app_transport_routes',      label: 'مسارات المواصلات',  icon: 'bus',              color: '#0EA5E9' },
            ].map(({ key, label, icon, color }) => (
              <Pressable key={key} style={sty.dataRow} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                clearCategory(key, label);
              }}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 1 }}>
                  <Text style={sty.dataLabel}>{label}</Text>
                  <Text style={sty.dataKey}>{key}</Text>
                </View>
                <View style={[sty.dataIcon, { backgroundColor: color + '15' }]}>
                  <MaterialCommunityIcons name={icon as any} size={16} color={color} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* ══ SYSTEM INFO ══ */}
        <SectionHeader sectionKey="sysinfo" open={open.sysinfo} onToggle={() => toggle('sysinfo')} />
        {open.sysinfo && (
          <View style={sty.secBody}>
            {sysInfo.map(r => (
              <View key={r.label} style={sty.infoRow}>
                <Text style={sty.infoVal}>{r.value}</Text>
                <Text style={sty.infoKey}>{r.label}</Text>
              </View>
            ))}
            <View style={[sty.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={sty.infoVal}>{students.length + employees.length + banners.length} سجل</Text>
              <Text style={sty.infoKey}>إجمالي السجلات</Text>
            </View>
          </View>
        )}

        {/* ══ DANGER ZONE ══ */}
        <SectionHeader sectionKey="danger" open={open.danger} onToggle={() => toggle('danger')} />
        {open.danger && (
          <View style={[sty.secBody, { borderWidth: 1, borderColor: Colors.danger + '40' }]}>
            <View style={sty.dangerNote}>
              <MaterialCommunityIcons name="alert" size={16} color={Colors.danger} />
              <Text style={sty.dangerNoteTxt}>هذه الإجراءات لا يمكن التراجع عنها. تعامل بحذر شديد.</Text>
            </View>

            <Pressable style={sty.dangerBtn} onPress={() => {
              Alert.alert('إعادة ضبط جميع البيانات', 'سيتم حذف جميع البيانات المحلية وإعادة تعيينها إلى الديمو. هل تريد المتابعة؟', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'إعادة الضبط', style: 'destructive', onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  resetAllData();
                  Alert.alert('تم', 'تمت إعادة ضبط جميع البيانات إلى الديمو');
                }},
              ]);
            }}>
              <View style={sty.dangerBtnContent}>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={sty.dangerBtnTitle}>إعادة ضبط جميع البيانات</Text>
                  <Text style={sty.dangerBtnSub}>حذف AsyncStorage وإعادة التعيين للديمو</Text>
                </View>
                <View style={sty.dangerIconWrap}>
                  <Ionicons name="refresh" size={20} color={Colors.danger} />
                </View>
              </View>
            </Pressable>

            <Pressable style={[sty.dangerBtn, { marginTop: 8 }]} onPress={() => {
              Alert.alert('إعادة ضبط الإعدادات', 'سيتم إعادة تعيين إعدادات المطوّر للقيم الافتراضية. المتابعة؟', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'إعادة الضبط', style: 'destructive', onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  updateAppSettings(DEFAULT_APP_SETTINGS);
                  setSecDraft({ adminPassword: DEFAULT_APP_SETTINGS.adminPassword, developerPassword: DEFAULT_APP_SETTINGS.developerPassword, defaultTeacherPassword: DEFAULT_APP_SETTINGS.defaultTeacherPassword, defaultParentPassword: DEFAULT_APP_SETTINGS.defaultParentPassword });
                  setDevDraft({ developerName: DEFAULT_APP_SETTINGS.developerName, developerPhone: DEFAULT_APP_SETTINGS.developerPhone, developerEmail: DEFAULT_APP_SETTINGS.developerEmail, appVersion: DEFAULT_APP_SETTINGS.appVersion, academicYear: DEFAULT_APP_SETTINGS.academicYear });
                  Alert.alert('تم', 'تمت إعادة ضبط الإعدادات');
                }},
              ]);
            }}>
              <View style={sty.dangerBtnContent}>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={sty.dangerBtnTitle}>إعادة ضبط إعدادات المطوّر</Text>
                  <Text style={sty.dangerBtnSub}>استعادة القيم الافتراضية لـ AppSettings</Text>
                </View>
                <View style={sty.dangerIconWrap}>
                  <MaterialCommunityIcons name="cog-refresh" size={20} color={Colors.danger} />
                </View>
              </View>
            </Pressable>
          </View>
        )}

      </ScrollView>

      <BannerFormModal
        visible={showBannerForm}
        editing={editingBanner}
        onClose={() => setShowBannerForm(false)}
        onSave={handleSaveBanner}
      />
    </View>
  );
}

const m = StyleSheet.create({
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 },
  saveBtnTxt: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  cancelTxt: { color: Colors.danger, fontFamily: 'Inter_500Medium', fontSize: 14 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.borderLight, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  typeText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
});

const sty = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { padding: 6, marginLeft: 8 },
  headerTitle: { fontSize: 21, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)', marginTop: 2 },
  devBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(201,149,42,0.15)', borderWidth: 1.5, borderColor: 'rgba(201,149,42,0.40)', justifyContent: 'center', alignItems: 'center' },
  headerChips: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  headerChip: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  headerChipTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)' },

  secHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  secHeadTxt: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'right' },
  secIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  secBody: {
    backgroundColor: Colors.surface, borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    padding: 16, marginTop: -2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '22.5%', backgroundColor: Colors.background, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3, borderTopWidth: 3 },
  statVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight },
  saveGreenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 14, padding: 13, marginTop: 6 },
  saveGreenBtnTxt: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  toggleLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  toggleSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FCD34D' },
  securityNoteTxt: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#92400E', flex: 1, textAlign: 'right', lineHeight: 18 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 14, padding: 12, marginBottom: 14 },
  addBtnTxt: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, padding: 12, marginBottom: 8, borderRightWidth: 4 },
  bannerTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  bannerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  typePillTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },

  secNote: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginBottom: 12, lineHeight: 18 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  dataLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  dataKey: { fontSize: 9, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  dataIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoKey: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  infoVal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },

  dangerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.danger + '08', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: Colors.danger + '25' },
  dangerNoteTxt: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.danger, flex: 1, textAlign: 'right', lineHeight: 18 },
  dangerBtn: { backgroundColor: Colors.danger + '08', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.danger + '30' },
  dangerBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dangerBtnTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.danger },
  dangerBtnSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  dangerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.danger + '15', justifyContent: 'center', alignItems: 'center' },

  emptyBox: { alignItems: 'center', padding: 24, gap: 8 },
  emptyTxt: { fontSize: 13, color: Colors.textLight, fontFamily: 'Inter_400Regular' },
});
