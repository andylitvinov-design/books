# Holistic House · My Course · 14-day course passport & lesson-card passport
**Version:** 1.0 · **Date:** 2026-10-13 · **Status:** Implemented proposal / verify in CI & deployment
**Language:** English interface + Russian interface (original lesson library is bilingual)
**Project:** `andylitvinov-design/books` · deployed app `holistichouse.vercel.app` · route `/{locale}/app/course`

> This is an educational, self-directed personal-practice course, not a diagnosis, medical treatment, psychotherapy session, or guarantee of health improvement. Every practice can be shortened or skipped.

## 1. What already existed and must be preserved

The original approved workflow has six steps:
1. Consent to a private personal course.
2. Choose up to six areas or optionally describe a concern.
3. View five recommended existing questionnaires with match percentages, mark compatible completed results, and edit the selected tests.
4. Complete only the missing tests, saving them in My Tests; previous compatible results are reused.
5. Review the measured profile; suggest three eligible scales from up to seven priority candidates; permit choosing 3–5 measured scales (or available alternatives) manually.
6. Start the 14-day cycle of micro-lessons. Personal course goals are confirmed by the client, not automatically prescribed.

The current content layer includes 84 complete original bilingual lessons: 14 calendar days × six skill tracks (`calm_regulation`, `inner_support`, `emotional_flexibility`, `attention_clarity`, `connection_boundaries`, `energy_agency`). The server rotates among explicitly chosen scales while following the common 14-day progression. The full library is not replaced by generic motivational cards.

Existing daily functionality to preserve:
- Optional self-report for the **past 24 hours**, 0–10: difficulty, optional interference, optional perceived resources, optional private note. Missing days remain blank; lower difficulty is not assumed to follow from course completion.
- Daily thought, teaching, guided exercise, real-life action, optional reflection, private feedback, and completion only when saved.
- Standard / short (about two minutes) guided exercise; optional no-imagery alternative, natural breathing and eyes-open accessibility.
- Optional weekly review on days 7 and 14, a 14-day descriptive chart, a separate Weekly Pulse retest at its own interval, pause/resume, owner-scoped encrypted private storage.
- After day 14: report/history and voluntary new 14-day cycle. An expanded 28-day curriculum must not be promised without reviewed content.

## 2. Course passport (the whole cycle)

| Property | Contract |
|---|---|
| Course ID | `hh-my-course-14d` |
| Audience | Registered client in My Tests / My Course |
| Duration | 14 local calendar days, using the account's saved time zone |
| Daily investment | Typically 5–12 minutes including check-in and reflection; guided text timer is approximately 6 min normal, ~2 min short |
| Start prerequisites | Client consent, private assessment-selection workflow, client-approved scales/goals, one named difficulty to observe |
| Personalization | Use 3–5 selected compatible scale IDs; server chooses the appropriate approved track for each day. The 14-day learning arc is shared, but titles/teachings/practices come from the chosen track for that specific day |
| Learning objective | Build familiarity with observation, gentle grounding/response, practical choices, everyday use and integration |
| Daily evidence | Optional self-report and reflection; session completion is a separate engagement record |
| Day 7 checkpoint | Review the week and choose continue / gentler practice / more rest; may offer a separately due self-report |
| Day 14 checkpoint | Last reflection, descriptive trend, personal mini-toolkit, optional follow-up cycle |
| Accessibility | EN/RU; natural breath, open eyes, text transcript, short and no-imagery variants, stop/skip at any step |
| Measurement boundaries | 0–10 is original private self-monitoring, not a validated diagnostic score; do not infer treatment effect or normalize clinical scales |
| Protection | Authenticated owner-scoped records, encrypted private notes, no storing personal client content in URLs or browser localStorage |

### What happens during each of the 14 days

The phase/theme/outcome below is the common daily **learning arc**. The specific exercise and its title are selected from the user's current skill track, not copy-pasted across all users.

| Day | Phase | Day's theme | What the client does | Practical takeaway |
|---|---|---|---|---|
| 01 | Awareness | Notice your starting point / Замечаю точку отсчёта | Optional baseline self-report; recall one manageable example; identify a first sign and the supportive context | One honest observation, not a verdict |
| 02 | Awareness | Recognize the first signal / Узнаю первый сигнал | Notice an early signal of stress, emotion, fatigue, distraction or interpersonal discomfort | Personal clue that the pattern is beginning |
| 03 | Awareness | See the pattern / Вижу закономерность | Distinguish the situation, inner reaction and next possible choice | Simple `situation → response` map |
| 04 | Gentle regulation | Find a point of support / Нахожу точку опоры | Try a safe, eyes-open grounding or gentle self-support exercise appropriate to the selected domain | One personally acceptable point of steadiness |
| 05 | Gentle regulation | Choose one small step / Выбираю маленький шаг | Repeat a tiny practice or take a two-minute restorative action | One achievable experiment |
| 06 | Gentle regulation | Respond more gently / Отвечаю себе бережнее | Notice pressure or automatic response; try a kinder, more flexible response | One gentler alternative |
| 07 | Review | Review the first week / Осмысляю первую неделю | Look at observations; note what helped/was neutral/uncomfortable; choose continue/softer/rest | Week-one reflection and pace preference |
| 08 | Everyday application | Bring it into ordinary life / Переношу навык в обычную жизнь | Try a familiar technique during a safe, low-pressure daily activity | One real-life practice example |
| 09 | Everyday application | Notice available resources / Замечаю доступные ресурсы | Identify personal, relational and environmental supports and whether they are reachable | Personal resource map |
| 10 | Everyday application | Pause before choosing / Делаю паузу перед выбором | Observe a manageable impulse; try a brief pause and choose one next step | One deliberate micro-choice |
| 11 | Everyday application | Repeat without perfection / Повторяю без требования идеала | Practise resuming after distraction, an uncomfortable moment or a skipped practice | A practical way to begin again |
| 12 | Integration | Create your personal toolkit / Собираю личный набор практик | Choose and order two or three skills for a short personal routine | Personal toolkit of 2–3 steps |
| 13 | Integration | Choose your own practice / Самостоятельно выбираю практику | Decide independently which familiar skill fits the day, whether to try it, and when | Optional self-directed practice |
| 14 | Review | Reflect and choose what comes next / Подвожу итоги и выбираю продолжение | Last optional check-in, compare available observations, review skills and boundaries, record a next step | Personal summary; optional next cycle |

**Three important rules for the 14-day arc:**
- These are learning intentions and possible reflection outputs, not required performance targets or health promises.
- Days 7 and 14 show explicit reflective checkpoints, separate from daily practice completion.
- If the client selected multiple scales, the highlighted practice focus can rotate by day; never falsely describe all 14 lessons as a single-track series.

### The six content tracks

1. Stress & grounding: recognize tension, orient to present surroundings, learn a simple support sequence.
2. Inner support: notice critical self-talk, try kind internal dialogue, make a personal supportive phrase.
3. Emotional flexibility: identify feelings and needs, allow emotions without forcing them away, choose responses.
4. Clarity & attention: notice distractions, use manageable attention intervals and flexible task routines.
5. Connection & boundaries: notice preferences, practise respectful requests, boundaries and safe connection.
6. Energy & agency: notice energy/recovery rhythm, choose micro-rest and realistic action.

Each track keeps its own authored titles, teaching, guided script, action and EN/RU copy for all 14 days.

## 3. Passport of one lesson card

### A. Compact day card (in the 14-day map)

Display, in this order:
1. `DAY 01` + status: Today / Completed / Earlier day / Coming up. Completion means a saved practice only.
2. **Track-specific lesson title** (e.g. “My stress map”; not the generic phase title).
3. One short cross-track progression heading and phase.
4. The approved active resource/skill track, optionally its selected scale label; **never** “low health score” or diagnostic rating.
5. **One practical takeaway** phrased as an invitation (“One observation…”).
6. For today's incomplete card only: **burgundy primary CTA** “Open today's practice” leading to the real daily flow. Future cards are previews, not dead buttons. A completed card cannot turn into a medical success indicator.

Visual contract: warm ivory card, legible dark type, green reserved for completed/comfortable, burgundy reserved for primary navigation, clear 2px burgundy outline for today. No blurry/low-contrast text; compact desktop grid, horizontally scrollable snap cards on mobile. Keep all existing actions visible.

### B. Expanded current-day lesson (five functional cards)

| Block | Label | Content / operation | Save behavior |
|---|---|---|---|
| 01 | My daily check-in | Name the selected difficulty; optional past-24h 0–10 severity; optional interference, resources and private note; allow skip | Save check-in only, with correction allowed on same day |
| 02 | Thought of the day | Original daily aphorism; track-specific explanation of **why** this practice matters; day purpose in the hero | Reading alone is not course completion |
| 03 | Guided practice | Three **distinct** guided steps: arrive safely → track-specific meditation/attention → return to ordinary context; timed text and transcript | Allow short/normal, eyes-open, no-imagery, retry or stop |
| 04 | Your small ritual | One unique track/day real-life action plus one expected takeaway; optional now, later, or skip | Do not make this an extra duplicate guided timer step |
| 05 | Integration & reflection | Optional “before/after right now” ratings, feedback helpful/neutral/uncomfortable/prefer not to answer, private journal | Explicit “Save completed practice” button; server saves once by cycle/day |

The **daily hero** also carries `Day N/14`, active approved focus, track-specific lesson title, one-sentence purpose, minutes and practice count. The day-14 report gives descriptive change and history; no causal or clinical language.

### C. Canonical lesson data (logical contract; may be assembled across existing modules)

```ts
interface PersonalLessonCard {
  courseId: 'hh-my-course-14d'
  cycleId: string
  day: number             // 1..14, local time zone
  contentVersion: string
  phase: 'awareness' | 'regulation' | 'application' | 'integration' | 'review'
  phaseTitle: string
  heading: string         // common learning arc
  purpose: string
  outcome: string         // intended small learning artifact, not promise
  domain: string          // one of the six approved tracks
  selectedScaleLabel?: string
  lessonTitle: string     // unique title from the 84-lesson library
  aphorism: string
  teaching: string
  guidedSections: Array<{ kind: 'arrive' | 'meditation' | 'finish'; title: string; text: string; seconds: number }>
  action: string
  reflectionPrompt: string
  durationSeconds: number
  status: 'completed' | 'today' | 'past' | 'upcoming'
}
```

Actual persistence remains in owner-scoped `growth_cycles`, `growth_checkins`, `growth_sessions` and `growth_reviews`; **no new database schema or migration** is needed for preview cards. Sensitive answers never belong in static lesson metadata.

## 4. Content sequencing and adaptation contract

- Reuse `data/inner-growth/{shared-days,calm-days,support-days,emotion-days,clarity-days,connection-days,energy-days}.js`.
- Enrich the existing `lessonFor(domain, day, locale, length)` with shared day phase, purpose and takeaway; do not replace authored guidance.
- Use `coursePracticeFocus(chosenScales, primaryGoal, day, locale)` for **every** preview, as well as today's lesson, so the itinerary is honest about per-day rotation.
- On unsuitable imagery, switch the meditation stage to approved open-eyes grounding; keep natural breathing, optionality and no forced body monitoring.
- Never add diagnoses, medication advice, dosages, cure promises or claims that this programme replaces professional/urgent care.
- Use actual course completion rows for status; time elapsed alone must never mark a lesson complete.
- Preserve previous days as reviewable history in the stored report, but do not enable completing future dates or fabricate missing check-ins.
- Do not silently publish videos or generate avatar content for lessons; videos are a separate approved workflow.

## 5. Implemented code map & acceptance checks

- New bilingual day arc: `data/inner-growth/course-journey.js`.
- `lib/inner-growth/lesson-library.js`: verified 84-lesson library enriched with day purpose/phase/outcome.
- `lib/app/growth-daily.js`: secure personalized 14-card roadmap calculated from the same day/track selector and saved session statuses.
- `components/app/course-today.jsx`: visible 14-card itinerary, clear current-day hero, de-duplicated three-stage guided exercise, dedicated teaching and action cards, burgundy current-day CTA.
- `components/app/course-today.module.css`: contrast, hierarchy, warm card palette, responsive compact/snap layout.
- Tests: validate 14 phases, 84 bilingual lesson pairs, status/provenance and UI contract; run existing `test:app`, build and CI.
- Deployment: merge to `codex/public-book-library`, then verify the actual Vercel production deployment separately (do not equate merging with publication).

## 6. Product decisions that remain deliberate

- Completion = saved practice, **not** therapeutic improvement.
- A 14-day card is an orientation/learning artifact, not a diagnostic grade.
- The user retains choice over all tests, focus scales, daily ratings, comfort level and whether to continue.
- Future deep programs may need 28-day content and a new content version, but are outside this 14-day passport.
