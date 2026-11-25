import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Sparkles, Layers, Leaf, UserRound } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { ReikiDaybookStart } from "@/components/reiki-practitioner-entry";
import { MyReikiHeader } from "@/components/my-reiki-header";
import { MyReikiQuiz } from "@/components/my-reiki-quiz";
import { ReikiProgramNavigation, ReikiAdvancedProgram, resolveReikiProgram } from "@/components/reiki-programs";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./principles-of-energywork.module.css";

type LocalizedCourse = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  start: string;
  interactiveStart: string;
  how: string;
  heroFacts: string[];
  systemsTitle: string;
  learn: string;
  request: string;
  journeyEyebrow: string;
  journeyTitle: string;
  stepRailLabel: string;
  personalTitle: string;
  personalLead: string;
  rateExpress: string;
  rateLive: string;
  finalOnline: string;
  steps: Array<{ title: string; description: string }>;
  footerTitle: string;
  footerLead: string;
  notice: string;
  returnAcademy: string;
  kundalini: {
    eyebrow: string;
    title: string;
    subtitle: string;
    description: string;
    stepsTitle: string;
    steps: string[];
    materialsTitle: string;
    courseLink: string;
    manualLink: string;
    requestTitle: string;
    requestLead: string;
    requestButton: string;
    whatsappMessage: string;
    note: string;
    otherPaths: string;
  };
};

const translations: Record<PublicLocale, LocalizedCourse> = {
  en: {
    eyebrow: "HOLISTIC HOUSE ACADEMY · FREE BEGINNER COURSE",
    title: "Free Course Reiki Practitioner: Study & Initiation",
    subtitle: "Free online course · 5 steps · 3 Reiki systems",
    intro: "Begin with Flight to the Sun, explore Tantra, Kundalini and Yggdrasil Reiki, then choose your personal initiation.",
    start: "Explore the 3 systems",
    interactiveStart: "Start the free online course",
    how: "How the free initiation works",
    heroFacts: ["One Reiki system as a gift", "Optional donation for each additional system", "Learn online for free"],
    systemsTitle: "Reiki systems",
    learn: "Explore the system",
    request: "Choose one gifted Level 1",
    journeyEyebrow: "STEP 5 · PERSONAL INITIATION",
    journeyTitle: "Your personal initiation with Andrey",
    stepRailLabel: "Your five learning steps",
    personalTitle: "Personal initiation",
    personalLead: "Choose an express chat format or a full personal live initiation with Andrey. The format and time are confirmed together.",
    rateExpress: "Express chat format",
    rateLive: "Full personal live initiation",
    finalOnline: "Take the free online course",
    steps: [
      { title: "Complete the five lessons", description: "Flight to the Sun → Tantra Reiki → Kundalini Reiki → Yggdrasil Reiki → Personal Initiation preparation." },
      { title: "Choose your Reiki system", description: "One introductory Level 1 is a gift. For each additional system, you may make a donation of any amount." },
      { title: "Arrange your initiation", description: "Share your five learning reports and five course answers for review, then agree on the format and time with Andrey." },
    ],
    footerTitle: "Choose how you would like to begin",
    footerLead: "The complete online course is free. One Reiki system is a gift, further systems are available for a voluntary donation, or choose a personal lesson and initiation with Andrey.",
    notice: "These are spiritual and educational traditions. Their descriptions are not medical claims; Reiki is not a substitute for evidence-based healthcare. A reading, video or message does not itself grant an initiation; Andrey confirms availability and the format personally.",
    returnAcademy: "Back to the Academy",
    kundalini: {
      eyebrow: "KUNDALINI REIKI · FREE LEVEL 1",
      title: "Your free Kundalini Reiki introduction",
      subtitle: "A gentle first step into a three-level tradition",
      description: "Discover the first level, read the original course guide and ask Andrey about an introductory teacher-led initiation. You can study the material before making any request.",
      stepsTitle: "Three simple steps",
      steps: [
        "Read about the three Kundalini Reiki levels and what the original teaching describes.",
        "Review the Level 1 material and the original 24-page Kundalini Reiki Manual by Paul Crick.",
        "Send Andrey a free Level 1 introduction request and agree on the available format and time.",
      ],
      materialsTitle: "Your preparation materials",
      courseLink: "Explore the complete Kundalini Reiki course",
      manualLink: "Download the original PDF manual",
      requestTitle: "Request a free Level 1 introduction",
      requestLead: "No registration or email is required. WhatsApp opens a prepared message; you decide whether to send it. Andrey will confirm whether and when a teacher-guided introductory initiation is available.",
      requestButton: "Request free Kundalini Level 1",
      whatsappMessage: "Hello Andrey! I would like to request the FREE introductory Level 1 Kundalini Reiki initiation. I am studying the original course material. Please tell me the preparation, format and available times.",
      note: "A request does not book or grant an initiation automatically. This is spiritual education, not a treatment or health guarantee.",
      otherPaths: "Explore the other two Reiki systems",
    },
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE ACADEMY · БЕСПЛАТНЫЙ ВВОДНЫЙ КУРС",
    title: "Бесплатный курс «Практик Рейки»: обучение и инициация",
    subtitle: "Бесплатный онлайн-курс · 5 шагов · 3 системы Рейки",
    intro: "Сначала «Полёт к Солнцу», затем Тантра Рейки, Кундалини Рейки, Рейки Иггдрасиль и личная инициация.",
    start: "Посмотреть 3 системы",
    interactiveStart: "Пройти бесплатный онлайн-курс",
    how: "Как получить инициацию бесплатно",
    heroFacts: ["Любая одна система Рейки в подарок", "За дополнительные — свободный донейшен", "Бесплатный онлайн-курс"],
    systemsTitle: "Системы Рейки",
    learn: "Описание системы",
    request: "Одна 1-я ступень в подарок",
    journeyEyebrow: "ШАГ 5 · ЛИЧНАЯ ИНИЦИАЦИЯ",
    journeyTitle: "Личная инициация с Андреем",
    stepRailLabel: "Пять шагов обучения",
    personalTitle: "Личная инициация",
    personalLead: "Выберите экспресс-формат в чате или полноценную личную инициацию в прямом эфире с Андреем. Формат и время согласуются отдельно.",
    rateExpress: "Экспресс-формат в чате",
    rateLive: "Полная личная инициация онлайн",
    finalOnline: "Пройти онлайн-курс бесплатно",
    steps: [
      { title: "Пройдите пять уроков", description: "Полёт к Солнцу → Тантра Рейки → Кундалини Рейки → Рейки Иггдрасиль → подготовка к инициации." },
      { title: "Выберите систему", description: "Одна вводная ступень — в подарок. За каждую следующую систему можно внести пожертвование в любой сумме." },
      { title: "Согласуйте инициацию", description: "Для рассмотрения заявки предоставьте пять отчётов и пять ответов по курсу, затем согласуйте время и формат." },
    ],
    footerTitle: "Выберите, как продолжить обучение",
    footerLead: "Онлайн-курс бесплатный. Одна система Рейки — в подарок, дополнительные — за свободный донейшен. Или выберите личное обучение и инициацию у Андрея.",
    notice: "Это духовные и образовательные традиции, а не медицинские методы лечения. Рейки не заменяет доказательную медицинскую помощь. Просмотр материалов или отправка заявки сами по себе не означают получения инициации; время и формат подтверждает Андрей.",
    returnAcademy: "Вернуться в Академию",
    kundalini: {
      eyebrow: "КУНДАЛИНИ РЕЙКИ · 1-Я СТУПЕНЬ БЕСПЛАТНО",
      title: "Бесплатное знакомство с Кундалини Рейки",
      subtitle: "Первый шаг в традиции из трёх ступеней",
      description: "Познакомьтесь с первой ступенью, прочитайте оригинальные материалы и узнайте у Андрея, как получить бесплатную вводную инициацию с преподавателем. Материалы можно изучить заранее.",
      stepsTitle: "Три простых шага",
      steps: [
        "Прочитайте описание трёх ступеней Кундалини Рейки и смысл практик в исходной традиции.",
        "Изучите первую ступень и оригинальную 24-страничную методичку Kundalini Reiki Manual Пола Крика.",
        "Отправьте Андрею запрос на бесплатную вводную первую ступень и согласуйте время и формат.",
      ],
      materialsTitle: "Материалы для подготовки",
      courseLink: "Полное описание курса Кундалини Рейки",
      manualLink: "Скачать оригинальную PDF-методичку",
      requestTitle: "Запросить бесплатную первую ступень",
      requestLead: "Регистрация и email не нужны. Откроется WhatsApp с готовым текстом — отправляете его только вы. Андрей лично подтвердит доступность бесплатного вводного формата.",
      requestButton: "Запросить Кундалини Рейки 1 бесплатно",
      whatsappMessage: "Здравствуйте, Андрей! Хочу получить БЕСПЛАТНУЮ вводную инициацию 1-й ступени Кундалини Рейки. Изучаю материалы курса. Подскажите, пожалуйста, подготовку, формат и свободное время.",
      note: "Заявка не означает автоматическую запись или передачу инициации. Это духовное обучение, а не лечение или гарантия результата.",
      otherPaths: "Посмотреть две другие системы Рейки",
    },
  },
  es: {
    eyebrow: "ACADEMIA HOLISTIC HOUSE · CURSO INTRODUCTORIO GRATUITO",
    title: "Curso gratis Reiki Practitioner: estudio e iniciación",
    subtitle: "Curso online gratis · 5 pasos · 3 sistemas Reiki",
    intro: "Comienza con Vuelo hacia el Sol, sigue con Tantra, Kundalini y Reiki Yggdrasil, y termina con la iniciación personal.",
    start: "Explorar los 3 sistemas",
    interactiveStart: "Empezar el curso interactivo (EN)",
    how: "Cómo funciona la iniciación gratis",
    heroFacts: ["Un sistema Reiki de regalo", "Donación voluntaria por cada sistema adicional", "Curso online gratuito"],
    systemsTitle: "Tres caminos de Reiki",
    learn: "Conocer el sistema",
    request: "Un Nivel 1 de regalo",
    journeyEyebrow: "PASO 5 · INICIACIÓN PERSONAL",
    journeyTitle: "Iniciación personal con Andrey",
    stepRailLabel: "Tus cinco pasos",
    personalTitle: "Iniciación personal",
    personalLead: "Elige el formato exprés por chat o una iniciación personal completa en directo con Andrey. El formato y el horario se confirman juntos.",
    rateExpress: "Formato exprés por chat",
    rateLive: "Iniciación personal completa en directo",
    finalOnline: "Hacer el curso online gratis",
    steps: [
      { title: "Completa cinco lecciones", description: "Vuelo hacia el Sol → Tantra Reiki → Kundalini Reiki → Reiki Yggdrasil → preparación para la iniciación." },
      { title: "Elige tu sistema", description: "Un Nivel 1 introductorio es un regalo; puedes ofrecer la donación que desees por cada sistema adicional." },
      { title: "Acuerda la iniciación", description: "Prepara cinco informes y cinco respuestas para la revisión personal; confirma con Andrey el horario y el formato." },
    ],
    footerTitle: "Elige cómo comenzar",
    footerLead: "El curso online es gratuito. Un sistema Reiki es un regalo y los adicionales se ofrecen por donación voluntaria. También puedes reservar una sesión individual con Andrey.",
    notice: "Son tradiciones espirituales y educativas, no tratamientos médicos. Reiki no sustituye a la atención médica basada en pruebas. Leer o enviar una solicitud no concede automáticamente una iniciación; Andrey confirma disponibilidad y formato.",
    returnAcademy: "Volver a la Academia",
    kundalini: {
      eyebrow: "KUNDALINI REIKI · NIVEL 1 GRATIS",
      title: "Tu introducción gratuita a Kundalini Reiki",
      subtitle: "El primer paso en una tradición de tres niveles",
      description: "Conoce el Nivel 1, lee la guía original y pregunta a Andrey cómo solicitar una iniciación introductoria gratuita con el profesor.",
      stepsTitle: "Tres pasos sencillos",
      steps: [
        "Explora los tres niveles de Kundalini Reiki y los conceptos del curso original.",
        "Lee los materiales del Nivel 1 y el manual original de 24 páginas de Paul Crick.",
        "Solicita una introducción gratuita al Nivel 1 y confirma personalmente con Andrey la fecha y el formato.",
      ],
      materialsTitle: "Materiales de preparación",
      courseLink: "Ver el curso completo de Kundalini Reiki",
      manualLink: "Descargar el manual PDF original",
      requestTitle: "Solicita una introducción gratuita al Nivel 1",
      requestLead: "Sin registro ni correo electrónico. WhatsApp abrirá un mensaje preparado que tú decides enviar. Andrey confirmará personalmente la disponibilidad.",
      requestButton: "Solicitar Nivel 1 gratis",
      whatsappMessage: "Hola Andrey. Quiero solicitar la iniciación introductoria GRATUITA al Nivel 1 de Kundalini Reiki. Estoy estudiando los materiales originales. ¿Puedes confirmar la preparación, el formato y las fechas disponibles?",
      note: "La solicitud no reserva ni concede la iniciación automáticamente. Es educación espiritual, no tratamiento médico.",
      otherPaths: "Explorar los otros dos sistemas Reiki",
    },
  },
};

// The two source recordings were supplied by Andrey and confirmed on YouTube
// on 2026-10-16. All locales retain their original English audio.
const videoCopy: Record<PublicLocale, {
  introduction: string; flightCta: string; flightTitle: string; flightLead: string; flightPending: string;
  flightVerified: string; originalEnglish: string;
  explore: string; description: string; freeStudy: string; videoTitle: string;
  yggdrasilFirst: string; youtubeLink: string;
}> = {
  en: {
    introduction: "STEP 1 · WATCH FIRST", flightCta: "Start with Flight to the Sun", flightTitle: "Flight to the Sun",
    flightLead: "Watch Andrey’s guided meditation with the image of the sun. This is not a Reiki initiation.",
    flightPending: "The original video is temporarily unavailable in this player.",
    flightVerified: "Original guided meditation · English",
    originalEnglish: "Original video · English audio · click to play",
    explore: "Explore the three Reiki systems",
    description: "Study materials",
    freeStudy: "Level 1 gift offer details",
    videoTitle: "Explore all three Reiki systems in learning order",
    yggdrasilFirst: "Andrey's original Level 1 introduction · English",
    youtubeLink: "Watch the original on YouTube",
  },
  ru: {
    introduction: "ШАГ 1 · СНАЧАЛА МЕДИТАЦИЯ", flightCta: "Начать с медитации «Полёт к Солнцу»", flightTitle: "Полёт к Солнцу",
    flightLead: "Авторская медитация Андрея с образом Солнца. Она не заменяет инициацию Рейки.",
    flightPending: "Оригинальное видео временно недоступно в этом проигрывателе.",
    flightVerified: "Авторская медитация · английский язык",
    originalEnglish: "Оригинальное видео · на английском · просмотр по нажатию",
    explore: "Перейти к трём системам Рейки",
    description: "Материалы курса",
    freeStudy: "Условия подарочной 1-й ступени",
    videoTitle: "Изучайте все три системы Рейки по очереди",
    yggdrasilFirst: "Оригинальное видео Андрея о 1-й ступени · английский",
    youtubeLink: "Открыть оригинал на YouTube",
  },
  es: {
    introduction: "PASO 1 · EMPIEZA CON LA MEDITACIÓN", flightCta: "Empezar con Vuelo hacia el Sol", flightTitle: "Vuelo hacia el Sol",
    flightLead: "Meditación guiada de Andrey con el símbolo del sol. No equivale a una iniciación Reiki.",
    flightPending: "El vídeo original no está disponible temporalmente en este reproductor.",
    flightVerified: "Meditación original · audio en inglés",
    originalEnglish: "Vídeo original · audio en inglés · pulsar para reproducir",
    explore: "Explorar los tres sistemas Reiki",
    description: "Materiales del curso",
    freeStudy: "Detalles del regalo de Nivel 1",
    videoTitle: "Conoce los tres sistemas Reiki en orden",
    yggdrasilFirst: "Introducción original de Andrey al Nivel 1 · inglés",
    youtubeLink: "Ver el original en YouTube",
  },
};

const paths = [
  {
    key: "tantra",
    title: "Tantra Reiki",
    image: "/images/holistic-house/andy-about.png",
    study: "reiki/tantra-reiki",
    free: "reiki/tantra-reiki/free-initiation",
    badge: "02",
  },
  {
    key: "kundalini",
    title: "Kundalini Reiki",
    image: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
    study: "reiki/kundalini-reiki",
    free: "reiki/kundalini-reiki/free-initiation",
    badge: "03",
  },
  {
    key: "yggdrasil",
    title: "Reiki Yggdrasil",
    image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
    study: "reiki/yggdrasil",
    free: "reiki/yggdrasil/free-initiation",
    badge: "04",
  },
] as const;

const reikiOverviewArt = [
  { src: "/images/holistic-house/reiki-tantra-approved-artwork.webp", width: 1024, height: 600 },
  { src: "/images/holistic-house/reiki-kundalini-approved-artwork.webp", width: 1024, height: 590 },
  { src: "/images/holistic-house/reiki-yggdrasil-approved-artwork.webp", width: 1024, height: 525 },
] as const;

const reikiOverviewCopy = {
  en: [
    { subtitle: "The energy of life, love, and creativity", description: "Explore vitality, sensuality, connection, and creative expression through a nine-level Reiki path.", levels: "9 levels" },
    { subtitle: "Awaken your inner power", description: "Discover grounding, balance, chakra awareness, and simple daily energy practices through a three-level Reiki path.", levels: "3 levels" },
    { subtitle: "The path of power and wisdom", description: "Explore inner strength, runic symbolism, protection, and spiritual development through the World Tree.", levels: "5 levels · 7 modules" },
  ],
  ru: [
    { subtitle: "Энергия жизни, любви и творчества", description: "Исследуйте жизненную энергию, чувственность, связь и творческое самовыражение на пути девяти уровней Рейки.", levels: "9 уровней" },
    { subtitle: "Пробудите внутреннюю силу", description: "Познакомьтесь с заземлением, балансом, чакрами и ежедневными энергетическими практиками трёх уровней Рейки.", levels: "3 уровня" },
    { subtitle: "Путь силы и мудрости", description: "Исследуйте внутреннюю силу, руническую символику, защиту и духовное развитие через образ Мирового Древа.", levels: "5 уровней · 7 модулей" },
  ],
  es: [
    { subtitle: "La energía de la vida, el amor y la creatividad", description: "Explora la vitalidad, la sensualidad, la conexión y la expresión creativa en un camino Reiki de nueve niveles.", levels: "9 niveles" },
    { subtitle: "Despierta tu fuerza interior", description: "Descubre el arraigo, el equilibrio, los chakras y prácticas energéticas diarias en tres niveles Reiki.", levels: "3 niveles" },
    { subtitle: "El camino de la fuerza y la sabiduría", description: "Explora la fuerza interior, los símbolos rúnicos, la protección y el desarrollo espiritual a través del Árbol del Mundo.", levels: "5 niveles · 7 módulos" },
  ],
} as const;

function academyUrl(locale: PublicLocale, path: string) {
  return "/" + locale + "/academy/" + path;
}

export function PrinciplesOfEnergywork({ locale, program: rawProgram }: { locale: PublicLocale; program?: string | string[] }) {
  const program = resolveReikiProgram(rawProgram);
  const t = translations[locale];
  const v = videoCopy[locale];
  const learnPath = REIKI_FREE_COURSE_PATH.replace(/^\/en\//, locale === "ru" ? "/ru/" : "/en/");
  const profilePath = "/" + (locale === "es" ? "en" : locale) + "/app/portrait";
  const daybookCopy = {
    ru: { title: "Практик Рейки", subtitle: "5 недель · 3 системы Рейки · бесплатно", intro: "Откройте для себя энергетические практики в личном Daybook.", profile: "Мой профиль", classic: "Классический курс", week: "Неделя", syllabus: "Ваши пять недель", details: ["Практика присутствия и внимания", "Источник жизни · медитация и символы", "Знакомство с традицией и практикой", "Мировое Древо · руническая традиция", "Подготовка и выбор системы"] },
    en: { title: "Reiki Practitioner", subtitle: "5 weeks · 3 Reiki systems · free", intro: "Explore energywork in your personal Daybook.", profile: "My profile", classic: "Classic course", week: "Week", syllabus: "Your five weeks", details: ["Presence and attention practice", "Spring of Life · meditation and symbols", "Explore the tradition and practice", "World Tree · runic tradition", "Preparation and choice of system"] },
    es: { title: "Reiki Practitioner", subtitle: "5 semanas · 3 sistemas Reiki · gratis", intro: "Explora las prácticas energéticas en tu Daybook. Curso en inglés o ruso.", profile: "Mi perfil", classic: "Curso clásico (EN)", week: "Semana", syllabus: "Tus cinco semanas", details: ["Práctica de presencia y atención", "Fuente de Vida · meditación y símbolos", "Conoce la tradición y la práctica", "Árbol del Mundo · tradición rúnica", "Preparación y elección del sistema"] },
  }[locale];
  const detailsCopy = {
    en: { heading: "What you will receive", benefits: ["5 weeks of guided practice", "3 Reiki systems", "Personal initiation path", "Meditations, materials and reflection"] },
    ru: { heading: "Что вы получите", benefits: ["5 недель практики с сопровождением", "3 системы Рейки", "Путь к личной инициации", "Медитации, материалы и рефлексия"] },
    es: { heading: "Qué recibirás", benefits: ["5 semanas de práctica guiada", "3 sistemas Reiki", "Camino a la iniciación personal", "Meditaciones, materiales y reflexión"] },
  }[locale];
  const benefitIcons = [Leaf, Layers, UserRound, BookOpen];
  // Native-resolution, artwork-only crops from the approved second-screen reference.
  const detailPhotos = ["/images/holistic-house/reiki-week-sunrise-approved.webp", "/images/holistic-house/reiki-week-lotus-approved.webp", "/images/holistic-house/reiki-week-kundalini-approved.webp", "/images/holistic-house/reiki-week-world-tree-approved.webp", "/images/holistic-house/reiki-week-initiation-approved.webp"];
  const yggdrasilVideos = {
    en: { kicker: "INTRODUCTORY VIDEOS", title: "Discover Reiki Yggdrasil", first: "Level 1 introduction", second: "Reiki Yggdrasil meditation", language: "Original videos · English audio" },
    ru: { kicker: "ВВОДНЫЕ ВИДЕО", title: "Знакомство с Рейки Иггдрасиль", first: "Введение в первую ступень", second: "Медитация Рейки Иггдрасиль", language: "Оригинальные видео · на английском" },
    es: { kicker: "VIDEOS INTRODUCTORIOS", title: "Descubre Reiki Yggdrasil", first: "Introducción al Nivel 1", second: "Meditación Reiki Yggdrasil", language: "Videos originales · audio en inglés" },
  }[locale];
  const yggdrasilMeditation = englishGuidedMeditations.find(item => item.key === "reiki-yggdrasil");
  return (
    <main className={styles.page} lang={locale} data-reiki-practitioner-landing>
      <div className={styles.reikiShell}>
        <MyReikiHeader locale={locale} program={program} />
        <ReikiProgramNavigation locale={locale} active={program} />
      </div>
      <div className={`${styles.wrap} ${styles.courseDeck}`}>

        {program !== "free" ? <ReikiAdvancedProgram locale={locale} program={program} /> : <>
        <section id="reiki-start" className={styles.hero} data-energywork-screen="intro" aria-labelledby="energywork-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <h1 id="energywork-title">{daybookCopy.title}</h1>
            <p className={styles.heroSubtitle}>{daybookCopy.subtitle}</p>
            <p className={styles.heroLead}>{daybookCopy.intro}</p>
            <ReikiDaybookStart locale={locale} className={styles.primaryButton} />

          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.orbitOuter}><div className={styles.orbitMiddle}><div className={styles.orbitInner}><Sparkles size={47} strokeWidth={1.2} /></div></div></div>
            <span className={styles.orbitTag + " " + styles.orbitTagOne}>YGGDRASIL</span>
            <span className={styles.orbitTag + " " + styles.orbitTagTwo}>TANTRA</span>
            <span className={styles.orbitTag + " " + styles.orbitTagThree}>KUNDALINI</span>
            <span className={styles.orbitCaption}>3 REIKI PATHS · ONE BEGINNING</span>
          </div>
        </section>
        <MyReikiQuiz locale={locale} />
        <section className={styles.reikiDetailsScreen} id="reiki-course-details" data-reiki-details-screen aria-labelledby="reiki-syllabus-title">
          <div className={styles.reikiSyllabus}>
          <p className={styles.sectionEyebrow}>DAYBOOK · 05</p><h2 id="reiki-syllabus-title">{daybookCopy.syllabus}</h2>
          <nav className={styles.stepRail} aria-label={t.stepRailLabel} data-energywork-five-steps>
            {[v.flightTitle, ...paths.map(system => system.title), t.personalTitle].map((title, index) => <a key={index} href="#reiki-start" data-reiki-week={index + 1}><span className={styles.reikiWeekPhoto} data-reiki-week-photo={index + 1} aria-hidden="true"><Image src={detailPhotos[index]} alt="" fill sizes="(max-width: 700px) 34vw, 260px" unoptimized /></span><div className={styles.reikiWeekCopy}><small>{daybookCopy.week} {index + 1}</small><strong>{title}</strong><p>{daybookCopy.details[index]}</p></div><ArrowRight size={19} aria-hidden="true" /></a>)}
          </nav>
          </div>
          <section className={styles.reikiBenefits} aria-labelledby="reiki-benefits-title">
            <h2 id="reiki-benefits-title">{detailsCopy.heading}</h2>
            <div className={styles.reikiBenefitGrid}>{detailsCopy.benefits.map((label,index)=>{ const Icon = benefitIcons[index]; return <div key={index} className={styles.reikiBenefitCard} data-reiki-benefit={index}><Icon size={27} aria-hidden="true" /><strong>{label}</strong></div>; })}</div>
          </section>
          <div className={styles.reikiDetailsStart}><ReikiDaybookStart locale={locale} className={styles.primaryButton} /></div>
        <div className={styles.reikiSecondary} data-reiki-details-formats>
          <div className={styles.heroQuickLinks}>
                <Link href={learnPath} className={styles.ghostButton} data-energywork-interactive-course>{daybookCopy.classic}<ArrowRight size={16} aria-hidden="true" /></Link>
                <Link className={styles.ghostButton} href={"/" + (locale === "ru" ? "ru" : "en") + "/academy/principles-of-energywork/daybook"} data-reiki-daybook-entry>{locale === "ru" ? "Посмотреть Daybook" : locale === "es" ? "Ver Daybook (EN)" : "Preview Daybook"}<BookOpen size={17} aria-hidden="true" /></Link>

              </div>
        </div>
        </section>

        <section className={styles.reikiOverview} data-reiki-system-overview aria-label={t.systemsTitle}>
          {paths.map((system, index) => {
            const artwork = reikiOverviewArt[index];
            const copy = reikiOverviewCopy[locale][index];
            return <article key={system.key} className={styles.reikiOverviewCard} data-reiki-overview-system={system.key} data-reiki-path={system.key} data-energywork-screen={system.key} data-energywork-step={String(index + 2)} id={"energywork-" + system.key} aria-labelledby={"reiki-overview-" + system.key}>
              <div className={styles.reikiOverviewArtwork}>
                <Image src={artwork.src} width={artwork.width} height={artwork.height} alt="" sizes="(max-width: 820px) 100vw, 790px" unoptimized loading="lazy" />
              </div>
              <div className={styles.reikiOverviewCopy}>
                <h2 id={"reiki-overview-" + system.key}>{system.title}</h2>
                <p className={styles.reikiOverviewSubtitle}>{copy.subtitle}</p>
                <p className={styles.reikiOverviewDescription}>{copy.description}</p>
                <p className={styles.reikiOverviewLevels}>{copy.levels}</p>
                <Link className={styles.reikiOverviewLink} href={academyUrl(locale, system.study)}>{t.learn}<ArrowRight size={20} aria-hidden="true" /></Link>
                <Link className={styles.reikiOverviewFreeLink} href={academyUrl(locale, system.free)}>{v.freeStudy}</Link>
              </div>
            </article>;
          })}
        </section>

        <section className={styles.howSection} id="energywork-how" data-energywork-screen="initiation" data-energywork-step="5" aria-labelledby="energywork-how-title">
          <div className={styles.sectionHeader}><p className={`${styles.sectionEyebrow} ${styles.sequenceStep}`}>{t.journeyEyebrow}</p><h2 id="energywork-how-title">{t.journeyTitle}</h2></div>
          <div className={styles.journeyGrid}>{t.steps.map((step, i) => <div className={styles.journeyStep} key={step.title}><strong>0{i + 1}</strong><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
          <div className={styles.personalRates} data-energywork-personal-rates>
            <div className={styles.personalRatesCopy}><h3>{t.personalTitle} · 1:1</h3><p>{t.personalLead}</p></div>
            <div className={styles.rate} data-reiki-initiation-format="express"><strong>€0</strong><span>{t.rateExpress}</span></div>
            <div className={styles.rate} data-reiki-initiation-format="live"><strong>€100</strong><span>{t.rateLive}</span></div>
          </div>
        </section>
        <section className={styles.howSection} data-reiki-yggdrasil-intro-videos aria-labelledby="reiki-yggdrasil-videos-title">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>{yggdrasilVideos.kicker}</p>
            <h2 id="reiki-yggdrasil-videos-title">{yggdrasilVideos.title}</h2>
            <p>{yggdrasilVideos.language}</p>
          </div>
          <div className={styles.reikiIntroVideoGrid}>
            <article><h3>{yggdrasilVideos.first}</h3><AcademyVideoPlayer youtubeId="DYo-fG-SyKw" title={yggdrasilVideos.first} locale={locale} /></article>
            {yggdrasilMeditation?.youtubeId && <article><h3>{yggdrasilVideos.second}</h3><AcademyVideoPlayer youtubeId={yggdrasilMeditation.youtubeId} title={yggdrasilVideos.second} locale={locale} /></article>}
          </div>
          <Link className={styles.reikiOverviewFreeLink} href={academyUrl(locale, "reiki/yggdrasil/archive")}>{locale === "ru" ? "Архив школы" : locale === "es" ? "Archivo de la escuela" : "School archive"}<ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
        <section className={styles.finalCta}>
          <div><p className={styles.eyebrow}>{t.subtitle}</p><h2>{t.footerTitle}</h2><p>{t.footerLead}</p></div>
          <div className={styles.finalCtaActions} data-energywork-final-choices>
            <ReikiDaybookStart locale={locale} className={styles.primaryButton} />
            <Link href={learnPath} className={styles.ghostButton} data-energywork-final-online>{daybookCopy.classic}<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
        <p className={styles.disclaimer}>{t.notice}</p>
        </>}
        <div className={styles.backRow}><Link href={"/" + locale + "/academy"}>← {t.returnAcademy}</Link><Link href={profilePath} prefetch={false} data-reiki-profile-link>{daybookCopy.profile}<ArrowRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </main>
  );
}

export function KundaliniFreeInitiation({ locale }: { locale: PublicLocale }) {
  const t = translations[locale];
  const k = t.kundalini;
  const studyUrl = academyUrl(locale, "reiki/kundalini-reiki");
  const requestUrl = whatsappEnquiryUrl({
    locale,
    service: "Kundalini Reiki",
    request: k.whatsappMessage,
    option: k.requestButton,
    pagePath: academyUrl(locale, "reiki/kundalini-reiki/free-initiation"),
  });
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrap}>
        <div className={styles.backRow}><Link href={academyUrl(locale, "principles-of-energywork")}>← {t.title}</Link></div>
        <section className={styles.kundaliniHero} aria-labelledby="kundalini-free-title">
          <div>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{k.eyebrow}</p>
            <h1 id="kundalini-free-title">{k.title}</h1>
            <p className={styles.heroSubtitle}>{k.subtitle}</p>
            <p className={styles.heroLead}>{k.description}</p>
            <div className={styles.heroActions}><Link className={styles.primaryButton} href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>{locale === "ru" ? "Начать бесплатный курс Рейки" : locale === "es" ? "Empezar curso de Reiki gratis" : "Start free Reiki course"}<ArrowRight size={17} /></Link><a className={styles.ghostButton} href="#kundalini-free-request">{k.requestButton}<ArrowDown size={17} /></a><Link className={styles.ghostButton} href={studyUrl}>{k.courseLink}<ArrowRight size={17} /></Link></div>
          </div>
          <div className={styles.kundaliniArtwork}><Image src="/academy/kundalini-reiki/kundalini-manual-level-2.jpg" alt="Kundalini Reiki Level 2 · illustration from the original course manual" fill sizes="(max-width: 780px) 92vw, 37vw" priority /></div>
        </section>
        <section className={styles.howSection}>
          <div className={styles.sectionHeader}><p className={styles.sectionEyebrow}>01 / PREPARE</p><h2>{k.stepsTitle}</h2></div>
          <div className={styles.journeyGrid}>{k.steps.map((step,i) => <div key={step} className={styles.journeyStep}><strong>0{i+1}</strong><p>{step}</p></div>)}</div>
        </section>
        <section className={styles.materialsPanel}>
          <div><p className={styles.sectionEyebrow}>02 / STUDY</p><h2>{k.materialsTitle}</h2></div>
          <div className={styles.materialLinks}>
            <Link href={studyUrl}><BookOpen size={20} aria-hidden="true" />{k.courseLink}<ArrowRight size={18} aria-hidden="true" /></Link>
            <a href="/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf" download="Kundalini_Reiki_Manual_Paul_Crick.pdf"><BookOpen size={20} aria-hidden="true" />{k.manualLink}<ArrowDown size={18} aria-hidden="true" /></a>
          </div>
        </section>
        <section className={styles.requestPanel} id="kundalini-free-request">
          <div>
            <p className={styles.sectionEyebrow}>03 / REQUEST</p>
            <h2>{k.requestTitle}</h2>
            <p>{k.requestLead}</p>
          </div>
          <ContactChannelChooser stayAfterSave locale={locale} whatsappUrl={requestUrl} className={styles.requestButton} attributes={{ "data-reiki-free-request": "kundalini" }} />
          <small>{k.note}</small>
        </section>
        <div className={styles.otherPaths}><Link href={academyUrl(locale, "principles-of-energywork")}>{k.otherPaths}<ArrowRight size={17} aria-hidden="true" /></Link></div>
        <p className={styles.disclaimer}>{t.notice}</p>
      </div>
    </main>
  );
}
