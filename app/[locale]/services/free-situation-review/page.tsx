import type { Metadata } from "next";
import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
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
    heading: "Разберитесь в ситуации и найдите следующий шаг.",
    lead: "Опишите ваш запрос. После короткой анкеты и рисунка от руки я лично пришлю письменный разбор, чтобы вы могли увидеть ситуацию с другой стороны и наметить следующие шаги.",
    bullets: ["Лучше понять суть проблемы и свой настоящий запрос", "Увидеть повторяющиеся сценарии и точки опоры", "Получить личный письменный разбор и направления для дальнейших шагов"],
    free: "€0 · Личный письменный разбор · Без платного созвона",
    request: "Начать бесплатный разбор",
    paidQuick: "Личная консультация · от €50",
    practitioner: "Андрей Литвинов",
    experience: "Личная и групповая практика с 2002 года",
    transparency: "Диагностика — в смысле символического анализа рисунка и ситуации. Не является медицинским диагнозом или гарантией результата.",
    stepsEyebrow: "КАК ЭТО РАБОТАЕТ",
    stepsHeading: "Три простых шага",
    stepsLead: "Сначала короткая заявка. Подробные материалы нужны только для подготовки самого письменного отчёта.",
    steps: [
      { title: "Короткое обращение", text: "Напишите пару слов о запросе через WhatsApp или Telegram. Анкету заранее заполнять не нужно." },
      { title: "Материалы для анализа", text: "Для полного письменного отчёта заполните короткую анкету и пришлите рисунок «Я — цель — проблема» от руки." },
      { title: "Ваш письменный отчёт", text: "Я изучаю ответы и рисунок и лично высылаю интерпретацию ситуации." },
    ],
    paidEyebrow: "ОТДЕЛЬНАЯ ПЛАТНАЯ УСЛУГА",
    paidTitle: "Хотите обсудить ситуацию лично?",
    paidLead: "На встрече мы вместе исследуем вашу ситуацию, отношения или решение, а я предложу подходящий формат работы. Онлайн или в Торонто. Это отдельная платная услуга; бесплатный письменный разбор доступен без неё.",
    paidOptions: [
      { label: "Экспресс-консультация · 30 минут", price: "€50", message: "Услуга: Личная экспресс-консультация с Андреем Литвиновым\nЗапрос: хочу записаться на платную экспресс-сессию 30 минут за €50. Подскажите доступное время." },
      { label: "Полная личная сессия · 60 минут", price: "€100", message: "Услуга: Полная личная консультация с Андреем Литвиновым\nЗапрос: хочу записаться на платную личную сессию 60 минут за €100. Подскажите доступное время." },
    ],
    paidNote: "Напишите в WhatsApp, чтобы согласовать время. Запрос не является оплатой или подтверждением записи.",
    directionsTitle: "Какие методы можно использовать дальше",
    directionsLead: "При желании вы можете отдельно заказать личную сессию. Методы ниже — пояснение возможных направлений, а не часть бесплатного письменного отчёта.",
    directions: [
      { title: "Психогомеопатия и личный ресурс", text: "Дополнительное исследование самочувствия и личных ресурсов, не медицинское лечение.", href: "psychohomeopathy" },
      { title: "Работа с внутренними образами", text: "Исследование чувств, повторяющихся реакций и внутренней опоры.", href: "imagery-therapy" },
      { title: "Системные расстановки и архетипы", text: "Символическое исследование отношений, жизненных и деловых решений.", href: "systemic-constellations" },
    ],
    aboutHeading: "Давайте начнём с вашего вопроса",
    aboutText: "Моя цель — помочь вам яснее увидеть свой запрос и возможные направления работы. После первого сообщения для подробного письменного разбора я попрошу анкету и рисунок; разговор в формате личной сессии остаётся отдельной платной услугой.",
    aboutLink: "Подробнее обо мне",
    faqTitle: "Частые вопросы",
    faqs: [
      { q: "Что именно бесплатно?", a: "Анализ заполненной коучинг-формы и рисунка от руки с персональным письменным отчётом. Бесплатного созвона в этот формат не входит." },
      { q: "Что нужно нарисовать?", a: "На листе бумаги ручкой изобразите три элемента: «Я», «Цель», «Проблема». Нет правильного или неправильного художественного способа." },
      { q: "Как отправить материалы?", a: "Сначала отправьте короткую заявку через WhatsApp или Telegram. Анкета и рисунок нужны уже для самого письменного разбора. Подробную анкету можно открыть дополнительно на этой странице." },
      { q: "Сколько стоит личная сессия?", a: "Отдельная экспресс-консультация 30 минут стоит €50. Полная личная сессия 60 минут — €100." },
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
    heading: "Find clarity in your situation — and a way forward.",
    lead: "Tell me what you are facing. After a short questionnaire and hand drawing, I will personally prepare a written perspective on your situation, resources and possible next steps.",
    bullets: ["Clarify the problem and what matters most to you", "Explore patterns, strengths and overlooked options", "Receive personal written reflections and possible next steps"],
    free: "€0 · Personal written review · No paid call required",
    request: "Get my free written review",
    paidQuick: "Personal consultation · from €50",
    practitioner: "Andrey Litvinov",
    experience: "Facilitating personal and group development since 2002",
    transparency: "The word assessment refers to symbolic reflection on a drawing and situation, not a medical diagnosis or a promised result.",
    stepsEyebrow: "HOW IT WORKS",
    stepsHeading: "Three simple steps",
    stepsLead: "Start with a simple message. Detailed materials come later, to prepare your written report.",
    steps: [
      { title: "A short enquiry", text: "Send a few words about your situation via WhatsApp or Telegram. No long intake form up front." },
      { title: "Material for your review", text: "For the complete written report, fill in the short questionnaire and send a paper drawing of ME, GOAL and PROBLEM." },
      { title: "Your written report", text: "I review your questionnaire and drawing and send my personal interpretation in writing." },
    ],
    paidEyebrow: "SEPARATE PAID SERVICE",
    paidTitle: "Prefer to explore your question together?",
    paidLead: "In a one-to-one session we explore your situation, relationships or decisions together, using a method that fits your question. Online or in Toronto. This is optional; the free written review does not require a session.",
    paidOptions: [
      { label: "Express consultation · 30 minutes", price: "€50", message: "Service: Personal express consultation with Andrey Litvinov\nRequest: I'd like to book a paid 30-minute express session for €50. Please let me know availability." },
      { label: "Full personal session · 60 minutes", price: "€100", message: "Service: Full personal consultation with Andrey Litvinov\nRequest: I'd like to book a paid 60-minute personal session for €100. Please let me know availability." },
    ],
    paidNote: "WhatsApp opens an enquiry to arrange availability, not a confirmed booking or payment.",
    directionsTitle: "Optional approaches for further work",
    directionsLead: "A separate personal session is your choice. The methods below are explanations of possible approaches, not part of the free written report.",
    directions: [
      { title: "Psychohomeopathy & personal resources", text: "Complementary reflection on wellbeing and resources, not medical treatment.", href: "psychohomeopathy" },
      { title: "Guided imagery & inner stability", text: "Explore emotional patterns, recurring reactions and inner support.", href: "imagery-therapy" },
      { title: "Systemic & archetypal constellations", text: "Explore relationships, life decisions and business situations symbolically.", href: "systemic-constellations" },
    ],
    aboutHeading: "Let’s begin with your question",
    aboutText: "I help you explore your situation and possible directions with care. After your first message, I will ask for the questionnaire and hand drawing needed for the full written report. Live sessions are available separately.",
    aboutLink: "Read about my work",
    faqTitle: "Questions before you begin",
    faqs: [
      { q: "What exactly is free?", a: "The review of your completed coaching questionnaire and handwritten drawing, plus a personal written report. The free offer does not include a live call." },
      { q: "What should I draw?", a: "On one sheet of paper, use a pen to draw three elements: ME, MY GOAL and MY PROBLEM. There is no artistic right or wrong way." },
      { q: "How do I send the materials?", a: "First send a short enquiry via WhatsApp or Telegram. The questionnaire and paper drawing are follow-up materials for the written review. You can also open the optional detailed questionnaire on this page." },
      { q: "How much does a personal consultation cost?", a: "A separate 30-minute express consultation is €50; a full 60-minute personal session is €100." },
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
    heading: "Aclara tu situación y encuentra el siguiente paso.",
    lead: "Cuéntame qué te preocupa. Después de un formulario breve y un dibujo a mano, prepararé personalmente una reflexión escrita sobre tu situación y posibles pasos.",
    bullets: ["Aclarar qué está pasando y qué importa más", "Explorar patrones, recursos y nuevas opciones", "Recibir observaciones personales por escrito y posibles siguientes pasos"],
    free: "€0 · Informe personal escrito · Sin llamada de pago",
    request: "Recibir revisión escrita gratuita",
    paidQuick: "Consulta personal · desde €50",
    practitioner: "Andrey Litvinov",
    experience: "Experiencia en desarrollo personal y trabajo grupal desde 2002",
    transparency: "La evaluación es un análisis simbólico, no un diagnóstico médico ni una promesa de resultados.",
    stepsEyebrow: "CÓMO FUNCIONA",
    stepsHeading: "Tres pasos sencillos",
    stepsLead: "Primero envía un mensaje breve. Los materiales detallados se preparan después.",
    steps: [
      { title: "Solicitud breve", text: "Describe en pocas palabras tu situación por WhatsApp o Telegram." },
      { title: "Material para el informe", text: "Para el informe escrito completo, rellena el formulario breve y envía un dibujo en papel de YO, META y PROBLEMA." },
      { title: "Tu informe escrito", text: "Reviso ambos materiales y te envío una interpretación personal por escrito." },
    ],
    paidEyebrow: "SERVICIO DE PAGO APARTE",
    paidTitle: "¿Prefieres conversar en una sesión personal?",
    paidLead: "En una sesión individual exploramos juntos tu situación, relaciones o decisiones. Online o en Toronto. Es una opción de pago independiente; no necesitas reservarla para obtener la revisión escrita gratuita.",
    paidOptions: [
      { label: "Consulta exprés · 30 minutos", price: "€50", message: "Servicio: Consulta exprés personal con Andrey Litvinov\nSolicitud: quisiera reservar una consulta de pago de 30 minutos por €50. Indícame la disponibilidad." },
      { label: "Sesión personal completa · 60 minutos", price: "€100", message: "Servicio: Sesión personal completa con Andrey Litvinov\nSolicitud: quisiera reservar una sesión de pago de 60 minutos por €100. Indícame la disponibilidad." },
    ],
    paidNote: "El mensaje de WhatsApp no es una reserva confirmada ni un pago.",
    directionsTitle: "Enfoques opcionales para continuar",
    directionsLead: "Las sesiones personales se contratan por separado. Los métodos siguientes son explicaciones, no parte del informe gratuito.",
    directions: [
      { title: "Psicohomeopatía y recursos personales", text: "Exploración complementaria del bienestar y los recursos, no tratamiento médico.", href: "psychohomeopathy" },
      { title: "Imágenes guiadas y apoyo interior", text: "Explorar emociones, reacciones y estabilidad interior.", href: "imagery-therapy" },
      { title: "Constelaciones sistémicas y arquetípicas", text: "Explorar de modo simbólico relaciones y decisiones personales o laborales.", href: "systemic-constellations" },
    ],
    aboutHeading: "Empecemos por tu pregunta",
    aboutText: "Exploramos tu situación y las posibles opciones. Tras tu primer mensaje, solicitaré el formulario y el dibujo necesarios para preparar el informe escrito. Las sesiones en directo se contratan por separado.",
    aboutLink: "Conoce mi trabajo",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿Qué es exactamente gratis?", a: "El análisis del formulario de coaching y dibujo a mano con un informe escrito personal. No incluye una llamada en directo." },
      { q: "¿Qué debo dibujar?", a: "En una hoja, dibuja con bolígrafo YO, MI META y MI PROBLEMA. No necesitas habilidades artísticas." },
      { q: "¿Cómo envío el material?", a: "Empieza con una solicitud breve por WhatsApp o Telegram. El formulario y el dibujo son materiales posteriores para el informe escrito; puedes abrir el cuestionario detallado de esta página si lo prefieres." },
      { q: "¿Cuánto cuesta una sesión personal?", a: "La consulta exprés de 30 minutos cuesta €50; la sesión completa de 60 minutos cuesta €100." },
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

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  const outcome = outcomes[locale];
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
            <a className={styles.heroSecondary} href="#personal-consultation">{t.paidQuick} <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <div className={styles.introContact}>
            <div className={styles.photo}>
              <StaticPortrait src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill sizes="88px" />
            </div>
            <div><strong>{t.practitioner}</strong><span>{t.experience}</span></div>
          </div>
          <p className={styles.safety}>{t.transparency}</p>
        </div>
      </section>

      <section className={styles.capturePanel} id="request-free-review" aria-label={t.request}>
        <FreeReviewQuickRequest locale={locale} />
      </section>

      <section className={styles.outcomes} aria-labelledby="review-outcomes-title">
        <p className={styles.eyebrow}>{outcome.eyebrow}</p>
        <h2 id="review-outcomes-title">{outcome.title}</h2>
        <p className={styles.outcomeIntro}>{outcome.intro}</p>
        <div className={styles.outcomeGrid}>
          {outcome.cards.map((card, index) => <article key={card.title}>
            <span>0{index + 1}</span><h3>{card.title}</h3><p>{card.text}</p>
          </article>)}
        </div>
      </section>

      <section className={styles.paid} id="personal-consultation" aria-labelledby="review-paid-title">
        <div>
          <p className={styles.eyebrow}>{t.paidEyebrow}</p>
          <h2 id="review-paid-title">{t.paidTitle}</h2>
          <p>{t.paidLead}</p>
        </div>
        <div className={styles.paidOptions}>
          {t.paidOptions.map((option) => (
            <a key={option.label}
              href={"https://wa.me/14376066502?text=" + encodeURIComponent(option.message)}
              target="_blank" rel="noopener noreferrer" data-contact-channel="whatsapp">
              <span>{option.label}</span><strong>{option.price}</strong><MessageCircle size={18} aria-hidden="true" />
            </a>
          ))}
          <p>{t.paidNote}</p>
        </div>
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

      <section className={styles.details} id="how-it-works" aria-labelledby="review-steps-title">
        <header className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.stepsEyebrow}</p>
          <h2 id="review-steps-title">{t.stepsHeading}</h2>
          <p>{t.stepsLead}</p>
        </header>
        <ol className={styles.steps}>
          {t.steps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber}>0{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>
        <details className={styles.advancedIntake}>
          <summary>{outcome.advanced}</summary>
          <FreeSituationReviewForm locale={locale} />
        </details>
      </section>

      <section className={styles.finalCapture} aria-labelledby="review-final-title">
        <div className={styles.finalIntro}>
          <h2 id="review-final-title">{t.finalTitle}</h2>
        </div>
        <FreeReviewQuickRequest locale={locale} />
      </section>
      <div className={styles.bottomServices}>
        <Link href={"/" + locale + "/services"} className={styles.backToServices}>{t.back} <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>

    </main>
  );
}
