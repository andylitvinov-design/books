# Holistic House — Hypnocorrection mobile visual handoff · 2026-10-30

## Page identity and comparison
Owner's approved reference is the 390 CSS-pixel iPhone mock from the Holistic House Video Studio discussion, **not** a new dashboard or separate video page. Route: \`/{ru,en,es}/holistic-support/mandala\`; anonymous guest editor, central video stage, sixth quick control "Гипнокоррекция" opened. Production branch: \`codex/public-book-library\`, not GitHub default.

## Regions (top to bottom)
1. Existing Holistic House mobile header, topic tiles, central Canvas/MediaRecorder 16:9 original preview — KEEP. No second render preview.
2. Existing horizontal six-control rail — KEEP, but change last label from "Дополнительно" to "Гипнокоррекция". On 320–430px allow horizontal swipe, labels >=13px.
3. Upon choosing the sixth control, show a single mobile panel with title (26–36px) and a cream/lavender Wave quick-setup banner (18px heading, 14px help, full-width Try button, >=44px).
4. Four compact full-width disclosure cards: "Установки и внушения", "Аудиоэффекты", "Визуальные эффекты", "Личная медитация". Header with first-party thumbnail **78x69px on the left**, 20–25px Georgia label and 14px subtitle, large chevron at right. First group expanded; only one expanded at a time.
5. Expanded group contains **three full-width, vertically stacked feature rows** (except meditation: exactly one Create button). Each feature text >=18px and description ~14px; 42px icon and 54x32 toggle; no 3/4-column cramped tiles. Sections show:
   - Affirmations: visible on-screen text, experiment-only brief frame (reuses existing \`AffirmationSettings.visibility\`), audio repetition (disabled pending real narration mix).
   - Audio: existing authorized recording/voice picker (goes to original audio module), quiet speech and binaural sound (not enabled pending encoded-output tests).
   - Visual: real Canvas light pulse rendered into preview AND captured output, original scene picker for places, original permission-gated personal photo picker.
   - Meditation: one link to original \`MandalaPersonalMeditation\` script editor; system speech preview must never claim a finished audio track.
6. One existing bottom Generate Video button and price/credit summary — KEEP; do not add another CTA or charge.

## Behavioral contract
- Wave preset changes only explicit local settings after user taps Try; never calls a paid provider.
- \`paintHypnoLightOverlay()\` is invoked in initial still, animated preview, initial captured frame, and subsequent recorder frames; repeatable 5–8 cycles/minute, smooth gradients, no strobes.
- Use existing phrase selection and visible-text insertion; short frames are experimental and no proof of subliminal therapy is asserted.
- Original recording, voice rights, photo permissions and audio attach must remain intact. Binaural and whisper are clearly not yet enabled until actual output and headset QA; no bogus success indicators.
- No private photo, symptom history or test results go to external AI/analytics; no clone of a third-party/public figure without independent consent/rights.
- EN/RU/ES content mirrors.

## QA gate
Verify 320/354/375/390/430 CSS px, both Chromium and WebKit, one preview, disclosure ARIA, keyboard, swipe rail, no overflow, reduced motion; run new wave/source tests, focused Mandala E2E (actual MP4/WebM bytes and frame changes), typecheck/lint/build, photo rights/audio privacy tests. No pixel-match certification without rendered screenshot/overlay at the same route/state. Merge only on exact-head CI green; confirm Vercel READY, SHA and canonical alias; physical iPhone Safari Save to Files remains a separate verification.


## Owner-approved third workspace update — 2026-11-01 (supersedes 30 Oct accordion layout)

**Identity:** anonymous guest on `/{ru,en,es}/holistic-support/mandala`, select existing third **Effects / Эффекты / Efectos** workspace. The screenshot is a mobile design reference, **not proof of the currently rendered live page**. Keep one existing Canvas/MediaRecorder player, one real local renderer, one Audio picker, original consent and EN/RU/ES.

**Visible reference regions:** native header (outside editor); title «Гипнокоррекция» and short text; one purple Wave recommendation banner; original 16:9 video preview with real Play; four illustrated control rows and one emerald «Сформировать видео» action. Within the shared editor the original video is upstream of the workspace panel; this change does not fork or relocate that source player. The six workspace tabs remain available upstream and are not copied into the Hypno child.

**Four rows order and geometry:**
1. **Аудио:** scenic portrait tile on left; three compact active setting cards: «Озвучка фраз», «Гипнозвук», «Бинауральные ритмы». A green switch is shown only for actually attached authorized audio. Quiet speech/binaural remain visibly disabled until a verifiable exported sound mix exists.
2. **Визуальные эффекты:** scenic nature tile left; three picture-backed cards: light pulse (working toggle and sliders), scene catalog (working editor), local photo (rights-gated original picker).
3. **Личная медитация:** scenic practice tile left, one large «Сгенерировать медитацию» and three compact options for duration 3/5/8/12, tone and voice; every option goes to the *existing* local meditation editor. Text is real; a finished audio track is **not** implied.
4. **Установки и внушения:** scenic sunlight tile left, visible text, experimental brief frame, pending speech repetition. Existing AffirmationSettings controls and consent retained.

At 375–430 CSS px use a left picture tile (~28% width) plus three same-row feature cards with real Configure buttons, controls and concise readable copy; below 375 CSS px move the illustrated group heading above the three cards instead of shrinking cards below accessible sizes. Group headings remain independently collapsible, all four expanded on first visit. Keep status notes and reduced motion. No duplicate mic, editor or Create button. One primary Create delegates to original `startFromHero` (consent/rights checks, real encoded output; local usage 0 credits), while the original extra CTA is hidden only in this workspace. The original top player remains the source of preview. Do not activate a paid provider, billing or a medical claim.

**QA:** exact-head Node+typecheck+lint+build; existing Mandala Chromium and WebKit at 320/354/375/390/430 RU and 390 EN/ES must tap third workspace, verify all group cards and geometry, Wave state, one Create and no overflow; capture synthetic public screenshots. Required source-output media/FFprobe test remains intact. **Not yet proof:** user-uploaded iPhone E2E, pixel overlay against owner JPEG (different DPR/crop), Vercel READY/live SHA until independently observed after merge.


**Visual hierarchy correction:** The Hypnocorrection title and its one real Wave action now use a first-party local React portal into the existing editor slot **before the original single hero player** only while the third Effects workspace is selected. The four control rows remain below the original six-tab navigation. The owner reference has title → Wave → 16:9 hero → groups → Create; no second player, Wave instance, API or credit debit. The shared workspace heading is suppressed on iPhone only to avoid a second title. Browser QA must assert Wave geometry above the player for RU/EN/ES, not just its presence.
