"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpenText, ChevronDown, Compass, Flower2, HandHeart,
  HeartHandshake, Leaf, Search, Sparkles, UsersRound, Waves,
} from "lucide-react";
import type { PublicService } from "@/lib/practitioners/public-types";
import { DISCOVERY_AREAS, rankDiscoveryServices, rankEditorialDiscovery } from "@/lib/practitioners/discovery-intent.js";
import styles from "./services-smart-discovery.module.css";

type Locale = "en" | "ru" | "es";
type Editorial = {id:string;title:string;promise:string;benefit?:string;href:string;areaKey:string;label?:string};
type AIResult = { serviceIds: string[]; mode: "ai" | "local" };

const COPY = {
  en: {
    kicker:"FIND YOUR WAY · HOLISTIC HOUSE",
    title:"What would you like help with?",
    description:"Tell us, in your own words, what you want to explore. We'll suggest relevant published services and practitioners — without a questionnaire or registration.",
    placeholder:"For example: I'd like to feel more confident, explore repeating patterns in relationships, or try Reiki...",
    button:"Find my options",
    examples:"You could try",
    exampleList:["I want more inner confidence","I'm curious about Reiki and energy practices","I'd like to explore family patterns","I want more clarity about my next step"],
    privacy:"Private by default: this text is matched locally in your browser and isn't saved.",
    caution:"Please don't include names or sensitive medical details. This is service discovery, not a diagnosis or medical recommendation.",
    categories:"Explore by area",
    categoriesIntro:"Choose a direction if you'd rather browse than describe your situation.",
    noLive:"More services will appear here as practitioners are approved.",
    resultTitle:"Some options worth exploring",
    resultFor:"Your request",
    matchIntro:"Suggestions from real available offers. Check each practitioner's methods, credentials and terms before booking.",
    noDirect:"There isn't a precise match in the currently published listings. Here are real pages you can explore.",
    online:"Online",
    free:"Free",
    contact:"Price on request",
    service:"Service",
    curated:"Holistic House service",
    practitioner:"Practitioner",
    details:"Explore service",
    request:"Request service",
    browse:"See all practitioners",
    clear:"Clear selection",
    personal:"Prefer personal guidance?",
    personalAction:"Explore Andrey's personal services below",
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
    title:"Что вы хотите изменить или исследовать?",
    description:"Напишите своими словами, какая помощь или практика вам нужна. Мы предложим подходящие опубликованные услуги и мастеров — без анкеты и обязательной регистрации.",
    placeholder:"Например: хочу обрести внутреннюю опору, разобраться с повторяющимися сценариями в отношениях или попробовать Рейки…",
    button:"Подобрать услуги",
    examples:"Например",
    exampleList:["Хочу больше внутренней уверенности","Интересуют Рейки и энергетические практики","Хочу исследовать семейные сценарии","Ищу направление и ясность в целях"],
    privacy:"По умолчанию приватно: подбор выполняется в браузере, текст не сохраняется.",
    caution:"Не указывайте имена и чувствительные медицинские данные. Это поиск услуг, а не диагноз или медицинская рекомендация.",
    categories:"Выберите направление",
    categoriesIntro:"Можно просто выбрать сферу интереса без описания личной ситуации.",
    noLive:"Новые услуги появятся здесь после модерации мастеров.",
    resultTitle:"Что может вам подойти",
    resultFor:"Ваш запрос",
    matchIntro:"Подбор только из реальных опубликованных предложений. Перед записью ознакомьтесь с методами, квалификацией и условиями.",
    noDirect:"Среди опубликованных услуг нет точного совпадения. Вот существующие страницы, которые можно изучить.",
    online:"Онлайн",
    free:"Бесплатно",
    contact:"Стоимость по запросу",
    service:"Услуга",
    curated:"Услуга Holistic House",
    practitioner:"Мастер",
    details:"Подробнее",
    request:"Отправить запрос",
    browse:"Посмотреть всех мастеров",
    clear:"Сбросить",
    personal:"Хотите личную консультацию?",
    personalAction:"Ниже — личные услуги Андрея",
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
    title:"¿Qué te gustaría explorar o cambiar?",
    description:"Describe con tus propias palabras qué ayuda buscas. Te mostraremos servicios publicados y profesionales relacionados, sin registro.",
    placeholder:"Por ejemplo: quiero tener más confianza, explorar patrones familiares o conocer Reiki…",
    button:"Encontrar servicios",
    examples:"Por ejemplo",
    exampleList:["Busco más confianza personal","Me interesa Reiki y el trabajo energético","Quiero explorar patrones familiares","Necesito claridad para una nueva etapa"],
    privacy:"Privado por defecto: la búsqueda se realiza en tu navegador y no se guarda.",
    caution:"No incluyas nombres ni datos médicos sensibles. No es un diagnóstico ni una recomendación médica.",
    categories:"Explorar categorías",
    categoriesIntro:"También puedes seleccionar un área sin describir tu situación.",
    noLive:"Aparecerán más servicios cuando se aprueben nuevos profesionales.",
    resultTitle:"Opciones para explorar",
    resultFor:"Tu búsqueda",
    matchIntro:"Opciones reales publicadas. Comprueba las credenciales y condiciones antes de reservar.",
    noDirect:"Todavía no hay una coincidencia precisa. Estas páginas de servicios ya existen.",
    online:"En línea",
    free:"Gratis",
    contact:"Precio a consultar",
    service:"Servicio",
    curated:"Servicio Holistic House",
    practitioner:"Profesional",
    details:"Ver detalles",
    request:"Solicitar servicio",
    browse:"Ver profesionales",
    clear:"Limpiar",
    personal:"¿Prefieres orientación personal?",
    personalAction:"Más abajo: servicios personales de Andrey",
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
  const [hasSelection,setHasSelection] = useState(false);
  const [useExternalAi,setUseExternalAi] = useState(false);
  const [aiOrder,setAiOrder] = useState<string[]|null>(null);
  const [aiStatus,setAiStatus] = useState<"local"|"ai"|"unavailable"|"loading">("local");
  const requestNumber = useRef(0);

  const listed = useMemo(() => rankDiscoveryServices(submitted,services,{category:activeCategory,limit:4}),[submitted,services,activeCategory]);
  const suggestions = useMemo(() => {
    if (!aiOrder?.length) return listed;
    // The model is permitted to select ONLY existing published service IDs.
    // Its choices can differ from the lexical shortlist, so do not reduce
    // AI results to merely reshuffling that shortlist.
    const fromAi = aiOrder.flatMap((id) => {
      const service = services.find((item) => item.id === id && item.practitionerSlug && item.slug && item.copy?.title);
      return service ? [{ service, areaKey: service.areaKey, score: 50, reasonKey: "explore" }] : [];
    });
    const chosen = new Set(fromAi.map((entry) => entry.service.id));
    return [...fromAi, ...listed.filter((entry) => !chosen.has(entry.service.id))].slice(0,4);
  },[listed,aiOrder,services]);
  const editorial = useMemo(
    () => rankEditorialDiscovery(submitted,editorialOffers,{category:activeCategory,limit:suggestions.length?2:4}),
    [submitted,editorialOffers,activeCategory,suggestions.length]
  );


  function chooseCategory(key: string) {
    requestNumber.current += 1;
    setActiveCategory(key === activeCategory ? "" : key);
    setSubmitted("");
    setHasSelection(key !== activeCategory);
    setAiOrder(null);
    setAiStatus("local");
  }

  async function find(queryText: string) {
    const nonce = ++requestNumber.current;
    const text = queryText.trim().slice(0,350);
    if (!text) return;
    setActiveCategory("");
    setSubmitted(text);
    setHasSelection(true);
    setAiOrder(null);
    setAiStatus("local");
    if (!aiAvailable || !useExternalAi) return;
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
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><Sparkles size={15} aria-hidden="true"/>{t.kicker}</p>
          <h2 id="hh-service-discovery-title">{t.title}</h2>
          <p className={styles.intro}>{t.description}</p>
        </div>
        <form className={styles.form} role="search" onSubmit={event=>{event.preventDefault();void find(query)}}>
          <label htmlFor="hh-service-free-text" className={styles.srOnly}>{t.title}</label>
          <textarea id="hh-service-free-text" value={query} maxLength={350} rows={2}
            placeholder={t.placeholder} onChange={event=>setQuery(event.target.value)}
            autoComplete="off" className={styles.textarea}/>
          <button type="submit" className={styles.submit} disabled={!query.trim() || aiStatus==="loading"}>
            {aiStatus==="loading"?t.waiting:t.button}<Search size={19} aria-hidden="true"/>
          </button>
        </form>
        <div className={styles.examples}>
          <span>{t.examples}:</span>
          {t.exampleList.map(text=><button type="button" key={text} onClick={()=>runExample(text)}>{text}</button>)}
        </div>
        {aiAvailable&&<label className={styles.aiOption}>
          <input type="checkbox" checked={useExternalAi} onChange={event=>setUseExternalAi(event.target.checked)}/>
          <span>{t.aiToggle}<small>{t.aiConsent}</small></span>
        </label>}
        <p className={styles.privacy}><span aria-hidden="true">◦</span> {t.privacy} {t.caution}</p>
      </div>

      <div className={styles.categorySection} id="browse-service-categories">
        <div className={styles.categoryHead}>
          <div><p className={styles.eyebrow}>{locale==="ru"?"НАПРАВЛЕНИЯ":locale==="es"?"ÁREAS":"AREAS"}</p>
            <h2>{t.categories}</h2><p>{t.categoriesIntro}</p></div>
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
              <span className={styles.categoryDescription}>{area.short[locale]}</span>
              {count>0?<small>{count} {t.categoryCount}</small>:<small aria-hidden="true">↗</small>}
            </button>;
          })}
        </div>
      </div>

      {hasSelection&&<div className={styles.results} id="service-discovery-results" aria-live="polite">
        <div className={styles.resultHeader}>
          <div>
            <p className={styles.eyebrow}><Sparkles size={13} aria-hidden="true"/> {aiStatus==="ai"?t.aiMatch:t.localMatch}</p>
            <h2>{t.resultTitle}</h2>
            <p>{t.matchIntro}</p>
            {highlighted&&<p className={styles.requestContext}>{t.resultFor}: <strong>{submitted || selectedArea?.label[locale] || ""}</strong></p>}
          </div>
          <button type="button" className={styles.clear} onClick={()=>{requestNumber.current+=1;setHasSelection(false);setActiveCategory("");setSubmitted("");setAiOrder(null);setAiStatus("local")}}>{t.clear} ×</button>
        </div>
        {aiStatus==="unavailable"&&<p role="status" className={styles.message}>{t.aiUnavailable}</p>}
        {suggestions.length>0?<div className={styles.suggestionGrid}>
          {suggestions.map(({service,reasonKey})=>{
            const mainArea=DISCOVERY_AREAS.find(a=>a.key===service.areaKey);
            return <article className={styles.suggestion} key={service.id}>
              <div className={styles.suggestionTop}><span>{mainArea?.label[locale]||t.service}</span><strong>{formatPrice(service,locale,t)}</strong></div>
              <h3>{service.copy.title}</h3>
              <p className={styles.suggestionSummary}>{service.copy.shortDescription}</p>
              <p className={styles.practitioner}>{t.practitioner}: <Link href={"/"+locale+"/masters/"+service.practitionerSlug}>{service.practitionerName}</Link></p>
              <div className={styles.suggestionActions}>
                <Link href={"/"+locale+"/services/"+service.practitionerSlug+"/"+service.slug}>{t.details}<ArrowRight size={15} aria-hidden="true"/></Link>
                <Link href={"/"+locale+"/app/consultations?service="+encodeURIComponent(service.id)}>{t.request}</Link>
              </div>
              {reasonKey==="topic"&&<span className={styles.relevance}>{t.matched}</span>}
            </article>;
          })}
        </div>:<p className={styles.message}>{t.noDirect}</p>}
        {editorial.length>0&&<div className={styles.editorial}>
          <h3>{t.curated}</h3>
          <div className={styles.editorialList}>{editorial.map(item=><Link key={item.id} href={item.href}>
            <span><strong>{item.title}</strong><small>{item.promise}</small></span><ArrowRight size={17} aria-hidden="true"/>
          </Link>)}</div>
        </div>}
        <details className={styles.why}><summary>{t.expand}<ChevronDown size={16} aria-hidden="true"/></summary><p>{t.help}</p></details>
      </div>}

      <div className={styles.personalDivider}>
        <span>{t.personal}</span><a href="#solutions">{t.personalAction}<ArrowRight size={16} aria-hidden="true"/></a>
      </div>
    </section>
  );
}
