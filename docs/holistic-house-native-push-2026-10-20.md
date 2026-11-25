# Holistic House — native private-message notifications

**20 Oct 2026 — release engineering.** Native APNs/FCM integration builds upon merged [PR #1304](https://github.com/andylitvinov-design/books/pull/1304), using the independently branded `com.holistichouse.app` Android/iOS project. This is not the PWA Web Push channel.

## What works in source

1. Logged-in client opens **Cabinet → Settings → App notifications** in the native app. The server reports whether that platform is configured. No permission prompt or token upload occurs until client explicitly presses **Enable**.
2. The Capacitor 7 Push Notifications plugin registers an APNs token on iOS or FCM token on Android. Server `/api/app/notifications/native/register` validates exact app account session and token format and encrypts the token with the existing HH account key/AAD. Only its SHA-256 fingerprint is indexed.
3. `app_private.native_push_devices` is separate from all website push subscriptions. RLS is FORCE and all public/anonymous/authenticated grants are revoked; `hh_app_backend` can access only authenticated account-owned devices.
4. The signed-in app can disable all its devices and unregister the platform token. Sign-out tries to disable before ending the session, and the message-claim function checks the token's live `auth.sessions` record even if the phone went offline or was cleared.
5. A new, participant-visible reply written by the assigned practitioner is saved once. The server sends to Web Push and native channels separately, each through a post-commit best-effort continuation. Private notes, client-authored replies, duplicate POSTs, closed conversations and unauthorized practitioners are excluded.
6. The SQL claim creates a unique message/device entry before any provider send, stopping duplicate delivery on uncertain retries. The token lookup is restricted to just that message's verified client.
7. The server sends **generic** notification text only. Push payload contains an opaque request UUID, language and event type; no sender, client name, diagnosis, questionnaire results, reports or free-text. Tapping checks the UUID and takes the user to the protected consultation route; authorization is still enforced by session and RLS.

## Configuration required BEFORE physical push works

Production **Vercel**, server-only environment variables (no `NEXT_PUBLIC_*`, no credentials in Git):

Android FCM HTTP v1:
- `HH_FCM_PROJECT_ID`: exact Firebase project ID.
- `HH_FCM_CLIENT_EMAIL`: service-account identity authorized for FCM sends.
- `HH_FCM_PRIVATE_KEY`: service account RSA private key; store in Vercel secrets.
- GitHub Actions encrypted secret `HH_FIREBASE_CONFIG_B64`: base64 of Firebase Android `google-services.json` for **com.holistichouse.app**. This is injected only into the native CI working copy, not committed.
- Firebase project: https://console.firebase.google.com/

iPhone APNs direct token authentication:
- `HH_NATIVE_APNS_KEY_ID`: Apple 10-character key ID.
- `HH_NATIVE_APNS_TEAM_ID`: Apple Developer Team ID.
- `HH_NATIVE_APNS_PRIVATE_KEY`: Apple ECDSA .p8 private key.
- `HH_NATIVE_APNS_ENV`: `sandbox` for development signed builds or `production` for TestFlight/App Store signed builds.
- Bundle topic: **com.holistichouse.app**. The old live-activity configuration for PsiAlchemy is NOT reused.
- Apple Developer: https://developer.apple.com/account/

The connected Vercel project currently has neither of these provider credential sets configured. Thus UI correctly reports **not ready**; **no real native push has been sent or verified**.

## Exact release checks
- Source checks: `node --test tests/native-private-message-push.test.mjs`.
- Server transport exercise (fake FCM with fake RSA private key): `node --conditions=react-server --test tests/native-private-message-push.test.mjs`.
- `npm ci` and pinned staging `@capacitor/push-notifications@7.0.1`; native Android debug APK and unsigned iOS simulator CI.
- Confirm Supabase migration `20261020151945_hh_native_private_message_push_20261020.sql` applied to *holistichouse, ca-central-1*, and read back both RLS policies plus restricted function grants. Never run migration against PsiAlchemy or other projects.
- Android: with Firebase config and test phone, perform Google PKCE login, enable system permission, send a synthetic nonclinical practitioner message, receive generic lockscreen notification, tap and land in correct authorized conversation; test wrong account and logout.
- iOS: same only after signed Apple TestFlight/Dev provisioning with push entitlement, APNs key and physical device. The unsigned simulator bundle is **not** installable on a phone.
- Negative tests: declined permission, disabled consent, stale token, 401, mismatched `X-HH-Account-Id`, closed request, duplicate operation UUID, old `auth.sessions`, no private notes or message text, no external redirect.
- Provider accepted **does not mean read or delivered to the human**; only manual real-device confirmation can complete this release gate.

## Cost and rollback
Official FCM/APNs do not charge per-message like SMS; Vercel/Supabase resource usage and Apple Developer Program may still cost money. Failed providers cannot stop an already saved in-app message. Removing the native UI/dispatch preserves the existing first-party Web Push, private message history, and the separately installed PsiAlchemy app. Retain secrets under approved owners; never include native tokens or private messages in CI test artifacts.

**User action required:** secure Firebase setup, Apple Developer signing/APNs entitlement, and one real Android plus iPhone acceptance test. Until then mark *source implemented / distribution not yet client-ready*.
