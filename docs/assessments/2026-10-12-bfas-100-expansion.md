# Complete BFAS-100 author-form expansion

This batch adds **one complete instrument**, `bfas-100`: 100 original English self-rating items, ten aspect means and five paired-domain means. It does not add ten separately counted tests. Canonical base after integration: `1560c87d862f06e28841f44f557ec9363eacf5a9` (`codex/public-book-library`), including the released relationship forms, opt-in starter fix and merged MHC-SF #384. This PR adds only BFAS relative to that base; four-reflection PR #361 remains separate.

## Inventory and preservation

Source inventory against the updated canonical base: **105 → 106 runnable catalog keys**, **42 → 43 professional-labelled keys**, **170 → 171 immutable locale/version definitions**. The original batch was 96 → 97 keys and 153 → 154 definitions before #364 was released. These are code inventory counts, not production availability or a count of independent validated methods. Existing seven BFAS standalone aspects remain as published; no full 100-item form was runnable on the base. Open-PR checks for BFAS and Big Five found no active matching implementation.

The focused test retains the original 153-definition digest (`1743fb49e9f78bde406bc5055349a95c8b961961b21ab9d1a0fcb05fca1fb0bc`) and pins the earlier 169-definition base (`6258ebd96876d8ce3af28b49ee2437746a33bf80b2c6e8e2060fd1e20c98126c`). It additionally pins all 170 current canonical definitions (`2b7a4c102bbcf65ed0b6f3d3530d803c93dfa8f27456b5c2bf4a490ea6fc3e93`). Existing questions, IDs, hashes, scoring and histories are unchanged. BFAS's definition, independent source transcript and guarded migration remain byte-identical to the original PR head. A misleading code comment that equated four item-origin footnotes with copyright exclusions was corrected in the original batch; immutable legacy provenance fields remain untouched.

Integration preserves every released public-picker eligibility assertion and all relationship journeys, alongside the eight BFAS browser checks. The relationship selection journeys additionally verify that the requested plan's GET response is complete before reload or navigation; the visible dashboard shell alone does not establish that asynchronous read has finished. The zero-browser-error assertion is retained. The browser job budget is 30 minutes to accommodate both complete suites and browser dependency setup; no test coverage or request-limit pacing was removed. Exact-head verification is recorded in the PR. Production registration and merge remain pending separate approval.

## Exact sources and permission

- The [author's University of Minnesota research page](https://deyoung.psych.umn.edu/research), “Between Facets and Domains,” describes the full 100-item BFAS and explicitly identifies it as public domain.
- Master: [author-linked BFAS self-rating DOCX](https://docs.google.com/document/d/0B-XDPUhSKUmOUXdEU3ZnbnNvaUk/edit?resourcekey=0-kbXmTs_iSctSAlyyWmjR-A). The source auditor downloaded and read the complete 13,398-byte file, SHA-256 `a9ee90dca1c8f31ac2a9f0fcaa1b8058cc12c4f27b2c98bd29c6fe0930ccfdb9`, then supplied the full numbered text, instructions and numerical scoring key to the coding executor. The executor did **not** download that binary: its network returned CONNECT 403 and supported text readers did not expose it. This provenance distinction is preserved in the definition and test fixture.
- The [IPIP BFAS key](https://ipip.ori.org/BFASKeys.htm) independently cross-checks all 100 item meanings, aspect membership and signs. A local comparison verified all 100 after punctuation normalization and the four documented wording differences: author items **1, 60, 80, 90 use Rarely**, while IPIP uses Seldom. The implementation keeps author wording, punctuation, straight apostrophes and interleaved order. Only layout spacing in items 60 and 100 was collapsed.
- [DeYoung, Quilty & Peterson (2007)](https://doi.org/10.1037/0022-3514.93.5.880), *Between facets and domains: 10 aspects of the Big Five*, JPSP 93, 880–896. The author form itself supplies the exact numerical key and averaging instructions; no proprietary Understand Myself scoring norms or reports are used.
- [Source audit and rights record](https://github.com/andylitvinov-design/books/issues/342#issuecomment-6117973176).

IPIP's four footnotes describe item origins; they do not state distribution prohibitions. The instrument-specific permission basis is the complete BFAS public-domain statement from its author. No Russian full-form translation rights or validation are claimed. Russian titles carry **EN** and explanations explicitly identify the English original.

## Scoring contract

Definition ID: `1412085c-c923-55bb-946f-c611554bcd6d`

Key/version/language: `bfas-100` / `v1` / `en`

Translation/source version: `original-en-author-form-v1`

Content hash: `sha256:fc322ecc17c3f2f9e16578596a12ef7ded4a40a346fed665c3d96cde896dc021`

Responses are integers 1–5. The author labels 1 **Strongly Disagree**, 3 **Neither Agree Nor Disagree**, 5 **Strongly Agree**; 2 and 4 are numeric only. Every reversed item uses `6 − response`. Each aspect averages its ten keyed answers. Each domain averages its two aspects; with all items complete, the configured 20-item mean is exactly equivalent. Scores stay in 1–5; no overall personality total is produced.

| Domain | First aspect | Second aspect |
| --- | --- | --- |
| Neuroticism | Withdrawal | Volatility |
| Agreeableness | Compassion | Politeness |
| Conscientiousness | Industriousness | Orderliness |
| Extraversion | Enthusiasm | Assertiveness |
| Openness/Intellect | Intellect | Openness |

The source permits averaging completed items without specifying a minimum. **All 100 are required by this interface**, a clearly stated product rule. Missing answers do not produce a score; zero, fractions, strings and out-of-range answers are invalid. There is no imputation.

All scales use `dimensionClass: trait` and `direction: non-normative`. Reports and gauges are neutral, with continuous descriptive means, no percentile/norm/clinical bands and no better/worse trait goal. BFAS interpretation requires the exact version, locale, translation and content hash; incompatible provenance cannot fall back to generic thirds. Intellect is explicitly not an IQ score; BFAS Compassion is distinguished from CS and SCS-SF. Every scale has original EN/RU meaning and optional reflection in the [individual guide](./guides/bfas-100.md).

## Integration and verification

Uses the existing account/consented guest runner, Quick and Guided modes, filters, selection deduplication, private saves, compatible history, Insights and client-only bilingual PDF pipeline. It is not automatically placed in the quick starter set. No auth, RLS, client data, schema, deployment settings or services are changed.

The combined browser run exposed a document hydration warning from the existing root JSON-LD script: its `nonce` property matches the CSP header, but the browser clears the corresponding content attribute before React hydrates. This is [specified nonce hiding](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#nonce-attributes). React's [single-element hydration escape hatch](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors) is applied only to that script; nonce generation, CSP, authentication and JSON-LD content are unchanged. A new four-page EN/RU browser regression checks the actual response CSP, unique nonce, hidden attribute, retained nonce property, complete JSON-LD and absence of hydration/page errors. The old layout fails the regression. All BFAS and relationship final zero-page-error assertions remain intact; neither suite filters browser errors or retries failures. Page/request diagnostics remain available for failures.

The document regression first compiles its exact loopback page/API/icon routes using unauthenticated reads. Cold Next dev compilation was independently traced to a Fast Refresh RSC response changing the script's nonce while the original document CSP remained in force. The readiness step completes compilation before browser hydration; it does not retry assertions, accept the RSC nonce as the document nonce, or change CSP. This regression verifies the compiled application, not nonce behavior during a development Fast Refresh. The nonce comparison remains against the actual document response, with a guard against navigation during assertions.

The BFAS history journey also waits for successful, complete `shared-materials` responses before leaving history. Its result heading comes from bootstrap and can appear before the materials panel's passive effect has started; WebKit exposed interrupted reads when the test navigated immediately after that heading appeared. The test records every started materials request, including the development StrictMode duplicate, then checks each response's materials array and awaits completion. A previously reached network-idle state is insufficient for these late passive-effect reads. No application, access rule or final page-error assertion is changed by this wait.

Focused independent fixtures cover the full author text, item numbering, all ten numerical keys, all five domain pairs, every single-item contribution, reversed extrema, uniform and mixed responses, missing/invalid answers, exact ID/hash, neutral bilingual reports, source-version mismatch, catalog availability, registration payload and PDF/history model. The prior-definition digest protects all existing forms.

WebKit diagnostics also identified an unsupported `defaultOpen` prop on the account status-filter `<details>`: React's console error immediately preceded the failed development stack-frame request. The disclosure now uses the native `open` attribute with state synchronized by `onToggle`. It starts closed without a requested status, opens for a requested status, and retains the user's toggle across rerenders. Four EN/RU mobile browser cases check those states, Enter/Space operation, retained focus, selected-filter `aria-pressed`, and zero page/console errors in the authenticated scope. The selection and opt-in logic is unchanged; stack-frame errors are not filtered.

Local verification: 1,023 unit tests, 140 app tests, 33 isolated PostgreSQL tests and 10 PKCE tests pass. Production build and TypeScript check pass; lint has zero errors and the same 29 existing warnings. Initial inventory assertions were updated for the one new key and comprehensive-form count. Browser evidence and exact-head CI links are recorded in the draft PR; tests use a synthetic loopback auth protocol double, **not real Google authentication**.

## Registration and release boundary

Prepared SQL: `supabase/migrations/20261012045314_hh_bfas_100_author_form.sql`. It appends exactly one definition and rejects conflicting ID, identity tuple, content hash or full content. Reapplication is idempotent and is tested in isolated PostgreSQL. The Supabase migration CLI failed before creation because `/home/agent/.supabase` is read-only; the local file follows the repository's established append-only convention. No access change or escalation was attempted.

**Production registration, merge and deployment have not been performed.** After independent exact-head review and authorization, register this exact definition using the guarded migration and verify its ID/hash/content before release. MHC-SF production registration remains separately paused. A Vercel preview quota failure, if returned, is a deployment-capacity limitation and does not itself invalidate passing code checks.

## Combined browser fixture after MHC-SF merge

The full matrix retains all prior scenarios and runs MHC-SF and BFAS separately. Eight relationship guest journeys use one consented guest and assert eight distinct saved results. This keeps the expanded synthetic suite within the unchanged 12 guest sessions/IP/hour limit; no production quota, forwarded-IP header, auth, retry or error assertion is changed. Both complete 102-case browser jobs must pass on the new head before review/merge; previous 94-case evidence is historical.
