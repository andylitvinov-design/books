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

Applied to the connected Holistic House Supabase project on 2026-10-11 as migration `20261011211746_hh_love_intimacy_assessments`, following isolated integration test success. Readback confirmed 16 language definitions across eight keys (6 items and 2 dimensions per definition, content hashes intact); inventory is now 84 keys / 149 version rows. The matching migration file in this repository uses the applied version number to prevent duplicate drift. **Website publishing is separate and still requires Vercel READY verification.**

## Release checklist

1. [ ] Node tests pass for definitions / 16 score dimensions / deterministic EN-RU reports / focus filtering / OAuth handoff and profile saving.
2. [ ] TypeScript/lint/build and synthetic Chrome/WebKit journeys at desktop/mobile; confirm no overlapping nav items.
3. [x] Apply and read back new 16 version rows in the **authorized existing Supabase project** using approved migration workflow, without modifying old rows. Verify exact IDs and hashes.
4. [ ] Verify cabinet test flow and Insights report for both languages; private Google sign-in and existing RLS, no public answers.
5. [ ] Deploy exact approved head to existing Vercel project after Hobby build quota resets; do not pay to upgrade without authorization.
6. [ ] Verify production READY and alias for `holistichouse.vercel.app`, test EN/RU page and 8 links on mobile/desktop. Confirm no public indexing of private /client/tests screens.

**Source branch or merged code alone is NOT a live release.**
