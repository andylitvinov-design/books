/**
 * One versioned first-party catalog for the owner-approved mobile "Stories & Characters" tab.
 * estimatedXp is a PLANNING hint only, never a billable quote. No payment/provider call.
 * "local" records point to licensed existing videos or simple Canvas artwork.
 * "planned" records remain preview-only and cannot be applied to an exported video.
 */
export type StoryLocale = "ru" | "en" | "es";
export type StoryAddonKind = "character" | "story" | "place" | "symbol" | "event";
export type StoryAddonScene = {theme:"energy"|"life"|"health";id:string};
export type StoryAddon = {
  id:string;
  kind:StoryAddonKind;
  title:Record<StoryLocale,string>;
  poster:string;
  estimatedXp:number;
  capability:"local"|"planned";
  scene?:StoryAddonScene;
  marker:string;
};
export type StorySelection = Partial<Record<StoryAddonKind,string>>;
export const STORY_ADDON_CATALOG_VERSION = "1.0.0";
export const STORY_ADDONS:readonly StoryAddon[] = [
  {
    "id": "C01",
    "kind": "character",
    "title": {
      "ru": "Световой спутник",
      "en": "Light companion",
      "es": "Compañero de luz"
    },
    "poster": "/images/holistic-house/reiki-heaven-sky.svg",
    "estimatedXp": 0,
    "capability": "local",
    "marker": "✦"
  },
  {
    "id": "C02",
    "kind": "character",
    "title": {
      "ru": "Мой проводник",
      "en": "My guide",
      "es": "Mi guía"
    },
    "poster": "/images/holistic-house/gentle-owl.svg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "C03",
    "kind": "character",
    "title": {
      "ru": "Мудрый наставник",
      "en": "Wise mentor",
      "es": "Mentor sabio"
    },
    "poster": "/images/holistic-house/course-hero-mindful.svg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "C04",
    "kind": "character",
    "title": {
      "ru": "Добрая помощница",
      "en": "Kind helper",
      "es": "Ayudante amable"
    },
    "poster": "/images/holistic-house/support-mock-portrait.webp",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "♡"
  },
  {
    "id": "C05",
    "kind": "character",
    "title": {
      "ru": "Дракон силы",
      "en": "Dragon of courage",
      "es": "Dragón de valor"
    },
    "poster": "/videos/holistic-house/film-collection-v2/solar-surge.jpg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "C06",
    "kind": "character",
    "title": {
      "ru": "Птица-проводник",
      "en": "Guiding bird",
      "es": "Ave guía"
    },
    "poster": "/images/holistic-house/gentle-owl.svg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "C07",
    "kind": "character",
    "title": {
      "ru": "Благородный олень",
      "en": "Gentle deer",
      "es": "Ciervo noble"
    },
    "poster": "/videos/holistic-house/film-collection-v2/fern-awakening.jpg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "C08",
    "kind": "character",
    "title": {
      "ru": "Заботливый друг",
      "en": "Caring friend",
      "es": "Amigo comprensivo"
    },
    "poster": "/images/holistic-house/course-hero-mindful.svg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "♡"
  },
  {
    "id": "C09",
    "kind": "character",
    "title": {
      "ru": "Хранитель границ",
      "en": "Guardian of boundaries",
      "es": "Guardián de límites"
    },
    "poster": "/videos/holistic-house/film-collection-v2/lone-tree.jpg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "C10",
    "kind": "character",
    "title": {
      "ru": "Садовник",
      "en": "The gardener",
      "es": "El jardinero"
    },
    "poster": "/videos/holistic-house/film-collection-v3/garden-acceptance.jpg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "C11",
    "kind": "character",
    "title": {
      "ru": "Лесной хранитель",
      "en": "Forest guardian",
      "es": "Guardián del bosque"
    },
    "poster": "/videos/holistic-house/film-collection-v2/fern-awakening.jpg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "C12",
    "kind": "character",
    "title": {
      "ru": "Звёздный спутник",
      "en": "Star companion",
      "es": "Compañero estelar"
    },
    "poster": "/images/holistic-house/ideas-zen-landscape.svg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "C13",
    "kind": "character",
    "title": {
      "ru": "Образ будущего себя",
      "en": "Possible future self",
      "es": "Yo futuro posible"
    },
    "poster": "/videos/holistic-house/film-collection-v3/clear-morning.jpg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "C14",
    "kind": "character",
    "title": {
      "ru": "Собственный аватар",
      "en": "My avatar",
      "es": "Mi avatar"
    },
    "poster": "/images/holistic-house/course-hero-mindful.svg",
    "estimatedXp": 50,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "S01",
    "kind": "story",
    "title": {
      "ru": "Путь героя",
      "en": "Hero's path",
      "es": "Camino del héroe"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mountain-air.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "scene": {
      "theme": "energy",
      "id": "mountain-air"
    },
    "marker": "➤"
  },
  {
    "id": "S02",
    "kind": "story",
    "title": {
      "ru": "Преображение",
      "en": "Transformation",
      "es": "Transformación"
    },
    "poster": "/videos/holistic-house/film-collection-v2/fern-awakening.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "scene": {
      "theme": "life",
      "id": "fern-awakening"
    },
    "marker": "✧"
  },
  {
    "id": "S03",
    "kind": "story",
    "title": {
      "ru": "Получение дара",
      "en": "Receiving a gift",
      "es": "Recibir un regalo"
    },
    "poster": "/videos/holistic-house/film-collection-v3/heart-flow.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "S04",
    "kind": "story",
    "title": {
      "ru": "Открытие двери",
      "en": "Opening a door",
      "es": "Abrir una puerta"
    },
    "poster": "/videos/holistic-house/film-collection-v2/radiant-portal.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "⌂"
  },
  {
    "id": "S05",
    "kind": "story",
    "title": {
      "ru": "Возвращение домой",
      "en": "Returning home",
      "es": "Regreso a casa"
    },
    "poster": "/images/holistic-house/course-calm-illustration.svg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "⌂"
  },
  {
    "id": "S06",
    "kind": "story",
    "title": {
      "ru": "Переход через мост",
      "en": "Crossing a bridge",
      "es": "Cruzar un puente"
    },
    "poster": "/videos/holistic-house/film-collection-v2/sea-breeze.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "➤"
  },
  {
    "id": "S07",
    "kind": "story",
    "title": {
      "ru": "Посадка семени",
      "en": "Planting a seed",
      "es": "Plantar una semilla"
    },
    "poster": "/videos/holistic-house/film-collection-v3/garden-acceptance.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "S08",
    "kind": "story",
    "title": {
      "ru": "Выбор пути",
      "en": "Choosing a path",
      "es": "Elegir un camino"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mountain-air.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "➤"
  },
  {
    "id": "S09",
    "kind": "story",
    "title": {
      "ru": "Встреча с героем",
      "en": "Meeting a guide",
      "es": "Encuentro con un guía"
    },
    "poster": "/images/holistic-house/gentle-owl.svg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "S10",
    "kind": "story",
    "title": {
      "ru": "Рассеивается туман",
      "en": "The mist clears",
      "es": "La niebla se disipa"
    },
    "poster": "/videos/holistic-house/film-collection-v3/clear-morning.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "S11",
    "kind": "story",
    "title": {
      "ru": "Волшебное письмо",
      "en": "A magical letter",
      "es": "Una carta mágica"
    },
    "poster": "/images/holistic-house/books-library.webp",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "S12",
    "kind": "story",
    "title": {
      "ru": "Новая глава",
      "en": "A new chapter",
      "es": "Un nuevo capítulo"
    },
    "poster": "/videos/holistic-house/film-collection-v2/wildflower-dance.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "L01",
    "kind": "place",
    "title": {
      "ru": "Сад восстановления",
      "en": "Garden of renewal",
      "es": "Jardín de renovación"
    },
    "poster": "/videos/holistic-house/film-collection-v2/wildflower-dance.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "scene": {
      "theme": "life",
      "id": "wildflower-dance"
    },
    "marker": "✿"
  },
  {
    "id": "L02",
    "kind": "place",
    "title": {
      "ru": "Морской берег",
      "en": "Seashore",
      "es": "Orilla del mar"
    },
    "poster": "/videos/holistic-house/film-collection-v2/coastal-freedom.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "scene": {
      "theme": "life",
      "id": "coastal-freedom"
    },
    "marker": "≋"
  },
  {
    "id": "L03",
    "kind": "place",
    "title": {
      "ru": "Горная вершина",
      "en": "Mountain peak",
      "es": "Cima de montaña"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mountain-air.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "scene": {
      "theme": "energy",
      "id": "mountain-air"
    },
    "marker": "△"
  },
  {
    "id": "L04",
    "kind": "place",
    "title": {
      "ru": "Лесная тропа",
      "en": "Forest path",
      "es": "Sendero del bosque"
    },
    "poster": "/videos/holistic-house/film-collection-v2/fern-awakening.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "scene": {
      "theme": "life",
      "id": "fern-awakening"
    },
    "marker": "♧"
  },
  {
    "id": "L05",
    "kind": "place",
    "title": {
      "ru": "Уютный дом",
      "en": "Cozy home",
      "es": "Hogar acogedor"
    },
    "poster": "/images/holistic-house/course-calm-illustration.svg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "⌂"
  },
  {
    "id": "L06",
    "kind": "place",
    "title": {
      "ru": "Светлый храм",
      "en": "Temple of light",
      "es": "Templo de luz"
    },
    "poster": "/videos/holistic-house/film-collection-v2/radiant-portal.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "L07",
    "kind": "place",
    "title": {
      "ru": "Остров отдыха",
      "en": "Restful island",
      "es": "Isla de descanso"
    },
    "poster": "/videos/holistic-house/film-collection-v2/calm-sea.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "≋"
  },
  {
    "id": "L08",
    "kind": "place",
    "title": {
      "ru": "Тихое озеро",
      "en": "Quiet lake",
      "es": "Lago tranquilo"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mossy-stream.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "≋"
  },
  {
    "id": "L09",
    "kind": "place",
    "title": {
      "ru": "Маяк",
      "en": "Lighthouse",
      "es": "Faro"
    },
    "poster": "/videos/holistic-house/film-collection-v2/sea-breeze.jpg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "L10",
    "kind": "place",
    "title": {
      "ru": "Звёздное небо",
      "en": "Starry sky",
      "es": "Cielo estrellado"
    },
    "poster": "/images/holistic-house/ideas-zen-landscape.svg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "L11",
    "kind": "place",
    "title": {
      "ru": "Волшебная библиотека",
      "en": "Magical library",
      "es": "Biblioteca mágica"
    },
    "poster": "/images/holistic-house/books-library.webp",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "L12",
    "kind": "place",
    "title": {
      "ru": "Мой личный мир",
      "en": "My personal world",
      "es": "Mi mundo personal"
    },
    "poster": "/images/holistic-house/reiki-heaven-sky.svg",
    "estimatedXp": 30,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "O01",
    "kind": "symbol",
    "title": {
      "ru": "Звезда надежды",
      "en": "Star of hope",
      "es": "Estrella de esperanza"
    },
    "poster": "/videos/holistic-house/film-collection-v3/clear-morning.jpg",
    "estimatedXp": 0,
    "capability": "local",
    "marker": "✦"
  },
  {
    "id": "O02",
    "kind": "symbol",
    "title": {
      "ru": "Золотой ключ",
      "en": "Golden key",
      "es": "Llave dorada"
    },
    "poster": "/videos/holistic-house/film-collection-v2/radiant-portal.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "⚿"
  },
  {
    "id": "O03",
    "kind": "symbol",
    "title": {
      "ru": "Фонарь",
      "en": "Lantern",
      "es": "Farol"
    },
    "poster": "/videos/holistic-house/film-collection-v2/solar-surge.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "O04",
    "kind": "symbol",
    "title": {
      "ru": "Компас",
      "en": "Compass",
      "es": "Brújula"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mountain-air.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "✥"
  },
  {
    "id": "O05",
    "kind": "symbol",
    "title": {
      "ru": "Камень опоры",
      "en": "Grounding stone",
      "es": "Piedra de apoyo"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mossy-stream.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "◇"
  },
  {
    "id": "O06",
    "kind": "symbol",
    "title": {
      "ru": "Семя роста",
      "en": "Seed of growth",
      "es": "Semilla de crecimiento"
    },
    "poster": "/videos/holistic-house/film-collection-v3/garden-acceptance.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "O07",
    "kind": "symbol",
    "title": {
      "ru": "Защитный щит",
      "en": "Protective shield",
      "es": "Escudo protector"
    },
    "poster": "/videos/holistic-house/film-collection-v2/lone-tree.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "◇"
  },
  {
    "id": "O08",
    "kind": "symbol",
    "title": {
      "ru": "Волшебная книга",
      "en": "Magic book",
      "es": "Libro mágico"
    },
    "poster": "/images/holistic-house/books-library.webp",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "O09",
    "kind": "symbol",
    "title": {
      "ru": "Сердце света",
      "en": "Heart of light",
      "es": "Corazón de luz"
    },
    "poster": "/videos/holistic-house/film-collection-v3/heart-flow.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "♡"
  },
  {
    "id": "O10",
    "kind": "symbol",
    "title": {
      "ru": "Подарок",
      "en": "Gift",
      "es": "Regalo"
    },
    "poster": "/videos/holistic-house/film-collection-v2/wildflower-dance.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "O11",
    "kind": "symbol",
    "title": {
      "ru": "Чаша воды",
      "en": "Bowl of water",
      "es": "Cuenco de agua"
    },
    "poster": "/videos/holistic-house/film-collection-v2/calm-sea.jpg",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "≋"
  },
  {
    "id": "O12",
    "kind": "symbol",
    "title": {
      "ru": "Нить связи",
      "en": "Connecting thread",
      "es": "Hilo de unión"
    },
    "poster": "/images/holistic-house/support-mock-portrait.webp",
    "estimatedXp": 15,
    "capability": "planned",
    "marker": "∞"
  },
  {
    "id": "E01",
    "kind": "event",
    "title": {
      "ru": "Встреча",
      "en": "Meeting a guide",
      "es": "Encuentro"
    },
    "poster": "/images/holistic-house/gentle-owl.svg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✦"
  },
  {
    "id": "E02",
    "kind": "event",
    "title": {
      "ru": "Символический дар",
      "en": "Symbolic gift",
      "es": "Regalo simbólico"
    },
    "poster": "/videos/holistic-house/film-collection-v3/heart-flow.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "E03",
    "kind": "event",
    "title": {
      "ru": "Открытие двери",
      "en": "Door opens",
      "es": "Puerta abierta"
    },
    "poster": "/videos/holistic-house/film-collection-v2/radiant-portal.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "⌂"
  },
  {
    "id": "E04",
    "kind": "event",
    "title": {
      "ru": "Переход через мост",
      "en": "Crossing a bridge",
      "es": "Cruzar un puente"
    },
    "poster": "/videos/holistic-house/film-collection-v2/sea-breeze.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "➤"
  },
  {
    "id": "E05",
    "kind": "event",
    "title": {
      "ru": "Рассеивание тумана",
      "en": "Mist clearing",
      "es": "Disipar la niebla"
    },
    "poster": "/videos/holistic-house/film-collection-v3/clear-morning.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "E06",
    "kind": "event",
    "title": {
      "ru": "Расцвет сада",
      "en": "Garden blooming",
      "es": "Jardín floreciendo"
    },
    "poster": "/videos/holistic-house/film-collection-v3/garden-acceptance.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "E07",
    "kind": "event",
    "title": {
      "ru": "Рост семени",
      "en": "Seed growing",
      "es": "Crecer la semilla"
    },
    "poster": "/videos/holistic-house/film-collection-v2/fern-awakening.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✿"
  },
  {
    "id": "E08",
    "kind": "event",
    "title": {
      "ru": "Выбор дороги",
      "en": "Choosing a road",
      "es": "Elegir camino"
    },
    "poster": "/videos/holistic-house/film-collection-v2/mountain-air.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "➤"
  },
  {
    "id": "E09",
    "kind": "event",
    "title": {
      "ru": "Возвращение домой",
      "en": "Return home",
      "es": "Volver a casa"
    },
    "poster": "/images/holistic-house/course-calm-illustration.svg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "⌂"
  },
  {
    "id": "E10",
    "kind": "event",
    "title": {
      "ru": "Диалог героев",
      "en": "Dialogue of guides",
      "es": "Diálogo de guías"
    },
    "poster": "/images/holistic-house/support-mock-portrait.webp",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "♡"
  },
  {
    "id": "E11",
    "kind": "event",
    "title": {
      "ru": "Послание себе",
      "en": "Message to self",
      "es": "Mensaje a uno mismo"
    },
    "poster": "/images/holistic-house/books-library.webp",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✧"
  },
  {
    "id": "E12",
    "kind": "event",
    "title": {
      "ru": "Мягкое завершение",
      "en": "Gentle ending",
      "es": "Final suave"
    },
    "poster": "/videos/holistic-house/film-collection-v3/clear-morning.jpg",
    "estimatedXp": 25,
    "capability": "planned",
    "marker": "✦"
  }
];
;
const byId=new Map(STORY_ADDONS.map(item=>[item.id,item]));
export function findStoryAddon(id:string|undefined):StoryAddon|undefined{
  return id?byId.get(id):undefined;
}
export function storySelectionItems(selection:StorySelection):StoryAddon[]{
  return (["character","story","place","symbol","event"] as const)
    .map(kind=>findStoryAddon(selection[kind])).filter((item):item is StoryAddon=>Boolean(item));
}
export function storyDraftEstimate(selection:StorySelection){
  const items=storySelectionItems(selection);
  return {items,estimatedXp:items.reduce((sum,item)=>sum+item.estimatedXp,0),
    unavailable:items.filter(item=>item.capability!=="local")};
}
export function availableStoryScene(selection:StorySelection):StoryAddonScene|undefined{
  return findStoryAddon(selection.place)?.scene || findStoryAddon(selection.story)?.scene;
}
export const STORY_KIND_ORDER:readonly StoryAddonKind[]=["character","story","place","symbol","event"];
