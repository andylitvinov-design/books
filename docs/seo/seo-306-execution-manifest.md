# Issue #306 execution manifest

This is an implementation checklist for [Issue #306](https://github.com/andylitvinov-design/books/issues/306), not a replacement strategy.

| Task ID | Requirement | Source | Status | Verification |
| --- | --- | --- | --- | --- |
| T1 | Close PR #309: twelve public sitemap additions, hreflang/canonical, private-route safety and protected Preview readback | User request; PR #309 | In progress | Focused tests, authenticated `vc curl`, PR checks |
| T1b | Repair the existing React hydration #418 without weakening the browser test; coordinate the Services change with PR #228 | User request; CI run 38142203632 | Blocked on reproducible local browser environment | Regression test plus Website video browser CI |
| T2 | Add `verify:seo` and audit sitemap, metadata, headings, canonicals, hreflang, structured data, speed and internal links | User request | In progress | `npm run verify:seo`; build; route audit report |
| T3 | Improve commercial service, free-review and About content with the actual written-report flow | User request | Pending | Locale content and route tests |
| T4 | Give Yggdrasil, Tantra, Kundalini and Temple Studies distinct metadata, clusters, links and truthful CTAs | User request; PRs #307/#204 | Pending coordination | Academy route and metadata tests |
| T5 | Record only sourced SERP/Trends evidence by date, geography and language; prepare GSC reporting | User request | In progress | Source-linked demand record; no invented metrics |
| T6 | Draft, but do not launch, compliant Search campaign structure and conversion measurement | User request | Pending | Documentation review; no Ads account writes |

## Scope and safety gates

- This branch is additive to PR #309 and must not overwrite PRs #228, #204 or #307.
- Production deployment, merge, paid spend, Google Ads writes, Search Console writes and private-client data are excluded.
- Vercel Deployment Protection stays enabled. Preview checks use the caller's authenticated Vercel CLI only.
- Any health or regulated-title claim remains blocked until the owner supplies the required credentials and legal review.
