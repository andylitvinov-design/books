"use client";
import {useRef,useState} from "react";
import {ArrowRight,Briefcase,Check,Mic,Sparkles,UserRound} from "lucide-react";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-magic-mirror-goal.module.css";

type Scope="me"|"business";
type Theme="energy"|"money"|"relationships"|"goals";
type GoalOption={
 id:string;theme:Theme;image:string;
 label:Record<VideoLocale,string>;request:Record<VideoLocale,string>;
};
const choices:Record<Scope,GoalOption[]>={
 me:[
  {id:"energy",theme:"energy",image:"sunbeam-flow.jpg",
   label:{en:"More Energy & Vitality",ru:"Больше энергии и сил",es:"Más energía y vitalidad"},
   request:{en:"I want more energy and vitality in my daily life.",ru:"Хочу больше энергии и жизненных сил каждый день.",es:"Quiero más energía y vitalidad en mi día a día."}},
  {id:"love",theme:"relationships",image:"wildflower-dance.jpg",
   label:{en:"Love & Relationships",ru:"Любовь и отношения",es:"Amor y relaciones"},
   request:{en:"I want to build warm, trusting relationships.",ru:"Хочу развивать тёплые, доверительные отношения.",es:"Quiero construir relaciones cálidas y de confianza."}},
  {id:"peace",theme:"energy",image:"calm-sea.jpg",
   label:{en:"Inner Peace & Balance",ru:"Спокойствие и баланс",es:"Paz interior y equilibrio"},
   request:{en:"I want more inner peace and emotional balance.",ru:"Хочу больше внутреннего спокойствия и равновесия.",es:"Quiero más paz interior y equilibrio emocional."}},
  {id:"abundance",theme:"money",image:"wealth-sunrise.jpg",
   label:{en:"Success & Abundance",ru:"Успех и достаток",es:"Éxito y abundancia"},
   request:{en:"I want to feel confident while working toward financial stability.",ru:"Хочу уверенно двигаться к финансовой стабильности.",es:"Quiero avanzar con confianza hacia la estabilidad económica."}},
 ],
 business:[
  {id:"growth",theme:"money",image:"wealth-sunrise.jpg",
   label:{en:"Growth & Revenue",ru:"Рост и доход",es:"Crecimiento e ingresos"},
   request:{en:"I want to grow my business with sustainable revenue.",ru:"Хочу развивать бизнес с устойчивым доходом.",es:"Quiero hacer crecer mi negocio con ingresos sostenibles."}},
  {id:"team",theme:"relationships",image:"wildflower-dance.jpg",
   label:{en:"Team & Trust",ru:"Команда и доверие",es:"Equipo y confianza"},
   request:{en:"I want a stronger, more trusting team.",ru:"Хочу укрепить доверие и сотрудничество в команде.",es:"Quiero un equipo más fuerte y unido."}},
  {id:"focus",theme:"goals",image:"mountain-air.jpg",
   label:{en:"Focus & Strategy",ru:"Фокус и стратегия",es:"Enfoque y estrategia"},
   request:{en:"I want clarity and focus for important business decisions.",ru:"Хочу ясности и концентрации при важных бизнес-решениях.",es:"Quiero claridad y enfoque para las decisiones de mi negocio."}},
  {id:"leadership",theme:"energy",image:"sunbeam-flow.jpg",
   label:{en:"Energy & Leadership",ru:"Энергия лидера",es:"Energía y liderazgo"},
   request:{en:"I want steady energy and confidence as a leader.",ru:"Хочу больше устойчивой энергии и уверенности как руководитель.",es:"Quiero energía estable y confianza como líder."}},
 ]
};
const labels={
 en:{subtitle:"Create Your Transformative Video",hint:"A few simple choices to shape a personal video journey.",question:"What is your main goal now?",me:"For Me",business:"For Business",custom:"Or describe your own wish",placeholder:"Describe your goal or wish…",more:"More goals",next:"Next",dictation:"Use your keyboard microphone to dictate your goal"},
 ru:{subtitle:"Создайте своё видео перемен",hint:"Несколько простых ответов помогут подобрать видео под ваш запрос.",question:"Какая у вас сейчас главная цель?",me:"Для себя",business:"Для бизнеса",custom:"Или сформулируйте свою цель",placeholder:"Опишите вашу цель или желание…",more:"Другие цели",next:"Далее",dictation:"Для диктовки используйте микрофон клавиатуры"},
 es:{subtitle:"Crea tu vídeo de transformación",hint:"Unas elecciones sencillas darán forma a tu vídeo personal.",question:"¿Cuál es tu principal objetivo ahora?",me:"Para mí",business:"Para mi negocio",custom:"O escribe tu propio deseo",placeholder:"Describe tu objetivo o deseo…",more:"Más objetivos",next:"Siguiente",dictation:"Usa el micrófono del teclado para dictar tu objetivo"}
} as const;

export function MandalaMagicMirrorTitle({locale}:{locale:VideoLocale}){
 const t=labels[locale];
 return <header className={css.title} data-hh-mirror-title>
  <Sparkles size={24} aria-hidden="true"/>
  <h2>Magic Mirror</h2>
  <strong>{t.subtitle}</strong>
  <p>{t.hint}</p>
 </header>;
}
export function MandalaMagicMirrorGoal({locale,wish,disabled,onWishChange,onSelectCategory,onContinue,onExpand}:{
 locale:VideoLocale;wish:string;disabled:boolean;
 onWishChange:(value:string)=>void;
 onSelectCategory:(theme:Theme)=>void;
 onContinue:()=>void;onExpand:()=>void;
}){
 const [scope,setScope]=useState<Scope>("me");
 const [selectedId,setSelectedId]=useState("energy");
 const [autoPrompt,setAutoPrompt]=useState<string|null>(null);
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const t=labels[locale];
 const available=choices[scope];
 const selected=available.find(item=>item.id===selectedId)??available[0];
 // The visitor's own prose always wins; auto-filled copy should follow a changed
 // photographic goal instead of surviving as an unrelated stale wish.
 const clearAutoPrompt=()=>{
  if(autoPrompt&&wish===autoPrompt)onWishChange("");
  setAutoPrompt(null);
 };
 const switchScope=(next:Scope)=>{
  if(disabled||next===scope)return;
  clearAutoPrompt();
  setScope(next);
  setSelectedId(choices[next][0].id);
  onSelectCategory(choices[next][0].theme);
 };
 const next=()=>{
  if(disabled)return;
  onSelectCategory(selected.theme);
  if(!wish.trim()){setAutoPrompt(selected.request[locale]);onWishChange(selected.request[locale]);}
  onContinue();
 };
 return <section className={css.goals} data-hh-mirror-goals data-hh-mirror-mode={scope}
  aria-label={t.question}>
  <div className={css.audience} role="group" aria-label={locale==="ru"?"Для кого видео":locale==="es"?"Tipo de vídeo":"Video purpose"}>
   <button type="button" data-hh-mirror-audience="me" aria-pressed={scope==="me"} disabled={disabled}
    onClick={()=>switchScope("me")}><UserRound size={19} aria-hidden="true"/>{t.me}</button>
   <button type="button" data-hh-mirror-audience="business" aria-pressed={scope==="business"} disabled={disabled}
    onClick={()=>switchScope("business")}><Briefcase size={19} aria-hidden="true"/>{t.business}</button>
  </div>
  <div className={css.progress} aria-label={locale==="ru"?"Шаг 1 из 5":locale==="es"?"Paso 1 de 5":"Step 1 of 5"}>
   <span className={css.dots} aria-hidden="true"><i data-active="true"/><i/><i/><i/><i/></span>
   <span>{locale==="ru"?"Шаг 1 из 5":locale==="es"?"Paso 1 de 5":"Step 1 of 5"}</span>
  </div>
  <h3 className={css.question}>{t.question}</h3>
  <div className={css.cards} role="group" aria-label={t.question}>
   {available.map(item=><button type="button" key={item.id} className={css.card}
    data-hh-mirror-goal-choice={item.id} disabled={disabled}
    aria-pressed={selectedId===item.id} onClick={()=>{
     clearAutoPrompt();setSelectedId(item.id);onSelectCategory(item.theme);
    }}>
    <img src={"/videos/holistic-house/film-collection-v2/"+item.image}
     alt="" aria-hidden="true" loading="lazy"/>
    <span className={css.cardLabel}>{item.label[locale]}</span>
    {selectedId===item.id?<Check className={css.check} size={19} aria-hidden="true"/>:null}
   </button>)}
  </div>
  <button type="button" className={css.more} data-hh-mirror-more-goals disabled={disabled}
   onClick={onExpand}>{t.more} <ArrowRight size={16} aria-hidden="true"/></button>
  <label className={css.promptLabel} htmlFor="hh-mirror-own-wish">{t.custom}</label>
  <div className={css.promptRow}>
   <Sparkles size={19} aria-hidden="true"/>
   <textarea id="hh-mirror-own-wish" ref={inputRef}
    data-hh-mirror-wish rows={2} maxLength={500} disabled={disabled}
    value={wish} onChange={event=>{setAutoPrompt(null);onWishChange(event.currentTarget.value);}}
    placeholder={t.placeholder}/>
   <span className={css.microphone} title={t.dictation}><Mic size={23} aria-hidden="true"/></span>
  </div>
  <button className={css.next} type="button" data-hh-mirror-next disabled={disabled}
   onClick={next}><span>{t.next}</span><ArrowRight size={23} aria-hidden="true"/></button>
 </section>;
}
