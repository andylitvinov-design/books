// The public goal editor is not a validated assessment or a CRM lead.
// Validate its bounded, voluntary self-ratings before account-owned encrypted storage.
export const SUPPORT_GOAL_PROFILE_VERSION = 1;
export const SUPPORT_GOAL_HANDOFF_KEY = "hh-support-goal-cabinet-v1";
export const SUPPORT_GOAL_HANDOFF_MAX_AGE_MS = 60 * 60 * 1000;
const SECTORS = ["energy", "money", "love", "meaning"];
const CHECKINS = ["energy", "money", "relationships", "meaning"];
const AXES = Object.freeze({
  energy: ["vitality", "sleepQuality", "calm"],
  money: ["incomeStability"],
  love: ["connection", "trust", "communication"],
  meaning: ["meaningAxis", "selfContact", "inspirationAxis", "goalClarity", "actions", "progress"],
});
const AMOUNTS = Object.freeze({ monthlyIncome: 100000000, reserveMonths: 120 });
const CURRENCIES = ["CAD", "EUR", "USD", "GBP"];
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
const only = (value, keys) => plain(value) && Object.keys(value).every(key => keys.includes(key));
const score = value => Number.isInteger(value) && value >= 1 && value <= 10;
const id = value => typeof value === "string" && /^[a-z][A-Za-z0-9]{0,39}$/.test(value);
function options(values) {
  if (!Array.isArray(values) || values.length > 16 ||
      values.some(value => !id(value)) || new Set(values).size !== values.length) return null;
  return [...values];
}
function ratingsFor(sector, input) {
  if (!only(input, AXES[sector])) return null;
  const result = {};
  for (const [key, pair] of Object.entries(input)) {
    if (!only(pair, ["current", "desired"]) || !score(pair.current) || !score(pair.desired)) return null;
    result[key] = { current: pair.current, desired: pair.desired };
  }
  return result;
}
function amountsFor(input) {
  if (!only(input, Object.keys(AMOUNTS))) return null;
  const result = {};
  for (const [key, pair] of Object.entries(input)) {
    if (!only(pair, ["current", "desired"])) return null;
    for (const value of [pair.current, pair.desired]) {
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > AMOUNTS[key])) return null;
    }
    result[key] = { current: pair.current, desired: pair.desired };
  }
  return result;
}
export function normalizeSavedGoalProfile(input) {
  if (!only(input, ["version", "scores", "savedSectors", "activeSector"]) ||
      input.version !== SUPPORT_GOAL_PROFILE_VERSION ||
      !SECTORS.includes(input.activeSector) ||
      !only(input.scores, CHECKINS) ||
      Object.keys(input.scores).length !== CHECKINS.length ||
      CHECKINS.some(key => !score(input.scores[key])) ||
      !only(input.savedSectors, SECTORS) ||
      !Object.hasOwn(input.savedSectors, input.activeSector)) return null;
  const savedSectors = {};
  for (const [sector, value] of Object.entries(input.savedSectors)) {
    if (!only(value, ["checkin", "concerns", "tasks", "ratings", "amounts", "currency"]) ||
        !score(value.checkin)) return null;
    const concerns = options(value.concerns), tasks = options(value.tasks);
    const ratings = ratingsFor(sector, value.ratings);
    if (!concerns || !tasks || !ratings) return null;
    if (sector !== "money" && (value.amounts !== undefined || value.currency !== undefined)) return null;
    const amounts = sector === "money" ? amountsFor(value.amounts ?? {}) : null;
    if (sector === "money" && (!amounts || !CURRENCIES.includes(value.currency))) return null;
    savedSectors[sector] = {
      checkin: value.checkin, concerns, tasks, ratings,
      ...(sector === "money" ? { amounts, currency: value.currency } : {}),
    };
  }
  return {
    version: SUPPORT_GOAL_PROFILE_VERSION,
    scores: Object.fromEntries(CHECKINS.map(key => [key, input.scores[key]])),
    savedSectors,
    activeSector: input.activeSector,
  };
}

// Transient same-tab handoff after the person's explicit "Save to Cabinet" click.
// Never place concerns, amounts or ratings into OAuth state, URLs, CRM, analytics or push.
export function stageSupportGoalProfile(profile, storage = globalThis.sessionStorage, now = Date.now()) {
  const normalized = normalizeSavedGoalProfile(profile);
  if (!normalized || !storage) throw new Error("INVALID_SUPPORT_GOAL_PROFILE");
  storage.setItem(SUPPORT_GOAL_HANDOFF_KEY, JSON.stringify({ profile: normalized, createdAt: now }));
  return normalized;
}
export function readStagedSupportGoalProfile(storage = globalThis.sessionStorage, now = Date.now()) {
  if (!storage) return null;
  let parsed;
  try { parsed = JSON.parse(storage.getItem(SUPPORT_GOAL_HANDOFF_KEY) || "null"); }
  catch { storage.removeItem(SUPPORT_GOAL_HANDOFF_KEY); return null; }
  if (!plain(parsed) || !Number.isSafeInteger(parsed.createdAt) ||
      parsed.createdAt > now + 60000 || now - parsed.createdAt > SUPPORT_GOAL_HANDOFF_MAX_AGE_MS) {
    if (parsed !== null) storage.removeItem(SUPPORT_GOAL_HANDOFF_KEY);
    return null;
  }
  const profile = normalizeSavedGoalProfile(parsed.profile);
  if (!profile) storage.removeItem(SUPPORT_GOAL_HANDOFF_KEY);
  return profile;
}
export function clearStagedSupportGoalProfile(storage = globalThis.sessionStorage) {
  storage?.removeItem(SUPPORT_GOAL_HANDOFF_KEY);
}
