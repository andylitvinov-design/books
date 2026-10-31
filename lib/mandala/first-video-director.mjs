/**
 * First free video: private, deterministic storyboard preparation.
 * This is not text-to-video diffusion. Only original approved visual scenes
 * from the existing local Canvas renderer can be exported here.
 *
 * No raw client wish is returned in the generated provider-facing prompt.
 * The optional external LLM enhancement is a separate, opt-in API.
 */
import { buildCinematicStoryboard, CINEMATIC_STYLES, CINEMATIC_THEMES } from "./cinematic-director.mjs";
import { graphemeTrim } from "./personal-video-intent.mjs";

const LOCAL_KEYWORDS = Object.freeze({
  money: /деньг|доход|заработ|финанс|бизнес|работ|клиент|продаж|оплат|достат|prosper|money|income|business|client|salary|finance|revenue|dinero|negocio|ingres|trabaj/iu,
  relationships: /отношен|любов|сердц|близост|партн[её]р|довер|дружб|семь|семь[её]|relationship|love|heart|partner|trust|friend|family|relaci[oó]n|amor|pareja|familia/iu,
  health: /отдых|расслаб|здоров|восстанов|сон|спокой|тишин|релакс|покой|wellbeing|health|rest|sleep|relax|recovery|calm|salud|descans|relaja|tranquil/iu,
  goals: /цель|мечт|будущ|путь|смысл|новый этап|проект|предназначен|goal|dream|future|purpose|path|project|meta|futuro|prop[oó]sito|camino/iu,
  life: /жизн|природ|лес|море|вода|цвет|сад|пейзаж|nature|forest|garden|flower|life|beach|naturaleza|bosque|jard[ií]n|vida|playa/iu,
  energy: /энерг|сил|свет|солнц|движен|бодр|power|energy|light|sun|vital|renew|energ[ií]a|luz|fuerza|vitalidad/iu,
});
const SPECIFIC_SCENE_REQUEST = /(?:реб[её]нок|девочк|мальчик|женщин|мужчин|лиц[оа]|портрет|человек|животн|собак|кошк|волк|ор[её]л|птиц|геро[йя]|персонаж|фотореалист|собственный мир|girl|boy|woman|man|person|face|portrait|animal|wolf|cat|dog|eagle|bird|character|photoreal|ni[ñn]o|ni[ñn]a|persona|animal|lobo|[aá]guila)/iu;
const COPY = Object.freeze({
  ru: {
    lead: "Плавный бесплатный видеоролик из существующих анимированных сцен Holistic House.",
    scenes: "Подтверждённые сцены",
    transition: "Мягкие переходы, спокойная камера, без мерцаний, резких вспышек, логотипов и неразрешённых изображений людей.",
    note: "Некоторые пожелания требуют отдельной AI-видеомодели: бесплатный режим не рисует новых людей, животных и фотореалистичных событий.",
  },
  en: {
    lead: "A smooth free video assembled from the existing animated Holistic House scenes.",
    scenes: "Verified existing scenes",
    transition: "Gentle transitions and stable camera; no flicker, flashes, logos or unlicensed depictions of people.",
    note: "Some wishes require a separate AI video model: free mode does not invent people, animals or photoreal events.",
  },
  es: {
    lead: "Vídeo gratis con las escenas animadas existentes de Holistic House.",
    scenes: "Escenas disponibles y verificadas",
    transition: "Transiciones suaves y cámara estable, sin destellos, parpadeos, logos ni personas sin permiso.",
    note: "Algunas ideas requieren otro modelo de vídeo: el modo gratis no crea personas, animales ni eventos fotorrealistas nuevos.",
  },
});

const validLocale = (locale) => ["ru", "en", "es"].includes(locale) ? locale : "en";
const allowed = (value, values, fallback) => values.includes(value) ? value : fallback;
const text = (value, length) => graphemeTrim(typeof value === "string" ? value : "", length).trim();

export function inferFirstVideoTheme(wish, preferred = "auto") {
  if (CINEMATIC_THEMES.includes(preferred)) return preferred;
  const normalized = text(wish, 800);
  for (const theme of ["money", "relationships", "health", "goals", "life", "energy"]) {
    if (LOCAL_KEYWORDS[theme].test(normalized)) return theme;
  }
  return "energy";
}

/**
 * Only existing scene IDs are returned. The generated prompt describes the
 * actual local visual sequence, not imaginary text-to-video output.
 */
export function buildFirstVideoDraft(input = {}) {
  const locale = validLocale(input.locale);
  const wish = text(input.wish, 800);
  const manual = text(input.promptOverride, 1000);
  const theme = inferFirstVideoTheme(wish || manual, input.theme);
  const durationSeconds = allowed(Number(input.durationSeconds), [20, 30, 60], 20);
  const aspect = allowed(input.aspect, ["portrait", "landscape", "square"], "landscape");
  const style = Object.hasOwn(CINEMATIC_STYLES, input.style) ? input.style : "warm";
  const avoid = text(input.avoid, 140);
  // An edited prompt can change which of the allowed scenes the local renderer uses.
  const visualCue = manual ? manual + " " + wish : wish;
  const plan = buildCinematicStoryboard({
    locale, theme, durationSeconds, aspect, style, wish: visualCue, avoid,
    mode: "creative",
  });
  const copy = COPY[locale];
  const size = aspect === "portrait" ? "9:16" : aspect === "square" ? "1:1" : "16:9";
  const aiReadyPrompt = [
    copy.lead,
    String(durationSeconds) + "s · " + size + " · " + CINEMATIC_STYLES[style].name[locale] + ".",
    copy.scenes + ":",
    ...plan.shots.map((shot, index) =>
      String(index + 1) + ". " + shot.visualCue + " (" + shot.durationSeconds + "s)"),
    copy.transition,
  ].join("\n");
  const unsupported = SPECIFIC_SCENE_REQUEST.test(wish + " " + manual);
  return Object.freeze({
    locale, wish, theme, durationSeconds, aspect, style,
    prompt: aiReadyPrompt,
    editedPrompt: manual || null,
    descriptionLimited: unsupported,
    limitationNote: unsupported ? copy.note : "",
    // Original local storyboard & renderer; no imported AI provider clips.
    plan, free: true, mediaSource: "local_canvas", aiMediaGenerated: false,
  });
}
