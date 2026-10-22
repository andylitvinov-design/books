// Editorial navigation only: this is not a psychological, business, or financial assessment.
// Keep all suggested products aligned with the existing business-consulting intake formats.
export const BUSINESS_FINDER_ISSUES = Object.freeze({
  business: Object.freeze(["strategy", "sales", "team", "decisions"]),
  money: Object.freeze(["income", "pricing", "money-decisions", "money-pressure"]),
  personal: Object.freeze(["confidence", "focus", "work-balance", "direction"]),
  project: Object.freeze(["launch", "priorities", "partnership", "stuck"]),
});

export const BUSINESS_FINDER_OUTCOMES = Object.freeze(["gentle", "one-step", "deeper", "ongoing"]);
export const BUSINESS_FINDER_FORMATS = Object.freeze(["free", "express", "full", "mentoring"]);

/**
 * A transparent editorial suggestion, never a diagnosis or a revenue prediction.
 * Every recommendation maps to the existing consent-gated CRM enquiry formats.
 */
export function suggestBusinessConsultation({ area, issue, outcome } = {}) {
  if (!Object.hasOwn(BUSINESS_FINDER_ISSUES, area) ||
      !BUSINESS_FINDER_ISSUES[area].includes(issue)) return null;
  // The first-screen finder needs only two answers (topic + concrete challenge).
  // A longer meeting is suggested for interconnected strategy/team/project questions.
  // Visitors can freely switch to the existing free, 30m, 60m or mentoring formats.
  if (outcome == null) {
    return ["strategy", "team", "partnership", "stuck"].includes(issue) ? "full" : "express";
  }
  if (!BUSINESS_FINDER_OUTCOMES.includes(outcome)) return null;
  if (outcome === "gentle") return "free";
  if (outcome === "ongoing") return "mentoring";
  if (outcome === "deeper") return "full";
  // Partnership/team mapping is often more than one decision: suggest a longer
  // first conversation, while keeping 30 minutes selectable as an alternative.
  return ["team", "partnership"].includes(issue) ? "full" : "express";
}
