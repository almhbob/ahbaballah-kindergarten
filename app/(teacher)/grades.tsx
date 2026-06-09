import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Student, AssessmentResult } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

const DEFAULT_SUBJECTS = ['الرياضيات', 'اللغة العربية', 'العلوم', 'التربية الفنية', 'الأنشطة'];
const CUSTOM_SUBJECTS_KEY = 'custom_grade_subjects';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getLevel(pct: number): AssessmentResult['levelLabel'] {
  if (pct >= 90) return 'ممتاز';
  if (pct >= 75) return 'متقدم';
  if (pct >= 55) return 'متوسط';
  return 'مبتدئ';
}

const LEVEL_COLORS: Record<AssessmentResult['levelLabel'], string> = {
  'ممتاز': '#10B981',
  'متقدم': '#3B82F6',
  'متوسط': '#F59E0B',
  'مبتدئ': '#EF4444',
};

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

type ScreenMode = 'grades' | 'assessments';

export default function GradesScreen() {
  const insets = useSafeAreaInsets();
  const { students, updateStudent } = useAppData();
  const [mode, setMode] = useState<ScreenMode>('grades');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [subject, setSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('20');
  const [showAdd, setShowAdd] = useState(false);

  const [showAssessment, setShowAssessment] = useState(false);
  const [aStudent, setAStudent] = useState<Student | null>(null);
  const [lettersScore, setLettersScore] = useState('');
  const [lettersMax, setLettersMax] = useState('20');
  const [numbersScore, setNumbersScore] = useState('');
  const [numbersMax, setNumbersMax] = useState('20');
  const [mathScore, setMathScore] = useState('');
  const [mathMax, setMathMax] = useState('20');

  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const allSubjects = [...DEFAULT_SUBJECTS, ...customSubjects];

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_SUBJECTS_KEY).then(raw => {
      if (raw) {
        try { setCustomSubjects(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const handleAddSubject = async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    if (allSubjects.includes(name)) {
      Alert.alert('تنبيه', 'هذه المادة موجودة بالفعل');
      return;
    }
    const updated = [...customSubjects, name];
    setCustomSubjects(updated);
    await AsyncStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(updated));
    setSubject(name);
    setNewSubjectName('');
    setShowAddSubject(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const handleAddGrade = () => {
    if (!selectedStudent || !score) return;
    const s = parseInt(score);
    const t = parseInt(total);
    if (isNaN(s) || isNaN(t) || t <= 0 || s < 0 || s > t) {
      Alert.alert('تنبيه', 'الرجاء إدخال درجة صحيحة');
      return;
    }
    updateStudent(selectedStudent.id, {
      grades: [...selectedStudent.grades, {
        subject,
        score: s,
        total: t,
        date: new Date().toISOString().split('T')[0],
      }],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScore('');
    setShowAdd(false);
    setSelectedStudent(null);
  };

  const handleAddAssessment = () => {
    if (!aStudent) return;
    const ls = parseInt(lettersScore);
    const lm = parseInt(lettersMax);
    const ns = parseInt(numbersScore);
    const nm = parseInt(numbersMax);
    const ms = parseInt(mathScore);
    const mm = parseInt(mathMax);

    if ([ls, lm, ns, nm, ms, mm].some(isNaN) || lm <= 0 || nm <= 0 || mm <= 0) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول بأرقام صحيحة');
      return;
    }
    if (ls > lm || ns > nm || ms > mm) {
      Alert.alert('تنبيه', 'الدرجة لا يمكن أن تتجاوز الدرجة الكلية');
      return;
    }

    const totalScore = ls + ns + ms;
    const totalMax = lm + nm + mm;
    const pct = Math.round((totalScore / totalMax) * 100);

    const result: AssessmentResult = {
      id: genId(),
      date: new Date().toISOString().split('T')[0],
      lettersScore: ls, lettersMax: lm,
      numbersScore: ns, numbersMax: nm,
      mathScore: ms, mathMax: mm,
      totalScore, totalMax,
      levelLabel: getLevel(pct),
    };

    updateStudent(aStudent.id, {
      assessments: [...(aStudent.assessments ?? []), result],
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLettersScore(''); setNumbersScore(''); setMathScore('');
    setShowAssessment(false);
    setAStudent(null);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>
          {mode === 'grades' ? 'سجل الدرجات' : 'التقييمات الشاملة'}
        </Text>
        <Text style={styles.headerSub}>
          {mode === 'grades' ? 'اضغط على طالب لإضافة درجة أو عرض تاريخه' : 'تقييم الحروف والأرقام والحساب'}
        </Text>
        <View style={styles.modeTabs}>
          {(['grades', 'assessments'] as ScreenMode[]).map(m => (
            <Pressable
              key={m}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
              onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons
                name={m === 'grades' ? 'bar-chart-outline' : 'star-outline'}
                size={13}
                color={mode === m ? '#fff' : 'rgba(255,255,255,0.55)'}
              />
              <Text style={[styles.modeTabTxt, mode === m && { color: '#fff' }]}>
                {m === 'grades' ? 'الدرجات' : 'التقييمات'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <View style={styles.body}>
          {students.map(student => {
            if (mode === 'grades') {
              const avg = student.grades.length > 0
                ? Math.round(student.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / student.grades.length)
                : 0;
              return (
                <View key={student.id} style={styles.studentSection}>
                  <Pressable
                    style={styles.studentHeader}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedStudent(selectedStudent?.id === student.id ? null : student);
                      setShowAdd(false);
                    }}
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
            }

            const lastAssessment = (student.assessments ?? []).at(-1);
            const lvlColor = lastAssessment ? (LEVEL_COLORS[lastAssessment.levelLabel] ?? Colors.primary) : Colors.textLight;

            return (
              <View key={student.id} style={styles.studentSection}>
                <View style={styles.studentHeader}>
                  <View style={[styles.avgBadge, lastAssessment && { backgroundColor: lvlColor + '18' }]}>
                    {lastAssessment ? (
                      <Text style={[styles.avgText, { color: lvlColor, fontSize: 11 }]}>
                        {lastAssessment.levelLabel}
                      </Text>
                    ) : (
                      <Text style={[styles.avgText, { color: Colors.textLight, fontSize: 11 }]}>—</Text>
                    )}
                  </View>
                  <View style={styles.studentNameRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentLevel}>
                      {student.level} · {(student.assessments ?? []).length} تقييم
                    </Text>
                  </View>
                  <HexFrame size={42} fill="#14532d" stroke="#4ADE80" strokeWidth={1.5} style={{ marginLeft: 10 }}>
                    <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                  </HexFrame>
                  <Pressable
                    style={styles.assessQuickBtn}
                    onPress={() => {
                      setAStudent(student);
                      setLettersScore(''); setNumbersScore(''); setMathScore('');
                      setLettersMax('20'); setNumbersMax('20'); setMathMax('20');
                      setShowAssessment(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="add-circle" size={22} color="#1A6B5C" />
                  </Pressable>
                </View>

                {lastAssessment && (
                  <View style={styles.assessSummary}>
                    <View style={styles.assessSubRow}>
                      <Text style={styles.assessSubVal}>{lastAssessment.lettersScore}/{lastAssessment.lettersMax}</Text>
                      <Text style={styles.assessSubLbl}>الحروف</Text>
                    </View>
                    <View style={styles.assessSubRow}>
                      <Text style={styles.assessSubVal}>{lastAssessment.numbersScore}/{lastAssessment.numbersMax}</Text>
                      <Text style={styles.assessSubLbl}>الأرقام</Text>
                    </View>
                    <View style={styles.assessSubRow}>
                      <Text style={styles.assessSubVal}>{lastAssessment.mathScore}/{lastAssessment.mathMax}</Text>
                      <Text style={styles.assessSubLbl}>الحساب</Text>
                    </View>
                    <View style={[styles.assessTotalChip, { backgroundColor: lvlColor + '18' }]}>
                      <Text style={[styles.assessTotalTxt, { color: lvlColor }]}>
                        {Math.round((lastAssessment.totalScore / lastAssessment.totalMax) * 100)}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Add Grade Modal ── */}
      <Modal visible={showAdd && !!selectedStudent} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>إضافة درجة — {selectedStudent?.name}</Text>

            <Text style={styles.fieldLabel}>المادة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsRow}>
              {allSubjects.map(s => (
                <Pressable
                  key={s}
                  style={[styles.subjectChip, subject === s && styles.subjectChipActive]}
                  onPress={() => { setSubject(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.subjectChipText, subject === s && styles.subjectChipTextActive]}>{s}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.subjectAddChip}
                onPress={() => { setNewSubjectName(''); setShowAddSubject(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Ionicons name="add" size={18} color="#1A6B5C" />
              </Pressable>
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

      {/* ── Add Custom Subject Modal ── */}
      <Modal visible={showAddSubject} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowAddSubject(false)}>
          <Pressable style={[styles.subjectSheet, { paddingBottom: insets.bottom + 24 }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>إضافة مادة جديدة</Text>
            <Text style={styles.assessNote}>أدخل اسم المادة التي تريد إضافتها</Text>
            <TextInput
              style={styles.subjectInput}
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              placeholder="مثال: التربية الإسلامية"
              placeholderTextColor={Colors.textLight}
              textAlign="right"
              autoFocus
              onSubmitEditing={handleAddSubject}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowAddSubject(false)}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.confirmBtn]} onPress={handleAddSubject}>
                <Text style={styles.confirmBtnText}>إضافة</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Add Assessment Modal ── */}
      <Modal visible={showAssessment && !!aStudent} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>تقييم شامل — {aStudent?.name}</Text>
            <Text style={styles.assessNote}>أدخل درجة كل مجال من مجالات التقييم</Text>

            {([
              { label: 'الحروف', score: lettersScore, setScore: setLettersScore, max: lettersMax, setMax: setLettersMax },
              { label: 'الأرقام', score: numbersScore, setScore: setNumbersScore, max: numbersMax, setMax: setNumbersMax },
              { label: 'الحساب', score: mathScore, setScore: setMathScore, max: mathMax, setMax: setMathMax },
            ] as const).map(row => (
              <View key={row.label} style={styles.assessRow}>
                <Text style={styles.assessRowLabel}>{row.label}</Text>
                <View style={styles.assessInputs}>
                  <TextInput
                    style={styles.assessInput}
                    value={row.max}
                    onChangeText={row.setMax as (v: string) => void}
                    keyboardType="numeric"
                    textAlign="center"
                    placeholder="20"
                    placeholderTextColor={Colors.textLight}
                  />
                  <Text style={styles.assessSlash}>من</Text>
                  <TextInput
                    style={[styles.assessInput, { borderColor: Colors.primary, borderWidth: 1.5 }]}
                    value={row.score}
                    onChangeText={row.setScore as (v: string) => void}
                    keyboardType="numeric"
                    textAlign="center"
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>
            ))}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowAssessment(false)}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.confirmBtn]} onPress={handleAddAssessment}>
                <Text style={styles.confirmBtnText}>حفظ التقييم</Text>
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
  header: { backgroundColor: '#1A6B5C', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 4 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginBottom: 12 },
  modeTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, gap: 0 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8 },
  modeTabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  modeTabTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)' },
  body: { padding: 16, gap: 10 },
  studentSection: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#16A34A' },
  studentNameRow: { flex: 1, alignItems: 'flex-end' },
  studentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  studentLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 8, minWidth: 46, alignItems: 'center' },
  avgText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  assessQuickBtn: { padding: 4, marginLeft: 8 },
  assessSummary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 0, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  assessSubRow: { flex: 1, alignItems: 'center', gap: 2 },
  assessSubLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  assessSubVal: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },
  assessTotalChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  assessTotalTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
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
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  assessNote: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8, marginTop: 12 },
  subjectsRow: { gap: 8, paddingBottom: 4 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surfaceAlt },
  subjectChipActive: { backgroundColor: '#1A6B5C' },
  subjectChipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  subjectChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  subjectAddChip: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#1A6B5C', borderStyle: 'dashed' },
  subjectSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, marginTop: 'auto' },
  subjectInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.text, marginTop: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginTop: 8 },
  scoreField: { alignItems: 'center' },
  scoreInput: { width: 80, height: 60, backgroundColor: Colors.surfaceAlt, borderRadius: 14, fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.text },
  scoreSeparator: { fontSize: 28, fontFamily: 'Inter_400Regular', color: Colors.textLight, paddingBottom: 8 },
  assessRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  assessRowLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  assessInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assessInput: { width: 64, height: 44, backgroundColor: Colors.surfaceAlt, borderRadius: 10, fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  assessSlash: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.surfaceAlt },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  confirmBtn: { backgroundColor: '#1A6B5C' },
  confirmBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
