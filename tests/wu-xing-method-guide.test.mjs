import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const guide = fs.readFileSync(path.join(root, "app/[locale]/wu-xing/page.tsx"), "utf8");
const service = fs.readFileSync(path.join(root, "app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx"), "utf8");

test("Wu Xing guide keeps the five elements and eight client phases", () => {
  for (const label of ["Вода", "Дерево", "Огонь", "Земля", "Металл"]) {
    assert.match(guide, new RegExp(label));
  }
  for (const label of ["Заморозка", "Истощение", "Гиперконтроль", "Баланс / опора", "Расцвет / зрелость", "Поток / харизма", "Проводник / предназначение", "Дар / интеграция"]) {
    assert.match(guide, new RegExp(label.replace(/[.*+?^$()|[\]\\]/g, "\\$&")));
  }
  assert.match(guide, /Фазы 1–4 · Восстановление/);
  assert.match(guide, /Фазы 5–8 · Раскрытие/);
  assert.match(guide, /не является медицинской диагностикой/);
});

test("the free Wu Xing service links to the client methodology", () => {
  assert.match(service, /free-wu-xing-diagnostic/);
  assert.match(service, /isWuXingGuide/);
  assert.match(service, /\/wu-xing/);
  assert.match(service, /Методика: как читать профиль/);
});
