import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

const SECTIONS = [
  {
    icon: 'information-outline',
    title: 'مقدمة',
    body: `نظام إدارة نظم إدارة رياض الأطفال ("التطبيق") هو منصة تعليمية إدارية تُقدَّم كخدمة SaaS للروضات الخاصة.\n\nباستخدامك هذا التطبيق فأنت توافق على سياسة الخصوصية هذه وشروط الاستخدام. إذا كنت لا توافق على أي بند، يُرجى التوقف عن استخدام التطبيق فوراً.`,
  },
  {
    icon: 'database-outline',
    title: 'البيانات التي نجمعها',
    body: `نجمع البيانات التالية لتشغيل خدمات التطبيق:\n\n• بيانات الطلاب: الاسم، الصف، الحضور، السلوك، والتقييمات الأكاديمية.\n• بيانات ولي الأمر: الاسم، رقم الهاتف، وكلمة المرور المُشفَّرة.\n• بيانات الموظفين: الاسم، التخصص، الراتب، وبيانات التواصل.\n• بيانات الروضة: المعلومات العامة، الأخبار، الجداول، والفعاليات.\n• بيانات الجهاز: المنصة (iOS/Android/Web) للتوافق التقني.`,
  },
  {
    icon: 'shield-lock-outline',
    title: 'كيف نحمي بياناتك',
    body: `• تُخزَّن جميع البيانات بشكل آمن في Google Firebase (Firestore) مع تشفير أثناء النقل (TLS).\n• كلمات المرور لا تُحفظ بصيغتها الصريحة في أي قاعدة بيانات.\n• لا نبيع بياناتك لأي طرف ثالث.\n• الوصول للبيانات مقيّد بنظام أدوار صارم (مدير / معلمة / ولي أمر).`,
  },
  {
    icon: 'share-variant-outline',
    title: 'مشاركة البيانات',
    body: `لا نشارك بياناتك الشخصية مع أي طرف خارجي باستثناء:\n\n• Google Firebase: لتخزين البيانات (خادم مُختار بعناية).\n• Expo: لإرسال الإشعارات الفورية (Push Notifications).\n• مزود المدفوعات (عند الاشتراك في الخطط المدفوعة).\n\nجميع هذه الجهات مُلزَمة بسياسات حماية البيانات الدولية.`,
  },
  {
    icon: 'bell-outline',
    title: 'الإشعارات',
    body: `• قد يُرسل التطبيق إشعارات محلية ومباشرة تتعلق بالطفل (الحضور، الدرجات، الرسائل).\n• يمكنك إيقاف الإشعارات في أي وقت من إعدادات هاتفك.\n• لا نرسل إشعارات تسويقية غير مرغوبة.`,
  },
  {
    icon: 'account-child-outline',
    title: 'خصوصية الأطفال',
    body: `نأخذ خصوصية الأطفال بجدية قصوى:\n\n• لا نجمع بيانات الأطفال مباشرةً — يتولى ولي الأمر أو الروضة إدخال البيانات.\n• صور الطلاب (إن وُجدت) تُرفع بموافقة ولي الأمر وتُحفظ بشكل مشفّر.\n• لا تُستخدم بيانات الأطفال لأغراض تسويقية أو تحليلية خارجية.`,
  },
  {
    icon: 'file-document-edit-outline',
    title: 'حقوقك',
    body: `يحق لك في أي وقت:\n\n• طلب عرض بياناتك المحفوظة.\n• تصحيح أي بيانات غير دقيقة.\n• طلب حذف بياناتك نهائياً (الحذف قد يستغرق 30 يوم عمل).\n• الاعتراض على أي معالجة لبياناتك.\n\nللتواصل بشأن أي من هذه الطلبات، تفضّل بمراسلتنا عبر واتساب.`,
  },
  {
    icon: 'scale-balance',
    title: 'شروط الاستخدام',
    body: `• يُحظر استخدام التطبيق لأي غرض غير قانوني.\n• لا يُسمح بمشاركة بيانات الدخول مع أطراف غير مخوّلة.\n• نحتفظ بحق تعليق أي حساب يُساء استخدامه.\n• المحتوى المُضاف (أخبار، صور، رسائل) يجب أن يكون لائقاً وملتزماً بالقيم الإسلامية.\n• حقوق الملكية الفكرية للتطبيق محفوظة بالكامل للمطوّر.`,
  },
  {
    icon: 'credit-card-outline',
    title: 'الاشتراكات والمدفوعات',
    body: `• الخطة التجريبية (30 يوم) مجانية تماماً.\n• تُدفع رسوم الاشتراك الشهري مقدّماً ولا تُستردّ.\n• عند انتهاء الاشتراك تُوقف خدمة الكتابة، وتبقى القراءة متاحة لمدة 7 أيام إضافية.\n• يُمكن الترقية أو تخفيض الخطة في أي وقت.`,
  },
  {
    icon: 'refresh',
    title: 'التحديثات على هذه السياسة',
    body: `قد نُحدّث هذه السياسة بشكل دوري. سنُخطرك بأي تغييرات جوهرية عبر الإشعارات داخل التطبيق أو عبر البريد الإلكتروني المسجّل.\n\nآخر تحديث: أبريل 2026.`,
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 20;
  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#030612', '#0c1155', '#1e2480']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 8 }]}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.headerTitle}>الخصوصية والشروط</Text>
            <Text style={s.headerSub}>سياسة الاستخدام القانونية</Text>
          </View>
          <View style={s.headerIcon}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#c9952a" />
          </View>
        </View>

        {/* Tab switcher */}
        <View style={s.tabRow}>
          <Pressable
            style={[s.tab, tab === 'terms'   && s.tabActive]}
            onPress={() => setTab('terms')}
          >
            <Text style={[s.tabTxt, tab === 'terms'   && s.tabTxtActive]}>شروط الاستخدام</Text>
          </Pressable>
          <Pressable
            style={[s.tab, tab === 'privacy' && s.tabActive]}
            onPress={() => setTab('privacy')}
          >
            <Text style={[s.tabTxt, tab === 'privacy' && s.tabTxtActive]}>سياسة الخصوصية</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Last update badge */}
        <View style={s.updateBadge}>
          <MaterialCommunityIcons name="calendar-check" size={14} color={Colors.textSecondary} />
          <Text style={s.updateTxt}>آخر تحديث: أبريل 2026</Text>
        </View>

        {tab === 'privacy' ? (
          SECTIONS.filter(s => !['scale-balance', 'credit-card-outline', 'refresh'].includes(s.icon)).map((sec, i) => (
            <SectionCard key={i} {...sec} />
          ))
        ) : (
          SECTIONS.filter(s => ['scale-balance', 'credit-card-outline', 'refresh', 'information-outline'].includes(s.icon)).map((sec, i) => (
            <SectionCard key={i} {...sec} />
          ))
        )}

        <View style={s.footer}>
          <MaterialCommunityIcons name="domain" size={28} color={Colors.textLight} />
          <Text style={s.footerName}>نظام إدارة نظم إدارة رياض الأطفال</Text>
          <Text style={s.footerSub}>تطوير: م / عاصم عبدالرحمن محمد</Text>
          <Text style={s.footerVersion}>الإصدار 1.0.0 — 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{title}</Text>
        <View style={s.cardIconWrap}>
          <MaterialCommunityIcons name={icon as any} size={18} color={Colors.primary} />
        </View>
      </View>
      <Text style={s.cardBody}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21, marginRight: 10,
    backgroundColor: 'rgba(201,149,42,0.15)', borderWidth: 1.5, borderColor: 'rgba(201,149,42,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },

  tabRow: { flexDirection: 'row', gap: 8 },
  tab:    { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  tabActive: { backgroundColor: '#c9952a' },
  tabTxt:    { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)' },
  tabTxtActive: { color: '#fff' },

  body: { padding: 16, gap: 12 },

  updateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end',
    backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  updateTxt: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 10 },
  cardTitle:  { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary + '12', borderWidth: 1, borderColor: Colors.primary + '25',
  },
  cardBody: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 22, textAlign: 'right' },

  footer: { alignItems: 'center', paddingVertical: 24, gap: 6, marginTop: 8 },
  footerName:    { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  footerSub:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  footerVersion: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
});
