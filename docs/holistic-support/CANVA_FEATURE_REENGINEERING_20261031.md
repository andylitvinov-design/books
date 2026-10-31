# Holistic House: Canva feature re-engineering, 31 October 2026

## Objective and guardrails

Implement independently developed, goal-first creation in **the existing** `/{ru,en,es}/holistic-support/mandala` Video Studio. Do not duplicate the editor, clone proprietary Canva source/UI/branding, scrape paid assets, reuse licensed third-party templates without permission, or promise generative footage from local Canvas.

Canva's public product pages (observed 31 Oct 2026) establish the benchmark:
- Magic Video: prompt + 1–10 user media assets, auto sequence/transitions/music, up to 60 seconds: https://www.canva.com/help/magic-video/
- Video Editor: multi-layer timeline, auto captions, format resizing, native edits: https://www.canva.com/video-editor/
- Canva AI 2.0: conversational design, layered editable outputs and brand intelligence (research preview): https://www.canva.com/newsroom/news/canva-create-2026-ai/
- Magic Layers is proprietary image-to-editable-elements technology; **not** a reusable open-source library: https://www.canva.com/newsroom/news/magic-layers/

**Our differentiation:** user's goal -> Auto Video Director chooses an actual approved scene sequence and soundtrack -> one approval -> preview -> true playable downloadable media. Optional filters and manual edit remain secondary. Therapy/support content needs careful wording and never promises clinical outcomes.

## Source-of-truth inventory: production branch, not default

Production target: `codex/public-book-library`. Existing `MandalaFreeVideoStudio` already has Canvas/local real-film preview, MediaRecorder export, real aspect `landscape|portrait|square`, an optional audio attachment, affirmations, Cinematic Director, safe opt-in language prompt API, and a goal-first `MandalaFirstVideoStart`. Do not rebuild any of these.

Related **open, not automatically LIVE** integration lines as observed 31 Oct 2026:
- #2643: goal-first Auto Director, available approved master clip taxonomy/montages
- #2773: honest food/«Еда» scene mapping + Gemini free AI fallback
- #2787: Safari playable MP4/WebM export recovery
- #2725: Stories & Characters using original renderer
- #2629/#2636: voices, audio and attachment controls
- #2705: XP creative-energy wallet

Release these in conflict-aware order; new features must not merge ahead of broken playable export. No invented provider free quota, verified media rights, payment readiness or deployed functionality.

## This branch: immediately implementable P0

**Implemented in code, pending CI and LIVE acceptance:**
1. Six localized free one-click starter designs: meditation, affirmation, inner strength, before sleep, visual journey, social short. Three locales, original safe wishes, theme/style/aspect/duration/movement/available sound presets.
2. Tap a starter -> update request + plan via existing `buildFirstVideoDraft` -> `onApply` -> original `applyFirstVideoDraft` -> original preview/MediaRecorder. No new video renderer, AI provider, uploads, storage, payment or XP debit.
3. Surface aspect selection 16:9/9:16/1:1 without opening advanced filters; both buttons and advanced select share `prefs.aspect` and invalidate previous draft using the existing apply callback.
4. Keep compact horizontally scrollable mobile toolbar; selected `aria-pressed` state; disable changes during recording.
5. Unit regression verifies all 18 localized combinations are actual supported scene sequences and UI connects to the production recorder. Test file: `tests/mandala-first-video-starters.test.mjs`.

**Limitations:** first-video starter designs still use approved original scenes, *not* text-to-video diffusion, automatic subtitling of spoken audio, generation of new realistic objects, direct posting to social platforms or multi-output batch rendering. A format change adjusts the next preview/export; it does not yet generate three files at once.

## Prioritized implementation roadmap

| Priority | Capability | Existing reuse | Acceptance |
| --- | --- | --- | --- |
| P0 | Finish clean preview -> encoded MP4/WebM -> native decode -> download (including iPhone Safari) | #2787, original MediaRecorder | actual playable downloaded result + correct extension and audio |
| P0 | Finish Auto Video Director with real clip inventory, exclusions and no hallucinated food/human footage | #2643 + #2773 | one-goal flow + actual source IDs, honest fallback, no unwanted upload |
| P0 | Current starter designs + fast aspect selector | this branch | presets update **exported output**, not just UI; RU/EN/ES |
| P1 | Smart 1–10 user-file montage, with explicit consent, client-only defaults, file validation and scene-order editing | existing Canvas renderer, film manifest, codec fallback | preview and export use same assets; missing assets fail visibly |
| P1 | Three-output aspect pack: 16:9, 9:16 and 1:1 with object-safe framing | existing aspect state | three independently decoded files, sensible crop rules, render cost/cancellation guard |
| P1 | Template/brand system for colors, fonts, short opener/outro, logos | source-defined brand style tokens and local composition | user can save, replace and remove; no logo rights violations |
| P1 | Simple timeline for trim, rearrange, narration/caption/music visibility and levels | CinematicStoryboard shots, existing audio/affirmations | same manifest for preview and export; visible stale-draft guard |
| P1 | AI edit commands («мягче», «замени море на лес», «вертикально») with deterministic non-network fallback | scene tags, exclusions, existing free provider gating | replan actual available scenes; no promises of unavailable material |
| P2 | Automatic caption generation/synchronization for approved uploaded audio | existing voice tracks, opted-in transcription | user review before export; correct multilingual timing and privacy |
| P2 | Editable layered images, background removal/expansion, long-form video | separately licensed models or first-party image editor | independent performance, cost, copyright and security review |
| P2 | Marketing packs and scheduling for Growth Studio | existing Growth Studio, supported publisher APIs | editable campaign assets + real authenticated publish acknowledgment |

P1 code architecture: versioned `CreativeProject` manifest containing `goal`, `locale`, `scenes[{id,source,start,duration,crop}]`, `aspect`, `style`, `textLayers`, `audioLayers`, `permissionEvidence`. Pure planner changes the manifest; preview and exporter render *the same manifest*. Feature-gate external provider calls and charging; run a quote before XP deduction; never charge on failed export. Avoid storing private therapeutic goals and media in public assets/logs.

## Release contract

1. Follow `AGENTS.md` and `docs/operations/CI_RELEASE_POLICY.md`. Current branch was created from actual production, **not** `codex/bootstrap-books`.
2. Run focused Node tests and applicable TypeScript/eslint/build, existing Mandala Chromium & WebKit encoded media/browser checks on the exact PR HEAD. Never call Draft-skipped or missing checks SUCCESS.
3. Preserve security, consent, auth, privacy and rights provenance. Do not merge a stale PR onto a changed base without checking conflicts.
4. When `release-ready` and all relevant specialists are green, use native protected squash auto-merge with zero required human approval and no protection bypass.
5. Confirm GitHub merge SHA, Vercel production deployment READY at exactly that SHA, correct `holistichouse.vercel.app` alias; then RU/EN/ES mobile click -> preview -> export -> open file. Track actual results separately.

**Success metric:** median taps from user goal to an actually playable video, successful exports per 100 attempts, explicit errors instead of false 'done', no unexpected XP deduction, and no regressions in existing therapy tabs.
