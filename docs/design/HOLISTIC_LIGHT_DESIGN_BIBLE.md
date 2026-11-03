# Holistic House — Design Bible v1.2 · Holistic Light — Warm & Alive

**Status:** canonical specification for NEW/refactored Holistic House UI (updated 3 November 2026; screenshot-driven Studio Warm Peach addition).  
**Owner reference:** https://docs.google.com/document/d/1zREpz2hpHA-dfilYgXS18TASkrw-D8mf_UXEFrfOvvU/edit  
**Opt-in CSS:** app/holistic-light-tokens.css.  
**Audit:** scripts/holistic-light-design-qa.mjs and existing scripts/capture-public-ui-reference.mjs, scripts/compare-ui-screenshots.mjs.

This is the design contract, not evidence that existing pages have been restyled.

## 1. Brand and visual matrix

Light, warm, alive, supportive, calm and contemporary. Use generous ivory space, crisp near-white panels, natural warm-light photography, clearly legible dark headings, rounded shapes and ONE prominent emerald/teal CTA per step. Green is an ANCHOR, not a full-page color wash; category colors add variation. Avoid monochrome sage/gray-green surfaces, tiny controls and competing buttons.

Three complementary approved reference types:
- Discovery / meditation library: pastel category tiles, large emotionally rich featured media, clear playback CTA and smaller related cards.
- Video Studio / functional pages: white task panels, obvious step hierarchy, imagery-led choices and one primary next action.
- Warm Sunrise / goal and personal practice wizard: warm sunrise photo fading into ivory, three progress steps, one question per screen, two-column pastel choices, selected checks, “from → to” summary, separately confirmed result screen.

The reference is a visual model, not a guarantee that credits, media, health outcomes or voices shown in mockups exist.

## 2. Global palette and semantic variants

| Purpose | Token/value |
| --- | --- |
| Canvas | #FCF9F2 |
| White surface | #FFFFFF |
| Soft surface | #F8F5EF |
| Primary text | #143D3A |
| Editorial navy (optional) | #17334B |
| Secondary text | #5D6A71 |
| Border | #E7E3DA, 1px |
| Main CTA | #067A67 / white |
| Focus ring | #176E6E / 3px |
| Selected | #E6F6F1 + 2px border/check |
| Warm Sunrise canvas | #FFF9F3 |
| Warm Sunrise CTA | #02774B / white |
| Warm Sunrise selected | #E8F6EA |
| Body and Energy | #EAF7F7 / icon #176E6E |
| Money and Career | #FBF2DE / icon #966A1F |
| Love and Relationships | #FCECF2 / icon #AA4068 |
| Confidence and Harmony | #F2ECFB / icon #7753B1 |
| Anti-stress | #EAF8EF / icon #08736B |

Regular text WCAG AA contrast >=4.5:1, large text/icons >=3:1; choice colors must have additional textual/check or radio state markers.

## 3. Typography, shape, space

- Spacing scale: 4/8/12/16/24/32px; mobile horizontal padding 12–16px.
- Radius: chip 12–16px, input 16–18, card 20–24, hero 26–32.
- CTA height 52–60px; controls at least 44×44px where practical.
- Mobile title 28–36px, H2 23–27, H3 18–22, body 16–18, helper 14–15. EN/RU/ES text wraps; never truncate for decorative symmetry.
- Existing sans-serif for functional UI; existing serif for editorial headings and video heroes. Do not add a costly new font merely to copy a mockup.
- Photos: sunrise, landscape, water, forest, warm natural sunlight and varied inclusive people; do not reuse one model portrait on every page. Clear image crops, optimized responsive sizes, lazy below-fold media, video poster, no autoplay.
- Check at 320/360/375/390/430px, plus 768/1280px; safe areas, virtual keyboard, one-thumb use, reduced motion, contrast and no document overflow.

## 4. Variant inheritance

**holistic-light:** primary for catalog, video library, homepage, tests and most internal pages.  
**warm-sunrise:** opt-in data-hh-design="warm-sunrise" for personal meditation, goal journey, practice generator and short guided wizards. Distinct steps: 1 choose goal; 2 current state; 3 confirm vector; then separate verified ready state. Do not promise a completed video when only text/script exists.  
**approved exceptions:** keep My Course original teal gamified theme and Business beige/wood. Protected cabinet/CRM stay information-led. The same accessibility and mobile layout rules still apply. Do not globally replace their existing theme tokens.

## 5. States and behavior

Every new component needs actual idle, focus, selected, disabled, pending, success, empty and error states. Buttons keep live actions and secure data flows. Confirmed generation, file save, notification delivery and payment are distinct milestones. EN/RU/ES translations complete. No private test/health data in public screenshots or alerts.

## 6. Manual 100-point rubric

| Dimension | Points |
| --- | ---: |
| Color, light and brand warmth | 20 |
| Readability and typography | 15 |
| Component consistency and states | 20 |
| Mobile composition, clear CTA | 20 |
| Accessibility and speed | 15 |
| Product correctness and EN/RU/ES | 10 |

90–100 excellent; **85–89 acceptable**; 70–84 correct; below 70 revise. Automatic STOP regardless of score: broken action, privacy exposure, 320px overflow, important focus/contrast failures, blocked button/input, incorrect cost or false delivery claims.

## 7. Browser audit and screenshot comparison

Source audit: node --test tests/holistic-light-design-qa.test.mjs.  
Public live baseline: node scripts/holistic-light-design-qa.mjs --origin=https://holistichouse.vercel.app.  
The read-only public audit runs isolated guest Chromium/WebKit and captures screenshots/DOM/CSS and warns about overflow, tap targets, opaque control contrast, potential green wash and route mismatches. It is a *preliminary technical audit*; subjective look and alignment to the owner's screenshot must still be reviewed by a human/design assistant.

Current representative public routes: /ru/meditations; /ru/holistic-support/mandala; /ru/holistic-support/mobile; /ru/practice; EN/ES mandala; 320px WebKit. Extend the route set when a new public page is introduced. Do not point generic capture at protected /app, /admin, /client, payments or token query URLs.

Pixel fidelity requires the same route + locale + role + auth state + viewport + DPR + crop as the reference. Use scripts/compare-ui-screenshots.mjs for side-by-side, overlay and diff. No color ratio or CI result alone proves visual fidelity, actual saved state, video render, payments or delivery.

## 8. UI PR acceptance contract

Identify canonical view and page owner; read AGENTS.md and visual-to-code skill. Reuse existing components and tokens, avoid duplicate navigation or independent color constants. Include route-specific screenshots at 320/390/430 + WebKit, substantive click/disabled/error states, EN/RU/ES, actual data/role flows and Design QA score. Record automated findings separately from manual visual review and real E2E. Merge only with required exact-HEAD checks, then verify production READY, source SHA, canonical domain and real interactions. Existing custom themes remain explicit exceptions.

## 9. Daily 05:07 Toronto audit -> actual repair (not reports alone)

The canonical public-only QA is scheduled daily at **05:07 America/Toronto**, in GitHub default branch `codex/bootstrap-books` through the EXISTING `.github/workflows/hh-nightly-public-crawl.yml`. GitHub Actions native timezone handles EST/EDT. The separate 07:15 UTC nightly SEO crawl stays intact. See dependent default-branch PR #3145.

The daily workflow checks out real production branch `codex/public-book-library`, runs `scripts/holistic-light-design-qa.mjs` as a guest-only read, and records screenshot/DOM evidence. Its trusted `scripts/holistic-light-qa-handoff.mjs` ranks findings by severity and creates/updates **one** issue labeled `hh:design-qa` titled `[Design QA] Holistic Light — daily action queue`. Repeated defects, including EN/RU/ES variants, must not spawn parallel issues. For failed captures, report an infrastructure blocker, never a false clean bill.

The **already existing** Chat Product Repair hourly :35 worker uses one special 06:35 Toronto run to inspect the fresh daily issue and execute up to one safe, confirmed source fix. It must first reuse existing PRs/lease; only create a new scoped PR when no matching PR exists and the source problem is reproduced. It may not invent a patch to make a report look actionable. Honor runner-capacity policy and production protections.

Required independently verified receipts: AUDIT_RUN -> ACTION_QUEUE_ISSUE -> (CLAIM or BLOCKER) -> SOURCE_COMMIT -> PR -> exact-head CI -> MERGE_SHA -> real serving Vercel READY_SHA -> LIVE browser action. Absence of an item cannot be silently called success. Automatic CSS audits are advisory on human visual warmth and cannot prove private/auth/provider E2E.

Priority order: broken app/route and protected data first; reproducible overflow/contrast and first-screen CTA next; muted-green image/style review only after an approved screenshot and same-view comparison. Existing My Course teal and Business wood themes remain explicit approved exceptions.


---

## 10. Owner-approved mobile reference family · Studio Warm Peach (3 November 2026)

**New canonical page-level reference:** three owner-supplied iPhone screenshots reviewed on 3 November 2026:
1. **Phrases / voice composer:** request summary, phrase categories and controls, phrase list, voice selection and saved personal recordings, one primary “Apply phrases to video” action.
2. **Video creation / goal-to-story flow:** large real-video hero, six Video Studio tabs, goal cards, free-form topic, prompt/helper, popular topic chips and four scenario cards.
3. **Montage / multi-track timeline:** scenario summary, real preview with format/time controls, transport and trim actions, time ruler, video/audio/text lanes, add-media row, editing tools and export.

This is an additional page-level visual family within Holistic Light. It does not replace the site-wide holistic-light palette, the warm-sunrise guided wizard, My Course teal or Business wood. Do not recolor unrelated pages globally. Apply the Studio Warm Peach palette only to Video Studio and closely related creative-media surfaces that explicitly adopt this family.

### 10.1. Screenshot-derived color system

The three JPEG references share a warm pink-ivory canvas, near-white warm cards, forest/emerald green controls, dark navy/forest text and restrained pastel category accents. The values below are proposed semantic tokens sampled/estimated from the supplied compressed screenshots and normalized for implementation; they are not claims of exact original source CSS.

| Semantic role | Studio Warm Peach value | Usage |
| --- | --- | --- |
| Main canvas | #FFF7F3 | Warm blush/ivory page background |
| Warm canvas gradient stop | #FFF0E8 | Subtle lower/edge warmth; never a saturated peach wash |
| Card surface | #FFFCFA | Main white cards and input surfaces |
| Elevated/media surface | #FFFFFF | Controls, popovers, small elevated panels |
| Card border | #EADFD9 | Quiet 1px boundaries |
| Primary ink | #142B3D | Main headings and important labels |
| Forest ink | #14523F | Section headings, selected-state labels |
| Body ink | #26343B | Main text and list items |
| Muted ink | #718078 | Helper text, secondary metadata |
| Main emerald | #07885F | Primary CTA, active tab, selected actions |
| Bright active emerald | #02A065 | Selected tab/control where a more vivid fill is needed |
| Deep emerald | #006B4B | Hover/pressed/deep green treatment |
| Pale mint | #EAF5EC | Selected cards, support rows and safe positive states |
| Soft mint | #F0F7EF | Phrase rows, audio and secondary cards |
| Gold surface | #FFF1D8 | “Add your phrase”, optional actions, warm category |
| Gold ink | #98651E | Gold labels and icons; not long body copy |
| Soft pink | #FCEEF6 | Love/relationship category |
| Soft lavender | #F1E8F8 | Development/meaning category and optional audio accent |
| Soft blue | #EAF2F8 | Neutral/clarity category |
| Timeline mint | #BFEBD7 | Text/selected media clip treatment |
| Timeline audio lavender | #DCC8F1 | Audio lane or waveform when the editor supports it |
| Divider | #EEE6E0 | Separation inside warm cards |
| Shadow | 0 5px 18px rgb(66 42 31 / 7%) | Subtle depth; avoid dark or floating-card overload |

**Color balance:** approximately 70–80% warm canvas and neutral surfaces, 10–15% dark ink/photography, 5–10% emerald interactive emphasis, with small pastel accents. Emerald is the interaction anchor, not a full-screen background. Pastel colors identify categories, not arbitrary decoration. Keep selected state visible through a border/check/icon as well as a fill; never rely on color alone.

**Primary action rule:** one dominant emerald CTA per screen or workflow stage. Secondary actions use white/outlined or pale-mint surfaces. Gold is a tertiary “add/customize” accent, not a competing primary CTA. Do not place multiple large emerald actions beside each other unless they represent genuinely distinct user decisions.

### 10.2. Shared mobile shell and navigation

- Keep the existing Holistic House wordmark/header: leaf symbol, serif brand wordmark, concise section subtitle, back/navigation action and autosave state. The brand wordmark may remain serif; task UI remains sans-serif.
- Preserve six Video Studio workspace tabs: **Style video, Montage, Phrases, Hypno effect, Practice course, PRO** (localized in EN/RU/ES). They are a distinct in-studio navigation layer, not the global five-item bottom dock.
- At mobile widths, keep the six workspace controls in a single horizontal rail with fixed minimum hit areas, no wrapping into two cramped text rows. Use horizontal scrolling/snap when six complete controls cannot fit; do not shrink labels below legibility. Keep the active tab as a saturated emerald filled card with white icon/text; inactive tabs are near-white with emerald outline icons and dark labels.
- Preserve the site's existing fixed bottom navigation and safe-area padding. It must not overlap the video timeline, export button, keyboard or last form control.
- Use consistent outline icons, typically 22–26px, with an emerald/forest stroke. Icons support, but do not replace, visible labels.
- Autosave is a quiet status indicator with meaningful states (saving/saved/error), not a substitute for a confirmed export or cloud save.

### 10.3. Type, density and card geometry

- Section titles: 21–25px, bold sans-serif, forest or primary ink; numbered steps use a compact icon + number/title row.
- Main page/hero title: 25–34px, strong contrast, short line length; keep enough image visible around it.
- Body and phrase text: 15–17px; helper/metadata: 12–14px, with adequate contrast. Do not make functional labels smaller to fit a rigid grid.
- Phrase copy and list items should read at a glance; the phrase itself receives the majority of horizontal width. Number, play, edit and reorder controls remain discrete, with at least 44px hit areas.
- Main section cards: 18–24px radius; media/hero: 20–26px; field/control: 14–18px; compact category chip: pill or 14–18px radius. Borders are soft and shadows very restrained.
- Keep 12–18px page gutters and 12–16px internal card padding on phones. Use 12–16px between sibling controls and 20–28px between major sections. Avoid large empty card headers; prioritize usable text and media area.
- A warm, nearly continuous page background is preferred to heavy nested card-on-card borders. Use a nested panel only when it conveys a distinct task or state.

### 10.4. Pattern A — phrase and voice composer

Use this screen order when the user is creating, editing or applying supportive phrases:

1. Request/theme summary: concise selected topic, with an optional “individual selection” action. The theme remains visible and editable without reopening the full goal journey.
2. Intent/category chips (e.g. Support, Possibility, Action, Confidence). Selected chip is pale mint with emerald border/check; unselected chips are white.
3. Phrase parameters in compact, readable controls: tone, focus and phrase duration. Keep each label and selected value visible; do not hide the current setting behind an icon-only button.
4. Phrase list with count and clear list title. Each row has a number, phrase text, real play action, edit and reorder actions. Support wrapping to a second line for longer phrases; do not clip or horizontally scroll the copy.
5. “Add your own phrase” as a gold/pale-warm secondary action.
6. Voice section: segmented choices **Female / Male / My voice**. Show the real count of available voices for each gender where applicable. When “My voice” is selected, show record-new-track and a list of saved recordings with real play, duration, edit and delete actions. Support multiple user-owned tracks only if persistence and recorder APIs actually support them.
7. One wide emerald primary CTA: “Apply phrases to video”. Do not add a second competing generate/export CTA to this phrase-composition step.

**Behavior:** phrase edits, selection, ordering, duration, language and chosen voice must feed the actual shared video project. Preview must be a real audio playback. Record, edit and delete controls must work; decorative waveforms or fake play states are not acceptable. Private voice recordings remain private and follow explicit permissions/deletion semantics. Text is not silently sent to an external voice provider. Distinguish preview, attached audio, and exported video.

### 10.5. Pattern B — goal-to-story video creation

Use a progressive, clearly numbered sequence. It is the user's creative brief, not a second copy of the same goal form inside Montage or PRO.

**Hero media**
- A wide real video hero sits immediately below the workspace navigation.
- Keep a clear title/subtitle on a readable dark-to-transparent overlay, real playback timeline, volume and fullscreen actions. Use a poster and user-initiated playback; never autoplay sound.
- A small format badge (e.g. 16:9) can sit in the upper corner when it helps explain the active project format. The video itself must preserve its intrinsic ratio/crop; never stretch to fill a decorative box.

**Step 1 — choose a goal**
- Show a compact, horizontal row/carousel of large, pastel, picture/icon-led goal cards (e.g. Energy, Anti-stress, Love, Money, Development), with an affordance to discover remaining categories.
- Keep the choice easy to scan and touch. Selected state uses emerald outline/fill/check, not only a color shift.
- Categories use semantic accents: mint/green for support and wellbeing, pale yellow/gold for money/abundance, pink for love/relationships, lavender for development/meaning, blue for clarity/energy where appropriate.

**Step 2 — describe a topic**
- Show the optional free-text field with a clear privacy hint.
- A concise free/AI-helper recommendation may appear above the field, but it must be clear what it does and what leaves the browser. Do not imply an AI request happened before consent.
- Popular topic suggestions are compact rounded chips/cards arranged in a responsive grid (usually 2–3 columns); a chip fills the topic, it does not trigger paid rendering.
- Preserve the user's previously selected goal. Do not ask for the same goal again in Montage or PRO.

**Step 3 — choose a story**
- Offer four genuinely available scenario choices in a horizontally browsable card rail or a balanced 2×2 grid when the view is narrow. Use real MP4/poster assets, clear titles and an explicit selected marker/number.
- “All stories” opens the existing full catalogue rather than a duplicate list.
- A next-step CTA can lead into phrase selection/audio preparation. Selecting a scenario or opening its storyboard is NOT proof that a final MP4 has been rendered.
- Advanced storyboard editing remains a distinct optional step; preserve source clips and duration facts.

### 10.6. Pattern C — Montage and multi-track timeline

The Montage screen is a real editor workspace, not a settings dashboard. Keep a direct, visible relationship between the preview and the timeline.

**Order of content**
1. Compact project/story summary with the current theme and a user-invoked change/refresh action.
2. Large video preview with the real aspect-ratio selector/status and current time / total duration.
3. Transport controls: undo, redo, central play/pause, and a clearly labeled Split/Cut action. Disabled states must reflect the actual history/playhead state.
4. Timeline ruler with time labels and a visible playhead/scrubber.
5. Separate labeled tracks:
   - **Video:** real clip thumbnails, visible clip boundaries and per-clip duration badges.
   - **Audio:** real attached track/waveform or a neutral empty state. The waveform must be derived from real audio or omitted; never draw a decorative waveform that implies a playable soundtrack.
   - **Text:** actual text overlay blocks with their start/end interval. Text clips should be separately editable.
6. A simple “Add” row for supported media (video, photo, music, voice, AI voice where truly available). Label unavailable/import-restricted options honestly.
7. A compact toolbar for Settings, Effects, Transitions, Text, Overlays and Format. Use icon + word labels; on narrow phones horizontal scroll is preferable to tiny controls.
8. One wide emerald **Export video** CTA, with progress, cancel, error and success states.

**Timeline behavior**
- The playhead, ruler, preview, clip boundaries and current time use one time coordinate system. Scrubbing updates the actual preview.
- Dragging/trimming/reordering changes the actual project model, not merely the visual thumbnail.
- Clip duration labels and total duration must agree. For an illustrative 30-second project, scene durations must sum to 30 seconds; never hard-code screenshot example timings as universal defaults.
- Separate video, audio and text tracks visually; use restrained mint for selected/text regions and a lilac audio accent if it improves identification. Keep labels at the left edge visible while content scrolls horizontally.
- Undo/redo reflect real edit history. Split/Cut requires an actual selected clip and valid playhead position. Avoid inert toolbar buttons.
- Horizontal timeline scrolling must not create page-level horizontal overflow. Pinch/drag and scrub gestures must not conflict with page scroll; provide accessible tap alternatives.

### 10.7. Export formats and media rules

- Expose the supported aspect ratios clearly: **16:9 landscape, 9:16 portrait, 1:1 square**. Preserve source media crop/focal point and provide an intelligible preview for each. The format selector is project state, not decoration.
- Quick-generation duration options currently specified for the base editor: **15 / 20 / 30 / 60 seconds** when the selected source and export path support that duration. Montage timeline duration is derived from clip timing and may use a custom total when supported; do not force the quick preset list onto the detailed editor.
- Display current time and total duration in player/timeline. Keep the project's current format visible near the preview, not hidden deep in settings.
- MP4 source selections must resolve to verified/licensed assets. Poster-only assets are not playable MP4; a Canvas animation is not an MP4 source.
- Preserve the existing free local export path and its limitations. Paid AI generation, provider upload, credit deduction, private storage, cloud saving and external publication are separate explicit actions requiring their own permissions and evidence.
- Photo selection requires clear local/private handling and consent before any external transfer. The default local workflow should not upload personal photos.
- Audio rights, actual sample availability, one/multiple-track export support and voice-provider availability must be shown honestly. Do not imply that multiple tracks are mixed when only one audio stream is exported.
- Preview, storyboard, local export, verified MP4 file, saved account asset and published video are six distinct product states.

### 10.8. Responsive composition and bottom navigation

- Phone references are tall, portrait, thumb-operated screens. Keep the primary workflow in one column; use horizontal rails for compact category/tab rows and the multi-track timeline.
- At 320–350px: do not collapse the six workspace tabs into two tiny rows; horizontally scroll the tab rail. Reflow goal cards to a comfortable 2-column grid or a horizontal rail. Stack format/duration selectors if two columns become cramped.
- At 390–430px: allow the goal and scenario cards to gain width; keep tap targets, phrase text and timeline labels legible.
- The bottom site dock stays in its existing five-item layout, fixed above the iOS safe area, with enough content padding that the final export/apply CTA can scroll fully above it.
- Avoid sticky controls that collide with the browser address bar, notch, keyboard or lower navigation. The video preview must not be covered by floating overlays.
- Desktop/tablet may expand the same sections into columns, but must not fork into a different interaction model or separate media state.

### 10.9. Visual QA additions for these references

For each of the three screen families, capture the exact route, locale, role/auth state, viewport and scroll position. Do not compare the phrase composer to the goal wizard or the goal wizard to the timeline; compare like-for-like states only.

Required responsive widths: **320 / 354 / 390 / 430px**, plus 768 and 1280px. Include both viewport and full-page screenshots for long screens. Test at least:
- Phrase composer: select category; change tone/focus/duration; play/edit/reorder a phrase; add custom phrase; switch female/male/my-voice; record and replay a synthetic recording where browser permission is explicitly granted; apply phrases.
- Goal/story: select goal; enter topic; choose popular topic; select each scenario; open “all stories”; move to phrases/audio without losing project state.
- Montage: play/pause; seek; change format; change clip order/duration; split at valid playhead; edit text overlay; attach/replay audio; undo/redo; export one real synthetic file and validate codec/duration/audio track.
- EN/RU/ES: labels do not wrap into unreadable fragments; buttons and helper/privacy copy are localized.
- iOS Safari/WebKit: media user gesture, audio mute/unmute, file picker, recorder permission, viewport/safe area and timeline gestures.
- Keep automated QA evidence, human visual review and genuine provider/account testing separate. A DOM contract or route fetch does not prove playback, recording or export works.

### 10.10. Explicit anti-patterns

- No second global goal prompt in Montage or PRO.
- No six tiny tabs wrapped into two crowded rows.
- No full-page green wash, grey-green monotony or arbitrary extra accent colors.
- No three equally prominent CTAs in one screen.
- No tiny text in phrase rows, timeline track labels or editor tools.
- No decorative waveform, fake MP4, fake voice sample, fake autosave or mock export completion.
- No one-size-fits-all 16:9 crop; portrait/square must be deliberate and previewable.
- No page-level horizontal scrolling caused by the timeline or the tab rail.
- No duplicate global bottom dock, player, recorder, audio editor or render pipeline.
- No invented prices, AI availability, credit charges or external delivery claims.

**Status:** this reference family is now part of the canonical design contract. Implementation still requires route-matched screenshot comparison, real action E2E and separate LIVE SHA verification; the design specification itself is not evidence that any particular page has already been visually accepted.
