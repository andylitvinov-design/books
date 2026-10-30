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
  // Strictly optional; a user-entered private request is NOT silently
  // concatenated into outbound provider text. The client can choose to edit
  // the standalone PROMPT field and independently confirm external consent.
  const visual=typeof visualDescription==="string"
    ?visualDescription.trim().replace(/[\u0000-\u001f\u007f]/g," ").slice(0,280):"";
  const safeVisual=visual && !/(@|(?:\+?\d[\s().-]*){9,}|диагноз|пациент|травм|medical record|diagnos)/i.test(visual)
    ?visual:null;
  return [
    "One independent cinematic visual shot.",
    safeVisual ? "Requested visible composition: "+safeVisual+"." : "Scene: "+motif+".",
    "Visual theme: "+THEMES[theme]+".",
    "Lighting and palette: "+palette+".",
    "Camera: "+camera+".",
    "Real moving image. Continuous and visually coherent. No lettering, no logos, no real people, no dialogue.",
  ].join(" ").slice(0,800);
}
