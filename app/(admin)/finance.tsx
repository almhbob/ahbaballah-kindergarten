import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Student, Expense, ExpenseCategory } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';
import { notifyPaymentReminder, getAllTokensByRole, sendToTokens } from '@/lib/push-service';

const LEVEL_FEES: Record<string, number> = {
  'براعم':       8000,
  'مستوى أول': 10000,
  'مستوى ثاني': 12000,
};

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const { employees, students, updateStudent, expenses, addExpense, removeExpense } = useAppData();
  const [activeTab, setActiveTab] = useState<'fees' | 'payroll' | 'expenses'>('fees');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('إيجار');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const FEES = useMemo(() => students.map(s => {
    const total = LEVEL_FEES[s.level] ?? 10000;
    const paid = s.paidFees ?? 0;
    const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    const status = paid >= total ? 'مسدد' as const : paid > 0 ? 'جزئي' as const : 'متأخر' as const;
    return { id: s.id, studentName: s.name, level: s.level, total, paid, pct, status, student: s };
  }), [students]);

  const totalFees = FEES.reduce((a, f) => a + f.total, 0);
  const collectedFees = FEES.reduce((a, f) => a + f.paid, 0);
  const pendingFees = totalFees - collectedFees;
  const totalPayroll = employees.reduce((a, e) => a + e.salary, 0);

  const statusColor = { 'مسدد': Colors.success, 'جزئي': Colors.warning, 'متأخر': Colors.danger };
  const statusBg = { 'مسدد': '#ECFDF5', 'جزئي': '#FFFBEB', 'متأخر': '#FEF2F2' };

  function openPayModal(s: Student) {
    setEditingStudent(s);
    const total = LEVEL_FEES[s.level] ?? 10000;
    const remaining = total - (s.paidFees ?? 0);
    setPayAmount(remaining > 0 ? String(remaining) : '');
    setPayNote('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const EXPENSE_CATEGORIES: ExpenseCategory[] = ['إيجار', 'كهرباء', 'ماء', 'مستلزمات', 'صيانة', 'رواتب إضافية', 'أخرى'];
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);

  function handleSaveExpense() {
    const amount = parseInt(expAmount);
    if (!expDesc.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('تنبيه', 'يرجى ملء الوصف والمبلغ بشكل صحيح');
      return;
    }
    addExpense({ id: `exp_${Date.now()}`, category: expCategory, description: expDesc.trim(), amount, date: new Date().toISOString().split('T')[0] });
    setExpDesc(''); setExpAmount(''); setExpCategory('إيجار');
    setShowExpenseModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSavePayment() {
    if (!editingStudent) return;
    const amount = parseInt(payAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('تنبيه', 'الرجاء إدخال مبلغ صحيح');
      return;
    }
    const total = LEVEL_FEES[editingStudent.level] ?? 10000;
    const newPaid = Math.min(total, amount);
    const remaining = total - newPaid;
    updateStudent(editingStudent.id, { paidFees: newPaid });
    if (remaining > 0) {
      notifyPaymentReminder({
        studentId: editingStudent.id,
        studentName: editingStudent.name,
        remaining,
        totalFees: total,
      }).catch(() => {});
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingStudent(null);
  }

  async function handleSendFeeReminders() {
    const overdue = FEES.filter(f => f.status === 'متأخر' || f.status === 'جزئي');
    if (overdue.length === 0) {
      Alert.alert('لا يوجد', 'جميع الرسوم مسددة');
      return;
    }
    const parentTokens = await getAllTokensByRole('parent');
    if (parentTokens.length === 0) {
      Alert.alert('تنبيه', `سيتم إرسال التذكير لـ ${overdue.length} طالب عند اتصالهم بالتطبيق`);
      return;
    }
    await sendToTokens({
      tokens: parentTokens,
      title: '💳 تذكير بالرسوم الدراسية',
      body: `يُرجى مراجعة رسوم أبنائكم — ${overdue.length} طالب لديهم رسوم متبقية`,
      data: { type: 'fee_reminder' },
    });
    Alert.alert('تم الإرسال', `تم إرسال تذكير الرسوم لـ ${parentTokens.length} ولي أمر`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleResetFees(studentId: string, name: string) {
    Alert.alert(
      'إعادة تعيين الرسوم',
      `هل تريد إعادة تعيين رسوم "${name}" إلى صفر؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد', style: 'destructive',
          onPress: () => {
            updateStudent(studentId, { paidFees: 0 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>الإدارة المالية</Text>
        <View style={styles.balanceCards}>
          <View style={styles.balanceCard}>
            <MaterialCommunityIcons name="cash-check" size={20} color={Colors.success} />
            <Text style={styles.balanceValue}>{collectedFees.toLocaleString('ar-SA')}</Text>
            <Text style={styles.balanceLabel}>محصّل (ج.س)</Text>
          </View>
          <View style={[styles.balanceCard, styles.balanceCardMain]}>
            <MaterialCommunityIcons name="bank" size={24} color={Colors.accent} />
            <Text style={[styles.balanceValue, { fontSize: 22 }]}>{totalFees.toLocaleString('ar-SA')}</Text>
            <Text style={styles.balanceLabel}>إجمالي الرسوم</Text>
          </View>
          <View style={styles.balanceCard}>
            <MaterialCommunityIcons name="clock-alert" size={20} color={Colors.danger} />
            <Text style={styles.balanceValue}>{pendingFees.toLocaleString('ar-SA')}</Text>
            <Text style={styles.balanceLabel}>متأخر (ج.س)</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {[
            { id: 'fees', label: 'الرسوم' },
            { id: 'payroll', label: 'الرواتب' },
            { id: 'expenses', label: 'المصاريف' },
          ].map(t => (
            <Pressable
              key={t.id}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t.id as any); }}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
          {activeTab === 'fees' && (
            <Pressable style={styles.reminderBtn} onPress={handleSendFeeReminders}>
              <Ionicons name="notifications-outline" size={15} color={Colors.accent} />
              <Text style={styles.reminderBtnText}>تذكير</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <View style={styles.body}>
          {activeTab === 'fees' ? (
            <>
              {FEES.length === 0 && (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="cash-remove" size={44} color={Colors.textLight} />
                  <Text style={styles.emptyTxt}>لا توجد بيانات طلاب</Text>
                </View>
              )}
              {FEES.map(fee => (
                <View key={fee.id} style={[styles.feeCard, { borderRightColor: statusColor[fee.status] }]}>
                  <View style={styles.feeHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg[fee.status] }]}>
                      <Text style={[styles.statusText, { color: statusColor[fee.status] }]}>{fee.status}</Text>
                    </View>
                    <View style={styles.feeStudentInfo}>
                      <Text style={styles.feeStudentName}>{fee.studentName}</Text>
                      <Text style={styles.feeLevel}>{fee.level}</Text>
                    </View>
                  </View>
                  <View style={styles.feeProgress}>
                    <View style={styles.feeProgressBg}>
                      <View style={[styles.feeProgressFill, {
                        width: `${fee.pct}%` as any,
                        backgroundColor: statusColor[fee.status]
                      }]} />
                    </View>
                    <Text style={styles.feePercent}>{fee.pct}%</Text>
                  </View>
                  <View style={styles.feeAmounts}>
                    <Text style={styles.feeAmountLabel}>
                      المتبقي: <Text style={[styles.feeAmountValue, { color: Colors.danger }]}>
                        {(fee.total - fee.paid).toLocaleString('ar-SA')} ج.س
                      </Text>
                    </Text>
                    <Text style={styles.feeAmountLabel}>
                      المحصّل: <Text style={[styles.feeAmountValue, { color: Colors.success }]}>
                        {fee.paid.toLocaleString('ar-SA')} ج.س
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.feeActions}>
                    <Pressable
                      style={styles.resetBtn}
                      onPress={() => handleResetFees(fee.id, fee.studentName)}
                    >
                      <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.resetBtnTxt}>إعادة</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.payBtn, fee.status === 'مسدد' && styles.payBtnDisabled]}
                      disabled={fee.status === 'مسدد'}
                      onPress={() => openPayModal(fee.student)}
                    >
                      <LinearGradient
                        colors={fee.status === 'مسدد' ? [Colors.border, Colors.border] : [Colors.primary, Colors.primaryLight]}
                        style={styles.payBtnGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="cash-outline" size={14} color={fee.status === 'مسدد' ? Colors.textLight : '#fff'} />
                        <Text style={[styles.payBtnTxt, fee.status === 'مسدد' && { color: Colors.textLight }]}>
                          {fee.status === 'مسدد' ? 'مسدد بالكامل' : 'تسجيل دفعة'}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.payrollSummary}>
                <Text style={styles.payrollSummaryLabel}>إجمالي رواتب هذا الشهر</Text>
                <Text style={styles.payrollSummaryValue}>{totalPayroll.toLocaleString('ar-SA')} ج.س</Text>
              </View>
              {employees.map(emp => {
                const earned = Math.round((emp.salary / 22) * emp.daysPresent);
                const deduction = emp.salary - earned;
                return (
                  <View key={emp.id} style={styles.payrollCard}>
                    <View style={styles.payrollCardRow}>
                      <View style={styles.payrollAvatar}>
                        <Text style={styles.payrollAvatarText}>{emp.name.charAt(0)}</Text>
                      </View>
                      <View style={styles.payrollInfo}>
                        <Text style={styles.payrollName}>{emp.name}</Text>
                        <Text style={styles.payrollRole}>{emp.role}</Text>
                      </View>
                    </View>
                    <View style={styles.payrollRow}>
                      <Text style={styles.payrollItemLabel}>الراتب الأساسي</Text>
                      <Text style={styles.payrollItemValue}>{emp.salary.toLocaleString('ar-SA')} ج.س</Text>
                    </View>
                    <View style={styles.payrollRow}>
                      <Text style={[styles.payrollItemLabel, { color: Colors.danger }]}>خصم الغياب ({emp.daysAbsent} أيام)</Text>
                      <Text style={[styles.payrollItemValue, { color: Colors.danger }]}>
                        -{deduction > 0 ? deduction.toLocaleString('ar-SA') : '0'} ج.س
                      </Text>
                    </View>
                    <View style={[styles.payrollRow, styles.payrollTotal]}>
                      <Text style={styles.payrollTotalLabel}>صافي الراتب</Text>
                      <Text style={styles.payrollTotalValue}>{earned.toLocaleString('ar-SA')} ج.س</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
          {activeTab === 'expenses' && (
            <>
              <View style={[styles.payrollSummary, { borderRightColor: Colors.danger }]}>
                <Text style={styles.payrollSummaryLabel}>إجمالي المصاريف</Text>
                <Text style={[styles.payrollSummaryValue, { color: Colors.danger }]}>{totalExpenses.toLocaleString('ar-SA')} ج.س</Text>
              </View>
              <Pressable
                style={[styles.reminderBtn, { alignSelf: 'flex-end', marginBottom: 10, backgroundColor: Colors.danger + '15', borderColor: Colors.danger + '40' }]}
                onPress={() => setShowExpenseModal(true)}
              >
                <MaterialCommunityIcons name="plus" size={15} color={Colors.danger} />
                <Text style={[styles.reminderBtnText, { color: Colors.danger }]}>إضافة مصروف</Text>
              </Pressable>
              {expenses.length === 0 && (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="receipt" size={44} color={Colors.textLight} />
                  <Text style={styles.emptyTxt}>لا توجد مصاريف مسجّلة</Text>
                </View>
              )}
              {expenses.map(exp => (
                <View key={exp.id} style={[styles.payrollCard, { borderRightColor: Colors.danger }]}>
                  <View style={styles.payrollCardRow}>
                    <Pressable onPress={() => { Alert.alert('حذف', 'حذف هذا المصروف؟', [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: () => removeExpense(exp.id) }]); }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                    </Pressable>
                    <View style={styles.payrollInfo}>
                      <Text style={styles.payrollName}>{exp.description}</Text>
                      <Text style={styles.payrollRole}>{exp.category} · {exp.date}</Text>
                    </View>
                    <Text style={[styles.payrollSummaryValue, { fontSize: 15, color: Colors.danger }]}>{exp.amount.toLocaleString('ar-SA')} ج.س</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Expense Modal ── */}
      <Modal visible={showExpenseModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>تسجيل مصروف</Text>
            <Text style={styles.modalLabel}>الفئة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['إيجار', 'كهرباء', 'ماء', 'مستلزمات', 'صيانة', 'رواتب إضافية', 'أخرى'] as ExpenseCategory[]).map(c => (
                  <Pressable key={c} onPress={() => setExpCategory(c)}
                    style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: expCategory === c ? Colors.danger : Colors.surface }]}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: expCategory === c ? '#fff' : Colors.text }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.modalLabel}>الوصف</Text>
            <TextInput style={styles.modalInput} value={expDesc} onChangeText={setExpDesc} placeholder="مثال: إيجار الشهر يناير" placeholderTextColor={Colors.textLight} textAlign="right" />
            <Text style={styles.modalLabel}>المبلغ (ج.س)</Text>
            <TextInput style={styles.modalInput} value={expAmount} onChangeText={setExpAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textLight} textAlign="right" />
            <View style={styles.modalBtns}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowExpenseModal(false)}>
                <Text style={styles.cancelBtnTxt}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveExpense}>
                <Text style={styles.saveBtnTxt}>حفظ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal visible={!!editingStudent} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>تسجيل دفعة</Text>
            <Text style={styles.sheetSub}>{editingStudent?.name} — {editingStudent?.level}</Text>

            {editingStudent && (() => {
              const total = LEVEL_FEES[editingStudent.level] ?? 10000;
              const alreadyPaid = editingStudent.paidFees ?? 0;
              return (
                <View style={styles.feeInfoRow}>
                  <View style={styles.feeInfoBox}>
                    <Text style={styles.feeInfoVal}>{alreadyPaid.toLocaleString('ar-SA')}</Text>
                    <Text style={styles.feeInfoLbl}>محصّل ج.س</Text>
                  </View>
                  <View style={[styles.feeInfoBox, { backgroundColor: '#FEF2F250' }]}>
                    <Text style={[styles.feeInfoVal, { color: Colors.danger }]}>{(total - alreadyPaid).toLocaleString('ar-SA')}</Text>
                    <Text style={styles.feeInfoLbl}>المتبقي ج.س</Text>
                  </View>
                </View>
              );
            })()}

            <Text style={styles.modalLabel}>المبلغ المدفوع الإجمالي (ج.س)</Text>
            <TextInput
              style={styles.modalInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="أدخل إجمالي المبلغ المدفوع"
              placeholderTextColor={Colors.textLight}
              textAlign="right"
            />
            <Text style={styles.modalHint}>سيُحدَّث المبلغ المدفوع للطالب بالقيمة المدخلة</Text>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditingStudent(null)}>
                <Text style={styles.cancelBtnTxt}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSavePayment}>
                <Text style={styles.saveBtnTxt}>حفظ</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 20 },
  balanceCards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  balanceCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  balanceCardMain: { backgroundColor: 'rgba(244,160,28,0.15)', borderWidth: 1, borderColor: 'rgba(244,160,28,0.3)' },
  balanceValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  balanceLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 3, marginBottom: 0, alignItems: 'center' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(201,149,42,0.15)' },
  reminderBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.accent },
  body: { padding: 16, gap: 12 },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 40, alignItems: 'center', gap: 10 },
  emptyTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  feeCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderRightWidth: 4 },
  feeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  feeStudentInfo: { alignItems: 'flex-end' },
  feeStudentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  feeLevel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  feeProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  feeProgressBg: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4 },
  feeProgressFill: { height: 8, borderRadius: 4 },
  feePercent: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.text, width: 36, textAlign: 'right' },
  feeAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  feeAmountLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  feeAmountValue: { fontFamily: 'Inter_600SemiBold' },
  feeActions: { flexDirection: 'row', gap: 8 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  resetBtnTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  payBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  payBtnDisabled: { opacity: 0.6 },
  payBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  payBtnTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  payrollSummary: { backgroundColor: Colors.primary, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 4 },
  payrollSummaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  payrollSummaryValue: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.accent, marginTop: 4 },
  payrollCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderRightWidth: 4, borderRightColor: Colors.primary },
  payrollCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  payrollAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '18', borderWidth: 1.5, borderColor: Colors.primary + '40', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  payrollAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.primary },
  payrollInfo: { flex: 1, alignItems: 'flex-end' },
  payrollName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  payrollRole: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  payrollRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  payrollItemLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  payrollItemValue: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.text },
  payrollTotal: { borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 8, paddingTop: 8 },
  payrollTotalLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  payrollTotalValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.success },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  sheetSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', marginBottom: 14 },
  feeInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  feeInfoBox: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  feeInfoVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  feeInfoLbl: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  modalLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  modalInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  modalHint: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.surfaceAlt },
  cancelBtnTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  saveBtn: { backgroundColor: Colors.primary },
  saveBtnTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
