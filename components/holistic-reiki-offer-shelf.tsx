"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, GraduationCap, HandHeart, ShieldCheck } from "lucide-react";
import { matchReikiVariants, matchesReikiEuroPrice } from "@/lib/practitioners/reiki-offer.mjs";
import type { PublicReikiAcademyOffer } from "@/lib/academy/reiki-public-offers.mjs";
import type { EnergySupportMaster } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-reiki-offer-shelf.module.css";

type Format = "session" | "initiation" | "course";
type Price = "all" | "free" | "low" | "mid" | "high" | "premium";
type Timing = "any" | "day" | "days" | "chosen";
type Report = "brief" | "text" | "voice";
type Role = "any" | "practitioner" | "master";

const words = {
  en: {
    heading: {session: "Reiki sessions", initiation: "Reiki initiations", course: "Reiki learning programmes"},
    subtitle: "Published service options and original Academy programmes",
    published: "Published practitioner service", academy: "Existing Academy programme",
    sessions: "Session", init: "Initiation", course: "Course",
    view: "Open programme", enquiry: "Request session", details: "View service",
    from: "Confirmed prices", free: "Free", unknownPrice: "Fee on request",
    minutes: "min", master: "Practitioner", practices: "Practices",
    report: "Report", deadline: "Timing", certificate: "Certificate", role: "Provider level",
    unknown: "To confirm", notIncluded: "Not included",
    reports: {brief: "Brief", text: "Written review", voice: "Voice review"},
    times: {day: "Within 24h", days: "Within 3 days", chosen: "Selected hour"},
    roles: {practitioner: "Practitioner", master: "Reiki master"},
    noOffers: "No published service matches these settings. Change the filters to see available options.",
    academyNote: "Academy pages already exist. Specific timing, personal report and certificates are not verified services; confirm them before ordering.",
    serviceNote: "Only approved published conditions are shown. A request does not confirm an appointment or payment.",
    selected: "Selected",
  },
  ru: {
    heading: {session: "Сессии Рейки", initiation: "Инициации Рейки", course: "Программы обучения"},
    subtitle: "Опубликованные услуги мастеров и действующие программы Академии",
    published: "Опубликованная услуга мастера", academy: "Программа Академии",
    sessions: "Сессия", init: "Инициация", course: "Курс",
    view: "Открыть программу", enquiry: "Запросить сессию", details: "Подробнее",
    from: "Опубликованные цены", free: "Бесплатно", unknownPrice: "Стоимость уточняется",
    minutes: "мин", master: "Мастер", practices: "Практики",
    report: "Отчёт", deadline: "Срок", certificate: "Сертификат", role: "Уровень мастера",
    unknown: "Уточняется", notIncluded: "Не предусмотрен",
    reports: {brief: "Краткий", text: "Текстовый разбор", voice: "Голосовой разбор"},
    times: {day: "В течение суток", days: "В течение 3 дней", chosen: "В выбранный час"},
    roles: {practitioner: "Практик", master: "Рейки-мастер"},
    noOffers: "По выбранным условиям опубликованных услуг нет. Измените фильтры, чтобы увидеть доступные варианты.",
    academyNote: "Это действующие страницы Академии. Сроки, личный отчёт и сертификат не подтверждены как включённые услуги — условия уточняются перед заказом.",
    serviceNote: "Показываются только подтверждённые опубликованные параметры. Заявка не означает запись или оплату.",
    selected: "Выбрано",
  },
  es: {
    heading: {session: "Sesiones Reiki", initiation: "Iniciaciones Reiki", course: "Programas de formación"},
    subtitle: "Servicios publicados y programas existentes de la Academia",
    published: "Servicio publicado", academy: "Programa de la Academia",
    sessions: "Sesión", init: "Iniciación", course: "Curso",
    view: "Abrir programa", enquiry: "Solicitar sesión", details: "Ver servicio",
    from: "Precios publicados", free: "Gratis", unknownPrice: "Precio por consultar",
    minutes: "min", master: "Profesional", practices: "Prácticas",
    report: "Informe", deadline: "Plazo", certificate: "Certificado", role: "Nivel profesional",
    unknown: "Por confirmar", notIncluded: "No incluido",
    reports: {brief: "Breve", text: "Informe escrito", voice: "Informe de voz"},
    times: {day: "En 24 horas", days: "En 3 días", chosen: "Hora elegida"},
    roles: {practitioner: "Practicante", master: "Maestro Reiki"},
    noOffers: "No hay servicios publicados que coincidan. Cambia los filtros.",
    academyNote: "Son programas existentes. Plazos, informes personales y certificados no están verificados; confírmalos antes de pedir.",
    serviceNote: "Solo se muestran condiciones publicadas. Solicitar no confirma reserva ni pago.",
    selected: "Seleccionado",
  },
} as const;

function formattedPrice(price: number, locale: PublicLocale, currency = "EUR") {
  if (!Number.isFinite(price) || !/^[A-Z]{3}$/.test(currency)) return null;
  return new Intl.NumberFormat(locale, {style:"currency",currency,maximumFractionDigits:2}).format(price);
}

export function HolisticReikiOfferShelf({
  locale, format, price, time, report, role, certificate,
  masters, academyOffers, allMasters, failed, loading, selectedId,
  onSelectMaster, onRequestMaster, onReset, onRetry,
}: {
  locale: PublicLocale;
  format: Format; price: Price; time: Timing; report: Report; role: Role; certificate: boolean;
  masters: EnergySupportMaster[]; academyOffers: PublicReikiAcademyOffer[];
  allMasters: EnergySupportMaster[];
  loading: boolean; failed: boolean; selectedId: string | null;
  onSelectMaster: (id: string) => void; onRequestMaster: (id: string) => void;
  onReset: () => void; onRetry: () => void;
}) {
  const t = words[locale];
  const owner = allMasters.find(item => item.slug === "andy-litvinov");
  const portrait = owner?.photo || "/images/holistic-house/andy-about.png";
  const ownerName = owner?.name || "Andy";
  return (
    <section id="support-reiki-offers" className={styles.shelf}
      aria-labelledby="support-reiki-offers-title" data-support-reiki-offer-shelf data-reiki-format={format}>
      <div className={styles.heading}>
        <div>
          <span className={styles.overline}><HandHeart size={14} aria-hidden="true"/>{t.subtitle}</span>
          <h3 id="support-reiki-offers-title">{t.heading[format]}</h3>
        </div>
        <span className={styles.count} data-support-reiki-offer-count>{masters.length + academyOffers.length}</span>
      </div>
      <div className={styles.cards} data-support-reiki-offer-cards>
        {masters.map(master => {
          const variants = master.reikiOffer
            ? matchReikiVariants(master.reikiOffer, {kind: format, price, time, report, role, certificate})
            : master.priceOptions
              .filter(option => matchesReikiEuroPrice(master.currency, price, option.price))
              .map(option => ({price: option.price, duration:option.duration,report:null,certificate:false}));
          const publishedPrices = variants.filter(option => typeof option.price === "number" && Number.isFinite(option.price));
          const displayPrices = [...new Set(publishedPrices.map(option =>
            formattedPrice(option.price, locale, master.reikiOffer?.currency || master.currency)))].filter(Boolean);
          const option = variants[0] || null;
          const roleText = master.reikiOffer?.role
            ? t.roles[master.reikiOffer.role as "practitioner" | "master"] : t.unknown;
          const reportText = option?.report ? t.reports[option.report as Report] : t.unknown;
          const timeText = master.reikiOffer?.timings?.length
            ? master.reikiOffer.timings.map(value => t.times[value as Exclude<Timing,"any">]).join(" · ")
            : t.unknown;
          const priced = displayPrices.length ? displayPrices.join(" / ") : t.unknownPrice;
          return (
            <article className={styles.card} key={master.serviceId} data-reiki-service-card={master.serviceId}>
              <button type="button" className={styles.photoButton} data-support-master-thumb={master.serviceId}
                aria-pressed={selectedId === master.serviceId} aria-label={master.serviceTitle || master.name}
                onClick={() => onSelectMaster(master.serviceId)}>
                <Image src={master.photo || portrait} alt={master.name} fill unoptimized sizes="(max-width:640px) 106px,160px"/>
              </button>
              <div className={styles.copy}>
                <span className={styles.source}><ShieldCheck size={13} aria-hidden="true"/>{t.published}</span>
                <h4>{master.serviceTitle || (format === "session" ? t.heading.session : t.heading[format])}</h4>
                <p>{master.description || master.bio}</p>
                <div className={styles.meta}>
                  <span><HandHeart size={13}/>{master.name} · {master.methods.join(", ")}</span>
                  {timeText !== t.unknown && <span><Clock3 size={13}/>{t.deadline}: {timeText}</span>}
                  {option?.report && <span>{t.report}: {reportText}</span>}
                  {format === "session" && master.reikiOffer?.role && <span>{t.role}: {roleText}</span>}
                  {format !== "session" && option?.certificate && <span>{t.certificate}: {t.selected}</span>}
                </div>
                <div className={styles.bottom}>
                  <strong className={styles.price}>{priced}</strong>
                  {master.reikiOffer && master.serviceHref ?
                    <Link className={styles.action} href={master.serviceHref} prefetch={false}>
                      {t.details}<ArrowRight size={16}/></Link> :
                    <button type="button" className={styles.action} onClick={() => onRequestMaster(master.serviceId)}>
                      {t.enquiry}<ArrowRight size={16}/></button>}
                </div>
              </div>
            </article>
          );
        })}
        {academyOffers.map(offer => (
          <article className={styles.card} key={offer.id} data-reiki-academy-offer={offer.id}>
            <div className={styles.photo}>
              <Image src={portrait} alt={ownerName} fill unoptimized sizes="(max-width:640px) 106px,160px"/>
              <span className={styles.photoMarker}><GraduationCap size={15}/></span>
            </div>
            <div className={styles.copy}>
              <span className={styles.source}><BookOpen size={13} aria-hidden="true"/>{t.academy}</span>
              <h4>{offer.title}</h4>
              <p>{offer.description}</p>
              <div className={styles.meta}>
                <span><HandHeart size={13}/>{ownerName} · {offer.method}</span>

              </div>
              <div className={styles.bottom}>
                <span className={styles.academyPrice} data-reiki-academy-prices={offer.id}>
                  {offer.priceOptions.map(option =>
                    <span key={option.id} className={styles.optionPrice}>
                      <small>{option.label}</small>
                      <strong>{option.amountEur === null ? t.unknownPrice :
                        option.amountEur === 0 ? t.free :
                        formattedPrice(option.amountEur, locale)}
                        {option.durationMinutes ? " / "+option.durationMinutes+" "+t.minutes : ""}</strong>
                    </span>)}
                </span>
                <Link href={offer.href} prefetch={false} className={styles.action} data-reiki-academy-cta={offer.id}>
                  {t.view}<ArrowRight size={16}/></Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {loading && format === "session" && <p className={styles.notice} role="status">…</p>}
      {failed && format === "session" && <button type="button" className={styles.retry} onClick={onRetry}>↻ {t.noOffers}</button>}
      {!loading && !failed && !masters.length && !academyOffers.length &&
        <div className={styles.empty} role="status" data-support-reiki-unavailable>
          <p>{t.noOffers}</p>
          <button type="button" onClick={onReset}>{locale === "ru" ? "Сбросить фильтры" :
            locale === "es" ? "Restablecer filtros" : "Reset filters"}</button>
        </div>}
      <p className={styles.notice}><CheckCircle2 size={15} aria-hidden="true"/>
        {format === "session" ? t.serviceNote : t.academyNote}</p>
    </section>
  );
}
