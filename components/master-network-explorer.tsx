"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicPractitioner, PublicService } from "@/lib/practitioners/public-types";
import { ServiceFunnelImpression, TrackedServiceLink } from "@/components/service-funnel-tracking";
import { serviceMatchesGoal } from "@/lib/practitioners/discovery-intent.js";
import { getPublicServiceDetailHref } from "@/lib/practitioners/public-service-links.js";
import styles from "./master-network-explorer.module.css";

const AREAS = [
  ["personal_development", "Personal growth", "Личностный рост", "Crecimiento personal"],
  ["energy_spiritual", "Reiki & energywork", "Рейки и энергопрактики", "Reiki y energía"],
  ["relationships", "Relationships & constellations", "Отношения и расстановки", "Relaciones y constelaciones"],
  ["emotional_psychological", "Emotional wellbeing", "Эмоции и внутренняя опора", "Bienestar emocional"],
  ["body_somatic", "Body & somatic", "Тело и соматика", "Cuerpo y somática"],
  ["homeopathy_holistic", "Holistic & Wu Xing", "Холистический подход и У-Син", "Bienestar holístico"],
  ["career_purpose", "Career & purpose", "Призвание и карьера", "Vocación y carrera"],
  ["business_money", "Goals & business", "Цели и бизнес", "Metas y negocios"],
] as const;

// Five immediately visible topics; specific catalogue areas stay under More filters.
const MASTER_TOPICS = [
  { id: "body_energy", areas: ["body_somatic", "energy_spiritual", "homeopathy_holistic"], keywords: /reiki|energy|somatic|body/i, en: "Body & energy", ru: "Тело и энергия", es: "Cuerpo y energía" },
  { id: "stress_anxiety", areas: ["emotional_psychological"], keywords: /stress|anxiety|emotional|somatic/i, en: "Stress & anxiety", ru: "Стресс и тревога", es: "Estrés y ansiedad" },
  { id: "relationships", areas: ["relationships"], keywords: /relationship|constellation|family/i, en: "Relationships", ru: "Отношения", es: "Relaciones" },
  { id: "business_money", areas: ["business_money"], keywords: /business|career|money/i, en: "Business & money", ru: "Бизнес и деньги", es: "Negocios y dinero" },
  { id: "goals_purpose", areas: ["career_purpose", "personal_development"], keywords: /purpose|goal|growth|imagery|archetyp/i, en: "Goals & meaning", ru: "Цели и смыслы", es: "Metas y propósito" },
] as const;

const COPY = {
  en: {
    search: "Search services, topics or practitioners",
    mastersSearch: "Name, methods, services or city",
    filterTitle: "Find what fits you",
    all: "All areas",
    format: "Format",
    anyFormat: "Any format",
    online: "Online",
    inPerson: "In person",
    hybrid: "Online or in person",
    language: "Language",
    anyLanguage: "Any language",
    price: "Pricing",
    anyPrice: "Any price",
    free: "Free",
    paid: "With a price",
    contact: "Ask for a price",
    sort: "Sort",
    defaultSort: "Default order",
    az: "Name A–Z",
    shorter: "Shortest first",
    matches: "matching",
    services: "services",
    masters: "practitioners",
    clear: "Clear filters",
    noResults: "No matches yet. Try removing a filter or using a broader word.",
    details: "Service details",
    request: "Request service",
    requestFree: "Request free service",
    onRequest: "Price on request",
    from: "from",
    practitioner: "Practitioner",
    viewProfile: "View profile",
    viewService: "Explore service",
    credentials: "Credential checked",
    partner: "Holistic House Partner",
    formats: "Available formats",
  },
  ru: {
    search: "Название услуги, тема или имя мастера",
    mastersSearch: "Имя, метод, услуга или город",
    filterTitle: "Подберите подходящую услугу",
    all: "Все направления",
    format: "Формат",
    anyFormat: "Любой формат",
    online: "Онлайн",
    inPerson: "Очно",
    hybrid: "Онлайн или очно",
    language: "Язык",
    anyLanguage: "Любой язык",
    price: "Стоимость",
    anyPrice: "Любая стоимость",
    free: "Бесплатно",
    paid: "С указанной ценой",
    contact: "Цена по запросу",
    sort: "Сортировка",
    defaultSort: "По умолчанию",
    az: "По названию А–Я",
    shorter: "Сначала короткие",
    matches: "найдено",
    services: "услуг",
    masters: "мастеров",
    clear: "Сбросить фильтры",
    noResults: "По этим параметрам пока ничего нет. Попробуйте убрать один фильтр.",
    details: "Подробнее",
    request: "Запросить услугу",
    requestFree: "Запросить бесплатно",
    onRequest: "По запросу",
    from: "от",
    practitioner: "Мастер",
    viewProfile: "Профиль мастера",
    viewService: "Посмотреть услугу",
    credentials: "Документ проверен",
    partner: "Партнёр Holistic House",
    formats: "Форматы",
  },
  es: {
    search: "Servicio, tema o profesional",
    mastersSearch: "Nombre, método, servicio o ciudad",
    filterTitle: "Encuentra tu servicio",
    all: "Todas las áreas",
    format: "Modalidad",
    anyFormat: "Cualquier modalidad",
    online: "En línea",
    inPerson: "Presencial",
    hybrid: "En línea o presencial",
    language: "Idioma",
    anyLanguage: "Cualquier idioma",
    price: "Precio",
    anyPrice: "Cualquier precio",
    free: "Gratis",
    paid: "Precio indicado",
    contact: "Consultar precio",
    sort: "Ordenar",
    defaultSort: "Orden habitual",
    az: "Nombre A–Z",
    shorter: "Duración más corta",
    matches: "resultados",
    services: "servicios",
    masters: "profesionales",
    clear: "Limpiar filtros",
    noResults: "No hay resultados. Prueba a quitar algún filtro.",
    details: "Detalles",
    request: "Solicitar servicio",
    requestFree: "Solicitar gratis",
    onRequest: "Precio a consultar",
    from: "desde",
    practitioner: "Profesional",
    viewProfile: "Ver perfil",
    viewService: "Ver servicio",
    credentials: "Credencial verificada",
    partner: "Colaborador Holistic House",
    formats: "Modalidades",
  },
};

type Locale = keyof typeof COPY;
type PriceChoice = "all" | "free" | "paid" | "contact";
type FilterState = {
  query: string;
  area: string;
  format: string;
  language: string;
  pricing: PriceChoice;
  goal: string;
  method: string;
  maxPrice: string;
  currency: string;
  sort: string;
};

const INITIAL: FilterState = { query: "", area: "", format: "", language: "", pricing: "all", goal: "", method: "", maxPrice: "", currency: "EUR", sort: "default" };

const localized = (locale: string): Locale => (locale === "ru" || locale === "es" ? locale : "en");
const isFree = (service: PublicService) =>
  service.pricingMode === "free" || (service.pricingMode !== "contact" && service.confirmedPrice === 0);
const hasPrice = (service: PublicService) =>
  !isFree(service) && service.pricingMode !== "contact" && service.confirmedPrice != null;
const clean = (text: unknown) => String(text ?? "").toLocaleLowerCase().trim();

function areaName(id: string, locale: Locale) {
  const entry = AREAS.find((area) => area[0] === id);
  return entry ? entry[locale === "ru" ? 2 : locale === "es" ? 3 : 1] : id.replaceAll("_", " ");
}
function servicePrice(service: PublicService, locale: Locale) {
  const t = COPY[locale];
  if (isFree(service)) return t.free;
  if (!hasPrice(service)) return t.onRequest;
  const formatted = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA", {
    style: "currency",
    currency: service.currency || "CAD",
    maximumFractionDigits: 2,
  }).format(Number(service.confirmedPrice));
  return service.pricingMode === "from" ? t.from + " " + formatted : formatted;
}
function serviceMatches(service: PublicService, f: FilterState) {
  if (f.area && service.areaKey !== f.area) return false;
  if (f.format && service.deliveryFormat !== f.format && service.deliveryFormat !== "hybrid") return false;
  if (f.language && !service.languages?.some((lang) => clean(lang) === f.language)) return false;
  if (f.pricing === "free" && !isFree(service)) return false;
  if (f.pricing === "paid" && !hasPrice(service)) return false;
  if (f.pricing === "contact" && service.pricingMode !== "contact") return false;
  if (f.goal && !serviceMatchesGoal(service,f.goal)) return false;
  if (f.method && !(service.methods||[]).some(x=>clean(x)===f.method)) return false;
  if (f.maxPrice && (!hasPrice(service) || service.currency!==f.currency || Number(service.confirmedPrice)>Number(f.maxPrice))) return false;
  if (!f.query) return true;
  return clean([
    service.copy.title, service.copy.shortDescription, service.copy.description,
    service.practitionerName, service.professionalTitle, service.locationLabel,
    ...(service.goals||[]), ...(service.methods||[]), ...(service.benefits||[]),
    areaName(service.areaKey, "en"), areaName(service.areaKey, "ru"), areaName(service.areaKey, "es"),
  ].join(" ")).includes(clean(f.query));
}
function masterMatches(master: PublicPractitioner, f: FilterState) {
  const profile = master.profile || {};
  const allServices = master.services || [];
  if (f.query && !clean([
    profile.displayName, profile.name, profile.professionalTitle, profile.shortBio,
    profile.fullBio, profile.city, profile.country, ...(profile.methods || []),
    ...allServices.flatMap((service) => [service.copy.title, service.copy.shortDescription]),
  ].join(" ")).includes(clean(f.query))) return false;

  if (f.area) {
    const quickTopic = MASTER_TOPICS.find((topic) => topic.id === f.area);
    const areas: readonly string[] = quickTopic ? quickTopic.areas : [f.area];
    const hasMatchingArea = (profile.areas || []).some((area) => areas.includes(area)) ||
      allServices.some((service) => areas.includes(service.areaKey));
    const practitionerText = [
      ...(profile.methods || []), profile.professionalTitle, profile.shortBio,
      ...allServices.map((service) => service.copy.title),
    ].join(" ");
    if (!hasMatchingArea && !(quickTopic && quickTopic.keywords.test(practitionerText))) return false;
  }
  if (f.format && !(profile.formats || []).includes(f.format) &&
      !(f.format === "online" && (profile.formats || []).includes("online")) &&
      !allServices.some((s) => s.deliveryFormat === f.format || s.deliveryFormat === "hybrid")) return false;
  if (f.language && !(profile.languages || []).some((lang) => clean(lang) === f.language) &&
      !allServices.some((s) => s.languages?.some((lang) => clean(lang) === f.language))) return false;
  if (f.pricing !== "all" && !allServices.some((s) => serviceMatches(s, { ...INITIAL, pricing: f.pricing }))) return false;
  return true;
}

function Filters({
  locale, mode, state, setState, count, languages, methods,
}: {
  locale: Locale;
  mode: "masters" | "services";
  state: FilterState;
  setState: (next: FilterState) => void;
  count: number;
  languages: string[];
  methods: string[];
}) {
  const t = COPY[locale];
  const set = (field: keyof FilterState, value: string) => setState({ ...state, [field]: value });
  const active = state.query || state.area || state.format || state.language || state.pricing !== "all" || state.goal || state.method || state.maxPrice || state.sort !== "default";
  const detailedFilters = (
    <>
      <fieldset className={styles.categories}>
        <legend className={styles.legend}>{t.all}</legend>
        <button type="button" className={!state.area ? styles.selected : ""} aria-pressed={!state.area} onClick={() => set("area", "")}>{t.all}</button>
        {AREAS.map(([id]) => (
          <button type="button" key={id} className={state.area === id ? styles.selected : ""} aria-pressed={state.area === id} onClick={() => set("area", id)}>
            {areaName(id, locale)}
          </button>
        ))}
      </fieldset>
      <div className={styles.selectGrid}>
        <label>{t.format}
          <select value={state.format} onChange={(event) => set("format", event.target.value)}>
            <option value="">{t.anyFormat}</option>
            <option value="online">{t.online}</option>
            <option value="in_person">{t.inPerson}</option>
          </select>
        </label>
        <label>{t.language}
          <select value={state.language} onChange={(event) => set("language", event.target.value)}>
            <option value="">{t.anyLanguage}</option>
            {languages.map((code) => <option key={code} value={code}>{code.toUpperCase()}</option>)}
          </select>
        </label>
        <label>{t.price}
          <select value={state.pricing} onChange={(event) => set("pricing", event.target.value)}>
            <option value="all">{t.anyPrice}</option>
            <option value="free">{t.free}</option>
            <option value="paid">{t.paid}</option>
            <option value="contact">{t.contact}</option>
          </select>
        </label>
        <label>{t.sort}
          <select value={state.sort} onChange={(event) => set("sort", event.target.value)}>
            <option value="default">{t.defaultSort}</option>
            <option value="az">{t.az}</option>
            {mode === "services" ? <option value="shorter">{t.shorter}</option> : null}
          </select>
        </label>
      </div>
    </>
  );
  return (
    <section className={styles.filters} aria-label={t.filterTitle}>
      <div className={styles.heading}>
        <h2>{mode === "masters" ? (locale === "ru" ? "Выберите практика" : locale === "es" ? "Elige un profesional" : "Choose a practitioner") : t.filterTitle}</h2>
        <span className={styles.count} role="status" aria-live="polite">{count} {mode === "masters" && count === 1 ? (locale === "ru" ? "мастер" : locale === "es" ? "profesional" : "practitioner") : mode === "masters" ? t.masters : t.services}</span>
      </div>
      <div className={styles.searchRow} role="search">
        <label htmlFor={"master-finder-query-" + mode} className={styles.srOnly}>{mode === "masters" ? t.mastersSearch : t.search}</label>
        <input
          id={"master-finder-query-" + mode}
          type="search"
          className={styles.search}
          autoComplete="off"
          placeholder={mode === "masters" ? t.mastersSearch : t.search}
          value={state.query}
          onChange={(event) => set("query", event.target.value)}
        />
      </div>
      {mode === "masters" && (
        <div className={styles.masterQuickBar} role="group" aria-label={locale === "ru" ? "Основные направления" : locale === "es" ? "Temas principales" : "Main topics"}>
          <button type="button" className={!state.area ? styles.selected : ""} aria-pressed={!state.area} onClick={() => set("area", "")}>{t.all}</button>
          {MASTER_TOPICS.map((topic) => (
            <button key={topic.id} type="button" className={state.area === topic.id ? styles.selected : ""} aria-pressed={state.area === topic.id} onClick={() => set("area", topic.id)}>
              {topic[locale]}
            </button>
          ))}
        </div>
      )}
      {mode === "masters" ? (
        <details className={styles.masterExtra}>
          <summary>{locale === "ru" ? "Больше фильтров" : locale === "es" ? "Más filtros" : "More filters"} <span aria-hidden="true">⌄</span></summary>
          {detailedFilters}
        </details>
      ) : detailedFilters}
      {mode==="services"&&<details className={styles.advanced}><summary>{locale==="ru"?"Цель, метод и бюджет":locale==="es"?"Objetivo, método y presupuesto":"Goal, method & budget"}</summary>
        <div className={styles.selectGrid}>
          <label>{locale==="ru"?"Желаемая цель":"Desired goal"}
            <select value={state.goal} onChange={event=>set("goal",event.target.value)}>
              <option value="">{locale==="ru"?"Любая цель":"Any goal"}</option>
              {([["confidence","Уверенность","Confidence"],["relationships","Отношения","Relationships"],["relaxation","Расслабление","Relaxation"],["learning","Обучение","Learning"],["clarity","Ясность","Clarity"],["purpose","Предназначение","Purpose"],["energy","Энергия","Energy"],["self_awareness","Самопознание","Self-awareness"]] as const).map(([id,ru,en])=><option value={id} key={id}>{locale==="ru"?ru:en}</option>)}
            </select>
          </label>
          <label>{locale==="ru"?"Метод":"Method"}
            <select value={state.method} onChange={event=>set("method",event.target.value)}>
              <option value="">{locale==="ru"?"Любой":"Any"}</option>{methods.map(method=><option value={method} key={method}>{method}</option>)}
            </select>
          </label>
          <label>{locale==="ru"?"Бюджет до":"Budget up to"}
            <select value={state.maxPrice} onChange={event=>set("maxPrice",event.target.value)}>
              <option value="">{locale==="ru"?"Без лимита":"No limit"}</option>{[30,50,75,100,150,200,300].map(value=><option value={value} key={value}>{value}</option>)}
            </select>
          </label>
          <label>{locale==="ru"?"Валюта":"Currency"}<select value={state.currency} onChange={event=>set("currency",event.target.value)}>{["EUR","CAD","USD"].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        </div><small>{locale==="ru"?"Цены сравниваются только в одной валюте.":"Prices are compared in the selected currency only."}</small>
      </details>}
      {active ? <button type="button" className={styles.reset} onClick={() => setState(INITIAL)}>{t.clear} ×</button> : null}
    </section>
  );
}

function ServiceCard({
  service,
  locale,
  profileView = false,
}: {
  service: PublicService;
  locale: Locale;
  profileView?: boolean;
}) {
  const t = COPY[locale];
  const format = service.deliveryFormat === "in_person" ? t.inPerson :
    service.deliveryFormat === "hybrid" ? t.hybrid : t.online;
  const detailsHref = getPublicServiceDetailHref(locale, service.practitionerSlug, service.slug);
  const requestHref = service.slug === "remote-energy-support"
    ? "/" + locale + "/services/remote-energy-support?practitioner=" + encodeURIComponent(service.practitionerSlug)
    : "/" + locale + "/app/consultations?service=" + encodeURIComponent(service.id);
  const coverImage = service.photos?.[0] || service.imagePath;
  const requestText = profileView
    ? (isFree(service)
      ? locale === "ru" ? "Получить бесплатно" : locale === "es" ? "Solicitar gratis" : "Get free"
      : locale === "ru" ? "Заказать" : locale === "es" ? "Solicitar" : "Order")
    : (isFree(service) ? t.requestFree : t.request);

  return (
    <article className={profileView ? styles.serviceCard + " " + styles.profileServiceCard : styles.serviceCard}
      data-service-funnel-card>
      <ServiceFunnelImpression serviceId={service.id} />
      {coverImage ? (
        <Link href={detailsHref} className={styles.serviceCover}>
          <img src={coverImage} alt={service.copy.title} loading="lazy" />
        </Link>
      ) : profileView ? (
        <div className={styles.profileCoverFallback} aria-hidden="true"><span>✦</span></div>
      ) : null}
      <div className={styles.cardTop}>
        {!profileView && (
          <Link href={"/" + locale + "/masters/" + service.practitionerSlug} className={styles.masterLink}>
            {service.practitionerPhoto ? (
              <img className={styles.avatar} src={service.practitionerPhoto} alt="" loading="lazy" />
            ) : (
              <span className={styles.avatar} aria-hidden="true">
                {(service.practitionerName || "H").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span><small>{t.practitioner}</small><strong>{service.practitionerName}</strong></span>
          </Link>
        )}
        <span className={isFree(service) ? styles.freePrice : styles.price}>{servicePrice(service, locale)}</span>
      </div>
      <p className={styles.area}>{areaName(service.areaKey, locale)}</p>
      <h3>{service.copy.title}</h3>
      <p className={styles.description}>{service.copy.shortDescription}</p>
      <div className={styles.meta}>
        <span>{format}</span>
        {!profileView && service.locationLabel && service.deliveryFormat !== "online"
          ? <span>{service.locationLabel}</span> : null}
        {service.durationMinutes ? <span>{service.durationMinutes} min</span> : null}
      </div>
      <div className={styles.actions}>
        <Link className={styles.secondary} href={detailsHref}>{t.details}</Link>
        {!profileView && (
          <Link className={styles.secondary} href={detailsHref + "#reviews"}>
            {locale === "ru" ? "Отзывы" : locale === "es" ? "Opiniones" : "Reviews"} ★
          </Link>
        )}
        <TrackedServiceLink serviceId={service.id} event="order"
          className={styles.primary} href={requestHref}
          aria-label={requestText + ": " + service.copy.title}>
          {requestText}<span aria-hidden="true">→</span>
        </TrackedServiceLink>
      </div>
    </article>
  );
}

/** Reuse the exact Services marketplace card, with a tighter practitioner-profile presentation. */
export function PractitionerServicesGrid({ services, locale: pageLocale }: {
  services: PublicService[];
  locale: string;
}) {
  const locale = localized(pageLocale);
  return (
    <div className={styles.cardGrid + " " + styles.practitionerServicesGrid}>
      {services.map(service => (
        <ServiceCard key={service.id} service={service} locale={locale} profileView />
      ))}
    </div>
  );
}

export function MarketplaceServiceFinder({ services, locale: pageLocale }: { services: PublicService[]; locale: string }) {
  const locale = localized(pageLocale);
  const [state, setState] = useState<FilterState>(INITIAL);
  const languages = useMemo(() => [...new Set(services.flatMap((service) => service.languages || []).map(clean).filter(Boolean))].sort(), [services]);
  const methods = useMemo(()=>[...new Set(services.flatMap(s=>s.methods||[]).map(clean).filter(Boolean))].sort(),[services]);
  const visible = useMemo(() => {
    const list = services.filter((service) => serviceMatches(service, state));
    if (state.sort === "az") return list.sort((a, b) => a.copy.title.localeCompare(b.copy.title, pageLocale));
    if (state.sort === "shorter") return list.sort((a, b) => (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity));
    const areas = AREAS.map(([id])=>id);
    return list.sort((a,b)=>areas.indexOf(a.areaKey as typeof areas[number])-areas.indexOf(b.areaKey as typeof areas[number]));
  }, [services, state, pageLocale]);
  return (
    <div className={styles.explorer}>
      <Filters locale={locale} mode="services" state={state} setState={setState} count={visible.length} languages={languages} methods={methods} />
      {visible.length ? <div className={styles.cardGrid}>{visible.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}</div>
        : <p className={styles.empty} role="status">{COPY[locale].noResults}</p>}
    </div>
  );
}

export function MarketplaceMasterFinder({ practitioners, locale: pageLocale }: { practitioners: PublicPractitioner[]; locale: string }) {
  const locale = localized(pageLocale);
  const [state, setState] = useState<FilterState>(INITIAL);
  const languages = useMemo(() => [...new Set(practitioners.flatMap((p) => [
    ...(p.profile?.languages || []),
    ...(p.services || []).flatMap((s) => s.languages || []),
  ]).map(clean).filter(Boolean))].sort(), [practitioners]);
  const visible = useMemo(() => {
    const list = practitioners.filter((master) => masterMatches(master, state));
    if (state.sort === "az") return list.sort((a, b) => (a.profile?.displayName || "").localeCompare(b.profile?.displayName || "", pageLocale));
    return list;
  }, [practitioners, state, pageLocale]);
  const t = COPY[locale];
  return (
    <div className={practitioners.length === 1 ? `${styles.explorer} ${styles.singleMaster}` : styles.explorer}>
      <Filters locale={locale} mode="masters" state={state} setState={setState} count={visible.length} languages={languages} methods={[]} />
      {visible.length ? <div className={styles.cardGrid}>
        {visible.map((master) => {
          const profile = master.profile || {};
          const name = profile.displayName || profile.name || t.practitioner;
          const certified = master.credentials?.some((c) => c.public && c.verificationStatus === "verified" && (!c.expiresOn || c.expiresOn >= new Date().toISOString().slice(0, 10)));
          const canRequestEnergy = (master.services || []).some((service) => service.slug === "remote-energy-support" && service.areaKey === "energy_spiritual");
          return (
            <article className={`${styles.masterCard} ${styles.compactMaster}`} key={master.id}>
              <div className={styles.masterHeading}>
                {profile.photoPath ? <img src={profile.photoPath} width={78} height={78} alt={name} className={styles.portrait} loading="lazy" /> :
                  <div className={styles.portraitInitials} aria-hidden="true">{name.charAt(0).toUpperCase()}</div>}
                <div><p className={styles.area}>{[profile.city, profile.country].filter(Boolean).join(", ") || t.online}</p>
                  <h3>{name}</h3><p className={styles.role}>{profile.professionalTitle || ""}</p></div>
              </div>
              <p className={styles.description}>{profile.shortBio || ""}</p>
              <div className={styles.meta}>
                {(profile.languages || []).length ? <span>{profile.languages?.map((v) => v.toUpperCase()).join(" · ")}</span> : null}
                {certified ? <span>{t.credentials}</span> : null}
                {master.isPartner ? <span>{t.partner}</span> : null}
              </div>
              {(master.services || []).length ? <p className={styles.offerPreview}>{master.services.length} {t.services} · {master.services[0]?.copy?.title}</p> : null}
              <div className={styles.actions}>
                {!canRequestEnergy && (master.services || []).length ? <Link className={styles.secondary} href={getPublicServiceDetailHref(locale, master.slug, master.services[0].slug)}>{t.viewService}</Link> : null}
                <Link className={canRequestEnergy ? styles.secondary : styles.primary} href={"/" + locale + "/masters/" + master.slug}>{t.viewProfile}<span aria-hidden="true">→</span></Link>
                {canRequestEnergy ? <Link className={styles.energyButton} href={`/${locale}/services/remote-energy-support?practitioner=${encodeURIComponent(master.slug)}`}>{locale === "ru" ? "Заказать энергоподдержку" : locale === "es" ? "Solicitar apoyo energético" : "Request energy support"} <span aria-hidden="true">→</span></Link> : null}
              </div>
            </article>
          );
        })}
      </div> : <p className={styles.empty} role="status">{t.noResults}</p>}
    </div>
  );
}
