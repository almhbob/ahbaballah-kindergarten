import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const LEVEL_FEES: Record<string, number> = {
  'براعم':       8000,
  'مستوى أول': 10000,
  'مستوى ثاني': 12000,
};

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const { employees, students } = useAppData();
  const [activeTab, setActiveTab] = useState<'fees' | 'payroll'>('fees');
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const FEES = useMemo(() => students.map(s => {
    const total = LEVEL_FEES[s.level] ?? 10000;
    const paid = s.attendance >= 90
      ? total
      : s.attendance >= 75
        ? Math.round(total * 0.625)
        : 0;
    const status = paid >= total ? 'مسدد' as const : paid > 0 ? 'جزئي' as const : 'متأخر' as const;
    return { id: s.id, studentName: s.name, level: s.level, total, paid, status };
  }), [students]);

  const totalFees = FEES.reduce((a, f) => a + f.total, 0);
  const collectedFees = FEES.reduce((a, f) => a + f.paid, 0);
  const pendingFees = totalFees - collectedFees;
  const totalPayroll = employees.reduce((a, e) => a + e.salary, 0);

  const statusColor = { 'مسدد': Colors.success, 'جزئي': Colors.warning, 'متأخر': Colors.danger };
  const statusBg = { 'مسدد': '#ECFDF5', 'جزئي': '#FFFBEB', 'متأخر': '#FEF2F2' };

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
            { id: 'fees', label: 'الرسوم الدراسية' },
            { id: 'payroll', label: 'مسير الرواتب' },
          ].map(t => (
            <Pressable
              key={t.id}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t.id as any); }}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {activeTab === 'fees' ? (
            <>
              {FEES.map(fee => (
                <View key={fee.id} style={styles.feeCard}>
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
                        width: `${(fee.paid / fee.total) * 100}%` as any,
                        backgroundColor: statusColor[fee.status]
                      }]} />
                    </View>
                    <Text style={styles.feePercent}>{Math.round((fee.paid / fee.total) * 100)}%</Text>
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
        </View>
      </ScrollView>
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
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 3, marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  body: { padding: 16, gap: 12 },
  feeCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
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
  feeAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  feeAmountLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  feeAmountValue: { fontFamily: 'Inter_600SemiBold' },
  payrollSummary: { backgroundColor: Colors.primary, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 4 },
  payrollSummaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  payrollSummaryValue: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.accent, marginTop: 4 },
  payrollCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  payrollCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  payrollAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
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
});
