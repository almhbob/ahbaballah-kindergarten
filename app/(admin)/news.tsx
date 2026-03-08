import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, NewsItem } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const TYPE_CONFIG = {
  news: { label: 'خبر', icon: 'newspaper-variant', color: Colors.accent, bg: '#FFF7ED' },
  trip: { label: 'رحلة', icon: 'bus', color: Colors.success, bg: '#ECFDF5' },
  activity: { label: 'نشاط', icon: 'star-shooting', color: '#3B82F6', bg: '#EFF6FF' },
};

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const { news, addNews, removeNews } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'news' | 'trip' | 'activity'>('news');
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleAdd = () => {
    if (!title || !body) {
      Alert.alert('تنبيه', 'الرجاء ملء العنوان والمحتوى');
      return;
    }
    addNews({
      id: Date.now().toString(),
      title, body, type,
      date: new Date().toISOString().split('T')[0],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setTitle(''); setBody('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('حذف الخبر', 'هل أنت متأكد من حذف هذا الخبر؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removeNews(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>الأخبار والفعاليات</Text>
        </View>
        <View style={styles.typeFilters}>
          {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map(t => (
            <View key={t} style={[styles.typeChip, { backgroundColor: TYPE_CONFIG[t].bg }]}>
              <MaterialCommunityIcons name={TYPE_CONFIG[t].icon as any} size={14} color={TYPE_CONFIG[t].color} />
              <Text style={[styles.typeChipText, { color: TYPE_CONFIG[t].color }]}>
                {news.filter(n => n.type === t).length} {TYPE_CONFIG[t].label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {news.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="newspaper-variant-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>لا توجد أخبار بعد</Text>
              <Text style={styles.emptySubText}>اضغط + لإضافة خبر جديد</Text>
            </View>
          ) : (
            news.map(item => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <View key={item.id} style={styles.newsCard}>
                  <View style={styles.newsCardHeader}>
                    <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </Pressable>
                    <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                      <MaterialCommunityIcons name={cfg.icon as any} size={14} color={cfg.color} />
                      <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <Text style={styles.newsBody} numberOfLines={3}>{item.body}</Text>
                  <View style={styles.newsFooter}>
                    <Text style={styles.newsDate}>{item.date}</Text>
                    <MaterialCommunityIcons name="calendar" size={14} color={Colors.textLight} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>إضافة خبر / فعالية</Text>

            <Text style={styles.modalFieldLabel}>نوع الإعلان</Text>
            <View style={styles.typeSelector}>
              {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map(t => (
                <Pressable
                  key={t}
                  style={[styles.typeSelectorItem, type === t && { backgroundColor: TYPE_CONFIG[t].color }]}
                  onPress={() => { setType(t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <MaterialCommunityIcons name={TYPE_CONFIG[t].icon as any} size={18} color={type === t ? '#FFF' : TYPE_CONFIG[t].color} />
                  <Text style={[styles.typeSelectorText, { color: type === t ? '#FFF' : TYPE_CONFIG[t].color }]}>
                    {TYPE_CONFIG[t].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalFieldLabel}>العنوان *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="عنوان الخبر أو الفعالية"
              placeholderTextColor={Colors.textLight}
              value={title}
              onChangeText={setTitle}
              textAlign="right"
            />

            <Text style={styles.modalFieldLabel}>المحتوى *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="تفاصيل الخبر أو الفعالية..."
              placeholderTextColor={Colors.textLight}
              value={body}
              onChangeText={setBody}
              textAlign="right"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalBtnCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.primary }]} onPress={handleAdd}>
                <Text style={styles.modalBtnConfirmText}>نشر</Text>
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
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  typeFilters: { flexDirection: 'row', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  typeChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  list: { padding: 16, gap: 14 },
  newsCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  newsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  newsTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  newsBody: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 20 },
  newsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  newsDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 16 },
  modalFieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeSelectorItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surfaceAlt },
  typeSelectorText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  modalInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 14 },
  modalTextArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  modalBtnConfirmText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
