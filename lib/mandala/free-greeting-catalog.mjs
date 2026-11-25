/**
 * Holistic House first-party, no-fee greeting-character catalogue.
 * Every entry is rendered by our Canvas geometry (not an external sticker,
 * generated image, provider avatar, WebGL dependency or remote download).
 * Keep IDs stable across language variants and draft exports.
 */
const definition = [
  // Eight fantasy characters
  ['gnome','fantasy','🧙','wave','Гном','Gnome','Gnomo'],
  ['fairy','fantasy','🧚','wave','Фея','Fairy','Hada'],
  ['elf','fantasy','🧝','wave','Эльф','Elf','Elfo'],
  ['wizard','fantasy','🪄','sparkle','Волшебник','Wizard','Mago'],
  ['forest-spirit','fantasy','🌿','wave','Лесной дух','Forest spirit','Espíritu del bosque'],
  ['dragon','fantasy','🐲','wave','Дракончик','Little dragon','Dragoncito'],
  ['mermaid','fantasy','🧜','wave','Русалка','Mermaid','Sirena'],
  ['angel','fantasy','🪽','wave','Ангел','Angel','Ángel'],
  // Eight animals
  ['fox','animals','🦊','wave','Лисёнок','Little fox','Zorrito'],
  ['cat','animals','🐱','wave','Котик','Kitten','Gatito'],
  ['dog','animals','🐶','wave','Собака','Puppy','Perrito'],
  ['rabbit','animals','🐰','wave','Зайчик','Bunny','Conejito'],
  ['owl','animals','🦉','flap','Сова','Owl','Búho'],
  ['deer','animals','🦌','wave','Олень','Deer','Ciervo'],
  ['panda','animals','🐼','wave','Панда','Panda','Panda'],
  ['dolphin','animals','🐬','flap','Дельфин','Dolphin','Delfín'],
  // Six people
  ['child','people','🧒','wave','Ребёнок','Child','Niño'],
  ['woman','people','👩','wave','Девушка','Woman','Mujer'],
  ['man','people','👨','wave','Парень','Man','Hombre'],
  ['traveler','people','🎒','wave','Путешественник','Traveler','Viajero'],
  ['host','people','🎤','wave','Ведущий','Host','Presentador'],
  ['dancer','people','💃','dance','Танцор','Dancer','Bailarín'],
  // Four gentle and meditative characters
  ['light-guide','spiritual','✨','wave','Светлый проводник','Light guide','Guía de luz'],
  ['guardian','spiritual','🛡️','wave','Хранитель','Guardian','Guardián'],
  ['sage','spiritual','🧘','wave','Мудрец','Sage','Sabio'],
  ['yogi','spiritual','🪷','namaste','Йога-персонаж','Yogi','Yogui'],
  // Four celebrations
  ['birthday-bear','festive','🎂','wave','Мишка с шариком','Birthday bear','Oso de cumpleaños'],
  ['snowman','festive','⛄','wave','Снеговик','Snowman','Muñeco de nieve'],
  ['heart-messenger','festive','💝','heart','Посланник любви','Heart messenger','Mensajero del corazón'],
  ['wedding-dove','festive','🕊️','flap','Свадебный голубь','Wedding dove','Paloma de boda'],
];

export const FREE_GREETING_CATEGORIES = Object.freeze([
  'fantasy','animals','people','spiritual','festive',
]);

export const FREE_GREETING_CATALOG = Object.freeze(definition.map(([id,category,emoji,gesture,ru,en,es])=>Object.freeze({
  id,category,emoji,gesture,
  title:Object.freeze({ru,en,es}),
})));

export const FREE_GREETING_IDS = Object.freeze([
  'none','auto',...FREE_GREETING_CATALOG.map(character=>character.id),
]);

const VALID=new Set(FREE_GREETING_IDS);
/** No health/profile data or remote classification. The chosen visible scene
 * name has priority, then the already-selected six-part video theme. */
export function recommendGreeting(sceneKey='',theme='life') {
  const scene=String(sceneKey||'').toLowerCase().slice(0,128);
  // Prioritize a specific landscape above a broader theme.
  if(/snow|winter|ice|frost|christmas|nieve|invierno/.test(scene))return 'snowman';
  if(/ocean|sea|coast|beach|water|wave|river|lake|fall|blue|mar|playa|costa/.test(scene))return 'dolphin';
  if(/forest|wood|tree|fern|meadow|leaf|moss|garden|flower|nature|rainforest|bosque|jardin/.test(scene))return 'fox';
  if(/mountain|cliff|horizon|sky|trail|desert|peak|summit|montaña/.test(scene))return 'traveler';
  if(/heart|love|romantic|couple|wedding|rose|amor|corazon/.test(scene))return 'heart-messenger';
  if(/city|street|urban|tower|party|festival|celebration|ciudad/.test(scene))return 'host';
  if(/cosmic|stars|galaxy|portal|sunlight|glow|light|energy|aurora|luminous/.test(scene))return 'light-guide';
  const fallback={
    energy:'light-guide',health:'yogi',relationships:'heart-messenger',
    money:'wizard',goals:'traveler',life:'fairy',
  };
  return fallback[theme]||'fairy';
}

/** A stable effective ID is used by the render/export clock.
 * An invalid ID turns the overlay OFF; it never silently charges or substitutes. */
export function resolveGreetingCharacter(character,sceneKey='',theme='life') {
  if(!VALID.has(character)||character==='none')return 'none';
  if(character==='auto')return recommendGreeting(sceneKey,theme);
  return character;
}

export function getGreetingCharacter(id) {
  return FREE_GREETING_CATALOG.find(character=>character.id===id)||null;
}
