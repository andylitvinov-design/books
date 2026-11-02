import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const order = ["<PublicSiteHeader", "<ServicesConversionHero", "<ServicesStudioOffers",
  "<ServicesIntroMedia", "<PersonalTestimonials", "<ServicesMethodVideos",
  "<PublicConsultationCta", "<ServicesDirectoryInvitation"];

function assertOrder(page) {
  const rendered = page.slice(page.indexOf("<main "));
  let previous = -1;
  for (const marker of order) {
    assert.equal(rendered.split(marker).length - 1, 1, "Exactly one " + marker);
    const position = rendered.indexOf(marker);
    assert.ok(position > previous, marker + " follows previous section");
    previous = position;
  }
  assert.match(rendered, /id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/);
  assert.doesNotMatch(rendered, /<ServicesSmartDiscovery|<ServicesSolutions|<ServicesQuickStart|<ServicesTestsIntro/);
}

test("EN/RU/ES Services follows the approved simple personal journey", () => {
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    assertOrder(page);
    for (const marker of order) {
      assert.throws(() => assertOrder(page.replace(marker, "")), undefined, "Removing " + marker);
      assert.throws(() => assertOrder(page.replace(marker, marker + marker)), undefined, "Duplicating " + marker);
    }
    for (let i = 1; i < order.length; i++) {
      const left = order[i - 1], right = order[i];
      const mutation = page.replace(left, "ORDER_TMP").replace(right, left).replace("ORDER_TMP", right);
      assert.throws(() => assertOrder(mutation), undefined, "Reversing " + right);
    }
    assert.throws(() => assertOrder(page.replace('id="consultation"', 'id="not-consultation"')));
    assert.match(page, /showAssessmentStrip=\{false\}/);
  }
});

test("Three free offers and five personal services use canonical local photo-left cards", () => {
  const offers = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  assert.match(offers, /const free: Offer\[\] = \[/);
  assert.match(offers, /id: "tests"/);
  assert.match(offers, /id: "situation"/);
  assert.match(offers, /id: "dao"/);
  assert.match(offers, /const paid: Offer\[\] = \[/);
  assert.match(offers, /session\("alchemy"\)/);
  assert.match(offers, /session\("hypnotherapy"\)/);
  assert.match(offers, /session\("business"\)/);
  assert.match(offers, /id: "constellations"/);
  assert.match(offers, /id: "remote-energy-support"/);
  assert.match(offers, /free\.map\(\(offer, index\) => <ServiceCard/);
  assert.match(offers, /paid\.map\(\(offer, index\) => <ServiceCard/);
  assert.match(offers, /ContactChannelChooser/);
  assert.match(offers, /whatsappEnquiryUrl/);
  assert.match(offers, /<details className=\{styles.details\}>/);
  assert.match(offers, /data-services-studio-action/);
  assert.match(offers, /€50 \/ 30 min · €100 \/ 60 min/);
  assert.match(offers, /Homeopathy has no reliable evidence/);
  assert.match(css, /\.freeGrid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.paidGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(max-width:365px\)/);
  assert.match(css, /:focus-visible/);
});

test("Dedicated directory retains all discovery, practitioners and localized routes", () => {
  const directory = read("components/services-directory-page.tsx");
  const invitation = read("components/services-studio-extras.tsx");
  const originalHeader = read("components/public-site-header.tsx");
  assert.match(directory, /<ServicesSmartDiscovery/);
  assert.match(directory, /<MarketplaceServiceFinder/);
  assert.match(directory, /createPractitionerRepository/);
  assert.match(directory, /coreServiceOffers\(locale\)/);
  assert.match(invitation, /href=\{"\/" \+ locale \+ "\/services\/catalog"\}/);
  assert.match(invitation, /<PageVideo slot="services-intro" locale=\{locale\} \/>/);
  assert.match(invitation, /<ServiceVideoShowcase locale="es" topic="overview"/);
  assert.match(invitation, /id="method-videos"/);
  assert.match(invitation, /<details className=\{styles.methods\}/);
  assert.match(originalHeader, /<SiteNavigation locale=\{locale\} \/>/);
  assert.match(read("app/[locale]/services/catalog/page.tsx"), /<ServicesDirectoryPage/);
  assert.match(read("app/es/services/catalog/page.tsx"), /<ServicesDirectoryPage locale="es"/);
});

test("Free-first hero preserves the real portrait and optional paid session route", () => {
  const hero = read("components/services-conversion-hero.tsx");
  const css = read("components/services-conversion-hero.module.css");
  assert.match(hero, /<StaticPortrait/);
  assert.match(hero, /andy-about\.png/);
  assert.match(hero, /className=\{styles.cta\} href="#free-insights" data-service-hero-cta="free"/);
  assert.match(hero, /className=\{styles.paidLink\} href="#consultation" data-service-hero-cta="paid"/);
  assert.match(hero, /freeCta: "Start free · 3 options"/);
  assert.match(css, /\.hero \{/);
  assert.match(css, /@media\(max-width:760px\)/);
});
