"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardList, GraduationCap, HeartHandshake, LockKeyhole,
  MessageSquare, Rocket, ShieldCheck, Sparkles,
} from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { HomeFreeDiagnosisBanner } from "@/components/home-free-diagnosis-banner";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./profi-hub.module.css";
import { masterProgramIds, masterReikiPrograms, masterReikiUi } from "@/lib/reiki-master-programs";

const OFFER_KEYS = ["session", "intro", "workshop", "course"] as const;
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
    session: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    intro: "/images/holistic-house/report-lighthouse-coast.avif",
    workshop: "/images/holistic-house/hero-olive-incense.webp",
    course: "/images/holistic-house/books-library.webp",
  },
  stages: [
    "/images/holistic-house/course-focus-mountain-boy.webp",
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/books-library.webp",
    "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  ],
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
    headline: "Learn Reiki. Build your own practice.",
    lead: "A practical route from your first lesson to an offer clients can discover. Start learning—or publish the experience you already have.",
    choose: "Choose where you are today",
    learnChoice: "I want to learn",
    proChoice: "I'm already a practitioner",
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
    afterTitle: "How to move from learning to practice",
    after: [
      { title: "Learn", detail: "Finish lessons and practice the exercises at your own pace." },
      { title: "Develop", detail: "Continue studying, discuss boundaries and decide what additional training you need." },
      { title: "Share", detail: "When you're ready, create a practitioner profile and an honest first offer." },
    ],
    learningDisclaimer: "The introductory course is educational. It does not automatically certify you, authorize regulated healthcare work or guarantee income. Initiation is arranged separately.",
    advanced: "Explore advanced Reiki programmes",
    ready: "I already practise—show me the Pro route",
    proEyebrow: "YOUR FIRST PUBLIC OFFER",
    proTitle: "Turn your experience into an offer.",
    proLead: "Describe what you offer, choose your own terms and move from your private draft to a shareable public page.",
    pickerTitle: "What would you like to offer?",
    pickerHint: "Choose one. We'll take you to the right existing editor—not create a listing just by tapping.",
    offers: {
      session: { title: "1:1 Reiki session", subtitle: "For individual support", preview: "Personal Reiki session", format: "Personal meeting · online or in person", pricing: "You choose the duration and price", tip: "Describe who the session is for, what happens and the boundaries of your work." },
      intro: { title: "Free introduction", subtitle: "Let clients get to know you", preview: "Introductory meeting", format: "Short introductory conversation", pricing: "Free · no client payment", tip: "Explain exactly what the free introduction includes and what it doesn't." },
      workshop: { title: "Workshop or group", subtitle: "Teach a small group", preview: "Reiki group workshop", format: "Group event · online or in person", pricing: "You set the conditions and price", tip: "Add the format, participant expectations, duration and suitable group size." },
      course: { title: "My own course", subtitle: "Share a complete method", preview: "Educational Reiki course", format: "Lessons, practices and reflection", pricing: "An approved practitioner profile and explicit publication are required. Site checkout is not active", tip: "Start with a course title, then build lessons and submit the public programme for review." },
    },
    previewLabel: "EXAMPLE OF YOUR FUTURE CARD · NOT PUBLISHED",
    previewClient: "What a visitor could understand",
    previewAction: "Request service",
    previewCourseAction: "View course",
    previewNote: "The real public request action appears only after approval. This example is not an active listing.",
    previewCourseNote: "An approved practitioner profile and your explicit course publication are required. This is not an active course.",
    createService: "Create my service in My Practice",
    createCourse: "Create my course in My Practice",
    googleNote: "Sign in with Google to save a private draft. New practitioners first complete a moderated profile; your selected editor remains available after that step. Nothing is saved by choosing an offer.",
    stepsTitle: "From idea to first client enquiry",
    steps: [
      { title: "Present yourself", detail: "Add a real name, practice description, languages and relevant background.", action: "My profile" },
      { title: "Build your offer", detail: "Explain the outcome, format, duration and price. Save a draft and submit it.", action: "Open the editor" },
      { title: "Pass review & get discovered", detail: "Approved profiles and offers can appear in the practitioner directory. Publication is not automatic.", action: "See the directory" },
      { title: "Handle a real enquiry", detail: "Check your private requests, reply with consent and agree on session and payment terms.", action: "My enquiries" },
    ],
    courseSteps: [
      { title: "Set up your profile", detail: "An approved practitioner profile is required before a course can go public.", action: "My profile" },
      { title: "Build the lessons", detail: "Name your course, add screens, media and exercises. Save private drafts.", action: "Course editor" },
      { title: "Confirm publication", detail: "After your profile is approved, review your materials and explicitly publish the course.", action: "View the Academy" },
      { title: "Share and improve", detail: "Share the public course link, respond to feedback and update your lessons. Paid checkout is not active.", action: "Manage my course" },
    ],
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
    headline: "Освой Рейки. Создай свою практику.",
    lead: "Понятный путь от первого урока до своей услуги, которую могут найти клиенты. Начни учиться или используй уже накопленный опыт.",
    choose: "Выбери, где ты сейчас",
    learnChoice: "Я хочу обучиться",
    proChoice: "Я уже практик",
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
    afterTitle: "Как перейти от учёбы к практике",
    after: [
      { title: "Изучи", detail: "Пройди уроки и повторяй упражнения в своём темпе." },
      { title: "Углубись", detail: "Продолжи обучение, разберись с границами практики и необходимой подготовкой." },
      { title: "Предложи", detail: "Когда будешь готов, создай профиль и честно опиши свою первую услугу." },
    ],
    learningDisclaimer: "Вводный курс — образовательный, сам по себе не даёт профессиональной квалификации, права на регулируемую медицинскую деятельность или гарантии дохода. Посвящение согласовывается отдельно.",
    advanced: "Другие программы обучения Рейки",
    ready: "Я уже практикую — перейти к пути Профи",
    proEyebrow: "ТВОЁ ПЕРВОЕ ПРЕДЛОЖЕНИЕ",
    proTitle: "Преврати опыт в понятную услугу.",
    proLead: "Расскажи, что предлагаешь, укажи свои условия и пройди путь от личного черновика до публичной страницы.",
    pickerTitle: "Что хочешь предложить?",
    pickerHint: "Выбери формат. Он откроется в существующем редакторе — выбор здесь ничего не публикует.",
    offers: {
      session: { title: "Личная сессия Рейки", subtitle: "Работа один на один", preview: "Индивидуальная сессия Рейки", format: "Лично или онлайн", pricing: "Длительность и цену указываешь ты", tip: "Расскажи, для кого эта сессия, что будет происходить и каковы границы твоей практики." },
      intro: { title: "Бесплатное знакомство", subtitle: "Первые контакты с клиентами", preview: "Вводная встреча", format: "Короткая ознакомительная встреча", pricing: "Бесплатно · без оплаты клиента", tip: "Чётко опиши, что входит в бесплатную встречу и что не входит." },
      workshop: { title: "Мастер-класс / группа", subtitle: "Обучение для нескольких человек", preview: "Групповой мастер-класс Рейки", format: "Группа · онлайн или лично", pricing: "Условия и цену задаёшь ты", tip: "Укажи формат, продолжительность, ожидания участников и комфортный размер группы." },
      course: { title: "Собственный курс", subtitle: "Обучение своей методике", preview: "Авторский учебный курс Рейки", format: "Уроки, практики и рефлексия", pricing: "Нужен одобренный профиль мастера и отдельное подтверждение публикации. Оплата на сайте пока отключена", tip: "Начни с названия, затем собери уроки и отправь курс на проверку." },
    },
    previewLabel: "ПРИМЕР БУДУЩЕЙ КАРТОЧКИ · НЕ ОПУБЛИКОВАНО",
    previewClient: "Что сможет понять клиент",
    previewAction: "Запросить услугу",
    previewCourseAction: "Открыть курс",
    previewNote: "Настоящая кнопка обращения станет доступна только после одобрения. Это демонстрация, а не действующая услуга.",
    previewCourseNote: "Для публикации курса нужен одобренный профиль и твоё отдельное подтверждение. Пока это только пример.",
    createService: "Создать услугу в «Моей практике»",
    createCourse: "Создать курс в «Моей практике»",
    googleNote: "Для черновика войди через Google. Если ты новый мастер, сначала заполни профиль для модерации; выбранный редактор останется доступен после этого шага. Сам выбор ничего не сохраняет.",
    stepsTitle: "От идеи до первого обращения",
    steps: [
      { title: "Расскажи о себе", detail: "Укажи настоящее имя, подход, языки и подтверждаемый опыт.", action: "Мой профиль" },
      { title: "Подготовь услугу", detail: "Объясни пользу, формат, длительность и стоимость. Сохрани черновик и отправь на проверку.", action: "Редактор предложения" },
      { title: "Пройди модерацию", detail: "После одобрения профиль и услугу можно будет найти в каталоге. Публикация не автоматическая.", action: "Посмотреть каталог" },
      { title: "Обработай заявку", detail: "Увидь обращение в «Моей практике», ответь с согласия клиента, договорись о сессии и оплате.", action: "Мои заявки" },
    ],
    courseSteps: [
      { title: "Создай профиль", detail: "Для публичного курса сначала должен быть одобрен профиль мастера.", action: "Мой профиль" },
      { title: "Собери уроки", detail: "Придумай название, добавь экраны, упражнения и материалы. Сохраняй закрытые черновики.", action: "Редактор курса" },
      { title: "Подтверди публикацию", detail: "После одобрения профиля проверь материалы и отдельно подтверди публикацию курса.", action: "Открыть Академию" },
      { title: "Делись и улучшай", detail: "Отправляй ссылку на опубликованный курс, дополняй уроки. Оплата курсов на сайте пока не работает.", action: "Управлять курсом" },
    ],
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
    headline: "Aprende Reiki. Construye tu práctica.",
    lead: "Un camino claro desde la primera lección hasta una oferta que los clientes puedan encontrar. Empieza a aprender o comparte tu experiencia.",
    choose: "Elige tu etapa actual",
    learnChoice: "Quiero aprender",
    proChoice: "Ya soy practicante",
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
    afterTitle: "De aprender a ejercer",
    after: [
      { title: "Aprende", detail: "Completa lecciones y repite ejercicios a tu ritmo." },
      { title: "Profundiza", detail: "Continúa estudiando y revisa límites y formación necesaria." },
      { title: "Comparte", detail: "Cuando estés preparado, crea un perfil y una primera oferta honesta." },
    ],
    learningDisclaimer: "El curso introductorio es educativo; no proporciona acreditación profesional ni autorización sanitaria, y no garantiza ingresos. La iniciación se coordina por separado.",
    advanced: "Explorar otros programas Reiki",
    ready: "Ya practico—quiero publicar",
    proEyebrow: "TU PRIMERA OFERTA",
    proTitle: "Convierte tu experiencia en una oferta.",
    proLead: "Explica tu oferta, elige condiciones y pasa de un borrador privado a una página pública.",
    pickerTitle: "¿Qué te gustaría ofrecer?",
    pickerHint: "Elige una opción. Se abrirá el editor existente; tocar aquí no publica nada.",
    offers: {
      session: { title: "Sesión Reiki individual", subtitle: "Atención personalizada", preview: "Sesión individual de Reiki", format: "En línea o presencial", pricing: "Tú eliges duración y precio", tip: "Explica a quién se dirige, en qué consiste y cuáles son tus límites." },
      intro: { title: "Introducción gratis", subtitle: "Una primera conversación", preview: "Encuentro introductorio", format: "Breve conversación inicial", pricing: "Gratis · sin pago del cliente", tip: "Aclara exactamente qué incluye la introducción gratuita." },
      workshop: { title: "Taller o grupo", subtitle: "Aprender en grupo", preview: "Taller grupal de Reiki", format: "En grupo · en línea o presencial", pricing: "Tú defines condiciones y precio", tip: "Explica modalidad, duración, expectativas y tamaño del grupo." },
      course: { title: "Mi propio curso", subtitle: "Enseña tu método", preview: "Curso educativo Reiki", format: "Lecciones, prácticas y reflexión", pricing: "Necesitas un perfil profesional aprobado y confirmación explícita al publicar. El checkout aún no está activo", tip: "Empieza con el nombre del curso y añade tus lecciones antes de enviarlo a revisión." },
    },
    previewLabel: "EJEMPLO · AÚN NO PUBLICADO",
    previewClient: "Lo que verá el visitante",
    previewAction: "Solicitar servicio",
    previewCourseAction: "Ver curso",
    previewNote: "La solicitud real solo estará disponible después de la aprobación. Es una demostración.",
    previewCourseNote: "Se necesita un perfil aprobado y tu publicación explícita. Por ahora es solo un ejemplo.",
    createService: "Crear mi servicio en My Practice",
    createCourse: "Crear mi curso en My Practice",
    googleNote: "Entra con Google para guardar borradores. Si eres nuevo, primero completa el perfil sujeto a revisión; después podrás usar el editor elegido. La selección no guarda nada.",
    stepsTitle: "De la idea a la primera consulta",
    steps: [
      { title: "Preséntate", detail: "Añade nombre real, experiencia, idiomas y descripción de tu práctica.", action: "Mi perfil" },
      { title: "Diseña la oferta", detail: "Explica beneficios posibles, formato, duración y precio. Guarda el borrador y envíalo.", action: "Abrir editor" },
      { title: "Revisión y visibilidad", detail: "El perfil y servicio aprobados pueden aparecer en el catálogo. No se publica al instante.", action: "Ver catálogo" },
      { title: "Atiende las consultas", detail: "Revisa solicitudes privadas, responde con consentimiento y acuerda sesión y pago.", action: "Mis consultas" },
    ],
    courseSteps: [
      { title: "Crea tu perfil", detail: "Necesitas un perfil profesional aprobado antes de publicar un curso.", action: "Mi perfil" },
      { title: "Construye lecciones", detail: "Añade pantallas, prácticas y materiales. Guarda borradores privados.", action: "Editor del curso" },
      { title: "Confirma publicación", detail: "Una vez aprobado tu perfil, revisa y publica expresamente el curso.", action: "Ver Academia" },
      { title: "Comparte y mejora", detail: "Comparte el enlace público y actualiza lecciones. No hay checkout de pago.", action: "Gestionar curso" },
    ],
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

export function ProfiHub({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const masterT = masterReikiUi[locale];
  const [lessonIndex, setLessonIndex] = useState(0);
  const [offer, setOffer] = useState<OfferKey>("session");
  const appLocale = locale === "es" ? "en" : locale;
  const practiceRoot = "/" + appLocale + "/app/practice";
  const publicRoot = "/" + locale;
  const trainingHref = "/" + (locale === "es" ? "en" : locale) + "/academy/principles-of-energywork/learn";
  const profileHref = practiceRoot + "?panel=profile";
  const requestsHref = practiceRoot + "?panel=requests";
  const offerHref = offer === "course"
    ? practiceRoot + "?panel=materials&materialTab=courses&create=1"
    : practiceRoot + "?panel=services&create=1&starter=" + offer;
  const chosen = t.offers[offer];

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
            <section id="profi-learning" className={styles.journey} aria-labelledby="profi-learning-title" data-profi-learning>
              <div className={styles.sectionIntro}>
                <Photo src={PHOTOS.lessons[0]} className={styles.introPhoto} sizes="(max-width: 600px) 90px, 190px" />
                <p className={styles.sectionKicker}><BookOpen size={16} aria-hidden="true" />{t.learnEyebrow}</p>
                <h2 id="profi-learning-title">{t.learnChoice}</h2>
                <p className={styles.freeKicker}>{masterT.freeLabel}</p>
                <h3 className={styles.sectionSubtitle}>{masterT.freeHeading}</h3>
                <p>{masterT.freeText}</p>
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

              <section className={styles.nextStage} aria-labelledby="profi-after-learning">
                <h3 id="profi-after-learning">{t.afterTitle}</h3>
                <div className={styles.threeSteps}>
                  {t.after.map((step, index) => (
                    <article key={step.title}>
                      <Photo src={PHOTOS.stages[index]} className={styles.stagePhoto} sizes="96px" />
                      <div className={styles.stageText}>
                        <span className={styles.roundIndex}>{index + 1}</span>
                        <h4>{step.title}</h4>
                        <p>{step.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <p className={styles.disclaimer}><ShieldCheck size={17} aria-hidden="true" />{t.learningDisclaimer}</p>
                <div className={styles.nextActions}>
                  <Link href="#profi-masters" prefetch={false} className={styles.secondary} data-profi-action="advanced-reiki">
                    {t.advanced}<ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a href="#profi-practice" className={styles.textAction}>
                    {t.ready}<ArrowRight size={17} aria-hidden="true" />
                  </a>
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
              </div>
              <div className={styles.offerStudio}>
                <div className={styles.offerChoices}>
                  <h3>{t.pickerTitle}</h3>
                  <p className={styles.micro}>{t.pickerHint}</p>
                  <div className={styles.offerGrid} role="group" aria-label={t.pickerTitle}>
                    {OFFER_KEYS.map((key) => (
                      <button type="button" key={key} className={offer === key ? styles.offerSelected : ""}
                        aria-pressed={offer === key} onClick={() => setOffer(key)} data-profi-offer={key}>
                        <Photo src={PHOTOS.offers[key]} className={styles.offerThumb} sizes="95px" />
                        <span className={styles.offerText}><strong>{t.offers[key].title}</strong><small>{t.offers[key].subtitle}</small></span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.offerPreview} data-profi-preview={offer}>
                  <p className={styles.previewEyebrow}><LockKeyhole size={14} aria-hidden="true" />{t.previewLabel}</p>
                  <div className={styles.previewCard}>
                    <Photo src={PHOTOS.offers[offer]} className={styles.previewPhoto} sizes="(max-width: 600px) 36vw, 220px" />
                    <p className={styles.sectionKicker}>{t.previewClient}</p>
                    <h3>{chosen.preview}</h3>
                    <p>{chosen.format}</p>
                    <strong className={styles.priceNote}>{chosen.pricing}</strong>
                    
                  </div>
                  <p className={styles.micro}>{chosen.tip}</p>
                  <p className={styles.micro}>{offer === "course" ? t.previewCourseNote : t.previewNote}</p>
                  <Link href={offerHref} className={styles.primary} prefetch={false}
                    data-profi-action={offer === "course" ? "create-course" : "create-service"}
                    data-profi-selected-offer={offer}>
                    {offer === "course" ? t.createCourse : t.createService}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <p className={styles.authNote}><LockKeyhole size={14} aria-hidden="true" />{t.googleNote}</p>
                </div>
              </div>

              <section className={styles.publishJourney} aria-labelledby="profi-publishing-steps">
                <h3 id="profi-publishing-steps">{t.stepsTitle}</h3>
                <ol>
                  {(offer === "course" ? t.courseSteps : t.steps).map((step, index) => (
                    <li key={step.title}>
                      <span className={styles.publishPhoto}>
                        <Image src={PHOTOS.stages[index]} alt="" fill unoptimized sizes="100px" />
                        <span className={styles.photoNumber}>{String(index + 1).padStart(2, "0")}</span>
                      </span>
                      <div><h4>{step.title}</h4><p>{step.detail}</p></div>
                      <Link href={index === 0 ? profileHref : index === 1 ? offerHref :
                        index === 2 ? offer === "course" ? publicRoot + "/academy" : publicRoot + "/masters" :
                        offer === "course" ? offerHref : requestsHref}
                        prefetch={false} className={styles.stepLink}
                        data-profi-step={index + 1}>
                        {step.action}<ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
              <p className={styles.paymentStatus}><ShieldCheck size={17} aria-hidden="true" />{t.paymentStatus}</p>
              <div className={styles.benefitGrid}>
                <article><Photo src={PHOTOS.personal} className={styles.benefitPhoto} /><div><h3><CircleDollarSign size={19} aria-hidden="true" />{t.freeTitle}</h3><p>{t.freeBody}</p></div></article>
                <article><Photo src={PHOTOS.offers.course} className={styles.benefitPhoto} /><div><h3><ShieldCheck size={19} aria-hidden="true" />{t.discoverTitle}</h3><p>{t.discoverBody}</p></div></article>
                <article><Photo src={PHOTOS.offers.session} className={styles.benefitPhoto} /><div><h3><MessageSquare size={19} aria-hidden="true" />{t.requestTitle}</h3><p>{t.requestBody}</p></div></article>
              </div>
              <details className={styles.moneyDetails} data-profi-money-model>
                <summary><ClipboardList size={19} aria-hidden="true" />{t.moneyTitle}<ChevronRight size={17} aria-hidden="true" /></summary>
                <p>{t.moneyText}</p>
                <p className={styles.micro}>{t.moneyCaution}</p>
              </details>
              <nav className={styles.directoryLinks} aria-label={t.discoverTitle}>
                <Link href={publicRoot + "/services?catalog=1#service-listings"} prefetch={false}>{t.catalog}<ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href={publicRoot + "/masters"} prefetch={false}>{t.masters}<ArrowRight size={16} aria-hidden="true" /></Link>
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
