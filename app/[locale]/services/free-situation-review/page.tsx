import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
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
    title: "Бесплатная диагностика ситуации по рисунку",
    description: "Бесплатно: коучинг-форма, рисунок от руки «Я, цель, проблема» и персональный письменный отчёт от Андрея Литвинова. Не звонок и не медицинская диагностика.",
    eyebrow: "БЕСПЛАТНО · КОУЧИНГ-ФОРМА + РИСУНОК + ПИСЬМЕННЫЙ ОТЧЁТ",
    heading: "Бесплатная диагностика вашей ситуации по рисунку",
    lead: "Опишите вашу проблему в короткой анкете. Нарисуйте на бумаге ручкой себя, цель и проблему. Я проанализирую рисунок и ответы и пришлю персональный письменный отчёт — без обязательной личной сессии.",
    bullets: ["Заполните коучинг-форму", "Нарисуйте «Я — цель — проблема» от руки", "Получите письменный отчёт"],
    free: "Бесплатно · Онлайн · Письменный отчёт · Без звонка",
    request: "Начать бесплатную диагностику",
    practitioner: "Андрей Литвинов",
    experience: "Личная и групповая практика с 2002 года",
    transparency: "Диагностика — в смысле символического анализа рисунка и ситуации. Не является медицинским диагнозом или гарантией результата.",
    stepsEyebrow: "КАК ЭТО РАБОТАЕТ",
    stepsHeading: "Три простых шага",
    stepsLead: "Вместо бесплатной вводной беседы вы присылаете свои материалы, а я готовлю для вас письменный разбор.",
    steps: [
      { title: "Коучинг-форма", text: "Кратко опишите проблему, свою цель и то, что мешает двигаться." },
      { title: "Рисунок на бумаге", text: "Ручкой нарисуйте «Я», «Цель», «Проблема», сфотографируйте и отправьте вместе с анкетой." },
      { title: "Ваш письменный отчёт", text: "Я изучаю ответы и рисунок и лично высылаю интерпретацию ситуации." },
    ],
    paidEyebrow: "ОТДЕЛЬНАЯ ПЛАТНАЯ УСЛУГА",
    paidTitle: "Хотите личную сессию?",
    paidLead: "Личный разговор и работа в реальном времени оплачиваются отдельно. Бесплатная диагностика не обязывает записываться.",
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
    aboutHeading: "Диагностику провожу я лично",
    aboutText: "Я внимательно изучаю заполненную коучинг-форму и рисунок, чтобы подготовить письменное наблюдение за вашей ситуацией. Если вы пожелаете отдельный разговор, доступны платные личные сессии.",
    aboutLink: "Подробнее обо мне",
    faqTitle: "Частые вопросы",
    faqs: [
      { q: "Что именно бесплатно?", a: "Анализ заполненной коучинг-формы и рисунка от руки с персональным письменным отчётом. Бесплатного созвона в этот формат не входит." },
      { q: "Что нужно нарисовать?", a: "На листе бумаги ручкой изобразите три элемента: «Я», «Цель», «Проблема». Нет правильного или неправильного художественного способа." },
      { q: "Как отправить материалы?", a: "Заполните форму на этой странице, скопируйте ответы, вставьте их в WhatsApp и прикрепите фото рисунка. Отправка происходит только с вашего подтверждения." },
      { q: "Сколько стоит личная сессия?", a: "Отдельная экспресс-консультация 30 минут стоит €50. Полная личная сессия 60 минут — €100." },
      { q: "Это медицинская или психологическая диагностика?", a: "Нет. Это символический разбор ситуации, а не медицинский или психиатрический диагноз или назначение лечения. При симптомах обратитесь к квалифицированному специалисту." },
    ],
    finalTitle: "Начните с анкеты и рисунка — отчёт получите письменно",
    finalAction: "Перейти к бесплатной диагностике",
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
    title: "Free situation & drawing assessment",
    description: "Free coaching questionnaire + hand-drawn ME / GOAL / PROBLEM drawing, with a personal written report from Andrey Litvinov. No free call or medical diagnosis.",
    eyebrow: "FREE · COACHING FORM + HAND DRAWING + WRITTEN REPORT",
    heading: "A free situation assessment based on your drawing",
    lead: "Describe your concern in a short coaching form. Draw yourself, your goal and your problem by hand on paper. I'll review both and send a personal written report — no live consultation required.",
    bullets: ["Complete the coaching questionnaire", "Draw ME · GOAL · PROBLEM by hand", "Receive your written report"],
    free: "Free · Online · Written report · No call required",
    request: "Start my free drawing assessment",
    practitioner: "Andrey Litvinov",
    experience: "Facilitating personal and group development since 2002",
    transparency: "The word assessment refers to symbolic reflection on a drawing and situation, not a medical diagnosis or a promised result.",
    stepsEyebrow: "HOW IT WORKS",
    stepsHeading: "Three simple steps",
    stepsLead: "Instead of a free introductory call, you send your materials and I prepare a written situation review.",
    steps: [
      { title: "Coaching questionnaire", text: "Briefly describe your problem, goal and what feels difficult." },
      { title: "Pen-and-paper drawing", text: "Draw ME, GOAL and PROBLEM by hand, take a photo and send it with your answers." },
      { title: "Your written report", text: "I review your questionnaire and drawing and send my personal interpretation in writing." },
    ],
    paidEyebrow: "SEPARATE PAID SERVICE",
    paidTitle: "Prefer a personal session?",
    paidLead: "Live, one-to-one consultations are booked separately. You can receive the free written assessment without booking a session.",
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
    aboutHeading: "I personally review your drawing",
    aboutText: "I read your coaching answers and study your handwritten drawing to prepare personal written observations about your situation. If you would prefer to talk, paid sessions are available separately.",
    aboutLink: "Read about my work",
    faqTitle: "Questions before you begin",
    faqs: [
      { q: "What exactly is free?", a: "The review of your completed coaching questionnaire and handwritten drawing, plus a personal written report. The free offer does not include a live call." },
      { q: "What should I draw?", a: "On one sheet of paper, use a pen to draw three elements: ME, MY GOAL and MY PROBLEM. There is no artistic right or wrong way." },
      { q: "How do I send the materials?", a: "Fill out the form here, copy your answers into WhatsApp and attach a photo of your paper drawing. You choose when to press Send." },
      { q: "How much does a personal consultation cost?", a: "A separate 30-minute express consultation is €50; a full 60-minute personal session is €100." },
      { q: "Is this a medical or mental-health assessment?", a: "No. It is an interpretive situation review, not a medical diagnosis, psychiatric diagnosis or prescription. Seek a qualified healthcare professional for medical concerns." },
    ],
    finalTitle: "Start with your form and drawing, and receive a written review",
    finalAction: "Start my free drawing assessment",
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
    title: "Evaluación gratuita mediante dibujo",
    description: "Formulario de coaching y dibujo a mano (YO, META, PROBLEMA) con un informe personal escrito de Andrey Litvinov. Sin llamada gratuita ni diagnóstico médico.",
    eyebrow: "GRATIS · FORMULARIO + DIBUJO A MANO + INFORME ESCRITO",
    heading: "Evaluación gratuita de tu situación mediante un dibujo",
    lead: "Describe tu problema en un formulario breve, dibuja a mano tu persona, meta y problema. Revisaré ambos materiales y te enviaré un informe personal escrito, sin llamada obligatoria.",
    bullets: ["Completa el formulario de coaching", "Dibuja YO · META · PROBLEMA en papel", "Recibe tu informe escrito"],
    free: "Gratis · Online · Informe escrito · Sin llamada",
    request: "Iniciar evaluación gratuita",
    practitioner: "Andrey Litvinov",
    experience: "Experiencia en desarrollo personal y trabajo grupal desde 2002",
    transparency: "La evaluación es un análisis simbólico, no un diagnóstico médico ni una promesa de resultados.",
    stepsEyebrow: "CÓMO FUNCIONA",
    stepsHeading: "Tres pasos sencillos",
    stepsLead: "No hay una llamada introductoria gratuita: envías el formulario y dibujo, y preparo un informe personal escrito.",
    steps: [
      { title: "Formulario de coaching", text: "Describe tu problema, meta y aquello que te dificulta avanzar." },
      { title: "Dibujo con bolígrafo", text: "Dibuja YO, META y PROBLEMA en papel; toma una foto y envíala con tus respuestas." },
      { title: "Tu informe escrito", text: "Reviso ambos materiales y te envío una interpretación personal por escrito." },
    ],
    paidEyebrow: "SERVICIO DE PAGO APARTE",
    paidTitle: "¿Prefieres una sesión personal?",
    paidLead: "Las consultas individuales en directo se reservan por separado. La evaluación escrita gratuita no exige una sesión.",
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
    aboutHeading: "Reviso personalmente tu dibujo",
    aboutText: "Leo tu formulario de coaching y examino el dibujo a mano para enviarte observaciones escritas sobre tu situación. Las sesiones personales en directo son de pago por separado.",
    aboutLink: "Conoce mi trabajo",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿Qué es exactamente gratis?", a: "El análisis del formulario de coaching y dibujo a mano con un informe escrito personal. No incluye una llamada en directo." },
      { q: "¿Qué debo dibujar?", a: "En una hoja, dibuja con bolígrafo YO, MI META y MI PROBLEMA. No necesitas habilidades artísticas." },
      { q: "¿Cómo envío el material?", a: "Completa el formulario, copia las respuestas en WhatsApp y adjunta una foto del dibujo. Solo se envía cuando tú lo decides." },
      { q: "¿Cuánto cuesta una sesión personal?", a: "La consulta exprés de 30 minutos cuesta €50; la sesión completa de 60 minutos cuesta €100." },
      { q: "¿Es un diagnóstico médico o psicológico?", a: "No. Es una revisión simbólica de la situación, sin diagnósticos médicos o psiquiátricos ni recetas. Consulta a profesionales sanitarios para cuestiones médicas." },
    ],
    finalTitle: "Empieza con el formulario y dibujo y recibe un informe escrito",
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

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />

      <section className={styles.contentGrid} aria-labelledby="review-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="review-hero-title">{t.heading}</h1>
          <p className={styles.lead}>{t.lead}</p>
          <ul className={styles.benefits}>
            {t.bullets.map((point) => <li key={point}><CheckCircle2 size={21} aria-hidden="true"/><span>{point}</span></li>)}
          </ul>
          <p className={styles.freeLine}>{t.free}</p>
          <a className={styles.mobileCta} href="#request-free-review">{t.request} <ArrowRight size={18} aria-hidden="true"/></a>
          <div className={styles.introContact}>
            <div className={styles.photo}>
              <Image src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill sizes="88px" />
            </div>
            <div><strong>{t.practitioner}</strong><span>{t.experience}</span></div>
          </div>
          <p className={styles.safety}>{t.transparency}</p>
        </div>
        <div className={styles.capturePanel} id="request-free-review">
          <FreeSituationReviewForm locale={locale} />
        </div>
      </section>

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
      </section>

      <section className={styles.scope} aria-labelledby="review-scope-title">
        <p className={styles.eyebrow}>{t.stepsEyebrow}</p>
        <h2 id="review-scope-title">{t.scopeTitle}</h2>
        <p>{t.scopeIntro}</p>
        <ul>{t.scopeItems.map(item => <li key={item}><CheckCircle2 size={19} aria-hidden="true"/><span>{item}</span></li>)}</ul>
        <p className={styles.scopeLimit}>{t.scopeLimit}</p>
      </section>

      <section className={styles.paid} aria-labelledby="review-paid-title">
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

      <section className={styles.directions} aria-labelledby="review-directions-title">
        <header className={styles.sectionIntro}>
          <h2 id="review-directions-title">{t.directionsTitle}</h2>
          <p>{t.directionsLead}</p>
        </header>
        <div className={styles.directionList}>
          {t.directions.map((direction, index) => (
            <article key={direction.href}>
              <span className={styles.directionNumber}>0{index + 1}</span>
              <div><h3>{direction.title}</h3><p>{direction.text}</p></div>
              <Link href={"/" + locale + "/services/" + direction.href} aria-label={direction.title}><ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.about} aria-labelledby="review-about-title">
        <div className={styles.aboutPhoto}><Image src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill sizes="(max-width: 767px) 100vw, 380px" /></div>
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

      <section className={styles.closing}>
        <MessageCircle aria-hidden="true" size={24}/>
        <h2>{t.finalTitle}</h2>
        <a href="#request-free-review">{t.finalAction} <ArrowRight size={18} aria-hidden="true"/></a>
        <Link href={"/" + locale + "/services"} className={styles.back}>{t.back}</Link>
      </section>
    </main>
  );
}
