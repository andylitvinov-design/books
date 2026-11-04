/**
 * KIP / symbol-drama motif REFERENCE registry, v1.1.
 * The lists are a broad, source-linked index, NOT a complete canon of all possible
 * motifs or a dictionary of fixed psychological meanings.
 * Original, short descriptions: no textbook scripts, copyrighted exercises or images.
 * Classical KIP = clinician-guided psychotherapy; it must not be auto-converted
 * to an autonomous meditation. Original gentle resource prompts are separate.
 */
export const KIP_REFERENCE_SOURCES = Object.freeze({
  dgkip: "https://www.dgkip.de/curricula",
  iskip: "https://igkip.org/en/what-is-kip/",
  overview: "https://www.reksamwestend.de/psychotherapie-ausbildung/katathymes-bilderleben-ausbildung-berlin.html",
});
const motif = (id, tier, label, themes, source = "dgkip", selfGuided = false) => Object.freeze({
  id, tier, label: Object.freeze(label), themes: Object.freeze(themes.split(" ")),
  sourceUrl: KIP_REFERENCE_SOURCES[source],
  origin: selfGuided ? "original_nonclinical_resourcing" : "kip_reference",
  selfGuided, clinicalReviewRequired: !selfGuided,
  interpretationRule: "ask_client_first_no_fixed_symbol_meaning",
});
/**
 * Base: Wiese, Bach, Berg, Haus, Waldrand.
 * Resource / relationship / regression / confrontation themes are indexed
 * using DGKIP curriculum and ISKIP; some additional names are illustrative
 * adjacent training motifs, not necessarily universal KIP standards.
 */
export const KIP_MOTIFS = Object.freeze([
  motif("meadow","base",["Meadow","Луг","Pradera"],"landscape mood", "dgkip"),
  motif("brook","base",["Brook","Ручей","Arroyo"],"flow movement", "dgkip"),
  motif("mountain","base",["Mountain","Гора","Montaña"],"challenge distance", "dgkip"),
  motif("house","base",["House","Дом","Casa"],"boundary dwelling", "dgkip"),
  motif("forest_edge","base",["Forest edge","Опушка леса","Borde del bosque"],"threshold unknown", "dgkip"),
  motif("flower","resource",["Flower","Цветок","Flor"],"care attention", "dgkip"),
  motif("tree","resource",["Tree","Дерево","Árbol"],"support growth", "dgkip"),
  motif("spring","resource",["Spring","Источник","Manantial"],"water renewal", "dgkip"),
  motif("favorite_place","resource",["Comfortable place","Место комфорта","Lugar agradable"],"choice comfort", "dgkip"),
  motif("group_of_trees","relational",["Group of trees","Группа деревьев","Grupo de árboles"],"connection distance", "dgkip"),
  motif("animal_family","relational",["Animal family","Семья животных","Familia de animales"],"roles connection", "dgkip"),
  motif("parent_and_young","regression",["Animal and young","Животное и детёныш","Animal y cría"],"care attachment", "dgkip"),
  motif("childhood_people","regression",["Childhood figures","Люди из детства","Personas de la infancia"],"memory attachment", "dgkip"),
  motif("important_person","relational",["Significant person","Значимый человек","Persona importante"],"relationship distance", "iskip"),
  motif("helpful_figure","resource",["Helpful figure","Помогающий образ","Figura de apoyo"],"support trust", "dgkip"),
  motif("rosebush","intermediate",["Rosebush","Розовый куст","Rosal"],"relationship care", "overview"),
  motif("lion","intermediate",["Lion","Лев","León"],"power fear", "overview"),
  motif("predator","advanced",["Predator","Хищник","Depredador"],"fear conflict", "dgkip"),
  motif("carriage_ride","intermediate",["Carriage ride","Поездка в экипаже","Viaje en carruaje"],"journey agency", "overview"),
  motif("self_ideal","intermediate",["Ideal self","Идеальный образ себя","Yo ideal"],"aspiration self_image", "overview"),
  motif("night_dream","intermediate",["Night dream","Ночной сон","Sueño nocturno"],"uncertainty dreams", "dgkip"),
  motif("mask_ball","advanced",["Masquerade","Бал-маскарад","Baile de máscaras"],"identity concealment", "dgkip"),
  motif("fruit_tree","advanced",["Fruit tree","Плодовое дерево","Árbol frutal"],"fertility conflict", "dgkip"),
  motif("cave","advanced",["Cave","Пещера","Cueva"],"unknown depth", "overview"),
  motif("swamp_hole","advanced",["Swamp hole","Болотная яма","Pozo pantanoso"],"fear stuckness", "dgkip"),
  motif("moor_pool","advanced",["Moor pool","Торфяной пруд","Estanque de turba"],"unknown depth", "overview"),
  motif("volcano","advanced",["Volcano","Вулкан","Volcán"],"intensity conflict", "dgkip"),
  motif("underworld","advanced",["Underworld","Подземный мир","Inframundo"],"depth uncertainty", "overview"),
  motif("warm_spring","somatic_clinical",["Warm spring","Тёплый источник","Manantial cálido"],"warmth care", "dgkip"),
  motif("cloud","somatic_clinical",["Cloud","Облако","Nube"],"lightness movement", "dgkip"),
  motif("body_interior","somatic_clinical",["Body interior","Внутреннее пространство тела","Interior del cuerpo"],"body emotion", "dgkip"),
  motif("affected_body_part","somatic_clinical",["Affected body area","Область тела","Zona corporal"],"body attention", "dgkip"),
  motif("bridge","adjacent",["Bridge","Мост","Puente"],"transition choice", "overview"),
  motif("path","adjacent",["Path","Дорога","Camino"],"direction choice", "overview"),
  motif("door","adjacent",["Door","Дверь","Puerta"],"threshold choice", "overview"),
  motif("snake","adjacent",["Snake","Змея","Serpiente"],"animal uncertainty", "overview"),
  motif("witch_figure","adjacent",["Witch figure","Образ ведьмы","Figura de bruja"],"fear character", "overview"),
  // Original, opt-in resourcing. Distinct from therapeutic KIP motifs above.
  motif("gentle_nature","original_support",["Gentle natural scene","Спокойный уголок природы","Paisaje natural tranquilo"],"nature choice", "iskip",true),
  motif("supportive_object","original_support",["Supportive object","Предмет опоры","Objeto de apoyo"],"object comfort", "iskip",true),
  motif("comfortable_corner","original_support",["Comfortable corner","Удобное место","Rincón agradable"],"choice comfort", "iskip",true),
  motif("small_light","original_support",["Small light","Мягкий свет","Luz suave"],"light attention", "iskip",true),
]);
export const KIP_MOTIF_BY_ID = Object.freeze(Object.fromEntries(KIP_MOTIFS.map(m=>[m.id,m])));
const sym = (id, labels, themes) => Object.freeze({
  id, label: Object.freeze(labels), explorationThemes: Object.freeze(themes.split(" ")),
  neverDiagnostic: true, interpretation: "meaning_belongs_to_client",
});
export const KIP_SYMBOLS = Object.freeze([
  sym("water",["Water","Вода","Agua"],"change movement feeling"),
  sym("brook",["Brook","Ручей","Arroyo"],"movement obstacles"),
  sym("river",["River","Река","Río"],"direction crossing"),
  sym("spring",["Spring","Источник","Manantial"],"origin experience"),
  sym("lake",["Lake","Озеро","Lago"],"stillness distance"),
  sym("sea",["Sea","Море","Mar"],"space unknown"),
  sym("rain",["Rain","Дождь","Lluvia"],"weather comfort"),
  sym("snow",["Snow","Снег","Nieve"],"temperature stillness"),
  sym("tree",["Tree","Дерево","Árbol"],"growth support"),
  sym("roots",["Roots","Корни","Raíces"],"connection stability"),
  sym("leaves",["Leaves","Листья","Hojas"],"seasons change"),
  sym("flower",["Flower","Цветок","Flor"],"care color"),
  sym("rose",["Rose","Роза","Rosa"],"care choice"),
  sym("fruit",["Fruit","Плод","Fruto"],"time care"),
  sym("forest",["Forest","Лес","Bosque"],"visibility unknown"),
  sym("meadow",["Meadow","Луг","Pradera"],"space atmosphere"),
  sym("mountain",["Mountain","Гора","Montaña"],"distance effort"),
  sym("valley",["Valley","Долина","Valle"],"landscape shelter"),
  sym("path",["Path","Тропа","Sendero"],"direction choice"),
  sym("crossroads",["Crossroads","Перекрёсток","Cruce"],"choice uncertainty"),
  sym("bridge",["Bridge","Мост","Puente"],"crossing choice"),
  sym("door",["Door","Дверь","Puerta"],"boundary permission"),
  sym("window",["Window","Окно","Ventana"],"view distance"),
  sym("key",["Key","Ключ","Llave"],"access permission"),
  sym("house",["House","Дом","Casa"],"space boundary"),
  sym("room",["Room","Комната","Habitación"],"space privacy"),
  sym("garden",["Garden","Сад","Jardín"],"care cultivation"),
  sym("cave",["Cave","Пещера","Cueva"],"unknown safety"),
  sym("tower",["Tower","Башня","Torre"],"height distance"),
  sym("wall",["Wall","Стена","Muro"],"boundary options"),
  sym("stairs",["Stairs","Лестница","Escalera"],"transition pace"),
  sym("boat",["Boat","Лодка","Barca"],"support movement"),
  sym("carriage",["Carriage","Экипаж","Carruaje"],"journey choice"),
  sym("bird",["Bird","Птица","Ave"],"movement distance"),
  sym("horse",["Horse","Лошадь","Caballo"],"energy relationship"),
  sym("lion",["Lion","Лев","León"],"power reaction"),
  sym("snake",["Snake","Змея","Serpiente"],"reaction distance"),
  sym("wolf",["Wolf","Волк","Lobo"],"fear closeness"),
  sym("dog",["Dog","Собака","Perro"],"companionship trust"),
  sym("cat",["Cat","Кошка","Gato"],"choice closeness"),
  sym("animal_family",["Animal family","Семья животных","Familia animal"],"relations roles"),
  sym("child",["Child","Ребёнок","Niño"],"experience care"),
  sym("elder",["Elder","Старший человек","Anciano"],"experience relationship"),
  sym("helper",["Helper","Помощник","Ayudante"],"support agency"),
  sym("stranger",["Stranger","Незнакомец","Desconocido"],"uncertainty boundaries"),
  sym("mask",["Mask","Маска","Máscara"],"appearance protection"),
  sym("mirror",["Mirror","Зеркало","Espejo"],"perspective self_image"),
  sym("shadow",["Shadow","Тень","Sombra"],"light unknown"),
  sym("sun",["Sun","Солнце","Sol"],"warmth brightness"),
  sym("moon",["Moon","Луна","Luna"],"light rhythm"),
  sym("star",["Star","Звезда","Estrella"],"distance direction"),
  sym("cloud",["Cloud","Облако","Nube"],"movement change"),
  sym("fire",["Fire","Огонь","Fuego"],"warmth intensity"),
  sym("volcano",["Volcano","Вулкан","Volcán"],"power intensity"),
  sym("stone",["Stone","Камень","Piedra"],"texture support"),
  sym("mountain_peak",["Peak","Вершина","Cima"],"distance effort"),
  sym("seed",["Seed","Семя","Semilla"],"time growth"),
  sym("clock",["Clock","Часы","Reloj"],"time pace"),
  sym("gift",["Gift","Подарок","Regalo"],"receiving choice"),
  sym("rope",["Rope","Верёвка","Cuerda"],"connection support"),
  sym("island",["Island","Остров","Isla"],"distance safety"),
  sym("light",["Light","Свет","Luz"],"visibility atmosphere"),
  sym("colour",["Colour","Цвет","Color"],"sensory_emotion experience"),
]);
export const KIP_SYMBOL_BY_ID = Object.freeze(Object.fromEntries(KIP_SYMBOLS.map(s=>[s.id,s])));
const LANG_INDEX = Object.freeze({en:0,ru:1,es:2});
const langIdx = language => LANG_INDEX[language] ?? 0;
export function listKipMotifs({locale="ru",tier=null,selfGuidedOnly=false}={}) {
  const n=langIdx(locale);
  return KIP_MOTIFS.filter(m=>(!tier||m.tier===tier)&&(!selfGuidedOnly||m.selfGuided))
    .map(m=>({id:m.id,title:m.label[n],tier:m.tier,themes:[...m.themes],
      sourceUrl:m.sourceUrl,selfGuided:m.selfGuided,clinicalReviewRequired:m.clinicalReviewRequired}));
}
export function exploreKipSymbol({id,locale="ru"}={}) {
  const symbol=KIP_SYMBOL_BY_ID[id];
  if(!symbol) return null;
  const prompt={
    ru:"Что этот образ значит лично для вас? Какие чувства и ассоциации возникают? Можно не искать объяснения.",
    en:"What does this image mean to you personally? What feelings or associations arise? No interpretation is required.",
    es:"¿Qué significa esta imagen para ti? ¿Qué emociones o asociaciones surgen? No necesitas interpretarla.",
  };
  const lang=Object.hasOwn(prompt,locale)?locale:"en";
  return {id:symbol.id,title:symbol.label[langIdx(lang)],
    explorationThemes:[...symbol.explorationThemes],question:prompt[lang],
    fixedMeaning:null,diagnosis:null,interpretationRule:"client_led_open_ended"};
}
