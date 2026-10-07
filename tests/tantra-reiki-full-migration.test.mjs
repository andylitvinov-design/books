import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki preserves the full EN and RU live-source captures", async () => {
  const raw = JSON.parse(await readFile("data/academy/tantra-reiki-full.generated.json", "utf8"));
  assert.equal(raw.logicalId, "reiki/tantra-reiki");
  assert.ok(raw.en.markdown.length > 8000, "English source capture was unexpectedly shortened");
  assert.ok(raw.ru.markdown.length > 14000, "Russian source capture was unexpectedly shortened");
  assert.ok(raw.en.images.length >= 20, "English photo archive is incomplete");
  assert.ok(raw.ru.images.length >= 20, "Russian photo archive is incomplete");

  assert.match(raw.en.markdown, /TESTIMONIAL: Margaret/);
  assert.match(raw.en.markdown, /LEVEL 9/);
  assert.match(raw.ru.markdown, /ТАНТРА РЕЙКИ ОШО/);
  assert.match(raw.ru.markdown, /9 ступень Тантра Рейки/);
  assert.match(raw.ru.markdown, /излечиваются различные заболевания/);
});

test("Tantra Reiki bypasses the Academy summary/claim filter and renders its photo archive", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  const page = await readFile("components/academy-record-page.tsx", "utf8");

  assert.match(catalog, /tantraReikiFullBlocks/);
  assert.match(catalog, /record\.logicalId === "reiki\/tantra-reiki"/);
  assert.match(catalog, /return blocks;/);
  assert.match(catalog, /tantraReikiImages/);
  assert.match(page, /Ниже перенесён полный текст исходных материалов PsiTrends без пересказа и сокращения/);
  assert.match(page, /academy-photo-grid/);
});
