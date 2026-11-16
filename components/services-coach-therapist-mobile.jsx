"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Info, Sparkles, UsersRound, X } from "lucide-react";
import { coachSessionHref } from "@/lib/coaching/persona-registry.mjs";
import styles from "./services-coach-therapist-mobile.module.css";

const topics = ["all","relationships","emotions","meaning","work"];
const periods = ["any","day","evening"];
const words = {
  ru: {
    eyebrow:"АССИСТ · УСЛУГИ",title:"Личная сессия с коучем-терапевтом",lead:"Поддержка, ясность и ресурсы для важных перемен.",
    topic:"Тема сессии",period:"Удобное время",topics:["Выберите тему","Отношения","Эмоции и стресс","Смысл и развитие","Цели и работа"],
    periods:["Любое","День","Вечер"],choose:"Выберите специалиста",about:"О мастере",order:"Заказать",
    role:"Мастер Holistic House",more:"Подобрать других специалистов",full:"Полный профиль",close:"Закрыть",details:"Подробно о мастере",
    note:"День и вечер — ваши пожелания, не расписание. Уточните время при запросе: мастер согласует условия до оплаты.",
    loading:"Загружаем опубликованные профили…",unavailable:"Другие профили сейчас недоступны — посмотрите общий каталог.",
    owner:"Андрей Литвинов",ownerRole:"Коуч · личные сессии",
    ownerDesc:"Внутренние конфликты, отношения, образы и поиск опоры.",
    ownerBio:"Индивидуальные беседы, работа с внутренними образами, системные расстановки и бережное исследование жизненных вопросов. Выбор метода — совместный.",
    ai:"Мира · ИИ-коуч",aiRole:"Виртуальный помощник",aiDesc:"Бережный диалог, ясность и небольшие шаги.",
    aiBio:"Мира — вымышленный ИИ-персонаж Holistic House, а не живой терапевт. Генеративный диалог требует входа и согласия при доступной проверенной модели; иначе предлагаются подготовленные вопросы.",
    aiAbout:"О коуче",start:"Начать сессию",safety:"ИИ не заменяет психотерапию или экстренную помощь."
  },
  en: {
    eyebrow:"ASSIST · SERVICES",title:"Personal coaching & therapy-style support",lead:"Support, clarity and resources for meaningful change.",
    topic:"Session topic",period:"Preferred time",topics:["Choose a topic","Relationships","Emotions & stress","Meaning & growth","Goals & work"],
    periods:["Either","Day","Evening"],choose:"Choose a practitioner",about:"About",order:"Request",
    role:"Holistic House practitioner",more:"Find other practitioners",full:"Full profile",close:"Close",details:"About this practitioner",
    note:"Day and evening are preferences, not live availability. Mention your preference when requesting; the practitioner confirms all terms before payment.",
    loading:"Loading published profiles…",unavailable:"Other profiles are unavailable. Browse the public directory.",
    owner:"Andrey Litvinov",ownerRole:"Coach · personal sessions",ownerDesc:"Patterns, relationships, inner imagery and grounded support.",
    ownerBio:"Individual conversations, guided imagery and systemic constellations. We choose a suitable approach together.",
    ai:"Mira · AI coach",aiRole:"Virtual assistant",aiDesc:"Gentle dialogue, clarity and small next steps.",
    aiBio:"Mira is a fictional AI persona, not a human therapist. Generative conversation requires sign-in, consent and a privacy-reviewed available model; otherwise guided questions are offered.",
    aiAbout:"About AI",start:"Start session",safety:"AI does not replace therapy or emergency support."
  },
  es: {
    eyebrow:"ASSIST · SERVICIOS",title:"Coaching y apoyo personal",lead:"Apoyo, claridad y recursos para cambiar a tu ritmo.",
    topic:"Tema",period:"Horario preferido",topics:["Elige un tema","Relaciones","Emociones y estrés","Sentido y desarrollo","Metas y trabajo"],
    periods:["Cualquiera","Día","Tarde"],choose:"Elige profesional",about:"Conocer",order:"Solicitar",
    role:"Profesional Holistic House",more:"Ver otros profesionales",full:"Perfil completo",close:"Cerrar",details:"Sobre el profesional",
    note:"Día o tarde son preferencias, no disponibilidad real. Indícalas en tu solicitud; se confirman las condiciones antes del pago.",
    loading:"Cargando perfiles publicados…",unavailable:"Otros perfiles no están disponibles ahora. Explora el directorio.",
    owner:"Andrey Litvinov",ownerRole:"Coach · sesiones personales",ownerDesc:"Relaciones, imágenes interiores y apoyo personal.",
    ownerBio:"Sesiones individuales con imágenes guiadas y constelaciones sistémicas. Elegimos el método según tu pregunta.",
    ai:"Mira · coach IA",aiRole:"Asistente virtual",aiDesc:"Diálogo amable para ganar claridad y dar pequeños pasos.",
    aiBio:"Mira es un personaje de IA ficticio, no una terapeuta. La IA generativa necesita acceso, consentimiento y modelo privado; de lo contrario hay preguntas guiadas.",
    aiAbout:"Sobre IA",start:"Iniciar sesión",safety:"La IA no sustituye atención profesional o emergencias."
  }
};
const patterns = {
  relationships:/relationships|отношен|семь|family|relacion|pareja/i,
  emotions:/emotional_psychological|body_somatic|эмоци|стресс|stress|emotion|anxiety|ansiedad/i,
  meaning:/personal_development|career_purpose|смысл|развит|purpose|growth|sentido/i,
  work:/business_money|career_purpose|работ|карьер|business|career|trabajo/i
};
function allowedPhoto(v) {
  return typeof v === "string" && ((v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^/]+/.test(v)) ? v : "";
}
function ownerOffer(locale,t) {
  return {id:"andy",slug:"andy-litvinov",name:t.owner,role:t.ownerRole,description:t.ownerDesc,bio:t.ownerBio,
    photo:"/images/holistic-house/andy-about.png",methods:[],area:"personal_development",
    profile:"/"+locale+"/masters/andy-litvinov",request:"/"+locale+"/coaching#coaching-session-request"};
}
function publicOffer(value,locale) {
  return {id:value.serviceId,slug:value.practitionerSlug,name:value.practitionerName,
    role:value.professionalTitle,description:value.description||value.shortBio,
    bio:value.fullBio||value.shortBio||value.description,photo:allowedPhoto(value.profilePhoto),
    methods:value.methods||[],area:value.areaKey,
    profile:"/"+locale+"/masters/"+encodeURIComponent(value.practitionerSlug),
    request:"/"+(locale==="es"?"en":locale)+"/app/consultations?service="+encodeURIComponent(value.serviceId)};
}
export function ServicesCoachTherapistMobile({locale="en"}) {
  const t=words[locale]||words.en;
  const [topic,setTopic]=useState("all"),[period,setPeriod]=useState("any");
  const [published,setPublished]=useState([]),[availability,setAvailability]=useState("loading");
  const [details,setDetails]=useState(null);
  const dialogRef=useRef(null);
  const aiHref=coachSessionHref(locale,"mira")||"/"+locale+"/my-coach";
  useEffect(()=>{
    if(!window.matchMedia("(max-width: 760px)").matches)return;
    const ctrl=new AbortController();
    fetch("/api/public/remote-energy-support-masters?locale="+locale+"&kind=consultation",
      {signal:ctrl.signal,credentials:"omit"}).then(async r=>{
        if(!r.ok)throw new Error("PUBLIC_DIRECTORY_UNAVAILABLE");
        return r.json();
      }).then(r=>{
        if(ctrl.signal.aborted)return;
        if(!Array.isArray(r.consultations))throw new Error("INVALID_DIRECTORY");
        setPublished(r.consultations.filter(v=>v&&typeof v.serviceId==="string"&&
          typeof v.practitionerName==="string"&&
          typeof v.practitionerSlug==="string"&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(v.practitionerSlug)&&
          typeof v.href==="string"&&v.href.startsWith("/"+locale+"/services/")&&
          ["relationships","emotional_psychological","personal_development","career_purpose","business_money","body_somatic"].includes(v.areaKey)));
        setAvailability("ready");
      }).catch(()=>{if(!ctrl.signal.aborted)setAvailability("unavailable");});
    return ()=>ctrl.abort();
  },[locale]);
  useEffect(()=>{
    const d=dialogRef.current;if(!d)return;
    if(details&&!d.open)d.showModal();
    if(!details&&d.open)d.close();
  },[details]);
  const displayed=[ownerOffer(locale,t)],seen=new Set(["andy-litvinov"]);
  for(const offer of published) {
    if(seen.has(offer.practitionerSlug))continue;
    if(topic!=="all"&&!patterns[topic].test([offer.areaKey,offer.title,offer.description,offer.shortBio].join(" ")))continue;
    seen.add(offer.practitionerSlug);displayed.push(publicOffer(offer,locale));
    if(displayed.length===3)break;
  }
  const ai={id:"ai",slug:"mira",name:t.ai,role:t.aiRole,description:t.aiDesc,bio:t.aiBio,
    photo:"/images/holistic-house/my-coach-motion/mira-still.webp",methods:[],
    profile:"/"+locale+"/my-coach",request:aiHref};
  return <section id="assist-coach-sessions" lang={locale} className={styles.shelf}
    data-assist-coach-therapist aria-labelledby="assist-coach-heading">
    <header className={styles.hero}>
      <span>{t.eyebrow}</span><h2 id="assist-coach-heading">{t.title}</h2><p>{t.lead}</p>
    </header>
    <div className={styles.filters}>
      <label htmlFor="assist-coach-topic">{t.topic}</label>
      <div className={styles.selectWrap}>
        <select id="assist-coach-topic" data-assist-coach-topic value={topic} onChange={e=>setTopic(e.target.value)}>
          {topics.map((k,i)=><option value={k} key={k}>{t.topics[i]}</option>)}
        </select><ChevronDown size={22} aria-hidden="true"/>
      </div>
      <strong>{t.period}</strong>
      <div role="group" aria-label={t.period} className={styles.periods}>
        {periods.map((k,i)=><button key={k} type="button" data-assist-coach-period={k}
          aria-pressed={k===period} className={k===period?styles.active:""}
          onClick={()=>setPeriod(k)}>{t.periods[i]}</button>)}
      </div>
    </div>
    <h3 className={styles.choose}>{t.choose}</h3>
    <div className={styles.cards}>
      {[...displayed,ai].map(item=><article key={item.id} className={styles.card}
        data-assist-coach-master={item.slug} data-assist-coach-ai={item.id==="ai"?"mira":undefined}>
        <div className={styles.portrait} aria-hidden="true">
          {item.photo?<img src={item.photo} loading="lazy" alt=""/>:<span>{item.name.slice(0,1)}</span>}
        </div>
        <div className={styles.body}>
          <h4>{item.name}</h4>
          <span className={item.id==="ai"?styles.aiRole:styles.role}>{item.id==="ai"&&<Sparkles size={14}/>} {item.role||t.role}</span>
          <p>{item.description}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={()=>setDetails(item)}
              aria-label={t.details+": "+item.name}><Info size={17}/>{item.id==="ai"?t.aiAbout:t.about}</button>
            <Link href={item.request} prefetch={false} className={styles.primary}>
              {item.id==="ai"?t.start:t.order}<ArrowRight size={17}/></Link>
          </div>
        </div>
      </article>)}
    </div>
    {availability==="loading"&&<p className={styles.status} role="status">{t.loading}</p>}
    {availability==="unavailable"&&<p className={styles.status} role="status">{t.unavailable}</p>}
    <p className={styles.note}>{t.note} {t.safety}</p>
    <Link href={"/"+locale+"/masters"} prefetch={false} className={styles.more}>
      <UsersRound size={23}/>{t.more}<ArrowRight size={23}/>
    </Link>
    <dialog ref={dialogRef} className={styles.dialog} onClose={()=>setDetails(null)}
      aria-label={details?.name||t.details} data-assist-coach-profile-dialog>
      {details&&<div className={styles.modal}>
        <button type="button" className={styles.close} aria-label={t.close} onClick={()=>setDetails(null)}><X size={24}/></button>
        <div className={styles.modalHero}>
          {details.photo?<img src={details.photo} alt=""/>:<span>{details.name.slice(0,1)}</span>}
          <div><h3>{details.name}</h3><p>{details.role||t.role}</p></div>
        </div>
        <p className={styles.bio}>{details.bio}</p>
        {details.methods?.length>0&&<p className={styles.methods}>{details.methods.slice(0,6).join(" · ")}</p>}
        <div className={styles.actions}>
          <Link href={details.profile} className={styles.secondary} prefetch={false}>{t.full}</Link>
          <Link href={details.request} className={styles.primary} prefetch={false}>
            {details.id==="ai"?t.start:t.order}<ArrowRight size={17}/></Link>
        </div>
      </div>}
    </dialog>
  </section>;
}
