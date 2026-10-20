import { uploadFile } from './uploads';

export async function uploadSchoolLogo(
  _schoolId: string,
  localUri: string,
  options?: { name?: string; mime?: string },
): Promise<string> {
  return uploadFile(localUri, { ...options, purpose: 'branding' });
}

export async function uploadSchoolAsset(
  _schoolId: string,
  localUri: string,
  assetName: string,
): Promise<string> {
  return uploadFile(localUri, { name: assetName });
}
