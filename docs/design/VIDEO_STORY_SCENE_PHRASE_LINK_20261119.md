# Video Studio · phrase ↔ six-scene action matching · 19 Nov 2026

**Route:** `/{en,ru,es}/holistic-support/mandala` → Montage → Text / Story.
**Existing engines:** `video-phrase-story-alignment.mjs`, `storyboard-content-alignment.mjs`,
`mandala-automatic-storyboard.tsx`. No duplicate renderer, API or new table.

## Specific regression: Making Room for Love
The 5 selected positive phrases previously mapped to shots #1–5 by list index.
This placed “I welcome love with openness” on an exhausted commuter in shot 1
and left the climactic opening door in shot 6 without a phrase. The revised
goal-only planner matches **strong** scene-action anchors instead:

- #1: exhausted commuter — recognition; no forced positive phrase
- #2: second chair — “I deserve mutual care and respect”
- #3: old photograph — “I let trust grow at its own pace”
- #4: freed space/shelf — “I can connect with an open heart”
- #5: phone invitation — “I welcome kind relationships”
- #6: opening door — “I welcome love with openness”

This links text to a filmed **action**, without claiming the photograph actually
shows it. The original six action descriptions, source IDs, timing and selected
phrase strings remain unchanged. EN/RU/ES lexical cues are local deterministic
editorial hints. If any phrase or scene is ambiguous, missing, or unrecognised,
the previous chronological mapper wins. User-written/manual positioning wins
without exception. No model call, psychological diagnosis, external export,
credit charge, storage or publication.

## Release and acceptance
- Existing focused Node suite: `node --test tests/video-scene-semantic-qa.test.mjs`.
- CI: protected exact-head Core, applicable Mandala/WebKit specialist,
  `hh-merge-check`, typecheck, lint, build.
- Production: only scheduled hourly Vercel release; verify canonical alias,
  READY, SHA and browser-generated captions. MP4 on a physical iPhone and
  private My Videos save remain separate E2E proof.
- **Remaining UX follow-up:** visibly display each scene's `sourcePhrase`
  and a working Edit in Text action in the existing Storyboard. Do not edit
  `mandala-automatic-storyboard.tsx` while P0 #5179 owns that file.
- Not a guaranteed therapeutic result; only a more coherent supportive story.
