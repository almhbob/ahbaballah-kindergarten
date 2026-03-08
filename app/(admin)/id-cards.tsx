import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, Alert, Dimensions, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing/build/src/Sharing';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, Employee, Student } from '@/contexts/AppDataContext';
import IDCard, { IDCardPerson } from '@/components/IDCard';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 40;

type Tab = 'employees' | 'parents';

function employeeToPerson(e: Employee): IDCardPerson {
  return { type: 'employee', id: e.id, name: e.name, role: e.role, level: e.level, phone: e.phone, email: e.email };
}
function studentToParentPerson(s: Student): IDCardPerson {
  return { type: 'parent', id: `parent_${s.id}`, name: s.parentName, studentName: s.name, studentLevel: s.level, phone: s.parentPhone };
}

export default function IDCardsScreen() {
  const insets = useSafeAreaInsets();
  const { employees, students } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>('employees');
  const [previewPerson, setPreviewPerson] = useState<IDCardPerson | null>(null);
  const [downloading, setDownloading] = useState(false);

  const cardRef = useRef<View>(null);

  const persons: IDCardPerson[] = tab === 'employees'
    ? employees.map(employeeToPerson)
    : students.map(studentToParentPerson);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    if (Platform.OS === 'web') {
      Alert.alert('تنبيه', 'التحميل متاح على الجهاز المحمول فقط');
      return;
    }
    try {
      setDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: Math.round(1080 * (214 / 340)),
      });
      await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'مشاركة البطاقة' });
    } catch (e) {
      Alert.alert('خطأ', 'تعذّر تحميل البطاقة');
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#050919', '#0a1128', '#10174a']}
        style={[styles.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>بطاقات الهوية</Text>
            <Text style={styles.headerSub}>بطاقات دخول رسمية</Text>
          </View>
          <MaterialCommunityIcons name="card-account-details" size={24} color="#f0d060" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {([
            { key: 'employees', label: 'الموظفون', icon: 'account-tie', count: employees.length },
            { key: 'parents',   label: 'أولياء الأمور', icon: 'account-child', count: students.length },
          ] as { key: Tab; label: string; icon: string; count: number }[]).map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => { setTab(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <MaterialCommunityIcons name={t.icon as any} size={16} color={tab === t.key ? '#fff' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              <View style={[styles.tabBadge, tab === t.key && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{t.count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* List */}
      <FlatList
        data={persons}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="card-off" size={40} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد بيانات</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.listItem}
            onPress={() => { setPreviewPerson(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <IDCard person={item} targetWidth={CARD_W} />
            <View style={styles.tapHint}>
              <Ionicons name="eye-outline" size={14} color={Colors.textLight} />
              <Text style={styles.tapHintText}>اضغط للمعاينة والتحميل</Text>
            </View>
          </Pressable>
        )}
      />

      {/* Preview Modal */}
      <Modal visible={!!previewPerson} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>معاينة البطاقة</Text>
            <Text style={styles.sheetSub}>
              {previewPerson?.name}
            </Text>

            {/* Full-quality card for capture */}
            <View style={styles.previewArea}>
              {previewPerson && (
                <IDCard
                  ref={cardRef}
                  person={previewPerson}
                  targetWidth={CARD_W}
                />
              )}
            </View>

            {/* Download info */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                التحميل بجودة 1080px — مناسبة للطباعة ومنصات التواصل
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.closeBtn} onPress={() => setPreviewPerson(null)}>
                <Text style={styles.closeBtnText}>إغلاق</Text>
              </Pressable>

              <Pressable
                style={[styles.downloadBtn, downloading && { opacity: 0.6 }]}
                onPress={handleDownload}
                disabled={downloading}
              >
                <LinearGradient colors={['#c9a227', '#f0d060', '#c9a227']} style={styles.downloadGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {downloading ? (
                    <ActivityIndicator size="small" color="#0a0e2a" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="download" size={18} color="#0a0e2a" />
                      <Text style={styles.downloadBtnText}>تحميل ومشاركة</Text>
                    </>
                  )}
                </LinearGradient>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 1 },

  tabs: { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabBtnActive: { backgroundColor: 'rgba(200,160,40,0.25)', borderWidth: 1, borderColor: 'rgba(200,160,40,0.5)' },
  tabLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: '#f0d060' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: 'rgba(200,160,40,0.35)' },
  tabBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff' },

  list: { padding: 20, gap: 16, paddingBottom: 100 },
  listItem: { gap: 6 },
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 0.6 },
  tapHintText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textLight },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'center', marginBottom: 2 },
  sheetSub: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },

  previewArea: { alignItems: 'center', marginBottom: 14 },

  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: 10, padding: 10, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 16 },

  actions: { flexDirection: 'row', gap: 12 },
  closeBtn: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  closeBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  downloadBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  downloadGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20 },
  downloadBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#0a0e2a' },
});
