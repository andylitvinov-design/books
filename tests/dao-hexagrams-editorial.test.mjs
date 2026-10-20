import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hexagrams, getHexagram, daoAuthorHexagramNumbers,
} from "../data/dao-hexagrams.mjs";
import {
  daoEditorialHexagramNumbers, daoEditorialHexagramCount, getDaoEditorialHexagramText,
} from "../data/dao-hexagrams-editorial.mjs";

const originals = JSON.parse(readFileSync(new URL("../data/dao-hexagram-author.json", import.meta.url), "utf8"));
const archive = new Set(originals.map((item) => item.number));

test("12 sourced author originals remain distinct from 52 new editorial texts", () => {
  assert.deepEqual([...archive].sort((a, b) => a - b), [...daoAuthorHexagramNumbers].sort((a, b) => a - b));
  assert.equal(originals.length, 12);
  assert.equal(daoEditorialHexagramCount, 52);
  assert.equal(daoEditorialHexagramNumbers.length, 52);
  assert.equal(new Set(daoEditorialHexagramNumbers).size, 52);
  assert.deepEqual([...archive, ...daoEditorialHexagramNumbers].sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i + 1));
  originals.forEach(({ number }) => assert.equal(getDaoEditorialHexagramText(number), null, "original overwritten: " + number));
});

test("all 52 new readings carry the complete author's 10-part archetypal framework", () => {
  const required = [
    "Гексаграмма ", "Императорская формула:", "Смысл и образ стихий:",
    "Ключевой смысл:", "Тактика и путь:", "Опасности:",
    "Императорская подсказка:", "Стратегия в духе Сунь-цзы",
    "Психотерапевтический смысл:", "Аффирмации:", "Образ:",
  ];
  const texts = new Set();
  for (const number of daoEditorialHexagramNumbers) {
    const content = getDaoEditorialHexagramText(number);
    const item = getHexagram(number);
    assert.ok(item, "invalid hexagram " + number);
    assert.equal(typeof content, "string", "missing editorial text " + number);
    assert.ok(content.startsWith("Гексаграмма " + number + ". " + item.hanzi), "misnumbered author-style text " + number);
    assert.ok(content.length >= 1800 && content.length <= 6000, "author-format length outlier " + number + ": " + content.length);
    for (const part of required) assert.ok(content.includes(part), number + " missing " + part);
    assert.ok(content.includes("не цитата"), "attribution disclaimer " + number);
    assert.ok(!content.includes("docs.google.com"), "must not leak private source");
    texts.add(content);
  }
  assert.equal(texts.size, 52, "no recycled full descriptions");
});

test("client draws load long new readings only after selection and both reading surfaces render them", () => {
  const panel = readFileSync(new URL("../components/dao-divination-panel.tsx", import.meta.url), "utf8");
  const pages = readFileSync(new URL("../components/dao-hexagram-pages.tsx", import.meta.url), "utf8");
  const dir = readFileSync(new URL("../components/dao-hexagram-directory.tsx", import.meta.url), "utf8");
  assert.match(panel, /import\("@\/data\/dao-hexagrams-editorial\.mjs"\)/, "code split the initial Library bundle");
  assert.match(panel, /getDaoEditorialHexagramText\(number\)/);
  assert.match(panel, /editorial\.text\.split/);
  assert.match(pages, /getDaoEditorialHexagramText\(number\)/);
  assert.match(pages, /editorialText\.split/);
  assert.ok(dir.includes('Новые трактовки (52)'));
  assert.ok(!/(?:fetch\(|localStorage|sessionStorage|XMLHttpRequest)/.test(panel), "the question must remain private");
});

test("invalid and archive numbers have no generated replacement", () => {
  for (const number of [-1, 0, 65, 100, "", NaN, Infinity]) assert.equal(getDaoEditorialHexagramText(number), null);
  for (const item of hexagrams) {
    assert.equal(typeof getDaoEditorialHexagramText(item.number) === "string", !archive.has(item.number));
  }
});
