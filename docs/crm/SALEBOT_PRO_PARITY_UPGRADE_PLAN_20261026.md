# SaleBot.pro → Holistic House Messenger/CRM: functional gap analysis and upgrade plan

**As of 26 October 2026 (America/Toronto)** · **Status: PLAN / NOT IMPLEMENTED**  
Owners: existing CRM [#985](https://github.com/andylitvinov-design/books/issues/985), benchmarking [#2058](https://github.com/andylitvinov-design/books/issues/2058), funnel [#990](https://github.com/andylitvinov-design/books/issues/990), notifications [#1302](https://github.com/andylitvinov-design/books/issues/1302).  
Production code base: \`andylitvinov-design/books\` branch \`codex/public-book-library\`, **not** default \`codex/bootstrap-books\`. Canonical domain: https://holistichouse.vercel.app.

## 1. Objective and evidence boundaries

Turn the *existing* one-screen owner **Messages** UI plus **CRM Automations** into a small consent-based SalesBot-like product: a single thread per independently verified channel identity, a real bounded conversation engine, owner handoff, next business action, and verified conversion. **No second messenger, customer registry, course platform, payment ledger, or clinical profile database.**

Competitor is **SaleBot.pro**, used historically by the owner for EzoHata (\`ezohata\` project / \`@ezohata_diagnostics_bot\`). **Not amoCRM Salesbot.** Existing [amoCRM Remaster benchmark](../benchmarking/SALESBOT_REMASTER_FEATURE_20261026.md), merged [PR #2108](https://github.com/andylitvinov-design/books/pull/2108), is separately scoped to amoCRM public docs; its historical weighted percentage is **not** SaleBot.pro parity.

Source-based clean-room research only: official [SaleBot CRM dialog](https://docs.salebot.pro/crm-sistema/klienty-v-odnom-okne/dialog-s-klientom), [block actions and buttons](https://docs.salebot.pro/chat-boty/kak-sozdat-chat-bot-dlya-biznesa/nastroiki-bloka-soobsheniya), [variables](https://docs.salebot.pro/chat-boty/peremennye-i-funkcii/peremennye), [API / deal actions](https://docs.salebot.pro/integracii/api-v-konstruktore-salebot.pro/api-konstruktora), [broadcast segmentation](https://docs.salebot.pro/rassylki/rassylki-v-messendzhery), [booking](https://docs.salebot.pro/onlain-zapis/onlain-zapis-dlya-uslug), [analytics](https://docs.salebot.pro/chat-boty/kak-sozdat-chat-bot-dlya-biznesa/nastroiki-bloka-soobsheniya/vkladka-analitika) and [online site chat](https://docs.salebot.pro/onlain-chat-dlya-saita). An **authenticated SaleBot.pro owner project graph was not inspected in this audit**: browser access needs the originating connected browser context, so do not assert equivalence with its private EzoHata blocks or import proprietary source.

### Production baseline, read-only verification

- GitHub production HEAD: **\`dd794eba9ecde54a4cf960320152b0f6f6891778\`**, Vercel project \`super10/codex-public-book-library\`, production deployment **\`dpl_1ZK3ymvTBUwEo1szmhrdYNhrEevD\` READY**. Vercel alias lookup maps \`holistichouse.vercel.app\` to this deployment, which reports the exact SHA. This is a **point-in-time observation**, not a permanent claim about future pushes.
- Read-only Supabase aggregate, project \`shervdixkaxurnaecioe\`: **1 enabled Telegram CRM account**, **1 CRM message thread**, **11 incoming messages** (\`received\`), **1 outgoing message** (\`accepted\`), **0 owner-saved flows** in \`app.crm_salesbot_flows\`. Latest outbound recorded **26 October 2026, 16:09 Toronto**. Provider **accepted** is not recipient **delivered/read**. No private body, user ID, token, avatar or health data was fetched.
- Released owner one-window Messenger #2148/#2155; private Telegram photo/CSP #2164; keyboard composer #2182; PWA #2179; client card #2181. Current production tree includes \`components/app/messages-simple-inbox.jsx\`, \`components/app/messages-contact-card.jsx\`, and \`components/app/crm-messenger.jsx\`.
- Existing SalesBot code: \`lib/crm/salesbot-flow.mjs\`, \`lib/crm/salesbot-editor.mjs\`, \`lib/crm/salesbot-store.js\`, \`components/app/crm-salesbot.jsx\`, \`app/api/app/crm/salesbot/route.js\`, \`app/api/app/crm/salesbot/drafts/route.js\`. The visible studio explicitly says **dry run / no dispatch**; drafts store only owner drafts, \`approve_preview\` and pause. \`approved_preview\` is **not** published/executable.
- Separate hard-coded signed Telegram diagnostic V2 in \`lib/crm/telegram-diagnostic-v2.mjs\` and \`lib/crm/messenger-webhook.js\` handles explicit consent, bounded questions, buttons, optional pictures, STOP and encrypted CRM intake. It is not the interpreter for user-authored graph drafts. Other provider adapter code is not proof of actual WhatsApp/Meta connection.

## 2. Functional matrix: SaleBot.pro capability vs Holistic House

Status meanings: **Code/live** = merged released source/UI, **Partial** = separate limited/manual flow or E2E missing, **Gap** = no integrated production behavior validated. No unsubstantiated percentage.

| Feature / competitor concept | Holistic House current state | Gap / decision | Priority |
| --- | --- | --- | --- |
| Single list of chats and full conversation | **Code/live:** compact one-window Messages + website requests; CRM/direct stores remain separately authorized | Keep one UI, do not merge all storage/identities by guessed names | Preserve |
| Client card, history, media, status | **Code/live:** CRM card, notes/tasks and protected Telegram photo proxy; real physical image QA incomplete | Per-channel media E2E, attachments and client/master negative access test | P0 |
| Telegram incoming / owner's manual answer | **Partial:** 11 inbound, one \`accepted\` outbound; delivered/read not evidenced | Real consenting second-user receipt, STOP, retry/failure evidence | P0 |
| Other channels: WhatsApp, IG/FB, email, web chat | **Partial:** adapter/UI and private website channels exist, provider approvals not established | Separate channel-by-channel official connected E2E; don't show connected falsely | P3 |
| CRM contact, lead and manual tasks | **Code/live:** owner-scoped contacts, lifecycle, leads triage and follow-up queue | Keep one business contact; do not merge with private practitioner Client Cabinet | Preserve |
| Flow builder, message/choice/branch/offer/handoff | **Partial:** owner editor, strict JSON, templates, safe simulation, encrypted drafts | Add explicit versioned *publish* after gates, not an alternate editor | P1 |
| Real triggers from inbound message / CRM event | **Gap:** generic graph not wired to signed provider webhook | Event router per allowed account, explicit trigger, opt-in guard | P1 |
| Wait for reply, typed input, condition, resume | **Gap** in generic flow; fixed V2 diagnostic has only prewritten stages | Persist run cursor, captured fields, resume on reply, timeout and bounded validation | P1 |
| Tags, variables, segmentation | **Gap** as generic bot actions; limited CRM lifecycle and manual attribution exist | Allowlisted non-sensitive business fields; no arbitrary expression evaluator | P2 |
| Actions: create/advance verified CRM deal and follow-up | **Partial:** manually supported in CRM; no generic SalesBot node invokes them | Atomic contact/upsert, linked service enquiry, activity, task, assigned stage | P2 |
| Operator assignment / pause per conversation | **Partial:** owner manually replies; no fully proven multi-operator automated routing | Hand-off and claim/pause with explicit roles, owner overrides, wrong-owner deny | P2 |
| Scheduled messages and consented sequences | **Gap** as published automated bot functionality | Durable small-volume schedule, quiet hours/STOP, dedup, human review | P2 |
| Provider receipts and run error timeline | **Partial:** message status exists; not tied to each bot step or verified recipient | Run log + failed queue + receipt reconciliation, never claim sent=delivered | P1 |
| Campaigns/broadcasts | **Not live:** isolated marketing code cannot establish legal/transport readiness | Strict separate marketing consent (CASL), STOP, segments; disabled without approval | P4 |
| Calendar / real online booking | **Gap** from bot; discussion/status labels are not bookings | Available slot → lock → confirmed calendar/provider ID → client + CRM | P3 |
| Payment link / paid status / entitlement | **Gap** as end-to-end automation; separate payment and course modules exist | Only verified signed capture or audited manual reconciliation; no Stripe/PayPal Business assumption | P3 |
| Course enrolment and progress | **Code exists separately** in My Courses; automated paid entitlement not proven | Reuse My Courses; activate only on trusted order/entitlement evidence | P3 |
| AI FAQ / agent handoff | **Gap** as user-facing owned bot with approved scope | Optional retrieval from public FAQ, risk escalation, human fallback; budget approval | P4 |
| Per-step funnel analytics | **Gap** for generic SalesBot run | Privacy-safe aggregated started/consented/qualified/CRM/confirmed booking/paid; no pixels for private data | P2 |

## 3. Target product structure — no duplicate CRM

- **Messages = conversation surface:** people list, portrait, channel, unread/reply, current thread, attachments, compact Client card, human response and bot/human indicator. Do **not** make the chat look like a giant workflow editor. Mobile 320–430px; 16px keyboard composer and permanent Send remain visible.
- **My Practice → CRM / Automations = backstage:** versioned flow graph, statuses, simulation, publish approvals, bot logs, operator routing, tasks, provider health, marketing consent.
- **One first-party event seam:** signed official webhook / verified website request → authenticated account + channel identity → consent policy / STOP → deduplicated incoming message → owned run → validated next action → existing CRM and \`app.crm_msg_items\` outgoing pipeline → provider receipt → user-visible thread. Never have an unrelated second copy of a client or outbox.
- **Execution state, not arbitrary scripts:** propose small versioned, owner-RLS \`crm_salesbot_runs\` (flow revision, thread, current node, captured allowlisted state, wait/deadline, paused/human), append-only \`crm_salesbot_run_events\` (idempotency and transition outcome), with existing outbound transport for dispatch. New schema only after reviewing actual current tables, RLS and provider adapter design. No user-provided JavaScript, raw SQL, unrestricted webhook URL or dynamic access to private reports.
- **Privacy by design:** session-bound server owner authorization; encrypted business text/media; separately verified channel identity; purpose-limited opt-in, /stop and suppression; never send health/test scores/photos/reports to Telegram/WhatsApp/SMS/push/analytics, only neutral notice + protected link. No GA4/Meta privacy-hold bypass.

### Golden path for the first released workflow

Visitor chooses **free written review** or **€50/30 min / €100/60 min** personal service → Telegram bot or consented website enquiry → one verified business CRM lead/ref → minimal follow-up question + optional secure first-party attachment → owner sees a new message and can **pause bot / reply manually** → client receives an actual answer → optional booking **request**, not a confirmed slot → only provider-verified booking/payment later changes CRM and course access. **Click ≠ lead ≠ booking ≠ payment.**

## 4. Development phases with gates

### P0 — close existing real messenger E2E first (blocking proof, not blocking independent development)

- Verify one consenting external Telegram account: Start → permission → real inbound → CRM thread → owner opens Messages and sends neutral response → **recipient device confirms delivery** → STOP makes follow-ups impossible. Check outbox \`accepted\` vs \`delivered/read\` vs unknown/failed and crash/retry semantics.
- Read back owner and cross-owner RLS: wrong master cannot see another chat/photo/contact; master/private clinical profiles are not merged; iPhone Safari keyboard/media 320, 375, 390, 430; EN/RU/ES; support page/API failure states.
- Link consented website service-enquiry to that thread **only through verified same-person token**, not same display name / phone. Avoid asking again for previously captured goal/topic.
- Deliverable: reproducible redacted acceptance ledger in #985, no mock counts presented as delivery.

### P1 — smallest published, event-driven SalesBot runtime

- Reuse \`salesbot-flow\` and \`salesbot-store\`; add \`draft → approved_preview → published → paused\` with reviewed owner-only gate, immutable published revision, rollback and human takeover.
- Wire **one** consented \`@holistichouse_bot\` inbound event to a versioned graph run, with allowed \`say / choice / capture / branch / handoff / end\` steps; wait/resume/replay-safe idempotency; rate limits and deterministic delivery failures.
- Show human vs bot in existing thread, run state and last error in Automations; never silently message on old drafts. Migration additive, FORCE RLS and foreign-key ownership.
- Test harness: signed/unsigned webhook, duplicate update, button press, stale response, opt-out during wait, edited flow after publish, timeout, wrong owner, concurrent events, replay, media privacy; provider-free tests then limited physical Telegram pilot.
- Acceptance: owner publishes one graph, a consenting new chat really traverses one branch, CRM sees the same conversation, STOP blocks later dispatch and human takeover works.

### P2 — CRM actions, delayed follow-ups and operational controls

- Typed allowlisted action nodes to **upsert one CRM business contact, attach trusted service enquiry, update stage, create one follow-up, mark human assignment**, without creating clinical records.
- Durable scheduler for one-to-one consented follow-up (Toronto timezone, quiet hours, expiration, idempotency, STOP at actual dispatch time). Respect provider window/limits. No marketing sequence by default.
- Per-run step trail, queued/accepted/delivered/read/failed/unknown metrics, retry/dead-letter workflow and explicit manual reconciliation for ambiguous provider results.
- Acceptance: no duplicate lead/task after replay or parallel requests; run-to-CRM actions atomic; scheduled action skipped after opt-out; owner sees precise failure and can recover it.

### P3 — service and course lifecycle, then channels

- Booking request → actual available slot from connected authorized calendar → explicit confirmation from provider → CRM booking marker. Preserve reschedule/cancel and conflict handling.
- Existing approved provider receipt/manual reconciliation → trusted payment record → service or **My Courses** entitlement. Do not pretend personal PayPal/Wise equals a connected business payment processor; no new paid account without approval.
- Enable WhatsApp, FB/IG or web-chat **one provider at a time** after verified approved account, webhook signatures, opt-in, customer reply and receipts. Reuse one execution engine, channel-specific transport limits.
- Acceptance: two-account paid journey where actually supported; all unsupported steps clearly show "request/pending/manual"; never mark paid/booked from a button click.

### P4 — optional later features, not core dependency

- Approved segmented campaigns/newsletters, export/import, marketing audit and proof of separate opt-in / unsubscribe; require owner sign-off before any broadcast.
- Optional human-reviewed AI FAQ from public/approved knowledge, cost cap, prompt-injection/privacy tests and immediate human handoff. No automatic therapy assessment, diagnosis or sensitive data sent to an AI provider.
- Aggregated per-step performance and funnel analysis; respect \`PUBLIC_ANALYTICS_AVAILABLE=false\` until privacy approval.

## 5. Release/acceptance contract for each phase

1. **Source:** exact production branch/head, latest issues and active PRs, AGENTS/architecture, no duplicate module or pending overlapping diff.
2. **Security:** fail closed on auth, owner ID, consent/STOP, channel identity, wrong-master access, RLS + FORCE RLS, webhook signature, encrypted attachments. Redacted test data only.
3. **Engineering:** focused tests, full relevant CRM regressions, TypeScript, lint, production build, database migration and rollback checks if applicable. CI exact head reviewed; stale green checks do not count.
4. **Mobile/content:** Chromium and WebKit at 320–430px, screen reader/keyboard/focus, EN/RU/ES, client vs owner UI, loading/failure/retry screens.
5. **Delivery:** PR reviewed, safely merged only into actual \`codex/public-book-library\`; verify Vercel **READY + exact SHA + main alias**, then authorized two-person provider E2E and signed receipt. A screenshot, dry run, CI success, 200 response or Telegram "accepted" never completes delivery.
6. **Scope gates:** no mass mailing, paid API, billing mutations, secrets export or account changes absent explicit approval. Maintain #985/#2058/#990 as truth; don't close the issue until its real acceptance criteria pass.

## 6. Immediate next engineering slice

Start with **P0 actual Telegram receipt and P1 tiny versioned runtime**; P2 CRM business action nodes follows after this works. Do **not** start with campaigns, AI, payment widgets, non-verified Meta adapters or a new full-feature CRM. Historical EzoHata private SaleBot graph can be mapped to a clean-room behavior checklist **only if an authorized session is available**; never copy proprietary execution code, tokens, contacts or private chat history.

**Owner's unavoidable external acceptance:** one separate voluntary Telegram client account + owner signed-in Messages to validate incoming/receipt/STOP; later official OAuth/providers and any paid API/broadcast approval. Everything else is normal engineering/CI work.

---
**This document is a plan, not a release of the runtime or evidence that SaleBot.pro full parity is achieved.**