import sources from "./sources.generated.json";
import media from "./media.generated.json";
import type { PublicLocale } from "@/lib/public-locales";

export type AcademyDirectionId = "reiki" | "mysteries" | "symbolic" | "applied" | "school" | "archive";
export type AcademyView = "programs" | "videos";
export type AcademyStatus = "current" | "historical" | "availability_unknown" | "archive_only" | "needs_review";
export type AcademyBlock = { type: "h1" | "h2" | "h3" | "h4" | "p" | "li"; text: string };

export type AcademySourceRecord = {
  sourceUrl: string;
  path: string;
  linkText: string;
  classification: string;
  routeKey: string;
  direction: AcademyDirectionId | "videos";
  logicalId: string;
  sourceLocale: "en" | "ru";
  sourceTitle?: string;
  title: string;
  content: AcademyBlock[];
  contentHash?: string | null;
  hashAlgorithm?: string;
  reviewState?: string;
  status: AcademyStatus;
  httpStatus?: number | null;
  finalUrl?: string;
  skippedRiskyBlocks?: number;
};

export type AcademyMediaRecord = {
  sourceUrl: string;
  mediaUrl: string;
  logicalId: string;
  status: string;
};

export const academyDirections: Array<{
  id: AcademyDirectionId;
  path: string;
  image: string;
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
}> = [
  { id: "reiki", path: "reiki", image: "/images/holistic-house/hero-olive-incense.webp", title: { en: "Reiki & Energy Systems", ru: "Рейки и энергетические системы", es: "Reiki y sistemas energéticos" }, description: { en: "Yggdrasil, Tantra Reiki, shamanic and energy-work study paths.", ru: "Иггдрасиль, Тантра Рейки, шаманские и энергетические учебные программы.", es: "Yggdrasil, Tantra Reiki y programas históricos de trabajo energético." } },
  { id: "mysteries", path: "mysteries", image: "/library/maya-mysteries/media/post-244-1.jpg", title: { en: "Mysteries & Ancient Traditions", ru: "Мистерии и древние традиции", es: "Misterios y tradiciones antiguas" }, description: { en: "Greek, Egyptian, Maya and archetypal study material.", ru: "Греческие, египетские, майянские и архетипические материалы.", es: "Materiales griegos, egipcios, mayas y arquetípicos." } },
  { id: "symbolic", path: "symbolic", image: "/library/maya-egregor-gods/media/post-203-1.jpg", title: { en: "Runes, Elements & Symbolic Arts", ru: "Руны, стихии и символические искусства", es: "Runas, elementos y artes simbólicas" }, description: { en: "Runes, elements, water, talismans and symbolic practice.", ru: "Руны, стихии, вода, талисманы и символические практики.", es: "Runas, elementos, agua, talismanes y práctica simbólica." } },
  { id: "applied", path: "applied", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: { en: "Applied Archetypal Practice", ru: "Прикладная архетипическая практика", es: "Práctica arquetípica aplicada" }, description: { en: "Applied attunement and archetypal-method learning material.", ru: "Прикладные настройки и обучение архетипическим методам.", es: "Material aplicado sobre sintonización y métodos arquetípicos." } },
  { id: "school", path: "path", image: "/images/holistic-house/andy-about.png", title: { en: "Academy Path & School", ru: "Путь Академии и школа", es: "Trayectoria y escuela de la Academia" }, description: { en: "Long-form study paths, school structure and historical faculties.", ru: "Долгие учебные пути, структура школы и исторические факультеты.", es: "Trayectorias largas, estructura de la escuela y facultades históricas." } },
  { id: "archive", path: "archive", image: "/images/holistic-house/books-library.webp", title: { en: "Archive", ru: "Архив", es: "Archivo" }, description: { en: "Historical programs, festivals and previous Academy material.", ru: "Исторические программы, фестивали и прежние материалы Академии.", es: "Programas históricos, festivales y materiales anteriores de la Academia." } },
];

export const academyProgramTitles: Record<string, Record<PublicLocale, string>> = {
  "applied/archetypal-attunements": { en: "Archetypal Attunements", ru: "Архетипические настройки", es: "Sintonizaciones arquetípicas" },
  "archive/constellations-of-love": { en: "Constellations of Love — Historical Program", ru: "Расстановки любви — историческая программа", es: "Constelaciones del amor — programa histórico" },
  "archive/events": { en: "Academy Events Archive", ru: "Архив мероприятий Академии", es: "Archivo de eventos de la Academia" },
  "archive/festival": { en: "Festival Archive", ru: "Архив фестиваля", es: "Archivo del festival" },
  "archive/festival-details": { en: "Festival Details", ru: "Материалы фестиваля", es: "Detalles del festival" },
  "elements/elemental-magic": { en: "Elemental Magic", ru: "Магия стихий", es: "Magia de los elementos" },
  "elements/water": { en: "Water Magic", ru: "Магия воды", es: "Magia del agua" },
  "history": { en: "Academy of Temple Arts — History", ru: "История Академии храмовых искусств", es: "Historia de la Academia de Artes del Templo" },
  "history/student-experiences": { en: "Student Experiences — MAAT Archive", ru: "Отзывы студентов — архив МААТ", es: "Experiencias de estudiantes — archivo MAAT" },
  "mysteries/archetypes-of-gods": { en: "Great Mysteries: Archetypes of the Gods", ru: "Большие мистерии: Архетипы Богов", es: "Grandes misterios: Arquetipos de los dioses" },
  "mysteries/archetypes-of-love": { en: "Lesser Mysteries: Archetypes of Love", ru: "Малые мистерии: Архетипы любви", es: "Misterios menores: Arquetipos del amor" },
  "mysteries/egyptian-hypno-course": { en: "Egyptian Hypno-Coaching Course", ru: "Гипно-коучинг: Египетский курс", es: "Hipnocoaching: curso egipcio" },
  "mysteries/guidance-of-gods": { en: "Guidance of the Gods", ru: "Подсказки Богов", es: "Guía de los dioses" },
  "mysteries/hypno-love": { en: "Hypno-Coaching of Love", ru: "Гипно-коучинг любви", es: "Hipnocoaching del amor" },
  "mysteries/initiations": { en: "Mysteries & Initiations", ru: "Мистерии и инициации", es: "Misterios e iniciaciones" },
  "path/magister-archetypal-therapies": { en: "Historical Magister Program — Archetypal Therapies & Shamanism", ru: "Историческая программа Magister — архетипические терапии и шаманизм", es: "Programa histórico Magister — terapias arquetípicas y chamanismo" },
  "reiki/free-energy-healing": { en: "Energy Healing — Introductory Course", ru: "Введение в энергетическую практику", es: "Introducción a la práctica energética" },
  "reiki/master-shamanic-healing": { en: "Reiki Yggdrasil — Shamanic Practice Program", ru: "Рейки Иггдрасиль — программа шаманской практики", es: "Reiki Yggdrasil — programa de práctica chamánica" },
  "reiki/tantra-reiki": { en: "Tantra Reiki", ru: "Тантра Рейки", es: "Tantra Reiki" },
  "reiki/yggdrasil": { en: "Tao Reiki Yggdrasil", ru: "Дао Рейки Иггдрасиль", es: "Tao Reiki Yggdrasil" },
  "reiki/yggdrasil/faq": { en: "Reiki Yggdrasil — FAQ", ru: "Рейки Иггдрасиль — вопросы и ответы", es: "Reiki Yggdrasil — preguntas frecuentes" },
  "runes/northern-runes": { en: "Northern Rune Tradition", ru: "Северная магия рун", es: "Tradición rúnica del norte" },
  "runes/runes-business": { en: "Runes & Business", ru: "Руны и бизнес", es: "Runas y negocios" },
  "symbolic/artifacts-talismans": { en: "Artifacts & Talismans", ru: "Артефакты и талисманы", es: "Artefactos y talismanes" },
  "traditions/egypt": { en: "Mysteries of Egypt", ru: "Мистерии Египта", es: "Misterios de Egipto" },
  "traditions/greece": { en: "Mysteries of Greece", ru: "Мистерии Греции", es: "Misterios de Grecia" },
  "videos/egypt-osiris": { en: "Egypt — Osiris", ru: "Египет — Осирис", es: "Egipto — Osiris" },
  "videos/energy-pump-ups": { en: "Energy Practice Video Course", ru: "Видео-курс «Подкачки»", es: "Videocurso de prácticas energéticas" },
  "videos/greek-mysteries-demeter": { en: "Greek Mysteries — Demeter", ru: "Греческие мистерии — Деметра", es: "Misterios griegos — Deméter" },
  "videos/greek-mysteries-dionysus": { en: "Greek Mysteries — Dionysus", ru: "Мистерии Диониса", es: "Misterios griegos — Dioniso" },
  "videos/maya-archetypes": { en: "Maya Archetypes", ru: "Архетипы Майя", es: "Arquetipos mayas" },
  "videos/planetary-power": { en: "Planetary Power", ru: "Сила планет", es: "Poder planetario" },
  "videos/strength-protection": { en: "Strength & Protection Meditations", ru: "Медитации силы и защиты", es: "Meditaciones de fuerza y protección" },
  "videos/sun-meditations": { en: "Sun Meditations", ru: "Медитации Солнца", es: "Meditaciones del Sol" },
};

export function academyDisplayTitle(record: AcademySourceRecord, locale: PublicLocale) {
  return academyProgramTitles[record.logicalId]?.[locale] ?? record.title;
}

export const academyCopy = {
  en: { title: "Academy", lead: "Structured learning paths from the PsiTrends teaching archive, now organized inside Holistic House.", programs: "Programs", videos: "Videos", allPrograms: "Learning directions", videoCollections: "Video courses & meditations", back: "Academy", source: "Original PsiTrends source", sourceLanguage: "Original material in", en: "English", ru: "Russian", historical: "Historical program", availability_unknown: "Availability unknown", current: "Current", archive_only: "Archive only", needs_review: "Needs review", filtered: "Legacy prices, registration or claims were omitted from the public migration.", reading: "Library & reading", services: "Individual work", noContent: "The source page is preserved in the migration manifest, but its body needs manual review before publication." },
  ru: { title: "Академия", lead: "Учебные направления из архива PsiTrends, теперь структурированные внутри Holistic House.", programs: "Программы", videos: "Видео", allPrograms: "Направления обучения", videoCollections: "Видео-курсы и медитации", back: "Академия", source: "Оригинальный источник PsiTrends", sourceLanguage: "Оригинальный материал на", en: "английском", ru: "русском", historical: "Историческая программа", availability_unknown: "Актуальность уточняется", current: "Актуальная", archive_only: "Только архив", needs_review: "Требует проверки", filtered: "Старые цены, регистрационные блоки и спорные заявления не перенесены в публичный текст.", reading: "Библиотека и материалы", services: "Индивидуальная работа", noContent: "Источник сохранён в манифесте миграции, но текст требует ручной проверки перед публикацией." },
  es: { title: "Academia", lead: "Rutas de aprendizaje del archivo de PsiTrends, ahora organizadas dentro de Holistic House.", programs: "Programas", videos: "Videos", allPrograms: "Áreas de aprendizaje", videoCollections: "Videocursos y meditaciones", back: "Academia", source: "Fuente original de PsiTrends", sourceLanguage: "Material original en", en: "inglés", ru: "ruso", historical: "Programa histórico", availability_unknown: "Disponibilidad por confirmar", current: "Actual", archive_only: "Solo archivo", needs_review: "Pendiente de revisión", filtered: "Los precios, formularios de inscripción y afirmaciones antiguas se omitieron de la migración pública.", reading: "Biblioteca y lecturas", services: "Trabajo individual", noContent: "La fuente está preservada en el manifiesto de migración, pero el texto requiere revisión manual antes de publicarse." },
} as const;

const sourceRecords = sources as AcademySourceRecord[];
const mediaRecords = media as AcademyMediaRecord[];

const academyCuratedPublicBlocks: Partial<Record<string, Partial<Record<AcademySourceRecord["sourceLocale"], AcademyBlock[]>>>> = {
  "reiki/tantra-reiki": {
    en: [
      { type: "h2", text: "Tantra Reiki — overview" },
      { type: "p", text: "The PsiTrends teaching archive presents Tantra Reiki as a contemplative energy-practice tradition focused on sensitivity, relaxation, inner vitality, self-connection and connection with others." },
      { type: "p", text: "In this material, the practice is associated with the Osho Tantra Reiki lineage and is taught as a gradual deepening into one continuous flow rather than as nine unrelated techniques." },
      { type: "h2", text: "Nine levels of study" },
      { type: "h3", text: "Level 1 — activation and connection" },
      { type: "p", text: "Traditional themes: sexual-energy activation, attractiveness or charisma, and bringing more energy into a chosen situation." },
      { type: "h3", text: "Level 2 — accumulation and attunement" },
      { type: "p", text: "Traditional themes: accumulation of energy, the historical “money magnet” setting, and attunement with another person or a group." },
      { type: "h3", text: "Level 3 — unity, clearing and luck" },
      { type: "p", text: "The archive describes deeper connection with the surrounding world, release of tension and limiting patterns, and a traditional setting called “Luck”." },
      { type: "h3", text: "Level 4 — higher archetypal themes" },
      { type: "p", text: "Traditional themes: Enlightenment, Gods of Love and the “Astral Child” image for the shared field of a couple or group." },
      { type: "h3", text: "Level 5 — Inner Light" },
      { type: "p", text: "A focus on the inner source of energy, creativity and the image of opening the energy centres." },
      { type: "h3", text: "Level 6 — Worlds of Unity" },
      { type: "p", text: "A contemplative level associated in the source material with calm, support, balance and a sense of spiritual unity." },
      { type: "h3", text: "Level 7 — Illumination" },
      { type: "p", text: "A level focused on awareness, mental clarity and the symbolic experience of consciousness becoming brighter." },
      { type: "h3", text: "Level 8 — Creation of the World" },
      { type: "p", text: "The source describes this as a creative impulse: moving from harmonising experience toward consciously creating and expressing." },
      { type: "h3", text: "Level 9 — Fullness of Unity" },
      { type: "p", text: "The final level is described through the images of inner harmony, fullness, strength and balance." },
      { type: "h2", text: "How the historical training was structured" },
      { type: "p", text: "The archived program grouped Levels 1–3 as basic practice, Levels 4–6 as advanced practice with mandalas and artifacts, and Levels 7–9 as a master-level study path with personal practice, written reflection and a final assessment." },
      { type: "p", text: "The original page also connects Tantra Reiki with the wider Academy curriculum: Reiki Yggdrasil, temple traditions, archetypal work, runes, tarot and other symbolic systems." },
      { type: "h2", text: "Practice orientation" },
      { type: "p", text: "Across the source materials the recurring themes are love, connection, sensitivity, pleasure, personal growth, creative expression and the exploration of masculine/feminine or Shiva–Vishnu–Brahma archetypal imagery." },
      { type: "p", text: "This page preserves the educational and historical structure of the PsiTrends course. Current teaching format, prerequisites and availability should be confirmed directly before joining." }
    ],
    ru: [
      { type: "h2", text: "Тантра Рейки — о системе" },
      { type: "p", text: "В учебном архиве PsiTrends Тантра Рейки описывается как традиция энергетической практики, связанная с чувствительностью, расслаблением, внутренней жизненностью, контактом с собой и более тонким контактом с другими." },
      { type: "p", text: "Материал относит систему к линии Osho Tantra Reiki и рассматривает девять ступеней как постепенное углубление в один целостный поток, а не как набор отдельных техник." },
      { type: "h2", text: "Девять ступеней" },
      { type: "h3", text: "1 ступень — активация и контакт" },
      { type: "p", text: "Традиционные темы: активизация сексуальной энергии, привлекательность и харизма, гармонизация ситуации." },
      { type: "h3", text: "2 ступень — накопление и настройка" },
      { type: "p", text: "Темы архива: накопление энергии, историческая настройка «Денежный магнит», освобождение от внутренних зажимов и сонастройка." },
      { type: "h3", text: "3 ступень — единство и поток" },
      { type: "p", text: "Углубление ощущения связи с окружающим пространством, настройка «Удача», работа с символическим талисманом и переживанием единства." },
      { type: "h3", text: "4 ступень — архетипические уровни" },
      { type: "p", text: "Традиционные темы: Боги любви, Просветление и образ «Астрального ребёнка» как общего поля пары или группы." },
      { type: "h3", text: "5 ступень — Внутренний Свет" },
      { type: "p", text: "Фокус на внутреннем источнике силы, творческом потенциале и образе раскрытия энергетических центров." },
      { type: "h3", text: "6 ступень — Миры Единства" },
      { type: "p", text: "Созерцательный уровень, который в исходном материале связан с успокоением, поддержкой, балансом и переживанием духовного единения." },
      { type: "h3", text: "7 ступень — Озарение" },
      { type: "p", text: "Работа с осознанностью, ясностью внимания и символическим переживанием более яркого, «светлого» состояния сознания." },
      { type: "h3", text: "8 ступень — Созидание Мира" },
      { type: "p", text: "Тема творческого импульса: переход от гармонизации переживания к сознательному созиданию и выражению." },
      { type: "h3", text: "9 ступень — Полнота Единства" },
      { type: "p", text: "Финальная ступень описывается через образы внутренней гармонии, наполненности, силы и баланса." },
      { type: "h2", text: "Как была устроена программа обучения" },
      { type: "p", text: "В исторической структуре PsiTrends ступени 1–3 составляли базовый уровень, 4–6 — продвинутую практику с мандалами и артефактами, а 7–9 — мастерский уровень с самостоятельной практикой, письменной рефлексией и итоговой проверкой." },
      { type: "p", text: "Курс связывался с более широкой системой Академии: Рейки Иггдрасиль, храмовые и архетипические традиции, руны, Таро и другие символические методы." },
      { type: "h2", text: "Основные темы практики" },
      { type: "p", text: "В исходных материалах повторяются темы любви и соединённости, чувствительности, удовольствия, личностного роста, творческого выражения и исследования мужского/женского начала и архетипов Шивы, Вишну и Брахмы." },
      { type: "p", text: "Эта страница сохраняет образовательную и историческую структуру курса PsiTrends. Актуальный формат обучения, условия участия и доступность программы следует уточнять отдельно." }
    ]
  },
  "mysteries/initiations": {
    ru: [
      { type: "h2", text: "Мистерии и инициации — обзор" },
      { type: "p", text: "Архивная программа PsiTrends объединяет архетипические расстановки, символические инициации и практики разных традиций как способы исследования личного запроса, отношений, целей и внутренних конфликтов." },
      { type: "h2", text: "Основные направления" },
      { type: "h3", text: "Архетипические мистерии любви" },
      { type: "p", text: "Исследование внутренних частей и образов души через расстановочную форму: скрытые напряжения, желания, страхи и отношения с собственными архетипическими фигурами." },
      { type: "h3", text: "Инициация в Канал" },
      { type: "p", text: "Исторический формат включал символическую сонастройку с выбранной традицией, создание мандалы и работу с личным артефактом как с фокусом внимания и смысла." },
      { type: "h3", text: "Руны и бизнес" },
      { type: "p", text: "Отдельное направление использовало скандинавские рунические архетипы как символическую модель для анализа целей, вариантов решения и личной стратегии." },
      { type: "h3", text: "Архетипическая диагностика и поддержка" },
      { type: "p", text: "В архиве также описаны системные расстановки, работа с рунами, Таро и образами богов как способы структурировать ситуацию и сформулировать возможные действия." },
      { type: "p", text: "Страница сохранена как историческое описание методов Академии. Старые цены, регистрационные предложения и обещания результата не переносятся как актуальные условия." }
    ]
  },
  "mysteries/hypno-love": {
    ru: [
      { type: "h2", text: "Гипно-коучинг любви — структура курса" },
      { type: "p", text: "Архив PsiTrends описывает курс как цикл из восьми и более встреч, где жизненные стадии исследуются через архетипы греческой традиции, расстановочную работу и образные практики." },
      { type: "h3", text: "1. Зарождение — Эрос" },
      { type: "p", text: "Тема начала жизненного импульса, желания жить и контакта с Эросом как символом зарождения." },
      { type: "h3", text: "2. Рождение — Кибела и Зевс" },
      { type: "p", text: "Фундамент личности, право существовать и образы Великой Матери и Великого Отца как внутренних опор." },
      { type: "h3", text: "3. Желание — Деметра, Персефона, Психея" },
      { type: "p", text: "Право желать, понимать собственные потребности, принимать заботу и исследовать образ внутреннего ребёнка и души." },
      { type: "h3", text: "4. Автономия — Артемида" },
      { type: "p", text: "Контакт со своими интересами, границами и способностью выбирать собственное направление." },
      { type: "h3", text: "5. Воля — Афина" },
      { type: "p", text: "Способность действовать, добиваться выбранного и доводить начатое до результата." },
      { type: "h3", text: "6. Любовь и сексуальность — Афродита и Дионис" },
      { type: "p", text: "Темы любви к себе, отношений, привлекательности, мужского и женского образа и права проявляться." },
      { type: "h3", text: "7. Ценность — Геката" },
      { type: "p", text: "Исследование собственного голоса, взглядов, талантов и способности быть услышанным." },
      { type: "h3", text: "8. Признание — Гера и Гестия" },
      { type: "p", text: "Принадлежность, уважение, место в группе и способность быть в связи с другими, не теряя себя." },
      { type: "p", text: "Старые терапевтические обещания и регистрационные блоки PsiTrends не публикуются как актуальные утверждения; здесь сохраняется образовательная структура курса." }
    ]
  },
  "mysteries/egyptian-hypno-course": {
    ru: [
      { type: "h2", text: "Египетский курс — восемь шагов" },
      { type: "p", text: "В архиве PsiTrends Египетский курс соединяет символику египетских архетипов с восьмишаговой моделью работы с личной или проектной целью." },
      { type: "h3", text: "1. Первичный анализ — Хатхор" },
      { type: "p", text: "Прояснение ситуации, желаний и исходного запроса." },
      { type: "h3", text: "2. Ясность — Тот" },
      { type: "p", text: "Выбор фокуса, отделение существенного от лишнего и формулировка цели." },
      { type: "h3", text: "3. Решение — Исида" },
      { type: "p", text: "Поиск вариантов и превращение идеи в более ясный план." },
      { type: "h3", text: "4. Действия — Гор" },
      { type: "p", text: "Переход от плана к действиям, контактам и необходимым ресурсам." },
      { type: "h3", text: "5. Освобождение от ограничений — Осирис" },
      { type: "p", text: "Исследование внутренних страхов, установок и привычных ограничений, которые мешают движению." },
      { type: "h3", text: "6. Ресурсы — Мин" },
      { type: "p", text: "Поиск новых идей, людей, возможностей и источников энергии для проекта." },
      { type: "h3", text: "7. Масштаб — Ра" },
      { type: "p", text: "Расширение горизонта задачи и исследование следующего уровня проявленности." },
      { type: "h3", text: "8. Новое видение — Маат" },
      { type: "p", text: "Переоценка направления, образа себя, миссии и возможных новых путей развития." },
      { type: "p", text: "Это историческая структура курса. Утверждения о здоровье, гарантированном достижении целей и старые условия регистрации не переносятся как действующие обещания." }
    ]
  },
  "mysteries/guidance-of-gods": {
    ru: [
      { type: "h2", text: "Подсказки Богов — архетипическое чтение" },
      { type: "p", text: "Материал PsiTrends описывает этот подход как работу с древними архетипическими системами для дополнительного взгляда на ситуацию. Человек выбирает традицию и формулирует вопрос, а символический материал используется для размышления о возможных решениях." },
      { type: "h2", text: "Традиции и символические системы" },
      { type: "p", text: "В архиве перечислены греческий, египетский, скандинавский, даосский пантеоны, образы Майя и Ацтеков, а также фигуры Сефиротической традиции." },
      { type: "h2", text: "Процесс" },
      { type: "h3", text: "1. Постановка цели" },
      { type: "p", text: "Сначала уточняется проблема и формулируется вопрос или цель." },
      { type: "h3", text: "2. Архетипический совет" },
      { type: "p", text: "Затем выбранная традиция используется как символическая рамка для поиска ассоциаций, подсказок и вариантов действия." },
      { type: "h3", text: "3. Интеграция" },
      { type: "p", text: "Полученный материал переводится в конкретные наблюдения и действия, которые человек может проверить в реальной ситуации." },
      { type: "h2", text: "Руническая линия" },
      { type: "p", text: "Отдельный шестисессионный блок использует пары рун — Феху; Уруз и Турисаз; Альгиз и Райдо; Вуньо и Манназ; Кеназ и Гебо — как последовательность тем от вариантов и движения к опоре, самооценке и выражению идей." },
      { type: "p", text: "Старые заявления об энергетическом воздействии, медицинских результатах, цены и регистрационные предложения оставлены в источнике и не представлены здесь как проверенные эффекты или актуальные условия." }
    ]
  },
  "mysteries/archetypes-of-love": {
    en: [
      { type: "h2", text: "Mysteries of Love — course map" },
      { type: "p", text: "The PsiTrends archive presents this as an archetypal constellation journey through relationships, desire, intimacy, identity and the symbolic “light and shadow” parts of the psyche." },
      { type: "h3", text: "1. Eros and libido" },
      { type: "p", text: "Exploring desire, vitality, hidden wishes and tensions around the life impulse." },
      { type: "h3", text: "2. Love and sexuality" },
      { type: "p", text: "Questions of pleasure, passion, fears, restrictions and permission to experience closeness." },
      { type: "h3", text: "3. Yin and Yang" },
      { type: "p", text: "Receiving and acting, openness to support, creativity and the balance of receptive and active qualities." },
      { type: "h3", text: "4. Feminine and masculine" },
      { type: "p", text: "Relationships with maternal and paternal images, women and men, attraction and inner masculine/feminine qualities." },
      { type: "h3", text: "5. Love and rejection" },
      { type: "p", text: "Patterns of rejecting others, feeling rejected, and excluding parts of oneself." },
      { type: "h3", text: "6. Closeness and freedom" },
      { type: "p", text: "The tension between intimacy and autonomy and the personal meaning of both." },
      { type: "h3", text: "7. Light and Shadow — Lilith, Eve and Adam" },
      { type: "p", text: "Using mythic figures to explore disowned wishes, fears, power and identity." },
      { type: "h3", text: "8. Life and death" },
      { type: "p", text: "Change, endings, beginnings and what may need to be released when a new phase starts." },
      { type: "p", text: "The page preserves the historical course structure without reproducing legacy therapeutic guarantees or promotional offers." }
    ],
    ru: [
      { type: "h2", text: "Малые мистерии: Архетипы любви" },
      { type: "p", text: "Курс в архиве PsiTrends построен как архетипическое исследование отношений, желания, близости, свободы и внутренних мужских/женских образов через расстановочную форму." },
      { type: "h3", text: "1. Эрос и либидо" },
      { type: "p", text: "Исследование желания, жизненного импульса и скрытых напряжений." },
      { type: "h3", text: "2. Любовь и сексуальность" },
      { type: "p", text: "Темы удовольствия, страсти, страхов и разрешения быть в близости." },
      { type: "h3", text: "3. Инь и Ян" },
      { type: "p", text: "Баланс принимающего и действующего начала, открытость поддержке и творчеству." },
      { type: "h3", text: "4. Женское и мужское" },
      { type: "p", text: "Контакт с материнскими и отцовскими образами, отношениями с мужчинами и женщинами и собственными полярностями." },
      { type: "h3", text: "5. Любовь и отвержение" },
      { type: "p", text: "Исследование переживания отвержения и тех частей себя, которые человек склонен исключать." },
      { type: "h3", text: "6. Близость и свобода" },
      { type: "p", text: "Личный баланс между автономией и способностью углубляться в отношения." },
      { type: "h3", text: "7. Свет и Тень — Лилит, Ева и Адам" },
      { type: "p", text: "Мифологические фигуры используются как язык для исследования вытесненных желаний, страхов и силы." },
      { type: "h3", text: "8. Жизнь и смерть" },
      { type: "p", text: "Тема завершений, переходов и рождения нового этапа." },
      { type: "p", text: "Сохранена структура курса; старые рекламные и терапевтические обещания не переносятся как актуальные утверждения." }
    ]
  },
  "runes/runes-business": {
    en: [
      { type: "h2", text: "Runes & Business — program structure" },
      { type: "p", text: "The archived program uses Scandinavian runes and mythic figures as symbolic models for situation analysis, intuition, planning and decision-making in personal and business contexts." },
      { type: "h3", text: "Level 1 — Runic diagnostics" },
      { type: "p", text: "Choosing a direction and learning the basic symbolic language through figures such as Valkyries and Norns." },
      { type: "h3", text: "Level 2 — In-depth diagnostics" },
      { type: "p", text: "Comparing options through a model of 24 runic streams and practicing multi-angle situation analysis." },
      { type: "h3", text: "Level 3 — Gods and larger archetypes" },
      { type: "p", text: "Working with Scandinavian mythic figures as a framework for advice, perspective and ritual symbolism." },
      { type: "h3", text: "Level 4 — practical rune work" },
      { type: "p", text: "Applying the symbolic system to concrete questions in projects, relationships and personal goals." },
      { type: "h3", text: "Level 5 — artifacts and Yggdrasil worlds" },
      { type: "p", text: "Study of the main Scandinavian deities, the Yggdrasil cosmology and symbolic artifact-making." },
      { type: "p", text: "Legacy duration, certification, pricing and effectiveness claims are not treated as current promises on Holistic House." }
    ],
    ru: [
      { type: "h2", text: "Руны и бизнес — структура программы" },
      { type: "p", text: "Архивная программа использует скандинавские руны и мифологические фигуры как символические модели для анализа ситуации, интуиции, планирования и принятия решений." },
      { type: "h3", text: "1 уровень — руническая диагностика" },
      { type: "p", text: "Выбор направления и знакомство с символическим языком через образы Валькирий, Норн и других фигур северной традиции." },
      { type: "h3", text: "2 уровень — углублённая диагностика" },
      { type: "p", text: "Сравнение вариантов через модель 24 рунических потоков и многогранный анализ ситуации." },
      { type: "h3", text: "3 уровень — Боги и большие архетипы" },
      { type: "p", text: "Скандинавские мифологические фигуры как рамка для получения новых перспектив и символической ритуальной работы." },
      { type: "h3", text: "4 уровень — практическое применение" },
      { type: "p", text: "Применение рунического языка к конкретным вопросам проектов, отношений и личных целей." },
      { type: "h3", text: "5 уровень — артефакты и миры Иггдрасиля" },
      { type: "p", text: "Знакомство с основными фигурами скандинавского пантеона, космологией Иггдрасиля и символической работой с артефактами." },
      { type: "p", text: "Старые сроки, цены, сертификационные и рекламные обещания сохранены только в исходном архиве и не публикуются как действующие условия." }
    ]
  },
  "elements/water": {
    en: [
      { type: "h2", text: "Water Magic — symbolic study of the Minor Arcana" },
      { type: "p", text: "Although this legacy source sits under an English URL, its surviving body is in Russian. It presents Water Magic as a branch of the Academy’s Elemental Magic curriculum using the Minor Arcana of Tarot as symbolic states for reflection, perception and goal work." },
      { type: "h2", text: "How the material is organised" },
      { type: "p", text: "For each card the source explains an idea, a set of key glyphs and a short verse used as a focusing aid. The sequence runs from the lower numbered cards toward Pages and Aces, with each degree building on previous practice." },
      { type: "h2", text: "Water themes" },
      { type: "p", text: "The archive associates the Water element with memory, personal story, branding and how a person or project is perceived." },
      { type: "h3", text: "2 of Water — looking back" },
      { type: "p", text: "A symbolic exercise for revisiting earlier turning points, separating from an old narrative and identifying alternative possibilities." },
      { type: "h3", text: "3 of Water — growth and scaling" },
      { type: "p", text: "A symbolic exercise for sensing a process, seeing strategy and directing attention toward growth." },
      { type: "p", text: "The original page contains old prices, promotions and strong outcome claims; Holistic House preserves the study map without presenting those as current or verified effects." }
    ]
  },
  "symbolic/artifacts-talismans": {
    en: [
      { type: "h2", text: "Artifacts & Talismans — curriculum" },
      { type: "p", text: "The PsiTrends archive frames this as a specialization in symbolic object-making and ritual space design. Holistic House preserves it as historical/esoteric study material rather than as a claim that objects have guaranteed external effects." },
      { type: "h3", text: "Creating Places of Power" },
      { type: "p", text: "Designing intentional spaces and using place, objects and ritual structure as supports for attention and practice." },
      { type: "h3", text: "Western Mandalas" },
      { type: "p", text: "Constructing geometric and symbolic diagrams to focus a chosen theme or intention." },
      { type: "h3", text: "Artifacts and Amulets" },
      { type: "p", text: "Creating physical symbolic objects for themes such as protection, love, relationships or prosperity within the course’s ritual framework." },
      { type: "h3", text: "Taoist Talismans" },
      { type: "p", text: "Study of scroll talismans, elemental symbolism and ritual algorithms attributed to Taoist traditions." },
      { type: "h3", text: "Ifrits and symbolic helpers" },
      { type: "p", text: "An advanced historical module describing the construction of imagined or ritual “helpers” linked to an artifact." },
      { type: "h3", text: "Kabbalistic talisman work" },
      { type: "p", text: "Use of Kabbalistic symbols and ritual structure in the design of talismans." },
      { type: "h3", text: "Shrines, living icons and astral helpers" },
      { type: "p", text: "Creating shrine-like compositions and symbolic figures used as anchors for contemplative or ritual practice." },
      { type: "p", text: "Promotional promises, business case-study outcomes and claims of immediate magical efficacy from the legacy page are deliberately excluded." }
    ]
  },
  "mysteries/archetypes-of-gods": {
    en: [
      { type: "h2", text: "Great Mysteries — Archetypes of the Gods" },
      { type: "p", text: "The PsiTrends archive presents this material as an archetypal method for looking at a life, relationship or business question through figures from ancient mythological traditions." },
      { type: "h2", text: "How the method was structured" },
      { type: "h3", text: "1. Formulate the question" },
      { type: "p", text: "The first step is to clarify the situation and define a concrete question or intention." },
      { type: "h3", text: "2. Choose an archetypal lens" },
      { type: "p", text: "A mythological figure or tradition is used as a symbolic perspective for associations, reflection and new ways of seeing the problem." },
      { type: "h3", text: "3. Translate symbols into action" },
      { type: "p", text: "The useful part of the reading is brought back to practical observations, decisions or experiments that can be tested in ordinary life." },
      { type: "h2", text: "Traditions represented in the archive" },
      { type: "p", text: "The source material references Egyptian, Greek, Scandinavian, Taoist, Maya/Aztec and Kabbalistic archetypal systems." },
      { type: "h2", text: "Egyptian archetypes" },
      { type: "p", text: "Isis is associated with communication and non-obvious solutions; Hathor with support and beginning; Maat with balance and checking a situation; Thoth with learning and perspective; Horus with action; Ra with scale and vision; Osiris with endings and letting go." },
      { type: "p", text: "Holistic House preserves these as symbolic and educational descriptions. Legacy prices, claims of supernatural influence, guaranteed predictions and promotional promises are intentionally not presented as verified effects or current offers." }
    ],
    ru: [
      { type: "h2", text: "Большие мистерии — Архетипы Богов" },
      { type: "p", text: "В архиве PsiTrends этот материал построен как архетипический способ посмотреть на жизненный, отношенческий или бизнес-вопрос через образы древних мифологических традиций." },
      { type: "h2", text: "Как была устроена работа" },
      { type: "h3", text: "1. Сформулировать вопрос" },
      { type: "p", text: "Сначала уточняется ситуация и формулируется конкретный вопрос или намерение." },
      { type: "h3", text: "2. Выбрать архетипическую оптику" },
      { type: "p", text: "Мифологическая фигура или традиция используется как символическая перспектива для ассоциаций, размышления и нового взгляда на проблему." },
      { type: "h3", text: "3. Перевести символы в действия" },
      { type: "p", text: "Полезные наблюдения переводятся в решения, шаги или эксперименты, которые можно проверить в обычной жизни." },
      { type: "h2", text: "Традиции в архиве" },
      { type: "p", text: "В исходных материалах упоминаются египетская, греческая, скандинавская, даосская, майянская/ацтекская и каббалистическая архетипические системы." },
      { type: "h2", text: "Египетские архетипы" },
      { type: "p", text: "Исида связана с коммуникацией и нестандартными решениями; Хатхор — с поддержкой и началом; Маат — с балансом и проверкой ситуации; Тот — с обучением и перспективой; Гор — с действием; Ра — с масштабом и видением; Осирис — с завершением и отпусканием." },
      { type: "p", text: "Holistic House сохраняет эти описания как символический и образовательный материал. Старые цены, заявления о сверхъестественном воздействии, гарантированных предсказаниях и рекламные обещания намеренно не публикуются как проверенные эффекты или актуальные предложения." }
    ]
  },
  "elements/elemental-magic": {
    en: [
      { type: "h2", text: "Elemental Magic — course structure" },
      { type: "p", text: "The PsiTrends archive presents Elemental Magic as a symbolic study of the Minor Arcana of Tarot within the Sephirotic tradition, using the four elements as a framework for attention, reflection and goal modelling." },
      { type: "h2", text: "Four-element framework" },
      { type: "p", text: "Air is associated with options, ideas and movement; Fire with vitality and action; Earth with material structure and resources; Water with memory, perception and emotional meaning." },
      { type: "h2", text: "Progression through the Minor Arcana" },
      { type: "p", text: "The archived curriculum moves through numbered Minor Arcana and later Pages and Aces. Each card is introduced through its central idea, key symbols or glyphs, and a short focusing text." },
      { type: "h3", text: "Introductory study" },
      { type: "p", text: "Learning the symbolic language of the elements and noticing how different states affect perception, choices and a chosen goal." },
      { type: "h3", text: "Applied practice" },
      { type: "p", text: "Exercises with mandalas and symbolic models are used to compare perspectives and organise a project or personal intention." },
      { type: "h3", text: "Advanced historical modules" },
      { type: "p", text: "The legacy course also references elemental spirits, ritual initiations and deeper Sephirotic material. Holistic House presents these as historical/esoteric study topics rather than claims of objective supernatural effects." },
      { type: "p", text: "Old promotions, prices, registration offers, effectiveness claims and certification language are omitted from the current public presentation." }
    ],
    ru: [
      { type: "h2", text: "Магия Стихий — структура курса" },
      { type: "p", text: "В архиве PsiTrends Магия Стихий описывается как символическое изучение Младших Арканов Таро в рамках Сефиротической традиции, где четыре стихии используются как модель внимания, рефлексии и работы с целью." },
      { type: "h2", text: "Модель четырёх стихий" },
      { type: "p", text: "Воздух связан с вариантами, идеями и движением; Огонь — с жизненностью и действием; Земля — с материальной структурой и ресурсами; Вода — с памятью, восприятием и эмоциональным смыслом." },
      { type: "h2", text: "Последовательность Младших Арканов" },
      { type: "p", text: "Историческая программа проходит через числовые Младшие Арканы, а затем Пажей и Тузов. Для каждой карты раскрывается основная идея, ключевые символы/глифы и короткий текст для концентрации." },
      { type: "h3", text: "Вводный уровень" },
      { type: "p", text: "Знакомство с символическим языком стихий и наблюдение за тем, как разные состояния меняют восприятие, выбор и отношение к поставленной цели." },
      { type: "h3", text: "Прикладная практика" },
      { type: "p", text: "Мандалы и символические модели используются для сравнения разных перспектив и структурирования проекта или личного намерения." },
      { type: "h3", text: "Продвинутые исторические модули" },
      { type: "p", text: "В старом курсе также упоминаются духи стихий, ритуальные инициации и более глубокие материалы Сефиротической традиции. На Holistic House это представлено как исторический/эзотерический учебный материал, а не как утверждение об объективном сверхъестественном эффекте." },
      { type: "p", text: "Старые акции, цены, регистрационные предложения, обещания эффективности и сертификационные формулировки в текущую публичную версию не переносятся." }
    ]
  },
  "history": {
    en: [
      { type: "h2", text: "Academy of Temple Arts — historical structure" },
      { type: "p", text: "The PsiTrends archive describes a long-form school that combined Reiki systems, temple and mythological studies, symbolic arts and applied archetypal practice. This page preserves that historical structure rather than presenting every legacy claim or credential as current." },
      { type: "h2", text: "How learning was organised" },
      { type: "p", text: "The school used an initiation-based progression combined with individual study, practice with partners, seminars and assessment. Reiki Yggdrasil functioned as one of the organising frameworks for the wider curriculum." },
      { type: "h2", text: "Historical faculties" },
      { type: "p", text: "The archive groups study into Ancient Egypt, Greek and Roman Mysteries, spiritual studies, Tantra and Vedic heritage, Slavic imagery traditions, Scandinavian runes, Taoism and Sufism, and Pan-American/Maya/Toltec material." },
      { type: "h2", text: "Specializations" },
      { type: "p", text: "Historical specializations included relationships and Tantra, archetypal practice and personal development, astrology and symbolic perception, handmade artifacts, and research-oriented study." },
      { type: "p", text: "Holistic House keeps the archive for educational continuity. Historical speed claims, institutional endorsements, qualification language and therapeutic outcome claims are not carried forward as current guarantees." }
    ],
    ru: [
      { type: "h2", text: "Академия Храмовых Искусств — историческая структура" },
      { type: "p", text: "Архив PsiTrends описывает школу длительного обучения, где соединялись системы Рейки, храмовые и мифологические традиции, символические искусства и прикладная архетипическая практика. Здесь сохраняется структура школы, а не все старые рекламные или статусные утверждения." },
      { type: "h2", text: "Как было организовано обучение" },
      { type: "p", text: "Использовалась последовательность инициаций в сочетании с самостоятельным изучением, практикой с партнёрами, семинарами и проверкой освоения материала. Рейки Иггдрасиль выступала одним из организующих каркасов большой программы." },
      { type: "h2", text: "Исторические факультеты" },
      { type: "p", text: "В архиве выделены Египетская традиция, Греческие и Римские мистерии, духовные исследования, Тантра и Ведическое наследие, славянские образные традиции, скандинавские руны, Даосизм и Суфизм, а также материалы Майя, Толтеков и других традиций Америки." },
      { type: "h2", text: "Специализации" },
      { type: "p", text: "Исторически отдельно выделялись отношения и Тантра, архетипическая практика и личностное развитие, астрология и символическое восприятие, создание артефактов и исследовательская работа." },
      { type: "p", text: "Holistic House сохраняет этот архив для образовательной преемственности. Старые заявления о скорости обучения, институциональных подтверждениях, квалификациях и терапевтических результатах не переносятся как текущие гарантии." }
    ]
  }
};

function academySourceBlocks(record: AcademySourceRecord) {
  return academyCuratedPublicBlocks[record.logicalId]?.[record.sourceLocale] ?? record.content;
}

const academyPublicOmitPattern = /(free online course|limited time|register|registration|book your session|schedule your first|price|costs?:|certificate|certification|qualification|approx hours|full program takes|takes? (?:around )?\d+ (?:weeks?|months?|years?)|5\s*[-–]?\s*10 times|5 times faster|revenue growth.*times|регистрац|записат|стоимост|сертифик|квалификац|бесплатн|ограниченн.*время)/i;

export function academyPublicBlocks(record: AcademySourceRecord) {
  return academySourceBlocks(record).filter((block) => !academyPublicOmitPattern.test(block.text));
}

export function academyPublicOmittedCount(record: AcademySourceRecord) {
  const blocks = academySourceBlocks(record);
  return blocks.length - academyPublicBlocks(record).length;
}

export function isPublicLocale(value: string): value is PublicLocale { return value === "en" || value === "ru" || value === "es"; }
export function getAcademyRecords(): AcademySourceRecord[] { return sourceRecords; }
function localeRank(record: AcademySourceRecord, locale: PublicLocale) { if (locale !== "es" && record.sourceLocale === locale) return 0; if (record.sourceLocale === "en") return 1; return 2; }
function academyRecordHasBody(record: AcademySourceRecord) { return academySourceBlocks(record).some((block) => block.type === "p" || block.type === "li"); }
function compareAcademyRecords(a: AcademySourceRecord, b: AcademySourceRecord, locale: PublicLocale) {
  const bodyRank = Number(!academyRecordHasBody(a)) - Number(!academyRecordHasBody(b));
  return bodyRank || localeRank(a, locale) - localeRank(b, locale);
}
export function preferredAcademyRecords(locale: PublicLocale, filter?: (record: AcademySourceRecord) => boolean) {
  const byId = new Map<string, AcademySourceRecord[]>();
  for (const record of sourceRecords) { if (filter && !filter(record)) continue; const list = byId.get(record.logicalId) ?? []; list.push(record); byId.set(record.logicalId, list); }
  return [...byId.values()].map((list) => [...list].sort((a, b) => compareAcademyRecords(a, b, locale))[0]).sort((a, b) => a.routeKey.localeCompare(b.routeKey));
}
export function recordsForDirection(direction: AcademyDirectionId, locale: PublicLocale) { return preferredAcademyRecords(locale, (record) => record.direction === direction); }
export function videoRecords(locale: PublicLocale) { return preferredAcademyRecords(locale, (record) => record.direction === "videos"); }
export function findAcademyRecord(routeKey: string, locale: PublicLocale) { const matches = sourceRecords.filter((record) => record.routeKey === routeKey); if (!matches.length) return undefined; return [...matches].sort((a, b) => compareAcademyRecords(a, b, locale))[0]; }
export function mediaForRecord(record: AcademySourceRecord) {
  const exact = mediaRecords.filter((item) => item.logicalId === record.logicalId && item.sourceUrl === record.sourceUrl);
  if (exact.some((item) => youtubeIdFromUrl(item.mediaUrl))) return exact;
  return mediaRecords.filter((item) => item.logicalId === record.logicalId);
}
export function youtubeIdFromUrl(url: string) { const match = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/); return match?.[1]; }
export function sourceLanguageNotice(record: AcademySourceRecord, locale: PublicLocale) { if (locale !== "es" && record.sourceLocale === locale) return null; return academyCopy[locale].sourceLanguage + " " + academyCopy[locale][record.sourceLocale] + "."; }
