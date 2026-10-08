import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contentPath = "components/yggdrasil-basic-course-description.tsx";
const routePath = "app/[locale]/academy/[[...slug]]/page.tsx";

test("Basic Course has its own localized reading page with all five levels", async () => {
  const content = await readFile(contentPath, "utf8");
  const route = await readFile(routePath, "utf8");

  assert.match(route, /reiki\/yggdrasil\/basic-course\/description/);
  assert.match(route, /YggdrasilBasicCourseDescription locale=\{locale\}/);
  assert.match(route, /const languageSuffix = slug\?\.length/);
  assert.match(route, /languages: \{ en: .*ru: .*es:/);

  for (const title of [
    "Базовый курс Рейки Иггдрасиль",
    "Reiki Yggdrasil Basic Course",
    "Curso Básico de Reiki Yggdrasil",
  ]) assert.ok(content.includes(title), "Missing localized title: " + title);

  assert.equal((content.match(/settings: \[/g) ?? []).length, 15, "All five levels need their own list in each of three languages");
  assert.match(content, /Связь с миром/);
  assert.match(content, /Connection with the World/);
  assert.match(content, /Conexión con el Mundo/);
  assert.match(content, /Полёт/);
  assert.match(content, /Flight/);
  assert.match(content, /Vuelo/);
});

test("Course landing, program landing and sidebar all link to the new reading page", async () => {
  const [program, module, sidebar, layout, css] = await Promise.all([
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("components/yggdrasil-module-landing.tsx", "utf8"),
    readFile("components/reiki-course-side-nav.tsx", "utf8"),
    readFile("app/layout.tsx", "utf8"),
    readFile("app/yggdrasil-basic-description.css", "utf8"),
  ]);

  for (const item of [program, module, sidebar]) assert.match(item, /basic-course\/description/);
  assert.match(sidebar, /activeSlug/);
  assert.match(layout, /yggdrasil-basic-description\.css/);
  assert.match(css, /@media \(max-width: 780px\)/);
});

test("Public reading description respects historical and health boundaries", async () => {
  const content = await readFile(contentPath, "utf8");
  assert.match(content, /не заменяют медицинскую помощь/);
  assert.match(content, /do not replace professional medical care/);
  assert.match(content, /sustituyen la atención médica profesional/);
  assert.match(content, /полный русский оригинал книги воспроизведён/);
  assert.doesNotMatch(content, /гарантированное исцеление/i);
});

test("Complete Russian manual is preserved on the book page, not replaced by summaries", async () => {
  const [bookText, component] = await Promise.all([
    readFile("data/academy/yggdrasil-basic-manual-original.ru.json", "utf8"),
    readFile(contentPath, "utf8"),
  ]);
  const book = JSON.parse(bookText);
  assert.equal(book.originalPages, 38);
  assert.equal(book.pages.length, 38);
  assert.deepEqual(book.pages.map((entry) => entry.page), Array.from({ length: 38 }, (_, index) => index + 1));
  const original = book.pages.flatMap((entry) => entry.paragraphs).join(" ");
  assert.ok(original.length > 64000, "Whole source text must be retained, not an outline");
  for (const marker of ["Введение", "Интуиция", "Разрушение связи", "Предназначение", "Видение", "Связь с миром", "ОПИСАНИЕ БОГОВ", "Вар", "Эйр"]) {
    assert.ok(original.includes(marker), "Missing chapter / attunement: " + marker);
  }
  assert.match(component, /import fullManual/);
  assert.match(component, /manualForLocale\.pages\.filter/);
  assert.match(component, /locale === "en" \? englishManual : fullManual/);
  assert.match(component, /locale === "en" \? manualChaptersEn : manualChapters/);
  assert.match(component, /yggdrasil-book-toc/);
  assert.match(component, /lang=\{manualLanguage\}/);
  assert.doesNotMatch(component, /полная методичка не размещается/);
});


test("English edition faithfully covers all 38 source pages, in English", async () => {
  const [sourceText, translationText, component] = await Promise.all([
    readFile("data/academy/yggdrasil-basic-manual-original.ru.json", "utf8"),
    readFile("data/academy/yggdrasil-basic-manual.en.json", "utf8"),
    readFile(contentPath, "utf8"),
  ]);
  const source = JSON.parse(sourceText);
  const translated = JSON.parse(translationText);
  assert.equal(translated.language, "en");
  assert.equal(translated.originalPages, 38);
  assert.equal(translated.pages.length, source.pages.length);
  assert.deepEqual(
    translated.pages.map((entry) => entry.page),
    source.pages.map((entry) => entry.page),
  );
  for (let index = 0; index < source.pages.length; index += 1) {
    assert.equal(
      translated.pages[index].paragraphs.length,
      source.pages[index].paragraphs.length,
      "Translation paragraph alignment mismatch on page " + (index + 1),
    );
  }
  const english = translated.pages.flatMap((entry) => entry.paragraphs).join(" ");
  assert.ok(english.length > 65000, "Full English text must not be an abbreviated synopsis");
  assert.doesNotMatch(english, /[А-Яа-яЁё]/u, "English book should contain no untranslated Cyrillic passages");
  for (const marker of [
    "Introduction",
    "Intuition",
    "Breaking a Connection",
    "Life Purpose",
    "Vision",
    "Connection with the World",
    "Principal Deities",
    "Var",
    "Eir",
  ]) assert.ok(english.includes(marker), "Missing translated chapter or attunement: " + marker);
  assert.match(component, /import englishManual/);
  assert.match(component, /manualForLocale = locale === "en" \? englishManual : fullManual/);
  assert.match(component, /manualLanguage = locale === "en" \? "en" : "ru"/);
  assert.match(component, /English translation aligned with all 38 pages/);
  assert.doesNotMatch(component, /Full English translation is not yet available/);
});
