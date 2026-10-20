# Staged production migration — not a live release

## Decision: NO-GO until migration and end-to-end acceptance

This patch is a draft. No deployed configuration, database, Firebase rules,
account passwords, live files, main branch, or production service was changed.
This document supersedes the identity/session/enrollment and quality-gate status
in the earlier image report. Image-specific safeguards in that report still apply.

### Implemented and locally verified

- Removed local/demo password login, cached-user authentication and biometric
  identity restoration without a valid app-server session. Password spaces are
  preserved. `/me` rechecks the database; disabled accounts, revoked sessions and
  unverified legacy parent/teacher links fail closed.
- Current app-server users are the authority. `link_verified` defaults to false
  for legacy links; no formerly self-assigned child/employee ID is trusted.
  The teacher's class is derived from its linked roster record, not its employee ID.
- Account provisioning requires an administrator, an existing roster record, and
  a 12+ character password (maximum 72 UTF-8 bytes). It never replaces the admin
  session. The registration UI no longer writes plaintext roster passwords or
  reports success after an API failure. Login also refuses old short passwords.
- Sessions use `connect-pg-simple` and the `app_sessions` table, not MemoryStore.
  Startup refuses to accept traffic if schema initialization fails. Production
  still requires `DATABASE_URL` and a 32-byte-or-longer `SESSION_SECRET`.
- Login and public submissions have atomic, PostgreSQL-backed rate counters:
  they survive restarts and are shared between replicas. Keys are hashed.
  Login: 40/IP/15min; registration and public submissions: 10/IP/hour.
  Review the NAT/proxy topology before adjusting these limits.
- Public child enrollment returns a database receipt only after persistence.
  Stable retry keys deduplicate simultaneous submissions; reusing a key with
  different data returns 409. A browser cannot choose approval, school, actor,
  receipt ID or document URLs. Private list/status/delete are admin-only.
- Both enrollment forms await a real receipt; failures preserve the form and
  retry key. Admin status/delete operations await the server, with visible errors.
  Listings use compound keyset cursors preserving database microsecond precision.
- Legacy enrollment import is provided in `scripts/migrate-enrollment.cjs`.
  Default execution is a read/validate dry-run; applying requires `--apply`
  and explicit backup/restore acknowledgement. It preserves its old source,
  uses a transaction, refuses conflicting IDs, and is idempotent.
  The acknowledgement flag is NOT proof that a backup or restore exists.
- Guest/non-admin views do not restore/expose the whole-school private cache.
  Old asynchronous admin loads are cancelled on identity changes. Real production
  rosters/inboxes no longer start with demonstration records.
- Legacy client Firestore sync is off by default. Proposed Firestore rules deny
  all client access rather than trusting arbitrary authenticated users or
  self-created schoolAccounts. These rules have NOT been deployed.
- Public reviews are pending moderation; private moderation/list/delete require
  an admin session. Previously public moderation endpoints are closed.
- The eleven Expo SDK 54 patch-version mismatches were aligned in the manifest
  and lock. Existing lint warnings were repaired without rule suppression;
  the CI threshold is now **zero warnings**, not 50.
- Replaced the inherited Android workflow's invalid, unindented Python/YAML
  blocks. Android builds are now manual-only, require explicit staging approval
  and a healthy stable HTTPS API, and do not submit/publish an application.
  Signed artifact URLs are not echoed. No EAS build was started here.

### Verification evidence and limits

- 90/90 local tests passed, zero failures and zero skipped tests, using a fresh
  temporary PostgreSQL database. No production database was involved.
- Real SQL/HTTP coverage includes persistent sessions across two app instances,
  immediate disabled-account revocation, trusted teacher-class mapping,
  cross-instance HTTP 429 responses, moderation permissions, enrollment
  receipts/retry conflicts, migration idempotency, and pagination tie boundaries.
- Ten simultaneous dismissal requests produced one accepted checkout and nine
  conflicts, with actor and school taken from the server.
- Existing image decode, metadata removal, access control, multipart boundary,
  size/pixel limits, path containment, storage-failure cleanup and client error
  propagation tests still pass.
- Full local ESLint passes with zero errors and zero warnings.
- A full local TypeScript run exceeded this conversation environment's 1.6 GiB
  memory limit. GitHub CI must verify TypeScript and the web bundle on the exact
  published commit; do not present the local timeout as a passing typecheck.
- The first GitHub pass caught new TypeScript regressions (missing UI bindings,
  role narrowing and a store interface visibility mismatch). They were corrected
  instead of suppressing the typecheck. Exact correction-head CI is required.
- CI now provisions a disposable PostgreSQL 17 service and enables the real
  database tests. The service's test-only trust authentication is NOT a
  production database configuration.
- No Android/iOS build, installed-device test, live API image round-trip,
  restore rehearsal, or Firebase emulator/deployment was performed here.

## Ordered release blockers

1. **Locate and prepare the actual staging/production service.** The configured
   temporary `.replit.dev` API previously returned an HTML 404/offline page.
   A health failure does not prove which API an installed APK is using.
   No matching Replit project was found, and the available Railway inventory did
   not identify a kindergarten service. Choose the actual service and stable HTTPS
   API/web origins; confirm database connection, trusted proxy count and TLS.
2. **Freeze/export legacy authorities before cutover.** Back up PostgreSQL,
   Firestore, private files and potentially unsynced device-only records. Prove
   restore and compare record counts before importing; do not delete old caches,
   source collections or files to make migration appear complete.
3. **Migrate accounts deliberately.** Provision/rotate the admin using secure
   hosting secrets and a recovery plan. Bootstrap never overwrites an existing
   account. Old short-password accounts will no longer log in. Verify each
   parent/student and teacher/employee link from trusted school records before
   setting `link_verified`; never mass-promote all historic self-claimed links.
4. **Complete role-scoped feature migration.** Whole-school `/api/state` remains
   admin-only. Teacher/parent screens must NOT recover access by restoring the
   old local-password, global cache or permissive Firebase paths. Their scoped
   roster, messaging, grading and other feature APIs are not completed in this
   patch; private role data is intentionally unavailable rather than overexposed.
   Some legacy admin state writes are still fire-and-forget/local-first and need
   transactional, observable persistence. Do not claim all app functions are ready.
5. **Rehearse SQL/data migrations.** Initialize additive production tables in
   staging; audit the legacy enrollment importer in dry-run before approval to
   apply. Confirm the configured single-school ID. Apply dismissal-schema.sql
   only to the correct database, validate the roster and school timezone, then
   explicitly enable `DISMISSAL_LEGACY_SINGLE_SCHOOL`. Registration approval
   changes its review status; it does not automatically create a student.
6. **Verify persistent image storage.** Mount `UPLOADS_DIR`, migrate old paths
   safely, verify restart persistence and backup/restore, then acknowledge
   `FILE_STORAGE_PERSISTENT`. A flag cannot create a volume. Private images are
   currently admin-only; parent/teacher document access needs a verified ownership
   API. Old non-image documents require a separate authorized delivery workflow.
7. **Deploy no rules blindly.** Deny-all rules intentionally stop legacy Firebase
   clients. Export and rehearse the cutover first; app-server login does not grant
   a Firebase token. Legacy Firebase school-login has no trusted server mapping.
   Do not re-enable sync just to bypass a failing migration.
8. **Pass exact-head CI and device acceptance.** Require regression, zero-warning
   lint, Expo Doctor, TypeScript and web build success. Then test a staged Android
   build and iOS if supported: session cookies, login/logout/revocation, camera and
   gallery image upload/read, server failure, enrollment retries/admin receipt,
   dismissal concurrency, RTL, and each role's permitted/forbidden actions.

Current supported scope: one independent Ahbaballah school deployment, NOT
shared multi-tenant hosting for unrelated kindergartens.
