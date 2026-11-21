# Support — Luxury Psychotherapist's Cabinet (owner-approved, 21 November 2026)

## Reference, page identity and visual mapping
- Owner's latest approved conversation image: tall mobile dark-emerald/amber therapy-room composition, with two leather chairs and four real photo-led choices, following the separate "Shamanic Alchemist's Cabinet" visual family.
- **Reference and target are the same public anonymous view**: first step of /en/services (and localized /ru/services, /es/services), no auth, special query, personal dashboard or protected editor. Do not use the image as a flattened screenshot.
- Product title chosen by the owner: **"Coaching, Consulting & Therapy Support"**. Followed by **"Choose the right method & master."** and **"Answer 4 questions:"**. Localized equivalents retain their meaning in RU/ES.
- Existing real page: app/[locale]/services/page.tsx and app/es/services/page.tsx, with the existing ServicesAssistQuiz plus protected lower ServicesCompactCatalog.
- Existing real mobile navigation: UnifiedMobileDock. Its destinations, AI orb, keyboard and account behavior must not change.
- The existing light sunrise version was merged in #5287 and appeared on canonical LIVE before this new owner-directed design revision. This is a fresh, successor visual specification, not an edit to that merged PR.
- Reference mock is illustrative 850×1850; viewport CSS px, DPR and browser chrome crop were not measured. No pixel-perfect claims without a same-view rendered capture.

## Real image asset (never publish the screenshot)
- Original, newly generated two-chair treatment-office interior, without words, controls or personal information, optimized to WebP and committed as a first-party public asset: public/images/holistic-house/support-therapy-cabinet.webp.
- No external photo URL, remote upload, paid API, client data or duplicated UI text baked into the photo.
- CSS paints the image behind the real first-step elements; below it the warm walnut dark background holds the original scrollable catalog.
- Existing four first-party category illustrations remain at /images/video-goal-art/, with genuine selectable <button> elements and gold-ivory caption strips.
- The image is art-direction photography, not a claim about the actual venue or about a practitioner shown.

## Top-to-bottom reference regions
| Region | Intended design | Implementation |
| --- | --- | --- |
| Wordmark | cream leaf, Holistic House / SUPPORT, locale/help/profile | quiz brandBar, header actions |
| Main heading | centered gold lotus and cream large serif | hero heading, lotusMark |
| Subheading | "Choose the right method & master." | heroTagline |
| Prompt | amber/gold pill "Answer 4 questions:" | heroPrompt |
| Room | fireplace and two chairs | heroStage over existing room background |
| Audience | glossy emerald For Me / cream For Business | existing audienceSwitch and state |
| Step | four emerald progress dots and "Question 1 of 4" | progress and original 4-step keys |
| Choice | four large photo tiles with warm parchment labels, chevrons | choice/choiceMedia/choiceContent |
| Composer | OR, editable private local goal, decorative gold star and real mic focus | goalComposer and keyboard dictation |
| Main action | one green button with gold outline, Next | original nextQuestion / protected submit |
| Below fold | six service category photo links, catalog of three products per block | original real service groups; preserve details/order |
| Fixed dock | seven original destinations; dark emerald + selected Support + AI orb | scoped main[data-support-luxe] dock rules |

## Behavior/privacy contract
- Four real questions and answer IDs, rankAssistProducts, personal/business discrimination, mode, budget and actual recommendation links unchanged.
- Default preselection of Stress/Energy matches screenshot's highlighted first card, and remains freely changeable; explicit Next moves to the next question. Later answers reset after topic changes.
- Goal input remains in local React state, without automatic data sending to AI, CRM or analytics; the mic button focuses input for native keyboard voice dictation, not a claim of continuous audio recognition.
- No second popup, new paid provider, hidden quiz response storage, new backend schema or new deployment route.
- Alternative Ali chat at /{locale}/services?assist=chat retains its own original light presentation; the dark-theme flag is absent there.
- The upper photoreal backdrop is decorative. The lower introduction video still exists on the same Services page.

## Acceptance matrix and honesty
- Verify at guest /en/services, /ru/services, /es/services, widths 320/354/390/430 CSS px in Chromium and WebKit. No clipped wordmark, options, Next, input, or global dock. 1 navigable seven-tab dock, no second header.
- Check all four quiz paths, business-specific mode, backtracking, language switch, on-device goal text, six same-page service anchors, original Details/Order/WhatsApp/Telegram, optional Ali and matching budget.
- Existing source contract and the Public Services browser verification assert luxury background, 4 choice photos, true buttons, existing API privacy and dark-route flag. This source assertion alone is not a rendered visual overlay or phone Safari proof.
- Compare real PNG captures with the owner's mock only after aligning CSS viewport, DPR, page crop, selected step and font. Report deviations honestly.
- Protected branch codex/public-book-library; required exact-HEAD Core, applicable Public Services / WebKit specialist, hh-merge-check and native merge protection. Ordinary publication occurs through existing hourly Vercel workflow; do not manually deploy/rebuild, add CI jobs or pay for external providers.
- Final LIVE state requires independently observed READY and matching canonical Vercel alias plus mobile functional tests; merge alone is not LIVE.

## Owner refinement: match actual proportions and individual photos (21 November)
- The two-chair room photograph is now re-encoded as a 390×693 WebP (13,206 bytes) rather than scaling the earlier 200×355 placeholder. It does not contain flattened UI or text.
- Four first-screen photographic strips are cropped from the approved visual as one 500×148 WebP sprite (4,524 bytes): support-luxury-choice-photos.webp. The true clickable cards contain separate accessible icons, labels and selected state.
- The CSS section OWNER_APPROVED_CABINET_PROPORTIONS_20261121 keeps the room scene compact, photo cards about 98 CSS px each at width 390, and the serif heading, gold pill, progress, goal field and green Next in a closely matched vertical hierarchy. Longer RU/ES labels may wrap to preserve legibility.
- Public browser acceptance now checks actual WebP resource responses, computed CSS backgrounds, the 4 photo cards, and bounded scene/card geometry in mobile Chromium.
- A rendered Safari photo overlay and production site equivalence remain separate validation steps; source assertions alone do not prove pixel identity.

## 21 November — owner revised first-step 2×2 topic order
- **Left column, top → bottom:** Ease stress & restore energy; Improve relationships.
- **Right column, top → bottom:** Grow money & self esteem; Personal & business growth.
- Row-major DOM and keyboard order: stress_energy → money_growth → relationships_esteem → business_support.
- Photo atlas positions adjusted to preserve category imagery: stones top-left, sprout top-right, relationship heart bottom-left and personal/business goal scene bottom-right. All former assets, first-screen geometry, theme and services remain unchanged.
- EN/RU/ES topic captions updated. The four original choice IDs and existing second-step business/personal matching logic are intentionally retained; this is a presentation/request-label revision, not a new routing taxonomy.
