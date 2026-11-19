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
type QuizStep=1|2|3|4|5|6;
const energyScores=[1,2,3,4,5,6,7,8,9,10] as const;
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
 ru:{step:"Идеи · Персонализация",title:"Персонализируйте своё видео",intro:"Выберите по одному ответу, затем оцените энергию сейчас и желаемую по шкале от 1 до 10.",now:"Как я чувствую себя сейчас?",want:"Как я хотел бы себя чувствовать?",strength:"Что я хочу укрепить?",choose:"Выберите одно слово",axisHint:"Выберите одно направление",energy:"Сколько энергии у меня сейчас?",level:"Сколько энергии я хочу иметь?",energyHint:"Выберите один балл от 1 до 10",more:"Прокрутите для других вариантов",nameQuestion:"Как вас зовут?",namePlaceholder:"Ваше имя",nameHint:"Необязательно · имя появится в последней фразе поддержки.",back:"Назад к цели",previous:"Назад",quizStep:"Шаг",next:"Перейти к концепции",moods:{sad:"Грустное",calm:"Спокойное",happy:"Радостное"}},
 en:{step:"Ideas · Personalization",title:"Personalize your video",intro:"Choose one answer at a time, then rate your energy now and your desired energy from 1 to 10.",now:"How do I feel now?",want:"How would I like to feel?",strength:"What would I like to strengthen?",choose:"Choose one word",axisHint:"Choose one direction",energy:"How much energy do I have now?",level:"How much energy would I like?",energyHint:"Choose one number from 1 to 10",more:"Scroll for more choices",nameQuestion:"What is your name?",namePlaceholder:"Your first name",nameHint:"Optional · the final suggested phrase will use your name.",back:"Back to goal",previous:"Back",quizStep:"Step",next:"Review video concept",moods:{sad:"Sad",calm:"Calm",happy:"Happy"}},
 es:{step:"Ideas · Personalización",title:"Personaliza tu vídeo",intro:"Elige una respuesta por paso y después valora tu energía actual y deseada del 1 al 10.",now:"¿Cómo me siento ahora?",want:"¿Cómo me gustaría sentirme?",strength:"¿Qué me gustaría fortalecer?",choose:"Elige una palabra",axisHint:"Elige una dirección",energy:"¿Cuánta energía tengo ahora?",level:"¿Cuánta energía quiero tener?",energyHint:"Elige un número del 1 al 10",more:"Desliza para ver más",nameQuestion:"¿Cómo te llamas?",namePlaceholder:"Tu nombre",nameHint:"Opcional · la última frase de apoyo incluirá tu nombre.",back:"Volver al objetivo",previous:"Atrás",quizStep:"Paso",next:"Revisar el concepto",moods:{sad:"Triste",calm:"Tranquilo",happy:"Alegre"}},
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
 const [quizStep,setQuizStep]=useState<QuizStep>(1);
 const quizRef=useRef<HTMLDivElement>(null);
 const [currentMood,setCurrentMood]=useState<Mood>("calm");
 const [desiredMood,setDesiredMood]=useState<Mood>("calm");
 // As on the main Goal quiz, one tap commits one answer and opens the next step.
 // Absolute targets prevent rapid taps from accidentally skipping a question.
 const advanceTo=(step:2|3|4|5|6)=>{
  setQuizStep(step);
  quizRef.current?.scrollIntoView({block:"start",behavior:"auto"});
 };
 const chooseOne=(side:"current"|"desired",id:string)=>{
  if(disabled)return;
  onChange(old=>({...old,[side]:[id]}));
  advanceTo(side==="current"?2:3);
 };
 const chooseAxis=(id:string)=>{
  if(disabled)return;
  onChange(old=>({...old,axes:[id]}));
  advanceTo(4);
 };
 const chooseEnergy=(field:"energy"|"desiredLevel",score:number)=>{
  if(disabled)return;
  onChange(old=>({...old,[field]:score}));
  advanceTo(field==="energy"?5:6);
 };
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
     onClick={()=>chooseOne(side,id)}>
     {selected?<Check size={15} aria-hidden="true"/>:null}<span>{option[locale]}</span>
    </button>;
   })}
  </div>;
 };
 const goBack=()=>{
  if(disabled)return;
  if(quizStep===1){onBack();return;}
  setQuizStep(step=>(step-1) as QuizStep);
  quizRef.current?.scrollIntoView({block:"start",behavior:"auto"});
 };
 return <div ref={quizRef} className={css.wizard} data-video-personalization data-video-personalization-step={quizStep}>
  <header className={css.intro}><span className={css.step}>{t.step}</span>
   <h2>{t.title}</h2><p>{t.intro}</p></header>
  <div className={css.progress} data-video-personalization-progress role="status" aria-live="polite">
   <strong>{t.quizStep} {quizStep} / 6</strong>
   <span className={css.progressDots} aria-hidden="true">
    {([1,2,3,4,5,6] as const).map(step=><i key={step} data-active={step<=quizStep?"true":"false"}/>)}
   </span>
  </div>
  <section className={css.card} data-personalization-kind="current" hidden={quizStep!==1} aria-labelledby="personalization-now-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Heart size={25} aria-hidden="true"/><div><h3 id="personalization-now-heading">{t.now}</h3><p>{t.choose}</p></div>
   </div>{filter("current",currentMood,setCurrentMood)}</div>
   {choices("current",currentMood)}<p className={css.scrollHint}>{t.more}</p>
  </section>
  <section className={css.card} data-personalization-kind="desired" hidden={quizStep!==2} aria-labelledby="personalization-desired-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Sparkles size={25} aria-hidden="true"/><div><h3 id="personalization-desired-heading">{t.want}</h3><p>{t.choose}</p></div>
   </div>{filter("desired",desiredMood,setDesiredMood)}</div>
   {choices("desired",desiredMood)}<p className={css.scrollHint}>{t.more}</p>
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
  <section className={css.card} data-personalization-kind="energy-current" hidden={quizStep!==4}
   aria-labelledby="personalization-energy-current-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Zap size={25} aria-hidden="true"/><div><h3 id="personalization-energy-current-heading">{t.energy}</h3>
     <p>{t.energyHint}</p></div>
   </div></div>
   <div className={css.energyGrid} data-video-personalization-energy-options="current" role="group" aria-label={t.energy}>
    {energyScores.map(score=><button key={score} type="button"
     data-video-personalization-energy={score} disabled={disabled} aria-pressed={value.energy===score}
     onClick={()=>chooseEnergy("energy",score)}>{score}</button>)}
   </div>
  </section>
  <section className={css.card} data-personalization-kind="energy-desired" hidden={quizStep!==5}
   aria-labelledby="personalization-energy-desired-heading">
   <div className={css.cardHead}><div className={css.cardName}>
    <Sparkles size={25} aria-hidden="true"/><div><h3 id="personalization-energy-desired-heading">{t.level}</h3>
     <p>{t.energyHint}</p></div>
   </div></div>
   <div className={css.energyGrid} data-video-personalization-energy-options="desired" role="group" aria-label={t.level}>
    {energyScores.map(score=><button key={score} type="button"
     data-video-personalization-desired-level={score} disabled={disabled} aria-pressed={value.desiredLevel===score}
     onClick={()=>chooseEnergy("desiredLevel",score)}>{score}</button>)}
   </div>
  </section>
  <section className={css.nameCard} data-video-personalization-name-question hidden={quizStep!==6}>
   <label htmlFor="video-personalization-name">{t.nameQuestion}</label>
   <input id="video-personalization-name" data-video-personalization-name type="text"
    name="preferredName" autoComplete="given-name" maxLength={18}
    placeholder={t.namePlaceholder} value={value.name??""} disabled={disabled}
    enterKeyHint="done"
    onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();if(!disabled)onContinue();}}}
    onChange={event=>{
      // React may invoke a functional state updater after the input event.
      // Capture the value now: currentTarget is not stable inside that callback.
      const name=event.currentTarget.value;
      onChange(old=>({...old,name}));
     }}/>
   <p>{t.nameHint}</p>
  </section>
  {quizStep===6?<button className={css.next} type="button" data-video-personalization-clarify-continue
   disabled={disabled} onClick={onContinue}>
   <Sparkles size={22} aria-hidden="true"/><span>{t.next}</span><ArrowRight size={22} aria-hidden="true"/>
  </button>:null}
  <button className={css.back} type="button" data-video-personalization-clarify-back
   disabled={disabled} onClick={goBack}><ArrowLeft size={16} aria-hidden="true"/>{quizStep===1?t.back:t.previous}</button>
 </div>;
}
