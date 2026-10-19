import { fetch } from 'expo/fetch';
import { makeApiUrl } from './query-client';

export interface DismissalStudent {
  id: string;
  name: string;
  level: string;
}

export interface DismissalRecord {
  id: number;
  studentId: string;
  schoolDate: string;
  dismissedAt: string;
  receiverName: string;
  receiverRelationship: string;
  actorName: string;
}

export interface DismissalToday {
  schoolDate: string;
  dismissals: DismissalRecord[];
}

export interface DismissalRequest {
  receiverName: string;
  receiverRelationship: string;
  confirmedAuthorizedPickup: boolean;
}

export function validateReceiverDetails(input: DismissalRequest): string | null {
  if (!input || typeof input !== 'object') return 'بيانات المستلم غير صالحة';
  if (typeof input.receiverName !== 'string' || input.receiverName.trim().length < 2 || input.receiverName.trim().length > 120) {
    return 'يرجى إدخال اسم المستلم (من حرفين إلى 120 حرفاً)';
  }
  if (typeof input.receiverRelationship !== 'string' || input.receiverRelationship.trim().length < 2 || input.receiverRelationship.trim().length > 80) {
    return 'يرجى إدخال صلة القرابة (من حرفين إلى 80 حرفاً)';
  }
  if (input.confirmedAuthorizedPickup !== true) {
    return 'يجب تأكيد التحقق من أن المستلم مخوّل باستلام الطالب';
  }
  return null;
}

export function dateKeyAt(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || `تعذّر إكمال الطلب (HTTP ${response.status})`);
  }
  return body as T;
}

export async function fetchDismissalStudents(): Promise<DismissalStudent[]> {
  const response = await fetch(makeApiUrl('/api/dismissal/students'), { credentials: 'include' });
  const result = await parseResponse<{ ok: true; students: DismissalStudent[] }>(response);
  return result.students;
}

export async function fetchTodayDismissals(): Promise<DismissalToday> {
  const response = await fetch(makeApiUrl('/api/dismissal/today'), { credentials: 'include' });
  const result = await parseResponse<{ ok: true; today: DismissalToday }>(response);
  return result.today;
}

export async function checkoutStudent(studentId: string, details: DismissalRequest): Promise<DismissalRecord> {
  if (!studentId.trim()) throw new Error('معرّف الطالب غير صالح');
  const validationError = validateReceiverDetails(details);
  if (validationError) throw new Error(validationError);
  const response = await fetch(makeApiUrl(`/api/dismissal/${encodeURIComponent(studentId)}/checkout`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
    credentials: 'include',
  });
  const result = await parseResponse<{ ok: true; dismissal: DismissalRecord }>(response);
  return result.dismissal;
}
