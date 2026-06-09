import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, Platform, ScrollView,
} from 'react-native';
import { sendLocalNotificationNow } from '@/lib/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/colors';
import { useAppData, InboxMessage } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

function MessageItem({ msg, onPress }: { msg: InboxMessage; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.msgCard, !msg.read && styles.msgCardUnread, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={styles.msgRow}>
        {!msg.read && <View style={styles.unreadDot} />}
        <View style={styles.msgContent}>
          <View style={styles.msgHeader}>
            <Text style={styles.msgDate}>{msg.date}</Text>
            <Text style={styles.msgFrom}>{msg.from}</Text>
          </View>
          <Text style={styles.msgSubject}>{msg.subject}</Text>
          <Text style={styles.msgPreview} numberOfLines={2}>{msg.body}</Text>
          {msg.reply && (
            <View style={styles.replyBadge}>
              <Ionicons name="return-down-forward" size={12} color={Colors.success} />
              <Text style={styles.replyBadgeText}>تم الرد</Text>
            </View>
          )}
        </View>
        <View style={[styles.senderAvatar, !msg.read && styles.senderAvatarUnread]}>
          <Text style={styles.senderAvatarText}>{msg.from.charAt(0)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { inbox, replyInbox, markInboxRead, welcomeMessage, setWelcomeMessage } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showWelcomeEditor, setShowWelcomeEditor] = useState(false);
  const [draftWelcome, setDraftWelcome] = useState('');

  const unread = inbox.filter(m => !m.read).length;

  const handleOpen = (msg: InboxMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markInboxRead(msg.id);
    setSelectedMsg({ ...msg, read: true });
    setReplyText(msg.reply || '');
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedMsg) return;
    replyInbox(selectedMsg.id, replyText);
    sendLocalNotificationNow(
      `رد من إدارة الروضة`,
      `تم الرد على رسالتك: "${replyText.slice(0, 60)}${replyText.length > 60 ? '...' : ''}"`,
    ).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedMsg(null);
  };

  const handleOpenWelcomeEditor = () => {
    setDraftWelcome(welcomeMessage);
    setShowWelcomeEditor(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveWelcome = () => {
    const text = draftWelcome.trim();
    if (text) setWelcomeMessage(text);
    setShowWelcomeEditor(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDraftChange = (t: string) => {
    setDraftWelcome(t);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0d1143', '#1a1f5c', '#252b7a']}
        style={[styles.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerRow}>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread} غير مقروء</Text>
            </View>
          )}
          <Text style={styles.headerTitle}>صندوق الوارد</Text>
        </View>
        <View style={styles.headerMeta}>
          <Pressable
            style={({ pressed }) => [styles.welcomeEditBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleOpenWelcomeEditor}
          >
            <MaterialCommunityIcons name="message-badge-outline" size={14} color={Colors.accent} />
            <Text style={styles.welcomeEditBtnText}>رسالة الترحيب</Text>
            <Ionicons name="chevron-back" size={12} color={Colors.accent} />
          </Pressable>
          <Text style={styles.headerSub}>{inbox.length} رسالة إجمالاً</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={inbox}
        keyExtractor={m => m.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 90 }]}
        renderItem={({ item }) => (
          <MessageItem msg={item} onPress={() => handleOpen(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="inbox-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد رسائل</Text>
          </View>
        }
      />

      {/* ── Reply modal ─────────────────────────────────────────────────── */}
      <Modal visible={!!selectedMsg} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setSelectedMsg(null)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.modalTitle}>{selectedMsg?.subject}</Text>
            </View>
            <View style={styles.msgMeta}>
              <Text style={styles.msgMetaDate}>{selectedMsg?.date}</Text>
              <Text style={styles.msgMetaFrom}>من: {selectedMsg?.from}</Text>
            </View>
            <View style={styles.msgBody}>
              <Text style={styles.msgBodyText}>{selectedMsg?.body}</Text>
            </View>

            {selectedMsg?.reply ? (
              <View style={styles.replyShown}>
                <View style={styles.replyShownHeader}>
                  <MaterialCommunityIcons name="reply" size={16} color={Colors.success} />
                  <Text style={styles.replyShownLabel}>ردك السابق:</Text>
                </View>
                <Text style={styles.replyShownText}>{selectedMsg.reply}</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.replyInput}
                  placeholder="اكتب ردك هنا..."
                  placeholderTextColor={Colors.textLight}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={3}
                  textAlign="right"
                  textAlignVertical="top"
                />
                <Pressable
                  style={({ pressed }) => [styles.replyBtn, { opacity: pressed ? 0.9 : 1 }]}
                  onPress={handleReply}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.replyBtnText}>إرسال الرد</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Welcome message editor modal ─────────────────────────────────── */}
      <Modal visible={showWelcomeEditor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.welcomeSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.welcomeHeader}>
              <Pressable onPress={() => setShowWelcomeEditor(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.welcomeTitle}>رسالة الترحيب التلقائية</Text>
              <MaterialCommunityIcons name="robot-happy-outline" size={24} color={Colors.accent} />
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={16} color='#3B82F6' />
              <Text style={styles.infoBannerText}>
                تُرسَل هذه الرسالة تلقائياً لكل ولي أمر يتواصل مع الروضة لأول مرة عبر الشات
              </Text>
            </View>

            {/* Preview card */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewAvatar}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                </View>
                <Text style={styles.previewFrom}>الإدارة</Text>
                <Text style={styles.previewTime}>تلقائي</Text>
              </View>
              <View style={styles.previewBubble}>
                <Text style={styles.previewText}>{draftWelcome || welcomeMessage}</Text>
              </View>
            </View>

            {/* Text editor */}
            <Text style={styles.editorLabel}>تعديل نص الرسالة:</Text>
            <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
              <TextInput
                testID="welcome-editor-input"
                style={styles.editorInput}
                value={draftWelcome}
                onChangeText={handleDraftChange}
                multiline
                placeholder="اكتب رسالة الترحيب هنا..."
                placeholderTextColor={Colors.textLight}
                textAlign="right"
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.welcomeActions}>
              <Pressable
                testID="welcome-reset-btn"
                style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => {
                  setDraftWelcome(
                    `مرحباً بك في نظم إدارة رياض الأطفال الخاصة 🌟\n\nيسعدنا تواصلك معنا. سيقوم فريق الإدارة بالرد على رسالتك في أقرب وقت ممكن.\n\nللتواصل الفوري يمكنك مراسلتنا على واتساب:\n+249917545129\n\n— إدارة نظم إدارة رياض الأطفال`
                  );
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="refresh" size={16} color={Colors.textSecondary} />
                <Text style={styles.resetBtnText}>إعادة الافتراضي</Text>
              </Pressable>
              <Pressable
                testID="welcome-save-btn"
                style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1 }]}
                onPress={handleSaveWelcome}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>حفظ الرسالة</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  unreadBadge: { backgroundColor: Colors.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  unreadBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  welcomeEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(202,153,40,0.15)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(202,153,40,0.3)',
  },
  welcomeEditBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.accent },

  list: { padding: 16, gap: 10 },
  msgCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 6px rgba(26,31,92,0.07)' }
      : { shadowColor: '#1a1f5c', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 }),
  },
  msgCardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.accent },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  unreadDot: { position: 'absolute', top: 0, left: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  senderAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  senderAvatarUnread: { backgroundColor: Colors.accent + '20' },
  senderAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.primary },
  msgContent: { flex: 1, alignItems: 'flex-end' },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 },
  msgFrom: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.text },
  msgDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  msgSubject: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.primary, textAlign: 'right', marginBottom: 4 },
  msgPreview: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 18 },
  replyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  replyBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.success },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textLight },

  // Reply modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'right', marginRight: 12 },
  msgMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  msgMetaFrom: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  msgMetaDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  msgBody: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 16 },
  msgBodyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 22, textAlign: 'right' },
  replyShown: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14 },
  replyShownHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, justifyContent: 'flex-end' },
  replyShownLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.success },
  replyShownText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#065F46', textAlign: 'right', lineHeight: 20 },
  replyInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, height: 90, marginBottom: 12 },
  replyBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  replyBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },

  // Welcome editor modal
  welcomeSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%',
  },
  welcomeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  welcomeTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1, textAlign: 'center' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoBannerText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1D4ED8', textAlign: 'right', lineHeight: 18 },
  previewCard: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 16, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: Colors.borderLight,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, justifyContent: 'flex-end' },
  previewAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  previewFrom: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.primary, flex: 1, textAlign: 'right' },
  previewTime: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  previewBubble: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right', lineHeight: 20 },
  editorLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  editorScroll: { maxHeight: 180, marginBottom: 14 },
  editorInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14,
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text,
    minHeight: 150, borderWidth: 1, borderColor: Colors.border,
  },
  welcomeActions: { flexDirection: 'row', gap: 10 },
  resetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, borderRadius: 14, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
  },
  resetBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, borderRadius: 14, backgroundColor: Colors.primary,
  },
  saveBtnDisabled: { backgroundColor: Colors.textLight },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
