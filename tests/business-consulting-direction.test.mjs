import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertSpanishBusinessServiceIndex } from "./helpers/spanish-business-service-index.mjs";

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
  assert.doesNotMatch(landing, /ServiceVideoShowcase/);
});

test("business offer is discoverable without altering the four-card homepage contract", async () => {
  const services = read("data/core-service-offers.ts");
  const grid = read("components/services-solutions.tsx");
  assert.match(services, /route: "business-consulting"/);
  assert.match(services, /Business Strategy & Founder Coaching/);
  assert.match(services, /Бизнес-стратегия и коучинг предпринимателей/);
  assert.match(services, /Estrategia de negocios y coaching para emprendedores/);
  assert.match(services, /business: "\/images\/holistic-house\/andy-about\.png"/);
  assert.match(grid, /isHome \? allOffers\.filter\(\(offer\) => offer\.id !== "business"\) : allOffers/);
  await assertSpanishBusinessServiceIndex(read);
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

// Mutate only synthetic source text consumed by the existing real-composition
// harness; no application file, browser, provider or repository is changed.
test("Spanish business discoverability rejects lost cards, wrong destinations and inaccessible native links", async () => {
  const page = "app/es/services/page.tsx", studio = "components/services-studio-offers.tsx";
  const core = "data/core-service-offers.ts", explorer = "components/services-explorer-state.tsx";
  for (const [path, before, after] of [
    [page, '<ServicesStudioOffers locale="es" />', ''],
    [page, '<ServicesStudioOffers locale="es" />', '<ServicesStudioOffers locale="en" />'],
    [studio, '    session("business"),', ''],
    [studio, '    session("business"),', '    session("business"), session("business"),'],
    [core, 'href: "/" + locale + "/services/" + item.route', 'href: "/en/services/" + item.route'],
    [core, 'href: "/" + locale + "/services/" + item.route', 'href: "/" + locale + "/services/" + (item.id === "business" ? "alchemy-of-soul" : item.route)'],
    [explorer, 'useState<ServiceTopic>("all")', 'useState<ServiceTopic>("personal")'],
    [studio, 'id="solutions" hidden={!paidAvailable}', 'id="solutions" hidden={true}'],
    [studio, '<h3><Link href={offer.href} prefetch={false}>', '<h3 hidden><Link href={offer.href} prefetch={false}>'],
    [studio, '<h3><Link href={offer.href} prefetch={false}>', '<h3><Link href={offer.href} prefetch={false} tabIndex={-1}>'],
    [studio, '<h3><Link href={offer.href} prefetch={false}>', '<h3><Link href={offer.href} prefetch={true}>'],
    [studio, '<summary aria-label={t.details + ": " + offer.title}>', '<summary tabIndex={-1} aria-label={t.details + ": " + offer.title}>'],
    [studio, '<Link href={offer.href} prefetch={false}>{t.landing}', '<Link href="/es/services/alchemy-of-soul" prefetch={false}>{t.landing}'],
  ]) {
    const source = read(path);
    assert.equal(source.split(before).length, 2, "Exactly one source mutation: " + before);
    const mutated = source.replace(before, after);
    await assert.rejects(() => assertSpanishBusinessServiceIndex(input => input === path ? mutated : read(input)),
      { code: "ERR_ASSERTION" });
  }
});

test("Spanish business discovery accepts equivalent page import alias and core route expression", async () => {
  const page = "app/es/services/page.tsx", core = "data/core-service-offers.ts";
  const sources = {
    [page]: read(page).replace('import { ServicesStudioOffers }', 'import { ServicesStudioOffers as Offers }')
      .replace('<ServicesStudioOffers locale="es" />', '<Offers locale={"es"} />'),
    [core]: read(core).replace('href: "/" + locale + "/services/" + item.route', 'href: `/${locale}/services/${item.route}`'),
  };
  assert.notEqual(sources[page], read(page));
  assert.notEqual(sources[core], read(core));
  await assertSpanishBusinessServiceIndex(path => sources[path] ?? read(path));
});
