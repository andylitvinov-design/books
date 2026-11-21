"use client";

import {useRef,useState} from "react";
import {ArrowLeft,ArrowRight,Briefcase,Check,Ellipsis,Gift,Mic,Sparkles,UserRound} from "lucide-react";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import {listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {classifyMyTubeRequest} from "@/lib/mandala/mytube-prompt-classifier.mjs";
import css from "./mandala-magic-mirror-goal.module.css";

export type MirrorScope="me"|"business"|"present";
export type MirrorCategory="goals-money"|"love-relationships"|"energy-confidence"|"stress-anxiety";
type Theme="energy"|"money"|"relationships"|"goals"|"health";
export type MirrorResolution={
 scope:MirrorScope;categoryId:MirrorCategory;subcategoryId:string;topicId:string;
 theme:Theme;wish:string;goalChoiceId:string;
};
type GoalOption={
 id:string;theme:Theme;categoryId:MirrorCategory;image:string;
 label:Record<VideoLocale,string>;request:Record<VideoLocale,string>;
};
const choices:Record<MirrorScope,GoalOption[]>={
 me:[
  {id:"energy",theme:"energy",categoryId:"energy-confidence",image:"sunbeam-flow.jpg",
   label:{en:"More Energy & Vitality",ru:"Больше энергии и сил",es:"Más energía y vitalidad"},
   request:{en:"I want more energy and vitality.",ru:"Хочу больше энергии и жизненных сил.",es:"Quiero más energía y vitalidad."}},
  {id:"love",theme:"relationships",categoryId:"love-relationships",image:"wildflower-dance.jpg",
   label:{en:"Love & Relationships",ru:"Любовь и отношения",es:"Amor y relaciones"},
   request:{en:"I want warm, trusting relationships.",ru:"Хочу тёплых и доверительных отношений.",es:"Quiero relaciones cálidas y de confianza."}},
  {id:"peace",theme:"health",categoryId:"stress-anxiety",image:"calm-sea.jpg",
   label:{en:"Inner Peace & Balance",ru:"Спокойствие и баланс",es:"Paz interior y equilibrio"},
   request:{en:"I want more calm and balance.",ru:"Хочу больше спокойствия и равновесия.",es:"Quiero más calma y equilibrio."}},
  {id:"abundance",theme:"money",categoryId:"goals-money",image:"wealth-sunrise.jpg",
   label:{en:"Success & Abundance",ru:"Успех и достаток",es:"Éxito y abundancia"},
   request:{en:"I want more stability and success.",ru:"Хочу больше устойчивости и успеха.",es:"Quiero más estabilidad y éxito."}},
 ],
 business:[
  {id:"growth",theme:"money",categoryId:"goals-money",image:"wealth-sunrise.jpg",
   label:{en:"Growth & Revenue",ru:"Рост и доход",es:"Crecimiento e ingresos"},
   request:{en:"I want sustainable business growth.",ru:"Хочу устойчивого роста бизнеса.",es:"Quiero un crecimiento empresarial sostenible."}},
  {id:"team",theme:"relationships",categoryId:"love-relationships",image:"wildflower-dance.jpg",
   label:{en:"Team & Trust",ru:"Команда и доверие",es:"Equipo y confianza"},
   request:{en:"I want more trust in my team.",ru:"Хочу больше доверия в команде.",es:"Quiero más confianza en mi equipo."}},
  {id:"focus",theme:"goals",categoryId:"goals-money",image:"mountain-air.jpg",
   label:{en:"Focus & Strategy",ru:"Фокус и стратегия",es:"Enfoque y estrategia"},
   request:{en:"I want clarity in my work decisions.",ru:"Хочу ясности в рабочих решениях.",es:"Quiero claridad al decidir en mi trabajo."}},
  {id:"leadership",theme:"energy",categoryId:"energy-confidence",image:"sunbeam-flow.jpg",
   label:{en:"Energy & Leadership",ru:"Энергия лидера",es:"Energía y liderazgo"},
   request:{en:"I want energy and confidence as a leader.",ru:"Хочу энергии и уверенности как лидер.",es:"Quiero energía y confianza como líder."}},
 ],
 present:[
  {id:"birthday",theme:"energy",categoryId:"energy-confidence",image:"sunbeam-flow.jpg",
   label:{en:"Birthday & Joy",ru:"День рождения",es:"Cumpleaños y alegría"},
   request:{en:"I want to celebrate a special birthday.",ru:"Хочу подарить тёплое поздравление с днём рождения.",es:"Quiero celebrar un cumpleaños especial."}},
  {id:"gratitude",theme:"relationships",categoryId:"love-relationships",image:"wildflower-dance.jpg",
   label:{en:"Love & Gratitude",ru:"Любовь и благодарность",es:"Amor y gratitud"},
   request:{en:"I want to express love and gratitude.",ru:"Хочу выразить любовь и благодарность.",es:"Quiero expresar amor y gratitud."}},
  {id:"support",theme:"health",categoryId:"stress-anxiety",image:"calm-sea.jpg",
   label:{en:"Care & Support",ru:"Забота и поддержка",es:"Cariño y apoyo"},
   request:{en:"I want to encourage someone I care about.",ru:"Хочу поддержать близкого человека.",es:"Quiero apoyar a alguien querido."}},
  {id:"anniversary",theme:"goals",categoryId:"goals-money",image:"wealth-sunrise.jpg",
   label:{en:"Anniversary & Wishes",ru:"Годовщина и пожелания",es:"Aniversario y deseos"},
   request:{en:"I want to celebrate an anniversary.",ru:"Хочу поздравить с годовщиной.",es:"Quiero celebrar un aniversario."}},
 ],
};
const categoryTheme:Record<MirrorCategory,Theme>={
 "goals-money":"money","love-relationships":"relationships",
 "energy-confidence":"energy","stress-anxiety":"health",
};
const labels={
 en:{subtitle:"Create Your Transformative Video",hint:"A few choices for a video shaped around your wish.",
  question:"What is your main goal now?",me:"For Me",business:"For Work",present:"Present",
  placeholder:"Describe your goal or wish…",alternative:"Or choose what matters now",
  sub:"What matters most?",topic:"Choose a closer focus",next:"Next",back:"Back",
  advanced:"Advanced choices",dictation:"Use your phone keyboard microphone to dictate"},
 ru:{subtitle:"Создайте своё видео перемен",hint:"Несколько ответов — и видео под ваше желание.",
  question:"Какая у вас сейчас главная цель?",me:"Для себя",business:"Для работы",present:"Подарок",
  placeholder:"Опишите цель или желание…",alternative:"Или выберите то, что актуально",
  sub:"Что для вас важнее?",topic:"Уточните направление",next:"Далее",back:"Назад",
  advanced:"Расширенные настройки",dictation:"Для диктовки используйте микрофон клавиатуры"},
 es:{subtitle:"Crea tu vídeo de transformación",hint:"Unas elecciones para un vídeo sobre tu deseo.",
  question:"¿Cuál es tu objetivo principal?",me:"Para mí",business:"Para el trabajo",present:"Regalo",
  placeholder:"Describe tu objetivo o deseo…",alternative:"O elige lo que importa ahora",
  sub:"¿Qué es lo más importante?",topic:"Elige un enfoque",next:"Siguiente",back:"Atrás",
  advanced:"Opciones avanzadas",dictation:"Usa el micrófono del teclado para dictar"},
} as const;

export function MandalaMagicMirrorTitle({locale}:{locale:VideoLocale}){
 const t=labels[locale];
 return <header className={css.title} data-hh-mirror-title>
  <Sparkles size={22} aria-hidden="true"/>
  <h2>Magic Mirror</h2>
  <strong>{t.subtitle}</strong>
  <p>{t.hint}</p>
 </header>;
}

export function MandalaMagicMirrorGoal({locale,wish,disabled,onWishChange,onSelectCategory,
 onStepChange,onScopeChange,onComplete,onExpand}:{
 locale:VideoLocale;wish:string;disabled:boolean;
 onWishChange:(value:string)=>void;onSelectCategory:(theme:Theme)=>void;
 onStepChange:(step:1|2|3)=>void;onScopeChange:(scope:MirrorScope)=>void;
 onComplete:(value:MirrorResolution)=>boolean|void;onExpand:()=>void;
}){
 const [scope,setScope]=useState<MirrorScope>("me");
 const [selectedId,setSelectedId]=useState("energy");
 const [step,setStep]=useState<1|2|3>(1);
 const [subcategoryId,setSubcategoryId]=useState("");
 const [blocked,setBlocked]=useState(false);
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const t=labels[locale],available=choices[scope];
 const selected=available.find(item=>item.id===selectedId)??available[0];
 const subcategories=listMyTubeSubcategories(selected.categoryId,locale);
 const topics=subcategoryId?listMyTubeTopics(selected.categoryId,subcategoryId,locale):[];
 const changeStep=(next:1|2|3)=>{setStep(next);onStepChange(next);setBlocked(false);};
 const switchScope=(next:MirrorScope)=>{
  if(disabled||scope===next)return;
  setScope(next);setSelectedId(choices[next][0].id);setSubcategoryId("");
  onScopeChange(next);onSelectCategory(choices[next][0].theme);changeStep(1);
 };
 const finish=(categoryId:MirrorCategory,subId:string,topicId:string,goalText:string)=>{
  const found=getMyTubeTopic(topicId);
  if(!found||found.category.id!==categoryId||found.subcategory.id!==subId){
   setBlocked(true);return;
  }
  const theme=categoryId===selected.categoryId?selected.theme:categoryTheme[categoryId];
  const accepted=onComplete({scope,categoryId,subcategoryId:subId,topicId,theme,
    wish:goalText.slice(0,500),goalChoiceId:selected.id});
  if(accepted===false){setBlocked(true);return;}
  setSubcategoryId("");changeStep(1);
 };
 const autoNext=()=>{
  if(disabled)return;
  const goalText=wish.trim()||selected.request[locale];
  // Existing local taxonomy classifier: no API, invented diagnosis or render.
  // An ambiguous request uses the visibly selected card as a reversible default.
  const classified=wish.trim()?classifyMyTubeRequest(wish,locale):null;
  const match=classified?.topicId?getMyTubeTopic(classified.topicId):null;
  const fallbackSub=subcategories[0];
  const fallbackTopic=fallbackSub&&listMyTubeTopics(selected.categoryId,fallbackSub.id,locale)[0];
  const valid=match&&match.category.id===classified?.categoryId&&
   match.subcategory.id===classified?.subcategoryId;
  const categoryId=(valid?match.category.id:selected.categoryId) as MirrorCategory;
  const subId=valid?match.subcategory.id:fallbackSub?.id;
  const topicId=valid?match.topic.id:fallbackTopic?.id;
  if(!subId||!topicId){setBlocked(true);return;}
  finish(categoryId,subId,topicId,goalText);
 };
 return <section className={css.goals} data-hh-mirror-goals data-hh-mirror-mode={scope}
  data-hh-mirror-step={step} aria-label={t.question}>
  <div className={css.audience} role="group" aria-label={t.question}>
   {(["me","business","present"] as const).map(item=>{
    const Icon=item==="me"?UserRound:item==="business"?Briefcase:Gift;
    return <button type="button" key={item} data-hh-mirror-audience={item}
     aria-pressed={scope===item} disabled={disabled} onClick={()=>switchScope(item)}>
     <Icon size={17} aria-hidden="true"/>{t[item]}
    </button>;
   })}
  </div>
  <div className={css.progress} aria-label={(locale==="ru"?"Шаг ":locale==="es"?"Paso ":"Step ")+step+" / 5"}>
   <span className={css.dots} aria-hidden="true">{[1,2,3,4,5].map(index=>
    <i key={index} data-active={index<=step?"true":"false"}/>)}</span>
   <span>{locale==="ru"?"Шаг ":locale==="es"?"Paso ":"Step "}{step} {locale==="ru"?"из":locale==="es"?"de":"of"} 5</span>
  </div>
  {step>1?<button type="button" className={css.back} data-hh-mirror-back
    disabled={disabled} onClick={()=>changeStep(step===3?2:1)}>
    <ArrowLeft size={17} aria-hidden="true"/>{t.back}
   </button>:<button type="button" className={css.more} data-hh-mirror-more-goals
     disabled={disabled} onClick={onExpand} aria-label={t.advanced} title={t.advanced}>
     <Ellipsis size={20} aria-hidden="true"/>
   </button>}
  <h3 className={css.question}>{step===1?t.question:step===2?t.sub:t.topic}</h3>
  {step===1?<>
   <div className={css.entry}>
    <div className={css.promptRow}>
     <Sparkles size={18} aria-hidden="true"/>
     <textarea id="hh-mirror-own-wish" ref={inputRef} rows={1} maxLength={500}
      data-hh-mirror-wish disabled={disabled} value={wish}
      onChange={event=>onWishChange(event.currentTarget.value)}
      placeholder={t.placeholder} aria-label={t.placeholder}/>
     <span className={css.microphone} title={t.dictation}><Mic size={20} aria-hidden="true"/></span>
    </div>
    <button className={css.next} type="button" data-hh-mirror-next
      disabled={disabled} onClick={autoNext} aria-label={t.next}>
      <span>{t.next}</span><ArrowRight size={18} aria-hidden="true"/>
    </button>
   </div>
   <p className={css.alternative}>{t.alternative}</p>
   <div className={css.cards} role="group" aria-label={t.alternative}>
    {available.map(item=><button type="button" key={item.id} className={css.card}
      data-hh-mirror-goal-choice={item.id} disabled={disabled}
      aria-pressed={selectedId===item.id}
      onClick={()=>{setSelectedId(item.id);setSubcategoryId("");
       onSelectCategory(item.theme);changeStep(2);}}>
      <img src={"/videos/holistic-house/film-collection-v2/"+item.image}
       alt="" aria-hidden="true" loading="lazy"/>
      <span className={css.cardLabel}>{item.label[locale]}</span>
      {selectedId===item.id?<Check className={css.check} size={18} aria-hidden="true"/>:null}
    </button>)}
   </div>
  </>:<div className={css.cards} role="group" aria-label={step===2?t.sub:t.topic}>
   {step===2?subcategories.map((item,index)=><button type="button" className={css.card}
     key={item.id} data-hh-mirror-subcategory={item.id} disabled={disabled}
     onClick={()=>{setSubcategoryId(item.id);changeStep(3);}}>
     <img src={"/videos/holistic-house/film-collection-v2/"+
      available[index%available.length].image} alt="" loading="lazy"/>
     <span className={css.cardLabel}>{item.label}</span>
    </button>):topics.map((item,index)=><button type="button" className={css.card}
     key={item.id} data-hh-mirror-topic={item.id} disabled={disabled}
     onClick={()=>finish(selected.categoryId,subcategoryId,item.id,
      wish.trim()||selected.request[locale])}>
     <img src={"/videos/holistic-house/film-collection-v2/"+
      available[index%available.length].image} alt="" loading="lazy"/>
     <span className={css.cardLabel}>{item.label}</span>
    </button>)}
   </div>}
  {blocked?<p className={css.error} role="alert">
   {locale==="ru"?"Пожалуйста, выберите тему ещё раз.":
    locale==="es"?"Selecciona el tema otra vez.":"Please select the topic again."}
  </p>:null}
 </section>;
}
