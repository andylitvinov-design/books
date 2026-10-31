# Canva workflow re-engineering → Holistic House Video Studio
**Date:** 2026-10-31 · **Target:** `codex/public-book-library` · **Approach:** implement useful interaction patterns with our original code, assets and data; never copy Canva's proprietary code, licensed stock or visual branding.

## What Canva actually does (official vendor documentation)
| Pattern | Verified behavior | Source | Holistic House analogue |
|---|---|---|---|
| Magic Design | Arranges the user's text and existing media into editable templates; does **not** itself generate video footage | https://www.canva.com/help/use-magic-design/ | Auto Video Director proposes a valid first-party storyboard |
| Magic Video | Takes 1–10 existing photos/videos and a prompt, automatically assembles up to 60s with transitions and music | https://www.canva.com/help/magic-video/ | Existing scenes + local timeline + original audio |
| Magic Resize | Resizes/copies a design into one or more output formats | https://www.canva.com/help/resize/ | Existing aspect control now; multiple exports from same plan later |
| Video Editor | Multilayer timeline, automatic captions, animations, transitions, highlights | https://www.canva.com/video-editor/ | Optional compact advanced editor after goal-first path |
| Canva Connect API | Authorized asset/design integration and export jobs (including MP4) | https://www.canva.com/help/canva-api/ and https://www.canva.dev/docs/apps/rest-apis/reference/exports/create-design-export-job/ | Optional future integration, NOT needed for local free creation |

Do not conflate Canva Magic Design (template composition) with text-to-video generative models, nor our locally composed Canvas films with photoreal AI generation.

## Baseline that already exists on production branch
- `components/mandala-first-video-start.tsx`: one-goal input, optional preferences, local prompt and opt-in provider enhancement.
- `lib/mandala/first-video-director.mjs`: theme/motif matching, approved scene selection, four/six-shot storyboard.
- `components/mandala-free-video-studio.tsx`: one canonical video workspace, preview and browser MediaRecorder MP4/WebM export.
- `lib/mandala/holistic-video-themes.ts`: first-party scenes and visual renderer.
- Existing 16:9, 9:16, 1:1 support is NOT the same as one-click **three separate exports** of the completed project.
- Some related improvements are pending, not yet production: #2643 expanded director/catalog, #2725 stories/characters, #2773 provider fallback, #2787 Safari export repair. Resolve their conflicts and verify independently before claiming them live.

## Fast-track implementation in this change
**Six zero-cost one-tap templates:** New morning, Gentle pause, Inner confidence, Heart connection, Quiet evening, New possibilities. RU/EN/ES have real editable ideas and real supported choices for theme, aspect, duration, motion, preset music and optional caption. Source: `lib/mandala/video-quick-templates.mjs`.

**Existing editor only:** Compact horizontal accessible strip immediately after the goal input, before optional advanced filters. Selecting a template populates user-editable text, resets any stale AI/manual prompt, preserves user visual exclusions and immediately calls the original `onApply` pipeline, so preview and recording use the same plan. No Canva integration, new renderer, new dependency, data upload, paid provider call or XP debit.

**Focused tests:** `tests/video-quick-templates.test.mjs` verifies six unique templates, all three locales, full scene plans and timeline totals, low-cost/local-only semantics, exclusion preservation, accessibility markers and reuse of existing recorder.

## Next work, ranked by value and delivery risk
### P0 · Deliver and stabilize existing media
1. Resolve/merge #2787 after actual Safari encoded media tests; download must decode before claiming success.
2. Resolve/merge #2773; production opt-in AI should either return a working useful result or a distinct honest local alternative.
3. Integrate #2643 scene catalog/Auto Director coherently; prevent blind merge against overlapping editor edits.
4. Integrate #2725 characters only for truly supported outputs; don't promise or debit unimplemented avatar features.

### P1 · Canva-like useful improvements without recreating Canva
1. **Project output pack:** Render 9:16 Reel, 1:1 Feed and 16:9 YouTube in separate media files from the *same editable plan*. Implement safe-area-aware captions and reframe, not just the aspect select already present. Validate all three actual decoders on Safari/WebKit/Chrome.
2. **Original Brand Kit:** Three optional palettes/font/icon presets, plus a reusable user-owned visual identity stored only with explicit consent. No third-party assets/licenses.
3. **Reusable personal templates:** Save a non-sensitive visual plan locally; later allow authenticated sync under existing private storage and RLS. Keep test results, consultations and PHI OUT of public drafts.
4. **Transitions:** Soft crossfade and audio fade between scene timecodes, with export/preview parity and reduced-motion support; keep advanced timeline optional.

### P2 · More substantial and provider-dependent
1. **Timeline editing:** Storyboard cards with reorder/split/trim and separate audio/text tracks, without requiring novice users to operate the timeline.
2. **Captions and voices:** Finish existing #2629/#2636 real Google TTS and original audio tracks first. Automatic time-aligned subtitles can be a later paid/free-tier-gated optional feature.
3. **Canva import/export connector:** If explicitly useful, add Canva Connect OAuth with minimal scopes for customer-owned design assets and export jobs. It is an integration with Canva, **not** a clone or a way to bypass Canva's quotas, licenses or Pro limits.
4. **High-end AI scenes:** Opt-in, separate renderer and cost quote. Never substitute fake photoreal media or claim generated video from a static preview.

## Product interface principle
**User goal → one recommended storyboard → preview → optional adjustment → verified playable video.**
Templates are shortcuts, not a required questionnaire. Advanced filters, 49 creative-brief questions, pro options and timeline must remain behind optional disclosures.

## Delivery acceptance
- Focused Node tests; TypeScript/ESLint; applicable existing Mandala Chromium & WebKit checks.
- Verify original 320/354/390/430px mobile layout with accessible horizontal overflow and keyboard focus.
- Check real preview/export coupling (not only mocked/source tests), saved media container and decoder, caption and audio when enabled.
- No external calls or XP deductions from free local presets. Explicit consent for any future cloud AI or uploads.
- Branch-specific `release-ready` and all applicable specialist checks must be successful at exact HEAD before native auto-merge. Then Vercel production READY on merge SHA and physical mobile smoke. Never equate merged code with verified live behavior.
