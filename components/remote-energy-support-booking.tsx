"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { REMOTE_SUPPORT_DRAFT_KEY, REMOTE_SUPPORT_DURATIONS, stageRemoteSupportPrivateIntention } from "@/lib/practitioners/remote-energy-support";
import styles from "./remote-energy-support-booking.module.css";

type Locale = "en" | "ru" | "es";
type Format = "asynchronous" | "live";

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
    eyebrow: "PERSONAL PRACTICE · ONLINE",
    title: "Energy support for your goal",
    intro: "Tell us what you need first. Then explore practitioners, prices and request a session.",
    practitioner: "Practitioner",
    focus: "Your focus",
    method: "Practice",
    format: "Support format",
    async: "At a distance, without a call",
    live: "Live online session",
    duration: "Requested duration",
    schedule: "Preferred time",
    date: "Date",
    time: "Time",
    timeZone: "Your local time",
    noSlots: "The time is a preference, not a confirmed appointment.",
    price: "Price comes from the practitioner’s approved offer. Payment is not enabled yet.",
    send: "Continue to request",
    noMasters: "No practitioners are currently taking remote energy support requests. Please check back or explore their other services.",
    more: "See practitioners",
    freeReiki: "Explore the free Reiki introduction",
    durations: "10, 20, 30 or 60 minutes",
    pending: "Availability and price confirmed before any payment",
    steps: "Your intention · Choose a practitioner · Request a time",
    safety: "An optional complementary wellbeing practice, not medical treatment, diagnosis or emergency care.",
    needsStorage: "This browser could not hold your choices. Please allow temporary session storage and try again.",
    select: "Choose",
    unavailablePrice: "No published price for this duration",
    profile: "View profile",
    reviews: "Verified feedback",
    noReviews: "No published reviews yet",
    bookingStatus: "Not booked · No payment yet",
    question: "What would you like support with?",
    questionHint: "Begin with your intention. Then explore real practitioners and choose the service that feels right for you.",
    intentionLabel: "In your own words",
    intentionPlaceholder: "For example: I would like more calm and clarity before an important decision…",
    focusPrompt: "Or choose an area of support",
    privacyHint: "Keep it brief. Do not include medical records or another person’s private details. You will review the message before sending it in your private account.",
    specialistsTitle: "Choose your practitioner",
    specialistsHint: "Published offers only. Read the details, then request a convenient time.",
    serviceType: "Personal Reiki practice · Online",
    defaultDescription: "Personalized distance support or a live online Reiki practice, with timing agreed together.",
    details: "Details",
    requestThis: "Request",
    hideOptions: "Close",
    methodsLabel: "Available practices",
    languagesLabel: "Languages",
    optionTitle: "Your preferred session",
    optionHint: "Select a practice, format, duration and preferred time. This is a request—not a booking or payment.",
    focusRequired: "Please describe what you would like or choose a support area above.",
    pastTime: "Choose a future date and time. This is only a preferred time until confirmed.",
    missingChoice: "Please choose a practitioner and a published duration.",
    publishedFrom: "Published prices",
    minutes: "min",
    noPublishedOptions: "No approved duration or price is available",
    reviewCount: "verified reviews",
  },
  ru: {
    eyebrow: "ЛИЧНАЯ ПРАКТИКА · ОНЛАЙН",
    title: "Энергетическая поддержка цели",
    intro: "Сначала опишите вашу цель. Затем посмотрите специалистов, цены и запросите удобное время.",
    practitioner: "Мастер",
    focus: "Запрос",
    method: "Метод",
    format: "Формат поддержки",
    async: "Дистанционно, без видеозвонка",
    live: "Живой онлайн-сеанс",
    duration: "Желаемая длительность",
    schedule: "Удобное время",
    date: "Дата",
    time: "Время",
    timeZone: "Ваше местное время",
    noSlots: "Вы выбираете предпочтительное время, а не подтверждённую запись.",
    price: "Цена из опубликованного предложения мастера. Оплата пока не подключена.",
    send: "Перейти к заявке",
    noMasters: "Сейчас нет мастеров, принимающих заявки на дистанционную поддержку. Посмотрите другие услуги.",
    more: "Посмотреть мастеров",
    freeReiki: "Открыть бесплатное знакомство с Рейки",
    durations: "10, 20, 30 или 60 минут",
    pending: "Наличие времени и стоимость уточняются до оплаты",
    steps: "Ваш запрос · Специалисты · Заявка на время",
    safety: "Дополнительная практика для самочувствия, не замена медицинской помощи, диагностики или неотложной помощи.",
    needsStorage: "Не удалось сохранить выбор в браузере. Разрешите временное хранение данных и попробуйте ещё раз.",
    select: "Выберите",
    unavailablePrice: "Мастер пока не опубликовал цену для этой длительности",
    profile: "Профиль мастера",
    reviews: "Отзывы после сеансов",
    noReviews: "Пока нет опубликованных отзывов",
    bookingStatus: "Не подтверждено · Без оплаты",
    question: "Какую поддержку вы хотите получить?",
    questionHint: "Сначала расскажите о своём запросе. Ниже выберите специалиста и подходящую услугу.",
    intentionLabel: "Опишите своими словами",
    intentionPlaceholder: "Например: хочу больше спокойствия и ясности перед важным решением…",
    focusPrompt: "Или выберите направление",
    privacyHint: "Коротко, без диагнозов, медицинских документов и чужих личных данных. Перед отправкой вы проверите сообщение в защищённом кабинете.",
    specialistsTitle: "Выберите специалиста",
    specialistsHint: "Только опубликованные предложения. Сначала детали и стоимость, затем удобное время.",
    serviceType: "Личная практика Рейки · Онлайн",
    defaultDescription: "Индивидуальная дистанционная поддержка или живая онлайн-практика, время согласовывается с мастером.",
    details: "Подробнее",
    requestThis: "Запросить",
    hideOptions: "Свернуть",
    methodsLabel: "Доступные практики",
    languagesLabel: "Языки",
    optionTitle: "Параметры вашего сеанса",
    optionHint: "Выберите практику, формат, длительность и удобное время. Это заявка, а не подтверждённая запись или оплата.",
    focusRequired: "Сначала опишите запрос или выберите направление поддержки выше.",
    pastTime: "Выберите будущую дату и время. Это пожелание, а не подтверждённая запись.",
    missingChoice: "Выберите мастера и опубликованную длительность.",
    publishedFrom: "Опубликованная стоимость",
    minutes: "мин",
    noPublishedOptions: "Нет утверждённой длительности или цены",
    reviewCount: "проверенных отзывов",
  },
  es: {
    eyebrow: "PRÁCTICA PERSONAL · EN LÍNEA",
    title: "Apoyo energético para tu objetivo",
    intro: "Primero describe lo que necesitas. Después elige profesional, precio y horario.",
    practitioner: "Profesional",
    focus: "Tu objetivo",
    method: "Práctica",
    format: "Modalidad",
    async: "A distancia, sin videollamada",
    live: "Sesión en vivo en línea",
    duration: "Duración solicitada",
    schedule: "Horario preferido",
    date: "Fecha",
    time: "Hora",
    timeZone: "Tu horario local",
    noSlots: "Es una preferencia horaria, no una reserva confirmada.",
    price: "Precio de la oferta aprobada. El pago aún no está disponible.",
    send: "Continuar con la solicitud",
    noMasters: "Actualmente no hay profesionales que acepten solicitudes de apoyo a distancia.",
    more: "Ver profesionales",
    freeReiki: "Explorar la introducción gratuita a Reiki",
    durations: "10, 20, 30 o 60 minutos",
    pending: "Disponibilidad y precio confirmados antes del pago",
    steps: "Tu intención · Profesionales · Solicitar horario",
    safety: "Práctica complementaria de bienestar, no diagnóstico ni sustituto de atención médica o urgente.",
    needsStorage: "No se pudieron guardar tus preferencias temporalmente. Permite el almacenamiento de sesión e inténtalo de nuevo.",
    select: "Elige",
    unavailablePrice: "Sin precio publicado para esta duración",
    profile: "Ver perfil",
    reviews: "Opiniones verificadas",
    noReviews: "Todavía no hay opiniones publicadas",
    bookingStatus: "Sin confirmar · Sin pago",
    question: "¿Qué apoyo te gustaría recibir?",
    questionHint: "Primero explica tu intención. Después conoce a los profesionales y elige una oferta real.",
    intentionLabel: "Cuéntanoslo con tus palabras",
    intentionPlaceholder: "Por ejemplo: quiero más calma y claridad antes de tomar una decisión…",
    focusPrompt: "O elige un área de apoyo",
    privacyHint: "Escribe brevemente, sin historiales médicos ni datos privados de otras personas. Revisarás el texto antes de enviarlo en tu cuenta privada.",
    specialistsTitle: "Elige a tu profesional",
    specialistsHint: "Solo ofertas publicadas. Consulta los detalles y precios antes de elegir la hora.",
    serviceType: "Práctica personal de Reiki · En línea",
    defaultDescription: "Apoyo personal a distancia o práctica Reiki en directo, con horario acordado con el profesional.",
    details: "Detalles",
    requestThis: "Solicitar",
    hideOptions: "Cerrar",
    methodsLabel: "Prácticas disponibles",
    languagesLabel: "Idiomas",
    optionTitle: "Tu sesión preferida",
    optionHint: "Elige práctica, modalidad, duración y hora. Es una solicitud, no una reserva ni un pago.",
    focusRequired: "Describe tu intención o elige un área de apoyo arriba.",
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
  { id: "Clarity and life direction", en: "Clarity & direction", ru: "Ясность и направление", es: "Claridad y dirección" },
  { id: "Connection and relationships", en: "Connection & relationships", ru: "Отношения и контакт", es: "Conexión y relaciones" },
  { id: "Energy and resources", en: "Energy & resources", ru: "Энергия и ресурсы", es: "Energía y recursos" },
  { id: "Work and money", en: "Work & money", ru: "Работа и деньги", es: "Trabajo y dinero" },
  { id: "Personal intention", en: "My own intention", ru: "Моё намерение", es: "Mi intención" },
] as const;

function localDateToday() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

export function RemoteEnergySupportBooking({
  locale, masters, preferredPractitioner,
}: {
  locale: Locale;
  masters: EnergySupportMaster[];
  preferredPractitioner: string;
}) {
  const t = WORDS[locale];
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState(() =>
    masters.find((master) => master.slug === preferredPractitioner)?.serviceId || ""
  );
  const [goal, setGoal] = useState("");
  const [intention, setIntention] = useState("");
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
  }, []);
  useEffect(() => {
    if (options.length && !options.some((option) => option.duration === duration)) {
      setDuration(options[0].duration);
    }
  }, [selectedServiceId, options, duration]);
  useEffect(() => {
    if (methods.length && !methods.includes(method)) setMethod(methods[0]);
  }, [methods, method]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    // The public topic is a controlled value; private words are never in URL
    // or sessionStorage. They are reviewed in the authenticated request form.
    const topic = goal || (intention.trim() ? "Personal intention" : "");
    if (!topic) {
      setError("focus");
      document.getElementById("remote-intention")?.focus();
      return;
    }
    if (!selected || !currentPrice || !method || !day || !time ||
      (minimumDay && day < minimumDay)) {
      setError("missing");
      return;
    }
    try {
      const startsAt = new Date(day + "T" + time + ":00");
      if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now() + 5 * 60 * 1000) {
        setError("past");
        return;
      }
      const draft = {
        version: 2, serviceId: selected.serviceId, practitioner: selected.name,
        goal: topic, method, format, duration, date: day, time, timezone,
        startsAt: startsAt.toISOString(), expectedPrice: currentPrice.price,
        expectedCurrency: selected.currency, savedAt: Date.now(),
      };
      window.sessionStorage.setItem(REMOTE_SUPPORT_DRAFT_KEY, JSON.stringify(draft));
      stageRemoteSupportPrivateIntention(selected.serviceId, intention);
      // Use same-tab Next navigation to keep the intention in ephemeral memory.
      // If a login redirect reloads the page, the secure form remains editable.
      const cabinetLocale = locale === "es" ? "en" : locale;
      router.push("/" + cabinetLocale + "/app/consultations?service=" +
        encodeURIComponent(selected.serviceId) + "&source=remote-energy-support");
    } catch {
      setError("storage");
    }
  };

  return (
    <section className={styles.page} aria-labelledby="remote-support-title" data-remote-support-intent-first>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>✦ {t.eyebrow}</p>
        <h1 id="remote-support-title">{t.title}</h1>
        <p>{t.intro}</p>
        <p className={styles.steps}>{t.steps}</p>
      </header>

      <section className={styles.intentPanel} aria-labelledby="remote-intent-heading">
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber} aria-hidden="true">01</span>
          <div>
            <h2 id="remote-intent-heading">{t.question}</h2>
            <p>{t.questionHint}</p>
          </div>
        </div>
        <label className={styles.intentLabel} htmlFor="remote-intention">{t.intentionLabel}</label>
        <textarea id="remote-intention" className={styles.intentionInput}
          maxLength={1000} rows={2} value={intention} placeholder={t.intentionPlaceholder}
          onChange={(event) => { setIntention(event.target.value); setError(""); }}
          aria-describedby="remote-intention-privacy"/>
        <p id="remote-intention-privacy" className={styles.privacyHint}>{t.privacyHint}</p>
        <p className={styles.topicLabel}>{t.focusPrompt}</p>
        <div className={styles.focusChips} role="group" aria-label={t.focusPrompt}>
          {FOCUSES.map((focus) => (
            <button key={focus.id} type="button" aria-pressed={goal === focus.id}
              className={goal === focus.id ? styles.focusActive : ""}
              onClick={() => { setGoal(goal === focus.id ? "" : focus.id); setError(""); }}>
              {focus[locale]}
            </button>
          ))}
        </div>
        {error === "focus" && <p className={styles.error} role="alert">{t.focusRequired}</p>}
      </section>

      <section className={styles.results} aria-labelledby="remote-practitioners-title">
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
                  data-remote-support-specialist={master.serviceId}>
                  <div className={styles.masterCard}>
                    <div className={styles.masterPhoto}>
                      {master.photo
                        ? <img src={master.photo} alt="" loading="lazy"/>
                        : <span aria-hidden="true">✦</span>}
                    </div>
                    <div className={styles.masterCopy}>
                      <p className={styles.serviceType}>{t.serviceType}</p>
                      <h3>{master.name}</h3>
                      <p className={styles.serviceDescription}>{master.description || t.defaultDescription}</p>
                      {offers.length ? (
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
                          disabled={!offers.length}
                          onClick={() => { setSelectedServiceId(isOpen ? "" : master.serviceId); setError(""); }}>
                          {isOpen ? t.hideOptions : t.requestThis} <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <form id={"remote-request-" + master.serviceId} className={styles.bookingForm} onSubmit={submit}>
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
                            checked={format === "asynchronous"} onChange={() => setFormat("asynchronous")}/>
                          {t.async}
                        </label>
                        <label className={format === "live" ? styles.activeFormat : ""}>
                          <input type="radio" name="remote-format" value="live"
                            checked={format === "live"} onChange={() => setFormat("live")}/>
                          {t.live}
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
                      <div className={styles.timeGroup}>
                        <p className={styles.timeTitle}>
                          {t.schedule} <small>· {t.timeZone}: {timezone}</small>
                        </p>
                        <div className={styles.timeFields}>
                          <div className={styles.field}>
                            <label htmlFor="remote-date">{t.date}</label>
                            <input id="remote-date" type="date" required min={minimumDay || undefined}
                              value={day} onChange={(event) => setDay(event.target.value)}/>
                          </div>
                          <div className={styles.field}>
                            <label htmlFor="remote-time">{t.time}</label>
                            <input id="remote-time" type="time" required value={time}
                              onChange={(event) => setTime(event.target.value)}/>
                          </div>
                        </div>
                      </div>
                      <div className={styles.requestSummary}>
                        <strong>{currentPrice && selected
                          ? priceLabel(currentPrice.price, selected.currency) + " · " + duration + " " + t.minutes
                          : t.unavailablePrice}</strong>
                        <span>{t.bookingStatus}</span>
                        <p>{t.noSlots} {t.price}</p>
                      </div>
                      <button className={styles.submit} type="submit" disabled={!currentPrice}>
                        {t.send} <span aria-hidden="true">→</span>
                      </button>
                      {error && error !== "focus" && (
                        <p className={styles.error} role="alert">
                          {error === "past" ? t.pastTime
                            : error === "missing" ? t.missingChoice : t.needsStorage}
                        </p>
                      )}
                    </form>
                  )}
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
