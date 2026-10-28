"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ArrowRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight, HandHeart, ShieldCheck, Sparkles, TestTube2, UserRound, X } from "lucide-react";
import { RemoteEnergySupportBooking, type EnergySupportMaster } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-master-gallery.module.css";

type Kind = "masters" | "healing" | "consultation";
type ReikiFocus = "strength" | "love" | "purpose" | "balance";
const REIKI_FOCI: ReikiFocus[] = ["strength", "love", "purpose", "balance"];
// Only public methods returned by the existing practitioner directory are bookable.
// Unpublished practice tabs show an honest empty state, never a synthetic offer.
const REIKI_METHODS: Record<ReikiFocus, readonly string[]> = {
  strength: ["Kundalini Reiki"],
  love: ["Tantra Reiki"],
  purpose: ["Runic Reiki", "Rune Reiki", "Reiki Runes", "Tarot"],
  balance: ["Reiki Yggdrasil"],
};
type PublishedConsultation = {
  serviceId: string;
  title: string;
  practitionerName: string;
  description: string;
  areaKey: string;
  pricingMode: string;
  price: number | null;
  currency: string;
  href: string;
};
type DirectoryResponse = { masters?: EnergySupportMaster[]; consultations?: PublishedConsultation[] };
const words = {
  en: {
    masters: "Masters", healing: "Reiki support", consultation: "Test / session",
    verified: "Published practitioner", publicOffer: "Published service", online: "Online",
    method: "Method", allMethods: "All practices", price: "Price", allPrices: "All offers",
    freeOnly: "Free", paidOnly: "With a published price",
    galleryMasters: "Choose a master", galleryOffers: "Other consultations",
    reikiFocus: "Reiki support intention",
    reikiOptions: {
      strength: { label: "Strength support", method: "Kundalini Reiki" },
      love: { label: "Love support", method: "Tantra Reiki" },
      purpose: { label: "Purpose support", method: "Runic Reiki / Tarot" },
      balance: { label: "Balance support", method: "Reiki Yggdrasil" },
    },
    reikiUnavailable: "No published practitioner offer for this Reiki method yet. No session can be booked for it here.",
    reikiSeeAvailable: "See available Reiki methods",
    request: "Request this master", openOffer: "View service & request", details: "Profile",
    from: "Published options", quote: "Details confirmed before booking",
    exploreMasters: "All masters", exploreServices: "All services", tests: "Free self-tests",
    description: "Only approved, published practitioners and offers; this is not a booking or payment.",
    consultNote: "Choose an approved service, then continue through its secure enquiry.",
    loading: "Loading published offers…", unavailable: "The practitioner directory is temporarily unavailable.",
    empty: "No published matches for this filter.", retry: "Retry", reset: "Show all",
    prev: "Previous", next: "Next", close: "Close request", requestTitle: "Request support",
  },
  ru: {
    masters: "Мастера", healing: "Рейки поддержка", consultation: "Тест / сессия",
    verified: "Опубликованный мастер", publicOffer: "Опубликованная услуга", online: "Онлайн",
    method: "Метод", allMethods: "Все практики", price: "Цена", allPrices: "Все предложения",
    freeOnly: "Бесплатно", paidOnly: "С опубликованной ценой",
    galleryMasters: "Выбери мастера", galleryOffers: "Другие консультации",
    reikiFocus: "Цель Рейки поддержки",
    reikiOptions: {
      strength: { label: "Поддержка силы", method: "Кундалини Рейки" },
      love: { label: "Поддержка любви", method: "Тантра Рейки" },
      purpose: { label: "Поддержка цели", method: "Рейки рун / Таро" },
      balance: { label: "Поддержка баланса", method: "Рейки Иггдрасиль" },
    },
    reikiUnavailable: "Для выбранной практики пока нет опубликованного предложения. Запись и цена не подтверждены.",
    reikiSeeAvailable: "Доступные практики Рейки",
    request: "Запросить сессию", openOffer: "Подробнее и запросить", details: "Профиль",
    from: "Опубликованные варианты", quote: "Запись подтверждается отдельно",
    exploreMasters: "Все мастера", exploreServices: "Все услуги", tests: "Бесплатные тесты",
    description: "Только одобренные опубликованные мастера и предложения. Выбор не означает запись или оплату.",
    consultNote: "Выбери опубликованную услугу и перейди к защищённой заявке.",
    loading: "Загружаем опубликованные предложения…", unavailable: "Каталог мастеров сейчас недоступен.",
    empty: "По этому фильтру нет опубликованных предложений.", retry: "Повторить", reset: "Показать все",
    prev: "Назад", next: "Вперёд", close: "Закрыть заявку", requestTitle: "Запросить поддержку",
  },
  es: {
    masters: "Maestros", healing: "Apoyo Reiki", consultation: "Test / sesión",
    verified: "Profesional publicado", publicOffer: "Servicio publicado", online: "En línea",
    method: "Método", allMethods: "Todas las prácticas", price: "Precio", allPrices: "Todas",
    freeOnly: "Gratis", paidOnly: "Con precio publicado",
    galleryMasters: "Elige un profesional", galleryOffers: "Otras consultas",
    reikiFocus: "Objetivo del apoyo Reiki",
    reikiOptions: {
      strength: { label: "Apoyo a la fuerza", method: "Kundalini Reiki" },
      love: { label: "Apoyo al amor", method: "Tantra Reiki" },
      purpose: { label: "Apoyo a las metas", method: "Reiki rúnico / Tarot" },
      balance: { label: "Apoyo al equilibrio", method: "Reiki Yggdrasil" },
    },
    reikiUnavailable: "Todavía no hay una oferta publicada para esta práctica. No se puede reservar aquí.",
    reikiSeeAvailable: "Ver prácticas Reiki disponibles",
    request: "Solicitar una sesión", openOffer: "Ver servicio y solicitar", details: "Perfil",
    from: "Ofertas publicadas", quote: "La reserva se confirma aparte",
    exploreMasters: "Todos los profesionales", exploreServices: "Todos los servicios", tests: "Tests gratuitos",
    description: "Solo profesionales y servicios aprobados y publicados. Elegir no reserva ni paga.",
    consultNote: "Elige un servicio publicado y continúa con la solicitud segura.",
    loading: "Cargando ofertas publicadas…", unavailable: "El catálogo no está disponible ahora.",
    empty: "No hay ofertas publicadas para este filtro.", retry: "Reintentar", reset: "Mostrar todas",
    prev: "Anterior", next: "Siguiente", close: "Cerrar solicitud", requestTitle: "Solicitar apoyo",
  },
} as const;

function validMaster(value: unknown): value is EnergySupportMaster {
  return Boolean(value && typeof value === "object" &&
    "slug" in value && typeof value.slug === "string" &&
    "serviceId" in value && typeof value.serviceId === "string" &&
    "name" in value && typeof value.name === "string" &&
    "methods" in value && Array.isArray(value.methods) &&
    "priceOptions" in value && Array.isArray(value.priceOptions));
}
function validOffer(value: unknown, locale: PublicLocale): value is PublishedConsultation {
  if (!value || typeof value !== "object" || !("serviceId" in value) || !("title" in value) ||
      !("href" in value) || !("practitionerName" in value)) return false;
  const offer = value as PublishedConsultation;
  return typeof offer.serviceId === "string" && typeof offer.title === "string" &&
    typeof offer.practitionerName === "string" && typeof offer.href === "string" &&
    offer.href.startsWith("/" + locale + "/") && !offer.href.startsWith("//");
}
function publishedPrice(price: number, currency: string, locale: PublicLocale) {
  if (!Number.isFinite(price) || !/^[A-Z]{3}$/.test(currency)) return null;
  try { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(price); }
  catch { return null; }
}

export function HolisticSupportMasterGallery({ locale, kind }: {
  locale: PublicLocale; kind: Kind;
}) {
  const t = words[locale];
  const consultations = kind === "consultation";
  const [masters, setMasters] = useState<EnergySupportMaster[] | null>(null);
  const [offers, setOffers] = useState<PublishedConsultation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [method, setMethod] = useState("");
  const [reikiFocus, setReikiFocus] = useState<ReikiFocus>("love");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "published">("all");
  const [orderOpen, setOrderOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false); setMasters(null); setOffers(null); setSelectedId(null);
    const url = "/api/public/remote-energy-support-masters?locale=" + locale +
      (consultations ? "&kind=consultation" : "");
    fetch(url, { credentials: "omit", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("PUBLIC_DIRECTORY_UNAVAILABLE");
      return await response.json() as DirectoryResponse;
    }).then(data => {
      if (controller.signal.aborted) return;
      if (consultations) {
        if (!Array.isArray(data?.consultations)) throw new Error("INVALID_CONSULTATION_DIRECTORY");
        setOffers(data.consultations.filter(offer => validOffer(offer, locale)));
      } else {
        if (!Array.isArray(data?.masters)) throw new Error("INVALID_MASTER_DIRECTORY");
        setMasters(data.masters.filter(validMaster));
      }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [locale, consultations, attempt]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (orderOpen && !dialog.open) dialog.showModal();
    if (!orderOpen && dialog.open) dialog.close();
  }, [orderOpen]);

  const supportedMethods = kind === "healing" ? REIKI_METHODS[reikiFocus] : null;
  const offersMethod = (value: string) => !supportedMethods ||
    supportedMethods.some(name => name.toLowerCase() === value.toLowerCase());
  const methods = [...new Set((masters || []).flatMap(master => master.methods || [])
    .filter((value): value is string => Boolean(value) && offersMethod(value)))];
  const visibleMasters = (masters || []).filter(master =>
    (!method || master.methods.includes(method)) && master.methods.some(offersMethod));
  const visibleOffers = (offers || []).filter(offer => {
    if (priceFilter === "free") return offer.pricingMode === "free" || (offer.price === 0 && offer.pricingMode !== "contact");
    if (priceFilter === "published") return offer.pricingMode !== "contact" && offer.price !== null && Number.isFinite(offer.price);
    return true;
  });
  const entries = consultations ? visibleOffers : visibleMasters;
  const id = (entry: EnergySupportMaster | PublishedConsultation) => entry.serviceId;
  const selected = entries.find(entry => id(entry) === selectedId) || entries[0] || null;
  const selectedMaster = !consultations ? (selected as EnergySupportMaster | null) : null;
  const selectedOffer = consultations ? (selected as PublishedConsultation | null) : null;
  const index = selected ? entries.findIndex(entry => id(entry) === id(selected)) : 0;
  const select = (itemId: string) => { setSelectedId(itemId); };
  const step = (delta: number) => {
    if (!entries.length) return;
    select(id(entries[(index + delta + entries.length) % entries.length]));
  };
  const endSwipe = (event: TouchEvent<HTMLElement>) => {
    const origin = touchStart.current; touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch || entries.length < 2) return;
    const dx = touch.clientX - origin.x; const dy = touch.clientY - origin.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  };
  const label = consultations ? t.consultation : kind === "masters" ? t.masters : t.healing;
  const profileLink = selectedMaster && /^[a-z0-9-]+$/.test(selectedMaster.slug)
    ? "/" + locale + "/masters/" + selectedMaster.slug : "/" + locale + "/masters";
  const cheapest = selectedMaster?.priceOptions.filter(option =>
    Number.isFinite(option.price) && option.price > 0)
    .sort((a, b) => a.price - b.price)[0];
  const currentPrice = selectedOffer
    ? (selectedOffer.pricingMode === "free" || (selectedOffer.price === 0 && selectedOffer.pricingMode !== "contact")
      ? t.freeOnly
      : selectedOffer.pricingMode !== "contact" && selectedOffer.price !== null
        ? publishedPrice(selectedOffer.price, selectedOffer.currency, locale) : null)
    : cheapest && selectedMaster ? publishedPrice(cheapest.price, selectedMaster.currency, locale) : null;
  const displayPrice = currentPrice || t.quote;
  const ready = consultations ? offers !== null : masters !== null;

  return (
    <div className={styles.viewer} data-support-master-viewer data-support-directory-kind={kind}>
      {kind === "healing" && <div className={styles.reikiFocusBar} role="group"
        aria-label={t.reikiFocus} data-support-reiki-filters>
        {REIKI_FOCI.map(value => {
          const option = t.reikiOptions[value];
          return <button type="button" key={value} className={styles.reikiFocusButton}
            data-support-reiki-focus={value} aria-pressed={reikiFocus === value}
            aria-label={option.label + " · " + option.method}
            onClick={() => { setReikiFocus(value); setMethod(""); setSelectedId(null); setOrderOpen(false); }}>
            <strong>{option.label}</strong><small>{option.method}</small>
          </button>;
        })}
      </div>}
      {!ready ? <div className={styles.status} role={failed ? "alert" : "status"}>
        <p>{failed ? t.unavailable : t.loading}</p>
        {failed && <button type="button" onClick={() => setAttempt(n => n + 1)}>{t.retry}</button>}
        <Link href={"/" + locale + "/masters"}>{t.exploreMasters}<ArrowRight size={16} aria-hidden="true"/></Link>
      </div> : !selected ? <div className={styles.status} role="status">
        <p>{kind === "healing" ? t.reikiUnavailable : t.empty}</p>
        {kind === "healing" && <p className={styles.unavailableMethod} data-support-reiki-unavailable>
          {t.reikiOptions[reikiFocus].label} · {t.reikiOptions[reikiFocus].method}
        </p>}
        <button type="button" onClick={() => {
          setMethod(""); setPriceFilter("all"); setSelectedId(null);
          if (kind === "healing") setReikiFocus("love");
        }}>{kind === "healing" ? t.reikiSeeAvailable : t.reset}</button>
        <Link href={"/" + locale + (consultations ? "/services" : "/masters")}>{consultations ? t.exploreServices : t.exploreMasters}</Link>
      </div> : <>
        <section className={styles.hero} data-support-master-hero={id(selected)}
          aria-label={selectedMaster?.name || selectedOffer?.title}
          onTouchStart={event => { const touch=event.touches[0]; if(touch) touchStart.current={x:touch.clientX,y:touch.clientY}; }}
          onTouchEnd={endSwipe}>
          {selectedMaster?.photo && <div className={styles.photoStage} aria-hidden="true">
            <Image src={selectedMaster.photo} alt="" fill unoptimized
              sizes="(max-width: 640px) 65vw, 480px" className={styles.photo}/>
          </div>}
          <div className={styles.shade} aria-hidden="true"/>
          {!selectedMaster && <div className={styles.symbolArt} aria-hidden="true">
            {consultations ? <TestTube2 size={125} strokeWidth={0.9}/> : <UserRound size={120} strokeWidth={0.9}/>}
          </div>}
          <div className={styles.filters} role="group" aria-label={label}>
            <span className={styles.mode} data-support-master-mode>
              {consultations ? <TestTube2 size={17} aria-hidden="true"/> : <HandHeart size={17} aria-hidden="true"/>}{label}
            </span>
            {consultations ? <label className={styles.filter} data-support-offer-price-filter>
              <strong>{t.price}</strong>
              <small>{priceFilter === "free" ? t.freeOnly : priceFilter === "published" ? t.paidOnly : t.allPrices}</small>
              <select value={priceFilter} aria-label={t.price} onChange={e => { setPriceFilter(e.target.value as typeof priceFilter); setSelectedId(null); }}>
                <option value="all">{t.allPrices}</option>
                <option value="free">{t.freeOnly}</option>
                <option value="published">{t.paidOnly}</option>
              </select><ChevronDown size={14} aria-hidden="true"/>
            </label> : <label className={styles.filter} data-support-master-method-filter>
              <strong>{t.method}</strong>
              <small>{method || t.allMethods}</small>
              <select value={method} aria-label={t.method} onChange={e => { setMethod(e.target.value); setSelectedId(null); }}>
                <option value="">{t.allMethods}</option>
                {methods.map(value => <option key={value} value={value}>{value}</option>)}
              </select><ChevronDown size={14} aria-hidden="true"/>
            </label>}
            <span className={styles.staticFilter}><strong>{consultations ? t.verified : t.online}</strong>
              <small>{selectedOffer?.practitionerName || selectedMaster?.title || t.online}</small></span>
          </div>
          <div className={styles.copy}>
            <span className={styles.eyebrow}><ShieldCheck size={16} aria-hidden="true"/>
              {consultations ? t.publicOffer : t.verified}</span>
            <h2>{selectedOffer?.title || selectedMaster?.name}</h2>
            <p>{selectedOffer?.description || selectedMaster?.description || selectedMaster?.bio || t.description}</p>
            <span className={styles.price}>{displayPrice}</span>
          </div>
          {entries.length > 1 && <div className={styles.arrows} role="group" aria-label={consultations ? t.galleryOffers : t.galleryMasters}>
            <button type="button" onClick={() => step(-1)} aria-label={t.prev} data-support-master-prev><ChevronLeft size={22}/></button>
            <button type="button" onClick={() => step(1)} aria-label={t.next} data-support-master-next><ChevronRight size={22}/></button>
          </div>}
          <div className={styles.actions}>
            {selectedOffer ? <Link className={styles.primary} href={selectedOffer.href} data-support-offer-request>
              <BookOpen size={21} aria-hidden="true"/>{t.openOffer}<ArrowRight size={21} aria-hidden="true"/>
            </Link> : selectedMaster && cheapest ? <button type="button" className={styles.primary}
              data-support-master-request onClick={() => setOrderOpen(true)}>
              <HandHeart size={21} aria-hidden="true"/>{t.request}<ArrowRight size={21} aria-hidden="true"/>
            </button> : <Link href={profileLink} className={styles.primary}>{t.details}<ArrowRight size={21}/></Link>}
            {selectedMaster && <Link className={styles.secondary} href={profileLink}>{t.details}</Link>}
          </div>
        </section>
        <section className={styles.more} aria-label={consultations ? t.galleryOffers : t.galleryMasters}>
          <div className={styles.heading}>
            <h3>{consultations ? t.galleryOffers : t.galleryMasters}</h3>
            <Link href={"/" + locale + (consultations ? "/services" : "/masters")} prefetch={false}>
              {consultations ? t.exploreServices : t.exploreMasters}<ArrowRight size={17} aria-hidden="true"/>
            </Link>
          </div>
          <div className={styles.rail} role="group" data-support-master-rail>
            {entries.map(entry => {
              const master = !consultations ? entry as EnergySupportMaster : null;
              const offer = consultations ? entry as PublishedConsultation : null;
              return <button type="button" key={id(entry)}
                data-support-master-thumb={id(entry)} className={styles.thumb}
                aria-pressed={id(entry) === id(selected)}
                aria-label={offer?.title || master?.name} onClick={() => select(id(entry))}>
                {master?.photo ? <Image src={master.photo} alt="" fill unoptimized sizes="180px"/> :
                  <span className={styles.thumbFallback} aria-hidden="true"><Sparkles size={38}/></span>}
                <span className={styles.thumbTitle}>{offer?.title || master?.name}</span>
              </button>;
            })}
          </div>
          <p className={styles.note}>{consultations ? t.consultNote : t.description}</p>
          {consultations && <Link className={styles.tests} href={"/" + locale + "/personality-profiles"} prefetch={false}>
            <TestTube2 size={17} aria-hidden="true"/>{t.tests}<ArrowRight size={17} aria-hidden="true"/>
          </Link>}
        </section>
      </>}
      <dialog ref={dialogRef} className={styles.dialog}
        aria-labelledby="support-master-order-title" onClose={() => setOrderOpen(false)}>
        <div className={styles.dialogTop}>
          <h2 id="support-master-order-title">{t.requestTitle}</h2>
          <button type="button" onClick={() => setOrderOpen(false)} aria-label={t.close}><X size={22}/></button>
        </div>
        {orderOpen && selectedMaster && <RemoteEnergySupportBooking key={selectedMaster.serviceId}
          locale={locale} masters={[selectedMaster]} preferredPractitioner={selectedMaster.slug}
          mode="inline" selectedKind="energy" initialGoal="" />}
      </dialog>
    </div>
  );
}
