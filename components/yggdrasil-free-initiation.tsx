import Link from "next/link";
import Image from "next/image";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { formatReikiLevelPrice } from "@/lib/academy/reiki-level-pricing";
import { YggdrasilInitiationForm } from "@/components/yggdrasil-initiation-form";
import styles from "./yggdrasil-free-initiation.module.css";

type LocaleStrings = {
  eyebrow: string; title: string; lead: string;
  sourceNote: string; freeLabel: string;
  choiceTitle: string; choices: Array<{ title: string; description: string }>;
  stepsTitle: string; steps: string[];
  readingTitle: string; readingIntro: string;
  readingLinks: string[]; videoTitle: string; videoLead: string; checklistTitle: string; checklistIntro: string;
  questions: string[]; statement: string;
  afterTitle: string; after: string[];
  ctaTitle: string; ctaText: string; whatsapp: string; telegram: string;
  back: string;
};

const copy: Record<PublicLocale, LocaleStrings> = {
  en: {
    eyebrow: "A gift for new students · Basic Course / Level 1",
    title: "How to receive Reiki Yggdrasil Level 1 for free",
    lead: "Begin with a personal introduction to the World Tree, the four first-level streams and the traditional teacher-led initiation. All first-level study materials and the seven preparation questions are collected on this page.",
    sourceNote: "Free introductory initiation, timing and personal availability must be confirmed with Andrey; this page does not automatically book or grant an attunement.",
    freeLabel: "7 preparation questions · 3 ways to begin",
    choiceTitle: "Three ways to study",
    choices: [
      { title: "Free group introduction", description: "Join an online or in-person introductory group class when one is scheduled. Ask about availability before planning to attend." },
      { title: "Free individual trial", description: "Read the study materials independently, prepare answers to the seven questions and request a teacher-guided introductory Level 1 session." },
      { title: "Personal paid class", description: "Individual paid study with Andrey may be available. Ask about current format and pricing." },
    ],
    stepsTitle: "How to prepare for the free introductory initiation",
    steps: [
      "Send Andrey a request specifying that you are interested in the free Reiki Yggdrasil Level 1 initiation.",
      "Read the FAQ, the Basic Course book and Level 1 lessons linked below.",
      "Study the seven original checklist topics and write answers in your own words. The questions are about the teaching system, not a medical assessment.",
      "Send your answers or discuss them with Andrey, then agree on the available teacher-led format and time. Do not assume an initiation is booked before confirmation.",
    ],
    readingTitle: "Materials to read before the session",
    readingIntro: "All materials for preparing are now on Holistic House: learning FAQ, the Basic Course book, Level 1 attunements and practical exercises.",
    readingLinks: ["FAQ about learning · Read here", "Basic Course book · Full introduction", "Level 1 · Four attunements and practices", "Exercises · All five basic levels"],
    videoTitle: "Level 1 introduction · English video",
    videoLead: "Watch the first-level introductory recording here before working through the seven questions.",
    checklistTitle: "Seven questions for Reiki Yggdrasil Level 1",
    checklistIntro: "Seven preparation questions to study and discuss with the teacher, not an online exam.",
    questions: [
      "Which is more fundamental to the Runic Reiki system: Reiki, runes, or their combination?",
      "What differences does the author claim between Runic Reiki and classical Usui Reiki, and how are these claims explained within the tradition?",
      "What does Yggdrasil, the World Tree, represent in Scandinavian tradition and in the course?",
      "What is the Healing stream or attunement in Runic Reiki, and how is it traditionally described as being used?",
      "How is the Protection stream described, and in what situations do students practise it?",
      "What is the Money Stream Activation attunement, and what symbolic or practical purposes does the course associate with it?",
      "Which pantheons and deities does the course introduce for study at Level 5?",
    ],
    statement: "The source describes energy, healing and other esoteric effects as part of its spiritual teaching. These claims are not established medical facts. Reiki Yggdrasil does not replace health care or guarantee healing, money or supernatural abilities.",
    afterTitle: "After the first initiation: what to do next",
    after: [
      "Read the first-level descriptions again and revisit the course FAQ.",
      "Practise the four first-level themes—Healing, Intuition, Protection and Situation Balancing—in a reflective way, with another willing participant if appropriate.",
      "Keep a learning journal of impressions, questions and what you discover. Do not use sensations to diagnose others.",
      "Share the seven answers and questions with the teacher, discuss your experience and only then decide whether to progress to the next course level.",
    ],
    ctaTitle: "Ready to begin?",
    ctaText: "Write directly to Andrey. Your message is prepared but will not be sent until you approve it in WhatsApp or Telegram.",
    whatsapp: "Request free Level 1 via WhatsApp",
    telegram: "Contact Andrey in Telegram",
    back: "Reiki Yggdrasil course",
  },
  ru: {
    eyebrow: "Подарок для новых учеников · Базовый курс / ступень 1",
    title: "Как бесплатно получить инициацию в 1-ю ступень Рейки Иггдрасиль",
    lead: "Начните знакомство с Мировым Древом, четырьмя настройками первой ступени и традицией передачи инициации от преподавателя. На этой странице собраны учебные материалы и семь вопросов для самостоятельной подготовки.",
    sourceNote: "Возможность бесплатной вводной инициации, дату и формат нужно подтвердить у Андрея лично; чтение страницы не означает автоматическую запись или настройку.",
    freeLabel: "7 вопросов для подготовки · 3 способа начать",
    choiceTitle: "Три варианта обучения",
    choices: [
      { title: "Бесплатный групповой урок", description: "Присоединиться к ознакомительному занятию онлайн или очно, если открыт набор. Дату и формат нужно уточнить заранее." },
      { title: "Бесплатная индивидуальная инициация", description: "Самостоятельно прочесть материалы, подготовить ответы на семь вопросов и запросить вводную сессию с преподавателем." },
      { title: "Платное индивидуальное занятие", description: "Индивидуальные платные занятия тоже могут быть доступны. Уточните действующий формат и стоимость." },
    ],
    stepsTitle: "Как подготовиться к бесплатной первой ступени",
    steps: [
      "Напишите Андрею, что хотите пройти бесплатное знакомство и инициацию первой ступени Рейки Иггдрасиль.",
      "Изучите FAQ по системе, подробное описание и четыре настройки первой ступени по ссылкам ниже.",
      "Подготовьте ответы своими словами на семь контрольных вопросов. Это проверка понимания учебной системы, а не медицинский опросник.",
      "Отправьте ответы или обсудите их с Андреем, после чего согласуйте время и подходящий формат передачи настройки. Запись подтверждается только личным ответом.",
    ],
    readingTitle: "Что необходимо прочитать",
    readingIntro: "Всё необходимое собрано на Holistic House: вопросы об обучении, книга Базового курса, настройки и практические упражнения.",
    readingLinks: ["Вопросы об обучении · Читать здесь", "Книга Базового курса · Полное описание", "Первая ступень · Целительство, Интуиция, Защита, Гармонизация ситуации", "Практикум · Упражнения пяти ступеней"],
    videoTitle: "Вводное видео первой ступени · английская речь",
    videoLead: "Вводная запись на английском. Просмотр по нажатию, без автоматического звука.",
    checklistTitle: "Семь контрольных вопросов для 1-й ступени",
    checklistIntro: "Семь вопросов для самостоятельной подготовки и обсуждения с преподавателем. Ответы можно записать самостоятельно или обсудить с преподавателем.",
    questions: [
      "Что лежит в основе системы Рейки Иггдрасиль — Рейки, руны или их сочетание?",
      "Чем автор системы объясняет заявленные отличия Рейки Иггдрасиль от классического Усуи Рейки?",
      "Что такое Иггдрасиль — Мировое Древо — в скандинавской традиции и в системе обучения?",
      "Что означает поток или настройка «Целительство» и как его традиционно описывают?",
      "Как описывается работа потока «Защита» и в каких ситуациях его практикуют?",
      "В чём идея настройки «Активация денежного потока» и какие символические задачи с ней связывают?",
      "С какими пантеонами и богами предполагается знакомство на пятой ступени Рейки Иггдрасиль?",
    ],
    statement: "Описания целительства, энергетических потоков и иных эзотерических эффектов являются частью традиции, а не доказанными медицинскими фактами. Инициация не заменяет медицинскую помощь и не гарантирует исцеления, дохода или сверхъестественных способностей.",
    afterTitle: "После первой инициации: что делать дальше",
    after: [
      "Повторно прочитайте описание первой ступени и FAQ по системе.",
      "Практикуйте темы четырёх настроек — «Целительство», «Интуиция», «Защита», «Гармонизация ситуации» — как упражнения внимания. Работайте с партнёром только по согласию.",
      "Ведите личную книгу практики: отмечайте переживания, вопросы и наблюдения, не используя ощущения для диагностики других людей.",
      "Передайте преподавателю ответы на семь вопросов и задайте свои вопросы. Следующую ступень планируйте после обсуждения с преподавателем.",
    ],
    ctaTitle: "Хотите начать?",
    ctaText: "Напишите Андрею напрямую. В WhatsApp откроется готовое сообщение, которое вы отправите только после подтверждения.",
    whatsapp: "Запросить бесплатную 1-ю ступень в WhatsApp",
    telegram: "Написать Андрею в Telegram",
    back: "К программе Рейки Иггдрасиль",
  },
  es: {
    eyebrow: "Regalo para estudiantes · Curso básico / Nivel 1",
    title: "Cómo recibir gratis la iniciación de Reiki Yggdrasil Nivel 1",
    lead: "Conoce el Árbol del Mundo, las cuatro prácticas iniciales y la iniciación guiada por un profesor. Aquí encontrarás los materiales de estudio y siete preguntas de preparación.",
    sourceNote: "Andrey confirmará personalmente la disponibilidad y fecha de la iniciación gratuita; leer la página no reserva una sesión.",
    freeLabel: "7 preguntas · 3 maneras de comenzar",
    choiceTitle: "Tres formas de aprender",
    choices: [
      { title: "Clase grupal gratuita", description: "Participa presencialmente o en línea cuando haya una sesión disponible." },
      { title: "Iniciación individual gratuita", description: "Lee los materiales, prepara siete respuestas y solicita una sesión introductoria guiada." },
      { title: "Clase individual de pago", description: "También puede haber clases individuales de pago. Consulta el formato y precio actuales." },
    ],
    stepsTitle: "Pasos para prepararte",
    steps: [
      "Contacta con Andrey y expresa tu interés en el Nivel 1 gratuito.",
      "Lee las preguntas frecuentes, la descripción general y las cuatro prácticas del primer nivel.",
      "Prepara tus respuestas a las siete preguntas con tus propias palabras.",
      "Comparte tus respuestas con el profesor y acuerda la modalidad y la fecha disponibles.",
    ],
    readingTitle: "Lecturas recomendadas",
    readingIntro: "Todos los materiales están aquí: preguntas frecuentes, libro, primera etapa y ejercicios prácticos.",
    readingLinks: ["Preguntas frecuentes · Leer aquí", "Libro del Curso Básico · Guía completa", "Primer nivel · Cuatro prácticas", "Ejercicios prácticos · Cinco niveles"],
    videoTitle: "Introducción al Nivel 1 · Video en inglés",
    videoLead: "Mira el video introductorio aquí y continúa con las siete preguntas.",
    checklistTitle: "Siete preguntas para el Nivel 1",
    checklistIntro: "Siete preguntas para preparar y conversar con el profesor.",
    questions: [
      "¿Reiki, runas o su combinación: qué fundamenta Reiki Yggdrasil?",
      "¿Cómo explica el autor las diferencias que afirma entre Reiki Yggdrasil y Usui Reiki?",
      "¿Qué es Yggdrasil, el Árbol del Mundo?",
      "¿Qué representa la corriente de Sanación y cómo se describe su práctica?",
      "¿Cómo se describe la corriente de Protección?",
      "¿En qué consiste la llamada Activación del flujo de dinero?",
      "¿Qué panteones y deidades se estudian en el quinto nivel?",
    ],
    statement: "Las afirmaciones esotéricas y de sanación pertenecen a la tradición y no constituyen evidencia clínica ni sustituyen la atención médica.",
    afterTitle: "Después de la primera iniciación",
    after: [
      "Vuelve a leer la descripción del primer nivel y las preguntas frecuentes.",
      "Practica las cuatro temáticas, de manera reflexiva y siempre con consentimiento de otras personas.",
      "Registra tus observaciones sin utilizarlas para diagnosticar.",
      "Comparte tus respuestas y dudas con el profesor antes de continuar.",
    ],
    ctaTitle: "¿Listo para comenzar?",
    ctaText: "Contacta directamente con Andrey. WhatsApp prepara el mensaje, pero tú decides si lo envías.",
    whatsapp: "Solicitar Nivel 1 gratis por WhatsApp",
    telegram: "Escribir a Andrey por Telegram",
    back: "Programa Reiki Yggdrasil",
  },
};

const learningFaqs: Record<PublicLocale, Array<{ q: string; a: string }>> = {
  en: [
    { q: "Do I need previous Reiki experience?", a: "No previous training is needed for the introductory level. Begin with the first-level course materials." },
    { q: "Can I receive initiation simply by reading?", a: "No. The course describes a teacher-led attunement. Reading and the seven questions are preparation." },
    { q: "How should I practise?", a: "Use the exercises inside each level, keep a journal and practise with another person only by mutual consent." },
    { q: "When is the next free session?", a: "Andrey confirms the current availability, date and online or in-person format personally." },
  ],
  ru: [
    { q: "Нужен ли опыт других систем Рейки?", a: "Для вводной первой ступени предварительная подготовка в других традициях не требуется." },
    { q: "Можно ли пройти инициацию самостоятельно по тексту?", a: "Нет. В рамках курса настройка передаётся преподавателем; чтение и семь вопросов — подготовка." },
    { q: "Как выполнять упражнения?", a: "Все задания находятся внутри ступеней. Ведите дневник и практикуйте с партнёром только по взаимному согласию." },
    { q: "Когда ближайшее бесплатное занятие?", a: "Дату, доступность и онлайн- или очный формат подтверждает Андрей лично." },
  ],
  es: [
    { q: "¿Necesito experiencia previa en Reiki?", a: "No necesitas experiencia anterior para comenzar el nivel introductorio." },
    { q: "¿Puedo iniciarme solo leyendo?", a: "No. El curso describe una iniciación guiada por un profesor; la lectura es preparación." },
    { q: "¿Cómo debo practicar?", a: "Abre cada nivel, sigue los ejercicios y lleva un diario. La práctica con otra persona exige consentimiento." },
    { q: "¿Cuándo es la próxima sesión gratuita?", a: "Andrey confirma personalmente la fecha, disponibilidad y modalidad." },
  ],
};


const landing = {
  en: {
    why: "01 / 06 · THE PRACTICE", title: "Reiki Yggdrasil: a path through the World Tree",
    intro: "A thoughtful system that brings Reiki practice, the symbolic language of runes and guided inner exploration together. Discover a structured way to develop attention, intuition and self-understanding — from your very first lesson.",
    benefits: ["Reiki, runes & the World Tree", "Meditation, attention & intuition", "A clear path through 7 modules"],
    discover: "Choose how to begin", choiceNumber: "02 / 06 · YOUR FIRST STEP",
    choiceTitle: "Start for free, or learn one-to-one",
    choiceLead: "Both paths begin with Level 1. The free introduction is a gift for new students; personal initiation offers dedicated time with Andrey.",
    freeTag: "FREE INTRODUCTION", freeTitle: "Receive Level 1 for free",
    freeText: "Study the course, prepare seven short answers, and request the available teacher-led introductory initiation. No charge for the introductory offer.",
    freeAction: "Apply for the free initiation", personalTag: "PERSONAL · ONE-TO-ONE",
    personalTitle: "Personal Level 1 initiation", personalText: "An individual 60-minute session with Andrey, with time for questions and personal guidance. Availability is confirmed before booking.",
    personalAction: "Request a personal session", confirmation: "Initiations are teacher-led, subject to confirmation; reading alone does not grant an attunement.",
    questionNumber: "03 / 06 · PREPARE", questionsIntro: "Read the seven questions and prepare your own answers to request the free introduction. This is a preparation exercise, not a clinical test.",
    answersAction: "Send my answers", videoNumber: "04 / 06 · WATCH",
    videoHeading: "Experience Reiki Yggdrasil with Andrey", videoText: "Andrey’s original “Reiki Yggdrasil Meditation” from the main course landing — an introduction to the practice, not a replacement for teacher-led initiation.",
    videoLanguage: "Original video · English", materialsNumber: "05 / 06 · EXPLORE",
    materialsTitle: "Books, lessons & course levels", materialsLead: "Everything is available inside Holistic House. Explore the foundations now, or continue into the complete course.",
    materialNames: ["Basic Course book", "Level 1 lessons & practices", "All five basic levels", "Explore all 7 modules"],
    materialDetails: ["Read the full introduction", "Start with the first four attunements", "Study the foundation at your pace", "See the full pathway"],
    faqLabel: "Frequently asked questions", finalNumber: "06 / 06 · REGISTER",
    finalTitle: "Choose your next step", finalLead: "One simple form for the free introductory initiation, personal training, the PDF guide or sharing your seven answers.",
    back: "Back to Reiki Yggdrasil",
  },
  ru: {
    why: "01 / 06 · О СИСТЕМЕ", title: "Рейки Иггдрасиль — путь по Мировому Древу",
    intro: "Система, объединяющая практику Рейки, язык рун и исследование внутреннего мира. Пошаговый путь для развития внимания, интуиции и самопонимания — от первой ступени до глубоких направлений обучения.",
    benefits: ["Рейки, руны и Мировое Древо", "Медитация, внимание и интуиция", "Понятная система из 7 модулей"],
    discover: "Выбрать формат начала", choiceNumber: "02 / 06 · ПЕРВЫЙ ШАГ",
    choiceTitle: "Начните бесплатно или индивидуально",
    choiceLead: "Оба варианта начинаются с первой ступени. Бесплатная вводная инициация — подарок новым ученикам, а личная — индивидуальное занятие с Андреем.",
    freeTag: "БЕСПЛАТНО", freeTitle: "Получить 1-ю ступень бесплатно",
    freeText: "Прочитайте материалы, подготовьте ответы на семь вопросов и запросите доступную вводную инициацию с преподавателем. Вводный формат бесплатный.",
    freeAction: "Подать заявку бесплатно", personalTag: "ЛИЧНО · ИНДИВИДУАЛЬНО",
    personalTitle: "Личная инициация 1-й ступени", personalText: "60 минут с Андреем, ответы на вопросы и индивидуальное сопровождение. Дату и доступность нужно согласовать заранее.",
    personalAction: "Записаться на личную инициацию", confirmation: "Настройка передаётся преподавателем после подтверждения даты; одно чтение материалов не является инициацией.",
    questionNumber: "03 / 06 · ПОДГОТОВКА", questionsIntro: "Подготовьте ответы на семь вопросов своими словами, чтобы запросить бесплатный вводный формат. Это учебная подготовка, а не медицинский тест.",
    answersAction: "Отправить ответы", videoNumber: "04 / 06 · ВИДЕО",
    videoHeading: "Познакомьтесь с Рейки Иггдрасиль с Андреем", videoText: "Оригинальная медитация Андрея «Reiki Yggdrasil Meditation» с основного лендинга курса. Видео знакомит с практикой, но не заменяет личную инициацию.",
    videoLanguage: "Оригинальное видео · английский", materialsNumber: "05 / 06 · МАТЕРИАЛЫ",
    materialsTitle: "Книги, уроки и ступени", materialsLead: "Учебные материалы находятся на Holistic House. Можно читать первый уровень или изучать всю программу.",
    materialNames: ["Книга Базового курса", "Уроки и практики 1-й ступени", "Все пять базовых ступеней", "Все 7 модулей системы"],
    materialDetails: ["Подробное описание системы", "Четыре начальные настройки", "Полная основа обучения", "Продолжение пути"],
    faqLabel: "Частые вопросы", finalNumber: "06 / 06 · РЕГИСТРАЦИЯ",
    finalTitle: "Как вы хотите начать?", finalLead: "Одна форма: бесплатная инициация, личная сессия, PDF-описание или отправка ответов на семь вопросов.",
    back: "К программе Рейки Иггдрасиль",
  },
  es: {
    why: "01 / 06 · LA PRÁCTICA", title: "Reiki Yggdrasil: el camino del Árbol del Mundo",
    intro: "Un sistema que une la práctica de Reiki, el simbolismo de las runas y la exploración interior guiada. Descubre un camino estructurado de atención, intuición y autoconocimiento desde el primer nivel.",
    benefits: ["Reiki, runas y Árbol del Mundo", "Meditación, atención e intuición", "Un camino claro de 7 módulos"],
    discover: "Elige cómo empezar", choiceNumber: "02 / 06 · TU PRIMER PASO",
    choiceTitle: "Empieza gratis o de forma personal", choiceLead: "Ambas opciones comienzan con el Nivel 1. La introducción gratuita es un regalo; la iniciación personal ofrece tiempo individual con Andrey.",
    freeTag: "INTRODUCCIÓN GRATUITA", freeTitle: "Recibe gratis el Nivel 1", freeText: "Lee el material, prepara siete respuestas y solicita la iniciación introductoria guiada por el profesor según disponibilidad.",
    freeAction: "Solicitar iniciación gratuita", personalTag: "PERSONAL · INDIVIDUAL",
    personalTitle: "Iniciación personal de Nivel 1", personalText: "Sesión individual de 60 minutos con Andrey, preguntas y orientación personal. La disponibilidad se confirma antes de reservar.",
    personalAction: "Solicitar sesión personal", confirmation: "La iniciación requiere confirmación y acompañamiento del profesor; la lectura por sí sola no supone una iniciación.",
    questionNumber: "03 / 06 · PREPARACIÓN", questionsIntro: "Prepara tus propias respuestas a las siete preguntas para solicitar la introducción gratuita. No es una evaluación médica.",
    answersAction: "Enviar mis respuestas", videoNumber: "04 / 06 · VÍDEO",
    videoHeading: "Descubre Reiki Yggdrasil con Andrey", videoText: "La meditación original de Andrey «Reiki Yggdrasil Meditation» de la página principal del curso. Una introducción, no una iniciación guiada.",
    videoLanguage: "Vídeo original · inglés", materialsNumber: "05 / 06 · MATERIALES",
    materialsTitle: "Libros, lecciones y niveles", materialsLead: "Materiales disponibles en Holistic House. Empieza por las bases o explora el curso completo.",
    materialNames: ["Libro del Curso Básico", "Lecciones y prácticas del Nivel 1", "Los cinco niveles básicos", "Los 7 módulos"],
    materialDetails: ["Lee la introducción completa", "Cuatro sintonizaciones iniciales", "Explora la base del sistema", "Conoce el recorrido completo"],
    faqLabel: "Preguntas frecuentes", finalNumber: "06 / 06 · INSCRIPCIÓN",
    finalTitle: "Elige tu próximo paso", finalLead: "Un solo formulario para la introducción gratuita, sesión personal, descarga del PDF o envío de las siete respuestas.",
    back: "Volver a Reiki Yggdrasil",
  },
} as const;

export function YggdrasilFreeInitiation({ locale }: { locale: PublicLocale }) {
  const c = copy[locale];
  const t = landing[locale];
  const root = "/" + locale + "/academy/reiki/yggdrasil";
  const recording = englishGuidedMeditations.find((item) => item.key === "reiki-yggdrasil");
  const resourceLinks = [
    root + "/basic-course/description",
    root + "/basic-course#ry-l01-s01",
    root + "/basic-course#yggdrasil-basic-course-learning",
    root + "#system-modules",
  ];
  return (
    <main className={"academy-reading-shell academy-reading-shell--wide " + styles.shell} lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <article className={styles.page}>
        <nav className={styles.pageNav} aria-label={t.discover}>
          <Link href={root} className={styles.backLink}>← {t.back}</Link>
          <div className={styles.navSteps}>
            <a href="#why-yggdrasil">01</a>
            <a href="#choose-initiation">02</a>
            <a href="#checklist">03</a>
            <a href="#intro-video">04</a>
            <a href="#preparation-readings">05</a>
            <a href="#request-free-initiation">06</a>
          </div>
        </nav>

        <section className={styles.hero} id="why-yggdrasil" aria-labelledby="free-initiation-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{t.why}</p>
            <h1 id="free-initiation-title">{t.title}</h1>
            <p className={styles.heroLead}>{t.intro}</p>
            <ul className={styles.benefits}>{t.benefits.map((item) => <li key={item}>{item}</li>)}</ul>
            <a className={styles.primaryAction} href="#choose-initiation">{t.discover}<span aria-hidden="true"> →</span></a>
          </div>
          <div className={styles.heroVisual}>
            <Image src="/academy/reiki-yggdrasil/source/school-introduction.jpg" alt="" fill priority sizes="(max-width: 800px) 100vw, 42vw" />
            <span className={styles.visualCaption}>REIKI · YGGDRASIL</span>
          </div>
        </section>

        <section className={styles.section} id="choose-initiation" aria-labelledby="choose-initiation-title">
          <p className={styles.kicker}>{t.choiceNumber}</p>
          <h2 id="choose-initiation-title">{t.choiceTitle}</h2>
          <p className={styles.sectionLead}>{t.choiceLead}</p>
          <div className={styles.offerGrid}>
            <div className={styles.freeOffer}>
              <span className={styles.offerTag}>{t.freeTag}</span>
              <h3>{t.freeTitle}</h3>
              <p>{t.freeText}</p>
              <strong className={styles.offerPrice}>{locale === "ru" ? "0 € · 1-я ступень" : locale === "es" ? "0 € · Nivel 1" : "€0 · Level 1"}</strong>
              <a href="#apply-free" className={styles.primaryAction}>{t.freeAction} <span aria-hidden="true">→</span></a>
            </div>
            <div className={styles.personalOffer}>
              <span className={styles.offerTag}>{t.personalTag}</span>
              <h3>{t.personalTitle}</h3>
              <p>{t.personalText}</p>
              <strong className={styles.offerPrice}>{formatReikiLevelPrice("yggdrasil", locale)}</strong>
              <a href="#apply-personal" className={styles.secondaryAction}>{t.personalAction} <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <p className={styles.miniNote}>{t.confirmation}</p>
        </section>

        <section className={styles.questionsSlide} id="checklist" aria-labelledby="yggdrasil-free-checklist">
          <p className={styles.kicker}>{t.questionNumber}</p>
          <h2 id="yggdrasil-free-checklist">{c.checklistTitle}</h2>
          <p className={styles.sectionLead}>{t.questionsIntro}</p>
          <ol className={styles.questions}>{c.questions.map((question) => <li key={question}>{question}</li>)}</ol>
          <a className={styles.primaryAction} href="#apply-answers">{t.answersAction}<span aria-hidden="true"> →</span></a>
        </section>

        <section className={styles.section} id="intro-video" aria-labelledby="yggdrasil-original-video">
          <p className={styles.kicker}>{t.videoNumber}</p>
          <h2 id="yggdrasil-original-video">{t.videoHeading}</h2>
          <p className={styles.sectionLead}>{t.videoText}</p>
          <div className={styles.videoCard}>
            <div className={styles.videoFrame}>
              {recording?.youtubeId ? <AcademyVideoPlayer youtubeId={recording.youtubeId} title={recording.title} /> : null}
            </div>
            <div className={styles.videoCaption}>{t.videoLanguage}<span>{recording?.title}</span></div>
          </div>
        </section>

        <section className={styles.section} id="preparation-readings" aria-labelledby="reading-title">
          <p className={styles.kicker}>{t.materialsNumber}</p>
          <h2 id="reading-title">{t.materialsTitle}</h2>
          <p className={styles.sectionLead}>{t.materialsLead}</p>
          <div className={styles.materialGrid}>
            {resourceLinks.map((href, index) => (
              <Link href={href} key={href} className={styles.materialCard}>
                <span className={styles.materialIndex}>{String(index + 1).padStart(2, "0")}</span>
                <strong>{t.materialNames[index]}</strong>
                <small>{t.materialDetails[index]}</small>
                <span className={styles.materialArrow} aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <details className={styles.faqDisclosure} id="learning-faq">
            <summary>{t.faqLabel} <span aria-hidden="true">＋</span></summary>
            <div className={styles.faqAnswers}>
              {learningFaqs[locale].map((item) => <div key={item.q}><strong>{item.q}</strong><p>{item.a}</p></div>)}
            </div>
          </details>
        </section>

        <section className={styles.formSlide} id="request-free-initiation" aria-labelledby="initiation-form-title">
          <p className={styles.kicker}>{t.finalNumber}</p>
          <h2 id="initiation-form-title">{t.finalTitle}</h2>
          <p className={styles.sectionLead}>{t.finalLead}</p>
          <YggdrasilInitiationForm locale={locale} />
          <p className={styles.claimNote}>{c.statement}</p>
        </section>
      </article>
    </main>
  );
}
