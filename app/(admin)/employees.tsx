import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Employee } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

function EmployeeCard({ emp }: { emp: Employee }) {
  const salaryCalc = Math.round((emp.salary / 22) * emp.daysPresent);
  const deduction = emp.salary - salaryCalc;
  return (
    <View style={[styles.empCard, { borderRightColor: Colors.primary }]}>
      <View style={styles.empRow}>
        <View style={styles.empAvatar}>
          <Text style={styles.empAvatarText}>{emp.name.charAt(0)}</Text>
        </View>
        <View style={styles.empInfo}>
          <Text style={styles.empName}>{emp.name}</Text>
          <Text style={styles.empRole}>{emp.role}</Text>
        </View>
        <View style={styles.empSalary}>
          <Text style={styles.empSalaryValue}>{emp.salary.toLocaleString('ar-SA')}</Text>
          <Text style={styles.empSalaryLabel}>ج.س</Text>
        </View>
      </View>
      <View style={styles.empStats}>
        <View style={[styles.empStat, { backgroundColor: '#ECFDF5' }]}>
          <MaterialCommunityIcons name="calendar-check" size={14} color={Colors.success} />
          <Text style={[styles.empStatText, { color: Colors.success }]}>{emp.daysPresent} حضور</Text>
        </View>
        <View style={[styles.empStat, { backgroundColor: '#FEF2F2' }]}>
          <MaterialCommunityIcons name="calendar-remove" size={14} color={Colors.danger} />
          <Text style={[styles.empStatText, { color: Colors.danger }]}>{emp.daysAbsent} غياب</Text>
        </View>
        <View style={[styles.empStat, { backgroundColor: '#EFF6FF' }]}>
          <MaterialCommunityIcons name="cash" size={14} color="#3B82F6" />
          <Text style={[styles.empStatText, { color: '#3B82F6' }]}>
            {deduction > 0 ? `-${deduction.toLocaleString('ar-SA')}` : 'بدون خصم'}
          </Text>
        </View>
      </View>
      <View style={styles.payrollRow}>
        <Text style={styles.payrollLabel}>الراتب المستحق هذا الشهر:</Text>
        <Text style={styles.payrollValue}>{salaryCalc.toLocaleString('ar-SA')} ج.س</Text>
      </View>
    </View>
  );
}

export default function EmployeesScreen() {
  const insets = useSafeAreaInsets();
  const { employees, addEmployee } = useAppData();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;
  const filtered = employees.filter(e =>
    e.name.includes(search) || e.role.includes(search)
  );

  const handleAdd = () => {
    if (!newName || !newRole || !newSalary) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    addEmployee({
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      salary: parseInt(newSalary),
      daysPresent: 0,
      daysAbsent: 0,
      phone: newPhone,
      email: '',
      password: '1234',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setNewName(''); setNewRole(''); setNewSalary(''); setNewPhone('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>المعلمات</Text>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{employees.length}</Text>
            <Text style={styles.summaryLabel}>موظف</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {employees.reduce((a, e) => a + e.salary, 0).toLocaleString('ar-SA')}
            </Text>
            <Text style={styles.summaryLabel}>إجمالي الرواتب</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <View style={styles.listContent}>
          {filtered.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-search" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>لا توجد نتائج</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>إضافة موظف جديد</Text>
            {[
              { label: 'الاسم الكامل *', val: newName, set: setNewName, placeholder: 'اسم الموظف' },
              { label: 'المسمى الوظيفي *', val: newRole, set: setNewRole, placeholder: 'معلمة / مساعدة...' },
              { label: 'الراتب الشهري (ج.س) *', val: newSalary, set: setNewSalary, placeholder: '5000', keyboard: 'numeric' as const },
              { label: 'رقم الجوال', val: newPhone, set: setNewPhone, placeholder: '05xxxxxxxx', keyboard: 'phone-pad' as const },
            ].map(f => (
              <View key={f.label} style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textLight}
                  value={f.val}
                  onChangeText={f.set}
                  textAlign="right"
                  keyboardType={f.keyboard}
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalBtnCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={handleAdd}>
                <Text style={styles.modalBtnConfirmText}>إضافة</Text>
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
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#FFFFFF' },
  summaryRow: { flexDirection: 'row', gap: 16 },
  summaryItem: { alignItems: 'flex-end' },
  summaryValue: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.accent },
  summaryLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  empCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderRightWidth: 4 },
  empRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  empAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary + '18', borderWidth: 1.5, borderColor: Colors.primary + '40', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  empAvatarText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.primary },
  empInfo: { flex: 1, alignItems: 'flex-end' },
  empName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  empRole: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  empSalary: { alignItems: 'center' },
  empSalaryValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.primary },
  empSalaryLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  empStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  empStat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  empStatText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  payrollRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  payrollLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  payrollValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.success },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  modalField: { marginBottom: 14 },
  modalFieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
  modalInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  modalBtnConfirm: { backgroundColor: Colors.primary },
  modalBtnConfirmText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
