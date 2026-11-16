# HH MyTube — Full Native Video Editor Engineering Specification v2.0
**Owner-approved direction:** functional CapCut-class capability inside Holistic House, built originally; no proprietary CapCut code, creative assets, models or trademarks.

**Canonical repository:** \`andylitvinov-design/books\` · **protected production:** \`codex/public-book-library\` · **public entry:** \`/{ru|en|es}/holistic-support/mandala\` (MyTube Video Studio).

**Scope:** all remaining capabilities, including known hard limitations; this is a *complete actionable technical specification*, not an assertion that all milestones are implemented or can be launched without review. Production capabilities are tracked by merged PR + exact deployment SHA.

## 1. Outcome / non-negotiable UX

1. Default path stays **Theme and idea → Support phrases → Montage**. The user types a goal and the existing Auto Video Director proposes one actual licensed, editable film; the user confirms or adjusts. Never require 25 filters before creation.
2. Existing hierarchy category → subcategory → topic → scenario → plot → motif → visual style remains the single source for recommendations and asset tags.
3. Core editor: large accurate 9:16 mobile preview, timeline visible without hiding the bottom navigation, one audio play control, horizontal scrolling and zoom. User can replace scenes, split, trim, move, annotate, scrub, undo/redo, save and export.
4. Export is a **real user-owned playable MP4**, with the requested soundtrack and source media. No silent source MP4 fallback may masquerade as a custom montage.
5. Three localized languages RU/EN/ES, 44px touch targets, keyboard/safe-area support and accessible controls; optional Advanced pane hides technical features.
6. No payment, subscription, cloud GPU/AI inference, external account, cron or charged activation is introduced without a separately approved fixed-cost budget.

## 2. Existing, verified release foundations

| Capability | Project state |
|---|---|
| 4 approved source-backed MP4 shots, narrative director, exact film clock | Deployed previously; rights whitelist and four-source decoder required |
| Film/text/audio timeline zoom and snap | #3373 merged |
| Shot reorder, adjacent cut trims, color looks / transitions | #3373 merged |
| 40-step undo/redo, local metadata-only project download/import | #3380 merged |
| Audio transient cuts, SRT import/export and animated text | #3382 merged |
| Per-shot camera zoom/pan/rotation keyframes | #3414 merged |
| Source starting position (slip) / 0.75–1.5× source speed | #3455 merged |
| Separate own-melody bed over attached client voice/audio; volume and fades | **New P0 PR — must pass CI, merge and production verification before marking deployed** |
| Arbitrary independent source video layers, full NLE, object masks, automatic STT | **Not yet implemented** |

These are **not** a full CapCut replacement. The important next architectural step is replacing the 4-shot-only execution contract without regressing it.

## 3. Single immutable advanced project model (P0)

Introduce \`VideoProjectV3\` beside the current V2 adapter (migration only after acceptance) with:
- \`projectId, schemaVersion=3, revision, locale, aspect, durationMs, fps\`; all fields validated.
- \`assets[]\`: approved scene ID, owner-uploaded user file (local opaque reference with explicit rights/consent), duration, width/height, checksum, attribution/license; never store arbitrary remote URL from a draft.
- \`videoTracks[]\`: unique track ID, layer order (bottom to top), clips with \`id, assetId, startMs, durationMs, sourceInMs, sourceOutMs, speed, transform/keyframes, opacity, crop, mask, transitionIn/Out\`.
- \`audioTracks[]\`: \`voice/music/sfx\` ID, local owner-authorized source, start/end, gainPercent, loop, fadeIn/OutMs, optional ducking envelope. Speech and music gain controls independent.
- \`textTracks[]\`: typed captions with user-approved text, start/end, position, text style, animation keyframes and provenance (manual/imported/consented STT).
- \`renderApproval{revision,planHash}\`, \`export{state,artifact,sha256,validatedPlayback,validatedAudio}\`, license proof and privacy flags.

Validation: fail closed on extra keys, nonfinite values, duplicate IDs, layer >8, video clips >24, audio layers >4, captions >100, unsupported codec, unreadable asset, excessive on-device RAM, file > recommended per-device limit, unapproved rights. Client-local drafts retain only safe references, not media bytes/secrets. Must reject stale export revision. Immutable actions and bounded history; older V2/four-shot projects use an explicit migration preserving all edits.

## 4. Rendering and timing engine (P0)

One \`CompiledTimeline\` is consumed by *both* Canvas Preview and WebCodecs/MediaRecorder export. Do not add a second independent composition clock.
- Timeline integer milliseconds or frame ticks; \`resolveVideoFrame(projectMs) -> [{assetId, sourceMs, opacity, transform, mask, zIndex}]\`; \`resolveAudioMix(projectMs)\` shares the same start.
- Default first-party 4-shot plan remains fast path. Advanced clips may be >4 but decoded on demand; **max two simultaneous full-frame MP4 decoders on iPhone** (capability testing may lower this); prefetch next shot without autoplay.
- Source in/out and speed curves map logical project time to real decoded source frames. No fabricated pause frame can be exported as a moving clip; bounded drift and timeouts abort with explicit diagnostic codes. Verify actual seeked/rendered source frame before mux.
- Transitions require real two-source overlap; cross-dissolve, dip to black, flash and hard cut are distinct; do not call old single-source darkening a cross-dissolve.
- Safe crop/pan/zoom/rotate/PIP, z-order, opacity keyframes and masks are interpolated deterministically. Safari low-RAM fallback disables unsupported advanced effects **before** rendering (not silently at finalization).
- Export H.264/AAC MP4 where supported, clear browser codec fallback, precise duration/codec and audio sync check; 720p standard, 1080p conditional, 4K only after tested device capability; prevent >80 MiB browser buffering on iPhone.
- Preserve legal attribution, user rights, original voice, audio start time and agreed language.

## 5. Audio lanes / real mix (P0)

**Milestone A — delivered as code in the current follow-up PR; not automatically LIVE:** primary attached file (voice / user audio) + one separate original melody soundtrack; explicit opt-in, distinct gain and fade, visual tracks, undo/redo, local draft. Five known original mastered melodies only. MediaRecorder uses one WebAudio media destination; WebCodecs uses OfflineAudioContext and one AAC track; preview uses browser-native playback with a clear iOS-volume caveat. No raw audio leaves the phone.

**Milestone B — still pending:** up to 4 independent source lanes (voice, music, ambience, SFX), per-lane start/end/trim, waveform from local PCM peaks, gain envelope/keyframes, fades, silence/pause analysis, simple limiting, optional side-chain ducking (music -10 to -18 dB when voice active). No on-device automatic AI transcription by default. Required proof: a mixed MP4 has both non-silent frequency components, narration not looped, fade ends on time, and project/codec duration match.

## 6. Visual editing tools (P1)

- **Trim/split:** genuine non-destructive source in/out; ripple or non-ripple mode chosen explicitly; snap to scene/audio beat boundaries and to detected silence where consented.
- **Transforms and masks:** position, zoom, rotation, opacity keyframes (0..N); PIP with rounded/rectangular crop; preset shape masks; chroma key via GPU/Canvas pixel path with threshold/range controls and clip-safe memory.
- **Transitions:** real two-source dissolve, slide, wipe, matte; edge conditions cannot read outside valid source.
- **Speed:** discrete clip rate 0.5–2× with corresponding source clock, pause and reverse only if efficient local frame cache available; interpolation/speed ramps gated on resource budget.
- **Color:** brightness, saturation, temperature, exposure, contrast, HSL and fixed first-party LUT approximations; same shader/Canvas values for Preview and rendered export.
- **Text/stickers:** editable authored font-safe templates, no unlicensed fonts/media; animated captions, shape stickers, royalty-reviewed icons, optional safe-area guides.
- **Undo/redo:** every action reversible, deterministic after save/reopen; no change to personal sound source without consent.

## 7. Optional AI / smart features (P2; strictly gated)

- Local STT only after assessing an openly licensed on-device model: speech recognition with editable timestamps, explicit permission, no hidden upload, language QA RU/EN/ES; allow users to approve generated subtitles, never present machine transcript as literal user-approved writing.
- Automatic silences/filler removal, highlight selection, rhythm/beat cuts and intent → storyboard recommendations use available on-device DSP and existing Auto Director first. Source/motif tags remain provenance-aware; "matches topic" does not imply that the scene depicts an exact imaginary person.
- Background removal / object segmentation / motion tracking requires tested permissively licensed segmentation model, device memory budget, explicit input-consent UI and truthful failure fallback.
- AI text-to-video / lip sync / voice cloning, motion capture and cloud collaboration are separate products unless proven locally viable. Only opt-in approved provider and a hard spend/XP quote may trigger paid generation. No background billable jobs.
- Moderation/consent: rights in voice/person photo, prohibited deepfake impersonation, privacy of health and therapy context, attribution records and encrypted signed media delivery when used.
- Never import or clone CapCut proprietary source code, templates, fonts or model weights.

## 8. Template and distribution (P2)

- Author-approved video templates stored as versioned IDs with locale, category/topic/scenario/motif/style tags, available source IDs and music tags. Ranking is tied to available reviewed library content and licensed metadata.
- Output modes 9:16 Shorts, 16:9 Study, 1:1 posts; accurate file properties; preview card, saved project, explicit export/download and optional Telegram/WhatsApp delivery via current account opt-in channels.
- No messenger bot starts unsolicited messages, no auto-subscribe, no indefinite third-party data collection. Free local downloads work without account where existing permissions allow.

## 9. Implementation sequence and integration PRs

**P0-A**: existing released #3373 + #3380 + #3382 + #3414 + #3455; active real 2-lane mix PR to close basic voice/music loss. Zero paid API.
**P0-B**: new V3 schema + codec source registry + migrator + compiler, tests, preview output behind feature flag. No UI exposure before video proof.
**P0-C**: true advanced multi-clip Canvas renderer with controlled decoder leasing, local import consent and source trims; iPhone export gate.
**P0-D**: multibus WebAudio / AAC mixer, waveform, clipping limiter, fades and ducking; separate but integrate under the same V3 and no double-render engine.
**P1-A**: keyframe/two-source transition/mask engine, GPU fallback.
**P1-B**: color, speed ramps, true text/sticker templates and reliable format variants.
**P2-A**: on-device/cost-approved optional AI and safe publishing.
**P2-B**: private multi-device cloud drafts/collaboration only after RLS and storage-cost review.

Each PR must: compare with current protected production SHA, rebase or reconcile one owner-reviewed integration branch; no stale ancestry, no unrelated files; run existing CI (do not launch duplicates); release behind flag if codecs are unsupported; keep legacy director and video tests green.

## 10. Verification contract for every production release

1. \`node --test\` focused unit, security, audio, timeline and rights regression; Next/TypeScript/ESLint; existing GitHub Core/Mandala Specialist/Public Services/WebKit gates on **exact PR head**.
2. Browser acceptance: 390px mobile Safari and Android Chrome with current supported account/guest experience; script + 4 licensed MP4s + original recorded speech + separate melody; scrub/pause, music gain/fades, captions, Undo/Redo, save/reopen, no UI jumping dock.
3. Final downloadable MP4: decode/ffprobe when available; H.264/AAC correct moov/mdat, metadata durations, video pixels vary across cuts, non-silent voice and music, no dropped initial narration, correct alpha/caption timestamps, no private network transfer.
4. Protected squash/merge via existing PR regulation; no manual bypass of branch protection or skipped required checks.
5. Vercel production deployment \`READY\` and \`meta.githubCommitSha\` contains exact merge SHA, canonical domain alias assigned. A green CI run alone is *not* LIVE.
6. Verify new release mobile interaction on a real iPhone separately where remote device unavailable; explicitly distinguish automated WebKit preflight from actual-device signoff.
7. If quota/CPU/codec/rights fail, block production or disable the new advanced feature; never silently strip user's voice, premium purchase, attribution or approved scenes.

## 11. Cost and licensing policy

Only existing Next.js/Vercel, GitHub Actions, browser WebAudio/Canvas/WebCodecs, FFmpeg in already-budgeted jobs where present, and already approved first-party assets. No new paid tiers, Cloudflare activation, external AI image/video bill, AI voice credits, periodic cloud rendering, or background job. Rate-limit CI and reuse caches. Audio/video imported from external libraries must have recorded license, provenance, hash, attribution and source quality approval. Existing 684 original procedural clips are not equivalent to 500 verified real stock MP4 files.

## 12. Known limitations and Definition of Done

This document is **complete as an engineering backlog**; product completion occurs only when every row in sections 3–8 has a code change, appropriate compatibility/security proof, reviewed PR, correct production deployment, and device-level acceptance. The current implementation is deliberately narrower. Do not claim "all CapCut functions available" or "100% LIVE" until each required milestone is verified. Product billing must remain zero additional spend unless separately authorized.


## 13. P0-B implementation boundary — 2026-11-05

A fresh **VideoProjectV3** contract and deterministic frame/audio time
resolvers are added without replacing the working VideoProjectV2, the
released four-shot Auto Director or its Canvas encoder. An exact production
SHA must be verified before marking this capability LIVE.

Implemented in P0-B:
- Immutable schemaVersion=3 with <=32 metadata-only assets, <=8 video layers,
  <=24 authorized video clips, <=4 audio lanes, <=100 authorized captions,
  <=60 seconds and <=2 simultaneously active full-frame decoders.
- Exact-key validation: no URLs, media bytes, provider tokens, unapproved
  assets or fake READY export in portable project metadata. A separate
  trusted runtime registry supplies rights proof and catalogue source path.
- Millisecond start/in/out, 0.5..2x video source speeds, transform, opacity,
  mask descriptors, true two-source crossfade *frame instructions*, layered
  PIP positioning, independent audio gain/fade/loop *clock instructions*.
- Explicit V2 to V3 migrator preserving authorized four-shot order,
  approved phrases and selected approved music. Missing rights fail closed.
- Deterministic compiled fingerprint, revision-checking, frozen project
  actions and focused tests for security, time, overlap, audio and migration.

**Not activated:** CompiledVideoPlanV3.runnable is false and its engine
is pending_advanced_compositor. This is deliberate: a frame resolver is
not proof that an MP4 includes PIP, masks, or real source crossfade.
The actual bounded multi-decoder browser compositor, advanced multi-clip
UI, final exported MP4/AAC and real iPhone QA are the remaining P0-C/P0-D
milestones. Existing browser-local video editing is unchanged.

No paid provider, automatic GPU rendering, extra periodic CI or cloud
media upload is enabled by this technical foundation.


## 14. P0-D real on-device audio waveform (2026-11-05 release candidate)

Replace decorative audio glyphs on the native montage timeline with
48 normalized PCM RMS waveform peaks from the explicitly attached
user-owned audio file. OfflineAudioContext decoding uses no
playback permission, backend requests, speech recognition or paid service.
An 8 MiB file guard and 180-second decode cap avoid unbounded
phone memory usage. Silence renders no bars; unsupported media renders
no fabricated waveform. Changing or revoking a file clears old peaks.
The original music bed remains named without a fake waveform, because
its PCM has not been explicitly decoded.
This is display-only: it does not modify the existing two-track MP4 audio mix.
Release requires exact-head Core/Specialist/WebKit CI, protected merge and
matching Vercel READY SHA. Physical iPhone audio QA is separate.
