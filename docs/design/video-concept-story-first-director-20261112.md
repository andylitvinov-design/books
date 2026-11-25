# Video Studio · Story-first Concept Director (2026-11-12)

## Owner intent
The Concept screen must turn the visitor's specific goal and confirmed personalization
into a meaningful **cinematic idea**, a **complete short story**, and a **six-shot / 30-second editorial storyboard**.
It must not echo the Current/Desired state chips as its Main Idea or splice technical
camera settings into the story. Keep the existing Holistic House mobile design and
the production branch `codex/public-book-library`.

## Architecture, delivered in one project
- Canonical speech/goal/taxonomy extraction remains in `auto-video-concept.mjs` and
  `video-concept-semantic.mjs`. No third-party inference, remote personal dossier,
  payment, quota or new API/model is required.
- `video-creative-directions.mjs` is a separate **editorial director**, not a new
  always-running or fine-tuned model. For the specific topic `ready-relationship`,
  it supplies three independently written films in RU/EN/ES:
  `space` (Making Room for Love), `real` (Being Real), `crossing` (The Crossing).
  Each has a dramatic premise, a psychologically respectful action and a
  non-guaranteed ending.
- The editor presents three compact, selectable concepts above Main Idea and
  Concept Story. Choosing a story changes the actual approved concept, not
  just the card highlight. A chosen direction has its own signature; its
  `baseSignature` matches the still-valid user intent. The prior speech-first
  path remains authoritative and does **not** acquire invented personal stories.
- Other sufficiently specific catalog topics offer different scenario-led
  alternatives without assuming a diagnosis, biography, romance or video asset.
  General/low-confidence requests keep the previous conservative concept
  until a specific goal is selected.
- Technical parameters are folded inside **Creative settings**, below the
  story. Signed-in editing remains available. Guest preview/approval and
  the single sticky Approve & Continue rail remain intact. Existing language
  support and navigation are preserved.

## Storyboard and footage contract
- The chosen 30s script carries six different, human-authored shots (5s each),
  with action, emotion and editorial keywords; the 4-beat emotional arc is kept
  as a separate summary.
- Montage receives the **same explicit topic and personalization** as Ideas,
  and accepts the selected, independently signed storyboard when
  `baseSignature` still matches the original input signature.
- If an existing montage is already assembled, choosing a different story
  does **not** silently relabel its old footage as matching six new actions.
- The footage selector must never claim a scripted chair/suitcase/phone/bridge
  exists in the stock library without relevant metadata: six distinct, legal,
  reviewed camera clips remain required and unmatched scenes fail closed.
  Authored storyboard status never grants rendering, rights or publication.
- A live concept card is not equivalent to a completed MP4. Real visual fidelity
  depends on separately licensed matching footage or explicit user supply;
  no unrelated stock landscape or cartoon filler is allowed.

## Acceptance criteria
1. Goal "Ready for a Relationship" with confirmed personal state inputs produces
   **three stories** with distinct main ideas; none repeats the raw state list.
2. Each story is event-based, 6×5s, RU/EN/ES, with distinct actions and
   reviewable emotional evolution.
3. On iPhone, cards and story are above the collapsed technical settings.
   The sticky CTA does not block the chosen-story cards or story editing.
4. Changing a direction invalidates the previous selection locally; selecting
   one and approving it transfers the same concept to Montage.
5. Existing style/voice/music/manual montage clips are not overwritten;
   source footage remains reviewed/rights-checked and literal subject failures
   never become an exported MP4.
6. Audio transcripts and conservative/generic requests never fabricate personal
   narrative details. User can still revise the text and approve without login.
7. Run `node --test tests/mandala-video-creative-directions.test.mjs`,
   `tests/mandala-video-concept*.test.mjs`,
   `tests/mandala-automatic-storyboard-tab.test.mjs`,
   plus required exact-HEAD Core/Video specialist CI including real WebKit.
8. Publish ONLY via a protected, checked PR into
   `codex/public-book-library`; verify Vercel production READY at the merge SHA
   before announcing LIVE.

## Risk notes
The three readiness stories are authored and curated editorial examples. Generic
catalog variants remain a more conservative fallback, not claims of universal
AI screenwriting mastery. Scenario keywords are a defensive search gate,
**not** visual proof that the action occurs. Human review of each source video
remains necessary before claiming that a film is visually complete.
