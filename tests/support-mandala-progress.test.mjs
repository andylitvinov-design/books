import assert from "node:assert/strict";
import test from "node:test";
import { MANDALA_RATING_KEYS, normalizeMandalaRatings, compareMandalaRatings } from "../lib/holistic-support/mandala-progress.js";

test("the only check-in keys are the original four, no health diagnosis or new fifth domain", () => {
  assert.deepEqual([...MANDALA_RATING_KEYS], ["energy", "money", "relationships", "goals"]);
  assert.deepEqual(normalizeMandalaRatings({
    energy: 4, money: 6, relationships: 7, goals: 5, health: 2,
  }), { energy: 4, money: 6, relationships: 7, goals: 5 });
});

test("before-after compares matching subjective scales without fabricating progress", () => {
  const result = compareMandalaRatings(
    { energy: 4, money: 6, relationships: 7, goals: 5 },
    { energy: 6, money: 6, relationships: 5, goals: 8 },
  );
  assert.deepEqual(result, [
    { key: "energy", before: 4, after: 6, delta: 2, direction: "up" },
    { key: "money", before: 6, after: 6, delta: 0, direction: "same" },
    { key: "relationships", before: 7, after: 5, delta: -2, direction: "down" },
    { key: "goals", before: 5, after: 8, delta: 3, direction: "up" },
  ]);
});

test("missing, stale, fractional or out-of-range ratings never become invented conclusions", () => {
  assert.deepEqual(normalizeMandalaRatings({
    energy: NaN, money: 0, relationships: 11, goals: "7",
  }), { energy: 5, money: 5, relationships: 5, goals: 5 });
  assert.deepEqual(normalizeMandalaRatings({
    energy: 1, money: 10, relationships: 2.5, goals: -1,
  }), { energy: 1, money: 10, relationships: 5, goals: 5 });
  assert.deepEqual(compareMandalaRatings({}, {})[0], {
    key: "energy", before: 5, after: 5, delta: 0, direction: "same",
  });
});

test("rating comparison leaves caller-owned values unmodified and needs no providers", () => {
  const before = Object.freeze({ energy: 1, money: 2, relationships: 3, goals: 4 });
  const after = Object.freeze({ energy: 4, money: 3, relationships: 2, goals: 1 });
  const first = compareMandalaRatings(before, after);
  const second = compareMandalaRatings(before, after);
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
});
