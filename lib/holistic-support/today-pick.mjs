// Only allowlisted Test Explorer editorial facets. Never put score values, answers,
// symptoms, notes or a private account identifier in a link.
export const SUPPORT_TEST_FOCUS = Object.freeze({
  energy: Object.freeze(["body", "resources"]),
  money: Object.freeze(["clarity", "function"]),
  relationships: Object.freeze(["relationships", "intimacy"]),
  meaning: Object.freeze(["meaning", "clarity"]),
  health: Object.freeze(["health", "body"]),
});

export function supportTestFocus({ scores = {}, editedCheckins = [], goalSector = null, category = null } = {}) {
  const sectors = {
    love: "relationships", relationships: "relationships",
    energy: "energy", money: "money", meaning: "meaning", health: "health",
  };
  if (typeof goalSector === "string" && sectors[goalSector])
    return [...SUPPORT_TEST_FOCUS[sectors[goalSector]]];
  if (category && category !== "all" && sectors[category])
    return [...SUPPORT_TEST_FOCUS[sectors[category]]];

  // Never treat untouched default 5/10 values as a personal weakness.
  const chosen = [...new Set(
    (Array.isArray(editedCheckins) ? editedCheckins : [])
      .filter(key => Object.hasOwn(SUPPORT_TEST_FOCUS, key) &&
        Number.isInteger(scores[key]) && scores[key] >= 1 && scores[key] <= 10)
  )].sort((a, b) => scores[a] - scores[b]);

  return [...new Set(chosen.slice(0, 2).flatMap(key => SUPPORT_TEST_FOCUS[key]))].slice(0, 4);
}

export function supportTestHref(locale, options = {}) {
  const lang = ["en", "ru", "es"].includes(locale) ? locale : "en";
  const focus = supportTestFocus(options);
  return "/" + lang + "/client/tests" + (focus.length ? "?focus=" + focus.join(",") : "");
}
