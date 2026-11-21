# Shamanic — Alchemist's Cabinet interactive shelves (20 November 2026)

## Target, identity, approval
The latest owner-approved reference is the immersive 850 × 1850 mobile concept with the entire service assortment presented as physical objects on wooden shelves (no flat grid of cards). This supersedes the previous Magic Mirror laptop-centric visual treatment documented in SHAMANIC_MIRROR_MAIN_20261120.md.
- Live route: public guest `/{en,ru,es}/shamanica`, **personal** audience only.
- Existing live behavior: preserve working three-step `goal/method/start` recommendation flow, free-text privacy, user-initiated local video, locale, profile, iHelp and business switch.
- Component and CSS: `components/shamanica-mobile.tsx` and `components/shamanica-mobile.module.css`. Business route/results and global seven-tab dock are unaffected.

## Layout/visual acceptance
1. Dark, warm workshop depth: stacked wooden shelves, brass accents, amber lighting, books/objects. Existing owned photos are cropped/masked into material silhouettes instead of downloading new unlicensed assets.
2. Branded header, centered Alchemist's Cabinet hero, shamanic subtitle, small user-initiated video displayed as a scrying window rather than a laptop, and For Me/For Business pill.
3. Existing real four-goal picker appears as four tappable visual artefacts on two wood ledges; selected plaque has emerald emphasis; step 2/3 and Back/Next retain the same logic.
4. All **six distinct real service entrances** are represented by physical photo-objects on shelves, not a screenshot: remedies, artefacts, energy, rituals, learning and free Reiki. Three additional themed shelf doors (cleansing, power places, soul support) route to existing rituals/artefacts/energy category pages; no new SKUs, prices, checkout or endpoints.
5. Physical shelf ledges line up across three columns; touchable cream/brass nameplates and normal links retain keyboard focus and semantic labels.
6. Optional text stays in component state and is not submitted externally. Video does not autoplay. Mobile bottom dock remains owned by global shell.

## Viewport and interaction matrix
- Compare 320 / 354 / 390 / 430px mobile plus 768/1440 desktop. No horizontal overflow; labels legible in RU/EN/ES, minimal 44px target plaque on phone.
- Check first visit / returning guest; tapping all nine shelf items navigates to existing real service pages, each real category still exposes three priced offers with Details/Order.
- WebKit/iOS Safari: scroll, native playback, keyboard opening, focus & tap targets, 3-step state and dock unobscured.
- Compare rendered screenshots against latest owner reference. A generated reference is not itself a working webpage. If tool access for same-view WebKit capture or overlay is missing, report this as **visual QA unverified**.
- Protected exact-HEAD CI Core / Specialist / hh-merge-check and ordinary hourly production batch only; no extra deployment writers.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
