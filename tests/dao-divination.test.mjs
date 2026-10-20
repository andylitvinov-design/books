import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { drawRandomHexagram, hexagramFromRandomWord, validHexagramNumber } from "../lib/dao-divination.mjs";

test("all 64 exact card numbers work; partial, negative and malformed numbers fail closed", () => {
  for (let n = 1; n <= 64; n++) {
    assert.equal(validHexagramNumber(String(n)), n);
    assert.equal(validHexagramNumber(n), n);
  }
  for (const bad of ["", " ", "-1", "0", "65", "999", "3.5", "1e2", "abc", "36x", "NaN", null, undefined]) {
    assert.equal(validHexagramNumber(bad), null, String(bad));
  }
});

test("random number mapping is unbiased across the uniform uint32 domain", () => {
  assert.equal(hexagramFromRandomWord(0), 1);
  assert.equal(hexagramFromRandomWord(63), 64);
  assert.equal(hexagramFromRandomWord(64), 1);
  assert.equal(hexagramFromRandomWord(0xffffffff), 64);
  const counts = new Map(Array.from({ length: 64 }, (_, i) => [i + 1, 0]));
  for (let i = 0; i < 65536; i++) {
    const number = hexagramFromRandomWord(i);
    counts.set(number, counts.get(number) + 1);
  }
  assert.deepEqual([...counts.values()], Array(64).fill(1024));
  assert.throws(() => hexagramFromRandomWord(-1), RangeError);
});

test("reading is client-only; user question never sent to an API or saved", () => {
  const src = readFileSync(new URL("../components/dao-divination-panel.tsx", import.meta.url), "utf8");
  for (const prohibited of ["fetch(", "localStorage", "sessionStorage", "XMLHttpRequest", "navigator.sendBeacon"]) {
    assert.ok(!src.includes(prohibited), prohibited);
  }
  assert.match(src, /setQuestion\(""\)/);
  assert.match(src, /drawRandomHexagram\(\)/);
  assert.match(src, /validHexagramNumber\(numberText\)/);
  assert.match(src, /<details[\s\S]*?open/);
});

test("standalone 64-card catalogue and Library tab link to the same first-party detail URLs", () => {
  const hub = readFileSync(new URL("../components/library-hub.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../components/dao-divination-panel.tsx", import.meta.url), "utf8");
  assert.ok(hub.includes('view === "dao"'));
  assert.ok(hub.includes('view=dao'));
  assert.ok(panel.includes('/dao/hexagrams/" + item.number'));
  assert.match(panel, /"ru" \| "en" \| "es"/);
});
