# Holistic Video Studio · Cinematic Director / six-module delivery
**Product:** Holistic House · **Owner:** Andrey Litvinov · **2026-10-29**  
**Source of truth:** [books #2397](https://github.com/andylitvinov-design/books/issues/2397); personal eight-session course [#2503](https://github.com/andylitvinov-design/books/issues/2503); Kling pilot [#2256](https://github.com/andylitvinov-design/books/issues/2256).  
**Canonical route:** `/{en,ru,es}/holistic-support/mandala`; **Production Git branch:** `codex/public-book-library` (not repository default).

## Intent and six requested modules

A client can describe a desired visual journey, adjust four compact fields, choose an aesthetic direction, preview a safe storyboard and record a real four-scene moving montage without third-party transfer or credits. AI Premium is a **separate, quote-first, owner- and receipt-gated workstream**, not a hidden paid button.

| Module | Existing assets reused | Current implementation / gate |
| --- | --- | --- |
| 1. Director / prompt compiler | `personal-video-intent.mjs`, `mandala-free-video-studio.tsx` | `cinematic-director.mjs`: deterministic human-readable four-shot storyboard, curated safe prompt, local goal-based scene selection; no AI inference, diagnosis or private external prompts |
| 2. Style library | Existing six themes + original scene catalog | Four visual identities (Golden hour / Nature / Dream / Minimal); consistent light/camera, EN/RU/ES; user can specify imagery to avoid |
| 3. Provider router | Owner `kling-video.mjs`, `kling-avatar.mjs`; HeyGen Digital Twin | `cinematic-production.mjs`: free local and candidates Kling 2.5 Turbo, newer Kling, Runway, Higgsfield, HeyGen owner-only. No fabricated price; client-private content blocks all providers |
| 4. Jobs & spend governance | Existing owner Kling admin explicit consent and manual task readback; payment infrastructure | Quote/owner/rights/payment decision and state machine `draft→quoted→approved→payment_verified→submitted→provider_ready→qa_passed→delivered` with verified proof placeholders. **Pure contract only**: no new provider execution endpoint or persisted job table until commercial and E2E gate |
| 5. Montage & QA | Existing first-party Canvas + MediaRecorder, original audio and affirmations | Local four-shot animated montage now uses the original recorder with preview and export; offline owner-only FFmpeg command can combine separately approved real source clips into Full HD H.264/AAC with optional permitted narration/music/captions and ffprobe QA. Not hosted on Vercel |
| 6. My House | Existing `app_private.personal_videos`, private Supabase bucket `hh-client-private-media`, RLS, `/{locale}/app/videos` UI | Reuse existing owner-account gallery; no duplicate storage model. **Production cloud-save flag remains OFF** until production migration/owner RLS/E2E/iPhone and storage budget are verified. Never silently upload generated photos or videos |

### Client UX (same editor, not new route)

- A small **Cinematic Director** card expands inside the existing editor after optional audio/affirmation controls.
- **Four main rows**: Topic, Main challenge, Desired change, **My profile** (not connected by default). Visual style and excluded imagery live in a secondary advanced disclosure. One compact summary, one reusable accessible edit sheet.
- Current topic is synchronized when entering. My profile opens a separate **unchecked** permission; only a user click triggers first-party `GET /api/app/bootstrap?view=portrait`, validates source through existing `buildPsychPortrait` and `suggestGuidedGoalsFromProfile`, then presents optional themes to accept manually. No scores/gender/diagnoses are exposed in provider prompts, URLs, JSON export, logging or the new video storage. Revocation invalidates in-flight reads. Sign-in/refresh links reuse current My House/My Tests. Each row opens the same mobile sheet; short 320px phones can scroll naturally.
- Format 16:9 / 9:16 / 1:1 and 20/30/60 s. Button `Create storyboard` generates four **distinct** and sequential local scenes. A screenshot/card is NOT a rendered movie.
- Each of four shots can now be individually replaced with a **trusted pre-existing local scene** or swapped with another shot. All choices are allowlisted and pre-filtered by excluded imagery; a swap cannot duplicate a scene. A changed shot invalidates any previously applied montage until the client explicitly reapplies the new plan.
- `Use as free moving montage` configures the existing recorder: local Canvas draws scenes in the correct order, with a mild dark dissolve on cuts. Client must separately tap the existing **Create video** action. User photo, narration, ambient audio, consent and affirmations stay independently controlled; changing manual template/duration resets the planned montage.
- EN/RU/ES and keyboard focus/reduced motion/mobile widths 320–430px. Nothing starts on mount, auto-submits or auto-plays.
- The owner may download a de-identified, provider-safe storyboard JSON. It contains only curated symbolic scene IDs/camera/prompts and timecodes, **not** the raw challenge/wish/profile.

### Provider privacy and cost boundaries

- `buildCinematicStoryboard` only uses client-entered text in browser memory to choose one of preapproved symbolic scenes. `providerPrompt` is **recomputed from trusted catalog content**, never interpolates personal words. `safeCinematicPrompt` rejects tampering.
- Private client faces, medical data, test results, reports, goal text and identity must not be sent to Kling, Runway, Higgsfield, HeyGen or external analytic pixels. A client photo may be composited locally only after opt-in and image permission.
- HeyGen: previously verified owner's private Digital Twin + approved language voice only. No stock avatars and no new paid render without the owner's separate current approval.
- Current Kling server switches remain OFF: `HH_KLING_PAID_GENERATION_ENABLED`, `HH_KLING_AVATAR_PAID_ENABLED`, `HH_KLING_PREMIUM_RENDER_ENABLED`. API key presence does **not** prove valid paid package or allow client generation.
- Runway was authenticated 2026-10-29 in ChatGPT but its **free workspace had zero available video models**, no brand kits/workflows. Connecting an assistant Plugin is NOT equivalent to server API integration. Higgsfield not yet connected; no extra paid subscription, aggregate router or duplicating requests.
- No external job until live provider quote (currency, expiry, receipt ID), owner-approved maximum, commercial rights and server-verified order/payment. A browser checkbox must never be sole cost authorization; idempotency receipts must be stored before retry and duplicate payment must be prevented in database transactions.
- For private videos, My House uses authenticated, scoped and expiring signed storage; never public YouTube/Metricool/Telegram/WhatsApp. The user's first free clip stays local until explicit account consent and independently validated upload.

### 8-session guided-imagery path

Existing `MandalaGuidedCourse` / `personal-guided-course.mjs` remain the sole eight-session planner. Each approved session should eventually have a distinct connected storyboard, reviewed script, **real** audio master, actual video master, subtitles and checksum. Only the first short free preview is currently deliverable locally; sessions 2–8 are not unlocked products. A professional must review personalized therapeutic scripts. No AI diagnosis, compulsory trauma recall, cure/income/love promise, or autonomous clinical treatment.

### Owner-only offline assembly (optional, no provider costs)

`node scripts/cinematic-video-assemble.mjs ./approved-cinematics/manifest.json output/master.mp4`

Example input (all referenced files must be within the manifest directory and rights-cleared):

```json
{
  "version":"hh-assembly-1","locale":"en","aspect":"landscape",
  "audioMode":"narration_with_music",
  "clips":[
    {"file":"01.mp4","seconds":5,"rightsConfirmed":true},
    {"file":"02.mp4","seconds":5,"rightsConfirmed":true},
    {"file":"03.mp4","seconds":5,"rightsConfirmed":true},
    {"file":"04.mp4","seconds":5,"rightsConfirmed":true}
  ],
  "narration":{"file":"narration.wav","rightsConfirmed":true},
  "music":{"file":"music.wav","rightsConfirmed":true},
  "subtitles":{"file":"subtitles.srt","rightsConfirmed":true}
}
```

The command validates input files and local directory boundaries; requires explicit rights; normalizes 1080p/fps and mixes voice/music at separated levels; optional subtitles use MP4 mov_text; outputs H.264 and AAC when a soundtrack is supplied. `ffprobe` verifies video, duration, and expected audio. This is an **offline owner batch tool**, not an HTTP render service. For long therapeutic videos, reuse cleared scenic masters and combine with unique scripts instead of spending credits on 8×10 min AI footage.

### Future server-side delivery gates (not activated)

1. Real provider account, API contract, commercial license and one controlled non-client render, plus exact cost from provider.
2. Persistent owner-scoped `render_jobs` DB with unique external ID, cost/approval/payment receipt, idempotent status reconciliation; privilege-checked endpoints and queue/worker distinct from expensive Vercel request time.
3. Approved media ingestion with checksum, FFmpeg QA, archive, private RLS storage, signed read links, lifecycle and deletion.
4. Authenticated owner-only 8-session review and entitlement from **real** paid order; non-sensitive progress in My Courses/My Development Path.
5. Independent real iPhone Safari (320/354/390/430) video+audio+download, RLS/account-switch, network error, retry/idempotency, GitHub exact-head CI + Vercel READY exact SHA/domain and provider media readback.

**Honest status:** the zero-cost director/storyboard/montage and offline assembler are actual code, subject to CI/browser QA and production readback. The extended paid-cloud pipeline, server job persistence, auto Drive ingest, eight delivered films and account upload E2E must not be labeled complete until verified.


### Client-prompt acceptance refinement · 29 October

The previously chosen **four base scenes per theme** are preserved as the default film. An explicit supported wish may now replace shot **3** with another **already approved** visual from the existing first-party library. Examples (all on-device, no external image creation): RU `оплата` → `money-magnet`, EN clients/partners → `partners`, RU `отдых и расслабление` → `light-waterfall`, EN mountain-air → `mountain-air`, EN blooming flowers → `wildflower-dance`, ES rest → `gentle-falls`. Additional safe scene descriptions are part of the trusted visual prompt catalog; the raw client wish remains private. The other three stages, duration and user photo/music permissions are retained.

**New release proof:** focused Node tests assert all six localized mappings, unique four-stage order and non-disclosure; the existing Chromium RU390 actual recorded montage scenario now decodes the **first and fourth saved video frames** with FFmpeg and compares real pixels in addition to validating a genuine media container. These tests require exact-head CI SUCCESS and must not be confused with physical owner iPhone Safari playback or unlimited AI text-to-video. No paid API, job, CRM event, storage migration or duplicate editor was introduced.



### Avoidance and styles — rendering acceptance

The owner-requested visual exclusions (water, trees/forests, night) are now enforced without making four copies of a single allowed image. When the chosen theme lacks four distinct safe motifs, the plan finds other **already approved first-party scenes**, keeping each shot's actual `theme` so Canvas paints the correct motif. It never silently reintroduces excluded visual cues or invents unavailable licensed footage. The main topic remains unchanged for the visitor, while individual storyboard shots may use visually compatible neighboring themes. Pure executable checks covered 54/54 theme/locale/duration combinations, all six detailed prompt examples and four distinct acceptable shots for water/tree/night exclusions.

Four named visual style filters (**Golden hour / Nature / Dream / Minimal**) now apply separate Canvas color/light grades to the same moving frames in both preview and actual MediaRecorder, rather than affecting only hypothetical AI-provider prompts. Browser-output video and real recorded pixel comparison remain mandatory CI gates; the on-device source tests do not establish physical iPhone Safari export.

