import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, KeyboardAvoidingView, Platform, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData, Message } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView as KAV } from 'react-native-keyboard-controller';

const PARENT_COLOR = '#7B3FA0';

function MessageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      {!isMe && (
        <View style={styles.senderAvatar}>
          <Text style={styles.senderAvatarText}>{msg.senderName.charAt(0)}</Text>
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && <Text style={styles.senderName}>{msg.senderName}</Text>}
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.body}</Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
          {new Date(msg.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { messages, sendMessage } = useAppData();
  const [text, setText] = useState('');
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const myMessages = messages.filter(
    m => m.senderId === user?.id || m.receiverId === user?.id
  );

  const handleSend = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage({
      id: Date.now().toString(),
      senderId: user?.id || 'parent',
      senderName: user?.name || 'ولي الأمر',
      receiverId: 'admin',
      body: text.trim(),
      date: new Date().toISOString(),
      read: false,
    });
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.whatsappBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={async () => {
              try {
                const url = 'https://wa.me/249917545129';
                const can = await Linking.canOpenURL(url);
                if (can) { await Linking.openURL(url); }
                else { Alert.alert('واتساب', 'الرقم: +249917545129'); }
              } catch { Alert.alert('واتساب', 'الرقم: +249917545129'); }
            }}
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>أ. سلوى أحمد داموس</Text>
            <Text style={styles.headerSub}>إدارة الروضة — التواصل المباشر</Text>
          </View>
          <View style={styles.adminAvatar}>
            <Ionicons name="shield-checkmark" size={20} color={PARENT_COLOR} />
          </View>
        </View>
      </View>

      <KAV
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={myMessages}
          keyExtractor={m => m.id}
          contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MessageBubble msg={item} isMe={item.senderId === user?.id} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>ابدأ محادثة مع الإدارة</Text>
              <Text style={styles.emptySubText}>يمكنك إرسال استفساراتك أو اقتراحاتك</Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: bottomPadding + 8 }]}>
          <Pressable
            style={({ pressed }) => [styles.sendBtn, !text.trim() && styles.sendBtnDisabled, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color={text.trim() ? '#FFFFFF' : Colors.textLight} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={Colors.textLight}
            value={text}
            onChangeText={setText}
            multiline
            textAlign="right"
          />
        </View>
      </KAV>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: PARENT_COLOR, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  adminAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  headerInfo: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  adminIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  whatsappBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(37,211,102,0.12)', borderWidth: 1, borderColor: 'rgba(37,211,102,0.3)', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' },
  adminIndicatorText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#6EE7B7' },
  messageList: { padding: 16, gap: 12, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  senderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: PARENT_COLOR + '20', justifyContent: 'center', alignItems: 'center' },
  senderAvatarText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: PARENT_COLOR },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: PARENT_COLOR, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, shadowColor: PARENT_COLOR, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  senderName: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: PARENT_COLOR, marginBottom: 4 },
  bubbleText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 20, textAlign: 'right' },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight, marginTop: 4, textAlign: 'left' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  input: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: PARENT_COLOR, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.surfaceAlt },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'center' },
});
