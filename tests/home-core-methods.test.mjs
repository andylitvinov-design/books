import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ui = read("components/home-core-methods.tsx");
const css = read("components/home-core-methods.module.css");
const enRu = read("components/holistic-house-home.tsx");
const es = read("app/es/page.tsx");

test("the three owner methods are visible near the top of all home locales", () => {
  assert.match(enRu, /<HomeSectionCarousel locale=\{locale\} \/>[\s\S]*?<HomeCoreMethods locale=\{locale\} \/>[\s\S]*?<HomeFreeDiagnosisBanner/);
  assert.match(es, /<HomeSectionCarousel locale="es" \/>[\s\S]*?<HomeCoreMethods locale="es" \/>[\s\S]*?<HomeFreeDiagnosisBanner/);
  assert.match(ui, /data-home-core-methods/);
  for (const id of ["alchemy", "energy", "coaching"]) {
    assert.match(ui, new RegExp('id: "' + id + '"'));
  }
  assert.match(ui, /methods\.map\(/);
});

test("localized card copy explains methods and avoids overstating active AI or booking", () => {
  for (const label of [
    "Алхимия души", "Гипнотерапия · гомеопатия · расстановки",
    "Энергетическая коррекция", "Сессия · персональный талисман",
    "Получить поддержку", "Обучиться",
    "Коучинг / психотерапия", "ИИ-коучинг · бесплатно", "Подобрать специалиста",
    "Alchemy of the Soul", "Energy correction", "Coaching / psychotherapy",
    "Alquimia del alma", "Corrección energética", "Coaching / psicoterapia",
  ]) assert.ok(ui.includes(label), "Missing localized copy: " + label);
  assert.match(ui, /без ИИ-чата и живого специалиста/);
  assert.match(ui, /not a live AI chat or therapist/);
  assert.match(ui, /талисман не заказывается автоматически/);
  assert.match(ui, /Homeopathy has no reliable evidence/);
  assert.doesNotMatch(ui, /onClick|form action|sendBeacon|gtag\(/);
});

test("actions use real localized routes and remain navigation only", () => {
  for (const route of [
    "/services/alchemy-of-soul",
    "/services/remote-energy-support",
    "/academy/principles-of-energywork",
    "/app/coaching",
    "/services/catalog#service-listings",
  ]) assert.ok(ui.includes(route), "Missing destination: " + route);
  assert.match(ui, /href=\{"\/" \+ locale \+ method\.primaryPath\}/);
  assert.match(ui, /href=\{"\/" \+ locale \+ method\.secondaryPath\}/);
  for (const photo of [
    "hero-olive-incense.webp", "reiki-approved-sunrise-v3.webp", "course-start-heron.webp",
  ]) assert.ok(ui.includes(photo) && existsSync(new URL("../public/images/holistic-house/" + photo, import.meta.url)));
  assert.match(ui, /unoptimized loading="lazy"/);
});

test("method cards are accessible and do not overflow a 320px mobile viewport", () => {
  assert.match(ui, /aria-labelledby="home-core-methods-title"/);
  assert.match(ui, /<h2 id="home-core-methods-title">/);
  assert.match(ui, /<h3>\{item\.title\}<\/h3>/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 370px\)/);
  assert.match(css, /min-width: 0/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /:focus-visible/);
});
