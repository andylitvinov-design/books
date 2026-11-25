import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/[locale]/wu-xing/page.tsx", "utf8");
const css = readFileSync("app/[locale]/wu-xing/wu-xing-manual.module.css", "utf8");

test("Wu Xing keeps the whole existing 18-stage localized copy and renders every stage description", () => {
  for (const marker of ["const stagesRu:", "const stagesEn:", "const stagesEs:"]) {
    assert.match(page, new RegExp(marker));
  }
  for (const title of ["Шторм (хаос)", "Storm (chaos)", "Tormenta (caos)", "У-цзи / Беспредельное", "Wuji / The Boundless", "Wuji / Lo ilimitado"]) {
    assert.ok(page.includes(title), title);
  }
  assert.equal((page.match(/stage\.short/g) || []).length, 3, "Stages 1–18 must all render their descriptions");
  assert.match(page, /stages\.slice\(0, 7\)/);
  assert.match(page, /stages\.slice\(7, 14\)/);
  assert.match(page, /stages\.slice\(14\)/);
  assert.match(page, /dao-wuxing-model-steps/, "The unabridged source guide stays linked");
});

test("Wu Xing is readable in one column with direct, accurate next steps", () => {
  assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(3/);
  assert.doesNotMatch(css, /grid-template-columns:\s*1\.25fr/);
  assert.match(css, /width:\s*min\(800px/);
  assert.match(css, /\.phaseGrid, \.scaleGrid, \.laterGroups, \.linkGrid\s*\{\s*display:\s*block/);
  assert.match(page, /id="model-overview"/);
  assert.match(page, /id="all-stages"/);
  assert.match(page, /id="next-step"/);
  assert.doesNotMatch(page, /services#available-services/);
  assert.match(page, /client\/tests/);
  assert.match(page, /https:\/\/t\.me\/AndyTherapist/);
});
