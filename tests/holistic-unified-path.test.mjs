import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const root = process.cwd();
const source = readFileSync(join(root, "components/holistic-unified-path.tsx"), "utf8");
const css = readFileSync(join(root, "components/holistic-unified-path.module.css"), "utf8");
const mobile = readFileSync(join(root, "components/holistic-support-mobile.tsx"), "utf8");
test("unified page is integrated without replacing original support actions", () => {
  assert.match(mobile, /<HolisticUnifiedPath locale=\{locale\}/);
  assert.match(mobile, /HolisticSupportMasterGallery/);
  assert.match(source, /data-holistic-personal-path/);
  assert.match(source, /data-holistic-unified-directory/);
});
test("tabs, topic, format, price control real filtered offers", () => {
  assert.match(source, /onClick=\{\(\) => setKind\(value\)\}/);
  assert.match(source, /setTopic\(event.target.value as Topic\)/);
  assert.match(source, /setFormat\(event.target.value as Format\)/);
  assert.match(source, /setPrice\(event.target.value as Price\)/);
  assert.match(source, /const filtered = offers.filter/);
  assert.match(source, /onClick=\{reset\}/);
});
test("verified existing route destinations and source artwork", () => {
  for (const path of ["services/psychohomeopathy", "courses/antistress",
    "services/systemic-constellations", "services/business-consulting", "services/remote-energy-support", "events"]) {
    assert.ok(source.includes('path: "' + path + '"'), path + " linked");
    assert.ok(existsSync(join(root, "app/[locale]", path)), path);
  }
  for (const image of source.matchAll(/image: "(\/images\/holistic-house\/[^"]+)"/g)) {
    assert.ok(existsSync(join(root, "public", image[1])), image[1]);
  }
});
test("three locales, safe descriptions, no fake checkout or private data reads", () => {
  for (const lang of ["en", "ru", "es"]) assert.match(source, new RegExp("  " + lang + ": \\{"));
  assert.match(source, /not a proven medical treatment/);
  assert.match(source, /confirmed before booking/);
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|paymentIntent/);
});
test("responsive landscape-to-mobile layout and accessible controls", () => {
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(source, /aria-pressed=\{kind === value\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});
