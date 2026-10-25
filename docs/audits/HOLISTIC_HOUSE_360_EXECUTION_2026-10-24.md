# Holistic House 360 — execution and evidence ledger

Updated 2026-10-25 UTC. Current state, not another audit. Full source audit, TOP-20 and E2E matrix were read before implementation: local `docs/audits/HOLISTIC_HOUSE_360_AUDIT_2026-10-24.md`, SHA-256 9d1ae419b06b6c744cbbd73bc5395c970570ef1bff2504043c268972d43ba60f. The original audit remains untracked in the owner checkout and was not silently published.

## Release state and source

Actual repository `andylitvinov-design/books`, production branch `codex/public-book-library`, [canonical production](https://holistichouse.vercel.app), Vercel project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, team `super10`. Default branch and original local `.vercel` link are not authoritative. Original dirty work preserved; no production DB migration, credential change, paid API, bulk send, synthetic production lead or real payment performed by this delivery.

Audit baseline: `d7aa83c2bf2304fd953d47788523984a48ddd29b`, READY `dpl_8moe5c2cXvPEaTQu9N8PZVN5HqJv`. Latest pinned application readback: **579ad0ba0ff4eff102cb4dde2c86874e1edeea9e**, **READY dpl_2td6c76p9oaNDetQtxinQorUwLd5**, [immutable URL](https://codex-public-book-library-app7q8m5v-super10.vercel.app); canonical alias matched before and after the bounded15:44UTC acceptance batch. [Latest subsequent deployment checkpoint](https://github.com/andylitvinov-design/books/issues/990#issuecomment-6398322260). Concurrent production changes were preserved through normal merges, not reset.

**A–D and bounded sales corrections are released. Commercial E2E remains BLOCKED. Both additional UI corrections are DEPLOYED after exact-head CI and hosted acceptance. All independent included code work is released; owner/provider business acceptance remains BLOCKED.**

## Requirements, reuse and verification

| ID / existing owner | Correction and status | PR / merge SHA | Relevant evidence |
|---|---|---|---|
| PREP / audit, existing plan | DONE: full audit/TOP-20/E2E, live branch/SHA/deployment, existing issue/PR and later-change reconciliation; one ledger | [#1928](https://github.com/andylitvinov-design/books/pull/1928) | Re-resolve production before each merge; distinguish code, CI, deployment and receipt |
| A / #55, prescription storage + current app auth | DEPLOYED: random persisted v2 admin tokens, fixed12h server expiry, independent logout revocation, owner/account/current auth-session checks, credential-rotation invalidation, legacy-cookie rejection; recorder recovery cannot renew expiry; SSR refresh propagates existing auth cookies without extending admin lifetime | [#1934](https://github.com/andylitvinov-design/books/pull/1934), `7a5c22f54a33a52e69b9aa04c318eade5d807255` | 60auth+58middleware/CSP+106media tests; lint/typecheck/two local builds; independent spec/security review; [exact-head build CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40196167553/job/121177342345) |
| B / #980/#985/#1302, EXISTING request/CRM/dispatcher | DEPLOYED CODE: request and neutral inbox event committed atomically; inbox failure rolls back; exact retry idempotent; current assigned-master CRM reused; neutral external notice/error code, no private materials in payload | [#1919 reused](https://github.com/andylitvinov-design/books/pull/1919), `ad25ecf9217a116e66180767aea27cc10f330f52` | 27booking+35notification cases, lint/typecheck; [exact-head fullbuild CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40195463504/job/121175230957). Existing production participant policy metadata compatible; external receipt BLOCKED |
| C / #1419, existing Cabinet/Mobile workflows | DEPLOYED: literal Next route brackets escaped; original jobs/checks retained | [#1930](https://github.com/andylitvinov-design/books/pull/1930), `4e518a8e71efb2db6841b906c19a42d56211bd9c` | 33tests, lint/typecheck/build; actual nonempty [Cabinet PASS](https://github.com/andylitvinov-design/books/actions/runs/40156858581/job/121059975414), [Mobile PASS](https://github.com/andylitvinov-design/books/actions/runs/40156858614/job/121059975639) |
| D + S5 / #990/#1050, existing encrypted intake | DEPLOYED: duplicate public four-answer/drawing form and automatic messenger clipboard removed; EN/RU/ES link to existing private intake with public allowlisted topic only. Saved private draft is unsent; drawing stays on-device until secure handoff agreed. Auth/ownership retained | [#1957](https://github.com/andylitvinov-design/books/pull/1957), `85fbc10ff6d9cf0c1a902e78b6b8d9ce9c2d000e` | 40tests, lint/typecheck/fullbuild705pages, independent review; [PR browser24states PASS](https://github.com/andylitvinov-design/books/actions/runs/40195266498/job/121174632608); [actual production24states PASS](https://github.com/andylitvinov-design/books/actions/runs/40196889975/job/121182974704) |
| S1/S2/S6 / #990/#1716, existing capture/cart/support | DEPLOYED COPY: saved reference awaits reply, no appointment/SLA invented; explicit EUR and written total/taxes/fees/cancel/reschedule/refund agreement before payment; bounded follow-up/report scope, no auto renewal. Actual policy and package net economics remain owner-BLOCKED | [#1965](https://github.com/andylitvinov-design/books/pull/1965), `d9a64b278b33dab7ae61fe7a87a46d1ac6871a78` | 45focused tests, lint/typecheck, independent review; [exact-head fullbuild CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40197372030/job/121181026316); actual EN/RU/ES EUR/terms200 readback |
| S3/S4 / #990, existing carousel/session selector | DEPLOYED: autoplay removed; manual arrows/dots/swipe and reduced-motion retained. SAME single30/60min selector before catalogue; dedicated ES route corrected separately; no duplicate form/SKU/state | [#1961](https://github.com/andylitvinov-design/books/pull/1961), `2d7fb85cf92db3d863b831a2b68095e4b0d17a2b`; [#1975](https://github.com/andylitvinov-design/books/pull/1975), `e609882323a8e989de6f544add43a3b4dfd2e979` | 38home cases; ES4/5red→25relatedgreen; lint/typecheck/build and independent reviews; [320–430/desktop Chromium/WebKit CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40198172730/job/121183447384); [ES exact-head browser retry PASS](https://github.com/andylitvinov-design/books/actions/runs/40199527783/job/121191322789); hosted12routes + IAB phones PASS |
| CI prerequisite / #1419, five existing fixture loaders | DEPLOYED: AST boundary stripping replaces broken regex export removal; executable assertions preserved | [#1958](https://github.com/andylitvinov-design/books/pull/1958), `62ebb537ca6c0912f65cfafcb64ffb8f87c0dfc7` | 56targeted/106mediaPASS, lint/typecheck/[fullbuild CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40195528490/job/121175424968); known28unit/32IA harness failures removed |
| Existing verification repairs / #1419 | DEPLOYED: reused current7module/14card DOM verifier and filtered mentor fallback assertion; no competing implementation | [#1949](https://github.com/andylitvinov-design/books/pull/1949), `c7b22d1e3798afd557e9f00f31b1cd70903dcca6`; [#1946](https://github.com/andylitvinov-design/books/pull/1946), `1e696be48d541fca2878d1a5cd9454671d81371e` | [Both home jobs PASS](https://github.com/andylitvinov-design/books/actions/runs/40191918678); mentor exact test independently4/4PASS; original DOM/image/video/route assertions retained |
| Additional phone regression / #990/#1419, existing #1982 design | DEPLOYED: parallel redesign reduced prior90px photo minimum to88; preserve design and change ONE clamp minimum back to90; unchanged physical browser threshold | [#2000](https://github.com/andylitvinov-design/books/pull/2000), merge `90d520b528f33ff70f915703a769e3611be05a68` (tested head `5c9ca4d3f5172000da9e682fd1d3ade8cf0701c4`) | Both320engines red at88px; 13related tests, ESLint,typecheck, independent fullbuild705/705PASS; [exact-head core/build + browser CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40204695148) |
| Additional native menu / #1419/#990, existing SiteNavigation | DEPLOYED: four-line guard preserves native menu opened before first effect and identical effect replay, still closes on real path/locale change; outside click/focus/Escape preserved. Merged #2000 FIRST; final NAV diff3files | [#1986](https://github.com/andylitvinov-design/books/pull/1986), merge `c6fd97de8395e1f8e6b5021a205ffd9b140cbe3f` (tested head `a7134820ee90d3d61d97cd7f6411e13fa1b88743`), #2000 merged first; final diff exactly3files | Actual refs/effects10/12red→12/12green; focused41PASS, lint/typecheck/fullbuild705PASS, independent12PASS; stacked menu+ES17PASS; [new exact-head core/build + browser CI PASS](https://github.com/andylitvinov-design/books/actions/runs/40204484695). Initial candidate passed20language switches, failed only regressed88px photo geometry |

## Actual production acceptance and limits

At security release `7a5c22f5` READY `dpl_DTzUhU6fcYibhKxwuXHKVo5Si8uo`: [admin clients](https://holistichouse.vercel.app/admin/clients)307→login; [admin materials](https://holistichouse.vercel.app/api/admin/materials) neutral404 for anonymous and unknown valid-format v2 token; recorder-auth POST401; [private intake API](https://holistichouse.vercel.app/api/app/coaching-intake)401. Private/no-store/noindex observed. Production KV URL/token, encryption key and configured admin credentials are PRESENT (metadata only, no values decrypted); production factory rejects missing configuration instead of using memory. Same five anonymous/invalid-token checks repeated on pinned579ad0ba15:44UTC, all expected307/401/404, no-store/noindex. Real owner login/logout/expiry/store roundtrip is NOT claimed.

At `579ad0ba`15:44UTC, canonical alias fixed before/after checks:12routes200 across EN/RU/ES (home initial paid CTA; Services selector exactly once before catalogue; free-review private intake link; support EUR/written terms). Actual IAB EN320/430: stable offer across observations beyond8s, deliberate Next/Previous work, zero overflow, paid CTA reaches early selector. Actual IAB ES320/430 at earlier released checkpoint: selector count1, above catalogue, zero overflow, unchanged `personal-session-60`/`express-consultation-30`; no form input/cart add/submit/send/payment. Temporary viewport reset.

Actual production free-review CI: Chromium/WebKit×EN/RU/ES×320/375/390/430 =24states PASS. This tests public layout/handoff, not owner auth or real delivery. Home browser CI includes320/375/390/430/1365px at900px height; physical phone-height checks are separately identified above. Local supplemental headless launch was blocked by macOS MachPortRendezvous permission1100; no settings changed. Real browser evidence comes from GitHub Linux and IAB, not a claimed local headless run.

## Commercial transition matrix

PASS is limited to the stated environment/segment. Mock DB/transport or an iframe/HTTP200 is not a received lead, delivered message, payment or service.

| Transition | Hosted status | Evidence / remaining condition |
|---|---|---|
| Visitor→form/private entry | PASS public segment | Actual three-locale pages, phone browser states, consent initially unchecked; no submission |
| Form→request in DB | BLOCKED | Atomic save/rollback/idempotency pass in code/CI; need controlled client and real committed receipt |
| DB request→assigned-master CRM | BLOCKED | Existing consultation_requests-derived CRM reused; need same real reference and authorized master readback |
| Request→durable master inbox | BLOCKED | Atomic neutral message and existing participant policies tested/read; need real two-identity request |
| Request→external master receipt | BLOCKED | No verified opted-in owner target; no provider acceptance or actual inbox receipt |
| Master→agreement→client message | BLOCKED | Two controlled identities, saved terms revision and client receipt needed |
| Client→confirmed order | BLOCKED | Both confirm same time/format/total/currency; no fake production order created |
| Confirmed order→payment | BLOCKED | Commerce `available:false`, `SERVICE_CHECKOUT_UNAVAILABLE`; no real payment authorized/performed |
| Verified payment→service/access | BLOCKED | Need independent receipt/order linkage and actual fulfilment; no conversion/revenue fabricated |

## Concrete owner actions and remaining commercial policy

1. In [existing cabinet settings](https://holistichouse.vercel.app/en/app/settings), connect the EXISTING Telegram bot and explicitly enable message alerts, or supply approved verified transactional email. Rechecked15:45UTC:1owner practitioner,0verified Telegram links,0enabled message-alert preferences. All6email vars also rechecked absent at final documentation preparation, hiddenProductionEnvCount0: `HH_BOOKING_EMAIL_ENABLED`, `HH_BOOKING_EMAIL_PRODUCTION_APPROVED`, `HH_BOOKING_RESEND_API_KEY`, `HH_BOOKING_FROM_EMAIL`, `HH_BOOKING_VERIFIED_DOMAIN`, `HH_BOOKING_SENDER_VERIFIED`. Shared-bot flags exist, values/identity not assumed; bot/webhook preserved, no new bot/getUpdates/forced consent.
2. Use separate controlled client/master sessions after recipient consent. Verify persisted request+CRM+inbox event, provider acceptance AND intended recipient receipt; verify owner admin login/logout/expiry. No unrelated customer data is required.
3. Approve actual reply window, cancellation/rescheduling/refund terms, follow-up volume and report/video scope before taking payment. Existing Terms cover general use/education/privacy/availability, not a numeric SLA or commercial refund policy. Released copy says these must be agreed; it does not invent them.
4. Record net receipts, taxes/provider fees and all preparation/session/message/report minutes for the €200 package. Base gross arithmetic:2×60min→€100/hour before extras/cost;150/180totalmin→€80/€66.67/hour, illustrations only. Profit, workload cap and capacity remain unknown; two sessions/price unchanged.
5. Restore checkout in an authorized sandbox and complete order→payment→service verification there first. No paid API or real payment without separate permission.

## Validation incidents retained, not hidden

- Initial post-merge privacy browser ran BEFORE Vercel published new source and correctly failed24/24 on the old five public fields. Unchanged rerun after READY passed24/24; no assertion relaxed.
- Hosted acceptance caught dedicated ES route still below catalogue after #1961. #1975 adds that actual route to the existing regression; subsequent hosted check passes all locales.
- #1975 attempt1: one WebKit390 native language-menu opening failed,18/20switches and54/60journeys passed, no JS/transport errors. One unchanged failed-job retry passed. This proves nonconstant occurrence, not a repaired cause; artifact12601049046 retained in [#1419](https://github.com/andylitvinov-design/books/issues/1419).
- Actual SiteNavigation callback independently reproduces initial effect closing a preopened menu. #1986 fixes that deterministic mechanism; the original WebKit toggle/effect timeline was not captured, so causality is not claimed.
- Initial #1986 browser:20/20language switches PASS; both320engines fail photo88px after parallel #1982 redesign. #2000 preserves the redesign and restores90px; next #1986 head is a new code composition, not a blind rerun of the failing geometry.
- Whole-repository CI is NOT claimed green. Existing course/player/source-contract, broad browser and isolated billing fixture failures remain tracked under #1419; existing Square fixture [#1915](https://github.com/andylitvinov-design/books/pull/1915) not duplicated. Supplemental nav regression28PASS plus one unchanged fixture cannot load its unchanged Home mock because HomeSectionCarousel dependency is absent; no menu code executes in that failed fixture. No tests/assertions disabled, thresholds relaxed, branch protection changed or admin merge override used.

## Workspace preservation and evidence

Original dirty checkout preserved. All8temporary source worktrees moved outside the main TypeScript include tree after candidates were pushed; Git repair/clean status checked at relocation. Original tsconfig/.gitignore unchanged; config parsing confirms0temporary TypeScript inputs. Persistent evidence: `tmp/hh360-delivery/` (`EXECUTION.md`, `RUNTIME.json`, sanitized JSON/readbacks, logs/artifacts). Source candidates and tests are in the linked PRs; no secrets/customer records in this ledger.

## Next three highest-value tasks

1. Enable an owner-consented existing notification destination, then prove one controlled live request→CRM→inbox→provider acceptance→intended recipient receipt.
2. With distinct controlled client/master identities, verify owner session lifecycle and agreement→client message→confirmed order, including access-denial cases.
3. Approve/measure reply/refund/workload economics and configure authorized sandbox checkout, then verify order→payment→service there before any real payment.

## Deferred original audit register

These original audit items are preserved, not silently called complete. No duplicate issues created.

| ID | Requirement | Existing owner | State | Remaining acceptance |
|---|---|---|---|---|
| F07 | Migration uniqueness / TOP19 | #1109 | DEFERRED | Reconcile file/hash/applied ledger; no blind rename or production db push |
| F08 | Optional Osiris reflection / TOP12 | Existing Egyptian learner | DEFERRED | Empty/skip/back runtime acceptance |
| F09 | Course saving disclosure / TOP14 | Existing learner/academy progress | DEFERRED | Preserve browser-only privacy; account persistence only with consent |
| F10 | Language contract / TOP13 | Academy cards/course landing | DEFERRED | Show actual EN/RU/ES content/audio language before start |
| F12 | Broader IA / TOP17 | #1896 MERGED (Academy separation only), #990 | PARTIAL_EXTERNAL / remaining DEFERRED | Preserve routes/progress, moderated user comprehension |
| F15 | Exact-edition review / TOP15 | #1223/#626/#342 | BLOCKED | Qualified reviewer and rights evidence; do not relabel validity |
| F16 | Archival claims caveat / TOP16 | Existing source-preservation workflow | DEFERRED | Inline context, preserve originals; professional review separate |
| F17 | Video publication / TOP17 | #1898 OPEN | DEFERRED | Review existing PR, no duplicate publisher or live test publication |
| F18 | CRM pagination / TOP18 | CRM V6 / #1050 | DEFERRED | 300 synthetic records, cursor, stable ordering, owner isolation |
| F19 | Digest fairness | Existing scheduler/claims | DEFERRED | 25 synthetic masters / bounded batches; no real bulk send |
| F20 | Portrait and LCP / TOP11 | #1917 OPEN / #846 | DEFERRED | Reuse existing PR, exact served SHA and comparable lab runs |
| F21 | Password protection | Supabase Auth | BLOCKED | Confirm password use/plan; no paid setting change |
| PILOT | Learning/value pilot / TOP20 | #1223, existing OPORA roadmaps | BLOCKED | Consented participants and operational data, no fabricated outcomes |

Final frontend gate at15:27UTC: #2000 and #1986 both own core-methods/fullbuild and first-click browser jobs SUCCESS, then normal match-head merges in dependency order. Combined browser artifact12603444272:20language switches,60free journeys,10visual states,0failures,min photo90px,max overflow0. Nine prior release commits are confirmed ancestors of final application merge `c6fd97de8395e1f8e6b5021a205ffd9b140cbe3f`. No unrelated source reset.

Final pinned live batch at15:44UTC:12public routes200 +5admin/private denial cases +12IAB homepage phone states (EN/RU/ES×320×568/375×667/390×844/430×932). All phone states:0horizontal overflow, photos≥90px, paid CTA visible and unoccluded with locale-correct href, initial services offer stable; first language-menu opening and Escape PASS. Browser viewport and English restored. Alias identical before/after. An earlier extended phone pass crossed an alias advance and is explicitly retained as a mixed-deployment observation, superseded by this pinned batch.

Concurrent #2010/#2009/#2014 releases preserved. #2009 message-chain source reviewed, its exact server-condition message tests independently10/10PASS (synthetic, not live actors); current production INSERT policy metadata confirms requested/contacted remain admitted with author/account/participant checks, terminal remote replies restricted. That migration was applied by another workstream, not this delivery. No real two-account or external-device receipt is inferred from its PR title. Source579ad0ba contains all our release ancestors; later docs-only delivery identity is linked through the existing #990 checkpoint.
