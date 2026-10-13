# Course mini-app and private phone reminders

Status: implementation prepared, sending intentionally disabled. No keys were generated, no database changes applied, no phone subscribed during development, and no push message sent.

## Product behavior

Use the existing website as a Progressive Web App (PWA), not a Telegram bot or an App Store application. The localized course manifests share one stable app ID and name Holistic House, starts on the authenticated course route, and uses deterministic 192/512 PNG icons. The existing library PWA and its public caching behavior remain intact.

The settings component is `components/pwa/course-notification-settings.jsx`. Mount it in account settings and/or the subscription panel with `locale` and the verified bootstrap `accountId`; key it by that account ID. The component has independent EN/RU/ES text, an explicit device-specific consent checkbox, one-tap permission request, daily time, IANA timezone, overnight quiet hours, disable-this-device and disable-all-devices actions. Opting out never removes paid or free course access. Settings remain manageable when subscription access ends. No permission request is made on load, after a denial, or before feature configuration is available.

Attach `/course.webmanifest` for EN or `/course-ru.webmanifest` for RU as the app page's manifest metadata and verify the final HTML has exactly one intended manifest link. Preserve `/manifest.webmanifest` for the public library. If the root metadata convention overrides the page setting, resolve that in the integration layer and retest before claiming installability. iOS uses the home-screen icon and permission settings; no Apple Developer Program account is required for standard Web Push.

Current canonical private app routes allow EN/RU only. Spanish notification text opens `/en/app/course`, not an unimplemented Spanish account URL. Full ES private navigation is a separate prerequisite before changing that fallback.

## Verified support and limitations

- Apple requires iOS/iPadOS 16.4 or later and a Home Screen web app. The permission request must follow direct interaction. Device Focus/notification settings affect display. Feature detection governs functionality; the iOS device hint only selects installation instructions. [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Apple documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- Android support depends on the browser, Push API, Notifications API, Service Worker and secure context. Installation is helpful but must not be described as universally required on Android. The service worker is responsible for displaying a visible notification. [Google Web Push overview](https://web.dev/articles/push-notifications-overview), [subscription flow](https://web.dev/articles/push-notifications-subscribing-a-user)
- Browser installation promotion is conditional. Supply a manifest and appropriate icons; never promise the install prompt will appear on every phone. [Google manifest guidance](https://web.dev/articles/add-manifest)
- Provider acceptance is not proof of phone delivery. A short TTL limits stale reminders, but OS/network conditions still control arrival. 404/410 require endpoint revocation; transient retries must remain inside the approved due window. [Web Push protocol](https://web.dev/articles/push-notifications-web-push-protocol)

## Privacy and boundaries

The payload is only `{version,kind,locale}`. The service worker ignores supplied title/body/URLs/record IDs and renders fixed neutral copy. Clicking opens an allowlisted same-origin course page requiring the existing login. No assessment, symptom, mood, diagnosis, clinician note, course goal, personal identifier, authentication token or score enters a payload. This is not an emergency alert or clinical monitoring system. Do not create reminders from self-harm or crisis signals.

The browser's push service (Apple/Google/Mozilla, depending on browser) participates in delivery; the consent text discloses this and lock-screen visibility. Endpoint URLs and encryption material are private technical credentials. Store only an encrypted subscription plus a SHA-256 lookup fingerprint, never a plaintext payload or raw endpoint in logs. These data have no browser local-storage copy. The account-specific header must match server-verified identity to reject delayed requests after account switching. All mutating requests require same-origin validation; responses are private/no-store. Restrictive provider hostname validation prevents turning future sending into an arbitrary URL fetcher.

The root SW imports the isolated handler; the handler never fetches or caches personal data. Existing private network-only behavior remains. Verify worker registration/import under the existing CSP during preview acceptance. No CSP/security setting was loosened in this implementation.

## API and storage

`/api/app/notifications` is a dedicated authenticated route, separate from the app catchall:

- GET: configuration, preferences, device count and current-device status; optional `device` query is a SHA-256 fingerprint, never an endpoint URL.
- PATCH: validated settings. Cannot change enabled to true; only explicit POST device enrollment can do that.
- POST: strict subscription object and current consent version. Encrypted under existing application encryption with account/record AAD. An endpoint cannot silently move between accounts.
- DELETE: current device fingerprint or all devices, scoped to the authenticated owner; repeated deletion is safe.

All calls include `X-HH-Account-Id` from verified bootstrap. Server session verification and account state remain authoritative; the header is only an additional binding, never authentication.

`course-notifications-schema.proposed.sql` is an unapplied, rollback-only schema proposal outside the migration runner. It uses existing authenticated backend role/session controls, owner RLS, no anonymous grants and deletion cascades. It must be reviewed and exercised in an isolated database before an explicitly approved migration. The separate dispatch proposal adds a NOLOGIN/NOBYPASSRLS worker role that can execute only fixed narrow helpers, with no direct table grants. Runtime role membership is deliberately an approval-needed placeholder.

Enrollment gates: `HH_COURSE_PUSH_ENVIRONMENT=sandbox|live`, `HH_COURSE_PUSH_ENABLED=true`, `HH_COURSE_PUSH_STORAGE_APPROVED=true`, valid public `HH_COURSE_PUSH_PUBLIC_KEY`, and `HH_COURSE_PUSH_PRODUCTION_APPROVED=true` in production. Do not enable them as part of this change. No private VAPID key was read or generated during development. The future approved server runtime reads its private key from secret configuration only; it never returns it to a browser. Storage management stays available when enrollment is disabled, if approved storage remains configured.

Sending defaults to disabled. Complete sender code is included: the dispatcher, encrypted-subscription reader, durable claims, final locked eligibility, pinned-TLS Web Push transport and authenticated scheduler route at `/api/app/notifications/dispatch`. It uses web-push 3.6.7 for standard payload encryption/VAPID and a controlled HTTPS request for public-DNS pinning, no redirects and bounded timeout.

Activation additionally requires `HH_COURSE_PUSH_DELIVERY_APPROVED=true`, `HH_COURSE_PUSH_DISPATCH_APPROVED=true`, a valid-format `HH_COURSE_PUSH_PRIVATE_KEY`, `HH_COURSE_PUSH_SUBJECT`, and a 32+ character scheduler secret (`HH_COURSE_PUSH_CRON_SECRET`, falling back to `CRON_SECRET`). None were set. Public and private keys must be a matching approved VAPID pair. Production only accepts the live environment plus its production approval gate. Sandbox and live preferences/devices/claims are separated.

The scheduler route accepts only a constant-time-checked Bearer credential and returns aggregate counts, never payloads or identifiers. `vercel-course-push-cron.proposed.json` is an unapplied five-minute example, not an edit to deployed vercel.json. Vercel supplies `CRON_SECRET`; configure any dedicated secret consistently in the actual authorized scheduler. Confirm schedule support, cost and due-window throughput before activation. Each invocation considers up to 50 candidates and stops starting more work after 40 seconds. The DB candidate helper filters for currently due eligible devices so unrelated schedules cannot starve the batch.

## Implemented sender safety contract

Before every send, re-read current account status, paid-through entitlement, course active/paused state, device consent and current settings. A browser boolean or stale checkout status is not sufficient. Claim a unique `(device, environment, local_day)` operation durably before dispatch; the one fixed reminder kind uses this device-level ledger to prevent duplicate worker attempts. Recheck opt-out/revocation/quiet hours while holding the dispatch lease. At most one daily reminder per selected device. Skip missed due windows, do not send catch-up bursts. Handle DST by local calendar date and a one-hour due window; a skipped wall-clock hour skips that day, a repeated hour does not repeat delivery.

Apply the pure `notificationDeliveryDecision` result, short TTL and `pushResponseDisposition`. Cancel retries after opt-out, course pause, expiry or quiet hours. Retry only bounded transient failures; provider acceptance must not be logged as delivery/read. Remove expired devices and minimize retention. The transport rejects unapproved hostnames, private/reserved/transition IPs, mixed DNS answers and redirects, then pins the validated address while retaining the original TLS server name. It recalculates the remaining TTL before sending and aborts if the entitlement/quiet/due-window deadline has passed. DNS and network waits are bounded. The locking contract serializes account state, billing entitlement, course pause, preferences and device revocation. If opt-out commits first, no message is sent. A message already accepted by the provider cannot be recalled and might appear after opt-out. A crash after claiming or an ambiguous network outcome is never automatically resent; this deliberately favors avoiding duplicates over guaranteed delivery. Do not silently enroll another account into an existing browser subscription: require deliberate disconnection and new opt-in.

## Acceptance before activation

Synthetic unit/worker/transport tests cover consent, scoped encryption, concurrency, duplicate claims, unsubscribe/expiry races, bounded retries, SSRF, provider response handling, DST and quiet boundaries. They do not prove PostgreSQL RLS execution or real phone delivery. Run these plus full repository lint/build. Then test synthetic accounts on a real supported iPhone Home Screen app and a real Android browser: install, deny, dismiss, allow, logout/login, account switch, multiple devices, timezone change, quiet hours, DST, subscription expiry/cancellation, offline/expired endpoint, repeated clicks, network interruption and unsubscribe. Inspect EN/RU narrow mobile layout, keyboard navigation, focus and status announcements; ES copy coverage does not establish Spanish route support. Verify exactly one manifest link, PNG sizes, SW scope/CSP and that private pages are never cached. Automated desktop tests are not physical phone delivery evidence.
