# Holistic House CRM 2.0 · functional reengineering and acceptance backlog
**Date:** 29 October 2026 (Toronto) · Production branch: `codex/public-book-library` · Owner tracking: [#985](https://github.com/andylitvinov-design/books/issues/985)

## Evidence and product boundaries
Do **not** build a second CRM. Existing: encrypted owner contacts, consent and STOP, Telegram Messenger intake, internal messages with photos/audio, owner and practitioner followups, lead guardian, SalesBot graph editor/drafts and private internal run engine, manual Business pipeline, service enquiries, Academy leads and separate billing/booking flows.

**Verified 29 Oct:** Production Vercel READY on `b01c5bc4` at audit time. Holistic House Supabase `shervdixkaxurnaecioe`: 1 CRM contact; 1 Telegram account/thread; 11 received + 1 accepted provider response; 1 SalesBot draft version 0; 0 SalesBot runs; 0 followups. Never infer verified delivery from provider `accepted`. A draft is not an active bot.

### CRM 2.0 increment 1 — universal manual deals
[PR #2533](https://github.com/andylitvinov-design/books/pull/2533) introduces `crm_opportunities` + `crm_opportunity_events` without touching clinical data or existing contact lifecycle. The **real** additive Supabase migration is `20261029172018_hh_crm_opportunities_v1.sql`; verified RLS/FORCE RLS, no anon/authenticated SELECT, no prefilled records. Signed POST-only cursor pagination; accurate all-deal stage counts; owner-only idempotent create, strict optimistic revision transitions and immutable owner/contact/service/operation ID. Every transition is explicitly **manual**; booking and payment still unverified. New mobile Deals tab and contact shortcut EN/RU/ES. PR QA/live must be verified separately, not inferred from migration.

## Release gates in strict order

### S0 — close actual integration blockers (P0, no new paid accounts)
1. Get CRM-focused CI + Next production build green on **exact** PR head. Check Vercel canonical alias READY exact merged SHA; signed-in owner iPhone/browser acceptance, second-user deny. Do not claim live for a merely merged PR.
2. Telegram: signed `/start` + narrow opt-in + V2 choices + optional portrait/drawing + secure questionnaire + owner manual reply + verified Bot API acceptance + STOP, including duplicate webhook and foreign account denial. One actual owner/second recipient test is required.
3. Retire *overlapping* Telegram handoff implementations: reconcile [#2173](https://github.com/andylitvinov-design/books/pull/2173), [#2206](https://github.com/andylitvinov-design/books/pull/2206), [#2188](https://github.com/andylitvinov-design/books/pull/2188). Pick one signed, expiring identity/continuation contract. Preserve original CRM contact/thread ID; NEVER fuzzy-merge by name/email/phone.
4. Owner-private Messages + assigned practitioner + third actor no-access, mobile WebKit/Chromium voice/photo send, read states and push (with opt-in). Proven two-account tests, not source-only mocks.

### S1 — SalesBot execution (P0)
Existing `salesbot-flow.mjs`, editor, encrypted approved snapshots and internal no-send runs stay canonical. Add **versioned, typed** `salesbot_events`, `salesbot_dispatch_outbox` + bounded queue and operator takeover. Signed verified provider inbound -> owner-scoped run row lock -> deterministic choice/branch -> human review or permitted send. Dispatch checks consent, STOP, business window, quiet hours, anti-repeat, budget gate and exact channel policy *again* immediately before send. Unknown delivery status enters reconciliation/dead-letter; NEVER blind retry. No JS/HTTP arbitrary nodes, clinical content or self-approval of marketing. Staged scope: `say`, `choice`, `offer`, `handoff` -> `create_followup`, `advance_opportunity` (with owner-scoped ID and audit). Owner opt-in per flow + channel, kill switch, real Telegram receipt gate, then later others.

### S2 — links, genuine booking and finance (P1)
- Add `crm_opportunity_links` with owner-scoped, verified association to *existing* service enquiries / Academy orders / remote support, not bulk import. Confirmation must be explicit and immutable; guest business contact is not authenticated Client Cabinet identity.
- Booking: source-of-truth appointment ID, timezone and provider, overlap exclusion/double-book denial, confirm/rebook/cancel status only on verified server transaction; never infer from manually selected `booked_manual`.
- Payment: `paid` from **signed provider receipt + trusted ledger**, not stage or user click. Refund/cancellation events separate, course entitlements only after verified payment. No financial fields or case notes in external chat payload.
- Link opportunity to an existing owner followup with explicit `opportunity_id` after composite FK and tested RLS; automate *internal tasks first*, outbound reminders later.

### S3 — fully integrated operations (P1/P2)
- Kanban of all opportunities, cursor-backed server search, full owner-scoped totals and saved filters, close reasons, reports of source and response SLA. Don't mistake loaded first 50/100 as all-time counts.
- Approved practitioner assignment per **request**, limited role grants/revocation and access audit; avoid universal shared `master` read role.
- WhatsApp [#2177](https://github.com/andylitvinov-design/books/pull/2177) and Instagram Direct [#2269](https://github.com/andylitvinov-design/books/pull/2269): official provider permissions, signed webhook, one owned test recipient, verify actual delivered status and costs BEFORE release. Integrations are not authorized by Instagram publishing, Telegram bot or Metricool alone.
- EN/RU/ES mobile single-screen Today: replies, overdue tasks, active deals, owner confirmed appointments, separated `accepted`/`delivered` messages.

### S4 — higher-level automation (P2/P3)
- Read-only true funnel conversion `lead -> qualified -> requested booking -> confirmed booking -> verified paid -> delivered`; no ad tracking of health, assessment or private content.
- Owner-approved FAQ helper only on public materials; clinical questions -> human operator. Short-lived context, redaction, no paid calls without budget authorization.
- Campaigns/segmentation **only** after valid purpose-specific opt-in, CASL/Meta rule review, STOP and complete suppression; default OFF. Zero additional paid API charges unless the owner approves separately.
- Enforce retention, export and deletion for business data independently from protected client clinical records; prove privacy erasure.

## Required acceptance
- Unit, owner-restricted database transaction, malicious cross-account/forged ID, concurrent idempotency, webhook replay and mobile visual tests for each module.
- Force RLS on new tables; restrict service_role and direct user grants. Run Supabase security advisers. No secrets in code, logs, issue texts or front-end.
- Each PR: minimal diff, exact-head checks/build, merge only when green; exact live deployment SHA + READY/alias + no runtime errors + rollback plan.
- Maintain one canonical CRM instead of parallel modules, one stable owner actor/account and explicit client identity linkage.

## Release scoreboard
| Milestone | Implementation | Production validation |
| --- | --- | --- |
| Existing contacts, opt-in, Messenger and lead tasks | Present in source | External physical E2E still required |
| Universal manual opportunities (PR #2533) | Code+database prepared | PR check/merge/live owner E2E pending |
| Universal verified booking and payment | Not yet integrated with opportunities | Blocked until truthful provider evidence |
| SalesBot automatic external answers | Preview + internal no-send execution only | OFF until owner-approved E2E/outbox |
| WhatsApp/Instagram Direct | Separate open PRs | Official credentials and actual E2E unverified |
| Multi-practitioner delegation and auto-dispatch | Partial master inbox | Exact per-request roles and physical E2E remain |
