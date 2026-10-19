# Check-in measurement and report-quality pass — 19 October 2026

## Status and scope

**Implemented in application code:** dimension-aware report focus, provenance-gated personalized reflection for eligible original Holistic House multi-axis check-ins, and explicit statement that authored questionnaires have not undergone independent psychometric validation. Historical source definitions, response answers, scoring algorithms, stored immutable interpretations, rights gates and client history have not been altered.

**Not completed by this software change:** independent clinical/psychometric validation of item meaning, respondent comprehension, test–retest reliability, measurement error, sensitivity to change or EN/RU measurement equivalence. Do not mark a form `validated` from mathematical code tests. Do not silently enable Spanish-language administration based on translated reporting text.

### Baseline, not a certification

The 18 October 2026 read-only inventory (`full-library-technical-quality-audit-2026-10-18.md`) recorded 145 active method keys, 230 registered immutable EN/RU versions, 73 Holistic House original tools, 72 published-source candidates and 417 scored dimensions. The structural/scoring audit found no orphaned scale items, reverse-key omissions or declared-range mismatches. Those pass results **do not** answer whether each question actually measures the proposed construct.

## Changes to assessment and analysis

1. **Polarity matters:** the report and compact preview prioritize a higher reported burden **or** a lower reported resource, using each scale's own source bounds. Neutral traits are not treated as deficiencies. Exact published clinical follow-up flags retain precedence. The ordering is a presentation heuristic, **not a new composite, norm, percentile, diagnostic threshold or validity score**.
2. **Answer-linked summary:** for eligible original HH multi-axis check-ins, the report names a concrete scored domain for reflection, optionally a stronger separately measured resource, and prints the source score with its bounds. The text refuses claims of an overall health index or reliable change and only appears after immutable provenance and score verification. Never infer a syndrome, cause, efficacy or clinical severity from cross-domain ranking.
3. **Status copy:** eligible original self-report questionnaires are explicitly described as not independently psychometrically validated. Published-source forms continue to use their separate scale/version/language evidence gates.
4. **Non-destructive migration:** v1/v2 test definitions and hashes, prior responses and version-specific score interpretations stay byte-identical. Existing reports may display the safer new reflection and priorities without rewriting scores.

## Priority content-level revision queue

| Family | Concrete defect / review | Required next version |
| --- | --- | --- |
| `hh-current-state` v1/v2 | Five **different** direct 0–10 ratings: problem intensity, energy/support, tension, fatigue, everyday impact | Keep five separate values; expert review of each item's single construct, anchors and “right now” recall frame. Avoid any single mental-health score. Only create v3 after approval |
| `hh-weekly-pulse` v1 | Eight separate 7-day ratings covering state, symptom load, resources and function | Keep eight independent dimensions; check whether the “overall”/“past week” recall is understood consistently. No arbitrary sum or common Cronbach alpha |
| `hh-felt-safety` v1 | A mixed mean combines sensing, comfort and interpersonal choice | Follow separately proposed three-domain v2 in `author-tool-content-revision-candidates-2026-10-18.md`, including genuine **not applicable** and 2-of-3 completeness; requires human review and interviews before registration |
| `hh-body-mind-context` v1 | Averaging sensation observation, causal guessing, impact and healthcare-navigation knowledge can imply a medical conclusion | Follow proposed separate observation/context domains; make medical-information prompts unscored; require applicability gate and reviewed wording |
| `hh-money-pressure`, `hh-overthinking-loop`, `hh-screen-saturation` | Mixed-polarity v1 items were split in active immutable v2 definitions, but no new psychometric calibration exists | Keep v1 and v2 **incomparable**; review each v2 subdomain independently and do not assign clinical severity thresholds |
| Remaining original HH check-ins | Broad variety of topics; item count and construct coherence differ | Audit **every** source question against exactly one declared construct, observation period, response anchor, skip opportunity and interpretation. Create a new immutable form version only when reviewers approve |

## Release gates for a claim of improved measurement validity

- **Item content:** independent qualified reviewer evaluates relevance, comprehensiveness, comprehensibility, double-barrelled or leading wording, recall period, direction, sensitive context and correct missing/not-applicable handling **for each item and dimension**, including the EN and RU originals.
- **User comprehension:** voluntary, consented cognitive interviews with target-language respondents; record confusing items and iterate. Translation is adaptation, not just a literal rewrite (ITC).
- **Quantitative validation:** preregistered, consented pilot; evaluate appropriate dimensionality and internal consistency **only for plausible multi-item subscales**, test–retest reliability, measurement error and responsiveness against external anchors. Do not invent SEM, RCI, alpha, expected improvements, percentiles or cutoffs. Different purposes/populations may require different evidence (COSMIN).
- **Rights and safety:** exact form, owner authorization and reporting use verified before opening new versions. Safety-sensitive prompts are managed separately; never promise diagnosis/treatment or infer immediate risk from a general check-in.
- **Shipping:** register approved future versions additively; pin source hashes, scorer and interpretation; preserve old history; reset baseline whenever a changed construct/version is incomparable; test EN/RU, accessibility, iPhone/browser, PDF, account/My Tests, and all verification workflows. Confirm exact production SHA, Vercel READY, and real public/signed-in readback before calling live.

References: [COSMIN 2024 guidelines](https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/), [ITC Test Adaptation Guidelines](https://www.intestcom.org/page/14).

## Concrete next-form drafts (NOT active, NOT validated)

The following candidate questions show how a new **immutable** version could remove construct ambiguity. They are **not** substitutes for respondent interviews or exact-form validation and must not be deployed through an in-place edit of v1/v2.

### `hh-current-state` candidate v3

Question frame: **“How is it for you right now?” / «Как это ощущается прямо сейчас?»**. Each independent 0–10 slider uses source-exact anchors, **0 = none/not at all**, **10 = strongest possible for me**. Use “not applicable” where the described opportunity is absent; do not score it as zero.

| Independent axis | Candidate English question | Кандидат на русском | What NOT to infer |
| --- | --- | --- | --- |
| Main difficulty | “How strong is the main difficulty you want to focus on right now?” | «Насколько сильна главная трудность, на которой вы хотите сосредоточиться сейчас?» | Not a diagnostic symptom category |
| Inner tension | “How strong is your inner tension right now?” | «Насколько сильное внутреннее напряжение вы сейчас ощущаете?» | Not proof of an anxiety disorder |
| Body tiredness | “How tired does your body feel right now?” | «Насколько ваше тело сейчас утомлено?» | Not the cause of fatigue |
| Available energy | “How much energy is available for your next small task?” | «Сколько сил сейчас есть для одного небольшого дела?» | Not internal support or self-esteem |
| Felt support | “How supported do you feel right now?” | «Насколько вы сейчас ощущаете поддержку?» | Not a social-network count |
| Everyday interference | “How much is this difficulty limiting what you planned to do today?” | «Насколько эта трудность мешает вашим планам на сегодня?» | Not the cause of lost function; allow non-applicability |

The current v1/v2 **resource** item combines “energy and inner support”, so candidate v3 separates them into two single constructs. **No v2 resource score can be compared directly** with either new axis. Other similarly worded items still require version/translation review before a comparison bridge could be justified.

### `hh-weekly-pulse` candidate v2

Use one consistent **“During the past seven days” / «За последние семь дней»** lead-in for *each* independently reported dimension. Keep mood, tension, stress burden, restorative sleep/rest, energy, mental clarity, connection and functioning distinct. Avoid “overall psychic health”, “burnout score”, or a health percentage. A 0–10 rating is a **single response**, not a validated multi-item clinical measurement. Instruct the respondent to consider the *typical week* rather than letting a single exceptional day dominate; test in interviews whether “typical” is understood. Provide optional context (what helped, important stressor, whether the week was unusual), with privacy controls and no automatic diagnosis from free text.

### Analysis contract for every check-in

- Display an **individual dimension** with its anchor meaning, period, actual reported value and optional situation. Do not sum incomparable constructs or average opposing valences.
- Follow-ups ask about **one concrete example and one exception**, not a psychological label. Separate symptom difficulty from available resources and function.
- Present trends only for **identical verified versions/translation/scorer/timeframe**. Two values yield a numeric difference, not confirmed improvement; three or more values may reveal a *descriptive* pattern, still without causal proof or measurement-error-based significance.
- For check-ins administered before/after a lesson, explicitly disclose that the comparison is **self-reported momentary experience**, not independent proof that the practice worked.
- Use the published scale's exact cutoffs only for the exact allowed instrument version; leave authored tools non-diagnostic. Show appropriate human help language for concerning symptoms without classifying a single score as danger or normality.
