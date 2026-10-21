// Pure display-only adapter: preserve all 12 immutable author archive records.
// One early author reading (#9) contains an unsourced stylized Sunzi paragraph;
// hide that section in the UI and put our sourced block in exactly its place.
export const SUN_TZU_PLACEHOLDER = "__HH_SUN_TZU_STRATEGY__";
export function prepareDaoReadingForSunTzu(text) {
  const input=String(text ?? "");
  if(!input) return SUN_TZU_PLACEHOLDER;
  if(input.includes(SUN_TZU_PLACEHOLDER)) return input;
  const marker=/📜 Императорская стратегия в духе Сунь-цзы:\s*[\s\S]*?(?=\n\s*🧠 Смысл:)/u;
  if(marker.test(input)) return input.replace(marker,SUN_TZU_PLACEHOLDER+"\n");
  const at=input.search(/(?:🧬 Психотерапевтический смысл|🪞 Аффирмации)/u);
  if(at>=0) return input.slice(0,at)+SUN_TZU_PLACEHOLDER+"\n\n"+input.slice(at);
  return input+"\n\n"+SUN_TZU_PLACEHOLDER;
}
