import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
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
  const { inbox, replyInbox, markInboxRead } = useAppData();
  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedMsg(null);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread} غير مقروء</Text>
            </View>
          )}
          <Text style={styles.headerTitle}>صندوق الوارد</Text>
        </View>
        <Text style={styles.headerSub}>{inbox.length} رسالة إجمالاً</Text>
      </View>

      <FlatList
        data={inbox}
        keyExtractor={m => m.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  unreadBadge: { backgroundColor: Colors.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  unreadBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  list: { padding: 16, gap: 10 },
  msgCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
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
});
