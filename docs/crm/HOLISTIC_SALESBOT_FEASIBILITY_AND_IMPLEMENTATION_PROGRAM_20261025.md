# Holistic SalesBot — feasibility, ethical reverse engineering and implementation program
**2026-10-25 · Product/Engineering SPEC v1.0 · STATUS: PROPOSAL ONLY / NO AUTOMATED CUSTOMER SENDING**

**Product:** Holistic House (https://holistichouse.vercel.app)
**Repo:** andylitvinov-design/books; production branch must be checked before implementation: codex/public-book-library (NOT the default codex/bootstrap-books).
**Related work:** [CRM / omnichannel #985](https://github.com/andylitvinov-design/books/issues/985) · [Conversational product advisor #1519](https://github.com/andylitvinov-design/books/issues/1519) · [Lead / conversion #990](https://github.com/andylitvinov-design/books/issues/990) · [Notifications #1302](https://github.com/andylitvinov-design/books/issues/1302) · [Attribution #988](https://github.com/andylitvinov-design/books/issues/988).

> Decision: **FEASIBLE, with external provider and owner-approval gates.** Extend the existing CRM and conversational helper. Do not create a second contact database, messenger inbox, course platform, payment ledger, or data collection mechanism. This document does NOT authorize new paid AI APIs, mass messages, automatic outreach, payment activation, or production release.

## 1. Which "Salesbot" and what parity means

"Salesbot" is an ambiguous market name. Three official products were benchmarked by publicly available documentation:
1. **amoCRM Salesbot:** visual flow editor; trigger on new chat/deal stage, send message/buttons, wait for reply, conditions, validation, lead/status actions, webhook, error handler, script JSON. https://www.amocrm.ru/developers/content/digital_pipeline/salesbot and https://www.amocrm.ru/support/digitalpipeline/salesbot.
2. **SalesBot AI (salesbot.me):** agent answers FAQs from an approved knowledge base, qualifies visitors, follows up, hands off to a human, supports Telegram/WhatsApp/Instagram/website chat, CRM/API/calendar integrations. https://salesbot.me/ru/.
3. **SalesBot (salesbot.tech):** additional voice agent/SIP calls, campaign controls and conversation analytics; postpone voice until independently approved. https://salesbot.tech/help/get-started/overview/.

**Scope chosen:** parity with the *useful user-visible capabilities* of (1)+(2), not a pixel-level clone. Voice and SaaS for outside businesses are optional later tracks. No guarantee of matching undocumented product behaviors.

### Functional matrix

| Capability | Existing HH baseline / verified source | Target | Phase |
|---|---|---|---|
| Owner CRM contacts, stages, consent, follow-ups | CRM #985; lib/crm/repository.js, consent.js; already implemented | Reuse; no new CRM | Existing |
| Omnichannel inbox, encrypted thread, external adapters | CRM #985; lib/crm/messenger-policy.js; provider channels gated | Confirm real delivery independently | Gate E |
| Home conversational helper | #1519; lib/home-conversation.mjs uses local rules, not LLM | Reuse offer registry and flows | A |
| Site chat / guided lead intake | Rule-based home helper, enquiry endpoints already exist | Opt-in widget, on-site conversation with short qualification | A |
| Flow triggers, branch, wait, action, error | No full confirmed versioned workflow engine | Deterministic engine, replay and test mode | B |
| Visual builder and templates | No confirmed published workflow designer | React Flow node editor | C |
| Knowledge base FAQ and generative response | Local rules, no approved external AI provider | Owner-approved nonclinical RAG, human handoff | D |
| Telegram bot | Policy + pilot code but unverified real provider delivery #985 | Official one-to-one opt-in pilot | E1 |
| WhatsApp / Instagram / Messenger | Provider scaffolding gated OFF #985 | Official API & approved application; consent/templates | E2 |
| Follow-up and reminders | CRM manual follow-ups; notification spec #1302 | Authorized, timed, budget-limited dispatch | E |
| Calendar booking | Site services / availability not proven as booked | Availability query, explicit reservation confirmation | F |
| Square/PayPal purchases and course unlock | Independent monetization track; E2E not presumed | Verified provider payment -> entitlement | F |
| Performance analytics | Manual CRM/events; GA4 and Meta privacy hold | First-party, privacy-safe stage counters | B |
| Multi-practitioner SaaS | Master Network exists | tenant/practitioner isolation, limits, plans | G |
| Voice agent and outbound calls | Not in MVP | SIP/telephony, consent, cost and legal gates | G |

## 2. Reverse engineering: permitted research plan (clean-room)

**Allowed:** public vendor docs, pricing and feature catalogs; authorized demo/trial of one's own account; manual observation of UX; flow diagrams, own test conversations, latency/error observations using synthetic data; accessible UI and public network/API documentation; open-source code within its published license.

**Do not:** copy branding/text/images/source/design assets; decompile binaries, scrape private accounts, bypass login/rate limits/paywalls/CAPTCHA or anti-bot systems; intercept other users' traffic; recover secrets; use competitor customer datasets; clone proprietary SDK protocols; automate WhatsApp Web or Telegram user accounts for unsolicited campaigns. Legal/licensing review is required for any uncertain technique.

**Clean-room procedure:**
1. Build a benchmark rubric: connect channel, greet, FAQ, collect contact by opt-in, qualify intent, fail/timeout/retry, pause to human, create lead, schedule follow-up, unsubscribe, book, pay. For each: expected UX, screenshots of own test account where permitted, limitations and pricing.
2. Run 20 synthetic scenarios in vendor trial only if authorized (no personal/health details and no paid calls without consent).
3. Product analyst records *requirements/behavior*, NOT source code or proprietary UI assets.
4. Implementation team creates independent state-machine and UI using only the requirements, documented official APIs and licensed libraries.
5. Verify parity by behavior and accessibility; maintain origin/licence and security evidence.

**Reusable components and restrictions:**
- React Flow / xyflow MIT for node-and-edge builder: https://xyflow.com/open-source.
- Optional Chatwoot Community MIT as a reference/adapter only, **not** a reason to replace HH's existing inbox: https://github.com/chatwoot/chatwoot/blob/develop/LICENSE.
- n8n license is NOT permissive for a commercial embedded or white-label workflow SaaS without a separate agreement; avoid shipping n8n UI/engine as HH feature: https://github.com/n8n-io/n8n-docs/blob/main/docs/n8n-community-license/README.md.
- Use public, documented Telegram Bot API and official WhatsApp/Meta interfaces only.

## 3. UX: Holistic SalesBot in My Practice (EN primary; RU/ES mirrors)

Desktop: **My Practice → CRM → Automations** with tabs **Overview / Flows / Templates / Test chat / Runs / Settings**.
- Overview: active/draft workflows, verified channels (not guessed from env alone), runs today, pending owner approvals, errors, confirmed leads, human handoffs and verified bookings/payments only.
- Flows: compact cards with description, triggers, last published version, status (Draft/Test/Approved/Paused), owner and errors. Duplicate *a draft only* from a vetted template, not duplicate CRM contacts.
- Editor: left categorized nodes, centered graph with zoom/fit, right settings/validation and EN/RU/ES previews. Mobile 320–430px: step-list editor, no requirement to drag a graph on a phone.
- Node palette:
  - **Start:** new on-site message; user-submitted enquiry; verified inbound provider message; consented report-ready; verified payment event; owner manual trigger.
  - **Logic:** choose topic/intent, consent guard, channel eligibility, time window, conditions, language, prior stage, dedupe, limit.
  - **Interaction:** show text/buttons; request clarification; wait for answer; send internal note; human takeover.
  - **Action:** create/update *existing* lead, add owner task, offer matching catalog item, request scheduling, create draft message, stop, audit event.
  - **Safety:** timeout, provider error, STOP/unsubscribe, sensitive content branch, budget exhausted, manual approval.
  - **Later only:** approved AI FAQ, provider dispatch, approved calendar booking and payment-link creation.
- Publish requires dry-run validation and explicit owner permission. A published version is immutable; edits create new draft; pause/rollback affects **new executions**, with defined handling for existing waits.
- Every customer-facing outgoing action shows channel, consent purpose, real recipient verification, provider requirements and expected spend. Default **Draft only**. A manual handoff has priority over bot continuation.

## 4. Target architecture (reuse instead of duplicate)

```text
Public guided chat / existing enquiry form / verified official channel webhook
  -> existing auth, consent, channel identity & admission policy
  -> event normalizer (event_id, tenant_owner_id, actor, purpose, source)
  -> idempotent durable event/outbox (Postgres/Supabase, owner scoped)
  -> allowlisted workflow interpreter (published version of JSON graph)
  -> eligibility check at EXECUTION TIME (not only at enrollment)
  -> existing CRM contact / enquiry / human task / on-site reply
  -> OPTIONAL approved official provider dispatch
  -> provider webhook receipt -> delivered/failed/blocked in audit
  -> verified booking and payment confirmation via separate existing services
```

### Source-of-truth and minimal proposed schema (audit migrations before actual DDL)

Prefer extend existing scoped CRM tables. **Do not pre-create duplicate contact/thread/provider/consent tables.** Candidate NEW tables or equivalent existing models after migration audit:
- workflow_definitions: id, owner_id, name, purpose, status, locale, created_at.
- workflow_versions: id, definition_id, version, immutable validated JSON graph, checksum, approved_by, approved_at, generated_at.
- workflow_runs: id, owner_id, definition/version, subject_type/id, triggering_event_id, state, started_at, terminal_reason; unique owner+version+event+subject.
- workflow_steps: run_id, node_id, attempt, op_key, status, result_code, started_at, completed_at; unique run+node+op_key.
- workflow_waits: run_id, resume_key, due_at, resume_kind, status; no raw PII in keys.
- workflow_outbox: run_id, operation_id, channel, recipient_ref (verified ID only), purpose, payload_reference, status, provider_id, attempt, next_attempt_at; prevent duplicates.
- workflow_audit: owner_id, run_id, actor, event_type, policy_decision, redacted metadata, occurred_at.

**Authorizations:** All private data keyed by authenticated owner/tenant and exact verified subject; server-side access with least privilege; RLS=ON+FORCE and negative tests. Master must never see another master's flows/leads; public visitor cannot call management endpoints. Keep private client reports, check-in scores, diagnosis, medications and messages out of bot prompts, analytics, webhooks and notifications. CRM contacts and clinical Client Cabinet profiles must never be matched by name/phone alone.

**Execution:** typed, schema-validated nodes/edges; fixed allowlisted operations and no arbitrary JavaScript, SQL, shell or untrusted HTTP in user-authored flows. Cycle detection, maximum steps/depth, bounded waits, dry-run simulator. Database transactions + unique operation IDs + inbox/outbox so retries cannot double-send. Recheck revocation, STOP, provider 24-hour window, budget and suppression **immediately before dispatch**; revocation cancels pending sends. Webhook signature/secret validation and deduplication.

**Queue:** first audit currently installed cron/outbox processing; reuse if safe. For future scale assess Supabase PGMQ/pg_cron, but do not add paid services or scheduled high-frequency polling by default. Handle timeouts, bounded retry/backoff, dead letters, trace correlation, priority manual takeover, retention and verified rollback.

### AI (OFF by default)

Rule-based FAQ/offer registry in first releases. AI only after a separate privacy, provider, budget and data-handling review, user opt-in where personal questions are transferred. Retrieve only owner-approved public product knowledge (title, verified price, conditions, availability policy, locale, approved FAQs). AI suggests allowlisted offer IDs; server controls URLs, prices, status, booking and lead creation. It must not invent deals, claim diagnosis or personal therapy, initiate outbound campaigns, disclose report contents, or claim payment succeeded. Low confidence/sensitive requests -> human or safe answer. Guard prompt injection, extraction, cross-tenant leakage, token cap and cost per conversation.

## 5. Canonical customer journey

1. Visitor sees a concise service benefit and opens **Talk to Holistic House** on landing, no popup hijacking; can leave without creating account/CRM contact. Chat is anonymous and transient unless customer explicitly submits details.
2. Bot asks up to two relevant clarifying questions and offers two or three actual existing options: suitable self-service/free tool, eligible course, or optional €50/30-min and €100/60-min Andrey session; do not invent other practitioners' tariffs.
3. User presses **Request this service**, chooses communication method and explicitly consents. Only a server-accepted submission can create/dedupe a CRM lead; auto navigation/click/chat message DOES NOT count as lead.
4. Existing CRM receives link to exact enquiry, non-sensitive source/referrer, channel consent, assigned owner and task. Owner can take over at any point, with bot paused.
5. Optional scheduling proposes only actually free slots; booking status becomes **confirmed** only on authoritative provider/calendar commit.
6. Any outbound reminder only to verified/consenting recipient through an allowed channel, with neutral content and immediately usable STOP. A blocked/failed attempt never becomes delivery.
7. Order created / checkout presented is not a payment. Only signed provider confirmation and idempotent server write make the order paid and unlock existing My Courses / dashboard.
8. First-party aggregated KPI: visitors -> submitted leads -> qualified -> actually confirmed bookings -> actually settled payments, with privacy-preserving attribution.

**Sample template:** Free situation review -> choice: situation vs resources/health-related question (no automated medical advice) -> approved offer -> user-confirmed callback request -> one CRM contact and owner task -> manual reply/draft -> explicit booked/paid confirmation. A declined invitation or lost consent ends automation.

## 6. External channel and legal release gates

- Telegram: dedicated approved business bot, user clicks /start, verify webhook secret and chat identity, support /stop and block, confirm REAL two-way provider receipt on consented test account. Do not reuse other products' bots.
- WhatsApp Cloud API: official Meta business assets and permission; customer-initiated 24-hour service window, template-only business-initiated messages outside it, approved template and cost guard. Meta messaging policy: https://whatsappbusiness.com/policy/ . **As of 2026, provider pricing varies/changes; no assumed free sends.**
- Instagram/Facebook: official connected Page/Business account, permission/app review and platform timing/policy gate. No private scraping or personal-account login bots.
- Canada CASL: commercial electronic messages require valid consent or documented statutory exception, sender identification and unsubscribe. Maintain evidence and prompt STOP: https://crtc.gc.ca/eng/com500/faq500.htm . PIPEDA meaningful consent and sensitivity controls: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/ .
- Health/private material: no results, symptoms, reports, medication lists or free-text health questions in Telegram/WhatsApp/SMS/push/third-party pixels. Use neutral notice + authenticated cabinet link.
- No mass outreach, third-party list enrichment, cold WhatsApp/Instagram DMs, ads activation, or chargeable AI/voice until explicit, narrowly-scoped owner approval. For sales follow-up do not reuse service-reply consent as marketing opt-in.
- Do not claim *sent* on queue insert, *delivered* on provider request, *lead* on click, *booked* on slot suggestion or *paid* on redirect.

## 7. Releases and objective gates (independent of dates)

**R0 — evidence and mapping (no code side-effects)**
- [ ] 20-scenario competitor benchmark; product/legal/license notes and parity map.
- [ ] Reconcile #985, #1519, #990, #1302 current code/DB/migrations/current production branch.
- [ ] Lock initial 3 non-clinical funnels and approved public offer registry, owner/tenant permissions, retention.

**R1 — deterministic on-site SalesBot MVP (zero new paid APIs)**
- [ ] Reuse HomeConversationGuide / existing offer registry / enquiry+CRM, add embedded on-site conversational intake; no duplicate widget/form.
- [ ] Persist only submitted consented leads; explicit source and purpose; human handoff; duplicate suppression.
- [ ] Display truthful lead/send/booking/payment statuses; EN/RU/ES, compact mobile 320/390/430.

**R2 — workflow engine and dry-run editor**
- [ ] Schema reviewed and migrations with rollback; event normalizer, immutable versioned JSON, allowlisted interpreter.
- [ ] Seed vetted templates: New enquiry, FAQ/qualification, unresponsive lead manual-task, follow-up after opt-in, service request handoff.
- [ ] Graph designer React Flow + mobile step-list + audit/log/replay, disabled sending by default.
- [ ] Unit/property tests for every node; max step/time, cycles, error, idempotency, STOP, rollback.

**R3 — external channel pilot**
- [ ] Verified Telegram in/out through official provider on owner's opted-in test chat, E2E evidence; no silent pilot-to-public promotion.
- [ ] Only then separate WhatsApp/Meta official business/identity/template/budget E2E gates; provider dashboards and webhook receipts.
- [ ] Real user opt-in and withdrawal management by purpose/channel.

**R4 — AI advisor and commercial completion**
- [ ] Explicit budget and provider/privacy approval, approved knowledge base, safe human escalation; tested conversation quality.
- [ ] Calendar only with actual availability and authoritative booking acknowledgement.
- [ ] Square/PayPal or other lawful provider only when checkout, signature, paid/refund/reversal, RLS entitlement and full E2E pass (#990).
- [ ] Only validated paid funnel metrics; first-party privacy-safe analytics; GA4/Meta privacy hold stays until separately lifted.

**R5 — multi-tenant SaaS / voice optional**
- [ ] Practitioner billing/limits and tenant RLS, template sharing without data sharing, secure per-tenant provider identities and budgets.
- [ ] Voice only after phone provider/consent, call recording/retention, regional privacy/legal and real cost approval.

## 8. Acceptance & adversarial QA matrix

Automated and manual evidence for each release:
1. Duplicate webhook or retry -> exactly one run/lead/dispatch; no double charge.
2. Anonymous text -> zero CRM lead until user confirms submission; abandoned chats not exported.
3. Two unrelated masters -> strict 403/404 RLS and no shared knowledge/phone/contacts/runs.
4. Withdrawn consent, /stop, blocked destination, marketing purpose without opt-in -> no send even if job queued.
5. WhatsApp 24-hour expiry, missing template or budget=0 -> blocked and visible reason.
6. Wrong provider signature, replay, out-of-order receipts -> safe reject/idempotent status progression.
7. Manual handoff while timer pending -> bot never overwrites human reply or resumes unauthorized.
8. Sensitive/free-text medical or self-harm topics -> safe response, no sales automation or third-party payload.
9. Graph errors (loop, unknown node, bad transition, missing locale) -> publish rejected.
10. Dry-run preview and a live template version remain separate; editing a draft cannot alter running version.
11. Browser E2E on 320/390/430px, WebKit/Safari and Chromium, keyboard/VoiceOver, EN/RU/ES copy.
12. Verified external delivery, real calendar booking and provider-confirmed payment separately recorded; HTTP 200/mocks/build alone are NOT proof.
13. Existing CRM, My Courses, free tests, practice, payments and notification routes regressions covered.

**Evidence for each PR:** tests/typecheck/lint/build; migration/RLS proof if schema changes; PR/commit link; final production branch SHA; Vercel READY + canonical alias; read-only logs; provider evidence for channels; truthful FAIL/BLOCKED for owner-only, paid and physical-device checks. Rollback is feature-flag/paused workflow first, versioned code revert second. Changes should be small and reversible.

## 9. Technical conclusion and next actions

- Functional **equivalence is achievable**; copied proprietary code is unnecessary.
- Favor a first-party deterministic engine on current Next.js 15/React 19/Supabase stack, with React Flow MIT only for the editor.
- Avoid installing n8n as embedded SaaS without written commercial license.
- Priority is **real consented lead -> owner's CRM -> human action**, followed by official-channel E2E; AI, external follow-ups, booking/payment and SaaS come only after separate gates.
- Product owner actions when needed: (1) approve an actual Telegram test bot and opted-in personal test chat; (2) supply/approve Meta WhatsApp business assets and budget if wanted; (3) approve AI provider/budget and payment provider separately. No such approvals are inferred from this specification.

**Snapshot only (not a SalesBot release):** On 2026-10-25 Vercel production project super10/codex-public-book-library returned READY deployment dpl_9UnhWNs5h3qbf55zVx7wRAS2Morq, SHA 9a22b2f057c8ad53ef8fbf1033398878ec6bb676 and canonical alias holistichouse.vercel.app. Re-check before any later deployment; this spec-only PR does not modify the live application.
