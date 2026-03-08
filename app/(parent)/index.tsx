import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const PARENT_COLOR = '#7B3FA0';

export default function ParentHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const child = students.find(s => s.id === user?.studentId) || students[0];
  if (!child) return null;

  const latestReport = child.dailyReports[0];
  const avgGrade = child.grades.length > 0
    ? Math.round(child.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / child.grades.length)
    : 0;

  const behColor = child.behavior === 'ممتاز' ? Colors.success : child.behavior === 'جيد' ? '#3B82F6' : child.behavior === 'مقبول' ? Colors.warning : Colors.danger;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <LinearGradient colors={['#7B3FA0', '#5B2D7A']} style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.schoolName}>روضة أحباب الله</Text>
              <Text style={styles.schoolLocation}>صفيتة الغنوماب</Text>
              <Text style={styles.greeting}>مرحباً، {user?.name}</Text>
            </View>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account-heart" size={24} color="#E9B8FF" />
            </View>
          </View>

          <View style={styles.childCard}>
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>{child.name.charAt(0)}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childLevel}>المستوى: {child.level}</Text>
            </View>
            <View style={[styles.attendanceCircle, {
              borderColor: child.attendance > 90 ? '#6EE7B7' : child.attendance > 80 ? Colors.warning : Colors.danger
            }]}>
              <Text style={[styles.attendancePct, {
                color: child.attendance > 90 ? '#6EE7B7' : child.attendance > 80 ? Colors.warning : Colors.danger
              }]}>{child.attendance}%</Text>
              <Text style={styles.attendanceLabel}>حضور</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: behColor + '40' }]}>
              <Text style={[styles.statBoxValue, { color: behColor }]}>{child.behavior}</Text>
              <Text style={styles.statBoxLabel}>السلوك</Text>
            </View>
            <View style={[styles.statBox, { borderColor: avgGrade >= 80 ? Colors.success + '40' : Colors.warning + '40' }]}>
              <Text style={[styles.statBoxValue, { color: avgGrade >= 80 ? Colors.success : Colors.warning }]}>
                {avgGrade > 0 ? `${avgGrade}%` : 'لا يوجد'}
              </Text>
              <Text style={styles.statBoxLabel}>المعدل</Text>
            </View>
            <View style={[styles.statBox, {
              borderColor: child.homework === 'منجز' ? Colors.success + '40' : Colors.danger + '40'
            }]}>
              <Text style={[styles.statBoxValue, {
                color: child.homework === 'منجز' ? Colors.success : child.homework === 'ناقص' ? Colors.warning : Colors.danger
              }]}>{child.homework}</Text>
              <Text style={styles.statBoxLabel}>الواجبات</Text>
            </View>
          </View>

          {latestReport && (
            <>
              <Text style={styles.sectionTitle}>آخر تقرير يومي</Text>
              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <MaterialCommunityIcons name="calendar-today" size={16} color={PARENT_COLOR} />
                  <Text style={styles.reportDate}>{latestReport.date}</Text>
                </View>
                <View style={styles.reportItems}>
                  <View style={styles.reportItem}>
                    <Text style={styles.reportItemLabel}>الطعام</Text>
                    <Text style={styles.reportItemValue}>{latestReport.ate}</Text>
                  </View>
                  <View style={styles.reportItem}>
                    <Text style={styles.reportItemLabel}>تعلّم اليوم</Text>
                    <Text style={styles.reportItemValue}>{latestReport.learned}</Text>
                  </View>
                  <View style={styles.reportItem}>
                    <Text style={styles.reportItemLabel}>المزاج</Text>
                    <Text style={[styles.reportItemValue, { color: PARENT_COLOR }]}>{latestReport.mood}</Text>
                  </View>
                  {latestReport.behaviorNote && (
                    <View style={styles.reportNote}>
                      <MaterialCommunityIcons name="comment-text-outline" size={14} color={PARENT_COLOR} />
                      <Text style={styles.reportNoteText}>{latestReport.behaviorNote}</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>آخر الدرجات</Text>
          {child.grades.length === 0 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>لا توجد درجات مسجلة بعد</Text>
            </View>
          ) : (
            <View style={styles.gradesGrid}>
              {child.grades.slice(0, 3).map((g, i) => {
                const pct = Math.round((g.score / g.total) * 100);
                const gc = pct >= 90 ? Colors.success : pct >= 70 ? Colors.warning : Colors.danger;
                return (
                  <View key={i} style={styles.gradeBox}>
                    <View style={styles.gradeCircle}>
                      <Text style={[styles.gradeScore, { color: gc }]}>{g.score}</Text>
                      <Text style={styles.gradeTotal}>/{g.total}</Text>
                    </View>
                    <Text style={styles.gradeSubject}>{g.subject}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <MaterialCommunityIcons name="note-text" size={18} color={PARENT_COLOR} />
              <Text style={styles.notesTitle}>ملاحظة المعلمة</Text>
            </View>
            <Text style={styles.notesText}>{child.notes || 'لا توجد ملاحظات حالياً'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerText: { flex: 1, alignItems: 'flex-end' },
  schoolName: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  schoolLocation: { fontSize: 11, color: '#E9B8FF', fontFamily: 'Inter_500Medium', marginBottom: 2 },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  tagline: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', marginTop: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoutBtn: { padding: 8 },
  childCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' },
  childAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 14 },
  childAvatarText: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  childInfo: { flex: 1, alignItems: 'flex-end' },
  childName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  childLevel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  attendanceCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  attendancePct: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  attendanceLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  body: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statBoxValue: { fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  statBoxLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 12, marginTop: 4 },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, justifyContent: 'flex-end' },
  reportDate: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#7B3FA0' },
  reportItems: { gap: 10 },
  reportItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  reportItemLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  reportItemValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', flex: 1, paddingLeft: 8 },
  reportNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 8 },
  reportNoteText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, flex: 1, textAlign: 'right', lineHeight: 18 },
  gradesGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  gradeBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  gradeCircle: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  gradeScore: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  gradeTotal: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight, paddingBottom: 2 },
  gradeSubject: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'center' },
  notesCard: { backgroundColor: '#F5F0FA', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E9D5F7' },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 8 },
  notesTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#7B3FA0' },
  notesText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 20 },
  noData: { alignItems: 'center', paddingVertical: 20 },
  noDataText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight },
});
