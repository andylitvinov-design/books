# Story Director v2 — concept-first narrative and footage evidence
**Owner:** Holistic House / Video Studio · **Date:** 2026-11-13

## Problem verified in production source
The current browser Story tab generates six shots for 30 seconds. The Ideas
concept has four semantic beats, optional authored six-shot storyboard, and
selected support phrases. Old fallback story guides used \`phrases[index]\`
as scene titles, overriding actual plot; the reviewed-film selector greedily
picked the top source per shot, so a generic earlier shot could consume the
only adequate take needed by the central action. It matched generic mood tags
("growth", "energy", "people") without proving that the physical event exists
in a filmed frame. The business photo fallback is separately developed in
PR #4338; do not duplicate or claim it is LIVE here.

## v2 released code scope
- \`storyboard-content-alignment.mjs\`: preserve six authored scene actions in
  original chronology; otherwise project four concept beats into the fixed
  shot slots with named shot roles. Support phrases are captions, not scenes.
- Distinguish literal filmed subjects from optional symbolic imagery. Map
  RU/ES/EN concrete objects and gestures to canonical English catalog cues.
  Avoid collapsing "work on relationships" into a workplace film.
- \`reviewed-filmed-story.mjs\`: enforce existing rights, hash, decoded frame,
  aspect, duration and exclusions first; then build candidate scores for
  **all** scene beats and solve a one-to-one global assignment instead of
  taking the first viable source at each step.
- Strict authored action matching uses multiple specific metadata anchors
  where available. Failing to find a match is visible editorial incompleteness,
  not permission to use a forest, ocean or unrelated scene.
- Preserve six distinct masters, timing, consent, real-media restrictions,
  browser encoder, and no export approval from an editorial suggestion.

## Next iteration: one Qwen, specialized Story Director role
This requires separately reviewed, measurable integration; it is NOT part of
this deterministic v2 patch. Reuse the approved shared Qwen intelligence,
with a stateless server "Story Director Mind" role, not a second LLM copy.

### Input / consent boundary
Approved concept signature, title, event/action, audience, four beats,
style and exclusions, format, duration, chosen text, locale. Exclude private
client profile, uploaded photos, audio and test data unless explicitly
permitted; no silent third-party API transmissions. Keep the deterministic
browser planner usable at zero provider cost and when Qwen is unavailable.

### Structured story output
Six ordered shots (default 5 seconds each):
\`index,storyRole,eventId,who,physicalAction,object,setting,visualMustShow,
visualMustNotShow,cameraDistance,emotion,transition,continuityAnchor,
englishSearchTerms,sourcePhrase,assetId?,evidence,confidence\`.
Shots 1–6 follow situation → complication → turning point → action →
consequence → meaningful resolution. For meditative or ceremonial stories,
allow settling → grounding → invitation → experience → integration → closure.
Hard rule: the story event order never comes from stock-catalog ranking.

### Multi-pass reasoning and review
1. **Director:** extract timeline, protagonist, causality, explicit visual
   constraints, exclusions, allowed metaphors; write filmable concrete actions.
2. **Script critic:** compare each shot to the approved concept, catch
   invented context, reversed cause/effect, abrupt character/location jumps,
   repeated semantic beats and incompatible emotional endings.
3. **Media researcher:** search catalog/approved providers independently for
   each actual action, not synonyms of the general topic. Use real visual
   evidence from decoded poster/frames, not tags alone. Keep source-page,
   license, attribution and cryptographic provenance.
4. **Sequence optimizer:** globally assign unique licensed sources across the
   narrative, optimize continuity, diversity and shot-level relevance; do not
   reorder concept beats to fit what is in stock.
5. **Director's final check:** audit shot-by-shot what is actually visible.
   Unverifiable depicted events are \`needs_media\` (not "matched"). Use a
   separately licensed real photograph with safe in-canvas motion only after
   PR #4338's photo path passes real WebKit MP4/AAC export acceptance.
6. **Client:** see ordered script and honest gap marker, may replace/reorder
   individual media knowingly, then confirm before generation. Never bill or
   generate paid video from a suggested scene list.

### Proposed hard quality gates
- 100% of explicit approved events preserved in order, no invented people,
  events, diagnosis or promises.
- 0 unintended nature/abstract substitutions for concrete business,
  relationship, birthday, portrait or other literal subjects.
- 6/6 nonrepeating, independently rights-cleared sources for 30s real-film
  plans; else fail closed with a gap identifier.
- Consistent leading character/location or an explicit editorial transition;
  0 unrequested scenario flips during selecting sources.
- RU/EN/ES semantic parity; no negative exclusions violated.
- Inspect at least one decoded representative frame plus motion proof before
  claiming the shot *depicts* a specific event (metadata alone is not proof).
- Measurable human/AI blind review: concept fidelity, causal coherence, shot
  relevancy, continuity and emotional landing each scored 0–5; target
  ≥4/5 on 90% of golden fixtures, no safety/license violations.

### Golden fixtures
Career/salary request with documents→meeting→conversation→negotiation;
anxiety without invented medical cause; conflict and repair between partners;
calm breathing without forced activation; birthday greeting with recipient
and real celebration; meditation using intentional symbolic imagery; a
product demonstration; a personal story with specifically excluded water,
forest and mountains; same intents expressed in Russian, English and Spanish.
Golden tests should assert actual catalog evidence rather than mere thumbnail
existence or metadata class.

## Release
Normal protected CORE + Mandala Specialist + exact-head WebKit/browser + Guard,
protected merge, Vercel production READY/serving SHA and real live Story→Montage
smoke. No new model, paid provider, billing, workflow, cron, preview bypass,
or claims that a unit test proves video frames.
