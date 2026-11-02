import { inspectIntelligenceRisk } from "../holistic-support/client-reasoning-risk.mjs";

// Deterministic, original, low-intensity resource exercises. NO clinical
// treatment, LLM call, profile loading, external transmission or video render.
// This is the free offline fallback while the reviewed Meditation Writer /
// Psychologist Mind integration is released separately.
export const RESOURCE_PRACTICE_VERSION = "resource-practice-1";
export const RESOURCE_PRACTICE_KINDS = Object.freeze(["ritual", "exercise", "practice"]);
const THEMES = new Set(["energy", "money", "relationships", "goals", "life", "health"]);
const LOCALES = new Set(["ru", "en", "es"]);

const TOPICS = Object.freeze({
  ru: {
    energy: ["Восстановление сил", "один доступный момент отдыха"],
    money: ["Ясность в работе и деньгах", "один небольшой рабочий вопрос"],
    relationships: ["Близость и личные границы", "одну доброжелательную фразу для общения"],
    goals: ["Направление и небольшой шаг", "один посильный шаг к выбранной цели"],
    life: ["Смысл и внутренние ценности", "один поступок в согласии со своими ценностями"],
    health: ["Комфорт и забота о себе", "один доступный способ позаботиться о себе"],
  },
  en: {
    energy: ["Restoring energy", "one accessible moment of rest"],
    money: ["Clarity around work and money", "one small work-related question"],
    relationships: ["Connection and boundaries", "one kind phrase for a conversation"],
    goals: ["Direction and small steps", "one manageable step toward your goal"],
    life: ["Meaning and values", "one action consistent with your values"],
    health: ["Comfort and self-care", "one accessible act of self-care"],
  },
  es: {
    energy: ["Recuperar energía", "un momento de descanso posible"],
    money: ["Claridad en trabajo y dinero", "una pequeña pregunta sobre el trabajo"],
    relationships: ["Cercanía y límites", "una frase amable para conversar"],
    goals: ["Dirección y pasos pequeños", "un paso posible hacia tu meta"],
    life: ["Sentido y valores", "una acción acorde con tus valores"],
    health: ["Comodidad y autocuidado", "un acto sencillo de autocuidado"],
  },
});

const METHODS = Object.freeze({
  ru: {
    ritual: [
      {
        title: "Ритуал возвращения к опоре", description: "Короткий символический переход к спокойному выбору.",
        steps: [
          "Остановитесь на минуту. Можно оставить глаза открытыми и заметить опору под собой.",
          "Положите ладонь на удобную поверхность или просто посмотрите на устойчивый предмет.",
          "Мысленно обозначьте: «Я могу выбирать свой темп». Затем наметьте: ",
        ],
        transfer: "Пользуйтесь выбранным коротким жестом в обычный момент дня, только если он помогает.",
      },
      {
        title: "Ритуал личного пространства", description: "Мягкий образ собственной границы без принуждения к визуализации.",
        steps: [
          "Найдите вокруг себя точку, на которой приятно задержать взгляд.",
          "Если хочется, обозначьте комфортное расстояние вокруг себя: рукой, словом или мысленно.",
          "Разрешите себе самостоятельно выбрать следующее действие по теме: ",
        ],
        transfer: "Попробуйте вернуться к этому ощущению выбора в подходящий момент.",
      },
    ],
    exercise: [
      {
        title: "Упражнение «Три нейтральные опоры»", description: "Простое упражнение с открытыми глазами, без управления дыханием.",
        steps: [
          "Найдите взглядом три обычных предмета в комнате.",
          "Отметьте у каждого один цвет, форму или фактуру. Ничего менять не нужно.",
          "Спросите себя, что из доступного можно выбрать сейчас: ",
        ],
        transfer: "Повторите наблюдение за предметами, если нужен небольшой перерыв.",
      },
      {
        title: "Упражнение «Маленький шаг»", description: "Перевод общего намерения в конкретное посильное действие.",
        steps: [
          "Запишите или назовите одну задачу, не требующую немедленного решения.",
          "Уменьшите её до действия длительностью не более двух минут либо выберите отдых.",
          "Если подходит, наметьте практический ориентир: ",
        ],
        transfer: "Отметьте, было ли действие посильным; корректируйте его без самокритики.",
      },
    ],
    practice: [
      {
        title: "Практика доступного ресурса", description: "Поиск одного небольшого источника опоры в настоящем.",
        steps: [
          "Выберите знакомое нейтральное место, предмет или ощущение удобной опоры.",
          "Останьтесь с ним ненадолго. Образ можно пропустить и наблюдать реальную комнату.",
          "Назовите одну спокойную возможность по вашей теме: ",
        ],
        transfer: "Перенесите маленькую часть этой практики в обычное дело по своему выбору.",
      },
      {
        title: "Практика бережного решения", description: "Развитие свободы выбора между действием и паузой.",
        steps: [
          "Представьте два равноправных варианта: сделать небольшой шаг или отложить его.",
          "Заметьте, что оба варианта допустимы. Не требуется достичь особого состояния.",
          "Выберите действие лишь при готовности, например: ",
        ],
        transfer: "В конце дня спросите себя, какой темп был вам удобнее.",
      },
    ],
  },
  en: {
    ritual: [
      { title: "Ritual of returning to support", description: "A brief symbolic transition toward choosing calmly.",
        steps: ["Pause for a moment. Keep your eyes open if you prefer and notice what supports you.",
          "Rest your hand on a comfortable surface or simply look at a steady object.",
          "Silently try: “I can choose my pace.” Then consider: "],
        transfer: "Use this small gesture during your day only if it feels useful." },
      { title: "Ritual of personal space", description: "A gentle boundary image, with no required visualisation.",
        steps: ["Find a comfortable point to look at in the room.",
          "If you wish, mark a comfortable distance around you with a gesture or a word.",
          "Choose your own next action related to: "],
        transfer: "You can return to this sense of choice whenever it helps." },
    ],
    exercise: [
      { title: "Exercise: three ordinary anchors", description: "An eyes-open observation without forced breathing.",
        steps: ["Notice three everyday objects in the room.",
          "Observe one colour, shape or texture of each. Nothing needs fixing.",
          "Ask which small option is available now: "],
        transfer: "Repeat the observation if you want a brief break." },
      { title: "Exercise: a tiny step", description: "Turn a broad intention into a manageable action.",
        steps: ["Name or write down one task you do not need to resolve right now.",
          "Reduce it to a two-minute action, or choose rest.",
          "If it feels right, choose a practical direction: "],
        transfer: "Notice if the step felt manageable; adjust without self-criticism." },
    ],
    practice: [
      { title: "Practice of an available resource", description: "Notice one modest source of present-day support.",
        steps: ["Choose a familiar neutral place, object or feeling of physical support.",
          "Stay briefly; you may skip imagery and look at the real room instead.",
          "Name one gentle possibility connected with: "],
        transfer: "Carry a small part of the practice into an everyday task if useful." },
      { title: "Practice of a kind decision", description: "Make room for either a small action or a pause.",
        steps: ["Consider two equally valid choices: a small step or putting it off.",
          "Notice that neither requires a special feeling or outcome.",
          "Choose a next action only if ready, such as: "],
        transfer: "At the end of the day, ask which pace was more comfortable." },
    ],
  },
  es: {
    ritual: [
      { title: "Ritual para volver al apoyo", description: "Una transición simbólica hacia una elección tranquila.",
        steps: ["Haz una pausa. Puedes mantener los ojos abiertos y notar qué te sostiene.",
          "Apoya la mano en una superficie cómoda o mira un objeto estable.",
          "Prueba en silencio: «Puedo elegir mi ritmo». Después considera: "],
        transfer: "Usa este pequeño gesto en tu día solo si te ayuda." },
      { title: "Ritual del espacio personal", description: "Una imagen amable de límites, sin visualizar por obligación.",
        steps: ["Encuentra un punto agradable para mirar en la habitación.",
          "Si quieres, marca una distancia cómoda con un gesto o una palabra.",
          "Elige tu siguiente acción con respecto a: "],
        transfer: "Puedes recuperar esta sensación de elección cuando te sirva." },
    ],
    exercise: [
      { title: "Ejercicio: tres apoyos cotidianos", description: "Observación con los ojos abiertos y sin controlar la respiración.",
        steps: ["Observa tres objetos cotidianos alrededor.",
          "Fíjate en un color, una forma o una textura de cada uno, sin cambiar nada.",
          "Pregúntate qué pequeña opción tienes ahora: "],
        transfer: "Repite la observación si quieres hacer una pausa." },
      { title: "Ejercicio: un paso pequeño", description: "Transformar una intención amplia en una acción posible.",
        steps: ["Nombra o escribe algo que no necesitas resolver de inmediato.",
          "Redúcelo a una acción de dos minutos, o elige descansar.",
          "Si te apetece, elige una dirección práctica: "],
        transfer: "Observa si fue un paso posible y ajústalo sin juzgarte." },
    ],
    practice: [
      { title: "Práctica de un recurso cercano", description: "Encontrar un apoyo sencillo en el presente.",
        steps: ["Elige un lugar, objeto o sensación de apoyo que te resulte neutral.",
          "Quédate un poco; puedes prescindir de imágenes y mirar la habitación.",
          "Nombra una posibilidad tranquila relacionada con: "],
        transfer: "Lleva una pequeña parte de la práctica a tu vida cotidiana si te sirve." },
      { title: "Práctica de una elección amable", description: "Dejar espacio tanto para actuar como para descansar.",
        steps: ["Considera dos opciones válidas: un paso pequeño o hacer una pausa.",
          "Ninguna de las dos requiere sentirte de una manera especial.",
          "Elige una acción solo si estás preparado, por ejemplo: "],
        transfer: "Al final del día, pregúntate qué ritmo fue más cómodo." },
    ],
  },
});

const BLOCKED = Object.freeze({
  ru: "Если речь идёт о непосредственной опасности или самоповреждении, эти практики не подходят. Обратитесь в экстренную или кризисную службу и к человеку, которому доверяете.",
  en: "If there is immediate danger or thoughts of self-harm, these exercises are not suitable. Contact emergency or crisis services and someone you trust.",
  es: "Ante peligro inmediato o ideas de autolesión, estas prácticas no son adecuadas. Acude a emergencias o a un servicio de crisis y a alguien de confianza.",
});

export function selectResourcePractice({ locale = "en", theme = "energy", focus = {}, kind = "ritual", revision = 0 } = {}) {
  const lang = LOCALES.has(locale) ? locale : "en";
  const requestedKind = RESOURCE_PRACTICE_KINDS.includes(kind) ? kind : "ritual";
  // Explicit goal selection takes priority over inferred text and the default video theme.
  const goalTheme = Array.isArray(focus?.goals) ? focus.goals.find(key => THEMES.has(key)) : null;
  const chosenTheme = goalTheme || (THEMES.has(theme) ? theme : "energy");
  const notes = [focus?.difficulty, focus?.goal, ...(Array.isArray(focus?.details) ? focus.details.slice(0, 3) : [])]
    .filter(value => typeof value === "string").map(value => value.slice(0, 140)).join(" ").slice(0, 500);
  if (inspectIntelligenceRisk({goalText: notes, language: lang}).status === "urgent") {
    return {status: "blocked", locale: lang, message: BLOCKED[lang], source: RESOURCE_PRACTICE_VERSION};
  }
  const variants = METHODS[lang][requestedKind];
  const index = Number.isSafeInteger(revision) && revision >= 0 ? revision % variants.length : 0;
  const method = variants[index];
  const [topic, action] = TOPICS[lang][chosenTheme];
  return {
    status: "ready", locale: lang, kind: requestedKind, theme: chosenTheme,
    id: chosenTheme + "-" + requestedKind + "-" + index,
    title: method.title, topic, description: method.description, durationMinutes: 3,
    steps: [method.steps[0], method.steps[1], method.steps[2] + action + "."],
    transfer: method.transfer,
    source: RESOURCE_PRACTICE_VERSION,
    // A failed heuristic triage is NEVER considered a clinical all-clear.
    clinicalClearance: false,
  };
}
