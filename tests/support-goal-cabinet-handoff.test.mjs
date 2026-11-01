import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SUPPORT_GOAL_HANDOFF_KEY, SUPPORT_GOAL_HANDOFF_MAX_AGE_MS,
  normalizeSavedGoalProfile, stageSupportGoalProfile,
  readStagedSupportGoalProfile, clearStagedSupportGoalProfile,
} from "../lib/holistic-support/saved-goal-profile.mjs";
import {
  normalizeDevelopmentGoals, DEVELOPMENT_GOALS_VERSION, DEFAULT_DEVELOPMENT_TARGETS,
} from "../lib/profile/development-program.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sample = () => ({
  version: 1, activeSector: "money",
  scores: { energy: 5, money: 4, relationships: 8, meaning: 7 },
  savedSectors: {
    energy: { checkin: 5, concerns: ["fatigue"], tasks: ["moreEnergy"],
      ratings: { vitality: { current: 5, desired: 8 }, sleepQuality: { current: 4, desired: 9 } } },
    money: { checkin: 4, concerns: ["income"], tasks: ["stableIncome"],
      ratings: { incomeStability: { current: 4, desired: 8 } },
      amounts: { monthlyIncome: { current: 2500, desired: null }, reserveMonths: { current: null, desired: 3 } },
      currency: "CAD" },
  },
});
const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    has: key => values.has(key),
  };
};

test("a voluntary filter selection validates and roundtrips through existing encrypted goals shape", () => {
  const profile = normalizeSavedGoalProfile(sample());
  assert.ok(profile);
  assert.equal(profile.savedSectors.money.amounts.monthlyIncome.current, 2500);
  assert.equal(profile.savedSectors.money.amounts.monthlyIncome.desired, null);
  assert.equal(profile.savedSectors.energy.ratings.sleepQuality.desired, 9);
  const base = { version: DEVELOPMENT_GOALS_VERSION, targets: { ...DEFAULT_DEVELOPMENT_TARGETS },
    details: {}, goalCheckin: null };
  const saved = normalizeDevelopmentGoals({ ...base, supportProfile: profile });
  assert.deepEqual(saved.supportProfile, profile);
  assert.deepEqual(saved.targets, base.targets);
  // A subsequent My Development Path edit must not erase the public goal profile.
  assert.deepEqual(normalizeDevelopmentGoals({ ...saved, revision: 3 })?.supportProfile, profile);
});

test("reject unknown fields, arbitrary sensitive text, invalid units and malformed rating values", () => {
  for (const changed of [
    { ...sample(), undocumented: true },
    { ...sample(), scores: { ...sample().scores, extra: 5 } },
    { ...sample(), scores: { ...sample().scores, energy: 11 } },
    { ...sample(), activeSector: "unknown" },
    { ...sample(), savedSectors: { energy: sample().savedSectors.energy } },
    { ...sample(), savedSectors: { money: { ...sample().savedSectors.money, tasks: ["my symptoms: private"] } } },
    { ...sample(), savedSectors: { money: { ...sample().savedSectors.money,
      ratings: { incomeStability: { current: 0, desired: 10 } } } } },
    { ...sample(), savedSectors: { money: { ...sample().savedSectors.money,
      amounts: { monthlyIncome: { current: -1, desired: 2000 } } } } },
    { ...sample(), savedSectors: { money: { ...sample().savedSectors.money, currency: "INVALID" } } },
  ]) assert.equal(normalizeSavedGoalProfile(changed), null);
});

test("only an explicit stage writes transient same-tab data; expires and clears after confirmation", () => {
  const store = storage(), time = 1000000;
  assert.equal(readStagedSupportGoalProfile(store, time), null);
  stageSupportGoalProfile(sample(), store, time);
  assert.equal(store.has(SUPPORT_GOAL_HANDOFF_KEY), true);
  assert.deepEqual(readStagedSupportGoalProfile(store, time + 5), normalizeSavedGoalProfile(sample()));
  assert.equal(readStagedSupportGoalProfile(store, time + SUPPORT_GOAL_HANDOFF_MAX_AGE_MS + 1), null);
  assert.equal(store.has(SUPPORT_GOAL_HANDOFF_KEY), false);
  stageSupportGoalProfile(sample(), store, time);
  clearStagedSupportGoalProfile(store);
  assert.equal(readStagedSupportGoalProfile(store, time), null);
});

test("UI removes obsolete step #4; the last card saves privately then offers actual free tests", () => {
  const editor = read("components/holistic-support-goal-filter.tsx");
  const mobile = read("components/holistic-support-mobile.tsx");
  const privateCabinet = read("components/app/support-goal-cabinet.jsx");
  const workspace = read("components/app/app-workspace.jsx");
  const route = read("app/api/app/[...path]/route.js");
  const goals = read("lib/app/development-goals.js");
  const layout = read("components/holistic-support-goal-filter.module.css");
  for (const text of ["Ваш бесплатный психологический профиль", "Сохранить данные и пройти тесты",
    "(создать свой психологический профиль бесплатно)", "Save your data and take tests",
    "Guardar datos y hacer pruebas"]) {
    assert.ok(editor.includes(text), text);
  }
  assert.doesNotMatch(editor, /data-support-goal-formats/);
  assert.match(editor, /onClick=\{saveToCabinet\}/);
  const footer = editor.split('<footer className={styles.actions}')[1];
  assert.ok(footer.indexOf("data-support-goal-cabinet-cta") > footer.indexOf("data-support-goal-reset"));
  assert.match(layout, /\.cabinetCard \{ display: grid;/);
  assert.match(mobile, /stageSupportGoalProfile\(profile\)/);
  assert.match(mobile, /continueTo: "cabinet"/);
  assert.match(mobile, /auth\/contact-profile/);
  assert.match(route, /'direct-messages','cabinet'\]\.includes/);
  assert.match(route, /requireSameOrigin\(request, config\)/);
  assert.match(goals, /seal\(goals, context\(actor\), config\)/);
  assert.match(goals, /where account_id=\$1/);
  assert.match(goals, /DEVELOPMENT_GOALS_CONFLICT/);
  assert.match(workspace, /<SupportGoalCabinet key=\{'support-goals:'/);
  assert.match(privateCabinet, /readStagedSupportGoalProfile\(\)/);
  assert.match(privateCabinet, /appFetch\("development-goals"/);
  assert.match(privateCabinet, /clearStagedSupportGoalProfile\(\)/);
  assert.match(privateCabinet, /GOALS_SAVE_UNCONFIRMED/);
  const verifiedCabinetUI = privateCabinet.split("if (!profile) return null;")[1] ?? "";
  assert.match(verifiedCabinetUI, /data-support-goal-test-continuation/);
  assert.match(verifiedCabinetUI, /data-support-goal-start-profile/);
  assert.match(verifiedCabinetUI, /data-support-goal-direct-tests/);
  assert.match(verifiedCabinetUI, /\/personality-profiles/);
  assert.match(verifiedCabinetUI, /\/client\/tests/);
  assert.match(verifiedCabinetUI, /"\/" \+ lang/);
  assert.doesNotMatch(mobile, /sessionStorage|localStorage|URLSearchParams/);
  assert.doesNotMatch(privateCabinet, /createRequest\(|sendMessage\(|analytics|pixel|utm_/);
});
