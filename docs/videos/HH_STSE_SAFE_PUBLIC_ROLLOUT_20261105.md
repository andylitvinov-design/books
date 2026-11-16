# HH STSE — safe public Now → Want release · 2026-11-05

**Source authority:** [HH State Transition & Scenario Engine specification](https://docs.google.com/document/d/1VOoewJhFvYoju5MiuFdGY-x4PhFWqnR-qDQGDM5_3YQ/edit), `docs/operations/CI_RELEASE_POLICY.md`, [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md).

## Product decision
Owner requested to release STSE rather than leave its UI permanently disabled. This PR makes the safe, **existing editorial scenario** Now → Want recommender visible in the existing topic selector, without requiring a paid AI service or a second editor. The new 256 editorial concept drafts remain separately gated and cannot produce an MP4 without real footage approval.

## Two independent build-time switches
- `NEXT_PUBLIC_HH_STSE_ENABLED`: enabled unless its value is the exact string `false`. The switch restores the legacy four-scenario UX when disabled. **No extra environment variable, API, credential or provider** is required for the routine public baseline.
- `NEXT_PUBLIC_HH_STSE_CONTENT_EXPANSION_ENABLED`: strictly `true` to surface the four **unreviewed** extra scenarios per topic as **non-renderable editorial concepts**. Defaults off. This is **NOT** a release-ready switch; keep off until owner editorial review and actual source binding/rights approval.
- Existing `NEXT_PUBLIC_HH_MEANING_IDEA_ENABLED`: remains an independent higher-level meaning wizard. If its existing gate is on, it continues to replace the separate STSE form rather than displaying two competing "Now → Want" wizards.

## Available now after successful deploy
- User selects one of 64 verified topic IDs, then one Now and one Want canonical state. No client diagnostic percentages, no crisis diagnosis, no required long survey.
- Offline-only state normalizer, path planner, deterministic ranker. Optional intensity and self-described energy affect gentle pacing; one primary option + up to two diverse alternatives and localized explanations.
- Current public recommendation pool: 4 legacy scenarios per topic = **256**. Every suggestion remains a symbolic editorial concept until existing licensed footage validation succeeds; no misleading `render_ready` status is returned by the text recommender.
- User explicitly confirms a choice; canonical state IDs + optional energy + approved scenario ID, transition template/motif/style ID are kept only in sessionStorage (no free emotional prose and no cloud telemetry). The dedicated STSE selector remembers only canonical state IDs, optional energy and the user's confirmed choice within the current tab. The parent Video Director intentionally does NOT store topic navigation across refresh: users reselect a topic before applying a film, preserving its existing privacy and editor contracts.
- The **existing** MyTube topic/story media resolver and `validateMontageClips` perform the real rights/media gates before compiling 4 verified MP4s. Existing phrase, voice, music, montage, timeline and export modules are preserved, without new API or paid provider.

## Expanded editorial atlas (not playable)
- Existing immutable 64 topics / 256 scenario IDs / 1,024 plot IDs unchanged.
- Four additional distinct `-s5` through `-s8` entries per topic = **256 new** / **512 total**.
- RU/EN/ES script edits now use the original *topic-specific* narrative scenes as anchors for different mechanisms (crossroads, compassionate witnessing, personal boundary, manageable experiment), without copying complete existing beats. **This is still AI-assisted creative drafting, not independent owner/human approval**.
- Each new entry: four nonidentical story beats per locale, five curated motif IDs (256 different 5-motif combinations), 3 style options, evidence status `editorial_visual_hint_not_frame_verified`, status `needs_human_review`, `unbound`, `published=false`. New approved physical clips: **0**.
- The expanded atlas must not be portrayed as 512 licensed ready-to-render videos. Real recorded footage and procedural animations remain distinct; topic tags alone never prove literal visual depiction.

## QA and rollback
- Run new and existing MyTube/STSE domain + UI tests; validate all 64×8 and RU/EN/ES. Explicit negative cases: missing state, unknown topic, unsafe text, bad energy/draft parameters, high intensity, no unlicensed media claims, no duplicate story IDs/beat texts.
- Preserve exact-HEAD Core, BASE-trusted Specialist, `hh-merge-check`, public services and Mandala browser gates; never waive security/browser/auth/payment/consent/RLS checks or force-merge.
- Responsive click path needs actual mobile browser evidence at 320, 390 and 430px: navigate topic, select states, obtain a recommendation, change alternative, confirm, refresh, select an approved 4-MP4 preset, verify video+audio; no false export claim if a needed clip is unavailable.
- Rollback: set `NEXT_PUBLIC_HH_STSE_ENABLED=false` in the existing Vercel project and redeploy under existing protected policy, restoring the prior four-option editor; leave editorial atlas and user videos intact. The draft flag remains off. Rollbacks require build-time deployment and source/alias verification; changing an env var alone is not deployed proof.
- No new paid service, credential, schedule, webhook, secret or runner created. Ordinary required GitHub/Vercel CI usage is not guaranteed free of billing overages; observe existing allocation.

## Remaining acceptance, never silently marked complete
1. Human/editorial review of all 256 new plot drafts (quality, uniqueness, crisis-sensitive phrasing, RU/EN/ES).
2. Owner-confirmed per-source media rights, playable MP4, visual approval and strong topic/plot/beat coverage, then status change from unbound only on evidence.
3. Real iOS Safari/Chromium/WebKit gesture playback/export and audio compatibility for selected new scenario families before expansion goes public.
4. Exact served Vercel production SHA + alias + true user-flow smoke; CI or `READY` alone is not proof.

## Verified regression correction · 2026-11-05
The first public-release PR #3577 auto-merged while independent Mandala tests were red: legacy Director-level no-storage safeguards (`tests/mandala-auto-video-director-ui.test.mjs` and `tests/stage-caption-track.test.mjs`) correctly rejected `sessionStorage` added directly to the shared Director. The smallest source repair removes only the parent-level topic/session persistence while **retaining** the dedicated opt-in STSE selector's canonical, tab-only choice record. The tests and their assertions remain unchanged. This is a separate mandatory production correction, not proof of new video coverage or a browser export.
