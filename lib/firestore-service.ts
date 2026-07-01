import {
  collection, doc, setDoc, getDoc, getDocs,
  onSnapshot, deleteDoc, query, orderBy, limit,
  serverTimestamp, Unsubscribe, DocumentData,
  writeBatch, where, updateDoc,
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from './firebase';
import { getActiveSchoolId } from './active-school';
import type { Student, Employee, Message, NewsItem, InboxMessage, RegistrationRequest, SchoolEvent, GalleryPhoto } from '@/contexts/AppDataContext';
import type { SchoolBranding, SchoolRegistration } from '@/contexts/SchoolThemeContext';

function sid() { return getActiveSchoolId(); }
function col(path: string) {
  return collection(getDb(), 'schools', sid(), path);
}
function docRef(path: string, id: string) {
  return doc(getDb(), 'schools', sid(), path, id);
}

function guard(): boolean {
  if (!isFirebaseReady()) { console.warn('[Firestore] Firebase not ready — skipping sync'); return false; }
  return true;
}

function onSnapErr(label: string) {
  return (err: Error) => console.error(`[Firestore] ${label} listener error:`, err.message);
}

// ─── Students ────────────────────────────────────────────────────────────────

export async function fsUpsertStudent(student: Student) {
  if (!guard()) return;
  await setDoc(docRef('students', student.id), { ...student, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fsDeleteStudent(id: string) {
  if (!guard()) return;
  await deleteDoc(docRef('students', id));
}

export function fsListenStudents(cb: (students: Student[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  return onSnapshot(
    col('students'),
    snap => { cb(snap.docs.map(d => d.data() as Student)); },
    onSnapErr('students'),
  );
}

export async function fsFetchStudents(): Promise<Student[]> {
  if (!guard()) return [];
  const snap = await getDocs(col('students'));
  return snap.docs.map(d => d.data() as Student);
}

// ─── Employees ───────────────────────────────────────────────────────────────

export async function fsUpsertEmployee(emp: Employee) {
  if (!guard()) return;
  await setDoc(docRef('employees', emp.id), { ...emp, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fsDeleteEmployee(id: string) {
  if (!guard()) return;
  await deleteDoc(docRef('employees', id));
}

export function fsListenEmployees(cb: (employees: Employee[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  return onSnapshot(
    col('employees'),
    snap => { cb(snap.docs.map(d => d.data() as Employee)); },
    onSnapErr('employees'),
  );
}

export async function fsFetchEmployees(): Promise<Employee[]> {
  if (!guard()) return [];
  const snap = await getDocs(col('employees'));
  return snap.docs.map(d => d.data() as Employee);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function fsSendMessage(msg: Message) {
  if (!guard()) return;
  await setDoc(docRef('messages', msg.id), { ...msg, sentAt: serverTimestamp() });
}

export function fsListenMessages(cb: (msgs: Message[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  const q = query(col('messages'), orderBy('date', 'asc'), limit(200));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => d.data() as Message)); },
    onSnapErr('messages'),
  );
}

// ─── News ────────────────────────────────────────────────────────────────────

export async function fsAddNews(item: NewsItem) {
  if (!guard()) return;
  await setDoc(docRef('news', item.id), { ...item, createdAt: serverTimestamp() });
}

export async function fsDeleteNews(id: string) {
  if (!guard()) return;
  await deleteDoc(docRef('news', id));
}

export function fsListenNews(cb: (news: NewsItem[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  const q = query(col('news'), orderBy('date', 'desc'), limit(50));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => d.data() as NewsItem)); },
    onSnapErr('news'),
  );
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

export async function fsAddInbox(msg: InboxMessage) {
  if (!guard()) return;
  await setDoc(docRef('inbox', msg.id), { ...msg, createdAt: serverTimestamp() });
}

export async function fsUpdateInbox(id: string, data: Partial<InboxMessage>) {
  if (!guard()) return;
  await updateDoc(docRef('inbox', id), data);
}

export function fsListenInbox(cb: (inbox: InboxMessage[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  const q = query(col('inbox'), orderBy('date', 'desc'), limit(100));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => d.data() as InboxMessage)); },
    onSnapErr('inbox'),
  );
}

// ─── Registration Requests ────────────────────────────────────────────────────

export async function fsAddRegistrationRequest(req: RegistrationRequest) {
  if (!guard()) return;
  await setDoc(docRef('registrationRequests', req.id), { ...req, syncedAt: serverTimestamp() });
}

export async function fsUpdateRegistrationRequest(id: string, data: Partial<RegistrationRequest>) {
  if (!guard()) return;
  await updateDoc(docRef('registrationRequests', id), data);
}

export async function fsDeleteRegistrationRequest(id: string) {
  if (!guard()) return;
  await deleteDoc(docRef('registrationRequests', id));
}

export function fsListenRegistrationRequests(cb: (reqs: RegistrationRequest[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  const q = query(col('registrationRequests'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => d.data() as RegistrationRequest)); },
    onSnapErr('registrationRequests'),
  );
}

// ─── School Events ────────────────────────────────────────────────────────────

export async function fsAddSchoolEvent(ev: SchoolEvent) {
  if (!guard()) return;
  await setDoc(docRef('schoolEvents', ev.id), { ...ev, syncedAt: serverTimestamp() });
}

export async function fsUpdateSchoolEvent(id: string, data: Partial<SchoolEvent>) {
  if (!guard()) return;
  await updateDoc(docRef('schoolEvents', id), data);
}

export async function fsDeleteSchoolEvent(id: string) {
  if (!guard()) return;
  await deleteDoc(docRef('schoolEvents', id));
}

export function fsListenSchoolEvents(cb: (events: SchoolEvent[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  const q = query(col('schoolEvents'), orderBy('date', 'asc'));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => d.data() as SchoolEvent)); },
    onSnapErr('schoolEvents'),
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export async function fsAddGalleryPhoto(photo: GalleryPhoto) {
  if (!guard()) return;
  await setDoc(docRef('galleryPhotos', photo.id), { ...photo, syncedAt: serverTimestamp() });
}

export async function fsDeleteGalleryPhoto(id: string) {
  if (!guard()) return;
  await deleteDoc(docRef('galleryPhotos', id));
}

export function fsListenGalleryPhotos(cb: (photos: GalleryPhoto[]) => void): Unsubscribe {
  if (!guard()) return () => {};
  const q = query(col('galleryPhotos'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => d.data() as GalleryPhoto)); },
    onSnapErr('galleryPhotos'),
  );
}

// ─── School Settings ──────────────────────────────────────────────────────────

export async function fsSaveSettings(data: Record<string, unknown>) {
  if (!guard()) return;
  await setDoc(doc(getDb(), 'schools', sid()), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function fsListenSettings(cb: (data: DocumentData) => void): Unsubscribe {
  if (!guard()) return () => {};
  return onSnapshot(
    doc(getDb(), 'schools', sid()),
    snap => { if (snap.exists()) cb(snap.data()); },
    onSnapErr('settings'),
  );
}

// ─── School Branding ──────────────────────────────────────────────────────────

export async function fsSaveSchoolBranding(branding: SchoolBranding): Promise<void> {
  if (!guard()) return;
  await setDoc(
    doc(getDb(), 'schools', branding.schoolId, 'config', 'branding'),
    { ...branding, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function fsGetSchoolBranding(schoolId: string): Promise<SchoolBranding | null> {
  if (!guard()) return null;
  const snap = await getDoc(doc(getDb(), 'schools', schoolId, 'config', 'branding'));
  return snap.exists() ? (snap.data() as SchoolBranding) : null;
}

export function fsListenSchoolBranding(schoolId: string, cb: (b: SchoolBranding | null) => void): Unsubscribe {
  if (!guard()) return () => {};
  return onSnapshot(
    doc(getDb(), 'schools', schoolId, 'config', 'branding'),
    snap => { cb(snap.exists() ? (snap.data() as SchoolBranding) : null); },
    onSnapErr('branding'),
  );
}

// ─── School Registry (SaaS multi-school) ─────────────────────────────────────

export async function fsRegisterSchool(school: SchoolRegistration): Promise<void> {
  if (!guard()) return;
  await setDoc(
    doc(getDb(), 'schoolRegistry', school.id),
    { ...school, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function fsListSchools(): Promise<SchoolRegistration[]> {
  if (!guard()) return [];
  const snap = await getDocs(collection(getDb(), 'schoolRegistry'));
  return snap.docs.map(d => d.data() as SchoolRegistration);
}

export async function fsUpdateSchoolRegistry(id: string, patch: Partial<SchoolRegistration>): Promise<void> {
  if (!guard()) return;
  await updateDoc(doc(getDb(), 'schoolRegistry', id), { ...patch, updatedAt: serverTimestamp() });
}

export async function fsDeleteSchoolRegistry(id: string): Promise<void> {
  if (!guard()) return;
  await deleteDoc(doc(getDb(), 'schoolRegistry', id));
}

// ─── Bulk Upload (initial seed) ───────────────────────────────────────────────

export async function fsBulkUploadStudents(students: Student[]) {
  if (!guard() || students.length === 0) return;
  const batchSize = 400;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = writeBatch(getDb());
    students.slice(i, i + batchSize).forEach(s => {
      batch.set(docRef('students', s.id), { ...s, updatedAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }
}

export async function fsBulkUploadEmployees(employees: Employee[]) {
  if (!guard() || employees.length === 0) return;
  const batch = writeBatch(getDb());
  employees.forEach(e => {
    batch.set(docRef('employees', e.id), { ...e, updatedAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  parentName: string;
  childName: string;
  content: string;
  rating: number;
  createdAt: ReturnType<typeof serverTimestamp>;
}

export async function fsAddReview(review: Omit<Review, 'createdAt'>): Promise<void> {
  if (!guard()) return;
  await setDoc(docRef('reviews', review.id), { ...review, createdAt: serverTimestamp() });
}

export async function fsGetReviews(): Promise<Omit<Review, 'createdAt'>[]> {
  if (!guard()) return [];
  try {
    const snap = await getDocs(query(col('reviews'), orderBy('createdAt', 'desc'), limit(20)));
    return snap.docs.map(d => d.data() as Omit<Review, 'createdAt'>);
  } catch {
    return [];
  }
}

// ─── School Requests (top-level, not per-school) ─────────────────────────────

export interface SchoolRequest {
  id: string;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  notes?: string;
  reviewed_by?: string;
  [key: string]: unknown;
}

function schoolRequestsCol() {
  return collection(getDb(), 'school_requests');
}
function schoolRequestDoc(id: string) {
  return doc(getDb(), 'school_requests', id);
}

export async function fsAddSchoolRequest(data: Record<string, unknown>): Promise<string> {
  if (!guard()) throw new Error('Firebase not ready');
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  await setDoc(schoolRequestDoc(id), { ...data, id, status: 'pending', createdAt: serverTimestamp() });
  return id;
}

export async function fsGetSchoolRequests(): Promise<SchoolRequest[]> {
  if (!guard()) return [];
  try {
    const snap = await getDocs(query(schoolRequestsCol(), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => d.data() as SchoolRequest);
  } catch {
    return [];
  }
}

export async function fsUpdateSchoolRequest(id: string, data: Partial<SchoolRequest>): Promise<void> {
  if (!guard()) return;
  await updateDoc(schoolRequestDoc(id), { ...data, updatedAt: serverTimestamp() });
}

export async function fsDeleteSchoolRequest(id: string): Promise<void> {
  if (!guard()) return;
  await deleteDoc(schoolRequestDoc(id));
}
