import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all personal service detail pages share readable session choices without changing enquiry transport", () => {
  const landing = read("components/personal-service-landing.tsx");
  const styles = read("components/personal-service-landing.module.css");
  assert.match(landing, /const facts = \{/);
  for (const part of ["30 min · €50", "60 min · €100", "30 мин · €50", "60 мин · €100"]) assert.ok(landing.includes(part));
  assert.match(landing, /<PersonalConsultationForm locale=\{locale\} service=\{t.orderLabel\}/);
  assert.match(landing, /href="#request-session"/);
  assert.match(landing, /bookingIdentity/);
  assert.match(landing, /closingPrimary/);
  assert.match(styles, /\.heroFacts/);
  assert.match(styles, /@media\(max-width:767px\)/);
  assert.match(styles, /:focus-visible/);
});

test("Alchemy hero visibly distinguishes consultation pricing from unconfirmed requests", () => {
  const landing = read("components/alchemy-soul-landing.tsx");
  const styles = read("components/alchemy-soul-landing.module.css");
  assert.match(landing, /heroPricing/);
  assert.match(landing, /30 min · €50/);
  assert.match(landing, /60 min · €100/);
  assert.match(landing, /heroRequestNote/);
  assert.match(landing, /An enquiry does not charge you or confirm a booking/);
  assert.match(landing, /AlchemySoulLeadForm locale=\{locale\}/);
  assert.match(landing, /data-alchemy-review-stack/);
  assert.match(styles, /\.heroPricing/);
});

test("remote energy booking preserves request confirmation and offers an alternative when full", () => {
  const booking = read("components/remote-energy-support-booking.tsx");
  assert.match(booking, /REMOTE_SUPPORT_DRAFT_KEY/);
  assert.match(booking, /No practitioners are currently taking remote energy support requests/);
  assert.match(booking, /freeReiki/);
  assert.match(booking, /academy\/reiki\/yggdrasil\/free-initiation/);
  assert.match(booking, /Availability and price confirmed before any payment/);
  assert.match(booking, /window.sessionStorage.setItem/);
});

test("practitioner landing retains moderated service selection and correct Spanish request", () => {
  const detail = read("app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx");
  const styles = read("components/marketplace-service-detail.module.css");
  assert.match(detail, /const \{service,practitioner\}=value/);
  assert.match(detail, /const requestHref/);
  assert.match(detail, /es\?"en":locale/);
  assert.doesNotMatch(detail, /\/es\/services\/free-situation-review\?topic=/);
  assert.match(detail, /getPublicServiceDetailHref/);
  assert.match(detail, /ServiceFunnelImpression/);
  assert.match(detail, /TrackedServiceLink/);
  assert.match(detail, /ServiceReviews/);
  assert.match(detail, /price\}/);
  assert.match(detail, /data-marketplace-service-landing/);
  assert.match(styles, /@media\(max-width:760px\)/);
});

test("services overview leads to paid enquiry and retains a separate free written review", () => {
  const hero = read("components/services-conversion-hero.tsx");
  assert.match(read("components/services-studio-offers.tsx"), /free-situation-review/);
  assert.match(hero, /href="#consultation" data-service-hero-cta="paid"/);
  assert.match(hero, /heading: "Personal guidance for relationships, work and life decisions"/);
  assert.match(hero, /paidCta: "Ask about a personal session · from €50"/);
  assert.doesNotMatch(hero, /€100/);
  assert.match(read("app/[locale]/services/free-situation-review/review.module.css"), /linear-gradient/);
});
