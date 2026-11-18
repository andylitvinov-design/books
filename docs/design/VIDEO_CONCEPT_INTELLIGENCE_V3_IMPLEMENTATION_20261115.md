# Holistic House · Concept Intelligence v3 — implementation and evidence

**Scope:** MyVideo → Ideas → Personalization → Concept → Montage  
**Owner-approved source:** HH_VideoStudio_Concept_Intelligence_TZ_v3.md (15 November 2026).  
**Branch discipline:** \`codex/public-book-library\` is website production. Protected PR, mandatory exact-HEAD CI, separate verified Vercel LIVE acceptance.  
**Cost:** no additional provider, model, API, queue, scheduled job or customer charge.

## Problem and replacement

The old \`fromCatalog()\` in \`lib/mandala/video-creative-directions.mjs\`
used \`scenario.creativeBrief\` as Main Idea and four abstract catalog stages
as story, with glue text such as "The story opens with" and duplicated shots.

The replacement imports \`cinematic-concept-v3.mjs\` and
\`film-story-atlas-v3.mjs\`, where all user-visible film texts are event-based,
not catalog arrows. The existing \`ready-relationship\` and
\`anxiety-no-reason\` curated film paths remain; impossible visual exclusions
route to another reviewed direction or request more input.

### Pure execution roles

1. \`derivePsychologicalBrief\`: records an **editorial hypothesis**
   \`theme, humanDilemma, possibleBarrier, resource, microChoice,
   desiredEmotionalShift, doNotAssume\`; preserves input-source provenance.
   No diagnosis, asserted biography, past trauma or prescribed intimacy.
2. \`generateThreePremises\`: selects three distinct mechanisms from a
   reviewed plot family and ranks them by confirmed emotion/focus; each has
   distinct central action, symbol and ending.
3. \`writeFilmStory\`: assembles full literary prose in RU/EN/ES out of
   topic-appropriate, individually authored events, with small visual
   mood/ending cues driven by personalization.
4. \`makeSixShotStoryboard\`: exact 6×5s, observable subject/action, shot type,
   emotional role, continuity keys, English media search keywords and
   \`sourceStatus=editorial_unverified\`.
5. \`reviewConceptQuality\`: computes an auditable 0–35 **structural**
   score and hard-fail reasons, with a threshold of 28/35. \`reviseConcept\`
   fails closed after two bounded recomposition attempts. Structural PASS
   is **not** an independent human aesthetic judgement.

The authored repertoire currently has **18 distinct action-driven plots**
across growth, work/income, stress, purpose, intimacy and flexible everyday
choices, in **all three languages**. The relationship and anxiety special
stories remain. Other specific topics select a relevant family as a
**conservative editorial baseline**, not limitless novel LLM reasoning.
No raw voice transcript is sent to another model and audio-authoritative
paths are left intact.

### Data contract

\`generateThreePremises\` produces
\`{schemaVersion:"hh-creative-concept-v3",intentSignature,locale,
durationSeconds:30,directions:[...],selectedDirectionId:null,
userEditedFields:[],psychologicalBrief,allReviews,approvedMedia:false}\`.
Each direction includes a title, genre, Main Idea, pitch, full Concept Story,
active symbol, dilemma, obstacle, central action, turning point, ending,
four emotional stages, a six-item storyboard and structural review.

\`applyVideoCreativeDirection\` adapts to existing \`ApprovedVideoConcept\`:
\`baseSignature\`, per-direction \`signature\`, \`creativeSchemaVersion\`,
\`creativeReview\`, \`creativePitch\`, \`psychologicalBrief\`,
\`userEditedFields\` and enriched \`storyboard\`. Existing audio/music/manual
clips stay separately owned by Montage. There is **no second persistence
table** or paid inference route.

### Mobile and handoff

- Choose your story: one-line Main Idea plus a separate 1–2 sentence
  character/action pitch, not arrow chains.
- Independently edit Main Idea and Concept Story; edits are keyed by
  \`intentSignature + selectedDirectionId\`, retained when switching cards;
  goal changes make former approvals stale.
- Storyboard comes before the optional four-phase summary and the
  default-collapsed Creative Settings. Screen reading, keyboard and iPhone
  safe-area space protect the sticky CTA from the unified dock and Chat FAB.
- Unfinished automated film results cannot be approved. Audio, presentation,
  celebration, practice and empty-sample paths keep their established
  separate consent/navigation behavior.
- Montage receives the approved six actions and **cannot silently reattach**
  an old five-clip montage or automatically label weak tag/stock matches as
  literal shot evidence. \`depictedEventVerified\` must be true before
  automatic application of a v3 script; until then a missing-footage notice
  is truthful. Manual Montage remains available.

## Acceptance / verification

\`tests/mandala-concept-intelligence-v3.test.mjs\` exercises:
- **20 canonical topics × 3 locales × 3 stories = 180** structural cases,
  including Personal Growth, Income Growth, Stress Relief, Life Purpose,
  Emotional Intimacy, 3 other specific goals and more.
- Unique story mechanisms, symbols, central actions, endings, six timed
  shots and no generic templates/arrows.
- Conservative imagery exclusions; no falsely verified MP4.
- Changing current/desired emotion and focus changes first-choice film
  and narrative content, not just version hash.
- Typed adaptation, signed approval, manual edits and one Concept editor;
  Montage/filming truth gate and mobile CSS/DOM contracts.
- Existing relevant Node tests, Next TypeScript/ESLint/build, required
  Mandala/Core/Public Services/Guard, and browser WebKit remain required.
  No CI gates weakened.

**Independent editorial evaluation is not yet proof of product quality**:
an owner/film editor still needs to blind-review at least 20 diverse prompts
on each language by the seven criteria, ensure ≥80% meet the agreed human
quality standard, and inspect real iPhone screenshots. A passing structural
score and Github CI must never be claimed as independent 4/5 editorial rating.
Record genuine human notes in this existing design record rather than
silently re-labeling the automated score.

## Failure, rollout and release

- If a prompt is too broad, no high-confidence film direction is fabricated.
  Keep the user-goal refinement entry and do not let an unfinished automatic
  film through approval.
- No new audio recorder, provider, wallet, AI runtime or Vercel deployment
  policy introduced; existing protected GitHub deployment remains the only
  production path.
- **LIVE proof separately requires** actual protected merge SHA, matching
  Vercel production commit and real browser click-through on the canonical
  site. Mark any untested acceptance UNKNOWN, not PASS.
