import Image from "next/image";
import Link from "next/link";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import type { PublicLocale } from "@/lib/public-locales";
import fullManual from "@/data/academy/yggdrasil-basic-manual-original.ru.json";
import englishManual from "@/data/academy/yggdrasil-basic-manual.en.json";

type LevelCopy = {
  title: string;
  description: string;
  focus: string;
  settings: string[];
};
type DescriptionCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  basisTitle: string;
  basis: string[];
  courseTitle: string;
  courseLead: string;
  levelLabel: string;
  settingsLabel: string;
  levels: LevelCopy[];
  formatTitle: string;
  format: string[];
  nextTitle: string;
  next: string;
  openCourse: string;
  overview: string;
  sourceNote: string;
  safetyNote: string;
};

const copy: Record<PublicLocale, DescriptionCopy> = {
  ru: {
    eyebrow: "Академия · Рейки Иггдрасиль",
    title: "Базовый курс Рейки Иггдрасиль",
    lead: "Пять ступеней знакомства с системой: от основ энергетической работы, интуиции и защиты — к работе с отношениями, личной силой, символическим восприятием и мастерской интеграции.",
    basisTitle: "Что такое Рейки Иггдрасиль",
    basis: [
      "В традиции Рейки слово «Рэй» связывают с универсальным началом, а «Ки» — с жизненной энергией. Рейки Иггдрасиль соединяет эту идею с образами мирового Древа Иггдрасиль и скандинавских рун. В мифологии Древо связывает девять миров; в системе оно служит символом внутренней оси, связи разных уровней опыта и личного развития.",
      "Автором направления Рейки Иггдрасиль считается Николай Журавлёв. Система предполагает последовательное освоение специальных «настроек» — отдельных аспектов практики. Настройки передаются от мастера ученику в процессе посвящения, а затем изучаются через личную и парную практику.",
    ],
    courseTitle: "Пять ступеней базового курса",
    courseLead: "Каждая ступень добавляет новые настройки к уже освоенным. Ниже — именно описание содержания обучения, а не учебная инструкция по выполнению настроек.",
    levelLabel: "Ступень",
    settingsLabel: "Настройки ступени",
    levels: [
      {
        title: "Основы: целительство, интуиция и защита",
        description: "Первая ступень знакомит с общим Потоком Рейки Иггдрасиль. В центре — целостное внимание к состоянию человека, развитие интуитивного восприятия, личная защита и работа с конкретными жизненными задачами. Это фундамент, на котором строится дальнейшее обучение.",
        focus: "Контакт с собой, наблюдение за состоянием, интуитивный выбор и личные границы.",
        settings: ["Лечение", "Интуиция", "Защита", "Работа с ситуацией"],
      },
      {
        title: "Очищение, предметы, деньги и связи",
        description: "Вторая ступень переводит практику от индивидуального состояния к предметам, пространству и взаимодействию с людьми. Изучаются символические практики очищения, зарядки предметов, работы с темой материального ресурса и освобождения от тягостных эмоциональных связей.",
        focus: "Отношения с окружением, пространством, материальными целями и прошлым опытом.",
        settings: ["Зарядка предмета", "Активизация денежного потока", "Очистка людей и помещения", "Разрушение связи"],
      },
      {
        title: "Предназначение, сила и внутренние качества",
        description: "Третья ступень посвящена самореализации: поиску своего пути, отношениям с эмоциями, внутренней активности, лидерству и сексуальности. В неё также входят работа с интеллектом, кармическими представлениями и «Полёт» — практика образного перемещения сознания в пространстве и времени в рамках эзотерической традиции.",
        focus: "Собственное направление, личная сила, эмоциональная жизнь, отношения и способы восприятия.",
        settings: ["Предназначение", "Эмоция", "Активизация", "Власть", "Сексуальность", "Полёт", "Интеллект", "Карма"],
      },
      {
        title: "Видение, прошлые жизни и знание",
        description: "Четвёртая ступень обращается к символическому и экстрасенсорному восприятию. В исторической программе её связывают с образом «третьего глаза», представлениями о прошлых воплощениях, формированием желаемых ситуаций и поиском знаний через внутреннее сосредоточение.",
        focus: "Образы, смысловые связи, исследование субъективного опыта и работа с намерением.",
        settings: ["Видение", "Прошлые жизни", "Создать ситуацию", "Знание"],
      },
      {
        title: "Связь с Миром и Богами · мастерская ступень",
        description: "Пятая ступень завершает базовый цикл. Она посвящена переживанию связи с более широким миром, образу Гения Земли и обращению к скандинавским божествам как носителям определённых архетипических качеств. В традиции школы после освоения всех пяти ступеней присваивается степень Мастера Рейки Иггдрасиль.",
        focus: "Интеграция практик, расширение символической картины мира и ответственность за собственную работу.",
        settings: ["Связь с миром", "Связь с Богами"],
      },
    ],
    formatTitle: "Как проходит обучение",
    format: [
      "Базовая программа состоит из пяти последовательных посвящений и практического освоения настроек. Согласно методичке, посвящение проводит мастер; дальнейшая работа включает личную практику, упражнения с партнёром и наблюдение за собственным опытом.",
      "Ступени связаны между собой: новые настройки дополняют предыдущие. В учебной части сайта отдельно представлены подробные описания каждой настройки и соответствующие видео, когда они доступны.",
    ],
    nextTitle: "После базового курса",
    next: "Следующий этап в актуальной структуре школы — Инструкторский курс. К нему можно переходить после знакомства с базовой программой и её пятью ступенями.",
    openCourse: "Перейти к ступеням, настройкам и видео",
    overview: "Ко всей программе Рейки Иггдрасиль",
    sourceNote: "Основано на русскоязычной методичке «Рейки-Иггдрасиль. Базовый курс. I–V ступени» и материалах Академии. Описание адаптировано для публичного ознакомления; полный русский оригинал книги воспроизведён на этой странице без сокращений.",
    safetyNote: "Энергетические, эзотерические и целительские концепции описываются как содержание традиции. Они не являются доказанными медицинскими методами, не гарантируют результата и не заменяют медицинскую помощь.",
  },
  en: {
    eyebrow: "Academy · Reiki Yggdrasil",
    title: "Reiki Yggdrasil Basic Course",
    lead: "Five progressive levels: from the foundations of energy work, intuition and protection to relationships, personal power, symbolic perception and Master-level integration.",
    basisTitle: "What is Reiki Yggdrasil?",
    basis: [
      "In Reiki tradition, “Rei” is associated with a universal principle and “Ki” with life energy. Reiki Yggdrasil brings this idea together with the World Tree of Norse mythology and the symbolism of the runes. The mythical tree connects nine worlds; in this system it represents an inner axis linking different dimensions of experience and development.",
      "Reiki Yggdrasil is attributed to Nikolai Zhuravlev. The course is built around progressive “attunements”: named aspects of the practice. According to the school's tradition, a Master transmits the attunements through initiation, after which students explore them through individual and partner practice.",
    ],
    courseTitle: "The five levels of the Basic Course",
    courseLead: "Each level builds on those before it. This page introduces the actual curriculum, rather than giving step-by-step instructions for performing attunements.",
    levelLabel: "Level",
    settingsLabel: "Attunements",
    levels: [
      {
        title: "Foundations: healing, intuition and protection",
        description: "The first level introduces the general Reiki Yggdrasil Flow. Its themes are holistic attention to a person's state, intuitive perception, personal protection and approaching specific life situations. It provides the foundation for further study.",
        focus: "Self-awareness, observing one's state, intuitive choices and personal boundaries.",
        settings: ["Healing", "Intuition", "Protection", "Working with a Situation"],
      },
      {
        title: "Cleansing, objects, money and connections",
        description: "The second level moves from the individual to objects, spaces and interactions with others. It explores symbolic cleansing practices, charging objects, one's relationship with material resources and releasing burdensome emotional connections.",
        focus: "Relationships with surroundings, space, financial intentions and past experiences.",
        settings: ["Charging an Object", "Activating the Money Flow", "Cleansing People and Spaces", "Breaking Connections"],
      },
      {
        title: "Purpose, power and inner qualities",
        description: "The third level centres on self-realisation: one's direction in life, emotions, personal activation, leadership and sexuality. It also covers intellect, the esoteric concept of karma and “Flight”, described in the tradition as imaginative movement of consciousness across time and space.",
        focus: "Personal direction, inner strength, emotional life, relationships and modes of perception.",
        settings: ["Life Purpose", "Emotion", "Activation", "Power", "Sexuality", "Flight", "Intellect", "Karma"],
      },
      {
        title: "Vision, past lives and knowledge",
        description: "The fourth level explores symbolic and extrasensory perception. The historical course associates it with the “third eye”, ideas about past lives, creating desired situations and seeking knowledge through focused inner attention.",
        focus: "Imagery, meaning-making, exploration of subjective experience and intention.",
        settings: ["Vision", "Past Lives", "Creating a Situation", "Knowledge"],
      },
      {
        title: "Connection with the World and the Gods · Master Level",
        description: "The fifth level completes the Basic Course. It explores connection with the wider world, the symbolic Genius of the Earth and the Norse deities as embodiments of archetypal qualities. Under the school's traditional curriculum, completing all five levels leads to the title of Reiki Yggdrasil Master.",
        focus: "Integration, an expanded symbolic worldview and responsibility in personal practice.",
        settings: ["Connection with the World", "Connection with the Gods"],
      },
    ],
    formatTitle: "How the course is taught",
    format: [
      "The Basic Course consists of five successive initiations and practice with the attunements. The original manual describes initiation by a Master, followed by individual exercises, partner work and observing one's experience.",
      "Each level adds to the previous ones. The learning area of the website provides detailed descriptions of the attunements and corresponding videos where available.",
    ],
    nextTitle: "After the Basic Course",
    next: "The next stage in the school's current seven-module structure is the Instructor Course, which follows the five foundation levels.",
    openCourse: "Explore all levels, attunements and videos",
    overview: "View the complete Reiki Yggdrasil program",
    sourceNote: "Based on the Russian manual “Reiki Yggdrasil: Basic Course, Levels I–V” and Academy materials. The complete English translation of the 38-page source manual is reproduced above, with every original paragraph preserved in its source-page order.",
    safetyNote: "Energy, esoteric and healing ideas are described as part of the tradition. They are not established medical treatments, do not guarantee outcomes and do not replace professional medical care.",
  },
  es: {
    eyebrow: "Academia · Reiki Yggdrasil",
    title: "Curso Básico de Reiki Yggdrasil",
    lead: "Cinco niveles progresivos: desde los fundamentos del trabajo energético, la intuición y la protección hasta las relaciones, la fuerza personal, la percepción simbólica y la integración de maestría.",
    basisTitle: "¿Qué es Reiki Yggdrasil?",
    basis: [
      "En la tradición del Reiki, «Rei» se asocia con un principio universal y «Ki» con la energía vital. Reiki Yggdrasil reúne esta idea con el Árbol del Mundo de la mitología nórdica y el simbolismo de las runas. El árbol mítico conecta nueve mundos; en este sistema representa un eje interior que une distintas dimensiones de la experiencia y del desarrollo.",
      "La creación de Reiki Yggdrasil se atribuye a Nikolái Zhuravliov. El curso se organiza en «sintonizaciones» progresivas: aspectos concretos de la práctica. Según la tradición de la escuela, un Maestro transmite estas sintonizaciones mediante la iniciación; después, los alumnos las exploran individualmente y en pareja.",
    ],
    courseTitle: "Los cinco niveles del Curso Básico",
    courseLead: "Cada nivel amplía los anteriores. Esta página presenta el contenido real del programa, no instrucciones detalladas para realizar las sintonizaciones.",
    levelLabel: "Nivel",
    settingsLabel: "Sintonizaciones",
    levels: [
      {
        title: "Fundamentos: sanación, intuición y protección",
        description: "El primer nivel introduce el Flujo general de Reiki Yggdrasil. Sus temas son la atención integral al estado de la persona, la percepción intuitiva, la protección personal y el trabajo con situaciones concretas de la vida. Es la base de los estudios posteriores.",
        focus: "Conciencia de uno mismo, observación del estado personal, decisiones intuitivas y límites.",
        settings: ["Sanación", "Intuición", "Protección", "Trabajo con una Situación"],
      },
      {
        title: "Limpieza, objetos, dinero y vínculos",
        description: "El segundo nivel amplía la práctica hacia objetos, espacios e interacciones humanas. Se estudian la limpieza simbólica, la carga de objetos, la relación con los recursos materiales y la liberación de vínculos emocionales difíciles.",
        focus: "Relaciones con el entorno, el espacio, las metas económicas y las experiencias pasadas.",
        settings: ["Carga de Objetos", "Activación del Flujo del Dinero", "Limpieza de Personas y Espacios", "Ruptura de Vínculos"],
      },
      {
        title: "Propósito, poder y cualidades interiores",
        description: "El tercer nivel se centra en la realización personal: el rumbo vital, las emociones, la activación personal, el liderazgo y la sexualidad. Incluye también el intelecto, el concepto esotérico del karma y el «Vuelo», descrito en la tradición como un desplazamiento imaginativo de la conciencia por el tiempo y el espacio.",
        focus: "Dirección personal, fuerza interior, vida emocional, relaciones y formas de percepción.",
        settings: ["Propósito", "Emoción", "Activación", "Poder", "Sexualidad", "Vuelo", "Intelecto", "Karma"],
      },
      {
        title: "Visión, vidas pasadas y conocimiento",
        description: "El cuarto nivel explora la percepción simbólica y extrasensorial. El programa histórico lo relaciona con el «tercer ojo», las ideas sobre vidas pasadas, la creación de situaciones deseadas y la búsqueda de conocimiento mediante la atención interior.",
        focus: "Imágenes, significados, exploración de la experiencia subjetiva e intención.",
        settings: ["Visión", "Vidas Pasadas", "Crear una Situación", "Conocimiento"],
      },
      {
        title: "Conexión con el Mundo y los Dioses · nivel de Maestro",
        description: "El quinto nivel completa el Curso Básico. Explora la conexión con el mundo, la imagen del Genio de la Tierra y las deidades nórdicas como portadoras de cualidades arquetípicas. Según el programa tradicional de la escuela, completar los cinco niveles conduce al título de Maestro de Reiki Yggdrasil.",
        focus: "Integración, visión simbólica del mundo y responsabilidad en la práctica personal.",
        settings: ["Conexión con el Mundo", "Conexión con los Dioses"],
      },
    ],
    formatTitle: "Cómo se desarrolla la formación",
    format: [
      "El Curso Básico comprende cinco iniciaciones sucesivas y la práctica de las sintonizaciones. El manual original describe la iniciación impartida por un Maestro, seguida de ejercicios individuales, trabajo en pareja y observación de la experiencia personal.",
      "Cada nivel complementa los anteriores. En la sección de aprendizaje del sitio encontrarás descripciones detalladas de las sintonizaciones y los videos correspondientes cuando estén disponibles.",
    ],
    nextTitle: "Después del Curso Básico",
    next: "La siguiente etapa en la estructura actual de siete módulos es el Curso de Instructor, que continúa después de los cinco niveles fundamentales.",
    openCourse: "Ver niveles, sintonizaciones y videos",
    overview: "Ver el programa completo de Reiki Yggdrasil",
    sourceNote: "Basado en el manual ruso «Reiki Yggdrasil: Curso Básico, niveles I–V» y en los materiales de la Academia. Este texto es una adaptación pública; el original ruso completo aparece más abajo; la traducción integral al español aún no está disponible.",
    safetyNote: "Las ideas energéticas, esotéricas y de sanación se presentan como parte de la tradición. No son tratamientos médicos demostrados, no garantizan resultados ni sustituyen la atención médica profesional.",
  },
};

const bookUi: Record<PublicLocale, { heading: string; lead: string; start: string; note: string; contents: string; synopsis: string; page: string }> = {
  ru: {
    heading: "Книга «Рейки-Иггдрасиль. Базовый курс. I–V ступени»",
    lead: "Полная электронная версия присланной авторской методички: введение, пять ступеней, все настройки, отработка практик и приложения о скандинавских богах.",
    start: "Читать книгу",
    note: "Полный оригинальный текст на русском языке. Сохранены 38 страниц источника, включая титульные листы; текст разделён на главы и абзацы для удобного чтения. Эзотерические и целительские утверждения воспроизводятся как текст исторического источника, а не доказанные медицинские рекомендации.",
    contents: "Содержание книги",
    synopsis: "Открыть краткое описание программы и ссылки на обучение",
    page: "Страница оригинала",
  },
  en: {
    heading: "Book: Reiki Yggdrasil — Basic Course, Levels I–V",
    lead: "Read the complete English translation of the training book, including all five levels, attunements, exercises and Norse mythology reference material.",
    start: "Read the complete book",
    note: "Complete English translation aligned with all 38 pages of the Russian original. Page references, exercises and appendices are preserved. Historical healing and esoteric claims are translated as statements of the source, not as proven medical guidance. This book does not replace professional medical care.",
    contents: "Table of contents",
    synopsis: "Open the English course overview and learning links",
    page: "Source page",
  },
  es: {
    heading: "Libro: Reiki Yggdrasil — Curso Básico, niveles I–V",
    lead: "El texto original completo, con cinco niveles, sintonizaciones, ejercicios y materiales sobre la mitología nórdica.",
    start: "Leer el libro completo",
    note: "El texto original íntegro está en ruso. El resumen en español está disponible más abajo; la traducción completa aún está pendiente. Las afirmaciones curativas de la fuente son históricas y no constituyen asesoramiento médico.",
    contents: "Índice del libro",
    synopsis: "Abrir el resumen del curso en español y los enlaces de formación",
    page: "Página original",
  },
};

const manualChapters = [
  { page: 3, title: "Введение · Что такое Рейки Иггдрасиль?" },
  { page: 5, title: "Пять ступеней · Обзор настроек" },
  { page: 8, title: "I ступень · Лечение, Интуиция, Защита, Ситуации" },
  { page: 14, title: "II ступень · Предметы, Деньги, Очищение, Связи" },
  { page: 19, title: "III ступень · Предназначение, Эмоция, Сила и другие" },
  { page: 28, title: "IV ступень · Видение, Прошлые жизни, Знание" },
  { page: 32, title: "V ступень · Мир, Боги и архетипические качества" },
  { page: 33, title: "Приложение · Скандинавский пантеон" },
  { page: 37, title: "Приложение · Описание богов, вариант 2" },
];

const manualChaptersEn = [
  { page: 3, title: "Introduction · What Is Reiki Yggdrasil?" },
  { page: 5, title: "Five Levels · Attunements at a Glance" },
  { page: 8, title: "Level I · Healing, Intuition, Protection and Situations" },
  { page: 14, title: "Level II · Objects, Money, Cleansing and Connections" },
  { page: 19, title: "Level III · Life Purpose, Emotions, Power and More" },
  { page: 28, title: "Level IV · Vision, Past Lives and Knowledge" },
  { page: 32, title: "Level V · The World, Gods and Archetypal Qualities" },
  { page: 33, title: "Appendix · The Norse Pantheon" },
  { page: 37, title: "Appendix · Description of the Gods, Version 2" },
];

function manualParagraphHeading(paragraph: string) {
  return /^(?:Введение|Настройка\s+[«“]|ОТРАБОТКА НАСТРОЕК|Ступени Рэйки|Первая ступень системы|Вторая ступень системы|Третья ступень системы|Четвёртая ступень системы|Пятая ступень системы|Высшие божества|ОПИСАНИЕ БОГОВ|Introduction|Attunement:|PRACTICING THE ATTUNEMENTS|The levels of Reiki Yggdrasil|First Level|Second Level|Third Level|Fourth Level|Fifth Level|Principal Deities|DESCRIPTION OF THE GODS)/i.test(paragraph);
}

export function YggdrasilBasicCourseDescription({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const book = bookUi[locale];
  const manualForLocale = locale === "en" ? englishManual : fullManual;
  const chapters = locale === "en" ? manualChaptersEn : manualChapters;
  const manualLanguage = locale === "en" ? "en" : "ru";
  const base = "/" + locale + "/academy/reiki/yggdrasil";
  return (
    <main className="academy-reading-shell academy-reading-shell--wide yggdrasil-description-page" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <AcademyBackLink locale={locale} />
      <div className="academy-course-layout">
        <YggdrasilSideNavigation locale={locale} activeSlug="basic-description" />
        <article className="academy-reading">
          <header className="yggdrasil-description-hero">
            <div>
              <p className="homeopathy-kicker">{text.eyebrow}</p>
              <h1>{book.heading}</h1>
              <p className="yggdrasil-description-lead">{book.lead}</p>
              <div className="yggdrasil-description-actions"><a className="yggdrasil-primary-action" href="#full-book">{book.start} ↓</a><Link className="yggdrasil-secondary-action" href={base + "/basic-course"}>{text.openCourse} →</Link><Link className="yggdrasil-secondary-action" href={base + "/basic-course#historical-study-materials"}>{locale === "ru" ? "Упражнения пяти ступеней" : locale === "es" ? "Ejercicios de los cinco niveles" : "Five-level practice guide"} →</Link></div>
            </div>
            <figure>
              <Image src="/academy/reiki-yggdrasil/source/basic-program.jpg" alt="" width={640} height={520} sizes="(max-width: 780px) 100vw, 38vw" priority />
            </figure>
          </header>

          <section className="yggdrasil-full-book" id="full-book" aria-label={book.heading}>
            <p className="yggdrasil-book-edition">{book.note}</p>
            <nav className="yggdrasil-book-toc" aria-label={book.contents}>
              <h2>{book.contents}</h2>
              <ol>{chapters.map((chapter) => (
                <li key={chapter.page}><a href={"#book-page-" + chapter.page}>{chapter.title}</a></li>
              ))}</ol>
            </nav>
            <div className="yggdrasil-book-pages" lang={manualLanguage}>
              {manualForLocale.pages.filter((sourcePage) => sourcePage.page >= 3).map((sourcePage) => (
                <section className="yggdrasil-book-page" id={"book-page-" + sourcePage.page} key={sourcePage.page}>
                  <div className="yggdrasil-book-page-counter">{book.page} {sourcePage.page} / {manualForLocale.originalPages}</div>
                  {chapters.find((chapter) => chapter.page === sourcePage.page) ? <h2>{chapters.find((chapter) => chapter.page === sourcePage.page)?.title}</h2> : null}
                  {sourcePage.paragraphs.map((paragraph, idx) => manualParagraphHeading(paragraph)
                    ? <p className="yggdrasil-book-standout" key={idx}>{paragraph}</p>
                    : <p key={idx}>{paragraph}</p>
                  )}
                </section>
              ))}
            </div>
          </section>

          <details className="yggdrasil-description-summary">
            <summary>{book.synopsis}</summary>
          <section className="yggdrasil-description-section">
            <h2>{text.basisTitle}</h2>
            {text.basis.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>

          <section className="yggdrasil-description-section" aria-labelledby="basic-five-levels">
            <h2 id="basic-five-levels">{text.courseTitle}</h2>
            <p>{text.courseLead}</p>
            <div className="yggdrasil-description-levels">
              {text.levels.map((level, index) => (
                <section className="yggdrasil-description-level" key={index} id={"basic-level-" + (index + 1)}>
                  <div className="yggdrasil-description-level-heading">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><small>{text.levelLabel} {index + 1}</small><h3>{level.title}</h3></div>
                  </div>
                  <p>{level.description}</p>
                  <p className="yggdrasil-description-focus">{level.focus}</p>
                  <h4>{text.settingsLabel}</h4>
                  <ul>{level.settings.map((name) => <li key={name}>{name}</li>)}</ul>
                </section>
              ))}
            </div>
          </section>

          <section className="yggdrasil-description-section">
            <h2>{text.formatTitle}</h2>
            {text.format.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>

          <section className="yggdrasil-description-section">
            <h2>{text.nextTitle}</h2>
            <p>{text.next}</p>
            <div className="yggdrasil-description-actions">
              <Link className="yggdrasil-primary-action" href={base + "/basic-course"}>{text.openCourse} →</Link>
              <Link className="yggdrasil-secondary-action" href={base}>{text.overview} →</Link>
            </div>
          </section>

          </details>

          <footer className="yggdrasil-description-source">
            <p>{text.sourceNote}</p>
            <p>{text.safetyNote}</p>
          </footer>
        </article>
      </div>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
