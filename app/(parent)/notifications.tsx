import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Certificate } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import CertificateCard from '@/components/CertificateCard';
import * as Haptics from 'expo-haptics';

const PARENT_COLOR = '#7B3FA0';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  news:        { icon: 'newspaper-variant', color: Colors.accent,  bg: '#FFF7ED', label: 'خبر' },
  trip:        { icon: 'bus',               color: Colors.success, bg: '#ECFDF5', label: 'رحلة' },
  activity:    { icon: 'star-shooting',     color: '#3B82F6',      bg: '#EFF6FF', label: 'نشاط' },
  message:     { icon: 'message-text',      color: '#8B5CF6',      bg: '#F5F3FF', label: 'رسالة' },
  report:      { icon: 'clipboard-text',    color: '#EC4899',      bg: '#FDF2F8', label: 'تقرير' },
  certificate: { icon: 'certificate',       color: '#b45309',      bg: '#FFF8E7', label: 'شهادة' },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { news, messages, students, certificates, schoolInfo } = useAppData();
  const { user } = useAuth();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [viewCert, setViewCert] = useState<Certificate | null>(null);

  const child = students.find(s => s.id === user?.studentId);

  const adminMessages = messages.filter(
    m => m.senderId === 'admin' && m.receiverId === user?.id
  );

  const recentReports = (child?.dailyReports ?? []).slice(0, 5);

  const myCerts = certificates.filter(c =>
    c.status === 'approved' &&
    ((c.recipientType === 'parent' && c.recipientId === user?.id) ||
     (c.recipientType === 'student' && c.recipientId === child?.id))
  );

  type NotifItem = {
    id: string; title: string; body: string; date: string; kind: string;
    cert?: Certificate;
  };

  const items: NotifItem[] = [
    ...myCerts.map(c => ({
      id: `cert_${c.id}`,
      kind: 'certificate',
      title: c.title,
      body: c.recipientType === 'student' ? `شهادة للطفل ${c.recipientName}` : `من: ${c.issuedBy}`,
      date: c.date,
      cert: c,
    })),
    ...adminMessages.map(m => ({
      id: m.id,
      kind: 'message',
      title: 'رسالة من الإدارة',
      body: m.body,
      date: m.date.slice(0, 10),
    })),
    ...recentReports.map((r, i) => ({
      id: `rep_${i}`,
      kind: 'report',
      title: `تقرير يوم ${r.date}`,
      body: `تعلّم: ${r.learned} — ${r.behaviorNote}`,
      date: r.date,
    })),
    ...news.map(n => ({
      id: n.id,
      kind: n.type,
      title: n.title,
      body: n.body,
      date: n.date,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const unreadMsgs = adminMessages.filter(m => !m.read).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>الإشعارات</Text>
        <View style={styles.statsRow}>
          {myCerts.length > 0 && (
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="certificate" size={13} color="#b45309" />
              <Text style={[styles.statText, { color: '#b45309' }]}>{myCerts.length} شهادة</Text>
            </View>
          )}
          {unreadMsgs > 0 && (
            <View style={styles.statChip}>
              <Ionicons name="mail-unread" size={13} color="#8B5CF6" />
              <Text style={[styles.statText, { color: '#8B5CF6' }]}>{unreadMsgs} جديد</Text>
            </View>
          )}
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="clipboard-text" size={13} color="#EC4899" />
            <Text style={[styles.statText, { color: '#EC4899' }]}>{recentReports.length} تقرير</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="notifications" size={13} color={Colors.accent} />
            <Text style={[styles.statText, { color: Colors.accent }]}>{news.length} خبر</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.kind] ?? TYPE_CONFIG.news;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.cert) setViewCert(item.cert);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                <MaterialCommunityIcons name={cfg.icon as any} size={26} color={cfg.color} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                {item.cert && (
                  <Text style={[styles.viewCertHint, { color: cfg.color }]}>اضغط لعرض الشهادة ←</Text>
                )}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد إشعارات حالياً</Text>
          </View>
        }
      />

      {/* Certificate View Modal */}
      <Modal visible={!!viewCert} transparent animationType="fade">
        <Pressable style={styles.certOverlay} onPress={() => setViewCert(null)}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: topPadding + 20 }}>
            {viewCert && (
              <CertificateCard cert={viewCert} schoolName={schoolInfo.name} principalName={schoolInfo.principalName} />
            )}
            <Pressable
              style={styles.closeBtn}
              onPress={() => setViewCert(null)}
            >
              <Text style={styles.closeBtnText}>إغلاق</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: PARENT_COLOR, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  iconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  cardBody: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  viewCertHint: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginTop: 4 },
  certOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  closeBtn: { backgroundColor: PARENT_COLOR, borderRadius: 14, padding: 14, alignItems: 'center', margin: 16 },
  closeBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
