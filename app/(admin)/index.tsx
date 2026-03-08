import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Image, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

function StatCard({ label, value, sub, icon, color, bg }: {
  label: string; value: string; sub?: string; icon: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}>
      <HexFrame size={44} fill={bg} stroke={color + '50'} strokeWidth={1.5} style={{ marginBottom: 8 }}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </HexFrame>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      <HexFrame size={56} fill={color + '15'} stroke={color + '40'} strokeWidth={1.5}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </HexFrame>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { students, employees, news, inbox } = useAppData();

  const unreadInbox = inbox.filter(m => !m.read).length;
  const totalStudents = students.length;
  const avgAttendance = Math.round(students.reduce((a, s) => a + s.attendance, 0) / students.length);
  const totalPayroll = employees.reduce((a, e) => a + e.salary, 0).toLocaleString('ar-SA');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <LinearGradient
          colors={['#030612', '#050c38', '#0d1463']}
          style={[styles.header, { paddingTop: topPadding + 16 }]}
        >
          {/* Hex decorations */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={{ position: 'absolute', right: -35, top: -30, opacity: 0.10 }}>
              <HexFrame size={140} fill="transparent" stroke="#c9952a" strokeWidth={1.5} />
            </View>
            <View style={{ position: 'absolute', right: 30, top: 20, opacity: 0.06 }}>
              <HexFrame size={70} fill="transparent" stroke="#ffffff" strokeWidth={1} />
            </View>
            <View style={{ position: 'absolute', left: -25, bottom: -20, opacity: 0.08 }}>
              <HexFrame size={100} fill="transparent" stroke="#c9952a" strokeWidth={1} />
            </View>
          </View>
          <View style={styles.headerRow}>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.schoolName}>روضة أحباب الله</Text>
              <Text style={styles.schoolLocation}>صفيتة الغنوماب</Text>
              <Text style={styles.adminTitle}>أ. سلوى أحمد داموس — المديرة</Text>
              <Text style={styles.greeting}>مرحباً، {user?.name}</Text>
            </View>
            <HexFrame size={56} fill="#FFFFFF" stroke={Colors.accent} strokeWidth={2} style={{ marginRight: 12 }}>
              <Image
                source={require('@/assets/images/logo_new.jpg')}
                style={styles.logoSmall}
                resizeMode="contain"
              />
            </HexFrame>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="الطلاب" value={String(totalStudents)} sub="مسجل" icon="account-group" color="#3B82F6" bg="#EFF6FF" />
            <StatCard label="الحضور" value={`${avgAttendance}%`} sub="المتوسط" icon="calendar-check" color={Colors.success} bg="#ECFDF5" />
            <StatCard label="الموظفون" value={String(employees.length)} sub="موظف" icon="badge-account" color="#8B5CF6" bg="#F5F3FF" />
            <StatCard label="الوارد" value={String(unreadInbox)} sub="غير مقروء" icon="email-alert" color={Colors.danger} bg="#FEF2F2" />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
          <View style={styles.quickActions}>
            <QuickAction icon="account-group" label="الطلاب" color="#3B82F6" onPress={() => {}} />
            <QuickAction icon="account-tie" label="الموظفون" color="#8B5CF6" onPress={() => router.push('/(admin)/employees')} />
            <QuickAction icon="cash-multiple" label="الرواتب" color={Colors.success} onPress={() => router.push('/(admin)/finance')} />
            <QuickAction icon="bulletin-board" label="الأخبار" color={Colors.accent} onPress={() => router.push('/(admin)/news')} />
            <QuickAction icon="email-open-outline" label="الوارد" color={Colors.danger} onPress={() => router.push('/(admin)/inbox')} />
            <QuickAction icon="archive" label="الأرشيف" color="#64748B" onPress={() => {}} />
          </View>

          <Text style={styles.sectionTitle}>آخر الأخبار</Text>
          {news.slice(0, 3).map(item => (
            <View key={item.id} style={styles.newsCard}>
              <View style={[styles.newsType, {
                backgroundColor: item.type === 'trip' ? '#ECFDF5' : item.type === 'activity' ? '#EFF6FF' : '#FFF7ED'
              }]}>
                <MaterialCommunityIcons
                  name={item.type === 'trip' ? 'bus' : item.type === 'activity' ? 'star' : 'newspaper-variant'}
                  size={16}
                  color={item.type === 'trip' ? Colors.success : item.type === 'activity' ? '#3B82F6' : Colors.accent}
                />
              </View>
              <View style={styles.newsContent}>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsDate}>{item.date}</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={Colors.textLight} />
            </View>
          ))}

          <Text style={styles.sectionTitle}>نظرة مالية سريعة</Text>
          <View style={styles.financeCard}>
            <LinearGradient colors={['#040b3c', '#0c1155']} style={styles.financeGradient}>
              <Text style={styles.financeLabel}>إجمالي الرواتب الشهرية</Text>
              <Text style={styles.financeValue}>{totalPayroll} ج.س</Text>
              <View style={styles.financeDivider} />
              <View style={styles.financeRow}>
                <View>
                  <Text style={styles.financeSubLabel}>عدد الموظفين</Text>
                  <Text style={styles.financeSubValue}>{employees.length}</Text>
                </View>
                <View>
                  <Text style={styles.financeSubLabel}>متوسط الراتب</Text>
                  <Text style={styles.financeSubValue}>
                    {Math.round(employees.reduce((a, e) => a + e.salary, 0) / employees.length).toLocaleString('ar-SA')} ج.س
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Designer Card */}
          <Text style={styles.sectionTitle}>عن التطبيق</Text>
          <View style={styles.designerCard}>
            <LinearGradient colors={['#030612', '#050c38', '#0d1463']} style={styles.designerGrad}>
              <HexFrame size={80} fill="#FFFFFF" stroke={Colors.accent} strokeWidth={2.5} style={{ marginBottom: 12 }}>
                <Image source={require('@/assets/images/logo_new.jpg')} style={styles.designerLogo} resizeMode="contain" />
              </HexFrame>
              <View style={styles.designerBadge}>
                <Text style={styles.designerBadgeText}>روضة أحباب الله — الخاصة</Text>
              </View>
              <Text style={styles.designerBy}>تصميم وتطوير</Text>
              <Text style={styles.designerName}>م / عاصم عبدالرحمن محمد</Text>
              <Text style={styles.designerBio}>
                مهندس برمجيات ومحلل بيانات متخصص في بناء تطبيقات الهاتف المحمول والحلول الرقمية.{'\n'}
                حاصل على شهادات احترافية من Google وIBM وCisco في تحليل البيانات والأمن السيبراني وعلوم الحاسوب.{'\n'}
                خبرة في تطوير الأنظمة الإدارية والتعليمية الذكية.
              </Text>
              <View style={styles.designerDivider} />
              <View style={styles.designerLinks}>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => Linking.openURL('https://wa.me/966530658285')}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={styles.designerLinkText}>واتساب السعودية</Text>
                </Pressable>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => Linking.openURL('https://wa.me/249916897578')}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={styles.designerLinkText}>واتساب السودان</Text>
                </Pressable>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => Linking.openURL('https://www.linkedin.com/in/asim-abdulrahman')}
                >
                  <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
                  <Text style={styles.designerLinkText}>LinkedIn</Text>
                </Pressable>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => Linking.openURL('https://www.credly.com/users/asim-abdulrahman')}
                >
                  <MaterialCommunityIcons name="certificate-outline" size={16} color="#FF6B00" />
                  <Text style={styles.designerLinkText}>Credly</Text>
                </Pressable>
              </View>
              <Text style={styles.designerMotto}>جودة • التزام • تميز</Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  watermark: {
    position: 'absolute', right: -20, top: -20,
    width: 180, height: 180, opacity: 0.07,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerText: { flex: 1, alignItems: 'flex-end' },
  schoolName: { fontSize: 17, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  schoolLocation: { fontSize: 11, color: Colors.accent, fontFamily: 'Inter_500Medium', marginBottom: 1 },
  adminTitle: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_400Regular', marginBottom: 2 },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' },
  userName: { fontSize: 20, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  logoSmall: { width: 46, height: 46 },
  logoutBtn: { padding: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.80)' },
  statSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.50)' },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text,
    textAlign: 'right', marginBottom: 12, marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  quickAction: { width: '30%', alignItems: 'center', gap: 6 },
  quickActionIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'center' },
  newsCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  newsType: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  newsContent: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  newsTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  newsDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  financeCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  financeGradient: { padding: 20 },
  financeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', textAlign: 'right' },
  financeValue: { fontSize: 32, color: Colors.accent, fontFamily: 'Inter_700Bold', textAlign: 'right', marginTop: 4 },
  financeDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  financeSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular', textAlign: 'right' },
  financeSubValue: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  designerCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 32 },
  designerGrad: { padding: 24, alignItems: 'center' },
  designerLogo: { width: 58, height: 58 },
  designerBadge: { backgroundColor: Colors.accent + '30', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.accent + '50' },
  designerBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.accent },
  designerBy: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  designerName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  designerBio: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  designerDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  designerLinks: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  designerLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  designerLinkText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#fff' },
  designerMotto: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.accent, letterSpacing: 2 },
});
