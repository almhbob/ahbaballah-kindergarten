import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  Modal, Image, TextInput, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAppData, GalleryPhoto } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_W - 48) / 3;

const CATEGORIES = ['الكل', 'أنشطة', 'احتفالات', 'رحلات', 'تخرج', 'أخرى'];

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 6); }

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { galleryPhotos, addGalleryPhoto, removeGalleryPhoto } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 90;
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  const [activeCategory, setActiveCategory] = useState('الكل');
  const [viewPhoto, setViewPhoto] = useState<GalleryPhoto | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('أنشطة');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = activeCategory === 'الكل'
    ? galleryPhotos
    : galleryPhotos.filter(p => p.category === activeCategory);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setPickedUri(uri);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الكاميرا');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setPickedUri(uri);
    }
  }

  function handleSave() {
    if (!pickedUri) { Alert.alert('تنبيه', 'الرجاء اختيار صورة أولاً'); return; }
    setLoading(true);
    setTimeout(() => {
      addGalleryPhoto({
        id: genId(),
        uri: pickedUri,
        caption: caption.trim() || undefined,
        category,
        addedBy: user?.name ?? 'الإدارة',
        date: new Date().toISOString().split('T')[0],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      setAddMode(false);
      setPickedUri(null);
      setCaption('');
      setCategory('أنشطة');
    }, 300);
  }

  function handleDelete(id: string) {
    Alert.alert('حذف الصورة', 'هل أنت متأكد من حذف هذه الصورة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => { removeGalleryPhoto(id); setViewPhoto(null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030612', '#080f2a', '#0d1a42']} style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>ألبوم الصور</Text>
            <Text style={s.headerSub}>{galleryPhotos.length} صورة</Text>
          </View>
          {isAdmin ? (
            <Pressable style={s.addBtn} onPress={() => setAddMode(true)}>
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          ) : <View style={s.addBtn} />}
        </View>

        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable style={[s.catChip, activeCategory === item && s.catChipActive]}
              onPress={() => { setActiveCategory(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Text style={[s.catText, activeCategory === item && s.catTextActive]}>{item}</Text>
            </Pressable>
          )}
        />
      </LinearGradient>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="images-outline" size={64} color={Colors.textLight} />
          <Text style={s.emptyTitle}>لا توجد صور</Text>
          {isAdmin && <Text style={s.emptySub}>اضغط + لإضافة صورة جديدة</Text>}
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={3}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 12, gap: 4, paddingBottom: bottomPadding }}
          columnWrapperStyle={{ gap: 4 }}
          renderItem={({ item }) => (
            <Pressable style={[s.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
              onPress={() => setViewPhoto(item)}
              onLongPress={() => isAdmin && handleDelete(item.id)}>
              <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {item.caption ? (
                <View style={s.captionOverlay}>
                  <Text style={s.captionText} numberOfLines={1}>{item.caption}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!viewPhoto} animationType="fade" transparent>
        <View style={s.viewOverlay}>
          <Pressable style={s.closeBtn} onPress={() => setViewPhoto(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {isAdmin && viewPhoto && (
            <Pressable style={s.deleteFloatBtn} onPress={() => handleDelete(viewPhoto.id)}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </Pressable>
          )}
          {viewPhoto && (
            <>
              <Image source={{ uri: viewPhoto.uri }} style={s.fullImage} resizeMode="contain" />
              <View style={s.viewMeta}>
                {viewPhoto.caption ? <Text style={s.viewCaption}>{viewPhoto.caption}</Text> : null}
                <Text style={s.viewDate}>{viewPhoto.category} · {viewPhoto.date} · {viewPhoto.addedBy}</Text>
              </View>
            </>
          )}
        </View>
      </Modal>

      <Modal visible={addMode} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>إضافة صورة</Text>

            {pickedUri ? (
              <View style={s.previewBox}>
                <Image source={{ uri: pickedUri }} style={s.preview} resizeMode="cover" />
                <Pressable style={s.changeBtn} onPress={() => setPickedUri(null)}>
                  <Text style={s.changeBtnText}>تغيير الصورة</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.pickRow}>
                <Pressable style={s.pickBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={28} color={Colors.accent} />
                  <Text style={s.pickBtnText}>الكاميرا</Text>
                </Pressable>
                <Pressable style={s.pickBtn} onPress={pickImage}>
                  <Ionicons name="images-outline" size={28} color={Colors.accent} />
                  <Text style={s.pickBtnText}>المعرض</Text>
                </Pressable>
              </View>
            )}

            <Text style={s.label}>التصنيف</Text>
            <View style={s.catRow}>
              {CATEGORIES.slice(1).map(c => (
                <Pressable key={c} style={[s.catPillBtn, category === c && s.catPillActive]}
                  onPress={() => setCategory(c)}>
                  <Text style={[s.catPillText, category === c && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>وصف (اختياري)</Text>
            <TextInput style={s.input} placeholder="أضف وصفاً للصورة..." placeholderTextColor="#666" value={caption} onChangeText={setCaption} textAlign="right" />

            <View style={s.modalBtns}>
              <Pressable style={s.cancelBtn} onPress={() => { setAddMode(false); setPickedUri(null); }}>
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={handleSave} disabled={loading}>
                <LinearGradient colors={['#ca9928','#b8841c']} style={s.saveBtnGrad}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>حفظ</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  catChipActive: { backgroundColor: Colors.accent },
  catText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' },
  catTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textLight },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  photoCell: { borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.surface },
  captionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4 },
  captionText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#fff', textAlign: 'center' },
  viewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  deleteFloatBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 },
  fullImage: { width: SCREEN_W, height: SCREEN_W },
  viewMeta: { padding: 20, alignItems: 'center' },
  viewCaption: { fontSize: 16, fontFamily: 'Inter_500Medium', color: '#fff', textAlign: 'center', marginBottom: 6 },
  viewDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'center', marginBottom: 4 },
  previewBox: { alignItems: 'center', gap: 8 },
  preview: { width: '100%', height: 180, borderRadius: 12 },
  changeBtn: { padding: 8 },
  changeBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.accent },
  pickRow: { flexDirection: 'row', gap: 12 },
  pickBtn: { flex: 1, alignItems: 'center', gap: 8, padding: 20, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  pickBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPillBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  catPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catPillText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textLight, textAlign: 'right' },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: Colors.background, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  saveBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { padding: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
