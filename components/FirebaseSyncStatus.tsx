import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { isFirebaseReady, initFirebase } from '@/lib/firebase';
import { fsBulkUploadStudents, fsBulkUploadEmployees } from '@/lib/firestore-service';
import { useAppData } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

type SyncState = 'idle' | 'syncing' | 'ok' | 'error' | 'disabled';

export default function FirebaseSyncStatus() {
  const { students, employees } = useAppData();
  const [state, setState] = useState<SyncState>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isFirebaseReady()) {
      setState('disabled');
      setMsg('Firebase غير مهيّأ — أضف الـ API Key');
    } else {
      setState('ok');
      setMsg('متصل بـ Firebase');
    }
  }, []);

  async function handleBulkSync() {
    if (!isFirebaseReady()) {
      setState('error');
      setMsg('Firebase غير متصل');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('syncing');
    setMsg('جاري رفع البيانات...');
    try {
      await fsBulkUploadStudents(students);
      await fsBulkUploadEmployees(employees);
      setState('ok');
      setMsg(`تم رفع ${students.length} طالب و${employees.length} موظف`);
    } catch (e: any) {
      setState('error');
      setMsg(`خطأ: ${e?.message ?? 'فشل الرفع'}`);
    }
  }

  const COLOR = {
    idle: Colors.textLight, syncing: Colors.warning,
    ok: Colors.success, error: Colors.danger, disabled: Colors.textLight,
  }[state];

  const ICON = {
    idle: 'cloud-outline', syncing: 'cloud-sync', ok: 'cloud-check',
    error: 'cloud-alert', disabled: 'cloud-off-outline',
  }[state];

  return (
    <View style={s.container}>
      <View style={s.row}>
        <MaterialCommunityIcons name={ICON as any} size={18} color={COLOR} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Firebase Firestore</Text>
          <Text style={[s.msg, { color: COLOR }]}>{msg}</Text>
        </View>
        {state !== 'disabled' && state !== 'syncing' && (
          <Pressable style={s.btn} onPress={handleBulkSync}>
            <Text style={s.btnText}>مزامنة الكل</Text>
          </Pressable>
        )}
        {state === 'syncing' && (
          <Text style={[s.btnText, { color: Colors.warning }]}>...</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  msg: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: 1 },
  btn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.accent + '20', borderRadius: 8, borderWidth: 1, borderColor: Colors.accent + '40' },
  btnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.accent },
});
