"use client";
import Link from "next/link";
import {ArrowRight, Flower2, MessageCircle, Sparkles, UsersRound} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {useAliPersona} from "@/components/app/use-ali-persona";
import css from "./assistant-start.module.css";
const COPY={
 en:{hello:"Hi!",title:"Let's explore together",lead:"Ask me anything — find clarity, support and new possibilities.",disclosure:"AI assistant, not a person or therapist",coach:"Get AI Coach Session",reiki:"Get Reiki Course (free)",clarity:"Request Clarity Session with Andy",ask:"Ask another question"},
 ru:{hello:"Привет!",title:"Давайте исследуем вместе",lead:"Задайте вопрос — найдём ясность, поддержку и новые возможности.",disclosure:"ИИ-помощник, не человек и не психотерапевт",coach:"Сессия с ИИ-коучем",reiki:"Курс Рейки (бесплатно)",clarity:"Запросить Clarity-сессию с Андреем",ask:"Задать другой вопрос"},
 es:{hello:"¡Hola!",title:"Exploremos juntos",lead:"Pregunta lo que quieras: encuentra claridad, apoyo y nuevas posibilidades.",disclosure:"Asistente IA, no una persona ni terapeuta",coach:"Sesión con coach IA",reiki:"Curso de Reiki (gratis)",clarity:"Solicitar sesión Clarity con Andy",ask:"Hacer otra pregunta"},
} as const;
const CARDS=[
 {id:"coach",path:"my-coach",art:"/images/holistic-house/ideas-zen-landscape.svg",icon:UsersRound},
 {id:"reiki",path:"academy/principles-of-energywork",art:"/images/holistic-house/reiki-practitioner-sunrise.webp",icon:Flower2},
 {id:"clarity",path:"my-coach/real/andy-litvinov",art:"/images/holistic-house/messenger-zen-stones.svg",icon:Sparkles},
] as const;
export function AssistantStart({locale,onAsk,pageHelp=false,section="general"}:{locale:PublicLocale;onAsk:()=>void;pageHelp?:boolean;section?:string}){
 const t=COPY[locale];
 const {persona}=useAliPersona();
 return <section className={css.root} data-hh-assistant-start data-hh-ihelp-welcome={pageHelp||undefined} data-hh-ihelp-visual-section={pageHelp?section:undefined}>
   <div className={css.hero} data-hh-ihelp-hero={pageHelp||undefined}>
     <img className={css.portrait} src={persona.image} alt="" width={320} height={360} loading="eager"/>
     <div className={css.copy}><p className={css.identity}>{persona.name[locale]} · AI</p><h2><em>{t.hello} <Sparkles size={23} aria-hidden="true"/></em>{t.title}</h2><p>{t.lead}</p><small>{t.disclosure}</small></div>
   </div>
   <div className={css.cards} data-hh-assistant-service-cards>
     {CARDS.map(({id,path,art,icon:Icon})=><Link key={id} href={"/"+locale+"/"+path} prefetch={false} className={css.card} data-hh-assistant-service={id}>
       <span className={css.art}><img src={art} alt="" width={160} height={100}/><span><Icon size={21} aria-hidden="true"/></span></span>
       <strong>{t[id]}</strong><span className={css.arrow}><ArrowRight size={19} aria-hidden="true"/></span>
     </Link>)}
   </div>
   <button className={css.ask} type="button" data-hh-ihelp-ask={pageHelp||undefined} onClick={onAsk}><MessageCircle size={20} aria-hidden="true"/>{t.ask}</button>
 </section>;
}
