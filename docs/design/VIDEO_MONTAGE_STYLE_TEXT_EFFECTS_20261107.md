# Montage — Style / Text / Effects / Settings (7 Nov 2026)

## One-publish preflight
- Repo: `andylitvinov-design/books`; project: Vercel `codex-public-book-library` (`prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`); production base: `codex/public-book-library` at `06d74240afe6376f02ddfbb55bf1b3b833eb2554` (READY `dpl_459v25bnL4AoDxuC1AprPUFYyzDk` when inspected).
- Worktree/branch: `codex/montage-style-text-effects-aspect-20261107`; new PR; no existing owner lease or PR HEAD to modify. The overlapping open PRs #3935 / #3936 / #3943 are separate and must not be edited by this task.
- One-publish plan: stage all source/tests/docs locally; run focused tests, typecheck, lint and browser tests; publish ONE coherent source HEAD after verification. No Vercel preview on non-production branches per existing repository settings; do not introduce services, paid effects, new workflows or renders.
- Owner reference: uploaded iPhone screenshot of `/ru/holistic-support/mandala`, Video Studio > Montage > Style, with warm ivory cards and 4 compact sub-tabs, ~353 CSS px content width (706 px source @2 DPR). Current screen/reference are the same public Studio view; selected goal and sign-in state must be matched in rendered visual QA, not assumed from screenshot alone.
- Code owner: `components/mandala-free-video-studio.tsx`, `components/mandala-video-mobile.module.css`, and existing `lib/mandala/hypno-visual-overlay.mjs` / `components/mandala-hypnocorrection-mobile.tsx`. No new renderer and no RLS/API/migration modifications.

## Requested block map and behavior
1. Keep global studio header, six primary destinations, one 16:9 hero Canvas player and compact Intro/My video rail.
2. Montage four sub-tabs: Style (existing first), Text (one existing `MandalaVideoIdeas` phrase editor relocated out of Ideas), Effects (real light overlays formerly selected under Hypno), Settings (existing).
3. Style shows six existing image presets, brightness and two explicit aspect controls 16:9 / 9:16 at its bottom. Select output aspect through the existing physical eligibility/reframe helper; do not silently promise incompatible source footage.
4. Text edits phrases in the one parent source used by Canvas/export; retain selection when switching tabs; voice upload and audio recording remain accessible through their existing controls until the separate Audio/Ideas migration lands.
5. Effects offers None, Sunlight, Glow, Radiant waves and strength. Effect selection immediately repaints the one Canvas still and animated preview, and must also affect encoded MP4/WebM frames through the same existing render function. No provider request or credits on mere selection.
6. Keep Settings and advanced audio/concept deep links reachable until their independent reorganization is safely released. Do not duplicate exported text or voice tracks.

## Acceptance evidence / release boundary
- Focused suites incl. new Canvas effects: **75/75 PASS** (`node --test`, test source and mock Canvas only); separate voice/guest/mobile regression suites: **63/63 PASS**.
- `tsc --noEmit`: **exit 0**. Targeted ESLint: **exit 0**, 17 previously present warnings. `git diff --check`, effect-module and edited browser-script syntax: PASS.
- The actual WebKit/Chromium browser flows, export pixel proofs, screenshots at 320–430 px RU/EN/ES, and production E2E have **NOT** been run for this commit. Browser scripts now follow physical Style → Text and Settings → advanced Concept/Audio interactions; they are not an executed proof.
- Local `next build` deliberately **not** started: connected Mac storage dropped under 300 MiB during parallel build processes; this task removed only its temporary install, caches and test logs. Require PR CI build.
- Original advanced Concept, soundtrack and voice still reachable under Settings to avoid breaking timelines and mixing. The same visual effect source of truth is shared with legacy Hypno while #3935 and other overlapping Ideas/Audio PRs are unfinished; not a replacement for their release.
- No new paid service, auth bypass, RLS, database migration or new encoder. Selecting a visual effect only changes local canvas state; direct generation retains existing checks.
- Protected CI exact-head, merge SHA, Vercel READY and live site verification: **pending**; old production READY SHA is not evidence this PR is live.
