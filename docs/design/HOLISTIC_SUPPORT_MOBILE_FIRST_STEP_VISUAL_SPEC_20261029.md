# Holistic Support Mobile — approved first-step band (29 Oct 2026)

Status: implementation reference; owner-approved generated mock is **conceptual**, not proof of a rendered page.

## Screen identity and acceptance gate

- **Reference:** most recent owner's approved mobile mock, based on the existing mint/cream/emerald three-column iPhone screenshot from 29 Oct; mock shows the current check-ins, central profile, right tool grid, a new numbered goal row, existing meditation hero/gallery and five-item bottom dock. Do **not** commit the generated portrait or screenshot as a live asset.
- **Exact canonical route:** `/{ru,en,es}/holistic-support/mobile` (guest / public, default meditation view, no query), NOT the distinct public homepage `/`, not `/holistic-support/mandala` and not a client/practitioner dashboard.
- **Page identity:** PASS in source mapping; full rendered same-route browser comparison still REQUIRED.
- **Owners:** `components/holistic-support-mobile.tsx`, `components/holistic-support-mobile.module.css`, existing `lib/holistic-support/goal-filter.js`; source landing `app/[locale]/holistic-support/mobile/page.tsx` stays unchanged.
- **Baseline source:** Vercel production `codex/public-book-library` SHA `121ccdc60c46cb2905f505411e5ca999858dc43d` READY `dpl_8J9FckpVwtYs9xWQGjQSWEL9P434` at initial audit. Recheck SHA and alias at release.

## Visual block map and behavior

| Order | Mock region | Actual owner / action | Decision |
| --- | --- | --- | --- |
| 1 | Compact brand/language | `compactAppHeader` | KEEP |
| 2 | Left four color-coded 1–10 sliders | `.topGrid .assessment` + `onCheckinChange` | KEEP visible (motivating voluntary check-in); untouched default 5 is **not** a measurement |
| 3 | Center round photo, Tests, focus, Match | `.topGrid .profile`, local file object URL, `changeChoice('tests')`, `onRecommendations` | KEEP; do not label arbitrary Energy as a user's goal |
| 4 | Right meditation/session/talisman/Reiki/course/master/video mandala | `.topGrid .tools` existing handlers | KEEP all working actions |
| 5 | **New step 3**, soft mint/cream row: Stress relief / Energy / Relationships / Decisions / Work+money + Skip | `data-support-quick-goals` with five accessible buttons + local state | ADD between topGrid and the existing experience, no fifth profile domain or fifth slider; keep swipe on 320–430 if 5 tiles won't fit legibly |
| 6 | Original audio and source-backed scenic hero, four video cards | `.experience`, current media player / filtered gallery | KEEP source posters, original RU/EN audio labels, no autoplay. Quick-choice maps to the already-reviewed goal selection and source-tag ranker; a non-exact video stays clearly labelled related |
| 7 | Bottom five-item navigation & extra panels | `.bottomNav`, `settings`, existing client messages/progress | KEEP, no second nav |

Colors: existing cream `#faf7ef`, ink `#24362e`, emerald `#078960`, soft mint `#eff8f1`; rounded 16–24px; modest shadows; readable 12–16px helper text. Reference mock's decorative source image is not a transferable project asset. Existing site poster/photo stays until approved asset with rights is supplied. iOS status bar excluded from visual comparison.

## Behavior and data contract

- Quick goals are public **intent**, not scores. IDs map to **existing** four sectors: `stress` → `energy` concern `stress` task `stayCalm`; `energy` → `energy` `lowEnergy/moreEnergy`; `relationships` → `love` `conflicts/communication`; `decision` → `meaning` `uncertainty/direction`; `work` → `money` `workStuck/clearPlan`.
- Single tap chooses a topic for an immediate, source-checked preview; **no forced scroll, no automatic playback, no external AI**, no false score inference, no CRM lead. Existing `Find my first step` CTA invokes the existing interactive local guide using the chosen topic; Skip clears only this quick choice.
- The detailed goal filter remains functional and supersedes the quick choice after explicit acceptance; score changes invalidate old recommendation but preserve the explicit quick choice.
- A generic published video before a chosen topic is an example, not a personalized prescription; unsuitable videos are marked related rather than exact. Photo is on-device only.
- EN/RU/ES copy; no test scores, raw questions, photos or medical information sent to analytics, messengers or URL. Booking and payment remain unconfirmed until provider evidence.

## QA and release checklist (not pre-checked)

- [ ] Source tests: five mapped quick choices, five localized labels, untouched slider treatment, four source scales, client/server privacy and original controls.
- [ ] Node unit tests and `tsc --noEmit`, lint, Next production build.
- [ ] Existing Support browser CI: Chromium/WebKit × 320/354/390/430 × EN/RU/ES; exact same-route source and candidate captures; horizontal overflow, focus, tap sizes, skip, selection → hero/gallery/guide, photo upload mock and no autoplay.
- [ ] Rendered screenshot overlay/diff against matching viewport mock crop. Generated image cannot qualify for a strict pixel threshold; log structural differences openly.
- [ ] CI complete on exact PR HEAD, safe merge into `codex/public-book-library`, then Vercel production READY SHA + canonical alias + route clicks; physical iPhone Safari verified separately.
- [ ] No releases, payments, videos or owner messages from this spec alone.

Evidence at authoring: page mapping/source only. Visual/browser, owner-auth/provider E2E and production verification pending.
