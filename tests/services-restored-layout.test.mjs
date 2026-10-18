import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Services EN/RU: original green photo hero, blue courses and tests, then image-left offers", () => {
  const page = read("app/[locale]/services/page.tsx");
  const banner = read("components/services-tests-intro.tsx");
  const greenHero = read("components/services-conversion-hero.tsx");
  const heroCss = read("components/services-conversion-hero.module.css");
  const sharedHeader = read("components/public-site-header.tsx");
  const bannerCss = read("components/services-tests-intro.module.css");
  const services = read("components/services-solutions.tsx");
  const style = read("components/services-solutions.module.css");
  const heroPos = page.indexOf("<ServicesConversionHero locale={locale as Locale} />");
  const introPos = page.indexOf("<ServicesTestsIntro locale={locale as Locale} />");
  const cardPos = page.indexOf("<ServicesSolutions locale={locale as Locale} />");
  const aboutPos = page.indexOf("<ServicesAboutEntry locale={locale as Locale} />");
  assert.ok(heroPos > 0 && introPos > heroPos && cardPos > introPos && aboutPos > cardPos);
  assert.match(page, /<PublicSiteHeader locale=\{locale\} showAssessmentStrip=\{false\} \/>/);
  assert.match(sharedHeader, /showAssessmentStrip\?: boolean/);
  assert.match(sharedHeader, /<SiteNavigation locale=\{locale\} \/>/);
  assert.doesNotMatch(sharedHeader, /<MindBodyMonitorStrip|showAssessmentStrip &&/);
  assert.match(greenHero, /<StaticPortrait/);
  assert.match(greenHero, /andy-about\.png/);
  assert.match(greenHero, /className=\{styles\.visual\}/);
  assert.match(greenHero, /className=\{styles\.mobileLead\}/);
  assert.match(heroCss, /\.hero \{[\s\S]*?width: calc\(100% \+ 12px\)/);
  assert.match(heroCss, /margin: 8px -6px 14px/);
  assert.match(heroCss, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(heroCss, /\.actions \.cta \{[\s\S]*?grid-column: 1 \/ -1/);
  assert.match(heroCss, /\.visual \{[\s\S]*?min-height: 118px/);
  assert.doesNotMatch(greenHero, /src="\/images\/placeholder/);
  assert.doesNotMatch(page, /ServiceCart|service-cart/);
  assert.doesNotMatch(page, /<FreeInsightsPaths/);
  assert.match(read("components/services-conversion-hero.module.css"), /background:#243b32/);
  assert.match(banner, /data-services-tests-intro/);
  assert.match(banner, /id="free-insights"/);
  assert.match(banner, /<h2 id="services-tests-heading">/);
  assert.match(banner, /data-services-course-action/);
  assert.match(banner, /courses\/antistress/);
  assert.match(bannerCss, /#e7f3fb/);
  assert.match(banner, /href: "\/en\/client\/tests"/);
  assert.match(banner, /href: "\/ru\/client\/tests"/);
  assert.match(banner, /href="#solutions"/);
  assert.match(services, /styles\.home, !isHome \? styles\.servicesPage/);
  assert.ok(services.includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  assert.match(services, /data-core-service-id=\{offer.id\}/);
  assert.match(style, /\.home \.card\s*\{/);
  assert.match(style, /grid-template-columns:minmax\(113px,2fr\) minmax\(0,3fr\)/);
  assert.doesNotMatch(page, /<ServiceCart/);
  assert.match(page, /<PageVideo slot="services-intro" locale=\{locale\} \/>/);
  assert.match(page, /<PublicConsultationCta locale=\{locale as Locale\} id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} \/>/);
});

test("Services Spanish retains its routes with a compact photographic treatment", () => {
  const page = read("app/es/services/page.tsx");
  const css = read("components/services-es-offers.module.css");
  assert.ok(page.indexOf('<ServicesConversionHero locale="es" />') > 0);
  assert.match(page, /<PublicSiteHeader locale="es" showAssessmentStrip=\{false\} \/>/);
  assert.ok(page.indexOf('<ServicesConversionHero locale="es" />') < page.indexOf('<ServicesTestsIntro locale="es" />'));
  const sharedOffers = page.indexOf('<ServicesSolutions locale="es" />');
  const videoBlock = page.indexOf('id="method-videos"');
  const testimonials = page.indexOf('<PersonalTestimonials locale="es" variant="services" />');
  const extraCards = page.indexOf('data-es-services-photo-cards');
  assert.ok(page.indexOf('<ServicesTestsIntro locale="es" />') < sharedOffers);
  assert.ok(sharedOffers < page.indexOf('<ServicesAboutEntry locale="es" />'));
  assert.ok(sharedOffers < videoBlock && videoBlock < testimonials && testimonials < extraCards);
  assert.match(page, /<ServicesSolutions locale="es" \/>/);
  assert.match(page, /className=\{offerStyles.photo\}/);
  assert.match(css, /grid-template-columns:minmax\(106px,2fr\) minmax\(0,3fr\)/);
  for (const route of ["psychohomeopathy", "imagery-therapy", "business-consulting", "systemic-constellations"]) {
    assert.ok(page.includes("/es/services/" + route), route);
  }
  assert.doesNotMatch(page, /ServiceCart|service-cart/);
  assert.match(page, /<PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} \/>/);
  assert.doesNotMatch(page, /services-studio-hero|services-studio-grid/);
});
