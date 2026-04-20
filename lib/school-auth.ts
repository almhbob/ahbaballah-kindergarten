import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getDb, isFirebaseReady } from './firebase';
import type { SubscriptionTier } from './subscription-tiers';

export interface SchoolAdminAccount {
  uid:       string;
  schoolId:  string;
  email:     string;
  role:      'admin';
  tier:      SubscriptionTier;
  createdAt: string;
}

export async function createSchoolAdminAccount(
  schoolId:    string,
  email:       string,
  password:    string,
  displayName: string,
  tier:        SubscriptionTier = 'trial',
): Promise<{ ok: boolean; uid?: string; error?: string }> {
  if (!isFirebaseReady()) return { ok: false, error: 'Firebase غير متاح' };
  try {
    const auth = getFirebaseAuth();
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    const account: SchoolAdminAccount = {
      uid: user.uid, schoolId, email, role: 'admin', tier,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(getDb(), 'schoolAccounts', user.uid), {
      ...account, updatedAt: serverTimestamp(),
    });
    return { ok: true, uid: user.uid };
  } catch (err: any) {
    const code = err?.code ?? '';
    if (code === 'auth/email-already-in-use') return { ok: false, error: 'البريد الإلكتروني مُسجَّل مسبقاً' };
    if (code === 'auth/weak-password')         return { ok: false, error: 'كلمة المرور ضعيفة (6 أحرف على الأقل)' };
    if (code === 'auth/invalid-email')         return { ok: false, error: 'البريد الإلكتروني غير صالح' };
    return { ok: false, error: err?.message ?? 'خطأ غير معروف' };
  }
}

export async function schoolAdminSignIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; schoolId?: string; tier?: SubscriptionTier; displayName?: string; error?: string }> {
  if (!isFirebaseReady()) return { ok: false, error: 'Firebase غير متاح' };
  try {
    const auth = getFirebaseAuth();
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(getDb(), 'schoolAccounts', user.uid));
    if (!snap.exists()) return { ok: false, error: 'الحساب غير مرتبط بأي روضة' };
    const data = snap.data() as SchoolAdminAccount;
    return { ok: true, schoolId: data.schoolId, tier: data.tier, displayName: user.displayName ?? data.email };
  } catch (err: any) {
    const code = err?.code ?? '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return { ok: false, error: 'بريد إلكتروني أو كلمة مرور خاطئة' };
    }
    return { ok: false, error: err?.message ?? 'خطأ في تسجيل الدخول' };
  }
}

export async function schoolAdminSignOut(): Promise<void> {
  if (!isFirebaseReady()) return;
  try { await signOut(getFirebaseAuth()); } catch { /* ignore */ }
}

export async function getSchoolAccount(uid: string): Promise<SchoolAdminAccount | null> {
  if (!isFirebaseReady()) return null;
  try {
    const snap = await getDoc(doc(getDb(), 'schoolAccounts', uid));
    return snap.exists() ? (snap.data() as SchoolAdminAccount) : null;
  } catch { return null; }
}
