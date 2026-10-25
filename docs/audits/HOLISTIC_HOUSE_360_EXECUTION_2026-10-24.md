# Holistic House 360 — execution and evidence ledger

Updated 2026-10-25. Source: local `docs/audits/HOLISTIC_HOUSE_360_AUDIT_2026-10-24.md`, including TOP-20 and E2E matrix, read before implementation. Original audit remains untracked in the owner checkout and was not silently published; SHA-256 `9d1ae419b06b6c744cbbd73bc5395c970570ef1bff2504043c268972d43ba60f`. This is the single current ledger; historical checkpoints are superseded by the statuses below.

## Production provenance and boundaries

Actual repository: `andylitvinov-design/books`; production branch `codex/public-book-library`; canonical [production](https://holistichouse.vercel.app). Vercel project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, team `super10`. Original dirty checkout and unrelated `.vercel` project link were preserved; all implementation used isolated clones/worktrees. This delivery performed no production database migration, credential change, paid API, bulk send, synthetic production lead or real payment.

Audit baseline was `d7aa83c2bf2304fd953d47788523984a48ddd29b`, READY `dpl_8moe5c2cXvPEaTQu9N8PZVN5HqJv`. Parallel Temple/Reiki changes were preserved. Latest confirmed application deployment: **ad25ecf9217a116e66180767aea27cc10f330f52**, **READY**, **dpl_5qgryCuTuz6cdLS1q7pDKcW6fQd7**, [immutable deployment](https://codex-public-book-library-h47jw654q-super10.vercel.app). Later merges are not called deployed until alias/SHA readback below.

## Reconciliation and delivered changes

| Scope | Existing owner/module | State and implementation | PR / merge SHA | Verification |
|---|---|---|---|---|
| Preparation | Audit; existing issues below | DONE: full audit/TOP-20/E2E read; default branch distinguished from production; existing fixes reviewed/reused | [plan #1928](https://github.com/andylitvinov-design/books/pull/1928) | Canonical Vercel/source SHA checks repeated before releases |
| A admin sessions | #55; prescription session storage, existing app auth | DEPLOYED; random persisted v2 tokens, fixed 12h server expiry, owner/account/auth-session checks, credential rotation invalidation, logout revocation, legacy cookie rejection; recorder recovery cannot extend lifetime; SSR refresh propagates existing auth cookies without extending admin expiry | [#1934](https://github.com/andylitvinov-design/books/pull/1934), `7a5c22f54a33a52e69b9aa04c318eade5d807255` | 60 auth + 58 middleware/CSP + 106 media tests; lint/typecheck; two local builds; independent spec/security review; [exact-head CI/build PASS](https://github.com/andylitvinov-design/books/actions/runs/40196167553/job/121177342345) |
| B request notifications | #980/#985/#1302; EXISTING PR1919, current request repository/CRM/dispatcher | DEPLOYED CODE; request plus neutral inbox event atomically persisted, rollback on inbox failure, idempotent retry; current assigned-master CRM reused; external message excludes sensitive material, neutral failure codes | [#1919 reused](https://github.com/andylitvinov-design/books/pull/1919), `ad25ecf9217a116e66180767aea27cc10f330f52` | 27 booking + 35 existing notification cases; lint/typecheck; [exact-head CI/build PASS](https://github.com/andylitvinov-design/books/actions/runs/40195463504/job/121175230957); actual production policy metadata supports participant message insert/select. External receipt BLOCKED |
| C jobless workflows | #1419; existing Cabinet and Mobile workflows | DEPLOYED; literal Next route brackets escaped in workflow filters; jobs/checks retained | [#1930](https://github.com/andylitvinov-design/books/pull/1930), `4e518a8e71efb2db6841b906c19a42d56211bd9c` | 33 tests; lint/typecheck/build; actual [Cabinet jobs PASS](https://github.com/andylitvinov-design/books/actions/runs/40156858581/job/121059975414), [Mobile jobs PASS](https://github.com/andylitvinov-design/books/actions/runs/40156858614/job/121059975639) |
| D private materials / S5 duplicate form | #990/#1050; existing private intake | DEPLOYED; duplicate public four-answer drawing form and automatic messenger clipboard removed; EN/RU/ES direct to existing authenticated encrypted intake; only public topic crosses URL; saved draft remains unsent, drawing remains on-device until agreed secure handoff | [#1957](https://github.com/andylitvinov-design/books/pull/1957), `85fbc10ff6d9cf0c1a902e78b6b8d9ce9c2d000e` | 40 tests; lint/typecheck/build (705 pages); independent review; [24 Chromium/WebKit × EN/RU/ES × 320/375/390/430 states PASS](https://github.com/andylitvinov-design/books/actions/runs/40195266498/job/121174632608); live three-locale links/copy PASS |
| CI fixture prerequisite | #1419; five existing media fixture loaders | DEPLOYED; replaced regex boundary stripping with AST helper, preserving all executable assertions | [#1958](https://github.com/andylitvinov-design/books/pull/1958), `62ebb537ca6c0912f65cfafcb64ffb8f87c0dfc7` | 56 targeted and 106 full media cases PASS; lint/typecheck/[CI build PASS](https://github.com/andylitvinov-design/books/actions/runs/40195528490/job/121175424968); removed known 28 unit/32 IA harness failures |
| Browser prerequisite | Existing PR1949 | DEPLOYED; current 7 modules/14 cards verified, original DOM/image/video/navigation assertions retained | [#1949 reused](https://github.com/andylitvinov-design/books/pull/1949), `c7b22d1e3798afd557e9f00f31b1cd70903dcca6` | [Both core-methods and first-click PASS](https://github.com/andylitvinov-design/books/actions/runs/40191918678) |
| Mentor assertion prerequisite | Existing PR1946 | DEPLOYED; existing test follows filtered service fallback and rejects unfiltered mentor service | [#1946 reused](https://github.com/andylitvinov-design/books/pull/1946), `1e696be48d541fca2878d1a5cd9454671d81371e` | Independently rerun exact existing test: 4/4 PASS; no production source modification |
| S1/S2/S6 request/price/scope clarity | #990/#1716; existing capture/cart/support components | DEPLOYED; saved reference explicitly awaiting reply, no appointment/SLA fabricated; EUR and pre-payment written total/cancel/reschedule/refund confirmation; bounded follow-up/report scope and no auto renewal | [#1965](https://github.com/andylitvinov-design/books/pull/1965), `d9a64b278b33dab7ae61fe7a87a46d1ac6871a78` | 45 focused tests, lint/typecheck; independent review; [exact-head full build PASS](https://github.com/andylitvinov-design/books/actions/runs/40197372030/job/121181026316). Actual policy/economics remain owner-blocked |
| S3/S4 stable offer and early session choice | #990; current carousel and PublicConsultationCta | EN/RU DEPLOYED; ES followup #1975 pending; autoplay removed, manual arrows/dots/swipe preserved; single existing session selector moved above long catalogue, no second form/SKU/state | [#1961](https://github.com/andylitvinov-design/books/pull/1961), merge `2d7fb85cf92db3d863b831a2b68095e4b0d17a2b` (tested head `8542389b0aafcfe52c04485cd4b7b8138eb48c5f`) | 38 home cases, lint/typecheck, independent review; earlier head full browser/build PASS; expanded browser run found 84–89.875px photos at 320/375; existing CSS minima corrected to90px, same unchanged browser assertions now PASS on exact head; 24 local focused cases PASS; independent followup review PASS; [core-methods/build](https://github.com/andylitvinov-design/books/actions/runs/40198172730/job/121183446747) and [expanded browser](https://github.com/andylitvinov-design/books/actions/runs/40198172730/job/121183447384) both SUCCESS |

No tests were skipped to merge these changes, no branch protections disabled, and no admin merge override used. General CI is **not green**: pre-existing course/player/source-contract, billing fixture and broader browser failures remain under [#1419](https://github.com/andylitvinov-design/books/issues/1419). Booking exact-head failure names added only the already-repaired 28 media-loader failures against its old base; no extra unit regression outside that group. Existing Square fixture repair [#1915](https://github.com/andylitvinov-design/books/pull/1915) was not duplicated. Dedicated gates above passed; this is not a claim that the whole repository passed.

## Actual production readbacks

At security deployment `7a5c22f5`, READY `dpl_DTzUhU6fcYibhKxwuXHKVo5Si8uo`: [admin clients](https://holistichouse.vercel.app/admin/clients) redirects 307 to login; [admin materials API](https://holistichouse.vercel.app/api/admin/materials) returns neutral 404 for anonymous and unknown valid-format v2 token; recorder-auth POST returns 401 ADMIN_SIGN_IN_REQUIRED; [private intake API](https://holistichouse.vercel.app/api/app/coaching-intake) returns 401. Private/no-store/noindex verified. This proves anonymous/invalid-token boundaries, not real owner login/logout/server-expiry in production.

At `ad25ecf9`, READY `dpl_5qgryCuTuz6cdLS1q7pDKcW6fQd7`: [EN](https://holistichouse.vercel.app/en/services/free-situation-review), [RU](https://holistichouse.vercel.app/ru/services/free-situation-review), [ES](https://holistichouse.vercel.app/es/services/free-situation-review) all 200, new private-material instructions and correct locale-specific `/coaching/intake?topic=personal` link present. Commerce reports `available:false`, `SERVICE_CHECKOUT_UNAVAILABLE`. No form submit, private record read, provider message or payment attempted.

Supplemental local Chromium was blocked by macOS sandbox MachPortRendezvous SIGTRAP; no system permission changed. Phone layout evidence comes from actual Linux CI Chromium/WebKit above, not a claimed local screenshot. Local Next build and HTTP smoke passed.

## Commercial E2E matrix

PASS applies only to the named segment/environment. Source tests and DB/transport doubles are not real provider delivery or a sale.

| Transition | Production status | Evidence / remaining condition |
|---|---|---|
| Visitor → form | PASS public segment | Canonical three-locale pages, actual CI phone states, consent initially unchecked; no submit |
| Form → request in DB | BLOCKED hosted | Atomic commit/rollback/idempotency pass in code/CI. Controlled authenticated client plus actual persisted receipt needed |
| DB request → assigned-master CRM | BLOCKED hosted | Existing CRM derives consultation_requests, no duplicate marketing ingestion; need same real request/reference and authorized master readback |
| Request/CRM → durable master inbox | BLOCKED hosted | Atomic neutral message tested; production policy metadata compatible; controlled two-identity live request still needed |
| Request → external master notification | BLOCKED | No opted-in verified owner recipient; no provider acceptance or actual recipient receipt claimed |
| Master → agreement → client message | BLOCKED | Two controlled identities, saved terms revision, authorized client receipt needed |
| Client → confirmed order | BLOCKED | Both parties must confirm same time/format/total/currency; no synthetic order generated |
| Confirmed order → payment | BLOCKED | Checkout unavailable; real payment not authorized or performed |
| Payment → service/access | BLOCKED | Need independently verified receipt/order linkage and actual fulfilment; no sale/revenue invented |

## Concrete owner actions / remaining policy

1. In [existing cabinet settings](https://holistichouse.vercel.app/en/app/settings), connect the existing Telegram bot and explicitly enable message alerts; alternatively configure approved verified transactional email. Metadata-only join returned one owner practitioner, zero verified Telegram links, zero enabled alert preferences. Shared-bot flags/webhook-secret variables exist but values/identity were not assumed; all six HH_BOOKING email enable/approval/key/from/domain/verification variables are absent. Existing bot/webhook preserved; no getUpdates/new bot/forced consent.
2. Provide separate controlled client/master sessions after recipient consent, then verify committed request + CRM + inbox event + provider acceptance + intended recipient receipt. Owner-session production lifecycle also needs owner authentication. No customer data is needed for these checks.
3. Confirm actual reply window, cancellation/rescheduling/refund terms, follow-up cap and report/video scope before taking payment. Existing Terms contain general educational/use/privacy/availability text, no numeric response SLA or commercial refund policy. Copy now says explicitly that these terms must be agreed, not that an unverified policy exists.
4. Record actual €200 package net receipts, taxes/provider fees and time spent on preparation, 2×60-minute sessions, messages and report/video work. Gross base arithmetic is €200/2h=€100/h before all extra work/cost; at 150/180 total minutes it is €80/€66.67 per hour, illustrative arithmetic only. Profit, workload limit and capacity are unknown. Price and two-session scope were not changed.
5. Restore and verify checkout in an authorized sandbox first. No paid API or real payment without separate permission.

## Next three highest-value tasks

1. Enable an owner-consented existing notification destination and perform a controlled live request/CRM/provider/recipient check.
2. Verify full owner session lifecycle in production and remediate remaining CI baseline under #1419, reusing #1915 where correct.
3. Approve operational reply/refund/workload limits, measure package labour/net receipts, then complete sandbox order-to-service chain before any real payment.

## Deferred audit register

The following original audit items are preserved, not silently reported completed. This delivery implements first queue and bounded sales corrections above, not the entire deferred audit backlog.

| ID | Requirement | Existing owner | State | Remaining acceptance |
|---|---|---|---|---|
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

## Additional confirmed release — 2026-10-25 13:31 UTC

PR #1965 is deployed at `d9a64b278b33dab7ae61fe7a87a46d1ac6871a78`, READY `dpl_CzrQDcQ3UT19gqc8zfMAtaQBVJ3a`, [immutable deployment](https://codex-public-book-library-je3yylt7z-super10.vercel.app). Canonical alias matched this deployment; EN/RU/ES personal-support pages returned200 with EUR and written pre-payment terms. Success receipt wording is code/CI verified, not a new production submit.

The first post-merge privacy browser run #40196889975 started before Vercel published the change and correctly failed on the old five public fields (24failures). The same unmodified read-only browser job was rerun after READY and **PASS24/24** on canonical production: [attempt2 browser evidence](https://github.com/andylitvinov-design/books/actions/runs/40196889975/job/121182974704). Alias was d9a64b27 before the run; no submissions or payments. No assertion was relaxed.

Parallel production merges #1964/#1896/#1968 were preserved before #1961 (base `85f0265833422ea5da762871cd1c0055fb3c5bee`); no reset or overwrite. Final canonical readback must use the resulting actual deployment, not the older isolated candidate.

## Final acceptance correction — separate Spanish route

Live readback at READY `a42f7f34b5757c8518454ff597257b647bbdd09b` (`dpl_C8fHUvqhq9QXu5F8csk53Wq37KiG`) confirmed stable EN homepage/CTA at320/430px, zero horizontal overflow, deliberate Next/Previous working, and the single EN selector above catalogue (anchor top99.8px, catalogue432px). The same automated HTTP order check correctly FAILED `/es/services`: its dedicated page had not moved. This is an actual caught acceptance gap, not a passed scenario.

[Followup #1975](https://github.com/andylitvinov-design/books/pull/1975), head `e8398217a1161d862760e1af8ca7a4b3d594018a`, moves the same selector on the existing ES page; the existing regression now covers both actual route files, and existing CI watches/lints ES explicitly. Before fix4/5PASS1FAIL, after fix25focusedPASS; lint/typecheckPASS; independent specification/qualityPASS and independent5/5test rerun. No additional form/state/payment logic. Exact-head build/browser CI and hosted ES readback remain gates before claiming all locales delivered.

ES followup validation: independent full `npm run build` PASS705pages after restoring sparse-checkout SQL and pinned source-image inputs. Actual local production-browser ES320/430 checks PASS: single selector before catalogue, no overflow, unchanged30/60min products. Exact-head core-methods GitHub SUCCESS. Initial expanded browser attempt reached18/20 language switches and54/60free journeys; one WebKit390 case failed opening the existing native language menu (no JS/transport error). Artifact retained; a single unchanged failed-job retry investigates reproducibility; a mount-effect race is a hypothesis, not an established root cause. Even a green retry will not prove that first-click risk is repaired. No threshold/assertion/source bypass.
