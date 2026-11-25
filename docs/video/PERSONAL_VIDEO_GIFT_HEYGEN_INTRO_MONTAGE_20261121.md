# Personal Video Gift — real five-second HeyGen intro + licensed 20s montage
Status: pending protected PR / exact-HEAD CI / LIVE and consented E2E. No paid API render was ordered by this change.

## Existing route and authority
Reuse `/{en,ru,es}/holistic-support/mandala?mode=gift`, existing free Canvas/WebCodecs/H.264/AAC MP4 compositor and My Videos signed upload; no second app, editor, wallet, provider secret, renderer or public bucket.

When the server-side owner-only live-photo API in PR #5337 becomes LIVE (and the required XP v2 PR #5348 is protected-merged and enabled), users can:
1. Sign in, upload a photo, confirm likeness/third-party permission and explicit 500 XP hold, choose smile/greeting/wave/blink/head turn, and **explicitly click** Create HeyGen Intro. No automatic paid request. For children/new consent needs, fail closed.
2. Receive the 5-second HeyGen Video 1 MP4 in existing private `hh-client-private-media` and My Live Photos; pending/unknown provider state never causes an automatic second POST.
3. Select a READY existing video by authenticated API `/api/app/live-photos/[id]`; renew the 120s signed URL, download the MP4 privately into browser memory with no CDN exposure in the final file URL.
4. Compose 0–5 sec real, decoded HeyGen frame + 5–10, 10–15, 15–20, 20–25 sec four DISTINCT approved same-origin 5s moving scenes from `free-stock-scenes.json` (group first, cross-group fallback). No Drive access tokens or unreviewed Drive clips.
5. Add existing licensed overlay/text/audio and export as one H.264 MP4, AAC when music/voice present. Existing **free** 25s photo/card path stays unchanged. Download locally or opt-in save resulting MP4 privately in My Videos.

## Protections
- No new paid provider call on “preview”, “Generate MP4”, reuse, or download; only the explicit owner-consented HeyGen creation endpoint can create a paid job, subject to server-side feature/spend/XP gates.
- Signed server URLs are owner-scoped, short-lived, and fetched with omitted cookies. Verify MP4 ftyp, size and H.264 decode before canvas; reject missing/short/unlicensed segments instead of substituting a fake still/photo.
- Public catalog selects only reviewed same-origin clientReady stock, with CC BY 4.0 attribution in film, never raw distribution.
- Existing iOS Safari native H.264/AAC branch and Chromium WebCodecs branch use the SAME timeline. Playback and entire encoded MP4 must be E2E validated on real authenticated devices.
- Provider-side deletion of HeyGen uploaded originals requires the separate #5337 erasure fix and real permission test. Do not claim end-to-end privacy erasure until verified.

## Acceptance before LIVE
Node contract tests and actual full TypeScript/lint/Next build, protected Core/Specialist/`hh-merge-check` on exact PR HEAD, merge through native policy, existing hourly Vercel publisher only. Confirm Vercel READY SHA/canonical alias, actual signed-in A/B RLS and real 5s paid-provider MP4 + 4 genuine stock moving clips, native 9:16/16:9 H.264/AAC playable and downloadable in iPhone Safari and Chromium. No provider spend without a separate explicit approved pilot. Neither source tests nor mocked media proves these E2E outcomes.
