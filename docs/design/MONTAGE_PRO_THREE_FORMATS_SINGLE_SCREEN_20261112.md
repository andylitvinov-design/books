# Montage PRO — three formats, one mobile screen (12 Nov 2026)

## Identity, reference and render owner
- References: owner's screenshots 1 and 2 are current mobile pages; screenshot 3 is the original approved design, superseded by the follow-up three-card mock. Do not replace the existing video player with a static mock.
- Route/role/view: `/{en|ru|es}/holistic-support/mandala` public Video Studio, Montage > Montage PRO subtab, guest or signed-in; page identity gate: **PASS at route/workspace intent**, actual browser pixel parity not yet verified.
- Source: `components/mandala-free-video-studio.tsx` with `MandalaMontageProOffer`; one shared preview, renderer, consent, credits and export path.
- Production branch at staging: `codex/public-book-library`, SHA `262a5f8e310324d9c4fcd6f5170d08dceb9adf40` after merging Ready Save #4515 and audio #4527; Vercel project `codex-public-book-library`, alias https://holistichouse.vercel.app.

## Block map — 390 × 844 CSS px target
| Region | Target | Existing selector |
| --- | --- | --- |
| Identity and six workspaces | Keep one row and compact header | quickBrandBar / quickVideoNav |
| Full-width 16:9-ish hero | one wide 130–160px banner, NO preview side rail | promo-scoped heroWithRail / heroRail |
| Five Montage tabs | Style → Audio → Text → Story → Montage PRO | montageQuickTools |
| Offer title | one heading and one hint | MandalaMontageProOffer header |
| Three format choices | 3 horizontal ~90px cards with image, 2-line text, price, button | data-video-pro-feature: free/character/cinematic |
| Bottom navigation | original MyVideo app dock, no duplicate benefit strip or large CTAs | existing shell |

## Functional mapping
- Free (0 €) → original `createQuickVideo()` on the real user gesture, with the existing eligibility, credits, consent, media rights, audible MP4 and browser playback checks. **Ready opens automatically only after native decoded video and credit confirmation**; no fake Ready on click. If another paid format was selected, the first tap selects Basic and asks for another deliberate Generate tap.
- Video + AI character (3 €) → existing Hypno (`setActiveWorkspace("effects")`), `talking_character` intent and existing character catalog. No provider call on card click.
- Cinematic premium (5 €) → existing PRO (`setActiveWorkspace("pro")`), `ai_cinematic` intent. No provider call on card click.
- Montage continues Style/Audio/Text/Story/PRO; legacy Story Video settings and the original exporter stay accessible.

Owner price badges €3/€5 are navigation/offer labels, **not proof** of enabled payment provider or paid generation; check eligibility, total and provider E2E before claiming paid service live. No new paid provider, secret, RLS migration or credit bypass. Free uses the existing consented local renderer with real encoded-MP4 QA.

## Evidence
- Verified detached merge patch prepared on production base; publish one cohesive source HEAD with the guarded Free-render correctness repair. No per-file CI waves.
- Focused source invariants: verified at staging; actual exact-HEAD TypeScript/ESLint/Next, real Chromium/WebKit MP4/Save + 320/354/390/430 and screenshot overlay still require protected CI and real browser QA.
- Real provider E2E and iPhone Safari: not yet verified.
- LIVE gate: protected merge, Vercel READY with correct exact production SHA, canonical domain and real browser click/visual QA.
