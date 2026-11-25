# Holistic House Phone Notifications — deployment and QA

## Source delivery
User requested the Duolingo-style Lock Screen card for **our Holistic House app**.
PR #463 extends the existing authenticated Account/My Course (not a new user database).

**Web/PWA**
- EN/RU branded teal preview on My Course and Settings, explicit device permission, enable/disable, hourly preference, test send.
- Standards-based VAPID Web Push with end-to-end AES128GCM encryption.
- Separate Holistic House installable manifest for Cabinet; on iOS 16.4+ Safari Share → Add to Home Screen is required for Web Push.
- PWA cannot draw Apple Live Activity visual; OS owns notification presentation.

**Scheduled course reminders**
- /api/internal/notification-dispatch is protected by a constant-time authenticated bearer: `HH_PUSH_CRON_SECRET` or the existing `CRON_SECRET`.
- Stored timezone/hour (08:00–21:00) drives safe reminders only while account is active, opt-in remains true, current 14-day cycle is active and today's lesson is not already done.
- One per subscription/day, idempotent dispatch ledger; expired endpoints removed. Private, no clinic/score/remedy text or client names.
- Deployment must register an **hourly scheduler**. Vercel team `super10` is Hobby (once-daily built-in cron limitation), so use Supabase `pg_cron` + `pg_net`, not an invalid hourly `vercel.json` rule.

**Native Live Activity**
- WidgetKit target is embedded in the existing Capacitor Xcode project, minimum iOS 16.2; teal Lock Screen + Dynamic Island layout, progress bar and 14-day day count.
- Capacitor native ActivityKit bridge supports authorization, start, progress update, stop, token observation.
- Authenticated /api/app/notifications/live-token validates verified owner and active course/cycle. RLS table stores ActivityKit push token; APNs HTTP/2 sends generic progress only after saved course changes.
- On pause or course completion native activity ends; signing out from the native app ends account activity; explicit stop removes tokens.
- **Requires Apple Developer signed app**, Push Notifications entitlement, APNs auth key/team ID, physical iPhone tests. Unsigned GitHub simulator build is not an App Store/TestFlight release.

## Database rollout verified (Supabase project holistichouse, Canada Central)
- `notification_preferences`, `push_subscriptions` already exist; do not reapply their original migration.
- `20261013174000_hh_push_dispatch.sql` applied.
- `20261013183000_hh_native_live_activities.sql` applied.
- All four relevant tables have RLS enabled; the dispatch log is inaccessible to regular authenticated users.
- `pg_cron` and `pg_net` installed (no scheduled job until the endpoint is deployed and manually verified).
- Vault secret name `hh_push_hourly_dispatch_token` created; never disclose its value or copy it into Git.

## Environment
Vercel production requires `HH_PUSH_PUBLIC_KEY`, matching `HH_PUSH_PRIVATE_KEY`,
`HH_PUSH_SUBJECT` (mailto operator) and the separate
`HH_PUSH_CRON_SECRET`. Existing VAPID keys must be preserved so users'
subscriptions do not break. Do not rotate active keys unintentionally.
Do not use `NEXT_PUBLIC_*` for a secret.

APNs signing env (not configured unless verified):
- `HH_APNS_KEY_ID` — 10-character Apple-issued ID.
- `HH_APNS_TEAM_ID` — Apple developer Team ID.
- `HH_APNS_PRIVATE_KEY` — confidential Apple .p8 content.
- `HH_APNS_ENV` — sandbox for development signed builds, production for TestFlight/App Store.
Bundle is `app.psialchemy.mobile` until Apple's provisioned identity / rebranding is approved.
Never guess Apple credentials, bundle ID or signing account.

## Hourly schedule activation after confirmed live deployment
Use only on approved Holistic House Supabase once the new route returns auth
401 without a credential and 200 for a genuine worker call:
```sql
select cron.schedule(
  'hh-course-push-hourly',
  '7 * * * *',
  $cmd$
    select net.http_get(
      url := 'https://holistichouse.vercel.app/api/internal/notification-dispatch',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'hh_push_hourly_dispatch_token'
          limit 1
        )
      ),
      timeout_milliseconds := 12000
    );
  $cmd$
);
```
Verify with `cron.job` and `cron.job_run_details`; inspect `net._http_response`
using privileged DB access without exposing tokens. Never create duplicate cron
jobs for this feature. Disabled/inactive courses must not trigger.

## Final QA and acceptance
1. CI: Node tests for encryption, endpoints and policy; PostgreSQL A/B RLS;
   Chromium/WebKit, Next build, native simulator; check actual exact PR SHA.
2. PWA on real iOS Home Screen and Android: opt in, signed-in test message,
   notification tap, dismiss, logout, unsubscribe, stale token.
3. After production release: real hourly cron call, timezone DST boundary,
   dedupe per local day, pause, completed day, expired endpoint. No PII in push.
4. Native signed iPhone iOS 16.2+: start Day X/14, Dynamic Island collapsed
   and expanded, background APNs update after account-owned session, pause/end.
5. On iOS device, sign out and ensure activity disappears; test account switch
   to prevent device tokens being attributed to another user.
6. Never claim release/live from merge alone; Vercel Hobby build-rate-limit
   may block deployment and Apple signing is a separate gate.
