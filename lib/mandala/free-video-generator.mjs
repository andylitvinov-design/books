/**
 * First-party, deterministic visual-intent compiler. This is NOT text-to-video AI.
 * It selects one of three NEW procedural motif engines and parameterizes them.
 * No network, profile lookup, photos, raw personal goal, or external AI call.
 */
export const FREE_VIDEO_VERSION = "hh-free-procedural-v1";
export const FREE_VIDEO_FAMILIES = Object.freeze(["mandala","light","lotus"]);
export const FREE_VIDEO_PALETTES = Object.freeze(["gold","ocean","violet"]);
export const FREE_VIDEO_MOTIONS = Object.freeze(["calm","flow","dynamic"]);
const THEMES = Object.freeze(["money","energy","relationships","goals","life","health"]);
const LOCALES = Object.freeze(["ru","en","es"]);
const LIMIT=280;

const MOTIFS=Object.freeze({
  lotus:/(лотос|цвет(ок|ы|ок|к)|раскрыва|лепест|lotus|flower|petal|blossom|flor|flores|p[eé]talo|loto|agua y flor)/i,
  mandala:/(мандал|геомет|янтр|узор|орнамент|фрактал|mandala|geometr|yantra|ornament|sacred pattern|patr[oó]n)/i,
  light:/(свет|сияни|луч|энерг|портал|частиц|звезд|звёзд|аура|поток|light|glow|ray|beam|portal|particle|star|energy|radiant|luz|brillo|energ[ií]a|part[ií]cula|estrella)/i,
});
const COLOR_WORDS=Object.freeze({
  gold:/(золот|ж[её]лт|т[её]пл|янтар|солнеч|gold|amber|sun|warm|yellow|dorado|amarillo|c[aá]lido)/i,
  ocean:/(син|голуб|бирюз|мор|вод|океан|лазур|blue|cyan|teal|turquoise|ocean|water|aqua|azul|mar|agua)/i,
  violet:/(фиолет|лилов|розов|сирен|purple|violet|pink|lavender|magenta|morado|rosa|violeta)/i,
});
const MOTION_WORDS=Object.freeze({
  dynamic:/(быстр|мощн|сильно|взрыв|rapid|fast|powerful|dynamic|burst|r[aá]pido|en[eé]rgico|fuerte)/i,
  calm:/(медлен|мягк|нежн|плавн|спокой|тихо|slow|soft|gentle|calm|peaceful|quiet|lent|suave|tranquilo|sereno)/i,
});
const DEFAULT_FAMILY=Object.freeze({
  money:"mandala",energy:"light",relationships:"lotus",goals:"light",life:"lotus",health:"lotus"
});
const EXAMPLES=Object.freeze({
  ru:"Золотой лотос медленно раскрывается над водой, мягкие лучи света",
  en:"A golden lotus slowly opens above water, surrounded by soft light",
  es:"Un loto dorado se abre lentamente sobre el agua, rodeado de luz suave",
});
export const FREE_VIDEO_EXAMPLES=EXAMPLES;

export function cleanVisualDescription(value){
  return typeof value==="string"
    ? Array.from(value.replace(/[\u0000-\u001f\u007f]/g," ").trim()).slice(0,LIMIT).join("")
    : "";
}
function stableHash(value){
  let h=2166136261;
  for(const char of value){
    h^=char.codePointAt(0);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}
function detectFamily(value){
  // A named focal object takes precedence over its background light. A lotus
  // surrounded by rays must still produce blooming petals, not a generic glow.
  for(const family of ["lotus","mandala","light"])if(MOTIFS[family].test(value))return family;
  return null;
}
function selectPalette(value,theme){
  for(const palette of FREE_VIDEO_PALETTES)if(COLOR_WORDS[palette].test(value))return palette;
  return ["energy","health"].includes(theme)?"ocean":theme==="relationships"?"violet":"gold";
}
function selectMotion(value){
  if(MOTION_WORDS.dynamic.test(value))return "dynamic";
  if(MOTION_WORDS.calm.test(value))return "calm";
  return "flow";
}
export function buildFreeVideoPlan({
  description="",theme="energy",locale="ru",family="auto",palette="auto",
  motion="auto",variation=0,durationSeconds=30,
}={}){
  if(!THEMES.includes(theme)||!LOCALES.includes(locale)||
    !(family==="auto"||FREE_VIDEO_FAMILIES.includes(family))||
    !(palette==="auto"||FREE_VIDEO_PALETTES.includes(palette))||
    !(motion==="auto"||FREE_VIDEO_MOTIONS.includes(motion))||
    !Number.isInteger(variation)||variation<0||variation>9999||
    ![10,20,30,60].includes(durationSeconds))
      throw Error("invalid_free_video_options");
  const descriptionText=cleanVisualDescription(description);
  const normalized=descriptionText.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase();
  const detected=detectFamily(normalized);
  const selectedFamily=family==="auto"?(detected||DEFAULT_FAMILY[theme]):family;
  const selectedPalette=palette==="auto"?selectPalette(normalized,theme):palette;
  const selectedMotion=motion==="auto"?selectMotion(normalized):motion;
  const basis=[normalized,theme,selectedFamily,selectedPalette,selectedMotion].join("|");
  const seed=(stableHash(basis)^Math.imul(variation+1,0x9e3779b1))>>>0;
  return Object.freeze({
    version:FREE_VIDEO_VERSION,source:"local_procedural",
    family:selectedFamily,palette:selectedPalette,motion:selectedMotion,
    theme,locale,seed,variation,durationSeconds,
    hasRecognizedMotif:detected!==null,
    recognition:detected||"fallback",
    // Human words remain solely in the component's local textarea.
    // No raw description, profile or health data inside a job manifest.
    descriptionLength:descriptionText.length,
    framesFromReadyVideo:false,paidProviderRequired:false,
  });
}
