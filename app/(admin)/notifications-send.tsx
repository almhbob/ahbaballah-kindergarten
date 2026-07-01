import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData } from '@/contexts/AppDataContext';
import { sendLocalNotificationNow } from '@/lib/notifications';
import { getAllTokensByRole, getParentTokenForStudent, broadcastToAll } from '@/lib/push-service';

type Audience = 'all' | 'parents' | 'teachers' | 'level_براعم' | 'level_مستوى أول' | 'level_مستوى ثاني';
type NotifType = 'general' | 'exam' | 'event' | 'urgent' | 'financial';

const AUDIENCE_OPTIONS: { key: Audience; label: string; icon: string; color: string }[] = [
  { key: 'all',               label: 'الجميع',         icon: 'account-multiple',       color: '#6366F1' },
  { key: 'parents',           label: 'أولياء الأمور',  icon: 'account-child',          color: '#7B3FA0' },
  { key: 'teachers',          label: 'المعلمات',        icon: 'school',                 color: '#1A6B5C' },
  { key: 'level_براعم',       label: 'فصل البراعم',    icon: 'star-outline',           color: '#EC4899' },
  { key: 'level_مستوى أول',  label: 'المستوى الأول',  icon: 'numeric-1-circle',       color: '#3B82F6' },
  { key: 'level_مستوى ثاني', label: 'المستوى الثاني', icon: 'numeric-2-circle',       color: '#10B981' },
];

const TYPE_OPTIONS: { key: NotifType; label: string; icon: string; color: string }[] = [
  { key: 'general',   label: 'إشعار عام',   icon: 'bell-outline',            color: '#6366F1' },
  { key: 'exam',      label: 'اختبار',       icon: 'pencil-outline',          color: '#EF4444' },
  { key: 'event',     label: 'فعالية',       icon: 'calendar-star',           color: '#F59E0B' },
  { key: 'urgent',    label: 'عاجل',         icon: 'alert-circle-outline',    color: '#DC2626' },
  { key: 'financial', label: 'مالي',         icon: 'cash-multiple',           color: Colors.success },
];

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 6); }

export default function NotificationsSendScreen() {
  const insets = useSafeAreaInsets();
  const { students, employees, addNews } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [type, setType] = useState<NotifType>('general');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const targetCount = (() => {
    if (audience === 'all') return students.length + employees.length;
    if (audience === 'parents') return students.length;
    if (audience === 'teachers') return employees.length;
    const level = audience.replace('level_', '');
    return students.filter(s => s.level === level).length;
  })();

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال العنوان والمحتوى');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      const now = new Date().toISOString();
      const typeOpt = TYPE_OPTIONS.find(t => t.key === type)!;
      const fullTitle = `${typeOpt.label}: ${title.trim()}`;
      const fullBody = body.trim();

      addNews({
        id: genId(),
        title: fullTitle,
        body: fullBody,
        date: now.split('T')[0],
        type: 'news',
      });

      let tokens: string[] = [];
      if (audience === 'all' || audience === 'parents') {
        tokens.push(...await getAllTokensByRole('parent'));
      }
      if (audience === 'all' || audience === 'teachers') {
        tokens.push(...await getAllTokensByRole('teacher'));
      }
      if (audience.startsWith('level_')) {
        const level = audience.replace('level_', '');
        const levelTokens = await Promise.all(
          students.filter(s => s.level === level).map(s => getParentTokenForStudent(s.id)),
        );
        tokens.push(...(levelTokens.filter(Boolean) as string[]));
      }

      if (tokens.length > 0) {
        await broadcastToAll({ tokens, title: fullTitle, body: fullBody, audience, data: { type } });
      } else {
        await sendLocalNotificationNow(fullTitle, fullBody);
      }
    } catch (e) {
      console.warn('[Notif] send error:', e);
    }
    setSending(false);
    setSent(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => { setSent(false); setTitle(''); setBody(''); }, 3000);
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030612','#050c38','#0d1463']} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>إرسال إشعار</Text>
            <Text style={s.headerSub}>إرسال إشعار لـ {targetCount} مستخدم</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPadding }}>
        {sent && (
          <View style={s.successBanner}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={s.successText}>تم الإرسال بنجاح إلى {targetCount} مستخدم</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>نوع الإشعار</Text>
          <View style={s.pillRow}>
            {TYPE_OPTIONS.map(opt => (
              <Pressable key={opt.key} style={[s.pill, type === opt.key && { backgroundColor: opt.color }]}
                onPress={() => { setType(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <MaterialCommunityIcons name={opt.icon as any} size={14} color={type === opt.key ? '#fff' : Colors.textLight} />
                <Text style={[s.pillText, type === opt.key && { color: '#fff' }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>الجمهور المستهدف</Text>
          <View style={s.audienceGrid}>
            {AUDIENCE_OPTIONS.map(opt => {
              const active = audience === opt.key;
              return (
                <Pressable key={opt.key} style={[s.audienceCard, active && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
                  onPress={() => { setAudience(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={[s.audienceIconWrap, { backgroundColor: opt.color + '20' }]}>
                    <MaterialCommunityIcons name={opt.icon as any} size={20} color={opt.color} />
                  </View>
                  <Text style={[s.audienceLabel, active && { color: opt.color, fontFamily: 'Inter_600SemiBold' }]}>{opt.label}</Text>
                  {active && <View style={[s.audienceCheck, { backgroundColor: opt.color }]}><Ionicons name="checkmark" size={10} color="#fff" /></View>}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>محتوى الإشعار</Text>
          <TextInput
            style={s.titleInput}
            placeholder="عنوان الإشعار..."
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
            textAlign="right"
            maxLength={80}
          />
          <TextInput
            style={s.bodyInput}
            placeholder="نص الإشعار التفصيلي..."
            placeholderTextColor="#666"
            value={body}
            onChangeText={setBody}
            multiline
            textAlign="right"
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{body.length}/500</Text>
        </View>

        <Pressable style={[s.sendBtn, (!title.trim() || !body.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend} disabled={!title.trim() || !body.trim() || sending}>
          <LinearGradient colors={['#ca9928','#b8841c']} style={s.sendBtnGrad}>
            {sending
              ? <Text style={s.sendBtnText}>جارٍ الإرسال...</Text>
              : <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={s.sendBtnText}>إرسال إلى {targetCount} مستخدم</Text>
                </>
            }
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right', borderRightWidth: 3, borderRightColor: Colors.accent, paddingRight: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  audienceCard: { width: '30%', alignItems: 'center', gap: 6, padding: 12, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, position: 'relative' },
  audienceIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  audienceLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textLight, textAlign: 'center' },
  audienceCheck: { position: 'absolute', top: 6, left: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  titleInput: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  bodyInput: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.border, height: 130 },
  charCount: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'left' },
  sendBtn: { borderRadius: 16, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  sendBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.success + '18', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.success + '40' },
  successText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.success },
});
