import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, Alert, Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, SchoolInfo, HonorWeights } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

function SettingRow({
  icon, label, value, onPress, color = Colors.primary,
}: {
  icon: string; label: string; value?: string; onPress: () => void; color?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      <Ionicons name="chevron-back" size={18} color={Colors.textLight} />
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value !== undefined && (
          <Text style={styles.settingValue} numberOfLines={1}>{value}</Text>
        )}
      </View>
      <View style={[styles.settingIconBox, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { schoolInfo, setSchoolInfo, honorWeights, setHonorWeights, welcomeMessage, setWelcomeMessage, resetAllData, appSettings, updateAppSettings } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showHonorModal, setShowHonorModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [draftInfo, setDraftInfo] = useState<SchoolInfo>(schoolInfo);
  const [draftWeights, setDraftWeights] = useState<HonorWeights>(honorWeights);
  const [draftWelcome, setDraftWelcome] = useState(welcomeMessage);

  const openSchool = () => { setDraftInfo({ ...schoolInfo }); setShowSchoolModal(true); };
  const openHonor  = () => { setDraftWeights({ ...honorWeights }); setShowHonorModal(true); };
  const openWelcome = () => { setDraftWelcome(welcomeMessage); setShowWelcomeModal(true); };

  const saveSchool = () => {
    if (!draftInfo.name.trim() || !draftInfo.principalName.trim()) {
      Alert.alert('تنبيه', 'يرجى ملء اسم الروضة واسم المديرة');
      return;
    }
    setSchoolInfo(draftInfo);
    setShowSchoolModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveHonor = () => {
    const sum = draftWeights.grades + draftWeights.attendance + draftWeights.behavior + draftWeights.homework;
    if (sum !== 100) {
      Alert.alert('تنبيه', `مجموع الأوزان يجب أن يساوي 100٪ (الحالي: ${sum}٪)`);
      return;
    }
    setHonorWeights(draftWeights);
    setShowHonorModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveWelcome = () => {
    if (!draftWelcome.trim()) return;
    setWelcomeMessage(draftWelcome.trim());
    setShowWelcomeModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReset = () => {
    Alert.alert(
      'إعادة ضبط البيانات',
      'سيتم حذف جميع البيانات وإعادتها إلى الافتراضي. هذه العملية لا يمكن التراجع عنها.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة الضبط',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('تم', 'تمت إعادة ضبط جميع البيانات بنجاح');
          },
        },
      ],
    );
  };

  const weightSum = draftWeights.grades + draftWeights.attendance + draftWeights.behavior + draftWeights.homework;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030612', '#050c38', '#0d1463']}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={styles.headerTitle}>الإعدادات</Text>
          <HexFrame size={38} fill="rgba(255,255,255,0.07)" stroke={Colors.accent + '60'} strokeWidth={1.5}>
            <MaterialCommunityIcons name="cog" size={18} color={Colors.accent} />
          </HexFrame>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
      >
        <SectionHeader title="معلومات الروضة" />
        <View style={styles.section}>
          <SettingRow
            icon="school"
            label="اسم الروضة"
            value={schoolInfo.name}
            onPress={openSchool}
            color="#3B82F6"
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="account-tie"
            label="اسم المديرة"
            value={schoolInfo.principalName}
            onPress={openSchool}
            color="#8B5CF6"
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="phone"
            label="رقم الواتساب"
            value={schoolInfo.phone}
            onPress={openSchool}
            color={Colors.success}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="map-marker"
            label="الموقع"
            value={schoolInfo.location}
            onPress={openSchool}
            color={Colors.accent}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="format-quote-open"
            label="شعار الروضة"
            value={schoolInfo.motto}
            onPress={openSchool}
            color="#EC4899"
          />
        </View>

        <SectionHeader title="أوزان لوحة الشرف" />
        <View style={styles.section}>
          <SettingRow
            icon="trophy"
            label="الدرجات"
            value={`${honorWeights.grades}٪`}
            onPress={openHonor}
            color={Colors.accent}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="calendar-check"
            label="الحضور"
            value={`${honorWeights.attendance}٪`}
            onPress={openHonor}
            color="#3B82F6"
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="emoticon-happy"
            label="السلوك"
            value={`${honorWeights.behavior}٪`}
            onPress={openHonor}
            color={Colors.success}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="book-open"
            label="الواجبات"
            value={`${honorWeights.homework}٪`}
            onPress={openHonor}
            color="#8B5CF6"
          />
        </View>

        <SectionHeader title="رسالة الترحيب" />
        <View style={styles.section}>
          <SettingRow
            icon="message-text"
            label="رسالة الترحيب للأولياء"
            value={welcomeMessage.slice(0, 40) + (welcomeMessage.length > 40 ? '...' : '')}
            onPress={openWelcome}
            color="#EC4899"
          />
        </View>

        <SectionHeader title="إعدادات النظام" />
        <View style={styles.section}>
          {[
            { key: 'gpsAttendanceEnabled',      label: 'تحقق GPS لتسجيل الحضور',   icon: 'map-marker-check',    color: Colors.success },
            { key: 'guestAccessEnabled',         label: 'السماح بدخول الزوار',       icon: 'account-eye',         color: '#3B82F6' },
            { key: 'onlineRegistrationEnabled',  label: 'التسجيل الإلكتروني',        icon: 'clipboard-text',      color: '#8B5CF6' },
            { key: 'bannersEnabled',             label: 'عرض الإعلانات',             icon: 'image-multiple',      color: '#EC4899' },
          ].map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <View style={styles.rowDivider} />}
              <View style={styles.settingRow}>
                <Switch
                  value={!!appSettings?.[item.key as keyof typeof appSettings]}
                  onValueChange={val => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateAppSettings({ [item.key]: val });
                  }}
                  trackColor={{ false: Colors.borderLight, true: item.color + '60' }}
                  thumbColor={appSettings?.[item.key as keyof typeof appSettings] ? item.color : '#ccc'}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                <View style={[styles.settingIconBox, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        <SectionHeader title="حسابات الدخول التجريبية" />
        <View style={styles.section}>
          {[
            { role: 'الإدارة',   credLabel: 'مستخدم',  user: 'admin',                   pass: '1234', color: '#3B82F6', icon: 'shield-check' },
            { role: 'معلمة',    credLabel: 'إيميل',   user: 'noura@ahbaballah.edu',     pass: '1234', color: Colors.teacher, icon: 'school' },
            { role: 'ولي أمر',  credLabel: 'هاتف',    user: '+249912345678',            pass: '1234', color: Colors.parent, icon: 'account-heart' },
          ].map((acc, i) => (
            <React.Fragment key={acc.role}>
              {i > 0 && <View style={styles.rowDivider} />}
              <View style={styles.accountRow}>
                <View style={styles.accountBadge}>
                  <Text style={[styles.accountRole, { color: acc.color }]}>{acc.role}</Text>
                  <Text style={styles.accountCreds}>{acc.credLabel}: {acc.user}</Text>
                  <Text style={[styles.accountCreds, { color: Colors.textLight }]}>
                    كلمة المرور: {showPasswords ? acc.pass : '••••'}
                  </Text>
                </View>
                <View style={[styles.settingIconBox, { backgroundColor: acc.color + '18' }]}>
                  <MaterialCommunityIcons name={acc.icon as any} size={20} color={acc.color} />
                </View>
              </View>
            </React.Fragment>
          ))}
          <View style={styles.rowDivider} />
          <Pressable
            style={[styles.settingRow, { justifyContent: 'center' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPasswords(p => !p); }}
          >
            <Ionicons name={showPasswords ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.textLight} />
            <Text style={[styles.settingValue, { marginTop: 0 }]}>
              {showPasswords ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}
            </Text>
          </Pressable>
        </View>

        <SectionHeader title="قانوني" />
        <View style={styles.section}>
          <SettingRow
            icon="shield-check"
            label="سياسة الخصوصية والشروط"
            onPress={() => router.push('/privacy')}
            color="#6366F1"
          />
        </View>

        <SectionHeader title="خطر" />
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.dangerRow, { opacity: pressed ? 0.75 : 1 }]}
            onPress={handleReset}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#FEF2F2' }]}>
              <MaterialCommunityIcons name="delete-alert" size={20} color={Colors.danger} />
            </View>
            <Text style={styles.dangerLabel}>إعادة ضبط جميع البيانات</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* School Info Modal */}
      <Modal visible={showSchoolModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setShowSchoolModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
                <Text style={styles.sheetTitle}>معلومات الروضة</Text>
              </View>

              {([
                { key: 'name',           label: 'اسم الروضة',       multi: false },
                { key: 'principalName',  label: 'اسم المديرة',       multi: false },
                { key: 'phone',          label: 'رقم الواتساب',      multi: false },
                { key: 'email',          label: 'البريد الإلكتروني', multi: false },
                { key: 'location',       label: 'الموقع',            multi: false },
                { key: 'motto',          label: 'شعار الروضة',       multi: true },
              ] as { key: keyof SchoolInfo; label: string; multi: boolean }[]).map(f => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.textInput, f.multi && { height: 80 }]}
                    value={draftInfo[f.key] as string | undefined}
                    onChangeText={v => setDraftInfo({ ...draftInfo, [f.key]: v })}
                    textAlign="right"
                    multiline={f.multi}
                    textAlignVertical={f.multi ? 'top' : 'center'}
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              ))}

              <Pressable style={styles.saveBtn} onPress={saveSchool}>
                <Text style={styles.saveBtnText}>حفظ</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Honor Weights Modal */}
      <Modal visible={showHonorModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowHonorModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.sheetTitle}>أوزان لوحة الشرف</Text>
            </View>

            <Text style={styles.honorHint}>مجموع الأوزان يجب أن يساوي 100٪</Text>

            <View style={[styles.sumBadge, { backgroundColor: weightSum === 100 ? '#ECFDF5' : '#FEF2F2' }]}>
              <Text style={[styles.sumText, { color: weightSum === 100 ? Colors.success : Colors.danger }]}>
                المجموع الحالي: {weightSum}٪
              </Text>
            </View>

            {([
              { key: 'grades',     label: 'الدرجات',   color: Colors.accent },
              { key: 'attendance', label: 'الحضور',    color: '#3B82F6' },
              { key: 'behavior',   label: 'السلوك',    color: Colors.success },
              { key: 'homework',   label: 'الواجبات',  color: '#8B5CF6' },
            ] as { key: keyof HonorWeights; label: string; color: string }[]).map(f => (
              <View key={f.key} style={styles.weightRow}>
                <View style={styles.weightControls}>
                  <Pressable
                    style={styles.weightBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraftWeights(w => ({ ...w, [f.key]: Math.min(100, w[f.key] + 5) }));
                    }}
                  >
                    <Ionicons name="add" size={18} color={Colors.primary} />
                  </Pressable>
                  <View style={[styles.weightValueBox, { borderColor: f.color }]}>
                    <Text style={[styles.weightValue, { color: f.color }]}>{draftWeights[f.key]}٪</Text>
                  </View>
                  <Pressable
                    style={styles.weightBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraftWeights(w => ({ ...w, [f.key]: Math.max(0, w[f.key] - 5) }));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={Colors.primary} />
                  </Pressable>
                </View>
                <Text style={styles.weightLabel}>{f.label}</Text>
              </View>
            ))}

            <Pressable style={[styles.saveBtn, { marginTop: 20 }]} onPress={saveHonor}>
              <Text style={styles.saveBtnText}>حفظ الأوزان</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Welcome Message Modal */}
      <Modal visible={showWelcomeModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowWelcomeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.sheetTitle}>رسالة الترحيب</Text>
            </View>
            <Text style={styles.fieldLabel}>نص الرسالة</Text>
            <TextInput
              style={[styles.textInput, { height: 160, marginHorizontal: 20 }]}
              value={draftWelcome}
              onChangeText={setDraftWelcome}
              multiline
              textAlign="right"
              textAlignVertical="top"
              placeholderTextColor={Colors.textLight}
            />
            <Pressable style={[styles.saveBtn, { marginTop: 16 }]} onPress={saveWelcome}>
              <Text style={styles.saveBtnText}>حفظ</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  backBtn: { padding: 8 },
  sectionHeader: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textLight, textAlign: 'right', marginHorizontal: 20, marginTop: 24, marginBottom: 6, letterSpacing: 0.5 },
  section: { backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  rowDivider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingContent: { flex: 1, alignItems: 'flex-end' },
  settingLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  settingValue: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 1 },
  accountRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  accountBadge: { flex: 1, alignItems: 'flex-end' },
  accountRole: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  accountCreds: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  dangerLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.danger, textAlign: 'right' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  fieldGroup: { marginHorizontal: 20, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
  textInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', borderWidth: 1, borderColor: Colors.borderLight },
  saveBtn: { marginHorizontal: 20, backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  honorHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center', marginBottom: 8 },
  sumBadge: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  sumText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  weightLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, flex: 1, textAlign: 'right', marginRight: 16 },
  weightControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  weightValueBox: { width: 56, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  weightValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
