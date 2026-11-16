# Video Studio PRO — first-screen contextual editor · 7 Nov 2026

## Reference / page identity
- Owner reference: private iPhone screenshot provided in conversation on 2026-11-07 (broken current page). Do not add the screenshot to public GitHub artifacts.
- Canonical public guest routes: `/{en,ru,es}/holistic-support/mandala`; current `PRO` workspace within existing Video Studio. No auth redirect, new route, or new player.
- Reference image: 706 × 1536 physical px, approximately 353 × 768 CSS px at DPR 2. iOS status bar and bottom app navigation are part of the viewport.
- Page identity gate: route and role matched against source structure; live DOM/visual overlay NOT VERIFIED (no connected browser).
- Component: `components/mandala-pro-enhance.tsx` and its scoped CSS module. Parent video/audio/credit/recording functions remain untouched.

## User problem / required layout
The original PRO page shows two independent selection blocks: six shortcut tiles, six large feature cards, then an add-on rail and legacy editing details. The Continue CTA appears below the fold and can be covered by the mobile bottom navigation.

| Order | Screenshot region | Corrected behavior |
| --- | --- | --- |
| 1 | Global Holistic House header, six main Studio workflow tabs | Keep existing live shell and navigation; not duplicated |
| 2 | Original preview/player and credit balance | Keep original Canvas/video and soundtrack state |
| 3 | Six small tabs directly below preview | Single mutually exclusive `Montage / Character / Film scene / Power place / Home / Quality` selection |
| 4 | PRO panel, lower part of first viewport | One compact contextual area only; three previews from existing first-party catalog for character/story/place/home, or real montage/quality shortcuts |
| 5 | Fixed action dock | Two working actions **Montage** (existing editor) and **Generate video** (existing local generator), always visible above global bottom navigation |
| 6 | Previous add-on rail / legacy editor below CTA | Not independently rendered. The original Story catalog appears only when explicitly opened, and scrolls INSIDE the contextual area |

## Behavior contracts
- Category tab: local React state and aria-pressed; resets expanded panel. No network call.
- Preview item labeled Available: opens the existing `MandalaStoriesCharacters` catalog, where choosing and applying a local asset uses its original `onApply` handler and real export path. Item labeled Coming soon: only shows a truthful unavailable message; never claims a new AI render.
- Free catalog: same `onChooseCatalog(kind)` wired to canonical catalog; no duplicate selection APIs.
- Montage / Quality: open already-implemented editor via `onGoToMontage("effects")` or `onGoToMontage("audio")`.
- Generate video: existing `onGenerateFree={createQuickVideo}` with the original credit, guest/session, media, recording and playback checks.
- Paid AI effect controls are preview-only; no billable provider or payment action.
- Disabled state: original `recording || preparing || micRecording` gate preserved.
- EN/RU/ES labels and focus indicators preserved.

## Acceptance and evidence
- Structural source assertions: six categories, exclusive region, 3-up catalog previews, no redundant add-on rail, genuine handlers, mobile fixed action dock, safe-area, EN/RU/ES, scroll for expanded options.
- Browser acceptance to run on 320, 354, 390, 430 px Chromium plus iPhone/WebKit, and 768/1440 px desktop, with synthetic guest content. Verify CTA remains visible above bottom nav, no clipping and no horizontal scrolling at every viewport.
- Compare same-route and same-workspace iPhone screenshot with rendered candidate; capture real click journeys for all six tabs and both CTA buttons.
- Visual screenshot/overlay: **NOT RUN** (browser connector unavailable at authoring).
- Physical iPhone Safari and actual generated MP4: **NOT RUN**.
- GitHub exact-HEAD Core/Specialist/Guard and production deployment verification: pending after PR publication.
- No new APIs, paid services, third-party assets, subscription or automatic AI video generation.
