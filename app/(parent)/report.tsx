import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const PARENT_COLOR = '#7B3FA0';

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { students } = useAppData();
  const [activeTab, setActiveTab] = useState<'daily' | 'grades'>('daily');
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const child = students.find(s => s.id === user?.studentId) || students[0];
  if (!child) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>سجل المتابعة</Text>
        <Text style={styles.headerSub}>{child.name}</Text>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'daily' && styles.tabActive]}
            onPress={() => { setActiveTab('daily'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>التقارير اليومية</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'grades' && styles.tabActive]}
            onPress={() => { setActiveTab('grades'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.tabText, activeTab === 'grades' && styles.tabTextActive]}>سجل الدرجات</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {activeTab === 'daily' ? (
            child.dailyReports.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyText}>لا توجد تقارير يومية بعد</Text>
              </View>
            ) : (
              child.dailyReports.map((report, i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{report.date}</Text>
                    </View>
                    <Text style={styles.reportCardTitle}>تقرير اليوم</Text>
                  </View>
                  <View style={styles.reportGrid}>
                    <View style={styles.reportGridItem}>
                      <MaterialCommunityIcons name="food-apple" size={20} color={Colors.success} />
                      <Text style={styles.reportGridLabel}>الطعام</Text>
                      <Text style={styles.reportGridValue}>{report.ate}</Text>
                    </View>
                    <View style={styles.reportGridItem}>
                      <MaterialCommunityIcons name="book-open-variant" size={20} color="#3B82F6" />
                      <Text style={styles.reportGridLabel}>التعلم</Text>
                      <Text style={styles.reportGridValue}>{report.learned}</Text>
                    </View>
                    <View style={styles.reportGridItem}>
                      <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color={PARENT_COLOR} />
                      <Text style={styles.reportGridLabel}>المزاج</Text>
                      <Text style={[styles.reportGridValue, { color: PARENT_COLOR }]}>{report.mood}</Text>
                    </View>
                  </View>
                  {report.behaviorNote ? (
                    <View style={styles.behaviorNote}>
                      <MaterialCommunityIcons name="comment-text-outline" size={14} color={PARENT_COLOR} />
                      <Text style={styles.behaviorNoteText}>{report.behaviorNote}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )
          ) : (
            <>
              {child.grades.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="school-outline" size={48} color={Colors.textLight} />
                  <Text style={styles.emptyText}>لا توجد درجات مسجلة بعد</Text>
                </View>
              ) : (
                <>
                  <View style={styles.gradesSummary}>
                    <Text style={styles.gradesSummaryLabel}>المعدل العام</Text>
                    <Text style={[styles.gradesSummaryValue, {
                      color: Math.round(child.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / child.grades.length) >= 80 ? Colors.success : Colors.warning
                    }]}>
                      {Math.round(child.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / child.grades.length)}%
                    </Text>
                  </View>
                  {child.grades.map((g, i) => {
                    const pct = Math.round((g.score / g.total) * 100);
                    const gc = pct >= 90 ? Colors.success : pct >= 70 ? Colors.warning : Colors.danger;
                    return (
                      <View key={i} style={styles.gradeCard}>
                        <View style={styles.gradeCardRight}>
                          <Text style={styles.gradeSubject}>{g.subject}</Text>
                          <Text style={styles.gradeDate}>{g.date}</Text>
                        </View>
                        <View style={styles.gradeCardLeft}>
                          <View style={styles.gradeBarBg}>
                            <View style={[styles.gradeBarFill, { width: `${pct}%` as any, backgroundColor: gc }]} />
                          </View>
                          <Text style={[styles.gradeScore, { color: gc }]}>{g.score}/{g.total}</Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: PARENT_COLOR, paddingHorizontal: 20, paddingBottom: 0 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 4 },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginBottom: 16 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  body: { padding: 16, gap: 12 },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  reportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  reportCardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text },
  dateBadge: { backgroundColor: '#F5F0FA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dateBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: PARENT_COLOR },
  reportGrid: { flexDirection: 'row', gap: 8 },
  reportGridItem: { flex: 1, alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 10, gap: 4 },
  reportGridLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  reportGridValue: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center' },
  behaviorNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#F5F0FA', borderRadius: 10, padding: 10 },
  behaviorNoteText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, flex: 1, textAlign: 'right', lineHeight: 18 },
  gradesSummary: { backgroundColor: PARENT_COLOR, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 4 },
  gradesSummaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  gradesSummaryValue: { fontSize: 36, fontFamily: 'Inter_700Bold', marginTop: 4 },
  gradeCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  gradeCardRight: { alignItems: 'flex-end', minWidth: 80 },
  gradeSubject: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  gradeDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 2 },
  gradeCardLeft: { flex: 1, gap: 6 },
  gradeBarBg: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4 },
  gradeBarFill: { height: 8, borderRadius: 4 },
  gradeScore: { fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'left' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textLight },
});
