import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path) => readFile(path, "utf8");
const pdfPath = "public/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf";
const expectedPdfHash = "dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b";

test("Kundalini Reiki has a dedicated trilingual Academy page and source-based metadata", async () => {
  const [route, component] = await Promise.all([
    file("app/[locale]/academy/[[...slug]]/page.tsx"),
    file("components/kundalini-reiki-course.tsx"),
  ]);
  assert.match(route, /key === "reiki\/kundalini-reiki"\) return <KundaliniReikiCourse locale=\{locale\}/);
  assert.match(route, /"reiki\/kundalini-reiki"[\s\S]*?Kundalini Reiki — 3 levels/);
  assert.match(component, /kundaliniInterface\[locale\]/);
  assert.match(component, /kundaliniLessons\.map/);
  assert.match(component, /kundaliniExtensions\.map/);
  assert.match(component, /kundaliniEveryday\.map/);
  assert.match(component, /kundaliniOriginalManual\.path/);
});

test("exact uploaded Paul Crick PDF is preserved byte-for-byte and is not an AI-generated guide", async () => {
  const [bytes, route, data] = await Promise.all([
    readFile(pdfPath),
    file("app/api/academy/reiki-guide/route.js"),
    file("data/academy/kundalini-reiki-course.ts"),
  ]);
  assert.equal(bytes.length, 243352);
  assert.equal(bytes.subarray(0, 8).toString("latin1"), "%PDF-1.3");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedPdfHash);
  assert.match(route, /course === "kundalini"/);
  assert.match(route, /sha256/);
  assert.match(route, /new Uint8Array\(original\)/);
  assert.match(route, /Kundalini_Reiki_Manual_Paul_Crick\.pdf/);
  assert.match(data, /sha256: "dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b"/);
  assert.match(data, /author: "Paul Crick"/);
  assert.match(data, /pages: 24/);
});

test("manual illustrations are exact original-page crops, not unrelated Reiki stock images", async () => {
  const [page, next] = await Promise.all([
    file("components/kundalini-reiki-course.tsx"),
    file("next.config.ts"),
  ]);
  for (const n of [1, 2, 3]) {
    const bytes = await readFile("public/academy/kundalini-reiki/kundalini-manual-level-" + n + ".jpg");
    assert.ok(bytes.length > 10000);
    assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff");
  }
  assert.match(page, /level\.image/);
  assert.match(page, /kundaliniSourcePhoto/);
  assert.match(page, /psimaster\.net\/sites\/default\/files\/kundalini%20reiki_1\.jpg/);
  assert.match(next, /hostname: "psimaster\.net", pathname: "\/sites\/default\/files\/\*\*"/);
  assert.doesNotMatch(page, /academy\/reiki-yggdrasil\/source/);
});

test("all user-specified source sites and uploaded-manual sections are represented without invented marketing text", async () => {
  const [data, page, css] = await Promise.all([
    file("data/academy/kundalini-reiki-course.ts"),
    file("components/kundalini-reiki-course.tsx"),
    file("components/kundalini-reiki-course.module.css"),
  ]);
  for (const origin of ["psimaster.net/service?shs_term_node_tid_depth=12345", "superskills.vip/trial-express-programs/academy-overview/master-of-kundalini-reiki.html", "psitrends.com/studies/adv/reiki"]) {
    assert.ok(data.includes(origin), "missing source " + origin);
  }
  for (const name of ["Diamond Reiki", "Crystalline Reiki", "DNA Reiki", "Location Reiki", "Past life Reiki", "Balance", "Kundalini Reiki Booster Attunements", "Gold Reiki", "Ethereal Crystals"]) {
    assert.ok(data.includes(name), "missing original manual section " + name);
  }
  assert.equal((data.match(/number: [123],/g) || []).length, 3);
  assert.match(data, /Kundalini Reiki is a different form of energy than traditional Usui Reiki/);
  assert.match(data, /Этически неоправданно посылать Рейки тому, кто об этом не просил/);
  assert.match(data, /does not replace healthcare/);
  assert.doesNotMatch(data, /Meet the language of Reiki and Kundalini|The course, at a glance|The World Tree is an invitation/);
  assert.doesNotMatch(page, /href=\{source\.url\}|kundaliniSourceEvidence\.map/);
  assert.match(page, /<details className=\{styles\.accordion\}>/);
  assert.match(page, /<details className=\{styles\.extraAccordion\}>/);
  assert.match(page, /download=\{kundaliniOriginalManual\.fileName\}/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("Kundalini is still a standalone third Reiki program in the Academy, not a Yggdrasil module", async () => {
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

test("WhatsApp messages preserve exact Kundalini service and choice", async () => {
  const page = await file("components/kundalini-reiki-course.tsx");
  assert.match(page, /https:\/\/wa\.me\/14376066502\?text=/);
  assert.match(page, /Course \/ Система:/);
  assert.match(page, /Request \/ Запрос:/);
  assert.match(page, /Kundalini Reiki Level 1 personal initiation/);
  assert.match(page, /encodeURIComponent/);
});
