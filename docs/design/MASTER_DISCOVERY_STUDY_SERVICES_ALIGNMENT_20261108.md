# Find a Master — compact discovery aligned with Study / Services · 2026-11-08

## Source of truth and identity gate
- **Target / actual:** `/en/masters`, `/ru/masters`, `/es/masters`, public guest practitioner finder; `?view=articles` remains a deep link.
- **Owner's first screenshot:** actual Find a Master view (excessive Free Review banner, two tall cards, giant Community header, two publisher buttons, four selects before practitioners).
- **Owner's second screenshot:** reference **visual system** of Study → Services (compact category chips/selects, photographic service showcase, primary teal action). It is NOT the same route/view; do not claim pixel identity, identical user records or a valid overlay between those screenshots.
- **Source:** `app/[locale]/masters/page.tsx`; `components/master-mode-switch.*`, `mentor-community-switch.*`, `master-network-explorer.*`; already-approved public practitioner/service/course repositories.
- **Production base at staging:** `39cf49dfdcd49c1386202d540ae481e689875d75`; verify Vercel READY/SHA/alias independently after any merge.

## User journey, before → after
1. Guest enters Find a Master → same real `/masters` finder, no irrelevant global Free Review banner.
2. Compact role switch: Find a Master (selected) | I'm a Master → original protected `/practice`.
3. Compact discovery heading, direct `/services/catalog` link, two keyboard-operable content tabs: Masters (default) | Services & articles. Preserve `?view=articles`, EN/RU/ES and approved-public-only records.
4. Masters mode: query → **topic chips before** real service/course/format/language selectors → optional method/location/price/sort → featured master card. Card uses the first matched **approved public service's actual** photo when available, never invented practitioner imagery.
5. Public master card → original profile, service details or existing remote energy request; no fake booking/checkout/CRM success.
6. Services & articles → published service cards first, curated articles after; authorship actions move below results as secondary links to protected Materials editor.
7. Missing courses, empty listings, repository failures and private/draft data retain original handling; no new endpoints, storage, tracking or paid provider.

## Visual block map (mobile 320–430)
| Order | Target | Preserve / change |
|---|---|---|
| 1 | Existing header, safe-area dock | Keep authenticated UI/nav, suppress unrelated free-assessment top ribbon here only |
| 2 | Mode switch, approx. 44–46px | Resize, no huge paired colored tiles; retain role navigation |
| 3 | Compact heading + All services | One-line title and short helper; move publication CTAs to footer |
| 4 | Masters / Services & articles | Existing accessible keyboard tab mechanism, teal selected state |
| 5 | Search → topic chips → existing filters | Move quick topics up, show all real applicable chips without horizontal chip scrolling at phone width |
| 6 | Photographic master card | Real public service image or no cover; actual portrait, location, bio, reviews and profile/service CTAs |
| 7 | Community links and bottom dock | Keep all paths, no unsought popup |

Palette: Design Bible Holistic Light v1.3 (`#FBF5E9` canvas; `#FFFCF7` card; `#143D3A` text; `#067A67` primary); 44px touch targets; active state not color-only. No parallel catalogue/CRM/API.

## QA / release evidence checklist (do not imply unrun checks passed)
- [ ] route-matched guest screenshots `/en|ru|es/masters` at 320/354/390/430 WebKit + Chromium; no overflow, iHelp/dock obstruction, Safari keyboard overlap or unwanted popup.
- [ ] visual overlay/diff of **same target route before/after**, NOT target vs Study reference across different view types.
- [ ] role switch, tabs + keyboard, search, offering/course/format/language/topic filters, reset, advanced disclosure, query `?view=articles`; error and zero-result states.
- [ ] master public profile, service details, consented enquiry path and original protected author actions.
- [ ] focused source tests, ESLint, TypeScript, build, BASE-trusted Core/Specialist and browser checks.
- [ ] GitHub exact-HEAD merge; Vercel READY + canonical `holistichouse.vercel.app` + merged SHA readback; native iPhone guest QA.
- [ ] real CRM or payment delivery (not changed here; do not claim verified).

**Status at staging:** source-level structural checks ONLY; rendered UI, iPhone Safari and production deployment remain UNVERIFIED until measured.
