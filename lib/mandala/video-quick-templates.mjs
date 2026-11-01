/**
 * One-tap creative templates for the EXISTING free Mandala video editor.
 *
 * Inspired by the general template-first workflow of modern design tools.
 * Each template uses approved first-party Canvas/film scenes and the existing
 * audio/MediaRecorder pipeline. No Canva assets, external provider calls,
 * generated people, XP charge, or private user data.
 *
 * Deliberately kept as locale-aware data, not a second editor or renderer.
 */

const LANGUAGES = Object.freeze(["ru", "en", "es"]);
const freeze = value => Object.freeze(value);

const templates = [
  {
    id: "morning-light", theme: "energy", style: "warm",
    aspect: "portrait", durationSeconds: 20, motion: "slow",
    music: "harmony", caption: true,
    title: { ru: "Новое утро", en: "New morning", es: "Nuevo amanecer" },
    hint: { ru: "Свет и энергия", en: "Light & energy", es: "Luz y energía" },
    wish: {
      ru: "Первые лучи солнца освещают горы. Мягкое движение света, ощущение нового начала и спокойной энергии.",
      en: "First sunlight illuminates the mountains. Gentle movement of light and the feeling of a fresh, peaceful beginning.",
      es: "La primera luz del sol ilumina las montañas. Movimiento suave y sensación de un comienzo tranquilo.",
    },
  },
  {
    id: "gentle-pause", theme: "health", style: "nature",
    aspect: "portrait", durationSeconds: 30, motion: "slow",
    music: "meditation", caption: false,
    title: { ru: "Мягкая пауза", en: "Gentle pause", es: "Pausa suave" },
    hint: { ru: "Отдых и тишина", en: "Rest & quiet", es: "Descanso y calma" },
    wish: {
      ru: "Спокойное море и мягкие волны, светлый горизонт. Больше воздуха, пространства и тишины.",
      en: "A calm sea, gentle waves and a bright horizon. More space, stillness and ease.",
      es: "Mar tranquilo, olas suaves y horizonte luminoso. Más espacio, silencio y calma.",
    },
  },
  {
    id: "inner-confidence", theme: "goals", style: "minimal",
    aspect: "portrait", durationSeconds: 30, motion: "slow",
    music: "harmony", caption: true,
    title: { ru: "Внутренняя опора", en: "Inner confidence", es: "Confianza interior" },
    hint: { ru: "Путь к цели", en: "A path forward", es: "Camino hacia la meta" },
    wish: {
      ru: "Освещённая тропа ведёт к открытой двери. Шаг за шагом появляется ясность, устойчивость и доверие к себе.",
      en: "A sunlit path leads to an open doorway. Step by step, clarity, steadiness and self-trust grow.",
      es: "Un sendero iluminado conduce a una puerta abierta. Paso a paso llegan la claridad y la confianza.",
    },
  },
  {
    id: "heart-connection", theme: "relationships", style: "warm",
    aspect: "square", durationSeconds: 30, motion: "slow",
    music: "meditation", caption: true,
    title: { ru: "Тепло отношений", en: "Heart connection", es: "Conexión del corazón" },
    hint: { ru: "Связь и принятие", en: "Connection & care", es: "Conexión y cuidado" },
    wish: {
      ru: "Тёплый свет в сердце, два мягких круга сближаются в саду. Уважение к границам, принятие и открытость.",
      en: "Warm light, two gentle circles drawing closer in a garden. Respect for boundaries, acceptance and openness.",
      es: "Luz cálida, dos círculos suaves acercándose en un jardín. Respeto, aceptación y apertura.",
    },
  },
  {
    id: "quiet-evening", theme: "health", style: "dream",
    aspect: "landscape", durationSeconds: 60, motion: "slow",
    music: "meditation", caption: false,
    title: { ru: "Тихий вечер", en: "Quiet evening", es: "Tarde tranquila" },
    hint: { ru: "Вечерняя медитация", en: "Evening meditation", es: "Meditación nocturna" },
    wish: {
      ru: "Тихий вечерний берег, спокойное море, далёкие звёзды и плавные перемены света. Мягкое завершение дня.",
      en: "A quiet evening shore, still sea, distant stars and slow changes of light. A gentle ending to the day.",
      es: "Costa tranquila al anochecer, mar sereno, estrellas lejanas y cambios suaves de luz. Final cálido del día.",
    },
  },
  {
    id: "work-possibilities", theme: "money", style: "warm",
    aspect: "square", durationSeconds: 30, motion: "slow",
    music: "harmony", caption: true,
    title: { ru: "Новые возможности", en: "New possibilities", es: "Nuevas posibilidades" },
    hint: { ru: "Работа и вдохновение", en: "Work & inspiration", es: "Trabajo e inspiración" },
    wish: {
      ru: "Золотистое поле урожая и тёплое утро. Образ новых возможностей в работе, ясности и постепенного движения к цели.",
      en: "A golden harvest field in warm morning light. A visual metaphor for new possibilities at work and steady progress.",
      es: "Campo dorado al amanecer. Una metáfora visual de nuevas posibilidades en el trabajo y progreso gradual.",
    },
  },
];

export const VIDEO_QUICK_TEMPLATES = freeze(templates.map(item => freeze({
  ...item, title: freeze(item.title), hint: freeze(item.hint), wish: freeze(item.wish),
})));

const validLocale = value => LANGUAGES.includes(value) ? value : "en";

/**
 * Prepares a complete local-only draft. The user's existing visual exclusions
 * survive template selection, and are never sent to an external provider.
 */
export function getVideoQuickTemplateDraft(id, locale = "en", existingAvoid = "") {
  const template = VIDEO_QUICK_TEMPLATES.find(entry => entry.id === id);
  if (!template) return null;
  const language = validLocale(locale);
  return freeze({
    id: template.id,
    wish: template.wish[language],
    preferences: freeze({
      theme: template.theme, style: template.style, aspect: template.aspect,
      durationSeconds: template.durationSeconds, motion: template.motion,
      music: template.music, caption: template.caption,
      avoid: typeof existingAvoid === "string" ? existingAvoid.slice(0, 140) : "",
    }),
  });
}
