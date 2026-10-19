# Holistic House — opt-in private client message push

- Reuses the installable Home Screen PWA and root service worker.
- Client explicitly opts into message alerts separately from optional daily
  course reminders in Cabinet → Settings → Phone notifications.
- Existing subscribers have `message_alerts=false` after migration.
- Only a newly saved practitioner-to-client participants reply triggers a
  generic alert; duplicates, master notes and client replies do not.
- Client's message is encrypted at rest. Web Push payload contains only
  kind, locale and request UUID; no message content, practitioner name, scores,
  reports, private health details or arbitrary URL.
- Locked-screen text is generic. The worker opens
  `/{en,ru}/app/consultations?request=<uuid>`. The page opens that conversation.
  Google PKCE login preserves the target after sign-in, and normal
  participant-only authorization still guards the contents.
- The private SQL function checks sender/practitioner identity, request scope,
  recipient account status and opt-in. Only `hh_app_backend` can execute it.
- Failed Web Push never rolls back a saved message; no fake "delivered" status.
- Roll out migration before application code, preserve VAPID keys.
- Verify on physical iPhone Home Screen (iOS 16.4+) and Android Chrome:
  opt-in, send, tap, signed-out sign-in, stale device, opt-out, duplicate,
  closed request, another client/account and private note. Native APNs apps and
  external email/SMS/WhatsApp are not included.
