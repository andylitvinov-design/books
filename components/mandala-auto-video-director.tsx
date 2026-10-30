"use client";

import {useState} from "react";
import {Check,Sparkles} from "lucide-react";
import {recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-auto-video-director.module.css";

type Preset={
  id:string;theme:VideoTheme;
  label:Record<PublicLocale,string>;clips:readonly string[];
};
type Props={
  locale:PublicLocale;goal:string;theme:VideoTheme;presets:readonly Preset[];
  disabled:boolean;activePresetId:string|null;
  clipLabel:(id:string)=>string;
  onGoalChange:(value:string)=>void;
  onApply:(presetId:string,durationSeconds:10|20|30|60)=>void;
};
const copy={
 ru:{
   title:"Auto Video Director",
   intro:"Опишите цель — предложим готовый сюжет без десятков фильтров.",
   placeholder:"Например: хочу меньше тревожиться и ощущать спокойствие",
   suggest:"Предложить сценарий",reason:"Мой сценарий",uncertain:"Проверьте тему: это предварительная рекомендация.",
   duration:"Длительность",variants:"Другой сюжет",edit:"Изменить детали (необязательно)",
   stages:["Начало","Погружение","Развитие","Завершение"],
   source:"4 настоящих MP4 · 16:9 · бесплатный монтаж",
   accept:"Подтвердить этот сценарий",applied:"Сценарий выбран — нажмите «Создать видео».",
   warning:"Новых персонажей и кадров здесь не генерируем: предложен символический монтаж.",
   empty:"Нет подходящего готового сюжета с такими ограничениями. Уточните цель или используйте расширенный редактор.",
   safety:"Образная практика для поддержки, не медицинское или психотерапевтическое лечение.",
   input:"Ваша цель",
 },
 en:{
   title:"Auto Video Director",
   intro:"Describe your goal — get a ready-to-assemble film, not dozens of filters.",
   placeholder:"For example: I want less anxiety and more calm",
   suggest:"Suggest my film",reason:"Suggested film",uncertain:"Please check this provisional topic.",
   duration:"Duration",variants:"Different story",edit:"Adjust details (optional)",
   stages:["Opening","Arriving","Exploring","Closing"],
   source:"4 genuine MP4 clips · 16:9 · free compilation",
   accept:"Confirm this story",applied:"Story selected — choose Create video.",
   warning:"New characters and footage are not generated here; this is a symbolic montage.",
   empty:"No ready-made story matches those exclusions. Refine your goal or use the advanced editor.",
   safety:"Supportive imagery, not medical or psychotherapeutic treatment.",
   input:"Your goal",
 },
 es:{
   title:"Auto Video Director",
   intro:"Describe tu objetivo: proponemos un montaje listo, sin decenas de filtros.",
   placeholder:"Por ejemplo: quiero menos ansiedad y más calma",
   suggest:"Proponer vídeo",reason:"Vídeo sugerido",uncertain:"Confirma que la temática propuesta es correcta.",
   duration:"Duración",variants:"Otra historia",edit:"Ajustar detalles (opcional)",
   stages:["Inicio","Llegada","Desarrollo","Cierre"],
   source:"4 clips MP4 reales · 16:9 · montaje gratuito",
   accept:"Confirmar esta historia",applied:"Historia elegida; pulsa Crear vídeo.",
   warning:"No se generan personajes ni escenas nuevas: es un montaje simbólico.",
   empty:"Ningún montaje coincide con estas restricciones. Ajusta el objetivo o usa el editor avanzado.",
   safety:"Imágenes de apoyo, no un tratamiento médico ni psicoterapéutico.",
   input:"Tu objetivo",
 }
} as const;
const allowedDurations=[10,20,30,60] as const;

export function MandalaAutoVideoDirector({
 locale,goal,theme,presets,disabled,activePresetId,clipLabel,onGoalChange,onApply
}:Props){
 const t=copy[locale];
 const [proposal,setProposal]=useState<ReturnType<typeof recommendAutoVideo>|null>(null);
 const [overrideId,setOverrideId]=useState<string|null>(null);
 const [seconds,setSeconds]=useState<10|20|30|60|null>(null);
 const chosen=presets.find(p=>p.id===(overrideId||proposal?.presetId));
 const length=seconds||proposal?.durationSeconds||30;
 const choose=()=>{
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets}));
   setOverrideId(null);setSeconds(null);
 };
 return <section className={css.root} data-auto-video-director aria-labelledby="auto-video-heading">
   <div className={css.head}><Sparkles size={22} aria-hidden="true"/>
     <div><h3 id="auto-video-heading">{t.title}</h3><p>{t.intro}</p></div>
   </div>
   <div className={css.entry}>
     <label className={css.goal}><span className={css.notice}>{t.input}</span>
       <input type="text" data-auto-video-input data-video-quick-wish value={goal}
         maxLength={160} disabled={disabled} placeholder={t.placeholder}
         onChange={event=>{
           onGoalChange(event.currentTarget.value);
           setProposal(null);setOverrideId(null);setSeconds(null);
         }}/>
     </label>
     <button type="button" data-auto-video-suggest disabled={disabled||!goal.trim()}
       onClick={choose}><Sparkles size={16} aria-hidden="true"/> {t.suggest}</button>
   </div>
   {proposal?<div className={css.result} data-auto-video-proposal aria-live="polite">
     {chosen?<div>
       <h4>{t.reason}: {chosen.label[locale]}</h4>
       <p className={css.meta}>{length} s · {t.source}</p>
       {proposal.confidence==="low"?<p className={css.warning}>{t.uncertain}</p>:null}
       {proposal.requiresNewAiFootage?<p className={css.warning}>{t.warning}</p>:null}
       <ol className={css.shots} data-auto-video-storyboard>
         {chosen.clips.map((clip,index)=><li key={clip}>
           <b>{index+1}. {t.stages[index]}</b><span>{clipLabel(clip)}</span>
         </li>)}
       </ol>
       <details className={css.details} data-auto-video-adjust>
         <summary>{t.edit}</summary>
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
