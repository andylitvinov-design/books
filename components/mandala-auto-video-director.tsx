"use client";

import {useState} from "react";
import {Check,Sparkles} from "lucide-react";
import {AUTO_VIDEO_GOALS,recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-auto-video-director.module.css";

type Preset={
  id:string;theme:VideoTheme;
  label:Record<PublicLocale,string>;clips:readonly string[];focusTags?:readonly string[];
};
type SceneMeta={id:string;theme:string;status:string;media:string;
  video:string;label:Record<PublicLocale,string>;description:Record<PublicLocale,string>;
  categories:readonly string[];tags:readonly string[];motifs:readonly string[]};
type Props={
  locale:PublicLocale;goal:string;theme:VideoTheme;presets:readonly Preset[];
  scenes:readonly SceneMeta[];
  disabled:boolean;activePresetId:string|null;
  clipLabel:(id:string)=>string;
  onGoalChange:(value:string)=>void;
  onApply:(presetId:string,durationSeconds:10|20|30|60)=>void;
};
const copy={
 ru:{
   title:"Auto Video Director",
   intro:"Выберите цель — мы сразу предложим готовый сюжет. Никаких обязательных фильтров.",
   goalsTitle:"Что хотелось бы изменить?",
   placeholder:"Например: хочу меньше тревожиться и ощущать спокойствие",
   suggest:"Предложить сценарий",reason:"Мой сценарий",uncertain:"Проверьте тему: это предварительная рекомендация.",
   duration:"Длительность",variants:"Другой сюжет",topic:"Направление",edit:"Изменить детали (необязательно)",
   stages:["Начало","Погружение","Развитие","Завершение"],
   source:"4 настоящих MP4 · 16:9 · бесплатный монтаж",
   accept:"Подтвердить этот сценарий",applied:"Сценарий выбран — нажмите «Создать видео».",
   warning:"Новых персонажей и кадров здесь не генерируем: предложен символический монтаж.",
   empty:"Нет подходящего готового сюжета с такими ограничениями. Уточните цель или используйте расширенный редактор.",
   safety:"Образная практика для поддержки, не медицинское или психотерапевтическое лечение.",
   input:"Или напишите свою цель (необязательно)",
   selectedGoal:"Выбранная цель",
 },
 en:{
   title:"Auto Video Director",
   intro:"Choose one goal for an instant ready-made film. No required filters.",
   goalsTitle:"What would you like to change?",
   placeholder:"For example: I want less anxiety and more calm",
   suggest:"Suggest my film",reason:"Suggested film",uncertain:"Please check this provisional topic.",
   duration:"Duration",variants:"Different story",topic:"Topic",edit:"Adjust details (optional)",
   stages:["Opening","Arriving","Exploring","Closing"],
   source:"4 genuine MP4 clips · 16:9 · free compilation",
   accept:"Confirm this story",applied:"Story selected — choose Create video.",
   warning:"New characters and footage are not generated here; this is a symbolic montage.",
   empty:"No ready-made story matches those exclusions. Refine your goal or use the advanced editor.",
   safety:"Supportive imagery, not medical or psychotherapeutic treatment.",
   input:"Or write your own goal (optional)",
   selectedGoal:"Selected goal",
 },
 es:{
   title:"Auto Video Director",
   intro:"Elige un objetivo y verás un vídeo sugerido, sin filtros obligatorios.",
   goalsTitle:"¿Qué te gustaría cambiar?",
   placeholder:"Por ejemplo: quiero menos ansiedad y más calma",
   suggest:"Proponer vídeo",reason:"Vídeo sugerido",uncertain:"Confirma que la temática propuesta es correcta.",
   duration:"Duración",variants:"Otra historia",topic:"Tema",edit:"Ajustar detalles (opcional)",
   stages:["Inicio","Llegada","Desarrollo","Cierre"],
   source:"4 clips MP4 reales · 16:9 · montaje gratuito",
   accept:"Confirmar esta historia",applied:"Historia elegida; pulsa Crear vídeo.",
   warning:"No se generan personajes ni escenas nuevas: es un montaje simbólico.",
   empty:"Ningún montaje coincide con estas restricciones. Ajusta el objetivo o usa el editor avanzado.",
   safety:"Imágenes de apoyo, no un tratamiento médico ni psicoterapéutico.",
   input:"O escribe tu objetivo (opcional)",
   selectedGoal:"Objetivo elegido",
 }
} as const;
const allowedDurations=[10,20,30,60] as const;
const allThemes=["energy","money","relationships","goals","life","health"] as const;
const themeLabels={
 ru:{energy:"Энергия",money:"Работа и деньги",relationships:"Отношения",goals:"Уверенность",life:"Развитие",health:"Спокойствие"},
 en:{energy:"Energy",money:"Work and money",relationships:"Relationships",goals:"Confidence",life:"Growth",health:"Calm"},
 es:{energy:"Energía",money:"Trabajo y dinero",relationships:"Relaciones",goals:"Confianza",life:"Desarrollo",health:"Calma"},
} as const;

export function MandalaAutoVideoDirector({
 locale,goal,theme,presets,scenes,disabled,activePresetId,clipLabel,onGoalChange,onApply
}:Props){
 const t=copy[locale];
 const [proposal,setProposal]=useState<ReturnType<typeof recommendAutoVideo>|null>(null);
 const [overrideId,setOverrideId]=useState<string|null>(null);
 const [seconds,setSeconds]=useState<10|20|30|60|null>(null);
 const [selectedGoalId,setSelectedGoalId]=useState<string|null>(null);
 const selectedGoal=AUTO_VIDEO_GOALS.find(item=>item.id===selectedGoalId);
 const chosen=presets.find(p=>p.id===(overrideId||proposal?.presetId));
 const sceneById=new Map(scenes.map(item=>[item.id,item]));
 const sceneLabel=(id:string)=>sceneById.get(id)?.label[locale]||clipLabel(id);
 const length=seconds||proposal?.durationSeconds||30;
 const choose=()=>{
   setSelectedGoalId(null);
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
   setOverrideId(null);setSeconds(null);
 };
 const chooseReadyGoal=(goalId:string)=>{
   // No test result or private objective is sent outside this component.
   onGoalChange("");
   setSelectedGoalId(goalId);
   setOverrideId(null);setSeconds(null);
   setProposal(recommendAutoVideo({goalId,locale,fallbackTheme:theme,presets,scenes}));
 };
 return <section className={css.root} data-auto-video-director aria-labelledby="auto-video-heading">
   <div className={css.head}><Sparkles size={22} aria-hidden="true"/>
     <div><h3 id="auto-video-heading">{t.title}</h3><p>{t.intro}</p></div>
   </div>
   <p className={css.goalsTitle}>{t.goalsTitle}</p>
   <div className={css.goalChoices} role="group" aria-label={t.goalsTitle}>
     {AUTO_VIDEO_GOALS.map(item=><button key={item.id} type="button"
       data-auto-video-goal={item.id} aria-pressed={selectedGoalId===item.id}
       disabled={disabled} onClick={()=>chooseReadyGoal(item.id)}>
       {item.labels[locale]}
     </button>)}
   </div>
   <div className={css.entry}>
     <label className={css.goal}><span className={css.notice}>{t.input}</span>
       <input type="text" data-auto-video-input value={goal}
         maxLength={160} disabled={disabled} placeholder={t.placeholder}
         onChange={event=>{
           onGoalChange(event.currentTarget.value);
           setProposal(null);setOverrideId(null);setSeconds(null);
           setSelectedGoalId(null);
         }}/>
     </label>
     <button type="button" data-auto-video-suggest disabled={disabled||!goal.trim()}
       onClick={choose}><Sparkles size={16} aria-hidden="true"/> {t.suggest}</button>
   </div>
   {proposal?<div className={css.result} data-auto-video-proposal aria-live="polite">
     {chosen?<div>
       <h4>{t.reason}: {chosen.label[locale]}</h4>
       {selectedGoal?<p className={css.meta}>{t.selectedGoal}: {selectedGoal.labels[locale]}</p>:null}
       <p className={css.meta}>{length} s · {t.source}</p>
       {proposal.confidence==="low"||proposal.confidence==="medium"?<p className={css.warning}>{t.uncertain}</p>:null}
       {proposal.requiresNewAiFootage?<p className={css.warning}>{t.warning}</p>:null}
       <ol className={css.shots} data-auto-video-storyboard>
         {chosen.clips.map((clip,index)=>{
           const scene=sceneById.get(clip);
           return <li key={clip}>
             <b>{index+1}. {t.stages[index]}</b><span>{sceneLabel(clip)}</span>
             {scene?<small className={css.clipDescription}>{scene.description[locale]}</small>:null}
             {scene?<small className={css.clipTags}>{themeLabels[locale][scene.theme as VideoTheme]||scene.theme} · {scene.tags.slice(0,3).join(" · ")}</small>:null}
           </li>;
         })}
       </ol>
       <details className={css.details} data-auto-video-adjust>
         <summary>{t.edit}</summary>
         <div className={css.adjust}><span>{t.topic}:</span>
           {allThemes.map(value=><button type="button" key={value} disabled={disabled}
             aria-pressed={proposal.theme===value}
             onClick={()=>{
               setOverrideId(null);
               setProposal(recommendAutoVideo({goal,goalId:selectedGoalId,locale,fallbackTheme:theme,presets,scenes,
                 preferredTheme:value}));
             }}>{themeLabels[locale][value]}</button>)}
         </div>
         <div className={css.adjust}><span>{t.duration}:</span>
           {allowedDurations.map(n=><button type="button" key={n} disabled={disabled}
             aria-pressed={length===n} onClick={()=>setSeconds(n)}>{n} s</button>)}
         </div>
         {proposal.alternativePresetIds.length?<div className={css.adjust}>
           <span>{t.variants}:</span>
           {[proposal.presetId,...proposal.alternativePresetIds].map(id=>{
             const preset=presets.find(p=>p.id===id);
             return preset?<button type="button" key={id} disabled={disabled}
               aria-pressed={chosen.id===id}
               onClick={()=>setOverrideId(id===proposal.presetId?null:id)}>{preset.label[locale]}</button>:null;
           })}
         </div>:null}
       </details>
       <button type="button" data-auto-video-confirm className={css.confirm}
         disabled={disabled} onClick={()=>onApply(chosen.id,length as 10|20|30|60)}>
         <Check size={18} aria-hidden="true"/> {t.accept}
       </button>
       {activePresetId===chosen.id?<p className={css.notice} role="status">{t.applied}</p>:null}
       <p className={css.notice}>{t.safety}</p>
     </div>:<p role="status" className={css.warning}>{t.empty}</p>}
   </div>:null}
 </section>;
}
