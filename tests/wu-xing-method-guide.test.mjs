import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const guide = fs.readFileSync(path.join(root, "app/[locale]/wu-xing/page.tsx"), "utf8");
const service = fs.readFileSync(path.join(root, "app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx"), "utf8");
const library = fs.readFileSync(path.join(root, "components/library-hub.tsx"), "utf8");

test("Wu Xing route is the simple Daoist Alchemy 18-stage manual", () => {
  assert.match(guide, /ДАОССКАЯ АЛХИМИЯ/);
  assert.match(guide, /Уровни здоровья/);
  assert.match(guide, /18 ступеней/);
  assert.match(guide, /Нижний Дянь Тянь/);
  assert.match(guide, /Срединный Дянь Тянь/);
  assert.match(guide, /Верхний Дянь Тянь/);
  assert.match(guide, /1 месяц/);
  assert.match(guide, /2 сессии/);
  assert.match(guide, /Экспресс-диагностика/);

  for (const label of [
    "Шторм (хаос)",
    "Снежная королева",
    "Прометей",
    "Крепость",
    "Король / Королева",
    "Капитан",
    "Ручей",
    "Река",
    "Озеро",
    "Хозяин Гавани",
    "Парусник",
    "Владыка водопада",
    "Дельта реки",
    "Океан / Хранитель морей",
    "Провидец / Исток реки в горах",
    "Пустота / Дао Сюй",
    "У-Вэй / Закон",
    "У-цзи / Беспредельное",
  ]) {
    assert.match(guide, new RegExp(label.replace(/[.*+?^$()|[\]\\]/g, "\\$&")));
  }

  assert.match(guide, /https:\/\/t\.me\/daomagic\/170/);
  assert.match(guide, /https:\/\/t\.me\/daomagic\/131/);
  assert.match(guide, /https:\/\/t\.me\/daomagic\/93/);
  assert.match(guide, /https:\/\/t\.me\/AndyTherapist/);
  assert.match(guide, /не медицинская шкала здоровья и не диагноз/);
  assert.doesNotMatch(guide, /Новая авторская заметка · миазмы/);
  assert.doesNotMatch(guide, /Пять стихий — пять функций личности/);
});

test("the free Wu Xing service and Library point to the simplified manual", () => {
  assert.match(service, /free-wu-xing-diagnostic/);
  assert.match(service, /isWuXingGuide/);
  assert.match(service, /\/wu-xing/);
  assert.match(service, /Методичка: уровни здоровья/);

  assert.match(library, /Даосская Алхимия · Уровни здоровья/);
  assert.match(library, /Методичка · 18 ступеней/);
  assert.match(library, /\/wu-xing/);
});
