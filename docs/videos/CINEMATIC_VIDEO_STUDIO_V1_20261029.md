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
- Four editable rows (Topic, Main challenge, Desired change, Visual style) plus optional "Avoid these images"; one phone screen can show the collapsed summary, with a single accessible edit sheet.
- Current topic is synchronized when entering. Each row opens the same mobile sheet; full-height screen is not required on a short 320px phone.
- Format 16:9 / 9:16 / 1:1 and 20/30/60 s. Button `Create storyboard` generates four **distinct** and sequential local scenes. A screenshot/card is NOT a rendered movie.
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
