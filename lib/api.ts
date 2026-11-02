/**
 * Central API client: resolves the backend URL, attaches the auth token,
 * and notifies listeners when the token changes or is rejected (401).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { makeApiUrl, hasApiHost } from '@/lib/query-client';

const TOKEN_KEY = 'auth_token';

let currentToken: string | null = null;
type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();
const unauthorizedListeners = new Set<() => void>();

async function storeSet(key: string, value: string) {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}
async function storeGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}
async function storeDel(key: string) {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

export function getAuthToken(): string | null {
  return currentToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
  currentToken = token;
  try {
    if (token) await storeSet(TOKEN_KEY, token);
    else await storeDel(TOKEN_KEY);
  } catch { /* storage unavailable — keep in memory */ }
  listeners.forEach(l => l(token));
}

export async function loadAuthToken(): Promise<string | null> {
  try {
    currentToken = await storeGet(TOKEN_KEY);
  } catch {
    currentToken = null;
  }
  return currentToken;
}

export function onAuthTokenChange(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Called when the server rejects our token (expired / revoked). */
export function onUnauthorized(l: () => void): () => void {
  unauthorizedListeners.add(l);
  return () => { unauthorizedListeners.delete(l); };
}

export function isApiConfigured(): boolean {
  return hasApiHost();
}

/**
 * fetch() against the backend with JSON + bearer auth.
 * `route` is an absolute API path such as `/api/state`.
 */
export async function apiFetch(route: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
  const { json, headers, ...rest } = init;
  const h: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  if (json !== undefined) h['Content-Type'] = 'application/json';
  if (currentToken && !h.Authorization) h.Authorization = `Bearer ${currentToken}`;
  const res = await fetch(makeApiUrl(route), {
    ...rest,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401 && currentToken && h.Authorization === `Bearer ${currentToken}`) {
    unauthorizedListeners.forEach(l => l());
  }
  return res;
}

/** Convenience: apiFetch + JSON parse, never throws. */
export async function apiJson<T = any>(route: string, init: RequestInit & { json?: unknown } = {}): Promise<T & { ok: boolean; error?: string; status?: number }> {
  try {
    const res = await apiFetch(route, init);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...(body as object) } as any;
  } catch {
    return { ok: false, error: 'تعذّر الاتصال بالخادم، تحقق من الإنترنت' } as any;
  }
}
