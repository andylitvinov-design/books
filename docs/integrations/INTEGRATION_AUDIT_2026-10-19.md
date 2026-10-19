# Holistic House integration audit — 2026-10-19

Scope: production branch `codex/public-book-library`, Vercel project
`super10/codex-public-book-library`, and Supabase project `holistichouse`.
This is an evidence record, not a list of planned integrations. `READY` below
requires a current real provider acceptance or read-back; code, an environment
variable name, or a mock test alone is not enough.

## Snapshot and release evidence

- The production alias `https://holistichouse.vercel.app` resolved in the
  Vercel dashboard to a **Ready** deployment for commit
  `c2b1f0a2f7a6698f58cb12dd74bd19c69d851284` on
  `codex/public-book-library`.
- Vercel is configured to deploy only that branch. Preview builds are skipped
  and documentation-only changes are ignored by
  `scripts/vercel-ignore-build.mjs`; runtime changes continue to build.
- Vercel showed several distinct recent production SHAs, rather than retries
  of one SHA. This is release fragmentation, not evidence of a build loop.
- Supabase dashboard read-back showed applied migration
  `20261019162351_hh_crm_sms_delivery_20261019` and later CRM/practitioner
  migrations. Its security advisor had 0 errors, 1 warning and 5 suggestions
  at audit time; the warning is recorded below.

## Matrix

| Service | Code | Env | OAuth/API access | Webhook | Database | Real E2E test | Production | Missing | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub → Vercel | PARTIAL — branch and ignore guard in source | PARTIAL — Vercel Git metadata confirmed | PARTIAL — dashboard access only | n/a | n/a | PARTIAL — Ready deployment SHA read-back | PARTIAL | CI queue has not completed for audit PR; releases are fragmented | Merge only green, current-base PRs; batch runtime changes |
| Vercel deployment/CI | PARTIAL — preview and docs guards tested in source | PARTIAL — production configs present | PARTIAL — dashboard read-only | n/a | n/a | PARTIAL — current production Ready | PARTIAL | Historical CI failures were stale navigation assertions; remaining queue is external | Keep the guard; do not disable security or production builds |
| Supabase PostgreSQL/Auth/RLS/Storage | PARTIAL — repository and RLS contracts exist | PARTIAL — project keys are server-side only | PARTIAL — dashboard project read-back | n/a | PARTIAL — migration ledger read-back | PARTIAL — source/isolated tests, no new live record | PARTIAL | Local CLI is not linked; Security Advisor warning | Owner enables leaked-password protection; resolve migration parity only through #1109 process |
| Redis/KV | PARTIAL — private and editorial namespaces use one server-only REST adapter | PARTIAL — production `PRESCRIPTIONS_REDIS_URL` is present; source expects REST URL/token | BLOCKED — no safe provider read-back | n/a | PARTIAL | NOT CONFIGURED — no production write/read probe run | PARTIAL | No evidence of a separate Cloudflare KV namespace | Keep read-only until an approved synthetic probe; never share Production Redis with Preview |
| Cloudflare Workers/KV | BLOCKED — this repository contains no Workers KV client or namespace | NOT CONFIGURED — no `CLOUDFLARE`/Workers KV Vercel config found | BLOCKED — Cloudflare account not authenticated in this audit | n/a | n/a | NOT CONFIGURED | BLOCKED | Worker/site/namespace and quota source cannot be identified from this repo | Owner grants read-only Cloudflare dashboard access, then inspect Analytics → Workers/KV by namespace before changing limits |
| Cloudflare R2 private video option | PARTIAL — optional private object-store adapter only | NOT CONFIGURED — no R2 configuration confirmed | NEEDS OWNER AUTH | n/a | PARTIAL | NOT CONFIGURED | BLOCKED | Canadian residency/privacy acceptance and owned R2 access | Keep disabled; do not move client media to R2 without privacy approval |
| HeyGen Digital Twin | PARTIAL — pipeline/runbooks only | NOT CONFIGURED | NEEDS OWNER AUTH | n/a | PARTIAL — private video reference exists | NOT CONFIGURED | BLOCKED | No provider API read-back; no new render authorized | Preserve existing Digital Twin/look/voice/background; do not render |
| Google Drive media master | PARTIAL — runbook and handoff boundaries | NOT CONFIGURED | NEEDS OWNER AUTH | n/a | PARTIAL — private Supabase copy is distinct | NOT CONFIGURED | BLOCKED | No Drive master/file-byte read-back | Owner authorizes Drive access; verify SHA-256 and visual QA before any publish handoff |
| YouTube Data API/OAuth | PARTIAL — `/admin/youtube-upload`, durable history and read-back checks exist | NOT CONFIGURED — no YouTube upload controls found in Vercel | NEEDS OWNER AUTH | n/a | PARTIAL — history store uses server Redis | NOT CONFIGURED | BLOCKED | OAuth Client ID/owner consent/channel read-back | Use the existing admin onboarding, scopes `youtube.upload` + `youtube.readonly`, then one new Unlisted synthetic upload only |
| Metricool/social publishing | PARTIAL — Growth Studio is a roadmap and adapters are not a live publisher | NOT CONFIGURED | NEEDS OWNER AUTH | n/a | NOT CONFIGURED | NOT CONFIGURED | BLOCKED | Current provider API/token/channel read-back unavailable; only historical YouTube channel note exists | Reconnect approved brand; do not publish, expose Unlisted video, or create HeyGen renders |
| Resend email | PARTIAL — signed webhook, suppression, idempotency and tests | NOT CONFIGURED — required `HH_CRM_RESEND_*`/sender flags absent from Vercel Production | NEEDS OWNER AUTH | PARTIAL — `/api/app/crm/webhook` in code | PARTIAL — CRM journal/suppression code | NOT CONFIGURED | BLOCKED | Verified owned domain, sender, webhook secret, API key, CASL details, synthetic acceptance | Configure server-only values and run one consenting test; leave email off until receipt plus unsubscribe read-back |
| Twilio SMS | PARTIAL — PRs #1216/#1220/#1230 code path, signed webhook, STOP and no auto-retry | NOT CONFIGURED — required `HH_CRM_TWILIO_*` and rollout flags absent | NEEDS OWNER AUTH | PARTIAL — `/api/app/crm/sms/webhook` in code | PARTIAL — SMS delivery migration applied | NOT CONFIGURED | BLOCKED | Owned account/service/sender, Advanced Opt-Out, test phone and CASL pilot approval | Configure one owned test recipient, perform read-only provider probe then a single pilot; do not buy a number or enable live sending |
| Telegram Bot API | PARTIAL — official Bot API adapter, pilot allow-list and signatures | NOT CONFIGURED — `HH_CRM_MSG_TELEGRAM_*` absent | NEEDS OWNER AUTH | PARTIAL — signed callback route exists | PARTIAL — message history/dedup code | NOT CONFIGURED | BLOCKED | Separate Holistic House bot/token, owner chat ID, webhook confirmation | Do not reuse `@ezohata_diagnostics_bot`; run `getMe`, callback and one owner-chat pilot after setup |
| WhatsApp Cloud API | PARTIAL — official adapter, consent/window policy | NOT CONFIGURED — `HH_CRM_MSG_WHATSAPP_*` absent | NEEDS OWNER AUTH | PARTIAL — signed Meta callback route | PARTIAL | NOT CONFIGURED | BLOCKED | WABA, Phone Number ID, app permissions/review, template/24-hour compliance | Configure only official Cloud API; no WhatsApp Web/userbot automation |
| Instagram Direct / Messenger | PARTIAL — official Meta adapters and signed callbacks | NOT CONFIGURED — respective `HH_CRM_MSG_*` absent | NEEDS OWNER AUTH | PARTIAL | PARTIAL | NOT CONFIGURED | BLOCKED | Professional IG/Page, approved Meta app and permissions | Obtain Graph API read-back and one synthetic inbound/reply test before enabling |
| Google Analytics 4 / Search Console | PARTIAL — consent-gated public analytics and source tests | PARTIAL — `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists only in Production | NEEDS OWNER AUTH | n/a | PARTIAL — CRM attribution contracts | NOT CONFIGURED | BLOCKED | Consent/default-denied, withdrawal, exclusion and DebugView have not been live-tested; Search Console access not confirmed | Keep `PUBLIC_ANALYTICS_AVAILABLE=false`; obtain owner read-only GA4/GSC access and test only public, non-PII events |
| Event Publisher (Eventbrite/Meetup/Luma/AllEvents) | PARTIAL — one confirmed-event source and referral code exist | NOT CONFIGURED | NEEDS OWNER AUTH | PARTIAL — provider hooks where supported | PARTIAL — event/referral model | NOT CONFIGURED | BLOCKED | Provider credentials/approved event and paid-plan decisions | Reuse TorontoTantra publisher; prepare drafts/export only, never invent dates or duplicate tickets |
| Google Ads / Meta Ads | PARTIAL — paused drafts, UTM and privacy guard documentation | NOT CONFIGURED | NEEDS OWNER AUTH | n/a | PARTIAL — verified-lead model | NOT CONFIGURED | BLOCKED | Ad account access, billing/launch approval, final landing-page policy review | Keep Meta cap at CAD 5/day and CAD 35/7 days as a future owner-controlled hard gate; do not launch |
| Payments / billing | PARTIAL — provider webhook routes and billing registry contracts | NOT CONFIGURED — no payment-provider audit credential established | NEEDS OWNER AUTH | PARTIAL — provider routes exist | PARTIAL | NOT CONFIGURED | BLOCKED | Owned payment provider read-back and synthetic receipt | Do not treat booking/redirect/CTA as payment; test a provider-approved non-financial path only |

## Findings and safe corrective work

1. The source already limits Vercel preview builds and skips only known
   documentation/CI-only changes. `vercel.json` permits the production branch
   only, with a single daily housekeeping cron. No client polling loop was
   found in the KV/video paths. Public editorial-video reads use a 60-second
   cache and a 1.2-second bounded storage read.
2. No Cloudflare Workers/KV runtime dependency or namespace is present in the
   production source or Vercel environment metadata. Therefore the reported
   100,000 reads/day cannot safely be attributed to this deployment. It must
   be identified in the Cloudflare account before any cache/limit change.
3. The duplicate local migration timestamp `20261019160000` remains a
   source-parity concern. It is outside the confirmed CRM migration sequence;
   never rename, replay, or `migration push` against production. Follow
   issue #1109.
4. Supabase Security Advisor's sole warning is **Leaked Password Protection
   Disabled**. It is an Auth policy change, so it was not toggled during this
   read-only audit.
5. The CRM owner interface now has a read-only Connections section. It shows
   only setup state, missing variable names, fixed callback URLs and the
   absence of a recorded provider check. It never reads secret values, probes
   providers, sends messages, or turns on a channel.

## Evidence limits

This audit did not send email/SMS/chat, publish social/event content, create
OAuth credentials, modify billing, migrate data, or upload media. These are
not failures of the code path; they are deliberate owner/provider gates. The
acceptance protocol in `E2E_ACCEPTANCE.md` defines the exact evidence needed
to advance any BLOCKED row.
