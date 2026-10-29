# My Progress / YouTube-library mobile redesign — visual & functional specification

Owner references: four private screenshots supplied 28 October 2026, all **706×1536 image pixels** (not guaranteed CSS px; status and Safari chrome excluded from any page alignment). Do not commit or republish the screenshots.

## Route identity gate

- **Target:** \`/{en,ru}/app/progress\`, signed-in personal Client Cabinet, account \`data.account.id\` verified by existing Google session. ES copy is prepared but the current \`/{locale}/app\` route rejects ES; this is a separate site-wide gate.
- **Not target:** approved public Meditative Support \`/ru/holistic-support/mobile\`; approved practitioner dashboard \`/ru/practice\`; authenticated practitioner service editor; YouTube's own website.
- **Current source branch:** \`codex/my-progress-unified-history-20261028\`, PR #2501 into verified \`codex/public-book-library\`; repository default \`codex/bootstrap-books\` is not the release target.
- Owner reference 1: YouTube **You** tab, dark background, personal identity, horizontal History thumbnails, library category rows and bottom dock; **borrow information hierarchy and easy resume, NOT dark skin or playback claims**.
- Reference 2: YouTube Home feed; **borrow visual density and recognizable thumbnail treatment, NOT sponsored placements, algorithmic recommendations, auto-play or simulated counts**.
- Reference 3: Holistic House Meditative Support; **canonical light cream/green palette, soft cards, visual topic controls, five-tab bottom nav**. This screenshot is *not* the authenticated progress page.
- Reference 4: practitioner public dashboard; **canonical account/profile identity row, gently rounded cards, mint icons, green CTA and warm textured surfaces**. Do not copy owner/practitioner operations into the personal progress route.

## Source component and screen regions

All visual changes are in **existing** \`components/app/my-progress.jsx\` + \`.module.css\`, with only existing shared \`app-workspace.jsx\` dock label/icon tweaks. There is no second Cabinet shell or demo page.

| Order | Section | Content contract | Desktop/mobile |
| --- | --- | --- | --- |
| 1 | Profile hero | Real account display name or neutral generic avatar, link to original private Profile, exactly four real counters: completed tests, saved/started courses, user-marked video records, confirmed practices | 4 compact counters; stack 2×2 at 320px |
| 2 | History rail | Owner-marked public Academy videos, real YouTube IDs/thumbnails with no-referrer, date + watched/mastered label, direct Watch Again; **no fake red playback bar/percentage** | Swipeable 16:9 cards with next card partly visible |
| 3 | My library | Eight category controls: video, course, test, mandala, practice, report, request, notes; category counts from the same private timeline and working anchor/filter | 4 columns large, 2 columns on phones |
| 4 | Continue | Only an existing unfinished test or live/paused/draft course; otherwise clear start-course fallback; no auto-resuming someone else's account | Dark green warm gradient, 44px+ CTA |
| 5 | Private mandalas | Only \`ready\` MP4 records from \`app_private.personal_videos\`, saved with explicit consent; click securely requests existing owner-scoped signed URL and shows \`video controls playsInline\`, **no autoplay or re-upload** | Swipeable symbolic gradient posters; one active player; safe empty CTA |
| 6 | Timeline | All available existing category events, dates, statuses, filtered locally, up to 24 at a time and explicit Show More | Compact card rows; URLs point to original protected modules |
| Footer | Privacy | Neutral note separating participation from clinical change; no marketing pixels or client scores in thumbnail URLs | Above existing 5-tab mobile dock |

## Functional mapping

1. Page \`AppWorkspace\` \`progress\` route → \`bootstrap\` verified, then parallel \`course\`, \`academy-energywork\`, \`personal-videos\`, \`video-progress\` account-scoped GET → deterministic pure \`buildMyProgress\` projection → React cards and filters.
2. Academy watch mark: video opens through original player; **only explicit** \`I watched\` writes to \`/api/app/video-progress\`; \`I mastered\` after the first mark. No automatic inference from click or time.
3. Video history card → public original YouTube ID, no-referrer thumb and Watch Again link. Inaccurate reconstruction of old YouTube history is not permitted.
4. Saved personal video card → existing \`GET /api/app/personal-videos/{uuid}\` → server-verified owner/ready status → short-lived signed read URL → local HTML video player. Do not expose storage object paths or patient photo/text.
5. Test, course, report, request and notes cards navigate to existing private routes; request status is **not** confirmed appointment or payment.
6. No marketing, subscription, mass sends, new paid media renders or public publication.

## Visual acceptance + blockers

- Capture **same-view signed-in synthetic data only** at 320, 354, 390, 430 CSS px, DPR aligned; Chromium and WebKit. Check top fold, 2-column library, video horizontal scroll, focus, selected filter, active course CTA, signed MP4 controls and bottom tab visible above iOS safe area.
- Compare geometry and interaction; a visual diff with public Meditative Support or YouTube is **not** a pixel-perfect gate because those screens have different roles, routes and states. Judge deliberate pattern synthesis, not a raw pixel difference percentage.
- Verify no document horizontal overflow, card clipping, duplicated bottom dock or inactive CTA. Check keyboard/VoiceOver control labels, zero-data state, partial-API failures, different-length RU/EN strings, and account changes while signed video request is outstanding.
- Separate from synthetic QA: user-approved real iPhone Google sign-in, marked Academy video → My Progress, private saved MP4 playback, foreign-user denied, stored row RLS.
- Before merge: focused node tests, lint, TS typecheck, production build, CI review, release branch conflicts. **Only mark LIVE_VERIFIED after Vercel READY SHA matches the canonical domain and real authenticated flows succeed.**
