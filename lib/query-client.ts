import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { resolveApiOrigin } from "./api-origin";

function normalizeApiHost(rawHost?: string): string {
  const trimmed = rawHost?.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function getApiHost(): string {
  return normalizeApiHost(process.env.EXPO_PUBLIC_DOMAIN);
}

export function hasApiHost(): boolean {
  return getApiHost().length > 0;
}

export function getApiOrigin(): string {
  return resolveApiOrigin(process.env.EXPO_PUBLIC_DOMAIN);
}

export function getApiUrl(): string {
  // Legacy callers use this as the base for new URL(); it must include a protocol.
  return getApiOrigin();
}

export function makeApiUrl(route: string): string {
  return new URL(route, getApiOrigin()).toString();
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = makeApiUrl(route);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = makeApiUrl(queryKey.join("/") as string);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
