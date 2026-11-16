# Reaction Mind · Empathic Priority Router v1 · 2026-11-08

## Root cause
A client wrote "Мне грустно" in the AI Messenger and received a generic English focus question. The current eight Judgment Mind pilot difficulty codes do not cover an explicit report of sadness, and the rules mode falls back to a generic planning response.

## Implementation
- One pure Reaction Mind (RU/EN/ES): explicit self-reported sadness, fear, anger, joy, distress, relief, voluntary listening and short continuity from the last user utterance. No speculative diagnosis.
- Preserve canonical user-safe order: verified safety preflight > direct task, booking or video creation > explicit emotion reaction > existing Judgment Mind and product rule path.
- Affective response is a short reflection and at most one voluntary question, without immediate sales, tests, exercises, medical claims or links.
- Reuse existing Judgment Mind API in guest and verified signed-in routes. Keep eight signed-choice categories unchanged; emotional response adds no choices or new signed tokens.
- Natural Dialogue local/owned model formatting uses the emotionally relevant reply as fallback and suppresses automatic recommendations on explicit affect. No new provider, billing, database, scheduled job or memory persistence.
- Separate PR #3965 owns full RU/EN automatic interface switching; separate PR #3959 owns six-project landing and guided navigation. Their changes must be reconciled, not silently replaced.

## Acceptance and release gate
- Russian 'Мне грустно' produces Russian acknowledgment even when page locale is English; never asks for a goal or recommends a product first.
- RU/EN/ES positive and negative cases; direct video commands/negations/crisis signals bypass emotional handler.
- 'Пока не знаю' after sadness stays in emotional context, while an unprompted 'Не знаю' does not fabricate a mood.
- Existing safety route, 58 Judgment fixtures, signed tokens, protected CI and real mobile flows must pass before merge. Production LIVE requires independently verified deployed source and real functional smoke. A PR is not LIVE.

GLOBAL_PR_ONE_PUBLISH_V1: prepared before PR, one atomic publish, no added cost or weakened gates.
