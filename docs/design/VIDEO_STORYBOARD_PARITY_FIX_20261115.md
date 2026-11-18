# Video Studio — six-shot Concept → Montage storyboard parity (2026-11-15)

## Reproduced issue

On the iPhone, Ideas → Concept presents the film “Making Room for Love”
as six ordered 5-second actions: commuter/suitcase, second chair,
old photograph, luggage moved/shelf, invitation/“Yes”, morning door.
Montage → Story previously rebuilt a generic concept from topic tags, then
collapsed six editorial shots into five cards and displayed unrelated
snowy forest / autumn canopy / ocean / clouds stock thumbnails.
A generic tag or a reviewed video codec does not verify a depicted event.

## Correct contract

- Current chosen **direction**, including unapproved choice and local edits,
  is shared between Ideas and Montage. Same user intent signature guard.
- Six authored shots → six *separate* ordered 00:00–00:30 cards with
  original title, explicit physical action, and unmodified 5-second timing.
  Separate 20-second five-cut legacy montage keeps its own format.
- Story always displays the **scripted action**, not the stock clip's label.
  Footage titles are secondary and visible only for actually reviewed media.
- All six-shot authored movies, curated or v3, fail closed on unverified
  depicted actions. Stock tags/metadata are not proof of a filmed suitcase,
  chair, human interaction, photograph, etc.
- Choosing quality cannot treat missing media as ready. Explicit
  five-stock-scene creation cannot replace a selected six-shot screenplay.
  Existing manual captions, music, photo, voice, animation and MP4 safety
  checks remain untouched.
- No new API or cost; no verified event classifier is claimed. Actual matching
  source assets need independent evidence and a future verified media binder.
  Never invent a source/thumbnail, charge, or mark a film exported early.

## Acceptance

1. Pick a specific story in Ideas, inspect Story **without Approve**: same
   6 titles/actions. Pick another, Story changes consistently.
2. Approve and return; Story retains same content and 5-second cuts.
3. A scene with no event-verified video is marked as requiring footage
   and cannot cause an unrelated landscape to be displayed as evidence.
4. 30s / 6 × 5s; 20s legacy 5-shot retains explicit independence.
5. EN/RU/ES phone WebKit smoke, focused Node tests, Core, Specialist,
   Guard, protected merge, then the existing **hourly** Vercel release and
   real iPhone production acceptance are mandatory before LIVE claim.

**Release status on authoring:** prepared source/test/docs patch; not
equivalent to protected merge, Vercel READY, or verified LIVE.

## Follow-up · 16 November iPhone screenshot correction

- The unmerged Concept v3 PR means LIVE still serves old arrow-chain stories
  and unconnected, five-card forest/ocean stock montage.
- The explicit broad Love/Любовь/Amor category now receives three independent
  anonymous visual narratives rather than old four-beat catalog copy; unknown
  unrelated free text still fails closed instead of inventing a biography.
- Direction options show a distinct cinematic hook, not the entire Main Idea
  duplicated. The chosen story title appears once, on its option card.
- The old five-cut mode remains available only at 20s. Normal 30s scenes are
  a separate ordered set of six 5-second actions; unverified visuals are missing,
  not mislabeled nature stock photos.
- Preserve in the existing conflict-resolution merge the new production
  `ReadyGenerationCheckIn` component and its sequential questionnaire; do not
  overwrite unrelated Ready browser test fixes on source HEAD.
- This source/test/doc patch is pre-merge work. Required checks and the existing
  hourly production release plus real iPhone smoke remain mandatory.
