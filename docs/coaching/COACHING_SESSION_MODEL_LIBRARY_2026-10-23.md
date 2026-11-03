# Holistic House · Coaching Session Model Library v1

**Status:** Versioned reference library + deterministic suggestion contract. **Not yet a playable course.**  
**Issue:** [#1703](https://github.com/andylitvinov-design/books/issues/1703)  
**Project:** Holistic House CA Central, `app_private`; `codex/public-book-library` production integration branch.  
**Date:** 2026-10-23. Content authored as original self-coaching adaptations.

## Design premise

Do not prolong the 90-day Business & Career course or overwrite its `app_private.business_coaching_programs` encrypted record. A future independent **Personal Coaching Session** will pick a scheme once by versioned key, show one question per screen, offer read-aloud and optional speech-to-text, and save answers only in a verified account-owned encrypted journal through existing course infrastructure. No new personal-health/CRM records, external messenger forwarding, unapproved speech APIs, payments, or video renders.

## Normalized reference entities

| Database object | Purpose | Relationships |
|---|---|---|
| `app_private.coaching_models` | Framework name, emphasis, limits, source and eligible topics | `model_key` versioned |
| `app_private.coaching_schemes` | One ordered quick/reflective flow, estimated minutes and result | `model_key`, ordered `step_keys` |
| `app_private.coaching_steps` | Stage name and emphasis, **key reflective prompt** | Composite `(model_key, step_key)` |
| `app_private.coaching_questions` | One primary closed-answer/0–10 question per stage | `(model_key, step_key)`, `answer_set_key` |
| `app_private.coaching_answer_sets` | Reusable stable-choice options translated EN/RU/ES | `answer_set_key` |
| `app_private.recommend_coaching_schemes` | Deterministic ranking of suitable published schemes | Topics, minutes, answer style |

Each framework, scheme, question and option set is identified by a stable `_v1` key. Editing approved content later requires `_v2` and preserving old sessions by pinned key. The model, step, scheme, prompt, and option display copy uses EN/RU/ES values, never machine translates sensitive answers. Sources are metadata, not a claim of endorsement/validation.

## Model coverage and flow

| Model | Main coaching accent | Stages | Variants | Example request |
|---|---|---|---|---|
| GROW | Client-owned goal and actionable options | Frame → Goal → Reality → Options → Will → Review | Quick 10 min (core 4); reflective 25 min | I need to choose a concrete next step |
| TGROW | First identify the topic | Topic → Goal → Reality → Options → Will | 20 min | I don't know where to start |
| OSKAR | Resourcefulness and signs of progress | Outcome → Scaling → Know-how → Affirm & act → Review | 20 min | I am stuck and want to notice resources |
| CLEAR | A respectful reflective conversation | Contract → Listen → Explore → Action → Review | Reflective 25 min | A difficult personal or professional conversation |
| FUEL | Behavioral change at work | Frame → Understand → Explore → Plan | Reflective 25 min | Leadership, professional development |
| Solution-Focused | Preferred future and exceptions | Preferred future → Exceptions → Scale → Resources → Step | Quick 12 min (3 stages); reflective 25 min | I need movement without revisiting the whole problem |
| WOOP | Specific wish and if–then planning | Wish → Outcome → Inner obstacle → Plan | Quick 10 min | I'm procrastinating on one habit |
| Appreciative Inquiry 5D | Strengths, design and experimentation | Define → Discover → Dream → Design → Deliver | Reflective 30 min | Positive change in work or team |

WOOP is **not faithfully completed with closed answers alone**: after those screens require an optional **person-authored** concrete *if X occurs, then I will Y* plan; the scheme has `required_custom_plan=true`. The individual 5D exercise is an adaptation of an organizational method, not its validated form.

## Representative key prompts and selection options

- **GROW · Goal:** "Какой признак прогресса для вас важнее всего?" → `visible_result | greater_clarity | better_talk | repeatable_step | unsure`. Complementary reflective prompt: "По чему вы поймёте, что приблизились к своей цели?"
- **TGROW · Topic:** "К какой области относится ваш запрос?" → `work | relationships | personal | team | unsure`.
- **OSKAR · Scaling:** "Выберите своё текущее число от 0 до 10" → `scale_0_10`. Scale is *personal*, never a clinical or psychometric measurement.
- **CLEAR · Action:** "Какой шаг зависит от вас?" → `two_minutes | schedule | ask | prepare | pause`.
- **FUEL · Understand:** "Какое ограничение важнее сейчас?" → `time | clarity | confidence | resources | other`.
- **Solution-Focused · Exceptions:** "Что помогало в более удачные дни?" → `experience | skills | people | time | uncertain`.
- **WOOP · Obstacle:** "Какой паттерн узнаёте чаще всего?" → `delay | distraction | doubt | fatigue | unclear`.
- **5D · Design:** "Что вы изменили бы сначала?" → `routine | process | team | goal | unsure`.

All choices have equivalent EN/RU/ES labels. The question is one idea per slide. A **small optional** `Other / type or dictate` field may supplement, but never replace, the authored choices; no speech recording/third-party transcription or microphone access is included in this library.

## Matching policy

Input is **only explicitly selected non-sensitive concern tags**, approximate available time, and short/reflective preference. Recommended list is ranked by overlapping topic tags (+10 per tag), time fit (+3 if within duration, otherwise a penalty), and preferred style (+3). It returns **scheme/model IDs + matched topics**, not a psychological diagnosis. A relevance guard excludes schemes with zero overlapping topics; if nothing matches, show the neutral manual catalog instead of inventing personalization. Client may override and select any published scheme.

Examples:

| Client selects | Suggested family | Explanation |
|---|---|---|
| goal + decision, 10 min | GROW quick | Goal/action focus and short time |
| procrastination + habits, 10 min | WOOP | Obstacle–action experiment |
| conflict + relationships, reflective | CLEAR | Agreements, listening, respectful action |
| leadership + career, reflective | FUEL | Work behavior and success planning |
| unclear + transition | TGROW | First establish the topic |
| stuck + confidence, quick | OSKAR or Solution Focus | Recognize what works and small changes |

Use actual database function output, not the hardcoded examples above, for on-site rankings:

```sql
SELECT * FROM app_private.recommend_coaching_schemes(
  ARRAY['procrastination','habits'], 10, 'quick', 3
);
```

Retrieve an ordered scheme with safe bind parameters using an account-authenticated **server** route:

```sql
SELECT s.scheme_key, s.estimated_minutes, ord.step_order,
       m.name_i18n, st.title_i18n, st.emphasis_i18n,
       st.key_question_i18n, q.question_key, q.prompt_i18n,
       q.answer_type, a.choices
FROM app_private.coaching_schemes s
JOIN app_private.coaching_models m ON m.model_key = s.model_key
JOIN LATERAL unnest(s.step_keys) WITH ORDINALITY AS ord(step_key, step_order) ON true
JOIN app_private.coaching_steps st
  ON st.model_key = s.model_key AND st.step_key = ord.step_key
JOIN app_private.coaching_questions q
  ON q.model_key = st.model_key AND q.step_key = st.step_key
LEFT JOIN app_private.coaching_answer_sets a
  ON a.answer_set_key = q.answer_set_key
WHERE s.scheme_key = $1 AND s.published = true
ORDER BY ord.step_order, q.position;
```

### Security, integrity and scope

- Reference catalog in private schema, all five tables RLS ON. Explicitly revoke `anon`/`authenticated`; **SELECT only** to `hh_app_backend`. Backend-only search function with `SECURITY INVOKER`. Do not grant anonymous REST access or expose `app_private`.
- No client answer, voice transcript, diagnosis, private goals or profile info in reference catalog or model-selection telemetry. Signed-in answers require a separate owner-scoped encryption and consent E2E.
- None of these frameworks are presented as clinical therapies or normed psychological tests, and no guaranteed income/health change. Avoid asking for detailed health data; crisis/safety scenarios should not be handled by this independent self-coaching picker.
- Editorial review of nuances/translations (particularly 5D and WOOP) required prior to public course use.

### Provenance / reading list

1. Canada School of Public Service, [Using the GROW Model](https://www.csps-efpc.gc.ca/tools/jobaids/grow-model-eng.aspx), 2020.
2. Adaptation of topic-first GROW, [health coaching conceptual report](https://pmc.ncbi.nlm.nih.gov/articles/PMC3662442/).
3. Mark McKergow and Paul Z Jackson, [OSKAR model](https://sfwork.com/oskar-coaching).
4. Leadership Centre, [Hawkins's CLEAR coaching](https://www.leadershipcentre.org.uk/artofchangemaking/theory/transformational-coaching-the-clear-model/).
5. NYU Coaching for Leadership, [FUEL model](https://wp.nyu.edu/coaching/tools/fuel-model/).
6. [Solution-focused approaches literature](https://pmc.ncbi.nlm.nih.gov/articles/PMC10098109/).
7. Gabriele Oettingen's [WOOP official practice](https://woopmylife.org/en/practice).
8. [Center for Appreciative Inquiry](https://centerforappreciativeinquiry.net/faqs/) and original 5-D tradition.

No reproduced proprietary question bank. Each question is HH-authored, grounded in stage purpose. The methodology and presence of a known name do not validate a digital self-coaching instrument.

### Acceptance and rollout

1. Verify deployment branch/SHA before merge; migrations additive and idempotent; apply only to Holistic House CA Central `shervdixkaxurnaecioe`.
2. SQL check 8 models, 10 schemes, 39 steps, 39 closed/scale questions, 13 shared answer sets. Check no broken step/answer links, translated fields, personal-data absence.
3. Check RLS + grants, deterministic suggestions, and existing encrypted coaching/course tables untouched.
4. Unit and migration checks, CI, PR review, Vercel READY and alias commit. Catalog is **data-only**; not an accessible new Personal Coaching Session until its separate player, signed-in save/restore, microphone opt-in and iPhone EN/RU/ES E2E are implemented and verified.
