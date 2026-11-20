# Holistic House Video Studio — Creative Director v4, implementation wave 1
Date: 19 Nov 2026 (Toronto). Canonical repo: andylitvinov-design/books, protected production: codex/public-book-library.

## Purpose
Turn a client's words into one coherent story instead of seven loosely-related keyword matches.
P0 logic: **request → primary topic → (only confirmed) current/desired state →
client-chosen goal → narrative mechanism → two causally appropriate complete films →
one chosen 30-second film → six observable actions → supported phrases/media**.

### Seven decisions, in strict order
1. **Intent:** use the user's own text/voice and any manually chosen canonical topic. An explicitly chosen topic wins over weak lexical inference. Do not assume diagnosis or family history.
2. **State:** use only explicitly confirmed current/desired mood/energy and chosen meaning axis; absent answers remain absent (never turn default slider values into facts about the user).
3. **Goal:** show 3 main + 2 optional client-appropriate choices in the existing Ideas Goal UI (#5165); leisure, gentle support and intentional change are distinct functions, not severity levels. The selected Goal carries id/type/mechanism/primary+secondary screenplay strategy and original topicId.
4. **Mechanism:** one declared editorial hypothesis (e.g. grounding, self-acceptance/validation, cognitive reframing, mental rehearsal). It selects the *kind of change depicted*, never guarantees a psychological change in the viewer.
5. **Scenario:** from the four canonical scripts owned by that topic, select **two independently observable dramatic approaches**. Source: one `film-screenplay-256.mjs` and existing 20 independently directed overrides; remaining 236 are structural editorial drafts awaiting review. The selected goal mechanism is evaluated against **visible shot actions** (especially 10–30s), not just matching film title or archetype. Confirmed personalization and explicit specific intent remain weighted.
6. **Plot and six shots:** MyTube six variations per scenario have FOUR story beats; they are **not** six alternate Video Studio six-shot films. Never silently claim a selected four-beat plot is visually identical to a six-shot film. Scene roles: recognition (0–5), obstacle (5–10), resource (10–15), turning point (15–20), chosen action (20–25), open ending (25–30). Four-to-six mapping is [0,0,1,2,2,3]. An explicit MyTube plot ID remains `needs_four_to_six_beat_editorial_alignment` until individually reconciled and reviewed.
7. **Phrases / footage / export:** phrase anchor slots are the opening, resource/reframe and chosen action; text is NULL until someone chooses it. Symbolic photo montage must be labeled as such, never as literally verified action footage. Actual visual subjects, source, license, credits, physical JPEG/MP4 decoding, iPhone playback, credit holds and publishing permission have independent gates.

## In-code, wave 1
- `lib/mandala/video-creative-plan-v1.mjs`: `buildVideoCreativePlan`, `rankGoalCausalFilmDirections`, `assessGoalFilmCausality`, `videoCreativePlanIsCoherent`. This is pure, local, zero network/LLM/storage. Explicit missing/mismatched topic fails closed; unconfirmed inputs cannot influence a personal record.
- `lib/mandala/video-creative-directions.mjs`: all four scripted variants rank with actual late-stage actions when `base.goalPlan` is present (upcoming Goal Composer #5165); existing ranking is unchanged without a selected goal. Selected direction stores a single CreativePlan alongside the already identical six storyboard actions.
- `lib/mandala/auto-video-concept.mjs`: editing a concept clears the previous plan, rather than silently letting a stale topic/story/goal approval survive.
- `tests/mandala-video-creative-plan.test.mjs`: 256 scenarios × RU/EN/ES = 768 six-shot contracts, goal ranking by observable rehearsal, 4-beat/6-shot honesty, never-verified media, immutability by goal selection, and editorial story/Montage parity.

## What does NOT become true
- A deterministic text match is **not therapeutic efficacy** or independent artistic review.
- A `strong_tag_match` stock image is **not** physical proof of a depicted action.
- Story source metadata is **not** a valid/decoded/exported MP4.
- The number of individually directed scripts remains 20/256 until additional scripts are actually authored and approved.

## P0 release dependencies and next waves
- **Goal UI #5165** is open/stale against merged #5093 and must be reconciled without losing iPhone native H.264/AAC, photo opt-in, WebKit selectors. Do not separately overwrite it. Open #5126 (one-tap Quiz), #5145 (desktop step+phrase order), #5100 (top-level Goal) overlap this component; land a single protected integration, preserving the original mobile/desktop layouts.
- **Wave 2:** editorially align explicit chosen four-beat MyTube plot variant to the film's six physical scenes, with a genuine filmable beat rather than generic wallpaper, and bind approved phrase text to narrative roles. Require reapproval if a goal/scenario/shot is changed.
- **Wave 3:** actual frame-by-frame media inspection in 9:16/16:9, visual proof, source author and license, replacement/fallback only under label "symbolic montage"; native iPhone & Telegram verified MP4, saved and replayed. No manually deployed/budget-spending runs.
- **Wave 4:** individually author/review remaining 236 films and evaluate user-perceived meaning fit/agency separately from structural text coverage.

## Acceptance commands
`node --test tests/mandala-video-creative-plan.test.mjs tests/film-screenplay-256.test.mjs tests/mandala-video-creative-directions.test.mjs`
`node scripts/audit-mytube-creative-coverage.mjs`
Full protected exact-HEAD Core/Mandala checks. Only after native merge plus the existing hourly Vercel production alias serving that commit can this wave be called LIVE. No paid provider, new Cron, DB migration, deployment or new media-renderer instance.
