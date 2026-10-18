"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BookOpenText, ChevronDown, Compass, Flower2, HandHeart,
  HeartHandshake, Leaf, MessageCircle, Search, Send, ShoppingBag, SlidersHorizontal, Sparkles, Tag, UsersRound, Waves,
} from "lucide-react";
import type { PublicService } from "@/lib/practitioners/public-types";
import { ServiceFunnelImpression, TrackedServiceLink } from "@/components/service-funnel-tracking";
import { DISCOVERY_AREAS, rankDiscoveryServices, rankEditorialDiscovery, serviceMatchesDiscoveryFacets } from "@/lib/practitioners/discovery-intent.js";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { ServicesFreeRecommendations } from "@/components/services-free-recommendations";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import styles from "./services-smart-discovery.module.css";
import { DiscoverySectionTabs } from "@/components/discovery-section-tabs";

type Locale = "en" | "ru" | "es";
type Editorial = {id:string;title:string;promise:string;benefit?:string;details?:string;href:string;areaKey:string;label?:string;price?:string;free?:boolean;image?:string};
type AIResult = { serviceIds: string[]; mode: "ai" | "local" };

const COPY = {
  en: {
    kicker:"FIND YOUR WAY · HOLISTIC HOUSE",
    title:"Find the right support",
    description:"Describe your goal. Find related services and practitioners — free, with no sign-up.",
    placeholder:"e.g. stress, confidence, relationships or Reiki...",
    button:"Find my options",
    quickHints:[
      { label:"energy healing", query:"energy healing Reiki" },
      { label:"business analyses", query:"business analyses consulting" },
    ],
    freeOnlyLabel:"Free Services Only",
    examples:"You could try",
    exampleList:["I want more balance in my body and energy","I want support with stress and anxiety","I want clarity in my relationships","I want to explore business and money questions","I want to clarify my goals, life purpose and personal growth"],
    quickExamples:["Body & Energy","Stress & Anxiety","Relationships","Business & Money","Goals, Meaning & Growth"],
    mobilePrivacy:"✓ Free matching · No sign-up · Private by default. Please avoid sharing personal medical details.",
    privacy:"Private by default: this text is matched locally in your browser and isn't saved.",
    caution:"Please don't include names or sensitive medical details. This is service discovery, not a diagnosis or medical recommendation.",
    categories:"Explore by area",
    categoriesIntro:"Choose a direction if you'd rather browse than describe your situation.",
    noLive:"More services will appear here as practitioners are approved.",
    resultTitle:"Your options",
    freeResultTitle:"Free services",
    resultFor:"Your request",
    matchIntro:"Choose a service, view its details, or send a request.",
    freeMatchIntro:"Browse available free services and choose where to begin.",
    noDirect:"No services found for this topic yet. Try another area or a broader question.",
    online:"Online",
    free:"Free",
    contact:"Price on request",
    service:"Service",
    curated:"Services you can request",
    practitioner:"Practitioner",
    details:"Details",
    request:"Request",
    order:"Order",
    freeOrder:"Get free",
    less:"Less",
    fullPage:"Full service description",
    freeStart:"Open the free service",
    chooseChannel:"Where should we send your request?",
    sendNote:"Review and send the prepared message yourself. No booking or payment happens automatically.",
    duration:"Duration",
    minutes:"min",
    browse:"All practitioners",
    clear:"Reset",
    personal:"Prefer personal guidance?",
    personalAction:"Explore Andrey's personal services",
    categoryCount:"offers",
    localMatch:"Topic-based matching",
    aiMatch:"AI-enhanced matching",
    aiToggle:"Use an external AI model to refine my search",
    aiConsent:"This sends only the text above to the configured AI provider. Don't enter sensitive information.",
    waiting:"Finding options…",
    aiUnavailable:"AI couldn't refine this request. Local matching is shown instead.",
    matched:"Relevant topic",
    expand:"Why these suggestions?",
    help:"Matches are based on topic keywords and actual service descriptions; there is no medical assessment.",
  },
  ru: {
    kicker:"НАЙДИТЕ СВОЙ ПУТЬ · HOLISTIC HOUSE",
    title:"Подберите помощь под свой запрос",
    description:"Опишите свою цель. Мы покажем подходящие услуги и мастеров — бесплатно и без регистрации.",
    placeholder:"Например: стресс, уверенность, отношения или Рейки…",
    button:"Подобрать услуги",
    quickHints:[
      { label:"энергопрактики", query:"Рейки энергетическая поддержка" },
      { label:"бизнес-анализ", query:"бизнес анализ консалтинг" },
    ],
    freeOnlyLabel:"Только бесплатные услуги",
    examples:"Например",
    exampleList:["Хочу больше энергии и контакта с телом","Хочу справиться со стрессом и тревогой","Хочу разобраться в отношениях","Хочу разобраться с бизнесом и деньгами","Ищу ясность в целях, смыслах и саморазвитии"],
    quickExamples:["Тело и энергия","Стресс и тревога","Отношения","Бизнес и деньги","Цели, смыслы и развитие"],
    mobilePrivacy:"✓ Бесплатно · Без регистрации · Приватно по умолчанию. Не вводите личные медицинские данные.",
    privacy:"По умолчанию приватно: подбор выполняется в браузере, текст не сохраняется.",
    caution:"Не указывайте имена и чувствительные медицинские данные. Это поиск услуг, а не диагноз или медицинская рекомендация.",
    categories:"Выберите направление",
    categoriesIntro:"Можно просто выбрать сферу интереса без описания личной ситуации.",
    noLive:"Новые услуги появятся здесь после модерации мастеров.",
    resultTitle:"Ваши варианты",
    freeResultTitle:"Бесплатные услуги",
    resultFor:"Ваш запрос",
    matchIntro:"Выберите услугу, раскройте подробности или отправьте заявку.",
    freeMatchIntro:"Посмотрите доступные бесплатные услуги и выберите, с чего начать.",
    noDirect:"Пока нет услуг по этому запросу. Попробуйте другое направление или более общий вопрос.",
    online:"Онлайн",
    free:"Бесплатно",
    contact:"Стоимость по запросу",
    service:"Услуга",
    curated:"Услуги, которые можно заказать",
    practitioner:"Мастер",
    details:"Подробнее",
    request:"Оставить заявку",
    order:"Заказать",
    freeOrder:"Получить бесплатно",
    less:"Свернуть",
    fullPage:"Полное описание услуги",
    freeStart:"Открыть бесплатную услугу",
    chooseChannel:"Куда отправить вашу заявку?",
    sendNote:"Вы проверяете текст и отправляете его сами. Запись и оплата не происходят автоматически.",
    duration:"Длительность",
    minutes:"мин",
    browse:"Все мастера",
    clear:"Сбросить",
    personal:"Хотите личную консультацию?",
    personalAction:"Личные услуги Андрея",
    categoryCount:"предложений",
    localMatch:"Смысловой подбор",
    aiMatch:"Подбор с помощью ИИ",
    aiToggle:"Уточнить подбор внешней ИИ-моделью",
    aiConsent:"Текст выше будет отправлен подключённому ИИ-провайдеру. Не вводите личные медицинские сведения.",
    waiting:"Подбираем варианты…",
    aiUnavailable:"ИИ-подбор сейчас недоступен. Показаны варианты локального подбора.",
    matched:"Подходящее направление",
    expand:"Как мы подобрали?",
    help:"Система сопоставляет темы запроса и описания существующих услуг. Медицинских выводов не делает.",
  },
  es: {
    kicker:"ENCUENTRA TU CAMINO · HOLISTIC HOUSE",
    title:"Encuentra el apoyo que buscas",
    description:"Describe tu objetivo. Encuentra servicios y profesionales relacionados, gratis y sin registro.",
    placeholder:"Por ejemplo: estrés, confianza, relaciones o Reiki…",
    button:"Encontrar servicios",
    quickHints:[
      { label:"sanación energética", query:"sanación energética Reiki" },
      { label:"análisis empresarial", query:"análisis empresarial y consultoría" },
    ],
    freeOnlyLabel:"Solo servicios gratuitos",
    examples:"Por ejemplo",
    exampleList:["Quiero sentir más energía y conexión con mi cuerpo","Busco ayuda con el estrés y la ansiedad","Quiero entender mejor mis relaciones","Quiero explorar mi negocio y mi dinero","Quiero claridad en mis metas, propósito y desarrollo personal"],
    quickExamples:["Cuerpo y energía","Estrés y ansiedad","Relaciones","Negocios y dinero","Metas, sentido y desarrollo"],
    mobilePrivacy:"✓ Gratis · Sin registro · Privado por defecto. Evita compartir datos médicos personales.",
    privacy:"Privado por defecto: la búsqueda se realiza en tu navegador y no se guarda.",
    caution:"No incluyas nombres ni datos médicos sensibles. No es un diagnóstico ni una recomendación médica.",
    categories:"Explorar categorías",
    categoriesIntro:"También puedes seleccionar un área sin describir tu situación.",
    noLive:"Aparecerán más servicios cuando se aprueben nuevos profesionales.",
    resultTitle:"Tus opciones",
    freeResultTitle:"Servicios gratuitos",
    resultFor:"Tu búsqueda",
    matchIntro:"Elige un servicio, abre los detalles o envía una solicitud.",
    freeMatchIntro:"Explora los servicios gratuitos disponibles y elige cómo empezar.",
    noDirect:"Aún no hay servicios para este tema. Prueba otra categoría o una pregunta más amplia.",
    online:"En línea",
    free:"Gratis",
    contact:"Precio a consultar",
    service:"Servicio",
    curated:"Servicios disponibles para solicitar",
    practitioner:"Profesional",
    details:"Ver detalles",
    request:"Solicitar",
    order:"Solicitar",
    freeOrder:"Solicitar gratis",
    less:"Cerrar",
    fullPage:"Descripción completa del servicio",
    freeStart:"Abrir el servicio gratuito",
    chooseChannel:"¿Dónde quieres enviar la solicitud?",
    sendNote:"Revisa y envía el mensaje tú mismo. No se confirma ninguna reserva ni se realiza ningún pago automáticamente.",
    duration:"Duración",
    minutes:"min",
    browse:"Profesionales",
    clear:"Limpiar",
    personal:"¿Prefieres orientación personal?",
    personalAction:"Servicios personales de Andrey",
    categoryCount:"opciones",
    localMatch:"Búsqueda temática",
    aiMatch:"Búsqueda con IA",
    aiToggle:"Mejorar la búsqueda con un modelo de IA externo",
    aiConsent:"Solo el texto anterior se enviará al proveedor de IA configurado. No incluyas datos médicos sensibles.",
    waiting:"Buscando opciones…",
    aiUnavailable:"La IA no está disponible; te mostramos la búsqueda local.",
    matched:"Área relacionada",
    expand:"¿Cómo se seleccionaron?",
    help:"La búsqueda compara tus palabras con los servicios publicados; no realiza evaluaciones médicas.",
  },
} as const;

const ICONS = [Compass, Flower2, HandHeart, HeartHandshake, Waves, Leaf, BookOpenText, UsersRound];

// Existing service photos are preferred, with category-specific fallbacks.
const FALLBACK_SERVICE_PHOTOS: Record<string,string> = {
  personal_development:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  energy_spiritual:"/academy/reiki-yggdrasil/source/basic-program.jpg",
  emotional_psychological:"/images/holistic-house/hero-olive-incense.webp",
  relationships:"/images/holistic-house/video-posters/constellations-en-v1.webp",
  body_somatic:"/images/holistic-house/hero-olive-incense.webp",
  homeopathy_holistic:"/images/holistic-house/distance-homeopathy.webp",
  career_purpose:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  business_money:"/images/holistic-house/video-posters/constellations-en-v1.webp",
};
function servicePhoto(path:string|undefined,areaKey:string) {
  const selected=path?.trim();
  if (selected && (selected.startsWith("https://") || selected.startsWith("http://") || (selected.startsWith("/") && !selected.startsWith("//")))) return selected;
  return FALLBACK_SERVICE_PHOTOS[areaKey] || "/images/holistic-house/hero-olive-incense.webp";
}

function formatPrice(service: PublicService, locale: Locale, t: typeof COPY[Locale]) {
  if (service.pricingMode === "free" || (service.pricingMode !== "contact" && service.confirmedPrice === 0)) return t.free;
  if (service.pricingMode === "contact" || service.confirmedPrice == null) return t.contact;
  try {
    const amount = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA", {
      currency: service.currency || "CAD", style: "currency", maximumFractionDigits: 2,
    }).format(service.confirmedPrice);
    return service.pricingMode === "from" ? (locale === "ru" ? "от " : locale === "es" ? "desde " : "from ") + amount : amount;
  } catch { return t.contact; }
}

function editorialEnquiryUrl(item: Editorial, locale: Locale) {
  // Do not include a visitor's free-text search or any private data in
  // messenger URLs. Only use the confirmed public service name and page.
  const request = item.free
    ? {en:"I would like to request this free service. Please explain how to begin.",
       ru:"Хочу получить эту бесплатную услугу. Подскажите, как начать.",
       es:"Quisiera solicitar este servicio gratuito. ¿Cómo puedo comenzar?"}[locale]
    : {en:"I would like to order this service. Please confirm the format, availability and price before booking.",
       ru:"Хочу заказать эту услугу. Подскажите формат, доступное время и стоимость до записи.",
       es:"Quisiera solicitar este servicio. Confirma el formato, disponibilidad y precio antes de reservar."}[locale];
  return whatsappEnquiryUrl({locale, service:item.title, request, option:item.label, pagePath:item.href});
}

export function ServicesSmartDiscovery({
  locale: givenLocale, services, editorialOffers, aiAvailable = false,
}: {
  locale: string; services: PublicService[]; editorialOffers: Editorial[]; aiAvailable?: boolean;
}) {
  const locale: Locale = givenLocale === "ru" || givenLocale === "es" ? givenLocale : "en";
  const t = COPY[locale];
  const [query,setQuery] = useState("");
  const [submitted,setSubmitted] = useState("");
  const [activeCategory,setActiveCategory] = useState("");
  const [format,setFormat] = useState("online");
  const [city,setCity] = useState("toronto");
  const [language,setLanguage] = useState<Locale | "">(locale);
  const [budget,setBudget] = useState("");
  const [hasSelection,setHasSelection] = useState(false);
  const [useExternalAi,setUseExternalAi] = useState(false);
  const [aiOrder,setAiOrder] = useState<string[]|null>(null);
  const [aiStatus,setAiStatus] = useState<"local"|"ai"|"unavailable"|"loading">("local");
  const [expandedCard,setExpandedCard] = useState<string|null>(null);
  const [orderingCard,setOrderingCard] = useState<string|null>(null);
  const requestNumber = useRef(0);
  const searchInputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const orderPanelRef = useRef<HTMLDivElement>(null);
  const [scrollRequest, setScrollRequest] = useState(0);

  // These constraints apply to both locally-ranked and AI-ranked published services.
  const eligible=useCallback((service:PublicService)=>serviceMatchesDiscoveryFacets(service,{
    format,city,language,price:budget,
  }),[format,city,language,budget]);
  const listed = useMemo(() => rankDiscoveryServices(submitted,services.filter(eligible),{category:activeCategory,limit:budget==="free"?10:4,includeAllAreas:budget==="free"}),[submitted,services,activeCategory,eligible,budget]);
  const suggestions = useMemo(() => {
    if (!aiOrder?.length) return listed;
    // The model is permitted to select ONLY existing published service IDs.
    // Its choices can differ from the lexical shortlist, so do not reduce
    // AI results to merely reshuffling that shortlist.
    const fromAi = aiOrder.flatMap((id) => {
      const service = services.find((item) => item.id === id && item.practitionerSlug && item.slug && item.copy?.title);
      return service && eligible(service) ? [{ service, areaKey: service.areaKey, score: 50, reasonKey: "explore" }] : [];
    });
    const chosen = new Set(fromAi.map((entry) => entry.service.id));
    return [...fromAi, ...listed.filter((entry) => !chosen.has(entry.service.id))].slice(0,budget==="free"?10:4);
  },[listed,aiOrder,services,eligible,budget]);
  const editorial = useMemo(() => {
    // Editorial cards have no validated physical city or numeric price data.
    // Preserve the default online suggestions, and only narrow to known free offers.
    if (format==="in_person" || (language && language!==locale) || (budget && budget!=="free")) return [];
    const offers=budget==="free" ? editorialOffers.filter(item=>item.free) : editorialOffers;
    return rankEditorialDiscovery(submitted,offers,{category:activeCategory,limit:budget==="free"?10:suggestions.length?2:4});
  },[submitted,editorialOffers,activeCategory,suggestions.length,format,language,locale,budget]);

  // Scroll only after a new selection has rendered. AI updates should not
  // unexpectedly pull the visitor back to the results while they read.
  useEffect(() => {
    if (!hasSelection || scrollRequest === 0) return;
    const frame = window.requestAnimationFrame(() => {
      const target = resultsRef.current;
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasSelection, scrollRequest]);

  // Keep the revealed messenger choices visible above the fixed phone tab bar.
  useEffect(() => {
    if (!orderingCard) return;
    const frame = window.requestAnimationFrame(() => {
      orderPanelRef.current?.scrollIntoView({
        block:"nearest",
        behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [orderingCard]);

  function chooseCategory(key: string) {
    requestNumber.current += 1;
    const selecting = key !== activeCategory;
    setActiveCategory(selecting ? key : "");
    setSubmitted("");
    setHasSelection(selecting);
    if (selecting) setScrollRequest((count) => count + 1);
    setAiOrder(null);
    setAiStatus("local");
    setExpandedCard(null);
    setOrderingCard(null);
  }

  async function find(queryText: string) {
    const nonce = ++requestNumber.current;
    const text = queryText.trim().slice(0,350);
    if (!text && budget !== "free") return;
    searchInputRef.current?.blur(); // Dismiss the mobile keyboard before navigating.
    setScrollRequest((count) => count + 1);
    setActiveCategory("");
    setSubmitted(text);
    setHasSelection(true);
    setExpandedCard(null);
    setOrderingCard(null);
    setAiOrder(null);
    setAiStatus("local");
    if (!text || !aiAvailable || !useExternalAi) return;
    setAiStatus("loading");
    try {
      const response=await fetch("/api/marketplace/intent-match",{
        method:"POST",credentials:"omit",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text,locale,consent:true}),
      });
      if (!response.ok) throw new Error("AI_UNAVAILABLE");
      const result: AIResult = await response.json();
      if (nonce !== requestNumber.current) return;
      if (result.mode !== "ai" || !Array.isArray(result.serviceIds)) throw new Error("AI_UNAVAILABLE");
      setAiOrder(result.serviceIds.slice(0,4));
      setAiStatus("ai");
    } catch {
      if (nonce === requestNumber.current) setAiStatus("unavailable");
    }
  }

  function runExample(text: string) { setQuery(text); void find(text); }

  const highlighted = submitted || activeCategory;
  const selectedArea = DISCOVERY_AREAS.find((area)=>area.key===activeCategory);

  return (
    <section className={styles.discovery} id="find-your-service" aria-labelledby="hh-service-discovery-title">
      <div className={styles.hero}>
        <div className={styles.topline}>
          <p className={styles.kicker}><Sparkles size={16} aria-hidden="true"/>{t.kicker}</p>
          <DiscoverySectionTabs locale={locale} active="services" />
        </div>
        <div className={styles.heroCopy}>
          <h2 id="hh-service-discovery-title">{t.title}</h2>
          <p className={styles.intro}>{t.description}</p>
        </div>
        <form className={styles.form} role="search" onSubmit={event=>{event.preventDefault();void find(query)}}>
          <label htmlFor="hh-service-free-text" className={styles.srOnly}>{t.title}</label>
          <textarea ref={searchInputRef} id="hh-service-free-text" value={query} maxLength={350} rows={2}
            placeholder={t.placeholder} onChange={event=>setQuery(event.target.value)}
            autoComplete="off" className={styles.textarea}/>
          <button type="submit" className={styles.submit} disabled={(!query.trim() && budget!=="free") || aiStatus==="loading"}>
            {aiStatus==="loading"?t.waiting:t.button}<Search size={19} aria-hidden="true"/>
          </button>
        </form>
        <div className={styles.quickHints} role="group" aria-label={
          locale==="ru"?"Подсказки для поиска":locale==="es"?"Búsquedas sugeridas":"Suggested searches"
        }>
          {t.quickHints.map(({label,query:hintQuery})=>(
            <button key={label} type="button" className={styles.quickHint} onClick={()=>runExample(hintQuery)}>
              <Tag size={15} strokeWidth={1.9} aria-hidden="true"/>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.categorySection} id="browse-service-categories" data-services-filter-below-search aria-labelledby="hh-service-category-title">
        <div className={styles.categoryHead}>
          <div className={styles.stepHeader}>
            <span className={styles.stepBadge} aria-hidden="true">1</span>
            <div>
              <h2 id="hh-service-category-title">{t.categories}</h2>
              <p>{t.categoriesIntro}</p>
            </div>
          </div>
          <Link href={"/"+locale+"/masters"} className={styles.allMasters}>{t.browse}<ArrowRight size={16} aria-hidden="true"/></Link>
        </div>
        <div className={styles.categoryGrid}>
          {DISCOVERY_AREAS.map((area,i)=>{
            const Icon=ICONS[i];
            const count=services.filter(s=>s.areaKey===area.key).length;
            const active=activeCategory===area.key;
            return <button type="button" key={area.key}
              className={active?styles.categoryActive:styles.category}
              aria-pressed={active} onClick={()=>chooseCategory(area.key)}>
              <span className={styles.categoryIcon}><Icon size={21} strokeWidth={1.75} aria-hidden="true"/></span>
              <span className={styles.categoryName}>{area.label[locale]}</span>
              {count>0
                ? <small className={styles.categoryCount} aria-label={`${count} ${t.categoryCount}`}>{count}</small>
                : <ArrowRight className={styles.categoryArrow} size={15} aria-hidden="true" />}
            </button>;
          })}
        </div>
        <div className={styles.filterControls}>
        <label className={styles.freeOnlyToggle}>
          <input
            type="checkbox"
            data-free-services-only
            checked={budget === "free"}
            onChange={event => {
              requestNumber.current += 1;
              setBudget(event.target.checked ? "free" : "");
              setAiOrder(null);
              setAiStatus("local");
            }}
          />
          <span>{t.freeOnlyLabel}</span>
        </label>
          <details className={styles.extraFilters} data-services-extra-filters>
            <summary>
              <span className={styles.extraIcon}><SlidersHorizontal size={19} aria-hidden="true"/></span>
              <span className={styles.extraLabel}><strong>{locale==="ru"?"Дополнительные фильтры":locale==="es"?"Filtros adicionales":"Additional filters"}</strong><small>{locale==="ru"?"Формат, цена и язык":locale==="es"?"Modalidad, precio e idioma":"Format, price and language"}</small></span>
              <ChevronDown className={styles.extraChevron} size={19} aria-hidden="true"/>
            </summary>
            <div className={styles.extraBody}>
        <div className={styles.quickFacets} role="group" aria-label={locale==="ru"?"Фильтры поиска":locale==="es"?"Filtros de búsqueda":"Search filters"}>
          <label>
            <span>{locale==="ru"?"Формат":locale==="es"?"Modalidad":"Format"}</span>
            <select className={styles.facetFormat} value={format} onChange={e=>{setFormat(e.target.value);setHasSelection(true)}}>
              <option value="online">{t.online}</option>
              <option value="in_person">{locale==="ru"?"Очно":locale==="es"?"Presencial":"In person"}</option>
              <option value="">{locale==="ru"?"Любой":locale==="es"?"Cualquiera":"Any"}</option>
            </select>
          </label>
          {format==="in_person"&&<label>
            <span>{locale==="ru"?"Город":locale==="es"?"Ciudad":"City"}</span>
            <select className={styles.facetCity} value={city} onChange={e=>{setCity(e.target.value);setHasSelection(true)}}>
              <option value="toronto">Toronto</option>
              <option value="">{locale==="ru"?"Любой":locale==="es"?"Cualquiera":"Any"}</option>
            </select>
          </label>}
          <label>
            <span>{locale==="ru"?"Цена":locale==="es"?"Precio":"Price"}</span>
            <select className={styles.facetPrice} value={budget} onChange={e=>{setBudget(e.target.value);setHasSelection(true)}}>
              <option value="">{locale==="ru"?"Любая":locale==="es"?"Cualquiera":"Any"}</option>
              <option value="free">{t.free}</option>
              {[30,50,75,100,200].map(value=><option key={value} value={value}>≤ €{value}</option>)}
            </select>
          </label>
          <label>
            <span>{locale==="ru"?"Язык":locale==="es"?"Idioma":"Language"}</span>
            <select className={styles.facetLanguage} value={language} onChange={e=>{setLanguage(e.target.value as Locale | "");setHasSelection(true)}}>
              {["en","ru","es"].map(value=><option key={value} value={value}>{value.toUpperCase()}</option>)}
              <option value="">{locale==="ru"?"Любой":locale==="es"?"Cualquiera":"Any"}</option>
            </select>
          </label>
        </div>
        {aiAvailable&&<label className={styles.aiOption}>
          <input type="checkbox" checked={useExternalAi} onChange={event=>setUseExternalAi(event.target.checked)}/>
          <span>{t.aiToggle}<small>{t.aiConsent}</small></span>
        </label>}
            </div>
          </details>
        </div>
        <div className={styles.examples}>
          <span>{t.examples}:</span>
          {t.exampleList.map((text,index)=><button type="button" key={text} aria-label={text} onClick={()=>runExample(text)}>
            <span className={styles.exampleLong}>{text}</span>
            <span className={styles.exampleShort} aria-hidden="true">{t.quickExamples[index]}</span>
          </button>)}
        </div>
        <p className={styles.privacy}>
          <span className={styles.privacyFull}><span aria-hidden="true">◦</span> {t.privacy} {t.caution}</span>
          <span className={styles.privacyCompact}>{t.mobilePrivacy}</span>
        </p>
      </div>

      {hasSelection&&<div ref={resultsRef} tabIndex={-1} className={styles.results} id="service-discovery-results" aria-live="polite" aria-labelledby="hh-service-discovery-results-title">
        <div className={styles.resultHeader}>
          <div>
            <p className={styles.eyebrow}><Sparkles size={13} aria-hidden="true"/> {aiStatus==="ai"?t.aiMatch:t.localMatch}</p>
            <h2 id="hh-service-discovery-results-title">{budget==="free"?t.freeResultTitle:t.resultTitle}</h2>
            <p>{budget==="free"?t.freeMatchIntro:t.matchIntro}</p>
            {highlighted&&<p className={styles.requestContext}>{t.resultFor}: <strong>{submitted || selectedArea?.label[locale] || ""}</strong></p>}
          </div>
          <button type="button" className={styles.clear} onClick={()=>{requestNumber.current+=1;setHasSelection(false);setActiveCategory("");setSubmitted("");setAiOrder(null);setAiStatus("local");setExpandedCard(null);setOrderingCard(null);setFormat("online");setCity("toronto");setLanguage(locale);setBudget("")}}>{t.clear} ×</button>
        </div>
        {aiStatus==="unavailable"&&<p role="status" className={styles.message}>{t.aiUnavailable}</p>}
        {suggestions.length>0?<div className={styles.suggestionGrid}>
          {suggestions.map(({service,reasonKey})=>{
            const mainArea=DISCOVERY_AREAS.find(a=>a.key===service.areaKey);
            return <article className={styles.suggestion} key={service.id} data-service-funnel-card>
              <ServiceFunnelImpression serviceId={service.id}/>
              <div className={styles.servicePhoto}>
                <Image src={servicePhoto(service.imagePath,service.areaKey)} alt="" fill unoptimized loading="lazy" sizes="(max-width: 620px) 33vw, 185px" />
              </div>
              <div className={styles.suggestionTop}><span>{mainArea?.label[locale]||t.service}</span><strong>{formatPrice(service,locale,t)}</strong></div>
              <h3>{service.copy.title}</h3>
              <p className={styles.suggestionSummary}>{service.copy.shortDescription}</p>
              <p className={styles.practitioner}><span className={styles.practitionerPrefix}>{t.practitioner}: </span><Link href={"/"+locale+"/masters/"+service.practitionerSlug}>{service.practitionerName}</Link></p>
              <div className={styles.suggestionActions}>
                <button type="button" className={styles.suggestionDetailsToggle}
                  aria-expanded={expandedCard==="listing:"+service.id}
                  aria-controls={"hh-listing-details-"+service.id}
                  onClick={()=>setExpandedCard(current=>current==="listing:"+service.id?null:"listing:"+service.id)}>
                  {expandedCard==="listing:"+service.id?t.less:t.details}<ChevronDown size={15} aria-hidden="true"/>
                </button>
                <TrackedServiceLink serviceId={service.id} event="order" href={"/"+(locale==="es"?"en":locale)+"/app/consultations?service="+encodeURIComponent(service.id)} aria-label={locale==="es"?"Solicitar este servicio (formulario en inglés)":undefined}>{t.order}</TrackedServiceLink>
              </div>
              {locale==="es"&&<small className={styles.intakeNote}>El formulario de solicitud se abre en inglés; se conserva el servicio elegido.</small>}
              {reasonKey==="topic"&&<span className={styles.relevance}>{t.matched}</span>}
              <div id={"hh-listing-details-"+service.id} hidden={expandedCard!=="listing:"+service.id} className={styles.suggestionDetailPanel}>
                <p>{service.copy.description || service.copy.shortDescription}</p>
                {service.durationMinutes&&service.durationMinutes>0
                  ? <p className={styles.serviceFact}>{t.duration}: {service.durationMinutes} {t.minutes}</p>:null}
                <Link href={"/"+locale+"/services/"+service.practitionerSlug+"/"+service.slug}>{t.fullPage}<ArrowRight size={15} aria-hidden="true"/></Link>
              </div>
            </article>;
          })}
        </div>:editorial.length===0?<p className={styles.message}>{t.noDirect}</p>:null}
        {editorial.length>0&&<div className={styles.editorial}>
          <h3>{t.curated}</h3>
          <div className={styles.editorialList}>{editorial.map(item=>{
            const id = "editorial:"+item.id;
            const expanded = expandedCard===id;
            const ordering = orderingCard===id;
            const whatsappUrl = editorialEnquiryUrl(item,locale);
            const telegramUrl = telegramEnquiryUrlFromWhatsApp(whatsappUrl);
            return <article key={item.id} className={styles.editorialCard} data-discovery-editorial-offer={item.id} data-selected={ordering}>
              <div className={styles.servicePhoto}>
                <Image src={servicePhoto(item.image,item.areaKey)} alt="" fill unoptimized loading="lazy" sizes="(max-width: 620px) 33vw, 185px" />
              </div>
              <div className={styles.editorialCardMeta}>
                <span>{item.label || DISCOVERY_AREAS.find(area=>area.key===item.areaKey)?.label[locale] || t.service}</span>
                <strong>{item.price || (item.free?t.free:t.contact)}</strong>
              </div>
              <div className={styles.editorialCardCopy}>
                <h4>{item.title}</h4>
                <p>{item.promise}</p>
                <small>{t.practitioner}: Andrey Litvinov</small>
              </div>
              <div className={styles.editorialCardActions}>
                <button type="button" className={styles.editorialDetailsButton}
                  aria-expanded={expanded} aria-controls={"hh-details-"+item.id}
                  onClick={()=>setExpandedCard(current=>current===id?null:id)}>
                  {expanded?t.less:t.details}<ChevronDown size={15} aria-hidden="true"/>
                </button>
                <button type="button" className={styles.editorialOrderButton}
                  aria-expanded={ordering} aria-controls={"hh-order-"+item.id}
                  onClick={()=>setOrderingCard(current=>current===id?null:id)}>
                  <ShoppingBag size={15} aria-hidden="true"/>{item.free?t.freeOrder:t.order}
                </button>
              </div>
              <div id={"hh-details-"+item.id} className={styles.editorialDetailsPanel} hidden={!expanded}>
                <p>{item.details || item.benefit || item.promise}</p>
                {item.benefit && item.benefit!==item.details
                  ? <p className={styles.editorialBenefit}>{item.benefit}</p>:null}
                <Link href={item.href}>{t.fullPage}<ArrowRight size={16} aria-hidden="true"/></Link>
              </div>
              <div id={"hh-order-"+item.id} ref={ordering?orderPanelRef:undefined} className={styles.editorialOrderPanel} hidden={!ordering}>
                <strong>{t.chooseChannel}</strong>
                {item.free?<Link className={styles.editorialFreeStart} href={item.href}>
                  {t.freeStart}<ArrowRight size={17} aria-hidden="true"/>
                </Link>:null}
                <div className={styles.editorialChannels}>
                  <AcquisitionEventLink href={whatsappUrl} prefetch={false} target="_blank" rel="noopener noreferrer"
                    event="service_request_start" attributes={{"data-discovery-offer":item.id,"data-contact-channel":"whatsapp"}}
                    className={styles.editorialWhatsapp}><MessageCircle size={18} aria-hidden="true"/>WhatsApp</AcquisitionEventLink>
                  <AcquisitionEventLink href={telegramUrl} prefetch={false} target="_blank" rel="noopener noreferrer"
                    event="service_request_start" attributes={{"data-discovery-offer":item.id,"data-contact-channel":"telegram"}}
                    className={styles.editorialTelegram}><Send size={18} aria-hidden="true"/>Telegram</AcquisitionEventLink>
                </div>
                <small>{t.sendNote}</small>
              </div>
            </article>;
          })}</div>
        </div>}
        <details className={styles.why}><summary>{t.expand}<ChevronDown size={16} aria-hidden="true"/></summary><p>{t.help}</p></details>
      </div>}

      <ServicesFreeRecommendations locale={locale} />

      <div className={styles.personalDivider}>
        <span>{t.personal}</span><a href="#solutions">{t.personalAction}<ArrowRight size={16} aria-hidden="true"/></a>
      </div>
    </section>
  );
}
