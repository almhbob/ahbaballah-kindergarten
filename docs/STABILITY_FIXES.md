# Stability fixes

This branch improves runtime stability for the kindergarten app.

## Completed

- Registered missing Expo Router screens in app/_layout.tsx.
- Added a shared API URL builder in lib/query-client.ts.
- Normalized API host values to avoid duplicated protocols.
- Updated AuthContext to use the shared API URL builder.
- Added safer startup handling for stored auth data.

## Validate before merge

Run install, Expo Doctor, TypeScript check, lint, and a clean Expo start locally.

Then test these flows:

1. App opens without a blank screen.
2. Platform page opens.
3. Guest or demo flow opens.
4. Login request reaches the API.
5. Register request reaches the API.
6. School request form reaches the API.

## Remaining targeted follow-up

If app/school-request.tsx still builds the school request URL manually, replace that specific URL construction with the shared makeApiUrl helper from lib/query-client.ts.
