# Legacy Client Cabinet · modern design migration slice
2026-10-30. Status: code PR draft, not merged/live.

## Page identity
Protected legacy /en/client/[selector] and /ru/client/[selector] are private-link documents, distinct from Google /app/portrait, new My Courses, and owner /practice.
Private selector and bearer exchange, client session, original reports, PDF, published audio/video sessions and shared materials remain unchanged.

## New UI
Warm ivory background, forest-green active tabs and CTAs, compact header and welcome, 2-column filters on 320–430px, date-grouped document cards, 44px touch targets and reduced-motion support.
Two primary sections are My materials and My profile (including original reports). The separate Google account notice appears after private records and requires explicit per-document consent.

## Gate
Need exact-HEAD lint, TypeScript, production build, Chromium/WebKit 320/354/390/430 EN/RU with authorized synthetic data, cross-client isolation, valid private PDF readback, full sign-out and real Safari QA.
No screenshot match, real account E2E, new provider delivery, payment or live release is asserted from source tests.

## Remaining legacy migration
Continue existing docs/design/PUBLIC_SITE_TRANSFORMATION_V1_20261028.md and issue #55, coordinating #2516 (owner Services editor), #2548 (single Messages hub), #2609 (private goals handoff), and #2607 (CI). No duplicate systems or overlapping unreviewed changes.
EN/RU legacy selector remains as before; ES private-link auth must be deliberately localized rather than silently mapped onto another account.