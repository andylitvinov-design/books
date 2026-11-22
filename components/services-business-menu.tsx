"use client";
import {useState} from "react";
import {ArrowLeft, ArrowRight, Brain, Check, Compass, Flower2, Lightbulb, Mic} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {MandatoryMessengerActions} from "@/components/mandatory-messenger-actions";
import {whatsappEnquiryUrl} from "@/lib/whatsapp-enquiry";
import {telegramServiceRequestUrl} from "@/lib/assist/telegram-business-request.mjs";
import styles from "./services-business-menu.module.css";

const businessTypes=[
 {id:"express",Icon:Lightbulb},
 {id:"strategy",Icon:Compass},
 {id:"remedies",Icon:Flower2},
 {id:"hints",Icon:Brain},
] as const;
type BusinessKey=typeof businessTypes[number]["id"];
type Option=readonly [name:string,description:string];
type Section={title:string;description:string;options:readonly Option[]};
type MenuCopy={
 title:string;lead:string;choose:string;back:string;goal:string;optional:string;
 getDetails:string;contactRequest:string;contactNote:string;priceNote:string;
 sections:Record<BusinessKey,Section>;
};
const EXPRESS_PRICES=["FREE","45 CAD","75 CAD / 30 min","200 CAD / 60 min","300 CAD / 2 weeks"] as const;
const copies:Record<PublicLocale,MenuCopy>={
 en:{
  title:"How would you like to work?",lead:"Choose a format, then the service. No need to diagnose your business.",
  choose:"Choose a service or result",back:"All business formats",goal:"Describe your goal or situation…",optional:"Optional — included only if you open the WhatsApp draft",
  getDetails:"Get details",contactRequest:"Please share details and the next step for this selected business service.",
  contactNote:"WhatsApp opens your selected offer as a draft, not a sent request. Telegram opens Ali when available; tell Ali your specific choice, as the sub-option is not transferred automatically.",
  priceNote:"CAD · The consultation or payment is not booked automatically.",
  sections:{
   express:{title:"Express Business Insight",description:"Choose the depth and duration of your business insight.",options:[
    ["Express Insight","Short text format"],
    ["Advanced Insight","Detailed analyses + Taoist hints"],
    ["Express Live Consulting","30-minute live consultation"],
    ["Full Live Consulting","60-minute live consultation"],
    ["Live Consulting + Support","Consulting with support for 2 weeks"],
   ]},
   strategy:{title:"Strategic Business Analyses",description:"Choose the strategic result you want to work on.",options:[
    ["Strategic Goal Review","Clarify direction and priorities"],
    ["Business Functions Analyses","Review key business functions"],
    ["Business Teams Review","Examine team structure and collaboration"],
    ["Growth Strategy & Implementation","Create a growth plan and implementation path"],
   ]},
   remedies:{title:"Remedies for Clarity & Leadership",description:"Personal wellbeing guidance to support clarity and steadier leadership.",options:[
    ["Clarity & Focus","Explore a clearer, more focused state"],
    ["Confidence & Leadership","Support confidence and self-regulation"],
    ["Stress & Emotional Balance","Explore stress and emotional balance"],
    ["Personal Remedy Selection","Discuss an individual remedy approach"],
   ]},
   hints:{title:"Hints & Coaching",description:"Choose AI guidance or a conversation with a human specialist.",options:[
    ["AI Coaching","Coaching with AI"],
    ["AI Taoist Hints","Taoist-inspired hints with AI"],
    ["Human Coaching","A personal coaching conversation"],
    ["Human Taoist Hints","Taoist-inspired guidance from a human specialist"],
   ]},
  },
 },
 ru:{
  title:"Какой формат работы вам подходит?",lead:"Выберите способ поддержки, затем услугу. Не нужно заранее знать причину трудностей.",
  choose:"Выберите услугу или результат",back:"Все форматы для бизнеса",goal:"Опишите вашу цель или ситуацию…",optional:"Необязательно — добавляется только в черновик WhatsApp",
  getDetails:"Get details",contactRequest:"Расскажите подробнее об этой бизнес-услуге и следующем шаге.",
  contactNote:"WhatsApp откроет черновик с выбранной услугой — сообщение не отправится само. Telegram откроет Ali при доступности бота; назовите ему подпункт, поскольку он пока не передаётся автоматически.",
  priceNote:"CAD · Запись и оплата не выполняются автоматически.",
  sections:{
   express:{title:"Express Business Insight",description:"Выберите глубину и длительность бизнес-разбора.",options:[
    ["Express Insight","Короткий текстовый ответ"],
    ["Advanced Insight","Подробный анализ и даосские подсказки"],
    ["Express Live Consulting","30 минут живой консультации"],
    ["Full Live Consulting","60 минут живой консультации"],
    ["Live Consulting + Support","Консультация и поддержка в течение 2 недель"],
   ]},
   strategy:{title:"Strategic Business Analyses",description:"Выберите желаемый стратегический результат.",options:[
    ["Strategic Goal Review","Разбор стратегической цели"],
    ["Business Functions Analyses","Анализ функций бизнеса"],
    ["Business Teams Review","Анализ команды"],
    ["Growth Strategy & Implementation","Стратегия роста и внедрение"],
   ]},
   remedies:{title:"Remedies for Clarity & Leadership",description:"Индивидуальная поддержка ясности и эмоциональной устойчивости.",options:[
    ["Clarity & Focus","Ясность и концентрация"],
    ["Confidence & Leadership","Уверенность и лидерство"],
    ["Stress & Emotional Balance","Стресс и эмоциональный баланс"],
    ["Personal Remedy Selection","Персональный подбор подхода"],
   ]},
   hints:{title:"Hints & Coaching",description:"Выберите подсказки ИИ или консультацию с человеком.",options:[
    ["AI Coaching","Коучинг с ИИ"],
    ["AI Taoist Hints","Даосские подсказки от ИИ"],
    ["Human Coaching","Коучинг с человеком"],
    ["Human Taoist Hints","Даосские подсказки от специалиста"],
   ]},
  },
 },
 es:{
  title:"¿Cómo prefieres trabajar?",lead:"Elige un formato y después un servicio. No necesitas conocer la causa del problema.",
  choose:"Elige un servicio o resultado",back:"Todos los formatos de negocio",goal:"Describe tu objetivo o situación…",optional:"Opcional — solo se incluye en el borrador de WhatsApp",
  getDetails:"Get details",contactRequest:"Quisiera detalles y el siguiente paso para este servicio empresarial.",
  contactNote:"WhatsApp abre un borrador, no envía nada. Telegram abre Ali cuando está disponible; indica tu subopción porque aún no se transmite automáticamente.",
  priceNote:"CAD · No se realiza una reserva ni un pago automático.",
  sections:{
   express:{title:"Express Business Insight",description:"Elige la profundidad y duración de tu análisis.",options:[
    ["Express Insight","Texto breve"],
    ["Advanced Insight","Análisis detallado y consejos taoístas"],
    ["Express Live Consulting","Consulta en vivo de 30 minutos"],
    ["Full Live Consulting","Consulta en vivo de 60 minutos"],
    ["Live Consulting + Support","Consulta con apoyo durante 2 semanas"],
   ]},
   strategy:{title:"Strategic Business Analyses",description:"Elige el resultado estratégico que quieres conseguir.",options:[
    ["Strategic Goal Review","Revisión del objetivo estratégico"],
    ["Business Functions Analyses","Análisis de las funciones empresariales"],
    ["Business Teams Review","Revisión de equipos de negocio"],
    ["Growth Strategy & Implementation","Estrategia de crecimiento e implementación"],
   ]},
   remedies:{title:"Remedies for Clarity & Leadership",description:"Orientación personal para el equilibrio y la claridad.",options:[
    ["Clarity & Focus","Claridad y concentración"],
    ["Confidence & Leadership","Confianza y liderazgo"],
    ["Stress & Emotional Balance","Estrés y equilibrio emocional"],
    ["Personal Remedy Selection","Selección individual de enfoques"],
   ]},
   hints:{title:"Hints & Coaching",description:"Elige orientación con IA o con una persona.",options:[
    ["AI Coaching","Coaching con IA"],
    ["AI Taoist Hints","Consejos taoístas con IA"],
    ["Human Coaching","Coaching con especialista"],
    ["Human Taoist Hints","Consejos taoístas de un especialista"],
   ]},
  },
 },
};
export function ServicesBusinessMenu({locale}:{locale:PublicLocale}){
 const t=copies[locale];
 const [category,setCategory]=useState<BusinessKey|null>(null);
 const [selectedOption,setSelectedOption]=useState<number|null>(null);
 const [goal,setGoal]=useState("");
 const section=category?t.sections[category]:null;
 const option=section&&selectedOption!==null?section.options[selectedOption]:null;
 const price=category==="express"&&selectedOption!==null?EXPRESS_PRICES[selectedOption]:null;
 const optionLabel=option?option[0]+(price?" · "+price:""):undefined;
 const whatsappUrl=section?whatsappEnquiryUrl({
  locale,service:section.title,request:t.contactRequest,
  option:optionLabel,context:goal.trim()||undefined,pagePath:"/"+locale+"/services",
 }):"";
 const telegramUrl=telegramServiceRequestUrl("business",locale)||undefined;
 return <section className={styles.root} data-services-business-menu data-business-step={category?"2":"1"} aria-label={t.title}>
  <div className={styles.progress}>
   <span>{category?"2 / 2":"1 / 2"}</span>
   <div className={styles.dots} aria-hidden="true"><i data-active="true"/><i data-active={category?"true":"false"}/></div>
  </div>
  {category&&section?<>
   <button type="button" className={styles.back} data-business-back onClick={()=>{setCategory(null);setSelectedOption(null);setGoal("");}}>
    <ArrowLeft size={18} aria-hidden="true"/>{t.back}
   </button>
   <h2 className={styles.title}>{section.title}</h2>
   <p className={styles.lead}>{section.description}</p>
   <div className={styles.offerList} role="group" aria-label={t.choose} data-business-options={category}>
    {section.options.map(([name,description],index)=><button type="button" key={category+"-"+index}
      className={styles.offer} data-business-offer={category+"-"+index}
      aria-pressed={selectedOption===index} onClick={()=>setSelectedOption(index)}>
      <span className={styles.offerText}><strong>{name}</strong><small>{description}</small></span>
      {category==="express"?<span className={styles.price}>{EXPRESS_PRICES[index]}</span>:null}
      {selectedOption===index?<Check size={18} className={styles.checked} aria-hidden="true"/>:null}
    </button>)}
   </div>
   {category==="express"?<p className={styles.priceNote}>{t.priceNote}</p>:null}
   <div className={styles.goalField}>
    <label htmlFor="business-optional-goal">{t.goal}</label>
    <input id="business-optional-goal" maxLength={300} value={goal}
      placeholder={t.goal} onChange={e=>setGoal(e.target.value)} autoComplete="off"/>
    <small><Mic size={14} aria-hidden="true"/>{t.optional}</small>
   </div>
   <div data-business-get-details key={category+"-"+selectedOption} className={styles.contact}>
    <MandatoryMessengerActions locale={locale} whatsappUrl={whatsappUrl} telegramUrl={telegramUrl}
      label={t.getDetails} className={styles.detailsButton} collapsed compact/>
    <p className={styles.contactNote}>{t.contactNote}</p>
   </div>
  </>:<>
   <h2 className={styles.title}>{t.title}</h2>
   <p className={styles.lead}>{t.lead}</p>
   <div className={styles.grid} role="group" aria-label={t.title}>
    {businessTypes.map(({id,Icon})=><button key={id} type="button"
      className={styles.card} data-services-business-category={id}
      onClick={()=>{setCategory(id);setSelectedOption(null);setGoal("");}}>
      <span className={styles.cardPhoto} data-business-card-photo={id} aria-hidden="true"/>
      <span className={styles.cardLabel}><Icon size={24} strokeWidth={1.65} aria-hidden="true"/>
       <strong>{t.sections[id].title}</strong><ArrowRight size={16} aria-hidden="true"/></span>
    </button>)}
   </div>
  </>}
 </section>;
}
