import Link from "next/link";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./yggdrasil-source-study-guide.module.css";

type Localized = Record<PublicLocale, string>;
type LocalizedItems = Record<PublicLocale, string[]>;
type GuideMode = "overview" | "basic" | "instructor";

const base = "https://superskills.vip";
const levelPath = base + "/books/reiki/runic-reiki-yggdrasil-brief-description/";
const freePath = base + "/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/";

const levelSources = [
  levelPath + "retreat-1-details-basic-5-levels-of-initiation-into-runic-reiki.html",
  levelPath + "runic-reiki-yggdrasil-level-2.html",
  levelPath + "runic-reiki-yggdrasil-level-3.html",
  levelPath + "runic-reiki-yggdrasil-level-4.html",
  levelPath + "runic-reiki-yggdrasil-level-5.html",
];

const levels: Array<{
  title: Localized;
  description: Localized;
  topics: LocalizedItems;
  exercises: LocalizedItems;
}> = [
  {
    title: { en: "Body awareness, intuition and boundaries", ru: "Внимание к телу, интуиция и границы", es: "Conciencia corporal, intuición y límites" },
    description: {
      en: "The opening stage introduces the World Tree as a symbolic map of inner support. Students explore the traditional Healing, Intuition and Protection streams alongside reflection on everyday situations.",
      ru: "Начальная ступень знакомит с Мировым Древом как символической картой внутренней опоры. В центре — традиционные потоки «Целительство», «Интуиция», «Защита» и работа с жизненными ситуациями.",
      es: "La primera etapa presenta el Árbol del Mundo como mapa simbólico de apoyo interior. Se exploran Sanación, Intuición, Protección y el trabajo con situaciones cotidianas.",
    },
    topics: {
      en: ["Healing", "Intuition", "Protection", "Situation balancing"],
      ru: ["Целительство", "Интуиция", "Защита", "Гармонизация ситуации"],
      es: ["Sanación", "Intuición", "Protección", "Equilibrio de situaciones"],
    },
    exercises: {
      en: ["Work with a willing partner and keep notes on sensations and comfort.", "Try small intuition games without treating guesses as proof.", "Notice when your sense of personal boundaries changes in daily contact.", "Write down one real-life situation, sketch a possible resolution and reflect on it."],
      ru: ["Практикуйте в паре по взаимному согласию, записывая ощущения и комфорт.", "Проводите простые игры на интуицию, не считая догадки доказательством особых способностей.", "Отмечайте изменения ощущения личных границ при общении.", "Опишите одну жизненную ситуацию, нарисуйте желаемый выход и понаблюдайте за собой."],
      es: ["Practica con una persona que haya dado su consentimiento y registra las sensaciones.", "Prueba juegos sencillos de intuición sin tomar los aciertos como pruebas.", "Observa tus límites personales en la vida diaria.", "Describe una situación y dibuja una posible solución."],
    },
  },
  {
    title: { en: "Space, objects, resources and connections", ru: "Пространство, предметы, ресурсы и связи", es: "Espacio, objetos, recursos y vínculos" },
    description: {
      en: "The second level works with traditional symbolic cleansing, charged objects, financial intention and unwanted ties. The practical focus is noticing the surrounding environment and making concrete plans.",
      ru: "Вторая ступень посвящена символическому очищению, настройке предметов, теме денег и нежелательных связей. Практическая задача — внимательнее воспринимать пространство и переводить намерения в конкретные действия.",
      es: "La segunda etapa aborda limpieza simbólica, objetos, relación con el dinero y vínculos no deseados, junto con planes concretos.",
    },
    topics: {
      en: ["Object charging", "Money-flow intention", "Clearing people and spaces", "Releasing unhelpful ties"],
      ru: ["Зарядка предметов", "Работа с денежным потоком", "Очищение человека и пространства", "Освобождение от ненужных связей"],
      es: ["Carga de objetos", "Intención financiera", "Limpieza simbólica", "Liberación de vínculos"],
    },
    exercises: {
      en: ["Choose an everyday object as a reminder of your intention.", "List possible sources of income and set realistic, measurable next actions.", "Tidy your room and notice how the space feels before and after.", "Reflect on one tiring relationship or memory and choose a healthy boundary."],
      ru: ["Выберите повседневный предмет как напоминание о своём намерении.", "Запишите источники дохода и реальные измеримые шаги к финансовой цели.", "Приведите в порядок комнату и отметьте ощущения до и после.", "Осмыслите одну изматывающую связь или память и сформулируйте здоровую границу."],
      es: ["Elige un objeto cotidiano como recordatorio de una intención.", "Enumera ingresos posibles y próximos pasos realistas.", "Ordena un espacio y registra cómo te sientes.", "Reflexiona sobre un vínculo difícil y formula un límite saludable."],
    },
  },
  {
    title: { en: "Life direction, emotions and social presence", ru: "Предназначение, эмоции и социальная проявленность", es: "Dirección vital, emociones y presencia social" },
    description: {
      en: "Eight historical attunement themes explore purpose, emotional response, action, personal influence, sexuality, guided imagery, thinking and recurring patterns. They are used here as material for self-inquiry, not promised outcomes.",
      ru: "Восемь традиционных тем раскрывают предназначение, эмоциональные реакции, действие, силу влияния, сексуальность, образный «полёт», мышление и повторяющиеся сценарии. Здесь это направления самоисследования, а не обещания результата.",
      es: "Ocho temas tradicionales exploran propósito, emociones, acción, influencia, sexualidad, imaginación, intelecto y patrones repetidos.",
    },
    topics: {
      en: ["Purpose", "Emotion", "Activation", "Power", "Sexuality", "Flight", "Intellect", "Karma"],
      ru: ["Предназначение", "Эмоции", "Активация", "Сила", "Сексуальность", "Полёт", "Интеллект", "Карма"],
      es: ["Propósito", "Emoción", "Activación", "Poder", "Sexualidad", "Vuelo", "Intelecto", "Karma"],
    },
    exercises: {
      en: ["Describe your ideal future and shortlist three personally meaningful directions.", "Record emotional triggers and observe your response without forcing a change.", "Make a weekly action plan and practise expressing a clear request.", "Use guided imagery as imagination; note how it affects confidence, attention and relationships."],
      ru: ["Опишите желаемое будущее и выберите три действительно близких направления.", "Составьте список эмоциональных триггеров и наблюдайте свою реакцию без принуждения.", "Сделайте план на неделю и потренируйтесь ясно выражать просьбу.", "Используйте образный «полёт» как медитацию воображения, исследуя уверенность, внимание и отношения."],
      es: ["Describe tu futuro deseado y tres direcciones importantes.", "Registra desencadenantes emocionales sin forzar resultados.", "Haz un plan semanal y practica peticiones claras.", "Utiliza el vuelo como visualización e investiga tus sensaciones."],
    },
  },
  {
    title: { en: "Symbolic vision, memory and knowledge", ru: "Образное видение, память и знание", es: "Visión simbólica, memoria y conocimiento" },
    description: {
      en: "The fourth level develops a personal vocabulary for intuitive impressions and images. Traditional references to clairvoyance or past lives are studied as esoteric ideas and guided-imagery themes, not reliable diagnoses or factual memories.",
      ru: "Четвёртая ступень помогает выработать собственный язык наблюдения за образами и впечатлениями. Ясновидение и прошлые жизни рассматриваются как эзотерические понятия и сюжеты образной практики, а не способ диагностики или доказанная память.",
      es: "La cuarta etapa desarrolla la observación de imágenes e impresiones. Clarividencia y vidas pasadas son temas esotéricos, no diagnósticos ni recuerdos comprobados.",
    },
    topics: {
      en: ["Vision", "Past-life imagery", "Creating a situation", "Knowledge"],
      ru: ["Видение", "Образы прошлых жизней", "Создание ситуации", "Знание"],
      es: ["Visión", "Imágenes de otras vidas", "Crear una situación", "Conocimiento"],
    },
    exercises: {
      en: ["Build a journal of personal sensory markers, comparing your impressions over time.", "Explore historical or archetypal images without treating them as literal biography.", "Write a possible event for the next fortnight and identify a real step toward it.", "Choose one open question, identify credible sources and compare what you learn."],
      ru: ["Создайте дневник индивидуальных чувственных маркеров и сравнивайте впечатления.", "Исследуйте исторические и архетипические образы, не принимая их за буквальную биографию.", "Опишите достижимую за две недели ситуацию и первый реальный шаг к ней.", "Выберите вопрос, найдите надёжные источники и сопоставьте полученные знания."],
      es: ["Crea un diario de señales sensoriales.", "Explora imágenes arquetípicas sin tratarlas como biografía literal.", "Planifica una situación alcanzable en dos semanas.", "Investiga una pregunta y compara fuentes fiables."],
    },
  },
  {
    title: { en: "World Tree and Northern archetypes", ru: "Мировое Древо и северные архетипы", es: "Árbol del Mundo y arquetipos nórdicos" },
    description: {
      en: "The final Basic Course stage connects personal practice to the Norse picture of Yggdrasil and the gods as symbolic qualities. Older texts also mention additional master settings; the current course remains the authority for the exact attunement list.",
      ru: "Завершение Базового курса связывает индивидуальную практику с образом Иггдрасиля и архетипами скандинавских богов. В старых текстах встречаются дополнительные мастерские настройки; точный состав актуального курса определяется нынешней программой.",
      es: "La etapa final une la práctica personal con Yggdrasil y las deidades nórdicas como cualidades simbólicas. El currículo actual determina las sintonizaciones.",
    },
    topics: {
      en: ["Connection with the World", "Connection with the Gods"],
      ru: ["Связь с Миром", "Связь с Богами"],
      es: ["Conexión con el Mundo", "Conexión con los Dioses"],
    },
    exercises: {
      en: ["Draw the World Tree and note which branches represent your present resources.", "Choose a Norse mythological figure and reflect on its qualities as an archetype.", "Review your learning journal and identify what you want to study next."],
      ru: ["Нарисуйте Мировое Древо и отметьте ветви, символизирующие ваши ресурсы.", "Выберите персонажа северной мифологии и исследуйте его качества как архетип.", "Пересмотрите дневник практики и определите направление дальнейшего обучения."],
      es: ["Dibuja el Árbol del Mundo y tus recursos.", "Reflexiona sobre una figura de la mitología nórdica como arquetipo.", "Revisa tu diario y elige el siguiente paso."],
    },
  },
];

const instructorTracks: Array<{ title: Localized; description: Localized; themes: LocalizedItems }> = [
  {
    title: { en: "Healing", ru: "Целительство", es: "Sanación" },
    description: { en: "A traditional map of wholeness through chakras, five-element philosophy, meridians and hypnotic imagery.", ru: "Традиционная карта целостности: чакры, У-Син, меридианы и образы гипнотической работы.", es: "Mapa simbólico de chakras, cinco elementos, meridianos e imágenes hipnóticas." },
    themes: { en: ["Chakras", "U-Sin", "Meridians", "Hypnosis"], ru: ["Чакры", "У-Син", "Меридианы", "Гипноз"], es: ["Chakras", "Wu Xing", "Meridianos", "Hipnosis"] },
  },
  {
    title: { en: "Golden Calf", ru: "Золотой Телец", es: "Becerro de Oro" },
    description: { en: "Exploring wealth-related beliefs, social position and a more conscious relationship with work and resources.", ru: "Исследование убеждений о достатке, социального положения и осознанного отношения к работе и ресурсам.", es: "Exploración de creencias sobre prosperidad, posición social y recursos." },
    themes: { en: ["Golden Calf", "Money and chakras", "VIP"], ru: ["Золотой Телец", "Деньги и чакры", "VIP"], es: ["Becerro de Oro", "Dinero y chakras", "VIP"] },
  },
  {
    title: { en: "Man & Woman", ru: "Мужчина и женщина", es: "Hombre y mujer" },
    description: { en: "Relationship patterns, masculine and feminine imagery, attraction and the language of consent and connection.", ru: "Сценарии отношений, мужские и женские образы, притяжение, согласие и качество контакта.", es: "Patrones de relación, arquetipos, atracción, consentimiento y conexión." },
    themes: { en: ["Relationship imagery", "Tantric flow"], ru: ["Образы отношений", "Тантрический поток"], es: ["Imágenes de relación", "Flujo tántrico"] },
  },
  {
    title: { en: "Life Force", ru: "Сила жизни", es: "Fuerza vital" },
    description: { en: "A symbolic practice with nature, seasonal rhythms, bodily vitality and regeneration themes.", ru: "Символические практики с силами природы, сезонными ритмами, телесной жизненностью и темой обновления.", es: "Práctica simbólica con naturaleza, ritmos estacionales y vitalidad." },
    themes: { en: ["Nature", "Vitality", "Seasonal cycles"], ru: ["Природа", "Жизненность", "Сезонные циклы"], es: ["Naturaleza", "Vitalidad", "Ciclos"] },
  },
  {
    title: { en: "Fireball", ru: "Огненный шар", es: "Bola de fuego" },
    description: { en: "Focused attention, visualisation and the traditional language of directing energetic intention.", ru: "Концентрация внимания, визуализация и традиционный язык направления энергетического намерения.", es: "Atención enfocada, visualización e intención energética simbólica." },
    themes: { en: ["Attention", "Visualisation"], ru: ["Внимание", "Визуализация"], es: ["Atención", "Visualización"] },
  },
  {
    title: { en: "Sexual Energy", ru: "Сексуальная энергия", es: "Energía sexual" },
    description: { en: "Exploring aliveness, pleasure, boundaries and embodied awareness within a consent-based learning setting.", ru: "Исследование живости, удовольствия, границ и телесной осознанности в безопасном формате с согласием участников.", es: "Exploración de vitalidad, placer, límites y conciencia corporal con consentimiento." },
    themes: { en: ["Body awareness", "Boundaries", "Vitality"], ru: ["Телесная осознанность", "Границы", "Жизненность"], es: ["Conciencia corporal", "Límites", "Vitalidad"] },
  },
];

const resources: Array<{ url: string; name: Localized; category: "overview" | "level" | "practice" | "faq" | "community" | "teacher" }> = [
  { url: base + "/books/reiki/runic-reiki-yggdrasil-brief-description.html", name: { en: "Master course overview", ru: "Обзор мастерского курса", es: "Resumen del curso" }, category: "overview" },
  { url: levelPath + "gift-runic-reiki-level-1-free-initiation.html", name: { en: "Five-level introductory map", ru: "Карта пяти ступеней", es: "Mapa de cinco niveles" }, category: "overview" },
  { url: levelPath + "what-is-runic-reiki-detailed-overview.html", name: { en: "Detailed system history and philosophy", ru: "История и философия системы", es: "Historia y filosofía" }, category: "overview" },
  ...levelSources.map((url, index) => ({ url, name: { en: "Historical level " + (index + 1), ru: "Историческое описание ступени " + (index + 1), es: "Nivel histórico " + (index + 1) }, category: "level" as const })),
  { url: levelPath + "runic-reiki-practice.html", name: { en: "Practical exercises for levels 1–4", ru: "Практикум для ступеней 1–4", es: "Ejercicios de niveles 1–4" }, category: "practice" },
  { url: levelPath + "questions-to-get-the-free-class-of-runic-reiki.html", name: { en: "Reading list and self-study checklist", ru: "Материалы для чтения и вопросы", es: "Lecturas y preguntas" }, category: "practice" },
  { url: freePath + "faq-how-to-study-runic-reiki-yggdrasil.html", name: { en: "Learning and initiation FAQ", ru: "FAQ об обучении и инициации", es: "Preguntas sobre formación" }, category: "faq" },
  { url: freePath + "step-0-how-to-get-runic-reiki-initiation-free.html", name: { en: "Historical free Level 1 offer", ru: "Исторические условия бесплатной 1-й ступени", es: "Oferta histórica del nivel gratuito" }, category: "faq" },
  { url: base + "/reiki/reiki-yggdrasil-levels-description.html", name: { en: "Instructor course: six areas", ru: "Инструкторский курс: шесть направлений", es: "Instructor: seis áreas" }, category: "teacher" },
  { url: freePath + "testimonials-1.html", name: { en: "Original student reports · volume 1", ru: "Исходные отзывы учеников · часть 1", es: "Testimonios · parte 1" }, category: "community" },
  { url: freePath + "testimonials-2.html", name: { en: "Original student reports · volume 2", ru: "Исходные отзывы учеников · часть 2", es: "Testimonios · parte 2" }, category: "community" },
];

const copy: Record<PublicLocale, {
  eyebrow: string; heading: string; intro: string; levelsHeading: string; historicalLabel: string;
  practiceLabel: string; instructorHeading: string; instructorIntro: string; faqHeading: string;
  faqs: Array<{ q: string; a: string }>; sourcesHeading: string; sourcesIntro: string;
  openOriginal: string; readCurrent: string; start: string; disclaimer: string; show: string;
}> = {
  en: {
    eyebrow: "Original school materials · Source-backed study", heading: "Explore Reiki Yggdrasil in greater depth",
    intro: "The historical SuperSkills programme expands the five Basic Course levels with practical exercises and an Instructor path. We have adapted those themes for clear study alongside the current seven-module curriculum.",
    levelsHeading: "The five Basic Course levels · topics and homework", historicalLabel: "Historical themes", practiceLabel: "Exercises and self-observation",
    instructorHeading: "Instructor path · six applied areas", instructorIntro: "An advanced historical course expands beyond the five basic levels. The current Instructor Course page remains the source of the official step and attunement list.",
    faqHeading: "How learning and initiation work",
    faqs: [
      { q: "Do I need previous Reiki experience?", a: "The historical FAQ describes an entry route for newcomers. Experience in Usui Reiki is not presented as a prerequisite." },
      { q: "Is initiation independent or teacher-guided?", a: "The source describes an instructor-led process with practice materials, questions and opportunities to study individually or in a group, remotely or in person." },
      { q: "How fast do the levels progress?", a: "Older materials mention weekly study intervals. Current timing, availability and any qualification should be confirmed with the teacher rather than assumed from an old page." },
      { q: "Where can I begin?", a: "Read the introduction and the first-level exercises, then use the current free Level 1 contact option on this site to ask about an introductory initiation." },
    ],
    sourcesHeading: "Original SuperSkills reading library", sourcesIntro: "Open full historical articles, exercises and student reports on the source website. Reports are personal accounts, not evidence of guaranteed results.",
    openOriginal: "Read original", readCurrent: "Open current course", start: "Ask about free Level 1", disclaimer: "These are adapted summaries of historical spiritual and esoteric teachings. Practices are optional reflection and education, not clinical diagnoses, medical treatment, proof of paranormal effects or a promise of financial or personal outcomes.", show: "Read the stage and exercises",
  },
  ru: {
    eyebrow: "Авторские источники · Углублённая программа", heading: "Рейки Иггдрасиль: больше описаний и практики",
    intro: "На SuperSkills сохранились подробности пяти ступеней Базового курса, упражнения и отдельная программа инструктора. Здесь они адаптированы и упорядочены в дополнение к актуальной системе из семи модулей.",
    levelsHeading: "Пять базовых ступеней · темы и задания", historicalLabel: "Темы исторической программы", practiceLabel: "Упражнения и самонаблюдение",
    instructorHeading: "Курс инструктора · шесть направлений", instructorIntro: "Инструкторская подготовка продолжает пять базовых ступеней. Точный список действующих настроек и уроков приведён в актуальном Инструкторском курсе.",
    faqHeading: "Как проходит обучение и инициация",
    faqs: [
      { q: "Нужен ли опыт традиционного Рейки?", a: "В историческом FAQ есть путь для начинающих: предварительная инициация Усуи не названа обязательным условием." },
      { q: "Можно ли инициироваться самостоятельно?", a: "Источник описывает передачу от преподавателя, учебные материалы, вопросы и практику. Упомянуты индивидуальный и групповой, очный и дистанционный форматы." },
      { q: "Сколько ждать между ступенями?", a: "В старых материалах указан примерно недельный ритм, но актуальные сроки, наличие занятий и квалификацию следует уточнять у преподавателя." },
      { q: "Как начать бесплатно?", a: "Познакомьтесь с описанием и заданиями первой ступени, затем используйте действующую форму запроса бесплатной первой инициации на нашем сайте." },
    ],
    sourcesHeading: "Оригинальная библиотека SuperSkills", sourcesIntro: "Здесь собраны ссылки на полные исходные статьи, практикум и отзывы. Отзывы передают личный опыт учеников, но не подтверждают гарантированных эффектов.",
    openOriginal: "Читать оригинал", readCurrent: "Открыть действующий курс", start: "Запросить бесплатную 1-ю ступень", disclaimer: "Это адаптированный обзор исторической духовно-эзотерической программы. Практики предназначены для самонаблюдения и обучения, не заменяют медицинскую помощь, не служат диагностикой и не гарантируют паранормальных, финансовых или иных результатов.", show: "Описание ступени и упражнения",
  },
  es: {
    eyebrow: "Fuentes originales · Estudio ampliado", heading: "Explora Reiki Yggdrasil en profundidad",
    intro: "SuperSkills conserva los cinco niveles básicos, ejercicios y un curso de Instructor. Adaptamos estos temas al currículo actual de siete módulos.",
    levelsHeading: "Cinco niveles · temas y práctica", historicalLabel: "Temas históricos", practiceLabel: "Ejercicios de reflexión",
    instructorHeading: "Curso de Instructor · seis áreas", instructorIntro: "Una vía histórica posterior al Curso Básico. El currículo actual define los pasos oficiales.",
    faqHeading: "Aprendizaje e iniciación",
    faqs: [
      { q: "¿Necesito conocer Reiki Usui?", a: "La documentación histórica ofrece una introducción para principiantes." },
      { q: "¿La iniciación es autodidacta?", a: "El material describe un proceso guiado por un instructor, individual o en grupo." },
      { q: "¿Cuánto tarda?", a: "Los tiempos antiguos son orientativos; confirma el calendario actual con el profesor." },
      { q: "¿Cómo comenzar?", a: "Lee el primer nivel y solicita información sobre la iniciación introductoria gratuita." },
    ],
    sourcesHeading: "Biblioteca original SuperSkills", sourcesIntro: "Artículos y testimonios históricos. Los relatos personales no demuestran resultados garantizados.",
    openOriginal: "Leer fuente", readCurrent: "Abrir curso actual", start: "Preguntar por el nivel gratuito", disclaimer: "Contenido histórico y esotérico para educación y reflexión, no consejo médico ni promesa de resultados.", show: "Abrir nivel y ejercicios",
  },
};

export function YggdrasilSourceStudyGuide({ locale, mode = "overview" }: { locale: PublicLocale; mode?: GuideMode }) {
  const text = copy[locale];
  const root = "/" + locale + "/academy/reiki/yggdrasil";
  const showLevels = mode !== "instructor";
  const showInstructor = mode !== "basic";
  const visibleResources = resources.filter((item) =>
    mode === "overview" ||
    (mode === "basic" && item.category !== "teacher" && item.category !== "community") ||
    (mode === "instructor" && (item.category === "teacher" || item.category === "overview" || item.category === "faq"))
  );
  return (
    <section className={styles.root} id={mode === "overview" ? "source-study-guide" : "historical-study-materials"} aria-label={text.heading}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h2>{text.heading}</h2>
        <p>{text.intro}</p>
        <div className={styles.actions}>
          <Link href={root + "/basic-course"}>{text.readCurrent} <span aria-hidden="true">→</span></Link>
          <Link href={root + "#reiki-free-level-one"}>{text.start} <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      {showLevels ? (
        <div className={styles.chapter} aria-labelledby="superskills-basic-levels">
          <h3 id="superskills-basic-levels">{text.levelsHeading}</h3>
          <div className={styles.levels}>
            {levels.map((level, index) => (
              <details className={styles.level} key={index}>
                <summary>
                  <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{level.title[locale]}</strong><small>{text.show}</small></span>
                  <span className={styles.chevron} aria-hidden="true">⌄</span>
                </summary>
                <div className={styles.levelBody}>
                  <p>{level.description[locale]}</p>
                  <h4>{text.historicalLabel}</h4>
                  <ul className={styles.tags}>{level.topics[locale].map((topic) => <li key={topic}>{topic}</li>)}</ul>
                  <h4>{text.practiceLabel}</h4>
                  <ol>{level.exercises[locale].map((exercise) => <li key={exercise}>{exercise}</li>)}</ol>
                  <a href={levelSources[index]} target="_blank" rel="noopener noreferrer">{text.openOriginal} ↗</a>
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {showInstructor ? (
        <div className={styles.chapter} aria-labelledby="superskills-instructor">
          <h3 id="superskills-instructor">{text.instructorHeading}</h3>
          <p className={styles.chapterLead}>{text.instructorIntro}</p>
          <div className={styles.tracks}>
            {instructorTracks.map((track, index) => (
              <article className={styles.track} key={index}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <h4>{track.title[locale]}</h4>
                <p>{track.description[locale]}</p>
                <ul>{track.themes[locale].map((theme) => <li key={theme}>{theme}</li>)}</ul>
              </article>
            ))}
          </div>
          <Link className={styles.inlineLink} href={root + "/instructor-course"}>{text.readCurrent} →</Link>
        </div>
      ) : null}

      <div className={styles.chapter} aria-labelledby="superskills-faq">
        <h3 id="superskills-faq">{text.faqHeading}</h3>
        <div className={styles.questions}>
          {text.faqs.map((faq) => (
            <details key={faq.q}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className={styles.chapter} aria-labelledby="superskills-originals">
        <h3 id="superskills-originals">{text.sourcesHeading}</h3>
        <p className={styles.chapterLead}>{text.sourcesIntro}</p>
        <div className={styles.sourceLinks}>
          {visibleResources.map((item) => (
            <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
              <span>{item.name[locale]}</span><span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </div>
      <p className={styles.notice}>{text.disclaimer}</p>
    </section>
  );
}
