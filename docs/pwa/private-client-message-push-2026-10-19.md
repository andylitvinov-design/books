# Private client message notifications — 2026-10-19

## User journey
1. Client signs in using the existing Google PKCE flow and installs the **Holistic House** Home Screen app (iOS 16.4+ Safari Share → Add to Home Screen; Android Chrome Install).
2. Under **Cabinet → Settings → Phone notifications**, client enables Push and separately checks **Notify me when a practitioner replies**. Previously subscribed devices start with private-message alerts OFF.
3. Assigned verified master sends a new participant-visible in-app reply to the client for an active consultation. Only a freshly committed reply signals one notification; duplicate operation UUID, client-authored reply and practitioner-only note do not.
4. Vercel Next.js `after()` dispatches Web Push to up to five pre-subscribed devices; the protected SQL function derives the recipient only from the persisted message, verified master/requester identity and explicit push opt-in.
5. Lock Screen displays generic text **“You have a new private message”** without sender, name, message text, consultation or health details.
6. Tap opens `/en/app/consultations?request=<UUID>` (or RU) and auto-expands exactly that consultation. Signed-out users complete Google sign-in before the thread is opened; existing participant-only RLS remains the authorization check.

## Deployment
- Apply additive migration `supabase/migrations/20261019183000_hh_client_message_push_optin.sql` **before** deploying the updated app, using only verified Supabase project `holistichouse` (Canada Central). Migration adds `message_alerts` default false and a narrow `SECURITY DEFINER` function in unexposed `app_private`. Only `hh_app_backend` may call it; never grant to `anon` or `authenticated`.
- Reuse existing `HH_PUSH_PUBLIC_KEY`, `HH_PUSH_PRIVATE_KEY`, `HH_PUSH_SUBJECT`. **Never rotate VAPID keys** just to launch this feature.
- Do not configure SMS, paid providers or a second Service Worker; `/sw.js` imports `/course-notifications-sw.js`, which remains the sole push/click listener. Private paths are `network-only` (not cached).
- Source and unit tests: `node --test tests/client-message-push.test.mjs tests/notification-contract.test.mjs tests/notification-stack-integration.test.mjs tests/practitioner-client-crm.test.mjs`. Next production build and exact-SHA Vercel verification required before calling live.
- Physical acceptance: on real iPhone Home Screen PWA / Android, log in, enable alerts, have the assigned practitioner send an ordinary nonclinical test reply, tap notification, verify correct protected thread. Also test opt-out, wrong account, closed request, private note, duplicate operation ID, and no private content on Lock Screen.
- Delivery is best-effort and OS controlled. If the push provider rejects the message or the device is offline, saved in-app messages remain accessible normally. Receipt by provider is **not** proof that the person saw or read the notification. No misleading sent/read claim.

## Rollback
Disable UI/sender and revert app changes without deleting stored client messages or push subscriptions. The opt-in column may remain; no destructive DB rollback is needed. No private URLs can be redirected off-site via a push payload.
