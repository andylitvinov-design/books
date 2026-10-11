import type { PublicLocale } from "@/lib/public-locales";

/**
 * Holistic House editorial adaptation of the owner's surviving Kundalini Reiki
 * teaching materials. These are spiritual/meditative traditions, not established
 * medical treatments. Original references are retained only in the internal source audit, never as public off-site course links.
 */
export type LocalText = Record<PublicLocale, string>;
export type KundaliniLesson = {
  number: 1 | 2 | 3;
  title: LocalText;
  summary: LocalText;
  focus: LocalText[];
  exercise: LocalText;
  assignment: LocalText;
};

export const kundaliniSources = [
  {
    site: "PsiMaster",
    url: "https://psimaster.net/service?shs_term_node_tid_depth=12345",
    label: "Кундалини Рейки — базовый курс I–III",
    note: "Detailed source: Level 1, Level 2 Balance, Master level, self-practice, partner consent and named supplementary systems.",
  },
  {
    site: "SuperSkills",
    url: "https://superskills.vip/trial-express-programs/academy-overview/master-of-kundalini-reiki.html",
    label: "Kundalini Reiki — original course introduction",
    note: "Distinct three-attunement Reiki tradition, Kundalini imagery, overview and link to a separately hosted legacy manual.",
  },
  {
    site: "SuperSkills",
    url: "https://superskills.vip/trial-express-programs/academy-overview.html",
    label: "Reiki Healing Marathon — Kundalini, Tantra, Yggdrasil",
    note: "Positions Kundalini Reiki beside, not inside, Tantra Reiki and Runic Reiki Yggdrasil; past participation conditions are historical.",
  },
  {
    site: "SuperSkills",
    url: "https://superskills.vip/shamanicacademy/vedic-tantric-magic.html",
    label: "Vedic & Tantric Heritage — programme index",
    note: "Lists Kundalini Reiki as its own elective with three levels; distinct from a separate Kundalini Awakening programme.",
  },
  {
    site: "PsiTrends",
    url: "https://psitrends.com/studies/adv/reiki",
    label: "Shamanic Reiki School — five introductory paths",
    note: "Kundalini Reiki unit: chakras, reading, meditation, video, partner practice and learner report.",
  },
  {
    site: "PsiTrends",
    url: "https://psitrends.com/studies/master-taory",
    label: "Academy of Ancient Temple Arts — wider training context",
    note: "Documents the school's original Reiki teaching context without conflating Kundalini with Reiki Yggdrasil.",
  },
] as const;

export const kundaliniLessons: KundaliniLesson[] = [
  {
    number: 1,
    title: {
      en: "Foundation & self-practice",
      ru: "Основа и практика с собой",
      es: "Fundamentos y práctica personal",
    },
    summary: {
      en: "Meet the language of Reiki and Kundalini, learn a grounded daily meditation and begin observing sensations without chasing dramatic effects.",
      ru: "Познакомьтесь с языком Рейки и Кундалини, освойте спокойную ежедневную медитацию и наблюдение за ощущениями без ожидания необычных эффектов.",
      es: "Conoce Reiki y Kundalini, establece una meditación diaria y observa tus sensaciones sin buscar experiencias extraordinarias.",
    },
    focus: [
      {
        en: "The symbolic route from the root to the crown: seven chakra images and the central channel.",
        ru: "Символический путь от корневого центра к макушке: семь чакр и центральный канал.",
        es: "La ruta simbólica de la raíz a la corona: siete chakras y el canal central.",
      },
      {
        en: "Gassho (palms together), intention, grounding and a short seated self-practice.",
        ru: "Гассё (ладони вместе), намерение, заземление и короткая практика сидя.",
        es: "Gassho (palmas juntas), intención, enraizamiento y una práctica sentado.",
      },
      {
        en: "Gentle optional hand placements, body awareness and a short reflection journal.",
        ru: "Мягкое расположение ладоней, внимание к телу и краткий дневник наблюдений.",
        es: "Posiciones suaves de las manos, conciencia corporal y diario breve.",
      },
      {
        en: "Practice with a willing partner, clear consent, boundaries and optional distance visualisation.",
        ru: "Практика с согласным партнёром, ясные границы и при желании дистанционная визуализация.",
        es: "Práctica con una pareja que consiente, límites claros y visualización a distancia opcional.",
      },
    ],
    exercise: {
      en: "Sit or lie comfortably. Bring palms together, name one personal intention, notice breath and physical sensations for 10–15 minutes, then record what you actually experienced.",
      ru: "Сядьте или лягте удобно. Соедините ладони, сформулируйте одно личное намерение, 10–15 минут наблюдайте дыхание и ощущения, затем запишите фактические наблюдения.",
      es: "Siéntate o recuéstate cómodamente. Junta las palmas, define una intención, observa la respiración y sensaciones durante 10–15 minutos y anota lo que realmente sentiste.",
    },
    assignment: {
      en: "Keep a brief journal over several sessions. Describe mood, attention and sensations, and practise asking for consent before any partner exercise.",
      ru: "Проведите несколько практик с дневником: отмечайте настроение, внимание и ощущения. Отдельно потренируйтесь спрашивать согласие на упражнения с партнёром.",
      es: "Lleva un diario durante varias sesiones: ánimo, atención y sensaciones. Practica solicitar consentimiento antes de trabajar con otra persona.",
    },
  },
  {
    number: 2,
    title: {
      en: "Kundalini imagery & Balance",
      ru: "Образ Кундалини и «Баланс»",
      es: "Imagen Kundalini y «Balance»",
    },
    summary: {
      en: "Deepen the traditional earth-to-crown visualisation, explore chakra symbolism and study the short Balance practice recorded within the Kundalini Reiki tradition.",
      ru: "Углубите традиционную визуализацию потока от земли к макушке, изучите символику чакр и короткую практику «Баланс» в традиции Кундалини Рейки.",
      es: "Profundiza la visualización tradicional de tierra a corona, explora los chakras y conoce el ejercicio breve «Balance» de la tradición.",
    },
    focus: [
      {
        en: "The Kundalini Flame as a meditative image of vitality and upward movement.",
        ru: "«Огонь Кундалини» как медитативный образ жизненности и движения вверх.",
        es: "La «llama Kundalini» como imagen meditativa de vitalidad y movimiento ascendente.",
      },
      {
        en: "Chakra-focused attention and the difference between bodily sensations and interpretation.",
        ru: "Внимание к чакрам и различение телесных ощущений и их интерпретаций.",
        es: "Atención a los chakras y distinción entre sensaciones e interpretaciones.",
      },
      {
        en: "The historical Balance ritual: touch matching fingertips together, pause, and name your intention.",
        ru: "Историческая практика «Баланс»: соединить подушечки пальцев обеих рук, сделать паузу и обозначить намерение.",
        es: "El ritual histórico «Balance»: unir las yemas de ambas manos, hacer una pausa y nombrar tu intención.",
      },
      {
        en: "Bringing the practice into daily life without claiming physical or medical effects.",
        ru: "Интеграция практики в повседневность без обещаний физического или медицинского эффекта.",
        es: "Integración cotidiana sin promesas de efectos físicos o médicos.",
      },
    ],
    exercise: {
      en: "For about 30 seconds, bring corresponding fingertips together and silently name the Balance intention. Follow with an unhurried body check-in. This is a reflective ritual, not a proven intervention.",
      ru: "Примерно на 30 секунд соедините соответствующие кончики пальцев и мысленно назовите намерение «Баланс». Затем спокойно проверьте ощущения в теле. Это рефлексивный ритуал, не доказанный лечебный метод.",
      es: "Durante unos 30 segundos, une las yemas correspondientes y formula la intención «Balance». Después observa el cuerpo sin prisa. Es un ritual reflexivo, no un tratamiento demostrado.",
    },
    assignment: {
      en: "Compare an ordinary grounding meditation and the Balance exercise in your notes; describe experience rather than promising outcomes.",
      ru: "Сравните обычную медитацию заземления с «Балансом» в дневнике; описывайте опыт, а не предполагаемые результаты.",
      es: "Compara la meditación de enraizamiento con «Balance» en tu diario; describe la experiencia, no resultados supuestos.",
    },
  },
  {
    number: 3,
    title: {
      en: "Master level & traditional extensions",
      ru: "Ступень Мастера и дополнительные настройки",
      es: "Nivel Maestro y extensiones tradicionales",
    },
    summary: {
      en: "Study the teacher/attunement format and the six named symbolic extensions included in the teaching sequence; approach these as symbolic study themes, not cure claims.",
      ru: "Изучите формат мастерской передачи и шесть дополнительных названных настроек как символические темы традиции без обещаний исцеления.",
      es: "Estudia el formato de transmisión y seis extensiones simbólicas como temas simbólicos tradicionales, sin promesas de curación.",
    },
    focus: [
      {
        en: "Master-level initiation/attunement as a teacher-led practice within this tradition.",
        ru: "Мастерская инициация / настройка как практика с преподавателем в рамках традиции.",
        es: "La iniciación de nivel Maestro como práctica guiada por un docente.",
      },
      {
        en: "Diamond Reiki and Crystal Reiki: traditional names for clarity and focus visualisation.",
        ru: "Алмазное и Кристаллическое Рейки: традиционные названия образных практик ясности и внимания.",
        es: "Reiki Diamante y Reiki Cristal: nombres tradicionales para visualización y atención.",
      },
      {
        en: "DNA Reiki, Birth Trauma Reiki and Past Life Reiki: legacy ritual labels, not biological or psychological treatment.",
        ru: "ДНК Рейки, Рейки Родовой травмы и Прошлой жизни: исторические ритуальные названия, не биологическое или психотерапевтическое лечение.",
        es: "Reiki ADN, Trauma del Nacimiento y Vidas Pasadas: nombres rituales históricos, no tratamientos.",
      },
      {
        en: "Location Reiki, object/crystal symbolism, and responsible communication with students.",
        ru: "Рейки Местоположения, символика предметов/кристаллов и ответственная коммуникация с учениками.",
        es: "Reiki de Lugar, simbolismo de objetos/cristales y comunicación responsable.",
      },
    ],
    exercise: {
      en: "The historic text proposes an eight-day sequence: Crystal (days 1–2), DNA (3), Birth (4), Location (5), Past Life (6–8). Study it as a symbolic reflection sequence only; no healing, DNA repair or past-life claims are implied.",
      ru: "В историческом тексте есть восьмидневная последовательность: Кристалл (1–2), ДНК (3), Рождение (4), Место (5), Прошлая жизнь (6–8). Изучайте её только как символическую последовательность: она не означает лечение, восстановление ДНК или достоверность прошлых жизней.",
      es: "El texto histórico propone ocho días: Cristal (1–2), ADN (3), Nacimiento (4), Lugar (5), Vida Pasada (6–8). Estúdialo solo como secuencia simbólica, sin afirmar curación ni reparación del ADN.",
    },
    assignment: {
      en: "Prepare a responsible practice outline: purpose, participant consent, observable experience, limits of the method and clear language for any future students.",
      ru: "Подготовьте этичный план практики: цель, согласие участников, наблюдаемый опыт, ограничения метода и понятные объяснения будущим ученикам.",
      es: "Prepara un plan ético: objetivo, consentimiento, experiencia observable, límites del método y explicaciones claras.",
    },
  },
];

export const kundaliniEveryday: { title: LocalText; description: LocalText }[] = [
  {
    title: { en: "Start with yourself", ru: "Начните с себя", es: "Empieza contigo" },
    description: {
      en: "Regular short sessions, at a comfortable pace. Pause if a practice feels distressing.",
      ru: "Регулярные короткие сеансы в удобном темпе. При дискомфорте остановитесь.",
      es: "Sesiones breves y regulares a un ritmo cómodo. Detente si surge malestar.",
    },
  },
  {
    title: { en: "Intention & hands", ru: "Намерение и ладони", es: "Intención y manos" },
    description: {
      en: "Use palms together or gentle self-touch as a focus for attention; specific placements are optional.",
      ru: "Ладони вместе или мягкое прикосновение к себе как опора для внимания; фиксированные позиции необязательны.",
      es: "Une las palmas o usa un contacto suave contigo como foco de atención; las posiciones son opcionales.",
    },
  },
  {
    title: { en: "Partner work with consent", ru: "Практика с согласия", es: "Práctica con consentimiento" },
    description: {
      en: "Ask first, agree on boundaries, and make touch optional. Visualisation at a distance is an intention exercise, not evidence that someone receives treatment.",
      ru: "Сначала спросите, согласуйте границы, прикосновения необязательны. Дистанционная визуализация — упражнение с намерением, а не доказательство воздействия на другого.",
      es: "Pregunta antes, acuerda límites y permite practicar sin tocar. La visualización a distancia no prueba un efecto sobre otros.",
    },
  },
  {
    title: { en: "Reflect on situations", ru: "Осмысление ситуаций", es: "Reflexión sobre situaciones" },
    description: {
      en: "Explore intention in relationships, surroundings and personal goals. Use those as reflective prompts, not guarantees of external change.",
      ru: "Исследуйте намерение в отношениях, пространстве и личных целях. Используйте их как темы осмысления, не гарантии изменения обстоятельств.",
      es: "Explora la intención en relaciones, entornos y metas; úsalas para reflexionar, sin prometer cambios externos.",
    },
  },
  {
    title: { en: "Keep a learning journal", ru: "Ведите дневник", es: "Lleva un diario" },
    description: {
      en: "Record what you actually did and felt, including questions to discuss with a teacher.",
      ru: "Записывайте, что вы реально делали и чувствовали, и вопросы преподавателю.",
      es: "Anota lo que hiciste y sentiste, incluyendo preguntas para el docente.",
    },
  },
];

export const kundaliniInterface: Record<PublicLocale, {
  eyebrow: string; title: string; introduction: string; primary: string; secondary: string;
  pdfButton: string; heroImageAlt: string; heroStamp: string; benefitsLabel: string; benefits: string[];
  programmeKicker: string; levelLabel: string; learningKicker: string; practiceImageAlt: string;
  guideKicker: string; guideTitle: string; guideDescription: string; contactKicker: string;
  heroNote: string; levels: string; levelsSub: string; sourcesCount: string; focus: string;
  stepsTitle: string; stepsSub: string; detailLabel: string; exercise: string; assignment: string;
  methodTitle: string; methodLead: string; howTitle: string; howText: string[];
  faqTitle: string; faqs: { q: string; a: string }[];
  sourceTitle: string; sourceLead: string; archiveLabel: string; provenanceNote: string;
  contactTitle: string; contactText: string; contactProgramme: string; contactLevel: string; telegram: string;
  footerNote: string; back: string;
}> = {
  en: {
    pdfButton: "Download PDF", heroImageAlt: "Authentic school photography — a calm Reiki learning environment",
    heroStamp: "Meditation · Practice · Initiation",
    benefitsLabel: "Programme benefits",
    benefits: ["Three clear levels", "Practice at your own pace", "Personal learning with a teacher"],
    programmeKicker: "YOUR LEARNING PATH", levelLabel: "LEVEL", learningKicker: "SIMPLE & PERSONAL",
    practiceImageAlt: "Practice and meditation — Holistic House learning materials",
    guideKicker: "YOUR STUDY MATERIALS", guideTitle: "Keep the complete course guide",
    guideDescription: "A beautifully organised PDF in English with all three levels, practice notes and guidance on how to begin.",
    contactKicker: "BEGIN WITH LEVEL 1",
    eyebrow: "HOLISTIC HOUSE · REIKI TRAINING",
    title: "Kundalini Reiki",
    introduction: "Three levels of meditation, chakra imagery and personal Reiki practice. Begin gently, develop balance, and continue towards Master-level study.",
    primary: "Explore the 3 levels", secondary: "Ask about training",
    heroNote: "Meditation and personal attention — a gentle independent practice",
    levels: "3 levels", levelsSub: "Foundation → Balance → Master", sourcesCount: "3 original sites", focus: "A personal practice first",
    stepsTitle: "Three levels. One clear path.", stepsSub: "Select a level to see its full lessons and practical exercises.",
    detailLabel: "View the full level", exercise: "Guided study exercise", assignment: "Practice & reflection",
    methodTitle: "Five everyday practice notes", methodLead: "Practical elements preserved from the original school material, with consent, grounding and honest observation at the centre.",
    howTitle: "How you learn", howText: ["1. Read the lesson and practise your own meditation.", "2. Discuss the level and receive an initiation with a qualified teacher if you choose that path.", "3. Practise independently or with a consenting partner, then share a short reflection before progressing."],
    faqTitle: "Questions before you begin",
    faqs: [
      { q: "How is Kundalini Reiki different from Tantra or Yggdrasil Reiki?", a: "These are distinct training paths. Kundalini Reiki focuses on a three-step attunement model and chakra/Kundalini imagery. Tantra Reiki has nine levels centred on relational and embodied themes; Yggdrasil has its own runic and temple-tradition structure." },
      { q: "Do I need previous Reiki training?", a: "The original three-level course presents Level 1 as the beginning. Ask the teacher to confirm current prerequisites and the suitable entry point." },
      { q: "Is Level 1 free? What does the course cost?", a: "Some older source pages mention trial, discounted or free offers. They are historical and do not establish a current price or place. Ask for today's options before booking." },
      { q: "Is it a health treatment?", a: "No. This is spiritual and reflective education, not a diagnosis or a substitute for evidence-based medical or mental-health care. References to DNA, birth trauma and past lives are historical names, not established outcomes." },
    ],
    sourceTitle: "Original teaching sources", sourceLead: "The course brings together the surviving first-party descriptions; open the original pages for the full historic wording and the wider school context.", archiveLabel: "Read original", provenanceNote: "Legacy costs, certificates, superior-power comparisons and medical promises are not carried forward as current facts. The historical eight-day sequence is documented inside Level 3.",
    contactTitle: "Ready for your first step?", contactText: "Read the complete programme here or in the PDF. Then contact Andrey about a personal initiation or current course conditions.",
    contactProgramme: "Ask about training format & fees", contactLevel: "Request personal Level 1 initiation", telegram: "Or write on Telegram",
    footerNote: "Educational, contemplative practice. Participation and physical touch are always optional.",
    back: "Academy",
  },
  ru: {
    pdfButton: "Скачать PDF", heroImageAlt: "Реальное фото из материалов школы — атмосфера обучения Рейки",
    heroStamp: "Медитация · Практика · Инициация",
    benefitsLabel: "Преимущества программы",
    benefits: ["Три понятные ступени", "Практика в своём темпе", "Личное обучение с преподавателем"],
    programmeKicker: "ВАШ ПУТЬ ОБУЧЕНИЯ", levelLabel: "СТУПЕНЬ", learningKicker: "ПРОСТО И ЛИЧНО",
    practiceImageAlt: "Практика и медитация — обучающие материалы Holistic House",
    guideKicker: "УЧЕБНЫЕ МАТЕРИАЛЫ", guideTitle: "Сохраните полное описание курса",
    guideDescription: "Красивый PDF на русском: все три ступени, практические задания и как начать обучение.",
    contactKicker: "НАЧНИТЕ С ПЕРВОЙ СТУПЕНИ",
    eyebrow: "HOLISTIC HOUSE · ОБУЧЕНИЕ РЕЙКИ",
    title: "Кундалини Рейки",
    introduction: "Три ступени медитации, работы с образом Кундалини и личной практики Рейки. От первых упражнений — к «Балансу» и мастерским настройкам.",
    primary: "Посмотреть 3 ступени", secondary: "Узнать об обучении",
    heroNote: "Медитация и внимание к себе — мягкая самостоятельная практика",
    levels: "3 ступени", levelsSub: "Основа → Баланс → Мастер", sourcesCount: "3 сайта-источника", focus: "Сначала личная практика",
    stepsTitle: "Три ступени. Один понятный путь.", stepsSub: "Раскройте ступень, чтобы посмотреть все темы и упражнения.",
    detailLabel: "Подробнее о ступени", exercise: "Учебная практика", assignment: "Практическое задание",
    methodTitle: "Пять подсказок для практики", methodLead: "Сохранили основные упражнения школы, добавив понятные границы, согласие и наблюдение за реальным опытом.",
    howTitle: "Как проходит обучение", howText: ["1. Изучаете материал и осваиваете медитацию самостоятельно.", "2. При желании проходите соответствующую инициацию с преподавателем.", "3. Практикуете самостоятельно или с согласным партнёром и описываете результат наблюдений перед следующей ступенью."],
    faqTitle: "Вопросы перед началом",
    faqs: [
      { q: "Чем Кундалини Рейки отличается от Тантра Рейки и Иггдрасиль?", a: "Это отдельная система: три ступени, настройка и образ Кундалини, символика чакр. Тантра Рейки имеет девять ступеней с акцентом на контакт и телесный опыт. Иггдрасиль — самостоятельная руническая и храмовая программа." },
      { q: "Нужен ли опыт в Рейки?", a: "В исходной трёхступенчатой программе первая ступень представлена как входная. Актуальные требования и формат лучше уточнить у преподавателя." },
      { q: "Первая ступень бесплатная? Какая цена?", a: "На старых сайтах встречаются пробные, бесплатные и акционные предложения. Они не подтверждают сегодняшнюю стоимость и доступность. Текущие условия уточняются перед записью." },
      { q: "Это метод лечения?", a: "Нет. Это духовно-медитативное обучение, а не диагностика и не замена медицинской или психотерапевтической помощи. «ДНК», «родовая травма» и «прошлая жизнь» — названия исторических упражнений, а не доказанные лечебные эффекты." },
    ],
    sourceTitle: "Первоисточники и учебные материалы", sourceLead: "Здесь объединены сохранившиеся авторские страницы; все ссылки ведут на оригинальные тексты и контекст школы.", archiveLabel: "Читать первоисточник", provenanceNote: "Старые цены, сертификаты, сравнения силы разных Рейки и обещания исцеления не перенесены как актуальные факты. Историческая последовательность восьми дней описана внутри 3-й ступени.",
    contactTitle: "Готовы начать обучение?", contactText: "Вся программа — здесь и в PDF. Напишите Андрею, чтобы согласовать личную инициацию или актуальные условия обучения.",
    contactProgramme: "Узнать формат обучения и стоимость", contactLevel: "Запросить личную инициацию 1-й ступени", telegram: "Или написать в Telegram",
    footerNote: "Духовно-медитативная практика. Участие и прикосновения — только по желанию и с согласия.",
    back: "Академия",
  },
  es: {
    pdfButton: "Descargar PDF", heroImageAlt: "Fotografía original de la escuela y su práctica de Reiki",
    heroStamp: "Meditación · Práctica · Iniciación",
    benefitsLabel: "Ventajas del curso",
    benefits: ["Tres niveles claros", "Práctica a tu ritmo", "Aprendizaje personal con el docente"],
    programmeKicker: "TU CAMINO DE ESTUDIO", levelLabel: "NIVEL", learningKicker: "SIMPLE Y PERSONAL",
    practiceImageAlt: "Práctica y meditación en Holistic House",
    guideKicker: "MATERIAL DE ESTUDIO", guideTitle: "Descarga la guía completa",
    guideDescription: "PDF en español con los tres niveles, ejercicios y pasos para comenzar.",
    contactKicker: "EMPIEZA CON EL NIVEL 1",
    eyebrow: "HOLISTIC HOUSE · FORMACIÓN REIKI",
    title: "Kundalini Reiki",
    introduction: "Tres niveles de meditación, imágenes de chakras y práctica personal de Reiki: fundamentos, equilibrio y formación de Maestro.",
    primary: "Ver los 3 niveles", secondary: "Consultar formación",
    heroNote: "Meditación y atención personal",
    levels: "3 niveles", levelsSub: "Fundamentos → Balance → Maestro", sourcesCount: "3 sitios originales", focus: "Primero, práctica personal",
    stepsTitle: "Tres niveles. Un camino claro.", stepsSub: "Abre cada nivel para ver el contenido y los ejercicios.",
    detailLabel: "Ver el nivel completo", exercise: "Ejercicio de estudio", assignment: "Práctica y reflexión",
    methodTitle: "Cinco pautas de práctica", methodLead: "Elementos de los textos originales, con consentimiento, enraizamiento y observación honesta.",
    howTitle: "Cómo aprender", howText: ["1. Lee la lección y practica la meditación.", "2. Si lo deseas, recibe la iniciación correspondiente con un docente.", "3. Practica a solas o con una pareja que consienta, y comparte tus observaciones."],
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿En qué se diferencia de Tantra Reiki o Yggdrasil?", a: "Son cursos diferentes. Kundalini Reiki tiene tres niveles y usa imágenes de chakras; Tantra Reiki tiene nueve niveles relacionales, e Yggdrasil utiliza tradiciones rúnicas y de templo." },
      { q: "¿Necesito experiencia previa?", a: "El material original presenta el Nivel 1 como entrada. Confirma los requisitos actuales con el docente." },
      { q: "¿El Nivel 1 es gratuito?", a: "Algunas páginas históricas contienen promociones; no confirman la disponibilidad ni el precio actuales. Pregunta antes de reservar." },
      { q: "¿Es un tratamiento médico?", a: "No. Es aprendizaje espiritual y contemplativo, sin sustituir atención médica o psicológica. ADN, trauma del nacimiento y vidas pasadas son nombres tradicionales, no resultados demostrados." },
    ],
    sourceTitle: "Fuentes originales", sourceLead: "Reunimos materiales de las tres webs; los enlaces llevan a los textos históricos.", archiveLabel: "Leer fuente", provenanceNote: "Precios antiguos, certificados, comparaciones de poder y promesas médicas no se presentan como hechos actuales. La secuencia histórica de ocho días aparece en el Nivel 3.",
    contactTitle: "¿Listo para comenzar?", contactText: "Toda la guía está aquí y en PDF. Contacta con Andrey para acordar una iniciación personal o consultar las condiciones.",
    contactProgramme: "Consultar formato y precio", contactLevel: "Solicitar iniciación personal Nivel 1", telegram: "O escribir por Telegram",
    footerNote: "Práctica educativa y contemplativa. Participación y contacto físico siempre opcionales.",
    back: "Academia",
  },
};
