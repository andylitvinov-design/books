import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const actions = read("components/services-card-actions.tsx");
const featured = read("components/services-personal-consultation-mobile.tsx");
const catalog = read("components/services-unified-catalog.tsx");
const studio = read("components/services-studio-offers.tsx");
const css = read("components/services-card-actions.module.css");

test("one shared Details / Order control is used by featured, catalogue and service offers", () => {
  assert.match(actions, /data-service-card-actions/);
  assert.match(featured, /<ServicesCardActions locale=\{locale\} title=\{t\.free\.title\}/);
  assert.match(featured, /<ServicesCardActions locale=\{locale\} title=\{t\.remote\.title\}/);
  assert.match(featured, /<ServicesCardActions locale=\{locale\} title=\{t\.live\.title\}/);
  assert.match(catalog, /<ServicesCardActions locale=\{context\.locale\}/);
  assert.match(studio, /<ServicesCardActions locale=\{locale\} title=\{offer\.title\}/);
  assert.doesNotMatch(featured, /<ContactChannelChooser|>Request<\/|>Book a session<\/|>Start now</);
  assert.doesNotMatch(studio, /<ContactChannelChooser|<details className=\{styles\.details\}/);
});
test("Details reveals only one descriptive paragraph and a real first-party description link", () => {
  assert.match(actions, /hidden=\{expanded !== "details"\}/);
  assert.match(actions, /<p>\{description\}<\/p>/);
  assert.match(actions, /<Link href=\{href\} prefetch=\{false\}/);
  assert.doesNotMatch(actions.split('id={id + "-details"}')[1].split('id={id + "-order"}')[0], /MandatoryMessengerActions|ContactChannelChooser|Request/);
});
test("Order reveals only localized WhatsApp and Telegram with trusted service context", () => {
  assert.match(actions, /hidden=\{expanded !== "order"\}/);
  assert.match(actions, /whatsappEnquiryUrl\(\{/);
  assert.match(actions, /service: title, request: request \|\| t\.enquire, option, pagePath: href/);
  assert.match(actions, /<MandatoryMessengerActions locale=\{locale\} whatsappUrl=\{messageUrl\}/);
  assert.match(actions, /compact collapsed=\{false\} label=\{t\.choose\}/);
  for (const label of ["Details","Order","Детали","Заказать","Detalles","Solicitar",
    "Choose your preferred way to order","Выберите удобный способ заказа","Elige cómo prefieres solicitar el servicio"]) {
    assert.ok(actions.includes(label), "Missing locale copy: " + label);
  }
  assert.match(css, /\.controls\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.panel\[hidden\]\{display:none!important\}/);
});
test("supported first-party detail routes stay connected and no new registration flow appears", () => {
  for (const route of ["services/free-situation-review","services/alchemy-of-soul","services/free-consultation"]) {
    assert.ok(featured.includes(route), route);
  }
  for (const route of ["/services/catalog","/services/psychohomeopathy","/holistic-support/mandala","/academy","/masters"]) {
    assert.ok(catalog.includes(route), route);
  }
  assert.doesNotMatch(actions, /fetch\(|router\.push|window\.location|localStorage|sessionStorage/);
});


test("browser acceptance scopes category details and messenger actions to the owning card", () => {
  const browser = read("scripts/verify-public-services-production.mjs");
  assert.match(browser, /cardActions\.locator\(":scope > \[data-service-card-details\] > p"\)/);
  assert.match(browser, /cardActions\.locator\(':scope > \[data-service-card-order\] \[data-messenger-only-channel="whatsapp"\]'\)/);
  assert.doesNotMatch(browser, /visible\(panel\.locator\("\[data-service-card-details\] p"\)\)/);
});

test("open Details / Order panels use both category columns on mobile", () => {
  const layout = read("components/services-unified-catalog.module.css");
  assert.match(layout, /\.panel:has\(> \[data-service-card-actions\] button\[aria-expanded="true"\]\)\{grid-column:1\/-1\}/);
});
