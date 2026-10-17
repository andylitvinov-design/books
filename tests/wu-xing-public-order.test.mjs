import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("Wu Xing service has a dedicated EN/RU/ES public landing with an honest scope", () => {
  const route = read("app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx");
  const page = read("components/wu-xing-service-landing.tsx");
  const css = read("components/wu-xing-service-landing.module.css");

  assert.match(route, /<WuXingServiceLanding locale=\{locale as PublicLocale\} value=\{value\}/);
  assert.match(page, /data-wu-xing-service-landing/);
  assert.match(page, /<PublicSiteHeader locale=\{locale\} \/>/);
  assert.match(page, /<PublicServiceOrderPanel locale=\{locale\} service=\{service\} specialized \/>/);
  assert.match(page, /href="#service-order"/);
  assert.match(page, /href="#how-it-works"/);
  assert.match(page, /href=\{"/" \+ locale \+ "\/wu-xing"\}/);
  assert.match(page, /t\.benefits\.map/);
  assert.match(page, /t\.steps\.map/);
  assert.match(page, /t\.faqs\.map/);
  for (const heading of ["Discover where your inner resources can grow", "Узнайте, где скрыты ваши внутренние ресурсы", "Descubre dónde pueden crecer tus recursos interiores"]) {
    assert.ok(page.includes(heading), heading);
  }
  assert.match(page, /not a validated clinical test/);
  assert.match(page, /не валидированный клинический тест/);
  assert.match(page, /no una prueba clínica validada/);
  assert.doesNotMatch(page, /guaranteed cure|treats disease|вылечит болезни|100% результат/i);
  assert.match(css, /@media\(max-width:690px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /:focus-visible/);
});

test("public service ordering stays on the service page and uses the correct practitioner's contacts", () => {
  const handoff = read("components/public-service-order-panel.tsx");
  const generic = read("app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx");
  const listings = read("components/services-smart-discovery.tsx");
  const marketplace = read("components/master-network-explorer.tsx");
  const services = read("app/[locale]/services/page.tsx");

  assert.match(generic, /href="#service-order"/);
  assert.match(generic, /<PublicServiceOrderPanel locale=\{locale as PublicLocale\} service=\{service\}/);
  assert.match(handoff, /id="service-order"/);
  assert.match(handoff, /service\.practitionerSlug === "andy-litvinov"/);
  assert.match(handoff, /whatsappNumber/);
  assert.match(handoff, /telegramHandle/);
  assert.match(handoff, /whatsappEnquiryUrl\(\{ locale, service: service\.copy\.title, request: message, pagePath \}\)/);
  assert.match(handoff, /telegramEnquiryUrlFromWhatsApp\(whatsappUrl\)/);
  assert.match(handoff, /event="service_request_start"/);
  assert.match(handoff, /No payment or account needed/);
  assert.match(handoff, /Sending a message is an enquiry, not an automatic booking/);
  for (const src of [generic,listings,marketplace,services]) {
    assert.doesNotMatch(src, /app\/consultations\?service=/);
  }
  assert.match(listings, /service\.slug\+"#service-order"/);
  assert.match(marketplace, /service\.slug \+ "#service-order"/);
  assert.match(services, /featuredService\.slug}#service-order/);
});

test("service cards consistently show Details before Order", () => {
  const discovery = read("components/services-smart-discovery.tsx");
  const catalogue = read("components/master-network-explorer.tsx");
  const services = read("app/[locale]/services/page.tsx");
  const css = read("components/services-smart-discovery.module.css");

  const suggestion = discovery.slice(discovery.indexOf('<div className={styles.suggestionActions}>'));
  assert.ok(suggestion.indexOf('className={styles.suggestionDetailsToggle}') < suggestion.indexOf('#service-order'));
  const editorial = discovery.slice(discovery.indexOf('<div className={styles.editorialCardActions}>'));
  assert.ok(editorial.indexOf('className={styles.editorialDetailsButton}') < editorial.indexOf('className={styles.editorialOrderButton}'));
  const marketplaceActions = catalogue.slice(catalogue.indexOf('<div className={styles.actions}>'));
  assert.ok(marketplaceActions.indexOf('className={styles.secondary}') < marketplaceActions.indexOf('className={styles.primary}'));
  const featured = services.slice(services.indexOf('<div className="services-marketplace-actions">'));
  assert.ok(featured.indexOf('className="services-marketplace-details"') < featured.indexOf('className="services-marketplace-request'));
  assert.match(css, /minmax\(0,\.88fr\) minmax\(0,1\.12fr\)/);
  assert.match(discovery, /<ShoppingBag size=\{15\} aria-hidden="true"\/>\{t\.order\}/);
});
