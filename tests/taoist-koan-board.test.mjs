import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { nextKoanIndex, taoistKoanCards } from "../data/dao/taoist-koan-cards.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Dao wisdom board uses source-backed original Russian koans with stage and EN/RU/ES translations", () => {
  assert.equal(taoistKoanCards.length, 12);
  assert.equal(new Set(taoistKoanCards.map(card => card.id)).size, taoistKoanCards.length);
  assert.deepEqual([...new Set(taoistKoanCards.map(card => card.stage))], [3, 4, 5, 6, 7, 8]);
  for (const card of taoistKoanCards) {
    assert.ok(Number.isInteger(card.stage));
    for (const locale of ["en", "ru", "es"]) {
      assert.ok(card.title[locale].trim(), `missing title ${card.id} ${locale}`);
      assert.ok(card.text[locale].trim(), `missing quote ${card.id} ${locale}`);
    }
  }
  assert.equal(taoistKoanCards.find(card => card.id === "walls").text.ru, "В стенах — сила.\nВ пустоте между стенами — жизнь.");
  assert.match(taoistKoanCards.find(card => card.id === "open-heart").text.ru, /Если ты откроешь сердце, мир войдёт/);
  assert.equal(taoistKoanCards.find(card => card.id === "flow").text.ru, "Ручей не ищет силу. Он просто течет вниз.");
});

test("refresh always selects a different card, for low/middle/high random values", () => {
  for (let previous = -1; previous < taoistKoanCards.length; previous++) {
    for (const sample of [0, 0.1, 0.5, 0.75, 0.99999]) {
      const chosen = nextKoanIndex(previous, () => sample);
      assert.ok(chosen >= 0 && chosen < taoistKoanCards.length);
      if (previous >= 0) assert.notEqual(chosen, previous);
    }
  }
});

test("board appears immediately after the theme cards and never sends private data or autoplays", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const board = read("components/taoist-koan-board.tsx");
  const css = read("components/taoist-koan-board.module.css");
  const topic = page.indexOf("<HolisticSupportTopicFilter locale={locale} />");
  const quotes = page.indexOf("<TaoistKoanBoard locale={locale} />");
  const nextSection = page.indexOf('id="holistic-healing-support"');
  assert.ok(topic >= 0 && quotes > topic && nextSection > quotes);
  assert.match(board, /data-taoist-koan-board/);
  assert.match(board, /data-taoist-koan-refresh/);
  assert.match(board, /aria-live="polite"/);
  assert.match(board, /requestAnimationFrame/);
  assert.match(board, /nextKoanIndex\(previous \?\? -1\)/);
  assert.match(board, /Translated from the Russian original/);
  assert.match(board, /Traducción del original ruso/);
  assert.doesNotMatch(board, /fetch\(|localStorage|sessionStorage|autoplay|checkout|payment/);
  assert.match(css, /max-width:720px/);
  assert.match(css, /max-width:360px/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /focus-visible/);
});

test("each Taoist alchemy stage has a distinct, existing local photograph that changes with the koan", () => {
  const board = read("components/taoist-koan-board.tsx");
  const styles = read("components/taoist-koan-board.module.css");
  assert.match(board, /import Image from "next\/image"/);
  assert.match(board, /const photo = active \? stagePhotos\[active.stage\]/);
  assert.match(board, /src=\{photo.src\}/);
  assert.match(board, /alt=""/); // Decorative stage photo: the complete quote remains accessible as text.
  assert.match(board, /data-taoist-koan-photo/);
  assert.match(board, /data-taoist-koan-stage=\{active.stage\}/);
  assert.match(board, /sizes="\(max-width: 720px\)/);
  assert.doesNotMatch(board, /unoptimized|https:\/\/|http:\/\/|fetch\(/);
  const photoPaths = [...board.matchAll(/"\/images\/holistic-house\/[^"]+\.(?:webp|avif)"/g)].map(match => match[0].slice(1, -1));
  assert.equal(photoPaths.length, 6);
  assert.equal(new Set(photoPaths).size, 6);
  for (const path of photoPaths) assert.ok(existsSync(new URL("../public" + path, import.meta.url)), `missing photo: ${path}`);
  for (const stage of [3, 4, 5, 6, 7, 8]) assert.match(board, new RegExp('"' + stage + '": \\{'));
  assert.match(styles, /grid-template-columns:minmax\(220px,31%\) minmax\(0,1fr\)/);
  assert.match(styles, /\.photo\{position:relative/);
  assert.match(styles, /\.photo img\{object-fit:cover\}/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /height:clamp\(156px,46vw,196px\)/);
});
