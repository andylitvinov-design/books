# Services · approved scenic mobile stepper · 16 November 2026

## Screens and identity
- Reference: owner-supplied SECOND image, 1024×1536 phone mockup with sunrise, emerald step card and six photo cards.
- Broken current state: FIRST image, 706×1536, four simultaneous white fieldsets and six text-only categories.
- Same page and guest state: RU/EN/ES public Services (/{locale}/services), mobile first screen; no protected editor or dashboard.
- Owning implementation: components/services-assist-quiz.tsx and corresponding CSS module; mounted on the dynamic Services page AND dedicated /es/services route.
- Protected branch: codex/public-book-library; Vercel: codex-public-book-library; canonical: https://holistichouse.vercel.app.
- Reference screenshot includes phone bezel and chrome with no authentic CSS viewport/DPR proof. Do not invent a numerical pixel-match score.

## Visual map
1. Existing hidden mobile Services masthead replaced with compact in-quiz masthead: green flower logo, Holistic House / SERVICES, language selector, account route. The real shared bottom dock is left untouched.
2. Sunrise/mountain image hero behind the serif heading, with a warm ivory fade and one-line lead.
3. Large rounded dark emerald panel with four progress dots and ONE active question. Four ivory icon choices in a 2×2 layout. Answering advances on the same page; completed steps are revisitable by dots.
4. Four primary topic answers match the visual mock. Money/business and wellbeing remain reachable via discreet explicit secondary disclosure, without losing real work matching.
5. Six genuine image-backed service links in a 3×2 grid: psychotherapy, homeopathy, constellations, practices/energy, learning and video/meditation. Existing Holistic House assets only; business-consulting retains its own direct link below.
6. Existing recommendations, service detail/order buttons, free offerings, AI conversation at ?assist=chat, fourteen lower panels, CRM, budget rules and seven-item dock are unchanged.

## Behavior
- Topic → mode → channel → budget, with final enabled recommendations button only after all four answers.
- Reuse existing rankAssistProducts + AssistTopRecommendations and actual published paths; no fabricated offer, no network request for quiz selection, no storage or additional AI processing.
- RU/EN/ES parity, touch/keyboard focus and accessible selected state. No second navigation or global modal.
- Site's current 7-tab dock labels and destinations take precedence over the mockup's alternate navigation icons.

## Verification plan and truthful status
- Browser acceptance must cover 320/354/390/430 widths, RU/EN/ES, 4 steps, money/business result, categories, one dock, screen overflow, existing Ali flow and screenshots at 390.
- Owner reference is a conceptual composite rather than a rendered public route; same-view pixel overlay/heatmap is NOT established. Compare rendered screenshots only after matching crop, locale and device size.
- Full local Next build, real WebKit screenshot and final LIVE deployment SHA were NOT verified at preparation.
- Release by one prepared atomic Git commit / Ready PR / required exact-HEAD CI, protected merge, then the existing hourly Vercel publisher. No independent Vercel deploy.
