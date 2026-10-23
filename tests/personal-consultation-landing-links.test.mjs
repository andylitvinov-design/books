import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { assertFreeEntry } from "./helpers/free-entry-contract.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("app/[locale]/services/free-situation-review/page.tsx");
const styles = read("app/[locale]/services/free-situation-review/review.module.css");
const homepage = read("components/holistic-house-home.tsx");
const services = read("components/services-conversion-hero.tsx");

test("free written review is a separate canonical free landing, not a paid consultation selector", () => {
  assert.match(landing, /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  const component=read("components/free-entry-landing.tsx");
  for(const locale of ["en","ru","es"]) assertFreeEntry(component,locale);
});

test("free landing contract rejects lost consent-capture identity, wrong destination and compulsory questionnaire", () => {
  const component=read("components/free-entry-landing.tsx");
  for(const [before,after] of [
    ['situation: "Free written Situation Review"','situation: "Paid session"'],
    ['id={captureId}','id="wrong-request"'],
    ['href={"#" + captureId}','href="#wrong-request"'],
    ['<details className={styles.fullQuestionnaire}','<details open className={styles.fullQuestionnaire}'],
    ['disclaimer={common.limitations}','disclaimer="Guaranteed cure"'],
  ]) { assert.ok(component.includes(before)); assert.throws(()=>assertFreeEntry(component.replace(before,after),"en")); }
});

test("home and services offer direct and clear free and paid landing actions", () => {
  assert.match(homepage, /services\/free-situation-review/);
  assert.match(read("data/core-service-offers.ts"), /free-situation-review/);
  assert.match(read("components/services-studio-offers.tsx"), /situation.href/);
  assert.match(homepage, /className="service-home-button service-home-button--primary"\s*href=\{`\/\$\{locale\}\/services#consultation`\}/);
  assert.match(homepage, /\{text\.heroBook\}/);
  assert.match(services, /className=\{styles\.paidLink\} href="#consultation" data-service-hero-cta="paid"/);
  assert.match(homepage, /service-home-button--primary/);
  assert.match(services, /paidCta:/);
  assert.match(styles, /\.heroActions\{/);
  assert.match(styles, /\.finalRequest\{/);
  assert.match(styles, /@media\(max-width:767px\)/);
});

function assertBookingAnchor(page, cta, capture) {
  const targets = [...page.matchAll(/<PublicConsultationCta\b[^>]*\/>/g)].map(match => match[0]);
  assert.equal(targets.length, 1, "One consultation target per Services page");
  assert.match(targets[0], /id="consultation"/);
  assert.match(targets[0], /\bserviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\} \/>/);
  assert.match(capture, /<section\s+id=\{id\}/);
}

test("booking links resolve to the service selector anchor in every Services locale", () => {
  const cta = read("components/public-consultation-cta.tsx");
  const capture = read("components/commerce/consultation-cart-entry.tsx");
  assert.match(capture, /restoreServiceCart\(JSON\.stringify/);
  assert.match(capture, /sessionStorage\.setItem\(SERVICE_CART_STORAGE_KEY, JSON\.stringify\(updated\)\)/);
  assert.match(capture, /No payment is taken when you add to cart/);
  assert.doesNotMatch(capture, /fetch\(|sendBeacon|payment-intents|checkout\/sessions/);
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    assertBookingAnchor(page, cta, capture);
    assert.throws(() => assertBookingAnchor(page.replace('id="consultation"', 'id="missing-consultation"'), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace(' serviceBooking ', ' '), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace('wiseEnabled={wisePaymentsEnabled()}', 'wiseEnabled={true}'), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace('paypalPersonalEnabled={personalPayPalEnabled()}', 'paypalPersonalEnabled={true}'), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace(' paypalPersonalEnabled={personalPayPalEnabled()}', ''), cta, capture));
  }
  for(const [before,after] of [['<ConsultationCartEntry locale={locale} id={id}', '<ConsultationCartEntry locale="en" id={id}'], ['<ConsultationCartEntry locale={locale} id={id}', '<ConsultationCartEntry locale={locale} id="wrong"']])
    assert.throws(() => assertBookingAnchor(read("app/es/services/page.tsx"), cta.replace(before,after), capture));
});

test("existing personal form remains a browser-local questionnaire with an explicit WhatsApp handoff", () => {
  const intake = read("components/free-drawing-intake.tsx");
  assert.match(intake, /navigator\.clipboard\.writeText/);
  assert.match(intake, /event\.preventDefault\(\)/);
  assert.match(intake, /t\.drawingText/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest/);
});

function assertPublishedRates(source) {
  const prepared=source.replace("import { deepFreeze } from '../assessments/contracts.js'", "const deepFreeze = value => value").replaceAll('export ', '');
  const catalog=vm.runInNewContext(prepared+'; publicServiceCatalog', {Intl});
  for(const locale of ['en','ru','es']) {
    const products=catalog(locale);
    assert.deepEqual(JSON.parse(JSON.stringify(products.map(({id,amountMinor,currency,durationMinutes,kind})=>({id,amountMinor,currency,durationMinutes,kind})))),[
      {id:'express-consultation-30',amountMinor:5000,currency:'EUR',durationMinutes:30,kind:'one_time'},
      {id:'personal-session-60',amountMinor:10000,currency:'EUR',durationMinutes:60,kind:'one_time'},
    ]);
    assert.ok(products.every(product=>product.title&&product.description));
  }
}
test('separate paid cart retains exact one-time published rates across locales, not free lead prices',()=>{
 const catalog=read('lib/commerce/catalog.js');assertPublishedRates(catalog);
 for(const [before,after] of [['amountMinor: 5000','amountMinor: 100'],["kind: 'one_time'","kind: 'subscription'"],["currency: 'EUR'","currency: 'USD'"]]){
  assert.ok(catalog.includes(before));assert.throws(()=>assertPublishedRates(catalog.replace(before,after)));
 }
});
