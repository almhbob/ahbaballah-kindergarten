import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getDb, isFirebaseReady, SCHOOL_ID } from './firebase';

export type SchoolJoinRequestPayload = {
  school_name: string;
  school_type: string;
  city: string;
  address: string;
  license_number: string;
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  slogan: string;
  principal_name: string;
  school_motto: string;
  letterhead_address: string;
  stamp_info: string;
  requested_tier: string;
  wants_trial: boolean;
};

function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}

function requestId(payload: SchoolJoinRequestPayload) {
  const school = payload.school_name.trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'school';
  return `${school}_${Date.now()}`;
}

export async function submitSchoolJoinRequestToFirebase(payload: SchoolJoinRequestPayload): Promise<{ id: string }> {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured');
  }

  const db = getDb();
  const email = cleanEmail(payload.admin_email);
  const requests = collection(db, 'schools', SCHOOL_ID, 'schoolJoinRequests');

  const existingQuery = query(requests, where('admin_email', '==', email), where('status', 'in', ['pending', 'approved']), limit(1));
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    throw new Error('يوجد طلب مسبق بهذا البريد الإلكتروني');
  }

  const id = requestId(payload);
  await setDoc(doc(db, 'schools', SCHOOL_ID, 'schoolJoinRequests', id), {
    ...payload,
    id,
    admin_email: email,
    admin_phone: payload.admin_phone.trim(),
    school_name: payload.school_name.trim(),
    admin_name: payload.admin_name.trim(),
    status: 'pending',
    source: 'mobile-app',
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
  });

  return { id };
}
