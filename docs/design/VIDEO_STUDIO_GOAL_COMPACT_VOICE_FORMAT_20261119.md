# Holistic House Video Studio — compact Goal iPhone correction · 19 Nov 2026

## Same-view identity
Reference: owner-supplied **private** 706×1536 px iPhone screenshot (~353×768 CSS px). Do not commit the owner's screenshot. Route: `/{en,ru,es}/holistic-support/mandala` → **video mode / Goal**. Guest or authorized client, not photo mode, MyTube or practitioner dashboard. Same route/state/role/browser viewport are mandatory before visual overlay. Source owners: `components/mandala-auto-video-director.tsx`, `mandala-auto-video-director.module.css`, `mandala-video-goal-refresh.css`.

## Approved behavior / screen mapping
- Maintain existing generously sized multiline wish textarea, Free/Pro and Guide me/Just make it controls, + upload and send.
- Remove **For myself / For others** duplicated toggle. One visible **Life / Work** is the actual existing audience mode: Life → self and canonical four MyTube categories; Work → others/recipient catalogue. Reuse current `changeVideoAudience` and per-mode draft preservation; self video format is restored on switching back, recipients use verified 9:16 footage.
- Add a **real horizontal / vertical / square aspect** selector immediately to the right of +, displaying current format icon and 16:9, 9:16, 1:1 in a small popup. Keep original `onAspectChange` and Studio preview invalidation, not a fake local-only selector. Never claim unapproved footage can be reframed.
- Add **mic dictation** directly to the left of Send: explicit tap to start browser speech capture, tap to stop; add recognized words to the same original prompt/scene handler as typed text. Cancel on mode switch/unmount, guard late transcript results. Browser vendor may process live speech: do not start automatically or send tests, health data, or transcripts to analytics. On unsupported browser display local-language fallback to keyboard microphone or Audio. No new provider, spend, backend, or storage.
- Move four original illustrated Quick Start cards up in existing 2×2 grid: collapse only empty legacy first-step audience heading and reduce card height/gap. The optional 3 goal-intention chips may be hidden at mobile viewport height ≤880px while all 4 primary cards remain. Respect fixed bottom dock; preserve 85px textarea height and 44px toolbar touch targets.
- All action/aria/status labels localized EN/RU/ES. Continue existing quiz, Montage, Ready, auth, export/credit and media-rights flow unchanged.

## Independent acceptance gate
Source/regex checks are not a visual pass. Verify matched viewport on 320, 354, 390, 430 px (Chromium and iPhone WebKit), no horizontal clipping, 4 pictured cards above dock when space allows; keyboard present; color contrast/focus; Life→Work→Life mode and format restoration; 16:9→9:16→1:1 updating actual Studio; tap mic, transcript, second tap stop, browser-denied and unsupported state, no off-mode leak. Check EN/RU/ES, original video licensing, mock and actual credit gates. Compare owner screenshot versus rendered screenshot with same UI chrome crop and report geometry, not a score alone. Real iPhone WebKit dictation and final MP4/audio playback are not proven by source assertions.

Release: exact-HEAD required CI Core/Specialist/`hh-merge-check`, no bypass and no manual Vercel deploy; existing hourly publisher, then verify Vercel READY/current SHA/domain https://holistichouse.vercel.app/en/holistic-support/mandala plus interactive E2E. A PR is not LIVE.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
