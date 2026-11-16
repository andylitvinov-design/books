# Video Studio · PRO → Standard / Extra / PRO · 2026-11-08

## Page identity and existing assets
- Canonical guest route: `/{ru,en,es}/holistic-support/mandala`, Video Studio → PRO, phone widths 320/354/390/430 px.
- Owner screenshot: current PRO panel with six shortcut cards and two fixed bottom buttons. Actual source is `MandalaProEnhance`, inside the one `MandalaFreeVideoStudio`. Keep the same hero, one media renderer, existing mobile dock and warm ivory/emerald design.
- One original `MandalaMultiTrackTimeline` mounts in either Montage or PRO Standard, not both at the same time. Underlying shot movement, trim, caption and audio controls remain unchanged.

## Owner-approved three options
1. **Standard · free first guest video**: inline original multitrack editor; one bottom real `createQuickVideo` button. Authenticated rerenders keep the existing credit price / balance gate and are labelled with the actual XP cost.
2. **Extra · €3**: upload original photo through existing rights-aware picker; choose a character using the current `MandalaStoriesCharacters` local-capability catalog. Paid render/checkout **not enabled**, so the €3 CTA is visible but disabled. Local choices can still be previewed in existing editor.
3. **PRO · €5**: one 800-character owner-directed creative brief, stored only in the current in-memory `wish` state, plus existing director settings in optional disclosure. The €5 paid CTA is visible but disabled pending approved/verified payment/provider workflow.

## Screen layout
- Retain original header, top six Video Studio steps and wide hero.
- Replace PRO's six secondary category buttons with one compact three-column tier rail, 44 px+ tap targets and accessible tab/tabpanel semantics.
- One descriptive panel per tier, no intermediate page navigation.
- One fixed primary CTA above the mobile bottom navigation, with enough scroll padding for the last input and iOS safe area.
- 320 px labels wrap; no popup, forced player autoplay or secondary rendering path.
- EN primary, RU/ES translated.

## Real flow / truthful availability
- Standard CTA → original `createQuickVideo` → existing client credit/guest/consent gates → original local MP4/WebM generation → Ready.
- Extra photo button → original `onPickPhoto`; characters → existing local story selection. No secret, login bypass, remote face transfer or new backend.
- PRO text → original local Goal wish state; nothing is transmitted or charged by selecting a tier. Paid launch requires separate verified order/payment/worker/E2E work.
- Non-clinical copy; do not claim a payment, delivered file or a verified public outcome from UI alone.

## Verification
- Unit/source contract: `node --test tests/mandala-pro-enhance.test.mjs`.
- Required before merge: scoped lint, `tsc --noEmit`, Next build, existing Mandala browser/WebKit and security/credits checks on exact PR HEAD.
- Required for live: Vercel READY SHA serving canonical alias; guest RU/EN/ES mobile actions at 320/354/390/430, real free playable MP4; physical Safari and paid provider/checkout E2E separately.
- Relative original screenshot geometry (390-ish screen): tier rail immediately under player/balance, ivory content card, one green fixed CTA above bottom nav. Same-route screenshot overlay must be captured in rendered browser; static source checks do not satisfy visual QA.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial (source contracts only, remote Mac unavailable); post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
