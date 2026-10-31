/** Original, reusable style DNA. Style never grants clinical permissions. */
import { WRITER_STYLES } from "./contract.mjs";
const styles = [
  ["gentle_simple","low","short_calm",
    {ru:"мягкая, ясная, уважительная речь",en:"gentle, clear, respectful speech",es:"lenguaje suave, claro y respetuoso"},
    ["agency_language","sensory_anchor","soft_return"]],
  ["grounded_practical","low","plain_short",
    {ru:"конкретная речь без лишней образности",en:"specific, clear, low-metaphor prose",es:"lenguaje concreto con pocas metáforas"},
    ["agency_language","spoken_parallelism","soft_return"]],
  ["poetic_contained","medium","varied_short_medium",
    {ru:"образная проза с одним центральным мотивом",en:"vivid prose with one central image",es:"prosa evocadora con una imagen central"},
    ["progressive_image","gentle_contrast","quiet_pause"]],
  ["contemplative","low","measured_reflective",
    {ru:"созерцательная речь, открытые вопросы, тишина",en:"reflective prose, open questions, quiet",es:"lenguaje contemplativo, preguntas abiertas y silencio"},
    ["open_question","quiet_pause","soft_return"]],
];
export const LITERARY_STYLES = Object.freeze(Object.fromEntries(styles.map(
  ([id,metaphorDensity,cadence,description,techniques])=>[id,Object.freeze({
    id,metaphorDensity,cadence,description:Object.freeze(description),
    techniques:Object.freeze(techniques),maxCentralImages:1,maxSupportingMetaphors:3,
    voiceFriendly:true,unforced:true,
  })]
)));
export const LITERARY_TECHNIQUES=Object.freeze({
  progressive_image:"Unfold one main image with a small number of connected details.",
  sensory_anchor:"Offer an optional neutral sensory detail, not a compulsory body scan.",
  agency_language:"Prefer possibility and choice; allow open eyes or stopping.",
  spoken_parallelism:"Use short linked sentences, avoiding repeated commands.",
  gentle_contrast:"Contrast movement and steadiness without conflict or threat.",
  quiet_pause:"Place an optional pause after a complete thought.",
  soft_return:"Return to present-day surroundings, allowing different reactions.",
  open_question:"Invite reflection without demanding an answer or fixed interpretation.",
  gentle_refrain:"Repeat a thought only when it gains a new context.",
  natural_transition:"Move through one coherent landscape rather than unrelated scenes.",
  bounded_imagery:"Keep imagery light, non-clinical and optional.",
  rhythm_without_breath:"Use sentence rhythm without breath-control directions.",
});
export function getLiteraryStyle(styleId,locale) {
  if (!WRITER_STYLES.includes(styleId) || !["ru","en","es"].includes(locale)) return null;
  const source=LITERARY_STYLES[styleId];
  return Object.freeze({...source,locale,description:source.description[locale]});
}
/**
 * Owned-original, short editorial reference *fragments*, not medical protocols.
 * These do not bypass the Psychologist Mind's allowed motif list.
 */
export const ORIGINAL_STYLE_EXAMPLES = Object.freeze({
  ru:Object.freeze({
    gentle_simple:"Можно представить спокойное место. А можно просто услышать эти слова и заметить, где вы сейчас.",
    grounded_practical:"Посмотрите, что находится рядом. Вы вправе выбрать один небольшой следующий шаг или пока ничего не менять.",
    poetic_contained:"На светлом склоне растёт дерево. Ветер касается его ветвей, а пространство вокруг остаётся открытым.",
    contemplative:"Пусть это будет лишь возможностью остановиться. Ничего не нужно объяснять. Ответ может прийти позже.",
  }),
  en:Object.freeze({
    gentle_simple:"You may picture a quiet place, or simply listen and notice where you are.",
    grounded_practical:"Notice something nearby. You can choose one small next step or change nothing for now.",
    poetic_contained:"A tree grows on a sunlit slope. Wind moves through its branches; the space around it remains open.",
    contemplative:"This can be a moment to pause. Nothing needs explaining. An answer may come later.",
  }),
  es:Object.freeze({
    gentle_simple:"Puedes imaginar un lugar tranquilo, o simplemente escuchar y observar dónde estás.",
    grounded_practical:"Observa algo cercano. Puedes elegir un paso pequeño o dejar las cosas como están por ahora.",
    poetic_contained:"Un árbol crece en una ladera luminosa. El viento mueve sus ramas y el espacio sigue abierto.",
    contemplative:"Este puede ser un momento para detenerse. No hace falta explicar nada. La respuesta puede llegar después.",
  }),
});
