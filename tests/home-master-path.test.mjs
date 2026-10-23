import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const widget = read("components/home-master-path.tsx");
const styles = read("components/home-master-path.module.css");
const home = read("components/holistic-house-home.tsx");
const spanish = read("app/es/page.tsx");
const practice = read("components/app/practice-workspace.jsx");
const lessons = read("app/[locale]/academy/[[...slug]]/page.tsx");

test("homepage exposes a real For me / Become a Master switch in EN, RU and ES", () => {
  assert.match(home, /<HomeMasterPath locale=\{locale\} \/>/);
  assert.match(spanish, /<HomeMasterPath locale="es" \/>/);
  for (const source of [home, spanish]) {
    assert.ok(source.indexOf("<HomeSectionCarousel") < source.indexOf("<HomeMasterPath"));
    assert.ok(source.indexOf("<HomeMasterPath") < source.indexOf("<HomeFreeDiagnosisBanner"));
  }
  assert.match(widget, /type Mode = "personal" \| "master"/);
  assert.match(widget, /aria-pressed=\{mode === "personal"\}/);
  assert.match(widget, /aria-pressed=\{mode === "master"\}/);
  assert.match(widget, /data-home-path-panel="master"/);
  assert.match(widget, /data-home-path-panel="personal"/);
  for (const str of ["Become a Master", "Стать мастером", "Ser profesional", "List a service for free", "Опубликовать услугу бесплатно", "Publicar un servicio gratis"]) {
    assert.ok(widget.includes(str), "Missing localized CTA: " + str);
  }
});

test("every journey action is linked to an existing entry route, not an imaginary new cabinet", () => {
  for (const path of [
    '"/client/tests"', '"/services/free-situation-review"',
    '"/academy/principles-of-energywork/learn"', '"/academy"',
    '"/app/practice?panel=materials&materialTab=courses"',
    '"/app/practice?panel=services"',
  ]) {
    assert.ok(widget.includes(path), "Expected journey route: " + path);
  }
  assert.match(lessons, /principles-of-energywork\/learn/);
  assert.match(widget, /locale === "es" \? "en" : locale/);
  assert.match(practice, /if\(params\.get\('panel'\)==='services'\)setActivePanel\('services'\)/);
  assert.match(practice, /if\(params\.get\('panel'\)==='materials'\)setActivePanel\('materials'\)/);
  assert.match(practice, /materialTab/);
});

test("master path describes real publication moderation and mobile accessibility", () => {
  assert.match(widget, /Public listings require review/);
  assert.match(widget, /Публикация — после модерации/);
  assert.match(widget, /no.*prerequisites|not prerequisites/);
  assert.match(widget, /not a professional qualification/);
  assert.match(styles, /@media \(max-width: 540px\)/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /focus-visible/);
});
