# Holistic House — CRM & phone/messenger delivery production acceptance
## Audit 2026-10-20 · Toronto

Canonical project: `super10/codex-public-book-library` → `codex/public-book-library` → https://holistichouse.vercel.app. This record describes **observed production**, not a promise of delivery to an actual customer.

## Boundaries and verified database state

- Owner CRM under `/ru/app/practice?panel=crm`: business contacts, marketing consents, workflow tasks, follow-ups, receipts, separate external Inbox. It does **not** gain access to private client test results or clinical notes by email/phone matching.
- Assigned-practitioner conversations remain under `/ru/app/practice?panel=clients` and client's `/ru/app/consultations`, authenticated with participant/role checks; private replies are saved independently of external sending success.
- Read-only Supabase `holistichouse`, Canadian project: `app.crm_contacts`, `app.crm_followups`, `app.crm_msg_threads`, `app.crm_msg_items`, `app.crm_sms_jobs`, `app_private.native_push_devices` and `app_private.notification_telegram_links` have **RLS + FORCE RLS**.
- On audit: **0 CRM contacts, 0 tasks, 0 CRM messenger threads, 0 external CRM messages, 0 private practitioner-request messages, 0 SMS dispatch/receipts, 0 registered Web Push devices, 0 native push devices, 0 customer Telegram verified links and 0 client Telegram dispatch receipts**. This is not a test failure, but it means actual end-to-end delivery is **not evidenced**. Do not seed a patient's record to make dashboards look green.

## Delivery matrix (distinguish recorded, accepted, delivered, read)

| Channel | Implemented software | Current production evidence | Release status |
| --- | --- | --- | --- |
| Private client ↔ assigned practitioner | Authenticated in-app conversation, unread state, status, push fan-out after commit | Source/DB verified; 0 real message records | Ready for controlled two-account E2E; actual delivery untested |
| PWA phone alerts | Existing VAPID Web Push + user opt-in, iPhone Home Screen installation | VAPID configured; 0 subscriptions | Source connected, no handset delivery evidence |
| Native iPhone/Android push | Capacitor plugin and APNs/FCM HTTP v1, RLS encrypted tokens | 0 device tokens; **no** FCM/APNs credentials in Vercel | Disabled until provider and signed device |
| Customer Telegram notifications | Existing authorized practice-bot reuse `@andydotbot`, owner-only webhook verification, `/start`/STOP, consent, test-to-own-chat | Practice bot key present, `HH_CLIENT_TG_USE_PRACTICE_BOT=true`, `HH_CLIENT_TG_LINK_ENABLED=true`, `HH_CLIENT_TG_SEND_APPROVED=false`, customer link/dispatch 0 | Owner pilot only; no external customer broadcast |
| CRM Telegram **Inbox** | Separate external business Telegram bot adapter and webhook + owner-scoped threads | `HH_CRM_MSG_TELEGRAM_*` and `HH_CRM_MSG_PRODUCTION_APPROVED` absent; 0 threads | Not connected, **different** from customer-notification bot |
| WhatsApp Business Cloud API | CRM provider adapter with consent and 23h reply-window guard | Meta WABA credentials/production approval absent | Automated provider send/receive unavailable |
| Manual WhatsApp | Owner-initiated `wa.me` handoff from enquiry **only if requested by customer** | Open handoff is not sent/delivered | Manual phone workflow only; must actually tap Send |
| Manual SMS | CRM owner tools, consent-suppression checks, copy and phone Messages handoff | 0 eligible contacts; no provider submission | Available on phone when genuine consent exists, not auto-send |
| Twilio SMS | Service probing, signed webhook, STOP/HELP, delivery states and idempotent provider jobs | `HH_CRM_TWILIO_*` and SMS approval not configured, 0 receipts | Not connected; costs possible, explicit approval required |
| Resend email | Identity/consent gates, Resend job model and webhook statuses | `HH_CRM_RESEND_*` missing, sender not verified | Not connected |
| Instagram DM / Facebook Messenger | Official Meta adapters and webhook contracts | Meta credentials, permissions and app review absent | Not connected |

No generic notification contains private message text, health records, diagnoses, test scores or private URL tokens. Only a bounded authenticated in-app conversation link should be exposed. API acceptance `200/202` or `providerAccepted=true` is **not** proof of handset receipt, customer reading, booking or payment.

## Implemented quality changes (CRM messaging navigation and status)
1. Channel diagnostics mark missing credentials as *Setup required* and disabled production as *Sending disabled*. A raw `enabled` flag can no longer be displayed as an operational, green delivery channel; Telegram pilot is labeled *Pilot*, never public.
2. CRM **Messages** now shows separately: secure in-app client/practitioner conversations; external provider Inbox; consent-checked manual SMS; requested manual WhatsApp; actual provider setup; phone Web Push settings.
3. Mobile 320–430px: one-column cards, 44px touch targets; EN/RU/ES navigation labels, private account link checks. CRM tabs are bookmarkable as `?panel=crm&crmTab=messages`, `sms`, `integrations` (no PII, message IDs or clinical data in URL).
4. Focused unit tests and CRM CI build check stage logic, missing keys, account boundaries and absence of fabricated delivery receipts.

## Controlled E2E acceptance still to run
- Owner + separately authorized client/practitioner, no real patient data: submit test request → verify legitimate participant → save one safe generic reply → master/client read back, unread and follow-up state → confirm other account forbidden → enable PWA notification on a real phone → actually **receive and tap** to exact protected conversation → revoke consent and ensure next test does not deliver.
- Customer Telegram: owner `/start` in approved bot, verified webhook readback (do not hijack another app's webhook), test to their own linked chat and verify actual Telegram receipt, STOP, duplicate provider event, wrong-owner denial before a separate approval to message real clients.
- WhatsApp Business: official WABA/Meta verification, signed webhook, customer opt-in, owner manual reply within window, provider receipt vs actual client handset; no paid template send without budget.
- SMS: verified legal sending identity and Twilio number, STOP/HELP, validated SMS webhook, one owner handset controlled test, provider accepted vs delivered, budget approval; manual carrier SMS can be used before this if lawful and manually reviewed.
- Email: verified Resend domain, SPF/DKIM, sender details, signed webhook and one opted-in test.
- iPhone/Android native: Apple Developer TestFlight signing/APNs + Firebase app config/FCM and physical device test, do not present unsigned simulator .app or unstable debug key APK as customer release.

## Minimal owner navigation

1. [My Practice — CRM messages](https://holistichouse.vercel.app/ru/app/practice?panel=crm&crmTab=messages), [secure practitioner↔client messages](https://holistichouse.vercel.app/ru/app/practice?panel=clients), and [CRM connections / shared Telegram bot test](https://holistichouse.vercel.app/ru/app/practice?panel=crm&crmTab=integrations). The existing verified `@andydotbot` does **not** require another token when shared bot mode remains allowed; press verify webhook only after checking the owner linked chat.
2. [Cabinet phone notification settings](https://holistichouse.vercel.app/ru/app/settings#hh-phone-notifications): on an installed Safari/Chrome PWA, enable opt-in message alerts; verify receipt on the real device. Confirm Telegram /start in [@andydotbot](https://t.me/andydotbot) separately.
3. Optional paid integrations, only if required: [Twilio Console](https://console.twilio.com/) and [Meta WhatsApp Manager](https://business.facebook.com/latest/whatsapp_manager) for official verified sender, legal eligibility, consent and budget. Save secrets in [Vercel Production Environment Variables](https://vercel.com/super10/codex-public-book-library/settings/environment-variables), never in ChatGPT or Git.

Keep [CRM issue #985](https://github.com/andylitvinov-design/books/issues/985), [Telegram/WhatsApp issue #1302](https://github.com/andylitvinov-design/books/issues/1302), [Resend #980](https://github.com/andylitvinov-design/books/issues/980), and [native phone #1310](https://github.com/andylitvinov-design/books/issues/1310) open until their provider and physical acceptance gates complete. No E2E sends or client data seeded during this audit.
