import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("components/free-entry-landing.tsx");
const css = read("components/free-entry-landing.module.css");

test("guest test landing has a direct no-contact next step before optional CRM assistance", () => {
  const process = landing.indexOf('kind === "tests" ? <section');
  const direct = landing.indexOf("data-benchmark-free-test-next-step");
  const capture = landing.lastIndexOf("<CompactLeadCapture");
  assert.ok(process > 0 && direct > process && capture > direct,
    "A visitor who finishes reading should be able to start a test without supplying contact details");
  assert.match(landing, /kind === "tests" \? \([\s\S]*?data-benchmark-free-test-next-step/);
  assert.match(landing, /data-benchmark-free-test-open>\{t\.cta\}/);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\} prefetch=\{false\}/);
  assert.match(landing, /const testsHref = "\/" \+ locale \+ "\/client\/tests";/);
  assert.match(landing, /kind !== "situation" \? <CompactLeadCapture/);
  assert.doesNotMatch(landing, /data-benchmark-free-test-next-step[\s\S]*?(?:fetch\(|localStorage|sendBeacon)/);
});

test("locales clearly distinguish free immediate testing from optional personal contact", () => {
  for (const phrase of [
    "Ready to explore? Start a free test now.",
    "The test explorer is open without a contact request.",
    "Готовы попробовать? Откройте бесплатный тест.",
    "Каталог тестов доступен без заявки.",
    "¿Listo para empezar? Haz una prueba gratuita.",
    "Puedes entrar al catálogo sin dejar tus datos.",
  ]) assert.ok(landing.includes(phrase), "Missing accessibility/value copy: " + phrase);
  assert.match(landing, /aria-labelledby="free-tests-direct-title"/);
  assert.match(landing, /<h2 id="free-tests-direct-title">/);
  assert.doesNotMatch(landing, /guaranteed cure|100% success|clinical diagnosis provided/i);
});

test("direct-entry panel fits a narrow iPhone screen and uses visible focus", () => {
  assert.match(css, /\.testDirect\{/);
  assert.match(css, /\.testDirect \.primary\{flex:none;min-height:48px/);
  assert.match(css, /\.testDirect a:focus-visible\{outline:3px/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.testDirect\{flex-direction:column/);
  assert.match(css, /\.testDirect \.primary\{max-width:none;width:100%;min-height:48px/);
});
