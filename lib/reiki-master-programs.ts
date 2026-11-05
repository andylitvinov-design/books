import type { PublicLocale } from "@/lib/public-locales";

export const masterProgramIds = ["tantra", "kundalini", "yggdrasil-temple"] as const;
export type MasterProgramId = (typeof masterProgramIds)[number];
type LocalText = Record<PublicLocale, string>;

export type MasterReikiProgram = {
  id: MasterProgramId;
  image: string;
  academyPath: string;
  title: LocalText;
  teaser: LocalText;
  description: LocalText;
  audience: LocalText;
  format: LocalText;
  topics: Record<PublicLocale, readonly string[]>;
};

export const masterReikiPrograms: Record<MasterProgramId, MasterReikiProgram> = {
  tantra: {
    id: "tantra",
    image: "/images/holistic-house/hero-olive-incense.webp",
    academyPath: "reiki/tantra-reiki",
    title: { en: "Tantra Reiki Master", ru: "Мастер Тантра Рейки", es: "Maestría en Tantra Reiki" },
    teaser: {
      en: "Body awareness, life energy, connection and a nine-level study route.",
      ru: "Телесная осознанность, энергия жизни, контакт и путь из девяти ступеней.",
      es: "Conciencia corporal, energía vital, conexión y un recorrido de nueve niveles.",
    },
    description: {
      en: "A personal, teacher-guided continuation of the free introduction. Explore the nine-level Tantra Reiki curriculum, develop your own practice and learn to communicate its boundaries responsibly.",
      ru: "Личное обучение с наставником после бесплатного введения. Изучи девять ступеней Тантра Рейки, углуби практику и научись бережно объяснять её границы.",
      es: "Continuación personal con guía después de la introducción gratuita. Explora los nueve niveles, desarrolla tu práctica y aprende a explicar sus límites.",
    },
    audience: {
      en: "For people who have tried the introduction and want structured training, personal guidance and a deeper understanding of the tradition.",
      ru: "Для тех, кто познакомился с практиками и хочет последовательного обучения, личной поддержки и углубления в традицию.",
      es: "Para quienes conocen la introducción y desean aprendizaje estructurado, orientación personal y profundización.",
    },
    format: {
      en: "Individual learning path, guided exercises and personal discussion of levels and initiations.",
      ru: "Индивидуальный маршрут, упражнения с сопровождением и личное согласование ступеней и посвящений.",
      es: "Itinerario individual, ejercicios guiados y acuerdo personal de niveles e iniciaciones.",
    },
    topics: {
      en: ["The nine-level learning map, from Spring of Life onward", "Embodied attention, reflection and respectful boundaries", "Personal practice, feedback and individually arranged initiations"],
      ru: ["Девять ступеней обучения, начиная с «Родника жизни»", "Внимание к телу, рефлексия и уважение границ", "Личная практика, обратная связь и посвящения по согласованию"],
      es: ["Nueve niveles de formación, desde Manantial de Vida", "Atención corporal, reflexión y respeto de límites", "Práctica, comentarios e iniciaciones acordadas personalmente"],
    },
  },
  kundalini: {
    id: "kundalini",
    image: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
    academyPath: "reiki/kundalini-reiki",
    title: { en: "Kundalini Reiki Master", ru: "Мастер Кундалини Рейки", es: "Maestría en Kundalini Reiki" },
    teaser: {
      en: "A clear three-level pathway with guided practice and mentorship.",
      ru: "Три последовательные ступени, практика с сопровождением и наставничество.",
      es: "Tres niveles progresivos con práctica guiada y mentoría.",
    },
    description: {
      en: "Go beyond the free introductory lesson with a three-level Kundalini Reiki learning path, based on the existing course materials and supported by personal guidance.",
      ru: "Продолжи бесплатное знакомство через три ступени Кундалини Рейки, существующие учебные материалы и персональную поддержку.",
      es: "Continúa más allá de la lección gratuita con tres niveles de Kundalini Reiki, materiales existentes y orientación personal.",
    },
    audience: {
      en: "For learners who prefer a concise level-by-level programme and would like feedback rather than self-study alone.",
      ru: "Для тех, кому подходит последовательная программа по ступеням и важна обратная связь, а не только самостоятельное изучение.",
      es: "Para quienes prefieren un programa por niveles y desean comentarios además del estudio autónomo.",
    },
    format: {
      en: "Three study levels, exercises, the existing source manual and an individual plan for further training.",
      ru: "Три ступени, упражнения, существующая методичка и индивидуальный план дальнейшего обучения.",
      es: "Tres niveles, ejercicios, manual de referencia disponible y plan de aprendizaje individual.",
    },
    topics: {
      en: ["Stages 1–3 and the existing Paul Crick source manual", "Regular personal practice with teacher feedback", "Further master-level learning and initiations discussed separately"],
      ru: ["Ступени 1–3 и существующая методичка Пола Крика", "Регулярная личная практика с обратной связью", "Мастерский уровень и посвящения обсуждаются отдельно"],
      es: ["Niveles 1–3 y el manual original de Paul Crick", "Práctica regular con comentarios del profesor", "Formación avanzada e iniciaciones acordadas por separado"],
    },
  },
  "yggdrasil-temple": {
    id: "yggdrasil-temple",
    image: "/academy/reiki-yggdrasil/source/temple-studies.png",
    academyPath: "reiki/yggdrasil",
    title: {
      en: "Reiki Yggdrasil & Temple Traditions Master",
      ru: "Мастер Рейки Иггдрасиль и храмовых традиций",
      es: "Maestría en Reiki Yggdrasil y tradiciones del templo",
    },
    teaser: {
      en: "World Tree, runes, symbolic practices and temple traditions.",
      ru: "Мировое древо, руны, символические практики и храмовые традиции.",
      es: "Árbol del Mundo, runas, prácticas simbólicas y tradiciones de templo.",
    },
    description: {
      en: "A deeper guided pathway through Reiki Yggdrasil and related historical temple studies. Begin with its foundational levels, then choose appropriate advanced symbolic branches with your teacher.",
      ru: "Углублённый путь с наставником по Рейки Иггдрасиль и связанным храмовым традициям. Начни с базовых ступеней, а затем выбери подходящие направления символической практики.",
      es: "Un recorrido guiado de Reiki Yggdrasil y estudios históricos de templo. Empieza por los niveles básicos y elige ramas simbólicas avanzadas con tu profesor.",
    },
    audience: {
      en: "For learners drawn to the structured Yggdrasil school, runic symbolism and historical temple traditions.",
      ru: "Для тех, кому близки структурная школа Иггдрасиль, символизм рун и исторические храмовые традиции.",
      es: "Para quienes se interesan por la escuela Yggdrasil, el simbolismo rúnico y las tradiciones históricas de templo.",
    },
    format: {
      en: "Foundation levels, selected advanced modules and personalised mentoring; the final route is agreed individually.",
      ru: "Базовые ступени, выбранные продвинутые модули и личное наставничество; состав программы согласуется индивидуально.",
      es: "Niveles básicos, módulos avanzados elegidos y mentoría personal; el itinerario se acuerda individualmente.",
    },
    topics: {
      en: ["Reiki Yggdrasil foundations and its World Tree model", "Rune work and temple traditions as symbolic cultural study", "Advanced study modules, reflection and personal guidance"],
      ru: ["Базовые ступени Рейки Иггдрасиль и модель Мирового древа", "Руны и храмовые традиции как символические культурные практики", "Продвинутые модули, рефлексия и личное сопровождение"],
      es: ["Fundamentos de Reiki Yggdrasil y el Árbol del Mundo", "Runas y tradiciones de templo como estudio cultural simbólico", "Módulos avanzados, reflexión y acompañamiento personal"],
    },
  },
};

export const masterReikiUi: Record<PublicLocale, {
  freeLabel: string; freeHeading: string; freeText: string; freePreview: string;
  kicker: string; heading: string; intro: string; paid: string; preview: string;
  learnMore: string; interested: string; overview: string; target: string; format: string;
  studyMaterials: string; back: string; requestTitle: string; requestLead: string;
  requestText: string; notice: string;
}> = {
  en: {
    freeLabel: "01 · FREE INTRODUCTION",
    freeHeading: "Free Reiki Practitioner course · 5 lessons",
    freeText: "Your first step: try five short lessons, explore three Reiki traditions and choose what to study next. No purchase required.",
    freePreview: "Preview the five lessons",
    kicker: "02–04 · PAID MASTER TRAINING",
    heading: "Choose your next step: three master programmes",
    intro: "The free course is only the introduction. These are three separate, paid teacher-guided programmes. Open a card to compare them, then see its own page and request details.",
    paid: "Paid · fee on request",
    preview: "What the programme includes",
    learnMore: "Learn more",
    interested: "I'm interested · request information",
    overview: "Your learning pathway",
    target: "Who it is for",
    format: "How we learn",
    studyMaterials: "Explore existing study materials",
    back: "Back to all programmes",
    requestTitle: "Interested in this master programme?",
    requestLead: "Ask about your starting level, tuition, schedule, format and available places. No payment or registration is made by opening this page.",
    requestText: "I am interested in this paid Reiki master training. Please send me the current price, available dates, study format, levels and next steps.",
    notice: "This is a paid, personally arranged educational programme. Fees, dates and any initiation are confirmed by Andrey separately. It does not grant a regulated healthcare qualification or guarantee a professional outcome.",
  },
  ru: {
    freeLabel: "01 · БЕСПЛАТНЫЙ ВВОДНЫЙ КУРС",
    freeHeading: "Бесплатный курс «Практик Рейки» · 5 уроков",
    freeText: "Первый шаг: пять коротких уроков, знакомство с тремя традициями и выбор дальнейшего пути. Покупка не нужна.",
    freePreview: "Посмотреть пять уроков",
    kicker: "02–04 · ПЛАТНЫЕ МАСТЕРСКИЕ ПРОГРАММЫ",
    heading: "Три программы для углублённого обучения",
    intro: "Бесплатный курс — только введение. Дальше три отдельные платные программы с наставником. Раскройте карточку, изучите подробности и запросите информацию.",
    paid: "Платно · стоимость по запросу",
    preview: "Что входит в программу",
    learnMore: "Узнать больше",
    interested: "Мне интересно · запросить информацию",
    overview: "Путь обучения",
    target: "Для кого программа",
    format: "Как проходит обучение",
    studyMaterials: "Посмотреть существующие материалы",
    back: "Ко всем программам",
    requestTitle: "Интересует мастерская программа?",
    requestLead: "Уточните подходящую ступень, стоимость, даты, формат и доступные места. Открытие страницы не создаёт платный заказ.",
    requestText: "Меня интересует платная мастерская программа Рейки. Подскажите актуальную стоимость, даты, формат, ступени и следующие шаги.",
    notice: "Это платная образовательная программа с личным согласованием. Цену, даты и посвящения подтверждает Андрей отдельно. Программа не даёт медицинской квалификации и не гарантирует профессиональные результаты.",
  },
  es: {
    freeLabel: "01 · CURSO INTRODUCTORIO GRATIS",
    freeHeading: "Curso Reiki Practitioner gratis · 5 lecciones",
    freeText: "Primer paso: cinco lecciones breves, tres tradiciones Reiki y la elección de tu próxima etapa. Sin compra.",
    freePreview: "Explorar las cinco lecciones",
    kicker: "02–04 · MAESTRÍAS DE PAGO",
    heading: "Tres programas de maestría para continuar",
    intro: "El curso gratuito es solo la introducción. Estos son tres programas de pago con acompañamiento. Abre una tarjeta y solicita información.",
    paid: "De pago · precio a consultar",
    preview: "Qué incluye el programa",
    learnMore: "Más información",
    interested: "Me interesa · solicitar información",
    overview: "Recorrido formativo",
    target: "A quién va dirigido",
    format: "Cómo se aprende",
    studyMaterials: "Explorar materiales existentes",
    back: "Volver a los programas",
    requestTitle: "¿Te interesa esta maestría?",
    requestLead: "Consulta nivel inicial, precio, fechas, modalidad y plazas disponibles. No se efectúa ningún pago aquí.",
    requestText: "Me interesa esta formación de maestría Reiki de pago. Envíame el precio actual, fechas, modalidad, niveles y próximos pasos.",
    notice: "Programa educativo de pago que se acuerda personalmente. Andrey confirma precios, fechas e iniciaciones. No otorga cualificación sanitaria reglamentada ni garantiza resultados profesionales.",
  },
};
