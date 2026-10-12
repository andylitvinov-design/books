# Love · Relationships · Sexual wellbeing · Tantra — launch & QA

Date: 2026-10-11. Target source: `codex/public-book-library` in `andylitvinov-design/books`. This proposal extends the existing client test & Insights architecture, not a separate system.

## Scope

- New public SEO landing pages `/en/relationships` and `/ru/relationships`, with distinctive but site-aligned design and links from primary navigation/homepage.
- Eight original six-item bilingual self-reflection questionnaires; **two independently scored subscales each** (16 dimensions total), 16 immutable language definitions and authored interpretation / practice for every dimension. EN/RU guides above.
- Direct URL `/en/client/tests?test=hh-...` selects the target test; user explicitly starts, then existing Google OAuth / private results / Insights & export are reused.
- Catalog focus and problem selectors include love/intimacy, sexuality, consent and Tantra-inspired awareness. No proprietary or copyrighted clinical content.
- Database additions are **append-only assessment_versions**, with hash conflict guard; no RLS/auth modifications.

## Editorial / safety

For consenting adults, no assumptions about gender, sexual orientation, partner status or amount of sexual activity. No assertion these are validated scales, no sexual performance scores, diagnosis, consent determination or partner compatibility. Self-report content is sensitive. No raw answers in query strings, logs, analytics or public sharing. Users choose whether to test; no automatic scoring of another person. Seek qualified clinical guidance for medical concerns. Tantra is framed as an optional mindfulness/embodiment approach and cannot replace care.

## Database verification

Issue #363 records the original application as migration `20261011211746_hh_love_intimacy_assessments` on 2026-10-11. A bounded technical readback on 2026-10-12 at 05:59 UTC confirmed all **16 IDs, content hashes and complete definition objects** exactly match PR head `b01bb9f9fd4488f697c4642e9345481ac5cec61a`, with status `published`. No client records were read and no database write was performed. **Do not repeat registration.** The existing applied SQL file and all sixteen scored definitions remain unchanged.

Recovery is based on canonical `10871d5473b912eeda39f51bc3c89e3d9395dd80`: source inventory **96 → 104 runnable instrument keys**, **153 → 169 immutable definitions**, **41 professional / 63 original reflection instruments**. EN/RU versions and the sixteen subscales are not counted as separate tests. The separate unmerged typology, BFAS and MHC-SF PRs are not included. These source counts do not describe a newly queried production aggregate.

Desktop navigation has seven EN/RU entries; the mobile bar intentionally retains six. The localized Home spotlight provides a visible route to the relationship hub. The browser contract checks that distinction rather than adding a seventh mobile button.


## Release checklist

1. [x] Local unit (1019), app (136) and isolated database (33) checks pass, including independent scores, immutable identities and private saves for all sixteen forms.
2. [ ] TypeScript/lint/build and synthetic Chrome/WebKit journeys at desktop/mobile; confirm no overlapping nav items.
3. [x] Read back the 16 existing published definitions, IDs and hashes. No re-registration or production mutation.
4. [x] Local Chromium: 24 relationship journeys cover EN/RU hub and all 16 forms across account/guest runners, selection, saved reports, compatible history, Insights and PDF. EN/RU PDFs (15/16 pages with synthetic repeat history) visually checked. Authentication uses an isolated provider protocol double, not real Google. Exact-head CI remains required.
5. [ ] After independent exact-head review, CI and separate release approval, deploy through the existing production process. No production deployment or settings changes are part of this recovery; a preview quota failure alone is not a code-merge blocker.
6. [ ] Verify production READY and alias for `holistichouse.vercel.app`, test EN/RU page and 8 links on mobile/desktop. Confirm no public indexing of private /client/tests screens.

**Source branch or merged code alone is NOT a live release.**
