# Google Maps / GBP v3 — implementation handoff (2026-10-18)

Main strategy: https://github.com/andylitvinov-design/sales/issues/2#issuecomment-6255081574
Previous implementation: https://github.com/andylitvinov-design/books/pull/137

## Changed in this feature branch

1. Existing owner-only Marketing Analytics now distinguishes Google Maps, regular Google Organic and Google Ads. Manual lead entry still requires a verified CRM contact, explicit owner confirmation and owner-scoped backend/RLS. Selecting Google Maps defaults the medium to organic search; totals cover only received, qualified and booked enquiries. No click or route request is counted as a client.
2. Added a small Postgres source-constraint migration allowing google_maps, with no new public endpoint, RLS changes, client data export or retroactive reclassification.
3. Added a mobile-first, three-language landing at /en/toronto, /ru/toronto and /es/toronto. It reuses the current real Andrey image and manually initiated WhatsApp/Telegram request, with a free written review and paid-session enquiry, three appropriate service directions, practical FAQ and canonical/hreflang/sitemap. No fake location, fake appointment booking, claimed ranking or fabricated proof.
4. Previous Google-review request/WhatsApp/email templates were replaced with a SAFETY HOLD until the actual professional registration and client review rules are checked. An independent public review is not permission to solicit clinical client testimonials.

## Unverified / not executed by these commits

- No Google Business Profile category, address, website URL, post, photo or review has been changed. Current GBP storefront/address eligibility cannot be verified from code, a map pin, or Search Console. The Toronto page is for a verified web funnel, not proof of a street-level public office. Do not make the main GBP website link point here without testing the existing PsiTrends organic search equity first.
- No paid Google Ads launched and no client outreach or unsolicited messages performed.
- No actual client lead, booked appointment, invoice, confirmed payment or revenue is inferred or created from site clicks. Dashboard paid revenue remains Not measured until a real accounting integration is verified.
- Public Google Analytics instrumentation has an existing consent/safety hold; this feature does not bypass it.
- GSC Wizard access is subscription-blocked as of 2026-10-18 (trial ended). Do not claim verification of live GA4/GSC or buy a subscription automatically.
- All claims about live deployment, SQL migration application and click-through QA require independent evidence once released.

## Production acceptance gates

- Use the actual connected holistichouse Supabase project and inspect existing constraint before additive migration. Confirm the new CHECK constraint includes google_maps after apply and RLS remains enforced.
- Run node --test tests/gbp-v3-toronto.test.mjs tests/crm-marketing.test.mjs tests/local-acquisition.test.mjs. Verify TypeScript and Next.js build with production-safe environment, and run public HTTP/mobile QA for EN/RU/ES routes after Vercel deploy.
- Confirm CTA routes, image, sitemap entry and manual messaging handoff; never send a real client a test message.
- Verify Production points to the merged commit, not a stale Preview deployment.
- Owner GBP baseline must establish real-world business eligibility, current categories/name/site/services/address/hours with dated evidence; only then consider compliant media/Posts and a single-variable category or destination experiment over 28–42 days.
- Read/reconcile the existing Toronto PsiTrends landing routes before changing canonical GBP destination; one landing does not automatically justify losing existing local SEO.

Official sources:
- https://support.google.com/business/answer/13763036
- https://support.google.com/business/answer/9157481
- https://support.google.com/business/answer/3038177
- https://crpo.ca/wp-content/uploads/2026/01/CRPO-Standards-Jan124-Revised-Dec1125.pdf
