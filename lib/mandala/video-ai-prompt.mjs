/**
 * Local and auditable film brief from the visitor's VISUAL choices.
 * No client psychological profile, stored tests, private notes, diagnoses
 * or provider-specific secrets. Does not call the network.
 */
const SCENES=Object.freeze({
  mandala:"intricate sacred geometric mandala made of luminous petal-like rings",
  light:"soft glowing rays and floating warm particles in a deep cinematic space",
  lotus:"large photorealistic lotus blossom opening slowly above quiet reflective water",
  nature:"calm natural landscape with atmospheric sunlight and distant layers",
  water:"peaceful surface ripples with delicate moving reflections",
  temple:"symbolic light-filled architectural portal, no people",
});
const THEMES=Object.freeze({
  money:"confidence and opportunities symbolized through gentle golden warmth",
  energy:"renewal and vitality expressed through a calm awakening of light",
  relationships:"warm connection represented by symmetrical soft glowing shapes",
  goals:"a clear pathway opening toward a bright, peaceful horizon",
  life:"organic growth and meaning in natural light and open space",
  health:"peaceful natural imagery suitable for a brief relaxation exercise",
});
const COLORS=Object.freeze({
  gold:"warm amber, cream and emerald highlights",
  ocean:"deep teal and soft aquatic blue",
  violet:"restrained lavender, violet and rose-gold highlights",
});
const MOTIONS=Object.freeze({
  calm:"stable camera, one very slow push-in, no abrupt cuts",
  flow:"slow gentle dolly and soft foreground parallax",
  dynamic:"smooth cinematic orbit with moderate, controlled movement",
});
const CUES=Object.freeze({
  "golden-rain":"warm floating golden light and softly glowing reflections",
  "solar-surge":"golden sunrise and wide peaceful meadow",
  "mountain-air":"beautiful open mountain ridges with a peaceful misty horizon",
  "morning-dew":"tiny sunlit dew drops over green grass",
  "meadow-morning":"a calm meadow under soft early morning sunlight",
  "wealth-sunrise":"clear golden sunrise over a broad tranquil landscape",
});
// Only these authored phrases can be added by a visitor's visual description.
// Never send the original description, even if it looks like ordinary scenery.
const VISUAL_CUES=Object.freeze([
  {detect:/(лотос|lotus|loto)/i,phrase:"a gently opening luminous lotus blossom"},
  {detect:/(вода|озеро|океан|море|\bwater\b|\blake\b|\bocean\b|\bsea\b|\bagua\b|\blago\b|\bmar\b)/i,
    phrase:"a quiet reflective surface of water"},
  {detect:/(храм|святилищ|temple|sanctuary|templo|santuario)/i,
    phrase:"a symbolic light-filled temple without people"},
  {detect:/(дерево|лес|дуб|\btree\b|\bforest\b|\boak\b|[aá]rbol|\bbosque\b)/i,
    phrase:"a softly lit tree with natural layered foliage"},
  {detect:/(сад|цветущ|garden|flowers|jard[ií]n|flores)/i,
    phrase:"a serene flowering garden in warm daylight"},
  {detect:/(космос|галактик|созвезд|cosmos|cosmic|galaxy|stars|galaxia|estrellas)/i,
    phrase:"a tranquil starfield with gentle parallax"},
  {detect:/(туннел|тоннел|tunnel|t[uú]nel)/i,
    phrase:"a deep tunnel of soft glowing light"},
  {detect:/(горы|горн|mountain|mountains|monta[nñ]a)/i,
    phrase:"calm distant mountain ridges"},
  {detect:/(утро|восход|рассвет|sunrise|dawn|amanecer)/i,
    phrase:"gentle early morning sunlight"},
]);
export function compileVideoVisualPrompt({
  theme="energy",scene="nature",color="gold",motion="calm",
  visualDescription="",locale="en",
}={}){
  if(!Object.hasOwn(THEMES,theme)||!["ru","en","es"].includes(locale))
    throw Error("invalid_visual_brief");
  const sceneKey=Object.hasOwn(SCENES,scene)?scene:"nature";
  const motif=SCENES[sceneKey];
  const palette=Object.hasOwn(COLORS,color)?COLORS[color]:COLORS.gold;
  const camera=Object.hasOwn(MOTIONS,motion)?MOTIONS[motion]:MOTIONS.calm;
  // A free-form visitor description must NEVER be copied to a third-party
  // AI-video prompt. A deny-list cannot reliably remove names, diagnoses or
  // masked identifiers across RU/EN/ES. Only approved visual cue strings
  // assembled from this intentionally small dictionary may leave the device.
  const visual=typeof visualDescription==="string"
    ?visualDescription.normalize("NFKC").toLowerCase().slice(0,280):"";
  const safeVisual=VISUAL_CUES.filter(entry=>entry.detect.test(visual))
    .slice(0,4).map(entry=>entry.phrase).join(", ");
  return [
    "One independent cinematic visual shot.",
    "Scene: "+motif+".",
    safeVisual ? "Additional curated scenery: "+safeVisual+"." : "",
    "Visual theme: "+THEMES[theme]+".",
    "Lighting and palette: "+palette+".",
    "Camera: "+camera+".",
    "Real moving image. Continuous and visually coherent. No lettering, no logos, no real people, no dialogue.",
  ].filter(Boolean).join(" ").slice(0,800);
}
