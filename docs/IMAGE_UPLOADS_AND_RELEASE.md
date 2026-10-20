# Image hardening and production release decision

## Decision: NO-GO for production

This is an implemented **draft**, not a deployment or production certification.
Image bugs found by local HTTP tests have been fixed and covered by regressions.
The broader application still has release-blocking identity, data-isolation,
durability and end-to-end verification gaps. Do not merge/deploy on the strength
of a green focused test suite.

## Implemented

- API uploads require an Express **admin session before multipart parsing**.
  Local/Firebase-only roles do not grant access.
- Accept static JPEG, PNG, WebP and GIF input only. Multer limits input to
  10 MiB, one file and no unexpected multipart fields. sharp validates by
  decoding, limits input to 20 million pixels, applies EXIF orientation,
  strips metadata (including GPS) and re-encodes to JPEG/PNG/WebP. Animated,
  SVG, HTML, PDF, corrupt and unsupported images are rejected.
- UUID filenames and server-selected namespaces replace untrusted filenames.
  Database failure removes the written file before returning failure.
  Uploads do not succeed unless both storage and the database return success.
- Student/gallery/document images are private and require an admin session
  on **each read**. Existing legacy `public/guest` files are also protected.
  Legacy images are safely decoded on read; non-images are not rendered.
  Existing binary/PDF files need a separately authorized document workflow;
  they are not made publicly accessible.
- Explicit `purpose=branding` is the only public image category, still requiring
  admin authorization to create. Both branding editors now use this API rather
  than a separate, unverified Firebase Storage path. This category is **not**
  appropriate for children or certificates.
- Paths are checked against the configured storage root, including real paths
  to reject symlink escapes. Internal paths/SQL diagnostics are not returned.
  Private responses use `private, no-store`, `nosniff` and same-site CORP;
  validated public branding can be cached. Deletion checks uploader ownership.
- Browser writes require an exact allowed Origin; cross-site Fetch-Metadata
  without an Origin is rejected. Production no longer implicitly trusts
  arbitrary localhost origins. CORS and file-upload allowlists are aligned.
  Native requests without browser Origin remain supported; this is not a
  claim that the entire authentication system has been migrated or penetration-tested.
- The client rejects local URI false-success, source-fetch errors, failed API
  responses, missing URLs and foreign/non-serving response URLs. Cookies are
  included using expo/fetch. Picker MIME/name are metadata, not proof of conversion.
- Anonymous forms no longer offer a document/logo upload that will fail admin
  authorization. Their notices direct attachment handling to administrators.
  This is deliberate containment, **not** a completed public document portal.
- Fixed duplicate-HTTPS URL construction in school-request and developer
  requests and checked failure responses before showing success.
- CI no longer masks lint or Expo Doctor failures with `continue-on-error`.
  A web production bundle job is added; it does not publish anything.

## Local verification completed

- **58 tests pass**: existing hardening/dismissal tests plus browser-origin,
  API caller, upload-client and actual HTTP image-route tests.
- Image-route tests use real Express, Multer, sharp and temporary disk storage.
  PostgreSQL and session identities are simulated; these are not live
  database, login, concurrency-across-replicas or deployed-security tests.
- Tested PNG/JPEG/WebP decoding, EXIF orientation/removal, appended payload
  removal, anonymous/parent/teacher denial, private retrieval, public branding,
  corrupt/empty/spoofed/oversized images, pixel limits, database cleanup,
  origin rejection, unsafe path/symlink rejection, legacy images and owner deletion.
- Focused TypeScript for file/security/client modules reports zero diagnostics.
  Targeted image-module lint reports zero errors/warnings.
- Full ESLint: **0 errors, 80 warnings** (down from 86 in the preceding draft).
  The existing limit is 50: this remains a **failing** release gate. No
  warning threshold was raised and failures are no longer hidden.
- `npm ci --dry-run --ignore-scripts --legacy-peer-deps --no-audit` accepts
  the manifest/lock. This is not a clean-install execution. Added sharp lock
  integrity records match the actual package-manager-generated entries.
- The API health URL configured in checked-in EAS build profiles returned
  **404/HTML**, not the application's JSON health response. The exact settings
  of an already-installed APK are unknown; this does not establish its
  deployed backend configuration.
- No production records, secret values, cloud rules, volumes or runtime
  configuration were changed. No deployment, merge or native build was performed.

## Required storage/browser setup (not applied here)

1. Choose a stable HTTPS API hostname, not a temporary development URL.
   Use the real hostname in each release build's `EXPO_PUBLIC_DOMAIN`.
2. Mount a backed-up persistent volume; set absolute `UPLOADS_DIR` to its
   upload directory. Set `FILE_STORAGE_PERSISTENT=true` only after verifying
   the mount. The flag does not create persistence. Uploads intentionally return
   503 in production when this configuration is missing.
3. Back up and migrate existing files and `files.file_path` records before
   moving volumes. Legacy relative paths resolve from the original server cwd.
   New absolute paths require the same mount path after restart/deployment.
4. Configure `PUBLIC_WEB_ORIGINS` as exact HTTPS origins, comma-separated.
   Keep frontend/API **same-site** for private remote-image rendering and
   cookie eligibility. Unrelated frontend/API domains are not certified by
   this patch; use a same-site deployment or implement/test an authenticated
   private-image fetch/display layer first.
5. Run a staging upload, authorized/unauthorized read, logout, refresh,
   server restart and backup/restore test. Test Android/iOS actual camera,
   library, cookies and private-image display. HEIC/animated files are not
   accepted unless converted to a supported static raster before upload.

## Remaining critical release blockers

1. **Identity migration:** local/demo credentials and cached roles, Firebase
   school login and Express accounts/sessions are separate systems. Remove
   local privileged fallback in release builds after verified account migration,
   invitations, parent/student linkage and role-access testing. Do not reset
   existing accounts or assign school membership by guessing.
2. **Firebase isolation:** checked-in Firestore rules allow any authenticated
   account across schools; school-account records are client-writable.
   Replace this with trusted server-owned membership/claims and emulator tests.
   The deployed rules have not been inspected. Do not copy client-writable
   membership into production authorization.
3. **Single-school/data boundaries:** app_state and device caches remain global.
   Only one verified school per instance is supported. This image patch does
   not make multi-school hosting safe, or migrate cached data on logout.
4. **Durable sessions and abuse protection:** the server still uses MemoryStore.
   Add a durable shared session store and verified login/public-submission rate
   limits, then test expiration, revocation, proxy/cookies and restart behavior.
   The two-upload processing cap is not a general abuse/rate-limiting solution.
5. **Public enrollment delivery:** existing registration submissions can show
   local success while cloud writes fail or are unavailable. They need a
   validated, rate-limited server receipt and administrator retrieval workflow.
   Removing anonymous attachments does **not** solve this existing blocker.
6. **Quality/build gates:** clear remaining lint warnings and exact Expo SDK
   dependency mismatches, inspect CI for the exact candidate commit, pass
   production web/native builds, then perform role-based staging tests.
7. **Dismissal activation:** apply and verify its schema, correct school/timezone
   settings and actual PostgreSQL duplicate/concurrency behavior before enabling it.

Changes remain in draft PR #2. Resolve the blockers and record staging evidence
before requesting a separate, explicit production deployment decision.
