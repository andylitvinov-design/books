"use client";

import {useRef,useState} from "react";
import {ArrowLeft,ArrowRight,Briefcase,Check,Ellipsis,Gift,Mic,Sparkles,UserRound} from "lucide-react";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
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
 id:string;theme:Theme;categoryId:MirrorCategory;image:string;defaultTopicId:string;
 request:Record<VideoLocale,string>;
};
const choices:Record<MirrorScope,GoalOption[]>={
 me:[
  {id:"stress",theme:"health",categoryId:"stress-anxiety",image:"calm-sea.jpg",defaultTopicId:"low-energy",
   request:{en:"I want to release stress and restore my energy.",ru:"Хочу снизить стресс и восстановить энергию.",es:"Quiero aliviar el estrés y recuperar energía."}},
  {id:"love",theme:"relationships",categoryId:"love-relationships",image:"wildflower-dance.jpg",defaultTopicId:"emotional-intimacy",
   request:{en:"I want loving, trusting relationships.",ru:"Хочу тёплых и доверительных отношений.",es:"Quiero relaciones amorosas y de confianza."}},
  {id:"money",theme:"money",categoryId:"goals-money",image:"wealth-sunrise.jpg",defaultTopicId:"financial-stability",
   request:{en:"I want greater confidence and financial stability.",ru:"Хочу уверенности и финансовой устойчивости.",es:"Quiero más confianza y estabilidad financiera."}},
  {id:"growth",theme:"goals",categoryId:"energy-confidence",image:"mountain-air.jpg",defaultTopicId:"personal-growth",
   request:{en:"I want personal growth and a clearer direction.",ru:"Хочу личностного развития и ясного направления.",es:"Quiero crecer personalmente y tener una dirección clara."}},
 ],
 business:[
  {id:"stress",theme:"health",categoryId:"stress-anxiety",image:"calm-sea.jpg",defaultTopicId:"work-stress",
   request:{en:"I want less work stress and more energy.",ru:"Хочу меньше рабочего стресса и больше энергии.",es:"Quiero menos estrés laboral y más energía."}},
  {id:"love",theme:"relationships",categoryId:"love-relationships",image:"wildflower-dance.jpg",defaultTopicId:"rebuilding-trust",
   request:{en:"I want trust and supportive relationships at work.",ru:"Хочу больше доверия и поддержки в работе.",es:"Quiero más confianza y apoyo en el trabajo."}},
  {id:"money",theme:"money",categoryId:"goals-money",image:"wealth-sunrise.jpg",defaultTopicId:"income-growth",
   request:{en:"I want stable income and lasting success.",ru:"Хочу устойчивого дохода и успеха.",es:"Quiero ingresos estables y éxito duradero."}},
  {id:"growth",theme:"goals",categoryId:"energy-confidence",image:"mountain-air.jpg",defaultTopicId:"entrepreneurship",
   request:{en:"I want to develop my business sustainably.",ru:"Хочу устойчиво развивать свой бизнес.",es:"Quiero desarrollar mi negocio de manera sostenible."}},
 ],
 present:[
  {id:"stress",theme:"health",categoryId:"stress-anxiety",image:"calm-sea.jpg",defaultTopicId:"recovery-after-load",
   request:{en:"I want to offer rest and support to someone I care about.",ru:"Хочу подарить отдых и поддержку близкому человеку.",es:"Quiero regalar descanso y apoyo a alguien querido."}},
  {id:"love",theme:"relationships",categoryId:"love-relationships",image:"wildflower-dance.jpg",defaultTopicId:"emotional-intimacy",
   request:{en:"I want to express love and gratitude.",ru:"Хочу выразить любовь и благодарность.",es:"Quiero expresar amor y gratitud."}},
  {id:"money",theme:"money",categoryId:"goals-money",image:"wealth-sunrise.jpg",defaultTopicId:"self-confidence",
   request:{en:"I want to encourage someone's confidence and success.",ru:"Хочу поддержать уверенность и успех близкого.",es:"Quiero animar la confianza y el éxito de alguien."}},
  {id:"growth",theme:"goals",categoryId:"energy-confidence",image:"mountain-air.jpg",defaultTopicId:"life-transitions",
   request:{en:"I want to celebrate a new chapter and personal growth.",ru:"Хочу поздравить с новым этапом и развитием.",es:"Quiero celebrar una nueva etapa y el crecimiento personal."}},
 ],
};
const categoryTheme:Record<MirrorCategory,Theme>={
 "goals-money":"money","love-relationships":"relationships",
 "energy-confidence":"goals","stress-anxiety":"health",
};
const labels={
 en:{subtitle:"Create Your Transformative Video",hint:"A few choices for a video shaped around your wish.",
  question:"What is your main goal now?",me:"For Me",business:"For Work",present:"Present",
  placeholder:"Describe your goal or wish…",alternative:"Or choose what matters now",
  sub:"Choose a subcategory",topic:"Choose a topic",next:"Next",back:"Back",
  advanced:"Advanced choices",dictation:"Use your phone keyboard microphone to dictate"},
 ru:{subtitle:"Создайте своё видео перемен",hint:"Несколько ответов — и видео под ваше желание.",
  question:"Какая у вас сейчас главная цель?",me:"Для себя",business:"Для работы",present:"Подарок",
  placeholder:"Опишите цель или желание…",alternative:"Или выберите то, что актуально",
  sub:"Выберите подкатегорию",topic:"Выберите тему",next:"Далее",back:"Назад",
  advanced:"Расширенные настройки",dictation:"Для диктовки используйте микрофон клавиатуры"},
 es:{subtitle:"Crea tu vídeo de transformación",hint:"Unas elecciones para un vídeo sobre tu deseo.",
  question:"¿Cuál es tu objetivo principal?",me:"Para mí",business:"Para el trabajo",present:"Regalo",
  placeholder:"Describe tu objetivo o deseo…",alternative:"O elige lo que importa ahora",
  sub:"Elige una subcategoría",topic:"Elige un tema",next:"Siguiente",back:"Atrás",
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
 const [selectedId,setSelectedId]=useState("stress");
 const [step,setStep]=useState<1|2|3>(1);
 const [subcategoryId,setSubcategoryId]=useState("");
 const [blocked,setBlocked]=useState(false);
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const t=labels[locale],available=choices[scope];
 const categoryLabels=listMyTubeCategories(locale);
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
  const curated=getMyTubeTopic(selected.defaultTopicId);
  const valid=match&&match.category.id===classified?.categoryId&&
   match.subcategory.id===classified?.subcategoryId;
  // Explicitly approved category-specific defaults, never array[0] from an
  // unrelated subcategory. A typed wish can select another canonical topic.
  const inferred=valid?match:curated;
  if(!inferred||!["goals-money","love-relationships","energy-confidence","stress-anxiety"]
    .includes(inferred.category.id)){setBlocked(true);return;}
  const categoryId=inferred.category.id as MirrorCategory;
  const subId=inferred.subcategory.id;
  const topicId=inferred.topic.id;
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
   <span data-hh-mirror-stage-label>{step===1?(locale==="ru"?"Категория":locale==="es"?"Categoría":"Category"):
    step===2?(locale==="ru"?"Подкатегория":locale==="es"?"Subcategoría":"Subcategory"):
    (locale==="ru"?"Тема":locale==="es"?"Tema":"Topic")} · {step}/3</span>
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
      <span className={css.cardLabel}>{categoryLabels.find(category=>category.id===item.categoryId)?.label||item.id}</span>
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
