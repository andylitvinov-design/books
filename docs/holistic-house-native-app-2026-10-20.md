# Holistic House — separate installable native app (20 October 2026)

## Goal
Build **actual Android APK** and a separate iOS native Xcode app for Holistic House, without renaming the existing **PsiAlchemy** application.

The existing Home Screen PWA remains available and is currently the recommended **functional client notification path** while native authentication and native messaging push are being integrated.

## Implementation
- Separate build config: `capacitor.holistic-house.config.json` → `com.holistichouse.app`, name **Holistic House**, remote canonical origin `https://holistichouse.vercel.app/en/app/portrait`.
- `scripts/prepare-holistic-house-native.mjs` brands only the CI working copy before/after Capacitor sync. Source `capacitor.config.json`, original Android and iOS source identifiers stay PsiAlchemy. The iOS Podfile staging replaces the old developer-local npm cache with the checked-out `node_modules`.
- `scripts/brand-hh-native-artwork.mjs` exports launcher and splash artwork from the approved public Holistic House SVG for native CI.
- `components/native-link-handler.tsx`, `lib/native/deep-link-policy.js` and `components/native-external-links.tsx` recognize **only allowed exact private conversation URLs** for the Holistic House app and preserve old public PsiAlchemy safeguards. Links remain navigation, not authorization: the backend rechecks the Google session, account and thread participant.
- Separate `.github/workflows/holistic-house-native.yml` builds a **debug-signed, installable Android .apk** and an **unsigned iOS .app for Simulator only**. The job verifies the Android package, display name and SHA-256 and uploads artifacts with a limited 14-day lifetime. Source fixtures run before building, so the PsiAlchemy baseline remains distinct.
- Debug builds are meant for **internal validation only**, not public clients or production health conversations. Production Android requires a stable private release keystore and independent privacy/security acceptance.

## What still blocks a client-ready native app
1. **Google login/device QA:** The system-browser PKCE handoff is now implemented in source: the WebView starts the original cookie-bound OAuth challenge, Chrome Custom Tabs / Safari View Controller opens Google, the existing HTTPS callback redirects *only the one-time code* to `holistichouse://auth/callback`, and the native app returns that code to the original secure server callback in its own WebView. **Real signed-device round-trip is not verified**; don't claim client login complete from source tests. If Supabase rejects the appended `native=1` return query, its approved redirect allowlist must be adjusted without wildcards.
2. **Native push:** PWA Web Push does **not** automatically register APNs/FCM tokens inside WKWebView/Android WebView. The existing push subscriptions cannot be used as native push registrations. A separately verified APNs + FCM transport, RLS-scoped device tokens, message receipt routing and opt-in are required. Until then only the installed PWA has the currently deployed client-message notification pipeline.
3. **iPhone installation:** Apple requires an Apple Developer team, bundle identifier, distribution certificate, provisioning profiles, and signed archive to use TestFlight/App Store (and APNs entitlements for push). The iOS Simulator .app is **not installable on a physical iPhone**. Never claim otherwise.
4. **Deep link association:** App Links / Universal Links require the real app signing fingerprint and Apple Team ID, plus verified `.well-known` records on `holistichouse.vercel.app`. Generated builds use an internal `holistichouse://app/consultations` scheme; Android HTTPS `autoVerify=false`.
5. **Final release:** Run physical device tests for Google sign-in, sign-out, account switching, notifications, message tap, offline/expired token, App Store privacy disclosure, and rollback before customer distribution.

## How to get the Android test APK
1. Open the GitHub Actions run **Holistic House Native Installers** for the approved PR/branch.
2. Open a successful **android-test-installer** job; under **Artifacts**, retrieve `Holistic-House-Android-Test-APK`.
3. Extract `app-debug.apk` and transfer it to an Android test phone. Android may ask for explicit permission to install apps from this source.
4. This is an internal testing package (debug key changes between builds), not a stable Play Store update path. No client data should be used until the auth/push gates have passed.

## iOS next step
- After Apple signing access is supplied, create the app ID under the approved Apple Developer team, enable APNs as needed, sign and upload the iOS archive to TestFlight, invite testers. Nothing has been uploaded to Apple by this change.

## Security / rollback
- No GitHub secrets, API keys, Apple certificates, client medical data, test answers or messaging tokens are copied into APK or repository.
- The original native PsiAlchemy build, its deep-link denylist and live website stay unchanged.
- The build is a remote-origin native container, not a promised offline copy of private account data. `server.cleartext=false` and the navigation allowlist restrict it to the approved HTTPS host.
