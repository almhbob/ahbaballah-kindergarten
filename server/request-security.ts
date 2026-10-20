/** Browser allowlist. Native requests without Origin do not use browser CORS. */
export function allowedWebOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const candidates = [
    ...(env.PUBLIC_WEB_ORIGINS || '').split(','),
    ...(env.REPLIT_DOMAINS || '').split(',').filter(Boolean).map((host: string) => `https://${host.trim()}`),
    ...(env.REPLIT_DEV_DOMAIN ? [`https://${env.REPLIT_DEV_DOMAIN}`] : []),
  ];
  const origins = new Set<string>();
  for (const candidate of candidates) {
    try {
      const value = candidate.trim();
      const url = new URL(value);
      if (url.origin !== value || url.username || url.password) continue;
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol === 'https:' || (env.NODE_ENV !== 'production' && loopback && url.protocol === 'http:')) {
        origins.add(url.origin);
      }
    } catch { /* Invalid configuration never grants an origin access. */ }
  }
  return origins;
}

export function isAllowedWebOrigin(origin: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (allowedWebOrigins(env).has(origin)) return true;
  if (env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return origin === url.origin && url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}
