import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

test("Tantra Reiki on-page teaching source is unique in EN and RU and excludes recycled promotions", async () => {
  const [component, archiveText, translationText] = await Promise.all([
    read("components/tantra-reiki-programme-modules.tsx"),
    read("data/academy/tantra-reiki-full.generated.json"),
    read("data/academy/tantra-reiki-ru-en.generated.json"),
  ]);
  const original = JSON.parse(archiveText);
  const translation = JSON.parse(translationText);
  const rangesMatch = component.match(/const detailedRanges[\s\S]*?=\s*\[([\s\S]*?)\];/);
  const excludeMatch = component.match(/const excludedSourceIndices = new Set\(\[([^\]]+)\]\)/);
  assert.ok(rangesMatch && excludeMatch, "source-backed curation is missing");
  const ranges = [...rangesMatch[1].matchAll(/\[(\d+),\s*(\d+)\]/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
  const excluded = new Set(excludeMatch[1].split(",").map((value) => Number(value.trim())));
  const visibleIndices = ranges.flatMap(([from, to]) =>
    Array.from({ length: to - from }, (_, offset) => from + offset).filter((index) => !excluded.has(index))
  );
  assert.equal(ranges.length, 5);
  assert.equal(new Set(visibleIndices).size, visibleIndices.length);
  for (const index of [15, 16, 25, 26, 31, 32, 48, 52, 56, 64, 75, 86, 89, 91, 99, 104, 121, 136, 140, 143, 150, 157, 167, 183, 184, 189]) {
    assert.ok(!visibleIndices.includes(index), "recycled or already-displayed item remains: " + index);
  }
  for (const blocks of [original.blocks.ru, translation.blocks]) {
    const seen = new Set();
    for (const index of visibleIndices) {
      const block = blocks[index];
      assert.ok(block?.text?.trim(), "missing source: " + index);
      const fingerprint = block.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      assert.ok(!seen.has(fingerprint), "duplicate on-page text at source index " + index);
      seen.add(fingerprint);
      assert.doesNotMatch(block.text, /book a session|забронировать сеанс|write to us|напишите нам|about me|обо мне|testimonials|отзывы|registration|регистрац|telegram|whatsapp/i);
    }
  }
  assert.equal(visibleIndices.filter((index) => translation.blocks[index].type === "h2" && /^LEVEL \d$/.test(translation.blocks[index].text)).length, 9);
  assert.equal(original.blocks.ru.length, 190, "complete archival source must remain intact");
  assert.equal(translation.blocks.length, 190, "the full English source remains recoverable");
});

test("Tantra Reiki registration and practitioner biography appear exactly once at the very end", async () => {
  const page = await read("components/academy-record-page.tsx");
  const reading = await read("components/tantra-reiki-programme-modules.tsx");
  const teacher = page.indexOf("<TantraReikiTeacher locale={locale} />");
  const registration = page.indexOf("<TantraReikiLeadForms locale={locale} />");
  const footer = page.indexOf('<footer className="academy-source-footer">');
  const articleEnd = page.indexOf("</article>", footer);
  assert.ok(footer > 0 && footer < teacher && teacher < registration && registration < articleEnd);
  assert.equal((page.match(/<TantraReikiTeacher locale=/g) ?? []).length, 1);
  assert.equal((page.match(/<TantraReikiLeadForms locale=/g) ?? []).length, 1);
  assert.match(reading, /originalRussianEnglishTranslation\.blocks\.map/);
  assert.match(reading, /originalEnglishArchive\.blocks\.en\[29\]\.text/);
  assert.doesNotMatch(reading, /More about the training programme|The first experiences|BOOK A SESSION|BOOK YOUR SESSION/i);
});
