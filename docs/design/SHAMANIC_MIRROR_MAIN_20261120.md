# Shamanic main landing — Magic Mirror visual reference (20 Nov 2026)

## Reference and target
- Owner-approved reference: the user's 706 × 1536 screenshot of the Shamanic Magic Mirror-style mobile mockup. Public, synthetic content; browser chrome excluded from visual comparison.
- Target: public guest /{en,ru,es}/shamanica **personal** landing, initial quiz step. Not the global website homepage, business audience, service editor or quiz results.
- React/CSS owner: components/shamanica-mobile.tsx and components/shamanica-mobile.module.css.
- Production source branch: codex/public-book-library; deployment owner: super10 / codex-public-book-library.
- Phone reference width approximately 353 CSS px at a 2× screenshot; exact device DPR, fonts and browser chrome measurements not provided.
- Auth/CRM/API/payment: no new calls, prices or checkout routes. Existing category → three priced services and quiz recommendation routes remain unchanged.

## Structure and behavior
| Order | Screenshot region | Implementation | Interaction |
| --- | --- | --- | --- |
| 1 | Holistic House leaf wordmark, help, profile | Existing branded header; locale selector preserved | Home, iHelp, account |
| 2 | Shamanic serif title, gold motif, subheading | Centered editorial introduction | Informative |
| 3 | Scenic video inside laptop bezel | Existing local forest/sunset MP4 + poster; zero autoplay | Native playback after user tap |
| 4 | For Me / For Business pill | Existing route links, personal active | Navigate business route |
| 5 | Three-step progress and photo goal cards | Four photo-based option cards, selected emerald stroke | Card selects, Next advances, Back reverses |
| 6 | Optional goal text + keyboard dictation entry | In-memory keyword mapping to one of four existing goals | No text sent to URL/API |
| 7 | Emerald Next CTA | Reuses existing goal/method/start results contract | Two ranked real categories |
| 8 | Six photo service entrances | Five existing categories + free Reiki | Existing public services/Academy |
| 9 | Global seven-tab mobile dock | Unchanged shared shell | Existing app routes |

## Visual specification
- Cream/sunrise gradient, forest-green headings and main CTA, amber decorative highlights.
- Serif hero title, sans-serif functional typography; landscape photo remains unobstructed, 16:8.6 laptop video window, rounded cream choice cards.
- Mobile: 12 px gutters, two-column answer photos (minimum ~60 px high), primary CTA at least 55 px, no global dock duplication or horizontal overflow.
- Business audience remains the approved compact current design; EN/RU/ES and desktop versions preserve route functionality.
- This screenshot represents a taller scrollable composition, not the retired single-viewport green Support-style quiz contract.

## Acceptance to run after PR publication
- Existing tests/shamanica-mobile.test.mjs and scripts/verify-unified-six-dock-browser.mjs updated for this approved reference.
- GitHub exact-HEAD Core/Specialist/Guard and WebKit/Chromium screenshots at 320/353/390/430; verify desktop 768/1440.
- Rendered screenshot comparison and iPhone Safari playback are **not yet verified**. Pixel-perfect match must not be claimed.
- PR merge uses protected auto-merge; only the existing hourly GitHub workflow may publish Vercel Production.
