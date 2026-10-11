import type { PublicLocale } from "@/lib/public-locales";

/**
 * Editorial contract: visible paragraphs below are direct short excerpts from
 * the user's PsiMaster / SuperSkills / PsiTrends pages, or translations of
 * those excerpts and the USER-UPLOADED Paul Crick manual. Do not expand these
 * into AI-written promises, curricula, diagnoses or supplemental explanations.
 *
 * Attribution: original 24-page PDF = "Kundalini Reiki Manual", Paul Crick.
 * Source-page references are internal for reconciliation, not offsite CTAs.
 */

export type LocalText = Record<PublicLocale, string>;
export type SourceExcerpt = {
  label: LocalText;
  text: LocalText;
  origin: string;
};

export const kundaliniOriginalManual = {
  path: "/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf",
  fileName: "Kundalini_Reiki_Manual_Paul_Crick.pdf",
  author: "Paul Crick",
  pages: 24,
  size: 243352,
  sha256: "dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b",
} as const;

export const kundaliniSourceEvidence = [
  { name: "PsiMaster · Кундалини Рейки — Базовый курс (1–3 ступень)", url: "https://psimaster.net/service?shs_term_node_tid_depth=12345" },
  { name: "SuperSkills · Kundalini Reiki — Free Class", url: "https://superskills.vip/trial-express-programs/academy-overview/master-of-kundalini-reiki.html" },
  { name: "SuperSkills · Reiki Healing Marathon", url: "https://superskills.vip/trial-express-programs/academy-overview.html" },
  { name: "SuperSkills · Vedic & Tantric Heritage", url: "https://superskills.vip/shamanicacademy/vedic-tantric-magic.html" },
  { name: "PsiTrends · Shamanic Reiki School", url: "https://psitrends.com/studies/adv/reiki" },
  { name: "Paul Crick · Kundalini Reiki Manual", page: "uploaded PDF, 24 pages" },
] as const;

export const kundaliniInterface: Record<PublicLocale, {
  eyebrow: string;
  title: string;
  heroLead: string;
  heroDetail: string;
  heroSource: string;
  levelCount: string;
  manualCount: string;
  start: string;
  download: string;
  introduction: string;
  whatIsKundalini: string;
  tradition: string;
  levelsTitle: string;
  level: string;
  readLevel: string;
  excerptTitle: string;
  practicesTitle: string;
  balanceTitle: string;
  balanceSource: string;
  balanceDescription: string;
  extraAttunementsTitle: string;
  extraAttunementsSummary: string;
  extensionsTitle: string;
  extensionsSource: string;
  expand: string;
  manualTitle: string;
  manualAttribution: string;
  manualSections: string;
  manualNote: string;
  sourcesLabel: string;
  caution: string;
  howToLearnTitle: string;
  howToLearnQuote: string;
  contactTitle: string;
  contactText: string;
  enquire: string;
  personal: string;
  telegram: string;
  related: string;
}> = {
  en: {
    eyebrow: "Kundalini Reiki · Basic course",
    title: "Kundalini Reiki",
    heroLead: "Kundalini Reiki is a different form of energy than traditional Usui Reiki. This is because it combines the Kundalini Energy (energy from the earth) along with the Reiki energy.",
    heroDetail: "When a person receives all 3 Kundalini Reiki ‘attunements’ they then become a Kundalini Reiki Master.",
    heroSource: "SuperSkills · Kundalini Reiki",
    levelCount: "3 attunements",
    manualCount: "24-page manual",
    start: "Explore the levels",
    download: "Download original PDF",
    introduction: "Introduction to Kundalini Reiki",
    whatIsKundalini: "What is Kundalini?",
    tradition: "Kundalini energy is also referred to as “the Kundalini Fire”.",
    levelsTitle: "Kundalini Reiki 1 · 2 · 3",
    level: "Level",
    readLevel: "Read original practices",
    excerptTitle: "From the original course",
    practicesTitle: "First recommendations",
    balanceTitle: "Balance",
    balanceSource: "PsiMaster: Level 2 · Paul Crick manual: p. 13",
    balanceDescription: "Hold the tips of your fingers and thumbs of the opposite hands together for 30 seconds and think “balance”.",
    extraAttunementsTitle: "Extra Attunements that come with the Kundalini 3 attunement",
    extraAttunementsSummary: "Diamond Reiki · Crystalline Reiki · DNA Reiki · The trauma of birth · Location Reiki · Past life Reiki · Balance",
    extensionsTitle: "Further attunements in the original manual",
    extensionsSource: "Paul Crick · Kundalini Reiki Manual · pp. 16–22",
    expand: "See details",
    manualTitle: "Kundalini Reiki Manual",
    manualAttribution: "Paul Crick · Original 24-page PDF",
    manualSections: "Kundalini Reiki 1–3 · Diamond · Crystalline · DNA · Birth trauma · Location · Past life · Balance · Boosters · Gold Reiki · Ethereal Crystals",
    manualNote: "The exact original file provided for this course.",
    sourcesLabel: "Source material",
    caution: "Historical spiritual teaching materials; no medical effect is established. Reiki does not replace healthcare.",
    howToLearnTitle: "Course Structure",
    howToLearnQuote: "Includes: Video, reading, partner practice, meditation, report",
    contactTitle: "Kundalini Reiki · Training",
    contactText: "Kundalini Reiki (3 levels)",
    enquire: "Ask about training",
    personal: "Request Level 1 initiation",
    telegram: "Telegram",
    related: "Other Reiki systems",
  },
  ru: {
    eyebrow: "Кундалини Рейки · Базовый курс",
    title: "Кундалини Рейки",
    heroLead: "Кундалини Рейки для практиков. Главный канал энергии, от первой чакры до чакры Корона, чистится и готовится к пробуждению Кундалини, которое Вы испытаете в Кундалини Рейки 2.",
    heroDetail: "Кундалини Рейки — Базовый курс (1–3 ступень).",
    heroSource: "PsiMaster · Кундалини Рейки",
    levelCount: "3 ступени",
    manualCount: "24 страницы PDF",
    start: "Посмотреть ступени",
    download: "Скачать оригинальный PDF",
    introduction: "Введение в Кундалини Рейки",
    whatIsKundalini: "Что такое Кундалини?",
    tradition: "Энергия Кундалини также называется «Огнём Кундалини».",
    levelsTitle: "Кундалини Рейки · ступени 1, 2, 3",
    level: "Ступень",
    readLevel: "Подробнее из первоисточника",
    excerptTitle: "Из исходной программы",
    practicesTitle: "Первые рекомендации",
    balanceTitle: "Баланс",
    balanceSource: "PsiMaster: ступень 2 · Paul Crick: стр. 13",
    balanceDescription: "Соединяете подушечки пальцев рук попарно на 30 сек. и проговариваете мысленно: «Кундалини Рейки, Баланс».",
    extraAttunementsTitle: "Дополнительные настройки с третьей ступенью",
    extraAttunementsSummary: "Алмазное Рейки · Кристаллическое Рейки · ДНК Рейки · Родовая травма · Местоположение Рейки · Прошлая жизнь Рейки · Баланс",
    extensionsTitle: "Дополнительные ступени из оригинальной методички",
    extensionsSource: "Paul Crick · Kundalini Reiki Manual · стр. 16–22",
    expand: "Подробнее",
    manualTitle: "Kundalini Reiki Manual",
    manualAttribution: "Paul Crick · Оригинальный PDF, 24 страницы",
    manualSections: "Кундалини Рейки 1–3 · Алмазное · Кристаллическое · ДНК · Рождение · Местоположение · Прошлая жизнь · Баланс · Booster · Gold Reiki · Ethereal Crystals",
    manualNote: "Тот самый оригинальный документ, который приложен к курсу.",
    sourcesLabel: "Первоисточники",
    caution: "Исторические материалы духовной традиции. Лечебное действие не установлено; Рейки не заменяет медицинскую помощь.",
    howToLearnTitle: "Структура обучения",
    howToLearnQuote: "Видео, чтение, практика с партнёром, медитация, отчёт",
    contactTitle: "Кундалини Рейки · Обучение",
    contactText: "Кундалини Рейки (3 ступени)",
    enquire: "Уточнить условия обучения",
    personal: "Запросить инициацию 1-й ступени",
    telegram: "Telegram",
    related: "Другие системы Рейки",
  },
  es: {
    eyebrow: "Kundalini Reiki · Curso básico",
    title: "Kundalini Reiki",
    heroLead: "Kundalini Reiki es una forma de energía diferente del Reiki Usui tradicional. Combina la energía Kundalini (la energía de la Tierra) con la energía Reiki.",
    heroDetail: "Al recibir las tres iniciaciones de Kundalini Reiki, la persona se convierte en Maestro de Kundalini Reiki.",
    heroSource: "SuperSkills · Kundalini Reiki",
    levelCount: "3 niveles",
    manualCount: "Manual de 24 páginas",
    start: "Explorar los niveles",
    download: "Descargar PDF original",
    introduction: "Introducción a Kundalini Reiki",
    whatIsKundalini: "¿Qué es Kundalini?",
    tradition: "La energía Kundalini también se denomina «Fuego Kundalini».",
    levelsTitle: "Kundalini Reiki 1 · 2 · 3",
    level: "Nivel",
    readLevel: "Leer prácticas originales",
    excerptTitle: "Del curso original",
    practicesTitle: "Primeras recomendaciones",
    balanceTitle: "Balance",
    balanceSource: "PsiMaster: nivel 2 · Manual de Paul Crick: p. 13",
    balanceDescription: "Une las yemas de los dedos y pulgares de ambas manos durante 30 segundos y piensa «balance».",
    extraAttunementsTitle: "Sintonizaciones adicionales del nivel 3",
    extraAttunementsSummary: "Reiki Diamante · Reiki Cristalino · Reiki ADN · Trauma del nacimiento · Reiki de lugar · Reiki de vidas pasadas · Balance",
    extensionsTitle: "Sintonizaciones adicionales del manual original",
    extensionsSource: "Paul Crick · Kundalini Reiki Manual · pp. 16–22",
    expand: "Ver detalles",
    manualTitle: "Kundalini Reiki Manual",
    manualAttribution: "Paul Crick · PDF original de 24 páginas",
    manualSections: "Kundalini Reiki 1–3 · Diamante · Cristalino · ADN · Nacimiento · Lugar · Vidas pasadas · Balance · Boosters · Gold Reiki · Ethereal Crystals",
    manualNote: "El mismo archivo original proporcionado para este curso.",
    sourcesLabel: "Materiales originales",
    caution: "Materiales históricos de una tradición espiritual. No se ha demostrado un efecto médico y no sustituyen la atención sanitaria.",
    howToLearnTitle: "Estructura del curso",
    howToLearnQuote: "Vídeo, lectura, práctica en pareja, meditación e informe",
    contactTitle: "Kundalini Reiki · Formación",
    contactText: "Kundalini Reiki (3 niveles)",
    enquire: "Consultar formación",
    personal: "Solicitar iniciación de nivel 1",
    telegram: "Telegram",
    related: "Otros sistemas de Reiki",
  },
};

export type KundaliniLesson = {
  number: 1 | 2 | 3;
  title: LocalText;
  summary: LocalText;
  source: string;
  practice: SourceExcerpt[];
  image: string;
};

export const kundaliniLessons: KundaliniLesson[] = [
  {
    number: 1,
    title: { en: "Kundalini Reiki 1", ru: "1 ступень Кундалини Рейки", es: "Kundalini Reiki 1" },
    summary: {
      en: "The main energy channel, from the Crown chakra to the Root chakra, is cleansed and prepared for the Kundalini awakening that you will experience in Kundalini Reiki 2.",
      ru: "Главный канал энергии, от первой чакры до чакры Корона, чистится и готовится к пробуждению Кундалини, которое Вы испытаете в Кундалини Рейки 2.",
      es: "El canal principal de energía, desde el chakra corona hasta el chakra raíz, se limpia y prepara para el despertar Kundalini descrito en Kundalini Reiki 2.",
    },
    source: "Paul Crick · Manual p. 5 · PsiMaster",
    image: "/academy/kundalini-reiki/kundalini-manual-level-1.jpg",
    practice: [
      {
        label: { en: "Self healing", ru: "Самолечение", es: "Autotratamiento" },
        text: {
          en: "This is the same method that should be used for self-healing. It is a good idea to perform a self-healing every day.",
          ru: "Лечить себя можно в любом удобном для вас положении: лёжа, сидя, стоя. Важно расслабиться, чтобы комфортно себя чувствовать.",
          es: "Puedes practicar contigo en cualquier posición cómoda: acostado, sentado o de pie. Lo importante es relajarte.",
        },
        origin: "Paul Crick p. 6 / PsiMaster Level 1",
      },
      {
        label: { en: "Healing", ru: "Вариант первый · гассё", es: "Gassho" },
        text: {
          en: "Clear your thoughts and think to yourself “Reiki” to start the energy flow. Just let the energy flow.",
          ru: "Сложите ладони на уровне сердца в «молитвенное» положение (в Японии такое положение рук называют «гассё»).",
          es: "Junta las palmas a la altura del corazón en la posición «gassho».",
        },
        origin: "Paul Crick p. 5 / PsiMaster Level 1",
      },
      {
        label: { en: "Remote healing", ru: "Дистанционное", es: "A distancia" },
        text: {
          en: "Visualize the receiver, or the receiver’s name or names in the palm of your hand. Then place your palms together.",
          ru: "Визуализировать пациента, или его имя в ладони, можете написать его на бумаге и соедините ладони вместе.",
          es: "Visualiza a la persona o su nombre en la palma de tu mano. Después junta las palmas.",
        },
        origin: "Paul Crick p. 6 / PsiMaster",
      },
      {
        label: { en: "Situation/qualities healing", ru: "Работа с ситуацией", es: "Situaciones y cualidades" },
        text: {
          en: "You can also help heal a situation or a personal quality/character trait.",
          ru: "Так же направляется энергия и на гармонизацию ситуаций.",
          es: "También puedes dirigir la intención hacia una situación o una cualidad personal.",
        },
        origin: "Paul Crick p. 7 / PsiMaster",
      },
      {
        label: { en: "Consent", ru: "Согласие", es: "Consentimiento" },
        text: {
          en: "Remember that it should always “feel right” when you start a healing procedure.",
          ru: "Этически неоправданно посылать Рейки тому, кто об этом не просил.",
          es: "No es apropiado dirigir Reiki a quien no lo haya solicitado.",
        },
        origin: "Paul Crick p. 7 / PsiMaster Level 1",
      },
    ],
  },
  {
    number: 2,
    title: { en: "Kundalini Reiki 2", ru: "2 ступень Кундалини Рейки", es: "Kundalini Reiki 2" },
    summary: {
      en: "The Kundalini Reiki 1 attunement is strengthened and the base chakra is opened, the third eye is enlarged.",
      ru: "Пробуждается энергия Кундалини, увеличивается чакра третьего глаза.",
      es: "La sintonización de Kundalini Reiki 1 se refuerza; se abre el chakra base y se amplía el tercer ojo.",
    },
    source: "Paul Crick · Manual pp. 8–9 · PsiMaster",
    image: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
    practice: [
      {
        label: { en: "Kundalini Reiki Meditation", ru: "Медитация Кундалини Рейки", es: "Meditación Kundalini Reiki" },
        text: {
          en: "Sit or lay down with your eyes closed. Think “Kundalini Reiki Meditation”. The process will then start, and will automatically stop around 5 to 15 minutes later.",
          ru: "Сядьте или лягте с закрытыми глазами. Мысленно произнесите «Kundalini Reiki Meditation».",
          es: "Siéntate o recuéstate con los ojos cerrados. Piensa «Kundalini Reiki Meditation».",
        },
        origin: "Paul Crick p. 9",
      },
      {
        label: { en: "Healing", ru: "Работа с потоком", es: "Práctica" },
        text: {
          en: "From now on, when you are healing you should think “Kundalini Reiki”.",
          ru: "Теперь, когда вы пользуетесь энергией (в т.ч. для лечения, чистки помещений, гармонизации отношений и ситуаций и пр.), надо думать не «Рейки», а «Кундалини Рейки».",
          es: "A partir de ahora, al practicar, piensa «Kundalini Reiki» en lugar de «Reiki».",
        },
        origin: "Paul Crick p. 8 / PsiMaster Level 2",
      },
      {
        label: { en: "Meditation duration", ru: "Длительность медитации", es: "Duración" },
        text: {
          en: "The meditation usually takes between 5 and 10 minutes.",
          ru: "Медитация Кундалини Рейки — 5–10 минут (согласно Paul Crick, стр. 8).",
          es: "La meditación suele durar entre 5 y 10 minutos.",
        },
        origin: "Paul Crick p. 8",
      },
    ],
  },
  {
    number: 3,
    title: { en: "Kundalini Reiki 3 · Master", ru: "3 ступень Кундалини Рейки · Мастер", es: "Kundalini Reiki 3 · Maestro" },
    summary: {
      en: "Kundalini Reiki Master – The previous attunements are strengthened and the Throat, Solar Plexus, Hara and Root Chakras are opened wider.",
      ru: "Предыдущие настройки усилены. Горло, Солнечное сплетение, Хара стабилизируются, чакры открыты.",
      es: "Kundalini Reiki Maestro: se refuerzan las sintonizaciones anteriores y se amplían los chakras garganta, plexo solar, Hara y raíz.",
    },
    source: "Paul Crick · Manual pp. 10–16 · PsiMaster",
    image: "/academy/kundalini-reiki/kundalini-manual-level-3.jpg",
    practice: [
      {
        label: { en: "Objects and crystals", ru: "Кристаллы и предметы", es: "Cristales y objetos" },
        text: {
          en: "You are taught to attune Crystals and other objects, so that they act as Reiki channels.",
          ru: "Вы сможете настроить Кристаллы и другие объекты, так, чтобы они действовали как каналы Рейки.",
          es: "Aprendes a sintonizar cristales y otros objetos para que actúen como canales Reiki.",
        },
        origin: "Paul Crick p. 10 / PsiMaster Level 3",
      },
      {
        label: { en: "How to pass on Kundalini Reiki 1-2-3", ru: "Как настраивать человека на Кундалини Рейки", es: "Cómo transmitir Kundalini Reiki 1–3" },
        text: {
          en: "It is very simple to pass on the Kundalini Reiki attunements. You just ask your higher self for the attunements.",
          ru: "Это очень простой процесс. Вы просите ваше Высшее Я дать настройку. Вы можете настраивать несколько человек сразу.",
          es: "El texto describe la transmisión de las iniciaciones de Kundalini Reiki mediante una petición al Yo Superior.",
        },
        origin: "Paul Crick p. 15 / PsiMaster",
      },
      {
        label: { en: "Attuning objects", ru: "Инициация объектов", es: "Sintonizar objetos" },
        text: {
          en: "Crystals, trees and other objects can be opened to the Reiki energy.",
          ru: "Кристаллы, дерево и другие объекты могут быть открыты к энергии Рейки.",
          es: "Los cristales, árboles y otros objetos pueden abrirse a la energía Reiki, según el manual.",
        },
        origin: "Paul Crick p. 16 / PsiMaster",
      },
    ],
  },
];

export const kundaliniEveryday: SourceExcerpt[] = [
  {
    label: { en: "First recommendations", ru: "Первые рекомендации", es: "Primeras recomendaciones" },
    text: {
      en: "It is a good idea to perform a self-healing every day.",
      ru: "Во-первых, это работа с самим собой! Вы делаете себе сеансы ежедневно, краткосрочные можно.",
      es: "Es buena idea realizar una práctica personal cada día.",
    },
    origin: "Paul Crick p. 6 / PsiMaster",
  },
  {
    label: { en: "The hands", ru: "Положение ладоней", es: "Las manos" },
    text: {
      en: "Sit in a comfortable chair and place your arms either on the arms of the chair or one on each thigh with your palms facing upwards.",
      ru: "Руки должны лежать удобно, не напрягаться, подложите подушечку под них для удобства!",
      es: "Siéntate cómodamente y coloca los brazos sobre los apoyabrazos o en los muslos, con las palmas hacia arriba.",
    },
    origin: "Paul Crick p. 4 / PsiMaster",
  },
  {
    label: { en: "Relax", ru: "Расслабление", es: "Relajación" },
    text: {
      en: "You do not have to do anything else but relax and enjoy the experience.",
      ru: "Во время сеанса постарайтесь не концентрироваться на посторонних мыслях. Просто расслабьтесь и дайте энергии свободно течь.",
      es: "No necesitas hacer nada más que relajarte y disfrutar de la experiencia.",
    },
    origin: "Paul Crick p. 4 / PsiMaster",
  },
];

export const kundaliniExtraNames: LocalText[] = [
  { en: "Diamond Reiki", ru: "Алмазное Рейки", es: "Reiki Diamante" },
  { en: "Crystalline Reiki", ru: "Кристаллическое Рейки", es: "Reiki Cristalino" },
  { en: "DNA Reiki", ru: "ДНК Рейки", es: "Reiki ADN" },
  { en: "The trauma of birth", ru: "Родовая травма и Рейки", es: "Trauma del nacimiento" },
  { en: "Location Reiki", ru: "Местоположение Рейки", es: "Reiki de lugar" },
  { en: "Past life Reiki", ru: "Прошлая жизнь Рейки", es: "Reiki de vidas pasadas" },
  { en: "Balance", ru: "Баланс", es: "Balance" },
];

export const kundaliniExtraAttunements: SourceExcerpt[] = [
  {
    label: kundaliniExtraNames[0],
    text: {
      en: "During the opening an etheric diamond will be placed in the crown chakra.",
      ru: "Когда Вы хотите использовать эту технику, думайте «Алмазное Рейки» вместо «Кундалини Рейки».",
      es: "Durante la sintonización, el manual describe la colocación de un diamante etérico en el chakra corona.",
    },
    origin: "Paul Crick p. 10 / PsiMaster",
  },
  {
    label: kundaliniExtraNames[1],
    text: {
      en: "A complete treatment consists of two healing sessions.",
      ru: "Полное лечение состоит из двух сеансов. Сеанс делается 15–20 минут, один раз в день, два дня подряд.",
      es: "El manual describe dos sesiones como un tratamiento completo.",
    },
    origin: "Paul Crick p. 11 / PsiMaster",
  },
  {
    label: kundaliniExtraNames[2],
    text: {
      en: "This is reputed to strengthen the ability to heal DNA strands (our blue print).",
      ru: "Соедините ваши ладони и думайте: «ДНК, Рейки».",
      es: "El manual atribuye tradicionalmente a «Reiki ADN» un efecto sobre el ADN; esta afirmación no está demostrada.",
    },
    origin: "Paul Crick p. 11 / PsiMaster",
  },
  {
    label: kundaliniExtraNames[3],
    text: {
      en: "Put your hands together and think “Birth trauma Reiki”.",
      ru: "Соедините ваши руки и думайте: «Родовая травма, Рейки».",
      es: "Junta las manos y piensa «Birth trauma Reiki».",
    },
    origin: "Paul Crick p. 12 / PsiMaster",
  },
  {
    label: kundaliniExtraNames[4],
    text: {
      en: "Put your hands together and think “Location Reiki”.",
      ru: "Соедините ваши руки и думайте: «Местоположение, Рейки».",
      es: "Junta las manos y piensa «Location Reiki».",
    },
    origin: "Paul Crick p. 12 / PsiMaster",
  },
  {
    label: kundaliniExtraNames[5],
    text: {
      en: "Put your hands together and think “Past life Reiki”.",
      ru: "Соедините ваши руки и думайте: «Прошлая жизнь, Рейки».",
      es: "Junta las manos y piensa «Past life Reiki».",
    },
    origin: "Paul Crick p. 12 / PsiMaster",
  },
];

export const kundaliniExtensions: Array<{
  id: string;
  title: LocalText;
  excerpt: LocalText;
  details: LocalText;
  manualPages: string;
  stoneNames?: string[];
  stoneNamesAdvanced?: string[];
  advancedTitle?: LocalText;
}> = [
  {
    id: "boosters",
    title: { en: "Kundalini Reiki Booster Attunements", ru: "Kundalini Reiki Booster · Усиления", es: "Kundalini Reiki · Sintonizaciones Booster" },
    excerpt: {
      en: "There are 6 booster attunements.",
      ru: "В методичке описаны 6 усилений Кундалини Рейки (Booster Attunements).",
      es: "El manual presenta seis sintonizaciones Booster.",
    },
    details: {
      en: "Kundalini Reiki levels 3 – 9 or Kundalini Reiki Booster attunements 1–6 that you can pass on to others. It is recommended that a 5-day integrating period is left between the Kundalini Reiki Booster levels.",
      ru: "«Kundalini Reiki levels 3–9» и «Kundalini Reiki Booster attunements 1–6» — обозначения из оригинальной методички. Между ступенями Booster рекомендованы интервалы по пять дней.",
      es: "El texto llama a estas sintonizaciones «Kundalini Reiki Booster 1–6» y recomienda un período de integración de cinco días entre niveles.",
    },
    manualPages: "16–17",
  },
  {
    id: "gold",
    title: { en: "Gold Reiki 1–2–3 Attunement", ru: "Gold Reiki · 1–3 ступени", es: "Gold Reiki · niveles 1–3" },
    excerpt: {
      en: "Prerequisite: Kundalini Reiki 1-2-3.",
      ru: "Предварительное условие по методичке: Kundalini Reiki 1–3.",
      es: "Requisito previo: Kundalini Reiki 1–2–3.",
    },
    details: {
      en: "Gold Reiki 2 & 3 Attunements. Both levels 2 and 3 increase and fortify the 1 attunement.",
      ru: "В оригинальном руководстве выделены Gold Reiki 1, 2 и 3, а также отдельные настройки объектов.",
      es: "El manual incluye Gold Reiki 1, 2 y 3, además de sintonizaciones de objetos.",
    },
    manualPages: "18",
  },
  {
    id: "crystals",
    title: { en: "Ethereal Crystals 1–6 attunement", ru: "Ethereal Crystals · 1–6 ступени", es: "Cristales etéricos · niveles 1–6" },
    excerpt: {
      en: "Prerequisite: Kundalini Reiki 1-2-3. There are 6 levels in a full ethereal crystal attunement.",
      ru: "В методичке описаны шесть ступеней Ethereal Crystals после Kundalini Reiki 1–3.",
      es: "Requisito previo: Kundalini Reiki 1–2–3. Seis niveles en total.",
    },
    details: {
      en: "During the 1–3 attunements you are attuned to the following stones:",
      ru: "Список камней из исходного руководства (Ethereal Crystals 1–3):",
      es: "Piedras enumeradas en el manual (Ethereal Crystals 1–3):",
    },
    stoneNames: [
      "Amber", "Amethyst", "Aquamarine", "Aventurine", "Pink Beryl", "Blue Lace Agate", "Botswana Agate",
      "Green Calcite", "Carnelian", "Chrysocolla", "Citrine", "Clear Quartz", "Diamond",
      "Single Terminated Clear Quartz", "Emerald", "Hematite", "Red Jasper", "Malachite",
      "Rose Quartz", "Ruby", "Sodalite", "Turquoise",
    ],
    advancedTitle: {
      en: "Ethereal Crystals 4–6 attunement",
      ru: "Ethereal Crystals · 4–6 ступени",
      es: "Cristales etéricos · niveles 4–6",
    },
    stoneNamesAdvanced: [
      "Alexandrite", "Amazonite", "Azurite", "Bloodstone", "Gold Calcite",
      "Fire Opal", "Fluorite", "Red Garnet", "Jade", "Lapis Lazuli",
      "Moldavite", "Moonstone", "Peridot", "Pyrite", "Blue Sapphire",
      "Yellow Sapphire", "Black Tourmaline", "Violet Tourmaline",
      "Pink Tourmaline", "Double Terminated Clear Quartz",
    ],
    manualPages: "19–22",
  },
];

export const kundaliniHistory: SourceExcerpt = {
  label: { en: "History", ru: "История", es: "Historia" },
  text: {
    en: "Kundalini Reiki was brought to this earthly plane by Mr. Ole Gabrielsen. Mr. Gabrielsen is a Master of Meditation and has inspired many people throughout the world.",
    ru: "Оригинальная методичка Paul Crick связывает происхождение Kundalini Reiki с Ole Gabrielsen.",
    es: "El manual original de Paul Crick atribuye el origen de Kundalini Reiki a Ole Gabrielsen.",
  },
  origin: "Paul Crick · Manual p. 3",
};
