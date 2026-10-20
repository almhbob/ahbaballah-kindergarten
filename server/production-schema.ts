/** Additive schema only. Applying it still requires a separate deployment decision. */
export const productionSchema = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS link_verified BOOLEAN NOT NULL DEFAULT FALSE;
  CREATE TABLE IF NOT EXISTS app_sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
  );
  CREATE INDEX IF NOT EXISTS app_sessions_expire_idx ON app_sessions (expire);
  CREATE TABLE IF NOT EXISTS request_limits (
    key TEXT PRIMARY KEY,
    hits INTEGER NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS request_limits_reset_idx ON request_limits (reset_at);
  CREATE TABLE IF NOT EXISTS enrollment_requests (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    request_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (school_id, request_key)
  );
  CREATE INDEX IF NOT EXISTS enrollment_school_created_idx
    ON enrollment_requests (school_id, created_at DESC);
`;
