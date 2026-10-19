import type { Metadata } from "next";
import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
import { FreeReviewQuickRequest } from "@/components/free-review-quick-request";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { getHomeopathyLocaleParams } from "@/data/remedies";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "./review.module.css";

type Props = { params: Promise<{ locale: string }> };

/* Existing approved public assets, displayed as full-bleed scenes rather than small cards. */
const situationImages = [
  "/images/holistic-house/hero-olive-incense.webp",
  "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  "/images/holistic-house/report-lighthouse-coast.webp",
] as const;

const copy = {
  ru: {
    scopeTitle: "Что входит в бесплатную диагностику ситуации?",
    scopeIntro: "Бесплатный формат — разбор по вашей коучинг-форме и рисунку от руки с письменным отчётом. Это не бесплатная личная встреча.",
    scopeItems: [
      "Вы описываете проблему, цель и текущую ситуацию в коучинг-форме.",
      "Рисуете на бумаге ручкой три элемента: «Я», «Цель», «Проблема», затем отправляете фотографию.",
      "Я лично анализирую материалы и высылаю письменный отчёт по ситуации.",
    ],
    scopeLimit: "Это символическая интерпретация ситуации, не медицинская или психиатрическая диагностика, не назначение лечения и не гарантия результата. Платная консультация необязательна.",
    title: "Бесплатная диагностика ситуации и личная консультация",
    description: "Бесплатно: коучинг-форма, рисунок от руки «Я, цель, проблема» и персональный письменный отчёт от Андрея Литвинова. Не звонок и не медицинская диагностика.",
    eyebrow: "БЕСПЛАТНЫЙ РАЗБОР · АНДРЕЙ ЛИТВИНОВ",
    heading: "Разберём отношения, бизнес и личные вопросы.",
    lead: "По рисунку «Я — цель — проблема» я делаю символическую мини-расстановку, блиц-анализ ситуации и письменные рекомендации: какие связи, препятствия и ресурсы стоит рассмотреть.",
    bullets: ["Посмотреть на проблему со стороны и увидеть скрытые связи", "Разобраться с отношениями, делами или переживаниями о здоровье", "Получить личный анализ рисунка и практические ориентиры"],
    free: "Бесплатный письменный разбор по рисунку · без видеозвонка",
    request: "Начать бесплатный разбор",
    paidQuick: "С какими вопросами я работаю",
    practitioner: "Андрей Литвинов",
    experience: "Личная и групповая практика с 2002 года",
    transparency: "Диагностика — в смысле символического анализа рисунка и ситуации. Не является медицинским диагнозом или гарантией результата.",
    stepsEyebrow: "КАК ЭТО РАБОТАЕТ",
    stepsHeading: "От вашего рисунка к рекомендациям",
    stepsLead: "Это символическая мини-расстановка по рисунку, а не очная расстановочная сессия или медицинский диагноз. Сначала достаточно короткого сообщения.",
    steps: [
      { title: "Короткое обращение", text: "Напишите пару слов о запросе через WhatsApp или Telegram. Анкету заранее заполнять не нужно." },
      { title: "Материалы для анализа", text: "Для полного письменного отчёта заполните короткую анкету и пришлите рисунок «Я — цель — проблема» от руки." },
      { title: "Блиц-анализ и рекомендации", text: "Я рассматриваю элементы рисунка как символическую мини-расстановку, отмечаю возможные связи, затруднения и ресурсы, затем отправляю индивидуальный письменный разбор." },
    ],
    directionsTitle: "Какие методы можно использовать дальше",
    directionsLead: "При желании вы можете отдельно заказать личную сессию. Методы ниже — пояснение возможных направлений, а не часть бесплатного письменного отчёта.",
    directions: [
      { title: "Психогомеопатия и личный ресурс", text: "Дополнительное исследование самочувствия и личных ресурсов, не медицинское лечение.", href: "psychohomeopathy" },
      { title: "Работа с внутренними образами", text: "Исследование чувств, повторяющихся реакций и внутренней опоры.", href: "imagery-therapy" },
      { title: "Системные расстановки и архетипы", text: "Символическое исследование отношений, жизненных и деловых решений.", href: "systemic-constellations" },
    ],
    aboutHeading: "Давайте начнём с вашего вопроса",
    aboutText: "Я помогаю взглянуть на жизненную или деловую ситуацию через связи между человеком, целью и препятствием. Для письменного блиц-разбора мне нужны короткая анкета и рисунок; полноценная расстановка проводится отдельно в личной сессии.",
    aboutLink: "Подробнее обо мне",
    faqTitle: "Частые вопросы",
    faqs: [
      { q: "Что именно бесплатно?", a: "Анализ заполненной коучинг-формы и рисунка от руки с персональным письменным отчётом. Бесплатного созвона в этот формат не входит." },
      { q: "Что нужно нарисовать?", a: "На листе бумаги ручкой изобразите три элемента: «Я», «Цель», «Проблема». Нет правильного или неправильного художественного способа." },
      { q: "Как отправить материалы?", a: "Сначала отправьте короткую заявку через WhatsApp или Telegram. Анкета и рисунок нужны уже для самого письменного разбора. Подробную анкету можно открыть дополнительно на этой странице." },
      { q: "Можно ли продолжить работу лично?", a: "Да. После письменного разбора при желании можно выбрать отдельную личную сессию или «Алхимию души». Форматы и условия указаны в самом конце страницы." },
      { q: "Это медицинская или психологическая диагностика?", a: "Нет. Это символический разбор ситуации, а не медицинский или психиатрический диагноз или назначение лечения. При симптомах обратитесь к квалифицированному специалисту." },
    ],
    finalTitle: "Готовы разобраться в своей ситуации?",
    finalAction: "Оставить бесплатную заявку",
    back: "Все услуги",
  },
  en: {
    scopeTitle: "What is included in the free situation review?",
    scopeIntro: "The free service is a drawing-based assessment of your coaching answers, with a personal written report. It is not a free live consultation.",
    scopeItems: [
      "Describe your current problem, goal and situation in the short coaching questionnaire.",
      "Draw ME, MY GOAL and MY PROBLEM with a pen on paper, then send a photo.",
      "I personally review the answers and drawing and send you a written situation report.",
    ],
    scopeLimit: "This is an interpretive, symbolic assessment, not a medical or psychiatric diagnosis, prescription or guaranteed outcome. Booking a paid session is optional.",
    title: "Free Situation Review & Personal Consultation",
    description: "Free coaching questionnaire + hand-drawn ME / GOAL / PROBLEM drawing, with a personal written report from Andrey Litvinov. No free call or medical diagnosis.",
    eyebrow: "FREE PERSONAL REVIEW · ANDREY LITVINOV",
    heading: "Clarity for work, relationships and personal challenges.",
    lead: "Draw ME, GOAL and PROBLEM. I interpret it as a symbolic mini-constellation and send a personal written review of possible connections, obstacles, resources and next steps.",
    bullets: ["Look at the problem from a different angle and map connections", "Explore questions about work, relationships or wellbeing", "Receive a personal drawing analysis and thoughtful next steps"],
    free: "Free written drawing-based review · no live call",
    request: "Get my free written review",
    paidQuick: "Questions we can explore",
    practitioner: "Andrey Litvinov",
    experience: "Facilitating personal and group development since 2002",
    transparency: "The word assessment refers to symbolic reflection on a drawing and situation, not a medical diagnosis or a promised result.",
    stepsEyebrow: "HOW IT WORKS",
    stepsHeading: "From your drawing to personal recommendations",
    stepsLead: "A small symbolic drawing-based constellation, not a live constellation session or clinical diagnosis. A short message is enough to begin.",
    steps: [
      { title: "A short enquiry", text: "Send a few words about your situation via WhatsApp or Telegram. No long intake form up front." },
      { title: "Material for your review", text: "For the complete written report, fill in the short questionnaire and send a paper drawing of ME, GOAL and PROBLEM." },
      { title: "Brief analysis and recommendations", text: "I read the drawing as a symbolic mini-constellation, explore possible connections, obstacles and resources, and send a personal written situation review." },
    ],
    directionsTitle: "Optional approaches for further work",
    directionsLead: "A separate personal session is your choice. The methods below are explanations of possible approaches, not part of the free written report.",
    directions: [
      { title: "Psychohomeopathy & personal resources", text: "Complementary reflection on wellbeing and resources, not medical treatment.", href: "psychohomeopathy" },
      { title: "Guided imagery & inner stability", text: "Explore emotional patterns, recurring reactions and inner support.", href: "imagery-therapy" },
      { title: "Systemic & archetypal constellations", text: "Explore relationships, life decisions and business situations symbolically.", href: "systemic-constellations" },
    ],
    aboutHeading: "Let’s begin with your question",
    aboutText: "I help you explore personal or business challenges through the relationships between you, your goal and your obstacle. A brief questionnaire and drawing are enough for the written review; a full constellation session is a separate service.",
    aboutLink: "Read about my work",
    faqTitle: "Questions before you begin",
    faqs: [
      { q: "What exactly is free?", a: "The review of your completed coaching questionnaire and handwritten drawing, plus a personal written report. The free offer does not include a live call." },
      { q: "What should I draw?", a: "On one sheet of paper, use a pen to draw three elements: ME, MY GOAL and MY PROBLEM. There is no artistic right or wrong way." },
      { q: "How do I send the materials?", a: "First send a short enquiry via WhatsApp or Telegram. The questionnaire and paper drawing are follow-up materials for the written review. You can also open the optional detailed questionnaire on this page." },
      { q: "Can we continue with a personal session?", a: "Yes, if you wish. After the written review, you can choose a separate live session or Alchemy of the Soul. Available formats are shown at the end of this page." },
      { q: "Is this a medical or mental-health assessment?", a: "No. It is an interpretive situation review, not a medical diagnosis, psychiatric diagnosis or prescription. Seek a qualified healthcare professional for medical concerns." },
    ],
    finalTitle: "Ready to see your situation more clearly?",
    finalAction: "Send a free enquiry",
    back: "All services",
  },
  es: {
    scopeTitle: "¿Qué incluye la evaluación gratuita?",
    scopeIntro: "El servicio gratuito consiste en analizar tu formulario de coaching y dibujo a mano, con un informe personal escrito. No es una consulta gratuita por videollamada.",
    scopeItems: [
      "Describe tu problema, meta y situación en un formulario breve de coaching.",
      "Dibuja YO, MI META y MI PROBLEMA con bolígrafo sobre papel y envía una foto.",
      "Reviso personalmente las respuestas y el dibujo y te envío un informe escrito.",
    ],
    scopeLimit: "Es una interpretación simbólica, no un diagnóstico médico o psiquiátrico, receta ni resultado garantizado. Una consulta de pago es opcional.",
    title: "Revisión gratuita y consulta personal",
    description: "Formulario de coaching y dibujo a mano (YO, META, PROBLEMA) con un informe personal escrito de Andrey Litvinov. Sin llamada gratuita ni diagnóstico médico.",
    eyebrow: "REVISIÓN GRATUITA · ANDREY LITVINOV",
    heading: "Aclara tus relaciones, trabajo y retos personales.",
    lead: "Dibuja YO, META y PROBLEMA. Lo interpreto como una mini constelación simbólica y te envío un análisis escrito de posibles conexiones, obstáculos, recursos y siguientes pasos.",
    bullets: ["Observar el problema desde otra perspectiva y reconocer conexiones", "Explorar temas de trabajo, relaciones o bienestar", "Recibir un análisis personal del dibujo y pasos posibles"],
    free: "Revisión gratuita por escrito basada en tu dibujo · sin llamada",
    request: "Recibir revisión escrita gratuita",
    paidQuick: "Situaciones que podemos explorar",
    practitioner: "Andrey Litvinov",
    experience: "Experiencia en desarrollo personal y trabajo grupal desde 2002",
    transparency: "La evaluación es un análisis simbólico, no un diagnóstico médico ni una promesa de resultados.",
    stepsEyebrow: "CÓMO FUNCIONA",
    stepsHeading: "De tu dibujo a las recomendaciones",
    stepsLead: "Una pequeña constelación simbólica basada en el dibujo, no una sesión presencial ni un diagnóstico clínico. Basta un mensaje breve para empezar.",
    steps: [
      { title: "Solicitud breve", text: "Describe en pocas palabras tu situación por WhatsApp o Telegram." },
      { title: "Material para el informe", text: "Para el informe escrito completo, rellena el formulario breve y envía un dibujo en papel de YO, META y PROBLEMA." },
      { title: "Análisis breve y recomendaciones", text: "Interpreto el dibujo como una mini constelación simbólica, observo posibles conexiones, obstáculos y recursos y envío un informe personal por escrito." },
    ],
    directionsTitle: "Enfoques opcionales para continuar",
    directionsLead: "Las sesiones personales se contratan por separado. Los métodos siguientes son explicaciones, no parte del informe gratuito.",
    directions: [
      { title: "Psicohomeopatía y recursos personales", text: "Exploración complementaria del bienestar y los recursos, no tratamiento médico.", href: "psychohomeopathy" },
      { title: "Imágenes guiadas y apoyo interior", text: "Explorar emociones, reacciones y estabilidad interior.", href: "imagery-therapy" },
      { title: "Constelaciones sistémicas y arquetípicas", text: "Explorar de modo simbólico relaciones y decisiones personales o laborales.", href: "systemic-constellations" },
    ],
    aboutHeading: "Empecemos por tu pregunta",
    aboutText: "Exploramos cuestiones personales o profesionales y las relaciones entre tú, tu objetivo y el obstáculo. El formulario y el dibujo sirven para el informe escrito; una constelación completa es una sesión aparte.",
    aboutLink: "Conoce mi trabajo",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿Qué es exactamente gratis?", a: "El análisis del formulario de coaching y dibujo a mano con un informe escrito personal. No incluye una llamada en directo." },
      { q: "¿Qué debo dibujar?", a: "En una hoja, dibuja con bolígrafo YO, MI META y MI PROBLEMA. No necesitas habilidades artísticas." },
      { q: "¿Cómo envío el material?", a: "Empieza con una solicitud breve por WhatsApp o Telegram. El formulario y el dibujo son materiales posteriores para el informe escrito; puedes abrir el cuestionario detallado de esta página si lo prefieres." },
      { q: "¿Podemos continuar con una sesión personal?", a: "Sí, si lo deseas. Después del informe puedes elegir una sesión personal o Alquimia del Alma. Los formatos se muestran al final de la página." },
      { q: "¿Es un diagnóstico médico o psicológico?", a: "No. Es una revisión simbólica de la situación, sin diagnósticos médicos o psiquiátricos ni recetas. Consulta a profesionales sanitarios para cuestiones médicas." },
    ],
    finalTitle: "¿Listo para explorar tu situación?",
    finalAction: "Iniciar evaluación gratuita",
    back: "Todos los servicios",
  },
} as const;

export function generateStaticParams() {
  return [...getHomeopathyLocaleParams(), { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " — Holistic House",
    description: t.description,
    alternates: {
      canonical: "/" + locale + "/services/free-situation-review",
      languages: {
        en: "/en/services/free-situation-review",
        ru: "/ru/services/free-situation-review",
        es: "/es/services/free-situation-review",
        "x-default": "/en/services/free-situation-review",
      },
    },
  };
}

const sampleCopy = {
  en: {
    summary: "Preview a simple drawing and report outline",
    sketchTitle: "Drawing idea (illustrative only)",
    sketch: ["ME", "GOAL", "PROBLEM"],
    reportTitle: "Illustrative report outline",
    rows: ["Your question", "Symbolic observations", "Themes to reflect on", "Possible next steps"],
    note: "This is a blank example of the format, not a real client's drawing or results. Your report will be individual and may use a different structure.",
  },
  ru: {
    summary: "Посмотреть пример рисунка и структуры отчёта",
    sketchTitle: "Возможный рисунок (только схема)",
    sketch: ["Я", "ЦЕЛЬ", "ПРОБЛЕМА"],
    reportTitle: "Примерная структура отчёта",
    rows: ["Ваш запрос", "Символические наблюдения", "Темы для размышления", "Возможные следующие шаги"],
    note: "Это пустая схема, а не рисунок или результаты реального клиента. Персональный отчёт может иметь другую структуру.",
  },
  es: {
    summary: "Ver un ejemplo de dibujo y esquema del informe",
    sketchTitle: "Idea de dibujo (solo esquema)",
    sketch: ["YO", "META", "PROBLEMA"],
    reportTitle: "Esquema orientativo del informe",
    rows: ["Tu pregunta", "Observaciones simbólicas", "Temas para reflexionar", "Próximos pasos posibles"],
    note: "Este es un esquema vacío, no un dibujo o resultado real de un cliente. Tu informe puede tener otra estructura.",
  },
} as const;


const outcomes = {
  ru: {
    eyebrow: "ЧТО ВЫ ПОЛУЧИТЕ",
    title: "Не просто описание проблемы, а больше ясности и направление действий",
    intro: "Ценность разбора — в новом взгляде на вашу ситуацию. Это не обещание мгновенных изменений, а основа для осознанного следующего шага.",
    cards: [
      { title: "Ясность", text: "Отделите главный запрос от множества тревожащих деталей. Поймите, о чём именно хотите поговорить." },
      { title: "Новый взгляд", text: "Исследуйте возможные повторяющиеся реакции, отношения между целью и препятствием и собственные ресурсы." },
      { title: "Следующие шаги", text: "Получите индивидуальное письменное отражение с вопросами и возможными направлениями дальнейшей работы." },
    ],
    advanced: "Уже готовы? Открыть подробную анкету и инструкцию к рисунку",
    finalLead: "Напишите пару слов, и я подскажу, как подготовить материалы для бесплатного письменного разбора.",
  },
  en: {
    eyebrow: "WHAT YOU CAN TAKE AWAY",
    title: "More clarity, a fresh perspective and a direction to explore",
    intro: "The value is in seeing your situation from a different angle. This is a reflective starting point, not a promise of immediate change.",
    cards: [
      { title: "Clarity", text: "Separate the main question from the noise, and identify what matters most to you." },
      { title: "Perspective", text: "Explore recurring responses, the relationship between your goals and obstacles, and your existing resources." },
      { title: "Possible next steps", text: "Receive personal written reflections, useful questions and directions for further work." },
    ],
    advanced: "Already prepared? Open the detailed questionnaire and drawing instructions",
    finalLead: "Share a few words, and I'll explain how to prepare the materials for your free written situation review.",
  },
  es: {
    eyebrow: "QUÉ PUEDES OBTENER",
    title: "Más claridad, otra perspectiva y una dirección para avanzar",
    intro: "El valor está en mirar la situación desde otro ángulo. Es un punto de partida para reflexionar, no una promesa de cambios inmediatos.",
    cards: [
      { title: "Claridad", text: "Identifica la cuestión central y qué es lo más importante para ti." },
      { title: "Nueva perspectiva", text: "Explora patrones, posibles obstáculos y recursos personales." },
      { title: "Posibles próximos pasos", text: "Recibe reflexiones personales por escrito, preguntas útiles y opciones para seguir trabajando." },
    ],
    advanced: "¿Ya lo tienes preparado? Abre el cuestionario y las instrucciones del dibujo",
    finalLead: "Cuéntame unas palabras y te indicaré cómo preparar los materiales para tu revisión escrita gratuita.",
  },
} as const;


const situations = {
  ru: {
    eyebrow: "С КАКИМИ СИТУАЦИЯМИ МОЖНО ПРИЙТИ",
    title: "Один рисунок — разные жизненные вопросы",
    lead: "Не обязательно уметь объяснять всё словами. Начните с того, что сейчас волнует больше всего.",
    cards: [
      { title: "Работа и бизнес", text: "Сложный выбор, партнёрство, конфликты в команде, деньги, развитие своего дела." },
      { title: "Отношения и семья", text: "Непонимание, повторяющиеся конфликты, границы, близость и семейные сценарии." },
      { title: "Самочувствие и стресс", text: "Переживания о здоровье, напряжение, усталость и поиск личных ресурсов. Без медицинских диагнозов." },
      { title: "Личный путь", text: "Чувство тупика, страх перемен, поиск направления, цели и внутренней опоры." },
    ],
  },
  en: {
    eyebrow: "WHAT YOU CAN BRING",
    title: "One drawing, many kinds of life questions",
    lead: "You do not need to explain everything perfectly. Start with the question that feels most important today.",
    cards: [
      { title: "Work & business", text: "Difficult choices, partnerships, team conflict, money questions and business direction." },
      { title: "Relationships & family", text: "Misunderstandings, recurring conflicts, boundaries, intimacy and family patterns." },
      { title: "Wellbeing & stress", text: "Concerns about health, tension, fatigue and personal resources — without medical diagnosis." },
      { title: "Life direction", text: "Feeling stuck, fear of change, goals, transitions and finding inner support." },
    ],
  },
  es: {
    eyebrow: "CON QUÉ SITUACIONES PUEDES VENIR",
    title: "Un dibujo, muchas preguntas de la vida",
    lead: "No necesitas explicarlo todo perfectamente. Empieza por lo que más te preocupa hoy.",
    cards: [
      { title: "Trabajo y negocios", text: "Decisiones difíciles, socios, conflictos de equipo, dinero y rumbo profesional." },
      { title: "Relaciones y familia", text: "Malentendidos, conflictos repetidos, límites, cercanía y patrones familiares." },
      { title: "Bienestar y estrés", text: "Preocupaciones de salud, tensión, cansancio y recursos personales, sin diagnóstico médico." },
      { title: "Camino personal", text: "Bloqueos, miedo al cambio, objetivos, transiciones y apoyo interior." },
    ],
  },
} as const;

const deeperWork = {
  ru: {
    eyebrow: "КОГДА ХОЧЕТСЯ ПОЙТИ ГЛУБЖЕ",
    title: "После разбора — сессия «Алхимия души»",
    description: "Если мини-расстановочного анализа недостаточно, мы можем отдельно провести полноценную личную сессию: системную расстановку, исследование внутренних образов, отношений и ресурсов. Это необязательное продолжение, а не условие получения бесплатного отчёта.",
    action: "Подробнее об «Алхимии души»",
  },
  en: {
    eyebrow: "IF YOU WANT TO GO DEEPER",
    title: "After the review: Alchemy of the Soul",
    description: "If a brief drawing-based review is not enough, we can explore your question in a separate personal session using systemic constellation work, inner imagery and resources. This is optional, never a requirement for your free written review.",
    action: "Explore Alchemy of the Soul",
  },
  es: {
    eyebrow: "SI QUIERES PROFUNDIZAR",
    title: "Después del informe: Alquimia del Alma",
    description: "Si el análisis breve del dibujo no es suficiente, podemos profundizar en una sesión personal aparte mediante constelaciones sistémicas, imágenes interiores y recursos. Es opcional y no condiciona el informe gratuito.",
    action: "Conocer Alquimia del Alma",
  },
} as const;

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  const outcome = outcomes[locale];
  const topic = situations[locale];
  const deeper = deeperWork[locale];
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />

      <section className={styles.contentGrid} aria-labelledby="review-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="review-hero-title">{t.heading}</h1>
          <p className={styles.lead}>{t.lead}</p>
          <ul className={styles.benefits}>
            {t.bullets.map((point) => <li key={point}><CheckCircle2 size={21} aria-hidden="true"/><span>{point}</span></li>)}
          </ul>
          <p className={styles.freeLine}>{t.free}</p>
          <div className={styles.heroActions}>
            <a className={styles.heroPrimary} href="#request-free-review">{t.request} <ArrowRight size={18} aria-hidden="true" /></a>
            <a className={styles.heroSecondary} href="#situations">{t.paidQuick} <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <p className={styles.safety}>{t.transparency}</p>
        </div>
        <div className={styles.heroScene}>
          <StaticPortrait src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill priority sizes="(max-width: 767px) 100vw, 44vw" />
          <div className={styles.heroSceneCaption}><strong>{t.practitioner}</strong><span>{t.experience}</span></div>
        </div>
      </section>

      <section className={styles.situations} id="situations" aria-labelledby="review-situations-title">
        <p className={styles.eyebrow}>{topic.eyebrow}</p>
        <h2 id="review-situations-title">{topic.title}</h2>
        <p className={styles.situationsLead}>{topic.lead}</p>
        <div className={styles.situationGrid}>
          {topic.cards.map((card, index) => (
            <article className={styles.situationScene} key={card.title}>
              <div className={styles.sceneImage}>
                <Image unoptimized src={situationImages[index]} alt="" fill sizes="(max-width: 767px) 100vw, 52vw" />
              </div>
              <div className={styles.sceneCopy}>
                <span className={styles.sceneNumber}>{String(index + 1).padStart(2, "0")} / 04</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <a href="#request-free-review">{t.request}<ArrowRight size={18} aria-hidden="true" /></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.outcomes} aria-labelledby="review-outcomes-title">
        <p className={styles.eyebrow}>{outcome.eyebrow}</p>
        <h2 id="review-outcomes-title">{outcome.title}</h2>
        <p className={styles.outcomeIntro}>{outcome.intro}</p>
        <div className={styles.outcomeScene}>
          <div className={styles.outcomeImage}>
            <Image unoptimized src="/images/holistic-house/course-focus-mountain-boy.webp" alt="" fill sizes="(max-width: 767px) 100vw, 48vw" />
          </div>
          <div className={styles.outcomeGrid}>
            {outcome.cards.map((card, index) => <article key={card.title}>
              <span>0{index + 1}</span><h3>{card.title}</h3><p>{card.text}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className={styles.details} id="how-it-works" aria-labelledby="review-steps-title">
        <header className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.stepsEyebrow}</p>
          <h2 id="review-steps-title">{t.stepsHeading}</h2>
          <p>{t.stepsLead}</p>
        </header>
        <div className={styles.stepsScene}>
          <div className={styles.stepsImage}>
            <Image unoptimized src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width: 767px) 100vw, 44vw" />
          </div>
          <ol className={styles.steps}>
            {t.steps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber}>0{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <details className={styles.advancedIntake}>
          <summary>{outcome.advanced}</summary>
          <FreeSituationReviewForm locale={locale} />
        </details>
      </section>

      <ServiceVideoShowcase topic="overview" locale={locale} id="service-video" />
      <PersonalTestimonials locale={locale === "es" ? "en" : locale} variant="all" />

      <details className={styles.sample}>
        <summary>{sampleCopy[locale].summary}</summary>
        <div className={styles.sampleGrid}>
          <div className={styles.sampleSketch}>
            <h3>{sampleCopy[locale].sketchTitle}</h3>
            <div>{sampleCopy[locale].sketch.map(label => <span key={label}>{label}</span>)}</div>
          </div>
          <div className={styles.sampleReport}>
            <h3>{sampleCopy[locale].reportTitle}</h3>
            <ol>{sampleCopy[locale].rows.map(item => <li key={item}>{item}</li>)}</ol>
          </div>
        </div>
        <p>{sampleCopy[locale].note}</p>
      </details>

      <details className={styles.directions}>
        <summary className={styles.directionsSummary}>{t.directionsTitle}</summary>
        <p className={styles.directionsLead}>{t.directionsLead}</p>
        <div className={styles.directionList}>
          {t.directions.map((direction, index) => (
            <article key={direction.href}>
              <span className={styles.directionNumber}>0{index + 1}</span>
              <div><h3>{direction.title}</h3><p>{direction.text}</p></div>
              <Link href={"/" + locale + "/services/" + direction.href} aria-label={direction.title}><ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </details>

      <section className={styles.about} aria-labelledby="review-about-title">
        <div className={styles.aboutPhoto}><StaticPortrait src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill sizes="(max-width: 767px) 100vw, 380px" /></div>
        <div>
          <p className={styles.eyebrow}>{t.practitioner}</p>
          <h2 id="review-about-title">{t.aboutHeading}</h2>
          <p>{t.aboutText}</p>
          <Link href={"/" + locale + "/about"}>{t.aboutLink} <ArrowRight size={17} aria-hidden="true"/></Link>
        </div>
      </section>

      <section className={styles.faq} aria-labelledby="review-faq-title">
        <h2 id="review-faq-title">{t.faqTitle}</h2>
        <div>
          {t.faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </div>
      </section>

      <section className={styles.alchemy} aria-labelledby="review-alchemy-title">
        <div>
          <p className={styles.eyebrow}>{deeper.eyebrow}</p>
          <h2 id="review-alchemy-title">{deeper.title}</h2>
          <p>{deeper.description}</p>
        </div>
        <Link className={styles.alchemyLink} href={"/" + locale + "/services/alchemy-of-soul"}>
          {deeper.action} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.finalCapture} id="personal-consultation" aria-labelledby="review-final-title">
        <div className={styles.finalIntro}>
          <h2 id="review-final-title">{t.finalTitle}</h2>
        </div>
        <div className={styles.finalRequest} id="request-free-review"><FreeReviewQuickRequest locale={locale} /></div>
      </section>
      <div className={styles.bottomServices}>
        <Link href={"/" + locale + "/services"} className={styles.backToServices}>{t.back} <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>

    </main>
  );
}
