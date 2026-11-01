/**
 * First free video: private, deterministic storyboard preparation.
 * This is not text-to-video diffusion. Only approved, licensed first-party
 * MP4 scenes are assembled by the existing local Canvas renderer.
 *
 * No raw client wish is returned in the generated provider-facing prompt.
 * The optional external LLM enhancement is a separate, opt-in API.
 */
import { buildCinematicStoryboard, customizeCinematicShot, CINEMATIC_STYLES, CINEMATIC_THEMES } from "./cinematic-director.mjs";
import { graphemeTrim } from "./personal-video-intent.mjs";
import { allocateFreeFilmTimeline } from "./free-film-timeline.mjs";
import licensedCatalog from "../../data/video-catalog/scene-taxonomy.json" with {type:"json"};

const LICENSED_SCENES = new Map(licensedCatalog.scenes
  .filter(scene=>scene.status==="approved"&&scene.media==="licensed_mp4"&&
    /^\/videos\/holistic-house\/[a-z0-9_/-]+\.mp4$/.test(scene.video))
  .map(scene=>[scene.id,scene]));
export const FIRST_VIDEO_FOOD_CANVAS_PLAN_VERSION="hh-local-food-canvas-v1";
const FOOD_CANVAS_IDS=Object.freeze([
  "food-fruit-bowl","food-vegetable-prep","food-soup-bowl","food-bread-table",
]);
const EXCLUDED_SCENE_GROUPS = [
  {input:/(?<!\p{L})(?:вод(?:а|ы|у|е|ой|ами|ный|ные|ных)?|водопад\p{L}*|мор(?:е|я|ю|ем|ей|ях|ск\p{L}*)|океан\p{L}*|рек(?:а|и|у|ой|е)?|руч(?:ей|ья|ью|ьи)|волн\p{L}*|waters?|seas?|oceans?|rivers?|streams?|falls?|waves?|agua|mar|r[ií]os?|cascadas?)(?!\p{L})/iu,
    media:/sea|ocean|coast|water|river|stream|falls|shore|beach|lake|wave|dew|mist/iu},
  {input:/(?<!\p{L})(?:лес(?:а|у|ом|е|ов|ной|ные|ных|ного)?|дерев(?:о|а|ья|ьев|ьям)|папорот\p{L}*|forests?|trees?|woods?|ferns?|bosques?|[aá]rbol(?:es)?)(?!\p{L})/iu,
    media:/forest|tree|fern|roots?|wood/iu},
  {input:/(?<!\p{L})(?:темнот\p{L}*|ноч(?:ь|и|ью|ной|ные|ных)|зв[её]зд\p{L}*|dark(?:ness)?|nights?|stars?|oscuro|noches?|estrellas?)(?!\p{L})/iu,
    media:/night|stars?|dark/iu},
  {input:/(?<!\p{L})(?:гор(?:а|ы|у|ах|ами|ной|ные|ных)|mountains?|monta[ñn]as?)(?!\p{L})/iu,media:/mountain/iu},
  {input:/(?<!\p{L})(?:цвет(?:ы|ов|ок|ка|ами|очные|ущие)|flowers?|flores?)(?!\p{L})/iu,media:/flowers?|bloom|blossom/iu},
  {input:/(?<!\p{L})(?:солнц\p{L}*|солнечн\p{L}*|рассвет\p{L}*|закат\p{L}*|sun|sunrise|sunset|sol|amanecer|atardecer)(?!\p{L})/iu,
    media:/sun|sunrise|sunset/iu},
  {input:/(?<!\p{L})(?:свет\p{L}*|сияни\p{L}*|light|rays?|luz|rayos?)(?!\p{L})/iu,media:/light|rays?|glow/iu},
  {input:/(?<!\p{L})(?:люд\p{L}*|человек\p{L}*|people|persons?|personas?)(?!\p{L})/iu,media:/people|person/iu},
];
function licensedSceneAllowed(scene,avoid){
  if(!avoid)return true;
  const media=[scene.id,...scene.tags,...scene.motifs].join(" ");
  return !EXCLUDED_SCENE_GROUPS.some(rule=>rule.input.test(avoid)&&rule.media.test(media));
}
function requireSupportedExclusions(avoid){
  if(!avoid)return;
  const terms=avoid.split(/[,;]+|\s+(?:и|или|and|or|y|o)\s+/iu).map(term=>term.trim()).filter(Boolean);
  if(terms.some(term=>!EXCLUDED_SCENE_GROUPS.some(rule=>rule.input.test(term))))
    throw Error("unsupported_scene_exclusion");
}

const LOCAL_KEYWORDS = Object.freeze({
  money: /деньг|доход|заработ|финанс|бизнес|работ|клиент|продаж|оплат|достат|prosper|money|income|business|client|salary|finance|revenue|dinero|negocio|ingres|trabaj/iu,
  relationships: /отношен|любов|сердц|близост|партн[её]р|довер|дружб|семь|семь[её]|relationship|love|heart|partner|trust|friend|family|relaci[oó]n|amor|pareja|familia/iu,
  health: /отдых|расслаб|здоров|восстанов|сон|спокой|тишин|релакс|покой|wellbeing|health|rest|sleep|relax|recovery|calm|salud|descans|relaja|tranquil/iu,
  goals: /цель|мечт|будущ|путь|смысл|новый этап|проект|предназначен|goal|dream|future|purpose|path|project|meta|futuro|prop[oó]sito|camino/iu,
  life: /жизн|природ|лес|море|вода|цвет|сад|пейзаж|nature|forest|garden|flower|life|beach|naturaleza|bosque|jard[ií]n|vida|playa/iu,
  energy: /энерг|сил|свет|солнц|движен|бодр|power|energy|light|sun|vital|renew|energ[ií]a|luz|fuerza|vitalidad/iu,
});
const SPECIFIC_SCENE_REQUEST = /(?:реб[её]нок|девочк|мальчик|женщин|мужчин|лиц[оа]|портрет|человек|животн|собак|кошк|волк|ор[её]л|птиц|геро[йя]|персонаж|фотореалист|собственный мир|girl|boy|woman|man|person|face|portrait|animal|wolf|cat|dog|eagle|bird|character|photoreal|ni[ñn]o|ni[ñn]a|persona|animal|lobo|[aá]guila)/iu;

// Food is an explicit visual request: show the existing first-party Canvas
// illustrations, not unrelated licensed harvest clips or invented food MP4s.
const FOOD_PATTERN = /(?<![\p{L}])(?:еда|еды|едой|food|foods|meal|meals|cooking|cook|recipe|recipes|dish|dishes|comida|comidas|alimento|alimentos|cocina|receta|recetas|пищ|кулинар|готовк|рецепт|блюд|завтрак|обед|ужин|десерт|фрукт|овощ|пицц|кухн|продукт|breakfast|lunch|dinner|dessert|fruit|vegetable|kitchen|cocinar|desayun|almuerz|cena|postre|frut|verdura)/iu;

// The visitor's visual subject outranks abstract therapy themes.
// IDs are existing approved scenes, never imaginary food footage.
export const FIRST_VIDEO_VISUAL_MOTIFS = Object.freeze([
  {id:"food",theme:"life",pattern:FOOD_PATTERN,
    scenes:["food-fruit-bowl","food-vegetable-prep","food-soup-bowl","food-bread-table"]},
  {id:"mountains",theme:"energy",pattern:/гор(?:ы|а|е|у|ой|ами|ах|н(?:ый|ая|ое|ые))|вершин|скал|mountain|summit|peaks?|monta[ñn]a|sierras?/iu,
    scenes:["mountain-air","sunbeam-flow","guiding-stars","light-path","sun-flight","desert-light"]},
  {id:"waterfall",theme:"energy",pattern:/водопад|waterfall|cascada/iu,
    scenes:["light-waterfall","gentle-falls","river-power","mossy-stream","sunbeam-flow","morning-dew"]},
  {id:"forest",theme:"life",pattern:/лес|дерев|роща|forest|woods?|tree|bosque|[aá]rbol/iu,
    scenes:["fern-awakening","lone-tree","meadow-morning","morning-dew","meaning-tree","sunbeam-flow"]},
  {id:"sea",theme:"health",pattern:/мор(?:е|я|ю|ем|ской)|океан|волны|sea|ocean|waves?|playa|mar|oc[eé]ano|olas?/iu,
    scenes:["calm-sea","ocean-pulse","coastal-freedom","sea-breeze","prosperity-coast","sun-flight"]},
  {id:"river",theme:"health",pattern:/рек[аиу]|речк|руч[её]й|river|stream|r[ií]o|arroyo/iu,
    scenes:["mossy-stream","river-power","gentle-falls","morning-dew","fern-awakening","sunbeam-flow"]},
  {id:"flowers",theme:"life",pattern:/цвет|сад|луг|garden|flowers?|blossom|jard[ií]n|flores?|pradera/iu,
    scenes:["wildflower-dance","blossom-garden","meadow-morning","morning-dew","fern-awakening","sun-flight"]},
  {id:"desert",theme:"energy",pattern:/пустын|песок|desert|dunes?|desierto|arena/iu,
    scenes:["desert-light","sunbeam-flow","mountain-air","sun-flight","guiding-stars","solar-surge"]},
  {id:"stars",theme:"goals",pattern:/звезд|звёзд|космос|stars?|galaxy|galaxia|estrellas?|cielo nocturno/iu,
    scenes:["guiding-stars","cosmic-flow","sun-flight","mountain-air","light-path","gentle-shield"]},
  {id:"sunrise",theme:"energy",pattern:/рассвет|закат|солнц|sunrise|sunset|dawn|amanecer|atardecer|sol/iu,
    scenes:["sun-flight","solar-surge","wealth-sunrise","sunbeam-flow","meadow-morning","mountain-air"]},
]);
const LOCAL_SCENE_CUES = Object.freeze({
  "food-fruit-bowl":{ru:"анимированная иллюстрация: миска с яблоками, цитрусами и виноградом",es:"ilustración animada: cuenco con manzanas, cítricos y uvas"},
  "food-vegetable-prep":{ru:"анимированная иллюстрация: свежие овощи на разделочной доске",es:"ilustración animada: verduras frescas sobre tabla de madera"},
  "food-soup-bowl":{ru:"анимированная иллюстрация: горячий овощной суп с зеленью",es:"ilustración animada: sopa de verduras con vapor"},
  "food-bread-table":{ru:"анимированная иллюстрация: свежий хлеб на деревянном столе",es:"ilustración animada: pan sobre mesa de madera"},
  "solar-surge":{ru:"солнечный свет пробуждает широкий луг",es:"luz del sol sobre una amplia pradera"},
  "ocean-pulse":{ru:"спокойная голубая вода и медленные волны",es:"agua azul tranquila y olas lentas"},
  "gentle-shield":{ru:"мягкий свет образует защитный круг",es:"luz suave que forma un círculo protector"},
  "sun-flight":{ru:"золотистый солнечный свет движется по небу",es:"luz dorada del sol a través del cielo"},
  "wealth-sunrise":{ru:"естественный рассвет над просторным пейзажем",es:"amanecer natural sobre un gran paisaje"},
  "abundance-tree":{ru:"взрослое дерево в утреннем золотистом свете",es:"árbol maduro en luz dorada matinal"},
  "golden-shield":{ru:"мягкое янтарное сияние над поляной",es:"luz ámbar sobre un claro"},
  "path-to-goals":{ru:"извилистая тропа среди природного пейзажа",es:"sendero sinuoso en un paisaje natural"},
  "blossom-garden":{ru:"цветущий сад и открытое тёплое пространство",es:"jardín florecido con espacio abierto"},
  "two-circles":{ru:"два уравновешенных кольца отражённого света",es:"dos anillos equilibrados de luz"},
  "warm-connection":{ru:"два пересекающихся круга мягкого дневного света",es:"dos círculos de luz diurna que se cruzan"},
  "heart-light":{ru:"тёплый свет разливается по открытому саду",es:"luz cálida sobre un jardín abierto"},
  "light-path":{ru:"освещённая солнцем тропа вдаль",es:"sendero soleado hacia el horizonte"},
  "guiding-stars":{ru:"нежные звёзды над ясным далёким горизонтом",es:"estrellas suaves sobre un horizonte claro"},
  "open-door":{ru:"простая дверь открывается навстречу дневному свету",es:"una puerta sencilla se abre a la luz natural"},
  "meaning-tree":{ru:"дерево с крепкими корнями и широкими ветвями",es:"árbol de raíces firmes y ramas extensas"},
  "meadow-morning":{ru:"тихий луг в первых лучах утра",es:"pradera tranquila a primera luz"},
  "lone-tree":{ru:"одинокое взрослое дерево среди полей",es:"un árbol maduro en un campo abierto"},
  "coastal-freedom":{ru:"широкий песчаный берег и открытое небо",es:"amplia costa arenosa y cielo abierto"},
  "fern-awakening":{ru:"папоротник раскрывается в мягком зелёном лесу",es:"helecho abriéndose en un bosque verde"},
  "calm-sea":{ru:"очень спокойное море под утренним небом",es:"mar sereno bajo el cielo matutino"},
  "mossy-stream":{ru:"прозрачный ручей течёт по замшелым камням",es:"arroyo claro sobre piedras con musgo"},
  "morning-dew":{ru:"утренняя роса на зелёных листьях",es:"rocío matinal sobre hojas verdes"},
  "sea-breeze":{ru:"прибрежные травы колышутся на ветру",es:"hierbas costeras moviéndose con la brisa"},
  "prosperity-coast":{ru:"солнечный тихий морской берег",es:"costa tranquila iluminada por el sol"},
  "money-magnet":{ru:"золотистые частицы в уравновешенном поле",es:"partículas doradas en un campo equilibrado"},
  "partners":{ru:"две тропы сходятся среди открытого луга",es:"dos senderos se encuentran en una pradera"},
  "golden-harvest":{ru:"поле урожая в мягком вечернем свете",es:"campo de cosecha bajo luz cálida"},
  "light-waterfall":{ru:"сияющий водопад и струящийся свет",es:"cascada luminosa y luz fluyendo"},
  "green-vortex":{ru:"зелёное полярное сияние с плавными кольцами",es:"aurora verde con anillos suaves"},
  "river-power":{ru:"прозрачная река и меняющийся дневной свет",es:"río claro bajo luz cambiante"},
  "mountain-air":{ru:"горные вершины, широкое небо и медленные облака",es:"cumbres montañosas, cielo abierto y nubes lentas"},
  "desert-light":{ru:"спокойный пустынный пейзаж в солнечном свете",es:"desierto sereno bajo luz solar"},
  "sunbeam-flow":{ru:"мягкие солнечные лучи скользят по воздуху",es:"rayos suaves de sol atraviesan el aire"},
  "opportunity-falls":{ru:"золотистые частицы мягко падают в солнечном свете",es:"partículas doradas cayendo en la luz"},
  "golden-rain":{ru:"абстрактный золотой дождь света",es:"lluvia abstracta de luz dorada"},
  "cosmic-flow":{ru:"золотистые частицы плывут в светящемся небе",es:"partículas doradas en un cielo luminoso"},
  "wildflower-dance":{ru:"луговые цветы движутся под лёгким ветром",es:"flores silvestres movidas por la brisa"},
  "gentle-falls":{ru:"нежный водопад поверх гладких камней",es:"cascada suave sobre rocas lisas"},
});
const motifFor = value => FIRST_VIDEO_VISUAL_MOTIFS.find(motif => motif.pattern.test(value)) || null;
function selectStoryboardScenes(base, wish, manual, variant) {
  const motif = motifFor(wish) || motifFor(manual);
  const allowed = new Set(base.sceneChoices.map(scene=>scene.sceneId));
  const selected = [];
  const original = base.shots.map(s=>s.sceneId);
  const primary = motif?.scenes.find(id=>allowed.has(id)) || original.find(id=>allowed.has(id)) || base.sceneChoices[0]?.sceneId;
  selected.push(primary);
  const context = motif ? [
    ...motif.scenes.slice(1), ...base.sceneChoices
      .filter(c=>c.theme===motif.theme).map(c=>c.sceneId),
    ...original
  ] : [
    ...original.slice(1),
    ...base.sceneChoices.filter(c=>c.theme===base.theme).map(c=>c.sceneId)
  ];
  const other = [...new Set(context.filter(id=>allowed.has(id) && id!==primary))];
  // Rotating the context (not the requested primary image) makes this a
  // genuinely different 4/6-shot video storyboard for the same wish.
  const offset = variant===0 ? 0 : (variant * 2 - 1) % Math.max(1,other.length);
  const rotated = other.slice(offset).concat(other.slice(0,offset));
  for(const id of rotated) {
    if(selected.length>=base.shotCount)break;
    selected.push(id);
  }
  for(const id of base.sceneChoices.map(c=>c.sceneId)){
    if(selected.length>=base.shotCount)break;
    if(!selected.includes(id))selected.push(id);
  }
  let plan=base;
  for(let i=0;i<selected.length&&i<base.shotCount;i++)
    plan=customizeCinematicShot(plan,i+1,selected[i]);
  return plan;
}
const localizedCue=(shot,locale)=>LICENSED_SCENES.get(shot.sceneId)?.description?.[locale] ||
  (locale==="en"?shot.visualCue:(LOCAL_SCENE_CUES[shot.sceneId]?.[locale]||shot.visualCue));

const COPY = Object.freeze({
  ru: {
    lead: "Плавный бесплатный видеоролик из существующих анимированных сцен Holistic House.",
    foodLead: "Тема «Еда»: четыре оригинальные анимированные сцены с фруктами, овощами, супом и хлебом.",
    foodNote: "Это рисованные движущиеся иллюстрации еды, а не видео настоящих блюд или приготовления. Реалистичная съёмка еды требует отдельной лицензированной видеотеки.",
    scenes: "Подтверждённые сцены",
    transition: "Мягкие переходы, спокойная камера, без мерцаний, резких вспышек, логотипов и неразрешённых изображений людей.",
    note: "Некоторые пожелания требуют отдельной AI-видеомодели: бесплатный режим не рисует новых людей, животных и фотореалистичных событий.",
  },
  en: {
    lead: "A smooth free video assembled from the existing animated Holistic House scenes.",
    foodLead: "Food theme: four original animated illustrations showing fruit, vegetables, soup and bread.",
    foodNote: "These are moving drawn food illustrations, not real footage of dishes or cooking. Photoreal food video requires a separately licensed footage library.",
    scenes: "Verified existing scenes",
    transition: "Gentle transitions and stable camera; no flicker, flashes, logos or unlicensed depictions of people.",
    note: "Some wishes require a separate AI video model: free mode does not invent people, animals or photoreal events.",
  },
  es: {
    lead: "Vídeo gratis con las escenas animadas existentes de Holistic House.",
    foodLead: "Tema «Comida»: cuatro ilustraciones originales animadas de frutas, verduras, sopa y pan.",
    foodNote: "Son ilustraciones de comida en movimiento, no imágenes filmadas de platos ni cocina. El vídeo fotorrealista requiere una biblioteca de tomas con licencia.",
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
  const motif = motifFor(normalized);
  if (motif) return motif.theme;
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
  const variant = Number.isInteger(input.variant) && input.variant>=0 && input.variant<=99 ? input.variant : 0;
  const theme = inferFirstVideoTheme(wish || manual, input.theme);
  const durationSeconds = allowed(Number(input.durationSeconds), [20, 30, 60], 20);
  const aspect = allowed(input.aspect, ["portrait", "landscape", "square"], "landscape");
  const style = Object.hasOwn(CINEMATIC_STYLES, input.style) ? input.style : "warm";
  const foodRequest = motifFor(wish)?.id === "food";
  const avoid = text(input.avoid, 140);
  requireSupportedExclusions(avoid);
  // An edited prompt can change which of the allowed scenes the local renderer uses.
  const visualCue = manual ? manual + " " + wish : wish;
  const base = buildCinematicStoryboard({
    locale, theme, durationSeconds, aspect, style, wish: visualCue, avoid,
    mode: "creative",
  });
  // Keep the #2851 strict licensed decoder contract for every ordinary wish.
  // Explicit food wishes use FOUR real on-device Canvas painters, never an
  // unavailable MP4, and preserve the exact user-selected 20/30/60s runtime.
  const sceneChoices=foodRequest
    ?base.sceneChoices.filter(choice=>FOOD_CANVAS_IDS.includes(choice.sceneId))
    :base.sceneChoices.filter(choice=>{
      const scene=LICENSED_SCENES.get(choice.sceneId);
      return scene && scene.theme===choice.theme && licensedSceneAllowed(scene,avoid);
    });
  if(sceneChoices.length<4)throw Error(foodRequest
    ?"no_compatible_cinematic_scenes":"no_compatible_licensed_scenes");
  let selected;
  if(foodRequest){
    // Preserve a recognizable food opener while varying actual later frames.
    const rest=FOOD_CANVAS_IDS.slice(1);
    const offset=variant%rest.length;
    const sequence=[FOOD_CANVAS_IDS[0],...rest.slice(offset),...rest.slice(0,offset)];
    selected=sequence.reduce((plan,sceneId,index)=>
      customizeCinematicShot(plan,index+1,sceneId),base);
  }else{
    selected=selectStoryboardScenes({...base,sceneChoices},wish,manual,variant);
  }
  const selectedShots=selected.shots.slice(0,4);
  const timings=allocateFreeFilmTimeline(durationSeconds,selectedShots.map(shot=>shot.sceneId));
  const shots=selectedShots.map((shot,index)=>{
    const licensed=LICENSED_SCENES.get(shot.sceneId);
    if(!foodRequest&&!licensed)throw Error("no_compatible_licensed_scenes");
    return Object.freeze({...shot,...timings[index],
      visualCue:licensed?.description?.[locale] ||
        (locale==="en"?shot.visualCue:(LOCAL_SCENE_CUES[shot.sceneId]?.[locale]||shot.visualCue)),
      providerPrompt:foodRequest?shot.providerPrompt:licensed.description.en});
  });
  const plan=Object.freeze({...selected,
    version:foodRequest?FIRST_VIDEO_FOOD_CANVAS_PLAN_VERSION:"hh-local-stock-compilation-v1",
    shotCount:4,shots:Object.freeze(shots),
    sceneChoices:Object.freeze(sceneChoices.map(choice=>Object.freeze({...choice,
      visualCue:LICENSED_SCENES.get(choice.sceneId)?.description?.[locale] ||
        (locale==="en"?choice.visualCue:(LOCAL_SCENE_CUES[choice.sceneId]?.[locale]||choice.visualCue))
    })))});
  const copy = COPY[locale];
  const size = aspect === "portrait" ? "9:16" : aspect === "square" ? "1:1" : "16:9";
  const aiReadyPrompt = [
    foodRequest ? copy.foodLead : copy.lead,
    String(durationSeconds) + "s · " + size + " · " + CINEMATIC_STYLES[style].name[locale] + ".",
    copy.scenes + ":",
    ...plan.shots.map((shot, index) =>
      String(index + 1) + ". " + localizedCue(shot,locale) + " (" + shot.durationSeconds + "s)"),
    copy.transition,
  ].join("\n");
  const unsupported = SPECIFIC_SCENE_REQUEST.test(wish + " " + manual);
  const notes = [
    foodRequest ? copy.foodNote : "",
    unsupported ? copy.note : "",
  ].filter(Boolean);
  return Object.freeze({
    locale, wish, theme, durationSeconds, aspect, style, variant,
    prompt: aiReadyPrompt,
    editedPrompt: manual || null,
    descriptionLimited: notes.length > 0,
    limitationNote: notes.join(" "),
    // Original local storyboard & renderer; no imported AI provider clips.
    plan, free: true, mediaSource: "local_canvas", aiMediaGenerated: false,
  });
}
