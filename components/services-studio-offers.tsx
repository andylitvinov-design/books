"use client";

import { useState } from "react";
import Image from "next/image";
import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { ArrowRight, ChevronDown, ClipboardCheck, ShieldCheck } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { coreServiceOffers, type CoreServiceOffer } from "@/data/core-service-offers";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./services-studio-offers.module.css";

type ServiceMode = "all" | "online" | "in-person";
type SelectedMode = Exclude<ServiceMode, "all">;

type Offer = {
  id: string;
  title: string;
  description: string;
  details: string;
  image: string;
  href: string;
  category: string;
  price?: string;
  isFree?: boolean;
  externalFlow?: boolean;
  actionLabel?: string;
};

const text = {
  en: {
    freeEyebrow: "START HERE · NO PAYMENT REQUIRED",
    freeTitle: "Three free ways to begin",
    freeLead: "Explore your current state or share a question before choosing a personal session.",
    testsTitle: "Free wellbeing & personality tests",
    testsDescription: "A few short self-checks to better understand your starting point.",
    testsDetails: "Some individual self-checks work without signing in. Google sign-in is required to save a set and see changes over time. These are not medical diagnoses.",
    testsCategory: "Self-check · A few minutes",
    situationDetails: "Complete a short coaching form and a simple I — goal — problem drawing. You receive personal written feedback, not a free video call.",
    daoDetails: "An author-led symbolic Wu Xing resource profile for self-reflection. It is not a medical diagnostic assessment.",
    start: "Start free",
    freeNote: "Each free path is independent. The written review is not a live appointment.",
    opora: "Prefer a guided start? Explore the free OPORA course",
    paidEyebrow: "PERSONAL WORK · TORONTO & ONLINE",
    paidTitle: "Personal services",
    paidLead: "You do not need to choose a technique. Start with your situation, and we can agree on a suitable format.",
    constellationTitle: "Systemic constellations & archetypal support",
    constellationDescription: "Explore relationship, family or decision patterns using symbolic mapping.",
    constellationDetails: "We clarify the question, map roles and perspectives, and discuss possible next steps. A constellation does not establish facts about others or predict outcomes.",
    remoteTitle: "Remote energy support · Reiki",
    remoteDescription: "Choose a practitioner, method and preferred time for remote or live online support.",
    remoteDetails: "Select the format and preferred practitioner on the dedicated page. Availability and the fee must be confirmed before payment; this is not medical care.",
    remoteCategory: "Reiki · Remote session",
    remotePrice: "Time & price confirmed before payment",
    methods: {
      alchemy: "Map your situation through a systemic constellation and guided imagery. Optional symbolic homeopathic reflection is complementary, not a treatment.",
      hypnotherapy: "Explore inner images and recurring reactions in a one-to-one session. Begin with one meeting and decide whether to continue.",
      business: "Clarify a business decision, explore roles and competing needs, and choose practical next steps without promising financial outcomes.",
    },
    sessionCategory: "Personal session · 30 or 60 minutes",
    details: "Details",
    landing: "Full service description",
    request: "Request a session",
    remoteAction: "Choose support",
    enquiry: "Please confirm available times and conditions for this personal session before any payment.",
    reassurance: "No booking or payment is made until availability is confirmed.",
    disclaimer: "Homeopathy has no reliable evidence for treating health conditions. These services and symbolic approaches do not replace standard or urgent medical or mental-health care.",
  },
  ru: {
    freeEyebrow: "НАЧНИТЕ ЗДЕСЬ · БЕСПЛАТНО",
    freeTitle: "Три бесплатных способа начать",
    freeLead: "Оцените своё текущее состояние или расскажите о своём вопросе, прежде чем выбирать личную сессию.",
    testsTitle: "Тесты самочувствия и личности",
    testsDescription: "Несколько коротких тестов, чтобы лучше понять своё исходное состояние.",
    testsDetails: "Некоторые тесты доступны без входа. Для сохранения набора и наблюдения за динамикой потребуется авторизация Google. Это не медицинская диагностика.",
    testsCategory: "Самооценка · Несколько минут",
    situationDetails: "Заполните короткую анкету и нарисуйте схему «Я — цель — проблема». Вы получите персональный письменный разбор, а не бесплатный видеозвонок.",
    daoDetails: "Символический авторский профиль ресурсов У-Син для самоисследования, не медицинская диагностика.",
    start: "Начать бесплатно",
    freeNote: "Каждый бесплатный вариант самостоятельный. Письменный разбор — не личный созвон.",
    opora: "Хотите начать с практики? Откройте бесплатный курс ОПОРА",
    paidEyebrow: "ЛИЧНАЯ РАБОТА · ТОРОНТО И ОНЛАЙН",
    paidTitle: "Индивидуальные услуги",
    paidLead: "Не нужно заранее выбирать метод. Начнём с вашего вопроса и вместе подберём подходящий формат.",
    constellationTitle: "Системные расстановки и архетипическая поддержка",
    constellationDescription: "Исследуйте отношения, семейные сценарии и решения с помощью символической карты ситуации.",
    constellationDetails: "Уточним запрос, увидим разные роли и точки зрения и обсудим дальнейшие шаги. Расстановка не устанавливает факты о других людях и не предсказывает будущее.",
    remoteTitle: "Дистанционная энергетическая поддержка · Рейки",
    remoteDescription: "Выберите мастера, метод и удобное время для дистанционной или живой онлайн-поддержки.",
    remoteDetails: "Выберите формат и мастера на отдельной странице. Время и стоимость подтверждаются до оплаты. Это не медицинская помощь.",
    remoteCategory: "Рейки · Дистанционная поддержка",
    remotePrice: "Время и цена — после подтверждения",
    methods: {
      alchemy: "Исследуем ситуацию через системную расстановку и образную работу. Дополнительная символическая гомеопатическая рефлексия не является лечением.",
      hypnotherapy: "Исследуем внутренние образы и повторяющиеся реакции. Можно начать с одной встречи и потом решить, нужен ли курс.",
      business: "Проясним бизнес-решение, рассмотрим роли и противоречия и наметим практические шаги без обещаний финансового результата.",
    },
    sessionCategory: "Личная сессия · 30 или 60 минут",
    details: "Подробнее",
    landing: "Полное описание услуги",
    request: "Запросить сессию",
    remoteAction: "Выбрать поддержку",
    enquiry: "Подскажите доступное время и условия личной сессии до любой оплаты.",
    reassurance: "Запись и оплата происходят только после подтверждения доступного времени.",
    disclaimer: "Эффективность гомеопатии при лечении заболеваний не подтверждена надёжными доказательствами. Эти форматы не заменяют обычную и неотложную медицинскую или психиатрическую помощь.",
  },
  es: {
    freeEyebrow: "EMPIEZA AQUÍ · SIN PAGAR",
    freeTitle: "Tres formas gratuitas de empezar",
    freeLead: "Explora tu estado actual o comparte tu pregunta antes de elegir una sesión individual.",
    testsTitle: "Pruebas de bienestar y personalidad",
    testsDescription: "Unos cuestionarios breves para conocer mejor tu punto de partida.",
    testsDetails: "Las pruebas están disponibles en inglés y ruso. Algunas no requieren iniciar sesión; para guardar resultados necesitarás entrar con Google. No son diagnósticos médicos.",
    testsCategory: "Autoobservación · Pocos minutos",
    situationDetails: "Completa un formulario de coaching y dibuja YO — META — PROBLEMA. Recibirás una reflexión escrita, no una videollamada gratuita.",
    daoDetails: "Un perfil simbólico Wu Xing para la reflexión personal. No es una evaluación médica.",
    start: "Empezar gratis",
    freeNote: "Cada opción es independiente. La revisión escrita no es una cita en directo.",
    opora: "¿Prefieres empezar con una práctica? Explora el curso gratuito OPORA",
    paidEyebrow: "SESIONES PERSONALES · TORONTO Y EN LÍNEA",
    paidTitle: "Servicios personales",
    paidLead: "No necesitas elegir el método de antemano. Empezamos con tu situación y acordamos el formato.",
    constellationTitle: "Constelaciones sistémicas y apoyo arquetípico",
    constellationDescription: "Explora relaciones, patrones familiares o decisiones mediante una representación simbólica.",
    constellationDetails: "Clarificamos la pregunta, representamos roles y perspectivas y consideramos próximos pasos. No permite demostrar hechos ni predecir resultados.",
    remoteTitle: "Apoyo energético a distancia · Reiki",
    remoteDescription: "Elige un profesional, método y horario preferido para apoyo a distancia o sesión en línea.",
    remoteDetails: "Selecciona formato y profesional en la página específica. Disponibilidad y precio se confirman antes de pagar. No es atención médica.",
    remoteCategory: "Reiki · Apoyo a distancia",
    remotePrice: "Horario y precio antes de pagar",
    methods: {
      alchemy: "Explora tu situación con constelaciones e imágenes guiadas. La reflexión homeopática simbólica opcional no es un tratamiento médico.",
      hypnotherapy: "Explora imágenes interiores y patrones repetidos. Puedes comenzar con una sesión y decidir después si continuar.",
      business: "Aclara una decisión empresarial, considera los roles y define pasos prácticos sin garantías económicas.",
    },
    sessionCategory: "Sesión individual · 30 o 60 minutos",
    details: "Detalles",
    landing: "Descripción completa",
    request: "Solicitar sesión",
    remoteAction: "Elegir apoyo",
    enquiry: "Confirma los horarios disponibles y las condiciones antes de realizar cualquier pago.",
    reassurance: "No hay reserva ni pago antes de confirmar disponibilidad.",
    disclaimer: "La homeopatía no tiene evidencia fiable para tratar problemas de salud. Estos enfoques no sustituyen la atención médica o de salud mental habitual o urgente.",
  },
} as const;


const modeCopy = {
  en: {
    label: "How would you like to meet?", all: "All options", online: "Online", inPerson: "In person",
    onlineTitle: "Online personal sessions", onlineLead: "Personal video sessions and remote support, wherever you live.",
    inPersonTitle: "In-person sessions in Toronto", inPersonLead: "Individual meetings in Toronto. Place and availability are confirmed before booking.",
    onlineIntro: "Our free starting points are available online, even if you prefer an in-person session later.",
    onlineIntroAction: "See free online options",
    groupEyebrow: "PRACTICE & COMMUNITY", groupTitle: "Reiki initiations & Toronto events",
    groupLead: "Explore the existing programmes and gatherings. Please confirm the in-person format and venue directly with Andrey.",
    initiation: "Personal initiation · by arrangement", initiationAction: "Explore initiation",
    tantraTitle: "Tantra Reiki initiation", tantraAbout: "Explore sensitivity, boundaries and respectful tantric connection.",
    tantraDetails: "The introductory Level 1 option is subject to personal confirmation; discuss private initiation separately.",
    yggTitle: "Reiki Yggdrasil initiation", yggAbout: "Explore the World Tree tradition with personal initiation and guided practice.",
    kundTitle: "Kundalini Reiki learning path", kundAbout: "Explore original training materials and options for a personal initiation.",
    details: "Availability, format and personal terms must be confirmed before booking.",
    eventsTitle: "Live workshops & gatherings", eventsAbout: "Join community events with confirmed dates and locations.",
    eventsDetails: "View the events calendar for current times, venue and conditions.",
    eventsCategory: "Toronto · group events", eventsAction: "Explore events",
    priceOnRequest: "Format and terms confirmed personally",
    preferred: { online: "Preferred format: Online", "in-person": "Preferred format: In person (Toronto)" },
  },
  ru: {
    label: "Как вам удобнее встретиться с Андреем?", all: "Все", online: "Онлайн", inPerson: "Лично",
    onlineTitle: "Личные онлайн-сессии", onlineLead: "Видеовстречи и дистанционная поддержка из любой страны.",
    inPersonTitle: "Очные сессии в Торонто", inPersonLead: "Личные встречи в Торонто. Место и время подтверждаем до записи.",
    onlineIntro: "Бесплатные способы начать доступны онлайн, даже если позже вы предпочитаете очную встречу.",
    onlineIntroAction: "Посмотреть бесплатные онлайн-варианты",
    groupEyebrow: "ПРАКТИКА И СООБЩЕСТВО", groupTitle: "Инициации Рейки и встречи в Торонто",
    groupLead: "Изучите существующие программы и мероприятия. Очный формат и место инициации уточняйте у Андрея.",
    initiation: "Личная инициация · по согласованию", initiationAction: "Об инициации",
    tantraTitle: "Инициация Тантра Рейки", tantraAbout: "Развивайте чувствительность, уважение границ и бережный контакт.",
    tantraDetails: "Вводная инициация первого уровня требует подтверждения. Личный формат обсуждается отдельно.",
    yggTitle: "Инициация Рейки Иггдрасиль", yggAbout: "Изучайте традицию Мирового древа на личной инициации.",
    kundTitle: "Обучение Кундалини Рейки", kundAbout: "Оригинальные материалы и возможность личного обучения и инициации.",
    details: "Наличие мест, формат и условия необходимо подтвердить до записи.",
    eventsTitle: "Мастер-классы и встречи", eventsAbout: "Групповые мероприятия с подтверждённым местом и датой.",
    eventsDetails: "Актуальные даты, адреса и условия участия указаны в календаре.",
    eventsCategory: "Торонто · групповые встречи", eventsAction: "Смотреть мероприятия",
    priceOnRequest: "Формат и условия — по согласованию",
    preferred: { online: "Предпочтительный формат: онлайн", "in-person": "Предпочтительный формат: лично в Торонто" },
  },
  es: {
    label: "¿Cómo prefieres trabajar con Andrey?", all: "Todos", online: "En línea", inPerson: "Presencial",
    onlineTitle: "Sesiones personales en línea", onlineLead: "Sesiones por vídeo y apoyo a distancia desde cualquier país.",
    inPersonTitle: "Sesiones presenciales en Toronto", inPersonLead: "Encuentros personales en Toronto. Confirmamos lugar y disponibilidad antes de reservar.",
    onlineIntro: "Las opciones gratuitas están disponibles en línea, incluso si después prefieres una cita presencial.",
    onlineIntroAction: "Ver opciones gratuitas en línea",
    groupEyebrow: "PRÁCTICA Y COMUNIDAD", groupTitle: "Iniciaciones Reiki y eventos en Toronto",
    groupLead: "Explora programas y eventos existentes. Confirma con Andrey el formato presencial y el lugar.",
    initiation: "Iniciación personal · por confirmar", initiationAction: "Ver iniciación",
    tantraTitle: "Iniciación Tantra Reiki", tantraAbout: "Descubre la sensibilidad, los límites personales y la conexión respetuosa.",
    tantraDetails: "El nivel introductorio requiere confirmación. Consulta la posibilidad de iniciación personal.",
    yggTitle: "Iniciación Reiki Yggdrasil", yggAbout: "Explora la tradición del Árbol del Mundo en una iniciación personal.",
    kundTitle: "Formación Kundalini Reiki", kundAbout: "Materiales originales y opciones de aprendizaje e iniciación personal.",
    details: "La disponibilidad, modalidad y condiciones se confirman antes de reservar.",
    eventsTitle: "Talleres y encuentros", eventsAbout: "Encuentros de grupo con fechas y ubicaciones confirmadas.",
    eventsDetails: "Consulta el calendario para ver fechas, lugar y condiciones.",
    eventsCategory: "Toronto · eventos", eventsAction: "Ver eventos",
    priceOnRequest: "Formato y condiciones a confirmar",
    preferred: { online: "Modalidad preferida: en línea", "in-person": "Modalidad preferida: presencial en Toronto" },
  },
} as const;

// These five owned public illustrations are already delivered at <=104 KB.
// Do not send them through paid Vercel /_next/image transformations. Keep
// runtime resizing available for any future/unreviewed media source instead.
const directStaticServiceImages = new Set([
  "/images/holistic-house/course-start-heron.webp",
  "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  "/academy/reiki-yggdrasil/source/basic-program.jpg",
]);

function ServiceCard({ offer, locale, index, preferredFormat }: { offer: Offer; locale: PublicLocale; index: number; preferredFormat?: SelectedMode }) {
  const t = text[locale];
  return (
    <article className={styles.card} data-services-studio-card={offer.id}>
      <Link href={offer.href} className={styles.photo} tabIndex={-1} aria-hidden="true" prefetch={false}>
        {offer.image === "/images/holistic-house/andy-about.png" ? (
          <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill
            sizes="(max-width: 680px) 112px, (max-width: 980px) 165px, 175px" loading={index === 0 ? "eager" : "lazy"} />
        ) : (
          <Image src={offer.image} alt="" fill unoptimized={directStaticServiceImages.has(offer.image)}
            sizes="(max-width: 680px) 112px, (max-width: 980px) 165px, 175px" loading={index === 0 ? "eager" : "lazy"} />
        )}
      </Link>
      <div className={styles.cardContent}>
        <div className={styles.cardTop}>
          <span className={styles.category}>{offer.category}</span>
          {offer.isFree ? <span className={styles.freeBadge}>FREE</span> : null}
        </div>
        <h3><Link href={offer.href} prefetch={false}>{offer.title}</Link></h3>
        <p className={styles.description}>{offer.description}</p>
        {offer.price ? <p className={styles.price}>{offer.price}</p> : null}
        <div className={styles.actions}>
          <details className={styles.details}>
            <summary aria-label={t.details + ": " + offer.title}>{t.details}<ChevronDown size={16} aria-hidden="true" /></summary>
            <div className={styles.detailBody}>
              <p>{offer.details}</p>
              <Link href={offer.href} prefetch={false}>{t.landing}<ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </details>
          {offer.isFree ? (
            <Link href={offer.href} className={styles.action} data-services-studio-action={offer.id} prefetch={false}>
              {t.start}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : offer.externalFlow ? (
            <Link href={offer.href} className={styles.action} data-services-studio-action={offer.id} prefetch={false}>
              {offer.actionLabel ?? t.remoteAction}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <div className={styles.booking}>
              <ContactChannelChooser
                locale={locale}
                label={t.request}
                requestContext={preferredFormat ? modeCopy[locale].preferred[preferredFormat] : undefined}
                className={styles.action}
                event="service_request_start"
                whatsappUrl={whatsappEnquiryUrl({
                  locale,
                  service: offer.title,
                  request: t.enquiry + (preferredFormat ? "\n" + modeCopy[locale].preferred[preferredFormat] : ""),
                  option: "30 min · €50 / 60 min · €100",
                  pagePath: offer.href,
                })}
                attributes={{ "data-services-studio-action": offer.id }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ServicesStudioOffers({ locale }: { locale: PublicLocale }) {
  const t = text[locale];
  const m = modeCopy[locale];
  const [format, setFormat] = useState<ServiceMode>("all");
  const core = coreServiceOffers(locale);
  const byId = (id: CoreServiceOffer["id"]) => core.find((offer) => offer.id === id)!;
  const situation = byId("situation");
  const dao = byId("dao");
  const free: Offer[] = [
    {
      id: "tests",
      title: t.testsTitle,
      description: t.testsDescription,
      details: t.testsDetails,
      image: "/images/holistic-house/course-start-heron.webp",
      href: "/" + locale + "/tests",
      category: t.testsCategory,
      isFree: true,
    },
    { id: "situation", title: situation.title, description: situation.promise, details: t.situationDetails,
      image: situation.image, href: situation.href, category: situation.label, isFree: true },
    { id: "dao", title: dao.title, description: dao.promise, details: t.daoDetails,
      image: dao.image, href: dao.href, category: dao.label, isFree: true },
  ];
  const session = (id: "alchemy" | "hypnotherapy" | "business"): Offer => {
    const offer = byId(id);
    return { id, title: offer.title, description: offer.promise, details: t.methods[id],
      image: offer.image, href: offer.href, category: offer.label || t.sessionCategory,
      price: "€50 / 30 min · €100 / 60 min" };
  };
  const paid: Offer[] = [
    session("alchemy"),
    session("hypnotherapy"),
    { id: "constellations", title: t.constellationTitle, description: t.constellationDescription,
      details: t.constellationDetails, image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      href: "/" + locale + "/services/systemic-constellations", category: t.sessionCategory,
      price: "€50 / 30 min · €100 / 60 min" },
    session("business"),
    { id: "remote-energy-support", title: t.remoteTitle, description: t.remoteDescription,
      details: t.remoteDetails, image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
      href: "/" + locale + "/services/remote-energy-support", category: t.remoteCategory,
      price: t.remotePrice, externalFlow: true },
  ];

  const inPerson: Offer[] = [
    { id: "tantra-reiki-initiation", title: m.tantraTitle, description: m.tantraAbout,
      details: m.tantraDetails, image: "/images/tantra-reiki/participant-1-poster.png",
      href: "/" + locale + "/academy/reiki/tantra-reiki", category: m.initiation,
      price: m.priceOnRequest, externalFlow: true, actionLabel: m.initiationAction },
    { id: "yggdrasil-initiation", title: m.yggTitle, description: m.yggAbout,
      details: m.details, image: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
      href: "/" + locale + "/academy/reiki/yggdrasil", category: m.initiation,
      price: "€100 / 60 min / level", externalFlow: true, actionLabel: m.initiationAction },
    { id: "kundalini-reiki-training", title: m.kundTitle, description: m.kundAbout,
      details: m.details, image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
      href: "/" + locale + "/academy/reiki/kundalini-reiki", category: m.initiation,
      price: m.priceOnRequest, externalFlow: true, actionLabel: m.initiationAction },
    { id: "toronto-events", title: m.eventsTitle, description: m.eventsAbout,
      details: m.eventsDetails, image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      href: "/" + locale + "/events", category: m.eventsCategory,
      externalFlow: true, actionLabel: m.eventsAction },
  ];
  const shownPaid = format === "in-person"
    ? paid.filter((offer) => offer.id !== "remote-energy-support")
    : paid;
  const preferredFormat = format === "all" ? undefined : format;

  return (
    <>
      <div className={styles.formatPicker} role="group" aria-label={m.label} data-services-format-picker>
        <p>{m.label}</p>
        <div className={styles.formatOptions}>
          {([
            ["all", m.all],
            ["online", m.online],
            ["in-person", m.inPerson],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={format === value}
              data-services-format-option={value}
              className={format === value ? styles.formatActive : undefined}
              onClick={() => setFormat(value)}>{label}</button>
          ))}
        </div>
      </div>
      <section className={styles.section} id="free-insights" aria-labelledby="services-free-title" data-services-studio-free lang={locale}>
        {format === "in-person" ? (
          <div className={styles.freeOffline}>
            <h2 id="services-free-title">{t.freeTitle}</h2>
            <p>{m.onlineIntro}</p>
            <button type="button" onClick={() => setFormat("online")}>{m.onlineIntroAction}<ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        ) : (
          <>
            <header className={styles.heading}>
              <p className={styles.eyebrow}><ClipboardCheck size={16} aria-hidden="true" />{t.freeEyebrow}</p>
              <h2 id="services-free-title">{t.freeTitle}</h2>
              <p>{t.freeLead}</p>
            </header>
            <div className={styles.freeGrid}>
              {free.map((offer, index) => <ServiceCard key={offer.id} offer={offer} locale={locale} index={index} />)}
            </div>
            <div className={styles.freeFooter}>
              <span><ShieldCheck size={17} aria-hidden="true" />{t.freeNote}</span>
              <Link href={"/" + locale + "/courses/antistress"} prefetch={false}>{t.opora}<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </>
        )}
      </section>
      <section className={styles.section} id="solutions" aria-labelledby="services-personal-title" data-services-studio-paid lang={locale}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>{t.paidEyebrow}</p>
          <h2 id="services-personal-title">{format === "online" ? m.onlineTitle : format === "in-person" ? m.inPersonTitle : t.paidTitle}</h2>
          <p>{format === "online" ? m.onlineLead : format === "in-person" ? m.inPersonLead : t.paidLead}</p>
        </header>
        <div className={styles.paidGrid}>
          {shownPaid.map((offer, index) => <ServiceCard key={offer.id} offer={offer} locale={locale} index={index} preferredFormat={preferredFormat} />)}
        </div>
        <div className={styles.paidFooter}>
          <span><ShieldCheck size={17} aria-hidden="true" />{t.reassurance}</span>
          <p>{t.disclaimer}</p>
        </div>
      </section>
      {format !== "online" ? (
        <section className={styles.section} aria-labelledby="services-in-person-title" data-services-studio-initiations lang={locale}>
          <header className={styles.heading}>
            <p className={styles.eyebrow}>{m.groupEyebrow}</p>
            <h2 id="services-in-person-title">{m.groupTitle}</h2>
            <p>{m.groupLead}</p>
          </header>
          <div className={styles.paidGrid}>
            {inPerson.map((offer, index) => <ServiceCard key={offer.id} offer={offer} locale={locale} index={index} preferredFormat="in-person" />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
