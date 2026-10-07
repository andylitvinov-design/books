import type { PublicLocale } from "@/lib/public-locales";

export type YggdrasilModuleLanding = {
  slug: string;
  levelId: number;
  title: Record<PublicLocale, string>;
  eyebrow: Record<PublicLocale, string>;
  lead: Record<PublicLocale, string>;
  image: string;
};

export const yggdrasilModuleLandings: YggdrasilModuleLanding[] = [
  {
    slug: "basic-course",
    levelId: 1,
    title: { en: "Basic Course of Reiki Yggdrasil", ru: "Базовый курс Рейки Иггдрасиль", es: "Curso básico de Reiki Yggdrasil" },
    eyebrow: { en: "Module 1 · Master foundation", ru: "Модуль 1 · Базовая мастерская программа", es: "Módulo 1 · Base de maestría" },
    lead: {
      en: "Five foundational levels covering health and intuition, protection, cleansing and money activation, predestination and power, extrasensory vision, and the Master Level. The historical source describes these five levels as the foundation that builds the Yggdrasil Tree framework in the student's body and consciousness.",
      ru: "Пять базовых уровней: здоровье и интуиция, защита, очищение и денежная активация, предопределение и сила, сверхчувственное видение и уровень Мастера. В историческом описании именно эти пять уровней создают базовый «каркас Древа Иггдрасиль» в теле и сознании ученика.",
      es: "Cinco niveles fundamentales: salud e intuición, protección, limpieza y activación del dinero, predestinación y poder, visión extrasensorial y nivel de maestro."
    },
    image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
  },
  {
    slug: "instructor-course",
    levelId: 2,
    title: { en: "Reiki Yggdrasil Instructor Course", ru: "Инструкторский курс Рейки Иггдрасиль", es: "Curso de Instructor Reiki Yggdrasil" },
    eyebrow: { en: "Module 2 · Six advanced steps", ru: "Модуль 2 · Шесть последующих ступеней", es: "Módulo 2 · Seis etapas avanzadas" },
    lead: {
      en: "The six-step Instructor Course: Healing, Golden Calf, Man & Woman, Life Force, Sexual Energy, and Fireball / Energy Management. The historical school map presents this as the second professional module following the five-level Basic Course.",
      ru: "Шесть ступеней Инструкторского курса: Целительство, Золотой телец, Мужчина и женщина, Жизненная сила, Сексуальная энергетика и Файербол / Управление энергией. В исторической карте школы это второй профессиональный модуль после пяти уровней Базового курса.",
      es: "Curso de seis etapas: Sanación, Becerro de Oro, Hombre y Mujer, Fuerza Vital, Energía Sexual y Fireball / Gestión de la Energía."
    },
    image: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
  },
  {
    slug: "temple-magic",
    levelId: 3,
    title: { en: "Temple Magic", ru: "Храмовая магия", es: "Magia de templo" },
    eyebrow: { en: "Module 3 · Temple traditions", ru: "Модуль 3 · Храмовые традиции", es: "Módulo 3 · Tradiciones de templo" },
    lead: {
      en: "Five steps covering egregores, Egyptian Magic, Greek Magic and the Zodiac, Toltec Magic, and Sufism. This module gathers the temple and archetypal branches of the Reiki Yggdrasil curriculum.",
      ru: "Пять ступеней: работа с эгрегорами, Египетская магия, Греческая магия и Зодиак, Толтекская магия и Суфизм. Модуль объединяет храмовые и архетипические ветви программы Рейки Иггдрасиль.",
      es: "Cinco etapas: egregores, Magia Egipcia, Magia Griega y Zodiaco, Magia Tolteca y Sufismo."
    },
    image: "/academy/reiki-yggdrasil/source/temple-studies.png",
  },
  {
    slug: "eastern-magic",
    levelId: 4,
    title: { en: "Eastern Magic", ru: "Восточная магия", es: "Magia oriental" },
    eyebrow: { en: "Module 4 · Eastern traditions", ru: "Модуль 4 · Восточные традиции", es: "Módulo 4 · Tradiciones orientales" },
    lead: {
      en: "Five steps: Chinese Medicine I — Elements, Chinese Medicine II — Power, Chinese Forecasting / I Ching, Kundalini, and Money Magic. The module connects Taoist, Chinese and energy-practice models preserved in the school curriculum.",
      ru: "Пять ступеней: Китайская медицина 1 — Элементы, Китайская медицина 2 — Сила, Китайское прогнозирование / И Цзин, Кундалини и Денежная магия. Модуль соединяет даосские, китайские и энергетические модели школы.",
      es: "Cinco etapas: Medicina China I — Elementos, Medicina China II — Fuerza, I Ching, Kundalini y Magia del Dinero."
    },
    image: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  },
  {
    slug: "western-magic",
    levelId: 5,
    title: { en: "Western European Magic · Kabbalah & Tarot", ru: "Западноевропейская магия · Каббала и Таро", es: "Magia europea occidental · Cábala y Tarot" },
    eyebrow: { en: "Module 5 · Western symbolic tradition", ru: "Модуль 5 · Западная символическая традиция", es: "Módulo 5 · Tradición simbólica occidental" },
    lead: {
      en: "Five steps: Major Arcana, Powers of the Elements, the Tree of Sephiroth, Higher Arcana, and Tarot Divination. This module preserves the Western-European symbolic branch of the curriculum.",
      ru: "Пять ступеней: Великие Арканы Таро, Силы стихий, Дерево Сефирот, Высшие Арканы и Предсказания в Таро. Это западноевропейская символическая ветвь программы.",
      es: "Cinco etapas: Arcanos Mayores, Fuerzas de los Elementos, Árbol de las Sefirot, Arcanos Superiores y Adivinación con Tarot."
    },
    image: "/academy/reiki-yggdrasil/source/western-tradition.png",
  },
  {
    slug: "rune-magic",
    levelId: 6,
    title: { en: "Advanced Rune Magic", ru: "Продвинутая магия рун", es: "Magia rúnica avanzada" },
    eyebrow: { en: "Module 6 · Runic tradition", ru: "Модуль 6 · Руническая традиция", es: "Módulo 6 · Tradición rúnica" },
    lead: {
      en: "Five steps: Runes and Runic Tradition, Worlds of the Yggdrasil Tree, Circle of Power, Runic Divination, and Runic Healing. The module develops the Scandinavian/runic branch in full detail.",
      ru: "Пять ступеней: Руны и руническая традиция, Миры Древа Иггдрасиль, Круг Силы, Руническое предсказание и Руническое исцеление. Здесь подробно раскрывается скандинавская / руническая ветвь системы.",
      es: "Cinco etapas: Runas, Mundos del Árrbol Yggdrasil, Círculo de Poder, Adivinación Rúnica y Sanación Rúnica."
    },
    image: "/academy/reiki-yggdrasil/source/advanced-runes.png",
  },
  {
    slug: "higher-magic",
    levelId: 7,
    title: { en: "Higher Magic", ru: "Высшая магия", es: "Magia superior" },
    eyebrow: { en: "Module 7 · Advanced integration", ru: "Модуль 7 · Продвинутая интеграция", es: "Módulo 7 · Integración avanzada" },
    lead: {
      en: "Six steps: Teleport / Astral Flight / Clairvoyance, Machine Hall, Ifrits, Slavic Magic I, Slavic Magic II, and Civilisations. This is the advanced integration layer of the current seven-module map.",
      ru: "Шесть ступеней: Телепорт / Астральный полёт / Ясновидение, Машинный зал, Ифриты, Славянская магия 1, Славянская магия 2 и Цивилизации. Это продвинутый интеграционный слой текущей семимодульной карты.",
      es: "Seis etapas: Teletransporte / Vuelo Astral / Clarividencia, Sala de Máquinas, Ifrits, Magia Eslava I, Magia Eslava II y Civilizaciones."
    },
    image: "/academy/reiki-yggdrasil/source/slavic-tradition.png",
  },
];

export function yggdrasilModuleBySlug(slug: string) {
  return yggdrasilModuleLandings.find((module) => module.slug === slug);
}
