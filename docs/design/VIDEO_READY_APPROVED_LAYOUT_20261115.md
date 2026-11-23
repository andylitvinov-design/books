# Video Studio Ready — approved mobile reference · 2026-11-15

## Reference/target identity
- Owner provided two private screenshots, each 706 × 1536 raster px; left = **approved finished Ready design**, right = actual **in-progress Ready**, not the same media-generation state. The screenshots are **not committed**.
- Real app route: `/{en,ru,es}/holistic-support/mandala`, Video Studio → Ready, client/guest-auth-dependent view (two screenshots show EN and credit balance; exact account not externally verified).
- Source-of-truth component: `components/mandala-video-ready.tsx`; CSS: `mandala-video-ready.module.css` plus existing Studio and optional-effect styles.
- Production branch at source preparation: `codex/public-book-library` commit `e0e6a0961cfaf1f7cfdee6bd5d31577ea6477719`; Vercel READY at inspection: `a52b7bd98d0db8d072e8fc5e915a20d510570879` (older than branch HEAD). LIVE equivalence **NOT** inferred.
- Page identity gate: route and Ready editor view match; **state mismatch (finished vs in-progress)** means numerical screenshot overlay comparing these two owner images would be misleading. Compare candidate after export to approved finished reference, and candidate during export to a matched-state browser capture.

## Approved block map (reference raster coordinates; exclude OS status and home/dock chrome)
| Order | Component | Approximate raster rectangle x,y,w,h | Action |
|---|---|---|---|
| 1 | One slim result status | 20,235,667,55 | Keep; show 'ready' only after native playable verification, else truthful pending status |
| 2 | 16:9 preview/player | 20,306,667,382 | Restore full width at every Ready phase; do not simulate a playable video |
| 3 | Save / Telegram two-column row | 20,706,667,64 | Show only after verified local Blob and real credits/Save gate |
| 4 | 'Next steps' heading + lead | 30,794,655,71 | Keep warm readable typography |
| 5 | Meditation image card | 18,890,670,158 | Two-column image/content with arrow; reuse first-party portrait |
| 6 | Eight-session therapy card | 18,1058,670,158 | Two-column image/content with arrow; reuse first-party stones asset |
| 7 | Full-width green New Video | 18,1250,672,83 | Move below the two cards; reuse existing navigation handler |

## Existing interactions and security boundaries
- Before generating, the sole Generate button sits under the same full-width poster and still uses the existing credit/format/manual-confirm guard. No auto render on arriving from Montage.
- During actual local encoding: status + a single slim progress bar; approved seven-question 0–10 image check-in from protected #4733 remains inline below the preview, stays after export if the user started it and can be dismissed after the summary; no optional floating poll/pill or duplicated global notice. A pending poster is explicitly not a playable file.
- Completed: show real media controls; verified/credit-confirmed result alone enables Save to private My Videos and explicit Telegram link flow. No simulated video, download, upload, credit debit or delivery.
- Preserve native video decode verification, localized EN/RU/ES text, user-invoked sign-in gate, and separate optional ritual for pre-export. Ready Meditation and 8-session cards open the existing **sixth Therapy workspace immediately** (Single practice or 8-session course) with the selected focus; no script generation, editor expansion, credits or paid render occurs on Ready.
- Browser scope: 320/354/390/430px plus tablet and desktop; respect safe areas, 44px touch targets, focus and no scroll blocking. The one-row bottom navigation and Therapy workspace are **not** reverted to the stale Hypno tab shown in the older mock.

## Verification / release evidence
- Pre-publication static assertions: component phase, Save guard, offer/button order, responsive CSS, no duplicate in-video message. Real Playwright/WebKit screenshot, overlap/heatmap, physical iPhone player, private Save and provider Telegram E2E: **not executed by this source preparation**.
- Protected #4733's seven-image local-only, opt-in check-in is preserved. Existing overlapping export-only PR #4729 owns Safari media activation and credit hold; this UI patch must not overwrite its author or files. Protected Core/Specialist/Browser and hourly Vercel deployment gates remain mandatory.
- Visual: **CODE READY / BROWSER QA PENDING**. Functional iPhone E2E: **PENDING**. Live: **NOT CLAIMED**.
