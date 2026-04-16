import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView as KAV } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData, Message } from '@/contexts/AppDataContext';

const TEACHER_COLOR = '#1A6B5C';

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 6); }

export default function TeacherMessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { students, messages, sendMessage, employees } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 50;

  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [text, setText] = useState('');

  const myEmployee = employees.find(e => e.id === user?.id);
  const teacherClass = (user as any)?.teacherClass as string | undefined;
  const myStudents = teacherClass
    ? students.filter(s => s.level === teacherClass)
    : students;

  const parentContacts = useMemo(() => myStudents.map(s => ({
    parentId: `parent_${s.id}`,
    parentName: s.parentName,
    studentName: s.name,
    level: s.level,
  })), [myStudents]);

  const unreadByParent = useMemo(() => {
    const map: Record<string, number> = {};
    messages.forEach(m => {
      if (m.receiverId === user?.id && !m.read) {
        map[m.senderId] = (map[m.senderId] ?? 0) + 1;
      }
    });
    return map;
  }, [messages, user?.id]);

  const convo = useMemo(() => {
    if (!activeParentId) return [];
    return messages.filter(m =>
      (m.senderId === user?.id && m.receiverId === activeParentId) ||
      (m.senderId === activeParentId && m.receiverId === user?.id)
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [messages, activeParentId, user?.id]);

  const activeContact = parentContacts.find(p => p.parentId === activeParentId);

  function handleSend() {
    if (!text.trim() || !activeParentId || !user) return;
    sendMessage({
      id: genId(),
      senderId: user.id,
      senderName: user.name,
      receiverId: activeParentId,
      body: text.trim(),
      date: new Date().toISOString(),
      read: false,
    });
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  if (activeParentId && activeContact) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <LinearGradient colors={['#061e1a', '#0d3d35', TEACHER_COLOR]} style={[chat.header, { paddingTop: topPadding + 12 }]}>
          <Pressable onPress={() => setActiveParentId(null)} style={chat.back}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={chat.title}>{activeContact.parentName}</Text>
            <Text style={chat.sub}>ولي أمر {activeContact.studentName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </LinearGradient>

        <KAV style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <FlatList
            data={convo}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={chat.empty}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
                <Text style={chat.emptyText}>ابدأ المحادثة مع ولي الأمر</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.id;
              return (
                <View style={[chat.bubble, isMe ? chat.bubbleMe : chat.bubbleThem]}>
                  <Text style={[chat.bubbleText, isMe ? chat.bubbleTextMe : chat.bubbleTextThem]}>{item.body}</Text>
                  <Text style={[chat.bubbleTime, isMe ? { color: 'rgba(255,255,255,0.5)' } : { color: Colors.textLight }]}>
                    {new Date(item.date).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
          <View style={[chat.inputBar, { paddingBottom: bottomPadding }]}>
            <Pressable
              style={({ pressed }) => [chat.sendBtn, !text.trim() && chat.sendBtnDisabled, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleSend} disabled={!text.trim()}>
              <Ionicons name="send" size={18} color={text.trim() ? '#fff' : Colors.textLight} />
            </Pressable>
            <TextInput
              style={chat.input}
              placeholder="اكتب رسالتك..."
              placeholderTextColor="#666"
              value={text}
              onChangeText={setText}
              multiline
              textAlign="right"
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
        </KAV>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#061e1a', '#0d3d35', TEACHER_COLOR]} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>رسائل أولياء الأمور</Text>
            <Text style={s.headerSub}>{parentContacts.length} ولي أمر</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <FlatList
        data={parentContacts}
        keyExtractor={p => p.parentId}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPadding + 20 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>لا يوجد طلاب في قسمك</Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = unreadByParent[item.parentId] ?? 0;
          const lastMsg = [...messages]
            .filter(m => (m.senderId === item.parentId || m.receiverId === item.parentId) && (m.senderId === user?.id || m.receiverId === user?.id))
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          return (
            <Pressable style={s.card} onPress={() => { setActiveParentId(item.parentId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{item.parentName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.parentName}>{item.parentName}</Text>
                <Text style={s.studentSub}>ولي أمر {item.studentName} — {item.level}</Text>
                {lastMsg && <Text style={s.lastMsg} numberOfLines={1}>{lastMsg.body}</Text>}
              </View>
              {unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unread}</Text>
                </View>
              )}
              <Ionicons name="chevron-back" size={16} color={Colors.textLight} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: TEACHER_COLOR + '30', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: TEACHER_COLOR },
  parentName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'right' },
  studentSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 2 },
  lastMsg: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textLight, textAlign: 'right', marginTop: 3 },
  badge: { backgroundColor: TEACHER_COLOR, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 80 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight },
});

const chat = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 14 },
  bubbleMe: { alignSelf: 'flex-start', backgroundColor: TEACHER_COLOR, borderBottomLeftRadius: 4 },
  bubbleThem: { alignSelf: 'flex-end', backgroundColor: Colors.surface, borderBottomRightRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  bubbleTextMe: { color: '#fff', textAlign: 'left' },
  bubbleTextThem: { color: Colors.text, textAlign: 'right' },
  bubbleTime: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.background, borderRadius: 20, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEACHER_COLOR, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
});
