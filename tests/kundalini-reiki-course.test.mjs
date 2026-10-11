import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path) => readFile(path, "utf8");

test("Kundalini Reiki has its own trilingual Academy route and metadata", async () => {
  const [route, component] = await Promise.all([
    file("app/[locale]/academy/[[...slug]]/page.tsx"),
    file("components/kundalini-reiki-course.tsx"),
  ]);
  assert.match(route, /key === "reiki\/kundalini-reiki"\) return <KundaliniReikiCourse locale=\{locale\}/);
  assert.match(route, /"reiki\/kundalini-reiki"[\s\S]*?Kundalini Reiki — 3 levels/);
  assert.match(component, /kundaliniInterface\[locale\]/);
  assert.match(component, /kundaliniLessons\.map/);
  assert.match(component, /<details className=\{styles\.levelDetail\}>/);
  assert.match(component, /kundaliniEveryday\.map/);
  assert.doesNotMatch(component, /kundaliniSources|source\.url|Original teaching sources|https:\/\/(?:psimaster|superskills|psitrends)/);
  assert.match(component, /heroPhoto[\s\S]*?<Image/);
});

test("Kundalini Reiki is a featured standalone program with no confused Yggdrasil routing", async () => {
  const [hub, catalog, psimaster] = await Promise.all([
    file("components/academy-hub.tsx"),
    file("data/academy/catalog.ts"),
    file("data/academy/psimaster-sources.generated.json"),
  ]);
  assert.match(hub, /id: "academy-featured-kundalini-reiki"/);
  assert.match(hub, /academy\/reiki\/kundalini-reiki/);
  assert.match(hub, /id === "reiki\/kundalini-reiki" \? 2/);
  assert.match(catalog, /"reiki\/kundalini-reiki": \{ en: "Kundalini Reiki — 3 Levels"/);
  assert.ok(JSON.parse(psimaster).some((record) => record.routeKey === "reiki/kundalini-reiki"));
});

test("course reconciles three named first-party sites, all three levels and ethical limits", async () => {
  const [data, component, css] = await Promise.all([
    file("data/academy/kundalini-reiki-course.ts"),
    file("components/kundalini-reiki-course.tsx"),
    file("components/kundalini-reiki-course.module.css"),
  ]);
  assert.match(data, /psimaster\.net\/service\?shs_term_node_tid_depth=12345/);
  assert.match(data, /superskills\.vip\/trial-express-programs\/academy-overview\/master-of-kundalini-reiki\.html/);
  assert.match(data, /psitrends\.com\/studies\/adv\/reiki/);
  assert.match(data, /number: 1,[\s\S]*number: 2,[\s\S]*number: 3,/);
  for (const text of ["Diamond Reiki", "Crystal Reiki", "DNA Reiki", "Birth Trauma Reiki", "Location Reiki", "Past Life Reiki", "Balance"]) {
    assert.ok(data.includes(text), "missing historic term " + text);
  }
  assert.match(data, /not established/);
  assert.match(data, /not a diagnosis/);
  assert.match(component, /https:\/\/wa\.me\/14376066502\?text=/);
  assert.match(component, /Course \/ Система:/);
  assert.match(component, /Request \/ Запрос:/);
  assert.match(component, /encodeURIComponent/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("Kundalini public page is self-contained, photo-led, and downloads its guide", async () => {
  const [page, style, data, route] = await Promise.all([
    file("components/kundalini-reiki-course.tsx"),
    file("components/kundalini-reiki-course.module.css"),
    file("data/academy/kundalini-reiki-course.ts"),
    file("app/api/academy/reiki-guide/route.js"),
  ]);
  assert.doesNotMatch(page, /href=\{source\.url\}|kundaliniSources\.map|psimaster\.net|superskills\.vip|psitrends\.com/);
  assert.match(page, /\/api\/academy\/reiki-guide\?course=kundalini&locale=/);
  assert.match(page, /<Image/);
  assert.match(page, /\/academy\/reiki-yggdrasil\/source\/school-introduction\.jpg/);
  assert.match(page, /levelPhotos\[index\]/);
  assert.match(page, /kundaliniEveryday\.map/);
  assert.match(style, /@media \(max-width: 760px\)/);
  assert.match(route, /kundalini: "kundalini"/);
  for (const lng of ["en", "ru", "es"]) {
    const guide = await file("public/academy/course-guides/kundalini." + lng + ".txt");
    assert.ok(guide.length > 3000, "full guide is missing in " + lng);
    assert.match(guide, /holistichouse\.vercel\.app/);
    assert.doesNotMatch(guide, /https:\/\/(?:psimaster|superskills|psitrends)/);
  }
  for (const name of ["pdfButton", "guideTitle", "heroImageAlt", "contactKicker"]) {
    assert.ok(data.includes(name + ":"), "missing label " + name);
  }
});
