# Holistic House — Canonical Video Director Chat tree, 2026-11-01

## Branching / source of truth

**This is a stacked PR only**, parent #2970 (69,120 phrase catalog), whose parent #2949 (canonical narrative taxonomy) is **also open**. Neither the new tree nor its unbound storyboards may be claimed to be deployed to Holistic House LIVE.

The existing public RU/EN/ES Video Studio route is `/{locale}/holistic-support/mandala`, owned by the existing `MandalaVideoDirectorChat` and `MandalaFreeVideoStudio`. Do not create a second chat, a fake video generator or duplicate audio recording UI.

Single data hierarchy, loaded from canonical registries:

1. Goal **category**, 5 chips (body, business, energy, love, stress).
2. **Topic**, 6 chips within that category. Free-text goal may match an existing topic without changing the user's explicit category.
3. **Scenario**, 4 localized story titles per topic.
4. **Idea**, 4 ready-made topic/scenario-scoped story claims.
5. **Phrase**, 3 prepared phrases after optional tone (4), grammatical address (2), and length (2) choices. A client can type their own or opt out of captions.
6. Optional production settings: mood, aspect, duration, music. The one-tap Auto Director fills remaining parameters on request, *not* as a mandatory questionnaire.
7. Review the four **licensed** MP4 assets, timing, audio and caption track; explicit confirmation; existing MediaRecorder export and decode/playback checks.

All IDs retain their editorial relationships. Changing a parent resets descendants (never silently restores a mismatched phrase). Changing tone/address/length resets only the selected phrase. Changing render filters invalidates the prior approval; a new film cannot accidentally reuse an older approved SHA-less plan.

## Local copy / AI wording

The deterministic text engine provides a localized fixed question for each tree step; labels come directly from the canonical registries. It can also match a localized user sentence or a stable option ID, without waiting for a provider. Unknown subjects (e.g. 'еда') are retained in the goal text but *not* assigned to an arbitrary category. The person sees the five real category options to clarify.

AI opt-in still only rewords a *production-filter* question after category/topic/story/idea are already selected. It is off by default and cannot pick story IDs, update fields, or trigger a render. The entire goal, photo, health record, voice file and tests never go to external AI without the existing relevant explicit permission.

## Critical limitation: conceptual story vs rendered MP4

#2949 includes **120 conceptual four-beat scenarios with `sourceStatus:unbound`**, not 120 validated executable films. The chat shows a visible note explaining that a selected editorial scenario is currently *not directly rendered*, then offers an existing first-party four-shot themed montage as a **separate** alternative.

Theme of this licensed fallback is derived from the selected topic's `legacyVideoTheme` and constrained to the matching first-party presets. It must not silently switch categories. Source availability, clip permissions and the runtime render checks remain authoritative. It must not promise exact matching visual scenes or therapeutic outcomes. No XP, payment or provider video-generation cost is changed.

Selected phrases use the same `scenario.edit.captionTexts` stage-track already consumed by the one video renderer; short phrases occupy one stage, extended phrases occupy up to two. The approved plan key includes category, topic, scenario, idea, phrase and settings. No duplicate main affirmation overlay is added.

## QA / release order

- Test `node --test tests/video-chat-tree.test.mjs tests/mandala-video-phrase-catalog.test.mjs tests/video-chat-intent.test.mjs`.
- `node --check lib/mandala/video-chat-tree.mjs`.
- Run applicable TypeScript, ESLint and production Next build on the **exact current PR HEAD**.
- After #2949 and #2970 merge, rebase/reconcile this PR's overlap with #2964 (the legacy browser acceptance checks assert the previous six-stage dialogue). Update browser QA to traverse five new taxonomy steps + optional filters in RU/EN/ES.
- Mobile Chromium/WebKit at 320,354,390,430px. Confirm correct buttons and data-backed phrases, selected captions on **actual export**, sound track, four playable approved MP4 shots, and no false success.
- Merge only with current ruleset/core + specialist green into **`codex/public-book-library`** (not default branch); verify deployed Vercel commit SHA, READY, and public RU/EN/ES route. Physical iPhone Safari remains a separate owner-side acceptance step.

No claims of production deployment, passing CI, or exact rendering of unbound concepts without independent evidence.
