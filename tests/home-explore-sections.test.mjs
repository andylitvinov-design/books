import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const component = read("components/home-explore-sections.tsx");
const css = read("components/home-explore-sections.module.css");

test("all three home locales show a unified photo-left section directory instead of tall text-only cards", () => {
  const home = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  assert.match(home, /<HomeExploreSections locale=\{locale\} \/>/);
  assert.match(spanish, /<HomeExploreSections locale="es" \/>/);
  for (const source of [home, spanish]) assert.doesNotMatch(source, /service-home-start-card/);
  assert.match(component, /data-home-start data-home-sections="photo-left"/);
  assert.match(component, /id="start-here"/);
  assert.match(component, /<Image src=\{topic.image\} alt="" fill unoptimized loading="lazy"/);
  assert.match(component, /StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(css, /\.grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:359px\)/);
  assert.match(css, /grid-template-columns:78px minmax\(0,1fr\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("every key section has an actual route and approved local photo", () => {
  for (const [id, path, image] of [
    ["diagnostics", "/services/free-situation-review", "hero-olive-incense.webp"],
    ["tests", "/client/tests", "report-lighthouse-coast.webp"],
    ["services", "/services", "constellations-en-v1.webp"],
    ["academy", "/academy", "reiki-approved-sunrise-v3.webp"],
    ["business", "/explore/business", "andy-about.png"],
    ["ideas", "/books", "books-library.webp"],
  ]) {
    assert.ok(component.includes('id: "' + id + '"'), id + " section missing");
    assert.ok(component.includes('path: "' + path + '"'), id + " route missing");
    assert.ok(component.includes(image), id + " image missing");
    const photo = image === "constellations-en-v1.webp"
      ? join("public/images/holistic-house/video-posters", image)
      : join("public/images/holistic-house", image);
    assert.ok(existsSync(new URL("../" + photo, import.meta.url)), "Local photo missing: " + photo);
  }
  assert.match(component, /event=\{topic\.id === "tests" \? "self_check_start" : "service_request_start"\}/);
  assert.match(component, /href=\{"\/" \+ cabinetLocale \+ "\/app"\}/);
  assert.match(component, /href=\{"\/" \+ locale \+ "\/library"\}/);
  assert.match(component, /const cabinetLocale = locale === "es" \? "en" : locale/);
});

test("each site destination explains the benefit and CTA in EN, RU and ES", () => {
  const segments = ["en:", "ru:", "es:"];
  assert.equal((component.match(/diagnostics: \{ eyebrow:/g) || []).length, 3);
  assert.equal((component.match(/tests: \{ eyebrow:/g) || []).length, 3);
  assert.equal((component.match(/services: \{ eyebrow:/g) || []).length, 3);
  assert.equal((component.match(/academy: \{ eyebrow:/g) || []).length, 3);
  assert.equal((component.match(/business: \{ eyebrow:/g) || []).length, 3);
  assert.equal((component.match(/ideas: \{ eyebrow:/g) || []).length, 3);
  for (const locale of segments) assert.ok(component.includes(locale), "Missing " + locale);
  assert.match(component, /without a live call/);
  assert.match(component, /sin llamada/);
  assert.match(component, /независим|без созвона/);
  assert.match(component, /some tests are|algunas pruebas están en EN\/RU/);
  assert.doesNotMatch(component, /medical diagnosis|guaranteed cure|autoplay/);
});
