# Holistic House — professional video branding P0 · 2026-11-06

## Scope
A professional-mode Video Studio **newly encoded** result is marked with a small Holistic House HH glyph and name, burned into actual Canvas pixels before WebCodecs MP4 or MediaRecorder MP4/WebM encoding. Downloads, mobile Share and optional Telegram delivery reuse this rendered Blob. Personal/non-professional Studio exports remain unchanged. An unedited catalogue MP4 fallback is explicitly an original, **not** a newly encoded branded film.

## Asset
The P0 geometric HH mark follows the glyph in `public/holistic-house-app.svg`. It is a provisional video lockup and is **not confirmation of the owner's approved final transparent watermark**. Replace only the renderer mark after visual review, without changing site logos.

## Entitlement
- `GET /api/app/video-export/capabilities` authenticates the session and returns a **non-commercial pilot** permission for explicitly approved account IDs. It is separate from consumer course subscriptions, `adFree`, production formats `Smart/Pro` and video credits/XP.
- All pilot settings are disabled/absent by default. Optional server-only env names: `HH_VIDEO_EXPORT_CLEAN_PILOT_ENABLED=true`, `HH_VIDEO_EXPORT_CLEAN_PILOT_ACCOUNT_IDS` (verified account UUID allowlist of at most 64), `HH_VIDEO_EXPORT_CLEAN_PILOT_EXPIRES_AT` (future ISO within 90 days). No new payment, subscription or service. Never expose the allowlist to browsers.
- Denied, expired, guest or unavailable capability => branded professional export. Result label states the actual delivered variant. Switching tier requires a new encode from original project; old branded pixels cannot just be erased.

## Integration
- `components/mandala-free-video-studio.tsx` checks current capability **after** the one-create duplicate-click guard and before video-credit hold. The same local `exportBrandVariant` is applied after subtitles on the initial capture frame, WebCodecs `renderFrame` and MediaRecorder canvas painter. Raw working preview remains unmarked; finished player uses the marked/clean encoded Blob.
- `lib/mandala/video-branding.mjs` keeps layout and stamp deterministic. `lib/mandala/video-branding-policy.mjs` handles bounded pilot permission. `tests/video-branding.test.mjs` has fail-closed, geometry and Canvas side-effect tests.
- Existing local-generated video share/send consumes the already-encoded blob, so no extra video-credit charge or re-generation occurs. Do not misrepresent YouTube public upload as complete: a modified local browser could still export an unmarked file. Tamper-proof publication needs a trusted server derivative/proof, owner-consented upload and readback.

## QA and release
Local: `node --test tests/video-branding.test.mjs`. Mandatory exact-HEAD Core/Specialist/Guard and auth/RLS review must pass. Real exported MP4/WebM frame checks, soundtrack preservation and actual iPhone Safari playback/download are mandatory before claiming LIVE. A project deploy/merge without those real-world checks is not sufficient.

## Deferred
Paid Practice Pro was not confirmed for sale. Map commercial entitlements, billing lifecycle, reusable projects, cross-channel server checks and approved final logo as separately reviewed milestones. Do not sell an unavailable tier or conflate creative Video Studio Pro with cabinet Pro.

## P1 fail-closed professional fallback guard · 7 November 2026
- Prevent the professional rendering path from returning `mode:catalog` when Canvas recording is unsupported. The source MP4 is *not* a generated branded movie; present a localized retry message instead.
- Hide both download links to raw-original MP4 whenever `professionalMode` is active. Add an explicit defensive result-action guard even if a future code path returns a catalog fallback.
- Add a compact FREE watermark disclosure before the professional director, while keeping the post-render exact-variant label. Personal/nonprofessional fallback behavior remains unchanged.
- Paid Practice Pro remains gated; no new billable service, no watermark-removal bypass and no changes to existing credit/debit, consent, ownership, upload, or source licenses.
