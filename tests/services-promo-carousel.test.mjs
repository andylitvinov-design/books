import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES place a single free-promotion carousel before existing category slider", () => {
  const en = read("app/[locale]/services/page.tsx");
  const es = read("app/es/services/page.tsx");
  for (const src of [en, es]) {
    assert.equal((src.match(/<ServicesPromoCarousel/g) || []).length, 1);
    assert.ok(src.indexOf("<ServicesPromoCarousel") > src.indexOf("<PublicSiteHeader"));
    assert.ok(src.indexOf("<ServicesPromoCarousel") < src.indexOf("<ServicesConversionHero"));
    assert.ok(src.indexOf("<ServicesConversionHero") < src.indexOf("<ServicesStudioOffers"));
    assert.match(src, /<ServicesExplorerProvider>/);
    assert.match(src, /<ServicesStudioOffers/);
  }
  assert.match(en, /<ServicesPromoCarousel locale=\{locale as Locale\}/);
  assert.match(es, /<ServicesPromoCarousel locale="es"/);
});

test("Three factual free offers each have their own photo and registered enquiry without fictitious discounts", () => {
  const ui = read("components/services-promo-carousel.tsx");
  const css = read("components/services-promo-carousel.module.css");
  for (const id of ["tests", "situation", "dao"]) {
    assert.match(ui, new RegExp(id + ': "/'));
    assert.match(ui, new RegExp(id + ': \\{\\s*title:'));
  }
  for (const locale of ["en", "ru", "es"]) assert.ok(ui.includes(locale + ': {'), locale);
  assert.match(ui, /heading: "Акция"/);
  assert.match(ui, /heading: "Special offer"/);
  assert.match(ui, /heading: "Promoción"/);
  assert.match(ui, /aria-roledescription="carousel"/);
  assert.match(ui, /data-services-promo-slide=\{active\}/);
  assert.match(ui, /data-services-promo-dot=\{id\}/);
  assert.match(ui, /data-services-promo-prev/);
  assert.match(ui, /data-services-promo-next/);
  assert.match(ui, /<ContactChannelChooser key=\{active\}/);
  assert.match(ui, /presentation="inline" event="service_request_start"/);
  assert.match(ui, /whatsappEnquiryUrl\(\{/);
  assert.match(ui, /service: offer\.service/);
  assert.match(ui, /pagePath: "\/" \+ locale \+ "\/services"/);
  assert.match(ui, /coreServiceOffers\(locale\)/);
  assert.match(ui, /href=\{href\}/);
  assert.doesNotMatch(ui, /fetch\(|sendBeacon\(|localStorage|Math\.random/);
  assert.match(ui, /only the public offer key/);
  assert.match(ui, /sessionStorage\.setItem\(sessionKey, next\)/);
  for (const photo of [
    "images/holistic-house/books-library.webp",
    "images/holistic-house/hero-olive-incense.webp",
    "academy/reiki-yggdrasil/source/eastern-tradition.png",
  ]) assert.ok(existsSync(join(process.cwd(), "public", photo)), "Missing shipped promotion photo: " + photo);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:365px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:44px/);
});

test("Inline promo form reuses consent-gated encrypted CRM intake, with no auto-booking", () => {
  const chooser = read("components/contact-channel-chooser.tsx");
  const css = read("components/contact-channel-chooser.module.css");
  const route = read("app/api/service-enquiries/route.js");
  const repo = read("lib/practitioners/public-service-enquiry.js");
  assert.match(chooser, /presentation\?: "button" \| "inline"/);
  assert.match(chooser, /const isInline = presentation === "inline"/);
  assert.match(chooser, /const \[open, setOpen\] = useState\(isInline\)/);
  assert.match(chooser, /setOpen\(isInline\)/);
  assert.match(chooser, /if \(!open \|\| isInline\) return/);
  assert.match(chooser, /data-presentation=\{presentation\}/);
  assert.match(chooser, /hidden=\{!open\}/);
  assert.match(chooser, /onSubmit=\{submit\}/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries"/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /if \(!response\.ok \|\| data\.saved !== true/);
  assert.match(chooser, /contact.*displayName/);
  assert.match(chooser, /PhoneCountryInput/);
  assert.match(chooser, /<AcquisitionEventLink/);
  assert.match(css, /\.inline \.panel/);
  assert.match(css, /\.inline \.submit/);
  assert.match(css, /\.wrapper\.inline\[data-open="true"\] \{ padding-bottom:0/);
  assert.match(route, /createPublicServiceEnquiry/);
  assert.match(repo, /insert into app\.public_service_enquiries/);
  assert.match(repo, /insert into app\.crm_contacts/);
  assert.match(repo, /if \(contact && !crmEnabled\(\)\)/);
});
