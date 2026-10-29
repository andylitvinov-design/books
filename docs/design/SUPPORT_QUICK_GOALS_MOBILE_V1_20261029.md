# Holistic Support mobile — explicit quick goals & stress (owner mock 29 Oct 2026)

**Status:** source candidate on feature branch; CI and real-browser parity required before publication.
**Owner reference:** last approved tall RU iPhone mock in conversation (four visible motivational scales at the top, profile/Tests in the middle, four tools at right, a NEW step 3 with five quick goals above the existing scenic player). The reference is conceptual, not a screenshot of a deployed page. Do not commit the original image or personal photos.

## Page identity and visual contract

- Target/source: `/{en,ru,es}/holistic-support/mobile` **guest** state, existing alternative mobile Support experience, **not** homepage `/`, protected Practice editor, Mandala editor or the standard `/holistic-support` marketing page.
- Files: `components/holistic-support-mobile.tsx` and `.module.css`; page remains `app/[locale]/holistic-support/mobile/page.tsx`. No new page, server endpoint, database, CRM, media item, checkout or external AI.
- Original three-zone first row **KEEP**: left four motivational scores; central user photo/Tests, quick matching, actual focus; right meditation/session/talisman/Reiki + courses, masters and video mandala. The optional photo stays local.
- NEW step 3 **ADD** immediately below first row, before scenic photo player: header, five visible warm cards, optional Skip. Exactly one card selected at a time, never preselect stress.
- Existing published video player, four thumbnails, master credit, source-audio language, bottom navigation and protected routes **KEEP** unchanged. No fabricated video label, autoplay, new diagnosis or invented benefit.
- Initial 5/10 values are neutral UI positions. Until the user adjusts a slider, they do **not** constitute reported measurements. Neutral focus is "Choose a goal"; no initial average/score claim.
- Clicking a goal changes a local first step, not a medical score or saved client record. A detailed goal filter can override it; using another tool or selecting a video theme clears the quick goal. It never creates a CRM lead or booking.

### Page state mapping

| Entry | Real route | Role / view | Result |
| --- | --- | --- | --- |
| Home dock | `/ru/holistic-support/mobile` | guest mobile Support | same page and cards |
| Quick goal Stress | same | guest, explicit selected goal | selected card, contextual source link `/ru/courses/antistress`, original video remains poster-only |
| Quick goal Energy | same | guest, explicit selected goal | original meditations, public `/ru/holistic-support#meditation-practices` |
| Quick goal Relationships | same | guest, explicit selected goal | `/ru/explore/love` |
| Quick goal Decisions | same | guest, explicit selected goal | `/ru/services/free-situation-review` |
| Quick goal Business | same | guest, explicit selected goal | `/ru/explore/business` |
| Skip / manual mode | same | guest, no quick goal | existing meditation library; no stale "personal recommendation" |
| Detailed goal filter | same | guest, explicit accepted goal | existing `HolisticSupportGoalFilter` and `HolisticSupportInlineGuide` |
| Protected login, CRM and paid checkout | existing distinct routes | account scoped | untouched; request is not booking/payment |

EN/RU/ES use identical goal IDs and destination families, with only localized labels. No fifth life sphere: stress is a **specific request**, not a fifth scale or another validated questionnaire.

### Layout visual spec

Reference is an AI-assisted interpretation of the owner's screenshot; do not claim pixel-perfect correspondence. Content-only coordinates in CSS pixels, dynamic across widths.

| Order | Region | Implementation | Target |
| --- | --- | --- | --- |
| 1 | Three columns | `.topGrid` | preserve proportions and controls from original iPhone UI |
| 2 | Step 3 goals | `.quickGoals`, `.quickGoalGrid` | one full-width card; 5 equal buttons; green selected border/background |
| 3 | Contextual result | `.quickGoalResult` | only after intentional click, link to *existing* approved page |
| 4 | Scenic video | `#support-mobile-experience`, `[data-support-player]` | existing video and 4 source-backed thumbnails, no autoplay |
| 5 | 5-link dock | `[data-support-mobile-bottom-nav]` | unchanged, iPhone safe-area padding retained |

Widths 320, 354, 390, 430 (plus desktop): cards wrap text without clipping, horizontal overflow ≤3px. Source CSS uses five equal cards down to 320 px; no sixth primary card. Buttons/links are ≥44px high with visible keyboard focus, localized labels and reduced-motion support.

## Safety & acceptance

- Explicit input takes priority over legacy score-only inference. No "Energy" diagnosis/priority from untouched 5s. Separate score polarity: Energy = resource, Stress = load; no combined score or fake average.
- Real public course and service links only. Stress goal suggests OPORA as **a possible self-guided resource**, without a claim of clinical symptom reduction, treatment or guaranteed outcome. Individual consultation and Reiki remain distinct optional paths.
- Check native `node --test tests/holistic-support-quick-goals.test.mjs tests/holistic-support-mobile-alternative.test.mjs tests/holistic-support-guided-recommendations.test.mjs`, ESLint, TS, production build and exact-head CI.
- Existing browser workflow `hh-support-mobile-mock-browser.yml`: Chromium/WebKit × EN/RU/ES × 320/390/430, 5 goals untouched; click Stress; source link; 4 scores unchanged; no iframe; Skip; existing slider/filter/player/consultation and iPhone geometry.
- Inspect generated browser screenshots of this *same guest view* (especially selected quick-goal at 390px), compare original user-approved hierarchy by eye and use a side-by-side/overlay only if content and crop are matched. Never compare a different signed-in dashboard.
- Before "LIVE": exact GitHub PR HEAD + CI, merge into **current Vercel-linked** `codex/public-book-library`, Vercel READY, same merge SHA, alias `holistichouse.vercel.app`, live route readback plus actual click/scroll/navigation proof. Provider E2E, real iPhone device and external payment are independent gates; do not claim them passed based on mock.
