# Holistic House Video Studio · Reliable generation architecture v1
**Technical reverse-engineering** · 2026-10-31 · implementation map / design contract
Target production branch: `codex/public-book-library`. Use original code and licensed assets, NOT proprietary Canva/HeyGen/Runway internals.

## 0. Evidence and critical boundaries
This is a reconstruction of **publicly documented workflow patterns**, plus a read-only inspection of a user-owned HeyGen template and actual Holistic House source.

1. **Canva Magic Video**: 1–10 provided photos/clips + prompt/style/type → template-driven trim/sequence/music → editable video up to 60s. Canva's separate generative Video Clip creates short footage; Magic Design is a layout/arrangement process rather than original photoreal video generation.
   - https://www.canva.com/help/magic-video/
   - https://www.canva.com/help/use-magic-design/
   - https://www.canva.com/help/creating-and-editing-videos/
2. **Runway Workflows**: typed graph nodes (prompt LLM, image/video media model, utility stitch/trim/audio/reframe), published workflow version, task status, independent failures. Graph internals of Runway's proprietary models are not exposed.
   - https://docs.dev.runwayml.com/workflows/
   - https://help.runwayml.com/hc/en-us/articles/45763528999699-Introduction-to-Workflows
3. **HeyGen**: read-only inspection of the owner's completed 52.14-second RU Video Therapy production/QA source (video ID `2ff7fd4999a14e643fff0478fece25bf`; template ID `8169296768214369a9c8a19cc2743d06`). It has 1 editable scene with `moving_story: video` and `approved_voice: audio`. The user-facing result is completed MP4 with separate SRT. Provider links are **signed/expiring**: never persist them as permanent Holistic House assets; copy authorized completed bytes to first-party storage, validate and issue own scoped delivery link.
4. **Canva asynchronous export**: create export job → poll/get status → short-lived MP4 download URL. Crucially, "request accepted" is not "playable file".
   - https://www.canva.dev/docs/apps/rest-apis/reference/exports/create-design-export-job/

## 1. Current REAL production implementation and defects
`components/mandala-free-video-studio.tsx` is a shared browser Canvas + MediaRecorder renderer. The UI chooses video themes/scenes, creates a Canvas capture stream, optionally adds one audio track, records in **real time** (20/30/60s) and exposes an object URL. The resulting native `video` element must decode a frame before download. No connected Runway/Canva/HeyGen model currently runs as part of this free production renderer.

- `components/mandala-first-video-start.tsx` coordinates the goal, editable storyboard and an opt-in free prompt API.
- `lib/mandala/first-video-director.mjs` compiles a deterministic approved scene plan; it is not arbitrary text-to-video diffusion.
- `lib/mandala/first-video-free-providers.mjs` calls free-tier Gemini / OpenRouter **text models**, not video models.
- `app/api/holistic-support/first-video-prompt/route.js` enforces consent, quotas, same origin; availability of the upstream **cannot** be proved by mock tests.
- `lib/mandala/holistic-video-themes.ts` paints original frames, `lib/mandala/film-collection-v2.ts` chooses existing approved films.
- `tests/first-video-director.test.mjs` covers type/motif/scene contracts. Actual encoded preview/export needs Chromium/WebKit/FFprobe AND mobile smoke.

**Evidence-backed failures/risks:**
- Production synthetic free AI request returned 503 `VIDEO_PROMPT_PROVIDER_UNAVAILABLE`; #2773 adds free-only provider diagnostics/time budgets and honest local fallback. Current #2773 has had specialized browser failures; do NOT claim merged or live before new exact-head checks.
- iOS Safari may return a non-playable MediaRecorder MP4 even after a nonempty Blob. #2787 adds iPhone WebM-first preference, actual container byte verification, finalization cleanup and alternate codec; tests on exact HEAD passed and native GitHub auto-merge was enabled. Physical iPhone QA and Vercel exact SHA are still independent.
- The generic local keyword/scene matcher cannot represent arbitrary requested subject matter; e.g. `еда` without actual food footage. #2773 adds honest harvest alternative, #2643 prepares tagged 44-film scene library; do not claim generated food footage.
- Browser real-time encoding means a one-minute film may need up to one minute of active capture, and background tab / phone suspension can disrupt timers. An online cloud workflow cannot be simulated by calling Canvas capture "instant".

## 2. Target architecture, from documented patterns

```
GOAL + consented media / locale
    │
    ▼
[0] CAPABILITY & PRIVACY GATE
    ├── classify requested scene subjects (RU/EN/ES)
    ├── count available verified clips / images / voices
    ├── quote exact free/XP/paid entitlement before ANY charge
    └── choose ORIGINAL LOCAL / APPROVED FILM / CLOUD AI route
    │
    ▼
[1] PLANNER (always locally available)
    ├── deterministic structured storyboard (not just prose)
    ├── output: scene IDs + timing + framing + caption/audio tracks
    ├── check rights, actual playable sources, exclusions, format
    ├── LLM enhancement OPT-IN: free Gemini → free OpenRouter
    └── if both LLMs fail, keep a distinct usable deterministic plan
    │
    ▼
[2] MEDIA READINESS
    ├── load / probe local assets with timeouts
    ├── optional gen still → image-to-video / video model (authorized cloud)
    ├── no silent substitution: missing requested filmed objects = explicit warning
    └── use preview and output from same scene reference + timeline
    │
    ▼
[3] RENDERER
    ├── LOCAL Canvas/MediaRecorder, device codec negotiation
    ├── or FAST SOURCE ASSEMBLY for approved clips using trusted video muxer
    └── or remote task graph (prompt → media → montage → sound)
    │
    ▼
[4] ENCODE & VERIFY
    ├── verify MP4 ftyp / WebM EBML; reject zero/truncated output
    ├── probe frame count, dimension, duration and expected audio track
    ├── native WebKit/Safari decode videoWidth/videoHeight/readyState
    └── record an error code if any mandatory acceptance criterion fails
    │
    ▼
[5] READY (only after artifact checks)
    ├── show real preview + download + explicit file type
    ├── iPhone native Share as supplemental (not sole download)
    ├── if cloud: first-party copy from provider's expiring signed URL
    └── scope any private user media; never expose private files publicly
```

## 3. Unified video job contract (to implement after #2787/#2773)
- Immutable `jobId`, `requestedBy`, `requestHash`, `locale`, `storyboardVersion`, `renderMode` (`local_canvas`, `approved_montage`, `cloud_video`), `consent`, `quoteId` (paid only).
- Tracks are typed: `visual[]`, `speech[]`, `music[]`, `text[]`. Every visual has `sourceType`, `sceneId`, `assetRevision`, `rightsScope`, `startMs`, `endMs`, `fit`.
- Statuses: `draft → planning → ready_for_render → rendering → finalizing → verifying → ready`. Terminal `failed` / `cancelled` from nonterminal states only. No flip back from terminal to running.
- Store `createdAt/updatedAt`, monotonic `revision`, `providerAttempt`, sanitized `errorCode`, `mediaMime`, `bytes`, `durationMs`, `downloadLocation` only when ready.
- Duplicate user clicks with same immutable `requestHash` return original job, never repeat a paid provider charge or XP debit. A changed prompt creates a new revision, invalidates stale output.
- Never show `complete` based solely on provider's HTTP 200, job accepted, status text, Blob size, or `URL.createObjectURL`.
- If one media step fails: fail the dependent nodes and preserve any valid independent outputs. Provider retry is bounded; never silently retry a non-idempotent paid model.

## 4. Model routing
**Free Plan** (always available): approved local Canvas scenes, approved 44-film library when validated, simple animations; local prompt compiler unaffected by remote outages. Explicit user opt-in to free LLM only for *text*. No promises of generated real actors, animals, plated dishes, avatars or photoreal actions.

**Optional Paid** (not deployed until approvals): choose model adapter by capability, quoted cost, latency and credits:
1. text-to-image / start-frame adapter for stills;
2. image-to-video / text-to-video adapter for requested real moving subject;
3. video-to-video for authorized source edits;
4. local/hosted clip stitch + audio mix as separate operation;
5. first-party download after completion and validation.

Route capabilities with a table, not string matching in UI. Unavailable provider → error code + offer existing free route **without charging for unproduced media**. Never transmit health records or client reports into external media models without proper authorization.

## 5. Reliability & observability
Record redacted `requestId`, `jobId`, status transitions, selected route/model ID, stage duration, retry reason and output codec only. Exclude personal wish text, client photos, private tests, API keys, generated speech and provider response bodies from server logs. Correlate browser recorder failures with client-side sanitized error reports only with permission.

Error taxonomy:
- `PLAN_UNSUPPORTED_SUBJECT`: no actual visuals; offer approved abstract alternative.
- `PROMPT_PROVIDER_UNAVAILABLE`, `PROMPT_TIMEOUT`, `PROMPT_QUOTA`: local storyboard remains interactive.
- `MEDIA_SOURCE_MISSING` / `MEDIA_LICENSE_UNVERIFIED` / `MEDIA_DECODE_FAILED`: cannot begin a real montage.
- `RECORDER_CODEC_UNAVAILABLE`, `RECORDER_EMPTY`, `RECORDER_CONTAINER_INVALID`, `RECORDER_PLAYBACK_UNSUPPORTED`: no finished video; explain compatible retry.
- `RENDER_SUSPENDED` / `RENDER_INTERRUPTED`: reset spinner; preserve chosen storyboard.
- `ARTIFACT_EXPIRED`: refresh completed remote media URL or copy authorized bytes into first-party storage before exposure.
- `RENDER_FAILED`: sanitized stage diagnostics, not silent success.

## 6. Reference benchmark & acceptance matrix
Scenarios: RU `Горы`, `Еда`, `Белый волк`, `Без моря, лес и солнечный свет`; EN `Quiet ocean`, `Cooking in kitchen`, `Portrait with voice`; ES `Montañas`, `Cascada`, `Naturaleza tranquila`.
- Planning begins within one visible interaction and presents local option without network.
- Script/style/scene change must change final **rendered pixels** or show `unsupported`; no fixed stale prompt.
- Test 20/30/60s × RU/EN/ES × 9:16/16:9/1:1, with and without audio.
- Verify actual downloaded MP4 or WebM header, FFprobe duration/streams and native decode; no screenshot-only E2E.
- iPhone Safari (physical) is separate from WebKit CI and remains a production gate for user-visible repair claims.
- Provider AI: real synthetic request without personal data, response status and content within bounded time; mock success never counts.
- A template or example with expiring vendor URL cannot be used as a permanent source file.
- One page and one result state; no duplicate editor, duplicate XP wallet, or hidden premium charge.

## 7. Delivery order
**P0**: land and validate Safari #2787; land #2773 free AI/local fallback; rerun production synthetic prompt and physical iPhone export; confirm actual Vercel READY source SHA/alias.
**P1**: finish #2643 tagged film library, ensure real-scene relevance/rights; integrate one goal-first recommended storyboard; audit #2606 procedural artwork.
**P1**: implement immutable render manifest, job state machine, durable error taxonomy + codec/asset/artifact verification; keep existing final editor.
**P2**: implement fast-first-party clip assembly (MP4) as an alternate to real-time Canvas capture; benchmark it against current browser path.
**P2**: add optional cloud provider adapters as a quoted, consented, typed node graph, not inside the free renderer's component.

## 8. Rollout and PR ownership
Do not create an additional broad competing editor PR while #2773, #2787, #2643, #2725, #2606 are in flight. Use their feature branches/leases or focused isolated modules with no duplicate architecture. Preserve `release-ready` on exact HEAD, applicable specialist/browser/security checks, GitHub protected squash auto-merge, then confirm Vercel READY on merge SHA and live mobile/AI-provider smoke separately.

**This document is a specification and implementation map, not a claim that its full architecture is deployed.**
