import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  Modal, TextInput, Alert, ScrollView, Switch, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, Banner, BannerType } from '@/contexts/AppDataContext';

const AD_COLOR = '#B45309';
const AD_LIGHT = '#FEF3C7';

const TYPE_META: Record<BannerType, { label: string; icon: string; color: string; bg: string }> = {
  offer:  { label: 'عرض تجاري',   icon: 'tag',           color: Colors.success,  bg: '#ECFDF5' },
  ad:     { label: 'إعلان عام',    icon: 'bullhorn',      color: Colors.accent,   bg: '#FEF3C7' },
  event:  { label: 'فعالية',       icon: 'calendar-star', color: '#3B82F6',       bg: '#EFF6FF' },
  alert:  { label: 'إشعار مهم',   icon: 'alert-circle',  color: Colors.danger,   bg: '#FEF2F2' },
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function isExpired(endDate?: string) {
  if (!endDate) return false;
  return endDate < today();
}

interface AdFormProps {
  visible: boolean;
  editing: Banner | null;
  onClose: () => void;
  onSave: (data: Omit<Banner, 'id'>) => void;
}

function AdForm({ visible, editing, onClose, onSave }: AdFormProps) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<BannerType>('ad');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [link, setLink] = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [advertiserPhone, setAdvertiserPhone] = useState('');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);

  React.useEffect(() => {
    if (editing) {
      setType(editing.type);
      setTitle(editing.title);
      setSubtitle(editing.subtitle ?? editing.body ?? '');
      setLink(editing.link ?? '');
      setAdvertiserName(editing.advertiserName ?? '');
      setAdvertiserPhone(editing.advertiserPhone ?? '');
      setPrice(editing.price ? String(editing.price) : '');
      setPaid(editing.paid ?? false);
      setEndDate(editing.endDate ?? '');
      setActive(editing.active);
    } else {
      setType('ad'); setTitle(''); setSubtitle(''); setLink('');
      setAdvertiserName(''); setAdvertiserPhone('');
      setPrice(''); setPaid(false); setEndDate(''); setActive(true);
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('تنبيه', 'أدخل عنوان الإعلان'); return; }
    if (!advertiserName.trim()) { Alert.alert('تنبيه', 'أدخل اسم المُعلِن'); return; }
    onSave({
      type, title: title.trim(), subtitle: subtitle.trim() || undefined,
      link: link.trim() || undefined, active, date: editing?.date ?? today(),
      advertiserName: advertiserName.trim(), advertiserPhone: advertiserPhone.trim() || undefined,
      price: price ? Number(price) : undefined, paid,
      endDate: endDate.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={[fSty.sheetHeader, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={handleSave} style={fSty.saveBtn}>
            <Text style={fSty.saveTxt}>حفظ</Text>
          </Pressable>
          <Text style={fSty.sheetTitle}>{editing ? 'تعديل إعلان' : 'إعلان جديد'}</Text>
          <Pressable onPress={onClose}>
            <Text style={fSty.cancelTxt}>إلغاء</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={fSty.body} keyboardShouldPersistTaps="handled">
          <Text style={fSty.section}>نوع الإعلان</Text>
          <View style={fSty.typeRow}>
            {(Object.entries(TYPE_META) as [BannerType, typeof TYPE_META[BannerType]][]).map(([key, m]) => (
              <Pressable
                key={key}
                style={[fSty.typeChip, type === key && { backgroundColor: m.color, borderColor: m.color }]}
                onPress={() => setType(key)}
              >
                <MaterialCommunityIcons name={m.icon as any} size={14} color={type === key ? '#fff' : m.color} />
                <Text style={[fSty.typeText, type === key && { color: '#fff' }]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={fSty.section}>بيانات الإعلان</Text>
          <Text style={fSty.label}>عنوان الإعلان *</Text>
          <TextInput style={fSty.input} value={title} onChangeText={setTitle}
            placeholder="مثال: عرض خاص على المخبوزات الطازجة" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fSty.label}>وصف قصير</Text>
          <TextInput style={fSty.input} value={subtitle} onChangeText={setSubtitle}
            placeholder="تفاصيل إضافية عن الإعلان..." placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fSty.label}>رابط (اختياري)</Text>
          <TextInput style={fSty.input} value={link} onChangeText={setLink}
            placeholder="https://wa.me/..." placeholderTextColor={Colors.textLight}
            keyboardType="url" autoCapitalize="none" textAlign="left" />

          <Text style={fSty.section}>بيانات المُعلِن</Text>
          <Text style={fSty.label}>اسم المُعلِن / المحل *</Text>
          <TextInput style={fSty.input} value={advertiserName} onChangeText={setAdvertiserName}
            placeholder="مثال: مخبز النور" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={fSty.label}>رقم التواصل</Text>
          <TextInput style={fSty.input} value={advertiserPhone} onChangeText={setAdvertiserPhone}
            placeholder="05xxxxxxxx" placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad" textAlign="right" />

          <Text style={fSty.section}>التسعير والمدة</Text>
          <Text style={fSty.label}>السعر (ج.س)</Text>
          <TextInput style={fSty.input} value={price} onChangeText={setPrice}
            placeholder="500" placeholderTextColor={Colors.textLight} keyboardType="numeric" textAlign="right" />

          <Text style={fSty.label}>تاريخ انتهاء الإعلان</Text>
          <TextInput style={fSty.input} value={endDate} onChangeText={setEndDate}
            placeholder="2026-06-30" placeholderTextColor={Colors.textLight} textAlign="right" />

          <View style={fSty.switchRow}>
            <Switch value={paid} onValueChange={setPaid} trackColor={{ true: Colors.success }} thumbColor={paid ? '#fff' : Colors.textLight} />
            <Text style={fSty.label}>تم استلام الدفع</Text>
          </View>

          <View style={fSty.switchRow}>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: Colors.primary }} thumbColor={active ? '#fff' : Colors.textLight} />
            <Text style={fSty.label}>الإعلان مفعّل</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdsScreen() {
  const insets = useSafeAreaInsets();
  const { banners, addBanner, updateBanner, removeBanner } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [editing, setEditing] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'expired' | 'unpaid'>('all');

  const stats = useMemo(() => {
    const active = banners.filter(b => b.active && !isExpired(b.endDate));
    const totalRevenue = banners.reduce((s, b) => s + (b.paid && b.price ? b.price : 0), 0);
    const pending = banners.reduce((s, b) => s + (!b.paid && b.price ? b.price : 0), 0);
    const expired = banners.filter(b => isExpired(b.endDate));
    return { active: active.length, total: banners.length, totalRevenue, pending, expired: expired.length };
  }, [banners]);

  const filtered = useMemo(() => {
    switch (filterTab) {
      case 'active':  return banners.filter(b => b.active && !isExpired(b.endDate));
      case 'expired': return banners.filter(b => isExpired(b.endDate));
      case 'unpaid':  return banners.filter(b => !b.paid && b.price);
      default:        return banners;
    }
  }, [banners, filterTab]);

  const handleSave = (data: Omit<Banner, 'id'>) => {
    if (editing) updateBanner(editing.id, data);
    else addBanner({ id: genId(), ...data });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForm(false);
  };

  const handleDelete = (b: Banner) => {
    Alert.alert('حذف الإعلان', `هل تريد حذف إعلان "${b.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removeBanner(b.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  const handleTogglePaid = (b: Banner) => {
    updateBanner(b.id, { paid: !b.paid });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleActive = (b: Banner) => {
    updateBanner(b.id, { active: !b.active });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const TABS = [
    { key: 'all',     label: 'الكل',      count: banners.length },
    { key: 'active',  label: 'مفعّل',     count: stats.active },
    { key: 'unpaid',  label: 'معلّق دفع', count: stats.pending > 0 ? banners.filter(b => !b.paid && b.price).length : 0 },
    { key: 'expired', label: 'منتهي',     count: stats.expired },
  ] as const;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#78350F', '#92400E', '#B45309']} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.headerTitle}>اللوحة الإعلانية</Text>
            <Text style={s.headerSub}>إعلانات استثمارية — تحقيق دخل للروضة</Text>
          </View>
          <MaterialCommunityIcons name="bullhorn" size={26} color="#FCD34D" style={{ marginRight: 4 }} />
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>{stats.active}</Text>
            <Text style={s.statLbl}>إعلان نشط</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: '#6EE7B7' }]}>{stats.totalRevenue.toLocaleString('ar-SA')}</Text>
            <Text style={s.statLbl}>محصّل (ج.س)</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: '#FCA5A5' }]}>{stats.pending.toLocaleString('ar-SA')}</Text>
            <Text style={s.statLbl}>معلّق (ج.س)</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>{stats.total}</Text>
            <Text style={s.statLbl}>إجمالي</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[s.tabBtn, filterTab === t.key && s.tabBtnActive]}
              onPress={() => { setFilterTab(t.key); Haptics.selectionAsync(); }}
            >
              <Text style={[s.tabTxt, filterTab === t.key && s.tabTxtActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[s.tabBadge, filterTab === t.key && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, filterTab === t.key && { color: AD_COLOR }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={b => b.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Pressable
            style={s.addBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(null); setShowForm(true); }}
          >
            <LinearGradient colors={['#B45309', '#92400E']} style={s.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="add-circle" size={20} color="#FCD34D" />
              <Text style={s.addBtnTxt}>إضافة إعلان جديد</Text>
            </LinearGradient>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="bullhorn-outline" size={56} color={Colors.textLight} />
            <Text style={s.emptyTitle}>لا توجد إعلانات</Text>
            <Text style={s.emptySub}>أضف أول إعلان استثماري للروضة</Text>
          </View>
        }
        renderItem={({ item: ad }) => {
          const meta = TYPE_META[ad.type];
          const expired = isExpired(ad.endDate);
          return (
            <View style={[s.card, { borderRightColor: ad.paid ? meta.color : Colors.danger, opacity: expired ? 0.75 : 1 }]}>
              <View style={s.cardTop}>
                <View style={s.cardBadges}>
                  {expired ? (
                    <View style={[s.badge, { backgroundColor: '#FEF2F2', borderColor: Colors.danger }]}>
                      <Text style={[s.badgeTxt, { color: Colors.danger }]}>منتهي</Text>
                    </View>
                  ) : ad.active ? (
                    <View style={[s.badge, { backgroundColor: '#ECFDF5', borderColor: Colors.success }]}>
                      <Text style={[s.badgeTxt, { color: Colors.success }]}>نشط</Text>
                    </View>
                  ) : (
                    <View style={[s.badge, { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border }]}>
                      <Text style={[s.badgeTxt, { color: Colors.textSecondary }]}>معطّل</Text>
                    </View>
                  )}
                  <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
                    <Text style={[s.badgeTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <Pressable onPress={() => handleDelete(ad)} style={s.iconBtn}>
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  </Pressable>
                  <Pressable onPress={() => { setEditing(ad); setShowForm(true); }} style={s.iconBtn}>
                    <Ionicons name="create-outline" size={15} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>

              <Text style={s.cardTitle}>{ad.title}</Text>
              {ad.subtitle ? <Text style={s.cardSub}>{ad.subtitle}</Text> : null}

              <View style={s.advertiserRow}>
                <MaterialCommunityIcons name="store" size={14} color={AD_COLOR} />
                <Text style={s.advertiserName}>{ad.advertiserName ?? '—'}</Text>
                {ad.advertiserPhone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${ad.advertiserPhone}`)}
                    style={s.phoneBtn}
                  >
                    <Ionicons name="call" size={12} color="#fff" />
                    <Text style={s.phoneTxt}>{ad.advertiserPhone}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={s.cardFooter}>
                <Pressable
                  style={[s.paidBtn, ad.paid && s.paidBtnDone]}
                  onPress={() => handleTogglePaid(ad)}
                >
                  <MaterialCommunityIcons
                    name={ad.paid ? 'cash-check' : 'cash-clock'}
                    size={14}
                    color={ad.paid ? Colors.success : Colors.warning}
                  />
                  <Text style={[s.paidTxt, { color: ad.paid ? Colors.success : Colors.warning }]}>
                    {ad.paid ? 'مدفوع' : 'معلّق'}
                  </Text>
                  {ad.price ? <Text style={[s.priceTxt, { color: ad.paid ? Colors.success : Colors.warning }]}>{ad.price.toLocaleString('ar-SA')} ج.س</Text> : null}
                </Pressable>

                <View style={s.footerRight}>
                  {ad.endDate ? (
                    <View style={s.dateBadge}>
                      <Ionicons name="calendar-outline" size={11} color={expired ? Colors.danger : Colors.textSecondary} />
                      <Text style={[s.dateTxt, expired && { color: Colors.danger }]}>{ad.endDate}</Text>
                    </View>
                  ) : null}
                  <Pressable
                    style={[s.toggleBtn, ad.active && !expired && s.toggleBtnOn]}
                    onPress={() => handleToggleActive(ad)}
                  >
                    <Text style={[s.toggleTxt, ad.active && !expired && { color: '#fff' }]}>
                      {ad.active && !expired ? 'مفعّل' : 'تفعيل'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <AdForm
        visible={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FCD34D' },
  statLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

  tabRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: '#FCD34D' },
  tabTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.75)' },
  tabTxtActive: { color: AD_COLOR, fontFamily: 'Inter_700Bold' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#fff' },
  tabBadgeTxt: { fontSize: 10, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.8)' },

  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addBtnTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FCD34D' },

  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, shadowColor: AD_COLOR, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, borderRightWidth: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  cardSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginBottom: 10, lineHeight: 18 },

  advertiserRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  advertiserName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: AD_COLOR, flex: 1, textAlign: 'right' },
  phoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  phoneTxt: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  paidBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: Colors.warning },
  paidBtnDone: { backgroundColor: '#ECFDF5', borderColor: Colors.success },
  paidTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  priceTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  toggleBtnOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleTxt: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
});

const fSty = StyleSheet.create({
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text },
  saveBtn: { backgroundColor: AD_COLOR, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 },
  saveTxt: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  cancelTxt: { color: Colors.danger, fontFamily: 'Inter_500Medium', fontSize: 14 },
  body: { padding: 20, gap: 2, paddingBottom: 60 },
  section: { fontSize: 13, fontFamily: 'Inter_700Bold', color: AD_COLOR, textAlign: 'right', marginTop: 16, marginBottom: 8, borderRightWidth: 3, borderRightColor: AD_COLOR, paddingRight: 8 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.borderLight },
  typeText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8, marginBottom: 4 },
});
