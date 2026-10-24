// 52 NEW editorial continuations commissioned for Holistic House, in the established
// Russian archetypal/imperial format. They are not verified original author publications.
// Keep the 12 verified Telegram/Drive texts in dao-hexagram-author.json unchanged.
import batch01 from "./dao-hexagrams-editorial/01-11.mjs";
import batch02 from "./dao-hexagrams-editorial/13-17.mjs";
import batch03 from "./dao-hexagrams-editorial/18-22.mjs";
import batch04 from "./dao-hexagrams-editorial/25-29.mjs";
import batch05 from "./dao-hexagrams-editorial/31-36.mjs";
import batch06 from "./dao-hexagrams-editorial/37-41.mjs";
import batch07 from "./dao-hexagrams-editorial/43-48.mjs";
import batch08 from "./dao-hexagrams-editorial/50-54.mjs";
import batch09 from "./dao-hexagrams-editorial/55-60.mjs";
import batch10 from "./dao-hexagrams-editorial/61-63.mjs";
import { getHexagram, trigramInfo, daoAuthorHexagramNumbers } from "./dao-hexagrams.mjs";
import { SUN_TZU_PLACEHOLDER } from "./dao-sunzi-display.mjs";

const archived = new Set(daoAuthorHexagramNumbers);
const drafts = Object.freeze([
  ...batch01, ...batch02, ...batch03, ...batch04, ...batch05,
  ...batch06, ...batch07, ...batch08, ...batch09, ...batch10,
].sort((a, b) => a.n - b.n));
const numberToDraft = new Map(drafts.map((draft) => [draft.n, draft]));
if (drafts.length !== 52 || numberToDraft.size !== 52 ||
    drafts.some(({ n }) => archived.has(n) || !getHexagram(n))) {
  throw new Error("DAO_EDITORIAL_INVALID: 52 distinct new interpretations required without altering original archive.");
}
for (const draft of drafts) {
  if (!draft.headline || !draft.formula || !draft.nature || !draft.core ||
      !draft.guidance || !draft.strategy || !draft.psyche || !draft.image ||
      draft.actions?.length !== 4 || draft.risks?.length !== 3 ||
      draft.affirmations?.length !== 4) throw new Error("DAO_EDITORIAL_INCOMPLETE: " + draft.n);
}
export const daoEditorialHexagramNumbers = Object.freeze(drafts.map((draft) => draft.n));
export const daoEditorialHexagramCount = daoEditorialHexagramNumbers.length;

function formatReading(draft) {
  const item = getHexagram(draft.n);
  const above = trigramInfo[item.upper].ru;
  const below = trigramInfo[item.lower].ru;
  const natureSymbol = {
    heaven: "☰", earth: "🌍", water: "🌊", thunder: "⚡",
    wind: "🌬️", fire: "🔥", mountain: "🏔️", lake: "☱",
  };
  const motif = natureSymbol[item.upper] + natureSymbol[item.lower];
  return [
    "Гексаграмма " + item.number + ". " + item.hanzi + " — " + above + " над " + below + " (" + item.ru + ")",
    draft.headline,
    "🐉 Императорская формула:",
    draft.formula,
    motif + " Смысл и образ стихий:",
    draft.nature,
    "🧠 Ключевой смысл:",
    draft.core,
    "🧭 Тактика и путь:",
    draft.actions.join("\n"),
    "⚠️ Опасности:",
    draft.risks.join("\n"),
    "🐲 Императорская подсказка:",
    draft.guidance,
    SUN_TZU_PLACEHOLDER,
    "🧬 Психотерапевтический смысл:",
    draft.psyche,
    "🪞 Аффирмации:",
    draft.affirmations.map((line) => "«" + line + "»").join("\n"),
    "🖼 Образ:",
    draft.image,
  ].join("\n\n");
}
const formatted = new Map(drafts.map((draft) => [draft.n, formatReading(draft)]));

export function getDaoEditorialHexagramText(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 64) return null;
  return formatted.get(n) ?? null;
}
