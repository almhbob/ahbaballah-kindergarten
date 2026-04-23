import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, ScrollView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows } from '@/constants/colors';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';

interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  type: 'pdf' | 'image' | 'note' | 'link' | 'worksheet';
  url?: string;
  content?: string;
  authorName: string;
  authorId: string;
  date: string;
  likes: string[];
  downloads: number;
}

const SUBJECTS = ['الرياضيات', 'اللغة العربية', 'العلوم', 'التربية الإسلامية', 'الرسم', 'الأنشطة', 'عام'];
const LEVELS   = ['جميع المستويات', 'براعم', 'مستوى أول', 'مستوى ثاني'];
const TYPES: { key: Resource['type']; label: string; icon: string; color: string }[] = [
  { key: 'note',      label: 'ملاحظة',   icon: 'document-text-outline', color: '#3B82F6' },
  { key: 'worksheet', label: 'ورقة عمل', icon: 'newspaper-outline',     color: '#8B5CF6' },
  { key: 'link',      label: 'رابط',      icon: 'link-outline',          color: '#10B981' },
  { key: 'pdf',       label: 'ملف PDF',   icon: 'document-outline',      color: '#EF4444' },
  { key: 'image',     label: 'صورة',      icon: 'image-outline',         color: '#F59E0B' },
];

function generateId() {
  return `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function getTypeConfig(type: Resource['type']) {
  return TYPES.find(t => t.key === type) || TYPES[0];
}

function ResourceCard({
  resource,
  currentUserId,
  onLike,
  onDelete,
}: {
  resource: Resource;
  currentUserId: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg    = getTypeConfig(resource.type);
  const liked  = resource.likes.includes(currentUserId);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: cfg.color + '18' }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle} numberOfLines={1}>{resource.title}</Text>
          <View style={styles.cardTags}>
            <View style={[styles.tag, { backgroundColor: Colors.teacher + '15' }]}>
              <Text style={[styles.tagText, { color: Colors.teacher }]}>{resource.subject}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: Colors.primary + '10' }]}>
              <Text style={[styles.tagText, { color: Colors.primary }]}>{resource.level}</Text>
            </View>
          </View>
        </View>
        {resource.authorId === currentUserId && (
          <Pressable onPress={() => onDelete(resource.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </Pressable>
        )}
      </View>

      {resource.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{resource.description}</Text>
      ) : null}

      {resource.content && resource.type === 'note' && (
        <View style={styles.noteContent}>
          <Text style={styles.noteText} numberOfLines={4}>{resource.content}</Text>
        </View>
      )}

      {resource.url && resource.type === 'link' && (
        <View style={styles.linkBox}>
          <Ionicons name="link" size={14} color={Colors.info} />
          <Text style={styles.linkText} numberOfLines={1}>{resource.url}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.authorText}>
          <Ionicons name="person-outline" size={11} color={Colors.textLight} /> {resource.authorName}
        </Text>
        <Text style={styles.dateText}>{resource.date}</Text>
        <Pressable
          style={[styles.likeBtn, liked && styles.likeBtnActive]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLike(resource.id);
          }}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={14} color={liked ? Colors.danger : Colors.textLight} />
          <Text style={[styles.likeCount, liked && { color: Colors.danger }]}>{resource.likes.length}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ResourcesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { employees } = useAppData();

  const [resources, setResources] = useState<Resource[]>([
    {
      id: 'demo1',
      title: 'نشاط تعليمي: الأرقام من 1 إلى 10',
      description: 'ورقة عمل تفاعلية لتعليم الأرقام بطريقة ممتعة مع الألوان',
      subject: 'الرياضيات', level: 'براعم', type: 'worksheet',
      authorName: 'المعلمة أمل', authorId: 'demo_teacher',
      date: new Date().toLocaleDateString('ar-SA'),
      likes: [], downloads: 12,
    },
    {
      id: 'demo2',
      title: 'قصيدة الحروف الهجائية',
      description: 'قصيدة جميلة لحفظ الحروف بطريقة غنائية',
      subject: 'اللغة العربية', level: 'مستوى أول', type: 'note',
      content: 'الألف أول الحروف\nوالباء تليها بشوق\nالتاء والثاء معاً\nتُكمل درب الطريق',
      authorName: 'المعلمة سارة', authorId: 'demo_teacher2',
      date: new Date().toLocaleDateString('ar-SA'),
      likes: [], downloads: 8,
    },
    {
      id: 'demo3',
      title: 'موقع تعليمي مميز للأطفال',
      description: 'موقع رائع فيه ألعاب تعليمية لجميع المستويات',
      subject: 'عام', level: 'جميع المستويات', type: 'link',
      url: 'https://www.education.com',
      authorName: 'إدارة الروضة', authorId: 'admin',
      date: new Date().toLocaleDateString('ar-SA'),
      likes: [], downloads: 25,
    },
  ]);

  const [filterSubject, setFilterSubject] = useState('الكل');
  const [filterLevel, setFilterLevel]     = useState('جميع المستويات');
  const [filterType, setFilterType]       = useState<Resource['type'] | 'all'>('all');
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [saving, setSaving]               = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', subject: SUBJECTS[0],
    level: LEVELS[0], type: 'note' as Resource['type'],
    url: '', content: '',
  });

  const currentUserId = user?.id || 'unknown';
  const currentUserName = employees.find(e => e.id === currentUserId)?.name || user?.name || 'معلم';

  const filtered = resources.filter(r => {
    if (search && !r.title.includes(search) && !r.description.includes(search)) return false;
    if (filterSubject !== 'الكل' && r.subject !== filterSubject) return false;
    if (filterLevel !== 'جميع المستويات' && r.level !== filterLevel && r.level !== 'جميع المستويات') return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    return true;
  });

  const handleLike = useCallback((id: string) => {
    setResources(prev => prev.map(r => {
      if (r.id !== id) return r;
      const liked = r.likes.includes(currentUserId);
      return {
        ...r,
        likes: liked ? r.likes.filter(uid => uid !== currentUserId) : [...r.likes, currentUserId],
      };
    }));
  }, [currentUserId]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('حذف المورد', 'هل أنت متأكد من حذف هذا المورد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => setResources(prev => prev.filter(r => r.id !== id)) },
    ]);
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('خطأ', 'العنوان مطلوب');
      return;
    }
    if (form.type === 'link' && !form.url.trim()) {
      Alert.alert('خطأ', 'الرابط مطلوب');
      return;
    }
    if (form.type === 'note' && !form.content.trim()) {
      Alert.alert('خطأ', 'محتوى الملاحظة مطلوب');
      return;
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 500));

    const newResource: Resource = {
      id: generateId(),
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subject,
      level: form.level,
      type: form.type,
      url: form.type === 'link' ? form.url.trim() : undefined,
      content: form.type === 'note' ? form.content.trim() : undefined,
      authorName: currentUserName,
      authorId: currentUserId,
      date: new Date().toLocaleDateString('ar-SA'),
      likes: [],
      downloads: 0,
    };

    setResources(prev => [newResource, ...prev]);
    setForm({ title: '', description: '', subject: SUBJECTS[0], level: LEVELS[0], type: 'note', url: '', content: '' });
    setSaving(false);
    setShowModal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الموارد التعليمية</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن مورد..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {(['الكل', ...SUBJECTS]).map(s => (
          <Pressable
            key={s}
            style={[styles.filterChip, filterSubject === s && styles.filterChipActive]}
            onPress={() => setFilterSubject(s)}
          >
            <Text style={[styles.filterChipText, filterSubject === s && styles.filterChipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow} contentContainerStyle={styles.filterContent}>
        <Pressable
          style={[styles.typeChip, filterType === 'all' && styles.typeChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.typeChipText, filterType === 'all' && { color: '#fff' }]}>الكل</Text>
        </Pressable>
        {TYPES.map(t => (
          <Pressable
            key={t.key}
            style={[styles.typeChip, filterType === t.key && { backgroundColor: t.color }]}
            onPress={() => setFilterType(t.key)}
          >
            <Ionicons name={t.icon as any} size={14} color={filterType === t.key ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.typeChipText, filterType === t.key && { color: '#fff' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="bookshelf" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>لا توجد موارد بهذا التصفية</Text>
          <Text style={styles.emptySubText}>اضغط + لإضافة مورد جديد</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <ResourceCard
              resource={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { paddingTop: Platform.OS === 'web' ? 24 : 20 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
            <Text style={styles.modalTitle}>إضافة مورد تعليمي</Text>
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>حفظ</Text>}
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>نوع المورد</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TYPES.map(t => (
                  <Pressable
                    key={t.key}
                    style={[styles.typeOption, form.type === t.key && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setForm(f => ({ ...f, type: t.key }))}
                  >
                    <Ionicons name={t.icon as any} size={18} color={form.type === t.key ? '#fff' : t.color} />
                    <Text style={[styles.typeOptionText, form.type === t.key && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>العنوان *</Text>
            <TextInput
              style={styles.input}
              placeholder="عنوان المورد"
              placeholderTextColor={Colors.textLight}
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
              textAlign="right"
            />

            <Text style={styles.fieldLabel}>الوصف</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="وصف مختصر (اختياري)"
              placeholderTextColor={Colors.textLight}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              multiline numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
            />

            {form.type === 'note' || form.type === 'worksheet' ? (
              <>
                <Text style={styles.fieldLabel}>المحتوى *</Text>
                <TextInput
                  style={[styles.input, styles.textareaLg]}
                  placeholder="اكتب محتوى الملاحظة أو ورقة العمل هنا..."
                  placeholderTextColor={Colors.textLight}
                  value={form.content}
                  onChangeText={v => setForm(f => ({ ...f, content: v }))}
                  multiline numberOfLines={6}
                  textAlign="right"
                  textAlignVertical="top"
                />
              </>
            ) : null}

            {form.type === 'link' ? (
              <>
                <Text style={styles.fieldLabel}>الرابط *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={Colors.textLight}
                  value={form.url}
                  onChangeText={v => setForm(f => ({ ...f, url: v }))}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>المادة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SUBJECTS.map(s => (
                  <Pressable
                    key={s}
                    style={[styles.optionChip, form.subject === s && styles.optionChipActive]}
                    onPress={() => setForm(f => ({ ...f, subject: s }))}
                  >
                    <Text style={[styles.optionChipText, form.subject === s && { color: '#fff' }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>المستوى</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {LEVELS.map(l => (
                  <Pressable
                    key={l}
                    style={[styles.optionChip, form.level === l && styles.optionChipActive]}
                    onPress={() => setForm(f => ({ ...f, level: l }))}
                  >
                    <Text style={[styles.optionChipText, form.level === l && { color: '#fff' }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.teacher, justifyContent: 'center', alignItems: 'center',
    ...Shadows.md,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput:  { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text },
  filterRow:    { maxHeight: 44 },
  filterContent:{ paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive:     { backgroundColor: Colors.teacher, borderColor: Colors.teacher },
  filterChipText:       { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  typeRow:    { maxHeight: 44, marginTop: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.teacher, borderColor: Colors.teacher },
  typeChipText:   { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  list:  { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 14, gap: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  typeIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  cardMeta:    { flex: 1, gap: 4 },
  cardTitle:   { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  cardTags:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText:     { fontSize: 11, fontFamily: 'Inter_500Medium' },
  deleteBtn:   { padding: 6 },
  cardDesc:    { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 20 },
  noteContent: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: '#3B82F6',
  },
  noteText:    { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 22 },
  linkBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 8,
  },
  linkText:    { fontSize: 12, color: Colors.info, fontFamily: 'Inter_400Regular', flex: 1 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorText:  { fontSize: 11, color: Colors.textLight, fontFamily: 'Inter_400Regular', flex: 1 },
  dateText:    { fontSize: 11, color: Colors.textLight, fontFamily: 'Inter_400Regular' },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, backgroundColor: Colors.surfaceAlt,
  },
  likeBtnActive: { backgroundColor: '#FEF2F2' },
  likeCount:     { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textLight },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 40 },
  emptyText:    { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.textLight, fontFamily: 'Inter_400Regular' },
  modal:    { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text },
  saveBtn: {
    backgroundColor: Colors.teacher, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  saveBtnText:   { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  modalBody:     { flex: 1, padding: 20 },
  fieldLabel:    { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, fontSize: 14,
    fontFamily: 'Inter_400Regular', color: Colors.text, marginBottom: 14,
  },
  textarea:      { height: 80, marginBottom: 14 },
  textareaLg:    { height: 130, marginBottom: 14 },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeOptionText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  optionChipActive: { backgroundColor: Colors.teacher, borderColor: Colors.teacher },
  optionChipText:   { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
});
