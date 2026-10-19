/** Parse the configured API origin without accepting credentials, paths or lookalike hosts. */
export function resolveApiOrigin(rawHost?: string): string {
  const host = rawHost?.trim();
  if (!host) {
    throw new Error("API host is not configured. Set EXPO_PUBLIC_DOMAIN for backend features.");
  }
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/i.test(host);
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(host)
    ? host
    : `${localHost ? "http" : "https"}://${host}`;
  const url = new URL(candidate);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (url.protocol === "http:" && !isLocal) ||
    url.username || url.password || url.search || url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("EXPO_PUBLIC_DOMAIN must be an HTTPS origin (HTTP is allowed only for loopback development).");
  }
  return url.origin;
}
