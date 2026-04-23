import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  Alert, Vibration, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, Student } from '@/contexts/AppDataContext';

type AttendanceStatus = 'حاضر' | 'متأخر' | 'غائب';

interface ScanResult {
  student: Student;
  status: AttendanceStatus;
  timestamp: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { color: string; bg: string; icon: string; label: string }> = {
  'حاضر':  { color: Colors.success, bg: '#ECFDF5', icon: 'checkmark-circle', label: 'حاضر' },
  'متأخر': { color: Colors.warning, bg: '#FFFBEB', icon: 'time',             label: 'متأخر' },
  'غائب':  { color: Colors.danger,  bg: '#FEF2F2', icon: 'close-circle',     label: 'غائب'  },
};

export default function QRScanScreen() {
  const insets = useSafeAreaInsets();
  const { students, updateStudent } = useAppData();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('حاضر');
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [scanned]);

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;

    const student = students.find(s => s.id === data || `student_${s.id}` === data);
    if (!student) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('خطأ', 'لم يُعثر على طالب بهذا الرمز', [
        { text: 'إعادة المسح', onPress: () => setScanned(false) }
      ]);
      setScanned(true);
      return;
    }

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'android') Vibration.vibrate(100);

    const result: ScanResult = {
      student,
      status: selectedStatus,
      timestamp: new Date().toLocaleTimeString('ar-SA'),
    };

    setScanned(true);
    setScanResult(result);

    Animated.spring(successAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleConfirm = async () => {
    if (!scanResult) return;

    const { student, status } = scanResult;

    const newAttendance = status === 'حاضر'
      ? Math.min(100, student.attendance + 1)
      : status === 'غائب'
      ? Math.max(0, student.attendance - 1)
      : student.attendance;

    const today = new Date().toLocaleDateString('ar-SA');
    const newReports = [
      ...(student.dailyReports || []).filter(r => r.date !== today),
      {
        date: today,
        ate: '',
        learned: '',
        behaviorNote: `تم تسجيل الحضور بالقارئ: ${status}`,
        mood: 'سعيد',
      },
    ];

    await updateStudent(student.id, { attendance: newAttendance, dailyReports: newReports });
    setScanCount(c => c + 1);
    setRecentScans(prev => [scanResult, ...prev].slice(0, 10));

    setScanResult(null);
    setScanned(false);
    successAnim.setValue(0);
  };

  const handleSkip = () => {
    setScanResult(null);
    setScanned(false);
    successAnim.setValue(0);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 67 }]}>
        <View style={styles.webNotSupported}>
          <Ionicons name="qr-code-outline" size={64} color={Colors.teacher} />
          <Text style={styles.webTitle}>ماسح QR الحضور</Text>
          <Text style={styles.webDesc}>
            هذه الميزة متاحة على الأجهزة المحمولة فقط{'\n'}استخدم تطبيق Expo Go على هاتفك
          </Text>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.permText}>جارٍ تحميل إعدادات الكاميرا...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permContainer}>
          <Ionicons name="camera-outline" size={72} color={Colors.teacher} />
          <Text style={styles.permTitle}>إذن الكاميرا مطلوب</Text>
          <Text style={styles.permDesc}>يحتاج التطبيق إلى الكاميرا لمسح رموز QR الطلاب</Text>
          <Pressable style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>السماح بالكاميرا</Text>
          </Pressable>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>العودة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.overlay, styles.overlayTop, { height: insets.top + 100 }]} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame}>
            {!scanned && (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
            )}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={[styles.overlay, styles.overlayBottom]} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>ماسح حضور QR</Text>
        <View style={styles.scanBadge}>
          <Text style={styles.scanBadgeText}>{scanCount}</Text>
        </View>
      </View>

      <View style={styles.statusSelector}>
        <Text style={styles.statusLabel}>نوع الحضور:</Text>
        <View style={styles.statusBtns}>
          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const active = selectedStatus === s;
            return (
              <Pressable
                key={s}
                style={[styles.statusBtn, active && { backgroundColor: cfg.color }]}
                onPress={() => setSelectedStatus(s)}
              >
                <Text style={[styles.statusBtnText, active && { color: '#fff' }]}>{cfg.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.hint, { bottom: insets.bottom + 120 }]}>
        <Ionicons name="qr-code-outline" size={18} color="rgba(255,255,255,0.8)" />
        <Text style={styles.hintText}>وجّه الكاميرا نحو رمز QR الطالب</Text>
      </View>

      {scanResult && (
        <Animated.View style={[
          styles.resultCard,
          { bottom: insets.bottom + 20, transform: [{ scale: successAnim }] }
        ]}>
          <View style={[styles.resultIcon, { backgroundColor: STATUS_CONFIG[scanResult.status].bg }]}>
            <Ionicons
              name={STATUS_CONFIG[scanResult.status].icon as any}
              size={32}
              color={STATUS_CONFIG[scanResult.status].color}
            />
          </View>
          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>{scanResult.student.name}</Text>
            <Text style={styles.resultLevel}>{scanResult.student.level}</Text>
            <View style={[styles.resultStatusBadge, { backgroundColor: STATUS_CONFIG[scanResult.status].bg }]}>
              <Text style={[styles.resultStatusText, { color: STATUS_CONFIG[scanResult.status].color }]}>
                {scanResult.status} • {scanResult.timestamp}
              </Text>
            </View>
          </View>
          <View style={styles.resultActions}>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Ionicons name="close" size={20} color={Colors.danger} />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {recentScans.length > 0 && !scanResult && (
        <View style={[styles.recentBar, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.recentTitle}>آخر {recentScans.length} مسح</Text>
          <View style={styles.recentList}>
            {recentScans.slice(0, 5).map((r, i) => (
              <View key={i} style={[styles.recentItem, { borderColor: STATUS_CONFIG[r.status].color }]}>
                <Text style={styles.recentName} numberOfLines={1}>{r.student.name.split(' ')[0]}</Text>
                <Text style={[styles.recentStatus, { color: STATUS_CONFIG[r.status].color }]}>{r.status}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#000' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay:         { backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop:      { width: '100%' },
  overlayMiddle:   { flexDirection: 'row', height: 220 },
  overlaySide:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom:   { flex: 1, width: '100%' },
  scanFrame: {
    width: 220, height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2,
    backgroundColor: Colors.teacher,
    shadowColor: Colors.teacher,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  corner: {
    position: 'absolute', width: 28, height: 28,
    borderColor: Colors.teacher, borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 12,
  },
  headerBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle:  { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  scanBadge: {
    backgroundColor: Colors.teacher, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    minWidth: 28, alignItems: 'center',
  },
  scanBadgeText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  statusSelector: {
    position: 'absolute', top: 100 + 12,
    left: 0, right: 0,
    alignItems: 'center', gap: 8, paddingHorizontal: 20,
  },
  statusLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_500Medium' },
  statusBtns:    { flexDirection: 'row', gap: 8 },
  statusBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  statusBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  hint: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  hintText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_500Medium' },
  resultCard: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 12,
  },
  resultIcon:   { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  resultInfo:   { flex: 1, gap: 4 },
  resultName:   { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text },
  resultLevel:  { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  resultStatusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, marginTop: 2,
  },
  resultStatusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  resultActions: { flexDirection: 'column', gap: 8 },
  confirmBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center',
  },
  skipBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center',
  },
  recentBar: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 16,
    padding: 12, gap: 8,
  },
  recentTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  recentList:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  recentItem: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center',
  },
  recentName:   { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  recentStatus: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  webNotSupported: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40, backgroundColor: Colors.background },
  webTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.text },
  webDesc:  { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  permContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40, backgroundColor: Colors.background },
  permTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  permDesc:  { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  permText:  { fontSize: 16, color: Colors.textSecondary, fontFamily: 'Inter_400Regular' },
  permBtn: {
    backgroundColor: Colors.teacher, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  permBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  backBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  backBtnText: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
