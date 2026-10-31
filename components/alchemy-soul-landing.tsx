import { StaticPortrait } from "@/components/static-portrait";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check,
  Heart, Layers3, PlayCircle, ShieldCheck, Sparkles,
} from "lucide-react";
import type { Locale } from "@/data/remedies";
type AlchemyLocale = Locale | "es";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { testimonialVideos, locallyArchivedVideoPosterIds } from "@/components/personal-testimonials";
import { AlchemySoulFormatSelector, AlchemySoulLeadForm } from "@/components/alchemy-soul-lead-form";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { getServiceVideoMedia } from "@/data/service-video-library";
import styles from "./alchemy-soul-landing.module.css";

/**
 * The compact turquoise service landing builds on the source-backed PR #498
 * design and the canonical four-stage psycho-homeopathy method.
 * Each primary mobile section is intentionally one screen of content.
 * This is one service, not a second "psychohomeopathy" sales page.
 */
const copy = {
  ru: {
    back: "Все услуги",
    kicker: "ЛИЧНАЯ РАБОТА · АНДРЕЙ ЛИТВИНОВ",
    title: "Алхимия души",
    titleDetail: "Psychic Alchemy · Психогомеопатия",
    headline: "Понять свой сценарий, найти ресурс и выбрать следующий шаг.",
    intro: "Сначала исследуем ситуацию через расстановку, затем через образную гипнотерапию — возможный внутренний корень. Дополнительные ресурсы подбираем индивидуально.",
    chips: ["Карта ситуации", "Личный ресурс", "План действий"],
    cta: "Забронировать сеанс",
    freeStart: "Начать с бесплатного письменного разбора",
    practitioner: "С Андреем Литвиновым",
    place: "Онлайн · Торонто по договорённости",

    painKicker: "С ЧЕМ МОЖНО ОБРАТИТЬСЯ",
    painTitle: "Когда привычный способ уже не помогает",
    painIntro: "Не нужно подбирать правильные слова — можно начать с того, что повторяется.",
    pains: [
      { title: "Отношения", text: "Дистанция, конфликт, повторяющиеся сценарии и границы." },
      { title: "Стресс и блоки", text: "Напряжение, внутренний запрет, страх оценки или перемен." },
      { title: "Дело и деньги", text: "Застой, сложные решения и трудность действовать." },
      { title: "Цели и смысл", text: "Потеря опоры, ясности или направления." },
    ],
    painEnd: "Работаем с вашим реальным запросом, а не с готовым шаблоном.",

    methodKicker: "МОЙ АВТОРСКИЙ ПОДХОД",
    methodTitle: "Как я работаю: четыре этапа",
    methodIntro: "Разбираем вопрос → исследуем связи → находим ресурс → при желании обсуждаем дополнительную практику.",
    steps: [
      { title: "Диагностика ситуации", text: "Уточняем ваш запрос, цель и возможные причины затруднения. Это разбор жизненной ситуации, а не медицинский диагноз." },
      { title: "Системная расстановка", text: "В символической модели исследуем роли, отношения и повторяющийся сценарий. Это гипотезы для размышления, не скрытые факты." },
      { title: "Образная гипнотерапия", text: "Через бережную работу с образами исследуем переживания и ищем субъективные ресурсы и новые варианты действий." },
      { title: "Психогомеопатия — по желанию", text: "Могу обсудить гомеопатическое средство как личную символическую практику. Доказательств ускорения психотерапии или лечения нет." },
    ],
    methodNote: "Не все инструменты обязательны: глубину работы и методы согласуем вместе. Образы не считаются доказательством скрытых событий.",

    videoKicker: "ЗНАКОМСТВО СО МНОЙ",
    videoTitle: "Посмотрите, как я работаю",
    videoIntro: "Короткое ранее опубликованное видео о выборе метода под конкретный запрос.",
    videoNote: "Видео знакомит с общим подходом; не является полной демонстрацией всех этапов «Алхимии души».",

    featuredKicker: "ПЕРВОЕ ЗНАКОМСТВО · ВИДЕО",
    featuredTitle: "Психогомеопатия и Алхимия души — рассказываю сам",
    featuredIntro: "Начните с моего видео. Ниже — как проходит персональная работа: сначала ваш запрос, затем исследование ситуации, внутренних реакций и доступных ресурсов.",
    featuredVideoNote: "Оригинальная запись на русском. Видео загружается только после нажатия Play; просмотр необязателен.",
    featuredVideoAction: "Обсудить мой запрос",
    featuredVideoFree: "Сначала бесплатно",

    reviewsKicker: "ОПЫТ КЛИЕНТОВ",
    reviewsTitle: "Люди рассказывают сами",
    reviewsIntro: "Ранее опубликованные видеоотзывы о разных форматах моей работы.",
    swipe: "Листайте отзывы в сторону →",
    reviewsNote: "Индивидуальный опыт не гарантирует аналогичного результата.",

    optionsKicker: "ФОРМАТЫ РАБОТЫ",
    optionsTitle: "Выберите подходящее начало",
    shortName: "Экспресс-разбор",
    shortTime: "30 минут",
    shortPrice: "€50",
    shortText: "Прояснить основной узел и первый шаг.",
    fullName: "Личная сессия",
    fullTime: "60 минут",
    fullPrice: "€100",
    fullText: "Подробнее исследовать ситуацию и внутренние реакции.",
    programTitle: "Поддержка в течение месяца",
    programDescription: "2 личные сессии + 4 недели сопровождения и наблюдения изменений.",
    programPrice: "€200 за месяц · 2 × 60 минут · без автопродления",
    optionsAction: "Заказать сеанс",
    freeText: "Хотите сначала бесплатно? ",
    freeLink: "Получить письменный разбор ситуации",

    faqKicker: "ВАЖНО ЗНАТЬ",
    faqTitle: "Коротко о главном",
    faq: [
      { q: "Это медицинская диагностика?", a: "Нет. Расстановка и работа с образами служат для исследования переживаний и ситуаций, а не для установления медицинских диагнозов." },
      { q: "Нужна ли гомеопатия каждому?", a: "Нет. Гомеопатический компонент добровольный. Надёжных доказательств эффективности гомеопатии для лечения заболеваний нет." },
      { q: "Это можно делать онлайн?", a: "Да. Основной формат — онлайн. Возможность личной встречи в Торонто обсуждается индивидуально." },
      { q: "Что будет после заявки?", a: "Откроется WhatsApp с подготовленным сообщением. Вы сами решите, отправлять ли его. Затем согласуем время и формат; никакого списания денег нет." },
    ],

    requestKicker: "ВАШ ПЕРВЫЙ ШАГ",
    requestTitle: "Начнём с вашего вопроса",
    requestIntro: "Выберите формат и тему, затем удобный мессенджер — WhatsApp или Telegram.",
    safety: "Это авторская консультативная и символическая практика, не замена медицинской или психиатрической помощи. Гомеопатия не имеет надёжной доказательной эффективности при лечении заболеваний; не меняйте назначенное лечение без врача. Результаты не гарантируются.",
  },
  en: {
    back: "All services",
    kicker: "PERSONAL WORK · ANDREY LITVINOV",
    title: "Alchemy of the Soul",
    titleDetail: "Psychic Alchemy · Psycho-homeopathy",
    headline: "Understand the pattern. Find a resource. Choose your next step.",
    intro: "We first map the situation through a constellation, then explore the possible inner root through guided-imagery hypnotherapy. Additional resources are chosen individually.",
    chips: ["Situation map", "Personal resource", "Action plan"],
    cta: "Book a Session",
    freeStart: "Start with a free written situation review",
    practitioner: "With Andrey Litvinov",
    place: "Online · Toronto by arrangement",

    painKicker: "WHAT YOU CAN BRING",
    painTitle: "When the same pattern keeps returning",
    painIntro: "You need not explain it perfectly. Begin with what feels stuck or familiar.",
    pains: [
      { title: "Relationships", text: "Distance, conflict, recurring patterns and boundaries." },
      { title: "Stress and blocks", text: "Tension, internal restrictions and fear of judgement." },
      { title: "Work and money", text: "Feeling stuck, difficult choices and trouble taking action." },
      { title: "Goals and meaning", text: "Losing your sense of direction, clarity or support." },
    ],
    painEnd: "We begin with your question, not a one-size-fits-all protocol.",

    methodKicker: "MY INTEGRATED APPROACH",
    methodTitle: "My four-step approach",
    methodIntro: "Clarify your question → map relationships → explore inner resources → consider an optional practice.",
    steps: [
      { title: "Situation diagnosis", text: "Clarify your question, desired outcome and possible obstacles. This is a life-situation review, not a medical diagnosis." },
      { title: "Systemic constellation", text: "Use a symbolic map of roles and relationships to explore recurring patterns. These are hypotheses, not hidden facts." },
      { title: "Guided-imagery hypnotherapy", text: "Use consent-led imagery to explore feelings, personal resources and possible new responses." },
      { title: "Optional psycho-homeopathy", text: "A homeopathic remedy can be discussed as a personal symbolic practice only. It has no reliable evidence for accelerating therapy or treating illness." },
    ],
    methodNote: "Every method is optional and agreed with you. Imagery is not evidence of hidden events or recovered factual memories.",

    videoKicker: "MEET MY APPROACH",
    videoTitle: "See how I work",
    videoIntro: "A previously published short video about choosing a method for each person's situation.",
    videoNote: "This introduces the broader approach, not all stages of the Alchemy of the Soul service.",

    featuredKicker: "MEET THE PRACTITIONER · 5-MINUTE VIDEO",
    featuredTitle: "Psychic Alchemy — in my own words",
    featuredIntro: "Begin with my introduction, then explore how a personal session starts with your real question and combines systemic exploration, guided imagery and optional complementary resources.",
    featuredVideoNote: "Original English audio. The YouTube player loads only after you choose to press Play. Watching is optional.",
    featuredVideoAction: "Discuss my situation",
    featuredVideoFree: "Start free",

    reviewsKicker: "CLIENT EXPERIENCES",
    reviewsTitle: "Hear from people I've worked with",
    reviewsIntro: "Previously published testimonials from several kinds of personal sessions.",
    swipe: "Swipe for more stories →",
    reviewsNote: "Personal experiences are not guarantees of similar results.",

    optionsKicker: "PERSONAL FORMATS",
    optionsTitle: "Choose where to begin",
    shortName: "Express review",
    shortTime: "30 minutes",
    shortPrice: "€50",
    shortText: "Clarify the main issue and first step.",
    fullName: "Personal session",
    fullTime: "60 minutes",
    fullPrice: "€100",
    fullText: "Explore your situation and inner patterns in more depth.",
    programTitle: "Four-week personal support",
    programDescription: "2 personal sessions + 4 weeks of individual follow-up and reflection.",
    programPrice: "€200 per month · 2 × 60 min · no automatic renewal",
    optionsAction: "Book a session",
    freeText: "Prefer to start free? ",
    freeLink: "Request a written situation review",

    faqKicker: "GOOD TO KNOW",
    faqTitle: "A few helpful answers",
    faq: [
      { q: "Is this medical diagnosis?", a: "No. Constellation and imagery work explore experiences and situations. They do not establish medical diagnoses." },
      { q: "Is homeopathy required?", a: "No, it is optional. Homeopathy has no reliable evidence of effectiveness for treating medical or mental-health conditions." },
      { q: "Can we work online?", a: "Yes. Online is the main option, with in-person Toronto availability discussed individually." },
      { q: "What happens when I enquire?", a: "Choose your phone number or Google sign-in to send a booking enquiry. Andrey confirms a time before Pay Your Session reveals the cart. No automatic charge." },
    ],

    requestKicker: "YOUR FIRST STEP",
    requestTitle: "Start with your question",
    requestIntro: "Choose a format and topic, then select WhatsApp or Telegram to request your booking.",
    safety: "This is an author's reflective and symbolic consultation, not a replacement for medical or psychiatric care. Homeopathy has no reliable evidence for treating health conditions. Do not change prescribed medication without medical guidance. Outcomes are not guaranteed.",
  },
  es: {
    back: "Todos los servicios",
    kicker: "TRABAJO PERSONAL · ANDREY LITVINOV",
    title: "Alquimia del Alma",
    titleDetail: "Psychic Alchemy · Psicohomeopatía",
    headline: "Comprende el patrón, encuentra un recurso y elige tu siguiente paso.",
    intro: "Primero observamos la situación mediante una constelación y después exploramos posibles patrones internos con hipnoterapia de imágenes guiadas. Elegimos los recursos complementarios de forma individual.",
    chips: ["Mapa de situación", "Recurso personal", "Plan de acción"],
    cta: "Reservar una sesión",
    freeStart: "Empezar con una revisión escrita gratuita",
    practitioner: "Con Andrey Litvinov",
    place: "En línea · Toronto con cita previa",

    painKicker: "QUÉ PODEMOS EXPLORAR",
    painTitle: "Cuando vuelve el mismo patrón",
    painIntro: "No necesitas explicarlo perfectamente. Podemos comenzar con lo que te preocupa o se repite.",
    pains: [
      { title: "Relaciones", text: "Distancia, conflictos, patrones repetidos y límites personales." },
      { title: "Estrés y bloqueos", text: "Tensión, restricciones internas o miedo al juicio de los demás." },
      { title: "Trabajo y dinero", text: "Estancamiento, decisiones difíciles o dificultad para actuar." },
      { title: "Metas y sentido", text: "Pérdida de dirección, claridad o apoyo interior." },
    ],
    painEnd: "Partimos de tu pregunta, no de un método único para todo el mundo.",

    methodKicker: "MI ENFOQUE INTEGRADO",
    methodTitle: "Mi proceso en cuatro etapas",
    methodIntro: "Aclarar la pregunta → explorar vínculos → encontrar recursos → valorar una práctica opcional.",
    steps: [
      { title: "Diagnóstico de la situación", text: "Aclaramos tu pregunta, el objetivo y posibles obstáculos. Es una revisión personal, no un diagnóstico médico." },
      { title: "Constelación sistémica", text: "Exploramos roles, vínculos y patrones en un mapa simbólico: son hipótesis, no hechos ocultos." },
      { title: "Hipnoterapia con imágenes", text: "Con imágenes guiadas y tu consentimiento buscamos recursos personales y nuevas respuestas posibles." },
      { title: "Psicohomeopatía opcional", text: "El remedio homeopático es una práctica simbólica opcional sin pruebas fiables de que acelere la psicoterapia o trate enfermedades." },
    ],
    methodNote: "Cada método es opcional y se acuerda contigo. Las imágenes no demuestran hechos ocultos ni recuperan recuerdos verificables.",

    videoKicker: "CONOCE MI ENFOQUE",
    videoTitle: "Descubre cómo trabajo",
    videoIntro: "Un breve vídeo ya publicado, en inglés, sobre cómo elijo el método para cada situación.",
    videoNote: "El vídeo presenta el enfoque general, no todas las etapas del servicio Alquimia del Alma. El audio original está en inglés.",

    featuredKicker: "CONOCE AL FACILITADOR · VÍDEO DE 5 MINUTOS",
    featuredTitle: "Psychic Alchemy — explicado por mí",
    featuredIntro: "Comienza con mi presentación y descubre cómo una sesión parte de tu pregunta para explorar la situación, las imágenes guiadas y los recursos complementarios opcionales.",
    featuredVideoNote: "El audio original está en inglés. YouTube solo se carga cuando pulsas Play. El vídeo es opcional.",
    featuredVideoAction: "Consultar mi situación",
    featuredVideoFree: "Empezar gratis",

    reviewsKicker: "EXPERIENCIAS DE CLIENTES",
    reviewsTitle: "Escucha sus experiencias",
    reviewsIntro: "Testimonios en vídeo ya publicados, en inglés, sobre distintos tipos de sesiones personales.",
    swipe: "Desliza para ver más experiencias →",
    reviewsNote: "Las experiencias personales no garantizan resultados similares.",

    optionsKicker: "FORMATOS PERSONALES",
    optionsTitle: "Elige por dónde empezar",
    shortName: "Revisión exprés",
    shortTime: "30 minutos",
    shortPrice: "€50",
    shortText: "Aclarar la cuestión principal y un primer paso.",
    fullName: "Sesión personal",
    fullTime: "60 minutos",
    fullPrice: "€100",
    fullText: "Explorar tu situación y tus patrones internos en más profundidad.",
    programTitle: "Acompañamiento personal de cuatro semanas",
    programDescription: "2 sesiones personales y 4 semanas de seguimiento y reflexión.",
    programPrice: "200 € al mes · 2 × 60 min · sin renovación automática",
    optionsAction: "Solicitar una sesión",
    freeText: "¿Prefieres comenzar gratis? ",
    freeLink: "Solicitar una revisión escrita de tu situación",

    faqKicker: "ES IMPORTANTE SABERLO",
    faqTitle: "Respuestas a preguntas frecuentes",
    faq: [
      { q: "¿Es un diagnóstico médico?", a: "No. Las constelaciones y las imágenes guiadas permiten reflexionar sobre experiencias y situaciones, pero no establecen diagnósticos médicos." },
      { q: "¿Es necesaria la homeopatía?", a: "No, es opcional. La homeopatía carece de pruebas científicas fiables de eficacia para tratar enfermedades físicas o problemas de salud mental." },
      { q: "¿Podemos trabajar en línea?", a: "Sí. La modalidad principal es en línea. La posibilidad de una sesión presencial en Toronto se consulta individualmente." },
      { q: "¿Qué ocurre al enviar una solicitud?", a: "Reserva por teléfono o Google. Andrey confirma primero la hora; después se muestran el carrito y los métodos de pago. Sin cobro automático." },
    ],

    requestKicker: "TU PRIMER PASO",
    requestTitle: "Empecemos por tu pregunta",
    requestIntro: "Elige formato y tema. Solicita tu sesión por WhatsApp o Telegram.",
    safety: "Esta es una consulta reflexiva y simbólica de autor, no un sustituto de la atención médica o psiquiátrica. La homeopatía no tiene pruebas fiables de eficacia para tratar problemas de salud. No cambies tratamientos prescritos sin orientación médica. No se garantizan resultados.",
  },
} as const;


/** Public-only example: never render a real client's private report here. */
const reportCopy = {
  ru: {
    kicker: "ЧТО ВЫ ПОЛУЧАЕТЕ", title: "От понимания к реальному действию",
    intro: "После работы остаются карта ситуации, найденный ресурс и конкретный следующий шаг. Возможность письменного резюме согласуем отдельно.",
    label: "ПРИМЕР · ВЫМЫШЛЕННАЯ СИТУАЦИЯ",
    rows: [
      { key: "Запрос", value: "Трудно сказать о своём решении вслух." },
      { key: "Новый взгляд", value: "Отделить свой выбор от ожиданий других." },
      { key: "Шаг на неделю", value: "Подготовить одну спокойную фразу и попробовать её." },
    ],
    action: "Посмотреть пример отчёта",
    note: "Демонстрационный образец без данных клиентов. Не диагноз и не гарантия результата.",
  },
  en: {
    kicker: "WHAT YOU TAKE AWAY", title: "Turn an insight into action",
    intro: "Leave with a clearer situation map, a resource to try, and a practical next step. A written recap can be agreed separately.",
    label: "EXAMPLE · FICTIONAL SITUATION",
    rows: [
      { key: "Question", value: "I struggle to say my decision aloud." },
      { key: "Perspective", value: "Separate my own choice from others’ expectations." },
      { key: "This week", value: "Prepare one calm sentence and practise saying it." },
    ],
    action: "View example report",
    note: "Fictional example, not client data, a diagnosis or a promised result.",
  },
  es: {
    kicker: "LO QUE TE LLEVAS", title: "De la reflexión a la acción",
    intro: "Una visión más clara de la situación, un recurso personal y un siguiente paso. El resumen escrito se acuerda por separado.",
    label: "EJEMPLO · SITUACIÓN FICTICIA",
    rows: [
      { key: "Pregunta", value: "Me cuesta expresar mi decisión." },
      { key: "Perspectiva", value: "Separar mi decisión de lo que esperan los demás." },
      { key: "Esta semana", value: "Preparar una frase clara y practicarla." },
    ],
    action: "Ver un informe de ejemplo",
    note: "Ejemplo ficticio: sin datos de clientes, diagnóstico ni promesa de resultados.",
  },
} as const;
const stageLabels = {
  ru: ["01 · Разбор", "02 · Расстановка", "03 · Образы", "04 · Ресурс*"],
  en: ["01 · Diagnose", "02 · Map roles", "03 · Imagery", "04 · Support*"],
  es: ["01 · Aclarar", "02 · Vínculos", "03 · Imágenes", "04 · Apoyo*"],
} as const;

// Use the existing consent-led public testimonial archive, retaining real audio languages.
// Each locale starts with its own originals, then shows all originals in the other language.
// Owner-supplied public presentation (23 October 2026). Keep the exact video ID;
 // a YouTube Live link is played through the existing privacy-first poster player.
const featuredIntroVideoEn = {
  youtubeId: "-zacUn_zN6g",
  title: "Psychic Alchemy — Andrey Litvinov",
  language: "en" as const,
  durationSeconds: 300,
};

// Owner-supplied RU recording (23 October 2026). No upload, render or publication.
const featuredIntroVideoRu = {
  youtubeId: "IF0HAhSDwks",
  title: "Психогомеопатия / Алхимия души — Андрей Литвинов",
  language: "ru" as const,
};

export function AlchemySoulLanding({ locale }: { locale: AlchemyLocale }) {
  const t = copy[locale];
  const report = reportCopy[locale];
  // Both service routes resolve here. Only /ru uses the Russian video; EN/ES keep the approved English master.
  const featuredIntroVideo = locale === "ru" ? featuredIntroVideoRu : featuredIntroVideoEn;
  const video = getServiceVideoMedia("alchemy", locale);
  const reviews = [...testimonialVideos[locale], ...testimonialVideos[locale === "ru" ? "en" : "ru"]];
  const freeReview = "/" + locale + "/services/free-situation-review";
  const heroWhatsApp = whatsappEnquiryUrl({
    locale,
    service: locale === "ru" ? "Алхимия души / Психогомеопатия" : locale === "es" ? "Alquimia del Alma / Psicohomeopatía" : "Alchemy of the Soul / Psycho-homeopathy",
    request: locale === "ru"
      ? "Хочу заказать индивидуальный сеанс. Подскажите доступные дату и время для подтверждения записи."
      : locale === "es" ? "Quisiera solicitar una sesión personal. Indícame las fechas y los horarios disponibles para confirmar." : "I would like to book a personal session. Please send your available dates and times to confirm.",
    option: locale === "ru" ? "Личная сессия · 60 минут · €100" : locale === "es" ? "Sesión personal · 60 minutos · €100" : "Personal session · 60 min · €100",
    pagePath: "/" + locale + "/services/alchemy-of-soul",
  });

  return (
    <main className={styles.page} lang={locale} data-core-service-detail="alchemy" data-alchemy-soul-landing="teal-media-story-v4">
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={locale === "ru" ? "Навигация" : locale === "es" ? "Ruta de navegación" : "Breadcrumb"}>
          <Link href={"/" + locale + "/services"}><ArrowLeft size={15} aria-hidden="true" />{t.back}</Link>
          <span aria-hidden="true">/</span><span>{t.title}</span>
        </nav>


        <section className={[styles.panel, styles.featuredVideoSection].join(" ")}
          data-alchemy-panel="featured-video" data-alchemy-visual="video" aria-labelledby="alchemy-featured-video-title">
          <div className={styles.featuredVideoText}>
            <span className={styles.eyebrow}><PlayCircle size={15} aria-hidden="true" />{t.featuredKicker}</span>
            <h2 id="alchemy-featured-video-title">{t.featuredTitle}</h2>
            <p>{t.featuredIntro}</p>
            <div className={styles.featuredVideoActions}>
              <a className={styles.featuredVideoAction} href="#alchemy-request">{t.featuredVideoAction}<ArrowRight size={16} aria-hidden="true" /></a>
              <Link className={styles.featuredFree} href={freeReview}>{t.featuredVideoFree}<ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className={styles.featuredVideoMedia} data-alchemy-featured-video={featuredIntroVideo.youtubeId}>
            <SiteVideoPlayer video={featuredIntroVideo} locale={locale} compact minimal posterPriority fallbackPoster="/images/holistic-house/andy-about.png" />
          </div>
          <p className={styles.featuredVideoNote}>{t.featuredVideoNote}</p>
        </section>

        <section className={[styles.panel, styles.hero].join(" ")} data-alchemy-panel="hero" data-alchemy-visual="photo" aria-labelledby="alchemy-title">
          <p className={styles.heroEyebrow}><Sparkles size={14} aria-hidden="true" />{t.kicker}</p>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <h1 id="alchemy-title">{t.title}</h1>
              <span className={styles.heroSubname}>{t.titleDetail}</span>
              <p className={styles.heroStatement}>{t.headline}</p>
            </div>
            <div className={styles.heroPortrait}>
              <StaticPortrait src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill priority sizes="(max-width: 680px) 140px, 340px" />
            </div>
          </div>

          <div className={styles.heroPricing}>
            <span>{locale === "ru" ? "Экспресс · 30 мин · €50" : locale === "es" ? "Exprés · 30 min · €50" : "Express · 30 min · €50"}</span>
            <span>{locale === "ru" ? "Личная сессия · 60 мин · €100" : locale === "es" ? "Sesión personal · 60 min · €100" : "Personal session · 60 min · €100"}</span>
          </div>
          <div className={styles.heroOrder}>
            <ContactChannelChooser locale={locale} whatsappUrl={heroWhatsApp} label={t.cta}
              compactPhone compactTrigger stayAfterSave bookingSku="personal-session-60"
              className={styles.heroOrderButton} event="service_request_start"
              attributes={{ "data-alchemy-booking": "hero" }} />
          </div>
          <div className={styles.heroRequestNote}>
            <span>{locale === "ru" ? "Запрос не списывает оплату и не подтверждает запись." : locale === "es" ? "Enviar una solicitud no cobra ni confirma una reserva." : "An enquiry does not charge you or confirm a booking."}</span>
            <a href="#alchemy-options-title">{locale === "ru" ? "Сравнить форматы" : locale === "es" ? "Comparar formatos" : "Compare formats"}<ArrowRight size={14} aria-hidden="true" /></a>
          </div>
          <div className={styles.heroBottom}><span>{t.place}</span><Link href={freeReview}>{t.freeStart}<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <details className={styles.heroMore} data-alchemy-details="introduction">
            <summary>{locale === "ru" ? "Как проходит работа" : locale === "es" ? "Cómo trabajamos" : "How the approach works"}</summary>
            <div className={styles.heroMoreContent}>
              <p className={styles.heroLead}>{t.intro}</p>
              <div className={styles.chips}>{t.chips.map((chip) => <span key={chip}><Check size={13} aria-hidden="true" />{chip}</span>)}</div>
            </div>
          </details>
        </section>

        <section className={[styles.panel, styles.painSection].join(" ")} data-alchemy-panel="situations" data-alchemy-visual="photo" aria-labelledby="alchemy-situations-title">
          <div className={styles.panelPhoto}><Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width:680px) 100vw, 540px" /></div>
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}><Heart size={14} aria-hidden="true" />{t.painKicker}</span>
            <h2 id="alchemy-situations-title">{t.painTitle}</h2>
            <p>{t.painIntro}</p>
          </header>
          <div className={styles.painGrid}>
            <article className={styles.painCard}>
              <span className={styles.iconCircle} aria-hidden="true"><Heart size={20} /></span>
              <h3>{t.pains[0].title}</h3><p>{t.pains[0].text}</p>
            </article>
          </div>
          <Link className={styles.chapterAction} href="#alchemy-options-title">{t.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
          <details className={styles.chapterMore}>
            <summary>{locale === "ru" ? "Другие запросы" : locale === "es" ? "Otros motivos" : "Other situations"}</summary>
            <div className={styles.moreGrid}>
              {t.pains.slice(1).map((item) => <article className={styles.painCard} key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}
            </div>
            <p className={styles.sectionClosing}>{t.painEnd}</p>
          </details>
        </section>

        <section className={[styles.panel, styles.methodSection].join(" ")} data-alchemy-panel="method" data-alchemy-visual="photo" aria-labelledby="alchemy-method-title">
          <div className={styles.panelPhoto}><Image src="/images/holistic-house/report-lighthouse-coast.webp" alt="" fill sizes="(max-width:680px) 100vw, 540px" /></div>
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}><Layers3 size={14} aria-hidden="true" />{t.methodKicker}</span>
            <h2 id="alchemy-method-title">{t.methodTitle}</h2>
            <p>{t.methodIntro}</p>
          </header>
          <ol className={styles.methodJourney} data-alchemy-method-sequence aria-label={t.methodTitle}>
            {t.steps.map((item, index) => (
              <li key={item.title} title={item.title}>
                <span>{stageLabels[locale][index]}</span>
              </li>
            ))}
          </ol>
          <Link className={styles.chapterAction} href="#alchemy-options-title">{t.cta}<ArrowRight size={17} aria-hidden="true"/></Link>
          <details className={styles.chapterMore}>
            <summary>{locale === "ru" ? "Остальные этапы" : locale === "es" ? "Otras etapas" : "Explore the next steps"}</summary>
            <div className={styles.moreGrid}>
              {t.steps.map((item, index) => (
                <article className={styles.methodStep} key={item.title}>
                  <span className={styles.methodNumber}>{"0" + (index + 1)}</span>
                  <div><h3>{item.title}</h3><p>{item.text}</p></div>
                </article>
              ))}
            </div>
            <p className={styles.methodNote}><ShieldCheck size={17} aria-hidden="true" />{t.methodNote}</p>
          </details>
        </section>


        <section className={[styles.panel, styles.reportSection].join(" ")} data-alchemy-panel="report" data-alchemy-visual="photo" aria-labelledby="alchemy-report-title">
          <div className={styles.panelPhoto}><Image src="/images/holistic-house/report-lighthouse-coast.avif" alt="" fill sizes="(max-width:680px) 100vw, 540px" /></div>
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}><ShieldCheck size={14} aria-hidden="true" />{report.kicker}</span>
            <h2 id="alchemy-report-title">{report.title}</h2>
            <p>{report.intro}</p>
          </header>
          <div className={styles.reportPreview} data-alchemy-report-example>
            <span className={styles.reportLabel}>{report.label}</span>
            {report.rows.map(row => (
              <div className={styles.reportRow} key={row.key}><strong>{row.key}</strong><span>{row.value}</span></div>
            ))}
          </div>
          <Link className={styles.chapterAction} href={"/" + locale + "/services/alchemy-of-soul/example-report"}>
            {report.action}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <p className={styles.reportNote}>{report.note}</p>
        </section>

        <section className={[styles.panel, styles.videoSection].join(" ")} id="service-video" data-alchemy-panel="video" data-alchemy-visual="video" aria-labelledby="alchemy-video-title">
          <div className={styles.videoText}>
            <span className={styles.eyebrow}><PlayCircle size={15} aria-hidden="true" />{t.videoKicker}</span>
            <h2 id="alchemy-video-title">{t.videoTitle}</h2>
            <p>{t.videoIntro}</p>
          </div>
          <div className={styles.videoMedia}>
            <SiteVideoPlayer video={video.video} locale={locale} compact minimal fallbackPoster={video.poster} />
          </div>
          <p className={styles.videoNote}>{t.videoNote}</p>
        </section>

        <section className={[styles.panel, styles.reviewSection].join(" ")} id="reviews" data-alchemy-panel="reviews" data-alchemy-visual="video" aria-labelledby="alchemy-reviews-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.reviewsKicker}</span>
            <h2 id="alchemy-reviews-title">{t.reviewsTitle}</h2>
            <p>{t.reviewsIntro}</p>
          </header>
          <div className={styles.reviewStack} data-alchemy-review-stack data-vertical-review-list
            role="region" aria-label={t.reviewsTitle} tabIndex={0}>
            {reviews.map((review) => (
              <article className={styles.reviewCard} key={review.id}
                data-testimonial-video-id={review.id} data-testimonial-original-audio={review.language}>
                <div className={styles.reviewVideo}>
                  <SiteVideoPlayer
                    video={{ youtubeId: review.id, title: review.title, language: review.language }}
                    locale={locale} compact minimal
                    fallbackPoster={locallyArchivedVideoPosterIds.has(review.id)
                      ? "/images/holistic-house/testimonial-posters/" + review.id + ".webp"
                      : undefined}
                  />
                </div>
                <div className={styles.reviewInfo}>
                  <span className={styles.reviewLanguage}>
                    {review.language === "ru"
                      ? locale === "ru" ? "Оригинал · русский RU" : locale === "es" ? "Audio original · ruso RU" : "Original audio · Russian RU"
                      : locale === "ru" ? "Оригинал · английский EN" : locale === "es" ? "Audio original · inglés EN" : "Original audio · English EN"}
                  </span>
                  <h3>{review.title}</h3>
                  <a href={"https://www.youtube.com/watch?v=" + review.id}
                    target="_blank" rel="noopener noreferrer">
                    {locale === "ru" ? "Смотреть отзыв" : locale === "es" ? "Ver testimonio" : "Watch testimonial"}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.reviewNote} data-alchemy-review-note>{t.reviewsNote}</p>
        </section>

        <section className={[styles.panel, styles.optionsSection].join(" ")} data-alchemy-panel="formats" data-alchemy-visual="photo" aria-labelledby="alchemy-options-title">
          <div className={styles.panelPhoto}><Image src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width:680px) 100vw, 540px" /></div>
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.optionsKicker}</span>
            <h2 id="alchemy-options-title">{t.optionsTitle}</h2>
          </header>
          <AlchemySoulFormatSelector locale={locale} />
        </section>

        <section className={[styles.panel, styles.faqSection].join(" ")} data-alchemy-panel="faq" data-alchemy-visual="photo" aria-labelledby="alchemy-faq-title">
          <div className={styles.panelPhoto}><Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width:680px) 100vw, 540px" /></div>
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.faqKicker}</span>
            <h2 id="alchemy-faq-title">{t.faqTitle}</h2>
          </header>
          <div className={styles.faqList}>
            {t.faq.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </div>
        </section>

        <section className={[styles.panel, styles.requestSection].join(" ")} id="alchemy-request" data-alchemy-panel="request" data-alchemy-visual="photo" aria-labelledby="alchemy-request-title">
          <div className={styles.requestText}>
            <div className={styles.panelPhoto}><Image src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width:680px) 100vw, 540px" /></div>
            <span className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" />{t.requestKicker}</span>
            <h2 id="alchemy-request-title">{t.requestTitle}</h2>
            <p>{t.requestIntro}</p>
          </div>
          <AlchemySoulLeadForm locale={locale} />
        </section>

        <p className={styles.safety}><ShieldCheck size={16} aria-hidden="true" />{t.safety}</p>
      </div>
    </main>
  );
}
