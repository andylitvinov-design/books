"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, HandHeart, Hourglass, UsersRound } from "lucide-react";
import type { EnergySupportMaster } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./assist-reiki-session.module.css";

type Duration = 10 | 20 | 30;
type DirectoryPayload = { masters?: unknown[] };
const durations: readonly Duration[] = [10, 20, 30];

const words = {
  ru: {
    overline: "АССИСТ · УСЛУГИ", title: "Рейки-сессия",
    intro: "Мягкая энергетическая практика по вашему выбору",
    date: "Дата", time: "Время", duration: "Длительность", minute: "мин",
    choose: "Выберите специалиста", specialist: "Специалист Рейки",
    order: "Заказать", from: "от", free: "Бесплатно",
    loading: "Ищем опубликованные предложения мастеров…",
    unavailable: "Сейчас не удалось загрузить предложения мастеров.",
    retry: "Повторить", empty: "Для этой длительности пока нет предложений с опубликованной ценой.",
    more: "Подобрать других специалистов",
    note: "Дата и время — ваше пожелание, не подтверждённая запись. Мастер уточнит доступность и условия до оплаты.",
    invalidTime: "Выберите будущие дату и время.",
    caution: "Рейки — дополнительная практика, не медицинское лечение.",
  },
  en: {
    overline: "ASSIST · SERVICES", title: "Reiki session",
    intro: "An optional, gentle energy-based practice",
    date: "Date", time: "Time", duration: "Duration", minute: "min",
    choose: "Choose your practitioner", specialist: "Reiki practitioner",
    order: "Request", from: "from", free: "Free",
    loading: "Loading published practitioner offers…",
    unavailable: "Practitioner offers could not be loaded.",
    retry: "Try again", empty: "No published offer has a price for this duration yet.",
    more: "Find more practitioners",
    note: "The date and time are preferences, not a confirmed booking. Your practitioner confirms availability and the fee before payment.",
    invalidTime: "Choose a future date and time.",
    caution: "Reiki is complementary and is not medical treatment.",
  },
  es: {
    overline: "ASSIST · SERVICIOS", title: "Sesión de Reiki",
    intro: "Una práctica energética suave y opcional",
    date: "Fecha", time: "Hora", duration: "Duración", minute: "min",
    choose: "Elige un profesional", specialist: "Profesional de Reiki",
    order: "Solicitar", from: "desde", free: "Gratis",
    loading: "Cargando servicios publicados…",
    unavailable: "No se pueden cargar los servicios ahora.",
    retry: "Reintentar", empty: "No hay ofertas con precio publicado para esta duración.",
    more: "Buscar otros profesionales",
    note: "La fecha y la hora son preferencias, no una reserva. El profesional confirmará disponibilidad y precio antes del pago.",
    invalidTime: "Elige fecha y hora futuras.",
    caution: "Reiki es complementario, no es tratamiento médico.",
  },
} as const;

function localDay(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function approvedMaster(value: unknown): value is EnergySupportMaster {
  if (!value || typeof value !== "object") return false;
  const master = value as EnergySupportMaster;
  return Boolean(master.serviceId && typeof master.serviceId === "string" &&
    typeof master.slug === "string" && master.slug &&
    typeof master.name === "string" && master.name &&
    typeof master.currency === "string" && /^[A-Z]{3}$/.test(master.currency) &&
    Array.isArray(master.priceOptions));
}

function priceFor(master: EnergySupportMaster, duration: Duration) {
  const modern = master.reikiOffer?.kind === "session";
  const variants = modern
    ? (master.reikiOffer?.variants || []).filter(item =>
        item.duration === duration && !item.certificate &&
        typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0)
    : master.priceOptions.filter(item =>
        item.duration === duration && Number.isFinite(item.price) && item.price > 0);
  if (!variants.length) return null;
  const prices = variants.map(item => Number(item.price));
  const currency = modern ? master.reikiOffer?.currency : master.currency;
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return null;
  const minimum = Math.min(...prices);
  return { amount: minimum, currency, from: prices.some(price => price !== minimum) };
}

function bookingHref(locale: PublicLocale, master: EnergySupportMaster, duration: Duration, day: string, time: string) {
  if (master.reikiOffer?.kind === "session" &&
      master.serviceHref?.startsWith("/" + locale + "/") && !master.serviceHref.startsWith("//")) {
    // Structured Reiki offers use their own published service enquiry, not the legacy booking ID.
    return master.serviceHref;
  }
  const params = new URLSearchParams({ practitioner: master.slug, duration: String(duration), date: day, time });
  return "/" + locale + "/services/remote-energy-support?" + params.toString();
}

export function AssistReikiSession({ locale }: { locale: PublicLocale }) {
  const t = words[locale];
  const [duration, setDuration] = useState<Duration>(30);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [minimumDay, setMinimumDay] = useState("");
  const [maximumDay, setMaximumDay] = useState("");
  const [timezone, setTimezone] = useState("");
  const [masters, setMasters] = useState<EnergySupportMaster[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const last = new Date(today);
    last.setDate(today.getDate() + 90);
    setMinimumDay(localDay(today));
    setMaximumDay(localDay(last));
    setDay(localDay(tomorrow));
    setTime("15:30");
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setMasters(null);
    fetch("/api/public/remote-energy-support-masters?locale=" + locale + "&kind=reiki",
      { credentials: "omit", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("PUBLIC_REIKI_DIRECTORY_FAILED");
        return await response.json() as DirectoryPayload;
      })
      .then(payload => {
        if (!Array.isArray(payload?.masters)) throw new Error("INVALID_DIRECTORY");
        if (!controller.signal.aborted) setMasters(payload.masters.filter(approvedMaster));
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [locale, retry]);

  const matching = useMemo(() => {
    const seen = new Set<string>();
    return (masters || []).filter(master => {
      if (!priceFor(master, duration) || seen.has(master.slug)) return false;
      seen.add(master.slug);
      return true;
    }).slice(0, 3);
  }, [masters, duration]);

  const preferredAt = day && time ? new Date(day + "T" + time + ":00").getTime() : NaN;
  const validTime = Boolean(minimumDay && day >= minimumDay && day <= maximumDay &&
    Number.isFinite(preferredAt) && preferredAt > Date.now() + 5 * 60 * 1000 &&
    preferredAt <= Date.now() + 90 * 24 * 60 * 60 * 1000);

  const displayPrice = (master: EnergySupportMaster) => {
    const found = priceFor(master, duration);
    if (!found) return "";
    if (found.amount === 0) return t.free;
    const amount = new Intl.NumberFormat(locale, {
      style: "currency", currency: found.currency, maximumFractionDigits: 2,
    }).format(found.amount);
    return (found.from ? t.from + " " : "") + amount;
  };

  return (
    <section className={styles.root} data-assist-reiki-session lang={locale} aria-labelledby="assist-reiki-title">
      <div className={styles.hero}>
        <span className={styles.overline}><HandHeart size={15} aria-hidden="true"/>{t.overline}</span>
        <h2 id="assist-reiki-title">{t.title}</h2>
        <p>{t.intro}</p>
      </div>
      <div className={styles.settings} aria-label={t.duration}>
        <div className={styles.dateRow}>
          <label className={styles.field}>
            <span><CalendarDays size={18} aria-hidden="true"/>{t.date}</span>
            <input type="date" value={day} min={minimumDay} max={maximumDay}
              onChange={event => setDay(event.target.value)} aria-label={t.date} />
          </label>
          <label className={styles.field}>
            <span><Clock3 size={18} aria-hidden="true"/>{t.time}</span>
            <input type="time" value={time} step={300}
              onChange={event => setTime(event.target.value)} aria-label={t.time} />
          </label>
        </div>
        <div className={styles.durationLabel}><Hourglass size={18} aria-hidden="true"/>{t.duration}</div>
        <div className={styles.durations} role="group" aria-label={t.duration}>
          {durations.map(value => <button type="button" key={value} aria-pressed={duration === value}
            className={duration === value ? styles.active : undefined}
            onClick={() => setDuration(value)}>{value} {t.minute}</button>)}
        </div>
        <p className={styles.timezone}>{timezone ? timezone.replaceAll("_", " ") + " · " : ""}{t.note}</p>
      </div>
      <h3 className={styles.subheading}>{t.choose}</h3>
      {failed ? <div className={styles.empty} role="status">
        <p>{t.unavailable}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)}>{t.retry}</button>
      </div> : masters === null ? <p className={styles.empty} role="status">{t.loading}</p> :
        matching.length === 0 ? <p className={styles.empty} role="status">{t.empty}</p> :
        <div className={styles.list}>
          {matching.map(master => <article className={styles.master} key={master.serviceId}
              data-assist-reiki-master={master.serviceId}>
            <div className={styles.portrait}>
              {master.photo ? <Image src={master.photo} alt={master.name} fill unoptimized sizes="110px" /> :
                <HandHeart size={34} aria-hidden="true"/>}
            </div>
            <div className={styles.masterInfo}>
              <small>{t.specialist}</small>
              <h4>{master.name}</h4>
              <p>{(master.description || master.bio || master.title || t.specialist).slice(0, 126)}</p>
              <div className={styles.bookingRow}>
                <strong>{displayPrice(master)}</strong>
                {validTime ? <Link href={bookingHref(locale, master, duration, day, time)}
                  prefetch={false} className={styles.order}>{t.order}<ArrowRight size={17} aria-hidden="true"/></Link> :
                  <button type="button" disabled className={styles.order}>{t.order}<ArrowRight size={17} aria-hidden="true"/></button>}
              </div>
            </div>
          </article>)}
        </div>}
      {!validTime && <p className={styles.invalid} role="status">{t.invalidTime}</p>}
      <Link className={styles.more} href={"/" + locale + "/holistic-support/mobile?view=healing"} prefetch={false}>
        <UsersRound size={21} aria-hidden="true"/>{t.more}<ArrowRight size={19} aria-hidden="true"/>
      </Link>
      <p className={styles.caution}>{t.caution}</p>
    </section>
  );
}
