import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fetch as expoFetch } from 'expo/fetch';
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
  if (!res.ok) throw new Error(`تعذر قراءة الصورة المحددة (HTTP ${res.status})`);
  return await res.blob();
}

function responseError(json: any, status: number): string {
  if (typeof json?.error === 'string' && json.error.trim()) return json.error;
  return `فشل رفع الملف (HTTP ${status})`;
}

function resolveServeUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('استجابة الخادم لا تحتوي على رابط صالح للملف');
  }

  const origin = new URL(getApiOrigin());
  let resolved: URL;
  try {
    if (rawUrl.startsWith('//') || rawUrl.startsWith('\\')) {
      throw new Error('رابط الملف غير مسموح');
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      resolved = new URL(rawUrl);
    } else {
      if (!rawUrl.startsWith('/')) throw new Error('مسار الملف غير مسموح');
      resolved = new URL(rawUrl, origin);
    }
  } catch {
    throw new Error('استجابة الخادم تحتوي على رابط ملف غير صالح');
  }

  if (
    resolved.origin !== origin.origin ||
    !/^\/api\/files\/serve\/[^/]+\/[^/]+\/[^/]+$/.test(resolved.pathname)
  ) {
    throw new Error('رابط الملف غير آمن أو لا ينتمي إلى خادم التطبيق');
  }
  return resolved.toString();
}

export async function uploadFile(
  uri: string,
  opts?: { name?: string; mime?: string; purpose?: 'branding' },
): Promise<string> {
  if (!uri) throw new Error('لا يوجد ملف للرفع');

  const route = opts?.purpose
    ? `/api/files/upload?purpose=${encodeURIComponent(opts.purpose)}`
    : '/api/files/upload';
  const endpoint = makeApiUrl(route);

  const form = new FormData();

  if (Platform.OS === 'web') {
    let blob: Blob;
    if (uri.startsWith('data:')) {
      blob = await dataUrlToBlob(uri);
    } else if (/^(blob:|https?:\/\/)/i.test(uri)) {
      const r = await fetch(uri);
      if (!r.ok) throw new Error(`تعذر قراءة الصورة المحددة (HTTP ${r.status})`);
      blob = await r.blob();
    } else {
      throw new Error('صيغة رابط الصورة غير مدعومة على هذا الجهاز');
    }
    if (!blob || typeof blob.size !== 'number' || blob.size === 0) {
      throw new Error('الصورة المحددة فارغة أو تعذر قراءتها');
    }
    const extension = (blob.type.split('/')[1] || 'bin').split(';')[0];
    const name = opts?.name || `upload_${Date.now()}.${extension}`;
    form.append('file', blob, name);
  } else {
    if (!/^(file|content|ph|assets-library|asset-library):\/\//i.test(uri)) {
      throw new Error('صيغة رابط الصورة المحلية غير مدعومة على هذا الجهاز');
    }
    const name = opts?.name || fileNameFromUri(uri, `upload_${Date.now()}`);
    const type = opts?.mime || guessMime(uri);
    // @ts-expect-error RN FormData accepts this object shape
    form.append('file', { uri, name, type });
  }

  const res = await expoFetch(endpoint, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  let json: any;
  try {
    const body = await res.text();
    try { json = JSON.parse(body); } catch { json = null; }
  } catch {
    json = null;
  }

  if (!res.ok || !json?.ok) {
    throw new Error(responseError(json, res.status));
  }

  const file: UploadedFile | undefined = json.file;
  return resolveServeUrl(file?.public_url);
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
