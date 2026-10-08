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
  assert.match(content, /полная методичка не размещается/);
  assert.doesNotMatch(content, /гарантированное исцеление/i);
});
