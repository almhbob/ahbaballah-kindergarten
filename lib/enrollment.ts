import { fetch } from 'expo/fetch';
import { makeApiUrl } from './query-client';
import type { RegistrationRequest, RegistrationStatus } from '@/contexts/AppDataContext';

async function request(method: string, route: string, body?: unknown) {
  const response = await fetch(makeApiUrl(route), {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await response.json(); } catch { throw new Error('استجابة خادم التسجيل غير صالحة؛ لم تتأكد العملية'); }
  if (!response.ok || !json?.ok) throw new Error(json?.error || 'لم تكتمل العملية على خادم التسجيل');
  return json;
}

export async function submitEnrollment(input: RegistrationRequest) {
  // No client ID/status, document URLs, school ID or local role reaches authority.
  const body = {
    requestKey: input.id,
    childName: input.childName, birthDate: input.birthDate,
    gender: input.gender, requestedLevel: input.requestedLevel,
    parentName: input.parentName, parentPhone: input.parentPhone,
    parentRelation: input.parentRelation, parentEmail: input.parentEmail,
    nationality: input.nationality, notes: input.notes,
  };
  const json = await request('POST', '/api/enrollment-requests', body);
  if (typeof json.receipt?.id !== 'string' || typeof json.receipt?.createdAt !== 'string') {
    throw new Error('لم يرجع الخادم إيصال تسجيل صالحًا؛ لا تعتبر الطلب مُرسلًا');
  }
  return json.receipt as { id: string; createdAt: string };
}

export async function listEnrollments(): Promise<RegistrationRequest[]> {
  const result: RegistrationRequest[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < 50; page++) {
    const route: string = '/api/enrollment-requests' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '');
    const json = await request('GET', route);
    if (!Array.isArray(json.requests)) throw new Error('قائمة طلبات التسجيل غير صالحة');
    result.push(...json.requests);
    cursor = json.nextCursor;
    if (!cursor) return result;
    if (typeof cursor !== 'string' || seen.has(cursor)) throw new Error('تعذر إكمال صفحات طلبات التسجيل');
    seen.add(cursor);
  }
  throw new Error('عدد الطلبات كبير جدًا؛ يلزم عرض مقسّم إلى صفحات بدل تحميله كاملًا');
}

export async function changeEnrollment(id: string, status: RegistrationStatus, rejectionReason?: string) {
  const json = await request('PATCH', '/api/enrollment-requests/' + encodeURIComponent(id), { status, rejectionReason });
  if (!json.request?.id || json.request.id !== id) throw new Error('لم يؤكد الخادم حفظ الطلب الصحيح');
  return json.request as RegistrationRequest;
}

export async function deleteEnrollment(id: string) {
  await request('DELETE', '/api/enrollment-requests/' + encodeURIComponent(id));
}

/** A retry nonce, not a credential, school identity or authorization token. */
export function newEnrollmentKey(): string {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
