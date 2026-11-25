# Shamanic · Alchemist's Cabinet — final mobile design (21 Nov 2026)

## Approved reference and route identity
Latest owner-approved 941×1672 smartphone mockup (last revision with **Get Guidance**), replacing the earlier nine-object cabinet and cream Magic Mirror. Target: anonymous personal `/{en,ru,es}/shamanica` first screen; not business, academy editor, results, homepage or logged-in cabinet. The mock phone chrome is not a UI layer.

## Screen hierarchy
1. Existing Holistic House wordmark, language, help, profile and global seven-tab dock remain functional; centered gold sun motif.
2. Compact arched sunset opening, two-line “Shamanic / Alchemist's Cabinet” headline and “Tools for mind, heart, power & life.” subtitle.
3. Real For Me / For Business route toggle.
4. Exactly six real DOM anchors, two columns × three carved wooden shelves. Each is a photo-object above a large parchment nameplate. Object names and hrefs:
   - Remedies for Mind & Heart → `/{locale}/shamanica/results?category=remedies`
   - Get Guidance → `/{locale}/shamanica/results?category=guidance`; existing I Ching/Taoist/Tarot **reading** group, not the old mandala/talisman category
   - Mysteries & Initiations → `/{locale}/academy/mysteries`; published Academy catalogue, with no invented booking or price
   - Rituals & Artifacts → `/{locale}/shamanica/results?category=artifacts`; published talismans/Fu/mandalas
   - Reiki & Energy Support → `/{locale}/shamanica/results?category=energy`
   - Shamanic & Reiki Academy → `/{locale}/shamanica/results?category=learning`; published courses, including free Reiki
5. Previously approved three-step goal/method/start recommendation and user-initiated local video remain in a user-invoked inline details drawer *below* the main six shelves, preserving existing progress/routing/privacy. No auto-open popup.

## Rendering and acceptance
At phone 390px: header ~43px, arch hero ~135px, audience switch ~42px, three shelf rows of 145–151px, readable labels >=13px and descriptions >=~10px; 7–9px gutters; preserve unchanged fixed bottom dock. Check 320, 354, 390, 430 and desktop 768. No horizontal overflow, labels visible in EN/RU/ES, link targets keyboard accessible, optional quiz and opt-in video functional on WebKit/iPhone Safari. All text is real DOM, not flattening mock into a screenshot. Existing first-party static photographs and CSS layers replace any need to publish new unlicensed art.

## No-scope-change
Business page/flow, original five-category algorithm, category Details/Order/price components, CRM, payments, auth, consent, APIs and shared navigation unchanged. New guidance route is a *category-only* shortcut to the existing three-offer `reading` group; it does not mutate the original ranked-two recommendation algorithm. Do not guarantee medical or financial benefits.

## Release
Existing #5288 already passed core but had an isolated Playwright timeout in unrelated ideas-browser sequence; it was not LIVE. This owner-requested design correction plus updated WebKit and unit assertions is staged as one coherent meaningful new commit on the same PR. Await protected exact-HEAD Core/Specialist/`hh-merge-check` and native auto-merge. Only existing hourly Vercel Production publisher may release. No manual deploy, CI bypass or new spend. Actual rendered screenshot/overlay and canonical-alias/live SHA must be verified after checks; do not claim success based on code/text contracts.

GLOBAL_PR_ONE_PUBLISH_V1: one verified repair batch; no empty CI wake or new workflow; cost_new_spend=NO_NEW_SERVICES.
