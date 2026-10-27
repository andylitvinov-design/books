"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { REMOTE_SUPPORT_DURATIONS, takeRemoteSupportLandingIntention } from "@/lib/practitioners/remote-energy-support";
import { RemoteSupportEnquiryContact } from "./remote-support-enquiry-contact";
import styles from "./remote-energy-support-booking.module.css";

type Locale = "en" | "ru" | "es";
type Format = "asynchronous" | "live";
export type SupportRequestKind = "talisman" | "energy";

export type EnergySupportMaster = {
  slug: string;
  name: string;
  title: string;
  photo: string;
  serviceId: string;
  methods: string[];
  bio: string;
  description: string;
  languages: string[];
  currency: string;
  priceOptions: {duration: 10 | 20 | 30 | 60; price: number}[];
  reviewCount: number;
  reviewAverage: number;
};

const WORDS = {
  en: {
    kindLabel: "What would you like to order?",
    kindEnergy: "Energy support",
    kindTalisman: "A personal talisman",
    talismanTitle: "Request a personal talisman",
    talismanIntro: "Choose a theme and a practitioner. Ask whether a custom symbolic talisman is available. No price or delivery is confirmed.",
    talismanServiceType: "Custom talisman enquiry · Availability not confirmed",
    talismanOffer: "Request talisman",
    talismanFormTitle: "Ask this practitioner about a talisman",
    talismanHint: "Leave your contact below. We will confirm availability, design, price and delivery before any payment.",
    talismanSubmit: "Confirm request",
    eyebrow: "PERSONAL PRACTICE · ONLINE",
    title: "Energy support for your goal",
    intro: "Choose an area, add any preferences, and explore published practitioner offers.",
    practitioner: "Practitioner",
    focus: "Your focus",
    method: "Practice",
    format: "Support format",
    async: "At a distance, without a call",
    asyncCompact: "Distance · no call",
    live: "Live online session",
    liveCompact: "Live online",
    duration: "Requested duration",
    schedule: "Preferred time",
    scheduleOptional: "Suggest a date and time (optional)",
    scheduleHint: "Leave this closed to agree on a time later.",
    date: "Date",
    time: "Time",
    timeZone: "Your local time",
    noSlots: "The time is a preference, not a confirmed appointment.",
    price: "Price comes from the practitioner’s approved offer. Payment is not enabled yet.",
    send: "Confirm request",
    noMasters: "No practitioners are currently taking remote energy support requests. Please check back or explore their other services.",
    more: "See practitioners",
    freeReiki: "Explore the free Reiki introduction",
    durations: "10, 20, 30 or 60 minutes",
    pending: "Availability and price confirmed before any payment",
    steps: "Choose a focus · Find options · Request a time",
    safety: "An optional complementary wellbeing practice, not medical treatment, diagnosis or emergency care.",
    needsStorage: "This browser could not hold your choices. Please allow temporary session storage and try again.",
    select: "Choose",
    unavailablePrice: "No published price for this duration",
    profile: "View profile",
    reviews: "Verified feedback",
    noReviews: "No published reviews yet",
    bookingStatus: "Not booked · No payment yet",
    question: "Choose your support",
    questionHint: "Start with one area that matters most to you.",
    intentionLabel: "Any preferences? (optional)",
    intentionPlaceholder: "For example: a gentle practice in the evening…",
    focusPrompt: "Choose one area of support",
    privacyHint: "Keep it brief; do not include medical records or someone else’s private details. Your note is sent only when you confirm the request and agree to a personal reply.",
    privacyShort: "Private until you send · no medical details",
    findOptions: "Find options",
    specialistsTitle: "Available practitioners",
    specialistsHint: "Published offers only. Read the details, then request a convenient time.",
    serviceType: "Personal Reiki practice · Online",
    defaultDescription: "Personalized distance support or a live online Reiki practice, with timing agreed together.",
    details: "Details",
    requestThis: "Request",
    hideOptions: "Close",
    methodsLabel: "Available practices",
    languagesLabel: "Languages",
    optionTitle: "Your preferred session",
    optionHint: "Select a practice, format and duration. Preferred time is optional. No booking or payment yet.",
    focusRequired: "Choose an area of support to view available options.",
    pastTime: "Choose a future date and time. This is only a preferred time until confirmed.",
    missingChoice: "Please choose a practitioner and a published duration.",
    publishedFrom: "Published prices",
    minutes: "min",
    noPublishedOptions: "No approved duration or price is available",
    reviewCount: "verified reviews",
  },
  ru: {
    kindLabel: "Что вы хотите заказать?",
    kindEnergy: "Энергетическую поддержку",
    kindTalisman: "Персональный талисман",
    talismanTitle: "Заказ персонального талисмана",
    talismanIntro: "Выберите тему и мастера. Мастер отдельно подтвердит возможность изготовления, стоимость и доставку.",
    talismanServiceType: "Запрос на талисман · Доступность не подтверждена",
    talismanOffer: "Заказать талисман",
    talismanFormTitle: "Обсудить талисман с этим мастером",
    talismanHint: "Оставьте контакт ниже. Мастер уточнит символ, цену и условия до подтверждения заказа или оплаты.",
    talismanSubmit: "Подтвердить заявку",
    eyebrow: "ЛИЧНАЯ ПРАКТИКА · ОНЛАЙН",
    title: "Энергетическая поддержка цели",
    intro: "Выберите направление, при желании добавьте пожелания и найдите предложения мастеров.",
    practitioner: "Мастер",
    focus: "Запрос",
    method: "Метод",
    format: "Формат поддержки",
    async: "Дистанционно, без видеозвонка",
    asyncCompact: "Дистанционно",
    live: "Живой онлайн-сеанс",
    liveCompact: "Онлайн-сеанс",
    duration: "Желаемая длительность",
    schedule: "Удобное время",
    scheduleOptional: "Указать удобное время (необязательно)",
    scheduleHint: "Можно не заполнять — время согласуем позже.",
    date: "Дата",
    time: "Время",
    timeZone: "Ваше местное время",
    noSlots: "Вы выбираете предпочтительное время, а не подтверждённую запись.",
    price: "Цена из опубликованного предложения мастера. Оплата пока не подключена.",
    send: "Подтвердить заявку",
    noMasters: "Сейчас нет мастеров, принимающих заявки на дистанционную поддержку. Посмотрите другие услуги.",
    more: "Посмотреть мастеров",
    freeReiki: "Открыть бесплатное знакомство с Рейки",
    durations: "10, 20, 30 или 60 минут",
    pending: "Наличие времени и стоимость уточняются до оплаты",
    steps: "Выберите направление · Найдите варианты · Запросите время",
    safety: "Дополнительная практика для самочувствия, не замена медицинской помощи, диагностики или неотложной помощи.",
    needsStorage: "Не удалось сохранить выбор в браузере. Разрешите временное хранение данных и попробуйте ещё раз.",
    select: "Выберите",
    unavailablePrice: "Мастер пока не опубликовал цену для этой длительности",
    profile: "Профиль мастера",
    reviews: "Отзывы после сеансов",
    noReviews: "Пока нет опубликованных отзывов",
    bookingStatus: "Не подтверждено · Без оплаты",
    question: "Выберите поддержку",
    questionHint: "Начните с одного самого важного для вас направления.",
    intentionLabel: "Ваши пожелания (необязательно)",
    intentionPlaceholder: "Например: мягкая практика вечером…",
    focusPrompt: "Выберите одно направление",
    privacyHint: "Пишите кратко, без диагнозов, документов и чужих личных данных. Пожелания отправляются только после подтверждения заявки и согласия на ответ.",
    privacyShort: "Приватно до отправки · без медданных",
    findOptions: "Найти варианты",
    specialistsTitle: "Доступные мастера",
    specialistsHint: "Только опубликованные предложения. Сначала детали и стоимость, затем удобное время.",
    serviceType: "Личная практика Рейки · Онлайн",
    defaultDescription: "Индивидуальная дистанционная поддержка или живая онлайн-практика, время согласовывается с мастером.",
    details: "Подробнее",
    requestThis: "Запросить",
    hideOptions: "Свернуть",
    methodsLabel: "Доступные практики",
    languagesLabel: "Языки",
    optionTitle: "Параметры вашего сеанса",
    optionHint: "Выберите практику, формат и длительность. Время указывать необязательно. Пока без записи и оплаты.",
    focusRequired: "Выберите направление, чтобы увидеть доступные варианты.",
    pastTime: "Выберите будущую дату и время. Это пожелание, а не подтверждённая запись.",
    missingChoice: "Выберите мастера и опубликованную длительность.",
    publishedFrom: "Опубликованная стоимость",
    minutes: "мин",
    noPublishedOptions: "Нет утверждённой длительности или цены",
    reviewCount: "проверенных отзывов",
  },
  es: {
    kindLabel: "¿Qué deseas solicitar?",
    kindEnergy: "Apoyo energético",
    kindTalisman: "Un talismán personal",
    talismanTitle: "Solicitar un talismán personal",
    talismanIntro: "Elige un tema y un profesional. La disponibilidad, el precio y la entrega deben confirmarse.",
    talismanServiceType: "Consulta sobre talismán · Sin confirmar",
    talismanOffer: "Solicitar talismán",
    talismanFormTitle: "Preguntar por un talismán",
    talismanHint: "Deja un contacto para acordar el diseño, precio y entrega antes de cualquier pago.",
    talismanSubmit: "Confirmar solicitud",
    eyebrow: "PRÁCTICA PERSONAL · EN LÍNEA",
    title: "Apoyo energético para tu objetivo",
    intro: "Elige un área, añade tus preferencias si quieres y explora ofertas publicadas.",
    practitioner: "Profesional",
    focus: "Tu objetivo",
    method: "Práctica",
    format: "Modalidad",
    async: "A distancia, sin videollamada",
    asyncCompact: "Sin llamada",
    live: "Sesión en vivo en línea",
    liveCompact: "En vivo",
    duration: "Duración solicitada",
    schedule: "Horario preferido",
    scheduleOptional: "Elegir fecha y hora (opcional)",
    scheduleHint: "Puedes dejarlo cerrado y acordar la hora después.",
    date: "Fecha",
    time: "Hora",
    timeZone: "Tu horario local",
    noSlots: "Es una preferencia horaria, no una reserva confirmada.",
    price: "Precio de la oferta aprobada. El pago aún no está disponible.",
    send: "Confirmar solicitud",
    noMasters: "Actualmente no hay profesionales que acepten solicitudes de apoyo a distancia.",
    more: "Ver profesionales",
    freeReiki: "Explorar la introducción gratuita a Reiki",
    durations: "10, 20, 30 o 60 minutos",
    pending: "Disponibilidad y precio confirmados antes del pago",
    steps: "Elige un área · Busca opciones · Solicita horario",
    safety: "Práctica complementaria de bienestar, no diagnóstico ni sustituto de atención médica o urgente.",
    needsStorage: "No se pudieron guardar tus preferencias temporalmente. Permite el almacenamiento de sesión e inténtalo de nuevo.",
    select: "Elige",
    unavailablePrice: "Sin precio publicado para esta duración",
    profile: "Ver perfil",
    reviews: "Opiniones verificadas",
    noReviews: "Todavía no hay opiniones publicadas",
    bookingStatus: "Sin confirmar · Sin pago",
    question: "Elige tu apoyo",
    questionHint: "Empieza con el área más importante para ti.",
    intentionLabel: "¿Alguna preferencia? (opcional)",
    intentionPlaceholder: "Por ejemplo: una práctica suave por la tarde…",
    focusPrompt: "Elige un área de apoyo",
    privacyHint: "Sin historiales médicos ni datos privados de otras personas. La nota se envía solo al confirmar la solicitud y aceptar una respuesta.",
    privacyShort: "Privado hasta el envío · sin datos médicos",
    findOptions: "Buscar opciones",
    specialistsTitle: "Profesionales disponibles",
    specialistsHint: "Solo ofertas publicadas. Consulta los detalles y precios antes de elegir la hora.",
    serviceType: "Práctica personal de Reiki · En línea",
    defaultDescription: "Apoyo personal a distancia o práctica Reiki en directo, con horario acordado con el profesional.",
    details: "Detalles",
    requestThis: "Solicitar",
    hideOptions: "Cerrar",
    methodsLabel: "Prácticas disponibles",
    languagesLabel: "Idiomas",
    optionTitle: "Tu sesión preferida",
    optionHint: "Elige práctica, modalidad y duración. El horario es opcional. Todavía no es una reserva ni un pago.",
    focusRequired: "Elige un área de apoyo para ver las opciones disponibles.",
    pastTime: "Elige una fecha y hora futuras. No es una reserva confirmada.",
    missingChoice: "Elige un profesional y una duración publicada.",
    publishedFrom: "Precios publicados",
    minutes: "min",
    noPublishedOptions: "No hay duración o precio aprobado",
    reviewCount: "reseñas verificadas",
  },
} as const;

const FOCUSES = [
  { id: "Inner balance and calm", en: "Calm & balance", ru: "Спокойствие и баланс", es: "Calma y equilibrio" },
  { id: "Grounding and body awareness", en: "Body & grounding", ru: "Тело и опора", es: "Cuerpo y estabilidad" },
  { id: "Connection and relationships", en: "Connection & relationships", ru: "Отношения и контакт", es: "Conexión y relaciones" },
  { id: "Energy and resources", en: "Energy & resources", ru: "Энергия и ресурсы", es: "Energía y recursos" },
  { id: "Work and money", en: "Work & money", ru: "Работа и деньги", es: "Trabajo y dinero" },
] as const;

function localDateToday() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

export function RemoteEnergySupportBooking({
  locale, masters, preferredPractitioner, mode = "standalone", selectedKind = "energy",
  initialGoal = "", onKindChange,
}: {
  locale: Locale;
  masters: EnergySupportMaster[];
  preferredPractitioner: string;
  mode?: "inline" | "standalone";
  selectedKind?: SupportRequestKind;
  initialGoal?: string;
  onKindChange?: (kind: SupportRequestKind) => void;
}) {
  const t = WORDS[locale];
  const [selectedServiceId, setSelectedServiceId] = useState(() =>
    masters.find((master) => master.slug === preferredPractitioner)?.serviceId || ""
  );
  const [goal, setGoal] = useState(initialGoal);
  const [requestKind, setRequestKind] = useState<SupportRequestKind>(selectedKind);
  useEffect(() => {
    setRequestKind(selectedKind);
    if (initialGoal) setGoal(initialGoal);
  }, [selectedKind, initialGoal]);
  const [intention, setIntention] = useState("");
  const [showResults, setShowResults] = useState(mode === "inline" || Boolean(preferredPractitioner));
  const [method, setMethod] = useState("");
  const [format, setFormat] = useState<Format>("asynchronous");
  const [duration, setDuration] = useState<number>(30);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [minimumDay, setMinimumDay] = useState("");
  const [timezone, setTimezone] = useState("America/Toronto");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => masters.find((master) => master.serviceId === selectedServiceId) || null,
    [masters, selectedServiceId]
  );
  const methods = useMemo(
    () => Array.from(new Set(selected?.methods?.filter(Boolean) || [])),
    [selected]
  );
  const options = useMemo(
    () => (selected?.priceOptions || []).filter((option) => Number.isFinite(option.price) && option.price > 0),
    [selected]
  );
  const currentPrice = options.find((option) => option.duration === duration);
  const priceLabel = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency", currency, maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
      }).format(price);
    } catch {
      return currency + " " + price;
    }
  };

  useEffect(() => {
    setMinimumDay(localDateToday());
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto");
    const stagedIntention = takeRemoteSupportLandingIntention();
    if (stagedIntention) setIntention(stagedIntention);
  }, []);
  useEffect(() => {
    if (options.length && !options.some((option) => option.duration === duration)) {
      setDuration(options[0].duration);
    }
  }, [selectedServiceId, options, duration]);
  useEffect(() => {
    if (methods.length && !methods.includes(method)) setMethod(methods[0]);
  }, [methods, method]);

  useEffect(() => {
    if (!showResults || mode === "inline") return;
    const heading = document.getElementById("remote-practitioners-title");
    heading?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [showResults, mode]);

  function findOptions() {
    if (!goal) {
      setError("focus");
      document.querySelector<HTMLButtonElement>("[data-remote-focus-chip]")?.focus();
      return;
    }
    setError("");
    if (showResults) {
      document.getElementById("remote-practitioners-title")?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    } else {
      setShowResults(true);
    }
  }



  return (
    <section className={mode === "inline" ? styles.page + " " + styles.inline : styles.page}
      aria-labelledby="remote-support-title" data-remote-support-intent-first
      data-support-request-kind={requestKind}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>✦ {t.eyebrow}</p>
        <h1 id="remote-support-title">{requestKind === "talisman" ? t.talismanTitle : t.title}</h1>
        <p>{requestKind === "talisman" ? t.talismanIntro : t.intro}</p>
        <p className={styles.steps}>{t.steps}</p>
      </header>

      <div className={styles.kindChooser} role="group" aria-label={t.kindLabel}>
        <p>{t.kindLabel}</p>
        {(["talisman", "energy"] as const).map(kind => (
          <button key={kind} type="button" aria-pressed={requestKind === kind}
            onClick={() => {
              setRequestKind(kind);
              setSelectedServiceId("");
              setError("");
              onKindChange?.(kind);
            }}>
            {kind === "talisman" ? t.kindTalisman : t.kindEnergy}
          </button>
        ))}
      </div>
      <section className={styles.intentPanel} aria-labelledby="remote-intent-heading">
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber} aria-hidden="true">01</span>
          <div>
            <h2 id="remote-intent-heading">{t.question}</h2>
            <p>{t.questionHint}</p>
          </div>
        </div>
        <div className={styles.focusChips} role="group" aria-label={t.focusPrompt}>
          {FOCUSES.map((focus) => (
            <button key={focus.id} type="button" data-remote-focus-chip aria-pressed={goal === focus.id}
              className={goal === focus.id ? styles.focusActive : ""}
              onClick={() => { setGoal(goal === focus.id ? "" : focus.id); setError(""); }}>
              {focus[locale]}
            </button>
          ))}
        </div>
        <label className={styles.intentLabel} htmlFor="remote-intention">{t.intentionLabel}</label>
        <textarea id="remote-intention" className={styles.intentionInput}
          maxLength={500} rows={2} value={intention} placeholder={t.intentionPlaceholder}
          onChange={(event) => { setIntention(event.target.value); setError(""); }}
          aria-describedby="remote-intention-privacy"/>
        <details className={styles.privacyDetails}>
          <summary id="remote-intention-privacy">{t.privacyShort}</summary>
          <p className={styles.privacyHint}>{t.privacyHint}</p>
        </details>
        {error === "focus" && <p className={styles.error} role="alert">{t.focusRequired}</p>}
        <button type="button" data-remote-find-options className={styles.findButton}
          aria-controls="remote-results" aria-expanded={showResults} onClick={findOptions}>
          {t.findOptions}<span aria-hidden="true">→</span>
        </button>
      </section>

      <section id="remote-results" className={styles.results} hidden={!showResults} aria-labelledby="remote-practitioners-title">
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber} aria-hidden="true">02</span>
          <div>
            <h2 id="remote-practitioners-title">{t.specialistsTitle}</h2>
            <p>{t.specialistsHint}</p>
          </div>
        </div>

        {masters.length === 0 ? (
          <div className={styles.empty} role="status">
            <p>{t.noMasters}</p>
            <Link href={"/" + locale + "/masters"}>{t.more} →</Link>
            <Link href={"/" + locale + "/academy/reiki/yggdrasil/free-initiation"}>{t.freeReiki} →</Link>
          </div>
        ) : (
          <div className={styles.cards}>
            {masters.map((master) => {
              const isOpen = selectedServiceId === master.serviceId;
              const offers = master.priceOptions
                .filter((offer) => Number.isFinite(offer.price) && offer.price > 0)
                .sort((a, b) => a.duration - b.duration);
              return (
                <article key={master.serviceId} className={styles.masterOffer}
                  data-booking-open={isOpen ? "true" : undefined}
                  data-remote-support-specialist={master.serviceId}>
                  <div className={styles.masterCard}>
                    <div className={styles.masterPhoto}>
                      {master.photo
                        ? <img src={master.photo} alt="" loading="lazy"/>
                        : <span aria-hidden="true">✦</span>}
                    </div>
                    <div className={styles.masterCopy}>
                      <p className={styles.serviceType}>{requestKind === "talisman" ? t.talismanServiceType : t.serviceType}</p>
                      <h3>{master.name}</h3>
                      <p className={styles.serviceDescription}>{master.description || t.defaultDescription}</p>
                      {requestKind === "talisman" ? null : offers.length ? (
                        <div className={styles.offerPrices} aria-label={t.publishedFrom}>
                          {offers.map((offer) => (
                            <span key={offer.duration}>
                              {offer.duration} {t.minutes} · {priceLabel(offer.price, master.currency)}
                            </span>
                          ))}
                        </div>
                      ) : <p className={styles.unavailable}>{t.noPublishedOptions}</p>}
                      <div className={styles.cardActions}>
                        <details className={styles.cardDetails}>
                          <summary aria-label={t.details + ": " + master.name}>
                            {t.details} <span aria-hidden="true">⌄</span>
                          </summary>
                          <div className={styles.detailBody}>
                            {master.title && <p><strong>{master.title}</strong></p>}
                            {master.bio && <p>{master.bio}</p>}
                            <p><strong>{t.methodsLabel}:</strong> {master.methods.join(" · ")}</p>
                            {master.languages.length > 0 &&
                              <p><strong>{t.languagesLabel}:</strong> {master.languages.join(" · ")}</p>}
                            {master.reviewCount > 0 &&
                              <p>★ {master.reviewAverage.toFixed(1)} · {master.reviewCount} {t.reviewCount}</p>}
                            <Link href={"/" + locale + "/masters/" + master.slug}
                              prefetch={false}>{t.profile} →</Link>
                          </div>
                        </details>
                        <button className={styles.requestButton} type="button"
                          aria-expanded={isOpen} aria-controls={"remote-request-" + master.serviceId}
                          disabled={requestKind === "energy" && !offers.length}
                          onClick={() => { setSelectedServiceId(isOpen ? "" : master.serviceId); setError(""); }}>
                          {isOpen ? t.hideOptions : requestKind === "talisman" ? t.talismanOffer : t.requestThis} <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {isOpen && (requestKind === "talisman" ? (
                    <div id={"remote-request-" + master.serviceId} className={styles.bookingForm}>
                      <h4>{t.talismanFormTitle}</h4>
                      <p className={styles.bookingIntro}>{t.talismanHint}</p>
                      <RemoteSupportEnquiryContact locale={locale} master={master}
                        kind="talisman" goal={goal} intention={intention}/>
                    </div>
                  ) : (
                    <div id={"remote-request-" + master.serviceId} className={styles.bookingForm}>
                      <h4>{t.optionTitle}</h4>
                      <p className={styles.bookingIntro}>{t.optionHint}</p>
                      <div className={styles.field}>
                        <label htmlFor="remote-method">{t.method}</label>
                        <select id="remote-method" value={method} onChange={(event) => setMethod(event.target.value)} required>
                          {methods.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                      </div>
                      <fieldset className={styles.formatGroup}>
                        <legend>{t.format}</legend>
                        <label className={format === "asynchronous" ? styles.activeFormat : ""}>
                          <input type="radio" name="remote-format" value="asynchronous"
                            checked={format === "asynchronous"} onChange={() => setFormat("asynchronous")} aria-label={t.async}/>
                          <span className={styles.formatLong}>{t.async}</span>
                          <span className={styles.formatShort} aria-hidden="true">{t.asyncCompact}</span>
                        </label>
                        <label className={format === "live" ? styles.activeFormat : ""}>
                          <input type="radio" name="remote-format" value="live"
                            checked={format === "live"} onChange={() => setFormat("live")} aria-label={t.live}/>
                          <span className={styles.formatLong}>{t.live}</span>
                          <span className={styles.formatShort} aria-hidden="true">{t.liveCompact}</span>
                        </label>
                      </fieldset>
                      <fieldset className={styles.durationGroup}>
                        <legend>{t.duration}</legend>
                        {REMOTE_SUPPORT_DURATIONS.map((minutes) => {
                          const published = options.find((option) => option.duration === minutes);
                          return <label className={duration === minutes ? styles.activeDuration : ""} key={minutes}
                            title={!published ? t.unavailablePrice : undefined}>
                            <input type="radio" name="remote-duration" value={minutes}
                              disabled={!published} checked={duration === minutes}
                              onChange={() => setDuration(minutes)}
                              aria-label={minutes + " " + t.minutes + " · " +
                                (published ? priceLabel(published.price, selected?.currency || "CAD") : t.unavailablePrice)}/>
                            <span>{minutes} {t.minutes}</span>
                            <strong>{published ? priceLabel(published.price, selected?.currency || "CAD") : "—"}</strong>
                          </label>;
                        })}
                      </fieldset>
                      <details className={styles.timeGroup} data-optional-session-time
                        onToggle={event => {
                          if (!event.currentTarget.open) { setDay(""); setTime(""); }
                        }}>
                        <summary className={styles.timeToggle}>
                          {t.scheduleOptional} <span aria-hidden="true">⌄</span>
                        </summary>
                        <p className={styles.timeHint}>
                          {t.scheduleHint} · {t.timeZone}: {timezone}
                        </p>
                        <div className={styles.timeFields}>
                          <div className={styles.field}>
                            <label htmlFor="remote-date">{t.date}</label>
                            <input id="remote-date" type="date" min={minimumDay || undefined}
                              value={day} onChange={(event) => setDay(event.target.value)}/>
                          </div>
                          <div className={styles.field}>
                            <label htmlFor="remote-time">{t.time}</label>
                            <input id="remote-time" type="time" value={time}
                              onChange={(event) => setTime(event.target.value)}/>
                          </div>
                        </div>
                      </details>
                      <details className={styles.requestSummary}>
                         <summary className={styles.requestSummaryToggle}>
                           <strong>{currentPrice && selected
                             ? priceLabel(currentPrice.price, selected.currency) + " · " + duration + " " + t.minutes
                             : t.unavailablePrice}</strong>
                           <span>{t.bookingStatus}</span>
                         </summary>
                         <p>{t.noSlots} {t.price}</p>
                       </details>
                      <RemoteSupportEnquiryContact locale={locale} master={master}
                        kind="energy" goal={goal} intention={intention} method={method}
                        format={format} duration={duration} price={currentPrice?.price}
                        day={day} time={time} timezone={timezone}/>
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className={styles.disclaimer}>{t.safety}</p>
    </section>
  );
}
