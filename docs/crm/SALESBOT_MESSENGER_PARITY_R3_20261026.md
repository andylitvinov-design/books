# Holistic House · SaleBot.pro → existing Messenger · R3 gap audit and delivery plan
**Date:** 26 October 2026 (Toronto). **Scope:** existing `codex/public-book-library` and `/en|ru|es/app/messages`, CRM issue [#985](https://github.com/andylitvinov-design/books/issues/985), lead chain [#990](https://github.com/andylitvinov-design/books/issues/990). This audit is based on public official SaleBot.pro docs and production source, NOT the owner's logged-in SaleBot.pro project graph. The previous Remaster parity benchmark [#2108](https://github.com/andylitvinov-design/books/pull/2108) studied **amoCRM Salesbot**, a different product; its 40% figure must not be reused as a SaleBot.pro claim.

## Verified state before R3
- **UI:** one-screen owner Messages list and conversation [#2155](https://github.com/andylitvinov-design/books/pull/2155), keyboard-safe iPhone composer [#2182](https://github.com/andylitvinov-design/books/pull/2182), standalone PWA [#2179](https://github.com/andylitvinov-design/books/pull/2179), client card [#2181](https://github.com/andylitvinov-design/books/pull/2181), private Telegram portrait proxy [#2164](https://github.com/andylitvinov-design/books/pull/2164).
- **Back end:** existing `crm_contacts`, `crm_threads`, `crm_messages`, consent/STOP, owner-scoped follow-ups, manual sends through existing provider adapter, service enquiry intake, Telegram V2 fixed diagnostic stages. No new client database.
- **SalesBot builder:** pure validator + dry-run `lib/crm/salesbot-flow.mjs`, owner-only `POST /api/app/crm/salesbot`, encrypted approved-preview snapshots `app.crm_salesbot_flows` (R1/R2) and editor in CRM → Automations. **Not a live runtime.** Last recorded real readback: 0 saved owner flows, 1 enabled Telegram account, 1 thread, 11 inbound and 0 outbound provider replies; see latest dated #985 evidence. Counts are historical snapshots, not live telemetry in this doc.
- **Telegram:** customer opt-in diagnostic flow, V2 fixed buttons and intake, but physical bidirectional owner→customer receipt and STOP acceptance remain independent E2E gates. Provider activation for WhatsApp/Instagram/Facebook and payments not established.
- **Release source:** GitHub default `codex/bootstrap-books` is *not* production. Reverify current production branch SHA and Vercel exact alias before release; do not use a historical SHA as current.

## Feature-by-feature SaleBot.pro parity (functional, not proprietary code)

| Contract seen in official docs | Existing HH | Gap | Priority |
|---|---|---|---|
| Operator inbox, CRM contact card, notes, statuses | One-window CRM/Messages, photo/protected links, manual followups | real multi-account E2E, full message delivery receipts | P0 |
| Builder with messages, choices, conditions, offers | R1/R2 approved owner *preview* graph | Connect to owner-assisted reply composer (R3), then safe live runtime | P0 |
| Respond to incoming events with saved state | Fixed Telegram V2 intake only | Generic event trigger/run state/checkpoint + idempotent resume | P0 |
| Move deal along pipeline/create operator task | Manual CRM action only | Typed side-effect nodes through existing `crm` repository | P1 |
| Delays, reminders and drip sequences | Manual follow-ups only | Consent/revocation-aware scheduled delivery with capped queue and TTL | P1 |
| Tags/lists/segmentation | Contact stages and manual attribution | Owner-scoped tags + collision-safe identity links; don't merge health-client records | P2 |
| Human handoff, operator distribution, audit | Manual CRM thread and followups | Assignments, SLA/working hours, activity history and failure replay | P1 |
| Channels: Telegram/WhatsApp/Instagram/Messenger | Telegram limited live intake; other adapters/flags | official OAuth/provider capabilities and signed provider E2E by channel | P2 |
| AI-assistant FAQ | No production AI bot dispatcher | Approved public FAQ, fallback-to-human, minimal data, review/cost cap | P3 |
| Booking/payment/course access | Independent services, commerce, Academy | Confirmation only on real provider receipts, then entitled course access | P3 |
| Campaigns/broadcasts | Separate Growth Studio drafts | Respect explicit marketing opt-in/STOP/CASL, throttle and paid-cost gate | P4 |
| Source and conversion analytics | Manual status, attribution planning | Read-only run timeline, provider IDs/errors, verified lead→booking→paid | P1 |

Official **SaleBot.pro** sources: https://docs.salebot.pro/ ; https://docs.salebot.pro/chat-boty/kak-sozdat-chat-bot-dlya-biznesa/nastroiki-bloka-soobsheniya ; https://docs.salebot.pro/rassylki/rassylki-v-messendzhery ; https://docs.salebot.pro/onlain-zapis/onlain-zapis-dlya-uslug/chat-bot-dlya-onlain-zapisi .

## R3 delivery · explicit human-in-the-loop first slice
**New in this PR:** the existing CRM Messenger compose area gets a compact, collapsed **SalesBot** assistant for one selected owner CRM conversation.
1. Lazy-load existing authenticated `/api/app/crm/salesbot/drafts` only when clicked, with exact `X-HH-Account-Id`, no-store, no customer data.
2. Show **only** owner-encrypted, validated `approved_preview` flows at a committed positive version; never expose paused/draft flows, tokens, photos or private case data. If none: link to the *existing* CRM Automations studio.
3. Operator manually chooses topic, previews via the *existing* side-effect-free, owner-authenticated `/api/app/crm/salesbot` endpoint, explores branching choices hypothetically (not stored as customer answers), and clicks **Insert draft** for one approved response. Verified public offer paths come from `salesbotOfferPath`, ignoring arbitrary paths from response payload.
4. Insert into the exact active thread's existing composer; require confirmation before overwriting nonempty draft; discard stale pending idempotency key; no auto-send, contact mutation, marketing consent or payment.
5. Isolate by `accountId+threadId`, cancel stale GET/POST on account/thread switch, avoid chat text and medical data in simulator requests. EN/RU/ES, 320–430px and keyboard-safe overlay. App continues network-only private message caching.
6. **Release:** focused Node security/flow tests, CRM workflow, ESLint/typecheck/build, mobile Chromium/WebKit, Vercel READY exact merged SHA and domain. **Owner-authenticated iPhone check** that tap Insert populates only selected chat and Send remains visible. A real sender/recipient receipt is separate and not implied.

### Post-R3 implementation batches (no new CRM)
- **P0.1 · observed replies:** confirm second consenting Telegram account `Start → opt-in → incoming message → real owner reply → provider receipt → STOP`; verify wrong-account 401/403/RLS, signed webhook update ID replay, no double-message, no PII in logs. Leave public blasting OFF.
- **P0.2 · passive runtime (feature flag OFF):** compile approved snapshot to `salesbot_runs` (owner, contact, channel, thread, flow version, node, expiration, opaque event id). On a signed inbound event, compute the next deterministic transition under row lock. **No external send or auto contact writes yet.** Read-only owner run history + dry-run replay. Persistence encrypted/private, RLS/FORCE RLS, key-version pin; rate ceiling and 7–30 day retention.
- **P1 · restricted sends:** owner opt-in per flow and channel; bounded `say/choice/offer/handoff` only, session state, explicit consent and STOP before every dispatch; provider-specific policy, encrypted idempotent outbox, retry only after reconciling provider status (unknown never silently duplicated), operator takeover, dead-letter metrics. Real client-phone receipt gate required per channel.
- **P1 · typed CRM actions:** on verifiable contact and permission, add `create_followup` / `set_stage` nodes reusing current owner repositories; explicit confirm on booking and financial actions. No arbitrary JS/HTTP.
- **P2 · connectors/identity:** official WhatsApp/Meta OAuth, scopes, review, attribution, no cross-client record merge by fuzzy names; CASL opt-in and STOP; WhatsApp 24h session/template restrictions; EN/RU/ES.
- **P3/P4 · commerce/course/AI/campaigns:** signed real payment receipt → guarded entitlements; booking calendar provider confirmation; AI only verified public FAQ and mandatory handoff on clinical topics; campaigns only after separate marketing approval and suppression checks.

**Never** put assessment results, diagnoses, patient photos/notes or private links into external SMS, Telegram, WhatsApp, push, pixels or AI model logs. Provider accepted ≠ delivered. Link click ≠ lead ≠ booking ≠ payment. All releases require exact branch/CI/READY/SHA/domain plus genuine actor E2E before marked complete.

### Owner acceptance for R3
- Open https://holistichouse.vercel.app/ru/app/messages (logged-in owner), select a consenting CRM Telegram contact, tap the compact SalesBot chip above the reply input.
- Select an approved scenario, press Show suggestions, choose a branch and press Insert draft. The message should be visible **only in the local compose field**, no delivery until Send. Existing text must require overwrite confirmation.
- If no approved scenarios exist, open https://holistichouse.vercel.app/ru/app/practice?panel=crm&crmTab=automations, save and approve **preview** of an appropriate neutral human reply. Never test with real clinical content.
