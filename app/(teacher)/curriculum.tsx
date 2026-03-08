import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const WEEKS = [
  {
    week: 1, title: 'أسبوع التهيئة والتعارف',
    subjects: [
      { name: 'اللغة العربية', topics: ['التعرف على الحروف أ-ي', 'القصة والحكاية'], done: true },
      { name: 'الرياضيات', topics: ['الأعداد من 1 إلى 5'], done: true },
      { name: 'العلوم', topics: ['الحيوانات الأليفة'], done: true },
    ]
  },
  {
    week: 2, title: 'أسبوع العائلة والأسرة',
    subjects: [
      { name: 'اللغة العربية', topics: ['كلمات عن الأسرة', 'المفردات الجديدة'], done: true },
      { name: 'الرياضيات', topics: ['الأعداد من 6 إلى 10', 'الجمع البسيط'], done: false },
      { name: 'العلوم', topics: ['الحواس الخمس'], done: false },
    ]
  },
  {
    week: 3, title: 'أسبوع الطبيعة والبيئة',
    subjects: [
      { name: 'اللغة العربية', topics: ['قصة الطبيعة', 'الاستماع والإجابة'], done: false },
      { name: 'الرياضيات', topics: ['الأشكال الهندسية', 'الطرح البسيط'], done: false },
      { name: 'العلوم', topics: ['النبات ودورة حياته'], done: false },
    ]
  },
  {
    week: 4, title: 'أسبوع المهن والحِرف',
    subjects: [
      { name: 'اللغة العربية', topics: ['مفردات المهن', 'التعبير الشفهي'], done: false },
      { name: 'الرياضيات', topics: ['القياس والمقارنة'], done: false },
      { name: 'العلوم', topics: ['أدوات العمل والأمان'], done: false },
    ]
  },
];

export default function CurriculumScreen() {
  const insets = useSafeAreaInsets();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(2);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const completedWeeks = WEEKS.filter(w => w.subjects.every(s => s.done)).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>جدولة المنهج</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(completedWeeks / WEEKS.length) * 100}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{completedWeeks}/{WEEKS.length} أسابيع</Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {WEEKS.map(week => {
            const allDone = week.subjects.every(s => s.done);
            const someDone = week.subjects.some(s => s.done);
            const isExpanded = expandedWeek === week.week;

            return (
              <View key={week.week} style={[styles.weekCard, allDone && styles.weekCardDone]}>
                <Pressable
                  style={styles.weekHeader}
                  onPress={() => { setExpandedWeek(isExpanded ? null : week.week); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textLight} />
                  <View style={styles.weekInfo}>
                    <Text style={styles.weekTitle}>{week.title}</Text>
                    <Text style={styles.weekNum}>الأسبوع {week.week}</Text>
                  </View>
                  <View style={[styles.weekStatus,
                    allDone ? styles.weekStatusDone :
                    someDone ? styles.weekStatusPartial :
                    styles.weekStatusPending
                  ]}>
                    <MaterialCommunityIcons
                      name={allDone ? 'check-circle' : someDone ? 'clock-outline' : 'circle-outline'}
                      size={16}
                      color={allDone ? Colors.success : someDone ? Colors.warning : Colors.textLight}
                    />
                    <Text style={[styles.weekStatusText,
                      { color: allDone ? Colors.success : someDone ? Colors.warning : Colors.textLight }
                    ]}>
                      {allDone ? 'مكتمل' : someDone ? 'جارٍ' : 'قادم'}
                    </Text>
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.weekContent}>
                    {week.subjects.map((sub, i) => (
                      <View key={i} style={styles.subjectRow}>
                        <View style={[styles.doneIcon, sub.done ? styles.doneIconActive : styles.doneIconInactive]}>
                          <MaterialCommunityIcons
                            name={sub.done ? 'check' : 'minus'}
                            size={14}
                            color={sub.done ? '#FFFFFF' : Colors.textLight}
                          />
                        </View>
                        <View style={styles.subjectContent}>
                          <Text style={[styles.subjectName, sub.done && styles.subjectNameDone]}>{sub.name}</Text>
                          {sub.topics.map((t, ti) => (
                            <Text key={ti} style={styles.topicText}>• {t}</Text>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: '#1A6B5C', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: '#6EE7B7', borderRadius: 4 },
  progressText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.9)' },
  body: { padding: 16, gap: 10 },
  weekCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  weekCardDone: { borderWidth: 1.5, borderColor: Colors.success + '40' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  weekInfo: { flex: 1, alignItems: 'flex-end' },
  weekTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  weekNum: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  weekStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  weekStatusDone: { backgroundColor: '#ECFDF5' },
  weekStatusPartial: { backgroundColor: '#FFFBEB' },
  weekStatusPending: { backgroundColor: Colors.surfaceAlt },
  weekStatusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  weekContent: { borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: 14, gap: 12 },
  subjectRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  doneIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  doneIconActive: { backgroundColor: Colors.success },
  doneIconInactive: { backgroundColor: Colors.surfaceAlt },
  subjectContent: { flex: 1, alignItems: 'flex-end' },
  subjectName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 4 },
  subjectNameDone: { color: Colors.success },
  topicText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 18 },
});
