import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Student } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const SUBJECTS = ['الرياضيات', 'اللغة العربية', 'العلوم', 'التربية الفنية', 'الأنشطة'];

function GradeBar({ score, total }: { score: number; total: number }) {
  const pct = (score / total) * 100;
  const color = pct >= 90 ? Colors.success : pct >= 70 ? Colors.warning : Colors.danger;
  return (
    <View style={styles.barContainer}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barScore, { color }]}>{score}/{total}</Text>
    </View>
  );
}

export default function GradesScreen() {
  const insets = useSafeAreaInsets();
  const { students, updateStudent } = useAppData();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('20');
  const [showAdd, setShowAdd] = useState(false);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleAddGrade = () => {
    if (!selectedStudent || !score) return;
    const newGrade = {
      subject,
      score: parseInt(score),
      total: parseInt(total),
      date: new Date().toISOString().split('T')[0],
    };
    updateStudent(selectedStudent.id, {
      grades: [...selectedStudent.grades, newGrade],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScore('');
    setShowAdd(false);
    setSelectedStudent(null);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>سجل الدرجات</Text>
        <Text style={styles.headerSub}>اضغط على طالب لإضافة درجة أو عرض تاريخه</Text>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {students.map(student => {
            const avg = student.grades.length > 0
              ? Math.round(student.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / student.grades.length)
              : 0;
            return (
              <View key={student.id} style={styles.studentSection}>
                <Pressable
                  style={styles.studentHeader}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedStudent(selectedStudent?.id === student.id ? null : student); setShowAdd(false); }}
                >
                  <View style={styles.avgBadge}>
                    <Text style={[styles.avgText, { color: avg >= 90 ? Colors.success : avg >= 70 ? Colors.warning : Colors.danger }]}>
                      {avg > 0 ? `${avg}%` : '-'}
                    </Text>
                  </View>
                  <View style={styles.studentNameRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentLevel}>{student.level}</Text>
                  </View>
                  <HexFrame size={42} fill="#14532d" stroke="#4ADE80" strokeWidth={1.5} style={{ marginLeft: 10 }}>
                    <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                  </HexFrame>
                  <Ionicons
                    name={selectedStudent?.id === student.id ? 'chevron-up' : 'chevron-down'}
                    size={18} color={Colors.textLight}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>

                {selectedStudent?.id === student.id && (
                  <View style={styles.gradesExpanded}>
                    {student.grades.length === 0 ? (
                      <Text style={styles.noGrades}>لا توجد درجات مسجلة بعد</Text>
                    ) : (
                      student.grades.map((g, i) => (
                        <View key={i} style={styles.gradeRow}>
                          <Text style={styles.gradeDate}>{g.date}</Text>
                          <GradeBar score={g.score} total={g.total} />
                          <Text style={styles.gradeSubject}>{g.subject}</Text>
                        </View>
                      ))
                    )}
                    <Pressable
                      style={styles.addGradeBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
                    >
                      <Ionicons name="add-circle" size={18} color="#1A6B5C" />
                      <Text style={styles.addGradeBtnText}>إضافة درجة</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={showAdd && !!selectedStudent} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>إضافة درجة - {selectedStudent?.name}</Text>

            <Text style={styles.fieldLabel}>المادة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsRow}>
              {SUBJECTS.map(s => (
                <Pressable
                  key={s}
                  style={[styles.subjectChip, subject === s && styles.subjectChipActive]}
                  onPress={() => { setSubject(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.subjectChipText, subject === s && styles.subjectChipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.scoreRow}>
              <View style={styles.scoreField}>
                <Text style={styles.fieldLabel}>من</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={total}
                  onChangeText={setTotal}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
              <Text style={styles.scoreSeparator}>/</Text>
              <View style={styles.scoreField}>
                <Text style={styles.fieldLabel}>الدرجة</Text>
                <TextInput
                  style={styles.scoreInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  value={score}
                  onChangeText={setScore}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.confirmBtn]} onPress={handleAddGrade}>
                <Text style={styles.confirmBtnText}>حفظ الدرجة</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: '#1A6B5C', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 4 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  body: { padding: 16, gap: 10 },
  studentSection: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  avatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#16A34A' },
  studentNameRow: { flex: 1, alignItems: 'flex-end' },
  studentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  studentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 8 },
  avgText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  gradesExpanded: { borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: 14, gap: 10 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeSubject: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.text, width: 90, textAlign: 'right' },
  gradeDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, width: 70 },
  barContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBg: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },
  barScore: { fontSize: 12, fontFamily: 'Inter_700Bold', width: 36, textAlign: 'right' },
  noGrades: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center', paddingVertical: 12 },
  addGradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 4 },
  addGradeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1A6B5C' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8, marginTop: 12 },
  subjectsRow: { gap: 8, paddingBottom: 4 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surfaceAlt },
  subjectChipActive: { backgroundColor: '#1A6B5C' },
  subjectChipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  subjectChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginTop: 8 },
  scoreField: { alignItems: 'center' },
  scoreInput: { width: 80, height: 60, backgroundColor: Colors.surfaceAlt, borderRadius: 14, fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.text },
  scoreSeparator: { fontSize: 28, fontFamily: 'Inter_400Regular', color: Colors.textLight, paddingBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.surfaceAlt },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  confirmBtn: { backgroundColor: '#1A6B5C' },
  confirmBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
