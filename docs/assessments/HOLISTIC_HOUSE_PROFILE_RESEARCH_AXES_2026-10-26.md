# Holistic House — 4 life profiles → 9 topics → 31 research axes → registered source scores

**Source-only classification and scientific-review handoff, 26 October 2026.** Related: [#1223](https://github.com/andylitvinov-design/books/issues/1223), [#1881](https://github.com/andylitvinov-design/books/issues/1881), and [#342](https://github.com/andylitvinov-design/books/issues/342). The classification work **does not** establish independent psychometric validity for the 73 original HH questionnaires.

## What each level means

- **Profile:** one of four life-area interests: Body/Wellbeing, Relationships, Work/Business/Money, Personality/Growth. These are not clinical diagnoses, nor the separate cabinet domains Psychological / Homeopathy / Wu Xing / Hypnotherapy.
- **Topic:** one of nine existing categories, selected by the visitor.
- **Research axis:** a question/facet of interest. It groups genuine source-scored dimensions. An axis is not a newly invented score, normative target, clinical percentile or standalone test.
- **Questionnaire scale:** exact original score dimension, identified by **test key + dimension key + method version**. A complete questionnaire must be administered. Results across different instruments, versions, directions or languages are not automatically interchangeable.
- **Eligibility:** only rights-cleared, startable, guest-eligible, starter-eligible, free and explicitly permitted methods can enter the public test battery. Other account methods retain their categories without becoming guest tests.

## The agreed taxonomy, backed by actual source methods

| Life profile | Topics | Research axes (all have at least one account-catalogue source) |
|---|---|---|
| Body / Wellbeing | Emotions | Perceived stress, anxiety/worry, mood, emotional regulation |
| Body / Wellbeing | Recovery | Sleep/rest, energy/fatigue |
| Body / Wellbeing | Body | Body presence/awareness, body-related comfort and energy |
| Relationships | Connection | Social contact/support, emotional closeness, boundaries/consent-related self-report, sexual self-acceptance, descriptive interpersonal traits |
| Work / Business / Money | Work | Attention/focus, clarity/decisions, everyday functioning (not job performance), explicitly occupational strain, work-related personality tendencies |
| Work / Business / Money | Money | Source-specific financial well-being, money pressure, money-related coping |
| Personality / Growth | Traits | Big Five extraversion, agreeableness, conscientiousness, emotional reactivity/stability, openness; other strengths; exploratory typologies (not independently validated) |
| Personality / Growth | Support | Perceived resources/resilience, self-support/self-compassion |
| Personality / Growth | Meaning | Values and sense of direction |

**8 + 5 + 8 + 10 = 31 research axes across 9 topics and 4 interests.** Exact EN/RU/ES labels and allowed scorer axis keys live in the one canonical mapping: [profile-scale-selection.js](../../lib/profile/profile-scale-selection.js).

### Concrete source links and boundaries

- Big Five: Mini-IPIP-20 provides exact source dimensions for five distinct traits. IPIP-50 and TIPI-10 can provide alternatives only under the same named facet; their score directions/values are never merged or assumed equivalent. VIA and the IPIP Empathic Concern scale are **other constructs**, not automatically Extraversion.
- Wellbeing: GAD-7 and HH Uncertainty Flexibility map to anxiety; PHQ-4 has distinct mood/anxiety dimensions; ERQ and HH Emotion Clarity concern emotion regulation; HH Weekly Pulse provides source-specific mood, stress, rest, energy and connection ratings.
- Body: body awareness is based on appropriately recorded source scales (including HH Body Signals/Tantra Presence where access allows it). General energy-only tests do **not** become measurements of body awareness.
- Relationships: HH Intimacy Consent, HH Emotional Intimacy and HH Sexual Self-Kindness remain account-only/sensitive under the existing rules. Empathy/compassion and explicitly interpersonal VIA facets may describe social traits but cannot predict relationships or prove consent.
- Work: HH Focus Mode concerns reported task focus; HH Goal Obstacles and Sustainable Pace concern daily functioning; CBI-Work/HH Workload Weather concern work strain. K6 general distress and HH Money Pressure are not labelled as workplace-burnout scales.
- Finance: CFPB-5 has its exact financial well-being dimension; HH Money Pressure has two separate authored dimensions (difficulty and coping). **No finance-specific method is currently permitted in the free public starter battery**, so the Money topic is hidden in that wizard. No surrogate financial score is invented from self-esteem, work satisfaction, stress or resource scores.
- Resources/growth: HH Resource Pulse, self-support methods and values/meaning methods retain exact independent sources. Hobby typologies remain exploratory, explicitly not treated as standardized Big Five measures.

**Important:** shared presentation facets permit looking up potentially relevant *full instruments*, not substituting one test's score for another. All scalar comparisons and course retests must keep existing immutable scorer/provenance guards.

## Reproducible source-only checks and reviewer exports

Run from the repository root, on the exact proposed revision:

- **Verification:** node scripts/audit-profile-construct-links.mjs --verify
- **Full method-to-facet ledger:** node scripts/audit-profile-construct-links.mjs --csv
- **All 73 original HH item rows + potential source-dimension mapping:** node scripts/audit-profile-construct-links.mjs --review-csv
- **Prior authored wording review:** node scripts/audit-hh-author-items-2026.mjs --csv

At the inspected source revision:

| Metric | Count / finding |
|---|---|
| Unique catalogue entries | **295** (each has a source category and authored topic) |
| Source-scored account methods | **147**; linked to at least one real topic and facet, **0 orphan** |
| Free guest-starter scored methods | **40**; linked to at least one real topic and facet, **0 orphan** |
| Research axes with at least one account method | **31 of 31** |
| Topic with no guest-starter finance method | **Money**, hidden in public wizard |
| Account-scoped facet–score links | **355**, including intentionally adjacent interests |
| Guest-starter facet–score links | **87** |
| Reference-only / nonstartable / source-score exclusions | **148**; category kept, no invented scored axis |
| Original HH authored families / EN+RU editions | **73 / 146** |
| Original HH item text review rows | **1,498**, no missing EN/RU source version |
| Items with heuristic editorial flags | **362**, overlapping concerns: double construct 262, applicability 108, anchors 12, recall 3 |
| Rows lacking a *directly configured* item-to-scored-facet join | **262**; leave for manual review (often dedicated scorers), not silently impute or label invalid |

These files use only repository-owned definitions and public metadata. They do **not** read private client records, outcomes, consent logs, CRM, medical information, advertisements or messages. The reviewer CSV includes original HH-authored question text; exports escape spreadsheet formula prefixes. Every item is explicitly **pending independent content review** and **not psychometrically validated**.

## #1223 is still OPEN: scientific gates a software implementation cannot pass alone

1. **Qualified independent construct reviewers** must evaluate all 73 original methods, score/item meaning, comprehensiveness and comprehensibility. Priority sensitive/complex families: HH Body–Mind Context, Current State, Emotional Intimacy, Felt Safety, Intimacy Consent, Sexual Freedom/Inhibition, Sexual Self-Kindness, Tantra Development Levels, Tantra Presence, Tantric Intimacy/Connection, Weekly Pulse. Resolve unjoined item-score links without guessing.
2. **Separately consented EN and RU cognitive interviews** with the intended respondents and careful expert review of cultural equivalence. ES questionnaire content is **not** independently adapted merely because interface labels are localized.
3. **Prospectively specified psychometric research**, where suitable: content validity first; dimensionality/structural validity, reliability, measurement error, responsiveness, reference/change anchors, invariance as appropriate. A one-question self-report cannot support internal-consistency Cronbach alpha. Never invent norms or clinical percentiles.
4. **Versioned reviewed changes** to questions/anchors/scorers, only after experts approve and appropriate consented research supports them. Preserve existing immutable private results; never rewrite historical baselines, silently import guest answers or run research on clients without research-specific informed consent.
5. **Authorized E2E after a future *questionnaire revision*:** rights #342, permission checks, database RLS, report/PDF, source/version proof, real Google login and private saved plans, mobile EN/RU/ES, actual iPhone/VoiceOver, CI and exact live Vercel SHA. No paid API or real client-data study was authorized by this taxonomy change.

Guidance: [COSMIN 2024 v2](https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/) prioritizes content validity (relevance, comprehensiveness, comprehensibility), then other measurement properties; the [ITC adaptation guidelines](https://members.intestcom.org/files/guideline_test_adaptation_2ed.pdf) require separate evidence for score comparability across cultures/languages.

Do not close #1223 solely because the taxonomy, software tests or production build pass. The scientifically honest status is **classification implementation completed; validation pending qualified independent reviewers and appropriately consented empirical studies**.
