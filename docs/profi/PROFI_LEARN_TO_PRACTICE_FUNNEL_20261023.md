# Holistic House · Pro / Профи · guided learning-to-practice funnel
Owner request: 2026-10-23. Implementation PR #1662. Production branch: codex/public-book-library.

## Product outcome, not a misleading promise

Two valid user paths:
1. **Future practitioner**: public Pro > explore five real Reiki course lessons > actual free interactive course > optional further Academy study > reflect on readiness, legal scope, experience and boundaries > public Pro > My Practice authenticated profile > choose personal service/introduction/workshop/course > private draft > explicit review/publication > public profile/service > actual enquiry > client agreement.
2. **Existing practitioner**: public Pro > choose 1:1 service, free introduction, group workshop or educational course > review example client-facing card (illustrative only) > Google-authenticated My Practice > profile onboarding when needed > scoped offering editor > draft > editorial review for **service listings**; **courses** require approved practitioner profile and author's explicit publish confirmation > public discovery > handle consented service requests in My Practice. No lead/payment guarantee.

### Canonical links

- Public Pro: \`/en/pro\`, \`/ru/pro\`, \`/es/pro\`.
- Actual five-lesson Reiki study: \`/{en,ru}/academy/principles-of-energywork/learn\`. ES Pro explicitly enters English learner because ES interactive curriculum is not released.
- Reiki Academy: \`/{en,ru,es}/academy/reiki\`.
- My Practice (EN/RU only): \`/{en,ru}/app/practice\`.
- New service editor: \`/en/app/practice?panel=services&create=1&starter=session\` (alternatives: intro/workshop, RU uses /ru).
- New course editor: \`/en/app/practice?panel=materials&materialTab=courses&create=1\`.
- Profile: \`?panel=profile\`, enquiries: \`?panel=requests\`.
- Approved marketplace: \`/{locale}/services?catalog=1#service-listings\`; master profiles: \`/{locale}/masters\`; individual public service pages are created by existing approved practitioner + service slug system. Do not substitute Andy's personal service URL for other practitioners.

### Implementation boundaries

- Public page has only **ephemeral, non-sensitive** path choice and offer category. Lesson selector is an editorial preview, **not** saved course progress or a score. The example service card is **not** a published listing, booking, lead or purchase.
- Google OAuth route \`auth/start\` accepts optional \`profi\` only with \`continueTo=my-practice\` and value \`session|intro|workshop|course|profile|requests\`; server validates on start **and** callback. No arbitrary return URLs. Native callback allowlist forwards only this low-risk enum; protected APIs still enforce own account authorization. Nothing user-entered goes into query strings or OAuth state.
- New service defaults only set safe structural values: energywork area, offering enum, online format, and **free** for free introduction or **price on request** for session/workshop. User supplies true scope, experience, location, price, contact, rights, and marketing materials. No fabricated licence/credential/benefit, stored draft, customer or claim.
- Private My Practice retains first-time practitioner onboarding. A public click never skips onboarding, server auth, quotas, approval, editor validation or RLS. Source state: \`app.practitioners\`, \`app.service_offerings\`, \`app.practitioner_courses\`, and owner-scoped enquiry repositories; no parallel CRM.
- Existing Hobby basic service allowance: up to 10 saved services, no mandatory subscription. Public services require moderation, and published courses require an approved practitioner profile plus explicit author publication. Respect the distinct statuses.
- Existing public enquiry submission and private recipient enquiry dashboard form the service request flow. Lead receipt is not proven by clicking a link, and a request is not a booking/payment.
- **No marketplace checkout or practitioner payouts are live.** Policy describing 20% platform commission is future-only and applies to confirmed paid onsite orders when supported. Do not debit or credit anything here, or claim a completed transaction, booked session, paid course, or guaranteed income. No paid API, marketing pixels or message dispatch enabled.

## Verification gates

1. Source + unit: \`node --test tests/profi-hub.test.mjs tests/compact-navigation-order.test.mjs tests/navigation-cabinet.test.mjs tests/public-mobile-navigation-verifier.test.mjs tests/practitioner-course-builder.test.mjs tests/direction-offers.test.mjs tests/es-home-verifier-contract.test.mjs\`.
2. Security/integration: \`node --test tests/app-auth-pkce.integration.mjs tests/native-deep-link.test.mjs\` using existing isolated harness; test invalid/duplicated \`profi\` and arbitrary callback paths. Confirm anonymous cannot list private drafts/requests, no cross-account service visibility, RLS and moderated public service queries.
3. \`npx tsc --noEmit\`, targeted ESLint, \`npm run build\`, existing public/mobile navigation regression, relevant course tests. Do not bypass Vercel credits guard or trigger billable previews without permission.
4. Browser E2E EN/RU/ES widths 320, 375, 390, 430 and desktop. Check 7-slot bottom navigation with accessible names and active state, hamburger and locale counterparts, switch paths, all five course previews, four offer categories, back/forward and no horizontal overflow. Respect reduced motion.
5. Auth E2E with a consenting test account: for each starter choose Pro > Google sign-in > corresponding editor category. For a **new** account validate profile onboarding first and later return. Save draft; verify no public listing yet. Test submit/approval using authorized moderator and public page visibility, then create a **consented synthetic** service enquiry and verify actual owner-only inbox receipt, status update and privacy boundaries. Test course draft and explicit publication for approved profile separately. Never use actual client health information.
6. Release: merge PR to *codex/public-book-library*, confirm GitHub CI, Vercel production READY with precise matching SHA, verify alias \`holistichouse.vercel.app\`, HTTP, hydrated iPhone clicks and the provider-backed actual enquiry receipt. Merge/READY/200 alone are not E2E proof.

## Open blockers / owner actions

- GitHub Actions and preview gate must be verified; queued or canceled runs are not green.
- Real Google OAuth, first practitioner moderation, and actual consented synthetic enquiry require test identities and authenticated E2E.
- Hosted payment and payouts remain disabled: out of scope until account legality, agreements, provider onboarding and explicit owner approval.

Track implementation evidence and release status in PR #1662 and Master Network issue #715; do not mark complete before the production flows above are observed.
