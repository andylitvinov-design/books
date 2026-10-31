/**
 * Holistic House starter designs for the existing free, browser-only video editor.
 * Each preset fills a REAL local storyboard (no AI media, provider cost or new assets).
 * Presets are optional: the goal-first editor remains the primary entry.
 */
const preset = (id, labels, wishes, preferences) => Object.freeze({
  id,
  labels: Object.freeze(labels),
  wishes: Object.freeze(wishes),
  preferences: Object.freeze(preferences),
});

export const FIRST_VIDEO_STARTER_TEMPLATES = Object.freeze([
  preset("meditation",
    {ru:"Медитация",en:"Meditation",es:"Meditación"},
    {
      ru:"Тихое море на рассвете. Мягкие волны, спокойный свет и ощущение внутреннего покоя.",
      en:"A quiet sea at dawn, gentle waves, soft light and a sense of calm.",
      es:"Mar tranquilo al amanecer, olas suaves, luz cálida y una sensación de calma.",
    },
    {theme:"health",style:"nature",aspect:"landscape",durationSeconds:60,motion:"slow",music:"meditation",caption:false}),
  preset("affirmation",
    {ru:"Аффирмация",en:"Affirmation",es:"Afirmación"},
    {
      ru:"Золотой рассвет и светлая дорога вперёд. Я могу идти в своём темпе.",
      en:"A golden sunrise and a clear path ahead. I can move at my own pace.",
      es:"Un amanecer dorado y un camino claro. Puedo avanzar a mi propio ritmo.",
    },
    {theme:"goals",style:"warm",aspect:"portrait",durationSeconds:20,motion:"slow",music:"harmony",caption:true}),
  preset("support",
    {ru:"Внутренняя опора",en:"Inner strength",es:"Fuerza interior"},
    {
      ru:"Горные вершины в утреннем свете. Внутренняя опора и спокойная уверенность.",
      en:"Mountain peaks in the morning light. Inner steadiness and quiet confidence.",
      es:"Cumbres de montañas al amanecer. Firmeza interior y confianza tranquila.",
    },
    {theme:"energy",style:"nature",aspect:"portrait",durationSeconds:30,motion:"slow",music:"harmony",caption:true}),
  preset("sleep",
    {ru:"Перед сном",en:"Before sleep",es:"Antes de dormir"},
    {
      ru:"Спокойное море, мягкий вечерний свет и очень медленное движение воды.",
      en:"A peaceful sea, gentle evening light and very slow waves.",
      es:"Un mar sereno, luz suave de la tarde y olas muy lentas.",
    },
    {theme:"health",style:"dream",aspect:"landscape",durationSeconds:60,motion:"slow",music:"meditation",caption:false}),
  preset("story",
    {ru:"История-путешествие",en:"Visual journey",es:"Viaje visual"},
    {
      ru:"Лесная тропа ведёт к открытой солнечной поляне. Путь к новому этапу.",
      en:"A forest path leads into a sunlit meadow. A journey toward a new chapter.",
      es:"Un sendero del bosque llega a una pradera soleada. Un viaje hacia una nueva etapa.",
    },
    {theme:"goals",style:"dream",aspect:"landscape",durationSeconds:30,motion:"dynamic",music:"harmony",caption:false}),
  preset("short",
    {ru:"Вертикальный ролик",en:"Social short",es:"Vídeo vertical"},
    {
      ru:"Цветущий сад и яркий, но мягкий рассвет. Новый день и новые возможности.",
      en:"A flowering garden and a bright but gentle sunrise. A fresh new day.",
      es:"Jardín de flores y un amanecer luminoso pero suave. Un nuevo día.",
    },
    {theme:"life",style:"warm",aspect:"portrait",durationSeconds:20,motion:"dynamic",music:"harmony",caption:true}),
]);

export function resolveFirstVideoStarterTemplate(id, locale="en") {
  const template = FIRST_VIDEO_STARTER_TEMPLATES.find(item => item.id === id);
  if (!template) return null;
  const language = ["en","ru","es"].includes(locale) ? locale : "en";
  return Object.freeze({
    id: template.id,
    label: template.labels[language],
    wish: template.wishes[language],
    preferences: Object.freeze({...template.preferences}),
  });
}
