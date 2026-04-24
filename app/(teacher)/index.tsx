import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData, ScheduleDay, ScheduleLevel } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const DAYS: ScheduleDay[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIOD_COLORS: Record<string, string> = {
  lesson:   '#3B82F6',
  break:    '#94A3B8',
  activity: '#8B5CF6',
};

export default function TeacherScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, apiLogout } = useAuth();
  const { students, schedule } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const teacherClass = (user as any)?.teacherClass as ScheduleLevel | undefined;
  const myStudents = teacherClass ? students.filter(s => s.level === teacherClass) : students;
  const presentToday = myStudents.filter(s => s.attendance > 85).length;

  const today = new Date();
  const jsDay = today.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const todayDayName: ScheduleDay | null = jsDay >= 0 && jsDay <= 4 ? DAYS[jsDay] : null;
  const dayName = todayDayName ?? 'الأحد';
  const activeDayIdx = DAYS.indexOf(dayName);

  const todaySchedule = schedule
    .filter(p => p.day === dayName && (!teacherClass || p.level === teacherClass))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayFormatted = today.toLocaleDateString('ar-SA', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <LinearGradient colors={['#061e1a', '#0d3d35', '#1A6B5C']} style={[styles.header, { paddingTop: topPadding + 16 }]}>
          {/* Hex decorations */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={{ position: 'absolute', right: -30, top: -25, opacity: 0.10 }}>
              <HexFrame size={130} fill="transparent" stroke="#10B981" strokeWidth={1.5} />
            </View>
            <View style={{ position: 'absolute', left: -20, bottom: -15, opacity: 0.07 }}>
              <HexFrame size={90} fill="transparent" stroke="#6EE7B7" strokeWidth={1} />
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
              <Text style={styles.schoolName}>نظم إدارة رياض الأطفال</Text>
              <Text style={styles.schoolLocation}>صفيتة الغنوماب</Text>
              <Text style={styles.greeting}>مرحباً، {user?.name}</Text>
            </View>
            <HexFrame size={52} fill="rgba(255,255,255,0.10)" stroke="#6EE7B7" strokeWidth={1.5} style={{ marginRight: 12 }}>
              <MaterialCommunityIcons name="school" size={24} color="#A7F3D0" />
            </HexFrame>
          </View>

          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayDate}>{todayFormatted}</Text>
              <Text style={styles.todayDay}>{dayName}</Text>
            </View>
            <View style={styles.todayStats}>
              <View style={styles.todayStat}>
                <Text style={styles.todayStatValue}>{myStudents.length}</Text>
                <Text style={styles.todayStatLabel}>الطلاب</Text>
              </View>
              <View style={styles.todayStatDivider} />
              <View style={styles.todayStat}>
                <Text style={[styles.todayStatValue, { color: '#6EE7B7' }]}>{presentToday}</Text>
                <Text style={styles.todayStatLabel}>حاضر</Text>
              </View>
              <View style={styles.todayStatDivider} />
              <View style={styles.todayStat}>
                <Text style={[styles.todayStatValue, { color: '#FCA5A5' }]}>{myStudents.length - presentToday}</Text>
                <Text style={styles.todayStatLabel}>غائب</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>جدول اليوم — {dayName}</Text>
          <View style={styles.schedule}>
            {todaySchedule.length === 0 ? (
              <View style={styles.emptySchedule}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={Colors.textLight} />
                <Text style={styles.emptyScheduleText}>لا توجد حصص مجدولة لهذا اليوم</Text>
              </View>
            ) : todaySchedule.map(item => {
              const color = PERIOD_COLORS[item.type] ?? '#3B82F6';
              const isBreak = item.type === 'break';
              return (
                <View key={item.id} style={[styles.scheduleItem, isBreak ? styles.scheduleBreak : { borderRightColor: color }]}>
                  <View style={styles.scheduleContent}>
                    <Text style={[styles.scheduleSubject, isBreak && styles.scheduleBreakText]}>
                      {item.subject}
                    </Text>
                    <Text style={styles.scheduleTime}>{item.startTime} — {item.endTime}</Text>
                  </View>
                  {!isBreak && (
                    <View style={[styles.scheduleTypeBadge, { backgroundColor: color + '18' }]}>
                      <Text style={[styles.scheduleTypeText, { color }]}>
                        {item.type === 'lesson' ? 'حصة' : 'نشاط'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>روابط سريعة</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <Pressable style={styles.quickLink} onPress={() => router.push('/(teacher)/messages')}>
              <Ionicons name="chatbubbles-outline" size={22} color="#1A6B5C" />
              <Text style={styles.quickLinkText}>رسائل أولياء الأمور</Text>
            </Pressable>
            <Pressable style={styles.quickLink} onPress={() => router.push('/(admin)/calendar')}>
              <Ionicons name="calendar-outline" size={22} color="#6366F1" />
              <Text style={styles.quickLinkText}>التقويم المدرسي</Text>
            </Pressable>
            <Pressable style={styles.quickLink} onPress={() => router.push('/(teacher)/performance')}>
              <Ionicons name="bar-chart-outline" size={22} color="#F59E0B" />
              <Text style={styles.quickLinkText}>تحليل الأداء</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>أيام الأسبوع</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day, i) => (
              <View key={day} style={[styles.dayChip, i === activeDayIdx && styles.dayChipActive]}>
                <Text style={[styles.dayChipText, i === activeDayIdx && styles.dayChipTextActive]}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -15, top: -15, width: 150, height: 150, opacity: 0.07 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerText: { flex: 1, alignItems: 'flex-end' },
  schoolName: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  schoolLocation: { fontSize: 11, color: '#6EE7B7', fontFamily: 'Inter_500Medium', marginBottom: 2 },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' },
  userName: { fontSize: 18, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  className: { fontSize: 12, color: '#6EE7B7', fontFamily: 'Inter_500Medium', marginTop: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoutBtn: { padding: 8 },
  todayCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  todayDay: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  todayDate: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  todayStats: { flexDirection: 'row', justifyContent: 'space-around' },
  todayStat: { alignItems: 'center' },
  todayStatValue: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  todayStatLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  todayStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: 30, alignSelf: 'center' },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text,
    textAlign: 'right', marginBottom: 12, marginTop: 4,
    borderRightWidth: 3, borderRightColor: '#1A6B5C', paddingRight: 10,
  },
  schedule: { gap: 10, marginBottom: 24 },
  scheduleItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14,
    shadowColor: '#1A6B5C', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    borderRightWidth: 4,
  },
  scheduleBreak: { backgroundColor: Colors.surfaceAlt, borderRightColor: '#94A3B8' },
  scheduleIndicator: { display: 'none' as any },
  scheduleContent: { flex: 1, alignItems: 'flex-end', marginRight: 2 },
  scheduleSubject: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  scheduleBreakText: { color: Colors.textSecondary, fontFamily: 'Inter_400Regular' as any },
  scheduleTime: {
    fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 4,
    backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, alignSelf: 'flex-end' as any,
  },
  scheduleTypeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  scheduleTypeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptySchedule: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  quickLink: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 6, padding: 14, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  quickLinkText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textLight, textAlign: 'center' },
  emptyScheduleText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  dayChipActive: { backgroundColor: '#1A6B5C', borderColor: '#1A6B5C' },
  dayChipText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  dayChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
