const REQUIRED_ENV = [
  'DATABASE_URL',
  'SESSION_SECRET',
] as const;

export function validateServerEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }

    console.warn(`[env] ${message}`);
    console.warn('[env] Development mode will continue, but production deployment must define these values.');
  }

  if (process.env.NODE_ENV === 'production' && process.env.SESSION_SECRET === 'ahbaballah-fallback-secret') {
    throw new Error('SESSION_SECRET must be a strong secret in production.');
  }
}
