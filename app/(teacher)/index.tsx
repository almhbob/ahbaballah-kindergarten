import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const SCHEDULE = [
  { time: '07:30 - 08:00', subject: 'تجمع الصباح', type: 'assembly', color: '#F59E0B' },
  { time: '08:00 - 08:45', subject: 'اللغة العربية', type: 'core', color: '#3B82F6' },
  { time: '08:45 - 09:30', subject: 'الرياضيات', type: 'core', color: '#10B981' },
  { time: '09:30 - 10:00', subject: 'استراحة', type: 'break', color: '#94A3B8' },
  { time: '10:00 - 10:45', subject: 'العلوم', type: 'core', color: '#8B5CF6' },
  { time: '10:45 - 11:30', subject: 'التربية الفنية', type: 'activity', color: '#EC4899' },
  { time: '11:30 - 12:00', subject: 'القصة والقراءة', type: 'activity', color: '#F59E0B' },
];

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export default function TeacherScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const myStudents = students;
  const presentToday = myStudents.filter(s => s.attendance > 85).length;

  const today = new Date();
  const dayIndex = today.getDay();
  const dayName = dayIndex === 0 ? 'الأحد' : dayIndex === 1 ? 'الإثنين' : dayIndex === 2 ? 'الثلاثاء' : dayIndex === 3 ? 'الأربعاء' : 'الخميس';

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
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.schoolName}>روضة أحباب الله</Text>
              <Text style={styles.schoolLocation}>صفيتة الغنوماب</Text>
              <Text style={styles.greeting}>مرحباً، {user?.name}</Text>
            </View>
            <HexFrame size={52} fill="rgba(255,255,255,0.10)" stroke="#6EE7B7" strokeWidth={1.5} style={{ marginRight: 12 }}>
              <MaterialCommunityIcons name="school" size={24} color="#A7F3D0" />
            </HexFrame>
          </View>

          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayDate}>{today.getDate()} مارس 2026</Text>
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
          <Text style={styles.sectionTitle}>جدول اليوم</Text>
          <View style={styles.schedule}>
            {SCHEDULE.map((item, i) => (
              <View key={i} style={[styles.scheduleItem, item.type === 'break' && styles.scheduleBreak]}>
                <View style={[styles.scheduleIndicator, { backgroundColor: item.color }]} />
                <View style={styles.scheduleContent}>
                  <Text style={[styles.scheduleSubject, item.type === 'break' && styles.scheduleBreakText]}>
                    {item.subject}
                  </Text>
                  <Text style={styles.scheduleTime}>{item.time}</Text>
                </View>
                {item.type !== 'break' && (
                  <View style={[styles.scheduleTypeBadge, { backgroundColor: item.color + '20' }]}>
                    <Text style={[styles.scheduleTypeText, { color: item.color }]}>
                      {item.type === 'core' ? 'أساسي' : item.type === 'assembly' ? 'تجمع' : 'نشاط'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>أبرز الأيام هذا الأسبوع</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day, i) => (
              <View key={day} style={[styles.dayChip, i === dayIndex - 1 && styles.dayChipActive]}>
                <Text style={[styles.dayChipText, i === dayIndex - 1 && styles.dayChipTextActive]}>{day}</Text>
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
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 12, marginTop: 4 },
  schedule: { gap: 8, marginBottom: 24 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  scheduleBreak: { backgroundColor: Colors.surfaceAlt },
  scheduleIndicator: { width: 4, height: 40, borderRadius: 2, marginLeft: 12 },
  scheduleContent: { flex: 1, alignItems: 'flex-end' },
  scheduleSubject: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  scheduleBreakText: { color: Colors.textSecondary },
  scheduleTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  scheduleTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  scheduleTypeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center' },
  dayChipActive: { backgroundColor: '#1A6B5C' },
  dayChipText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  dayChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
