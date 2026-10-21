import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the paid and free CTAs are rendered before the tall homepage slider on every locale", () => {
  const carousel = read("components/home-section-carousel.tsx");
  const es = read("app/es/page.tsx");
  const en = read("components/holistic-house-home.tsx");
  const ru = read("app/[locale]/page.tsx");
  assert.match(es, /<HomeSectionCarousel locale="es" \/>/);
  assert.match(en, /<HomeSectionCarousel locale=\{locale\} \/>/);
  assert.match(ru, /<HolisticHouseHome/);
  assert.ok(carousel.indexOf("data-home-quick-booking") > 0);
  assert.ok(carousel.indexOf("data-home-quick-booking") < carousel.indexOf("className={styles.slider}"));
  assert.match(carousel, /data-home-quick-cta": "paid"/);
  assert.match(carousel, /data-home-quick-cta": "free-review"/);
  assert.match(carousel, /href=\{\`\/\$\{locale\}\/services#consultation\`\}/);
  assert.match(carousel, /href=\{\`\/\$\{locale\}\/services\/free-situation-review\`\}/);
  assert.match(carousel, /event="service_view"/);
  assert.match(carousel, /event="service_request_start"/);
});

test("consultation pricing and first-screen affordances are consistent across EN RU ES", () => {
  const carousel = read("components/home-section-carousel.tsx");
  const style = read("components/services-conversion-hero.module.css");
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const prices = carousel.match(/quickPrice: "€50 \/ 30 (?:min|мин) · €100 \/ 60 (?:min|мин)"/g) || [];
  assert.equal(prices.length, 3);
  for (const needle of ['Request a consultation', 'Запросить консультацию', 'Solicitar una consulta']) {
    assert.ok(carousel.includes(needle), needle);
  }
  assert.match(home, /heroBook: "Request a consultation · from €50"/);
  assert.match(home, /heroBook: "Запросить консультацию · от €50"/);
  assert.match(es, /Solicitar una consulta · desde €50/);
  assert.match(style, /\.quickBookingActions a \{[^}]*min-height:44px/s);
  assert.match(style, /@media \(max-width:365px\)/);
  assert.match(style, /grid-template-columns:minmax\(0,1\.17fr\) minmax\(0,1fr\)/);
  assert.doesNotMatch(carousel, /\/api\/.*lead|\/api\/.*booking/);
});
