# Holistic House · Video Studio home · Holistic Light, Warm & Alive · 2026-11-02

## Source and scope
Owner supplied live mobile screenshots of `/{locale}/holistic-support/mandala` (first two images) and two warmer, larger Holistic House mobile mockups (third/fourth images), and approved a large-card editorial redesign in chat on 2 Nov 2026. The target is the **existing public Video Studio**, not a new page/player/renderer. Production branch: `codex/public-book-library` (NOT repo default).

## Main mobile journey (RU / EN / ES, 320–430 px)
1. Existing brand bar: readable identity, working home and profile links.
2. Real original Canvas/MP4 hero stage: warm scenic background, longer/clearer headline, actual play/pause control, 00:30 badge. Hero aspect around 1.54:1 instead of a narrow strip, not a still-image false preview. No autoplay. Original media and consent semantics remain.
3. Existing six Video Studio workspaces: 3 columns × 2 rows on mobile, large icons, 12px+ text, 44px+ hit areas. Switching tabs preserves single preview, shared audio, photo, draft and editor state.
4. Step 1 goals: four source-backed picture cards **2×2**, approx 184px min card height; energy / stress / relationships / money, real `aria-pressed` selection.
5. Step 2 personal topic: 60px input, readable help entry to the **one** consent-gated Video Director chatbot, popular choices in 2 columns. Raw private text stays in existing local state.
6. Step 3 four real scenario MP4 storyboards: **2×2** image cards with visible labels, selected state, old storyboard/timeline retained as an optional disclosure, and a wide 70px next action to the existing phrases/audio workspace. Selecting a scenario is NOT yet a rendered video. Real create/download remain behind existing readiness/rights/codec gates.
7. Three large pastel shortcuts after scenarios: Create meditation / Create ritual / Course of 8 practices. They open the **existing** gated `MandalaGuidedCourse` flow, never a duplicate renderer or clinical claim. If a later step is locked until a focus or script exists, guide the user to the existing focus step.
8. Advanced settings remain behind existing disclosure, not removed. Fixed site/mobile dock remains unmodified, as does personalized export and private data.

## Tokens and accessibility
Warm ivory surfaces, nearly-white cards, forest-green headings, green main CTAs, pastel mint/peach/pink/lavender category accents, scene artwork from first-party approved assets. Mobile controls min-height 44px, text fields >= 16px (no Safari zoom), clear focus ring and selected `aria-pressed`. Respect reduced-motion and iPhone safe-area. At 320/354/390/430 check no horizontal overflow, clipped labels, obstructed player or bottom-dock buttons.

## Acceptance
- Existing source contract suite `tests/mandala-auto-video-director-ui.test.mjs`, Mandala Core, TypeScript/Next build, lint and privacy.
- Rendered Chromium and WebKit EN/RU/ES at 320/354/390/430: select each pictured goal, type a topic, select a film, verify all four story posters and big next CTA, tap through real phrases/audio and each of the three shortcuts. Check no duplicate renderers, no unauthorized POST, no unintended external playback.
- Compare viewport/full-page screenshots to owner reference for hierarchy, typography, spacing, crop and visible touch targets. Browser screenshots prove synthetic viewport parity, **not actual iPhone Safari or provider delivery**.
- Protected merge to actual production branch and Vercel READY exact merged SHA and `holistichouse.vercel.app` alias; functional live click/preview check needed before calling LIVE.

## Release blockers
Do not claim live solely from a green unit test, HTTP 200 or GitHub merge. Do not buy video/API credits, start real paid AI rendering or send visitor material to external providers without consent. Existing `#3113` six-button dock and other open PRs are independent; preserve their work and reconcile against current production before merge.

## Owner-approved update: Montage 5 / PRO 6 (2 Nov 2026)

- Existing six workspaces reordered to video, phrases, effects, practices, editor, pro; user-facing fifth is Montage with Quick generation title, sixth is PRO.
- Fifth offers four actual shared-state panes: Video style, My photo, Voice, Music. Existing licensed MP4 style posters/quickPickStyle, original consented photo picker, MandalaCloudVoiceStudio and one deepAudioPane; no duplicated rendered video or audio player.
- Existing format 16:9 / 9:16 / 1:1 and duration 15/20/30/60 stay connected to changeVideoAspect/changeVideoDuration. Shared preview and original createQuickVideo export CTA are preserved.
- No repeat goal/content prompt. Sixth contains only MandalaStoriesCharacters, MandalaCinematicDirector, deepVideoPane and original reorder/retime timeline; five character/story/place/symbol/event categories preserved.
- #video-audio and #voice-studio navigate to fifth; #video-settings and #cinematic-director navigate to sixth. Missing consent/audio rights directs to the original visible controls.
- Warm ivory/green design matching owner reference. Chromium/WebKit at 320/354/390/430 should click all four fifth panes, original photo/audio controls, format/duration and both PRO panels.
- Keep provider/paid releases disabled. Genuine voice preview remains subject to independent PR #3142 integration. Required exact-head Core, Mandala, media browser and hh-merge-check must pass before merging or LIVE claims.
