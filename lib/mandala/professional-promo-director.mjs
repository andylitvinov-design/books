/**
 * Holistic House Professional Promo Director · local-only, deterministic B2B pilot.
 * A creative script/shot suggestion, NOT a licensed claims validator or AI renderer.
 * Public-facing practice details stay in this browser; no client records, analytics,
 * external API, auto-publishing or paid services.
 */
export const PROFESSIONAL_PROMO_FORMATS = ["introduction", "service", "event", "insight"];
export const PROFESSIONAL_PROMO_ROLES = ["psychologist", "psychotherapist", "coach", "somatic", "yoga", "facilitator"];
export const PROFESSIONAL_PROMO_TOPICS = ["relationships", "stress", "transitions", "confidence", "reflection", "mindfulness"];
export const PROFESSIONAL_PROMO_ACTIONS = ["details", "booking", "contact"];

const COPY = {
  ru: {
    roles: {
      psychologist: "психолог", psychotherapist: "психотерапевт", coach: "коуч",
      somatic: "телесный практик", yoga: "преподаватель йоги", facilitator: "ведущий групп",
    },
    formats: {
      introduction: "Видеовизитка", service: "О моей услуге",
      event: "Приглашение на встречу", insight: "Полезный вопрос",
    },
    topics: {
      relationships: "отношения и общение", stress: "напряжение и восстановление",
      transitions: "жизненные перемены", confidence: "уверенность и выбор",
      reflection: "самопонимание", mindfulness: "внимание к себе",
    },
    actions: {details: "Узнайте больше о формате", booking: "Уточните условия записи", contact: "Свяжитесь со мной, если хотите обсудить запрос"},
    headline: {
      introduction: "Знакомство со специалистом", service: "Пространство для вашего запроса",
      event: "Открытая встреча", insight: "Один вопрос для себя",
    },
    opening: {
      introduction: "Иногда важно просто понять, к кому можно обратиться и как проходит работа.",
      service: "У каждого человека свой вопрос, темп и способ находить опору.",
      event: "Приглашаю на встречу, посвящённую теме",
      insight: "Попробуйте короткую паузу и задайте себе вопрос: что сейчас для меня действительно важно?",
    },
    description: {
      introduction: "Расскажу о своём подходе и о том, как можно начать знакомство без обязательств.",
      service: "На встрече мы можем бережно прояснить ваш запрос, ожидания и возможные следующие шаги.",
      event: "Это возможность исследовать тему, задать вопросы и узнать формат заранее. Дату и условия участия смотрите в описании события.",
      insight: "Отмечайте ответ без спешки и оценок. Если нужен разговор, можно обсудить ваш запрос.",
    },
    name: name => "Меня зовут " + name + ".",
    role: role => "Моя профессиональная область — " + role + ".",
    topic: topic => "Тема — «" + topic + "».",
    storyboard: ["Вступление и контекст", "Знакомство / полезная мысль", "Как устроен формат", "Спокойное приглашение"],
  },
  en: {
    roles: {
      psychologist: "psychology", psychotherapist: "psychotherapy", coach: "coaching",
      somatic: "somatic practices", yoga: "yoga instruction", facilitator: "group facilitation",
    },
    formats: {
      introduction: "Meet the practitioner", service: "Explain a service",
      event: "Invite to an event", insight: "One useful reflection",
    },
    topics: {
      relationships: "relationships and communication", stress: "stress and recovery",
      transitions: "life transitions", confidence: "confidence and decisions",
      reflection: "self-understanding", mindfulness: "mindful attention",
    },
    actions: {details: "Learn more about the format", booking: "Explore appointment options", contact: "Get in touch if you would like to discuss your goals"},
    headline: {
      introduction: "Meet the practitioner", service: "A space for your questions",
      event: "An invitation to meet", insight: "One question for today",
    },
    opening: {
      introduction: "Choosing someone to speak with often starts with understanding their approach.",
      service: "Every person brings a different question, pace and expectation.",
      event: "You're invited to a conversation around",
      insight: "Pause briefly and ask yourself: what matters to me right now?",
    },
    description: {
      introduction: "I can explain my approach and what a first conversation looks like, without pressure.",
      service: "A meeting can help clarify what you're looking for, your expectations and possible next steps.",
      event: "Come to explore the topic, ask questions and learn the format. Find dates and participation details on the event page.",
      insight: "Notice your answer without judging it. If a conversation would help, you're welcome to ask about the format.",
    },
    name: name => "My name is " + name + ".",
    role: role => "My field of practice is " + role + ".",
    topic: topic => "The topic is " + topic + ".",
    storyboard: ["Introduction and context", "About the practitioner / insight", "What to expect", "Gentle invitation"],
  },
  es: {
    roles: {
      psychologist: "psicología", psychotherapist: "psicoterapia", coach: "coaching",
      somatic: "prácticas somáticas", yoga: "enseñanza de yoga", facilitator: "facilitación de grupos",
    },
    formats: {
      introduction: "Presentación profesional", service: "Explicar un servicio",
      event: "Invitación a un evento", insight: "Una reflexión útil",
    },
    topics: {
      relationships: "relaciones y comunicación", stress: "estrés y recuperación",
      transitions: "cambios de vida", confidence: "confianza y decisiones",
      reflection: "autoconocimiento", mindfulness: "atención consciente",
    },
    actions: {details: "Conoce mejor el formato", booking: "Consulta las opciones de cita", contact: "Escríbeme si quieres hablar de tus objetivos"},
    headline: {
      introduction: "Conoce al profesional", service: "Un espacio para tu consulta",
      event: "Invitación a un encuentro", insight: "Una pregunta para hoy",
    },
    opening: {
      introduction: "Conocer el enfoque de un profesional es un buen primer paso.",
      service: "Cada persona llega con preguntas, ritmos y expectativas diferentes.",
      event: "Te invito a un encuentro sobre",
      insight: "Haz una pausa breve y pregúntate: ¿qué es importante para mí ahora?",
    },
    description: {
      introduction: "Puedo contarte mi enfoque y cómo es una primera conversación, sin presión.",
      service: "Una conversación puede servir para aclarar tu consulta, tus expectativas y los siguientes pasos posibles.",
      event: "Un espacio para explorar el tema y hacer preguntas. Consulta fechas y condiciones en la página del evento.",
      insight: "Observa tu respuesta sin juzgarla. Si deseas conversar, puedes preguntar por el formato.",
    },
    name: name => "Me llamo " + name + ".",
    role: role => "Mi campo profesional es " + role + ".",
    topic: topic => "El tema es " + topic + ".",
    storyboard: ["Presentación y contexto", "Quién es / idea útil", "Cómo funciona", "Invitación respetuosa"],
  },
};

export function professionalPromoLabels(locale = "ru") {
  const text = COPY[locale] || COPY.ru;
  return { roles: text.roles, formats: text.formats, topics: text.topics, actions: text.actions };
}

const FORMAT_PRESETS = {
  introduction: "warm-connection",
  service: "first-step",
  event: "light-and-space",
  insight: "natural-stillness",
};
function allowed(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}
export function normalizePublicPracticeName(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 48);
}
export function buildProfessionalPromo({
  locale = "ru", format = "introduction", role = "psychologist",
  topic = "reflection", action = "details", displayName = "",
} = {}) {
  const language = COPY[locale] ? locale : "ru";
  const f = allowed(format, PROFESSIONAL_PROMO_FORMATS, "introduction");
  const r = allowed(role, PROFESSIONAL_PROMO_ROLES, "psychologist");
  const t = allowed(topic, PROFESSIONAL_PROMO_TOPICS, "reflection");
  const a = allowed(action, PROFESSIONAL_PROMO_ACTIONS, "details");
  const text = COPY[language];
  const publicName = normalizePublicPracticeName(displayName);
  const beats = [
    text.opening[f] + (f === "event" ? " «" + text.topics[t] + "»." : ""),
    [publicName ? text.name(publicName) : "", text.role(text.roles[r]), text.topic(text.topics[t])].filter(Boolean).join(" "),
    text.description[f],
    text.actions[a] + ".",
  ];
  return {
    locale: language, format: f, role: r, topic: t, action: a,
    publicName, title: text.formats[f], headline: text.headline[f],
    voiceScript: beats.join(" "),
    beats: beats.map((script, index) => ({label: text.storyboard[index], script})),
    presetId: FORMAT_PRESETS[f],
    durationSeconds: 30,
    aspect: "portrait",
    mode: "FREE_LOCAL_VISUAL_DRAFT",
  };
}
