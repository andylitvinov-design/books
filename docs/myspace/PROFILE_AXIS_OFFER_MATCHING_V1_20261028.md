# Holistic House — Profile Axis ↔ Offer Matching v1 · 28 October 2026

**Status:** implementation PR; not live-verified until exact-SHA CI, Vercel READY/alias, authenticated client interactions and mobile playback E2E. Related: issues #1881, #2480, #338, #1223.

## Canonical source — no duplicate model

- Four life areas: wellbeing, relationships, work, identity. Goal is a supporting topic under Identity, not a fifth root tab.
- Canonical source of 10 topics and 34 research facets: lib/profile/profile-scale-selection.js.
- Only verified recent private source measurements: lib/profile/portrait-recommendations.js and existing unified-profile/verified-history routines. Four independent layers: foundation, state, life, development.
- Public mediation/relevance: existing meditation-catalog-ranker.mjs, client-intent-model.mjs and 62 catalog filters.
- Original published content: data/core-service-offers.ts, english-guided-meditations.ts and holistic-support-meditations.ts. Do not promote staged YouTube candidates.

## Matching table and roles

| Layer | Key fields | Interpretation |
| --- | --- | --- |
| Life area | wellbeing / relationships / work / identity | Multiple interests |
| Topic | emotions / recovery / body / connection / work / money / traits / support / meaning / goal | One subject, not an aggregate score |
| Research axis | topic::axis_id | One of 34 existing registered facets |
| Measurement | result_id, test_key, dimension_key, definition_version, instrument_locale, measured_at, value/min/max/mode, provenance | Preserve original method and score |
| Voluntary priority | 1–3 axis refs, optional current and desired 0–10 | Personal goal, NOT a questionnaire measurement |
| Offer | canonical id, kind (video/test/course/service), published URL, audio language, free/status, linked axes (strength 1–3) | Many-to-many; multiple axes per offer |
| Match result | relevance score, level, matching refs, presence of source result | Editorial topic relevance, not success probability |

### 34 registered research facets

| Topic | Axis ids |
| --- | --- |
| Emotions (4) | stress, anxiety, mood, regulation |
| Recovery (2) | sleep, energy |
| Body (2) | body_awareness, body_energy |
| Connection (5) | social_connection, intimacy, boundaries, sexual_wellbeing, relational_traits |
| Work (5) | focus, clarity, functioning, workload, working_style |
| Money (3) | financial_wellbeing, money_pressure, financial_coping |
| Traits (7) | extraversion, agreeableness, conscientiousness, emotional_reactivity, openness, other_traits, typologies |
| Support (2) | resources, self_support |
| Meaning (1) | meaning |
| Goal support (3) | clarity, motivation, confidence |

Goal self-ratings and source-scored tests **cannot** be averaged or turned into a shared health percentage. A client can voluntarily select a facet with no prior test, which remains labelled not assessed.

## Transparent rank formula (max 100)

Matching requires at least one explicitly chosen axis. No selection means no personalized offers.

- Base: strength 3 (primary) = 67; 2 (supporting) = 49; 1 (broad) = 30; related-only = 12 (when explicitly enabled).
- Intersection: +13 for every extra selected axis covered, capped at +20.
- Personal 0–10 current-to-desired difference, only when explicitly entered: up to +12.
- Presence of a recent verified source result for a matching axis: +5 independently of whether the original score is high or low.
- Preferred format +8, free content +2.
- Stable deterministic tie-break: video, test, course, service and canonical id. Dedup by canonical id; cap selected axes at three.

The ranking point total is **NOT an estimated therapeutic response, percentile, financial potential or clinical triage**. Do not increase commercial recommendations because a source score is low/high.

## Linked published offer groups

- Video: four confirmed original English teacher videos (Sun Flight, Tantra Reiki, Reiki Yggdrasil, Kundalini Reiki), plus source-verified Russian legacy recordings using weak broad interest tagging only. Direct original video link, not duplicate upload; show actual original sound language.
- Course: existing OPORA 14-day antistress landing and existing Courses/Academy catalogue, with cautious editorial axis links. No unverified 90-day course enrolment.
- Test: four eligible test-directory entry cards spanning all 34 research facets, linking to the original permission-checking test explorer. Never imply that every method is free or scientifically validated.
- Service: actual five published coreServiceOffers entries. The matcher does not supply price, accept payment, create CRM contacts, reserve a time or auto-enrol.
- Public meditations: separate existing 62-filter RLS-linked discovery catalogue remains authoritative. No second media table or unapproved candidate promotion.

## Source interpretation guardrails

Only the exact test key (including guarded finance/self-support source-specific dimension), original dimension, definition version, instrument language and an independently reviewed reference interval could justify a below/within/above reference label. Without that: unknown. Raw score position within the questionnaire scale is not a normative percentile. No averaging across versions, tests, score directions or languages. Descriptive personality traits are not deficiencies; generic stress/resource is not a finance scale; private intimacy/sexual wellbeing does not trigger paid offers. No diagnosis, medication or homeopathy benefit claims.

All matching is browser-local. No health/test results in URL, public Supabase, analytics/pixels, YouTube, CRM, email, Telegram/WhatsApp/push or external AI. No new migrations, authentication flow, external paid calls or media generation in this release. Existing client/guest rights and authorized published catalogs remain in control.

## Expandable editorial video-position fields

Life area; format (soft meditation, energy practice, explanation, lesson); psychological/magical/temple/Reiki/somatic direction; independent temple tradition (Egyptian/Greek/Maya/Aztec/Northern/Slavic); 34-axis crosswalk; client situation; desired state; original audio language; verified duration; intensity; time of day; posture; captions; music/voice; accessibility; sensory warnings; experience level; source/evidence provenance; rights; QA and live playback; linked published personal support offering; currency and payment status; source reviews; opt-in completion.

These should extend issue #2480 media taxonomy and existing editorial records rather than create a parallel catalogue.

## Acceptance and remaining verification

- [x] 34 facets from canonical scale registry, four life areas and source identity preserved.
- [x] Reusable client-only axis-matching panel in My Tests and completed-test insights.
- [x] Multi-axis coverage, self-rated goals, paid/sensitive guard, original media and published offer contracts in test suite.
- [ ] Exact-SHA GitHub CI: unit tests, ESLint, TypeScript and production build.
- [ ] Browser account-owner Google OAuth and cross-account A/B readback; private RLS and no PII in network/pixels.
- [ ] EN/RU/ES × iPhone 320/375/390/430; original recording click/audio; real provider delivery if relevant.
- [ ] Vercel READY, exact branch/commit and canonical domain.

## Shared public video/service finder adapter (PR extension)

The **same axis-offer matching engine** now participates, only when a visitor **manually** chooses a canonical research facet, in the existing public HolisticMeditationFinder and rankClientServices. The 62 existing public filters (situation, desired outcome, technique, original audio language, duration, risk, experience, provenance) remain independent. videoFacetAxisLinks maps already curated video situation/outcome/technique metadata to eligible profile facets; that is **editorial topical overlap**, not a claim to measure or change the test axis. A match reason shows the precise chosen axis.

The meditation catalog ranker applies axis relevance **after** existing editorial/rights, public RLS, language and format playback guards; a match NEVER releases an unapproved candidate. Service URLs remain the same published service routes; no payment intent, CRM writes, personal test scores or client identity arrive at the public finder. The optional axis is chosen anew by a visitor; it is NOT copied from private cabinet results into public URLs.

New shared module has matching TypeScript declarations; existing meditations ranker/service model and public finder reuse the exact registered topic::facet id keys. No new media or CRM table.

**Remaining verification:** exact-head branch test workflow, TypeScript, lint, build, existing meditation filter regressions, 320–430px public finder EN/RU/ES plus signed-in private cabinet E2E and real playback. Preview deploy was intentionally canceled by the current project ignored-build policy; do not bypass budget settings.
