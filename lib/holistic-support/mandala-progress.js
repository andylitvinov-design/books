// Four independent, *subjective* 1–10 self-ratings for an optional
// before/after reflection. Never convert these to diagnostic or health scores.
// No persistence, analytics, CRM, cross-instrument norming or predictions.
export const MANDALA_RATING_KEYS = Object.freeze(["energy", "money", "relationships", "goals"]);

export function normalizeMandalaRatings(input = {}) {
  return Object.fromEntries(MANDALA_RATING_KEYS.map(key => [
    key,
    typeof input?.[key] === "number" &&
      Number.isInteger(input[key]) && input[key] >= 1 && input[key] <= 10
      ? input[key] : 5,
  ]));
}

export function compareMandalaRatings(before, after) {
  const start = normalizeMandalaRatings(before);
  const end = normalizeMandalaRatings(after);
  return MANDALA_RATING_KEYS.map(key => ({
    key,
    before: start[key],
    after: end[key],
    delta: end[key] - start[key],
    direction: end[key] > start[key] ? "up" : end[key] < start[key] ? "down" : "same",
  }));
}
