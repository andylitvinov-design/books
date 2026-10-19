import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("one published event has one shareable, localized page and an explicit registration source", () => {
  const route = file("app/[locale]/events/[eventId]/page.tsx");
  const data = file("data/public-events.ts");
  const listing = file("components/events-discovery.tsx");

  assert.match(route, /export function generateStaticParams/);
  assert.match(route, /publishedEvent\(eventId\)/);
  assert.match(route, /event\.status === "published"/);
  assert.match(route, /alternates:/);
  assert.match(route, /canonical: eventPath\(locale, event\)/);
  assert.match(route, /"x-default": eventPath\("en", event\)/);
  assert.match(route, /event\.title\[locale\]/);
  assert.match(route, /event\.description\[locale\]/);
  assert.match(route, /event\.registrationHref/);
  assert.match(route, /ended \?/);
  assert.match(route, /robots: \{ index: false, follow: true \}/);
  assert.match(data, /love-magic-tarot-initiations-2026-10-25/);
  assert.match(data, /2003517510808/);
  assert.match(listing, /encodeURIComponent\(event\.id\)/);
  for (const translation of ["Full event page", "Страница мероприятия", "Página del evento"]) {
    assert.ok(listing.includes(translation), translation);
  }
});

test("Google Event markup is safe, source-backed and only shown on its actual leaf page", () => {
  const route = file("app/[locale]/events/[eventId]/page.tsx");
  const sitemap = file("app/sitemap.ts");
  const data = file("data/public-events.ts");
  assert.match(route, /"@context": "https:\/\/schema\.org"/);
  assert.match(route, /"@type": "Event"/);
  assert.match(route, /structuredLocation/);
  assert.match(route, /"@type": "PostalAddress"/);
  assert.match(route, /event\.format !== "in_person" \|\| !event\.structuredLocation/);
  assert.match(route, /JSON\.stringify\(jsonLd\)\.replace\(\/<\/g,/);
  assert.match(route, /Do not emit Offer until ticket price/);
  assert.match(route, /event\.organizerName \?/);
  assert.match(data, /streetAddress: "665 Dupont Street"/);
  assert.match(data, /postalCode: "M6G 1Z5"/);
  assert.match(sitemap, /PUBLIC_EVENTS\.filter\(event => event\.status === 'published'/);
  assert.match(sitemap, /Date\.parse\(event\.startsAt\) >= Date\.now\(\)/);
  assert.match(sitemap, /encodeURIComponent\(event\.id\)/);
  assert.match(sitemap, /\.\.\.verifiedEventPages/);
  assert.doesNotMatch(route, /"offers"\s*:/);
});

test("the event detail page keeps the existing event directory and public services navigable", () => {
  const route = file("app/[locale]/events/[eventId]/page.tsx");
  assert.match(route, /<PublicSiteHeader locale=\{locale\}/);
  assert.match(route, /href=\{".*locale \+ "\/events"\}/);
  assert.match(route, /href=\{".*locale \+ "\/services"\}/);
  assert.match(route, /rel="noopener noreferrer"/);
  assert.match(route, /className=\{styles\.primary\}/);
});
