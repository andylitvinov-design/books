# Coaching Lounge topic-first model groups · 24 Oct 2026

## Goal & existing architecture
Extend the EXISTING public `/[locale]/coaching` Coaching Lounge, shared versioned `app_private.coaching_*` catalog, one-question guest runner, owner-encrypted Personal Coaching, and dedicated session detail pages. Do not create new chatbots, paid AI, duplicate account stores or unconsented leads.

**Visitor flow:** choose an overarching topic FIRST → optional specific topic / duration / format → see distinct *schemes* (model, result, time, free/paid) → Details → dedicated session page or Start → one question per screen → user-editable recap and optional personal action. The first topic selection must be visible before format and question in EN/RU/ES, remain legible on iPhone 320–430px, and preserve deep links `?start=schemeKey`.

## Curated topic taxonomy (not diagnosis)
| Topic / RU | Includes | Method families & examples |
|---|---|---|
| Business & career / Бизнес и карьера | Business, career, leadership, productivity | GROW goal, FUEL workplace changes, Appreciative Inquiry 5D |
| Money / Деньги | Money, budgeting | Existing GROW planning; new WOOP money habits, OSKAR money confidence |
| Relationships / Отношения | Relationships, conflict | Existing CLEAR, OSKAR; new quick Solution-Focused relationship clarity |
| Health & wellbeing / Здоровье и ресурс | Wellbeing, nonclinical stress, daily sleep routines | New WOOP wellbeing routine, OSKAR resources; do not diagnose or prescribe |
| Sexuality & intimacy 18+ / Сексуальность 18+ | Sexuality, consent, desire, boundaries, non-explicit intimacy | New Tantra deep reflection, Tantra consent quick, Tantra desire/presence, CLEAR respectful conversation |
| Personal growth / Личное развитие | Goals, confidence, motivation, transition, creativity | Existing TGROW, 5D, OSKAR, WOOP and author symbolic courses (clearly labeled) |
| All / Все | All reviewed published schemes | All categories without duplicate records |

**Mechanics:** `lib/coaching/coaching-topic-groups.js` is a read-only, localized navigation taxonomy. `coachingSchemeInGroup` filters published schemes by **editorial topic_tags**, never by scores, assumptions, health profile or client analytics. A secondary localized subtopic select contains only signals with matching published schemes. Changing topic resets the subtopic to All. Cards display unique `scheme.name` as the headline and the underlying model and duration as metadata, avoiding apparent duplicate GROW/WOOP/Tantra models.

**Content migration:** `20261024175100_hh_coaching_topic_groups_v1.sql` adds only 8 versioned schemes and 4 intent tags (wellbeing/stress/sleep/budget) to existing reference catalog. It reuses approved steps and questions from prior models and `20261024171100_hh_tantric_intimacy_coaching_v1.sql`; no tables/grants, no runtime provider. Existing edition and courses remain untouched.

## Safeguards
1. **Sexuality 18+**: ANY scheme with the `sexuality` tag (including CLEAR, not only the Tantra model) is behind an explicit per-session guest acknowledgment and signed-in checkbox. Server validates `adultConfirmed===true` for session start. No DOB is recorded. The URL `?start=` deep-link still lands on the same gate.
2. Adult-topic questions are optional **per scheme** without weakening original shared CLEAR questions used for nonsexual topics. Public and private player Skip actions do not pressure users to share; no sexual technique, touch, arousal instructions, nonconsensual influence or explicit media.
3. `Health & wellbeing` is a self-directed behavior/routine reflection, **not medical assessment**. Questions about pain, symptoms or treatment must be directed to appropriate clinical expertise rather than a claimed cure. Money coaching is not personalized financial/investment advice.
4. Browser matching and guest answers remain only in React memory and are never sent to marketers/CRM/message providers. Private answers use the existing server-authenticated, account-owned encryption. No new cross-user access or sharing.
5. A content card, Details click, session Start, completion or consultation CTA is not a lead, booking or payment.

## Verification and release gates
- SQL dry-run on Holistic House CA Central `shervdixkaxurnaecioe` with both migrations inside BEGIN + ROLLBACK: verify FK step joins and topic signals. Do not record database state as changed from a dry-run.
- Focused tests `npm run test:coaching:release`, source JSX parser, public lounge tests, EN/RU/ES, iPhone widths, no empty filtered groups after data is applied. Check existing methods and page/detail deep links.
- Review PR diff, GitHub CI + Vercel preview READY, exact production branch SHA and hostname. Merge only after checks; **apply migrations to CA Central only when age-gated code is live**; verify models, schemes, signals, RLS/private grants and published query in DB.
- Browser E2E: public 18+ gate (direct card and `?start=`), consent false/true server, Back/Skip/Finish, old private session resume, EN/RU/ES. Private signed-in iPhone Safari and second-account isolation are separately unverified unless actual account/browser checks complete.
- Separate provider/spend approval required for LLM coaching, live voice services, remote SMS, notifications, payments, ads or rendering. This delivery adds NONE of them.

Sources: [GROW · Canada School of Public Service](https://www.csps-efpc.gc.ca/tools/jobaids/grow-model-eng.aspx), [WOOP official practice](https://woopmylife.org/en/practice), [Somatica ethics](https://www.somaticainstitute.com/code-of-ethics/), [Wheel of Consent · AASECT](https://www.aasect.org/pro-wheel-consent-professionals).
