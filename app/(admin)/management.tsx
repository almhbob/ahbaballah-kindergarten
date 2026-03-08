import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, ScrollView, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Employee, Student } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const LEVELS = ['Nursery', 'KG1', 'KG2'];
const ROLES_LIST = ['معلمة', 'مساعدة معلمة', 'مستقبلة', 'إداري', 'أخصائي'];
const LEVEL_COLORS: Record<string, string> = {
  'KG2': '#3B82F6',
  'KG1': '#10B981',
  'Nursery': '#F59E0B',
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
            { key: 'teachers', label: 'المعلمون', icon: 'school' },
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
            addEmployee({ id: genId(), daysPresent: 22, daysAbsent: 0, ...data } as Employee);
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
            // Students don't have a standalone update so we use addStudent pattern
            removeStudent(editingStudent.id);
            addStudent({ ...editingStudent, ...data });
          } else {
            addStudent({
              id: genId(), attendance: 100, behavior: 'ممتاز', homework: 'منجز',
              notes: '', grades: [], dailyReports: [], ...data,
            } as Student);
          }
          setShowAddStudent(false);
          setEditingStudent(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

function TeachersSection({ teachers, onAdd, onEdit, onDelete }: {
  teachers: Employee[];
  onAdd: () => void;
  onEdit: (e: Employee) => void;
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
          <View style={styles.card}>
            <View style={styles.cardActions}>
              <Pressable onPress={() => onDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => onEdit(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.cardRight}>
              <View style={[styles.avatarCircle, { backgroundColor: item.level ? LEVEL_COLORS[item.level] ?? Colors.primary : Colors.primary }]}>
                <MaterialCommunityIcons name="account" size={22} color="#fff" />
              </View>
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
                    <Text style={styles.metaText}>{item.salary.toLocaleString()} ر.س</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function StudentsSection({ students, onAdd, onEdit, onDelete }: {
  students: Student[];
  onAdd: () => void;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={students}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable style={styles.addBtn} onPress={onAdd}>
            <LinearGradient colors={['#ca9928', '#b8841c']} style={styles.addBtnGrad}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>إضافة طالب جديد</Text>
            </LinearGradient>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-school-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا يوجد طلاب</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardActions}>
              <Pressable onPress={() => onDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => onEdit(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.cardRight}>
              <View style={[styles.avatarCircle, { backgroundColor: LEVEL_COLORS[item.level] ?? '#8B5CF6' }]}>
                <MaterialCommunityIcons name="account-school" size={22} color="#fff" />
              </View>
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
              </View>
            </View>
          </View>
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
  const [salary, setSalary] = useState('');

  React.useEffect(() => {
    if (editing) {
      setName(editing.name); setRole(editing.role);
      setLevel(editing.level ?? ''); setPhone(editing.phone);
      setSalary(String(editing.salary));
    } else {
      setName(''); setRole('معلمة'); setLevel(''); setPhone(''); setSalary('');
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال الاسم'); return; }
    onSave({ name: name.trim(), role, level: level || undefined, phone: phone.trim(), salary: Number(salary) || 0 });
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

          <Text style={styles.fieldLabel}>الراتب (ر.س)</Text>
          <TextInput style={styles.fieldInput} value={salary} onChangeText={setSalary} placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="numeric" textAlign="right" />
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddStudentModal({ visible, editing, onClose, onSave }: {
  visible: boolean;
  editing: Student | null;
  onClose: () => void;
  onSave: (data: Partial<Student>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('KG1');
  const [parentName, setParentName] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (editing) {
      setName(editing.name); setLevel(editing.level);
      setParentName(editing.parentName); setNotes(editing.notes);
    } else {
      setName(''); setLevel('KG1'); setParentName(''); setNotes('');
    }
  }, [editing, visible]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال اسم الطالب'); return; }
    if (!parentName.trim()) { Alert.alert('تنبيه', 'الرجاء إدخال اسم ولي الأمر'); return; }
    onSave({ name: name.trim(), level, parentName: parentName.trim(), notes: notes.trim() });
  };

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

          <Text style={styles.fieldLabel}>ملاحظات</Text>
          <TextInput
            style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            value={notes} onChangeText={setNotes}
            placeholder="أي ملاحظات عن الطالب..."
            placeholderTextColor={Colors.textLight}
            textAlign="right" multiline
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerTitle: { flex: 1, alignItems: 'flex-end' },
  titleText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  titleSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
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
});
