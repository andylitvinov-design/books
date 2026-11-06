# Holistic House — Cross-media Request Matching v2 · 2026-10-28

## Objective and non-negotiable scope
A visitor's chosen question should surface genuinely relevant **existing** guided meditations and **existing published services**, with separate eligibility gates and reasons. This is a transparent **topic-matching tool**, not a clinical assessment, psychological treatment recommendation, predicted effectiveness, conversion probability or guarantee.

**Reuse, do not duplicate:** `HolisticMeditationFinder` / `HolisticMeditationGallery`, the source-backed original YouTube inventory, public Supabase meditation RLS feed, `ServicesSmartDiscovery`, `rankDiscoveryServices`, and `coreServiceOffers(locale)`. No client answers stored or copied to URL, AI provider, CRM, pixels, logs or messenger. Clicking a service details link is not a lead or booking.

## Parameter hierarchy

| Layer | Request input | Rule |
| --- | --- | --- |
| 1 · primary intention | Money, energy, relationships, goals, meaning | Primary topic dominates. No indirect use of self-test results or assumed diagnoses. |
| 2 · concrete situation | Up to 14 explicitly selected situations such as money worries, business decision, difficulty sleeping, relationship tension | Strong relevance signal. A goal-only match is **not exact** when the situation is missing. |
| 3 · desired experiential state | 15 chosen outcomes e.g. calm, focus, self-compassion, clarity, connection | Must match separately from domain. No promised efficacy. |
| 4 · preferred method | 11 techniques e.g. breathing, body scan, imagery, yoga nidra, loving kindness, symbolic energywork | Explicit preference contributes to matching and transparency. |
| 5 · hard video constraints | Original audio language EN/RU/ES, approved source/rights, length (verified/approximate), source type, spirituality, experience, intensity, posture, soundtrack | Unavailable, invalid, unverified or inconsistent videos are excluded; title-only duration requires explicit opt-in and is labelled approximate. |
| 6 · hard service constraints | Existing localized published service, verified route, free-only request, service availability/status, locale, online/in-person and confirmed numeric EUR budget in the marketplace | No fabricated appointment, provider, price, "from" upper bound or free service. Paid offers appear only as optional details. |
| 7 · sorting and reason | Goal + coverage of user-selected situation, state, technique; source quality tie | Return exact / partial / topic / related with actual matching facets; do not show a made-up percentage of clinical improvement. |

## v2 relevance scoring (deterministic; local)
- +52 for explicit goal intersection, plus up to +12 for that source's **topic relevance weighting**, never its popularity or commercial value.
- Up to +38 for coverage of selected situations, up to +23 for desired states, up to +13 for techniques; each explicitly selected group must have at least one matching tag to earn **exact**.
- Broad-tag penalty (3 per extra goal) so general "all topics" content does not crowd out a clearly relevant recording. Hard constraints filter **before** ranking.
- Match labels:
  - **Exact**: goal and every non-empty preference dimension matched.
  - **Partial**: goal matched plus some (not all) non-empty specific dimensions matched.
  - **Topic**: goal matched and no specific dimensions selected.
  - **Related**: goal only with no requested situation/state/method coverage, or broader fallback explicitly allowed; never presented as a full match.
- Service format uses **the same evaluator** but separately hand-authored offer-specific scope metadata for five actually published core offers; general free situation review is labelled related rather than narrowly specialized. Free-only removes paid options entirely. No payment-weighted ranking.

## Checked examples
1. **Money, money worries, calm, EN**: external link-only YouTube meditation about financial worry can match exactly; original YouTube link only, not in-site iframe. Business-strategy session can be shown separately as optional broad offer, never as "free" or automatically booked.
2. **Money, hard decision, confidence**: money-worry meditation is **related**, not exact; with "exact only" enabled, it is not offered.
3. **Love, relationship tension, reflection**: only published offers explicitly tagged for the topic qualify; a finance course or Reiki session is not padded into a focused recommendation.
4. **Short session + secular voice only**: videos with unknown duration/style/voice cannot pretend to satisfy strict preferences. Unverified title duration is never included unless visitor separately enables approximate lengths.
5. **"Not Reiki; looking for business"**: negation and word boundaries remove explicitly rejected Reiki from search, including Russian and Spanish analogues; unrelated words do not become matches by substring.
6. **Budget ≤ €50**: a service priced "from €50" or "contact us" is not assumed to fit a hard maximum. Fixed confirmed EUR prices and genuinely free services only.

## Source and privacy gates
- `CLIENT_SERVICE_FITS` only describes the scope of IDs from `coreServiceOffers(locale)` and cannot create an offer. The local finder links only to actual `/{locale}/services/...` pages and neither submits a booking nor calls external APIs.
- A meditation is playable on our site only if previously published in the owner original source inventory, or independently approved with rights/content/embed checks. Five separately metadata-checked external third-party links continue to open original YouTube. 15 unreviewed external candidates remain hidden by public RLS; no new SQL migration or provider budget.
- The user can expand **Additional preferences**, select exact-only and estimated-length controls, and optionally choose **Free services only**. Default experience remains compact on 320–430px.
- Avoid diagnosis or guarantees from homeopathy, energywork or meditations. Exclude high-claims material from public recommendations unless legitimately reviewed and policy-approved, and show no misleading healthcare assessment.

## Evidence and unfinished gates
- Source: `lib/holistic-support/client-intent-model.mjs`, `meditation-catalog-ranker.mjs`, `lib/practitioners/discovery-intent.js`, existing client interfaces.
- Tests: `tests/client-request-relevance-v2.test.mjs` and existing service/media/goal regressions, with the dedicated GitHub workflow `meditation-catalog-checks.yml`.
- No database migrations, no new paid external AI, no sensitive data persisted.
- Deploy only after targeted unit, lint, TypeScript, Next production build, actual Vercel READY SHA/alias, and canonical EN/RU/ES page checks. Real phone click/YouTube playback remains separate if not verifiable; do not call it completed by a screenshot/HTTP 200.
