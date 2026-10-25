import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {assertCurrentBusinessDiscovery, assertCurrentBusinessLandingMedia, businessDiscoverySource} from "./helpers/current-business-discovery.mjs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("business strategy and founder coaching has a dedicated EN/RU/ES landing", () => {
  const route = read("app/[locale]/services/business-consulting/page.tsx");
  const landing = read("components/business-consulting-landing.tsx");
  const copy = read("data/business-consulting-copy.ts");
  assert.match(route, /BusinessConsultingLanding/);
  assert.match(route, /generateStaticParams/);
  assert.match(route, /"x-default"/);
  assert.match(route, /schema\.org/);
  assert.match(copy, /Business Strategy & Archetypal Coaching/);
  assert.match(copy, /Бизнес-консалтинг и архетипический коучинг/);
  assert.match(copy, /Consultoría de negocios y coaching arquetípico/);
  assert.match(copy, /"kind": "free"/);
  assert.match(copy, /"kind": "express"/);
  assert.match(copy, /"kind": "full"/);
  assert.match(copy, /€50/);
  assert.match(copy, /€100/);
  assert.match(landing, /ContactChannelChooser/);
  assert.match(landing, /whatsappEnquiryUrl/);
  assert.match(landing, /service_request_start/);
  assert.match(landing, /free-situation-review\?topic=business/);
  assert.match(landing, /Andy|Andrey/);
  for (const locale of ["en", "ru", "es"]) assertCurrentBusinessLandingMedia({locale});
});

test("business offer is discoverable while the ServicesSolutions home variant preserves four cards", async () => {
  const services = read("data/core-service-offers.ts");
  const grid = read("components/services-solutions.tsx");
  assert.match(services, /route: "business-consulting"/);
  assert.match(services, /Business Strategy & Founder Coaching/);
  assert.match(services, /Бизнес-стратегия и коучинг предпринимателей/);
  assert.match(services, /Estrategia de negocios y coaching para emprendedores/);
  assert.match(services, /business: "\/images\/holistic-house\/andy-about\.png"/);
  assert.match(grid, /isHome \? allOffers\.filter\(\(offer\) => offer\.id !== "business"\) : allOffers/);
  for (const locale of ["en", "ru", "es"]) {
    await assertCurrentBusinessDiscovery({locale});
    await assertCurrentBusinessDiscovery({locale, mode: "toronto", topic: "business"});
  }
});

test("business messaging separates evidence and symbolic methods", () => {
  const copy = read("data/business-consulting-copy.ts");
  const layout = read("components/business-consulting-landing.tsx");
  assert.match(copy, /subjective reflective tools/);
  assert.match(copy, /не гарантируется/);
  assert.match(copy, /no live call/);
  assert.match(copy, /14-day plan/);
  assert.match(layout, /data-business-format/);
  assert.match(layout, /business-offers/);
});

test("business landing follows the Services photo-card and progressive-details pattern", () => {
  const landing = read("components/business-consulting-landing.tsx");
  const styling = read("components/business-consulting-landing.module.css");
  assert.match(landing, /data-business-quick-start/);
  assert.match(landing, /data-business-service-cards/);
  assert.match(landing, /offerImages\[offer\.kind\]/);
  assert.match(landing, /<details className=\{styles\.offerDetails\}>/);
  assert.match(landing, /className=\{styles\.offerLink\}/);
  assert.match(landing, /href="#business-direct-request"/);
  assert.match(styling, /\.offerCard\.featured/);
  assert.match(styling, /\.offerPhoto/);
  assert.match(styling, /@media\(max-width:767px\)/);
  assert.match(landing, /free-situation-review\?topic=business/);
});

for (const [name, path, before, after, reason] of [
  ['missing composed mount', 'app/es/services/page.tsx', '<ServicesStudioOffers locale="es" />', '<div />', /real page mounts exactly one/],
  ['wrong locale', 'app/es/services/page.tsx', '<ServicesStudioOffers locale="es" />', '<ServicesStudioOffers locale="en" />', /Actual mounted locale/],
  ['missing business card', 'components/services-studio-offers.tsx', '    session("business"),', '', /Business offer must remain rendered exactly once/],
  ['hidden business card', 'components/services-studio-offers.tsx', 'hidden={hidden}>', 'hidden={true}>', /Business offer remains visible/],
  ['wrong business link', 'data/core-service-offers.ts', 'route: "business-consulting"', 'route: "not-the-business-route"', /Business link preserves exact locale destination/],
  ['home-variant card regression', 'components/services-solutions.tsx', 'allOffers.filter((offer) => offer.id !== "business")', 'allOffers', /ServicesSolutions home variant keeps exactly four/],
]) test('public business discovery rejects ' + name, async () => {
  const source = businessDiscoverySource(path);
  assert.ok(source.includes(before), 'Mutation target must exist: ' + name);
  await assert.rejects(assertCurrentBusinessDiscovery({overrides: {[path]: source.replaceAll(before, after)}}), reason);
});

for (const [name, before, after, reason] of [
  ['generic topic', 'topic="constellation-case"', 'topic="overview"', /exact case-study topic/],
  ['wrong locale', 'topic="constellation-case" locale={locale}', 'topic="constellation-case" locale="es"', /exact case-study topic/],
  ['missing video', '<ServiceVideoShowcase topic="constellation-case" locale={locale} id="business-constellation-video" />', '<div />', /One explicit public business case-study/],
]) test('business case-study contract rejects ' + name, () => {
  const source = businessDiscoverySource('components/business-consulting-landing.tsx');
  assert.ok(source.includes(before), 'Mutation target must exist: ' + name);
  assert.throws(() => assertCurrentBusinessLandingMedia({locale: 'en', source: source.replace(before, after)}), reason);
});
