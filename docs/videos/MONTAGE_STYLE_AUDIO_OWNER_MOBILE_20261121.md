# Owner visual reference · Video Studio Montage Style and Audio · 21 Nov 2026

**Implementation target:** the existing Video Studio, `/{en,ru,es}/holistic-support/mandala`, guest or signed-in, workspace `editor` and subpanel `effects` / `audio`. Not a separate page, a public media library, an app dashboard or a second editor. Reference images attached to the task were the owner's **first (Style)** and **second (Audio)** vertical mockups. No client photos/screenshots are committed to this repo.

**Verified production at research start:** protected branch `codex/public-book-library` `ae31ec8297d5a063f843b293fe5bf25eb379fd6a`; latest canonical Vercel READY `2344b5c83fc282d8f6c08f5950e5361264d19af7`. They differ; neither image is a current LIVE receipt. Existing editor DOM owners: `components/mandala-free-video-studio.tsx`, `components/mandala-video-mobile.module.css`, real `MandalaMultiTrackTimeline`. Own compact reference styles live in `components/mandala-montage-approved.module.css`; all other application tabs and bottom dock stay intact.

## Same-view map

| User action | Current route/view | Handler and existing data | Target | Verification |
|---|---|---|---|---|
| Goal / Ideas → Montage | `/en/holistic-support/mandala`, `activeWorkspace=editor` | `activateQuickWorkspace('editor')` | Real Style panel | CI/WebKit pending |
| Style stock photo or verified video | Same / `montagePanel=effects` | `quickPickStyle`, `setBackgroundOnly` | Select existing licensed scene; no AI charges | CI/browser pending |
| Upload client's still photo | Same | existing `NativePhotoInput` → `onPhotoFileSelected`, existing rights checkbox | Local private photo for the film | signed-in/local iPhone pending |
| AI Live Photo | Same | **Separate** HeyGen #5337 and XP v2 #5348 are not production-accepted | 500 XP card is visible but guarded; no false AI rendering or debit | intentionally blocked |
| Browse saved avatars | Same → `/app/videos?tab=avatars` | Existing cabinet destination; future gallery depends on #5337/#5339 | No synthetic saved avatars shown | E2E after merge |
| Montage Audio / music | Same / `montagePanel=audio` | `playQuickTrack`, `toggleQuickMusic`, `StudioMusicFeatured`/picker, existing rights | Audio preview/selection, up to three reviewed tracks | real iOS checks pending |
| Voice Wish | Same | `startMicRecording`, `stopMicRecording`, `chooseAudioFile`, consent/attach | Local recording, no upload until opted in | mic/permission iPhone pending |
| Audio & Edit timeline | Same | One existing `MandalaMultiTrackTimeline` with `setAudioStartSeconds` | Visuals, attached voice/music, real offset controls | WebKit MP4 pending |
| Create My Video | Montage → Ready | Existing guarded `openReadyForGeneration`, server quote/XP account | **no debit from source selection** | Real payment/export E2E pending |

## Approved screenshot-derived layout
Reference style is **warm sunrise/emerald/cream**. Keep existing first-party scenic hero/player and six-button global navigation; never paste a screenshot as page background.

- Style: pill-shaped 3-step overview (1 Photo, 2 Visuals, 3 Audio & Edit), compact title, **two large photo-led cards 50/50** with 500 and 250 XP planned tiers; dynamic selected border; private photo/first-party stock-scene rail with native iOS Upload and See All; Continue underneath; optional existing six style filters/aspect in an accessible disclosure.
- Audio: same progress ribbon with 3 active; **music occupies most of the top row**, right compact voice-record CTA; topic filters in **one horizontal scrolling line** without wrapping; 4 big **text-only** music tracks (no portraits, posters or video), 44px play buttons, track title/length/waveform; other licensed music and audio file input remain inside a user-opened disclosure; current one multitrack timeline moves visually **beneath** these controls, retaining editable visual/music/voice and real start offset.
- Geometry targets: 320/354/390/430 CSS px, iOS dynamic bars and bottom dock. 390px: card shell ~350px wide, image aspect 1.6, two cards ~155–175px each; 16–20px music labels, 44–46px controls, rounded 14–21px surfaces; 320px audio converts to music-first full-width and compact horizontal voice CTA. No 100vw scroll overflow, max contrast for dark #143d3a text on ivory #fffcf7, focus ring #176e6e.
- Dynamic content: do not invent avatars, credit balances, licensed music, or client video outputs. Stock posters are already approved catalog assets. The 500/250 client price plan is **not** a real server quote until #5348 and HeyGen reservation/capture are active. AI action is intentionally blocked rather than emitting a fake 5s render.

## What remains unverified and cannot be claimed
The attached reference screenshots are rendered mockups, not a captured site-state screenshot. Local working tree/full Next install and browser instance are not yet available in this connector-only flow. Core lint/TS/build, Mandala macOS WebKit (voice/audio/mp4), HTML DOM geometry, identical-viewport screenshot/overlay, privacy/RLS, live rollout and physical iPhone remain acceptance gates. The existing hourly Vercel publisher alone may deploy after protected merge; no direct Production request.

| Viewport | Geometry | Rendered screenshot | Overlay/diff | Native actions |
|---|---|---|---|---|
| 320 Chromium | pending | pending | pending | pending |
| 354 Chromium | pending | pending | pending | pending |
| 390 Chromium | pending | pending | pending | pending |
| 430 Chromium | pending | pending | pending | pending |
| 390 WebKit | pending | pending | pending | pending |
| 768, 1440 | pending | pending | pending | pending |

**Status:** SOURCE PREPARED; visual NOT YET VERIFIED; LIVE NOT YET VERIFIED.
