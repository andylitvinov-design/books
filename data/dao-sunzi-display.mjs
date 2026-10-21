// Pure display-only adapter: preserve all 12 immutable author archive records.
// Legacy strategy paragraphs contain modern invented sayings; suppress only
// those paragraphs in rendered copy, keeping the source archive unchanged.
export const SUN_TZU_PLACEHOLDER = "__HH_SUN_TZU_STRATEGY__";
export function prepareDaoReadingForSunTzu(text) {
  const input = String(text ?? "");
  if (!input) return SUN_TZU_PLACEHOLDER;
  if (input.includes(SUN_TZU_PLACEHOLDER)) return input;
  const legacy = /(?:📜 Императорская стратегия в духе Сунь-цзы|📖 Сунь-Цзы — стратегия[^\n]*)[\s\S]*?(?=\n\s*(?:🧠 Смысл:|🧬 Психотерапевтический смысл:|🪞 Аффирмации:))/iu;
  if (legacy.test(input)) return input.replace(legacy, "\n\n" + SUN_TZU_PLACEHOLDER + "\n\n");
  const at = input.search(/(?:🧬 Психотерапевтический смысл|🪞 Аффирмации)/u);
  if (at >= 0) return input.slice(0, at) + SUN_TZU_PLACEHOLDER + "\n\n" + input.slice(at);
  return input + "\n\n" + SUN_TZU_PLACEHOLDER;
}
