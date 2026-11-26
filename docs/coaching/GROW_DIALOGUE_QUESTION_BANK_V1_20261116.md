# My Coach · GROW adaptive open question bank v1 (16 Nov 2026)

## Design
The registered GROW persona uses 23 original open-ended question candidates in RU/EN/ES; the remaining coaching methods are unchanged. Each question has one stable ID, the existing app_private.coaching_steps key, one Director intervention ID, a missing client-evidence key, situation cues and a soft 20-minute timing range.

The existing private coaching_models, coaching_steps, coaching_questions (closed-choice), authenticated account and consent mechanisms stay authoritative. New app_private.coaching_dialogue_questions_v1 is an ADDITIVE editorial reference table with FORCE RLS and backend-only SELECT. No transcript, user answer, private goal, audio, new paid vendor, API request or analytics is saved. The live voice loop uses an immutable versioned compiled copy rather than fetching SQL on every turn: a later DB edit needs a reviewed code+catalog version release to affect live conversations.

## Selection and lamps
The server Director first chooses the first incomplete method-specific step from CLIENT evidence; only then a shortlist of at most two within-step questions can be suggested. The language model may ask one harmonious rephrasing or none at all. Questions asked, word count, persona text, or elapsed time never award progress. Refusal, a client correction, stop, a new topic and safety overrides outrank the library. No pressure for an action before the client chooses one.

Soft time targets: Goal 0–3 min (goalRestated + workingFocusEstablished), Reality 3–12 (keyFactsCaptured + constraintsReviewed), Options 12–16 (optionsExplored), Way forward 16–18 (clientActionApproved + timingSpecified + feasibilityChecked), Review 18–20 (summaryReviewed). Time hints can rank options in the PRESENT stage only. Near 20 minutes the existing optional close can take precedence; incomplete sessions must never be called complete.

## Integration and release
Existing My Coach API, personas, provider fallback and TTS remain. This PR adds a prompt hint to lib/coaching/conversational-persona.mjs; the existing Director output enforcement stays authoritative. Existing PR #4731 (server-owned clock) and #4813 (evidence-driven six visual lamps) are separate pending dependencies, NOT proof of LIVE behavior. No changes to either PR head.

Acceptance: run focused Node tests; exact-HEAD Core + Specialist + hh-merge-check; verify SQL 23 rows, RU/EN/ES, forced RLS, no anon/authenticated grants and one preserved model-key FK; after merge, hourly Production release and real authenticated multi-turn iPhone voice acceptance are needed. No new hourly workflow, paid API, provider or extra Vercel deploy.


## Consolidation 25 Nov 2026
GROW code and tests already present in production, 23-row catalog migration 20261116231510 already applied (verified earlier). Do not replay the migration. Method authority #5601 merged 265ddcb9 and canonical Vercel READY. This residual PR adds only the optional validated catalog/URL method preference to the existing greeting. No URL grants consent, sets server evidence, starts a model, or bypasses authenticated explicit start. Keep default legacy URL unchanged. Physical iPhone and deliberate same-account replay/multi-tab limitations remain separately tracked in #5473.
