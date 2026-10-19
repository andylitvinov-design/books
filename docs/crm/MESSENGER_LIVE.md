# Holistic House · CRM Messages — implementation & production gates (Issue #985)

**Status:** source code and additive database schema; providers remain disabled unless explicitly verified. No real client messages, no marketing campaign and no paid template messages from this release.

## 1. Deployed product
- My Practice → CRM → Messages is a private, EN/RU/ES-responsive, owner-only inbox.
- Provider accounts, encrypted inbound conversations, deduplicated webhook message items, contact/lead creation, idempotent one-to-one replies and delivery statuses where authoritative provider receipts exist.
- Conversations are linked to owner-scoped CRM leads, which default to no marketing consent; no client clinical records, assessments or private bearer links are imported.
- Simple outbound customer replies only. WhatsApp/Instagram/Messenger require an inbound within the previous 23 hours (conservative safety margin); Telegram requires a verified prior inbound. No outside-window templates or bulk promotions.
- All metadata/PII are protected under existing encryption and PostgreSQL restricted roles plus FORCE RLS; no provider access token in DB. Unknown provider response is **not** auto-retried.

## 2. Non-secret setup (channel by channel)
All providers disabled by default. New env keys are server-only in Vercel Production, never in GitHub or chat.
Shared: `HH_CRM_MSG_PRODUCTION_APPROVED=true` **only after** owner-approved synthetic test and rollout.
Telegram: `HH_CRM_MSG_TELEGRAM_ENABLED=true`, `HH_CRM_MSG_TELEGRAM_TOKEN`, `HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET`, `HH_CRM_MSG_TELEGRAM_BOT_ID` (from verified Bot API getMe). Register official Bot API webhook URL `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram` and set Telegram secret_token. Owner then signs in to My Practice → CRM → Messages and selects Connect, which validates getMe before registering the account.
WhatsApp: `HH_CRM_MSG_WHATSAPP_ENABLED=true`, `HH_CRM_MSG_WHATSAPP_TOKEN`, `HH_CRM_MSG_WHATSAPP_PHONE_ID`, shared Meta application secret/verify token/API version below. Explicit owner review of phone migration/coexistence and approval of permitted business use required.
Instagram (Meta Instagram API with Instagram Login: `graph.instagram.com/{version}/me/messages`, scope `instagram_business_manage_messages`; Facebook Login path not enabled by this adapter): `HH_CRM_MSG_INSTAGRAM_ENABLED=true`, `HH_CRM_MSG_INSTAGRAM_TOKEN`, `HH_CRM_MSG_INSTAGRAM_ID`, shared Meta secret/verify token/version below; account must have messaging permission.
Facebook Messenger: `HH_CRM_MSG_MESSENGER_ENABLED=true`, `HH_CRM_MSG_MESSENGER_TOKEN`, `HH_CRM_MSG_MESSENGER_PAGE_ID`, shared Meta secret/verify token/version.
Shared Meta: `HH_CRM_MSG_META_APP_SECRET`, `HH_CRM_MSG_META_VERIFY_TOKEN`, `HH_CRM_MSG_META_API_VERSION` (explicit supported vNN.0; do not guess), app verification/review approved. Verified callback URLs (GET challenge and signed POST) are `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/{whatsapp|instagram|messenger}`. Connect each approved business account in the owner CRM only after real Graph API readback.

### Important provider caveats
The Instagram/Messenger Graph API endpoints and permissions vary according to Meta login flow/app product. Before activation confirm current provider API workflow for the exact owned professional account/Page; failing API calls are recorded failed/unknown, not silently declared delivered. Meta WhatsApp policies can restrict health-related businesses/contents; complete eligibility review. For Messenger and Instagram, customer-initiated conversation is required. Official Bot API users must initiate conversation. Telegram delivers no true read receipt.

## 3. Schema migrations & authorization
- `20261018185711_hh_crm_messenger_core_20261018.sql`
- `20261018190505_hh_crm_messenger_reply_thread_grant_20261018.sql`
Both require security, compatibility and RLS verification in Supabase. Existing email/contact schemas remain unchanged. Existing `crm_contacts` accepts incoming chat-only leads through the approved narrow webhook DB function with `email:''` but email verification/sending still fails closed.
The webhooks use a provider-verified signature/secret **before** any DB call; the restricted hh_app_inbox role can invoke narrow `app_private.crm_msg_resolve`, `crm_msg_ingest`, `crm_msg_receipt` functions. Owner UI requests use existing authenticated `hh_crm_backend` + account-active verification.

## 4. QA acceptance
1. HTTP unauthenticated `GET /api/app/crm/messenger` returns 401; unauthorized owner/account mismatch returns 403/409, never data.
2. Disabled channel and absent token: Connect and Send fail closed.
3. Invalid Telegram secret / invalid Meta SHA256 HMAC: 401, DB unchanged.
4. Duplicate event: one inbound item/lead; duplicate requestId: at most one provider send.
5. End-to-end on **owned synthetic** Telegram test chat: explicit Start → inbound → CRM → reply accepted.
6. WhatsApp: business-initiated outside 23h blocked; no unapproved template/cost; signed delivery receipts update status only after matching outbound provider ID.
7. Global contact suppression blocks send even if inbound 24h window open.
8. Tenant A cannot view/send/mark read for tenant B, including direct UUID guess.
9. Long/clinical/secret-link outbound rejects; inbound PII encrypted and not logged.
10. Serverless timeout after uncertain send remains `unknown`; no silent retry.
11. Confirm that unrelated Client Cabinet, legacy Clients, email consent, private session links, courses, and follow-up CRM keep working.
12. Verify mobile 360/390/430 px and EN/RU/ES.

## 5. Release gate / kill switch
Global: set `HH_CRM_MSG_PRODUCTION_APPROVED=false`. Provider-specific: `HH_CRM_MSG_{TELEGRAM,WHATSAPP,INSTAGRAM,MESSENGER}_ENABLED=false`. These flags must be changed in Vercel only after verifying owned assets and one synthetic delivery; unsetting them immediately disables replies and webhook acceptance (no data deletion).
Existing CRM application flags remain independent. Retain transcripts only under an explicit retention policy. When provider credentials cannot be verified, UI stays truthful: not configured/connected, no fabricated messages.

## 6. Operational limits
This v1 does not provide marketing automation, Meta template creation, two-way attachment streaming, full chat backfill, nor merging prior personal Messenger/WhatsApp chats. Reiki course Lead 1/Lead 2 use the separately reviewed real CRM course leads implementation and are not duplicated here. Any later automation must be a separately approved project with explicit consent checks and cost caps.

Tracking: https://github.com/andylitvinov-design/books/issues/985

## 7. Follow-up hardening v1.1 — 18 Oct 2026
New additive production migration: `20261018193024_hh_crm_messenger_early_receipts_20261018.sql`. It stores signed, hashed WhatsApp delivery/read/failed receipts independently of the Send response, then reconciles a receipt that arrived before provider acknowledgment. Only encrypted owner-scoped message items can be read through the CRM role; table has FORCE RLS, with no anon/authenticated SELECT privilege. Raw provider/recipient IDs are not stored.
The new migration was applied to the verified `holistichouse` Supabase project. A synthetic rollback-only DB transaction checked early read receipt, later send record, delivered-after-read non-regression; all five messenger tables remained at 0 rows. No real messages were sent.
Owner Connect for a **dedicated Telegram Bot API bot** now checks the verified bot ID, checks `getWebhookInfo` and REFUSES to replace a webhook belonging to another application; if safe, it registers this site's HTTPS webhook with `secret_token`, allowed message updates and `drop_pending_updates:false`, then reads back. The callback is registered only on a deliberate authenticated owner Connect action, never at build or page load. Cannot run until server-side BotFather token/secret and global production-approval flags exist.
For owner replies, the server rechecks suppression, account availability and the response window just before the provider call. A denied/archived recipient results in a stored `blocked` item, not a provider request. On the iPhone/composer side, a repeated click or ambiguous HTTP timeout reuses the same idempotency key for an unchanged draft, avoiding duplicate provider sends. Any queued item left by an interrupted execution becomes `unknown` after 5 minutes at next authorized read; it is NOT sent again automatically. Delivery/read statuses must still come from valid signed provider receipts.
Synthetic tests and source checks are in `tests/crm-messenger.test.mjs`. CI must pass before production cutover. In the absence of all required keys, real external sending remains disabled by design. A Metricool connection to YouTube is **not** an Instagram/Facebook messaging credential, and cannot authorize their inbox APIs.
Provider activation is a separate operational gate, not part of a normal code merge. No Meta app approval, owned WhatsApp business number, official IG professional messaging permissions, Facebook Page messaging tokens or working Telegram bot credential are yet verified through this project. No paid campaign or client send permission is inferred.

## 8. Inbox UX and cross-browser duplicate protection (October 18, 2026)

- My Practice → CRM now has **Overview / Messages / Contacts** sections (EN/RU/ES labels); the Messages tab is an independently rendered owner-only panel, not blocked by an unrelated CRM overview request. On small phones the section strip scrolls horizontally without overflowing the page.
- Messages has a customer-name search, provider filter (Telegram / WhatsApp / Instagram / Facebook Messenger), an unread-only switch and human-readable accepted/delivered/read/failed/unknown statuses in the chosen language.
- Server-side one-to-one reply reservation now checks **recent encrypted texts under the locked owner-scoped thread**, not just the browser request ID. The same outgoing text is not re-reserved for 24 hours if the prior attempt is queued or its status is unknown; recently accepted/delivered/read copies are also blocked for five minutes. This protects multiple tabs, a browser refresh and network timeouts without storing plaintext hashes or importing clinical records.
- Repeated intentional replies can use new wording after a confirmed delivery; a blocked or uncertain status is never silently converted to delivered, and no provider request is automatically retried. The existing 20/day outgoing cap and disabled-by-default provider flags remain unchanged.
- UI changes and anti-duplicate behavior are covered by `tests/crm-messenger.test.mjs`. No real delivery is implied by a passing synthetic/source test or successful Vercel deployment.

**Release gate remains:** Owned Telegram bot and verified Meta WhatsApp / Instagram / Facebook messaging connections must be configured securely, then one approved synthetic end-to-end exchange must pass. Never enable `HH_CRM_MSG_*` based on a third-party social publishing connector, a website visitor, or a saved phone number alone.

## 9. Inbox customer workflow v3 — integration in CRM

- Source plan: [Messenger v3 roadmap](./MESSENGER_IMPROVEMENTS_V3_2026-10-18.md). This iteration reuses **existing schema**, requiring **no additional production migration**.
- Owner-only thread header now contains **lead / client / archived** stage selection. The POST `set_stage` action resolves the CRM contact from the owner-verified thread and delegates to existing revision-guarded `store.setLifecycle` — never trusts a contact ID sent by the browser.
- **Follow-up tasks** use existing `crm_followups`. Actions `create_followup` and `complete_followup` are owner-scoped. The latter validates the exact follow-up/thread association before calling the revision-guarded CRM operation. The thread lists 20 upcoming open tasks; the global overview refreshes after changes.
- **Private business notes** are explicit `direction='note'` entries in the pre-existing encrypted `crm_msg_items` table. They use identical AAD-based `seal` encryption, an exact-payload idempotency key, a limit of 800 chars and 50 notes/day. Notes have **no provider ID** and cannot trigger Send/Meta/Telegram; medical material and bearer links remain out of scope. Their appearance is visually distinct from customer messages, and they do not reorder the thread inbox.
- **Needs reply** is computed from the most recent **incoming** event or provider-accepted outbound event; internal notes and failed/blocked/unknown outgoing attempts cannot falsely mark a conversation answered.
- **Race protection:** out-of-order GET responses cannot replace the selected thread; stale POST responses do not erase a different client's note/reply drafts. A message composer remains manual and explicitly approved; EN/RU/ES neutral quick-reply chips **only populate** the draft textarea.
- UI mobile layout includes 44 px touch targets, compact stage/tasks/note panels, filter for “Needs reply”, and no automatic polling/paid messaging calls. Sensitive message bodies never appear in URL strings or telemetry.
- Server reads/writes remain authenticated, same-origin, `X-HH-Account-Id` matched and `hh_crm_backend` owner-restricted; the new POST actions have explicit payload whitelists.
- **Release:** merge only after source checks and Next.js Production build. Since provider credentials `HH_CRM_MSG_*` remain missing, all real Telegram/WhatsApp/Instagram/Messenger sending stays disabled by design. No client messages or paid provider operations are part of this v3 work.
