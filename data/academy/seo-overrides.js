// Search-intent-focused metadata for the established Academy programs.
// These describe actual programs, not regulated qualifications or clinical effects.
const courses = {
  reiki: {
    en: { title: "Reiki Courses — Yggdrasil, Tantra and Kundalini", description: "Explore distinct Reiki Yggdrasil, Tantra Reiki and Kundalini Reiki courses, their levels, learning materials and ways to request an initiation." },
    ru: { title: "Курсы Рейки — Иггдрасиль, Тантра и Кундалини", description: "Три отдельные программы: Рейки Иггдрасиль, Тантра Рейки и Кундалини Рейки. Выберите ступени, изучите материалы и варианты инициации." },
    es: { title: "Cursos de Reiki — Yggdrasil, Tantra y Kundalini", description: "Tres programas diferentes: Reiki Yggdrasil, Tantra Reiki y Kundalini Reiki. Explora niveles, materiales y opciones de iniciación." },
  },
  "reiki/yggdrasil": {
    en: { title: "Reiki Yggdrasil Training — 7 Modules and Initiations", description: "Explore seven Reiki Yggdrasil modules, the five-level Basic Course, original exercises, attunements and teaching materials, with Level 1 enquiry options." },
    ru: { title: "Обучение Рейки Иггдрасиль — 7 модулей и инициации", description: "Семь модулей Рейки Иггдрасиль, базовый курс из пяти ступеней, практики, настройки, авторские материалы и возможность запросить инициацию." },
    es: { title: "Reiki Yggdrasil — 7 módulos y cursos de iniciación", description: "Explora siete módulos de Reiki Yggdrasil, cinco niveles del curso básico, prácticas, materiales originales y opciones para comenzar el nivel 1." },
  },
  "reiki/yggdrasil/basic-course": {
    en: { title: "Basic Course of Reiki Yggdrasil", description: "Explore all five levels of the Reiki Yggdrasil Basic Course, original study materials, practices and ways to begin Level 1 with Andrey." },
    ru: { title: "Базовый курс Рейки Иггдрасиль", description: "Изучите пять ступеней базового курса Рейки Иггдрасиль: темы обучения, оригинальные материалы, практики и варианты начала первой ступени." },
    es: { title: "Curso básico de Reiki Yggdrasil", description: "Explora los cinco niveles del Curso Básico de Reiki Yggdrasil: temas, materiales originales, prácticas y opciones para comenzar el Nivel 1." },
  },
  "reiki/tantra-reiki/free-initiation": {
    en: { title: "Free Tantra Reiki Initiation Online | Level 1", description: "Explore free Tantra Reiki Level 1 with Andrey Litvinov. Watch the original guided video, read study materials and request a teacher-guided introduction online." },
    ru: { title: "Бесплатная инициация Тантра Рейки онлайн — 1-я ступень", description: "Бесплатное знакомство с 1-й ступенью Тантра Рейки: видео Андрея Литвинова, PDF-материалы, 7 вопросов и запрос инициации онлайн без регистрации." },
    es: { title: "Iniciación gratis de Tantra Reiki online | Nivel 1", description: "Explora Tantra Reiki Nivel 1 gratis con Andrey Litvinov: vídeo original, materiales, siete preguntas y solicitud de una introducción guiada online." },
  },
  "reiki/tantra-reiki": {
    en: { title: "Tantra Reiki Level 1 — Spring of Life with Andrey", description: "Begin Tantra Reiki Level 1 with Andrey Litvinov: body awareness, sensitivity, three traditional attunements and a free introduction. Explore Levels 2–9 only if you wish." },
    ru: { title: "Тантра Рейки — 1-я ступень «Родник жизни»", description: "Начните с первой ступени Тантра Рейки: чувствительность, осознанный контакт, три традиционные настройки и бесплатное знакомство с Андреем. Ступени 2–9 раскрываются по нажатию." },
    es: { title: "Tantra Reiki Nivel 1 — Manantial de vida", description: "Empieza Tantra Reiki Nivel 1 con Andrey: conciencia corporal, sensibilidad, tres sintonizaciones tradicionales e introducción gratuita. Los niveles 2–9 son opcionales." },
  },
  "reiki/kundalini-reiki": {
    en: { title: "Kundalini Reiki — 3-Level Course and Original Manual", description: "Three Kundalini Reiki levels, self-practice, traditional Balance and Master themes, plus the original Paul Crick manual as a downloadable study resource." },
    ru: { title: "Кундалини Рейки — курс 3 ступеней и оригинальная методичка", description: "Три ступени Кундалини Рейки, личная практика, традиционные темы Баланс и Мастер, оригинальная методичка Пола Крика для скачивания." },
    es: { title: "Kundalini Reiki — Curso de 3 niveles y manual original", description: "Tres niveles de Kundalini Reiki, práctica personal, temas tradicionales Balance y Maestro, más el manual original de Paul Crick para estudiar." },
  },
  "temple-studies": {
    en: { title: "Temple Studies — Traditions and Initiation Paths", description: "Choose an ancient tradition and a symbolic deity channel, then explore a meditation-initiation or an individual or group Mystery Constellation." },
    ru: { title: "Temple Studies — традиции и пути посвящения", description: "Выберите традицию и символический канал божества, затем формат: медитация-инициация или личная либо групповая мистерия-расстановка." },
    es: { title: "Temple Studies — Tradiciones e iniciaciones", description: "Elige una tradición antigua y un canal simbólico de deidad; explora una iniciación en meditación o un misterio individual o grupal." },
  },
};

export const academySeoRouteKeys = Object.freeze(Object.keys(courses));

export function seoMetaForAcademyRoute(locale, routeKey) {
  if (!["en", "ru", "es"].includes(locale)) return null;
  const item = courses[routeKey]?.[locale];
  return item ? { title: item.title, description: item.description } : null;
}
