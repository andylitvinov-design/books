"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RemoteEnergySupportBooking, type EnergySupportMaster, type SupportRequestKind } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import { matchesHolisticEuroBudget, matchesHolisticGoal } from "@/lib/practitioners/holistic-search-budgets.js";
import styles from "./holistic-inline-support-order.module.css";

type RequestChoice = SupportRequestKind | "consultation";
type Budget = "any" | "free" | "20" | "100";
type ConsultationOffer = {
  serviceId: string; title: string; practitionerName: string; description: string;
  areaKey: string; price: number | null; currency: string; pricingMode: string; href: string;
};

const TOPICS = [
  { goal: "Work and money", id: "business" },
  { goal: "Connection and relationships", id: "relationships" },
  { goal: "Inner balance and calm", id: "wellbeing" },
] as const;

const copy = {
  en: {
    title: "Find personal support", catalogTitle: "Request this talisman", topic: "Theme", kind: "Service", budget: "Budget",
    themes: { business: "Business & money", relationships: "Relationships", wellbeing: "Energy & health" },
    kinds: { energy: "Energy support", talisman: "Talisman", consultation: "Consultation" },
    budgets: { any: "Any", free: "Free", "20": "Up to €20", "100": "Up to €100" },
    search: "Find options", loading: "Searching published offers…",
    failed: "The practitioner directory is temporarily unavailable.", retry: "Try again",
    close: "Close request", empty: "No published consultations match these choices.",
    clear: "Show all prices", explore: "Explore services", details: "Details & request",
    from: "From", onRequest: "Price on request", free: "Free",
    note: "Prices from published offers only · Enquiries are not bookings or payments.",
    currencyNote: "Euro budgets compare EUR prices only. Other currencies are shown under Any.",
    results: "Matching consultations",
  },
  ru: {
    title: "Подобрать поддержку", catalogTitle: "Заказать выбранный талисман", topic: "Тема", kind: "Услуга", budget: "Бюджет",
    themes: { business: "Бизнес и деньги", relationships: "Отношения", wellbeing: "Энергия и здоровье" },
    kinds: { energy: "Энергоподдержка", talisman: "Талисман", consultation: "Консультация" },
    budgets: { any: "Любой", free: "Бесплатно", "20": "До €20", "100": "До €100" },
    search: "Найти варианты", loading: "Ищем опубликованные предложения…",
    failed: "Каталог мастеров временно недоступен.", retry: "Повторить",
    close: "Закрыть форму", empty: "Опубликованных консультаций с такими параметрами пока нет.",
    clear: "Все цены", explore: "Посмотреть услуги", details: "Подробнее и запросить",
    from: "От", onRequest: "Цена по запросу", free: "Бесплатно",
    note: "Только опубликованные цены · Заявка ещё не запись и не оплата.",
    currencyNote: "Лимиты в евро действуют для цен в EUR. Другие валюты — в категории «Любой».",
    results: "Подходящие консультации",
  },
  es: {
    title: "Encontrar apoyo personal", catalogTitle: "Solicitar este talismán", topic: "Tema", kind: "Servicio", budget: "Presupuesto",
    themes: { business: "Negocios y dinero", relationships: "Relaciones", wellbeing: "Energía y salud" },
    kinds: { energy: "Apoyo energético", talisman: "Talismán", consultation: "Consulta" },
    budgets: { any: "Cualquiera", free: "Gratis", "20": "Hasta €20", "100": "Hasta €100" },
    search: "Buscar opciones", loading: "Buscando ofertas publicadas…",
    failed: "El directorio no está disponible por el momento.", retry: "Reintentar",
    close: "Cerrar formulario", empty: "No hay consultas publicadas con estas condiciones.",
    clear: "Todos los precios", explore: "Ver servicios", details: "Detalles y solicitud",
    from: "Desde", onRequest: "Precio a consultar", free: "Gratis",
    note: "Solo precios publicados · La solicitud no es reserva ni pago.",
    currencyNote: "Los límites en euros solo comparan precios EUR. Otras monedas se muestran en Cualquiera.",
    results: "Consultas disponibles",
  },
} as const;

export function HolisticInlineSupportOrder({ locale, kind, initialGoal, initialTalismanId = "", onKindChange, onClose }: {
  locale: PublicLocale;
  kind: SupportRequestKind;
  initialGoal: string;
  initialTalismanId?: string;
  onKindChange: (kind: SupportRequestKind) => void;
  onClose: () => void;
}) {
  // A selected catalog design already fixes the theme and service kind.
  // Do not make the buyer repeat the three-row search screen.
  const catalogMode = kind === "talisman" && Boolean(initialTalismanId);
  const [choice, setChoice] = useState<RequestChoice>(kind);
  const [topic, setTopic] = useState(initialGoal);
  const [budget, setBudget] = useState<Budget>("any");
  const [searched, setSearched] = useState(catalogMode);
  const [masters, setMasters] = useState<EnergySupportMaster[] | null>(null);
  const [consultations, setConsultations] = useState<ConsultationOffer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = copy[locale];

  useEffect(() => { setChoice(kind); setSearched(Boolean(initialTalismanId)); }, [kind, initialTalismanId]);
  useEffect(() => { setTopic(initialGoal); setSearched(Boolean(initialTalismanId)); }, [initialGoal, initialTalismanId]);

  useEffect(() => {
    if (!searched) return;
    const controller = new AbortController();
    setFailed(false);
    setMasters(null);
    setConsultations(null);
    const query = "/api/public/remote-energy-support-masters?locale=" + locale +
      (choice === "consultation" ? "&kind=consultation" : "");
    fetch(query, { credentials: "omit", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("PRACTITIONERS_UNAVAILABLE");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object") throw new Error("INVALID_DIRECTORY");
        if (choice === "consultation") {
          if (!("consultations" in data) || !Array.isArray(data.consultations)) throw new Error("INVALID_DIRECTORY");
          if (!controller.signal.aborted) setConsultations(data.consultations as ConsultationOffer[]);
        } else {
          if (!("masters" in data) || !Array.isArray(data.masters)) throw new Error("INVALID_DIRECTORY");
          if (!controller.signal.aborted) setMasters(data.masters as EnergySupportMaster[]);
        }
      }).catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [locale, searched, choice, attempt]);

  const visibleConsultations = (consultations || [])
    .filter(offer => matchesHolisticGoal(offer.areaKey, topic) &&
      matchesHolisticEuroBudget(offer.price, offer.currency, offer.pricingMode, budget))
    .slice(0, 16);

  return (
    <aside className={styles.panel} id="holistic-inline-order" data-holistic-inline-order={choice}
      aria-labelledby="holistic-inline-order-title">
      <div className={styles.heading}>
        <h3 id="holistic-inline-order-title" tabIndex={-1}>{catalogMode ? t.catalogTitle : t.title}</h3>
        <button type="button" onClick={onClose} aria-label={t.close} className={styles.close}>×</button>
      </div>
      {!catalogMode && <div className={styles.picker}>
        <div className={styles.choiceGroup} role="group" aria-label={t.topic}>
          <p className={styles.groupLabel}>{t.topic}</p>
          <div className={styles.threeColumns}>
            {TOPICS.map(item => <button type="button" key={item.id} data-support-theme={item.id}
              aria-pressed={topic === item.goal} onClick={() => { setTopic(item.goal); setSearched(false); }}>
              {t.themes[item.id]}
            </button>)}
          </div>
        </div>
        <div className={styles.choiceGroup} role="group" aria-label={t.kind}>
          <p className={styles.groupLabel}>{t.kind}</p>
          <div className={styles.threeColumns}>
            {(["energy", "talisman", "consultation"] as const).map(value =>
              <button type="button" key={value} data-support-choice={value}
                aria-pressed={choice === value} onClick={() => {
                  setChoice(value); setSearched(false);
                  if (value !== "consultation") onKindChange(value);
                }}>{t.kinds[value]}</button>)}
          </div>
        </div>
        <div className={styles.choiceGroup} role="group" aria-label={t.budget}>
          <p className={styles.groupLabel}>{t.budget}</p>
          <div className={styles.fourColumns}>
            {(["any", "free", "20", "100"] as const).map(value =>
              <button type="button" key={value} data-support-budget={value}
                aria-pressed={budget === value} onClick={() => { setBudget(value); setSearched(false); }}>
                {t.budgets[value]}</button>)}
          </div>
        </div>
        <button type="button" data-support-search className={styles.search}
          aria-controls="holistic-inline-results" aria-expanded={searched}
          onClick={() => setSearched(true)}>{t.search}<span aria-hidden="true">→</span></button>
        <p className={styles.note}>{t.note}</p>
      </div>}
      <div id="holistic-inline-results" className={styles.results} hidden={!searched}>
        {searched && !failed && masters === null && consultations === null &&
          <p className={styles.status} role="status">{t.loading}</p>}
        {searched && failed && <div className={styles.status} role="alert">
          <p>{t.failed}</p>
          <button className={styles.retry} type="button" onClick={() => setAttempt(n => n + 1)}>{t.retry}</button>
        </div>}
        {searched && choice !== "consultation" && masters && (
          <RemoteEnergySupportBooking key={choice + topic + budget} locale={locale} masters={masters}
            preferredPractitioner="" mode="inline" selectedKind={choice} initialGoal={topic}
            initialTalismanId={initialTalismanId} compactFinder priceBudget={budget} onClearBudget={() => setBudget("any")}/>
        )}
        {searched && choice === "consultation" && consultations && <>
          <h4 className={styles.resultTitle}>{t.results}</h4>
          {budget !== "any" && <p className={styles.currencyNote}>{t.currencyNote}</p>}
          {!visibleConsultations.length ? <div className={styles.empty} role="status">
            <p>{t.empty}</p>
            <button type="button" className={styles.retry} onClick={() => setBudget("any")}>
              {t.clear}
            </button>
            <Link href={"/" + locale + "/services"}>{t.explore}</Link>
          </div> : <div className={styles.offers}>
            {visibleConsultations.map(offer => <article key={offer.serviceId} className={styles.offer}>
              <span className={styles.offerPractitioner}>{offer.practitionerName}</span>
              <h5>{offer.title}</h5>
              <p>{offer.description}</p>
              <div className={styles.offerFooter}>
                <strong>{offer.pricingMode === "free" ||
                    (offer.pricingMode !== "contact" && offer.price === 0) ? t.free :
                  offer.price !== null && offer.pricingMode !== "contact" && /^[A-Z]{3}$/.test(offer.currency) ?
                    (offer.pricingMode === "from" ? t.from + " " : "") +
                    new Intl.NumberFormat(locale, { style: "currency", currency: offer.currency }).format(offer.price) :
                    t.onRequest}</strong>
                <Link href={offer.href} prefetch={false}>{t.details} →</Link>
              </div>
            </article>)}
          </div>}
        </>}
      </div>
    </aside>
  );
}
