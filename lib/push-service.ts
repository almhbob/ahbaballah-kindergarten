import { getApiUrl } from '@/lib/query-client';
import { getSavedPushToken, registerForPushNotifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_REGISTRY_KEY = 'push_token_registry';

interface TokenEntry {
  token: string;
  userId: string;
  role: 'admin' | 'teacher' | 'parent';
  linkedStudentId?: string;
  registeredAt: string;
}

export async function registerAndSaveToken(
  userId: string,
  role: 'admin' | 'teacher' | 'parent',
  linkedStudentId?: string,
): Promise<string | null> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return null;

    const entry: TokenEntry = {
      token,
      userId,
      role,
      linkedStudentId,
      registeredAt: new Date().toISOString(),
    };

    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    const registry: TokenEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = registry.filter(e => e.userId !== userId);
    filtered.push(entry);
    await AsyncStorage.setItem(TOKEN_REGISTRY_KEY, JSON.stringify(filtered));

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
    const registry: TokenEntry[] = JSON.parse(raw);
    const entry = registry.find(e => e.userId === userId);
    return entry?.token || null;
  } catch {
    return null;
  }
}

export async function getParentTokenForStudent(studentId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    if (!raw) return null;
    const registry: TokenEntry[] = JSON.parse(raw);
    const entry = registry.find(e => e.linkedStudentId === studentId && e.role === 'parent');
    return entry?.token || null;
  } catch {
    return null;
  }
}

export async function getAllTokensByRole(role: 'admin' | 'teacher' | 'parent'): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_REGISTRY_KEY);
    if (!raw) return [];
    const registry: TokenEntry[] = JSON.parse(raw);
    return registry.filter(e => e.role === role).map(e => e.token);
  } catch {
    return [];
  }
}

async function callPushApi(endpoint: string, body: object): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log(`[PushService] Push skipped on web: ${endpoint}`, body);
    return false;
  }
  try {
    const apiUrl = getApiUrl();
    const url = new URL(`/api/push/${endpoint}`, `https://${apiUrl}`);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`[PushService] /${endpoint}:`, data);
    return res.ok;
  } catch (err) {
    console.warn(`[PushService] /${endpoint} error:`, err);
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
  await callPushApi('daily-report', {
    parentToken: token,
    studentName: params.studentName,
    mood: params.mood,
  });
}

export async function notifyAttendanceAlert(params: {
  studentId: string;
  studentName: string;
  attendance: number;
}): Promise<void> {
  const token = await getParentTokenForStudent(params.studentId);
  if (!token) return;
  await callPushApi('attendance-alert', {
    parentToken: token,
    studentName: params.studentName,
    attendance: params.attendance,
  });
}

export async function notifyPaymentReminder(params: {
  studentId: string;
  studentName: string;
  remaining: number;
  totalFees: number;
}): Promise<void> {
  const token = await getParentTokenForStudent(params.studentId);
  if (!token) return;
  await callPushApi('payment-reminder', {
    parentToken: token,
    studentName: params.studentName,
    remaining: params.remaining,
    totalFees: params.totalFees,
  });
}

export async function broadcastToAll(params: {
  tokens: string[];
  title: string;
  body: string;
  audience?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (params.tokens.length === 0) return;
  await callPushApi('broadcast', params);
}

export async function sendToTokens(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (params.tokens.length === 0) return;
  await callPushApi('send', params);
}
