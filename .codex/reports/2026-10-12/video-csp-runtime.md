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
- Added static regression coverage for the allowlist, policy boundary, About's HeyGen renderer and destinations.

## Verification

- `node --test tests/video-csp-navigation.test.mjs` passed.
- Local lint/type/build could not complete because this execution environment's installed Next package lacks internal compiled modules after `npm ci`; this is an environment/package-install blocker, not a passing build result.

## Next action

Run the exact branch through clean GitHub production build/runtime browser checks, including CSP violation monitoring and real media readiness/progress where network permits, before opening/merging the draft PR.
