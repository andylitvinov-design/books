# My Coach · Personality Dialogue v2 (26 Nov 2026)

Implementation slice CP-01–04 and CP-06, shared policy foundation for CP-07/08. Parent #4016/#4018; protocol #5665; existing independent reaction PR #5696 and course/profile PRs #5692/#5701. No extra provider, storage, UI, workflow or direct Vercel publish.

## Source contracts
- The existing persona registry remains the identity and method authority. The new delivery policy enriches only the eight public personas; legacy hidden IDs retain prior behavior.
- A shared pure per-turn adapter consumes the Director's authorized stage/move, bounded style preferences, existing explicit self-reported Empathy Mind signal, and wrap-up hint. It never changes consent, evidence, progression, question count or action permissions. Distress/uncertainty/refusal soften delivery. A direct question or correction still takes precedence.
- Static behavior reaches existing text and Gemini Live setup; dynamic per-turn guidance is inserted into the existing textual Director prompt. Gemini realtime checkpoint-specific dynamic delivery is not yet wired in this slice because that file is being changed by #5692/#5701.
- Persona-specific affinities rank existing approved questions only, never add a method step. No second model call.
- The same canonical six opening gates retain all validation. 504 new complete authored questions in EN/RU/ES for seven characters + 72 existing Samir variants = 576 public opening questions, with no prefix-based generation for public personas. Localized examples also reach Gemini Live opening instruction. Four legacy profiles preserved.
- The visual cue is an advisory contract for later integration; it is NOT a claim that a clip is played or verified. Existing playback PR #5696 owns that path.
- No external client data is stored by the policy; no sensitive profiling or automated diagnosis.

## Scope still open
1. Validate contextual behavior in the true Gemini Live next-turn checkpoint after compatible PRs merge; avoid a second source writer.
2. Align the reaction director's approved clip mapping with the new policy; no regeneration/spend.
3. Complete 480 independently authored multi-turn benchmark scenarios, RU/EN/ES localization, blind human recognition and longitudinal tests.
4. Integrate client-approved coach-origin homework/practice with Clarity Daybook on natural timebox close only; interruptions stay resumable; align with #5701.
5. Verify protected CI, merge, hourly release and authenticated text/audio/video smoke. Neither source code nor green unit tests alone establishes LIVE.

## QA
New tests verify eight profiles, stage lenses, explicit distress and no-advice/repair/close priority, registry and Director wiring, 576 unique one-question opening variants, Live opening prompts, and existing state regressions. No change to safety/protocol validators.
