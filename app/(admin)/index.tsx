import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Image, Linking, Alert,
} from 'react-native';
import BannerCarousel from '@/components/BannerCarousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth, LoginEvent } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';
import FirebaseSyncStatus from '@/components/FirebaseSyncStatus';

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.primary, teacher: '#1A6B5C', parent: '#7B3FA0', guest: Colors.accent,
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير', teacher: 'معلمة', parent: 'ولي أمر', guest: 'زائر',
};

function LoginChart({ history }: { history: LoginEvent[] }) {
  const days = 14;
  const data = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { admin: 0, teacher: 0, parent: 0, guest: 0 };
    }
    history.forEach(e => {
      if (map[e.date]) map[e.date][e.role] = (map[e.date][e.role] || 0) + 1;
    });
    return Object.entries(map).map(([date, counts]) => ({
      date,
      label: new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'numeric' }),
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      counts,
    }));
  }, [history]);

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const totalLogins = history.length;
  const todayLogins = data[data.length - 1]?.total ?? 0;

  const roleBreakdown = useMemo(() => {
    const map: Record<string, number> = { admin: 0, teacher: 0, parent: 0, guest: 0 };
    history.forEach(e => { map[e.role] = (map[e.role] || 0) + 1; });
    return map;
  }, [history]);

  return (
    <View style={chartSty.wrap}>
      <View style={chartSty.header}>
        <View>
          <Text style={chartSty.title}>نشاط تسجيل الدخول</Text>
          <Text style={chartSty.sub}>آخر {days} يوماً</Text>
        </View>
        <View style={chartSty.todayBox}>
          <Text style={chartSty.todayVal}>{todayLogins}</Text>
          <Text style={chartSty.todayLbl}>اليوم</Text>
        </View>
      </View>

      <View style={chartSty.bars}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const barH = maxVal > 0 ? Math.max((d.total / maxVal) * 80, d.total > 0 ? 6 : 2) : 2;
          return (
            <View key={d.date} style={chartSty.barCol}>
              <Text style={[chartSty.barVal, d.total === 0 && { opacity: 0 }]}>{d.total}</Text>
              <View style={[chartSty.bar, { height: barH, backgroundColor: isToday ? Colors.accent : Colors.primary + '60' }]} />
              <Text style={[chartSty.barLabel, isToday && { color: Colors.accent, fontFamily: 'Inter_700Bold' }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={chartSty.legend}>
        {Object.entries(roleBreakdown).filter(([, v]) => v > 0).map(([role, count]) => (
          <View key={role} style={chartSty.legendItem}>
            <View style={[chartSty.legendDot, { backgroundColor: ROLE_COLORS[role] }]} />
            <Text style={chartSty.legendTxt}>{ROLE_LABELS[role]}: {count}</Text>
          </View>
        ))}
        {totalLogins > 0 && (
          <View style={chartSty.legendItem}>
            <Text style={[chartSty.legendTxt, { fontFamily: 'Inter_700Bold', color: Colors.text }]}>الإجمالي: {totalLogins}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

async function openLink(url: string, label = 'الرابط') {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('تعذّر الفتح', `تعذّر فتح ${label}.\nيمكنك زيارته يدوياً:\n${url}`);
    }
  } catch {
    Alert.alert('خطأ', `حدث خطأ أثناء فتح ${label}.\n${url}`);
  }
}

function StatCard({ label, value, sub, icon, color, bg }: {
  label: string; value: string; sub?: string; icon: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.statCard, { borderRightColor: color }]}>
      <View style={styles.statCardTop}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
          <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        </View>
      </View>
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
      style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.78 : 1 }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout, apiLogout, loginHistory } = useAuth();
  const { students, employees, news, inbox, registrationRequests, banners } = useAppData();

  const unreadInbox = inbox.filter(m => !m.read).length;
  const totalStudents = students.length;
  const avgAttendance = students.length > 0
    ? Math.round(students.reduce((a, s) => a + s.attendance, 0) / students.length)
    : 0;
  const totalPayroll = employees.reduce((a, e) => a + e.salary, 0).toLocaleString('ar-SA');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
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
            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await apiLogout();
                await logout();
                router.replace('/login');
              }}
              style={styles.logoutBtn}
            >
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
                source={require('@/assets/images/logo_main.png')}
                style={styles.logoSmall}
                resizeMode="contain"
              />
            </HexFrame>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="الطلاب" value={String(totalStudents)} sub="مسجل" icon="account-group" color="#3B82F6" bg="#EFF6FF" />
            <StatCard label="الحضور" value={`${avgAttendance}%`} sub="المتوسط" icon="calendar-check" color={Colors.success} bg="#ECFDF5" />
            <StatCard label="المعلمات" value={String(employees.length)} sub="معلمة" icon="badge-account" color="#8B5CF6" bg="#F5F3FF" />
            <StatCard label="الوارد" value={String(unreadInbox)} sub="غير مقروء" icon="email-alert" color={Colors.danger} bg="#FEF2F2" />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <BannerCarousel />
          <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
          <View style={styles.quickActions}>
            <QuickAction icon="account-group" label="الطلاب" color="#3B82F6" onPress={() => router.push('/(admin)/management')} />
            <QuickAction icon="account-tie" label="المعلمات" color="#8B5CF6" onPress={() => router.push('/(admin)/employees')} />
            <QuickAction icon="cash-multiple" label="الرواتب" color={Colors.success} onPress={() => router.push('/(admin)/finance')} />
            <QuickAction icon="bulletin-board" label="الأخبار" color={Colors.accent} onPress={() => router.push('/(admin)/news')} />
            <QuickAction icon="email-open-outline" label="الوارد" color={Colors.danger} onPress={() => router.push('/(admin)/inbox')} />
            <QuickAction icon="calendar-account" label="الاجتماعات" color="#7C3AED" onPress={() => router.push('/(admin)/meetings')} />
            <QuickAction icon="chart-bar" label="النتائج" color="#0EA5E9" onPress={() => router.push('/(admin)/results')} />
            <QuickAction icon="account-plus" label={`التسجيل${registrationRequests.filter(r => r.status === 'pending').length > 0 ? ` (${registrationRequests.filter(r => r.status === 'pending').length})` : ''}`} color="#10B981" onPress={() => router.push('/(admin)/registrations')} />
            <QuickAction icon="bullhorn" label={`الإعلانات${banners.length > 0 ? ` (${banners.length})` : ''}`} color="#B45309" onPress={() => router.push('/(admin)/ads')} />
            <QuickAction icon="cog" label="الإعدادات" color="#64748B" onPress={() => router.push('/(admin)/settings')} />
            <QuickAction icon="printer" label="طباعة" color="#F59E0B" onPress={() => router.push('/(admin)/export')} />
            <QuickAction icon="code-braces" label="المطوّر" color="#EC4899" onPress={() => router.push('/(admin)/developer')} />
            <QuickAction icon="calendar-month" label="التقويم" color="#6366F1" onPress={() => router.push('/(admin)/calendar')} />
            <QuickAction icon="image-multiple" label="الألبوم" color="#EC4899" onPress={() => router.push('/(admin)/gallery')} />
            <QuickAction icon="bell-plus" label="إشعار جماعي" color="#7C3AED" onPress={() => router.push('/(admin)/notifications-send')} />
            <QuickAction icon="chart-donut" label="التحليلات" color="#06B6D4" onPress={() => router.push('/(admin)/analytics')} />
          </View>

          <LoginChart history={loginHistory} />

          <FirebaseSyncStatus />

          <Text style={styles.sectionTitle}>آخر الأخبار</Text>
          {news.slice(0, 3).map(item => {
            const nc = item.type === 'trip' ? { c: Colors.success, ic: 'bus' } : item.type === 'activity' ? { c: '#3B82F6', ic: 'star' } : { c: Colors.accent, ic: 'newspaper-variant' };
            return (
              <View key={item.id} style={[styles.newsCard, { borderRightColor: nc.c }]}>
                <Ionicons name="chevron-back" size={16} color={Colors.textLight} />
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <Text style={styles.newsDate}>{item.date}</Text>
                </View>
                <View style={[styles.newsType, { backgroundColor: nc.c + '15' }]}>
                  <MaterialCommunityIcons name={nc.ic as any} size={18} color={nc.c} />
                </View>
              </View>
            );
          })}

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
                    {employees.length > 0
                      ? Math.round(employees.reduce((a, e) => a + e.salary, 0) / employees.length).toLocaleString('ar-SA')
                      : '0'} ج.س
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
                <Image source={require('@/assets/images/logo_main.png')} style={styles.designerLogo} resizeMode="contain" />
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
                  onPress={() => openLink('https://wa.me/966530658285', 'واتساب السعودية')}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={styles.designerLinkText}>واتساب السعودية</Text>
                </Pressable>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => openLink('https://wa.me/249916897578', 'واتساب السودان')}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={styles.designerLinkText}>واتساب السودان</Text>
                </Pressable>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => openLink('https://www.linkedin.com/in/asim-abdulrahman', 'LinkedIn')}
                >
                  <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
                  <Text style={styles.designerLinkText}>LinkedIn</Text>
                </Pressable>
                <Pressable
                  style={styles.designerLinkBtn}
                  onPress={() => openLink('https://www.credly.com/users/asim-abdulrahman', 'Credly')}
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
    backgroundColor: '#FFFFFF',
    borderRightWidth: 4,
    borderRightColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 3,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 26, fontFamily: 'Inter_700Bold', color: Colors.text },
  statLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  statSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 1 },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text,
    textAlign: 'right', marginBottom: 12, marginTop: 8,
    borderRightWidth: 3, borderRightColor: Colors.accent,
    paddingRight: 10,
  },
  quickActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24,
  },
  quickAction: { width: '30%', alignItems: 'center', gap: 7 },
  quickActionIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  quickActionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'center', lineHeight: 15 },
  newsCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderRightWidth: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  newsType: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  newsContent: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  newsTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  newsDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 3 },
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

const chartSty = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface, borderRadius: 18, marginBottom: 20, padding: 18,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09, shadowRadius: 10, elevation: 3,
    borderRightWidth: 4, borderRightColor: Colors.primary,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right' },
  sub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 2 },
  todayBox: { backgroundColor: Colors.primary + '12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '30' },
  todayVal: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.primary },
  todayLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 110, marginBottom: 12 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  barVal: { fontSize: 8, fontFamily: 'Inter_600SemiBold', color: Colors.textLight },
  bar: { width: '75%', borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 8, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textLight },
});
