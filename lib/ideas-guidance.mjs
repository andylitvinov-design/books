// Client-side guidance for the public Ideas page. No user text is persisted or sent to APIs.
// Aphorisms below are new editorial reflections, not historical quotations.
export const ideaTopics = Object.freeze(["relationships", "stress", "resources", "work", "direction"]);

const stems = {
  relationships: ["отношен", "любов", "любв", "любл", "близост", "партнер", "партнерш", "семь", "супруг", "довер", "конфликт", "друж", "одиноч", "relationship", "love", "partner", "family", "marriage", "friend", "conflict", "trust", "relacion", "amor", "pareja", "familia", "amistad", "conflicto", "soledad"],
  stress: ["тревог", "страх", "паник", "боюс", "стыд", "стыж", "стресс", "нерв", "напряж", "беспокой", "неуверен", "anxiet", "anxious", "stress", "fear", "panic", "asham", "worri", "nervous", "ansiedad", "estres", "miedo", "panico", "verguenz", "preocup"],
  resources: ["ресурс", "энерг", "устал", "выгор", "истощ", "переутом", "сон", "сплю", "сил", "восстанов", "energy", "burnout", "exhaust", "fatigu", "sleep", "tired", "resource", "energia", "agotad", "cansad", "descans", "sueno"],
  work: ["работ", "карьер", "бизнес", "проект", "доход", "деньг", "финанс", "клиент", "предприним", "зарплат", "job", "work", "career", "business", "money", "financ", "income", "client", "project", "trabaj", "carrera", "negocio", "dinero", "ingreso", "proyecto", "empleo"],
  direction: ["выбор", "выбрат", "решен", "смысл", "будущ", "цель", "путь", "направлен", "изменен", "призван", "choice", "decis", "purpose", "future", "direction", "change", "meaning", "goal", "decision", "proposito", "sentido", "futuro", "direccion", "cambio", "decision", "meta"],
};

function tokensFor(text) {
  return String(text ?? "").slice(0, 500).toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function matchIdeasTopic(question) {
  const tokens = tokensFor(question);
  let topic = "direction";
  let score = 0;
  for (const candidate of ideaTopics) {
    // Count different matched words, not repeated usage of the same word.
    const count = new Set(tokens.filter(token => stems[candidate].some(stem => token.startsWith(stem)))).size;
    if (count > score) { score = count; topic = candidate; }
  }
  return { topic, matched: score > 0 };
}

const aphorisms = {
  relationships: {
    ru: ["Близость начинается там, где можно оставаться собой.", "Граница не разрушает связь. Она создаёт место для честной встречи.", "Услышать другого — не значит отказаться от собственного голоса."],
    en: ["Closeness begins where we can remain ourselves.", "A boundary does not end connection; it makes an honest meeting possible.", "Listening to someone does not mean losing your own voice."],
    es: ["La cercanía comienza donde podemos seguir siendo nosotros mismos.", "Un límite no rompe el vínculo; abre espacio para un encuentro sincero.", "Escuchar a otra persona no significa perder tu propia voz."],
  },
  stress: {
    ru: ["Тревога торопит. Ясность возвращается, когда разрешаешь себе один спокойный шаг.", "Не нужно побеждать каждое чувство, чтобы выбирать своё действие.", "Опора — это не отсутствие страха, а возможность не оставаться с ним в одиночку."],
    en: ["Anxiety rushes us. Clarity returns with one unhurried step.", "You do not need to defeat every feeling to choose your next action.", "Support is not the absence of fear; it is not having to face it alone."],
    es: ["La ansiedad nos apresura. La claridad vuelve con un paso sin prisa.", "No necesitas vencer cada emoción para elegir tu siguiente acción.", "El apoyo no es la ausencia de miedo, sino no tener que afrontarlo a solas."],
  },
  resources: {
    ru: ["Отдых — не награда за силу. Он один из её источников.", "Когда ресурс иссякает, сначала наполни сосуд, а потом выбирай путь.", "Маленький устойчивый ритм сильнее редкого рывка."],
    en: ["Rest is not a reward for strength. It is one of its sources.", "When your resources run low, refill the vessel before choosing the road.", "A small, steady rhythm often carries you farther than a rare sprint."],
    es: ["El descanso no es un premio por ser fuerte; es una de sus fuentes.", "Cuando faltan recursos, llena primero el recipiente antes de elegir el camino.", "Un ritmo pequeño y constante suele llevarte más lejos que un impulso aislado."],
  },
  work: {
    ru: ["Настоящая стратегия начинается с вопроса: что действительно важно?", "Не каждую возможность нужно превращать в обязательство.", "Ясное действие сегодня ценнее бесконечной подготовки к идеальному завтра."],
    en: ["Real strategy begins by asking what truly matters.", "Not every opportunity has to become an obligation.", "One clear action today is worth more than endless preparation for a perfect tomorrow."],
    es: ["La verdadera estrategia comienza preguntando qué importa de verdad.", "No toda oportunidad debe convertirse en obligación.", "Una acción clara hoy vale más que preparar sin fin un mañana perfecto."],
  },
  direction: {
    ru: ["Необязательно видеть весь путь, чтобы сделать первый честный шаг.", "Вопрос становится компасом, когда перестаёшь искать единственно правильный ответ.", "Иногда перемена начинается не с усилия, а с нового взгляда."],
    en: ["You need not see the whole path to take one honest step.", "A question becomes a compass when you stop seeking a single perfect answer.", "Sometimes change begins not with more effort, but with a different view."],
    es: ["No necesitas ver todo el camino para dar un primer paso sincero.", "Una pregunta se vuelve brújula cuando dejas de buscar una única respuesta perfecta.", "A veces el cambio no empieza con más esfuerzo, sino con otra mirada."],
  },
};

const recommendationOrder = {
  relationships: ["review", "tests", "dao"],
  stress: ["tests", "review", "dao"],
  resources: ["dao", "tests", "review"],
  work: ["review", "tests", "dao"],
  direction: ["review", "dao", "tests"],
};

export function getIdeasAphorisms(topic, locale) {
  return [...(aphorisms[topic]?.[locale] ?? aphorisms.direction.en)];
}

export function getIdeasFreeRecommendations(topic) {
  return [...(recommendationOrder[topic] ?? recommendationOrder.direction)];
}
