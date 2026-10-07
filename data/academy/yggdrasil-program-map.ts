import type { PublicLocale } from "@/lib/public-locales";

export type YggdrasilProgramModule = {
  id: string;
  number: number;
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
  imageUrl?: string;
  sourceUrl?: string;
};

export type YggdrasilSourceImage = {
  id: string;
  label: Record<PublicLocale, string>;
  localUrl?: string;
  sourceUrl: string;
  locales?: PublicLocale[];
};

export const yggdrasilProgramModules: YggdrasilProgramModule[] = [
  {
    id: "basic",
    number: 1,
    title: { en: "Basic Reiki Yggdrasil Program", ru: "Базовая программа Рейки Иггдрасиль", es: "Programa básico de Reiki Yggdrasil" },
    description: {
      en: "The first five levels: health and intuitive awareness, protection, cleansing, resource and money themes, power, vision and the master level.",
      ru: "Первые пять ступеней: здоровье и интуитивное восприятие, защита, очищение, ресурсные и денежные темы, сила, видение и мастерский уровень.",
      es: "Los primeros cinco niveles: salud y percepción intuitiva, protección, limpieza, recursos, poder, visión y nivel de maestro.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/basic-program.jpg",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "shamanic-therapy",
    number: 2,
    title: { en: "Advanced Shamanic Therapy", ru: "Продвинутая шаманская терапия", es: "Terapia chamánica avanzada" },
    description: {
      en: "Advanced practice focused on healing traditions, resources, relationships, life force and energy-management themes from the source curriculum.",
      ru: "Продвинутая практика: традиции целительства, ресурсы, отношения, жизненная сила и темы управления энергией из исходной программы.",
      es: "Práctica avanzada centrada en tradiciones de sanación, recursos, relaciones, fuerza vital y gestión de la energía dentro del currículo fuente.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "temple-studies",
    number: 3,
    title: { en: "Temple Studies", ru: "Храмовые традиции", es: "Estudios de templo" },
    description: {
      en: "Symbolic study of temple traditions, including Egyptian, Greek and other historical branches represented in the school archive.",
      ru: "Символическое изучение храмовых традиций, включая египетское, греческое и другие исторические направления школы.",
      es: "Estudio simbólico de tradiciones de templo, incluidas ramas egipcias, griegas y otras conservadas en el archivo.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/temple-studies.png",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "runes",
    number: 4,
    title: { en: "Advanced Rune Magic", ru: "Продвинутая магия рун", es: "Magia rúnica avanzada" },
    description: {
      en: "Runes, worlds of the Yggdrasil Tree, the Circle of Power, divination and the runic-healing branch as preserved in the curriculum.",
      ru: "Руны, миры Древа Иггдрасиль, Круг Силы, предсказательная практика и руническая целительская ветвь, сохранённые в программе.",
      es: "Runas, mundos del Árbol Yggdrasil, Círculo de Poder, adivinación y la rama de sanación rúnica preservada en el currículo.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/advanced-runes.png",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "western",
    number: 5,
    title: { en: "Western European Magic · Kabbalah & Tarot", ru: "Западноевропейская магия · Каббала и Таро", es: "Magia europea occidental · Cábala y Tarot" },
    description: {
      en: "Tarot, elemental symbolism, the Tree of Sephiroth and related Western-European symbolic practice.",
      ru: "Таро, символика стихий, Дерево Сефирот и связанные западноевропейские символические практики.",
      es: "Tarot, simbolismo elemental, Árbol de las Sefirot y prácticas simbólicas occidentales relacionadas.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/western-tradition.png",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "eastern",
    number: 6,
    title: { en: "Taoism · Chinese Heritage · Sufism", ru: "Даосизм · Китайская традиция · Суфизм", es: "Taoísmo · Tradición china · Sufismo" },
    description: {
      en: "Chinese five-element and I Ching material, Kundalini-oriented study and the Sufi branch of the historical school map.",
      ru: "Материалы по китайской модели пяти элементов и И Цзин, направление Кундалини и суфийская ветвь исторической карты школы.",
      es: "Material de cinco elementos chinos e I Ching, estudio orientado a Kundalini y la rama sufí del mapa histórico.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "slavic",
    number: 7,
    title: { en: "Slavic Magic", ru: "Славянская магия", es: "Magia eslava" },
    description: {
      en: "The Slavic / Northern shamanic branch preserved in the historical program map and represented in the advanced curriculum.",
      ru: "Славянская / северная шаманская ветвь, сохранённая в исторической карте программы и в продвинутой структуре обучения.",
      es: "La rama chamánica eslava / septentrional preservada en el mapa histórico y en el currículo avanzado.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/slavic-tradition.png",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "toltec",
    number: 8,
    title: { en: "Toltec Magic", ru: "Толтекская магия", es: "Magia tolteca" },
    description: {
      en: "The Toltec study branch preserved in the original school structure and the current canonical course map.",
      ru: "Толтекское направление, сохранённое в исходной структуре школы и актуальной канонической карте курса.",
      es: "La rama de estudio tolteca preservada en la estructura original y en el mapa canónico actual.",
    },
    imageUrl: "/academy/reiki-yggdrasil/source/toltec-tradition.jpg",
    sourceUrl: "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil",
  },
  {
    id: "master-study",
    number: 9,
    title: { en: "Master Study & Initiation", ru: "Мастерское обучение и инициация", es: "Estudio e iniciación de maestría" },
    description: {
      en: "A master-level integration layer joining advanced practice, teaching and the wider school system.",
      ru: "Мастерский интеграционный уровень, соединяющий продвинутую практику, обучение и более широкую систему школы.",
      es: "Una capa de integración de maestría que reúne práctica avanzada, enseñanza y el sistema amplio de la escuela.",
    },
  },
  {
    id: "master-research",
    number: 10,
    title: { en: "Master Temple Attunements & Research", ru: "Мастерские храмовые настройки и исследования", es: "Sintonizaciones de templo y investigación de maestría" },
    description: {
      en: "The research-oriented master branch kept as part of the historical source map rather than a separate duplicated curriculum.",
      ru: "Исследовательская мастерская ветвь, сохранённая как часть исторической карты источника, а не отдельный дублирующий курс.",
      es: "La rama de investigación de maestría se conserva como parte del mapa histórico, no como un currículo duplicado.",
    },
  },
];

export const yggdrasilSourceImages: YggdrasilSourceImage[] = [
  { id: "hero", label: { en: "School introduction", ru: "Введение в школу", es: "Introducción a la escuela" }, localUrl: "/academy/reiki-yggdrasil/source/school-introduction.jpg", sourceUrl: "https://psitrends.com/images/photo_2023-01-20_23-25-00.jpg" },
  { id: "overview", label: { en: "Program overview", ru: "Обзор программы", es: "Resumen del programa" }, localUrl: "/academy/reiki-yggdrasil/source/program-overview.jpg", sourceUrl: "https://psitrends.com/images/photo_2023-03-30_17-52-38.jpg" },
  { id: "basic", label: { en: "Basic program", ru: "Базовая программа", es: "Programa básico" }, localUrl: "/academy/reiki-yggdrasil/source/basic-program.jpg", sourceUrl: "https://psitrends.com/images/e4ae997b3930ab36404c5305907fdba4.jpg" },
  { id: "shamanic", label: { en: "Advanced shamanic practice", ru: "Продвинутая шаманская практика", es: "Práctica chamánica avanzada" }, localUrl: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png", sourceUrl: "https://psitrends.com/images/Screenshot_37.png" },
  { id: "temple", label: { en: "Temple studies", ru: "Храмовые традиции", es: "Estudios de templo" }, localUrl: "/academy/reiki-yggdrasil/source/temple-studies.png", sourceUrl: "https://psitrends.com/images/Screenshot_27.png" },
  { id: "runes", label: { en: "Advanced runes", ru: "Продвинутые руны", es: "Runas avanzadas" }, localUrl: "/academy/reiki-yggdrasil/source/advanced-runes.png", sourceUrl: "https://psitrends.com/images/Screenshot_20.png" },
  { id: "western", label: { en: "Western tradition", ru: "Западная традиция", es: "Tradición occidental" }, localUrl: "/academy/reiki-yggdrasil/source/western-tradition.png", sourceUrl: "https://psitrends.com/images/Screenshot_33.png" },
  { id: "eastern", label: { en: "Eastern tradition", ru: "Восточная традиция", es: "Tradición oriental" }, localUrl: "/academy/reiki-yggdrasil/source/eastern-tradition.png", sourceUrl: "https://psitrends.com/images/Screenshot_34.png" },
  { id: "slavic", label: { en: "Slavic tradition", ru: "Славянская традиция", es: "Tradición eslava" }, localUrl: "/academy/reiki-yggdrasil/source/slavic-tradition.png", sourceUrl: "https://psitrends.com/images/Screenshot_35.png" },
  { id: "toltec", label: { en: "Toltec tradition", ru: "Толтекская традиция", es: "Tradición tolteca" }, localUrl: "/academy/reiki-yggdrasil/source/toltec-tradition.jpg", sourceUrl: "https://psitrends.com/images/atlantean-warriors-temple-of-quetzalcoatl-archaeological-site-of-tula-mexico-toltec-civilization-479635169-57a4f6c23df78cf459636602.jpg" },
  { id: "school-founder", label: { en: "School founder · Nicolai Zhuravlev", ru: "Основатель школы · Николай Журавлёв", es: "Fundador de la escuela · Nicolai Zhuravlev" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-01-20_22-10-58.jpg" },
  { id: "academy-history", label: { en: "Academy history & award", ru: "История Академии и награда", es: "Historia y reconocimiento de la Academia" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-01-20_22-19-43.jpg" },
  { id: "levels-certificates", label: { en: "Levels & certificates", ru: "Уровни и сертификаты", es: "Niveles y certificados" }, sourceUrl: "https://www.psitrends.com/images/Screenshot_38.png" },
  { id: "testimonial-1", label: { en: "Student testimonial 1", ru: "Отзыв ученика 1", es: "Testimonio de estudiante 1" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (2).jpg", locales: ["en", "es"] },
  { id: "testimonial-2", label: { en: "Student testimonial 2", ru: "Отзыв ученика 2", es: "Testimonio de estudiante 2" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (3).jpg", locales: ["en", "es"] },
  { id: "testimonial-3", label: { en: "Student testimonial 3", ru: "Отзыв ученика 3", es: "Testimonio de estudiante 3" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (4).jpg", locales: ["en", "es"] },
  { id: "testimonial-4", label: { en: "Student testimonial 4", ru: "Отзыв ученика 4", es: "Testimonio de estudiante 4" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (5).jpg", locales: ["en", "es"] },
  { id: "testimonial-5", label: { en: "Student testimonial 5", ru: "Отзыв ученика 5", es: "Testimonio de estudiante 5" }, sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (6).jpg", locales: ["en", "es"] },
  { id: "teacher-andrii", label: { en: "Teacher · Andrii Litvinov", ru: "Преподаватель · Андрей Литвинов", es: "Profesor · Andrii Litvinov" }, sourceUrl: "https://www.psitrends.com/images/Screenshot_11.png" },
];

export const yggdrasilProgramSourcePage = "https://psitrends.com/ru/cat-train-ru/shkola-rejki-iggdrasil";
