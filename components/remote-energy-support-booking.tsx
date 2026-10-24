"use client";

import Link from "next/link";
import { ServiceReviews } from "@/components/service-reviews";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { REMOTE_SUPPORT_DRAFT_KEY, REMOTE_SUPPORT_DURATIONS } from "@/lib/practitioners/remote-energy-support";
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
    intro: "Choose a practice, practitioner and preferred time. Your request goes to the practitioner for confirmation.",
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
    steps: "Choose a practice · Pick a time · Send your request",
    safety: "An optional complementary wellbeing practice, not medical treatment, diagnosis or emergency care.",
    needsStorage: "This browser could not hold your choices. Please allow temporary session storage and try again.",
    select: "Choose",
    unavailablePrice: "No published price for this duration",
    profile: "View profile",
    reviews: "Verified feedback",
    noReviews: "No published reviews yet",
  },
  ru: {
    eyebrow: "ЛИЧНАЯ ПРАКТИКА · ОНЛАЙН",
    title: "Энергетическая поддержка цели",
    intro: "Выберите практику, мастера и удобное время. Мастер рассмотрит вашу заявку и подтвердит возможность проведения.",
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
    steps: "Выберите практику · Время · Отправьте заявку",
    safety: "Дополнительная практика для самочувствия, не замена медицинской помощи, диагностики или неотложной помощи.",
    needsStorage: "Не удалось сохранить выбор в браузере. Разрешите временное хранение данных и попробуйте ещё раз.",
    select: "Выберите",
    unavailablePrice: "Мастер пока не опубликовал цену для этой длительности",
    profile: "Профиль мастера",
    reviews: "Отзывы после сеансов",
    noReviews: "Пока нет опубликованных отзывов",
  },
  es: {
    eyebrow: "PRÁCTICA PERSONAL · EN LÍNEA",
    title: "Apoyo energético para tu objetivo",
    intro: "Elige la práctica, el profesional y la hora preferida. Tu solicitud necesita confirmación del profesional.",
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
    steps: "Elige la práctica · La hora · Envía la solicitud",
    safety: "Práctica complementaria de bienestar, no diagnóstico ni sustituto de atención médica o urgente.",
    needsStorage: "No se pudieron guardar tus preferencias temporalmente. Permite el almacenamiento de sesión e inténtalo de nuevo.",
    select: "Elige",
    unavailablePrice: "Sin precio publicado para esta duración",
    profile: "Ver perfil",
    reviews: "Opiniones verificadas",
    noReviews: "Todavía no hay opiniones publicadas",
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
  const [slug, setSlug] = useState(() =>
    masters.find((master) => master.slug === preferredPractitioner)?.slug || masters[0]?.slug || ""
  );
  const [goal, setGoal] = useState<string>(FOCUSES[0].id);
  const [method, setMethod] = useState("");
  const [format, setFormat] = useState<Format>("asynchronous");
  const [duration, setDuration] = useState<number>(30);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [minimumDay, setMinimumDay] = useState("");
  const [timezone, setTimezone] = useState("America/Toronto");
  const [error, setError] = useState(false);

  const selected = useMemo(() => masters.find((master) => master.slug === slug) || null, [masters, slug]);
  const methods = useMemo(() => Array.from(new Set(selected?.methods?.filter(Boolean) || [])), [selected]);
  const options = useMemo(() => selected?.priceOptions || [], [selected]);
  const currentPrice = options.find(option => option.duration === duration);
  const priceLabel = (price: number, currency: string) => {
    try { return new Intl.NumberFormat(locale, {style:"currency", currency}).format(price); }
    catch { return currency + " " + price; }
  };

  useEffect(() => {
    setMinimumDay(localDateToday());
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto");
  }, []);
  useEffect(() => {
    if (options.length && !options.some(option => option.duration === duration))
      setDuration(options[0].duration);
  }, [selected?.serviceId, options, duration]);
  useEffect(() => {
    if (methods.length && !methods.includes(method)) setMethod(methods[0]);
  }, [methods, method]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(false);
    if (!selected || !currentPrice || !method || !day || !time || (minimumDay && day < minimumDay)) return;
    try {
      const startsAt = new Date(day + "T" + time + ":00");
      if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now() + 5 * 60 * 1000) {
        setError(true);
        return;
      }
      const draft = {
        version: 2, serviceId: selected.serviceId, practitioner: selected.name,
        goal, method, format, duration, date: day, time, timezone,
        startsAt: startsAt.toISOString(), expectedPrice: currentPrice.price,
        expectedCurrency: selected.currency, savedAt: Date.now(),
      };
      window.sessionStorage.setItem(REMOTE_SUPPORT_DRAFT_KEY, JSON.stringify(draft));
      // The cabinet supports EN/RU at present; ES retains preferences but opens EN.
      const cabinetLocale = locale === "es" ? "en" : locale;
      window.location.assign(
        `/${cabinetLocale}/app/consultations?service=${encodeURIComponent(selected.serviceId)}&source=remote-energy-support`
      );
    } catch {
      setError(true);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="remote-support-title" data-public-visual-landing="remote-energy">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>✦ {t.eyebrow}</p>
        <h1 id="remote-support-title">{t.title}</h1>
        <p>{t.intro}</p>
        <div className={styles.introHighlights} aria-label={t.steps}>
          <span>{t.durations}</span><span>{t.pending}</span>
        </div>
        <p className={styles.steps}>{t.steps}</p>
      </div>
      {selected && <details className={styles.reviewsBeforeForm}>
        <summary>{t.reviews} · {selected.name} ({selected.reviewCount})</summary>
        <ServiceReviews key={selected.serviceId} serviceId={selected.serviceId} locale={locale} readOnly verifiedOnly/>
      </details>}
      <p className={styles.disclaimer}>{t.safety}</p>
      {masters.length === 0 ? (
        <div className={styles.empty} role="status">
          <p>{t.noMasters}</p>
          <Link href={`/${locale}/masters`}>{t.more} →</Link>
          <Link href={`/${locale}/academy/reiki/yggdrasil/free-initiation`}>{t.freeReiki} →</Link>
        </div>
      ) : (
        <div className={styles.finalRequest} data-remote-visual-screen="final-capture">
          <div className={styles.requestPhoto}>
            <img src="/images/holistic-house/hero-olive-incense.webp" alt="" loading="lazy" decoding="async" />
          </div>
          <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="remote-master">{t.practitioner}</label>
            <select id="remote-master" value={slug} onChange={(event) => setSlug(event.target.value)} required>
              {masters.map((master) => <option value={master.slug} key={master.serviceId}>{master.name}{master.title ? ` — ${master.title}` : ""}</option>)}
            </select>
            {selected && <div className={styles.masterCard}>
              {selected.photo && <img src={selected.photo} alt={selected.name} loading="lazy" />}
              <div className={styles.masterCopy}>
                <strong>{selected.name}</strong>
                {selected.title && <p>{selected.title}</p>}
                {selected.bio && <p>{selected.bio}</p>}
                {selected.languages.length > 0 && <small>{selected.languages.join(" · ")}</small>}
                <Link href={`/${locale}/masters/${selected.slug}`}>{t.profile} →</Link>
                {selected.reviewCount > 0 ?
                  <small>★ {selected.reviewAverage.toFixed(1)} · {selected.reviewCount} {t.reviews}</small>:
                  <small>{t.noReviews}</small>}
              </div>
            </div>}
          </div>
          <div className={styles.field}>
            <label htmlFor="remote-goal">{t.focus}</label>
            <select id="remote-goal" value={goal} onChange={(event) => setGoal(event.target.value)} required>
              {FOCUSES.map((focus) => <option key={focus.id} value={focus.id}>{focus[locale]}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="remote-method">{t.method}</label>
            <select id="remote-method" value={method} onChange={(event) => setMethod(event.target.value)} required>
              {methods.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <fieldset className={styles.formatGroup}>
            <legend>{t.format}</legend>
            <label className={format === "asynchronous" ? styles.activeFormat : ""}>
              <input type="radio" name="remote-format" value="asynchronous" checked={format === "asynchronous"} onChange={() => setFormat("asynchronous")}/>
              {t.async}
            </label>
            <label className={format === "live" ? styles.activeFormat : ""}>
              <input type="radio" name="remote-format" value="live" checked={format === "live"} onChange={() => setFormat("live")}/>
              {t.live}
            </label>
          </fieldset>
          <fieldset className={styles.durationGroup}>
            <legend>{t.duration}</legend>
            {REMOTE_SUPPORT_DURATIONS.map((minutes) => {
              const published = options.find(option => option.duration === minutes);
              return <label className={duration === minutes ? styles.activeDuration : ""} key={minutes}>
                <input type="radio" name="remote-duration" value={minutes}
                  disabled={!published} checked={duration === minutes}
                  onChange={() => setDuration(minutes)}/>
                {minutes} min {published ? "· " + priceLabel(published.price, selected?.currency || "CAD") : ""}
              </label>;
            })}
          </fieldset>
          <div className={styles.timeGroup}>
            <p className={styles.timeTitle}>{t.schedule} <span>· {t.timeZone}: {timezone}</span></p>
            <div className={styles.timeFields}>
              <div className={styles.field}>
                <label htmlFor="remote-date">{t.date}</label>
                <input id="remote-date" type="date" required min={minimumDay || undefined} value={day} onChange={(event) => setDay(event.target.value)}/>
              </div>
              <div className={styles.field}>
                <label htmlFor="remote-time">{t.time}</label>
                <input id="remote-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)}/>
              </div>
            </div>
          </div>
          <div className={styles.review}>
            <p>{t.noSlots}</p>
            <strong>{currentPrice && selected ? priceLabel(currentPrice.price, selected.currency) : t.unavailablePrice} {currentPrice ? "· " + duration + " min" : ""}</strong>
            <p>{t.price}</p>
          </div>
          <button className={styles.submit} type="submit" disabled={!currentPrice}>{t.send} <span aria-hidden="true">→</span></button>
          {error && <p role="alert" className={styles.error}>{t.needsStorage}</p>}
        </form>
        </div>
      )}
    </section>
  );
}
