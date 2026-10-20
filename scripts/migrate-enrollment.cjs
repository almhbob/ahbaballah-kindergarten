/**
 * Staged legacy app_state -> authoritative enrollment migration.
 * Dry-run by default. Never deletes the old source; never prints child data.
 * Freeze legacy writers and verify a backup/restore before explicitly applying.
 */
const { createHash } = require('node:crypto');
const { Pool } = require('pg');

async function migrateEnrollment(pool, { apply = false, schoolId } = {}) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(schoolId || '')) throw new Error('INVALID_SCHOOL');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "SELECT value FROM app_state WHERE key = 'app_registration_requests' FOR UPDATE",
    );
    const records = rows[0]?.value || [];
    if (!Array.isArray(records)) throw new Error('INVALID_LEGACY_COLLECTION');
    const ids = new Set();
    const prepared = records.map(record => {
      if (!record || !/^[a-zA-Z0-9_-]{1,100}$/.test(record.id || '') || ids.has(record.id) ||
          !['pending', 'approved', 'rejected'].includes(record.status) ||
          !['childName', 'parentName', 'parentPhone'].every(key => typeof record[key] === 'string' && record[key].trim()) ||
          typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))) {
        throw new Error('INVALID_LEGACY_RECORD');
      }
      ids.add(record.id);
      const key = 'legacy_' + createHash('sha256').update(record.id).digest('hex');
      return { record, key, hash: createHash('sha256').update(JSON.stringify(record)).digest('hex') };
    });
    let existing = 0;
    for (const { record, key } of prepared) {
      const match = await client.query('SELECT school_id, request_key FROM enrollment_requests WHERE id=$1', [record.id]);
      if (!match.rows[0]) continue;
      if (match.rows[0].school_id !== schoolId || match.rows[0].request_key !== key) throw new Error('LEGACY_ID_CONFLICT');
      existing++;
    }
    let imported = 0;
    if (apply) {
      for (const { record, key, hash } of prepared) {
        const result = await client.query(
          `INSERT INTO enrollment_requests(id,school_id,request_key,request_hash,data,created_at)
           VALUES($1,$2,$3,$4,$5::jsonb,$6::timestamptz)
           ON CONFLICT(id) DO NOTHING RETURNING id`,
          [record.id, schoolId, key, hash, JSON.stringify(record), record.createdAt],
        );
        imported += result.rows.length;
      }
      await client.query('COMMIT');
    } else await client.query('ROLLBACK');
    return { mode: apply ? 'apply' : 'dry-run', total: prepared.length, existing, wouldImport: prepared.length - existing, imported };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = { migrateEnrollment };
if (require.main === module) {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.MIGRATION_BACKUP_RESTORE_VERIFIED !== 'true') {
    console.error('Apply refused: freeze legacy writers and verify backup/restore first.');
    process.exitCode = 1;
  } else {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    migrateEnrollment(pool, { apply, schoolId: process.env.DISMISSAL_SCHOOL_ID || 'ahbabullah' })
      .then(summary => console.log(JSON.stringify(summary)))
      .catch(() => { console.error('Enrollment migration failed; transaction rolled back. Inspect data privately.'); process.exitCode = 1; })
      .finally(() => pool.end());
  }
}
