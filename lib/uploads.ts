import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

function guessMime(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('http')) {
      const r = await fetch(uri);
      return r.blob();
    }
    throw new Error('Unsupported URI scheme on web');
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadFile(uri: string, opts?: { name?: string; mime?: string }): Promise<string> {
  if (!uri) throw new Error('لا يوجد ملف للرفع');
  const storage = getFirebaseStorage();
  const blob = await uriToBlob(uri);
  const name = opts?.name || `upload_${Date.now()}.jpg`;
  const contentType = opts?.mime || guessMime(uri);
  const storageRef = ref(storage, `uploads/${name}`);
  const snapshot = await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(snapshot.ref);
}

export async function uploadMany(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(u => uploadFile(u)));
}

export function isRemoteUrl(uri: string | undefined | null): boolean {
  return !!uri && /^https?:\/\//i.test(uri);
}

export async function pickAndUploadImage(
  _context?: string,
): Promise<{ publicUrl: string } | null> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('الصلاحية مرفوضة', 'يرجى السماح بالوصول إلى مكتبة الصور من الإعدادات');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
    base64: false,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const publicUrl = await uploadFile(asset.uri, {
    name: asset.fileName ?? undefined,
    mime: asset.mimeType ?? undefined,
  });

  return { publicUrl };
}
