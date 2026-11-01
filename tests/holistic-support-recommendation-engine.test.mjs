import assert from "node:assert/strict";
import test from "node:test";
import { recommendSupportByLowestScores, recommendSupportContent } from "../lib/holistic-support/recommendation-engine.js";
import { TAOIST_TALISMANS } from "../lib/practitioners/taoist-talismans.js";

const video = (id, topics, sourceLanguage = "en") => ({
  id, title: "Published reference " + id, topics, sourceLanguage,
});
const library = [
  video("aaaaaaaaaaa", ["love"]),
  video("bbbbbbbbbbb", ["energy", "health"]),
  video("ccccccccccc", ["business"]),
  video("ddddddddddd", ["energy"]),
];
const defaultScores = { energy: 4, money: 6, relationships: 7, goals: 5 };

test("explicit focus is stronger than another domain's low self-score", () => {
  const result = recommendSupportContent({
    focus: "relationships", scores: { ...defaultScores, energy: 1 },
    videos: library, talismans: TAOIST_TALISMANS, locale: "en",
  });
  assert.equal(result.videos[0].id, "aaaaaaaaaaa");
  assert.equal(result.talismans[0].id, "fu-harmony");
  assert.equal(result.scores.energy, 1);
  assert.equal(result.matchedVideo, true);
});

test("every chosen domain returns an actual existing topic video and symbolic catalog item", () => {
  const expected = {
    energy: ["ddddddddddd", "fu-balance"],
    money: ["ccccccccccc", "fu-prosperity"],
    relationships: ["aaaaaaaaaaa", "fu-harmony"],
    goals: ["ccccccccccc", "fu-prosperity"],
  };
  for (const [focus, [youtubeId, talismanId]] of Object.entries(expected)) {
    const result = recommendSupportContent({
      focus, scores: defaultScores, videos: library,
      talismans: TAOIST_TALISMANS, locale: "en",
    });
    assert.equal(result.videos[0].id, youtubeId, focus);
    assert.equal(result.talismans[0].id, talismanId, focus);
    assert.equal(result.talismans[0], TAOIST_TALISMANS.find(item => item.id === talismanId));
  }
});

test("secondary input scores affect the ranked *alternatives*, not the chosen focus", () => {
  const options = [
    video("eeeeeeeeeee", ["energy", "love"]),
    video("fffffffffff", ["energy", "business"]),
  ];
  const loveLow = recommendSupportContent({
    focus: "energy", scores: { energy: 6, relationships: 1, money: 10, goals: 10 }, videos: options,
  });
  const workLow = recommendSupportContent({
    focus: "energy", scores: { energy: 6, relationships: 10, money: 1, goals: 1 }, videos: options,
  });
  assert.equal(loveLow.videos[0].id, "eeeeeeeeeee");
  assert.equal(workLow.videos[0].id, "fffffffffff");
});

test("broad videos with four loose tags do not crowd out a focused recording", () => {
  const result = recommendSupportContent({
    focus: "relationships", scores: { energy: 1, money: 1, relationships: 8, goals: 1 },
    videos: [video("eeeeeeeeeee", ["energy", "business", "love", "health"]),
      video("fffffffffff", ["love"])],
  });
  assert.equal(result.videos[0].id, "fffffffffff");
});

test("low ratings reorder secondary talisman options without replacing the chosen symbolic intention", () => {
  const one = recommendSupportContent({
    focus: "energy", scores: {energy: 7, money: 9, relationships: 1, goals: 9},
    videos: library, talismans: TAOIST_TALISMANS,
  });
  const two = recommendSupportContent({
    focus: "energy", scores: {energy: 7, money: 1, relationships: 9, goals: 9},
    videos: library, talismans: TAOIST_TALISMANS,
  });
  assert.equal(one.talismans[0].id, "fu-balance");
  assert.equal(two.talismans[0].id, "fu-balance");
  assert.equal(one.talismans[1].id, "fu-harmony");
  assert.equal(two.talismans[1].id, "fu-prosperity");
});

test("language matching is a tie-breaker without hiding verified originals", () => {
  const recordings = [video("eeeeeeeeeee", ["energy"], "en"), video("fffffffffff", ["energy"], "ru")];
  const ru = recommendSupportContent({ focus: "energy", scores: defaultScores, videos: recordings, locale: "ru" });
  const es = recommendSupportContent({ focus: "energy", scores: defaultScores, videos: recordings, locale: "es" });
  assert.equal(ru.videos[0].sourceLanguage, "ru");
  assert.equal(es.videos[0].sourceLanguage, "en");
  assert.equal(ru.videos.length, 2);
});

test("does not invent results for missing publications or invalid personal ratings", () => {
  const result = recommendSupportContent({
    focus: "money", scores: { money: -7, energy: NaN, goals: 400, relationships: "8" },
    videos: [video("not-a-real-id", ["business"]), video("eeeeeeeeeee", ["love"])],
    talismans: TAOIST_TALISMANS.filter(item => item.id !== "fu-prosperity"),
  });
  assert.equal(result.scores.energy, 5);
  assert.equal(result.scores.money, 5);
  assert.equal(result.scores.relationships, 5);
  assert.equal(result.scores.goals, 5);
  assert.equal(result.videos.length, 1);
  assert.equal(result.matchedVideo, false);
  assert.deepEqual(result.talismans, []);
});

test("deduplicates source recordings; no assumed products or side effects", () => {
  const args = {
    focus: "energy",
    scores: Object.freeze({ ...defaultScores }),
    videos: Object.freeze([library[1], library[1], library[3]]),
    talismans: TAOIST_TALISMANS,
  };
  const first = recommendSupportContent(args);
  const second = recommendSupportContent(args);
  assert.deepEqual(first.videos.map(item => item.id), second.videos.map(item => item.id));
  assert.equal(new Set(first.videos.map(item => item.id)).size, first.videos.length);
  assert.equal(first.talismans.length, 3);
});


test("lowest self-rating selects topic without a focus button", () => {
  const base = { energy: 8, money: 8, relationships: 8, goals: 8 };
  const expected = {
    energy: ["bbbbbbbbbbb", "ddddddddddd"],
    money: ["ccccccccccc"],
    relationships: ["aaaaaaaaaaa"],
    goals: ["ccccccccccc"],
  };
  for (const [domain, accepted] of Object.entries(expected)) {
    const result = recommendSupportByLowestScores({
      scores: { ...base, [domain]: 1 }, videos: library, locale: "en",
    });
    assert.deepEqual(result.priorities, [domain], domain);
    assert.equal(result.minimum, 1);
    assert.ok(accepted.includes(result.videos[0].id), domain + " chosen from real tagged recordings");
    assert.equal(result.matchedVideo, true);
  }
});

test("ties are jointly considered; input order never picks a hidden focus", () => {
  const videos = [
    video("lllllllllll", ["energy"]),
    video("mmmmmmmmmmm", ["love"]),
    video("nnnnnnnnnnn", ["business"]),
  ];
  const scores = { energy: 2, money: 9, relationships: 2, goals: 9 };
  const result = recommendSupportByLowestScores({ scores, videos });
  assert.equal(result.minimum, 2);
  assert.deepEqual(result.priorities, ["energy", "relationships"]);
  assert.deepEqual(result.videos.slice(0, 2).map(item => item.id),
    ["lllllllllll", "mmmmmmmmmmm"]);
  assert.equal(result.videos[2].id, "nnnnnnnnnnn");
  assert.deepEqual(scores, { energy: 2, money: 9, relationships: 2, goals: 9 });
});

test("unchanged scores are stable; invalid, duplicate and unverified IDs cannot enter the gallery", () => {
  const options = [
    video("lllllllllll", ["energy"], "en"),
    video("mmmmmmmmmmm", ["energy"], "ru"),
    video("lllllllllll", ["energy"], "en"),
    video("bad-id", ["business"]),
    video("nnnnnnnnnnn", ["unknown"]),
  ];
  const normalized = recommendSupportByLowestScores({
    scores: { energy: -2, money: 100, relationships: NaN, goals: "1" },
    videos: options, locale: "ru",
  });
  assert.deepEqual(normalized.scores,
    { energy: 5, money: 5, relationships: 5, goals: 5 });
  assert.deepEqual(normalized.priorities, ["energy", "money", "relationships", "goals"]);
  assert.deepEqual(normalized.videos.map(item => item.id), ["mmmmmmmmmmm", "lllllllllll"]);
  assert.deepEqual(recommendSupportByLowestScores({ videos: [], scores: defaultScores }).videos, []);
});
