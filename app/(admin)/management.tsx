import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, ScrollView, Alert, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppData, Employee, Student, AttendanceRecord, EmployeeWarning } from '@/contexts/AppDataContext';
import HexFrame from '@/components/HexFrame';
import * as Haptics from 'expo-haptics';

async function openLink(url: string, fallbackLabel?: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) { await Linking.openURL(url); }
    else { Alert.alert('تعذّر الفتح', fallbackLabel ?? url); }
  } catch {
    Alert.alert('تعذّر الفتح', fallbackLabel ?? url);
  }
}

const LEVELS = ['براعم', 'مستوى أول', 'مستوى ثاني'];
const ROLES_LIST = ['معلمة', 'معلم', 'مساعدة معلمة', 'إشراف', 'إدارة', 'مستقبلة', 'أخصائي'];
const LEVEL_COLORS: Record<string, string> = {
  'مستوى ثاني': '#3B82F6',
  'مستوى أول': '#10B981',
  'براعم': '#F59E0B',
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

type Segment = 'teachers' | 'students' | 'classes';

export default function ManagementScreen() {
  const insets = useSafeAreaInsets();
  const { students, employees, addEmployee, removeEmployee, updateEmployee, addStudent, removeStudent } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [segment, setSegment] = useState<Segment>('teachers');
  const [search, setSearch] = useState('');
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Employee | null>(null);

  const teachers = useMemo(() => employees.filter(e =>
    e.name.includes(search) || e.role.includes(search)
  ), [employees, search]);

  const filteredStudents = useMemo(() => students.filter(s =>
    s.name.includes(search) || s.level.includes(search) || s.parentName.includes(search)
  ), [students, search]);

  const classes = useMemo(() => LEVELS.map(level => ({
    level,
    teacher: employees.find(e => e.level === level),
    students: students.filter(s => s.level === level),
    avgAttendance: students.filter(s => s.level === level).length > 0
      ? Math.round(students.filter(s => s.level === level).reduce((s, st) => s + st.attendance, 0) / students.filter(s => s.level === level).length)
      : 0,
  })), [employees, students]);

  const totalTeachers = employees.filter(e => e.role.includes('معلمة')).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient
        colors={['#111444', '#1a1f5c', '#252b7a']}
        style={[styles.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{employees.length}</Text>
              <Text style={styles.miniStatLbl}>موظف</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{totalTeachers}</Text>
              <Text style={styles.miniStatLbl}>معلمة</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{students.length}</Text>
              <Text style={styles.miniStatLbl}>طالب</Text>
            </View>
          </View>
          <View style={styles.headerTitle}>
            <Text style={styles.titleText}>لوحة الإدارة</Text>
            <Text style={styles.titleSub}>روضة أحباب الله — الخاصة</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={styles.certBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(admin)/certificates'); }}
              >
                <MaterialCommunityIcons name="certificate" size={14} color="#fcd34d" />
                <Text style={styles.certBtnText}>الشهادات</Text>
              </Pressable>
              <Pressable
                style={[styles.certBtn, { backgroundColor: 'rgba(200,160,40,0.2)', borderColor: 'rgba(200,160,40,0.5)' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(admin)/id-cards'); }}
              >
                <MaterialCommunityIcons name="card-account-details" size={14} color="#f0d060" />
                <Text style={[styles.certBtnText, { color: '#f0d060' }]}>البطاقات</Text>
              </Pressable>
              <Pressable
                style={[styles.certBtn, { backgroundColor: 'rgba(13,124,74,0.2)', borderColor: 'rgba(13,124,74,0.5)' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(admin)/transport'); }}
              >
                <MaterialCommunityIcons name="bus-school" size={14} color="#68D89A" />
                <Text style={[styles.certBtnText, { color: '#68D89A' }]}>الترحيل</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
            </Pressable>
          )}
        </View>

        <View style={styles.segmentRow}>
          {[
            { key: 'teachers', label: 'المعلمات', icon: 'school' },
            { key: 'students', label: 'الطلاب', icon: 'people' },
            { key: 'classes', label: 'الفصول', icon: 'albums' },
          ].map(s => (
            <Pressable
              key={s.key}
              style={[styles.segBtn, segment === s.key && styles.segBtnActive]}
              onPress={() => { setSegment(s.key as Segment); setSearch(''); }}
            >
              <Ionicons name={s.icon as any} size={14} color={segment === s.key ? '#111444' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.segBtnText, segment === s.key && styles.segBtnTextActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {segment === 'teachers' && (
        <TeachersSection
          teachers={teachers}
          onAdd={() => { setEditingEmployee(null); setShowAddTeacher(true); }}
          onEdit={e => { setEditingEmployee(e); setShowAddTeacher(true); }}
          onView={e => setViewingTeacher(e)}
          onDelete={id => {
            Alert.alert('حذف موظف', 'هل أنت متأكد من حذف هذا الموظف؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'حذف', style: 'destructive', onPress: () => { removeEmployee(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
            ]);
          }}
        />
      )}

      {segment === 'students' && (
        <StudentsSection
          students={filteredStudents}
          onAdd={() => { setEditingStudent(null); setShowAddStudent(true); }}
          onEdit={s => { setEditingStudent(s); setShowAddStudent(true); }}
          onView={s => setViewingStudent(s)}
          onDelete={id => {
            Alert.alert('حذف طالب', 'هل أنت متأكد من حذف هذا الطالب؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'حذف', style: 'destructive', onPress: () => { removeStudent(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
            ]);
          }}
        />
      )}

      {segment === 'classes' && (
        <ClassesSection classes={classes} />
      )}

      <AddEmployeeModal
        visible={showAddTeacher}
        editing={editingEmployee}
        onClose={() => { setShowAddTeacher(false); setEditingEmployee(null); }}
        onSave={data => {
          if (editingEmployee) {
            updateEmployee(editingEmployee.id, data);
          } else {
            addEmployee({ id: genId(), daysPresent: 22, daysAbsent: 0, email: '', password: '1234', ...data } as Employee);
          }
          setShowAddTeacher(false);
          setEditingEmployee(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <AddStudentModal
        visible={showAddStudent}
        editing={editingStudent}
        onClose={() => { setShowAddStudent(false); setEditingStudent(null); }}
        onSave={data => {
          if (editingStudent) {
            removeStudent(editingStudent.id);
            addStudent({ ...editingStudent, ...data });
          } else {
            addStudent({
              id: genId(), attendance: 100, behavior: 'ممتاز', homework: 'منجز',
              notes: '', grades: [], dailyReports: [], assessments: [], ...data,
            } as Student);
          }
          setShowAddStudent(false);
          setEditingStudent(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <StudentProfileSheet student={viewingStudent} onClose={() => setViewingStudent(null)} />
      <TeacherProfileSheet teacher={viewingTeacher} onClose={() => setViewingTeacher(null)} />
    </View>
  );
}

function TeachersSection({ teachers, onAdd, onEdit, onView, onDelete }: {
  teachers: Employee[];
  onAdd: () => void;
  onEdit: (e: Employee) => void;
  onView: (e: Employee) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={teachers}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable style={styles.addBtn} onPress={onAdd}>
            <LinearGradient colors={['#ca9928', '#b8841c']} style={styles.addBtnGrad}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>إضافة معلمة / موظف جديد</Text>
            </LinearGradient>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا يوجد موظفون</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onView(item)}>
            <View style={styles.cardActions}>
              <Pressable onPress={() => onDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => onEdit(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.cardRight}>
              <HexFrame size={48} fill={item.level ? LEVEL_COLORS[item.level] ?? Colors.primary : Colors.primary} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}>
                <MaterialCommunityIcons name="account" size={22} color="#fff" />
              </HexFrame>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.role}{item.level ? ` — ${item.level}` : ''}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaChip}>
                    <Ionicons name="call-outline" size={11} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{item.phone || '—'}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="wallet-outline" size={11} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{item.salary.toLocaleString()} ج.س</Text>
                  </View>
                </View>
                <View style={styles.viewFileBadge}>
                  <Ionicons name="document-text-outline" size={11} color={Colors.primary} />
                  <Text style={styles.viewFileText}>عرض الملف الوظيفي</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function StudentsSection({ students, onAdd, onEdit, onView, onDelete }: {
  students: Student[];
  onAdd: () => void;
  onEdit: (s: Student) => void;
  onView: (s: Student) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={students}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 2 }}>
            <Pressable style={styles.addBtn} onPress={onAdd}>
              <LinearGradient colors={['#ca9928', '#b8841c']} style={styles.addBtnGrad}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>إضافة طالب جديد</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={styles.exportBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(admin)/export'); }}
            >
              <MaterialCommunityIcons name="printer" size={18} color={Colors.primary} />
              <Text style={styles.exportBtnText}>تصدير وطباعة القائمة</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-school-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا يوجد طلاب</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onView(item)}>
            <View style={styles.cardActions}>
              <Pressable onPress={() => onDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => onEdit(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.cardRight}>
              <HexFrame size={48} fill={LEVEL_COLORS[item.level] ?? '#8B5CF6'} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}>
                <MaterialCommunityIcons name="account-school" size={22} color="#fff" />
              </HexFrame>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>ولي الأمر: {item.parentName}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[item.level] ?? '#8B5CF6') + '20' }]}>
                    <Text style={[styles.levelBadgeText, { color: LEVEL_COLORS[item.level] ?? '#8B5CF6' }]}>{item.level}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="stats-chart-outline" size={11} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>حضور {item.attendance}%</Text>
                  </View>
                </View>
                <View style={styles.viewFileBadge}>
                  <Ionicons name="document-text-outline" size={11} color='#8B5CF6' />
                  <Text style={[styles.viewFileText, { color: '#8B5CF6' }]}>عرض الملف الأكاديمي</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function ClassesSection({ classes }: {
  classes: { level: string; teacher?: Employee; students: Student[]; avgAttendance: number }[];
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}>
      {classes.map(cls => (
        <View key={cls.level} style={styles.classCard}>
          <View style={styles.classHeader}>
            <View style={[styles.classBadge, { backgroundColor: LEVEL_COLORS[cls.level] + '20' }]}>
              <Text style={[styles.classBadgeText, { color: LEVEL_COLORS[cls.level] }]}>{cls.students.length} طالب</Text>
            </View>
            <Text style={[styles.classTitle, { color: LEVEL_COLORS[cls.level] ?? Colors.primary }]}>{cls.level}</Text>
          </View>

          <View style={styles.classRow}>
            <View style={styles.classInfo}>
              <Ionicons name="person" size={14} color={Colors.textSecondary} />
              <Text style={styles.classInfoText}>
                {cls.teacher ? cls.teacher.name : 'لم تُعيَّن معلمة'}
              </Text>
            </View>
            <View style={styles.classInfo}>
              <Ionicons name="stats-chart" size={14} color={Colors.textSecondary} />
              <Text style={styles.classInfoText}>متوسط الحضور {cls.avgAttendance}%</Text>
            </View>
          </View>

          <View style={styles.attendanceBar}>
            <View style={[styles.attendanceFill, {
              width: `${cls.avgAttendance}%` as any,
              backgroundColor: cls.avgAttendance >= 90 ? '#10B981' : cls.avgAttendance >= 75 ? '#F59E0B' : Colors.danger,
            }]} />
          </View>

          {cls.students.length > 0 && (
            <View style={styles.studentChips}>
              {cls.students.slice(0, 3).map(s => (
                <View key={s.id} style={styles.studentChip}>
                  <Text style={styles.studentChipText}>{s.name.split(' ')[0]}</Text>
                </View>
              ))}
              {cls.students.length > 3 && (
                <View style={[styles.studentChip, { backgroundColor: Colors.border }]}>
                  <Text style={styles.studentChipText}>+{cls.students.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function AddEmployeeModal({ visible, editing, onClose, onSave }: {
  visible: boolean;
  editing: Employee | null;
  onClose: () => void;
  onSave: (data: Partial<Employee>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [role, setRole] = useState('معلمة');
  const [level, setLevel] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [salary, setSalary] = useState('');

  React.useEffect(() => {
    if (editing) {
      setName(editing.name); setRole(editing.role);
      setLevel(editing.level ?? ''); setPhone(editing.phone);
      setEmail(editing.email ?? ''); setPassword(editing.password ?? '1234');
      setSalary(String(editing.salary));
    } else {
      setName(''); setRole('معلمة'); setLevel(''); setPhone('');
      setEmail(''); setPassword('1234'); setSalary('');
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال الاسم'); return; }
    onSave({ name: name.trim(), role, level: level || undefined, phone: phone.trim(), email: email.trim().toLowerCase(), password: password || '1234', salary: Number(salary) || 0 });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseTxt}>إلغاء</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{editing ? 'تعديل موظف' : 'إضافة معلمة / موظف'}</Text>
          <Pressable onPress={handleSave} style={styles.modalSaveBtn}>
            <Text style={styles.modalSaveTxt}>حفظ</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>الاسم الكامل *</Text>
          <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="مثال: أ. نورة أحمد" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={styles.fieldLabel}>المسمى الوظيفي</Text>
          <View style={styles.pillRow}>
            {ROLES_LIST.map(r => (
              <Pressable key={r} style={[styles.pill, role === r && styles.pillActive]} onPress={() => setRole(r)}>
                <Text style={[styles.pillText, role === r && styles.pillTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>الفصل (إن وجد)</Text>
          <View style={styles.pillRow}>
            {['', ...LEVELS].map(l => (
              <Pressable key={l} style={[styles.pill, level === l && styles.pillActive]} onPress={() => setLevel(l)}>
                <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l || 'بدون فصل'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>رقم الهاتف</Text>
          <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} placeholder="+249 XXX XXX XXX" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" textAlign="right" />

          <Text style={styles.fieldLabel}>البريد الإلكتروني (لتسجيل الدخول)</Text>
          <TextInput style={styles.fieldInput} value={email} onChangeText={setEmail} placeholder="example@ahbaballah.edu" placeholderTextColor={Colors.textLight} keyboardType="email-address" autoCapitalize="none" textAlign="right" />

          <Text style={styles.fieldLabel}>كلمة المرور</Text>
          <TextInput style={styles.fieldInput} value={password} onChangeText={setPassword} placeholder="1234" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={styles.fieldLabel}>الراتب (ج.س)</Text>
          <TextInput style={styles.fieldInput} value={salary} onChangeText={setSalary} placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="numeric" textAlign="right" />
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const BEHAVIORS: Student['behavior'][] = ['ممتاز', 'جيد', 'مقبول', 'يحتاج متابعة'];
const HOMEWORKS: Student['homework'][] = ['منجز', 'ناقص', 'لم ينجز'];
const BEHAVIOR_COLORS: Record<string, string> = { 'ممتاز': '#10B981', 'جيد': '#3B82F6', 'مقبول': '#F59E0B', 'يحتاج متابعة': Colors.danger };
const HOMEWORK_COLORS: Record<string, string> = { 'منجز': '#10B981', 'ناقص': '#F59E0B', 'لم ينجز': Colors.danger };

function AddStudentModal({ visible, editing, onClose, onSave }: {
  visible: boolean;
  editing: Student | null;
  onClose: () => void;
  onSave: (data: Partial<Student>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('مستوى أول');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState('100');
  const [behavior, setBehavior] = useState<Student['behavior']>('ممتاز');
  const [homework, setHomework] = useState<Student['homework']>('منجز');

  React.useEffect(() => {
    if (editing) {
      setName(editing.name); setLevel(editing.level);
      setParentName(editing.parentName); setParentPhone(editing.parentPhone ?? '');
      setNotes(editing.notes); setAttendance(String(editing.attendance));
      setBehavior(editing.behavior); setHomework(editing.homework);
    } else {
      setName(''); setLevel('مستوى أول'); setParentName(''); setParentPhone('');
      setNotes(''); setAttendance('100'); setBehavior('ممتاز'); setHomework('منجز');
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال اسم الطالب'); return; }
    if (!parentName.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال اسم ولي الأمر'); return; }
    const att = Math.min(100, Math.max(0, Number(attendance) || 0));
    onSave({ name: name.trim(), level, parentName: parentName.trim(), parentPhone: parentPhone.trim(), notes: notes.trim(), attendance: att, behavior, homework });
  };

  const attNum = Math.min(100, Math.max(0, Number(attendance) || 0));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseTxt}>إلغاء</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{editing ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</Text>
          <Pressable onPress={handleSave} style={styles.modalSaveBtn}>
            <Text style={styles.modalSaveTxt}>حفظ</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>اسم الطالب *</Text>
          <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="مثال: محمد علي سعد" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={styles.fieldLabel}>المرحلة الدراسية</Text>
          <View style={styles.pillRow}>
            {LEVELS.map(l => (
              <Pressable key={l} style={[styles.pill, level === l && styles.pillActive]} onPress={() => setLevel(l)}>
                <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>اسم ولي الأمر *</Text>
          <TextInput style={styles.fieldInput} value={parentName} onChangeText={setParentName} placeholder="مثال: علي سعد الأحمد" placeholderTextColor={Colors.textLight} textAlign="right" />

          <Text style={styles.fieldLabel}>هاتف ولي الأمر</Text>
          <TextInput style={styles.fieldInput} value={parentPhone} onChangeText={setParentPhone} placeholder="+249 XXX XXX XXX" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" textAlign="right" />

          <Text style={styles.fieldLabel}>نسبة الحضور (%)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Pressable
              style={[styles.pill, { paddingHorizontal: 16, paddingVertical: 8 }]}
              onPress={() => setAttendance(String(Math.max(0, attNum - 1)))}
            >
              <Text style={[styles.pillText, { fontSize: 18 }]}>−</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={{ height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <View style={{ height: 8, width: `${attNum}%` as any, backgroundColor: attNum >= 90 ? Colors.success : attNum >= 75 ? '#F59E0B' : Colors.danger, borderRadius: 4 }} />
              </View>
              <TextInput
                style={[styles.fieldInput, { marginBottom: 0, textAlign: 'center', paddingVertical: 8 }]}
                value={attendance} onChangeText={setAttendance}
                keyboardType="numeric" placeholder="100"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <Pressable
              style={[styles.pill, { paddingHorizontal: 16, paddingVertical: 8 }]}
              onPress={() => setAttendance(String(Math.min(100, attNum + 1)))}
            >
              <Text style={[styles.pillText, { fontSize: 18 }]}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>السلوك</Text>
          <View style={styles.pillRow}>
            {BEHAVIORS.map(b => (
              <Pressable
                key={b}
                style={[styles.pill, behavior === b && { backgroundColor: BEHAVIOR_COLORS[b], borderColor: BEHAVIOR_COLORS[b] }]}
                onPress={() => setBehavior(b)}
              >
                <Text style={[styles.pillText, behavior === b && styles.pillTextActive]}>{b}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>الواجبات</Text>
          <View style={styles.pillRow}>
            {HOMEWORKS.map(h => (
              <Pressable
                key={h}
                style={[styles.pill, homework === h && { backgroundColor: HOMEWORK_COLORS[h], borderColor: HOMEWORK_COLORS[h] }]}
                onPress={() => setHomework(h)}
              >
                <Text style={[styles.pillText, homework === h && styles.pillTextActive]}>{h}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>ملاحظات</Text>
          <TextInput
            style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            value={notes} onChangeText={setNotes}
            placeholder="أي ملاحظات عن الطالب..."
            placeholderTextColor={Colors.textLight}
            textAlign="right" multiline
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const MOOD_ICONS: Record<string, string> = { 'سعيد': '😊', 'نشيط': '⚡', 'هادئ': '😌', 'متحمس': '🌟', 'حزين': '😢', 'تعبان': '😔' };
const ASSESSMENT_LEVEL_COLORS: Record<string, string> = { 'مبتدئ': Colors.danger, 'متوسط': '#F59E0B', 'متقدم': '#3B82F6', 'ممتاز': '#10B981' };
const PROFILE_TABS = ['نظرة عامة', 'الدرجات', 'التقارير', 'التقييمات'] as const;

function StudentProfileSheet({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { updateStudent } = useAppData();
  const [activeTab, setActiveTab] = useState<typeof PROFILE_TABS[number]>('نظرة عامة');

  React.useEffect(() => {
    if (student) setActiveTab('نظرة عامة');
  }, [student]);

  if (!student) return null;

  const avgGrade = student.grades.length > 0
    ? Math.round(student.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / student.grades.length)
    : 0;
  const levelColor = LEVEL_COLORS[student.level] ?? '#8B5CF6';
  const behColor = student.behavior === 'ممتاز' ? '#10B981' : student.behavior === 'جيد' ? '#3B82F6' : student.behavior === 'مقبول' ? '#F59E0B' : Colors.danger;
  const hwColor = student.homework === 'منجز' ? '#10B981' : student.homework === 'ناقص' ? '#F59E0B' : Colors.danger;
  const attColor = student.attendance >= 90 ? '#10B981' : student.attendance >= 75 ? '#F59E0B' : Colors.danger;

  const tabBadges: Record<string, number | null> = {
    'نظرة عامة': null,
    'الدرجات': student.grades.length || null,
    'التقارير': student.dailyReports.length || null,
    'التقييمات': student.assessments?.length || null,
  };

  return (
    <Modal visible={!!student} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[pStyles.container, { paddingTop: insets.top + 8 }]}>
        {/* ── Gradient Header ── */}
        <LinearGradient colors={['#1a0a3c', '#3d1a6e', levelColor]} style={pStyles.profileHeader}>
          <Pressable onPress={onClose} style={pStyles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </Pressable>
          <HexFrame size={86} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.45)" strokeWidth={2} style={{ marginBottom: 10 }}>
            <MaterialCommunityIcons name="account-school" size={40} color="#fff" />
          </HexFrame>
          <Text style={pStyles.profileName}>{student.name}</Text>
          <View style={pStyles.profileBadgeRow}>
            <View style={[pStyles.profileBadge, { backgroundColor: levelColor }]}>
              <Text style={pStyles.profileBadgeText}>{student.level}</Text>
            </View>
            <View style={[pStyles.profileBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={pStyles.profileBadgeText}>ولي الأمر: {student.parentName}</Text>
            </View>
          </View>
          <View style={pStyles.headerStats}>
            <View style={pStyles.headerStat}>
              <Text style={[pStyles.headerStatVal, { color: attColor }]}>{student.attendance}%</Text>
              <Text style={pStyles.headerStatLbl}>الحضور</Text>
            </View>
            <View style={pStyles.headerStatDivider} />
            <View style={pStyles.headerStat}>
              <Text style={pStyles.headerStatVal}>{avgGrade > 0 ? `${avgGrade}%` : '—'}</Text>
              <Text style={pStyles.headerStatLbl}>المعدل</Text>
            </View>
            <View style={pStyles.headerStatDivider} />
            <View style={pStyles.headerStat}>
              <Text style={pStyles.headerStatVal}>{student.grades.length}</Text>
              <Text style={pStyles.headerStatLbl}>مواد</Text>
            </View>
            <View style={pStyles.headerStatDivider} />
            <View style={pStyles.headerStat}>
              <Text style={pStyles.headerStatVal}>{student.dailyReports.length}</Text>
              <Text style={pStyles.headerStatLbl}>تقرير</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Tab Bar ── */}
        <View style={pStyles.tabBar}>
          {PROFILE_TABS.map(tab => (
            <Pressable
              key={tab}
              style={[pStyles.tabBtn, activeTab === tab && { borderBottomColor: levelColor, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[pStyles.tabBtnTxt, activeTab === tab && { color: levelColor, fontFamily: 'Inter_700Bold' }]}>{tab}</Text>
              {tabBadges[tab] ? (
                <View style={[pStyles.tabBadge, { backgroundColor: levelColor }]}>
                  <Text style={pStyles.tabBadgeTxt}>{tabBadges[tab]}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        {/* ── Tab Content ── */}
        <ScrollView style={pStyles.body} showsVerticalScrollIndicator={false} key={activeTab}>

          {/* ══ TAB: نظرة عامة ══ */}
          {activeTab === 'نظرة عامة' && (
            <>
              {/* Contact Card */}
              <View style={pStyles.section}>
                <Text style={pStyles.sectionTitle}>معلومات ولي الأمر</Text>
                <View style={pStyles.contactBlock}>
                  <View style={pStyles.contactLine}>
                    <Text style={pStyles.contactVal}>{student.parentName}</Text>
                    <View style={pStyles.contactIcon}>
                      <Ionicons name="person" size={16} color={Colors.primary} />
                    </View>
                  </View>
                  {student.parentPhone ? (
                    <Pressable
                      style={pStyles.contactLine}
                      onPress={() => openLink(`tel:${student.parentPhone}`, `الاتصال بـ ${student.parentName}: ${student.parentPhone}`)}
                    >
                      <Text style={[pStyles.contactVal, { color: '#3B82F6' }]}>{student.parentPhone}</Text>
                      <View style={[pStyles.contactIcon, { backgroundColor: '#3B82F620' }]}>
                        <Ionicons name="call" size={16} color="#3B82F6" />
                      </View>
                    </Pressable>
                  ) : null}
                  <View style={pStyles.contactLine}>
                    <Text style={pStyles.contactVal}>{student.level}</Text>
                    <View style={[pStyles.contactIcon, { backgroundColor: levelColor + '20' }]}>
                      <Ionicons name="school" size={16} color={levelColor} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Attendance */}
              <View style={pStyles.section}>
                <Text style={pStyles.sectionTitle}>نسبة الحضور</Text>
                <View style={pStyles.attendanceRow}>
                  <Text style={[pStyles.attendancePct, { color: attColor }]}>{student.attendance}%</Text>
                  <View style={{ flex: 1 }}>
                    <View style={pStyles.attendanceBarBg}>
                      <View style={[pStyles.attendanceBarFill, { width: `${student.attendance}%` as any, backgroundColor: attColor }]} />
                    </View>
                    <Text style={pStyles.attendanceHint}>
                      {student.attendance >= 90 ? 'حضور ممتاز' : student.attendance >= 75 ? 'حضور جيد' : 'يحتاج متابعة'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Behavior & Homework */}
              <View style={pStyles.statusRow}>
                <View style={[pStyles.statusCard, { borderColor: behColor + '40' }]}>
                  <MaterialCommunityIcons name="emoticon-outline" size={22} color={behColor} style={{ marginBottom: 4 }} />
                  <Text style={[pStyles.statusVal, { color: behColor }]}>{student.behavior}</Text>
                  <Text style={pStyles.statusLbl}>السلوك</Text>
                </View>
                <View style={[pStyles.statusCard, { borderColor: hwColor + '40' }]}>
                  <MaterialCommunityIcons name="notebook-check-outline" size={22} color={hwColor} style={{ marginBottom: 4 }} />
                  <Text style={[pStyles.statusVal, { color: hwColor }]}>{student.homework}</Text>
                  <Text style={pStyles.statusLbl}>الواجبات</Text>
                </View>
              </View>

              {/* Notes */}
              <View style={pStyles.section}>
                <Text style={pStyles.sectionTitle}>ملاحظات المعلمة</Text>
                <View style={pStyles.notesBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} style={{ marginLeft: 8 }} />
                  <Text style={pStyles.notesTxt}>{student.notes || 'لا توجد ملاحظات مسجّلة'}</Text>
                </View>
              </View>

              {/* Parent Account Management */}
              <View style={pStyles.section}>
                <Text style={pStyles.sectionTitle}>حساب ولي الأمر</Text>
                {!student.parentPhone ? (
                  <View style={pStyles.accountEmptyBox}>
                    <Ionicons name="person-remove-outline" size={20} color={Colors.textLight} />
                    <Text style={pStyles.accountEmptyTxt}>لم يُسجَّل حساب لولي الأمر</Text>
                  </View>
                ) : (
                  <View style={pStyles.accountBox}>
                    <View style={pStyles.accountStatusRow}>
                      <View style={[pStyles.accountStatusBadge,
                        { backgroundColor: student.parentDisabled ? '#FEF2F2' : '#ECFDF5' }]}>
                        <View style={[pStyles.accountStatusDot,
                          { backgroundColor: student.parentDisabled ? Colors.danger : '#10B981' }]} />
                        <Text style={[pStyles.accountStatusTxt,
                          { color: student.parentDisabled ? Colors.danger : '#10B981' }]}>
                          {student.parentDisabled ? 'موقوف' : 'نشط'}
                        </Text>
                      </View>
                      <Text style={pStyles.accountInfo}>{student.parentPhone}</Text>
                    </View>

                    <Pressable
                      style={[pStyles.accountActionBtn,
                        { backgroundColor: student.parentDisabled ? '#ECFDF5' : '#FEF2F2',
                          borderColor: student.parentDisabled ? '#10B981' : Colors.danger }]}
                      onPress={() => {
                        const action = student.parentDisabled ? 'تفعيل' : 'إيقاف';
                        const msg = student.parentDisabled
                          ? `هل تريد تفعيل دخول ولي أمر ${student.name}؟`
                          : `هل تريد إيقاف دخول ولي أمر ${student.name}؟ لن يتمكن من تسجيل الدخول.`;
                        Alert.alert(`${action} الحساب`, msg, [
                          { text: 'إلغاء', style: 'cancel' },
                          { text: action, style: student.parentDisabled ? 'default' : 'destructive',
                            onPress: () => {
                              updateStudent(student.id, { parentDisabled: !student.parentDisabled });
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }},
                        ]);
                      }}
                    >
                      <Ionicons
                        name={student.parentDisabled ? 'lock-open-outline' : 'lock-closed-outline'}
                        size={16}
                        color={student.parentDisabled ? '#10B981' : Colors.danger}
                      />
                      <Text style={[pStyles.accountActionTxt,
                        { color: student.parentDisabled ? '#10B981' : Colors.danger }]}>
                        {student.parentDisabled ? 'تفعيل تسجيل الدخول' : 'إيقاف تسجيل الدخول'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[pStyles.accountActionBtn,
                        { backgroundColor: '#FFF7ED', borderColor: '#F59E0B', marginTop: 8 }]}
                      onPress={() => {
                        Alert.alert('حذف بيانات الحساب', `سيتم حذف رقم هاتف ولي أمر ${student.name} وبياناته بالكامل. لن يتمكن من الدخول مجدداً حتى يُعاد تسجيله.`, [
                          { text: 'إلغاء', style: 'cancel' },
                          { text: 'حذف البيانات', style: 'destructive',
                            onPress: () => {
                              updateStudent(student.id, {
                                parentPhone: '',
                                parentName: student.parentName,
                                parentPassword: '',
                                parentDisabled: false,
                              });
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            }},
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#F59E0B" />
                      <Text style={[pStyles.accountActionTxt, { color: '#D97706' }]}>حذف بيانات الحساب</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ══ TAB: الدرجات ══ */}
          {activeTab === 'الدرجات' && (
            <>
              {student.grades.length === 0 ? (
                <View style={pStyles.emptyTab}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={Colors.textLight} />
                  <Text style={pStyles.emptyTabTxt}>لم تُسجَّل درجات بعد</Text>
                </View>
              ) : (
                <>
                  {/* Summary */}
                  <View style={[pStyles.section, { flexDirection: 'row', gap: 10 }]}>
                    <View style={pStyles.gradeSumCard}>
                      <Text style={[pStyles.gradeSumVal, { color: avgGrade >= 90 ? '#10B981' : avgGrade >= 75 ? '#3B82F6' : '#F59E0B' }]}>{avgGrade}%</Text>
                      <Text style={pStyles.gradeSumLbl}>المعدل العام</Text>
                    </View>
                    <View style={pStyles.gradeSumCard}>
                      <Text style={[pStyles.gradeSumVal, { color: Colors.primary }]}>{student.grades.length}</Text>
                      <Text style={pStyles.gradeSumLbl}>عدد المواد</Text>
                    </View>
                    <View style={pStyles.gradeSumCard}>
                      <Text style={[pStyles.gradeSumVal, { color: '#10B981' }]}>
                        {student.grades.filter(g => (g.score / g.total) * 100 >= 90).length}
                      </Text>
                      <Text style={pStyles.gradeSumLbl}>ممتاز</Text>
                    </View>
                  </View>
                  <View style={pStyles.section}>
                    {student.grades.map((g, i) => {
                      const pct = Math.round((g.score / g.total) * 100);
                      const gc = pct >= 90 ? '#10B981' : pct >= 75 ? '#3B82F6' : pct >= 60 ? '#F59E0B' : Colors.danger;
                      return (
                        <View key={i} style={pStyles.gradeRow}>
                          <View style={[pStyles.gradeScore, { backgroundColor: gc + '15', borderColor: gc + '30' }]}>
                            <Text style={[pStyles.gradeScoreTxt, { color: gc }]}>{g.score}/{g.total}</Text>
                          </View>
                          <View style={pStyles.gradeInfo}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={pStyles.gradeDate}>{g.date}</Text>
                              <Text style={pStyles.gradeSubject}>{g.subject}</Text>
                            </View>
                            <View style={pStyles.gradeBarBg}>
                              <View style={[pStyles.gradeBarFill, { width: `${pct}%` as any, backgroundColor: gc }]} />
                            </View>
                          </View>
                          <Text style={[pStyles.gradePct, { color: gc }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          {/* ══ TAB: التقارير اليومية ══ */}
          {activeTab === 'التقارير' && (
            <>
              {student.dailyReports.length === 0 ? (
                <View style={pStyles.emptyTab}>
                  <MaterialCommunityIcons name="calendar-text-outline" size={48} color={Colors.textLight} />
                  <Text style={pStyles.emptyTabTxt}>لا توجد تقارير يومية</Text>
                </View>
              ) : (
                <View style={pStyles.section}>
                  <Text style={pStyles.sectionTitle}>جميع التقارير ({student.dailyReports.length})</Text>
                  {[...student.dailyReports].reverse().map((r, i) => (
                    <View key={i} style={pStyles.reportCard}>
                      <View style={pStyles.reportHeader}>
                        <Text style={pStyles.reportMood}>{MOOD_ICONS[r.mood] ?? '😊'} {r.mood}</Text>
                        <Text style={pStyles.reportDate}>{r.date}</Text>
                      </View>
                      <View style={pStyles.reportRow}>
                        <Text style={pStyles.reportVal}>{r.ate}</Text>
                        <Text style={pStyles.reportKey}>🍱 الوجبة</Text>
                      </View>
                      <View style={pStyles.reportRow}>
                        <Text style={pStyles.reportVal}>{r.learned}</Text>
                        <Text style={pStyles.reportKey}>📚 تعلّم</Text>
                      </View>
                      <View style={[pStyles.reportRow, { borderBottomWidth: 0 }]}>
                        <Text style={pStyles.reportVal}>{r.behaviorNote}</Text>
                        <Text style={pStyles.reportKey}>✨ السلوك</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ══ TAB: التقييمات ══ */}
          {activeTab === 'التقييمات' && (
            <>
              {(!student.assessments || student.assessments.length === 0) ? (
                <View style={pStyles.emptyTab}>
                  <MaterialCommunityIcons name="star-outline" size={48} color={Colors.textLight} />
                  <Text style={pStyles.emptyTabTxt}>لم يُجرَ تقييم لهذا الطالب بعد</Text>
                  <Text style={pStyles.emptyTabSub}>يمكن للمعلمة إجراء تقييم من شاشة الدرجات ← التقييمات</Text>
                </View>
              ) : (
                <View style={pStyles.section}>
                  <Text style={pStyles.sectionTitle}>سجل التقييمات ({student.assessments.length})</Text>
                  {[...student.assessments].reverse().map((a, i) => {
                    const lvlColor = ASSESSMENT_LEVEL_COLORS[a.levelLabel] ?? Colors.primary;
                    const totalPct = Math.round((a.totalScore / a.totalMax) * 100);
                    return (
                      <View key={i} style={[pStyles.assessCard, { borderColor: lvlColor + '30' }]}>
                        <View style={pStyles.assessHeader}>
                          <View style={[pStyles.assessBadge, { backgroundColor: lvlColor + '18', borderColor: lvlColor + '40' }]}>
                            <Text style={[pStyles.assessBadgeTxt, { color: lvlColor }]}>{a.levelLabel}</Text>
                          </View>
                          <Text style={pStyles.assessDate}>{a.date}</Text>
                        </View>
                        <View style={pStyles.assessScoreRow}>
                          <Text style={[pStyles.assessTotal, { color: lvlColor }]}>{totalPct}%</Text>
                          <View style={{ flex: 1 }}>
                            <View style={pStyles.attendanceBarBg}>
                              <View style={[pStyles.attendanceBarFill, { width: `${totalPct}%` as any, backgroundColor: lvlColor }]} />
                            </View>
                          </View>
                          <Text style={pStyles.assessScore}>{a.totalScore}/{a.totalMax}</Text>
                        </View>
                        <View style={pStyles.assessBreakdown}>
                          <View style={pStyles.assessSubject}>
                            <Text style={pStyles.assessSubLbl}>الحروف</Text>
                            <Text style={pStyles.assessSubVal}>{a.lettersScore}/{a.lettersMax}</Text>
                          </View>
                          <View style={pStyles.assessSubject}>
                            <Text style={pStyles.assessSubLbl}>الأرقام</Text>
                            <Text style={pStyles.assessSubVal}>{a.numbersScore}/{a.numbersMax}</Text>
                          </View>
                          <View style={pStyles.assessSubject}>
                            <Text style={pStyles.assessSubLbl}>الحساب</Text>
                            <Text style={pStyles.assessSubVal}>{a.mathScore}/{a.mathMax}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const ATT_STATUS_META = {
  'حاضر':  { color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle' as const },
  'غائب':  { color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle' as const },
  'متأخر': { color: '#F59E0B', bg: '#FFFBEB', icon: 'time' as const },
  'إجازة': { color: '#3B82F6', bg: '#EFF6FF', icon: 'calendar' as const },
};
const WARN_META = {
  'تنبيه': { color: '#F59E0B', bg: '#FFFBEB', icon: 'alert-circle-outline' as const },
  'إنذار': { color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' as const },
  'إيقاف': { color: '#7C3AED', bg: '#F5F3FF', icon: 'ban-outline' as const },
};

function TeacherProfileSheet({ teacher: teacherProp, onClose }: { teacher: Employee | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { employees, updateEmployee, removeEmployee } = useAppData();
  const [activeTab, setActiveTab] = useState<'نظرة عامة' | 'الحضور' | 'الإنذارات' | 'الحساب'>('نظرة عامة');
  const [showAttForm, setShowAttForm] = useState(false);
  const [attStatus, setAttStatus] = useState<AttendanceRecord['status']>('حاضر');
  const [attNote, setAttNote] = useState('');
  const [showWarnForm, setShowWarnForm] = useState(false);
  const [warnType, setWarnType] = useState<EmployeeWarning['type']>('تنبيه');
  const [warnReason, setWarnReason] = useState('');
  const [warnDuration, setWarnDuration] = useState('');

  React.useEffect(() => {
    if (teacherProp) { setActiveTab('نظرة عامة'); setShowAttForm(false); setShowWarnForm(false); }
  }, [teacherProp?.id]);

  if (!teacherProp) return null;
  const teacher = employees.find(e => e.id === teacherProp.id) ?? teacherProp;
  const records = teacher.attendanceRecords ?? [];
  const warnings = teacher.warnings ?? [];
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date === today);
  const presentCount = records.length > 0 ? records.filter(r => r.status === 'حاضر').length : teacher.daysPresent;
  const absentCount  = records.length > 0 ? records.filter(r => r.status === 'غائب').length  : teacher.daysAbsent;
  const lateCount    = records.filter(r => r.status === 'متأخر').length;
  const leaveCount   = records.filter(r => r.status === 'إجازة').length;
  const totalDays    = records.length > 0 ? records.length : teacher.daysPresent + teacher.daysAbsent;
  const attendanceRate = totalDays > 0
    ? Math.round(((presentCount + lateCount * 0.5) / totalDays) * 100)
    : 100;
  const levelColor = teacher.level ? LEVEL_COLORS[teacher.level] ?? Colors.primary : Colors.primary;

  const handleMarkAttendance = () => {
    if (todayRecord) { Alert.alert('تنبيه', 'تم تسجيل الحضور لهذا اليوم مسبقاً'); return; }
    const rec: AttendanceRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: today, status: attStatus, note: attNote.trim() || undefined,
    };
    updateEmployee(teacher.id, {
      attendanceRecords: [rec, ...records],
      daysPresent: attStatus === 'حاضر' ? teacher.daysPresent + 1 : teacher.daysPresent,
      daysAbsent:  attStatus === 'غائب'  ? teacher.daysAbsent  + 1 : teacher.daysAbsent,
    });
    setShowAttForm(false); setAttNote(''); setAttStatus('حاضر');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddWarning = () => {
    if (!warnReason.trim()) { Alert.alert('تنبيه', 'يرجى إدخال سبب الإجراء'); return; }
    const w: EmployeeWarning = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type: warnType, reason: warnReason.trim(), date: today,
      duration: warnDuration.trim() || undefined,
    };
    const updates: Partial<Employee> = { warnings: [w, ...warnings] };
    if (warnType === 'إيقاف') updates.disabled = true;
    updateEmployee(teacher.id, updates);
    setShowWarnForm(false); setWarnReason(''); setWarnDuration(''); setWarnType('تنبيه');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const TABS = [
    { key: 'نظرة عامة' as const, icon: 'person-outline' as const, badge: 0 },
    { key: 'الحضور'    as const, icon: 'calendar-outline' as const, badge: records.length },
    { key: 'الإنذارات' as const, icon: 'warning-outline' as const,  badge: warnings.length },
    { key: 'الحساب'    as const, icon: 'shield-outline' as const,    badge: 0 },
  ];

  return (
    <Modal visible={!!teacherProp} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[pStyles.container, { paddingTop: insets.top + 8 }]}>

        {/* ── Header ── */}
        <LinearGradient colors={['#040b3c', '#0c1155', levelColor]} style={pStyles.profileHeader}>
          <Pressable onPress={onClose} style={pStyles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </Pressable>
          <HexFrame size={86} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.45)" strokeWidth={2} style={{ marginBottom: 10 }}>
            <MaterialCommunityIcons name="account-tie" size={40} color="#fff" />
          </HexFrame>
          <Text style={pStyles.profileName}>{teacher.name}</Text>
          <View style={pStyles.profileBadgeRow}>
            <View style={[pStyles.profileBadge, { backgroundColor: Colors.accent + 'CC' }]}>
              <Text style={pStyles.profileBadgeText}>{teacher.role}</Text>
            </View>
            {teacher.level && (
              <View style={[pStyles.profileBadge, { backgroundColor: levelColor }]}>
                <Text style={pStyles.profileBadgeText}>فصل {teacher.level}</Text>
              </View>
            )}
            {teacher.disabled && (
              <View style={[pStyles.profileBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={pStyles.profileBadgeText}>موقوف</Text>
              </View>
            )}
          </View>
          <View style={pStyles.headerStats}>
            <View style={pStyles.headerStat}>
              <Text style={pStyles.headerStatVal}>{attendanceRate}%</Text>
              <Text style={pStyles.headerStatLbl}>الانتظام</Text>
            </View>
            <View style={pStyles.headerStatDivider} />
            <View style={pStyles.headerStat}>
              <Text style={[pStyles.headerStatVal, warnings.length > 0 && { color: '#FCA5A5' }]}>{warnings.length}</Text>
              <Text style={pStyles.headerStatLbl}>الإنذارات</Text>
            </View>
            <View style={pStyles.headerStatDivider} />
            <View style={pStyles.headerStat}>
              <Text style={pStyles.headerStatVal}>{teacher.salary.toLocaleString()}</Text>
              <Text style={pStyles.headerStatLbl}>الراتب ج.س</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Tab Bar ── */}
        <View style={pStyles.tabBar}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[pStyles.tabBtn, activeTab === t.key && { borderBottomColor: levelColor, borderBottomWidth: 2.5 }]}
              onPress={() => { setActiveTab(t.key); setShowAttForm(false); setShowWarnForm(false); }}
            >
              <Ionicons name={t.icon} size={13} color={activeTab === t.key ? levelColor : Colors.textSecondary} />
              <Text style={[pStyles.tabBtnTxt, activeTab === t.key && { color: levelColor, fontFamily: 'Inter_700Bold' }]}>{t.key}</Text>
              {t.badge > 0 && (
                <View style={[pStyles.tabBadge, { backgroundColor: t.key === 'الإنذارات' ? Colors.danger : levelColor }]}>
                  <Text style={pStyles.tabBadgeTxt}>{t.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <ScrollView style={pStyles.body} showsVerticalScrollIndicator={false} key={activeTab}>

          {/* ══ TAB: نظرة عامة ══ */}
          {activeTab === 'نظرة عامة' && (
            <>
              <View style={pStyles.section}>
                <Text style={pStyles.sectionTitle}>معلومات التواصل</Text>
                <Pressable style={pStyles.contactRow} onPress={() => teacher.phone ? openLink(`tel:${teacher.phone}`, `الاتصال بـ ${teacher.name}: ${teacher.phone}`) : null}>
                  <View style={[pStyles.contactIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="call" size={20} color="#10B981" />
                  </View>
                  <View style={pStyles.contactInfo}>
                    <Text style={pStyles.contactLabel}>رقم الهاتف</Text>
                    <Text style={pStyles.contactVal}>{teacher.phone || 'غير مسجل'}</Text>
                  </View>
                  {teacher.phone && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
                </Pressable>
                <View style={[pStyles.contactRow, { marginTop: 8 }]}>
                  <View style={[pStyles.contactIcon, { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons name="mail-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={pStyles.contactInfo}>
                    <Text style={pStyles.contactLabel}>البريد الإلكتروني</Text>
                    <Text style={pStyles.contactVal}>{teacher.email || 'غير مسجل'}</Text>
                  </View>
                </View>
              </View>
              <View style={pStyles.section}>
                <Text style={pStyles.sectionTitle}>المرتب الشهري</Text>
                <View style={pStyles.salaryCard}>
                  <LinearGradient colors={['#040b3c', '#0c1155']} style={pStyles.salaryGrad}>
                    <Text style={pStyles.salaryLabel}>إجمالي المرتب</Text>
                    <Text style={pStyles.salaryVal}>{teacher.salary.toLocaleString()} <Text style={pStyles.salaryCurrency}>ج.س</Text></Text>
                  </LinearGradient>
                </View>
              </View>
            </>
          )}

          {/* ══ TAB: الحضور ══ */}
          {activeTab === 'الحضور' && (
            <>
              <View style={pStyles.section}>
                <View style={pStyles.sectionHeaderRow}>
                  <Pressable
                    style={[pStyles.addBtn, { backgroundColor: todayRecord ? Colors.surfaceAlt : levelColor }]}
                    onPress={() => { if (!todayRecord) setShowAttForm(!showAttForm); }}
                  >
                    <Ionicons name={todayRecord ? 'checkmark-circle' : 'add'} size={14} color={todayRecord ? levelColor : '#fff'} />
                    <Text style={[pStyles.addBtnTxt, { color: todayRecord ? levelColor : '#fff' }]}>
                      {todayRecord ? `مسجَّل: ${todayRecord.status}` : 'تسجيل حضور اليوم'}
                    </Text>
                  </Pressable>
                  <Text style={pStyles.sectionTitle}>الإحصائيات</Text>
                </View>

                {/* Inline attendance form */}
                {showAttForm && !todayRecord && (
                  <View style={pStyles.inlineForm}>
                    <Text style={pStyles.inlineFormTitle}>تسجيل يوم {today}</Text>
                    <View style={pStyles.attStatusRow}>
                      {(['حاضر', 'غائب', 'متأخر', 'إجازة'] as const).map(s => (
                        <Pressable
                          key={s}
                          style={[pStyles.attStatusBtn, attStatus === s && { backgroundColor: ATT_STATUS_META[s].bg, borderColor: ATT_STATUS_META[s].color }]}
                          onPress={() => setAttStatus(s)}
                        >
                          <Ionicons name={ATT_STATUS_META[s].icon} size={14} color={attStatus === s ? ATT_STATUS_META[s].color : Colors.textSecondary} />
                          <Text style={[pStyles.attStatusTxt, attStatus === s && { color: ATT_STATUS_META[s].color }]}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={pStyles.inlineInput}
                      placeholder="ملاحظة (اختياري)"
                      value={attNote}
                      onChangeText={setAttNote}
                      textAlign="right"
                      placeholderTextColor={Colors.textLight}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={[pStyles.formBtn, { flex: 1, backgroundColor: Colors.surfaceAlt }]} onPress={() => setShowAttForm(false)}>
                        <Text style={pStyles.formBtnCancel}>إلغاء</Text>
                      </Pressable>
                      <Pressable style={[pStyles.formBtn, { flex: 2, backgroundColor: levelColor }]} onPress={handleMarkAttendance}>
                        <Text style={pStyles.formBtnConfirm}>تسجيل</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Stats grid */}
                <View style={pStyles.attStatsGrid}>
                  <View style={[pStyles.attStatCard, { backgroundColor: '#ECFDF5', borderColor: '#10B98120' }]}>
                    <Text style={[pStyles.attStatVal, { color: '#10B981' }]}>{presentCount}</Text>
                    <Text style={pStyles.attStatLbl}>حاضر</Text>
                  </View>
                  <View style={[pStyles.attStatCard, { backgroundColor: '#FEF2F2', borderColor: '#EF444420' }]}>
                    <Text style={[pStyles.attStatVal, { color: '#EF4444' }]}>{absentCount}</Text>
                    <Text style={pStyles.attStatLbl}>غائب</Text>
                  </View>
                  <View style={[pStyles.attStatCard, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B20' }]}>
                    <Text style={[pStyles.attStatVal, { color: '#F59E0B' }]}>{lateCount}</Text>
                    <Text style={pStyles.attStatLbl}>متأخر</Text>
                  </View>
                  <View style={[pStyles.attStatCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F620' }]}>
                    <Text style={[pStyles.attStatVal, { color: '#3B82F6' }]}>{leaveCount}</Text>
                    <Text style={pStyles.attStatLbl}>إجازة</Text>
                  </View>
                </View>
                <View style={pStyles.attendanceRow}>
                  <Text style={[pStyles.attendancePct, { color: attendanceRate >= 90 ? '#10B981' : '#F59E0B' }]}>{attendanceRate}%</Text>
                  <View style={{ flex: 1 }}>
                    <View style={pStyles.attendanceBarBg}>
                      <View style={[pStyles.attendanceBarFill, { width: `${attendanceRate}%` as any, backgroundColor: attendanceRate >= 90 ? '#10B981' : '#F59E0B' }]} />
                    </View>
                    <Text style={pStyles.attendanceHint}>{attendanceRate >= 90 ? 'انتظام ممتاز' : attendanceRate >= 75 ? 'انتظام جيد' : 'يحتاج متابعة'}</Text>
                  </View>
                </View>
              </View>

              {/* Records list */}
              {records.length > 0 ? (
                <View style={pStyles.section}>
                  <Text style={pStyles.sectionTitle}>سجل الحضور التفصيلي</Text>
                  {records.slice(0, 30).map(r => {
                    const meta = ATT_STATUS_META[r.status];
                    return (
                      <View key={r.id} style={pStyles.attRecord}>
                        <View style={[pStyles.attRecordBadge, { backgroundColor: meta.bg }]}>
                          <Ionicons name={meta.icon} size={13} color={meta.color} />
                          <Text style={[pStyles.attRecordStatus, { color: meta.color }]}>{r.status}</Text>
                        </View>
                        <Text style={pStyles.attRecordNote} numberOfLines={1}>{r.note || ''}</Text>
                        <Text style={pStyles.attRecordDate}>{r.date}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={pStyles.emptyTab}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.textLight} />
                  <Text style={pStyles.emptyTabTxt}>لم يُسجَّل أي سجل حضور بعد</Text>
                  <Text style={pStyles.emptyTabSub}>اضغط على "تسجيل حضور اليوم" للبدء</Text>
                </View>
              )}
            </>
          )}

          {/* ══ TAB: الإنذارات ══ */}
          {activeTab === 'الإنذارات' && (
            <>
              <View style={pStyles.section}>
                <View style={pStyles.sectionHeaderRow}>
                  <Pressable
                    style={[pStyles.addBtn, { backgroundColor: Colors.danger }]}
                    onPress={() => setShowWarnForm(!showWarnForm)}
                  >
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={[pStyles.addBtnTxt, { color: '#fff' }]}>إضافة إجراء</Text>
                  </Pressable>
                  <Text style={pStyles.sectionTitle}>ملخص الإجراءات</Text>
                </View>

                {/* Inline warning form */}
                {showWarnForm && (
                  <View style={pStyles.inlineForm}>
                    <Text style={pStyles.inlineFormTitle}>إجراء تأديبي لـ {teacher.name}</Text>
                    <View style={pStyles.warnTypeRow}>
                      {(['تنبيه', 'إنذار', 'إيقاف'] as const).map(t => {
                        const m = WARN_META[t];
                        return (
                          <Pressable
                            key={t}
                            style={[pStyles.warnTypeBtn, warnType === t && { backgroundColor: m.bg, borderColor: m.color }]}
                            onPress={() => setWarnType(t)}
                          >
                            <Ionicons name={m.icon} size={15} color={warnType === t ? m.color : Colors.textSecondary} />
                            <Text style={[pStyles.warnTypeTxt, warnType === t && { color: m.color, fontFamily: 'Inter_700Bold' }]}>{t}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      style={[pStyles.inlineInput, { minHeight: 72, textAlignVertical: 'top' }]}
                      placeholder="سبب الإجراء (مطلوب)"
                      value={warnReason}
                      onChangeText={setWarnReason}
                      multiline
                      textAlign="right"
                      placeholderTextColor={Colors.textLight}
                    />
                    {warnType === 'إيقاف' && (
                      <>
                        <TextInput
                          style={pStyles.inlineInput}
                          placeholder="مدة الإيقاف — مثال: 3 أيام"
                          value={warnDuration}
                          onChangeText={setWarnDuration}
                          textAlign="right"
                          placeholderTextColor={Colors.textLight}
                        />
                        <View style={pStyles.warnNotice}>
                          <Ionicons name="information-circle-outline" size={13} color={Colors.danger} />
                          <Text style={pStyles.warnNoticeTxt}>سيتم تعطيل حساب الموظف تلقائياً عند الإيقاف</Text>
                        </View>
                      </>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={[pStyles.formBtn, { flex: 1, backgroundColor: Colors.surfaceAlt }]} onPress={() => { setShowWarnForm(false); setWarnReason(''); setWarnDuration(''); }}>
                        <Text style={pStyles.formBtnCancel}>إلغاء</Text>
                      </Pressable>
                      <Pressable style={[pStyles.formBtn, { flex: 2, backgroundColor: WARN_META[warnType].color }]} onPress={handleAddWarning}>
                        <Text style={pStyles.formBtnConfirm}>إصدار {warnType}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Summary stats */}
                <View style={pStyles.warnSummaryRow}>
                  {(['تنبيه', 'إنذار', 'إيقاف'] as const).map(t => {
                    const m = WARN_META[t];
                    const count = warnings.filter(w => w.type === t).length;
                    return (
                      <View key={t} style={[pStyles.warnSummaryCard, { backgroundColor: m.bg, borderColor: m.color + '30' }]}>
                        <Text style={[pStyles.warnSummaryVal, { color: m.color }]}>{count}</Text>
                        <Text style={pStyles.warnSummaryLbl}>{t}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Warnings list */}
              {warnings.length === 0 ? (
                <View style={pStyles.emptyTab}>
                  <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
                  <Text style={pStyles.emptyTabTxt}>لا توجد إجراءات تأديبية</Text>
                  <Text style={pStyles.emptyTabSub}>سجل نظيف للموظف</Text>
                </View>
              ) : (
                <View style={pStyles.section}>
                  <Text style={pStyles.sectionTitle}>سجل الإجراءات التأديبية</Text>
                  {warnings.map(w => {
                    const m = WARN_META[w.type];
                    return (
                      <View key={w.id} style={[pStyles.warnCard, { borderColor: m.color + '30', borderLeftColor: m.color }]}>
                        <View style={pStyles.warnCardHeader}>
                          <Text style={pStyles.warnCardDate}>{w.date}</Text>
                          <View style={[pStyles.warnBadge, { backgroundColor: m.bg }]}>
                            <Ionicons name={m.icon} size={11} color={m.color} />
                            <Text style={[pStyles.warnBadgeTxt, { color: m.color }]}>{w.type}</Text>
                          </View>
                        </View>
                        <Text style={pStyles.warnCardReason}>{w.reason}</Text>
                        {w.duration && <Text style={[pStyles.warnCardDuration, { color: m.color }]}>المدة: {w.duration}</Text>}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ══ TAB: الحساب ══ */}
          {activeTab === 'الحساب' && (
            <View style={pStyles.section}>
              <Text style={pStyles.sectionTitle}>إدارة الحساب</Text>
              <View style={pStyles.accountBox}>
                <View style={pStyles.accountStatusRow}>
                  <View style={[pStyles.accountStatusBadge, { backgroundColor: teacher.disabled ? '#FEF2F2' : '#ECFDF5' }]}>
                    <View style={[pStyles.accountStatusDot, { backgroundColor: teacher.disabled ? '#EF4444' : '#10B981' }]} />
                    <Text style={[pStyles.accountStatusTxt, { color: teacher.disabled ? '#EF4444' : '#10B981' }]}>
                      {teacher.disabled ? 'موقوف' : 'نشط'}
                    </Text>
                  </View>
                  <Text style={pStyles.accountInfo}>{teacher.email || teacher.role}</Text>
                </View>
                <Pressable
                  style={[pStyles.accountActionBtn, { backgroundColor: teacher.disabled ? '#ECFDF5' : '#FEF2F2', borderColor: teacher.disabled ? '#10B981' : '#EF4444' }]}
                  onPress={() => {
                    const action = teacher.disabled ? 'تفعيل' : 'إيقاف';
                    Alert.alert(`${action} الحساب`,
                      teacher.disabled ? `هل تريد تفعيل دخول ${teacher.name}؟` : `هل تريد إيقاف دخول ${teacher.name}؟`,
                      [{ text: 'إلغاء', style: 'cancel' },
                       { text: action, style: teacher.disabled ? 'default' : 'destructive',
                         onPress: () => { updateEmployee(teacher.id, { disabled: !teacher.disabled }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}]);
                  }}
                >
                  <Ionicons name={teacher.disabled ? 'lock-open-outline' : 'lock-closed-outline'} size={16} color={teacher.disabled ? '#10B981' : '#EF4444'} />
                  <Text style={[pStyles.accountActionTxt, { color: teacher.disabled ? '#10B981' : '#EF4444' }]}>
                    {teacher.disabled ? 'تفعيل تسجيل الدخول' : 'إيقاف تسجيل الدخول'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[pStyles.accountActionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444', marginTop: 8 }]}
                  onPress={() => Alert.alert('حذف الحساب', `سيتم حذف حساب ${teacher.name} بالكامل من النظام.`,
                    [{ text: 'إلغاء', style: 'cancel' },
                     { text: 'حذف', style: 'destructive', onPress: () => { removeEmployee(teacher.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onClose(); }}])}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={[pStyles.accountActionTxt, { color: '#EF4444' }]}>حذف الحساب من النظام</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const pStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileHeader: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-end', padding: 8, marginBottom: 8 },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 10,
  },
  profileName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  profileBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  profileBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  profileBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  headerStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, gap: 0 },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatVal: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerStatLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4 },
  body: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.textSecondary, marginBottom: 12, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  statusCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5 },
  statusVal: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  statusLbl: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  attendancePct: { fontSize: 18, fontFamily: 'Inter_700Bold', width: 48, textAlign: 'right' },
  attendanceBarBg: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  attendanceBarFill: { height: 8, borderRadius: 4 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  gradeInfo: { flex: 1 },
  gradeSubject: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  gradeScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, minWidth: 52, alignItems: 'center' },
  gradeScoreTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  gradeBarBg: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  gradeBarFill: { height: 4, borderRadius: 2 },
  gradePct: { fontSize: 12, fontFamily: 'Inter_600SemiBold', width: 36, textAlign: 'left' },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reportDate: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  reportMood: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text },
  reportRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 4 },
  reportKey: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  reportVal: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.text, flex: 1, textAlign: 'right' },
  notesBox: { flexDirection: 'row', backgroundColor: '#F0F4FF', borderRadius: 12, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: Colors.primary + '20' },
  notesTxt: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 20, textAlign: 'right' },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.borderLight },
  contactIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, alignItems: 'flex-end' },
  contactLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  contactVal: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginTop: 2 },
  attendanceGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  attendanceGridCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  attendanceGridVal: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  attendanceGridLbl: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 4 },
  salaryCard: { borderRadius: 18, overflow: 'hidden' },
  salaryGrad: { padding: 20, alignItems: 'center' },
  salaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  salaryVal: { fontSize: 36, fontFamily: 'Inter_700Bold', color: Colors.accent },
  salaryCurrency: { fontSize: 16, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },

  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 5, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 18, alignItems: 'center' },
  tabBadgeTxt: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff' },

  contactBlock: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  contactLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight + '80' },

  attendanceHint: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 4 },

  emptyTab: { alignItems: 'center', paddingVertical: 60, gap: 12, paddingHorizontal: 20 },
  emptyTabTxt: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'center' },
  emptyTabSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },

  gradeSumCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  gradeSumVal: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  gradeSumLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  gradeDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },

  assessCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5 },
  assessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  assessBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  assessBadgeTxt: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  assessDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  assessScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  assessTotal: { fontSize: 18, fontFamily: 'Inter_700Bold', width: 44 },
  assessScore: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, width: 44, textAlign: 'right' },
  assessBreakdown: { flexDirection: 'row', gap: 8 },
  assessSubject: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 10, alignItems: 'center' },
  assessSubLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginBottom: 3 },
  assessSubVal: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },

  accountBox: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderLight, gap: 0 },
  accountEmptyBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14 },
  accountEmptyTxt: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  accountStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  accountStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  accountStatusDot: { width: 7, height: 7, borderRadius: 4 },
  accountStatusTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  accountInfo: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, flex: 1, textAlign: 'right' },
  accountActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 11, borderWidth: 1 },
  accountActionTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  inlineForm: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 14, gap: 10, borderWidth: 1, borderColor: Colors.borderLight },
  inlineFormTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 2 },
  inlineInput: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text },
  formBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10 },
  formBtnCancel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  formBtnConfirm: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },

  attStatusRow: { flexDirection: 'row', gap: 8 },
  attStatusBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderLight },
  attStatusTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  attStatsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  attStatCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  attStatVal: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  attStatLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },

  attRecord: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight + '60' },
  attRecordBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  attRecordStatus: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  attRecordNote: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right' },
  attRecordDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, minWidth: 80, textAlign: 'right' },

  warnSummaryRow: { flexDirection: 'row', gap: 10 },
  warnSummaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  warnSummaryVal: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  warnSummaryLbl: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  warnTypeRow: { flexDirection: 'row', gap: 8 },
  warnTypeBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderLight },
  warnTypeTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  warnNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 },
  warnNoticeTxt: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.danger, textAlign: 'right' },

  warnCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3 },
  warnCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  warnCardDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  warnBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  warnBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  warnCardReason: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', lineHeight: 20 },
  warnCardDuration: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 4, textAlign: 'right' },
});

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerTitle: { flex: 1, alignItems: 'flex-end' },
  titleText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  titleSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(252,211,77,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, borderWidth: 1, borderColor: 'rgba(252,211,77,0.3)' },
  certBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fcd34d' },
  headerStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#ca9928' },
  miniStatLbl: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  miniStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  searchInput: { flex: 1, height: 40, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#fff', paddingHorizontal: 8 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  segBtnActive: { backgroundColor: '#ca9928' },
  segBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.75)' },
  segBtnTextActive: { color: '#111444', fontFamily: 'Inter_600SemiBold' },
  listContent: { padding: 16, gap: 10 },
  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary + '30' },
  exportBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.borderLight },
  cardRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  cardName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 2 },
  cardSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metaText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardActions: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  classCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  classHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  classTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  classBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  classBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  classInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  classInfoText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  attendanceBar: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  attendanceFill: { height: 6, borderRadius: 3 },
  studentChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  studentChip: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  studentChipText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text },
  modalCloseBtn: { padding: 4 },
  modalCloseTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.danger },
  modalSaveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  modalSaveTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  modalBody: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  fieldInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 18, borderWidth: 1, borderColor: Colors.border },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 18 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },
  viewFileBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  viewFileText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.primary },
});
