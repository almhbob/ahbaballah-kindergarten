import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Switch, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, Banner, BannerType } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const BANNER_TYPES: { id: BannerType; label: string; emoji: string; color: string }[] = [
  { id: 'offer',  label: 'عرض',   emoji: '🎁', color: Colors.success },
  { id: 'alert',  label: 'تنبيه', emoji: '⚠️', color: Colors.danger },
  { id: 'event',  label: 'فعالية', emoji: '🎉', color: '#3B82F6' },
  { id: 'ad',     label: 'إعلان', emoji: '📢', color: Colors.accent },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function BannerFormModal({ visible, editing, onClose, onSave }: {
  visible: boolean;
  editing: Banner | null;
  onClose: () => void;
  onSave: (data: Omit<Banner, 'id'>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState<BannerType>('ad');
  const [link, setLink] = useState('');
  const [active, setActive] = useState(true);

  React.useEffect(() => {
    if (editing) {
      setTitle(editing.title); setSubtitle(editing.subtitle ?? '');
      setType(editing.type); setLink(editing.link ?? ''); setActive(editing.active);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
          <Pressable onPress={handleSave} style={{ backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 }}>
            <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>حفظ</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text }}>{editing ? 'تعديل إعلان' : 'إعلان جديد'}</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: Colors.danger, fontFamily: 'Inter_500Medium', fontSize: 14 }}>إلغاء</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={fSty.label}>نوع الإعلان</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {BANNER_TYPES.map(bt => (
              <Pressable key={bt.id} style={[fSty.typeChip, type === bt.id && { backgroundColor: bt.color, borderColor: bt.color }]} onPress={() => setType(bt.id)}>
                <Text>{bt.emoji}</Text>
                <Text style={[fSty.typeText, type === bt.id && { color: '#fff' }]}>{bt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={fSty.label}>عنوان الإعلان *</Text>
          <TextInput style={fSty.input} value={title} onChangeText={setTitle} placeholder="مثال: عرض خاص للتسجيل المبكر" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fSty.label}>الوصف (اختياري)</Text>
          <TextInput style={fSty.input} value={subtitle} onChangeText={setSubtitle} placeholder="نص توضيحي إضافي..." placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fSty.label}>رابط (اختياري)</Text>
          <TextInput style={fSty.input} value={link} onChangeText={setLink} placeholder="https://..." placeholderTextColor={Colors.textLight} keyboardType="url" autoCapitalize="none" textAlign="left" />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: Colors.success }} />
            <Text style={fSty.label}>تفعيل الإعلان</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DeveloperScreen() {
  const insets = useSafeAreaInsets();
  const { students, employees, news, meetings, banners, addBanner, updateBanner, removeBanner, resetAllData } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const stats = [
    { label: 'الطلاب', value: students.length, icon: 'account-school', color: '#3B82F6' },
    { label: 'الموظفون', value: employees.length, icon: 'badge-account', color: '#8B5CF6' },
    { label: 'الأخبار', value: news.length, icon: 'newspaper-variant', color: Colors.accent },
    { label: 'الاجتماعات', value: meetings.length, icon: 'calendar-clock', color: Colors.success },
    { label: 'الإعلانات', value: banners.length, icon: 'bullhorn', color: Colors.danger },
    { label: 'الإعلانات الفعالة', value: banners.filter(b => b.active).length, icon: 'bullhorn-outline', color: '#0EA5E9' },
  ];

  const openAdd = () => { setEditingBanner(null); setShowBannerForm(true); };
  const openEdit = (b: Banner) => { setEditingBanner(b); setShowBannerForm(true); };

  const handleSaveBanner = (data: Omit<Banner, 'id'>) => {
    if (editingBanner) {
      updateBanner(editingBanner.id, data);
    } else {
      addBanner({ id: genId(), ...data });
    }
    setShowBannerForm(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('حذف الإعلان', 'هل تريد حذف هذا الإعلان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => removeBanner(id) },
    ]);
  };

  const handleResetData = () => {
    Alert.alert(
      'إعادة ضبط البيانات',
      'هذا الإجراء سيحذف جميع البيانات المخزنة محلياً ولا يمكن التراجع عنه. هل تريد المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة الضبط',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('تم', 'تمت إعادة ضبط جميع البيانات');
          }
        },
      ]
    );
  };

  return (
    <View style={sty.container}>
      <LinearGradient colors={['#030612', '#050c38', '#0d1463']} style={[sty.header, { paddingTop: topPadding + 12 }]}>
        <View style={sty.headerRow}>
          <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={sty.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={sty.headerTitle}>لوحة المطوّر</Text>
            <Text style={sty.headerSub}>إدارة البيانات والإعلانات</Text>
          </View>
          <MaterialCommunityIcons name="code-braces" size={26} color={Colors.accent} style={{ marginRight: 4 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={sty.sectionTitle}>إحصاءات البيانات</Text>
        <View style={sty.statsGrid}>
          {stats.map(s => (
            <View key={s.label} style={[sty.statCard, { borderTopColor: s.color }]}>
              <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
              <Text style={[sty.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={sty.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
          <Pressable
            style={sty.addBannerBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openAdd(); }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={sty.addBannerBtnText}>إضافة إعلان</Text>
          </Pressable>
          <Text style={sty.sectionTitle}>الإعلانات والبنرات</Text>
        </View>

        {banners.length === 0 ? (
          <View style={sty.emptyBox}>
            <MaterialCommunityIcons name="bullhorn-outline" size={40} color={Colors.textLight} />
            <Text style={sty.emptyText}>لا توجد إعلانات بعد</Text>
          </View>
        ) : (
          banners.map(banner => {
            const cfg = BANNER_TYPES.find(t => t.id === banner.type) ?? BANNER_TYPES[3];
            return (
              <View key={banner.id} style={[sty.bannerRow, !banner.active && { opacity: 0.5 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => handleDelete(banner.id)} style={sty.iconBtn}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </Pressable>
                  <Pressable onPress={() => openEdit(banner)} style={sty.iconBtn}>
                    <Ionicons name="create-outline" size={16} color={Colors.primary} />
                  </Pressable>
                  <Switch
                    value={banner.active}
                    onValueChange={v => updateBanner(banner.id, { active: v })}
                    trackColor={{ true: Colors.success }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={sty.bannerTitle}>{banner.title}</Text>
                    <Text>{cfg.emoji}</Text>
                  </View>
                  {banner.subtitle ? <Text style={sty.bannerSub}>{banner.subtitle}</Text> : null}
                  <View style={[sty.typePill, { backgroundColor: cfg.color + '15' }]}>
                    <Text style={[sty.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Text style={sty.sectionTitle}>معلومات التطبيق</Text>
        <View style={sty.infoCard}>
          {[
            { label: 'اسم التطبيق', val: 'روضة أحباب الله' },
            { label: 'الإصدار', val: '2.0.0' },
            { label: 'المنصة', val: Platform.OS === 'web' ? 'الويب' : Platform.OS === 'ios' ? 'iOS' : 'Android' },
            { label: 'المطوّر', val: 'م / عاصم عبدالرحمن' },
            { label: 'SDK', val: 'Expo SDK 54' },
            { label: 'قاعدة البيانات', val: 'PostgreSQL + AsyncStorage' },
          ].map(r => (
            <View key={r.label} style={sty.infoRow}>
              <Text style={sty.infoVal}>{r.val}</Text>
              <Text style={sty.infoKey}>{r.label}</Text>
            </View>
          ))}
        </View>

        <Text style={sty.sectionTitle}>إجراءات خطرة</Text>
        <Pressable
          style={sty.dangerBtn}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); handleResetData(); }}
        >
          <Ionicons name="trash" size={18} color={Colors.danger} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={sty.dangerBtnTitle}>إعادة ضبط جميع البيانات</Text>
            <Text style={sty.dangerBtnSub}>حذف بيانات AsyncStorage المحلية</Text>
          </View>
        </Pressable>
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

const fSty = StyleSheet.create({
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.borderLight, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  typeText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
});

const sty = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 6, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '30.5%', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  addBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  addBannerBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bannerTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  bannerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  typePillText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  iconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoKey: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  infoVal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.danger + '10', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.danger + '30' },
  dangerBtnTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.danger },
  dangerBtnSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  emptyBox: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.textLight, fontFamily: 'Inter_400Regular' },
});
