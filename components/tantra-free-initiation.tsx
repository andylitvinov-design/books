import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, BookOpen, Heart, PlayCircle, Sparkles, Check, Feather, ShieldCheck, Video, Flower2, ChevronDown } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TantraInitiationForm, tantraInitiationWhatsAppUrl } from "@/components/tantra-initiation-form";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { metadataBaseFor } from "@/data/site-metadata";
import { formatReikiLevelPrice } from "@/lib/academy/reiki-level-pricing";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./tantra-free-initiation.module.css";

/**
 * Dedicated entry to the original Tantra Reiki programme.
 * This page uses the owner's seven approved study questions, preserves the
 * existing teacher-led enquiry flow and embeds the already verified recording.
 * It does NOT automatically award attunements or publish a new video.
 */
const copy = {
  en: {
    back: "Back to Tantra Reiki", nav: ["Discover", "Video", "How to", "Materials", "Questions", "Choose", "Apply"],
    eyebrow: "HOLISTIC HOUSE ACADEMY · TANTRA REIKI · LEVEL ONE",
    heroTitle: "Free Tantra Reiki Initiation",
    heroLead: "Discover an inviting practice of presence, aliveness and connection. Begin with Andrey’s original video, explore what resonates with you and take your first step at your own pace.",
    heroTag: "Your first initiation begins here",
    freeCta: "Explore the free initiation", watchCta: "Watch Andrey's practice",
    heroMeta: ["Level 1 · Spring of Life", "Seven simple study questions", "Teacher-guided initiation"],
    visualCaption: "The art of connection", visualLabel: "TANTRA REIKI · HOLISTIC HOUSE",
    introEyebrow: "01 / THE SYSTEM", introTitle: "What is Tantra Reiki?",
    introLead: "In the course's spiritual language, the Tantra Reiki flow brings together aliveness, creativity and a more attentive relationship with yourself and others. It is a practice of exploration, not a promise of outcomes.",
    pillars: [
      { title: "Feel", text: "Explore your own sensations, attention and vitality through guided practice." },
      { title: "Connect", text: "Approach relationships and shared practice with openness, choice and consent." },
      { title: "Grow", text: "Follow nine levels that deepen the original stream through different forms of study." },
    ],
    choiceEyebrow: "06 / CHOOSE YOUR FORMAT", choiceTitle: "Choose your Level 1 path",
    choiceLead: "Three ways to begin Tantra Reiki — from a free introduction to personal guidance with Andrey.",
    choiceMotif: "PRESENCE · LOVE · CONNECTION",
    freeFlag: "FREE INTRODUCTORY OFFER", freeTitle: "Start for free",
    freeText: "Watch the practice, read the materials and answer seven questions. Ask Andrey about a free guided introduction.",
    freePrice: "€0", freeDuration: "INTRO", freeButton: "How to start for free",
    personalFlag: "ONE-TO-ONE ONLINE", personalTitle: "Personal distance initiation",
    personalText: "A personal online Level 1 initiation with Andrey, with time for your questions.",
    personalDuration: "30 MIN", personalButton: "Enquire in WhatsApp or Telegram",
    combinedFlag: "PERSONAL SESSION + INITIATION", combinedTitle: "Personal session + initiation",
    combinedText: "We explore your situation and check for solutions. Includes your Level 1 initiation.",
    combinedPrice: "€100", combinedDuration: "60 MIN", combinedButton: "Book in WhatsApp or Telegram",
    benefits: ["Respectful space", "No prior experience needed", "Personal guidance by Andrey"],
    availability: "Sessions and free introductory availability are confirmed personally. Reading or submitting answers does not itself grant an initiation.",
    guideEyebrow: "03 / YOUR PATH", guideTitle: "How to request your free Tantra Reiki initiation",
    guideLead: "Five steps: watch the practice, share your impressions, study the materials and answer the questions. A personal distance initiation is optional.",
    guideSteps: [
      { title: "Watch the video", text: "Explore the original Tantra Reiki practice with Andrey." },
      { title: "Write a short review", text: "Share whether you could tune in to the flow and what you experienced." },
      { title: "Read the materials", text: "Learn about Level 1 and all nine stages." },
      { title: "Answer 7 questions", text: "Prepare seven short answers to the course questions." },
      { title: "Request your free introduction", text: "Share your answers and ask Andrey about a teacher-guided first step." },
    ],
    questionsEyebrow: "05 / YOUR QUESTIONS", questionsTitle: "7 questions to get your free initiation", questionsShow: "Show 7 questions", questionsHide: "Hide questions",
    questionsLead: "Read Andrey's original Tantra Reiki materials and answer in your own words. One to three sentences per question is enough.",
    questions: [
      "Who created the Tantra Reiki system, and what is the source of its energy?",
      "What is the main purpose of the Tantra Reiki flow? Why is it needed, and what does it offer a person?",
      "For what purposes can Tantra Reiki be used?",
      "Which culture and tradition form the foundation of Tantra Reiki?",
      "How are Levels 1–3, 4–6 and 7–9 connected?",
      "At which levels do students learn to create mandalas and work with artifacts?",
      "After which level can someone become a Tantra Reiki Master and teach and initiate others?",
    ],
    questionAction: "Send 7 answers in WhatsApp or Telegram", questionNote: "These are study questions, not a medical or psychological assessment.",
    videoEyebrow: "02 / SEE THE PRACTICE", videoTitle: "Tantra Reiki, guided by Andrey",
    videoLead: "Watch Andrey's original Tantra Reiki Practice recording. This is the same recording already linked to the course, not an AI-generated or substitute video.",
    videoCaption: "Original recording · English · click to play", videoNote: "The video is an introduction to practice, not an automatic initiation.",
    resourcesEyebrow: "04 / EXPLORE", resourcesTitle: "Everything for your first step",
    resourcesLead: "The original texts, the nine-level course and the mobile PDF guide are all available here.",
    resources: [
      { title: "Read the 9-level programme", subtitle: "Explore the first level and the complete structure" },
      { title: "Original author research", subtitle: "The deeper meaning of the nine stages" },
      { title: "Full teaching programme", subtitle: "Attunements, mandalas, artifacts and practice" },
      { title: "Download the Tantra Reiki PDF", subtitle: "Course overview and first-level study guide" },
    ],
    formEyebrow: "07 / WHATSAPP · TELEGRAM", formTitle: "Ready to begin?",
    formLead: "Free introduction, personal initiation, a longer individual session or your seven answers — all directly through WhatsApp or Telegram.",
    disclaimer: "Tantra Reiki is presented here as a spiritual and reflective tradition. Its descriptions of energies or effects are not established medical facts. It does not replace healthcare or guarantee results.",
    footer: "Return to the full Tantra Reiki course",
  },
  ru: {
    back: "К курсу Тантра Рейки", nav: ["Система", "Видео", "Как получить", "Материалы", "Вопросы", "Выбор", "Заявка"],
    eyebrow: "HOLISTIC HOUSE ACADEMY · ТАНТРА РЕЙКИ · 1-Я СТУПЕНЬ",
    heroTitle: "Бесплатная инициация Тантра Рейки",
    heroLead: "Откройте практику внимания, жизненности и внутренней связи. Посмотрите оригинальное видео Андрея, почувствуйте, что вам близко, и начните знакомство с первой ступенью в своём темпе.",
    heroTag: "Ваша первая инициация начинается здесь",
    freeCta: "Получить первую ступень бесплатно", watchCta: "Смотреть практику Андрея",
    heroMeta: ["1-я ступень · Родник Жизни", "7 простых вопросов", "Инициация с преподавателем"],
    visualCaption: "Искусство соединения", visualLabel: "ТАНТРА РЕЙКИ · HOLISTIC HOUSE",
    introEyebrow: "01 / О СИСТЕМЕ", introTitle: "Что такое Тантра Рейки?",
    introLead: "В авторском описании поток Тантра Рейки объединяет жизненную силу, любовь и творчество. Практика помогает исследовать контакт с собой и другими людьми — без обещаний гарантированного результата.",
    pillars: [
      { title: "Чувствовать", text: "Исследовать ощущения, внимание и жизненную энергию в практике." },
      { title: "Соединяться", text: "Учиться контакту с собой и другими с уважением к выбору и границам." },
      { title: "Развиваться", text: "Последовательно изучать один поток через девять ступеней системы." },
    ],
    choiceEyebrow: "06 / ВЫБОР ФОРМАТА", choiceTitle: "Три пути к первой ступени",
    choiceLead: "Выберите бесплатное знакомство, личную инициацию или занятие с разбором вашей ситуации.",
    choiceMotif: "ПРИСУТСТВИЕ · ЛЮБОВЬ · СВЯЗЬ",
    freeFlag: "БЕСПЛАТНОЕ ЗНАКОМСТВО", freeTitle: "Начните бесплатно",
    freeText: "Посмотрите практику, прочитайте материалы, ответьте на семь вопросов и запросите бесплатную вводную инициацию.",
    freePrice: "0 €", freeDuration: "ВВОДНАЯ", freeButton: "Как начать бесплатно",
    personalFlag: "ИНДИВИДУАЛЬНО ОНЛАЙН", personalTitle: "Личная дистанционная инициация",
    personalText: "Индивидуальная онлайн-инициация первой ступени с Андреем и ответы на ваши вопросы.",
    personalDuration: "30 МИН", personalButton: "Написать в WhatsApp или Telegram",
    combinedFlag: "ЛИЧНАЯ СЕССИЯ + ИНИЦИАЦИЯ", combinedTitle: "Личная сессия + инициация",
    combinedText: "Разберём вашу ситуацию, поищем возможные решения и проведём инициацию первой ступени.",
    combinedPrice: "100 €", combinedDuration: "60 МИН", combinedButton: "Записаться в WhatsApp или Telegram",
    benefits: ["Уважение и границы", "Без предварительного опыта", "Лично с Андреем"],
    availability: "Возможность бесплатной встречи, даты и формат подтверждает Андрей. Чтение материалов и ответы на вопросы сами по себе не являются инициацией.",
    guideEyebrow: "03 / КАК ПОЛУЧИТЬ", guideTitle: "Как получить Тантра Рейки бесплатно",
    guideLead: "Пять шагов: посмотрите видео, поделитесь ощущениями, изучите материалы и ответьте на вопросы. Личная дистанционная инициация — по желанию.",
    guideSteps: [
      { title: "Посмотрите видео", text: "Познакомьтесь с оригинальной практикой Тантра Рейки от Андрея." },
      { title: "Напишите отзыв", text: "Расскажите, удалось ли настроиться на поток и что вы ощутили." },
      { title: "Прочитайте материалы", text: "Изучите первую ступень и структуру всех девяти ступеней." },
      { title: "Ответьте на 7 вопросов", text: "Подготовьте короткие ответы по материалам системы." },
      { title: "Запросите бесплатное знакомство", text: "Отправьте ответы Андрею и договоритесь о вводной встрече при наличии времени." },
    ],
    questionsEyebrow: "05 / ВОПРОСЫ", questionsTitle: "7 вопросов для бесплатной инициации", questionsShow: "Показать 7 вопросов", questionsHide: "Свернуть вопросы",
    questionsLead: "Прочитайте авторские материалы о Тантра Рейки и ответьте своими словами. Достаточно 1–3 предложений на каждый вопрос.",
    questions: [
      "Кто является создателем системы Тантра Рейки и каков источник её энергии?",
      "Какова главная цель потока Тантра Рейки? Для чего он нужен и что даёт человеку?",
      "Для каких целей можно использовать систему Тантра Рейки?",
      "Какая культура и традиция лежат в основе системы Тантра Рейки?",
      "Как связаны между собой ступени 1–3, 4–6 и 7–9?",
      "На каких ступенях Тантра Рейки мы учимся создавать мандалы и работать с артефактами?",
      "После какой ступени человек становится Мастером Тантра Рейки и получает право обучать и инициировать других?",
    ],
    questionAction: "Отправить 7 ответов в WhatsApp или Telegram", questionNote: "Это вопросы по учебному материалу, а не медицинский или психологический тест.",
    videoEyebrow: "02 / ВИДЕО", videoTitle: "Практика Тантра Рейки с Андреем",
    videoLead: "Посмотрите оригинальную запись «Tantra Reiki Practice», которую Андрей разместил в материалах основного курса. Это его собственное видео, не новый ИИ-ролик.",
    videoCaption: "Оригинальное видео · на английском · запуск по нажатию", videoNote: "Видео знакомит с практикой, но не заменяет личную инициацию.",
    resourcesEyebrow: "04 / МАТЕРИАЛЫ", resourcesTitle: "Всё для знакомства с системой",
    resourcesLead: "Авторские тексты, описание девяти ступеней и PDF-методичка доступны на сайте.",
    resources: [
      { title: "Все 9 ступеней Тантра Рейки", subtitle: "Первая ступень и структура всей системы" },
      { title: "Полное авторское исследование", subtitle: "Смысл и связь девяти ступеней" },
      { title: "Полная программа обучения", subtitle: "Настройки, мандалы, артефакты и практика" },
      { title: "Скачать PDF по Тантра Рейки", subtitle: "Описание системы и материалы первой ступени" },
    ],
    formEyebrow: "07 / WHATSAPP · TELEGRAM", formTitle: "Готовы начать?",
    formLead: "Бесплатное знакомство, личная инициация, расширенная сессия или ваши семь ответов — всё через WhatsApp или Telegram.",
    disclaimer: "Тантра Рейки здесь представлена как духовная и созерцательная традиция. Описания потоков и эффектов относятся к учению, не являются доказанными медицинскими фактами и не заменяют медицинскую помощь.",
    footer: "Вернуться к полной программе Тантра Рейки",
  },
  es: {
    back: "Volver a Tantra Reiki", nav: ["Sistema", "Vídeo", "Cómo empezar", "Materiales", "Preguntas", "Opciones", "Solicitud"],
    eyebrow: "HOLISTIC HOUSE ACADEMY · TANTRA REIKI · NIVEL UNO",
    heroTitle: "Iniciación gratis de Tantra Reiki",
    heroLead: "Descubre una práctica amable de presencia, vitalidad y conexión. Empieza con el vídeo original de Andrey y explora el primer nivel a tu propio ritmo.",
    heroTag: "Tu primera iniciación comienza aquí",
    freeCta: "Solicitar la iniciación gratis", watchCta: "Ver la práctica de Andrey",
    heroMeta: ["Nivel 1 · Manantial de vida", "7 preguntas sencillas", "Iniciación con profesor"],
    visualCaption: "El arte de conectar", visualLabel: "TANTRA REIKI · HOLISTIC HOUSE",
    introEyebrow: "01 / EL SISTEMA", introTitle: "¿Qué es Tantra Reiki?",
    introLead: "En el lenguaje espiritual del curso, Tantra Reiki reúne vitalidad, amor y creatividad. Es una invitación a explorar la conexión contigo y con los demás, sin promesas de resultados.",
    pillars: [
      { title: "Sentir", text: "Explorar las sensaciones, la atención y la vitalidad." },
      { title: "Conectar", text: "Cultivar una relación consciente basada en la elección y el consentimiento." },
      { title: "Crecer", text: "Conocer los nueve niveles que profundizan el mismo flujo." },
    ],
    choiceEyebrow: "06 / ELIGE TU FORMATO", choiceTitle: "Tres caminos al nivel 1",
    choiceLead: "Elige entre una introducción gratis, una iniciación personal y una sesión individual con Andrey.",
    choiceMotif: "PRESENCIA · AMOR · CONEXIÓN",
    freeFlag: "INTRODUCCIÓN GRATUITA", freeTitle: "Empieza gratis",
    freeText: "Mira la práctica, lee los materiales, responde siete preguntas y solicita una introducción guiada gratuita.",
    freePrice: "0 €", freeDuration: "INICIO", freeButton: "Cómo empezar gratis",
    personalFlag: "INDIVIDUAL ONLINE", personalTitle: "Iniciación personal a distancia",
    personalText: "Iniciación online individual de nivel 1 con Andrey y tiempo para tus preguntas.",
    personalDuration: "30 MIN", personalButton: "Consultar por WhatsApp o Telegram",
    combinedFlag: "SESIÓN PERSONAL + INICIACIÓN", combinedTitle: "Sesión personal + iniciación",
    combinedText: "Exploramos tu situación y buscamos posibles soluciones. Incluye tu iniciación de nivel 1.",
    combinedPrice: "100 €", combinedDuration: "60 MIN", combinedButton: "Reservar por WhatsApp o Telegram",
    benefits: ["Espacio respetuoso", "Sin experiencia previa", "Guía personal de Andrey"],
    availability: "La disponibilidad y la fecha se confirman personalmente. Leer o enviar respuestas no constituye una iniciación.",
    guideEyebrow: "03 / CÓMO EMPEZAR", guideTitle: "Cómo recibir Tantra Reiki gratis",
    guideLead: "Cinco pasos: mira la práctica, comparte tus impresiones, lee los materiales y responde las preguntas. La iniciación personal a distancia es opcional.",
    guideSteps: [
      { title: "Mira el vídeo", text: "Conoce la práctica original de Tantra Reiki con Andrey." },
      { title: "Escribe una reseña", text: "Cuenta si pudiste conectar con el flujo y qué experimentaste." },
      { title: "Lee los materiales", text: "Explora el primer nivel y las nueve etapas." },
      { title: "Responde 7 preguntas", text: "Prepara respuestas breves sobre los materiales." },
      { title: "Solicita una introducción gratuita", text: "Comparte las respuestas y consulta la disponibilidad de Andrey." },
    ],
    questionsEyebrow: "05 / PREGUNTAS", questionsTitle: "7 preguntas para recibir tu iniciación gratuita", questionsShow: "Ver las 7 preguntas", questionsHide: "Ocultar preguntas",
    questionsLead: "Lee los materiales originales de Andrey. Responde con tus palabras; bastan de 1 a 3 frases por pregunta.",
    questions: [
      "¿Quién creó el sistema Tantra Reiki y cuál es el origen de su energía?",
      "¿Cuál es el objetivo principal del flujo Tantra Reiki? ¿Para qué sirve y qué aporta?",
      "¿Para qué fines puede utilizarse Tantra Reiki?",
      "¿Qué cultura y tradición sustentan el sistema Tantra Reiki?",
      "¿Cómo se relacionan los niveles 1–3, 4–6 y 7–9?",
      "¿En qué niveles se aprende a crear mandalas y trabajar con artefactos?",
      "¿Después de qué nivel se puede ser Maestro de Tantra Reiki e iniciar y enseñar a otros?",
    ],
    questionAction: "Enviar 7 respuestas por WhatsApp o Telegram", questionNote: "Preguntas de estudio, no una evaluación médica.",
    videoEyebrow: "02 / VÍDEO", videoTitle: "Tantra Reiki con Andrey",
    videoLead: "Mira la grabación original Tantra Reiki Practice incluida en los materiales del curso.",
    videoCaption: "Grabación original · inglés · pulsa para reproducir", videoNote: "El vídeo es una introducción, no una iniciación automática.",
    resourcesEyebrow: "04 / MATERIALES", resourcesTitle: "Materiales para comenzar",
    resourcesLead: "Lee los textos originales, explora los nueve niveles y descarga la guía PDF.",
    resources: [
      { title: "Programa de nueve niveles", subtitle: "Primer nivel y estructura completa" },
      { title: "Investigación original de Andrey", subtitle: "El significado de las nueve etapas" },
      { title: "Programa de formación completo", subtitle: "Sintonizaciones, mandalas, artefactos y prácticas" },
      { title: "Descarga la guía PDF", subtitle: "Descripción del sistema y primer nivel" },
    ],
    formEyebrow: "07 / WHATSAPP · TELEGRAM", formTitle: "¿Listo para comenzar?",
    formLead: "Pide la introducción gratuita, una iniciación personal, la sesión ampliada o envía tus siete respuestas por WhatsApp o Telegram.",
    disclaimer: "Tantra Reiki se presenta como tradición espiritual y reflexiva. Las afirmaciones sobre energía no son hechos médicos demostrados ni sustituyen la atención sanitaria.",
    footer: "Volver al curso completo Tantra Reiki",
  },
} as const;

const faqCopy = {
  en: {
    title: "Free Tantra Reiki initiation: common questions",
    items: [
      { question: "Is the Tantra Reiki Level 1 introduction really free?", answer: "Yes. You can request a free teacher-guided introduction, subject to Andrey's availability. Watching a video or sending answers does not itself confer an initiation." },
      { question: "Can I begin Tantra Reiki online?", answer: "Yes. Begin with the original English practice video, the study materials and seven questions. Arrange any teacher-led introduction directly with Andrey via WhatsApp." },
      { question: "Do I need previous Reiki experience?", answer: "No previous Reiki experience is required for the introductory study path. A personal online initiation is also available as an optional paid session." },
    ],
  },
  ru: {
    title: "Частые вопросы о бесплатной инициации Тантра Рейки",
    items: [
      { question: "Можно ли получить первую ступень Тантра Рейки бесплатно?", answer: "Вы можете запросить бесплатную вводную инициацию с преподавателем, если есть свободное время. Просмотр видео и ответы сами по себе не заменяют инициацию." },
      { question: "Можно ли начать обучение Тантра Рейки онлайн?", answer: "Да. Сначала изучите видео, материалы и семь вопросов. Для проведения вводной инициации напишите Андрею напрямую в WhatsApp." },
      { question: "Нужен ли предыдущий опыт Рейки?", answer: "Нет, для вводного знакомства опыт не обязателен. По желанию можно заказать индивидуальную дистанционную инициацию." },
    ],
  },
  es: {
    title: "Preguntas frecuentes sobre la iniciación gratis de Tantra Reiki",
    items: [
      { question: "¿La introducción al Nivel 1 de Tantra Reiki es gratuita?", answer: "Puedes solicitar una introducción guiada gratuita, según la disponibilidad de Andrey. Ver el vídeo o enviar respuestas no constituye por sí solo una iniciación." },
      { question: "¿Puedo empezar Tantra Reiki online?", answer: "Sí. Comienza con el vídeo original en inglés, los materiales y las siete preguntas. Coordina la introducción con Andrey directamente por WhatsApp." },
      { question: "¿Necesito experiencia previa en Reiki?", answer: "No se requiere experiencia previa para el estudio introductorio. También existe una opción personal online de pago." },
    ],
  },
} as const;

/* Place real practice and benefits ahead of prices and application questions. */
const benefitImages = [
  "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
  "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  "/images/holistic-house/hero-olive-incense.webp",
] as const;
const steps = ["intro", "tantra-practice-video", "how-to", "course-materials", "study-questions", "initiation-choices", "tantra-apply"] as const;

export function TantraFreeInitiation({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const faq = faqCopy[locale];
  const origin = metadataBaseFor().origin;
  const pageUrl = origin + "/" + locale + "/academy/reiki/tantra-reiki/free-initiation";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": pageUrl, url: pageUrl, name: t.heroTitle, description: t.heroLead, inLanguage: locale,
        isPartOf: { "@type": "WebSite", name: "Holistic House", url: origin } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Academy", item: origin + "/" + locale + "/academy" },
        { "@type": "ListItem", position: 2, name: "Tantra Reiki", item: origin + "/" + locale + "/academy/reiki/tantra-reiki" },
        { "@type": "ListItem", position: 3, name: t.heroTitle, item: pageUrl },
      ] },
    ],
  };
  const root = "/" + locale + "/academy/reiki/tantra-reiki";
  const video = englishGuidedMeditations.find((item) => item.key === "tantra-reiki");
  const guideLinks = [
    "#tantra-practice-video",
    "#apply-feedback",
    "#course-materials",
    "#study-questions",
    "#tantra-apply",
  ];
  const links = [
    root + "#tantra-levels",
    root + "#tantra-original-author-research",
    root + "#tantra-original-master-programme",
    "/api/academy/reiki-guide?course=tantra&locale=" + locale,
  ];
  return (
    <main className={"academy-reading-shell academy-reading-shell--wide " + styles.shell} lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <article className={styles.page}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        <nav className={styles.subnav} aria-label={t.heroTag}>
          <Link className={styles.back} href={root}><ArrowRight className={styles.backArrow} size={15} aria-hidden="true" />{t.back}</Link>
          <div className={styles.progress}>
            {steps.map((id, index) => <a href={"#" + id} key={id} title={t.nav[index]} aria-label={t.nav[index]}>{String(index + 1).padStart(2, "0")}</a>)}
          </div>
        </nav>

        <section id="intro" className={styles.hero} aria-labelledby="tantra-landing-title">
          <div className={styles.heroCopy}>
            <div className={styles.heroChip}><Sparkles size={15} aria-hidden="true" />{t.heroTag}</div>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="tantra-landing-title">{t.heroTitle}</h1>
            <p className={styles.heroLead}>{t.heroLead}</p>
            <div className={styles.heroActions}>
              <a href="#how-to" className={styles.buttonLight}>{t.freeCta}<ArrowRight aria-hidden="true" size={18}/></a>
              <a href="#tantra-practice-video" className={styles.buttonGhost}><PlayCircle size={18} aria-hidden="true"/>{t.watchCta}</a>
            </div>
            <div className={styles.heroStats}>{t.heroMeta.map((item) => <span key={item}><Check size={14} aria-hidden="true"/>{item}</span>)}</div>
            <Link className={styles.freeCourseBridge} href={"/" + locale + "/academy/reiki/free-practitioner-course"}>
              {locale === "ru" ? "Хотите сначала попробовать? Бесплатный курс из 5 уроков" : locale === "es" ? "¿Quieres probar primero? Curso gratis de 5 lecciones" : "Want to try it first? Take the free 5-lesson course"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.orbitOuter} aria-hidden="true" />
            <div className={styles.orbitInner} aria-hidden="true" />
            <div className={styles.portraitFrame}>
              <StaticPortrait src="/images/holistic-house/andy-about.png" alt={locale === "ru" ? "Андрей, преподаватель Тантра Рейки" : locale === "es" ? "Andrey, profesor de Tantra Reiki" : "Andrey, Tantra Reiki teacher"} fill sizes="(max-width: 760px) 74vw, 36vw" priority className={styles.portrait} />
            </div>
            <div className={styles.artStamp}><Image src="/images/holistic-house/tantra-reiki-yin-yang-mark.svg" width={46} height={46} alt="" /><span>{t.visualLabel}</span></div>
            <div className={styles.artLabel}>{t.visualCaption}<span aria-hidden="true">✦</span></div>
          </div>
        </section>

        <section className={styles.introduction} aria-labelledby="tantra-about-intro">
          <div className={styles.introHeading}><p className={styles.eyebrow}>{t.introEyebrow}</p><h2 id="tantra-about-intro">{t.introTitle}</h2><p>{t.introLead}</p></div>
          <div className={styles.pillarStories}>
            {t.pillars.map((item, index) => (
              <article className={styles.pillarStory} key={item.title}>
                <div className={styles.pillarVisual}><Image src={benefitImages[index]} alt="" fill sizes="(max-width: 760px) 100vw, 54vw" /></div>
                <div className={styles.pillarStoryCopy}>
                  <span className={styles.pillarStep}>0{index + 1} / 03</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <a href="#tantra-practice-video">{t.watchCta}<PlayCircle size={18} aria-hidden="true"/></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="tantra-practice-video" className={styles.section} aria-labelledby="tantra-video-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.videoEyebrow}</p><h2 id="tantra-video-title">{t.videoTitle}</h2><p>{t.videoLead}</p></header>
          <div className={styles.videoLayout}>
            <div className={styles.videoCanvas}>{video?.youtubeId ? <AcademyVideoPlayer youtubeId={video.youtubeId} title={video.title} /> : null}</div>
            <div className={styles.videoAside}><div className={styles.videoAsideIcon}><PlayCircle size={28} aria-hidden="true"/></div><p>{t.videoCaption}</p><strong>{video?.title ?? "Tantra Reiki Practice"}</strong><small>{t.videoNote}</small></div>
          </div>
        </section>

        <section id="how-to" className={styles.howSection} aria-labelledby="tantra-how-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.guideEyebrow}</p><h2 id="tantra-how-title">{t.guideTitle}</h2><p>{t.guideLead}</p></header>
          <div className={styles.guidedJourney}>
            <div className={styles.journeyVisual}><Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill sizes="(max-width: 760px) 100vw, 43vw" /></div>
            <div className={styles.howGrid}>
              {t.guideSteps.map((step, index) => (
                <a key={step.title} className={styles.howCard} data-personal={index === 4} href={guideLinks[index]}>
                  <span className={styles.howNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3><p>{step.text}</p>
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="course-materials" className={styles.resourcesSection} aria-labelledby="tantra-materials-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.resourcesEyebrow}</p><h2 id="tantra-materials-title">{t.resourcesTitle}</h2><p>{t.resourcesLead}</p></header>
          <div className={styles.materialsStory}>
            <div className={styles.materialVisual}><Image src="/images/holistic-house/tantra-reiki-yin-yang-cover.svg" alt="" fill sizes="(max-width: 760px) 100vw, 40vw" /></div>
            <div className={styles.resourceGrid}>
              {t.resources.map((item, index) => {
                const href = links[index];
                const Icon = index === 3 ? ArrowDown : BookOpen;
                return <Link key={item.title} href={href} className={styles.resourceLink}>
                  <span className={styles.resourceNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.resourceText}><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                  <span className={styles.resourceIcon}><Icon size={19} aria-hidden="true"/></span>
                </Link>;
              })}
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="tantra-faq-title">
          <h2 id="tantra-faq-title">{faq.title}</h2>
          <div className={styles.faqList}>
            {faq.items.map((item) => (
              <details className={styles.faqItem} key={item.question}>
                <summary>{item.question}<ChevronDown size={17} aria-hidden="true" /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="study-questions" className={styles.questionsSection} aria-labelledby="tantra-questions-title">
          <details className={styles.questionsDisclosure}>
            <summary className={styles.questionsSummary}>
              <span className={styles.questionsSummaryCopy}>
                <span className={styles.questionsSummaryEyebrow}>{t.questionsEyebrow}</span>
                <span className={styles.questionsSummaryTitle} role="heading" aria-level={2} id="tantra-questions-title">{t.questionsTitle}</span>
              </span>
              <span className={styles.questionsSummaryToggle}>
                <span className={styles.questionsShowLabel}>{t.questionsShow}</span>
                <span className={styles.questionsHideLabel}>{t.questionsHide}</span>
                <ChevronDown size={22} aria-hidden="true"/>
              </span>
            </summary>
            <div className={styles.questionsContent}>
              <p className={styles.questionsLead}>{t.questionsLead}</p>
              <ol className={styles.questionGrid}>
                {t.questions.map((q, index) => <li key={index}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{q}</p></li>)}
              </ol>
              <div className={styles.questionFooter}><span>{t.questionNote}</span><ContactChannelChooser locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "answers")} className={styles.buttonWine} label={t.questionAction}/></div>
            </div>
          </details>
        </section>

        <section id="initiation-choices" className={styles.section + " " + styles.choiceSection} aria-labelledby="tantra-choices-title">
          <header className={styles.sectionHeading + " " + styles.choiceHeading}>
            <div>
              <p className={styles.eyebrow}>{t.choiceEyebrow}</p>
              <h2 id="tantra-choices-title">{t.choiceTitle}</h2>
              <p>{t.choiceLead}</p>
            </div>
            <div className={styles.choiceOrnament} aria-hidden="true">
              <Flower2 size={48} strokeWidth={1.15} />
              <span>{t.choiceMotif}</span>
            </div>
          </header>
          <div className={styles.choiceGrid} data-tantra-three-offers>
            <article className={styles.choiceFree} data-tantra-offer="free">
              <div className={styles.offerTop}>
                <span className={styles.offerIcon}><BookOpen size={23} strokeWidth={1.6} aria-hidden="true" /></span>
                <div className={styles.offerCopy}>
                  <span className={styles.offerFlag}>{t.freeFlag}</span>
                  <h3>{t.freeTitle}</h3>
                  <p>{t.freeText}</p>
                </div>
                <span className={styles.pricePill}><strong>{t.freePrice}</strong><small>{t.freeDuration}</small></span>
              </div>
              <a className={styles.buttonWine + " " + styles.offerButton} href="#how-to">{t.freeButton}<ArrowRight size={17} aria-hidden="true"/></a>
            </article>
            <article className={styles.choicePersonal} data-tantra-offer="personal">
              <div className={styles.offerTop}>
                <span className={styles.offerIcon}><Video size={23} strokeWidth={1.6} aria-hidden="true" /></span>
                <div className={styles.offerCopy}>
                  <span className={styles.offerFlag}>{t.personalFlag}</span>
                  <h3>{t.personalTitle}</h3>
                  <p>{t.personalText}</p>
                </div>
                <span className={styles.pricePill} aria-label={formatReikiLevelPrice("tantra", locale)}>
                  <strong>{formatReikiLevelPrice("tantra", locale).split(" / ")[0]}</strong>
                  <small>{t.personalDuration}</small>
                </span>
              </div>
              <ContactChannelChooser locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "personal")} className={styles.buttonNavy + " " + styles.offerButton} label={t.personalButton}/>
            </article>
            <article className={styles.choiceCombined} data-tantra-offer="session">
              <div className={styles.offerTop}>
                <span className={styles.offerIcon}><Flower2 size={25} strokeWidth={1.6} aria-hidden="true" /></span>
                <div className={styles.offerCopy}>
                  <span className={styles.offerFlag}>{t.combinedFlag}</span>
                  <h3>{t.combinedTitle}</h3>
                  <p>{t.combinedText}</p>
                </div>
                <span className={styles.pricePill}><strong>{t.combinedPrice}</strong><small>{t.combinedDuration}</small></span>
              </div>
              <ContactChannelChooser locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "session")} className={styles.buttonCopper + " " + styles.offerButton} label={t.combinedButton}/>
            </article>
          </div>
          <div className={styles.choiceBenefits}>
            {t.benefits.map((item, index) => {
              const Icon = [ShieldCheck, Feather, Heart][index];
              return <span key={item}><Icon size={16} aria-hidden="true"/>{item}</span>;
            })}
          </div>
          <p className={styles.availability}><ShieldCheck size={16} aria-hidden="true"/>{t.availability}</p>
        </section>

        <section id="tantra-apply" className={styles.application} aria-labelledby="tantra-apply-title">
          <div className={styles.applicationHeading}><p className={styles.eyebrow}>{t.formEyebrow}</p><h2 id="tantra-apply-title">{t.formTitle}</h2><p>{t.formLead}</p></div>
          <TantraInitiationForm locale={locale} />
          <p className={styles.disclaimer}>{t.disclaimer}</p>
        </section>
        <footer className={styles.pageFooter}><Link href={root}>← {t.footer}</Link></footer>
      </article>
    </main>
  );
}
