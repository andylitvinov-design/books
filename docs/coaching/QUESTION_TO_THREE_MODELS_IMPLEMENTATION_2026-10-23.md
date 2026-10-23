# Holistic House · Coaching request → three models · 2026-10-23

## UX decision

Extend the **existing** independent Personal Coaching Session at `/{en|ru}/app/coaching`. No second app, no new CRM client-contact table, no alternate 90-day programme. The Academy, My Courses, My Development Path and Business landing link to this existing authenticated course.

**Client flow:** type a question (8–600 chars) → choose an estimated 10/20/30 minute pace → press **Find three coaching approaches** → review **three distinct models**, their named fit and clear caution → choose any one → only then the client question and exact versioned scheme key are stored in the existing account-owned, AES-GCM-encrypted `app_private.personal_coaching_sessions`. The chosen model's actual DB question sequence is shown one question per screen; the same encrypted owner record stores answers, completion, history, delete and export. No booking, appointment, payment, qualified lead or practitioner message occurs on button click.

### Catalog: source of truth

`app_private.coaching_models`: adds `selection_comment_i18n`, `selection_caution_i18n`, `example_questions_i18n` for **all ten currently registered models**, including independently authored Egyptian and Greek variants (their unpublished schemes remain unpublished).

`app_private.coaching_intent_signals`: 19 translated topic labels and language-specific word/phrase stems for `goal, decision, business, career, relationships, conflict, communication, money, confidence, stuck, habits, procrastination, motivation, leadership, productivity, growth, transition, unclear, creativity`. RLS enabled; `anon` and `authenticated` have NO direct access; `hh_app_backend` SELECT only.

`/api/app/personal-coaching-catalog` is a server-side **authenticated**, exact-account-scoped, no-cache GET returning published schemes, model guidance, stage questions, versioned answer choices and non-sensitive intent hints. No raw client question is sent to this GET. The browser performs deterministic phrase/stem matching locally and ranks eligible published schemes by **editorially weighted topic specificity**, preferred model keys, time and preferred short flow. These priorities are maintained in `20261023203700_hh_coaching_topic_fit_weights.sql`: a specific procrastination request favors WOOP over a generic goal mention, and a leadership question favors FUEL over CLEAR. It displays 3 **distinct model families**. Unmatched alternatives are labeled **alternative**, never incorrectly claimed personalized; fully unknown questions get three neutral starting approaches and manual catalog option. The client can override the suggestions.

**Example question → recommended first model:**

| Request (language examples) | Suggested first | Why |
|---|---|---|
| Я откладываю дела, не могу начать / How do I stop procrastinating? | WOOP | Repeating habit plus inner obstacle |
| Как поговорить с партнёром без конфликта? | CLEAR | Relationship conversation and conflict |
| How can I delegate better as a manager? | FUEL | Professional leadership behavior |
| Не знаю, чего хочу / I'm confused what my focus is | TGROW | Topic discovery before goal |
| Хочу конкретную цель на работе / I need a clear next step | GROW | Goal, options, practical action |
| Застрял и не верю, что получится / I feel stuck | OSKAR / Solution-Focused | Strengths, exceptions, small change |
| New project from my strengths / как создать проект? | Appreciative 5D when published and relevant | Strength-based redesign |

The table shows editorial examples, not validated topic diagnosis, financial advice or promise of outcomes. **WOOP** last step requires a personally authored if–then plan to avoid claiming an incomplete exercise as full WOOP. Old seven-step GROW sessions with no `schemeKey` remain readable and editable in their original order.

### Privacy, boundaries, and mobile

- Typed client question is analyzed **in the browser**. It is NOT sent to LLM, analytics, pixel, ad attribution, messenger or speech provider; after client selects a scheme, only existing verified account POST persists the question encrypted with owner-specific AAD and revision control.
- Unauthenticated user cannot use private catalog or see personal answers; Google-authenticated client chooses and saves after explicit action. Current private course supports EN/RU; ES labels are available in the content library, but ES private cabinet is not yet released.
- Screening for explicit immediate-danger phrases suppresses recommendations and directs to local emergency/help resources without exposing client input; this is a cautious UX guard, NOT medical triage.
- One question per slide with 2–8 authored options (or 0–10 subjective self-rating), optional editable text alternative; a custom WOOP plan must be written in the last step. Prompt questions are original Holistic House paraphrases.
- Do not introduce extra paid LLM/STT, external messaging, emails, video, ads or new client health/test assessment records. Future optional device speaker/microphone per [#1701](https://github.com/andylitvinov-design/books/issues/1701) requires separate E2E.

### Files and release

- DB: `supabase/migrations/20261023203500_hh_coaching_model_fit_comments.sql`,
  `20261023203600_hh_coaching_request_signals.sql`.
- Backend: `lib/app/personal-coaching-catalog.js`, extended `lib/app/personal-coaching.js` and private API route.
- Client: `lib/personal-coaching/model-matcher.js`, `components/app/personal-coaching-picker.jsx`, updated existing coaching screen/CSS and course CTAs.
- Automated tests: `tests/personal-coaching-model-selection.test.mjs`, existing `tests/personal-coaching-session.test.mjs`, dedicated GHA workflow.
- Final QA must include 10/19 DB counts, all references, denied `anon` privileges, logged-in account save → reload → resume → finish → encrypted export/delete, cross-account RLS denial, EN/RU/ES editorial review, physical mobile 320/390/430 iPhone Safari, actual deployment SHA and canonical alias. Without those, report implementation **not fully E2E verified**.
