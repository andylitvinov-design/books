import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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
