# Holistic House — Premium Wooden Business Course
**Design QA & rollout specification · 2026-10-20**

## Request
Restyle **Business & Career · 90 days** in a warm, premium beige/brown/wooden professional coaching aesthetic. Keep existing 12 weekly modules, exact 90 daily outcomes, account-owned AES-GCM journal, opt-in diagnostic, personal metrics and private report untouched.

## Delivered in this PR
- **Light Wood default:** ivory #fffaf2, oat #f6ecdc, walnut #503424, espresso #302017, caramel #ab7c48, brass #d8ae74. Comfortable visual hierarchy for text-heavy business learning.
- **Executive Walnut option:** deep brown #342821, pale parchment ink #fff2df, subtle bronze outlines; explicit user toggle in course header. Non-sensitive appearance preference in localStorage; never sent to CRM, analytics or personal goals.
- **Walnut hero:** local CSS artwork (executive journal, fountain pen, coffee, walnut desk); no remote stock images, image generation, CDN or paid asset transformation; decorative markup is aria-hidden.
- **Consistent learning interface:** coffee/ivory forms, one paper-like lesson per screen, brass result marker, walnut primary CTA, 7-day stepper, 12 weekly module navigation, accessible status and completion rules.
- **Public-business entry:** dedicated scoped wood design for the free-plan card in `/en/explore/business`, `/ru/explore/business`, and honest English-language handoff on Spanish public page.
- **My Courses entry:** only the business coaching card is wood-themed; other OPORA/Reiki courses keep their own appearance.

## UX contract
- Do not change tracking, progress semantics or enrollment. Data written exclusively to existing protected `/api/app/business-coaching`, no private data in CSS or URLs.
- No autoplay, new video generation, stock-photo substitute, fonts or remotely fetched artwork.
- Light Wood is the default. Dark mode is a purely visual setting, never implies a change in educational content.
- Real action saved first; *only then* Save & Continue advances to next day. Previously saved lessons can use Next without writes.
- Historical course/day results, API payload, revision checking, owner RLS and encrypted reports are unchanged.

## QA
- Focused business-course and development-program unit tests, including design requirements, CSS Module bindings and dark/light text contrast (WCAG 4.5+).
- Next.js production build must pass CSS Modules purity, no forbidden `module` identifier and no missing CSS imports.
- Test public EN/RU business CTA, correct private `/app/business` route, and no exposure when unauthenticated.
- Responsive 320px, 390px, desktop; all seven day selectors remain usable with >=44px touch targets, sticky save bar not clipped.
- Print: white paper, legible text even when Executive Walnut is selected; no wood artwork printed.
- Compare exact merged Git SHA to Vercel READY alias before calling live.
- Signed-in Google account end-to-end and physical iPhone browser QA need real session/device; do not claim performed without actual verification.
