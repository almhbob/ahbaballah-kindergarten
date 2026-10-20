# Student dismissal and specialist QA

Latest image-security implementation and the current **NO-GO** production
decision are recorded in [IMAGE_UPLOADS_AND_RELEASE.md](IMAGE_UPLOADS_AND_RELEASE.md).
The counts and masked-CI descriptions below are historical evidence for earlier
revisions; the new CI configuration no longer tolerates lint/Doctor failures.

## Implemented, not deployed

Arabic RTL admin screen at `/(admin)/dismissal`, accessible from the dashboard.
It searches the server roster, shows waiting/dismissed totals and requires the
receiver's name, relationship and an explicit acknowledgement that staff checked
pickup authorization. Keyboard-safe, scrollable confirmation and adequate bottom
padding support mobile use.

Express endpoints:

- `GET /api/dismissal/students`: minimal server-side roster (ID/name/level only).
- `GET /api/dismissal/today`: today's records using the configured school timezone.
- `POST /api/dismissal/:studentId/checkout`: validates receiver details, verifies
  the student exists in the server roster, records server time and the session actor.

The PostgreSQL migration `server/dismissal-schema.sql` uses a unique constraint
and `ON CONFLICT` to prevent duplicate student/day checkout, including concurrent
requests. Database dates are serialized as date strings, without interpreting
midnight through the application host's timezone.

No successful offline checkout, automatic authorized-guardian verification,
parent push delivery or teacher access is claimed.

## Activation requires an explicit deployment decision

The owner confirmed the current scope is Ahbaballah only, with intended later
use in other kindergartens. Treat Ahbaballah as the first independent deployment,
not evidence that the existing app is already safely multi-tenant.

The current server model has global `app_state` and no verified tenant membership.
Therefore this version **fails closed by default** and is only suitable for a
confirmed **single-school** deployment:

1. Verify this instance and its SQL roster belong to one school.
2. Apply `server/dismissal-schema.sql` to that instance's database.
3. Configure `DISMISSAL_LEGACY_SINGLE_SCHOOL=true` and the correct IANA
   `DISMISSAL_TIME_ZONE`, after obtaining deployment approval. Bind records to
   `DISMISSAL_SCHOOL_ID` (the app's existing Ahbaballah ID is `ahbabullah`).
4. Sign in with a verified Express admin session, not only a local/Firebase role.
5. Test two staff devices trying to dismiss the same test student, midnight in
   the school's timezone, API outage and unauthorized requests.

Do not enable this mode for a multi-school service. That requires verified
server memberships and school-scoped student/dismissal tables first. The roster
source remains admin-managed JSON, not an independent identity authority; the
pickup acknowledgement is a staff declaration, not an identity-verification system.

Dismissal reads/writes and uniqueness now include the server-configured school
ID, never a school ID supplied in the checkout body. This preserves deployment
ownership for later migrations; it does not turn the global roster into safe
shared multi-tenancy. The migration is for the new feature's initial table.
If an earlier draft schema has already been applied anywhere, stop and review
its actual rows/constraints before a separate backfill or upgrade; never assign
old records to a school by guessing.

Use `.env.example` as a list of configuration names, not as a source of secrets
or a command that activates production. No runtime environment was changed here.

## Additional source hardening in this update

- School-request listing/modification/deletion now requires the configured
  platform admin's Express session; public submission remains available.
- School requests no longer return or newly persist `initial_password`.
  Previously stored values are not deleted or rotated by this patch.
- Push endpoints are restricted to the configured platform admin until recipient
  token ownership and teacher/student linkage can be enforced server-side.
  Existing teacher-triggered alerts must be migrated; no delivery guarantee is made.
- The web setup endpoint that could write a GitHub repository secret is retired
  with HTTP 410 after authorization. No repository secret was read or changed.
- Missing server/schema dependencies and types are declared. Lock root metadata
  matches the manifest, using the authentic existing locked package entries.
- CommonJS lint environment and a JSX escaping error are repaired.
- CI now includes the focused security and dismissal regression suite.

## Verification scope and remaining blockers

The first PR revision had a failing TypeScript check also present on `main`.
Its new callback diagnostics were largely follow-ons from missing Express types;
the new callbacks were additionally annotated explicitly.
The first revision's ESLint and Expo Doctor jobs were marked successful only
because the existing workflow uses `continue-on-error`: their actual commands
failed (27 lint errors/86 warnings; Expo Doctor passed 17/18 checks with SDK patch
version mismatches). Those green job labels were not a clean bill of health.

After dependencies were made available locally, an independently rerun focused
type check covering 18 source files across server/shared/config and the dismissal screen
reported zero diagnostics. All 30 focused regression tests passed after binding
records to the confirmed single-school instance. Full-repository
ESLint analyzed 113 files with **zero errors and 86 remaining warnings**. The
existing CI warning limit is 50, so that command still must not be called clean.
A full project
check exceeded this sandbox's resource/time budget; it is not reported as passed.
`npm ci --dry-run --ignore-scripts --legacy-peer-deps` accepted the updated lock.

Focused tests use mocked database/router dependencies; they are not proof of
live PostgreSQL concurrency, deployed security or physical-device behavior.
The screen has not been visually exercised on an Android device or built into
an APK here. Follow the current CI run, not the results of the earlier commit.

The full GitHub TypeScript check and the 28-test CI job subsequently passed for
commit `326d88700872cd17b21510fad82967a8fb45efce`. This verifies that revision,
not deployment readiness; final school-binding changes add two more local tests.

Critical migrations remain: verified school membership and Firestore rules,
unified server/local/Firebase identity, secure invitations/student linkage,
tenant-scoped caches and storage, file upload/download authorization, recipient
ownership, CSRF/rate limiting and persistent production sessions. These cannot
be declared fixed by a UI change or by passing isolated tests.
