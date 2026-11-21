"use client";
import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {ArrowLeft, ArrowRight, ClipboardCheck, Compass, Gem, Search, Sprout, Target, TrendingUp, UserRound, Users} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {BUSINESS_SERVICES,shamanicaBusinessHref,shamanicaBusinessRecommendations} from "@/lib/shamanica-business.mjs";
import styles from "./shamanica-business-content.module.css";

const goalChoices=[{id:"express",Icon:Search},{id:"analysis",Icon:TrendingUp},{id:"team",Icon:Users},{id:"leader",Icon:UserRound}] as const;
const concernChoices=[{id:"unclear",Icon:Search},{id:"decision",Icon:Compass},{id:"conflict",Icon:Users},{id:"resources",Icon:Sprout}] as const;
const startChoices=[{id:"free",Icon:ClipboardCheck},{id:"consultation",Icon:UserRound},{id:"team",Icon:Users},{id:"tools",Icon:Gem}] as const;
const businessShelves=[
 {id:"express",target:"express",Icon:Search,image:"/images/holistic-house/report-lighthouse-coast.webp",routes:["express","support","analysis","analysis"]},
 {id:"remedies",target:"remedies",Icon:Sprout,image:"/images/holistic-house/distance-homeopathy.webp",routes:["remedies","remedies","remedies","remedies"]},
 {id:"strategy",target:"analysis",Icon:TrendingUp,image:"/images/holistic-house/books-library.webp",routes:["analysis","support","team","leader"]},
 {id:"artifacts",target:"artifacts",Icon:Gem,image:"/images/holistic-house/tao-fu-balance.webp",routes:["artifacts","artifacts","artifacts","artifacts"]},
 {id:"energy",target:"support",Icon:Target,image:"/images/holistic-house/reiki-approved-sunrise-v3.webp",routes:["remote-energy","remote-energy","artifacts","remote-energy"]},
 {id:"energywork",target:"team",Icon:Users,image:"/images/holistic-house/homepage-constellations.svg",routes:["team","remote-energy","ritual","team"]}
] as const;
const businessDetailHref=(locale:PublicLocale,id:string)=>{
 if(id==="remote-energy")return "/"+locale+"/services/remote-energy-support";
 if(id==="ritual")return "/"+locale+"/holistic-support/mandala";
 return shamanicaBusinessHref(locale,id);
};
type ShelfId=(typeof businessShelves)[number]["id"];
const translations={
 ru:{
  title:"Бизнес-анализ и поддержка",
  subtitle:"Диагностика, аналитика и индивидуальная поддержка для развития вашего бизнеса.",
  diagnosis:"Пройти диагностику",choose:"Подобрать решение",
  step:"Шаг",of:"из",back:"Назад",
  questions:["Что сейчас больше всего нужно вашему бизнесу?","Что вызывает основные сложности?","Как вы хотите начать?"],
  goals:["Экспресс-диагностика","Бизнес-анализ","Поддержка команды","Поддержка руководителя"],
  concerns:["Неясна причина проблем","Сложно принять решение","Напряжение в команде","Не хватает ресурсов"],
  starts:["Письменный разбор","Личная консультация","Работа с командой","Другие методы поддержки"],
  featured:"Главная услуга",featureTitle:"Экспресс-диагностика ситуации",
  featureDesc:"Ключевые факторы и ближайшие решения.",
  begin:"Начать",servicesTitle:"Ключевые услуги",resultTitle:"Два направления для вашего запроса",
  resultLead:"Подборка основана на ваших ответах. Выберите подходящий вариант.",
  restart:"Изменить ответы",
  express:["Экспресс-диагностика","Начните с письменного разбора вашей бизнес-ситуации."],
  shelves:["Экспресс-бизнес-инсайт","Средства для ясности и лидерства","Стратегия и бизнес-анализ","Артефакты для поддержки целей","Энергоподдержка бизнеса","Энергопрактики в бизнесе"],
  subservices:[["Экспресс-анализ ситуации","Помощь в принятии решения","Поиск скрытых препятствий","Оценка новой возможности"],["Ясность и концентрация","Уверенность и лидерство","Стресс и эмоциональный баланс","Индивидуальный подбор средств"],["Глубинный бизнес-анализ","Стратегия роста и доходов","Анализ команды и партнёров","Дорожная карта бизнеса"],["Персональный бизнес-талисман","Мандала для концентрации","Символ успеха и процветания","Индивидуальный ритуальный артефакт"],["Восстановительные практики руководителя","Баланс и поддержка команды","Гармонизация рабочего пространства","Дистанционная энергоподдержка"],["Расстановка о деньгах и ценности","Активация лидерских качеств","Ритуал запуска проекта","Согласование команды и партнёрства"]],
  chooseFocus:"Выберите конкретное направление",
  backToShelves:"Все 6 направлений",
  details:"Подробнее",
  categoryHint:"Ссылки ведут к ближайшим существующим услугам. Формат и стоимость уточняются на странице услуги.",
  services:[
   ["Бизнес-анализ","Расширенный разбор ситуации, факторов и направлений роста."],
   ["Аналитическая поддержка","Сопровождение решений и регулярный разбор бизнеса."],
   ["Диагностика команды","Роли, напряжения, потенциал и взаимодействие."],
   ["Поддержка руководителя","Индивидуальный анализ, ресурсы и ясность."],
   ["Предметы силы","Артефакты и символы для пространства и проектов."],
   ["Подбор препаратов","Индивидуальная консультация о средствах поддержки состояния."]
  ]
 },
 en:{
  title:"Business analysis & support",
  subtitle:"Diagnosis, insight and individual support for developing your business.",
  diagnosis:"Start a review",choose:"Find my approach",
  step:"Step",of:"of",back:"Back",
  questions:["What does your business need most right now?","What is the main difficulty?","How would you like to begin?"],
  goals:["Quick situation review","Business analysis","Team support","Leadership support"],
  concerns:["The causes are unclear","A difficult decision","Team tensions","Not enough resources"],
  starts:["Written review","Personal consultation","Work with the team","Other support methods"],
  featured:"Featured service",featureTitle:"Quick business situation review",
  featureDesc:"Key factors and the next steps.",
  begin:"Begin",servicesTitle:"Key services",resultTitle:"Two paths for your situation",
  resultLead:"Selected from your answers. Choose how to begin.",
  restart:"Change answers",
  express:["Quick situation review","Start with a written review of your business situation."],
  shelves:["Express Business Insight","Remedies for Clarity & Leadership","Strategy & Business Analyses","Artefacts for Goal Support","Business Energy Support","Energywork in Business"],
  subservices:[["Express Situation Scan","Decision Insight","Hidden Obstacles","Opportunity Check"],["Clarity & Focus","Confidence & Leadership","Stress & Emotional Balance","Personal Remedy Selection"],["Deep Business Analysis","Growth & Money Strategy","Team & Partnership Analysis","Business Roadmap"],["Personal Business Talisman","Mandala for Focus","Success & Prosperity Symbol","Custom Ritual Artifact"],["Executive Energy Recovery","Team Energy Balance","Business Space Harmony","Remote Energy Support"],["Money & Value Constellation","Leadership Activation","Business Launch Ritual","Partnership & Team Alignment"]],
  chooseFocus:"Choose a specific focus",
  backToShelves:"All 6 categories",
  details:"Details",
  categoryHint:"Links open the closest existing service pages. Format and price are confirmed on the service page.",
  services:[
   ["Business analysis","A fuller look at your situation, factors and growth paths."],
   ["Analytical support","Ongoing reviews and support for business decisions."],
   ["Team diagnosis","Roles, tensions, potential and collaboration."],
   ["Leader support","Individual analysis, resources and perspective."],
   ["Symbolic objects","Artefacts and symbols for a workspace or project."],
   ["Remedy guidance","Personal consultation about wellbeing-related approaches."]
  ]
 },
 es:{
  title:"Análisis y apoyo empresarial",
  subtitle:"Diagnóstico, análisis y apoyo individual para el desarrollo de tu negocio.",
  diagnosis:"Empezar análisis",choose:"Encontrar solución",
  step:"Paso",of:"de",back:"Volver",
  questions:["¿Qué necesita más tu negocio ahora?","¿Cuál es la principal dificultad?","¿Cómo te gustaría comenzar?"],
  goals:["Diagnóstico rápido","Análisis empresarial","Apoyo al equipo","Apoyo al líder"],
  concerns:["Causas poco claras","Decisión difícil","Tensiones del equipo","Faltan recursos"],
  starts:["Análisis escrito","Consulta personal","Trabajo con el equipo","Otros métodos de apoyo"],
  featured:"Servicio principal",featureTitle:"Diagnóstico rápido de la situación",
  featureDesc:"Factores clave y próximos pasos.",
  begin:"Empezar",servicesTitle:"Servicios principales",resultTitle:"Dos opciones para tu situación",
  resultLead:"Selección basada en tus respuestas. Elige cómo empezar.",
  restart:"Cambiar respuestas",
  express:["Diagnóstico rápido","Comienza con un análisis escrito de tu situación empresarial."],
  shelves:["Diagnóstico empresarial exprés","Remedios para claridad y liderazgo","Estrategia y análisis empresarial","Artefactos para apoyar objetivos","Apoyo energético empresarial","Trabajo energético para negocios"],
  subservices:[["Diagnóstico rápido de la situación","Orientación para decidir","Obstáculos ocultos","Evaluación de oportunidades"],["Claridad y concentración","Confianza y liderazgo","Estrés y equilibrio emocional","Selección individual de remedios"],["Análisis empresarial profundo","Estrategia de crecimiento y dinero","Análisis de equipo y socios","Hoja de ruta empresarial"],["Talismán empresarial personal","Mandala para concentrarse","Símbolo de éxito y prosperidad","Artefacto ritual personalizado"],["Recuperación energética del líder","Equilibrio energético del equipo","Armonía del espacio de trabajo","Apoyo energético a distancia"],["Constelación de dinero y valor","Activación del liderazgo","Ritual de lanzamiento","Alineación de socios y equipos"]],
  chooseFocus:"Elige un área específica",
  backToShelves:"Las 6 categorías",
  details:"Detalles",
  categoryHint:"Los enlaces abren los servicios existentes más cercanos. El formato y el precio se confirman allí.",
  services:[
   ["Análisis empresarial","Revisión de la situación, los factores y el crecimiento."],
   ["Apoyo analítico","Acompañamiento y revisión continua de decisiones."],
   ["Diagnóstico del equipo","Roles, tensiones, potencial y colaboración."],
   ["Apoyo al líder","Análisis individual, recursos y perspectiva."],
   ["Objetos simbólicos","Artefactos y símbolos para espacios y proyectos."],
   ["Orientación sobre remedios","Consulta personal sobre opciones de bienestar."]
  ]
 }
} as const;

type Goal=typeof goalChoices[number]["id"];
type Concern=typeof concernChoices[number]["id"];
type Start=typeof startChoices[number]["id"];
type ServiceId="express"|typeof BUSINESS_SERVICES[number];

export function ShamanicaBusinessContent({locale}:{locale:PublicLocale}){
 const t=translations[locale];
 const [step,setStep]=useState(0);
 const [goal,setGoal]=useState<Goal>("express");
 const [concern,setConcern]=useState<Concern>("unclear");
 const [start,setStart]=useState<Start>("free");
 const [finished,setFinished]=useState(false);
 const [selectedShelf,setSelectedShelf]=useState<ShelfId|null>(null);
 const activeShelf=businessShelves.find(item=>item.id===selectedShelf);
 const shelfIndex=businessShelves.findIndex(item=>item.id===selectedShelf);
 const current=step===0?goalChoices:step===1?concernChoices:startChoices;
 const labels=step===0?t.goals:step===1?t.concerns:t.starts;
 const choose=(id:string)=>{
  if(step===0){setGoal(id as Goal);setStep(1);}
  else if(step===1){setConcern(id as Concern);setStep(2);}
  else{setStart(id as Start);setFinished(true);}
 };
 const recommended=finished?shamanicaBusinessRecommendations({goal,concern,start}) as ServiceId[]:[];
 const serviceDescription=(id:ServiceId):readonly [string,string]=>{
  if(id==="express")return t.express;
  const index=BUSINESS_SERVICES.indexOf(id);
  return t.services[index>=0?index:0];
 };
 return <div className={styles.root} data-shamanica-business>
  <section className={styles.hero} aria-labelledby="shamanica-business-title">
   <Image src="/images/holistic-house/ideas-zen-landscape.svg" alt="" fill priority className={styles.heroImage} sizes="(max-width:640px) 100vw, 920px"/>
   <Image src="/images/holistic-house/messenger-zen-stones.svg" alt="" width={240} height={156} unoptimized className={styles.heroStones}/>
   <div className={styles.heroCopy}>
    <h1 id="shamanica-business-title">{t.title}</h1>
    <p>{t.subtitle}</p>
   </div>
   <div className={styles.heroActions}>
    <Link className={styles.primary} href={shamanicaBusinessHref(locale,"express")} prefetch={false}>{t.diagnosis}<ArrowRight size={19} aria-hidden="true"/></Link>
    <a className={styles.secondary} href="#business-quiz"><Target size={19} aria-hidden="true"/>{t.choose}</a>
   </div>
  </section>
  <section id="business-quiz" className={styles.quiz} data-business-quiz data-quiz-step={step+1} aria-labelledby="business-quiz-heading">
   <div className={styles.quizTop}>
    <span className={styles.stepLabel}>{t.step} {step+1} {t.of} 3</span>
    <span className={styles.progress} aria-label={t.step+" "+(step+1)+" / 3"}>
     {[0,1,2].map(i=><span key={i} className={i<=step?styles.done:""}/>)}
    </span>
   </div>
   {finished?<div className={styles.results} data-business-recommendations aria-live="polite">
     <h2 id="business-quiz-heading">{t.resultTitle}</h2><p>{t.resultLead}</p>
     <div className={styles.resultLinks}>{recommended.map((id,index)=>{
      const details=serviceDescription(id);
      return <Link href={shamanicaBusinessHref(locale,id)} key={id} prefetch={false} data-recommended-business-service={id} className={styles.resultLink}>
       <span className={styles.resultCount}>{index+1} / 2</span><strong>{details[0]}</strong><ArrowRight size={18} aria-hidden="true"/>
      </Link>;
     })}</div>
     <button className={styles.restart} type="button" onClick={()=>{setStep(0);setFinished(false);}}><ArrowLeft size={16} aria-hidden="true"/>{t.restart}</button>
    </div>:<>
     <div className={styles.quizHeading}>{step>0?<button className={styles.back} type="button" onClick={()=>setStep(value=>value-1)} aria-label={t.back}><ArrowLeft size={19}/></button>:null}
      <h2 id="business-quiz-heading" aria-live="polite">{t.questions[step]}</h2>
     </div>
     <div className={styles.answers} role="group" aria-label={t.questions[step]}>
      {current.map(({id,Icon},index)=><button type="button" key={id} className={styles.answer} onClick={()=>choose(id)} data-business-answer={id}>
       <Icon size={29} strokeWidth={1.65} aria-hidden="true"/><span>{labels[index]}</span>
      </button>)}
     </div>
    </>}
  </section>
  <section className={styles.feature} aria-labelledby="business-feature-heading">
   <Image src="/images/holistic-house/books-library.webp" alt="" fill className={styles.featureImage} sizes="(max-width:640px) 100vw, 920px"/>
   <div className={styles.featureContent}>
    <span className={styles.featureBadge}><Target size={17} aria-hidden="true"/>{t.featured}</span>
    <h2 id="business-feature-heading">{t.featureTitle}</h2>
    <p>{t.featureDesc}</p>
   </div>
   <Link className={styles.featureLink} href={shamanicaBusinessHref(locale,"express")} prefetch={false}>{t.begin}<ArrowRight size={19} aria-hidden="true"/></Link>
  </section>
  <section className={styles.services} data-business-cabinet-shelves data-expanded={activeShelf?"true":"false"} aria-labelledby="business-services-heading">
   <h2 id="business-services-heading">{activeShelf?t.shelves[shelfIndex]:t.servicesTitle}</h2>
   {activeShelf?<>
    <button type="button" className={styles.shelfBack} onClick={()=>setSelectedShelf(null)} data-business-back-to-shelves><ArrowLeft size={18} aria-hidden="true"/>{t.backToShelves}</button>
    <p className={styles.focusLead}>{t.chooseFocus}</p>
    <div className={styles.secondGrid} data-business-second-level={activeShelf.id}>
     {activeShelf.routes.map((target,index)=><Link key={activeShelf.id+"-"+index} href={businessDetailHref(locale,target)} prefetch={false} className={styles.secondCard} data-business-subservice={activeShelf.id+"-"+index}>
      <span className={styles.secondNumber}>{index+1}</span><strong>{t.subservices[shelfIndex][index]}</strong>
      <span className={styles.detailLabel}>{t.details}</span><ArrowRight size={16} aria-hidden="true"/>
     </Link>)}
    </div>
    <p className={styles.catalogHint}>{t.categoryHint}</p>
   </>:<div className={styles.serviceGrid}>
    {businessShelves.map(({id,Icon,image},index)=><button className={styles.serviceCard} type="button" key={id} onClick={()=>setSelectedShelf(id)} data-business-shelf={id} aria-label={t.shelves[index]}>
     <Image src={image} fill alt="" className={styles.serviceImage} sizes="(max-width:760px) 48vw, 300px"/>
     <span className={styles.serviceText}><Icon size={25} className={styles.serviceIcon} strokeWidth={1.6} aria-hidden="true"/><strong>{t.shelves[index]}</strong><ArrowRight size={16} className={styles.cardArrow} aria-hidden="true"/></span>
    </button>)}
   </div>}
  </section>
 </div>;
}
