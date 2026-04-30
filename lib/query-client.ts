import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

const FALLBACK_DOMAIN = "2da91909-13d4-406a-9a2d-d1b8d967dac8-00-3nkqebbufimgh.pike.replit.dev";

function normalizeApiHost(rawHost?: string): string {
  const trimmed = rawHost?.trim();
  if (!trimmed) return FALLBACK_DOMAIN;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function getApiHost(): string {
  return normalizeApiHost(process.env.EXPO_PUBLIC_DOMAIN || FALLBACK_DOMAIN);
}

export function getApiOrigin(): string {
  const host = getApiHost();
  const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Legacy helper kept for older screens that prepend their own protocol.
 * For new code, prefer getApiOrigin() or makeApiUrl().
 */
export function getApiUrl(): string {
  return getApiHost();
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
