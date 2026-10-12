# Video CSP runtime repair

Status: PARTIAL

## Request

Repair public video playback while keeping cabinet, report, API and other security directives restrictive. Allow only reviewed YouTube-nocookie and HeyGen embeds in the public site, and allow the two PsiTrends MP4 assets only on Tantra Reiki pages.

## Verified findings

- The prior CSP set `frame-src 'none'` outside Academy and omitted `media-src`, blocking public embeds and native Tantra Reiki MP4 files.
- Next client navigation preserves the initial document CSP, so crossing a restrictive/public boundary must reload the document.
- Library video cards sent English/Russian homeopathy entries to About; the Russian home card used `/ru/`, which has no page route.
- An independent availability audit found public player metadata for 125 of 126 Academy records. `FxOE-cEAnP4` is the only confirmed private source (Russian Yggdrasil, Level 3, Recording 1/3). This is an availability check, not a decoded-playback claim for YouTube.
- All eight distinct HeyGen sources were independently checked with ready state 4 and advancing playback time, including the About page's `fd5fcead9b067f9a0649862675a38771` Psychic Alchemy renderer.

## Changes

- Scoped reviewed iframe origins to public documents and `/admin/videos`; private/API/document-preview paths remain restrictive.
- Scoped `https://www.psitrends.com` media loading to Tantra Reiki routes only.
- Added a client CSP-boundary reload for navigation between public, Tantra-media, private, admin-video and API policy classes.
- Corrected the three library destinations above.
- Replaced the known private `FxOE-cEAnP4` player with an explicit unavailable state. Its title and position remain visible, but no iframe or Play action is emitted.
- Added static regression coverage for the allowlist, policy boundary, About's HeyGen renderer and destinations. The existing source-parity test now explicitly accepts the documented unavailable-recording state only when all playable-provider fields are absent.

## Verification

- Local `npm run test:unit` and `node --test tests/yggdrasil-curriculum-sync.test.mjs tests/video-csp-navigation.test.mjs` passed.
- On GitHub commit `41e19051c21f3ce4452479c14db50026838f2f7f`, clean locked-dependency build/browser checks passed in Holistic website video checks, Website video browser verification, Holistic House IA v2 checks, and isolated verification.
- The local environment initially installed an incomplete Next package after `npm ci`, so local lint/type/build are not claimed; GitHub's clean production build did pass.
- Release re-audit is blocked outside this change: its consultation-safe-handoff regression waits for `[data-consultation-capture="personal"] [data-contact-channel="whatsapp"]` and times out in EN/RU/ES (12 checks), after the proposed release build succeeds.

## Next action

Resolve or explicitly baseline-exempt the shared consultation regression, then rerun the exact branch through clean GitHub production/release browser checks before independent review or merge.
