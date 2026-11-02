/**
 * Shared, fail-closed priority selector for explicitly enabled free text AI.
 * A caller must verify provider credentials/free-tier status first.
 * Never accepts arbitrary model IDs, URLs, or clients' choice of provider.
 */
export const FREE_TEXT_PROVIDER_ORDER = Object.freeze([
  "gemini_free", "openrouter_free", "groq_free",
]);
export function orderFreeTextProviders(activeProviders, preference = "") {
  const active = new Set(
    Array.isArray(activeProviders)
      ? activeProviders.filter(id => FREE_TEXT_PROVIDER_ORDER.includes(id))
      : [],
  );
  const requested = typeof preference === "string" && preference.length <= 100
    ? preference.split(",").map(id => id.trim()).filter(id => FREE_TEXT_PROVIDER_ORDER.includes(id))
    : [];
  return [...new Set([...requested, ...FREE_TEXT_PROVIDER_ORDER])]
    .filter(id => active.has(id));
}
