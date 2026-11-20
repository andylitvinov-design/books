"use client";
import {useMemo,useRef,useState} from "react";
import type {Dispatch,SetStateAction} from "react";
import {ArrowLeft,ArrowRight,Check,Heart,Leaf,Sparkles,Zap} from "lucide-react";
import {listMeaningAxes} from "@/lib/mandala/meaning-emotion/idea-engine.mjs";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-personalization.module.css";

export type VideoGoalProfile={name?:string;current:string[];desired:string[];axes:string[];energy:number;desiredLevel:number};
export const DEFAULT_VIDEO_GOAL_PROFILE:VideoGoalProfile={
 name:"",current:["fatigue"],desired:["calm"],axes:["meaning"],energy:4,desiredLevel:6,
};
type Mood="sad"|"calm"|"happy";
type Axis={id:string;label:string;description:string};
type Choice={id:string;ru:string;en:string;es:string;meaning:string};
const currentChoices:Choice[]=[
 ["fatigue","Усталость","Tired","Cansancio","fatigue"],
 ["tension","Напряжение","Tense","Tensión","anxiety"],
 ["sadness","Грусть","Sad","Tristeza","sadness"],
 ["overwhelmed","Перегрузка","Overwhelmed","Agobio","helplessness"],
 ["uncertain","Неуверенность","Uncertain","Incertidumbre","confusion"],
 ["irritated","Раздражение","Irritated","Irritación","anger"],
 ["loneliness","Одиночество","Lonely","Soledad","loneliness"],
 ["selfcritical","Самокритика","Self-critical","Autocrítica","shame"],
 ["afraid","Страх","Afraid","Miedo","anxiety"],
 ["drained","Нет сил","Drained","Sin fuerzas","fatigue"],
 ["discouraged","Уныние","Discouraged","Desánimo","sadness"],
 ["stuck","Застой","Stuck","Bloqueo","helplessness"],
 ["content","Доволен","Content","En paz","present"],
 ["hopeful","С надеждой","Hopeful","Esperanzado","present"],
 ["curious","Любопытство","Curious","Curiosidad","present"],
 ["motivated","Вдохновение","Motivated","Motivación","present"],
 ["connected","В контакте","Connected","Conectado","present"],
 ["grateful","Благодарность","Grateful","Gratitud","present"],
 ["confident","Уверенность","Confident","Confianza","present"],
 ["excited","Воодушевление","Excited","Entusiasmo","present"],
].map(([id,ru,en,es,meaning])=>({id,ru,en,es,meaning}));
const desiredChoices:Choice[]=[
 ["calm","Спокойствие","Calm","Calma","calm"],
 ["safe","Безопасность","Safe","Seguridad","calm"],
 ["energetic","Энергия","Energetic","Energía","vitality"],
 ["balanced","Равновесие","Balanced","Equilibrio","calm"],
 ["connected","Близость","Connected","Conexión","connection"],
 ["joyful","Радость","Joyful","Alegría","hope"],
 ["confident","Уверенность","Confident","Confianza","confidence"],
 ["freedom","Свобода","Free","Libertad","boundaries"],
 ["clarity","Ясность","Clear","Claridad","clarity"],
 ["accepted","Принятие","Accepted","Aceptación","self_acceptance"],
 ["comforted","Утешение","Comforted","Consuelo","self_acceptance"],
 ["understood","Понимание","Understood","Comprensión","connection"],
 ["supported","Поддержка","Supported","Apoyo","connection"],
 ["rested","Отдых","Rested","Descanso","vitality"],
 ["hopeful","Надежда","Hopeful","Esperanza","hope"],
 ["inspired","Вдохновение","Inspired","Inspiración","vitality"],
 ["playful","Лёгкость","Playful","Ligereza","hope"],
 ["fulfilled","Наполненность","Fulfilled","Plenitud","clarity"],
].map(([id,ru,en,es,meaning])=>({id,ru,en,es,meaning}));
const currentByMood:Record<Mood,string[]>={
 sad:["sadness","loneliness","afraid","drained","discouraged","overwhelmed","selfcritical","stuck"],
 calm:["fatigue","tension","sadness","overwhelmed","uncertain","irritated","loneliness","selfcritical"],
 happy:["content","hopeful","curious","motivated","connected","grateful","confident","excited"],
};
const desiredByMood:Record<Mood,string[]>={
 sad:["comforted","understood","safe","supported","rested","accepted","hopeful","connected"],
 calm:["calm","safe","energetic","balanced","connected","joyful","confident","freedom","clarity","accepted"],
 happy:["joyful","inspired","energetic","confident","freedom","playful","hopeful","fulfilled"],
};
const moods:[Mood,string][]=[["sad","☹"],["calm","☺"],["happy","☻"]];
const copy={
 ru:{step:"Идеи · Персонализация",title:"Персонализируйте своё видео",intro:"Выберите своё состояние, желаемое чувство и то, что хотите укрепить.",now:"Как я чувствую себя сейчас?",want:"Как я хотел бы себя чувствовать?",strength:"Что я хочу укрепить?",choose:"Выберите один или несколько вариантов",axisHint:"Выберите одно или несколько направлений",energy:"Моя энергия сейчас",level:"Мой желаемый уровень",more:"Прокрутите для других вариантов",nameQuestion:"Как вас зовут?",namePlaceholder:"Ваше имя",nameHint:"Необязательно · имя появится в последней фразе поддержки.",back:"Назад к цели",previous:"Назад",quizStep:"Шаг",forward:"Продолжить",next:"Выбрать цель",moods:{sad:"Грустное",calm:"Спокойное",happy:"Радостное"}},
 en:{step:"Ideas · Personalization",title:"Personalize your video",intro:"Choose how you feel now, how you would like to feel, and what you want to strengthen.",now:"How do I feel now?",want:"How would I like to feel?",strength:"What would I like to strengthen?",choose:"Choose one or more phrases",axisHint:"Choose one or more directions",energy:"My energy level now",level:"My desired level",more:"Scroll for more choices",nameQuestion:"What is your name?",namePlaceholder:"Your first name",nameHint:"Optional · the final suggested phrase will use your name.",back:"Back to goal",previous:"Back",quizStep:"Step",forward:"Continue",next:"Choose your goal",moods:{sad:"Sad",calm:"Calm",happy:"Happy"}},
 es:{step:"Ideas · Personalización",title:"Personaliza tu vídeo",intro:"Elige cómo te sientes, cómo te gustaría sentirte y qué quieres fortalecer.",now:"¿Cómo me siento ahora?",want:"¿Cómo me gustaría sentirme?",strength:"¿Qué me gustaría fortalecer?",choose:"Elige una o varias frases",axisHint:"Elige una o varias direcciones",energy:"Mi energía actual",level:"Mi nivel deseado",more:"Desliza para ver más",nameQuestion:"¿Cómo te llamas?",namePlaceholder:"Tu nombre",nameHint:"Opcional · la última frase de apoyo incluirá tu nombre.",back:"Volver al objetivo",previous:"Atrás",quizStep:"Paso",forward:"Continuar",next:"Elegir objetivo",moods:{sad:"Triste",calm:"Tranquilo",happy:"Alegre"}},
} as const;
export const goalCurrentMeaningId=(id:string)=>currentChoices.find(c=>c.id===id)?.meaning||"present";
export const goalDesiredMeaningId=(id:string)=>desiredChoices.find(c=>c.id===id)?.meaning||"calm";
// Only selected/confirmed answers may enter Concept. Defaults alone are not
// evidence of a person's emotional state or wishes.
export function summarizeVideoGoalProfile(value:VideoGoalProfile,locale:VideoLocale){
 const current=value.current.map(id=>currentChoices.find(c=>c.id===id)?.[locale]).filter(Boolean).join(" · ");
 const desired=value.desired.map(id=>desiredChoices.find(c=>c.id===id)?.[locale]).filter(Boolean).join(" · ");
 const axes=listMeaningAxes(locale);
 const focus=value.axes.map(id=>axes.find(c=>c.id===id)?.label).filter(Boolean).join(" · ");
 return {currentState:current,desiredState:desired,focus,
  currentIds:[...value.current],desiredIds:[...value.desired],focusIds:[...value.axes],
  energyStart:value.energy,energyTarget:value.desiredLevel};
}

export function MandalaVideoPersonalization({locale,value,onChange,onBack,onContinue,disabled}:{
 locale:VideoLocale;value:VideoGoalProfile;onChange:Dispatch<SetStateAction<VideoGoalProfile>>;
 onBack:()=>void;onContinue:()=>void;disabled:boolean;
}){
 const t=copy[locale],axes=useMemo<Axis[]>(()=>listMeaningAxes(locale),[locale]);
 const [quizStep,setQuizStep]=useState<1|2|3|4>(1);
 const quizRef=useRef<HTMLDivElement>(null);
 const [currentMood,setCurrentMood]=useState<Mood>("calm");
 const [desiredMood,setDesiredMood]=useState<Mood>("calm");
 const toggle=(side:"current"|"desired",id:string)=>onChange(old=>{
  const selected=old[side];
  const next=selected.includes(id)
   ?(selected.length===1?selected:selected.filter(x=>x!==id))
   :(selected.length>=3?selected:[...selected,id]);
  return {...old,[side]:next};
 });
 const chooseAxis=(id:string)=>onChange(old=>({
  ...old,axes:old.axes.includes(id)
   ?(old.axes.length===1?old.axes:old.axes.filter(x=>x!==id))
   :(old.axes.length>=3?old.axes:[...old.axes,id]),
 }));
 const filter=(side:"current"|"desired",tone:Mood,onTone:(mood:Mood)=>void)=>
  <div className={css.moodFilter} role="group" aria-label={side==="current"?t.now:t.want}>
   {moods.map(([mood,icon])=><button key={mood} data-video-personalization-mood={side+"-"+mood}
    type="button" disabled={disabled} aria-pressed={tone===mood} aria-label={t.moods[mood]}
    onClick={()=>onTone(mood)}><span aria-hidden="true">{icon}</span></button>)}
  </div>;
 const choices=(side:"current"|"desired",tone:Mood)=>{
  const pool=side==="current"?currentChoices:desiredChoices;
  const ids=side==="current"?currentByMood[tone]:desiredByMood[tone];
  return <div className={css.choiceScroll} data-video-personalization-scroll={side} role="group"
   aria-label={side==="current"?t.now:t.want} tabIndex={0}>
   {ids.map(id=>{
    const option=pool.find(c=>c.id===id);
    if(!option)return null;
    const selected=value[side].includes(id);
    return <button key={id} type="button" className={css.choice}
     data-video-personalization-choice={side+"-"+id} disabled={disabled} aria-pressed={selected}
     onClick={()=>toggle(side,id)}>
     {selected?<Check size={15} aria-hidden="true"/>:null}<span>{option[locale]}</span>
    </button>;
   })}
  </div>;
 };
 const goNext=()=>{
  if(disabled)return;
  if(quizStep===4){onContinue();return;}
  setQuizStep(step=>(step+1) as 1|2|3|4);
  quizRef.current?.scrollIntoView({block:"start",behavior:"auto"});
 };
 const goBack=()=>{
  if(disabled)return;
  if(quizStep===1){onBack();return;}
  setQuizStep(step=>(step-1) as 1|2|3|4);
  quizRef.current?.scrollIntoView({block:"start",behavior:"auto"});
 };
 return <div ref={quizRef} className={css.wizard} data-video-personalization data-video-personalization-step={quizStep}>
  <header className={css.intro}><span className={css.step}>{t.step}</span>
   <h2>{t.title}</h2><p>{t.intro}</p></header>
  <div className={css.progress} data-video-personalization-progress role="status" aria-live="polite">
   <strong>{t.quizStep} {quizStep} / 4</strong>
   <span className={css.progressDots} aria-hidden="true">
    {([1,2,3,4] as const).map(step=><i key={step} data-active={step<=quizStep?"true":"false"}/>)}
   </span>
  </div>
  <section className={css.card} data-personalization-kind="current" hidden={quizStep!==1} aria-labelledby="personalization-now-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Heart size={25} aria-hidden="true"/><div><h3 id="personalization-now-heading">{t.now}</h3><p>{t.choose}</p></div>
   </div>{filter("current",currentMood,setCurrentMood)}</div>
   {choices("current",currentMood)}<p className={css.scrollHint}>{t.more}</p>
   <label className={css.scale}><span className={css.scaleLabel}>
    <Zap size={17} aria-hidden="true"/>{t.energy}</span>
    <input type="range" data-video-personalization-energy min={0} max={10} step={1} value={value.energy}
     disabled={disabled} onChange={event=>{
      const n=Number(event.currentTarget.value);onChange(old=>({...old,energy:n}));
     }}/><output>{value.energy}/10</output>
   </label>
  </section>
  <section className={css.card} data-personalization-kind="desired" hidden={quizStep!==2} aria-labelledby="personalization-desired-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Sparkles size={25} aria-hidden="true"/><div><h3 id="personalization-desired-heading">{t.want}</h3><p>{t.choose}</p></div>
   </div>{filter("desired",desiredMood,setDesiredMood)}</div>
   {choices("desired",desiredMood)}<p className={css.scrollHint}>{t.more}</p>
   <label className={css.scale}><span className={css.scaleLabel}>{t.level}</span>
    <input type="range" data-video-personalization-desired-level min={0} max={10} step={1} value={value.desiredLevel}
     disabled={disabled} onChange={event=>{
      const n=Number(event.currentTarget.value);onChange(old=>({...old,desiredLevel:n}));
     }}/><output>{value.desiredLevel}/10</output>
   </label>
  </section>
  <section className={css.card} data-personalization-kind="strength" hidden={quizStep!==3} aria-labelledby="personalization-strength-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Leaf size={25} aria-hidden="true"/><div><h3 id="personalization-strength-heading">{t.strength}</h3><p>{t.axisHint}</p></div>
   </div></div>
   <div className={css.axisGrid} role="group" aria-label={t.strength}>
    {axes.map(axis=><button key={axis.id} type="button" data-video-personalization-axis={axis.id}
     title={axis.description} aria-pressed={value.axes.includes(axis.id)} disabled={disabled}
     onClick={()=>chooseAxis(axis.id)}>
     {value.axes.includes(axis.id)?<Check size={16} aria-hidden="true"/>:null}{axis.label}
    </button>)}
   </div>
  </section>
  <section className={css.nameCard} data-video-personalization-name-question hidden={quizStep!==4}>
   <label htmlFor="video-personalization-name">{t.nameQuestion}</label>
   <input id="video-personalization-name" data-video-personalization-name type="text"
    name="preferredName" autoComplete="given-name" maxLength={18}
    placeholder={t.namePlaceholder} value={value.name??""} disabled={disabled}
    onChange={event=>{
      // React may invoke a functional state updater after the input event.
      // Capture the value now: currentTarget is not stable inside that callback.
      const name=event.currentTarget.value;
      onChange(old=>({...old,name}));
     }}/>
   <p>{t.nameHint}</p>
  </section>
  <button className={css.next} type="button" data-video-personalization-clarify-continue
   disabled={disabled} onClick={goNext}>
   <Sparkles size={22} aria-hidden="true"/><span>{quizStep===4?t.next:t.forward}</span><ArrowRight size={22} aria-hidden="true"/>
  </button>
  <button className={css.back} type="button" data-video-personalization-clarify-back
   disabled={disabled} onClick={goBack}><ArrowLeft size={16} aria-hidden="true"/>{quizStep===1?t.back:t.previous}</button>
 </div>;
}
