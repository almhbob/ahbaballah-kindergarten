import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

const SECTIONS = [
  {
    title: 'مقدمة',
    body: 'مرحباً بك في تطبيق روضة احباب الله. نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمعنا للبيانات واستخدامها وحمايتها.',
  },
  {
    title: 'البيانات التي نجمعها',
    body: '• معلومات تسجيل الطلاب: الاسم، الصف، بيانات ولي الأمر، رقم الهاتف.\n• السجلات الأكاديمية: الدرجات، الحضور، التقييمات، التقارير اليومية.\n• بيانات المالية: رسوم الاشتراك والدفعات.\n• الصور: صور المعرض المدرسي ووثائق الهوية.',
  },
  {
    title: 'كيفية استخدام البيانات',
    body: 'نستخدم البيانات حصراً لأغراض:\n• إدارة شؤون الطلاب وتقدمهم الأكاديمي.\n• التواصل بين إدارة الروضة وأولياء الأمور.\n• إصدار التقارير والشهادات.\n• تحسين الخدمات التعليمية المقدمة.',
  },
  {
    title: 'مشاركة البيانات',
    body: 'لا نشارك بياناتك الشخصية مع أي طرف ثالث لأغراض تجارية. قد تُخزَّن البيانات على خوادم Firebase (Google Cloud) المحمية بأعلى معايير الأمان.',
  },
  {
    title: 'حماية البيانات',
    body: 'نستخدم تشفير SSL/TLS لحماية البيانات أثناء النقل. يُطبَّق نظام صلاحيات متعدد المستويات يضمن وصول كل مستخدم فقط للبيانات المصرح له بها.',
  },
  {
    title: 'حقوقك',
    body: 'يحق لك في أي وقت:\n• الاطلاع على بياناتك الشخصية.\n• طلب تصحيح أي بيانات غير دقيقة.\n• طلب حذف بياناتك من النظام.\n\nللتواصل: يُرجى مراسلة إدارة الروضة عبر قسم الرسائل داخل التطبيق.',
  },
  {
    title: 'الإشعارات',
    body: 'يرسل التطبيق إشعارات محلية فقط (على جهازك) لإعلامك بالمستجدات والردود من الإدارة. لا نرسل إشعارات تسويقية.',
  },
  {
    title: 'تحديثات السياسة',
    body: 'قد نُحدِّث هذه السياسة من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية عبر إشعار داخل التطبيق.',
  },
];

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 20 : insets.top) + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>سياسة الخصوصية</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>روضة احباب الله</Text>
        <Text style={styles.lastUpdated}>آخر تحديث: يونيو 2026</Text>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <Text style={styles.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            للاستفسار عن سياسة الخصوصية تواصل مع إدارة الروضة
          </Text>
          <Text style={styles.footerText}>
            جميع الحقوق محفوظة © 2026 روضة احباب الله
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: '#1A6B5C',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  body: { padding: 20, gap: 0 },
  appName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.primary, textAlign: 'center', marginBottom: 4 },
  lastUpdated: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  sectionBody: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 22 },
  footer: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 6 },
  footerText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
});
