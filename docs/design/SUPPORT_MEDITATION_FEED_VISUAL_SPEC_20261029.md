# Meditation feed, owner iPhone visual reference (2026-10-29)

## Identity and layout
The owner-provided two screenshots show the public RU mobile support dashboard, **Meditation** selected. Screenshot content width is 706 image pixels (CSS viewport and DPR unverified); source URL, query and login state are not visible. The matching existing component is `components/holistic-support-mobile.tsx` at `/ru/holistic-support/mobile` (also EN/ES); page-state identity is inferred and browser recheck is required, not a proven pixel match.

Production checked before edit: `codex/public-book-library` SHA `a3e428199e15dd3e529f251b0e43e0c54ad91583`, Vercel `dpl_9FN1NrwxaNZPvxu25M3tL9yJF3QT` READY, alias `holistichouse.vercel.app`. Existing PR #2483 is **not production**.

| Order | Block | Keep or change |
| --- | --- | --- |
| 1 | Self-check (energy/money/relationships/meaning), portrait, choice tiles | Keep, no duplicate |
| 2 | Six meditation category tiles + Master/Programme/Theme | Keep independent filters |
| 3 | Scenic original video hero and explicit Play | Keep single player; no autoplay on row selection |
| 4 | Four small 16:9 covers | Retitle from ‘Другие медитации’ to ‘Популярные медитации’ (EN/ES mirrors) |
| 5 | New full matching catalogue, **below** the four covers | Existing PR uses photo left, title + compact 2–3-line description right, source audio/program/Select; editorial RU translations added for existing English audio |
| 6 | Original YouTube link, private progress, bottom navigation | Keep |

Mobile target: 320, 354, 390, 430 CSS px, then 768/1440; readable typography, no horizontal overflow, 16:9 original poster crop, scroll/select/focus visibility, lazy images. No invented popularity statistics: ‘popular’ labels the editorial featured shelf rather than metric ranks.

## Functional / privacy flow
Existing verified manifest -> category/goal/master/program/theme filters -> **one** `catalogVideos` -> first four cards and **all** matching vertical rows. A row calls `pickVideo`, scrolls to the original hero and resets playback; only explicit Play loads `youtube-nocookie.com`. RU has seven Russian plus four separately labeled original English records; EN/ES have four English originals. Descriptions are editorial, not dub or guaranteed benefits.

No new DB, CRM leads, payments, uploads, tracking pixels or external APIs. Private check-in/photo/test answers never enter URLs or public video attributes. Preserve private photo opt-in/oval code in overlapping PR #2472; avoid overwriting it when integrating.

## Test and release evidence
- [ ] Source tests, scoped ESLint, TypeScript and Next build for **exact** feature head.
- [ ] Browser Chromium + WebKit EN/RU/ES: 320/354/390/430; category changes, 4 covers, complete filtered feed, fifth-through-eleventh RU selections, no autoplay or overflow.
- [ ] Same-state browser screenshot/geometry and overlay comparison vs public screenshot; no fabricated visual score. Source screenshot cannot establish authenticated UI state.
- [ ] Conflicting PR #2472 reconciled before merge and security diff reviewed.
- [ ] Production merge into verified branch; Vercel READY with **new exact SHA** and domain; public interactions read back.
- [ ] Provider playback/sound and account Google save on physical iPhone remain independent real E2E gates.

Visual acceptance: **PENDING**. Real provider E2E: **PENDING**. Live: **NOT DEPLOYED**.
