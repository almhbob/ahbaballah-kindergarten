import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { makeApiUrl, getApiOrigin } from '@/lib/query-client';

export type UploadedFile = {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  public_url: string;
  created_at: string;
};

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

function fileNameFromUri(uri: string, fallback = 'file'): string {
  try {
    const clean = uri.split('?')[0];
    const last = clean.split('/').pop();
    if (last && last.length > 0) return last;
  } catch {}
  return fallback;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function uploadFile(uri: string, opts?: { name?: string; mime?: string }): Promise<string> {
  if (!uri) throw new Error('لا يوجد ملف للرفع');

  const endpoint = makeApiUrl('/api/files/upload');

  const form = new FormData();

  if (Platform.OS === 'web') {
    let blob: Blob;
    if (uri.startsWith('data:')) {
      blob = await dataUrlToBlob(uri);
    } else if (uri.startsWith('blob:') || uri.startsWith('http')) {
      const r = await fetch(uri);
      blob = await r.blob();
    } else {
      return uri;
    }
    const name = opts?.name || `upload_${Date.now()}.${(blob.type.split('/')[1] || 'bin').split(';')[0]}`;
    form.append('file', blob, name);
  } else {
    const name = opts?.name || fileNameFromUri(uri, `upload_${Date.now()}.jpg`);
    const type = opts?.mime || guessMime(uri);
    // @ts-expect-error RN FormData accepts this object shape
    form.append('file', { uri, name, type });
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  let json: any;
  try { json = await res.json(); } catch { json = null; }

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `فشل رفع الملف (HTTP ${res.status})`);
  }

  const file: UploadedFile = json.file;
  if (file.public_url.startsWith('http')) return file.public_url;
  return new URL(file.public_url, getApiOrigin()).toString();
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
