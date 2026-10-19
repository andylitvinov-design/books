import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const original = "public/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf";

test("the attached 24-page Paul Crick PDF is preserved byte for byte", async () => {
  const bytes = await readFile(original);
  assert.equal(bytes.length, 243352);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b");
  for (const level of [1, 2, 3]) {
    const picture = await readFile("public/academy/kundalini-reiki/kundalini-manual-level-" + level + ".jpg");
    assert.ok(picture.length > 10000);
    assert.equal(picture.subarray(0, 3).toString("hex"), "ffd8ff");
  }
});

test("the Kundalini PDF endpoint returns this original, never the regenerated teaching guide", async () => {
  const api = await read("app/api/academy/reiki-guide/route.js");
  const component = await read("components/kundalini-reiki-course.tsx");
  assert.match(api, /if \(course === "kundalini"\) \{/);
  assert.match(api, /createHash\("sha256"\)/);
  assert.match(api, /Kundalini_Reiki_Manual_Paul_Crick\.pdf/);
  assert.match(api, /new Uint8Array\(original\)/);
  assert.match(component, /kundaliniOriginalManual\.path/);
  assert.match(component, /download=\{kundaliniOriginalManual\.fileName\}/);
  assert.doesNotMatch(component, /\/api\/academy\/reiki-guide\?course=kundalini/);
});

test("Kundalini Reiki remains a separate Academy course in three languages", async () => {
  const [route, hub, catalog] = await Promise.all([
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
    read("components/academy-hub.tsx"),
    read("data/academy/catalog.ts"),
  ]);
  assert.match(route, /key === "reiki\/kundalini-reiki"\) return <KundaliniReikiCourse locale=\{locale\}/);
  assert.match(hub, /id: "academy-featured-kundalini-reiki"/);
  assert.match(hub, /academy\/reiki\/kundalini-reiki/);
  assert.match(hub, /\/academy\/kundalini-reiki\/kundalini-manual-level-2\.jpg/);
  assert.match(hub, /id === "reiki\/kundalini-reiki" \? 2/);
  assert.match(catalog, /"reiki\/kundalini-reiki": \{ en: "Kundalini Reiki — 3 Levels"/);
});

test("text comes from the specified three websites and the uploaded manual, not AI-written extra syllabus", async () => {
  const [data, component, css, nextConfig] = await Promise.all([
    read("data/academy/kundalini-reiki-course.ts"),
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-course.module.css"),
    read("next.config.ts"),
  ]);
  for (const domain of ["psimaster.net", "superskills.vip", "psitrends.com"]) {
    assert.ok(data.includes(domain), "missing original author site: " + domain);
  }
  assert.match(data, /Editorial contract: visible paragraphs below are direct short excerpts/);
  assert.match(data, /"Kundalini Reiki Manual", Paul Crick/);
  assert.match(data, /kundaliniOriginalManual/);
  assert.match(data, /kundaliniLessons: KundaliniLesson\[\]/);
  assert.deepEqual((data.match(/^\s+number: [123],$/gm) || []).map(s => Number(s.match(/[123]/)[0])), [1,2,3]);
  assert.match(data, /kundaliniExtraAttunements/);
  assert.match(data, /stoneNamesAdvanced/);
  assert.match(data, /Moldavite/);
  assert.match(data, /Double Terminated Clear Quartz/);
  for (const name of ["Diamond Reiki", "Crystalline Reiki", "DNA Reiki", "Location Reiki", "Past life Reiki", "Balance"]) {
    assert.ok(data.includes(name), "the source named this traditional attunement: " + name);
  }
  for (const name of ["Kundalini Reiki Booster Attunements", "Gold Reiki 1", "Ethereal Crystals 1"]) {
    assert.ok(data.includes(name), "missing manual chapter " + name);
  }
  assert.match(data, /PsiMaster: Level 2 · Paul Crick manual: p\. 13/);
  assert.match(component, /kundaliniLessons\.map/);
  assert.match(component, /kundaliniEveryday\.map/);
  assert.match(component, /kundaliniExtensions\.map/);
  assert.match(component, /kundaliniExtraAttunements\.map/);
  assert.match(component, /<details/);
  assert.match(component, /kundalini-manual/);
  assert.doesNotMatch(component, /kundaliniSources\.map|href=\{source\.url\}/);
  assert.doesNotMatch(component, /reiki-yggdrasil\/source/);
  assert.doesNotMatch(nextConfig, /hostname: "psimaster\\.net"/);
  assert.match(component, /heroDiagramSet/);
  assert.match(component, /kundaliniLessons\.map/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("medically unsupported claims are not advertised as confirmed effects", async () => {
  const data = await read("data/academy/kundalini-reiki-course.ts");
  for (const phrase of [
    "Historical spiritual teaching materials; no medical effect is established.",
    "Исторические материалы духовной традиции. Лечебное действие не установлено",
    "No se ha demostrado un efecto médico",
  ]) assert.ok(data.includes(phrase));
  assert.doesNotMatch(data, /300 times stronger|cures disease|heals genetic disorders/i);
});

test("WhatsApp buttons carry the specific Kundalini Reiki course and enquiry type", async () => {
  const component = await read("components/kundalini-reiki-course.tsx");
  assert.match(component, /https:\/\/wa\.me\/14376066502\?text=/);
  assert.match(component, /Kundalini Reiki Level 1 personal initiation/);
  assert.match(component, /Course \/ Система:/);
  assert.match(component, /Request \/ Запрос:/);
  assert.match(component, /encodeURIComponent/);
});

test("Kundalini landing identifies the linked free AI course as covering all three Reiki systems", async () => {
  const component = await read("components/kundalini-reiki-course.tsx");
  assert.match(component, /href=\\{REIKI_FREE_COURSE_PATH\\}/);
  assert.match(component, /AI course · 3 Reiki systems/);
  assert.match(component, /ИИ-курс · 3 системы Рейки/);
  assert.match(component, /Curso de IA · 3 sistemas Reiki/);
  assert.match(component, /kundalini-reiki\\/free-initiation/);
});
