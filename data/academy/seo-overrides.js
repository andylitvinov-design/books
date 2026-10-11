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
  "reiki/tantra-reiki": {
    en: { title: "Tantra Reiki Training — Andrey's 9-Level Course", description: "Discover Andrey Litvinov's distinct nine-level Tantra Reiki program, original level descriptions, optional partner exercises and ways to enquire about initiation." },
    ru: { title: "Обучение Тантра Рейки — авторская программа 9 ступеней", description: "Девять ступеней системы Тантра Рейки Андрея Литвинова: оригинальные описания уровней, добровольные парные практики и запрос личной инициации." },
    es: { title: "Tantra Reiki — Programa de 9 niveles de Andrey", description: "Conoce los nueve niveles de Tantra Reiki de Andrey Litvinov, sus descripciones originales, prácticas opcionales y opciones de iniciación." },
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
