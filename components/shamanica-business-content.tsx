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
const serviceIcons={analysis:TrendingUp,support:ClipboardCheck,team:Users,leader:UserRound,artifacts:Gem,remedies:Sprout} as const;
const serviceImages={
 analysis:"/images/holistic-house/report-lighthouse-coast.webp",
 support:"/images/holistic-house/books-library.webp",
 team:"/images/holistic-house/homepage-constellations.svg",
 leader:"/images/holistic-house/course-focus-mountain-boy.webp",
 artifacts:"/images/holistic-house/tao-fu-balance.webp",
 remedies:"/images/holistic-house/distance-homeopathy.webp"
} as const;
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
  <section className={styles.services} aria-labelledby="business-services-heading">
   <h2 id="business-services-heading">{t.servicesTitle}</h2>
   <div className={styles.serviceGrid}>
    {BUSINESS_SERVICES.map((id,index)=>{
     const Icon=serviceIcons[id as keyof typeof serviceIcons];
     const details=t.services[index];
     return <Link className={styles.serviceCard} href={shamanicaBusinessHref(locale,id)} prefetch={false} key={id} data-business-service={id}>
      <Image src={serviceImages[id as keyof typeof serviceImages]} fill alt="" className={styles.serviceImage} sizes="(max-width:359px) 100vw, (max-width:760px) 50vw, 360px"/>
      <Icon size={27} className={styles.serviceIcon} strokeWidth={1.5} aria-hidden="true"/>
      <span className={styles.serviceText}><strong>{details[0]}</strong><span>{details[1]}</span></span>
      <ArrowRight size={17} className={styles.cardArrow} aria-hidden="true"/>
     </Link>;
    })}
   </div>
  </section>
 </div>;
}
