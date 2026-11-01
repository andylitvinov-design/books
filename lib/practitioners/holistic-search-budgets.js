/**
 * Public Holistic Support filtering. Never convert CAD/USD to EUR, infer a
 * missing price or claim a talisman has a published cost. Pure, read-only.
 */
const TOPIC_AREAS = Object.freeze({
  "Work and money": ["business_money", "career_purpose"],
  "Connection and relationships": ["relationships"],
  "Inner balance and calm": ["energy_spiritual", "body_somatic", "homeopathy_holistic", "emotional_psychological"],
});

export function matchesHolisticGoal(areaKey, goal) {
  return Boolean(TOPIC_AREAS[goal]?.includes(areaKey));
}

/**
 * 'any' includes legitimately unpriced offers. Other choices require a
 * published zero/free price, or a positive price explicitly in EUR.
 * A monetary cap describes displayed pricing only, never service availability.
 */
export function matchesHolisticEuroBudget(price, currency, pricingMode, budget) {
  if (budget === "any") return true;
  const valid = typeof price === "number" && Number.isFinite(price) && price >= 0;
  const free = pricingMode === "free" || (valid && price === 0 && pricingMode !== "contact");
  if (budget === "free") return free;
  if (free) return true;
  if (budget !== "20" && budget !== "100") return false;
  return valid && price > 0 && pricingMode !== "contact" &&
    currency === "EUR" && price <= Number(budget);
}
