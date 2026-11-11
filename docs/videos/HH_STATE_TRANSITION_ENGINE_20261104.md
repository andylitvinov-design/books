# HH State Transition & Scenario Engine v1 — integration and rollout

## Source / policy
Canonical task: https://docs.google.com/document/d/1VOoewJhFvYoju5MiuFdGY-x4PhFWqnR-qDQGDM5_3YQ/edit
Production target: `andylitvinov-design/books:codex/public-book-library`; default `codex/bootstrap-books` is control, NOT production.
Follow `AGENTS.md`, `docs/operations/CI_RELEASE_POLICY.md`, and [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md).
Source snapshots and automated counts are NOT editorial or production approval.

## Reused modules
- `lib/mandala/mytube-content-taxonomy.mjs` and `data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json`: immutable canonical 4/16/64/256 and all 1024 `plotId` through `mytube-scenario-plots.mjs`.
- `lib/mandala/mytube-creative-choices.mjs` from upstream #3540: 46 RU/EN/ES motifs, 10 styles and five original-scenario motif suggestions. **This feature depends on the upstream PR landing first.**
- `lib/mandala/mytube-video-tagging.mjs`, `mytube-plot-montage.mjs`, `free-film-timeline.mjs`, `video-montage-sources.mjs`: original rights, approved footage, montage and duration contracts; none bypassed.
- `components/mandala-auto-video-director.tsx`: same editor, goal, captions, voice, soundtrack, 4-shot timeline, existing selected media and export; no parallel editor.

## New modules
| Module | Role |
|---|---|
| `lib/mandala/state-transition/state-catalog.mjs` | 48 state IDs, 12 clusters, 8 technical axes, RU/EN/ES aliases; reusable 4-stage graph templates; existing motif and style adapters. |
| `data/video-catalog/state-transition-scenarios-v1.json` | 256 **new proposed editorial** scenario drafts: one of four distinct mechanisms × 64 topics; ID suffixes `s5..s8`. With 256 legacy scenarios => 512. Each has 4 localized beats, five motifs, 3 styles, transition tags and media status. |
| `lib/mandala/state-transition/scenario-engine.mjs` | Local validated, deterministic `normalizeStates`, `planTransitions`, `rankScenarios`, `resolveMotifAndStyle`, `recommendScenario`, audits. No LLM costs. |
| `components/mandala-state-transition-selector.tsx` + CSS module | Opt-in compact «Сейчас»/«Хочу» on existing topic chooser; 1 recommendation and up to 2 alternatives; explicit confirmation, session-tab state ID restoration, RU/EN/ES, no overlay. |
| `tests/state-transition-scenarios.test.mjs` | Canonical ID/coverage, 10 gold transitions ×3 locales, deterministic rank, negative and crisis paths, verified-media fail-closed. |

## Editorial and media status — critical
- Existing 256 titles/plot IDs remain unchanged. New IDs `topicId-s5..s8` are not silently inserted into the legacy source taxonomy or its 1024 plots.
- New 256 are **topic-specific drafts** with four different editorial mechanisms (exploration/crossroads, acceptance/connection, boundaries/grounding, gentle activation). Automated distinct beat text is NOT a substitute for human editor review; status `needs_human_review`, `published=false`.
- Full source registry counts: 64 topics; 256 legacy; 256 new; 512 total; 48 states; 46 motifs; 10 visual styles (from #3540). New 256 ×5=1280 proposed motif associations. The original 256 ×5=1280 associations come from #3540.
- New 256 have `mediaBindingStatus=unbound`, **zero newly verified MP4 or render-ready**; no clips are invented. The UI disables creating an export for new concepts, and no separate media rights/AI gate is bypassed. Real recorded footage and procedural animations remain distinct.
- `scoreBreakdown.mediaAvailability=0` until real approved sources pass the existing gate. Numerical heuristic scores are internal; client sees narrative descriptions, not psychometric percentages.
- Matching style hints, motif tags or a preview does NOT certify literal motif depiction, four plotted actions, media rights or audio licences.

## Feature flags and rollback
- `NEXT_PUBLIC_HH_STSE_ENABLED` must be exactly `true` **at build time** to expose the added selector. Default **off** in every environment; no Vercel secret/paid configuration change is performed by this PR.
- `HH_STSE_AI_PARSER_ENABLED=false`: not implemented, never required or charged.
- `HH_STSE_CONTENT_EXPANSION_ENABLED=false`: all new concepts remain editorial/unbound, never released as playable media by the flag alone.
- Roll back by removing `NEXT_PUBLIC_HH_STSE_ENABLED` (or setting it to false) and redeploying; the unchanged 256-scenario selector, MP4 rights and 4-plot APIs are the fallback. SessionStorage tab-local, canonical IDs only; no raw free text or server telemetry. For code rollback revert the integrated PR, not the canonical 256 old IDs.

## Domain contract
```js
recommendScenario({
 schemaVersion:"state-transition-request-v1",locale:"ru",topicId:"life-purpose",
 current:{stateId:"anxiety",intensity:"medium"},
 desired:{stateId:"confidence",intensity:"medium"},
 preferences:{styleId:null,excludedMotifIds:[]}
})
```
Returns `scenario-recommendation-v1`, status, recommendationId, normalized canonical IDs/confidence, a path of 4 artistic stages, a selected scenario and up to two alternatives, grounded motif/style IDs, reason codes, explicit `needs_verified_media` (never fake `render_ready`). Unknown/ambiguous inputs fail closed and invite clarification; crisis text triggers safe support. No paid external NLP, no new endpoint/CSRF/auth surface: existing browser-only director invokes a pure function. This choice preserves existing privacy architecture; a public API would require independent auth/abuse reviews.

## Acceptance before LIVE
1. Review and merge upstream #3540 by its separate exact-HEAD CI and permissions; do not overwrite its active repair branch. This STSE work must be rebased or stacked safely.
2. Run `node --test tests/state-transition-scenarios.test.mjs tests/mytube-creative-choices.test.mjs tests/mytube-content-taxonomy.test.mjs tests/mytube-plot-montage.test.mjs tests/mytube-video-tagging.test.mjs`, plus lint, TypeScript/Next build, applicable specialist security/browser/WebKit checks. Preserve real `hh-merge-check`.
3. Human editorial review and duplication assessment for all new 256, recorded separately. New sources must pass real media and rights checks; until then no export for those scenario IDs.
4. Owner-controlled feature-flag rollout after tests; responsive iOS/desktop RU/EN/ES 320/390/430; refresh/select alternate/confirm, preserved voice/music/captions and export on a previously approved legacy path.
5. Protected GitHub merge SHA -> independently verified Vercel production deployment SHA/alias -> actual click/playback/export smoke. Do not claim **LIVE** from PR, HTTP 200, a green check, or unbound editorial data.

## Current limitations
- Without a permitted browser/device/renderer session, a real owner-account E2E or licensed MP4 export is *not* proven by these source files.
- 256 new editor-created scenarios require human review and plot/media bindings. Their mere existence is not a release or validated therapy.
- Deterministic classification is deliberately restricted to canonical state names and RU/EN/ES aliases; unknown long free text invites one clarification rather than hallucinating a diagnosis.
