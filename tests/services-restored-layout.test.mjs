import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Services EN/RU: compact light-blue tests first, image-left five offers next", () => {
  const page = read("app/[locale]/services/page.tsx");
  const banner = read("components/services-tests-intro.tsx");
  const bannerCss = read("components/services-tests-intro.module.css");
  const services = read("components/services-solutions.tsx");
  const style = read("components/services-solutions.module.css");
  const introPos = page.indexOf("<ServicesTestsIntro locale={locale as Locale} />");
  const cardPos = page.indexOf("<ServicesSolutions locale={locale as Locale} />");
  const cartPos = page.indexOf("<ServiceCart locale={locale as Locale} />");
  assert.ok(introPos > 0 && cardPos > introPos && cartPos > cardPos);
  assert.doesNotMatch(page, /<ServicesConversionHero|<FreeInsightsPaths/);
  assert.match(banner, /data-services-tests-intro/);
  assert.match(bannerCss, /#e7f3fb/);
  assert.match(banner, /href: "\/en\/client\/tests"/);
  assert.match(banner, /href: "\/ru\/client\/tests"/);
  assert.match(banner, /href="#solutions"/);
  assert.match(services, /styles\.home, !isHome \? styles\.servicesPage/);
  assert.ok(services.includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  assert.match(services, /data-core-service-id=\{offer.id\}/);
  assert.match(style, /\.home \.card\s*\{/);
  assert.match(style, /grid-template-columns:minmax\(113px,2fr\) minmax\(0,3fr\)/);
  assert.match(page, /<ServiceCart locale=\{locale as Locale\} \/>/);
  assert.match(page, /<PageVideo slot="services-intro" locale=\{locale\} \/>/);
  assert.match(page, /<PublicConsultationCta locale=\{locale as Locale\} id="consultation" serviceBooking \/>/);
});

test("Services Spanish retains its routes with a compact photographic treatment", () => {
  const page = read("app/es/services/page.tsx");
  const css = read("components/services-es-offers.module.css");
  assert.ok(page.indexOf('<ServicesTestsIntro locale="es" />') < page.indexOf('data-es-services-photo-cards'));
  assert.match(page, /id="solutions"/);
  assert.match(page, /className=\{offerStyles.photo\}/);
  assert.match(css, /grid-template-columns:minmax\(106px,2fr\) minmax\(0,3fr\)/);
  for (const route of ["psychohomeopathy", "imagery-therapy", "business-consulting", "systemic-constellations"]) {
    assert.ok(page.includes("/es/services/" + route), route);
  }
  assert.match(page, /<ServiceCart locale="es" \/>/);
  assert.match(page, /<PublicConsultationCta locale="es" \/>/);
  assert.doesNotMatch(page, /services-studio-hero|services-studio-grid/);
});
