import { detectIdeasQuestionLocale, matchIdeasTopic } from "./ideas-guidance.mjs";

// A local, privacy-preserving guide. This is NOT an LLM or a diagnostic service.
// No free-text input is placed in a URL, sent to a provider, or recorded here.
export const homeGuideGoals = Object.freeze(["understand", "tests", "practice", "consult", "ideas"]);

const immediateHelp = [
  /\b(suicid\w*|kill myself|end my life|hurt myself)\b/i,
  /(?:хочу|собираюсь|планирую)\s+(?:умереть|покончить с собой)/i,
  /(?:суицид|самоубийств)/i,
  /\b(suicidarme|matarme|quitarme la vida)\b/i,
  /\b(?:want to die|self[- ]harm|end it all)\b/i,
  /(?:не хочу больше жить|хочу умереть|причинить себе вред)/i,
  /\b(?:quiero morir|hacerme da[nñ]o)\b/i,
];

// Small, editorially reviewed subtopics; no diagnosis or free-text is persisted.
function homeGuideSubtopic(question, topic) {
  const text = question.toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е");
  if (topic === "relationships") {
    if (/ссор|конфликт|расстав|развод|измен|обид|ссор|fight|argu|conflict|break.?up|separat|discut|ruptur|pele|сложн|difficult/u.test(text)) return "conflict";
    if (/одиноч|одиноко|lonel|alone|soledad|solo\/a/u.test(text)) return "lonely";
    if (/познаком|встретить|найти (?:партнер|парн|девуш|любим)|ищу (?:партнер|любов|муж)|dating|meet someone|find (?:love|a partner)|single|conocer a alguien|buscar pareja/u.test(text)) return "meeting";
    if (/повтор|не получается|страх близост|pattern|repeated|keep (?:choosing|ending)|patron|repetid/u.test(text)) return "patterns";
    if (/сблиз|довер|отдал|нежност|у нас|мой партнер|моя партнер|парой|intimacy|closer|trust|distant|my partner|mi pareja|hablar de mi pareja|confianza|cercania/u.test(text)) return "bond";
  }
  if (topic === "stress") {
    if (/бессон|не сплю|сплю|уснуть|сон|засып|sleep|insomnia|dormir|sueno/u.test(text)) return "sleep";
    if (/тревог|тревож|страх|паник|anxiet|anxious|panic|ansiedad|miedo|panico/u.test(text)) return "anxiety";
  }
  if (topic === "resources" && /устал|нет сил|выгоран|истощ|tired|exhaust|burnout|cansad|agotad/u.test(text)) return "fatigue";
  return null;
}

export function resolveHomeGuideQuestion(input, fallbackLocale = "en", previous = null) {
  const question = String(input ?? "").trim().slice(0, 500);
  const lang = detectIdeasQuestionLocale(question, fallbackLocale);
  if (previous?.urgent || immediateHelp.some(pattern => pattern.test(question))) {
    return { lang, topic: null, matched: false, urgent: true, interest: null, subtopic: null };
  }
  const match = matchIdeasTopic(question);
  const reiki = /(?:рейки|рэйки|reiki)/iu.test(question);
  // Inherit context only when no distinct topic is stated; a new topic replaces it.
  const inherit = !match.matched && !reiki && previous?.matched;
  const topic = inherit ? previous.topic : match.topic;
  return { lang, topic, matched: Boolean(match.matched || reiki || inherit),
    urgent: false, interest: reiki ? "reiki" : inherit ? previous.interest ?? null : null,
    subtopic: homeGuideSubtopic(question, topic) ?? (inherit ? previous.subtopic ?? null : null) };
}

export function homeGuideOpening(context) {
  if (!context || context.urgent) return localized("", "", "");
  if (context.interest === "reiki") return localized(
    "You mentioned Reiki. We can find a way to explore it at your own pace.",
    "Вы упомянули Рейки. Давайте найдём подходящий вам способ знакомства с практикой.",
    "Mencionaste Reiki. Busquemos una forma de explorarlo a tu ritmo.");
  if (context.topic === "relationships") {
    if (context.subtopic === "conflict") return localized(
      "Difficulties in a relationship can be confusing. We can start with what matters most to you.",
      "Непростая ситуация в отношениях может вызывать много вопросов. Начнём с того, что важно именно вам.",
      "Las dificultades en una relación pueden generar dudas. Empecemos por lo que más te importa.");
    if (context.subtopic === "lonely") return localized(
      "You mentioned feeling alone. We can take this one gentle step at a time.",
      "Вы упомянули одиночество. Можно начать с небольшого, бережного шага.",
      "Mencionaste la soledad. Podemos ir paso a paso, con calma.");
    return localized("You are looking for more connection. Let's understand what kind of support would feel right.",
      "Вы хотите больше любви и близости. Давайте уточним, что именно вам сейчас нужно.",
      "Buscas más amor y cercanía. Aclaremos qué apoyo encajaría contigo.");
  }
  if (context.topic === "stress") return localized(
    "It sounds like there's a lot on your mind. We can look for a small, manageable first step.",
    "Похоже, сейчас непросто. Найдём небольшой посильный первый шаг.",
    "Parece que estás pasando por un momento difícil. Busquemos un primer paso sencillo.");
  if (context.topic === "resources") return localized(
    "You're thinking about your energy and resources. Let's find what might be useful today.",
    "Вы спрашиваете об энергии и ресурсах. Давайте посмотрим, что поможет начать.",
    "Te interesan tu energía y tus recursos. Veamos por dónde empezar.");
  if (context.topic === "work") return localized(
    "You mentioned work or business. Let's start from where you are, not from a generic solution.",
    "Вы говорите о работе или бизнесе. Начнём с вашей конкретной ситуации.",
    "Mencionaste trabajo o negocio. Empecemos por tu situación concreta.");
  return localized("Thanks for sharing. We can explore a first step without putting a label on your situation.",
    "Спасибо, что рассказали. Можно найти первый шаг, даже если пока трудно назвать тему.",
    "Gracias por compartirlo. Podemos buscar un primer paso sin poner etiquetas.");
}


export function homeGuideDestinations({ goal, topic, locale }) {
  if (!homeGuideGoals.includes(goal)) throw new Error("Unknown guide goal");
  const pageLocale = ["ru", "en", "es"].includes(locale) ? locale : "en";
  // Some private test routes do not offer an ES interface yet; reuse EN.
  const testLocale = pageLocale === "es" ? "en" : pageLocale;
  const main = {
    understand: "/" + pageLocale + "/services/free-situation-review",
    tests: "/" + testLocale + "/client/tests",
    practice: "/" + pageLocale + "/academy",
    consult: "/" + pageLocale + "/services#consultation",
    ideas: "/" + pageLocale + "/books",
  };
  const secondary = topic === "work" && goal !== "consult"
    ? "/" + pageLocale + "/explore/business"
    : goal === "ideas"
      ? "/" + pageLocale + "/services/free-situation-review"
      : "/" + pageLocale + "/books";
  return { primary: main[goal], secondary };
}


// A small navigation view of existing products, not another course/price database.
// Sources: existing public course landings and explore/business at the reviewed SHA.
// Checkout and private entitlement are deliberately NOT inferred from route existence.
const localized = (en, ru, es) => ({ en, ru, es });
const offers = {
  business: {
    title: localized("Business & Career", "Бизнес и карьера", "Negocio y carrera"),
    benefit: localized("Turn one work goal into practical daily steps and a private journal.", "Разложите одну рабочую цель на ежедневные шаги и ведите личный дневник.", "Convierte una meta laboral en pasos diarios y un diario privado."),
    detail: localized("90 days · 12 modules · Free to start · Sign-in required", "90 дней · 12 модулей · Бесплатный старт · Нужен вход", "90 días · 12 módulos · Inicio gratuito · Requiere acceso · Curso en inglés"),
    action: localized("Open the free plan", "Открыть бесплатный план", "Abrir el plan en inglés"),
    path: locale => "/" + (locale === "ru" ? "ru" : "en") + "/app/business",
  },
  antistress: {
    title: localized("OPORA Anti-Stress", "ОПОРА Антистресс", "OPORA Antiestrés"),
    benefit: localized("Try gentle exercises and choose manageable ways to pause and support yourself.", "Попробуйте мягкие упражнения и выберите посильные способы поддержки.", "Prueba ejercicios suaves y elige formas de pausa y apoyo a tu ritmo."),
    detail: localized("14 lessons · First course free · View the programme before joining", "14 занятий · Первый курс бесплатно · Сначала можно посмотреть программу", "14 sesiones · Primer curso gratis · Consulta el programa antes de empezar"),
    action: localized("See the Anti-Stress programme", "Посмотреть программу Антистресс", "Ver el programa Antiestrés"),
    path: locale => "/" + locale + "/courses/antistress",
  },
  reiki: {
    title: localized("Reiki Practitioner", "Рейки Практик", "Practicante de Reiki"),
    benefit: localized("Explore three Reiki traditions through lessons, practices and meditations.", "Познакомьтесь с тремя системами Рейки через уроки, практики и медитации.", "Conoce tres tradiciones de Reiki con lecciones, prácticas y meditaciones."),
    detail: localized("5 lessons · Free · One Level 1 initiation gift, arranged with the teacher", "5 занятий · Бесплатно · Курс откроется на английском · Одна инициация 1-го уровня в подарок, по согласованию с мастером", "5 lecciones · Gratis · Curso en inglés · Una iniciación de nivel 1 de regalo, acordada con el maestro"),
    action: localized("Explore the free Reiki course", "Открыть бесплатный курс Рейки", "Ver el curso gratuito de Reiki"),
    path: locale => "/" + locale + "/academy/reiki/free-practitioner-course",
  },
  review: {
    title: localized("Free written situation review", "Бесплатный письменный разбор", "Revisión escrita gratuita"),
    benefit: localized("Describe your situation and request a personal written perspective. Not a live call.", "Опишите ситуацию и запросите личный письменный взгляд. Это не созвон.", "Describe tu situación y solicita una perspectiva escrita. No es una llamada."),
    detail: localized("Free · Short form · Optional drawing · Reply timing agreed separately", "Бесплатно · Короткая анкета · Рисунок по желанию · Срок ответа согласуется отдельно", "Gratis · Formulario breve · Dibujo opcional · Plazo de respuesta por acordar"),
    action: localized("Request a written review", "Запросить письменный разбор", "Solicitar revisión escrita"),
    path: locale => "/" + locale + "/services/free-situation-review",
  },
  tests: {
    title: localized("Free self-check questionnaires", "Бесплатные опросники", "Cuestionarios gratuitos"),
    benefit: localized("Choose what you want to reflect on; results are not a medical diagnosis.", "Выберите тему для самонаблюдения. Результаты не являются диагнозом.", "Elige sobre qué reflexionar; los resultados no son un diagnóstico."),
    detail: localized("Free · Duration depends on your chosen questionnaire", "Бесплатно · Время зависит от выбранного опросника", "Gratis · Duración según cuestionario · Interfaz en inglés"),
    action: localized("Choose my self-check", "Выбрать опросник", "Elegir cuestionario en inglés"),
    path: locale => "/" + (locale === "ru" ? "ru" : "en") + "/client/tests",
  },

  dao: {
    title: localized("Free Wu Xing resource profile", "Бесплатный профиль ресурсов У-Син", "Perfil gratuito de recursos Wu Xing"),
    benefit: localized("Explore your resources with a symbolic Daoist reflection, not medical diagnostics.", "Исследуйте свои ресурсы через символическую даосскую модель, не медицинскую диагностику.", "Explora tus recursos con un modelo taoísta simbólico, no un diagnóstico médico."),
    detail: localized("Free · Symbolic questionnaire · Not a health assessment", "Бесплатно · Символический опросник · Не медицинский тест", "Gratis · Cuestionario simbólico · No es un análisis de salud"),
    action: localized("Explore Wu Xing", "Открыть профиль У-Син", "Explorar Wu Xing"),
    path: locale => "/" + locale + "/services/dao-health-profile",
  },
  alchemy: {
    title: localized("Alchemy of the Soul", "Алхимия души", "Alquimia del Alma"),
    benefit: localized("Explore personal patterns with constellations and guided imagery; complementary traditions are optional.", "Исследуйте личные паттерны через расстановки и работу с образами; дополнительные подходы необязательны.", "Explora patrones personales con constelaciones e imágenes guiadas; los métodos complementarios son opcionales."),
    detail: localized("Personal session · Details and scheduling by request · Not medical treatment", "Личная сессия · Детали и время по запросу · Не медицинское лечение", "Sesión personal · Detalles y horario por solicitud · No es tratamiento médico"),
    action: localized("Explore the session", "Подробнее о сессии", "Conocer la sesión"),
    path: locale => "/" + locale + "/services/alchemy-of-soul",
  },
  consult: {
    title: localized("A personal session with Andrey", "Личная сессия с Андреем", "Sesión personal con Andrey"),
    benefit: localized("Discuss your personal or work situation and possible next steps together.", "Обсудите личную или рабочую ситуацию и возможные следующие шаги.", "Habla sobre tu situación personal o laboral y posibles próximos pasos."),
    detail: localized("€50 / 30 min · €100 / 60 min · Request, not a confirmed booking", "€50 / 30 мин · €100 / 60 мин · Запрос, не подтверждённая запись", "€50 / 30 min · €100 / 60 min · Solicitud, no reserva confirmada"),
    action: localized("Request a personal session", "Запросить личную сессию", "Solicitar una sesión"),
    path: locale => "/" + locale + "/services#consultation",
  },
};
const choice = (id, label, response, offerIds) => ({ id, label, response, offerIds });
const personal = choice("personal", localized("I prefer personal help", "Хочу личную помощь", "Prefiero ayuda personal"),
  localized("You can request a conversation; the time and booking still need confirmation.", "Можно запросить личный разговор; время и запись ещё нужно подтвердить.", "Puedes solicitar una conversación; el horario y la reserva necesitan confirmación."), ["consult", "review"]);
const questions = {
  work: {
    prompt: localized("Are you starting a project, developing existing work, or focusing on your career?", "Вы начинаете дело, развиваете существующий проект или строите карьеру?", "¿Empiezas un proyecto, desarrollas tu actividad o buscas avanzar en tu carrera?"),
    choices: [
      choice("work-start", localized("Starting a project", "Начинаю своё дело", "Empiezo un proyecto"), localized("Start by describing who your work helps and one small offer you can test.", "Начните с того, кому полезна ваша работа и какое небольшое предложение можно проверить.", "Empieza por definir a quién ayudas y una pequeña propuesta que puedas probar."), ["business", "review"]),
      choice("work-grow", localized("Developing my business", "Развиваю своё дело", "Desarrollo mi negocio"), localized("Choose one observable work goal and a next action, rather than changing everything at once.", "Выберите одну наблюдаемую рабочую цель и ближайшее действие вместо попытки менять всё сразу.", "Elige una meta observable y una próxima acción, sin intentar cambiarlo todo a la vez."), ["business", "review"]),
      choice("work-career", localized("Career development", "Развиваю карьеру", "Desarrollo profesional"), localized("Name the change you want at work and one conversation or skill that could help.", "Назовите желаемое изменение в работе и один разговор или навык, который может помочь.", "Define el cambio laboral que deseas y una conversación o habilidad que pueda ayudar."), ["business", "review"]), personal,
    ],
  },
  stress: {
    prompt: localized("Would you prefer a gentle practice or to reflect on your current state first?", "Хотите сначала мягкую практику или разобраться в своём текущем состоянии?", "¿Prefieres una práctica suave o reflexionar primero sobre cómo te sientes?"),
    choices: [
      choice("calm-practice", localized("Try a gentle practice", "Попробовать мягкую практику", "Probar una práctica suave"), localized("You can try a small comfortable pause, without forcing a change in your breathing or feelings.", "Можно начать с небольшой комфортной паузы, не заставляя себя менять дыхание или чувства.", "Puedes empezar con una pausa cómoda, sin forzar la respiración ni tus sentimientos."), ["antistress", "review"]),
      choice("self-check", localized("Explore free tests", "Бесплатные тесты", "Pruebas gratuitas"), localized("A voluntary self-check can give you a starting point for reflection, not a diagnosis.", "Добровольный опросник может дать отправную точку для размышления, но не диагноз.", "Un cuestionario voluntario puede ofrecer un punto de reflexión, no un diagnóstico."), ["tests", "antistress"]), personal,
    ],
  },
  relationships: {
    prompt: localized("Would you like to clarify the situation in writing or talk it through personally?", "Хотите разобрать ситуацию письменно или обсудить её лично?", "¿Prefieres aclarar la situación por escrito o hablar personalmente?"),
    choices: [
      choice("written-review", localized("A written perspective", "Письменный взгляд", "Una perspectiva escrita"), localized("Separate what happened from what you need next. A written review can help explore that question.", "Отделите то, что произошло, от того, что вам нужно дальше. Письменный разбор поможет рассмотреть этот вопрос.", "Separa lo que ocurrió de lo que necesitas ahora. Una revisión escrita puede ayudarte a explorarlo."), ["review"]),
      choice("self-check", localized("Explore free tests", "Бесплатные тесты", "Pruebas gratuitas"), localized("Choose only the questions you are comfortable reflecting on; you can stop at any time.", "Выбирайте только те вопросы, которые готовы рассматривать; можно остановиться в любой момент.", "Elige solo los temas que quieras explorar; puedes parar en cualquier momento."), ["tests", "review"]), personal,
    ],
  },
  reiki: {
    prompt: localized("Would you like to explore Reiki yourself first or ask about personal guidance?", "Хотите сначала познакомиться с Рейки самостоятельно или обсудить личное обучение?", "¿Quieres conocer Reiki por tu cuenta o preguntar por orientación personal?"),
    choices: [
      choice("reiki-course", localized("Explore the free course", "Пройти бесплатный курс", "Explorar el curso gratis"), localized("Start with the five lessons at your own pace. The gift initiation is arranged with the teacher, not automatically booked.", "Начните с пяти занятий в своём темпе. Подарочная инициация согласуется с мастером, а не бронируется автоматически.", "Empieza con cinco lecciones a tu ritmo. La iniciación de regalo se acuerda con el maestro; no se reserva automáticamente."), ["reiki"]),
      choice("reiki-guidance", localized("Learn about the gift and next levels", "Подарок и следующие уровни", "Regalo y siguientes niveles"), localized("Read the course and gift terms first. Further learning is optional; the free course stays free.", "Сначала посмотрите условия курса и подарка. Продолжение обучения добровольно; бесплатный курс остаётся бесплатным.", "Consulta primero el curso y las condiciones del regalo. Continuar es opcional; el curso gratuito sigue siendo gratis."), ["reiki"]),
    ],
  },
};
// A broad love request needs a question about the client's situation, not a
// premature choice between a free form and a paid appointment.
const relationshipFocus = {
  prompt: localized(
    "Is this about meeting someone, feeling closer to a current partner, or a pattern you'd like to understand?",
    "Вы хотите встретить близкого человека, сблизиться с партнёром или разобраться в повторяющихся трудностях?",
    "¿Quieres conocer a alguien, acercarte a tu pareja o comprender una dificultad que se repite?"),
  choices: [
    choice("focus-meeting", localized("Meet someone", "Встретить близкого человека", "Conocer a alguien"),
      localized("Finding connection starts with what matters to you.", "Начнём с того, какая близость для вас важна.", "Empecemos por el tipo de conexión que buscas."), []),
    choice("focus-bond", localized("Feel closer in my relationship", "Больше близости в паре", "Más cercanía en mi relación"),
      localized("Let's focus on the connection you already have.", "Давайте уделим внимание вашим нынешним отношениям.", "Centrémonos en tu relación actual."), []),
    choice("focus-patterns", localized("Understand what gets in the way", "Понять, что мешает", "Entender qué lo dificulta"),
      localized("We can explore the situation without blaming anyone.", "Можно разобраться в ситуации без поиска виноватых.", "Podemos explorar la situación sin culpar a nadie."), []),
    personal,
  ],
};
const relationshipActions = {
  meeting: {
    prompt: localized("Would you like to reflect on your expectations in writing, try a free self-check, or talk personally?",
      "Хотите сначала письменно разобраться в ожиданиях, пройти бесплатный тест или обсудить вопрос лично?",
      "¿Prefieres aclarar tus expectativas por escrito, hacer una prueba gratuita o hablar personalmente?"),
    choices: questions.relationships.choices,
  },
  bond: {
    prompt: localized("What feels more useful: putting the situation into words, self-reflection, or a personal conversation?",
      "Что сейчас полезнее: изложить ситуацию письменно, исследовать свои чувства в тесте или поговорить лично?",
      "¿Qué te serviría más: describir la situación, reflexionar con una prueba o conversar personalmente?"),
    choices: questions.relationships.choices,
  },
  conflict: {
    prompt: localized("Would it help first to unpack what happened in writing, reflect privately, or speak with someone?",
      "Вам ближе сначала разобрать произошедшее письменно, поразмышлять самостоятельно или поговорить лично?",
      "¿Te ayudaría revisar lo ocurrido por escrito, reflexionar por tu cuenta o hablar con alguien?"),
    choices: questions.relationships.choices,
  },
  patterns: {
    prompt: localized("Would you rather explore the pattern in writing, start with a self-check, or ask for personal support?",
      "Хотите исследовать повторяющуюся ситуацию письменно, начать с теста или получить личную поддержку?",
      "¿Prefieres explorar el patrón por escrito, empezar con una prueba o pedir apoyo personal?"),
    choices: questions.relationships.choices,
  },
  lonely: {
    prompt: localized("Would a gentle written reflection, a free self-check, or a personal conversation feel most supportive?",
      "Что сейчас бережнее для вас: письменный разбор, бесплатный тест или личная беседа?",
      "¿Qué te ayudaría más: reflexionar por escrito, una prueba gratuita o una conversación personal?"),
    choices: questions.relationships.choices,
  },
};
const topicSpecificStress = {
  sleep: localized("You mentioned sleep. Would you prefer a gentle daily practice or a free self-check?",
    "Вы упомянули сон. Вам ближе мягкая ежедневная практика или бесплатная самопроверка?",
    "Mencionaste el sueño. ¿Prefieres una práctica suave o una autoevaluación gratuita?"),
  anxiety: localized("You mentioned anxiety. Would you rather start with a gentle practice or a free self-check?",
    "Вы упомянули тревогу. Вам ближе мягкая практика или бесплатная самопроверка?",
    "Mencionaste ansiedad. ¿Prefieres una práctica suave o una autoevaluación gratuita?"),
};
const direction = {
  prompt: localized("Which starting point fits your question best?", "Какая отправная точка ближе к вашему вопросу?", "¿Qué punto de partida encaja mejor con tu pregunta?"),
  choices: [
    choice("topic-work", localized("Work or a business idea", "Работа или своё дело", "Trabajo o negocio"), null, []),
    choice("topic-stress", localized("Calm and everyday resources", "Спокойствие и ресурсы", "Calma y recursos"), null, []),
    questions.relationships.choices[0],
    personal,
  ],
};
export function homeGuideFollowup(context) {
  if (!context || context.urgent) return null;
  if (context.interest === "reiki") return questions.reiki;
  if (context.topic === "relationships" && context.matched) {
    return context.subtopic
      ? relationshipActions[context.subtopic] ?? questions.relationships
      : relationshipFocus;
  }
  if (context.topic === "stress" && context.subtopic && topicSpecificStress[context.subtopic]) {
    return { ...questions.stress, prompt: topicSpecificStress[context.subtopic] };
  }
  return questions[context.topic === "resources" ? "stress" : context.topic] ?? direction;
}
export function chooseHomeGuideOffer(context, choiceId, pageLocale = "en") {
  if (!context || context.urgent) return null;
  const followup = homeGuideFollowup(context);
  const selected = followup?.choices.find(item => item.id === choiceId);
  if (!selected) return null; // No arbitrary offer IDs or URLs from user input.
  if (choiceId.startsWith("focus-") && context.topic === "relationships") {
    const subtopic = choiceId.slice(6);
    if (!["meeting", "bond", "patterns"].includes(subtopic)) return null;
    return { context: { ...context, subtopic }, response: selected.response, offers: [] };
  }
  if (choiceId.startsWith("topic-")) {
    const topic = choiceId.slice(6);
    return { context: { ...context, matched: true, topic: topic === "reiki" ? "resources" : topic,
      interest: topic === "reiki" ? "reiki" : null, subtopic: null }, response: null, offers: [] };
  }
  const locale = ["en", "ru", "es"].includes(pageLocale) ? pageLocale : "en";
  return { context, response: selected.response,
    offers: selected.offerIds.slice(0, 2).map(id => {
      const offer = offers[id];
      return { id, title: offer.title[locale], benefit: offer.benefit[locale], detail: offer.detail[locale],
        action: offer.action[locale], href: offer.path(locale), checkoutStatus: "not_verified" };
    }) };
}



/** Category navigation uses the same verified local offers as the conversation.
 * Visitor questions are classified in-browser and never included in links. */
export const homeGuideCategories = Object.freeze(["all", "services", "courses", "tests", "free"]);
const browseGroups = Object.freeze({
  all: ["review", "tests", "dao", "antistress", "business", "reiki", "alchemy", "consult"],
  services: ["review", "alchemy", "consult", "dao"],
  courses: ["business", "antistress", "reiki"],
  tests: ["tests"],
  free: ["review", "tests", "dao", "reiki"],
});
const browsePreference = {
  work: ["business", "consult", "review", "alchemy", "tests", "dao", "antistress", "reiki"],
  stress: ["antistress", "tests", "review", "dao", "consult", "alchemy", "business", "reiki"],
  resources: ["antistress", "dao", "tests", "reiki", "review", "business", "consult", "alchemy"],
  relationships: ["review", "alchemy", "consult", "tests", "dao", "antistress", "business", "reiki"],
  direction: ["review", "tests", "dao", "business", "antistress", "reiki", "consult", "alchemy"],
  reiki: ["reiki", "review", "dao", "tests", "antistress", "consult", "alchemy", "business"],
};

export function browseHomeGuideOffers({ category, locale = "en", question = "" }) {
  const lang = ["en", "ru", "es"].includes(locale) ? locale : "en";
  if (!homeGuideCategories.includes(category)) return { urgent: false, matched: false, offers: [] };
  const context = resolveHomeGuideQuestion(String(question).slice(0, 500), lang);
  if (context.urgent) return { urgent: true, matched: false, offers: [] };
  const intent = context.interest === "reiki" ? "reiki" : context.topic || "direction";
  const preference = browsePreference[intent] || browsePreference.direction;
  const ranking = id => preference.includes(id) ? preference.indexOf(id) : 99;
  const ids = browseGroups[category].slice().sort((a, b) => ranking(a) - ranking(b));
  const offersForCategory = ids.slice(0, 3).map(id => {
    const offer = offers[id];
    return { id, title: offer.title[lang], benefit: offer.benefit[lang],
      detail: offer.detail[lang], action: offer.action[lang],
      href: offer.path(lang), checkoutStatus: "not_verified" };
  });
  return { urgent: false, matched: context.matched || context.interest === "reiki",
    offers: offersForCategory };
}

// Compact, first-screen navigation reuses the existing verified offer URLs.
// Cards are curated site sections, not diagnoses, recommendations or captured leads.
const quickStarts = Object.freeze([
  { id: "stress", offerId: "antistress",
    title: localized("Stress & calm", "Стресс и спокойствие", "Estrés y calma"),
    category: localized("Courses · OPORA", "Курсы · ОПОРА", "Cursos · OPORA") },
  { id: "relationships", offerId: "review",
    title: localized("Relationships", "Отношения", "Relaciones"),
    category: localized("Services · Free review", "Услуги · Бесплатный разбор", "Servicios · Revisión gratis") },
  { id: "direction", offerId: null,
    title: localized("Life decisions", "Принять решение", "Tomar decisiones"),
    category: localized("Ideas · Reflections", "Идеи · Размышления", "Ideas · Reflexiones") },
  { id: "business", offerId: "business",
    title: localized("Business & career", "Бизнес и карьера", "Negocio y carrera"),
    category: localized("Business · 90-day plan", "Бизнес · План на 90 дней", "Negocios · Plan 90 días") },
  { id: "resources", offerId: "dao",
    title: localized("Energy & resources", "Энергия и ресурсы", "Energía y recursos"),
    category: localized("Free starts · Wu Xing", "Бесплатно · У-Син", "Gratis · Wu Xing") },
  { id: "reiki", offerId: "reiki",
    title: localized("Learn Reiki", "Изучать Рейки", "Aprender Reiki"),
    category: localized("Academy · Free course", "Академия · Бесплатный курс", "Academia · Curso gratis") },
]);
export function homeGuideQuickStarts(pageLocale = "en") {
  const lang = ["en", "ru", "es"].includes(pageLocale) ? pageLocale : "en";
  return quickStarts.map(item => ({
    id: item.id, title: item.title[lang], category: item.category[lang],
    href: item.offerId
      ? offers[item.offerId].path(lang)
      : homeGuideDestinations({ goal: "ideas", topic: "direction", locale: lang }).primary,
  }));
}

// Recognise an optional spoken or typed reply to the current clarifying
// question. Only permit IDs from the active question; never infer a URL.
export function matchHomeGuideReply(input, context) {
  if (!context || context.urgent) return null;
  const value = String(input ?? "").slice(0, 300).toLocaleLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е");
  const allowed = new Set((homeGuideFollowup(context)?.choices ?? []).map(item => item.id));
  const patterns = [
    ["focus-meeting", /\b(meet|dating|single|find love|new partner)\b|познаком|встрет|нов[а-я]* отношен|conocer|buscar pareja/u],
    ["focus-bond", /\b(closer|partner|together|intimacy|trust)\b|близост|сблиз|партнер|пар[еы]|cercan|pareja|confianza/u],
    ["focus-patterns", /\b(pattern|repeated|difficult|understand|why)\b|мешает|повтор|разобрат|не получа|dificult|patron|entender/u],
    ["work-start", /\b(start|starting|launch|new|idea|begin)\b|начина|стартап|планир|empez|inicia|nuevo/u],
    ["work-career", /\b(career|job|promotion|employment|resume|interview)\b|карьер|зарплат|carrera|empleo|trabaj/u],
    ["work-grow", /\b(grow|growth|existing|running|customers?|clients?|sales|marketing)\b|развив|клиент|продаж|crec|clientes|desarroll/u],
    ["calm-practice", /\b(practice|exercise|relax|pause|meditat)\b|практик|упражнен|отдох|расслаб|ejercicio|practica|relaj/u],
    ["self-check", /\b(test|check|assess|questionnaire)\b|тест|опрос|провер|prueba|cuestion/u],
    ["written-review", /\b(writ|review|analysis|letter)\b|письм|разбор|описат|escri|informe/u],
    ["reiki-course", /\b(course|lesson|learn|explore|free)\b|курс|учит|самост|бесплат|curso|aprender|gratis/u],
    ["reiki-guidance", /\b(initiat|level|gift|teacher|master)\b|инициа|ступен|подар|мастер|nivel|iniciacion|regalo/u],
    ["topic-work", /\b(work|job|business|clients?)\b|работ|бизнес|клиент|trabaj|negocio/u],
    ["topic-stress", /\b(stress|anxiety|calm|sleep)\b|стресс|тревог|спокойств|сон|ansiedad|calma|sueno/u],
  ];
  for (const [id, pattern] of patterns) {
    if (allowed.has(id) && pattern.test(value)) return id;
  }
  if (allowed.has("personal") &&
    !/(?:don't|do not|не хочу|no quiero).{0,18}(?:session|consult|консульт|сесс|personal)/u.test(value) &&
    /\b(talk|person|coach|master|session|consult\w*|appointment)\b|поговор|личн|мастер|консульт|сесс|sesion|personal|hablar/u.test(value))
    return "personal";
  if (allowed.has("written-review") && !context.matched &&
    /\b(partner|relationship|love)\b|отношен|партнер|любов|pareja|relacion/u.test(value))
    return "written-review";
  return null;
}
