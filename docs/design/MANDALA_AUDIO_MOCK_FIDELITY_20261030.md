# Holistic House — Audio track picker · compact iPhone mock fidelity
30 October 2026 · owner supplied a design reference (first image) and two screenshots from the current live mobile site (second/third images). The screenshots are reference-only and are not committed. No personal/client information used.

## Reference and target

- Reference page concept: the existing Video Studio **audio-track** selection step, Russian, guest, iPhone. First image is the approved **compact** layout; second and third images depict the **same route and editor**, currently spread across two audio blocks.
- Actual and target canonical route: `/{ru,en,es}/holistic-support/mandala#video-audio`, public/guest Video Studio with advanced details expanded. There is no OAuth transition or protected dashboard in these screenshots. **Page identity: PASS** for the audio editor, subject to rendering the equivalent opened view on mobile.
- React source: `components/mandala-free-video-studio.tsx`; styles: `components/mandala-video-mobile.module.css`. No new route, API, audio synth, source repository, provider or MediaRecorder.
- Production baseline checked before editing: `codex/public-book-library` at `af815d51e03cc4e9ddec2949a84d9d6ce170952c`, Vercel READY `dpl_7UGKUTBjzpackw6jmYkJ2Xwx7P8S`; canonical alias `holistichouse.vercel.app`. **This is a baseline, not a release claim.**
- Visual reference shows a single tall phone crop; exact iPhone CSS viewport/DPR/OS font are not controlled. No numeric pixel-perfect score may be claimed from differently cropped iPhone/browser screenshots.

## Screen map, original → source

| Order | Reference region | Before | Correction | Selector |
| --- | --- | --- | --- | --- |
| 1 | Soft green wave hero, title, subtitle, smart match at right | Separate 82px hero plus another large recommendation bar | One compact two-column hero with integrated, working smart match and active theme | `.audioSection .blockHeading`, `.audioSmartBar` |
| 2 | Five thin filter rows with icons and gentle pastel pills | Large labels/chips, excessive row height and horizontal crop | Label icons, consistent small pills, real scroll and `aria-pressed`; preserve actual **seconds** duration, not fictitious 1–10 minutes | `.audioFilterRow`, `.audioChipRail` |
| 3 | Search and relevance sort | Two overwide inputs | Compact adjacent controls, same actual state and handlers | `.audioSearchRow` |
| 4 | Five tracks with photographic covers, playback, favorite | Huge selection rows, no row Play/Pause | 74px cards, real first-party local photographic covers, **independent** accessible Play/Pause over the cover, correct selected sound and favorites | `.audioTrackRow`, `.audioTrackPlay`, `.audioFavorite` |
| 5 | Load audio / record voice | Second mini-picker with another `audio` control | One actual microphone/permission/rights/upload path in `#video-audio`; remove the mini native player/filter set | `data-video-audio-mic`, `data-video-quick-audio-summary` |
| 6 | Pale green selected audio dock | Separate selected label, volume and native controls | One selected-track/player dock retains native iOS audio, volume and real playback status | `data-video-audio-dock` |
| 7 | Attach to generated video | Mini and full audio pickers both exposed, confusion between selection and attachment | Quick row contains only audio status, existing Attach and Silent actions. Full editor explicitly attaches audio with original consent guard; **Play never silently attaches** | `data-video-quick-attach`, `data-video-audio-attach` |

## Actual user flow to retain

1. Goal/theme already selected → click **Умный подбор** or filter topic/type/mood/pace. Ranking is local and only ranks first-party synthetic WAV loops; no psychological profiling or clinical interpretation.
2. Choose a track (selection only), press **Play** on its cover to hear the real WAV on the **same native HTMLAudioElement**; Pause stops it; favorites and search do not change video output.
3. Optionally upload a user-owned sound file or **record voice using the one remaining microphone**. Permission errors, unsupported formats, length and maximum 15 MB must remain truthful.
4. For an uploaded file, explicitly confirm its rights. Press **Прикрепить к видео** (or **Без звука**). The **existing local MediaRecorder** exports attached audio only. A previewed sound is not silently included in output. No server upload, CRM, payment or provider request.
5. EN/RU/ES copy and existing 8-second first-party loops are preserved. No fake 3-minute audio or clinically proven therapeutic soundtrack claim.

## Regression and rendered acceptance

- Source/contract: `tests/mandala-audio-attach.test.mjs` checks one native audio tag and one microphone, one attached dock, no second player, real direct Play, compact CSS and retained attachment.
- Real browser: `scripts/verify-holistic-mandala-browser.mjs` continues 13 WAV native decode/HTTP/codec/audio export tests and adds direct row Play→time advancement→Pause, one mini summary without another native player.
- Required for visual release: Chromium + WebKit, 320/354/390/430 px RU, 390 EN and ES, 768/1440 desktop, no horizontal viewport overflow, visible focus/44px Play and favorites, no overlap with bottom navigation. Screenshot section `artifacts/mandala-audio/...` should be compared against the **same guest audio view/crop** using `scripts/compare-ui-screenshots.mjs`; manual review of safe synthetic PNG overlay/heatmap, then corrective pass. Do not claim source contracts as visual evidence.
- Acceptance states at drafting: **visual screenshot overlay NOT RUN**, **E2E not yet verified for new head**, **live NOT DEPLOYED**. Reassess with exact-head CI and actual Vercel READY/alias before marking live. A physical iPhone Safari speaker/Save to Files check remains separate and needs owner's device.

## Explicit exclusions / dependencies

- Open PR #2550 already proposes a larger 34-loop library with one-tap playback; its older branch overlaps this file. Rebase/port the new library *after* this compact UI without overwriting its single picker/one-player contract. Do not release competing copies.
- PR #2694 also touches the broader mobile editor design; reconcile owner approval and shared files before merge.
- Voice Studio, cloud-generated speech, paid renders, medical data, private client delivery and billing are unchanged.

## 1 Nov follow-up · real Audio deep-link navigation

**Confirmed source-level regression:** In the six-workspace mobile Video Studio, visiting `/{ru,en,es}/holistic-support/mandala#video-audio` directly did not set `activeWorkspace="audio"`; the canonical `#video-audio` element existed only within collapsed advanced controls on initial page entry, despite the Audio tab itself working.

**Targeted fix:** An on-mount and `hashchange` listener opens only the existing Audio workspace and scrolls to its one canonical audio picker. It does not automatically play any media, request microphone access, attach a track, or change URL/consent. Same first-party components, no new recorder/renderer/API. Browser regression checks a fresh RU 390px deep link under both Chromium/WebKit, with a single microphone, readable layout and synthetic screenshots; unit test checks the one-instance contract.

**Release gate:** exact PR HEAD targeted unit/lint/typecheck/build and real browser test; protected merge into current production `codex/public-book-library`; Vercel READY exact new SHA/alias and RU/EN/ES live URL. Separate physical iPhone speaker/microphone/Files QA and independent owner-reference pixel overlay must remain unclaimed until actually performed.

## 1 Nov visual checkpoint — photo and Play must be separate

The real prior #2696 Playwright synthetic screenshot artifact `mandala-audio-mobile-48fa560f...` (Chromium and WebKit RU 320/390/430) was inspected against the owner's **first** approved mock, not the second and third older implementation screenshots. At RU390, the round Play overlay covered most of the small photographic sound cover. The reference has a clearly visible square photo followed by an independent pastel Play circle.

Refinement: add a reserved 44px Play slot **after** the photographic cover in the existing Select row, keep the Play button a separate sibling with independent native WAV playback, and allow the entire rest of the row to select the sound. On 320–375px hide the redundant inline "Select" word (the row remains accessible, labelled and highlighted); retain a 44px favourite. Browser assertion checks the Play rectangle sits **to the right** of, rather than on top of, the photo in 390px Chromium/WebKit. No stock media or invented photography, only existing first-party covers.

This checkpoint reviews the **older** actual screenshot artifact. It does not prove the latest candidate pixel overlay or physical iPhone Safari; those remain separate release/owner QA.
