// Canonical, course-specific pricing for ONE personal Reiki initiation level.
// Dates, enrolment and any separate course tuition require confirmation.
export const REIKI_LEVEL_PRICES = Object.freeze({
  tantra: Object.freeze({ amountEur: 50, durationMinutes: 30 }),
  yggdrasil: Object.freeze({ amountEur: 100, durationMinutes: 60 }),
});

export function getReikiLevelPrice(course) {
  const result = REIKI_LEVEL_PRICES[course];
  if (!result) throw new Error("Unknown Reiki course");
  return result;
}

export function formatReikiLevelPrice(course, locale = "en") {
  const rate = getReikiLevelPrice(course);
  const unit = locale === "ru" ? "ступень" : locale === "es" ? "nivel" : "level";
  const minute = locale === "ru" ? "мин" : "min";
  return "€" + rate.amountEur + " / " + rate.durationMinutes + " " + minute + " / " + unit;
}
