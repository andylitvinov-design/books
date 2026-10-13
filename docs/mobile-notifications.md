# Holistic House — opt-in phone notifications (13 October 2026)

This addition uses the **existing Google Account / Cabinet** and the existing
PWA service worker; it does not create a second app or collect clinical data.

## Implemented on this branch

- Calm dark-teal **example card** in My Course and Settings (EN/RU).
- User consent and device permission; installed PWA / compatible browser
  subscribes to standard Web Push. iOS requires Safari's **Add to Home Screen**
  (iOS 16.4+). Web Push appearance outside the site is OS-controlled.
- Fixed generic reminder message, dedicated test-send action, 2 attempts/hour.
- Server VAPID signing + RFC8291 `aes128gcm` encryption, narrow vendor endpoint
  allowlist, no browser caching of private /app paths, no open redirects.
- Account-bound, RLS-protected private tables for preferences and up to five
  device subscriptions. Device tokens removed when account is deleted.
- Server stores the preferred local hour / timezone for **future scheduling**.

## Not yet live or enabled

- Scheduled automatic delivery by reminder hour; do not tell users this is
  running. A background worker must implement timezone-aware triggers, opt-out,
  quiet hours, dedupe, and cycle-completion checks.
- Admin marketing campaigns, report content notifications, and native APNs /
  ActivityKit updates. Never enable those silently.

## Operational release prerequisites

1. On approved **Holistic House Supabase**, apply exactly
   `supabase/migrations/20261013170000_hh_opt_in_push_notifications.sql` before
   deploying this source. Verify `hh_app_backend` grants and both tables'
   account-owner RLS via A/B authenticated test users.
2. In the Vercel project for `holistichouse.vercel.app`, configure these
   **server-only** values: `HH_PUSH_PUBLIC_KEY` (P-256 uncompressed 65-byte
   base64url public key), matching `HH_PUSH_PRIVATE_KEY` (32-byte scalar,
   base64url), and `HH_PUSH_SUBJECT` (`mailto:` contact). No `NEXT_PUBLIC_`
   private key. Keys must match; all remain outside source, logs and screenshots.
3. Verify real iOS installed-PWA and Android: opt in → test send → lock-screen
   notification → tap opens authenticated My Course → disable → no further
   deliveries. Test denied permission, expired device keys and cross-user
   subscription ownership. Test cookie/session, RLS and device rate limiting.
4. Merge only after exact-head CI and Preview; separately check exact production
   SHA and deployment readiness. Vercel quota may delay rollout.

## The supplied Duolingo screenshot

This is a **Live Activity**, not ordinary Web Push. A native iOS binary with
`WidgetKit` + `ActivityKit`, extension target, Apple signing and APNs
push-to-update is required to reproduce a continuously updating custom card on
Lock Screen / Dynamic Island. A web/PWA cannot render that specific UI.

Native acceptance: start an activity only with an actual opted-in active
14-day course; show Day X/14, one gentle next step and a link to My Course,
but **never** symptoms, scores, personal notes, diagnoses, remedies or
private reports. Update after verified account-owned lesson completion; end
on course pause/completion/withdrawal/expiry; rotate APNs activity tokens
and block cross-user activities. Requires Apple Developer team, signed
device build and physical-iPhone acceptance. **Not implemented in this PR.**
