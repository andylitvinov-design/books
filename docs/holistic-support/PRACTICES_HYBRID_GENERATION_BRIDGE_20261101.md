# Courses & Practices — one hybrid engine, verified path

2 November 2026. Production branch: `codex/public-book-library`.

## Reconciliation
Owner-approved PR #3066 is MERGED and owns the bright, four-step mobile `MandalaGuidedCourse` at `/{ru|en|es}/holistic-support/mandala`. PR #3068 now reuses that **single** page. No duplicated `MandalaPersonalMeditation` UI, no second editor, recorder, renderer or saved profile.

Step 1: user's state or Now→Desired vector; explicit chosen goals outrank tests. Vector requires both fields. Verified private tests only by separate sign-in and opt-in. Focus changes revoke stale script, voice inclusion and eight-session previews.

Step 2: existing first-party local guided meditation, no background provider request. Crises stop local generation; negative triage is *not* a clinical all-clear. Include/omit chooses whether to open existing voice editor, never auto-renders video or sends the text to an AI.

Step 3: `resource-practice-selector.mjs` chooses six thematic families × three different kinds × two original low-intensity variants on RU/EN/ES, with distinct three-step instructions and daily transfer. The prior generic, shared practice-step array is eliminated; no external LLM required.

Step 4: existing `buildPersonalImageryCourse` creates an eight-session **outline** with a first-script/first-local-video handoff. Eight playable videos are not yet generated; purchasing the complete package requires confirmation and practitioner review.

## Model responsibilities

Holistic Intelligence / Psychologist Mind (baseline PR #2528 merged, extended #2532 OPEN) owns goals, constraints, consent and eligibility; Meditation Director / Writer Mind (#2676 OPEN) will do creative seven-beat writing; optional free-only, generic-only Gemini or owned Ollama is **OFF** until privacy, provider billing and content QA. No raw notes, health symptoms, profiles, user IDs or test scores go to the unpaid model. Templates and this safe practice library work without provider access.

## Release criteria

Run `node --test tests/mandala-video-therapy-focus.test.mjs tests/resource-practice-selector.test.mjs`, all applicable Mandala suite tests, TS, ESLint, Next production build, Chromium and WebKit at 320–430px RU/EN/ES, opt-in, stale invalidation, blocked cases, voice include/omit, first-video render and eight-session preview. Core + specialist + Public Services must pass on exact HEAD before protected merge; verify Vercel READY source SHA and alias. Do not bypass Public Services; #2997 is the separate shared-root repair.
