import { rateLimit, type Store, type Options } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import pool from './db';

type Database = Pick<typeof pool, 'query'>;

/** Shared, atomic counters survive restarts and work across application replicas. */
export class PostgresLimitStore implements Store {
  localKeys = false;
  private windowMs = 60_000;
  private nextCleanup = 0;
  constructor(readonly prefix: string, private database: Database = pool) {}
  init(options: Options) { this.windowMs = options.windowMs; }
  private key(value: string) {
    return this.prefix + ':' + createHash('sha256').update(value).digest('hex');
  }
  async increment(value: string) {
    const { rows } = await this.database.query(
      `INSERT INTO request_limits (key, hits, reset_at)
       VALUES ($1, 1, NOW() + $2::integer * INTERVAL '1 millisecond')
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE WHEN request_limits.reset_at <= NOW() THEN 1 ELSE request_limits.hits + 1 END,
         reset_at = CASE WHEN request_limits.reset_at <= NOW()
           THEN NOW() + $2::integer * INTERVAL '1 millisecond' ELSE request_limits.reset_at END
       RETURNING hits, reset_at`,
      [this.key(value), this.windowMs],
    );
    if (Date.now() >= this.nextCleanup) {
      this.nextCleanup = Date.now() + 15 * 60_000;
      // Counter correctness does not depend on pruning; no IP/body is logged.
      this.database.query('DELETE FROM request_limits WHERE reset_at < NOW() - INTERVAL \'1 day\'')
        .catch(() => {});
    }
    return { totalHits: Number(rows[0].hits), resetTime: new Date(rows[0].reset_at) };
  }
  async decrement(value: string) {
    await this.database.query('UPDATE request_limits SET hits = GREATEST(0, hits - 1) WHERE key = $1', [this.key(value)]);
  }
  async resetKey(value: string) {
    await this.database.query('DELETE FROM request_limits WHERE key = $1', [this.key(value)]);
  }
}

export function createAbuseLimiter(prefix: string, limit: number, windowMs: number, database: Database = pool) {
  return rateLimit({
    windowMs, limit,
    store: new PostgresLimitStore(prefix, database),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: false,
    message: { ok: false, error: 'تجاوزت عدد المحاولات المسموح؛ حاول لاحقًا' },
  });
}
