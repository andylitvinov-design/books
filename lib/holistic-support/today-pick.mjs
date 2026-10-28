// Only allowlisted Test Explorer editorial facets. Never put score values, answers,
// symptoms, notes or a private account identifier in a link.
export const SUPPORT_TEST_FOCUS = Object.freeze({
  energy: Object.freeze(["body", "resources"]),
  money: Object.freeze(["clarity", "function"]),
  relationships: Object.freeze(["relationships", "intimacy"]),
  meaning: Object.freeze(["meaning", "clarity"]),
  health: Object.freeze(["health", "body"]),
});

// Reviewed, coarse discovery facets from the user's explicitly accepted goal
// choices. The original concern IDs and responses never go into the URL.
const CONCERN_FOCUS = Object.freeze({
  moneyStress: "stress", overworked: "stress", decisions: "clarity",
  moneyFocus: "clarity", workStuck: "function",
  loneliness: "relationships", distance: "relationships", conflicts: "relationships",
  boundaries: "resources", fearOfCloseness: "intimacy",
  lostPurpose: "meaning", noInspiration: "meaning", distraction: "attention",
  procrastination: "attention", unclearGoals: "clarity",
  sleepQuality: "sleep", fatigue: "body",
});

export function supportTestFocus({
  scores = {}, editedCheckins = [], goalSector = null, goalConcerns = [], category = null,
} = {}) {
  const sectors = {
    love: "relationships", relationships: "relationships",
    energy: "energy", money: "money", meaning: "meaning", health: "health",
  };
  if (typeof goalSector === "string" && sectors[goalSector]) {
    const facets = (Array.isArray(goalConcerns) ? goalConcerns : [])
      .filter(id => typeof id === "string" && Object.hasOwn(CONCERN_FOCUS, id))
      .map(id => CONCERN_FOCUS[id]);
    return [...new Set([...facets, ...SUPPORT_TEST_FOCUS[sectors[goalSector]]])].slice(0, 4);
  }

  // Never treat untouched default 5/10 values as a personal weakness.
  const chosen = [...new Set(
    (Array.isArray(editedCheckins) ? editedCheckins : [])
      .filter(key => Object.hasOwn(SUPPORT_TEST_FOCUS, key) &&
        Number.isInteger(scores[key]) && scores[key] >= 1 && scores[key] <= 10)
  )].sort((a, b) => scores[a] - scores[b]);

  if (chosen.length) return [...new Set(chosen.slice(0, 2).flatMap(key => SUPPORT_TEST_FOCUS[key]))].slice(0, 4);
  if (category && category !== "all" && sectors[category])
    return [...SUPPORT_TEST_FOCUS[sectors[category]]];
  return [];
}

export function supportTestHref(locale, options = {}) {
  const lang = ["en", "ru", "es"].includes(locale) ? locale : "en";
  const focus = supportTestFocus(options);
  return "/" + lang + "/client/tests" + (focus.length ? "?focus=" + focus.join(",") : "");
}
