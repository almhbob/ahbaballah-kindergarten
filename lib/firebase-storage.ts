import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';
import { Platform } from 'react-native';

async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.blob();
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

export async function uploadSchoolLogo(schoolId: string, localUri: string): Promise<string> {
  const storage = getFirebaseStorage();
  const blob = await uriToBlob(localUri);
  const extension = localUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const storageRef = ref(storage, `schools/${schoolId}/logo_${Date.now()}.${extension}`);
  const snapshot = await uploadBytes(storageRef, blob, { contentType: `image/${extension}` });
  return getDownloadURL(snapshot.ref);
}

export async function uploadSchoolAsset(schoolId: string, localUri: string, assetName: string): Promise<string> {
  const storage = getFirebaseStorage();
  const blob = await uriToBlob(localUri);
  const extension = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const storageRef = ref(storage, `schools/${schoolId}/assets/${assetName}.${extension}`);
  const snapshot = await uploadBytes(storageRef, blob, { contentType: `image/${extension}` });
  return getDownloadURL(snapshot.ref);
}
