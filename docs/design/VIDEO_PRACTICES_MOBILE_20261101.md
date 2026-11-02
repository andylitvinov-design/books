# Video Studio — light Courses & Practices mobile page (owner-approved, 2026-11-01)

## Page identity and reference

- Canonical route: `/{ru|en|es}/holistic-support/mandala`, workspace **Practice course** (`data-active-workspace="practices"`), therapy mode, public guest; no new route.
- Owner images: initial screenshot of current course and two bright Holistic House mobile alternatives; approved revised mockup in this conversation (bright sunrise hero, cream cards, vivid emerald CTAs).
- Exact same route/workspace/guest state is mandatory before visual comparison. Browser chrome, safe-area top, and native tab bar must not be mistaken for page content.

## Layout / behavior map

1. Brand hero (full content width; minimum 150 CSS px) uses existing first-party sunrise asset, cream overlay, 26–37 px heading, readable body. Existing video editor global navigation remains.
2. **Focus**, step 01: 54px mode switch (state or development vector); state options two-column, 57px tap targets. Vector displays original two inputs (current difficulty and desired goal). Goal refinement and source-protected saved tests remain opt-in.
3. **Meditation**, step 02: 57px large generator. Original local session script becomes visible with clear scroll limit and text contrast. **Add to video** forwards the exact script to the existing meditation editor; optional cloud voice remains a separate consented user action. **Do not add** keeps the draft separate; no video render is started by either action.
4. **Practice**, step 03: after meditation generation show three types (ritual, exercise, practice), three gentle local step variants, regenerate only changes the displayed exercise. Do not claim autonomous trauma therapy or diagnosis.
5. **Eight sessions**, step 04: user click reveals source-linked programme; compact numbered vertical cards on phones and two columns on tablet, first free clip is still a genuine separate user-triggered local render. Seven additional sessions are previews, not video files.
6. **Order**: existing link to imagery-therapy inquiry, not a processed purchase. Pricing/payment remain unchanged. Optional links and extended voice options are in explicit disclosures, not removed.

## Visual and interaction checks

- Target CSS widths: 320, 354, 390, 430, 768, 1440.
- Check no horizontal overflow, clipped RU/EN/ES buttons, iPhone keyboard overlap, minimum 44px active tap area; Voice/AI consent unchecked by default.
- User action chain: state/vector selection → generated local text → add/omit decision → ritual selection → 8-session plan → first session editor / provider-independent inquiry.
- No DB, RLS, account profiles, CRM, provider AI, automatic rendering or payment changes.
- Screenshot comparison pending browser QA at matching guest state; authored art is design reference, not proof of rendered fidelity.

## Post-merge mobile E2E hardening (2026-11-02)
- New single-purpose `scripts/verify-practices-mobile-browser.mjs` verifies the **actual public** editor in Chromium and WebKit at RU 320/390/430, EN 390 and ES 390. It tests deep-link activation, state/vector focus gating, locally produced meditation, real add/omit audio draft transfer, three distinct practice kinds, refreshed content, eight session cards, stale invalidation, 44px taps, no horizontal overflow, and absence of outbound writes.
- It runs inside the existing Mandala browser acceptance step on a `fix/video-*` PR; no duplicate workflow, new provider or private test records. Synthetic screenshots are stored in the existing browser artifacts bundle.
- Legacy comprehensive manual script now switches into the actual vector tab before using vector textareas; this is an assertion update for the approved owner page, **not** a UI regression waiver.
- Passing this synthetic guest test is **not** proof of real YouTube/HeyGen delivery, live provider billing, signed-in Google OAuth, physical iPhone Safari or purchase fulfilment.
