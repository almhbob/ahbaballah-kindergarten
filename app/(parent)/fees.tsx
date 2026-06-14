import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const PARENT_COLOR = '#7B3FA0';

const LEVEL_FEES: Record<string, number> = {
  'براعم':       8000,
  'مستوى أول': 10000,
  'مستوى ثاني': 12000,
};

const INSTALLMENTS = [
  { label: 'الدفعة الأولى',  pct: 0.5,  due: 'بداية العام' },
  { label: 'الدفعة الثانية', pct: 0.25, due: 'نوفمبر' },
  { label: 'الدفعة الثالثة', pct: 0.25, due: 'فبراير' },
];

export default function FeesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const child = students.find(s => s.id === user?.studentId) || students[0];
  if (!child) return null;

  const totalFees = LEVEL_FEES[child.level] ?? 10000;
  const paid = child.paidFees ?? 0;
  const remaining = Math.max(0, totalFees - paid);
  const pct = totalFees > 0 ? Math.min(100, Math.round((paid / totalFees) * 100)) : 0;
  const status: 'مسدد' | 'جزئي' | 'متأخر' = paid >= totalFees ? 'مسدد' : paid > 0 ? 'جزئي' : 'متأخر';

  const statusColor = { 'مسدد': Colors.success, 'جزئي': Colors.warning, 'متأخر': Colors.danger };
  const statusBg =   { 'مسدد': '#ECFDF5',      'جزئي': '#FFFBEB',      'متأخر': '#FEF2F2'  };

  const installments = INSTALLMENTS.map((inst, i) => {
    const amount = Math.round(totalFees * inst.pct);
    const instPaid = Math.min(amount, Math.max(0, paid - INSTALLMENTS.slice(0, i).reduce((a, x) => a + Math.round(totalFees * x.pct), 0)));
    const instStatus: 'مسدد' | 'جزئي' | 'متأخر' = instPaid >= amount ? 'مسدد' : instPaid > 0 ? 'جزئي' : 'متأخر';
    return { ...inst, amount, instPaid, instStatus };
  });

  return (
    <View style={s.container}>
      <LinearGradient colors={['#2d0e4e', '#4a1880', PARENT_COLOR]} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <Text style={s.headerTitle}>الرسوم الدراسية</Text>
        <Text style={s.headerSub}>{child.name} — {child.level}</Text>

        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{totalFees.toLocaleString('ar-SA')}</Text>
              <Text style={s.summaryLabel}>الإجمالي (ج.س)</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: Colors.success }]}>{paid.toLocaleString('ar-SA')}</Text>
              <Text style={s.summaryLabel}>المدفوع (ج.س)</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: remaining > 0 ? Colors.danger : Colors.success }]}>{remaining.toLocaleString('ar-SA')}</Text>
              <Text style={s.summaryLabel}>المتبقي (ج.س)</Text>
            </View>
          </View>

          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${pct}%` as any }]} />
          </View>
          <View style={s.barLabels}>
            <Text style={s.barPct}>{pct}% مدفوع</Text>
            <View style={[s.statusBadge, { backgroundColor: statusBg[status] }]}>
              <Text style={[s.statusText, { color: statusColor[status] }]}>{status}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPadding }}>
        <Text style={s.sectionTitle}>جدول الأقساط</Text>
        {installments.map((inst, i) => (
          <View key={i} style={s.instCard}>
            <View style={[s.instIndex, { backgroundColor: statusColor[inst.instStatus] + '20' }]}>
              <Text style={[s.instIndexText, { color: statusColor[inst.instStatus] }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.instRow}>
                <View style={[s.instBadge, { backgroundColor: statusBg[inst.instStatus] }]}>
                  <Text style={[s.instBadgeText, { color: statusColor[inst.instStatus] }]}>{inst.instStatus}</Text>
                </View>
                <Text style={s.instLabel}>{inst.label}</Text>
              </View>
              <View style={s.instRow}>
                <Text style={s.instDue}>موعد السداد: {inst.due}</Text>
                <Text style={s.instAmount}>{inst.amount.toLocaleString('ar-SA')} ج.س</Text>
              </View>
              {inst.instPaid > 0 && inst.instPaid < inst.amount ? (
                <Text style={s.instPartial}>مدفوع جزئياً: {inst.instPaid.toLocaleString('ar-SA')} ج.س</Text>
              ) : null}
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>طرق السداد</Text>
        {[
          { icon: 'bank', label: 'تحويل بنكي', detail: 'بنك الخرطوم — رقم الحساب: 1234-5678-9012', color: '#1D4ED8' },
          { icon: 'cash', label: 'دفع نقدي', detail: 'في مكتب المديرة — من الأحد إلى الخميس 8ص–2م', color: Colors.success },
          { icon: 'cellphone', label: 'محفظة إلكترونية', detail: 'Zain Cash / MTN Money — 0912345678', color: '#8B5CF6' },
        ].map((method, i) => (
          <View key={i} style={s.methodCard}>
            <View style={[s.methodIcon, { backgroundColor: method.color + '18' }]}>
              <MaterialCommunityIcons name={method.icon as any} size={22} color={method.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.methodLabel}>{method.label}</Text>
              <Text style={s.methodDetail}>{method.detail}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center', marginBottom: 4 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 16 },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  barTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: Colors.success, borderRadius: 5 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barPct: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', borderRightWidth: 3, borderRightColor: PARENT_COLOR, paddingRight: 10 },
  instCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  instIndex: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  instIndexText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  instRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  instLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  instBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  instBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  instDue: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  instAmount: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },
  instPartial: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.warning, textAlign: 'right' },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  methodDetail: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 2 },
});
