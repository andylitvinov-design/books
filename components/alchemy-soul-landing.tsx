import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check,
  Compass, Heart, Layers3, PlayCircle, ShieldCheck, Sparkles, Waves,
} from "lucide-react";
import type { Locale } from "@/data/remedies";
type AlchemyLocale = Locale | "es";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { AlchemySoulFormatSelector, AlchemySoulLeadForm } from "@/components/alchemy-soul-lead-form";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
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
    titleDetail: "Психогомеопатия",
    headline: "Найти то, что удерживает проблему — и наметить путь к изменениям.",
    intro: "Сначала исследуем ситуацию через расстановку, затем через образную гипнотерапию — возможный внутренний корень. Дополнительные ресурсы подбираем индивидуально.",
    chips: ["Расстановка", "Гипнотерапия", "Ресурсная поддержка"],
    cta: "Запросить сеанс",
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
    methodTitle: "Четыре шага одной работы",
    methodIntro: "Сначала понять систему. Затем исследовать внутренний механизм и подобрать поддержку.",
    steps: [
      { title: "Расстановка — карта ситуации", text: "Исследуем цель, отношения, роли и возможные скрытые связи в символической форме." },
      { title: "Гипнотерапия — глубинный уровень", text: "Через образы и символдраму исследуем эмоциональные реакции и внутренние части." },
      { title: "Психогомеопатия — подбор ресурса", text: "По желанию обсуждаем гомеопатический препарат как дополнительную, не доказанную лечебную практику." },
      { title: "Интеграция — реальный шаг", text: "Даосские ресурсы У-Син, архетипы и другие практики по ситуации; наблюдаем изменения." },
    ],
    methodNote: "Не все инструменты обязательны: глубину работы и методы согласуем вместе. Образы не считаются доказательством скрытых событий.",

    videoKicker: "ЗНАКОМСТВО СО МНОЙ",
    videoTitle: "Посмотрите, как я работаю",
    videoIntro: "Короткое ранее опубликованное видео о выборе метода под конкретный запрос.",
    videoNote: "Видео знакомит с общим подходом; не является полной демонстрацией всех этапов «Алхимии души».",

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
    programPrice: "Стоимость обсуждается лично · без подписки",
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
    titleDetail: "Psycho-homeopathy",
    headline: "Explore what keeps a problem in place — and find a possible way forward.",
    intro: "We first map the situation through a constellation, then explore the possible inner root through guided-imagery hypnotherapy. Additional resources are chosen individually.",
    chips: ["Constellations", "Hypnotherapy", "Personal resources"],
    cta: "Request a session",
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
    methodTitle: "Four stages, one coherent process",
    methodIntro: "Map the situation, explore the inner pattern and choose a suitable next step.",
    steps: [
      { title: "Constellation — map the situation", text: "Explore your goal, relationships and roles through a symbolic systemic exercise." },
      { title: "Hypnotherapy — explore deeper", text: "Guided imagery and inner dialogue help explore emotional reactions and inner parts." },
      { title: "Psycho-homeopathy — optional support", text: "If you wish, consider a homeopathic remedy as a complementary practice, not proven medical treatment." },
      { title: "Integration — practical action", text: "When useful, draw on Wu Xing, archetypes and other practices; review real-life changes." },
    ],
    methodNote: "Every method is optional and agreed with you. Imagery is not evidence of hidden events or recovered factual memories.",

    videoKicker: "MEET MY APPROACH",
    videoTitle: "See how I work",
    videoIntro: "A previously published short video about choosing a method for each person's situation.",
    videoNote: "This introduces the broader approach, not all stages of the Alchemy of the Soul service.",

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
    programPrice: "Price agreed individually · no subscription",
    optionsAction: "Book a session",
    freeText: "Prefer to start free? ",
    freeLink: "Request a written situation review",

    faqKicker: "GOOD TO KNOW",
    faqTitle: "A few helpful answers",
    faq: [
      { q: "Is this medical diagnosis?", a: "No. Constellation and imagery work explore experiences and situations. They do not establish medical diagnoses." },
      { q: "Is homeopathy required?", a: "No, it is optional. Homeopathy has no reliable evidence of effectiveness for treating medical or mental-health conditions." },
      { q: "Can we work online?", a: "Yes. Online is the main option, with in-person Toronto availability discussed individually." },
      { q: "What happens when I enquire?", a: "WhatsApp opens a draft for your review; you choose whether to send it. We then discuss availability. There is no automatic booking or charge." },
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
    titleDetail: "Psicohomeopatía",
    headline: "Explora qué mantiene una dificultad — y encuentra una posible forma de avanzar.",
    intro: "Primero observamos la situación mediante una constelación y después exploramos posibles patrones internos con hipnoterapia de imágenes guiadas. Elegimos los recursos complementarios de forma individual.",
    chips: ["Constelaciones", "Hipnoterapia", "Recursos personales"],
    cta: "Solicitar una sesión",
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
    methodTitle: "Cuatro etapas de un mismo proceso",
    methodIntro: "Comprender la situación, explorar el patrón interno y elegir el siguiente paso.",
    steps: [
      { title: "Constelación — mapa de la situación", text: "Exploramos tu objetivo, tus relaciones y tus roles mediante un ejercicio sistémico simbólico." },
      { title: "Hipnoterapia — explorar en profundidad", text: "Las imágenes guiadas y el diálogo interior ayudan a observar reacciones emocionales y partes internas." },
      { title: "Psicohomeopatía — apoyo opcional", text: "Si lo deseas, podemos considerar un remedio homeopático como práctica complementaria, no como tratamiento médico probado." },
      { title: "Integración — acciones concretas", text: "Cuando resulte útil, recurrimos a Wu Xing, arquetipos u otras prácticas y observamos los cambios en la vida cotidiana." },
    ],
    methodNote: "Cada método es opcional y se acuerda contigo. Las imágenes no demuestran hechos ocultos ni recuperan recuerdos verificables.",

    videoKicker: "CONOCE MI ENFOQUE",
    videoTitle: "Descubre cómo trabajo",
    videoIntro: "Un breve vídeo ya publicado, en inglés, sobre cómo elijo el método para cada situación.",
    videoNote: "El vídeo presenta el enfoque general, no todas las etapas del servicio Alquimia del Alma. El audio original está en inglés.",

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
    programPrice: "Precio acordado individualmente · sin suscripción",
    optionsAction: "Solicitar una sesión",
    freeText: "¿Prefieres comenzar gratis? ",
    freeLink: "Solicitar una revisión escrita de tu situación",

    faqKicker: "ES IMPORTANTE SABERLO",
    faqTitle: "Respuestas a preguntas frecuentes",
    faq: [
      { q: "¿Es un diagnóstico médico?", a: "No. Las constelaciones y las imágenes guiadas permiten reflexionar sobre experiencias y situaciones, pero no establecen diagnósticos médicos." },
      { q: "¿Es necesaria la homeopatía?", a: "No, es opcional. La homeopatía carece de pruebas científicas fiables de eficacia para tratar enfermedades físicas o problemas de salud mental." },
      { q: "¿Podemos trabajar en línea?", a: "Sí. La modalidad principal es en línea. La posibilidad de una sesión presencial en Toronto se consulta individualmente." },
      { q: "¿Qué ocurre al enviar una solicitud?", a: "Se abrirá WhatsApp con un borrador que podrás revisar y decidir si envías. Después acordamos la disponibilidad. No hay reserva ni cobro automáticos." },
    ],

    requestKicker: "TU PRIMER PASO",
    requestTitle: "Empecemos por tu pregunta",
    requestIntro: "Elige el formato y el tema; después selecciona WhatsApp o Telegram para solicitar tu sesión.",
    safety: "Esta es una consulta reflexiva y simbólica de autor, no un sustituto de la atención médica o psiquiátrica. La homeopatía no tiene pruebas fiables de eficacia para tratar problemas de salud. No cambies tratamientos prescritos sin orientación médica. No se garantizan resultados.",
  },
} as const;

// These original public testimonial video IDs and poster files were provenance-checked
// in design PR #498. Do not replace them with fabricated quotes or new avatar renders.
const testimonials = {
  ru: [
    { id: "MIVLm1GUTtM", title: "Юрий Гончаренко — отзыв клиента", poster: "/images/holistic-house/testimonial-posters/MIVLm1GUTtM.webp" },
    { id: "ttQxUHopaUM", title: "Бизнес-расстановки — отзыв", poster: "/images/holistic-house/testimonial-posters/ttQxUHopaUM.webp" },
    { id: "VABgpmn4ZYA", title: "Татьяна Разумовская — отзыв о консультации", poster: "/images/holistic-house/testimonial-posters/VABgpmn4ZYA.webp" },
  ],
  en: [
    { id: "Dk0LBmOivQo", title: "Business constellation — client testimonial", poster: "/images/holistic-house/testimonial-posters/Dk0LBmOivQo.webp" },
    { id: "aUJde6A-9p0", title: "Business consulting — client testimonial", poster: "/images/holistic-house/testimonial-posters/aUJde6A-9p0.webp" },
    { id: "4NrryHcEF1A", title: "Psychic Alchemy — client testimonial", poster: "/images/holistic-house/testimonial-posters/4NrryHcEF1A.webp" },
  ],
  es: [
    { id: "Dk0LBmOivQo", title: "Constelación empresarial — testimonio (en inglés)", poster: "/images/holistic-house/testimonial-posters/Dk0LBmOivQo.webp" },
    { id: "aUJde6A-9p0", title: "Consultoría empresarial — testimonio (en inglés)", poster: "/images/holistic-house/testimonial-posters/aUJde6A-9p0.webp" },
    { id: "4NrryHcEF1A", title: "Alquimia psíquica — testimonio (en inglés)", poster: "/images/holistic-house/testimonial-posters/4NrryHcEF1A.webp" },
  ],
} as const;

export function AlchemySoulLanding({ locale }: { locale: AlchemyLocale }) {
  const t = copy[locale];
  const video = getServiceVideoMedia("alchemy", locale);
  const reviews = testimonials[locale];
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
    <main className={styles.page} lang={locale} data-core-service-detail="alchemy" data-alchemy-soul-landing="teal-one-screen-v2">
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={locale === "ru" ? "Навигация" : locale === "es" ? "Ruta de navegación" : "Breadcrumb"}>
          <Link href={"/" + locale + "/services"}><ArrowLeft size={15} aria-hidden="true" />{t.back}</Link>
          <span aria-hidden="true">/</span><span>{t.title}</span>
        </nav>

        <section className={[styles.panel, styles.hero].join(" ")} data-alchemy-panel="hero" aria-labelledby="alchemy-title">
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
          <p className={styles.heroLead}>{t.intro}</p>
          <div className={styles.chips}>{t.chips.map((chip) => <span key={chip}><Check size={13} aria-hidden="true" />{chip}</span>)}</div>
          <div className={styles.heroPricing}>
            <span>{locale === "ru" ? "Экспресс · 30 мин · €50" : locale === "es" ? "Exprés · 30 min · €50" : "Express · 30 min · €50"}</span>
            <span>{locale === "ru" ? "Личная сессия · 60 мин · €100" : locale === "es" ? "Sesión personal · 60 min · €100" : "Personal session · 60 min · €100"}</span>
          </div>
          <div className={styles.heroOrder}>
            <ContactChannelChooser locale={locale} whatsappUrl={heroWhatsApp} label={t.cta}
              className={styles.heroOrderButton} event="service_request_start"
              attributes={{ "data-alchemy-booking": "hero" }} />
          </div>
          <div className={styles.heroRequestNote}>
            <span>{locale === "ru" ? "Запрос не списывает оплату и не подтверждает запись." : locale === "es" ? "Enviar una solicitud no cobra ni confirma una reserva." : "An enquiry does not charge you or confirm a booking."}</span>
            <a href="#alchemy-options-title">{locale === "ru" ? "Сравнить форматы" : locale === "es" ? "Comparar formatos" : "Compare formats"}<ArrowRight size={14} aria-hidden="true" /></a>
          </div>
          <div className={styles.heroBottom}><span>{t.place}</span><Link href={freeReview}>{t.freeStart}<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        </section>

        <section className={[styles.panel, styles.painSection].join(" ")} data-alchemy-panel="situations" aria-labelledby="alchemy-situations-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}><Heart size={14} aria-hidden="true" />{t.painKicker}</span>
            <h2 id="alchemy-situations-title">{t.painTitle}</h2>
            <p>{t.painIntro}</p>
          </header>
          <div className={styles.painGrid}>
            {t.pains.map((item, index) => (
              <article className={styles.painCard} key={item.title}>
                <span className={styles.iconCircle} aria-hidden="true">{index === 0 ? <Heart size={20} /> : index === 1 ? <Waves size={20} /> : index === 2 ? <BriefcaseBusiness size={20} /> : <Compass size={20} />}</span>
                <h3>{item.title}</h3><p>{item.text}</p>
              </article>
            ))}
          </div>
          <p className={styles.sectionClosing}>{t.painEnd}</p>
        </section>

        <section className={[styles.panel, styles.methodSection].join(" ")} data-alchemy-panel="method" aria-labelledby="alchemy-method-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}><Layers3 size={14} aria-hidden="true" />{t.methodKicker}</span>
            <h2 id="alchemy-method-title">{t.methodTitle}</h2>
            <p>{t.methodIntro}</p>
          </header>
          <div className={styles.methodSteps}>
            {t.steps.map((item, index) => (
              <article className={styles.methodStep} key={item.title}>
                <span className={styles.methodNumber}>{"0" + (index + 1)}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
          <p className={styles.methodNote}><ShieldCheck size={17} aria-hidden="true" />{t.methodNote}</p>
        </section>

        <section className={[styles.panel, styles.videoSection].join(" ")} id="service-video" data-alchemy-panel="video" aria-labelledby="alchemy-video-title">
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

        <section className={[styles.panel, styles.reviewSection].join(" ")} id="reviews" data-alchemy-panel="reviews" aria-labelledby="alchemy-reviews-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.reviewsKicker}</span>
            <h2 id="alchemy-reviews-title">{t.reviewsTitle}</h2>
            <p>{t.reviewsIntro}</p>
          </header>
          <div className={styles.reviewStack} data-alchemy-review-stack>
            {reviews.map((review) => (
              <article className={styles.reviewCard} key={review.id} data-testimonial-video-id={review.id}>
                <div className={styles.reviewVideo}>
                  <SiteVideoPlayer video={{ youtubeId: review.id, title: review.title, language: locale === "es" ? "en" : locale }}
                    locale={locale} compact minimal fallbackPoster={review.poster} />
                </div>
                <div className={styles.reviewInfo}>
                  <h3>{review.title}</h3>
                  <a href={"https://www.youtube.com/watch?v=" + review.id} target="_blank"
                    rel="noopener noreferrer">{locale === "ru" ? "Смотреть отзыв" : locale === "es" ? "Ver testimonio (en inglés)" : "Watch testimonial"}<ArrowUpRight size={15} aria-hidden="true" /></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.reviewNote}>{t.reviewsNote}</p>
        </section>

        <section className={[styles.panel, styles.optionsSection].join(" ")} data-alchemy-panel="formats" aria-labelledby="alchemy-options-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.optionsKicker}</span>
            <h2 id="alchemy-options-title">{t.optionsTitle}</h2>
          </header>
          <AlchemySoulFormatSelector locale={locale} wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
        </section>

        <section className={[styles.panel, styles.faqSection].join(" ")} data-alchemy-panel="faq" aria-labelledby="alchemy-faq-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.faqKicker}</span>
            <h2 id="alchemy-faq-title">{t.faqTitle}</h2>
          </header>
          <div className={styles.faqList}>
            {t.faq.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </div>
        </section>

        <section className={[styles.panel, styles.requestSection].join(" ")} id="alchemy-request" data-alchemy-panel="request" aria-labelledby="alchemy-request-title">
          <div className={styles.requestText}>
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
