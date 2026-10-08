import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all 37 Reiki Yggdrasil steps have concrete source-based EN/RU summaries", async () => {
  const source = await readFile("data/academy/yggdrasil-step-summaries.ts", "utf8");
  const ids = [...source.matchAll(/"RY-L\d{2}-S\d{2}": \{/g)].map((match) => match[0]);
  assert.equal(ids.length, 37);
  assert.match(source, /https:\/\/reiki-yggdrasil\.com\/rejki-iggdrasil\/struktura\.html/);
  assert.match(source, /https:\/\/psitrends\.com\/studies\/adv\/prog-taory/);

  for (const filler of [
    "a basic understanding of",
    "a connection between the topic and personal practice",
    "a new layer of attention to energy, state and intention",
    "The student receives a practical map of",
    "prepare before practice and finish with grounding",
    "keep a journal of sensations",
  ]) {
    assert.equal(source.includes(filler), false, `Generic filler leaked into source summaries: ${filler}`);
  }
});

test("Ifrits summary explains the actual helper taxonomy instead of generic learning copy", async () => {
  const source = await readFile("data/academy/yggdrasil-step-summaries.ts", "utf8");
  const start = source.indexOf('"RY-L07-S03"');
  const end = source.indexOf('"RY-L07-S04"');
  const ifrits = source.slice(start, end);
  assert.match(ifrits, /protective and elemental ifrits/);
  assert.match(ifrits, /information helper/);
  assert.match(ifrits, /guides, regulators, guardians/);
  assert.match(ifrits, /Guardian of the Lineage/);
  assert.match(ifrits, /защитные и стихийные ифриты/);
  assert.match(ifrits, /Хранитель Рода/);
});

test("course UI no longer renders Meaning, What you get, What it opens, or Skills filler panels", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className="yggdrasil-step-source-summary"/);
  assert.match(component, /yggdrasilStepSummary/);
  assert.doesNotMatch(component, /className="yggdrasil-step-key-grid"/);
  assert.doesNotMatch(component, /labels\.outcome/);
  assert.doesNotMatch(component, /<SourceList/);
  assert.doesNotMatch(component, /genericEnglishSource/);
});
