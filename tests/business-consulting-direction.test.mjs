import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { servicesStudioContract } from "./helpers/services-studio-contract.mjs";

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
  for (const locale of ["en", "ru", "es"]) {
    const view = await servicesStudioContract(locale);
    assert.deepEqual(view.homeIds, ["situation", "dao", "alchemy", "hypnotherapy"], locale + ": Home keeps exactly four non-Business offers");
    const cards = view.cards.filter(card => card.props["data-services-studio-card"] === "business");
    assert.equal(cards.length, 1, locale + ": Business appears exactly once");
    assert.equal(cards[0].props.hidden, false, locale + ": Business is visible by default");
    assert.equal(view.isVisible(cards[0]), true, locale + ": no hidden ancestor conceals Business");
    const descendants = view.descendants(cards[0]);
    const links = descendants.filter(node => node.type === "a");
    assert.ok(links.length >= 3, locale + ": photo, title and details retain their destinations");
    for (const link of links) assert.equal(link.props.href, "/" + locale + "/services/business-consulting");
    const photos = descendants.filter(node => node.type === view.portrait || node.type === view.image);
    assert.equal(photos.length, 1);
    assert.equal(photos[0].type, view.portrait, locale + ": Business keeps the static portrait");
    assert.equal(photos[0].props.src, "/images/holistic-house/andy-about.png");
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
