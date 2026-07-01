import { registerForPushNotifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  fsSavePushToken,
  fsGetParentTokenForStudent,
  fsGetAllTokensByRole,
  type PushTokenEntry,
} from '@/lib/firestore-service';

const TOKEN_REGISTRY_KEY = 'push_token_registry';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function registerAndSaveToken(
  userId: string,
  role: 'admin' | 'teacher' | 'parent',
  linkedStudentId?: string,
): Promise<string | null> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return null;

    const entry: PushTokenEntry = {
      token,
      userId,
      role,
      linkedStudentId,
      registeredAt: new Date().toISOString(),
    };

    // Persist locally for fast offline access
    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    const registry: PushTokenEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = registry.filter(e => e.userId !== userId);
    filtered.push(entry);
    await AsyncStorage.setItem(TOKEN_REGISTRY_KEY, JSON.stringify(filtered));

    // Sync to Firestore so other devices (admin) can look up tokens
    fsSavePushToken(entry).catch(() => {});

    return token;
  } catch (err) {
    console.warn('[PushService] registerAndSaveToken error:', err);
    return null;
  }
}

export async function getTokenForUser(userId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    if (!raw) return null;
    const registry: PushTokenEntry[] = JSON.parse(raw);
    const entry = registry.find(e => e.userId === userId);
    return entry?.token || null;
  } catch {
    return null;
  }
}

export async function getParentTokenForStudent(studentId: string): Promise<string | null> {
  // Check Firestore first (cross-device), fall back to local AsyncStorage
  const firestoreToken = await fsGetParentTokenForStudent(studentId);
  if (firestoreToken) return firestoreToken;

  try {
    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    if (!raw) return null;
    const registry: PushTokenEntry[] = JSON.parse(raw);
    const entry = registry.find(e => e.linkedStudentId === studentId && e.role === 'parent');
    return entry?.token || null;
  } catch {
    return null;
  }
}

export async function getAllTokensByRole(role: 'admin' | 'teacher' | 'parent'): Promise<string[]> {
  // Check Firestore first (cross-device), fall back to local AsyncStorage
  const firestoreTokens = await fsGetAllTokensByRole(role);
  if (firestoreTokens.length > 0) return firestoreTokens;

  try {
    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    if (!raw) return [];
    const registry: PushTokenEntry[] = JSON.parse(raw);
    return registry.filter(e => e.role === role).map(e => e.token);
  } catch {
    return [];
  }
}

async function sendExpoPush(messages: Array<{ to: string; title: string; body: string; data?: Record<string, unknown> }>): Promise<boolean> {
  if (Platform.OS === 'web' || messages.length === 0) return false;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    return res.ok;
  } catch (err) {
    console.warn('[PushService] sendExpoPush error:', err);
    return false;
  }
}

export async function notifyDailyReport(params: {
  studentId: string;
  studentName: string;
  mood: string;
}): Promise<void> {
  const token = await getParentTokenForStudent(params.studentId);
  if (!token) return;
  await sendExpoPush([{ to: token, title: 'تقرير يومي', body: `${params.studentName}: ${params.mood}` }]);
}

export async function notifyAttendanceAlert(params: {
  studentId: string;
  studentName: string;
  attendance: number;
}): Promise<void> {
  const token = await getParentTokenForStudent(params.studentId);
  if (!token) return;
  await sendExpoPush([{ to: token, title: 'تنبيه الحضور', body: `${params.studentName} – نسبة الحضور ${params.attendance}%` }]);
}

export async function notifyPaymentReminder(params: {
  studentId: string;
  studentName: string;
  remaining: number;
  totalFees: number;
}): Promise<void> {
  const token = await getParentTokenForStudent(params.studentId);
  if (!token) return;
  await sendExpoPush([{ to: token, title: 'تذكير بالرسوم', body: `${params.studentName} – المتبقي ${params.remaining} ر.س` }]);
}

export async function broadcastToAll(params: {
  tokens: string[];
  title: string;
  body: string;
  audience?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (params.tokens.length === 0) return;
  await sendExpoPush(params.tokens.map(to => ({ to, title: params.title, body: params.body, data: params.data })));
}

export async function sendToTokens(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (params.tokens.length === 0) return;
  await sendExpoPush(params.tokens.map(to => ({ to, title: params.title, body: params.body, data: params.data })));
}
