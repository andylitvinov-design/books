# Screenshot-to-UI visual spec — Video Studio Personal after Montage · 21 Nov 2026

## Reference and page identity
- Owner's iPhone screenshot (conversation upload; no private screenshot committed): **Ideas** is second after Goal, full-width ~110px Magic Mirror photo hero, 3-step Goal/Personalization/Concept, unnecessarily large 130–140px goal cards and CTA below viewport.
- Target **same app / same page**, not a new design: `https://holistichouse.vercel.app/en/holistic-support/mandala` (and EN/RU/ES), existing Video Studio client editor in Magic Mirror flow. Role guest or authenticated; no account test data introduced.
- Source production baseline `codex/public-book-library` commit `9376bfaf746172194b5d6adee41efa4ee3b821fe`; last observed READY Vercel commit `a42f378abeb8992ade159de7aee9753436d06f6a`, deployment `dpl_CTsDP5vbiTSQ1g93gU7FavvKDMUr`, not this change.
- Reference screenshot approx 353 CSS px of content, tall iPhone portrait, exact browser crop, DPR and viewport CSS height not independently verified. No numeric pixel-perfect claim until same-view screenshot+overlay.

## Navigation / route identity (all EN/RU/ES)
| Screen or action | Existing source | New user-visible result |
|---|---|---|
| Top six workspaces | Goal → Ideas → Montage → PRO → Ready → Therapy | **Goal → Montage → Personal → PRO → Ready → Therapy** |
| Magic Mirror photo or Next | automatic Ideas quiz | Montage / Style |
| Montage Style Continue | Audio | Audio |
| Montage Audio Continue | Text | **Extra** text choice |
| Extra: Make it simple | No explicit choice | Existing Story without on-frame text; no provider call |
| Extra: Emotional support | No explicit choice | Existing support phrases in Montage / Text, 0 XP |
| Extra: Personalized video therapy | No explicit choice | Personal Goal → adaptive questions → Concept, draft +50 XP |
| Personal concept approval | Montage Style | Existing Montage Text; film/audio persist |
| Existing premium format picker | primary three choices in Extra | **Other video formats** disclosure within Extra |
| Story Continue | Extra again | Guarded Ready; no automatic render |

## Mobile visual block map
1. Preserve true main header and bottom tab dock; do not recreate iOS chrome or duplicate player.
2. 6 top nav buttons; **Personal** in third slot after Montage; legible ~44–53px tap heights.
3. Personal removes duplicate 108–141px hero photo *only on Personal*; keep single Canvas for all other workspaces.
4. Compact Goal / Questions / Concept segmented row ~38px; progress ~19px, no redundant intro banner.
5. Three goal options ALL in one phone viewport, ~74–76px tall each. Real approved photo thumb ~62–78px wide, short title and maximum two summary lines; one ~46px CTA below.
6. Personal quiz shows one question at a time, choice grid with all options visible, back/next and answers retained.
7. Ivory #fffcf7, emerald #087659, Georgia headings. EN/RU/ES same geometry; scroll still available for short viewport, zoom and accessibility.

## Data, billing and security
- Existing `MandalaFreeVideoStudio`, Canvas/MediaRecorder, original private media, audio consent, XP wallet, source licensing and guarded Ready generation unchanged.
- +50 XP shown as **draft only**. No actual 50-XP billing logic or provider requests enabled, no guaranteed video generation from making the choice. Any live paid SKU requires independent server price/charge/release verification.
- No new external API, database, user upload, auth route, cookie, telemetry or AI rendering. No user report/health text in messaging.

## Verification status — requires protected CI and real QA
| View | Layout screenshot / overlay | Interactions | Status |
|---|---|---|---|
| 320 / 354 / 390 / 430 Chromium | Same step/crop, all 3 goals and CTA above dock, no horizontal scroll | Extra three choices / back | NOT RUN |
| Physical iPhone Safari / WebKit 390 | Same view after actual conditional navigation | touches, keyboard, safe area | NOT RUN |
| Desktop 768 / 1440 | compact section does not break wider layout | keyboard, screen reader, captions | NOT RUN |
| EN/RU/ES guest / signed in | locale parity, role/route identity | auth and wallet gates | NOT RUN |
| MP4 real export, download and replay | source-backed video, decoded sound and frames | actual file E2E | NOT RUN |

Unit/static route checks staged; local node tests, ESLint, TypeScript, Next build, browser screenshot and provider E2E not available from connector-only environment. Release requires exact-HEAD Core/Specialist/Guard, merge, Vercel READY and functional LIVE acceptance; **PR ≠ LIVE**. No manual Vercel prod deployment or paid HeyGen render.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
