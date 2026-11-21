# Shamanic · HD unified one-screen cabinet · approved 21 November 2026

## Page identity and source-of-truth
Reference A: owner-approved warm luxury Alchemist's Cabinet mobile mock for **For Me**; reference B: the corresponding **For Business** mock. Reported actual defects: live personal screen uses blurry, over-compressed decorative photos and overflows one iPhone viewport; Business opens a wholly different white/beige hero and embeds unrelated initial diagnostics instead of the matching cabinet. Scope is guest `/{ru,en,es}/shamanica` and `/{ru,en,es}/shamanica/business`, **first stage/category screen only**; keep priced offer/academy/checkout pages distinct. Neither iOS status bar nor phone bezel is website content.

## Common visual spec
Same existing ShamanicaMobile component, dark walnut/brown lounge palette, leafy Holistic House header, locale selector, working help/profile, gold sun and crescent symbol, cream serif “Shamanic / Alchemist’s Cabinet” (localized), scenic two-chair fireplace hero, jade-green/ivory segmented For Me/For Business, six image-backed cream-labelled categories (2 columns × 3 rows), one existing sitewide seven-destination emerald bottom dock. Selected audience changes **only the card catalogue and selection steps, not the layout family**.

High-resolution first-party art from the approved generated references (cropped to exclude overlaid text and device shell):
- `shamanic-lounge-hd.avif` — 750×270 hero background, 30,943 B.
- `shamanic-cards-personal-hd.avif` — 720×390, six aligned crops, 20,572 B.
- `shamanic-cards-business-hd.avif` — 720×390, six aligned crops, 21,541 B.
- `shamanic-sun-hd.avif` — small sharp solar emblem, 5,867 B.
Use background-position per item rather than six huge media requests. Keep labels/icons as native accessible UI. Photographs are *illustrative*, not documentary depictions of a real office.

### First-screen proportions
At a representative **390 × 844 CSS px** viewport:
- Site/content top ~5px; brand/tools 42px;
- Shared hero height ~202px, with fireplace/chairs in lower 135px;
- Audience segmented switch 42px with 8px following margin;
- Two-by-three tile grid: each row ~91px, gap 8px; 3 rows ~289px total;
- Optional collapsed quiz/selector affordance 40px (business and personal), with ~6px gap;
- Single fixed dock ~78px including safe inset, whose central Chat orb floats over the top of dock without blocking the last tile;
- The full initial first screen is intended to fit above the dock without a second scroll. On iPhone 320px width and short 690px height, CSS overrides reduce hero and card heights, preserving readable minimums.
- When a category is chosen, replace six tiles *in situ* with a scrollable follow-up panel rather than appending large content below the fold.
- On larger screens, center the same content, preserve desktop course/service pages.

## Functional contract
**For Me** initial row-major order:
1. Get Hints & Ideas; 2. Rituals & Artifacts; 3. Remedies for Heart & Mind; 4. Mysteries & Initiations; 5. Reiki & Energy Support; 6. Shamanic & Reiki Academy.

A tap opens 3–4 specific localized subcategories in the same visual slot; **Back** shows six again. Subcategory items link to existing public I Ching, symbolic readings, mandalas, psycho-homeopathy, Greek/Egyptian mystery, remote Reiki, Tantra/Kundalini/Yggdrasil and free-course routes; an extra All services entry opens existing category results with three priced Details/Order cards. Existing optional personal three-question wizard and video remain under a closed drawer, not discarded.

**For Business** initial row-major order:
1. Express Business Insight; 2. Remedies for Clarity & Leadership; 3. Strategic Business Analyses; 4. Artefacts for Goal Support; 5. Business Energy Support; 6. Academy of Business Energywork.

Tap selects the category *within the same screen*, showing its existing 4–5 services/options and Back. Express pricing **FREE, 45 CAD, 75 CAD, 200 CAD, 300 CAD** is preserved. Strategic areas Strategic Goal Review, Business Functions Analyses, Business Teams Review, Growth Strategy & Implementation and one real Get details → existing WhatsApp/Telegram actions are preserved. Business original quiz remains in a collapsible 3-question drawer, not displayed as an unrelated hero. No fake payments/orders, user data or second API.

## QA, release and limitations
Run existing core/specialist checks and source tests including `tests/shamanica-mobile.test.mjs` and `tests/shamanica-unified-hd.test.mjs`, TypeScript/Next build, and rendered guest browser geometry/interaction checks in Chromium/WebKit at **320/354/390/430px** (and heights 690/844). Check both routes for no horizontal overflow, no covered tiles, no blurred hero at actual device DPR, correct locale swap, all category/subcategory links, prices/Details, and real bottom dock. Compare same-route/viewport screenshot with owner's reference after removing device chrome; only rendered overlay justifies pixel-fidelity claims. Distinguish CI green from functional E2E and LIVE.

Release: one atomic HEAD → ready PR → protected exact-HEAD CI + native auto-merge. The *existing* hourly GitHub/Vercel publisher is sole ordinary production writer; do not create an extra manual deployment, Vercel preview, paid provider, new CI workflow, or new project. Verify served production alias and Git SHA after it publishes. Until proven, status is CODE IN PR / CI or MERGED AWAITING HOURLY, not LIVE.

**Correction before release:** the room photo was recropped to eliminate a stray subtitle baked into the earlier image source; the H1 and subtitle remain native, readable website text.
