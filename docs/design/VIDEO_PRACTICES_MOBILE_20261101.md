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

## Browser coverage handoff · 2026-11-02

- Existing production: user-approved light Courses & Practices is implemented in the original Studio workspace (do not fork the route).
- The earlier legacy visual regression script used vector-only input fields without first selecting `Вектор развития`; updated to navigate the actual two-mode interface.
- A real Playwright path now runs from the existing mandala voice/browser acceptance: Chromium and macOS WebKit, guest RU/320, EN/390, ES/430; mode switch, focus validation, generated text, all three curated practices, refresh, real narration-editor seed and revoke, eight-session preview, and mutation without any third-party/private request.
- Synthetic course screenshots are saved with the existing browser artifacts if `HH_HYPNO_SCREENSHOT_DIR` is configured. A screenshot does not prove a paid course, Google OAuth or voice provider delivery.
- This does not auto-render videos, enable paid AI, or change database/CRM/security state.
