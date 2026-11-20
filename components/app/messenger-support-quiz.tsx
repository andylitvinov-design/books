"use client";

import {useState} from "react";
import {ArrowLeft, ArrowRight, BriefcaseBusiness, Compass, HandHeart, HeartHandshake, X} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./messenger-support-quiz.module.css";

export type SupportCategory="stress"|"relationships"|"money"|"business";
export type SupportChatMode="secretary"|"coach"|"talk";
export type SupportQuizSelection={
  category:SupportCategory;categoryLabel:string;needId:string;needLabel:string;mode:SupportChatMode;
};
type Need={id:string;label:string};
type QuizCopy={
  eyebrow:string;title:string;intro:string;step:string;back:string;cancel:string;
  categoryQuestion:string;needQuestion:string;modeQuestion:string;notice:string;
  categories:Record<SupportCategory,string>;
  needs:Record<SupportCategory,Need[]>;
  modes:Record<SupportChatMode,{title:string;description:string}>;
};
const CATEGORIES=[
  {id:"stress",Icon:HandHeart},
  {id:"relationships",Icon:HeartHandshake},
  {id:"money",Icon:Compass},
  {id:"business",Icon:BriefcaseBusiness},
] as const;
const MODE_IDS=["secretary","coach","talk"] as const;
const COPY:Record<PublicLocale,QuizCopy>={
  en:{
    eyebrow:"GET SUPPORT",title:"Let's find a helpful starting point",
    intro:"Three quick choices, then you can talk directly with Ali.",
    step:"Step",back:"Back",cancel:"Close",
    categoryQuestion:"What would you like support with?",
    needQuestion:"Which part matters most right now?",
    modeQuestion:"How would you like Ali to help?",
    notice:"Ali is an AI assistant, not a human therapist. This is not a diagnosis. You can change direction at any time.",
    categories:{
      stress:"Ease stress & restore energy",
      relationships:"Improve relationships & esteem",
      money:"Get money & self growth ideas",
      business:"Get business support",
    },
    needs:{
      stress:[
        {id:"tension",label:"Stress and tension"},
        {id:"energy",label:"Low energy and tiredness"},
        {id:"rest",label:"Rest and better sleep"},
        {id:"balance",label:"Emotional balance"},
      ],
      relationships:[
        {id:"partner",label:"Partner and family relationships"},
        {id:"esteem",label:"Confidence and self-esteem"},
        {id:"boundaries",label:"Personal boundaries"},
        {id:"communication",label:"Communication and conflict"},
      ],
      money:[
        {id:"money-clarity",label:"Money decisions and clarity"},
        {id:"direction",label:"Personal direction"},
        {id:"motivation",label:"Motivation and confidence"},
        {id:"creative",label:"Fresh ideas and growth"},
      ],
      business:[
        {id:"strategy",label:"Business strategy"},
        {id:"team",label:"Team and leadership"},
        {id:"sales",label:"Clients and sales"},
        {id:"decisions",label:"A difficult business decision"},
      ],
    },
    modes:{
      secretary:{title:"Find practical support",description:"A few clarifying questions, suitable services and next steps."},
      coach:{title:"Explore my goal",description:"Talk through the situation and consider one small next step."},
      talk:{title:"Talk with a friend",description:"A warm, personal conversation at your pace, without pressure or sales."},
    },
  },
  ru:{
    eyebrow:"ПОЛУЧИТЬ ПОДДЕРЖКУ",title:"Найдём, с чего лучше начать",
    intro:"Три коротких выбора — и можно продолжить разговор с Ali.",
    step:"Шаг",back:"Назад",cancel:"Закрыть",
    categoryQuestion:"В какой теме вам нужна поддержка?",
    needQuestion:"Что сейчас важнее всего?",
    modeQuestion:"Как вам удобнее общаться с Ali?",
    notice:"Ali — ИИ-помощник, а не живой психотерапевт. Это не диагностика. Вы можете сменить тему в любой момент.",
    categories:{
      stress:"Снять стресс и восстановить энергию",
      relationships:"Улучшить отношения и самооценку",
      money:"Найти идеи для денег и личного роста",
      business:"Получить поддержку для бизнеса",
    },
    needs:{
      stress:[
        {id:"tension",label:"Стресс и напряжение"},
        {id:"energy",label:"Усталость и нехватка энергии"},
        {id:"rest",label:"Отдых и сон"},
        {id:"balance",label:"Эмоциональное равновесие"},
      ],
      relationships:[
        {id:"partner",label:"Отношения с партнёром и семьёй"},
        {id:"esteem",label:"Уверенность и самооценка"},
        {id:"boundaries",label:"Личные границы"},
        {id:"communication",label:"Общение и конфликты"},
      ],
      money:[
        {id:"money-clarity",label:"Денежные решения и ясность"},
        {id:"direction",label:"Личное направление"},
        {id:"motivation",label:"Мотивация и уверенность"},
        {id:"creative",label:"Новые идеи и развитие"},
      ],
      business:[
        {id:"strategy",label:"Стратегия бизнеса"},
        {id:"team",label:"Команда и руководство"},
        {id:"sales",label:"Клиенты и продажи"},
        {id:"decisions",label:"Сложное бизнес-решение"},
      ],
    },
    modes:{
      secretary:{title:"Подобрать поддержку",description:"Короткие уточнения, варианты услуг и следующий шаг."},
      coach:{title:"Разобраться с целью",description:"Обсудить ситуацию и найти один посильный шаг."},
      talk:{title:"Друг · просто поговорить",description:"Тёплое, доверительное общение без навязчивых советов и продаж."},
    },
  },
  es:{
    eyebrow:"RECIBIR APOYO",title:"Encontremos por dónde empezar",
    intro:"Tres elecciones breves y podrás hablar con Ali.",
    step:"Paso",back:"Atrás",cancel:"Cerrar",
    categoryQuestion:"¿En qué tema necesitas apoyo?",
    needQuestion:"¿Qué es lo más importante ahora?",
    modeQuestion:"¿Cómo quieres que Ali te ayude?",
    notice:"Ali es un asistente de IA, no un terapeuta humano. No es un diagnóstico. Puedes cambiar de tema.",
    categories:{
      stress:"Aliviar estrés y recuperar energía",
      relationships:"Mejorar relaciones y autoestima",
      money:"Ideas para dinero y crecimiento personal",
      business:"Apoyo para mi negocio",
    },
    needs:{
      stress:[
        {id:"tension",label:"Estrés y tensión"},
        {id:"energy",label:"Cansancio y poca energía"},
        {id:"rest",label:"Descanso y sueño"},
        {id:"balance",label:"Equilibrio emocional"},
      ],
      relationships:[
        {id:"partner",label:"Pareja y familia"},
        {id:"esteem",label:"Confianza y autoestima"},
        {id:"boundaries",label:"Límites personales"},
        {id:"communication",label:"Comunicación y conflictos"},
      ],
      money:[
        {id:"money-clarity",label:"Decisiones sobre dinero"},
        {id:"direction",label:"Dirección personal"},
        {id:"motivation",label:"Motivación y confianza"},
        {id:"creative",label:"Ideas nuevas y crecimiento"},
      ],
      business:[
        {id:"strategy",label:"Estrategia de negocio"},
        {id:"team",label:"Equipo y liderazgo"},
        {id:"sales",label:"Clientes y ventas"},
        {id:"decisions",label:"Decisión empresarial difícil"},
      ],
    },
    modes:{
      secretary:{title:"Encontrar apoyo práctico",description:"Preguntas breves, opciones de servicios y siguiente paso."},
      coach:{title:"Explorar mi meta",description:"Aclarar la situación y considerar un pequeño paso."},
      talk:{title:"Hablar con un amigo",description:"Una charla cálida y personal, sin presión ni ventas."},
    },
  },
};

export function MessengerSupportQuiz({locale,onFinish,onCancel}:{
  locale:PublicLocale;onFinish:(selection:SupportQuizSelection)=>void;onCancel:()=>void;
}){
  const t=COPY[locale];
  const [step,setStep]=useState<"category"|"need"|"mode">("category");
  const [category,setCategory]=useState<SupportCategory|null>(null);
  const [need,setNeed]=useState<string|null>(null);
  const needs=category?t.needs[category]:[];
  const stepNumber=step==="category"?1:step==="need"?2:3;
  const question=step==="category"?t.categoryQuestion:step==="need"?t.needQuestion:t.modeQuestion;
  const goBack=()=>{
    if(step==="mode"){setStep("need");return;}
    setCategory(null);setNeed(null);setStep("category");
  };
  const finish=(mode:SupportChatMode)=>{
    if(!category||!need)return;
    const selectedNeed=t.needs[category].find(option=>option.id===need);
    if(!selectedNeed)return;
    onFinish({category,categoryLabel:t.categories[category],needId:need,
      needLabel:selectedNeed.label,mode});
  };
  return <section className={css.root} data-hh-support-quiz data-hh-support-step={step}
    lang={locale} aria-labelledby="hh-support-quiz-title">
    <header className={css.header}>
      <div className={css.top}>
        {step==="category"?<span className={css.eyebrow}>{t.eyebrow}</span>:
          <button type="button" className={css.back} data-hh-support-back onClick={goBack}>
            <ArrowLeft size={17} aria-hidden="true"/>{t.back}
          </button>}
        <button type="button" className={css.close} data-hh-support-cancel onClick={onCancel}
          aria-label={t.cancel}><X size={18} aria-hidden="true"/></button>
      </div>
      <h2 id="hh-support-quiz-title">{t.title}</h2>
      <p>{t.intro}</p>
      <div className={css.progress} aria-label={t.step+" "+stepNumber+" / 3"}>
        {[1,2,3].map(index=><span key={index} className={index<=stepNumber?css.active:""}/>)}
      </div>
    </header>
    <h3 className={css.question}>{question}</h3>
    {step==="category"&&<div className={css.categories} role="group" aria-label={question}>
      {CATEGORIES.map(({id,Icon})=><button type="button" key={id}
        className={css.category} data-hh-support-category={id}
        onClick={()=>{setCategory(id);setNeed(null);setStep("need");}}>
        <Icon size={25} aria-hidden="true" strokeWidth={1.8}/>
        <strong>{t.categories[id]}</strong><ArrowRight size={16} aria-hidden="true"/>
      </button>)}
    </div>}
    {step==="need"&&<div className={css.options} role="group" aria-label={question}>
      {needs.map(option=><button type="button" key={option.id} data-hh-support-need={option.id}
        onClick={()=>{setNeed(option.id);setStep("mode");}}>
        <strong>{option.label}</strong><ArrowRight size={17} aria-hidden="true"/>
      </button>)}
    </div>}
    {step==="mode"&&<div className={css.options} role="group" aria-label={question}>
      {MODE_IDS.map(id=><button type="button" key={id} data-hh-support-mode={id}
        onClick={()=>finish(id)}>
        <span><strong>{t.modes[id].title}</strong><small>{t.modes[id].description}</small></span>
        <ArrowRight size={17} aria-hidden="true"/>
      </button>)}
    </div>}
    <p className={css.notice}>{t.notice}</p>
  </section>;
}
