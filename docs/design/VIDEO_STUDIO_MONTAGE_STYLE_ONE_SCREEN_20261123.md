# Montage / Style — actual implementation correction, 23 Nov 2026

Owner provided current iPhone screenshot (left) and approved plan (right); both are the existing `/{en,ru,es}/holistic-support/mandala` Video Studio → Montage → Style photo-selection state. Prior #5464 is merged, but visual comparison is not accepted.

## Implementation landmarks

- Keep existing header/workspace navigation, Montage sub-tabs and bottom dock. Use a short editorial photo banner above the existing three real step buttons, using already-present first-party assets. No additional renderer, provider call or fake media.
- Two-column grid: directly tappable native photo upload on the left, three mutually exclusive price modes on the right. Maintain personal-photo permission, disabled external animation and 250/100/0 XP estimates, with no credit deduction at selection.
- Same owner-private photo API and signed thumbnail lifetimes; personal thumbnails render in a horizontal rail, only if returned by the authenticated API. Guests/empty accounts see honest empty/sign-in states, not fabricated photos. Reuse/delete/save and consent remain in the existing user-opened drawer.
- Advance CTA is the final item of the default panel; advanced styles/format and price disclosure are compact above it. Do not remove existing capabilities or hide errors/consent to force a fold.
- Check EN/RU/ES at 320/354/375/390/430 CSS px using existing Chromium/WebKit acceptance; real geometry checks compare banner, step strip, upload/options columns, library, final CTA and dock. Capture 390px viewport screenshots; no personal data.

Visual source reference: owner conversation, not a public screenshot. Local source contracts verified; actual render, exact-head Core/Specialist, private-account E2E and canonical LIVE SHA remain required. No independent Vercel deployment; existing hourly publisher only.

24 Nov consolidation: current production photo state split is retained (`personalPhotoUrl`, `personalPhotoConsent`, `coachPhotoUrl`). The native picker stages the same File in the existing private gallery; save requires explicit rights/cloud/subject consent, checks the POST receipt and subsequent fresh GET. Error/pending status is visible outside the two-column chooser. In-flow expanded consent may extend below the first fold; the idle first fold and CTA must not overlap the dock. No fake guest/empty thumbnails. This uses existing first-party scenic and coach assets, not the exact mockup photo. Current Montage sub-tabs remain available. Existing #5531 behavior is included, no parallel source write. Full CI and physical signed-in acceptance remain required.
