# Targeted stability and security containment — October 2026

This is a **draft**, not a production security sign-off. No deployment or Firebase rule publication is included.

## Repository selection

Compared the trees of `ahbaballah-kindergarten`, `ahbaballah-nizaam`,
`rawdat-ahbaballah` and `-`. The first has the current admin dashboard,
branding, calendar and analytics screens matching the supplied screenshot.
The two older kindergarten repositories lack those newer screens.
The repository named `-` currently contains a ride-hailing app despite its description.
Prior navigation/API PR #1 was merged; this patch addresses issues still present on main.

## Implemented

- Legacy `getApiUrl()` now returns a valid origin instead of a protocol-less host.
  The shared parser rejects non-HTTPS remote origins, credentials, paths, queries
  and fragments while allowing loopback development.
- All legacy `/api/state` handlers now require an authenticated **server-side admin**
  session. Parents and teachers must not download or replace whole-school state.
  Client state requests include session cookies.
  Local login waits for the API attempt before updating the user, triggering
  a cloud reload; admins get an explicit local-only warning if API login fails.
- Admin bootstrapping requires explicit environment configuration. No built-in
  privileged password is seeded. Existing accounts are not reset by this patch.
- Admin aliases resolve only to `ADMIN_EMAIL`; arbitrary unknown credentials
  no longer fall back to another admin account.
- Successful API login/registration rotates and saves the session before replying.
  New passwords have minimum length and bcrypt byte-limit checks.
- Production requires a configured session secret of at least 32 bytes.
  Development uses an ephemeral random secret.
- Response JSON is no longer included in API access logs.
- Branding is hidden from the classic primary tab bar; it remains available
  from the dashboard. Android tab height accounts for navigation insets.
- Larger dashboard labels, accessible quick-action labels and sufficient bottom
  padding improve usability without replacing the app's visual identity.

## Required before merge / rollout

1. Configure `SESSION_SECRET` securely and `ADMIN_EMAIL` for legacy admin aliases.
   For a new installation only, configure `ADMIN_INITIAL_PASSWORD` with at least
   12 characters and at most 72 UTF-8 bytes, then remove it after provisioning.
   Existing insecure accounts require a separate, explicit password reset.
2. **Test the local/API authentication mismatch.** The current login screen
   still verifies local credentials, independently of the API identity.
   Local-only or Firebase-only login does not establish an Express admin session.
   This patch deliberately denies their access to global `app_state` rather than
   granting unauthenticated access. Before rollout, unify the identities and await
   server login as the sole authority. Existing API sessions
   remain usable. Offline state is not proof of server authentication.
3. Verify that the deployment really has exactly one trusted HTTPS proxy before
   using the production `trust proxy = 1` setting. Production still uses the
   existing in-memory session store; move sessions to a persistent store before
   scaling across processes.
4. Test Android gesture navigation, three-button navigation, small screens,
   larger text, all five primary tabs and branding navigation on a device.
5. Run the full repository TypeScript/lint/build checks in its complete build
   environment. The repository manifest currently omits server dependencies
   (including Express, pg, bcryptjs, multer and their types); this patch does not
   pretend to repair or validate the entire deployment manifest.

## Critical remaining work — separate migration, not cosmetic fixes

- **Firestore school isolation is not enforced by the checked-in rules.**
  Any authenticated Firebase user can access school documents; school-account
  creation also allows untrusted assignment. Implement server-provisioned
  memberships or trusted claims, then test two different schools and each role
  in the emulator before publishing rules. Client-created account documents are
  not trusted authorization evidence. Deployed rules were not inspected.
- **`app_state` has no school identifier.** This patch restricts it to admins but
  does not isolate multiple schools from one another. Do not use this legacy
  table as multi-tenant storage; migrate to tenant-scoped, role-filtered records.
- Local passwords, demo data, cached roles and biometric-restored user objects
  must be replaced with server-validated sessions and secure credential handling.
  Never treat a local role or public environment flag as authorization.
- Public registration currently accepts user-supplied student linkage and teacher
  roles. Introduce verified invitations/approval and server-owned linkage.
- Review file upload/download authorization and allowed content types; review
  school-request, push and setup endpoint authorization; add login throttling,
  CSRF protection for cookie-authenticated writes and tested account recovery.
- Replace silently ignored sync failures with explicit status and conflict/retry
  handling, tenant-aware cache keys and a defined offline policy.

## Focused verification

Run `node --test tests/hardening.test.cjs` after installing the existing
development dependency `typescript`. These are isolated behavior tests using
mocked routers, bcrypt and database calls, plus source assertions for UI/client
wiring. They cover URL parsing, authorization ordering, database-error redaction,
bootstrap behavior, session rotation and navigation configuration.

They are **not** live database, deployed endpoint, Firebase-rule, Android visual,
APK-build or full end-to-end tests. No production data was read or changed.

### Results in the patch preparation environment

- 18 focused tests passed.
- TypeScript syntax parsing passed for the 15 downloaded/new TS/TSX source files.
- Standalone type checking passed for `lib/api-origin.ts` (ES2022 + DOM libraries).
- Full repository type checking, linting, APK build and device testing were not run.
