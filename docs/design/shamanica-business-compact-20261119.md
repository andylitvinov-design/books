# Shamanica Business compact screenshot acceptance — 2026-11-19

Reference: owner-provided RU guest business screen at /ru/shamanica/business, portrait 864×1536 image.
Broken Live: same route split across two 706×1536 iPhone captures. Page-identity gate PASS.
Target: one screen in ordinary 390px and 430px portrait viewports, with all six real service links and fixed shared seven-item dock.
Visual map: shared header → self/business/iHelp selector → illustrated landscape/stones hero → 3-step auto-advance quiz (2×2) → featured express review → three rows of two photo-backed service cards → existing dock.
Source components: components/shamanica-mobile.tsx and shamanica-business-content.tsx, CSS modules.
Preserve auth, service links, private intake, EN/RU/ES and the existing single iHelp dialog.
Route-only banner suppression prevents the unrelated personal-review ribbon consuming first-screen height.
At 320px and very short heights permit readable fallback vertical scrolling, never crop required actions.
Acceptance: public-services browser runner checks visible sixth service above dock at 390/430×844, no horizontal overflow, 6 images, auto-next quiz and two results.
Rendered screenshot overlay and actual iPhone device confirmation are still separate from CSS/source checks.
Release: one protected Ready PR, existing hourly production publisher only, no manual Vercel deploy.
