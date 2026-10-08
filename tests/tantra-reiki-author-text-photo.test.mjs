import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Each Tantra Reiki stage foregrounds the author's original description rather than an editorial paraphrase", async () => {
  const component = await readFile("components/tantra-reiki-journey.tsx", "utf8");
  const source = JSON.parse(await readFile("data/academy/tantra-reiki-full.generated.json", "utf8"));
  assert.match(component, /authorDescriptions\[locale\]\[i\]\.map/);
  assert.doesNotMatch(component, /className="tantra-journey__description"/);
  const phrases = [
    "В этих энергиях весь мир вокруг вас становится вкусным",
    "Здесь мы пробуждаем Жар Жизни",
    "Вы уже не рыбка в океане",
    "На 4й ступени ты начинаешь чувствовать Вертикаль",
    "На 5й ступени вы раскрываете Источник Силы",
    "На 6 ступени мы попадаем в состояние Вечности",
    "На 7й ступени сознание заливается светом",
    "Ты уже не только гармонизируешь миры",
    "На 9 ступени включается особая полнота",
  ];
  for (const phrase of phrases) {
    assert.ok(source.blocks.ru.some((block) => block.text?.includes(phrase)), "source archive: " + phrase);
    assert.ok(component.includes(phrase), "presented verbatim in stage chapter: " + phrase);
  }
  assert.match(component, /From the author’s original notes/);
  assert.match(component, /Ваше авторское описание ступени/);
});

test("Every Tantra Reiki stage has a distinct photograph and Osho-like source portraits are not used", async () => {
  const component = await readFile("components/tantra-reiki-journey.tsx", "utf8");
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  const levelPhotos = component.slice(component.indexOf("const levelPhotos = ["),component.indexOf("] as const;",component.indexOf("const levelPhotos = [")));
  const numbers = [...levelPhotos.matchAll(/tantraReikiArchive\.images\.ru\[(\d+)\]/g)].map((match) => Number(match[1]));
  assert.equal(numbers.length, 9);
  assert.equal(new Set(numbers).size, 9);
  assert.notEqual(numbers[1], 13, "replace former level 2 image");
  assert.ok(!numbers.includes(16), "remove previous portrait from stage images");
  assert.match(page, /tantraReikiFullArchive\.images\.ru\[12\]/);
});

test("Tantra Reiki original passages remain visible and legible on mobile", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /\.tantra-journey__author-copy/);
  assert.match(css, /\.tantra-journey__author-copy > p:not/);
  assert.match(css, /font-size: 17px/);
});
