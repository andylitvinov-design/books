# Master: two existing journeys, one segmented control (2026-11-07)

**Source:** owner iPhone screenshot of the EN “Practitioner workspace” dashboard (uploaded in chat; **do not commit the image**). The screenshot has no address bar, so the exact captured authentication state, DPR and viewport cannot be independently certified. Source-to-view mapping: existing `/{locale}/practice` with `PracticeShowcase`, **not** `/app/practice` service editor.

**Identity gate:** PASS for code route/view ownership; screenshot pixel overlay NOT YET VERIFIED. Distinct `/{locale}/masters` page is the existing public finder; do not compare its pixels with dashboard screenshot. Production base before implementation: `codex/public-book-library` @ `8b5a3767ceeea3cb89403090b240b19f7b339fdb`; Vercel production READY under `holistichouse.vercel.app` at that SHA.

| Mode | EN label | Public route | View | Auth |
| --- | --- | --- | --- | --- |
| Find | Find a Master · Masters & services | `/{locale}/masters` | Moderated marketplace finder | Guest permitted; enquiry retains original gate |
| Share | I'm a Master · Share services | `/{locale}/practice` | Practitioner workspace from screenshot | Public preview; profile/service editing retains original Google auth |

Both routes supported in EN/RU/ES; bottom Master destination stays `/{locale}/practice`, and Master remains highlighted in either mode. Leave the existing finder filters, article tabs, media, profile, offerings, CRM, private reports, login, and billing unchanged.

## Mobile visual plan

| Order | Existing selector | Change | Layout / color |
| --- | --- | --- | --- |
| 1 | Site shell / iPhone status bar | Keep | Approved warm ivory canvas |
| 2 | `[data-master-mode-switch]` | Add above page heading | Two equal-width links, 5px spacing, ~70px total, 44px+ touch, rounded cream rail, light emerald selected, focus ring |
| 3 | Dashboard heading/identity | Keep, shift below switch | Existing typography, portrait, metrics |
| 4 | Six creation tiles + scenic hero | Keep | Existing actions, media, layout |
| 5 | Offerings and tools | Keep | Original protected API behaviors |
| 6 | Seven-item mobile dock | Keep single instance, active on finder and workspace | No second bottom navigation; preserve iOS safe area |

Visual source references are approximately mobile portrait (exact CSS width unknown). Verify at 320/354/390/430px Chromium and 390px WebKit with route-matched screenshots, no overflow, real tap and active state, plus practice screenshot against the prior baseline **with switch-height offset only**. Keep public finder and private dashboard screenshot comparisons separate.

| Control | Guest | Signed-in | Error |
| --- | --- | --- | --- |
| Find a Master | Open public finder and approved services | Same | Finder's existing unavailable states |
| I'm a Master | Open workspace preview | Existing workspace/editor actions | Existing auth/error UX |
| Add service | Existing Google sign-in prompt | Existing protected editor | Existing error/permission checks |

**Before LIVE:** focused unit test, syntax, lint, typecheck, build; Playwright real rendered EN/RU/ES links at 320–430 + WebKit; exact-HEAD specialist/guard/Core CI; protected merge; Vercel READY and alias; owner iPhone screenshot QA. No payment/booking/CRM delivery E2E is implied. No new paid services, schema or provider APIs.

Visual: NOT YET VERIFIED · Functional E2E: SYNTHETIC BROWSER PLANNED, PRIVATE ACCOUNT NOT RUN · LIVE: NOT DEPLOYED.
