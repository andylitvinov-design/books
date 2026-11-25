# Holistic House environment registry

Date: 2026-10-19. This registry contains variable **names only**. Values,
secret formats beyond validation rules, contact data and provider IDs must
never be committed, copied to issues or placed in a browser-visible variable.

## Confirmed Vercel metadata

| Group | Production | Preview | Audit result |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | present | not listed | Public identifier exists, but analytics remains privacy-held |
| `HH_APP_SUPABASE_URL`, `HH_APP_SUPABASE_PUBLISHABLE_KEY` | present | present | Expected public connection configuration |
| `HH_APP_SUPABASE_SECRET_KEY` | present | not listed | Server-only; value not inspected |
| `HH_CRM_ENABLED`, `HH_CRM_PRODUCTION_APPROVED` | present | not listed | CRM feature gate metadata present |
| `PRESCRIPTIONS_REDIS_URL` | present | not listed | Runtime metadata present; source uses REST URL/token for protected stores |
| `CRON_SECRET`, `HH_PUSH_*`, `HH_PUSH_CRON_SECRET` | present | varies | Server-only automation controls; no value inspection |

The following service families were not present under their expected names in
Vercel Production at audit time: `HH_CRM_TWILIO_*`, `HH_CRM_RESEND_*`,
`HH_CRM_MSG_*`, YouTube upload controls, Eventbrite/Meetup/Luma, Metricool,
Meta Ads and Google Ads. Absence means **not configured**, not a provider
outage.

## Required variables by capability

| Service | Names | Environment | Purpose / safety gate | Current state |
| --- | --- | --- | --- | --- |
| Resend | `HH_CRM_RESEND_API_KEY`, `HH_CRM_RESEND_WEBHOOK_SECRET`, `HH_CRM_FROM_EMAIL`, `HH_CRM_VERIFIED_DOMAIN`, `HH_CRM_SENDER_VERIFIED`, `HH_CRM_SENDER_NAME`, `HH_CRM_REPLY_TO`, `HH_CRM_POSTAL_ADDRESS`, `HH_CRM_EMAIL_ENABLED`, `HH_CRM_EMAIL_PRODUCTION_APPROVED` | Production only for secrets; Preview must use separate non-production credentials | Verified owned domain, signed webhook, CASL sender details and explicit sending gate | NOT CONFIGURED |
| Twilio SMS | `HH_CRM_TWILIO_ACCOUNT_SID`, `HH_CRM_TWILIO_AUTH_TOKEN`, `HH_CRM_TWILIO_MESSAGING_SERVICE_SID`, `HH_CRM_SMS_SENDER_VERIFIED`, `HH_CRM_SMS_CONTACT_DETAILS_VERIFIED`, `HH_CRM_SMS_ADVANCED_OPTOUT_VERIFIED`, `HH_CRM_SMS_ENABLED`, `HH_CRM_SMS_PRODUCTION_APPROVED`, `HH_CRM_SMS_PILOT_APPROVED`, `HH_CRM_SMS_TEST_PHONE`, `HH_CRM_SMS_LIVE_APPROVED` | Production only for credentials | One-owner pilot before any live recipient; signed callback and STOP handling | NOT CONFIGURED |
| Telegram | `HH_CRM_MSG_TELEGRAM_TOKEN`, `HH_CRM_MSG_TELEGRAM_BOT_ID`, `HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET`, `HH_CRM_MSG_TELEGRAM_ENABLED`, `HH_CRM_MSG_TELEGRAM_PILOT_ENABLED`, `HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID`, `HH_CRM_MSG_PRODUCTION_APPROVED` | Production only | Separate owned bot; pilot restricts delivery to one numeric owner chat ID | NOT CONFIGURED |
| WhatsApp | `HH_CRM_MSG_WHATSAPP_TOKEN`, `HH_CRM_MSG_WHATSAPP_PHONE_ID`, `HH_CRM_MSG_WHATSAPP_ENABLED`, `HH_CRM_MSG_META_APP_SECRET`, `HH_CRM_MSG_META_VERIFY_TOKEN`, `HH_CRM_MSG_META_API_VERSION`, `HH_CRM_MSG_PRODUCTION_APPROVED` | Production only | Official Cloud API; never a personal-session token | NOT CONFIGURED |
| Instagram Direct | `HH_CRM_MSG_INSTAGRAM_TOKEN`, `HH_CRM_MSG_INSTAGRAM_ID`, `HH_CRM_MSG_INSTAGRAM_ENABLED`, shared `HH_CRM_MSG_META_*` variables | Production only | Meta app permissions and signing required | NOT CONFIGURED |
| Facebook Messenger | `HH_CRM_MSG_MESSENGER_TOKEN`, `HH_CRM_MSG_MESSENGER_PAGE_ID`, `HH_CRM_MSG_MESSENGER_ENABLED`, shared `HH_CRM_MSG_META_*` variables | Production only | Meta app/Page permissions and signing required | NOT CONFIGURED |
| YouTube phone uploader | `HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID` (optional override), `HH_YOUTUBE_PHONE_UPLOAD_ENABLED` | Production only | Public OAuth Client ID may be configured through existing owner onboarding; no Client Secret belongs in frontend | NOT CONFIGURED |
| Protected Redis stores | `PRESCRIPTIONS_KV_REST_API_URL`, `PRESCRIPTIONS_KV_REST_API_TOKEN`, `PRESCRIPTIONS_DATA_ENCRYPTION_KEY`, `PRESCRIPTIONS_ADMIN_TOKEN` / approved admin control | Isolated Production and Preview values | Never use Production storage/secrets in Preview | PARTIAL |
| Private R2 option | `HH_CLIENT_R2_ACCOUNT_ID` plus server-only R2 credentials defined by private-store adapter | Production only, after privacy assessment | Client media must remain private; no public bucket/link | NOT CONFIGURED |
| GA4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Production public config | Only after consent default-denied, withdrawal and route exclusions are live-verified | PARTIAL / held |
| Supabase | `HH_APP_SUPABASE_URL`, `HH_APP_SUPABASE_PUBLISHABLE_KEY`, `HH_APP_SUPABASE_SECRET_KEY` | Secret key Production only | Publishable key may be client-visible; secret key must never be `NEXT_PUBLIC_*` | PARTIAL |

## Callback URLs

| Provider | Fixed production callback |
| --- | --- |
| Resend | `https://holistichouse.vercel.app/api/app/crm/webhook` |
| Twilio | `https://holistichouse.vercel.app/api/app/crm/sms/webhook` |
| Telegram | `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram` |
| WhatsApp | `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/whatsapp` |
| Instagram | `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/instagram` |
| Messenger | `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/messenger` |

## Handling rules

- Store secrets only in the service vault and Vercel Production secrets. Do
  not copy Production values into Preview.
- Prefix no server secret with `NEXT_PUBLIC_`.
- A missing or malformed value is a fail-closed state, never a reason to add a
  placeholder or enable a feature flag.
- Rotate only on evidence of exposure, and record the affected provider,
  timestamp and rollback plan without recording the old/new value.
