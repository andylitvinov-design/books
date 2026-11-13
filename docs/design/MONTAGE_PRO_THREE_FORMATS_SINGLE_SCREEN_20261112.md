# Montage PRO — three formats, one mobile screen (12 Nov 2026)

## Identity, reference and render owner
- References: owner's screenshots 1 and 2 are current mobile pages; screenshot 3 is the original approved design, superseded by the follow-up three-card mock. Do not replace the existing video player with a static mock.
- Route/role/view: `/{en|ru|es}/holistic-support/mandala` public Video Studio, Montage > Montage PRO subtab, guest or signed-in; page identity gate: **PASS at route/workspace intent**, actual browser pixel parity not yet verified.
- Source: `components/mandala-free-video-studio.tsx` with `MandalaMontageProOffer`; one shared preview, renderer, consent, credits and export path.
- Production branch at staging: `codex/public-book-library`, SHA `2574417b36ab3c2ec7568ba1849070cf2e65820e`; Vercel project `codex-public-book-library`, alias https://holistichouse.vercel.app.

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
- Free (0 €) → existing Ready (`setActiveWorkspace("ready")`), basic video selected. **Not** automatic rendering: Ready independently verifies eligibility, credit balance, MP4 and login/save requirements.
- Video + AI character (3 €) → existing Hypno (`setActiveWorkspace("effects")`), `talking_character` intent and existing character catalog. No provider call on card click.
- Cinematic premium (5 €) → existing PRO (`setActiveWorkspace("pro")`), `ai_cinematic` intent. No provider call on card click.
- Montage continues Style/Audio/Text/Story/PRO; legacy Story Video settings and the original exporter stay accessible.

Owner price badges €3/€5 are navigation/offer labels, **not proof** of enabled payment provider or paid generation; check eligibility, total and provider E2E before claiming paid service live. No new paid API, secret, RLS migration, credit bypass or render.

## Evidence
- Single in-memory patch staged into original Git blobs; one atomic commit/ref publish. No per-file CI waves.
- Focused source assertions: verified in staging. Typecheck, ESLint, Next build, real Chromium/WebKit screenshots/overlay, 320/354/390/430 and real click checks require existing CI.
- Real provider E2E and iPhone Safari: not yet verified.
- LIVE gate: protected merge, Vercel READY with correct exact production SHA, canonical domain and real browser click/visual QA.
