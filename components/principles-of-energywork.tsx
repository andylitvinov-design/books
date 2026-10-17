import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, CheckCircle2, Compass, HeartHandshake, Sparkles } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { EnergyworkReikiCapture } from "@/components/energywork-reiki-capture";
import { EnergyworkVideoArchive } from "@/components/energywork-video-archive";
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
  foundationsEyebrow: string;
  foundationsTitle: string;
  foundationsLead: string;
  foundations: Array<{ title: string; description: string }>;
  systemsEyebrow: string;
  systemsTitle: string;
  systemsLead: string;
  learn: string;
  request: string;
  systemTags: string[];
  systemDescriptions: string[];
  journeyEyebrow: string;
  journeyTitle: string;
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
    title: "Principles of Energywork",
    subtitle: "FREE Initiations into 3 Reiki Systems",
    intro: "One welcoming introduction, three different Reiki paths. Learn the basic principles of mindful energy practice, discover each system, then choose a free, teacher-guided first-level introduction.",
    start: "Explore the 3 systems",
    interactiveStart: "Start interactive course",
    how: "How the free initiation works",
    heroFacts: ["3 distinct Reiki systems", "Free Level 1 introductions", "No email or account required"],
    foundationsEyebrow: "STEP 2 · THE FOUNDATIONS",
    foundationsTitle: "What are the principles of energywork?",
    foundationsLead: "In these traditions, energywork is a spiritual and contemplative practice built around attention, intention and symbolic methods. Begin with three simple foundations.",
    foundations: [
      { title: "Presence", description: "Notice the breath, the body and your attention before beginning a practice." },
      { title: "Intention", description: "Learn the role of symbols, visualization and a clear purpose in each tradition." },
      { title: "Choice & boundaries", description: "Practise at your own pace, respect consent and choose the path that resonates with you." },
    ],
    systemsEyebrow: "STEP 3 · CHOOSE YOUR REIKI SYSTEM",
    systemsTitle: "Three systems. Three ways to begin.",
    systemsLead: "Each course has its own study material and pathway. Open the full description or go directly to the free introductory initiation.",
    learn: "Explore the system",
    request: "Start free Level 1",
    systemTags: ["Runes · World Tree", "Presence · Connection", "Earth · Kundalini"],
    systemDescriptions: [
      "A runic Reiki tradition inspired by Yggdrasil, the Norse World Tree. Begin with its four introductory streams and discover a much larger, structured curriculum.",
      "A nine-level tradition using the language of vitality, creativity and connection. Its first step is the Spring of Life, approached through guided study and reflection.",
      "A compact three-level system described in its manuals as combining Reiki and Kundalini energy. Begin with Level 1 and the original Paul Crick study material.",
    ],
    journeyEyebrow: "STEP 4 · REQUEST YOUR FREE LEVEL 1",
    journeyTitle: "How to receive an introductory initiation",
    steps: [
      { title: "Choose a system", description: "Open the description, see the levels and decide which approach interests you." },
      { title: "Study the materials", description: "Watch the available lesson, read the guide and answer any preparation questions on that system's page." },
      { title: "Request your free Level 1", description: "Contact Andrey from that course's initiation page to agree on availability and the teacher-guided format." },
    ],
    footerTitle: "Your journey can begin with one small step.",
    footerLead: "Choose one system, or explore all three before deciding. The free first-level offer is an introduction, not automatic certification.",
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
    title: "Принципы энергетической работы",
    subtitle: "Бесплатные инициации в 3 системы Рейки",
    intro: "Один вводный курс — три самостоятельных направления Рейки. Познакомьтесь с основами энергетических практик, сравните системы и выберите бесплатную вводную инициацию первой ступени с преподавателем.",
    start: "Посмотреть 3 системы",
    interactiveStart: "Начать интерактивный курс",
    how: "Как получить инициацию бесплатно",
    heroFacts: ["3 разные системы Рейки", "Бесплатная вводная 1-я ступень", "Без email и регистрации"],
    foundationsEyebrow: "ШАГ 2 · ОСНОВЫ",
    foundationsTitle: "Что лежит в основе энергетической работы?",
    foundationsLead: "В этих традициях энергетическая работа — духовная и созерцательная практика внимания, намерения и символических методов. Начнём с трёх простых принципов.",
    foundations: [
      { title: "Присутствие", description: "Научиться замечать дыхание, ощущения тела и своё внимание перед практикой." },
      { title: "Намерение", description: "Понять, какую роль в разных традициях играют символы, визуализация и ясная цель." },
      { title: "Свобода и границы", description: "Выбирать комфортный темп, уважать согласие и искать подходящую лично вам систему." },
    ],
    systemsEyebrow: "ШАГ 3 · ВЫБЕРИТЕ СИСТЕМУ РЕЙКИ",
    systemsTitle: "Три системы. Три точки входа.",
    systemsLead: "У каждой системы есть собственные материалы и программа. Можно прочитать полное описание или сразу перейти к бесплатной вводной инициации.",
    learn: "Описание системы",
    request: "Бесплатная 1-я ступень",
    systemTags: ["Руны · Мировое Древо", "Присутствие · Связь", "Земля · Кундалини"],
    systemDescriptions: [
      "Руническая традиция Рейки, связанная с образом Иггдрасиля — скандинавского Мирового Древа. На первой ступени изучаются четыре основных потока; дальше — большая последовательная программа.",
      "Девятиступенчатая система, работающая в символическом языке жизненности, творчества и отношений. Первая ступень — «Источник жизни», с материалами и вопросами для изучения.",
      "Компактная система из трёх ступеней, которая в учебной традиции сочетает Рейки и энергию Кундалини. Начните с первой ступени и оригинальной методички Пола Крика.",
    ],
    journeyEyebrow: "ШАГ 4 · ЗАПРОСИТЕ ПЕРВУЮ СТУПЕНЬ",
    journeyTitle: "Как подготовиться к инициации",
    steps: [
      { title: "Выберите систему", description: "Прочитайте описание, посмотрите ступени и решите, что вам ближе." },
      { title: "Изучите материалы", description: "Посмотрите доступные видео, прочитайте методичку и ответьте на вопросы на странице выбранной системы." },
      { title: "Запросите 1-ю ступень", description: "Свяжитесь с Андреем через страницу инициации и согласуйте наличие мест, время и формат." },
    ],
    footerTitle: "Достаточно одного шага, чтобы начать.",
    footerLead: "Выберите одно направление или познакомьтесь со всеми тремя. Бесплатная вводная инициация — не автоматическая выдача сертификата.",
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
    title: "Principios del trabajo energético",
    subtitle: "Iniciaciones GRATIS en 3 sistemas de Reiki",
    intro: "Una introducción y tres caminos diferentes de Reiki. Conoce los principios de la práctica energética consciente, explora cada sistema y elige una iniciación introductoria gratuita de Nivel 1 con el profesor.",
    start: "Explorar los 3 sistemas",
    interactiveStart: "Empezar el curso interactivo (EN)",
    how: "Cómo funciona la iniciación gratis",
    heroFacts: ["3 sistemas diferentes", "Introducción gratuita al Nivel 1", "Sin correo ni registro"],
    foundationsEyebrow: "PASO 2 · FUNDAMENTOS",
    foundationsTitle: "¿Cuáles son los principios del trabajo energético?",
    foundationsLead: "En estas tradiciones, el trabajo energético es una práctica espiritual y contemplativa de atención, intención y métodos simbólicos. Empieza por tres principios sencillos.",
    foundations: [
      { title: "Presencia", description: "Observa la respiración, el cuerpo y la atención antes de comenzar." },
      { title: "Intención", description: "Descubre cómo se utilizan los símbolos, la visualización y el propósito en cada tradición." },
      { title: "Elección y límites", description: "Practica a tu ritmo, respeta el consentimiento y elige la tradición que te atraiga." },
    ],
    systemsEyebrow: "PASO 3 · ELIGE TU SISTEMA REIKI",
    systemsTitle: "Tres sistemas. Tres formas de empezar.",
    systemsLead: "Cada curso incluye su propio material. Puedes leer la descripción o ir a la iniciación introductoria gratuita.",
    learn: "Conocer el sistema",
    request: "Nivel 1 gratis",
    systemTags: ["Runas · Árbol del Mundo", "Presencia · Conexión", "Tierra · Kundalini"],
    systemDescriptions: [
      "Una tradición de Reiki rúnico inspirada en Yggdrasil, el Árbol del Mundo nórdico. Comienza con cuatro corrientes introductorias y un programa más amplio y estructurado.",
      "Un camino de nueve niveles que explora la vitalidad, la creatividad y la conexión. Su primer paso, la Fuente de Vida, se estudia mediante materiales y preguntas guiadas.",
      "Un sistema de tres niveles descrito en la tradición como una combinación de Reiki y energía Kundalini. Empieza con el Nivel 1 y el manual original de Paul Crick.",
    ],
    journeyEyebrow: "PASO 4 · SOLICITA TU NIVEL 1 GRATIS",
    journeyTitle: "Cómo prepararte para una iniciación",
    steps: [
      { title: "Elige un sistema", description: "Conoce la propuesta, los niveles y la tradición que más te interesa." },
      { title: "Estudia los materiales", description: "Mira las lecciones disponibles, lee la guía y contesta las preguntas de preparación." },
      { title: "Solicita el Nivel 1", description: "Contacta con Andrey desde la página de iniciación para confirmar disponibilidad y formato." },
    ],
    footerTitle: "Tu recorrido puede empezar con un pequeño paso.",
    footerLead: "Elige un sistema o explora los tres. La introducción gratuita no equivale a una certificación automática.",
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
    flightLead: "Begin with Andrey's shamanic-flight meditation: guided imagery, attention and the symbolism of the sun. This practice is separate from the three Reiki initiations.",
    flightPending: "The original video is temporarily unavailable in this player.",
    flightVerified: "Original guided meditation · English",
    originalEnglish: "Original video · English audio · click to play",
    explore: "Explore the three Reiki systems",
    description: "Full course description",
    freeStudy: "Level 1 study and initiation details",
    videoTitle: "Watch and choose your Reiki path",
    yggdrasilFirst: "Andrey's original Level 1 introduction · English",
    youtubeLink: "Watch the original on YouTube",
  },
  ru: {
    introduction: "ШАГ 1 · СНАЧАЛА МЕДИТАЦИЯ", flightCta: "Начать с медитации «Полёт к Солнцу»", flightTitle: "Полёт к Солнцу",
    flightLead: "Начните с авторской медитации Андрея — шаманского путешествия к Солнцу через работу с образами и вниманием. Эта практика не заменяет инициацию Рейки.",
    flightPending: "Оригинальное видео временно недоступно в этом проигрывателе.",
    flightVerified: "Авторская медитация · английский язык",
    originalEnglish: "Оригинальное видео · на английском · просмотр по нажатию",
    explore: "Перейти к трём системам Рейки",
    description: "Полное описание системы",
    freeStudy: "Обучение и бесплатная 1-я ступень",
    videoTitle: "Смотрите видео и выбирайте систему",
    yggdrasilFirst: "Оригинальное видео Андрея о 1-й ступени · английский",
    youtubeLink: "Открыть оригинал на YouTube",
  },
  es: {
    introduction: "PASO 1 · EMPIEZA CON LA MEDITACIÓN", flightCta: "Empezar con Vuelo hacia el Sol", flightTitle: "Vuelo hacia el Sol",
    flightLead: "Empieza con la meditación de vuelo chamánico de Andrey: atención, imágenes guiadas y simbolismo del sol. Es distinta de las iniciaciones Reiki.",
    flightPending: "El vídeo original no está disponible temporalmente en este reproductor.",
    flightVerified: "Meditación original · audio en inglés",
    originalEnglish: "Vídeo original · audio en inglés · pulsar para reproducir",
    explore: "Explorar los tres sistemas Reiki",
    description: "Descripción completa del sistema",
    freeStudy: "Materiales e iniciación gratis del Nivel 1",
    videoTitle: "Mira los vídeos y elige tu camino Reiki",
    yggdrasilFirst: "Introducción original de Andrey al Nivel 1 · inglés",
    youtubeLink: "Ver el original en YouTube",
  },
};

const paths = [
  {
    key: "yggdrasil",
    title: "Reiki Yggdrasil",
    image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
    study: "reiki/yggdrasil",
    free: "reiki/yggdrasil/free-initiation",
    badge: "01",
  },
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
] as const;

function academyUrl(locale: PublicLocale, path: string) {
  return "/" + locale + "/academy/" + path;
}

export function PrinciplesOfEnergywork({ locale }: { locale: PublicLocale }) {
  const t = translations[locale];
  const v = videoCopy[locale];
  const flight = englishGuidedMeditations.find((item) => item.key === "flight-to-sun");
  const tantraPractice = englishGuidedMeditations.find((item) => item.key === "tantra-reiki");
  const yggdrasilMeditation = englishGuidedMeditations.find((item) => item.key === "reiki-yggdrasil");
  const kundaliniMeditation = englishGuidedMeditations.find((item) => item.key === "kundalini-reiki");
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrap}>
        <div className={styles.backRow}><Link href={"/" + locale + "/academy"}>← {t.returnAcademy}</Link></div>
        <section className={styles.hero} aria-labelledby="energywork-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <h1 id="energywork-title">{t.title}</h1>
            <p className={styles.heroSubtitle}>{t.subtitle}</p>
            <p className={styles.heroLead}>{t.intro}</p>
            <div className={styles.heroActions}>
              <Link href={"/" + (locale === "es" ? "en" : locale) + "/academy/principles-of-energywork/learn"} className={styles.primaryButton} data-energywork-interactive-course>{t.interactiveStart}<ArrowRight size={19} aria-hidden="true" /></Link>
              <a href="#energywork-flight-to-sun" className={styles.ghostButton}>{v.flightCta}<ArrowDown size={19} aria-hidden="true" /></a>
              <a href="#energywork-systems" className={styles.ghostButton}>{t.start}<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <div className={styles.heroFacts}>{t.heroFacts.map((fact) => <span key={fact}><CheckCircle2 size={17} aria-hidden="true" />{fact}</span>)}</div>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.orbitOuter}><div className={styles.orbitMiddle}><div className={styles.orbitInner}><Sparkles size={47} strokeWidth={1.2} /></div></div></div>
            <span className={styles.orbitTag + " " + styles.orbitTagOne}>YGGDRASIL</span>
            <span className={styles.orbitTag + " " + styles.orbitTagTwo}>TANTRA</span>
            <span className={styles.orbitTag + " " + styles.orbitTagThree}>KUNDALINI</span>
            <span className={styles.orbitCaption}>3 REIKI PATHS · ONE BEGINNING</span>
          </div>
        </section>

        <section className={styles.flightSection} id="energywork-flight-to-sun" aria-labelledby="flight-to-sun-title">
          <div className={styles.sectionHeader}>
            <p className={`${styles.sectionEyebrow} ${styles.sequenceStep}`}>{v.introduction}</p>
            <h2 id="flight-to-sun-title">{v.flightTitle}</h2>
            <p>{v.flightLead}</p>
          </div>
          <div className={styles.flightLayout}>
            <div className={styles.flightMedia}>
              {flight?.youtubeId ? (
                <AcademyVideoPlayer youtubeId={flight.youtubeId} title={flight.title} />
              ) : (
                <div className={styles.sourcePending} data-video-source-pending="flight-to-sun">
                  <Image src={flight?.image ?? "/academy/reiki-yggdrasil/source/toltec-tradition.jpg"} alt="" fill sizes="(max-width: 760px) 100vw, 54vw" />
                  <div className={styles.sourcePendingCopy}>
                    <span>{v.flightTitle}</span>
                    <strong>{v.flightPending}</strong>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.flightDetails}>
              <p className={styles.systemLabel}>{v.flightVerified}</p>
              <h3>{v.flightTitle}</h3>
              <p>{v.flightLead}</p>
              {!flight?.youtubeId ? <p className={styles.flightNotice}>{v.flightPending}</p> : null}
              {flight?.youtubeId ? <a className={styles.courseDetailLink} href={"https://www.youtube.com/watch?v=" + flight.youtubeId} target="_blank" rel="noopener noreferrer">{v.youtubeLink}<ArrowRight size={15} aria-hidden="true" /></a> : null}
              <a className={styles.systemPrimary} href="#energywork-systems">{v.explore}<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className={styles.foundations} aria-labelledby="energywork-foundations">
          <div className={styles.sectionHeader}><p className={`${styles.sectionEyebrow} ${styles.sequenceStep}`}>{t.foundationsEyebrow}</p><h2 id="energywork-foundations">{t.foundationsTitle}</h2><p>{t.foundationsLead}</p></div>
          <div className={styles.foundationGrid}>
            {t.foundations.map((part, index) => {
              const Icon = [Compass, Sparkles, HeartHandshake][index];
              return <article className={styles.foundationCard} key={part.title}><span className={styles.foundationIcon}><Icon size={22} aria-hidden="true" /></span><span className={styles.stepNumber}>0{index + 1}</span><h3>{part.title}</h3><p>{part.description}</p></article>;
            })}
          </div>
        </section>

        <section className={styles.systemsSection} id="energywork-systems" aria-labelledby="energywork-systems-title">
          <div className={styles.sectionHeader}><p className={`${styles.sectionEyebrow} ${styles.sequenceStep}`}>{t.systemsEyebrow}</p><h2 id="energywork-systems-title">{t.systemsTitle}</h2><p>{t.systemsLead}</p></div>
          <div className={styles.systemGrid}>
            {paths.map((system, index) => (
              <article className={styles.systemCard} key={system.key} data-reiki-path={system.key}>
                <div className={styles.systemMedia} aria-label={system.title}>
                  {system.key === "tantra" && tantraPractice?.youtubeId ? (
                    <div className={styles.systemVideo}>
                      <AcademyVideoPlayer youtubeId={tantraPractice.youtubeId} title={tantraPractice.title} />
                    </div>
                  ) : null}
                  {system.key === "yggdrasil" ? (
                    <div className={styles.yggdrasilVideoStack}>
                      {yggdrasilMeditation?.youtubeId ? (
                        <div className={styles.systemVideo}>
                          <AcademyVideoPlayer youtubeId={yggdrasilMeditation.youtubeId} title={yggdrasilMeditation.title} />
                        </div>
                      ) : null}
                      <div className={styles.systemVideo}>
                        <AcademyVideoPlayer youtubeId="DYo-fG-SyKw" title={v.yggdrasilFirst} />
                      </div>
                    </div>
                  ) : null}
                  {system.key === "kundalini" && kundaliniMeditation?.youtubeId ? (
                    <div className={styles.systemVideo}>
                      <AcademyVideoPlayer youtubeId={kundaliniMeditation.youtubeId} title={kundaliniMeditation.title} />
                    </div>
                  ) : null}
                  <small className={styles.originalLanguage}>{v.originalEnglish}</small>
                </div>
                <div className={styles.systemBody}>
                  <p className={styles.systemLabel}>{locale === "ru" ? "Система" : locale === "es" ? "Sistema" : "System"} {system.badge} · {t.systemTags[index]}</p>
                  <h3>{system.title}</h3>
                  <p className={styles.systemDescription}>{t.systemDescriptions[index]}</p>
                  {system.key === "kundalini" && kundaliniMeditation?.youtubeId ? <a className={styles.courseDetailLink} href={"https://www.youtube.com/watch?v=" + kundaliniMeditation.youtubeId} target="_blank" rel="noopener noreferrer">{v.youtubeLink}<ArrowRight size={15} aria-hidden="true" /></a> : null}
                  <div className={styles.courseLinks}>
                    <Link className={styles.systemSecondary} href={academyUrl(locale, system.study)}>{v.description}<ArrowRight size={16} aria-hidden="true" /></Link>
                    <Link className={styles.courseDetailLink} href={academyUrl(locale, system.free)}>{v.freeStudy}<ArrowRight size={15} aria-hidden="true" /></Link>
                  </div>
                  <EnergyworkReikiCapture locale={locale} course={system.key} />
                </div>
                {system.key === "yggdrasil" ? <div className={styles.archiveRow}><EnergyworkVideoArchive locale={locale} /></div> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.howSection} id="energywork-how" aria-labelledby="energywork-how-title">
          <div className={styles.sectionHeader}><p className={`${styles.sectionEyebrow} ${styles.sequenceStep}`}>{t.journeyEyebrow}</p><h2 id="energywork-how-title">{t.journeyTitle}</h2></div>
          <div className={styles.journeyGrid}>{t.steps.map((step, i) => <div className={styles.journeyStep} key={step.title}><strong>0{i + 1}</strong><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
        </section>
        <section className={styles.finalCta}>
          <div><p className={styles.eyebrow}>{t.subtitle}</p><h2>{t.footerTitle}</h2><p>{t.footerLead}</p></div>
          <a href="#energywork-systems" className={styles.primaryButton}>{t.start}<ArrowRight size={18} aria-hidden="true" /></a>
        </section>
        <p className={styles.disclaimer}>{t.notice}</p>
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
            <div className={styles.heroActions}><a className={styles.primaryButton} href="#kundalini-free-request">{k.requestButton}<ArrowDown size={17} /></a><Link className={styles.ghostButton} href={studyUrl}>{k.courseLink}<ArrowRight size={17} /></Link></div>
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
          <ContactChannelChooser locale={locale} whatsappUrl={requestUrl} className={styles.requestButton} attributes={{ "data-reiki-free-request": "kundalini" }} />
          <small>{k.note}</small>
        </section>
        <div className={styles.otherPaths}><Link href={academyUrl(locale, "principles-of-energywork")}>{k.otherPaths}<ArrowRight size={17} aria-hidden="true" /></Link></div>
        <p className={styles.disclaimer}>{t.notice}</p>
      </div>
    </main>
  );
}
