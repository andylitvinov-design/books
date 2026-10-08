import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki starts with a concise nine-level overview before the full archive", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");

  assert.match(page, /Кратко о 9 ступенях/);
  assert.match(page, /1, title: "Активация и контакт"/);
  assert.match(page, /2, title: "Жар жизни · накопление и комплексы"/);
  assert.match(page, /3, title: "Океан единства · сонастройка и талисман"/);
  assert.match(page, /4, title: "Архетипические энергии"/);
  assert.match(page, /5, title: "Внутренний Свет"/);
  assert.match(page, /6, title: "Миры Единства"/);
  assert.match(page, /7, title: "Озарение"/);
  assert.match(page, /8, title: "Созидание Мира"/);
  assert.match(page, /9, title: "Полнота Единства"/);

  const summaryPosition = page.indexOf('className="tantra-level-summary"');
  const archivePosition = page.indexOf('className="academy-archive-notice"');
  assert.ok(summaryPosition >= 0 && archivePosition >= 0 && summaryPosition < archivePosition);
});
