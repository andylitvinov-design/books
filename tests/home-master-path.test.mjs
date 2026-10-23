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

test("homepage keeps accessible personal / master switch and five matching path stages", () => {
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
  assert.equal((widget.match(/title: "Discover yourself"|title: "Take a free course"|title: "Receive a free service"|title: "Professional training"|title: "Become a Master"/g) || []).length, 5);
  for (const str of ["Become a Master", "Стать мастером", "Ser profesional",
    "List a service for free", "Опубликовать услугу бесплатно", "Publicar un servicio gratis"]) {
    assert.ok(widget.includes(str), "Missing localized action: " + str);
  }
});

test("roadmap links to the five public steps while private editors remain separate", () => {
  for (const path of [
    '"/client/tests"', '"/academy/principles-of-energywork/learn"',
    '"/services/free-situation-review"', '"/academy/reiki"', '"/pro"',
    '"/app/practice?panel=materials&materialTab=courses&create=1"',
    '"/app/practice?panel=services&create=1"',
  ]) assert.ok(widget.includes(path), "Expected route: " + path);
  assert.match(lessons, /principles-of-energywork\/learn/);
  assert.match(widget, /locale === "es" \? "en" : locale/);
  assert.match(widget, /const personalTargets = \[/);
  assert.match(widget, /href=\{targets\[index\]\}/);
  assert.match(widget, /href=\{serviceEditor\}/);
  assert.match(widget, /href=\{courseEditor\}/);
  assert.match(practice, /if\(params\.get\('panel'\)==='services'\)setActivePanel\('services'\)/);
  assert.match(practice, /if\(params\.get\('panel'\)==='materials'\)setActivePanel\('materials'\)/);
  assert.match(practice, /materialTab/);
});

test("master path requires review and is mobile-accessible", () => {
  assert.match(widget, /Public listings require review/);
  assert.match(widget, /Публикация — после модерации/);
  assert.match(widget, /not prerequisites/);
  assert.match(widget, /not a professional qualification/);
  assert.match(styles, /@media \(max-width: 540px\)/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /focus-visible/);
});
