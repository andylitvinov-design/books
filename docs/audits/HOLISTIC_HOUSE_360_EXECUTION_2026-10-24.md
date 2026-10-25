# Holistic House 360 execution ledger

Goal: deliver verified production corrections from `HOLISTIC_HOUSE_360_AUDIT_2026-10-24.md`, TOP-20 and E2E matrix. User authorized implementation, small PRs, safe green merges and live readback; no paid APIs, bulk messages or real payment.

## Baseline and scope contract

Verified 2026-10-25 UTC: GitHub production ref `codex/public-book-library` and Vercel canonical `https://holistichouse.vercel.app` both point to `d7aa83c2bf2304fd953d47788523984a48ddd29b`. Deployment `dpl_8moe5c2cXvPEaTQu9N8PZVN5HqJv`, READY, production, project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, team super10. Default GitHub branch and the dirty local main checkout are not production. The local `.vercel` link points to another project; never deploy using it. Isolated clone used, original work preserved. No production commits since audit at initial reconciliation.

Included now: A–E, then S1–S6. Keep CI, session security, privacy and sales changes in separate PRs. Reuse #1919; do not create a second notification subsystem. Reuse encrypted prescription session storage, current app auth, account/RLS checks, CRM and commerce ledgers. No credential/config changes, production schema pushes, real payments, unrelated course changes or provider purchases. External delivery requires provider acceptance AND intended recipient receipt; unit/mock/preview evidence stays separate. High-risk session change requires expiry, revoke, owner/role/session-loss negatives and independent review before release.

## Task manifest / source reconciliation

| ID | Requirement / audit source | Existing issue / PR / module | Status | Acceptance / evidence |
|---|---|---|---|---|
| PREP | Full audit, TOP-20, E2E; baseline and duplicate check | Audit sections 0–P; this ledger | IN_PROGRESS | Baseline above; reconcile issue states and relevant changed files before each PR |
| A | Server admin expiry/revoke/owner binding, F01 / TOP1 | #55; prescriptions/admin-session.js, admin.js, app API bridge | IN_PROGRESS | Random per-session bearer, server deadline, independent revoke/logout, current verified owner and active auth session; page/API negatives; no static-cookie fallback |
| B | Saved request → master alert + CRM, F04 / TOP2 | #1919 OPEN d3204b89; #980/#985/#1302; existing repository/dispatch | IN_PROGRESS | Review existing diff, commit-before-alert, idempotency, assigned owner, neutral payload, visible failure; hosted/provider receipt separate |
| C | Restore two workflows, F02 / TOP3 | #1419 OPEN; existing workflow-next-route-filters.test.mjs | IN_PROGRESS | GitHub run 40152701062 has jobs=[]; expand existing escaped-route contract; preserve jobs/checks and verify jobs actually run |
| D | Private materials stay in cabinet, F03 / TOP4 | #990/#1050; free-entry-landing, free-drawing-intake, consultation-choice-capture | PENDING | EN/RU/ES neutral messenger copy; no answers/drawing/deep-link export; authorized existing private intake |
| E | Commercial transition matrix, F05–06 / TOP5–6 | #990/#988/#1050/#1380; CRM/commerce ledgers | PENDING | Each transition PASS/FAIL/BLOCKED with timestamp, environment and evidence; no mock-as-delivery or payment without permission |
| S1 | Request status + reply expectation / TOP6 | #990; existing enquiry capture/status UI | PENDING | Persisted reference and status; truthful response window from confirmed policy, no invented SLA |
| S2 | Currency, cancellation/refund clarity, F14 / TOP9 | #1716/#990; support, cart, Terms | PENDING | Existing confirmed policy before payment; any unconfirmed policy blocks payment/claims, no invented legal promise |
| S3 | Stable main offer and CTA, F11 / TOP7 | #990; HomeSectionCarousel | PENDING | Stable first choice, keyboard/touch/reduced-motion; EN/RU/ES, 320/375/390/430px |
| S4 | Compact 30/60min selector before catalogue, F12 / TOP8 | #990; Services existing selector | PENDING | Move existing section, no duplicate UI/state; mobile and cart SKU/amount checks |
| S5 | Remove duplicate forms | #990; existing consultation/contact capture | PENDING | Trace forms first; consolidate repeated capture without breaking receipts or consent |
| S6 | €200 scope/economics, F13 / TOP10 | #1716 OPEN; personal-support | PENDING | 2×€100=€200 before extra work; confirmed workload limits; time diary/net receipts unknown until recorded |
| F07 | Migration uniqueness / TOP19 | #1109 | DEFERRED | Reconcile file/hash/applied ledger; no blind rename or production db push |
| F08 | Optional Osiris reflection / TOP12 | Existing Egyptian learner | DEFERRED | Empty/skip/back runtime acceptance |
| F09 | Course saving disclosure / TOP14 | Existing learner/academy progress | DEFERRED | Preserve browser-only privacy; account persistence only with consent |
| F10 | Language contract / TOP13 | Academy cards/course landing | DEFERRED | Show actual EN/RU/ES content/audio language before start |
| F12 | Broader IA / TOP17 | #1896 OPEN, #990 | DEFERRED | Preserve routes/progress, moderated user comprehension |
| F15 | Exact-edition review / TOP15 | #1223/#626/#342 | BLOCKED | Qualified reviewer and rights evidence; do not relabel validity |
| F16 | Archival claims caveat / TOP16 | Existing source-preservation workflow | DEFERRED | Inline context, preserve originals; professional review separate |
| F17 | Video publication / TOP17 | #1898 OPEN | DEFERRED | Review existing PR, no duplicate publisher or live test publication |
| F18 | CRM pagination / TOP18 | CRM V6 / #1050 | DEFERRED | 300 synthetic records, cursor, stable ordering, owner isolation |
| F19 | Digest fairness | Existing scheduler/claims | DEFERRED | 25 synthetic masters / bounded batches; no real bulk send |
| F20 | Portrait and LCP / TOP11 | #1917 OPEN / #846 | DEFERRED | Reuse existing PR, exact served SHA and comparable lab runs |
| F21 | Password protection | Supabase Auth | BLOCKED | Confirm password use/plan; no paid setting change |
| PILOT | Learning/value pilot / TOP20 | #1223, existing OPORA roadmaps | BLOCKED | Consented participants and operational data, no fabricated outcomes |

## Execution steps and release gates

For each bounded code task: (1) reproduce failure on pinned baseline; (2) add the regression to the existing relevant suite and observe failure; (3) minimal change to the existing module; (4) focused tests, ESLint, TypeScript and build; (5) spec then quality review and repair, maximum four iterations before reassessing; (6) small PR against freshly resolved production ref; (7) inspect all CI, fix failures without loosening tests; (8) merge only when relevant gates pass; (9) confirm Vercel READY and deployed SHA, canonical URL and actual scenario. Mark code, CI, merge, deployment and live acceptance separately.

A: modify `lib/prescriptions/admin-session.js`, `lib/prescriptions/admin.js`, `app/api/app/[...path]/route.js`; test session lifecycle against existing memory/KV storage, then current login/bridge/admin suites. Reject old deterministic cookies. Recheck current Supabase identity and repository owner/session on every protected request. Logout revokes server record before clearing cookies.

C: update the two existing workflow files and `tests/workflow-next-route-filters.test.mjs`; escape literal Next brackets in path filters only, retain test/lint/typecheck/build/HTTP steps. Confirm GitHub parser annotations and new nonempty jobs, not merely local YAML parsing.

B: inspect #1919 diff and failures before any rewrite; reuse its commit/dedup/neutral dispatch. Confirm production environment variable presence without exposing values. No transactional email enablement or provider configuration without owner prerequisites.

D: existing copy and intake routes only; test absence of private-material transport and authenticated account ownership. Preserve contact-only channel choice; no private answers in URLs/clipboard/provider payloads.

## Commercial E2E evidence matrix

PASS applies only to the named environment/segment. Local synthetic tests never establish real delivery or payment.

| Transition | Status | Evidence / remaining gate |
|---|---|---|
| Visitor → form | PENDING | Recheck canonical EN/RU/ES and mobile |
| Form → DB request | BLOCKED | Need approved synthetic identity/contact and committed request receipt; existing source tests separate |
| DB request → CRM | BLOCKED | Readback same request/CRM reference and correct owner without reading unrelated clients |
| CRM/request → master notification | FAIL / BLOCKED delivery | Initial event missing on production; #1919 pending, provider+recipient receipt absent |
| Master → proposed agreement | BLOCKED | Two controlled identities and saved revision |
| Agreement → client message | BLOCKED | Neutral real provider acceptance + client receipt; cabinet authorization |
| Client → confirmed order | BLOCKED | Both parties accept same time/format/price/currency |
| Order → verified payment | BLOCKED | Automatic provider unavailable at audit; no real payment authorized |
| Verified payment → service/access | BLOCKED | Independent receipt/order linkage and actual fulfilment, no fabricated completion |

## Stage reports

No production correction claimed yet. Every completed stage records PR/head/merge SHA, CI URLs/results, deployment id/SHA and exact canonical routes, real E2E, unknowns, and next three useful actions. Provider/owner blockers do not stop independent implementation.
