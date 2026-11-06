"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardList, GraduationCap, HeartHandshake, LockKeyhole, Search,
  MessageSquare, Rocket, ShieldCheck, Sparkles,
} from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { HomeFreeDiagnosisBanner } from "@/components/home-free-diagnosis-banner";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./profi-hub.module.css";
import { masterProgramIds, masterReikiPrograms, masterReikiUi } from "@/lib/reiki-master-programs";

const OFFER_KEYS = ["diagnostic", "energy", "meditation", "personal"] as const;
type OfferKey = typeof OFFER_KEYS[number];

// All photographs already live in this site's public asset directory.
const PHOTOS = {
  tests: "/images/holistic-house/course-focus-mountain-boy.webp",
  personal: "/images/holistic-house/report-lighthouse-coast.avif",
  professional: "/images/holistic-house/hero-olive-incense.webp",
  lessons: [
    "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/course-focus-mountain-boy.webp",
    "/images/holistic-house/report-lighthouse-coast.avif",
    "/images/holistic-house/reiki-practitioner-sunrise.webp",
  ],
  offers: {
    diagnostic: "/images/holistic-house/report-lighthouse-coast.avif",
    energy: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    meditation: "/images/holistic-house/hero-olive-incense.webp",
    personal: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  },
} as const;

function Photo({ src, className, sizes = "100px" }: { src: string; className: string; sizes?: string }) {
  return <span className={className} aria-hidden="true"><Image src={src} alt="" fill unoptimized sizes={sizes} /></span>;
}

// This public guide never stores answers, sells credentials, submits a listing,
// starts payment, or claims that visiting the editor creates a client enquiry.
const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · PRO",
    name: "Pro",
    headline: "Find a Master. Learn. Share your practice.",
    lead: "Find the right practitioner, develop your Reiki skills or introduce your own services.",
    choose: "Choose your Pro path",
    findChoice: "Find a Master",
    findEyebrow: "FIND A PRACTITIONER",
    findTitle: "Meet a Master who fits your needs.",
    findLead: "Explore published practitioner profiles, approaches and available services. Choose who you would like to contact.",
    findCta: "Explore Masters",
    findNote: "Profiles and services appear after review. Sending an enquiry is not a confirmed booking.",
    learnChoice: "Learn & become a Master",
    proChoice: "I'm a Master — offer services",
    facts: ["Free learning entry", "Free basic service listing", "One protected My Practice"],
    profilesKicker: "YOUR FIRST STEP · FREE",
    profilesTitle: "Explore yourself. Choose your profile.",
    profilesHint: "You can take a test without signing in. Keep personal results private, or create a separate professional profile for clients.",
    testEntry: { title: "Take free tests", body: "Discover your strengths and what you want to develop.", action: "Choose a test" },
    personalEntry: { title: "My personal profile", body: "Save test results and follow your own development privately.", action: "Create personal profile" },
    professionalEntry: { title: "My professional profile", body: "Introduce your practice and prepare services for review.", action: "Create practitioner profile" },
    profilePrivacy: "Personal test reports are not shown to your clients or added to your professional listing. Google sign-in is needed to save profiles.",
    learnEyebrow: "YOUR LEARNING ROUTE",
    learnTitle: "Five lessons. One real beginning.",
    learnLead: "Explore three Reiki traditions through guided exercises. No previous experience needed to start.",
    lessonGuide: "Explore the programme",
    lessonHint: "Tap a lesson to see what you'll explore. These are previews—not saved course progress.",
    lessonFocus: "In this lesson",
    lessons: [
      { title: "Flight to the Sun", detail: "Begin with attention, grounding and your first guided energy practice." },
      { title: "Tantra Reiki", detail: "Meet the approach, try the exercise and reflect on your own experience." },
      { title: "Kundalini Reiki", detail: "Explore another practice and compare how the different approaches feel." },
      { title: "Reiki Yggdrasil", detail: "Study an additional tradition and choose what you want to practise further." },
      { title: "Personal initiation", detail: "Explore the available introductory initiation options and send a request if you wish. Confirmation is personal." },
    ],
    studyCta: "Begin the free 5-lesson course",
    studyNote: "The interactive course is presented in English and Russian. This link opens the English learning experience.",
    proEyebrow: "YOUR FIRST PUBLIC OFFER",
    proTitle: "Turn your experience into an offer.",
    proLead: "Offer personal diagnostics, energy support, guided meditation courses or your own individual service. Build a private draft before review.",
    pickerTitle: "What would you like to offer?",
    pickerHint: "Tap Details to learn more, or Create to open the right editor.",
    detailsAction: "Details", createAction: "Create", formatLabel: "Format", termsLabel: "Terms",
    offers: {
      diagnostic: { title: "Personal diagnostics", subtitle: "Explore a client's situation", preview: "Personal diagnostic consultation", format: "1:1 conversation · online or in person", pricing: "Set your own duration and fee", tip: "Explain your assessment method and what the client receives. This is not a medical diagnosis or treatment." },
      energy: { title: "Energy support", subtitle: "Individual energy practice", preview: "Personal energy support", format: "Individual session · online or in person", pricing: "You choose the duration and price", tip: "Describe your approach, session format, boundaries and realistic expectations without health guarantees." },
      meditation: { title: "Create a meditation course", subtitle: "Your own guided online course", preview: "Online meditation course", format: "Lessons · guided audio/video · practices", pricing: "Publication requires review; site checkout is not active", tip: "Build a sequence of lessons with your own guided audio or video, practical exercises and reflection questions." },
      personal: { title: "Personal service", subtitle: "Your own 1:1 offering", preview: "Individual personal service", format: "Your method · online or in person", pricing: "You set the format and price", tip: "Explain your service, suitable audience, languages, session boundaries and what clients can expect." },
    },
    googleNote: "Sign in with Google to save a private draft. New practitioners first complete a moderated profile; your selected editor remains available after that step. Nothing is saved by choosing an offer.",
    freeTitle: "Free to start",
    freeBody: "Your basic practitioner profile and up to 10 saved Hobby services have no mandatory subscription. Public listings require approval.",
    discoverTitle: "Your own public page",
    discoverBody: "After approval you can share your master profile and published service link directly.",
    requestTitle: "Requests, not promises",
    requestBody: "Client enquiries are recorded in My Practice; a request is not a confirmed booking or paid order.",
    moneyTitle: "How can I earn here?",
    moneyText: "Offer a service with a clear price, share its approved public page, receive a request and agree on an actual paid session with your client. Site checkout and practitioner payouts are not yet live. The approved 20% platform commission policy concerns confirmed paid onsite orders when that system launches; there is no automatic commission on unpaid requests, free services or external payments.",
    moneyCaution: "No earnings, number of clients or payments are guaranteed. Pricing, qualifications and legal eligibility are your responsibility.",
    paymentStatus: "Site checkout and practitioner payouts are not active. Clients and practitioners must agree on payment separately.",
    catalog: "Explore current services",
    masters: "Explore practitioner profiles",
    footer: "Back to Holistic House",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПРОФИ",
    name: "Профи",
    headline: "Найди мастера. Обучайся. Предлагай услуги.",
    lead: "Подбери специалиста для поддержки, изучай Рейки или представь собственную практику.",
    choose: "Выбери своё направление",
    findChoice: "Найти мастера",
    findEyebrow: "НАЙТИ СПЕЦИАЛИСТА",
    findTitle: "Выбери мастера для своей задачи.",
    findLead: "Познакомься с опубликованными профилями, методами и услугами. Выбери специалиста, которому хочешь написать.",
    findCta: "Смотреть каталог мастеров",
    findNote: "В каталоге — прошедшие модерацию профили. Запрос ещё не означает подтверждённую запись.",
    learnChoice: "Обучиться и стать мастером",
    proChoice: "Я уже мастер — предложить услуги",
    facts: ["Бесплатный старт обучения", "Бесплатное базовое размещение", "Единая «Моя практика»"],
    profilesKicker: "ПЕРВЫЙ ШАГ · БЕСПЛАТНО",
    profilesTitle: "Пройди тесты. Создай свой профиль.",
    profilesHint: "Тесты доступны без регистрации. Личный профиль нужен для собственного развития, профессиональный — для представления услуг клиентам.",
    testEntry: { title: "Бесплатные тесты", body: "Узнай о своих сильных сторонах и точках развития.", action: "Пройти бесплатные тесты" },
    personalEntry: { title: "Личный профиль", body: "Сохраняй результаты тестов и наблюдай свой прогресс.", action: "Создать личный профиль" },
    professionalEntry: { title: "Профессиональный профиль", body: "Расскажи о своей практике и подготовь услуги к публикации.", action: "Создать профиль профи" },
    profilePrivacy: "Личные результаты тестов не публикуются и не попадают в профессиональный профиль. Для сохранения профиля нужен вход через Google.",
    learnEyebrow: "ПУТЬ ОБУЧЕНИЯ",
    learnTitle: "Пять уроков — начало практики",
    learnLead: "Изучи три традиции Рейки через упражнения и личный опыт. Для старта не нужен предыдущий опыт.",
    lessonGuide: "Посмотри программу",
    lessonHint: "Нажми на урок, чтобы увидеть содержание. Это обзор, а не отметка о прохождении.",
    lessonFocus: "Что попробуешь",
    lessons: [
      { title: "Полёт к Солнцу", detail: "Начни с внимания к себе, заземления и первой направляемой практики." },
      { title: "Тантра Рейки", detail: "Познакомься с системой, выполни упражнение и опиши свои ощущения." },
      { title: "Кундалини Рейки", detail: "Исследуй другой подход и сравни собственный опыт от практик." },
      { title: "Рейки Иггдрасиль", detail: "Изучи ещё одну традицию и выбери, какие практики хочется развивать." },
      { title: "Личное посвящение", detail: "Узнай форматы вводного посвящения и при желании оставь запрос. Подтверждение всегда личное." },
    ],
    studyCta: "Начать бесплатный курс из 5 уроков",
    studyNote: "",
    proEyebrow: "ТВОЁ ПЕРВОЕ ПРЕДЛОЖЕНИЕ",
    proTitle: "Преврати опыт в понятную услугу.",
    proLead: "Предложи персональную диагностику, энергетическую поддержку, онлайн-курс медитации или собственную индивидуальную услугу. Сначала создаётся черновик.",
    pickerTitle: "Что хочешь предложить?",
    pickerHint: "Нажми «Детали», чтобы узнать больше, или «Создать», чтобы сразу перейти в редактор.",
    detailsAction: "Детали", createAction: "Создать", formatLabel: "Формат", termsLabel: "Условия",
    offers: {
      diagnostic: { title: "Персональная диагностика", subtitle: "Индивидуальный разбор запроса", preview: "Персональная диагностика и разбор", format: "Один на один · онлайн или лично", pricing: "Стоимость и длительность определяешь ты", tip: "Опиши метод разбора и то, что получит клиент. Это не медицинский диагноз или лечение." },
      energy: { title: "Энергетическая поддержка", subtitle: "Индивидуальная энергетическая практика", preview: "Персональная энергетическая поддержка", format: "Индивидуально · дистанционно или лично", pricing: "Стоимость и условия задаёшь ты", tip: "Расскажи о практике, формате, границах и реалистичных ожиданиях без обещаний исцеления." },
      meditation: { title: "Создать онлайн-курс медитации", subtitle: "Обучение медитации по твоей методике", preview: "Авторский онлайн-курс медитации", format: "Уроки · аудио/видео · упражнения", pricing: "Публикация после проверки; оплата на сайте пока не работает", tip: "Составь последовательность уроков, добавь собственные аудио/видео, практики и вопросы для размышления." },
      personal: { title: "Персональная услуга", subtitle: "Твоя индивидуальная работа", preview: "Авторская персональная услуга", format: "Онлайн или лично · по твоей методике", pricing: "Формат и цену выбираешь ты", tip: "Опиши метод, для кого подходит услуга, языки проведения, границы и ожидаемый формат работы." },
    },
    googleNote: "Для черновика войди через Google. Если ты новый мастер, сначала заполни профиль для модерации; выбранный редактор останется доступен после этого шага. Сам выбор ничего не сохраняет.",
    freeTitle: "Бесплатный старт",
    freeBody: "Профиль мастера и до 10 сохранённых услуг Hobby без обязательной подписки. Публикация после проверки.",
    discoverTitle: "Своя публичная страница",
    discoverBody: "После одобрения можно делиться прямой ссылкой на профиль и конкретную услугу.",
    requestTitle: "Настоящие обращения",
    requestBody: "Заявки находятся в «Моей практике». Заявка ещё не запись и не оплаченный заказ.",
    moneyTitle: "Как здесь зарабатывать?",
    moneyText: "Создай услугу с понятной ценой, поделись одобренной страницей, получи обращение и согласуй с клиентом реальную платную встречу. Встроенные платежи и выплаты мастерам пока не работают. Утверждённая комиссия платформы 20% относится к подтверждённым оплаченным через сайт заказам после запуска этого механизма; по неоплаченным обращениям, бесплатным услугам и внешним платежам автоматической комиссии нет.",
    moneyCaution: "Число клиентов, заработок и оплата не гарантируются. Мастер сам отвечает за цену, корректность квалификации и соблюдение закона.",
    paymentStatus: "Оплата на сайте и выплаты мастерам пока не работают. Условия расчётов с клиентом согласуются отдельно.",
    catalog: "Посмотреть опубликованные услуги",
    masters: "Каталог мастеров",
    footer: "На главную",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · PRO",
    name: "Pro",
    headline: "Encuentra un maestro. Aprende. Comparte tu práctica.",
    lead: "Encuentra un profesional, aprende Reiki o presenta tus propios servicios.",
    choose: "Elige tu camino Pro",
    findChoice: "Encontrar un maestro",
    findEyebrow: "ENCUENTRA UN PROFESIONAL",
    findTitle: "Elige un maestro adecuado para ti.",
    findLead: "Explora perfiles publicados, enfoques y servicios. Decide a quién quieres contactar.",
    findCta: "Ver el catálogo de maestros",
    findNote: "Los perfiles requieren revisión. Una solicitud no es una reserva confirmada.",
    learnChoice: "Aprender y ser maestro",
    proChoice: "Ya soy maestro — ofrecer servicios",
    facts: ["Aprendizaje inicial gratis", "Ficha básica de servicio gratis", "Un único espacio de práctica"],
    profilesKicker: "PRIMER PASO · GRATIS",
    profilesTitle: "Haz pruebas. Crea tu perfil.",
    profilesHint: "Puedes probar los tests sin registrarte. Tu perfil personal es privado; el profesional sirve para presentar tus servicios.",
    testEntry: { title: "Pruebas gratuitas", body: "Descubre tus fortalezas y posibilidades de desarrollo.", action: "Hacer pruebas gratis" },
    personalEntry: { title: "Perfil personal", body: "Guarda tus resultados y sigue tu propio progreso en privado.", action: "Crear perfil personal" },
    professionalEntry: { title: "Perfil profesional", body: "Presenta tu experiencia y prepara tus servicios para revisión.", action: "Crear perfil profesional" },
    profilePrivacy: "Los resultados personales no se comparten con clientes ni se publican en tu perfil profesional. Para guardar perfiles, inicia sesión con Google.",
    learnEyebrow: "TU CAMINO DE APRENDIZAJE",
    learnTitle: "Cinco lecciones. Un comienzo real.",
    learnLead: "Conoce tres tradiciones de Reiki con ejercicios guiados. Puedes comenzar sin experiencia previa.",
    lessonGuide: "Explora el programa",
    lessonHint: "Toca una lección para ver su contenido. Es una vista previa, no el progreso guardado.",
    lessonFocus: "Qué explorarás",
    lessons: [
      { title: "Vuelo hacia el Sol", detail: "Empieza con atención, conexión a tierra y tu primera práctica guiada." },
      { title: "Tantra Reiki", detail: "Conoce el enfoque, prueba el ejercicio y reflexiona sobre tu experiencia." },
      { title: "Kundalini Reiki", detail: "Explora otra práctica y compara tus experiencias." },
      { title: "Reiki Yggdrasil", detail: "Descubre otra tradición y elige cómo seguir practicando." },
      { title: "Iniciación personal", detail: "Revisa las opciones de iniciación introductoria y solicita una si quieres. La confirmación es personal." },
    ],
    studyCta: "Empezar el curso gratuito de 5 lecciones",
    studyNote: "El curso interactivo completo está disponible actualmente en inglés y ruso. Este enlace abre la versión en inglés.",
    proEyebrow: "TU PRIMERA OFERTA",
    proTitle: "Convierte tu experiencia en una oferta.",
    proLead: "Ofrece diagnóstico personal, apoyo energético, un curso de meditación o tu propio servicio individual. Primero crearás un borrador privado.",
    pickerTitle: "¿Qué te gustaría ofrecer?",
    pickerHint: "Pulsa Detalles para saber más o Crear para abrir el editor directamente.",
    detailsAction: "Detalles", createAction: "Crear", formatLabel: "Formato", termsLabel: "Condiciones",
    offers: {
      diagnostic: { title: "Diagnóstico personal", subtitle: "Explora la situación del cliente", preview: "Evaluación y orientación personal", format: "Sesión individual · online o presencial", pricing: "Tú eliges la duración y el precio", tip: "Explica tu método y lo que recibirá el cliente. No es un diagnóstico ni un tratamiento médico." },
      energy: { title: "Apoyo energético", subtitle: "Práctica energética individual", preview: "Apoyo energético personal", format: "Sesión individual · a distancia o presencial", pricing: "Tú decides duración y precio", tip: "Describe el enfoque, el formato y los límites sin prometer resultados sanitarios." },
      meditation: { title: "Crear un curso de meditación", subtitle: "Curso online con prácticas guiadas", preview: "Curso online de meditación", format: "Lecciones · audio/vídeo · prácticas", pricing: "Requiere revisión antes de publicar; el pago web no está activo", tip: "Crea lecciones con tus propios audios o vídeos guiados, ejercicios y preguntas de reflexión." },
      personal: { title: "Servicio personal", subtitle: "Tu propia propuesta individual", preview: "Servicio personal individual", format: "Tu método · online o presencial", pricing: "Tú decides el formato y el precio", tip: "Describe tu servicio, para quién es, los idiomas disponibles y los límites de la práctica." },
    },
    googleNote: "Entra con Google para guardar borradores. Si eres nuevo, primero completa el perfil sujeto a revisión; después podrás usar el editor elegido. La selección no guarda nada.",
    freeTitle: "Comienza gratis",
    freeBody: "Perfil y hasta 10 servicios guardados con Hobby, sin suscripción obligatoria. La publicación requiere revisión.",
    discoverTitle: "Tu página pública",
    discoverBody: "Comparte el enlace a tu perfil y servicios aprobados.",
    requestTitle: "Consultas reales",
    requestBody: "Las consultas llegan a My Practice. Una solicitud no equivale a una reserva ni un pago.",
    moneyTitle: "¿Cómo puedo ganar dinero?",
    moneyText: "Publica un servicio con precio claro, comparte su página aprobada, recibe una solicitud y acuerda una sesión pagada con el cliente. Los pagos y retiros dentro del sitio aún no están activos. La política de comisión del 20% se aplicará a pedidos confirmados y pagados en la web cuando exista el sistema; no hay comisión automática sobre consultas sin pago, servicios gratuitos o pagos externos.",
    moneyCaution: "No se garantizan clientes, ingresos ni pagos. Tú respondes por tus precios, acreditaciones y obligaciones legales.",
    paymentStatus: "Los pagos y retiros en la web aún no están activos. Las condiciones de pago se acuerdan por separado.",
    catalog: "Ver servicios publicados",
    masters: "Explorar profesionales",
    footer: "Volver al inicio",
  },
} as const;

export function ProfiHub({ locale, directory, directoryUnavailable = false }: {
  locale: PublicLocale;
  directory?: ReactNode;
  directoryUnavailable?: boolean;
}) {
  const t = copy[locale];
  const masterT = masterReikiUi[locale];
  const [lessonIndex, setLessonIndex] = useState(0);
  const [expandedOffer, setExpandedOffer] = useState<OfferKey | null>(null);
  const appLocale = locale === "es" ? "en" : locale;
  // Professional entry always shows the approved, publicly browseable dashboard.
  // The safe start code opens Google only after the person chooses a tool.
  const practiceRoot = "/" + locale + "/practice";
  const publicRoot = "/" + locale;
  const mastersHref = publicRoot + "/masters?view=mentors";
  const trainingHref = "/" + (locale === "es" ? "en" : locale) + "/academy/principles-of-energywork/learn";
  const profileHref = practiceRoot + "?start=profile";
  const editorHref = (key: OfferKey) => practiceRoot + "?start=" + key;

  return (
    <main className={"house-home house-home--services " + styles.page} lang={locale} data-profi-page={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="profi-title">
          <Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill unoptimized
            priority className={styles.heroImage} sizes="(max-width: 720px) 100vw, 1180px" />
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.kicker}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
            <h1 id="profi-title">{t.name}</h1>
            <p className={styles.heroHeadline}>{t.headline}</p>
            <p className={styles.heroLead}>{t.lead}</p>
            <nav className={styles.pathControls} aria-label={t.choose}>
              <Link href="#profi-find-master" prefetch={false} data-profi-path="find">
                <Search size={19} aria-hidden="true" /><span>{t.findChoice}</span><ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="#profi-learning" data-profi-path="learn">
                <GraduationCap size={19} aria-hidden="true" /><span>{t.learnChoice}</span><ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="#profi-practice" data-profi-path="practice">
                <HeartHandshake size={19} aria-hidden="true" /><span>{t.proChoice}</span><ArrowRight size={16} aria-hidden="true" />
              </a>
            </nav>
          </div>
        </section>

        <div className={styles.facts} aria-label={t.choose}>
          {t.facts.map((fact) => <span key={fact}><CheckCircle2 size={15} aria-hidden="true" />{fact}</span>)}
        </div>

        <div className={styles.pathContent} data-profi-single-page>
            <section id="profi-find-master" className={styles.finderSection} aria-labelledby="profi-finder-title" data-profi-finder>
              <div className={styles.finder}>
              <Photo src={PHOTOS.professional} className={styles.finderPhoto} sizes="(max-width: 600px) 100vw, 430px" />
              <div className={styles.finderCopy}>
                <p className={styles.sectionKicker}><HeartHandshake size={16} aria-hidden="true" />{t.findEyebrow}</p>
                <h2 id="profi-finder-title">{t.findTitle}</h2>
                <p>{t.findLead}</p>
                <Link href={mastersHref} prefetch={false} className={styles.primary} data-profi-action="find-master">
                  {t.findCta}<ArrowRight size={18} aria-hidden="true" />
                </Link>
                <p className={styles.micro}>{t.findNote}</p>
              </div>
              </div>
              {directory ? <div className={styles.masterDirectory} data-profi-master-directory>{directory}</div> : null}
              {directoryUnavailable ? <p className={styles.directoryError} role="status">{
                locale === "ru" ? "Каталог временно недоступен. Попробуйте открыть полный список мастеров."
                  : locale === "es" ? "El catálogo no está disponible ahora. Prueba el directorio completo."
                    : "The directory is temporarily unavailable. Please try the full directory."
              }</p> : null}
            </section>
            <section id="profi-learning" className={styles.journey} aria-labelledby="profi-learning-title" data-profi-learning>
              <div className={styles.sectionIntro}>
                <Photo src={PHOTOS.lessons[0]} className={styles.introPhoto} sizes="(max-width: 600px) 90px, 190px" />
                <p className={styles.sectionKicker}><BookOpen size={16} aria-hidden="true" />{t.learnEyebrow}</p>
                <h2 id="profi-learning-title">{t.learnChoice}</h2>
                <p className={styles.freeKicker}>{masterT.freeLabel}</p>
                <h3 className={styles.sectionSubtitle}>{masterT.freeHeading}</h3>
                <p className={styles.freeBlurb}>{masterT.freeText}</p>
                <Link href={trainingHref} prefetch={false} className={styles.freeLaunch} data-profi-action="start-free-course">
                  {t.studyCta}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <details className={styles.freeCourseDisclosure} data-profi-free-course>
                <summary>{masterT.freePreview}<ChevronRight size={18} aria-hidden="true" /></summary>
                <div className={styles.lessonLayout}>
                  <div className={styles.lessonSelector}>
                  <h3>{t.lessonGuide}</h3>
                  <p className={styles.micro}>{t.lessonHint}</p>
                  <ol className={styles.lessons}>
                    {t.lessons.map((lesson, index) => (
                      <li key={lesson.title}>
                        <button type="button" aria-pressed={lessonIndex === index}
                          className={lessonIndex === index ? styles.lessonActive : ""}
                          onClick={() => setLessonIndex(index)}
                          data-profi-lesson={index + 1}>
                          <span className={styles.lessonThumb}>
                            <Image src={PHOTOS.lessons[index]} alt="" fill unoptimized sizes="88px" />
                            <span className={styles.photoNumber}>{String(index + 1).padStart(2, "0")}</span>
                          </span>
                          <strong>{lesson.title}</strong><ChevronRight size={17} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <Link href={trainingHref} className={styles.primary} prefetch={false} data-profi-action="start-course-overview">
                    {t.studyCta}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
                <div className={styles.lessonDetail} role="region" aria-live="polite" aria-label={t.lessonFocus}>
                  <Photo src={PHOTOS.lessons[lessonIndex]} className={styles.lessonDetailPhoto} sizes="(max-width: 600px) 100vw, 520px" />
                  <span className={styles.lessonMark}><GraduationCap size={26} aria-hidden="true" /></span>
                  <p className={styles.sectionKicker}>{t.lessonFocus} · {lessonIndex + 1}/5</p>
                  <h3>{t.lessons[lessonIndex].title}</h3>
                  <p>{t.lessons[lessonIndex].detail}</p>
                  <Link href={trainingHref} className={styles.primary} prefetch={false} data-profi-action="start-course">
                    {t.studyCta}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  {t.studyNote && <p className={styles.micro}>{t.studyNote}</p>}
                </div>
              </div>
              </details>

              <section id="profi-masters" className={styles.masterSection} aria-labelledby="profi-masters-title" data-profi-masters>
                <p className={styles.sectionKicker}><GraduationCap size={16} aria-hidden="true" />{masterT.kicker}</p>
                <h3 id="profi-masters-title">{masterT.heading}</h3>
                <p className={styles.masterIntro}>{masterT.intro}</p>
                <div className={styles.masterCards}>
                  {masterProgramIds.map((id, index) => {
                    const master = masterReikiPrograms[id];
                    const masterHref = "/" + locale + "/academy/reiki/master/" + id;
                    return (
                      <details key={id} name="profi-master-programs" className={styles.masterCard} data-profi-paid-program={id}>
                        <summary>
                          <Photo src={master.image} className={styles.masterThumb} sizes="(max-width: 600px) 84px, 116px" />
                          <span className={styles.masterSummary}>
                            <small className={styles.masterNumber}>{String(index + 2).padStart(2, "0")} · {masterT.paid}</small>
                            <strong>{master.title[locale]}</strong>
                            <span>{master.teaser[locale]}</span>
                          </span>
                          <ChevronRight size={19} aria-hidden="true" className={styles.masterChevron} />
                        </summary>
                        <div className={styles.masterExpanded}>
                          <p>{master.description[locale]}</p>
                          <strong>{masterT.preview}</strong>
                          <ul>{master.topics[locale].map((topic) => <li key={topic}>{topic}</li>)}</ul>
                          <div className={styles.masterActions}>
                            <Link href={masterHref} prefetch={false} className={styles.secondary} data-profi-master-link={id}>
                              {masterT.learnMore}<ArrowRight size={16} aria-hidden="true" />
                            </Link>
                            <Link href={masterHref + "#request"} prefetch={false} className={styles.primary} data-profi-master-request={id}>
                              {masterT.interested}<ArrowRight size={16} aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>

            </section>
            <section id="profi-practice" className={styles.journey} aria-labelledby="profi-practice-title" data-profi-practice>
              <div className={styles.sectionIntro}>
                <Photo src={PHOTOS.professional} className={styles.introPhoto} sizes="(max-width: 600px) 90px, 190px" />
                <p className={styles.sectionKicker}><Rocket size={17} aria-hidden="true" />{t.proEyebrow}</p>
                <h2 id="profi-practice-title">{t.proChoice}</h2>
                 <h3 className={styles.sectionSubtitle}>{t.proTitle}</h3>
                <p>{t.proLead}</p>
                <Link href={"/"+locale+"/practice"} className={styles.practiceShowcaseEntry}
                  prefetch={false} data-profi-practice-showcase-entry>
                  <Rocket size={19} aria-hidden="true"/>
                  <span>{locale==="ru"?"Открыть новый кабинет практика":locale==="es"?"Abrir espacio profesional":"Open practitioner workspace"}
                    <small>{locale==="ru"?"Сначала посмотрите дизайн без входа через Google":locale==="es"?"Explora el diseño antes de iniciar sesión":"Explore the full design without signing in"}</small>
                  </span>
                  <ArrowRight size={19} aria-hidden="true"/>
                </Link>
              </div>
              <div className={styles.offerStudio}>
                <div className={styles.offerChoices}>
                  <h3>{t.pickerTitle}</h3>
                  <p className={styles.micro}>{t.pickerHint}</p>
                  <div className={styles.offerGrid} aria-label={t.pickerTitle}>
                    {OFFER_KEYS.map((key) => {
                      const isExpanded = expandedOffer === key;
                      return (
                        <article key={key} className={styles.offerOption} data-profi-offer={key}>
                          <div className={styles.offerOptionHeader}>
                            <Photo src={PHOTOS.offers[key]} className={styles.offerThumb} sizes="(max-width: 600px) 80px, 94px" />
                            <span className={styles.offerText}>
                              <strong>{t.offers[key].title}</strong>
                              <small>{t.offers[key].subtitle}</small>
                            </span>
                          </div>
                          <div className={styles.offerActions}>
                            <button type="button" className={styles.offerDetailsButton}
                              aria-expanded={isExpanded} aria-controls={`profi-offer-details-${key}`}
                              onClick={() => setExpandedOffer(current => current === key ? null : key)}
                              data-profi-offer-details={key}>
                              {t.detailsAction}<ChevronRight size={16} aria-hidden="true" />
                            </button>
                            <Link href={editorHref(key)} prefetch={false} className={styles.offerCreateButton}
                              data-profi-action={key === "meditation" ? "create-course" : "create-service"}
                              data-profi-selected-offer={key}>
                              {t.createAction}<ArrowRight size={16} aria-hidden="true" />
                            </Link>
                          </div>
                          <div id={`profi-offer-details-${key}`} className={styles.offerExpanded}
                            hidden={!isExpanded} role="region" aria-label={t.offers[key].title}
                            data-profi-offer-expanded={key}>
                            <p>{t.offers[key].tip}</p>
                            <dl>
                              <div><dt>{t.formatLabel}</dt><dd>{t.offers[key].format}</dd></div>
                              <div><dt>{t.termsLabel}</dt><dd>{t.offers[key].pricing}</dd></div>
                            </dl>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <p className={styles.authNote}><LockKeyhole size={15} aria-hidden="true" />{t.googleNote}</p>
                </div>
              </div>

              <p className={styles.paymentStatus}><ShieldCheck size={17} aria-hidden="true" />{t.paymentStatus}</p>
              <div className={styles.benefitGrid}>
                <article><Photo src={PHOTOS.personal} className={styles.benefitPhoto} /><div><h3><CircleDollarSign size={19} aria-hidden="true" />{t.freeTitle}</h3><p>{t.freeBody}</p></div></article>
                <article><Photo src={PHOTOS.offers.meditation} className={styles.benefitPhoto} /><div><h3><ShieldCheck size={19} aria-hidden="true" />{t.discoverTitle}</h3><p>{t.discoverBody}</p></div></article>
                <article><Photo src={PHOTOS.offers.energy} className={styles.benefitPhoto} /><div><h3><MessageSquare size={19} aria-hidden="true" />{t.requestTitle}</h3><p>{t.requestBody}</p></div></article>
              </div>
              <details className={styles.moneyDetails} data-profi-money-model>
                <summary><ClipboardList size={19} aria-hidden="true" />{t.moneyTitle}<ChevronRight size={17} aria-hidden="true" /></summary>
                <p>{t.moneyText}</p>
                <p className={styles.micro}>{t.moneyCaution}</p>
              </details>
              <nav className={styles.directoryLinks} aria-label={t.discoverTitle}>
                <Link href={publicRoot + "/services?catalog=1#service-listings"} prefetch={false}>{t.catalog}<ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href={mastersHref} prefetch={false}>{t.masters}<ArrowRight size={16} aria-hidden="true" /></Link>
              </nav>
            </section>
        </div>

        <HomeFreeDiagnosisBanner locale={locale} context="pro" />

        <section className={styles.profileGateway} data-profi-profiles aria-labelledby="profi-profiles-title">
          <div className={styles.profilesHeading}>
            <div>
              <p className={styles.sectionKicker}><Sparkles size={16} aria-hidden="true" />{t.profilesKicker}</p>
              <h2 id="profi-profiles-title">{t.profilesTitle}</h2>
              <p>{t.profilesHint}</p>
            </div>
          </div>
          <div className={styles.profileEntries}>
            <Link href={publicRoot + "/client/tests"} className={styles.profileEntry}
              prefetch={false} data-profi-entry="tests">
              <Photo src={PHOTOS.tests} className={styles.profileEntryPhoto} />
              <span className={styles.profileEntryText}>
                <strong>{t.testEntry.title}</strong><small>{t.testEntry.body}</small>
                <span className={styles.profileEntryAction}>{t.testEntry.action}<ArrowRight size={15} aria-hidden="true" /></span>
              </span>
            </Link>
            <Link href={"/" + appLocale + "/app/portrait"} className={styles.profileEntry}
              prefetch={false} data-profi-entry="personal">
              <Photo src={PHOTOS.personal} className={styles.profileEntryPhoto} />
              <span className={styles.profileEntryText}>
                <strong>{t.personalEntry.title}</strong><small>{t.personalEntry.body}</small>
                <span className={styles.profileEntryAction}>{t.personalEntry.action}<ArrowRight size={15} aria-hidden="true" /></span>
              </span>
            </Link>
            <Link href={profileHref} className={styles.profileEntry}
              prefetch={false} data-profi-entry="professional">
              <Photo src={PHOTOS.professional} className={styles.profileEntryPhoto} />
              <span className={styles.profileEntryText}>
                <strong>{t.professionalEntry.title}</strong><small>{t.professionalEntry.body}</small>
                <span className={styles.profileEntryAction}>{t.professionalEntry.action}<ArrowRight size={15} aria-hidden="true" /></span>
              </span>
            </Link>
          </div>
          <p className={styles.profilePrivacy}><LockKeyhole size={14} aria-hidden="true" />{t.profilePrivacy}</p>
        </section>

        <footer className={styles.footer}>
          <Link href={locale === "en" ? "/" : "/" + locale} prefetch={false}>{t.footer}<ArrowRight size={16} aria-hidden="true" /></Link>
          <span>Holistic House · Pro</span>
        </footer>
      </div>
    </main>
  );
}
