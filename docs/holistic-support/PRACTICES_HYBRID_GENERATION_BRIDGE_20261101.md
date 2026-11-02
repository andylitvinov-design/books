# Holistic House · «Курсы и практики»: hybrid engine and production acceptance

Updated: 2026-11-01. Production target: `codex/public-book-library` (the repo's GitHub default `codex/bootstrap-books` is not the live website).

## 1. Reality as of this branch

| Step | Existing production basis | New code in this PR | Limits |
|---|---|---|---|
| Focus: current state vs development vector | Existing user goal, themes and personal feedback | `MandalaPersonalMeditation` now accepts one of four goal presets or free text; vector requires current + desired fields | Intent only, not an inferred diagnosis |
| Meditation | `buildPersonalMeditationScript`, existing spoken queue and user-controlled free-text editor | Same selected focus sent to existing local script/8-day outline; no duplicate writer | Local curated composition, *not* a generative LLM; audio file not produced by on-device read-aloud |
| Practice / exercise / ritual | Existing OPORA resource methods and related practice concepts | 3 types × 2 curated variants × 6 themes × RU/EN/ES via `selectResourcePractice`; after a safe meditation draft, before the 8-day plan | Bounded deterministic matching, not new clinical techniques |
| 8-session development program | `buildAdaptiveMeditationOutline` + `buildPersonalImageryCourse` | Shares effective goal and theme; existing plan and first-video handoff retained | Eight title/topic/storyboard outlines; only first script/video preparation is currently exposed, not eight rendered films |

## 2. Answer: owned algorithm, Gemini or hybrid?

**Hybrid with safety-critical decision policy entirely under Holistic House control.**

1. **Client Focus / Intent Interpreter** (first party): only explicit state, selected theme, vector current→desired and opt-in test-derived *verified* categories. A preference overrides a test. No private account or personal test results forwarded to a model implicitly.
2. **Psychologist Mind** (in-house, gated PR #2532): assess method eligibility and self-guided boundaries, choose goal and safe micro-skill; does **not** diagnose or act as independent therapist. The baseline deterministic reasoning core from PR #2528 is already merged.
3. **Meditation Narrative Director** (gated PR #2676): approved seven-beat meaning arc, motif, pacing and forbidden elements.
4. **Writer / Literary Editor** (gated PR #2676): optional first-party Ollama or consented externally hosted *generic-only* Gemini creative text; validate outputs against immutable approved brief, style, language, exclusions and independent safety checks. Templates remain a functional fallback.
5. **Practice Selector** (this PR): vetted action catalogue, independently deterministic and useful without cloud inference. Never let external language-model prose authorize a new clinical practice or override consent.
6. **Program Composer**: eight ordered mini-skill goals and approved resource imagery scenes from existing in-house planners, with future check-ins and stop/skip support. Human review required for clinical or paid multi-video course; video production uses **one existing** Canvas/MediaRecorder renderer and approved visual/music rights.

**Explicit provider gates:** The separate PR #2676 has a Gemini 3.5 Flash-Lite *proposal/implementation* with server-side free-tier opt-in, generic code only, privacy exclusion, review flags and local template fallback. It is currently OPEN and gated OFF. The production `/api/holistic-support/hypno-strategy` is a *different* optional feature-gated Gemini endpoint for support phrases, not a replacement meditation generator. `lib/ai/free-text-provider-route.mjs` is an order policy, not an activated paid LLM subscription. Never assume a claimed free tier is free of billing or data-use conditions without a provider account check.

## 3. Primary product contract

One explicit focus shared across all three outputs, with stable app state and revision tracking:

`PracticeIntent={locale, theme, mode:state|vector, selectedState|currentState+desiredState, optional verifiedGoals, userConsents}`

`PracticeJourney={intentVersion, meditation:{script,mode,editable,safe}, practice:{id,kind,title,steps,transfer}, roadmap:{sessions[8],publicationState}, audio:{previewOnly|realAsset}, video:{preview|file}}`

- State updates invalidate any older generated script, practice or plan until the user regenerates; old content is marked stale rather than silently being passed into rendering.
- Vector mode requires both fields. Empty requests can use chosen low-risk state presets.
- Each practice changes by **kind** (ritual / exercise / practice), and by locally reviewed variant, without calling a model.
- Every UI button has a real state transition. The "create" button executes local text generation and the existing local plan only. It does not imply a ready/downloadable audio or eight-video package.
- Published videos and audio need proof of actual playable media and asset provenance; no use of copyrighted background tracks without rights.

## 4. Safety and permission boundaries

- **Hard gates** remain server-owned for any future private/history/clinical/API path; never take a `clinicalApproved=true` field from client JSON as authority.
- Current local script and practice can respond only as non-clinical, low-intensity reflection. Urgent user expressions block the practice selector and are not a clinical "all clear" in other cases.
- No induced breathing, regression, forced closed eyes, exposure to trauma, suggestive symbol interpretation, promises of cure or financial outcomes. Stop, skip and accessibility remain available.
- Anonymous external model receives only approved non-sensitive categories and vetted text; personal stories, symptoms, names, test values, session history and account identifiers require separate purpose-limited explicit consent and a provider/privacy design review. With the current unpaid Gemini route the sensitive payload **must not be sent even with consent**.
- Local state and private score loading are not a marketing/CRM operation; no new persistence in this PR.

## 5. Release plan

1. This PR: validate RU/EN/ES local selector (all themes/modes), crisis block, source integration and CSS responsiveness, run targeted Node tests, project ESLint, TypeScript/Next build and mobile browser tests.
2. Merge into **production branch** only on exact-head mandatory status success. Preserve protected release checks, no force push.
3. Confirm Vercel READY and deployed production Git SHA/alias; manually test actual 320, 375, 390, 430 px iOS Safari and Chromium for State/Vector → Generate → Ritual/Exercise/Practice → 8-session outline, plus back/redo, stop, text edit, stale state and account-privacy behavior.
4. Independently reconcile #2532 then #2676 in dependency order. Do **not** activate external literary generation until server-side privacy, model account billing, actual output, editorial QA and consent E2E are verified. Preserve local safe fallback.
5. Separately build durable eight-session media jobs (authorized scene/audio, per-session script and licensed media assets, actual ffprobe, signed-in save/delivery, cancellation and no charged order without confirmation). Never sell outlines as pre-rendered videos.

No production rollout or provider verification is claimed merely by this document or PR.
