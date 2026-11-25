# Holistic House — Revenue P0 implementation contract (v1 · 2026-10-25)

**Status:** technical execution plan + first CI contract fix in PR; **NOT** a completed sales/payment E2E.  
**Master commercial PRD:** [Strategy, benchmarking and FR-01–FR-20](https://docs.google.com/document/d/1lQ-ZqH7Y0mytbUg_bo-Bm9DpGE1_3_Z8H2Geqadg9Gk/edit) (owner Google Docs).  
**Canonical:** `andylitvinov-design/books`, deployed ref `codex/public-book-library`, domain `https://holistichouse.vercel.app`. Do not target the repository default branch. Do not create another CRM, form framework, payment ledger or client profile.

## Objective, measurable outcome, non-goals

Within the first 14-day commercial pilot, establish **at least one legitimately consented, provider-confirmed** path from public offer to real paid session; target **3–5 actual paid orders** as an experiment, not a forecast or assertion. Measure by source + actual provider receipts; never count CTA clicks, chat deep links, drafts or unconfirmed appointments as money. Existing agreed offers: **€50 / 30 min**, **€100 / 60 min**, **€200 / agreed monthly support period with 2 × 60 min** (the third offer is a separately agreed service, not a cart SKU or auto-renewing subscription). No invented prices, conversion statistics or clinical benefit claims.

**Not in P0:** onboarding more masters, recreating Academy, launching the paused 90-day Business & Career track (#1298), enabling paid AI/SMS/HeyGen, mass outbound contact, advertisement pixels/GA4 privacy hold, price/money changes or recurring subscription setup.

## Current implementation inventory (verify afresh each run)

| Owner | Source / route | Status / action |
| --- | --- | --- |
| Sales entry | `/{en,ru,es}/services`, `/services/alchemy-of-soul` | Existing public landings, service cards and approved €50/€100 CTAs. Preserve live content, photo and EN/RU/ES. |
| €200 offer | `/{locale}/services/personal-support` and client programme | Already delivered in #1720/#1728 and wording correction #1965; **real financial/customer E2E open** at #1716. Two 60-minute slots, no automatic renewal. |
| Capture | `components/compact-lead-capture.tsx`, `/api/service-enquiries` | Reuse, consent and server commit; #990. Review current actual paths/case before touching; phone-only coaching intake work is already in open PR #1996. |
| Messenger | `/api/app/practitioner-client-messages`, My Practice | Reuse account/request-scoped, encrypted conversation #985/#2009; signed-in two-account live E2E still unproven. |
| Square/PayPal | existing commerce modules + cart | #2024 guards stale Square paid UI when editing basket. A change in client state is not a real provider receipt. Merchant/price/RLS production acceptance remains gated. |
| Attribution | #988 and #990 | Consent-based, non-sensitive first-party source fields; no health/test scores in metrics or chat drafts. |
| Digital upsell | #1519 + current My Courses | P1 only after a real provider receipt/entitlement path and one reviewed mini-course. |

## FR-P0 — requirements and acceptance evidence

**P0-01 — Offer correctness.** A guest can open `/en`, `/ru`, `/es` services and Alchemy and see actual owner tariffs €50/30, €100/60, with €200/2×60 only on the monthly-support route. Mobile 320, 375, 390, 430px WebKit / Android Chromium: no horizontal overflow, button target ≥44px, visible focus and no duplicate forms. Prices must never be derived from URL query parameters.

**P0-02 — Short, consented enquiry.** Use one existing capture component and current endpoint. Validate contact and explicit one-off consent server-side, rate-limit and de-duplicate by operation ID; return `saved:true` + unique HH reference **only after durable DB transaction**. Errors/timeout/retry do not create a second CRM lead, falsely show “sent” or navigate to WhatsApp with private text.

**P0-03 — Lead routing and reply.** Existing CRM Contacts and private client profiles remain separate. Owner sees real persisted enquiry in My Practice; a client sees exact request status (“received”, not “booked”). Named/assigned master can read and reply to this request; unauthorized master, other client, anonymous visitor cannot. Verify actual two-account response→seen/readback, closed-status denial, AES-GCM and FORCE RLS. Neutral external notifications contain only secure deep links.

**P0-04 — Commercial state machine (logical contract, not new endpoint design).**
`enquiry_saved → qualified → time_agreed → payment_pending → payment_verified → service_in_progress → completed`. Cancellation/refund/decline are explicit audited branches. Only independent provider receipt or owner-verified documented receipt is allowed to transition to `payment_verified`; webhook/callback replays must not double-activate. Booking request, messenger click, checkout URL, build and HTTP 200 are **not** payment proof.

**P0-05 — Owner-agreed price, currency and terms.** Present EUR tariff; before funds, customer and owner agree actual provider/merchant, CAD/EUR charged total including applicable fees/taxes, cancellation, rescheduling, refund, and permitted scope for €200 message/report work. Until approved, use **Request / Enquire**, not **Paid / Confirmed / Unlimited support**. Do not enable merchant secrets or paid providers from this plan.

**P0-06 — Access after payment.** Only verified payment/account/request enables programme; exact 2 private one-hour slots, idempotent completion and remaining count. Private video/report belongs in access-controlled storage, never public YouTube. No subscription/renewal without a fresh client decision.

**P0-07 — Measurement.** Dashboard records separately anonymous landing (only if lawful and actually measurable), submitted/enquiry_saved, qualified, time_agreed, payment_verified, paid amount minus refunds and fees, and minutes spent. “Not measured” when absent. No PII or results in GA4/Meta/pixels, UTM, push or messenger payloads; keep `PUBLIC_ANALYTICS_AVAILABLE=false` until privacy gate separately approved.

## Execution order: 14 / 30 / 90 days

1. **Day 1–3:** reconcile existing PR #2024 (Square cart), #1996 (coaching short form), #985/#1716, approvals/merchant barriers. Repair proven regression in existing tests: `tests/direction-offers.test.mjs` expected obsolete `coaching` bottom tab, while approved `lib/site-navigation-model.js` uses `alchemy`; guard EN/RU/ES exact route `/{locale}/services/alchemy-of-soul`. Restore the focused public-services CI so it no longer blocks unrelated checkout work.
2. **Day 4–7:** real `CompactLeadCapture → /api/service-enquiries → DB → CRM` with safe consented accounts; fix one confirmed break in place, not generic redesign. Preserve free alternatives on landings.
3. **Day 8–14:** one opt-in real customer/provider transaction, owner receipt and session readback; only then attempt small organic pilot. Goal 3–5 *verified* orders, or document no orders and feedback.
4. **Day 15–30:** compare direct €100 vs voluntary free-review paths with actual data, measure net €/labour hour and lead follow-up, reduce abandoned enquiries.
5. **Day 31–90:** if P0 verified, select ONE short digital course on the existing course engine with licensed content, preview and verified payment→entitlement→lesson progress. Only after that consider retention / Today / media catalog upgrades; do not unpause #1298 silently.

## Mandatory validation and release gates

- **Source gate:** inspect `AGENTS.md` if present at each changed path; scan recently changed PRs, deployment SHA, exact branch and conflicts. Update an in-scope existing PR rather than cloning work.
- **Code gate:** focused Node tests, typecheck, ESLint, Next production build, SQL migration provenance/versions, FORCE RLS, idempotency and retry rules. A known unrelated failing suite stays clearly **red**; never claim overall green.
- **UI gate:** EN/RU/ES 320/375/390/430px WebKit and Android; real click and form failure paths. An HTTP 200 alone is insufficient.
- **Account gate:** distinct client A + assigned master B + unauthorized C, unread/seen, retry, no cross-account data access. No fake production accounts or personal records.
- **Payment gate:** merchant eligibility + approved currency/terms; actual independently verified receipt and correct entitlement, separate from request or redirect. Sandbox/mocks are NOT live payments.
- **Delivery gate:** PR diff/CI, safe merge SHA in `codex/public-book-library`; Vercel production **READY + git SHA + exact alias `holistichouse.vercel.app`**; runtime and relevant public/live checks. Update relevant existing issue with evidence and blockers. No empty redeploys.

## Current external blockers (not code failures)

The owner must agree (1) written boundaries/response time/refunds of €200 support, (2) lawful merchant and actual amount/currency to be charged, (3) one independent consented two-account/paid E2E. Until then the business funnel **cannot** be labelled fully operational. No paid APIs, secret rotation, provider billing, audience messages or publication without separate approval.

**Track work at:** [#990](https://github.com/andylitvinov-design/books/issues/990) / [#1716](https://github.com/andylitvinov-design/books/issues/1716) / [#985](https://github.com/andylitvinov-design/books/issues/985) / [#988](https://github.com/andylitvinov-design/books/issues/988) / [#1519](https://github.com/andylitvinov-design/books/issues/1519). Hourly implementation automation references the master Google Doc and these existing owners; this file is its reviewable P0 test contract.
