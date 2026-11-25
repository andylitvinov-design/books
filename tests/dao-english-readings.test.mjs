import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hexagrams, daoAuthorHexagramNumbers } from "../data/dao-hexagrams.mjs";
import { daoEnglishHexagramCount, getDaoEnglishHexagramText, getDaoEnglishReadingProvenance } from "../data/dao-hexagrams-en.mjs";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");

test("all 64 distinct English texts exist, match the correct King Wen card, and contain no Russian prose", () => {
  assert.equal(daoEnglishHexagramCount, 64);
  const readings = new Set();
  for (const item of hexagrams) {
    const reading = getDaoEnglishHexagramText(item.number);
    assert.ok(reading, "Missing English reading #" + item.number);
    assert.ok(reading.startsWith("Hexagram " + item.number + ". " + item.hanzi), "Wrong card #" + item.number);
    assert.ok(reading.includes("(" + item.en + ")"), "Wrong English name #" + item.number);
    for (const label of ["Meaning and elemental image:", "Practical step:", "What to watch for:", "Reflection:"]) {
      assert.ok(reading.includes(label), "#" + item.number + " missing " + label);
    }
    assert.ok(!/[А-Яа-яЁё]/.test(reading), "Russian appeared in English #" + item.number);
    assert.ok(reading.length > 300, "English reading too short #" + item.number);
    readings.add(reading);
  }
  assert.equal(readings.size, 64);
  assert.match(getDaoEnglishHexagramText(7), /responsible leadership/);
  assert.match(getDaoEnglishHexagramText(42), /Growth gains meaning/);
  for (const invalid of [0, -1, 65, 100, "", "7.5", NaN, Infinity]) {
    assert.equal(getDaoEnglishHexagramText(invalid), null);
    assert.equal(getDaoEnglishReadingProvenance(invalid), null);
  }
});

test("English adaptation provenance distinguishes 12 archived originals and 52 new editorial texts", () => {
  const archive = new Set(daoAuthorHexagramNumbers);
  assert.equal(archive.size, 12);
  for (const { number } of hexagrams) {
    const note = getDaoEnglishReadingProvenance(number);
    assert.ok(note);
    if (archive.has(number)) assert.match(note, /original text preserved separately/);
    else assert.match(note, /not an original author publication/);
  }
  const originals = JSON.parse(read("data/dao-hexagram-author.json"));
  assert.equal(originals.length, 12);
  assert.ok(originals.every((record) => record.originalLanguage === "ru"));
});

test("English question language routes to English text in Ideas and Library, not Russian fallback", () => {
  const ideas = read("components/ideas-discovery.tsx");
  const panel = read("components/dao-divination-panel.tsx");
  const detail = read("components/dao-hexagram-pages.tsx");
  const guidance = read("lib/ideas-guidance.mjs");
  assert.match(guidance, /export function detectIdeasQuestionLocale/);
  assert.match(ideas, /readingLocale = detectIdeasQuestionLocale\(question, locale\)/);
  assert.match(ideas, /getDaoEnglishHexagramText\(selectedNumber\)/);
  assert.match(ideas, /lang=\{fullDaoReading\.locale\}/);
  assert.match(ideas, /fullDaoReading\.locale === \(answerLocale === "en"/);
  assert.match(panel, /getDaoEnglishHexagramText\(number\)/);
  assert.match(panel, /localizedEditorial\?\.text/);
  assert.match(detail, /getDaoEnglishHexagramText\(number\)/);
  assert.match(detail, /lang=\{locale === "en" \? "en" : "ru"\}/);
  assert.ok(!ideas.includes('className={styles.daoProse} lang="ru"'), "English Ideas prose hard-coded to Russian");
  for (const component of [ideas, panel]) {
    for (const disallowed of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "navigator.sendBeacon"]) {
      assert.ok(!component.includes(disallowed), "Question leakage risk: " + disallowed);
    }
  }
});
