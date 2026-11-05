"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {listStates} from "@/lib/mandala/state-transition/state-catalog.mjs";
import css from "./mandala-state-transition-selector.module.css";

type Locale="ru"|"en"|"es";
type Recommendation={
 rank:number;scenarioId:string;label:string;creativeBrief:string;
 transitionTemplateId:string;fourBeats:string[];reasonCodes:string[];
 suggestedMotifIds:string[];suggestedStyleId:string;mediaStatus:string;
 editorialReviewStatus:string;safeToAutoExport:boolean;rationale?:string;
};
type Response={
 // Only fields rendered by the selector: engine metadata is additional and
 // should retain the actual JS module's inferred shape.
 status:string;clarification:string|null;
 recommendations:Recommendation[];
};
type Props={
 locale:Locale;topicId:string;disabled:boolean;selectedScenarioId:string;allowEditorialDrafts?:boolean;
 onChooseScenario:(scenarioId:string,context?:{currentStateId:string;desiredStateId:string;
   intensity:"low"|"medium"|"high";energy:"low"|"moderate"|"high"})=>void;
};
const language={
 ru:{title:"Путь от состояния «Сейчас» к «Хочу»",hint:"Два коротких выбора помогут предложить бережный сюжет для вашей темы.",
   now:"Сейчас я чувствую",want:"Хочу почувствовать",empty:"Выберите состояние",intensity:"Насколько сильно сейчас?",
   low:"Немного",medium:"Заметно",high:"Очень сильно",more:"Уточнить (необязательно)",
   search:"Подобрать мой сценарий",loading:"Подбираем варианты…",recommend:"Рекомендованный сюжет",
   alternative:"Другой путь",choose:"Подходит — дальше",pending:"Только после вашего подтверждения будет выбран сценарий.",
   media:"Это творческий сценарий. Для видео необходимы отдельно проверенные кадры и права.",
   failure:"Уточните состояния или попробуйте другой путь.",safety:"Для поддержки и творчества, а не для диагностики или лечения.",
   reset:"Изменить состояния",chosen:"Выбранный ранее сценарий",close:"Закрыть детали",energy:"Сколько сейчас энергии?",energyLow:"Мало",energyMedium:"Достаточно",energyHigh:"Много"},
 en:{title:"From how I feel now to how I want to feel",hint:"Two short choices help find a gentle story for your topic.",
   now:"How I feel now",want:"How I want to feel",empty:"Choose a state",intensity:"How intense is it now?",
   low:"Mildly",medium:"Noticeably",high:"Very strongly",more:"Refine (optional)",
   search:"Suggest my story",loading:"Finding options…",recommend:"Suggested story",
   alternative:"Alternative route",choose:"This fits — continue",pending:"Nothing is selected until you confirm.",
   media:"An editorial story concept. Actual video requires separately verified footage and rights.",
   failure:"Refine the states or explore a different path.",safety:"For support and creativity, not diagnosis or treatment.",
   reset:"Change states",chosen:"Previously selected story",close:"Close details",energy:"How much energy do you have?",energyLow:"Low",energyMedium:"Moderate",energyHigh:"High"},
 es:{title:"De cómo me siento a cómo quiero sentirme",hint:"Dos elecciones breves permiten sugerir una historia suave para tu tema.",
   now:"Cómo me siento ahora",want:"Cómo quiero sentirme",empty:"Elige un estado",intensity:"¿Con qué intensidad?",
   low:"Leve",medium:"Notable",high:"Muy fuerte",more:"Precisar (opcional)",
   search:"Sugerir mi historia",loading:"Buscando opciones…",recommend:"Historia sugerida",
   alternative:"Otra ruta",choose:"Me parece bien — continuar",pending:"La historia no se selecciona hasta que la confirmes.",
   media:"Es un concepto creativo. El vídeo necesita imágenes y derechos verificados.",
   failure:"Precisa los estados o explora otro camino.",safety:"Apoyo y creatividad, no diagnóstico ni tratamiento.",
   reset:"Cambiar estados",chosen:"Historia seleccionada",close:"Cerrar detalles",energy:"¿Cuánta energía tienes ahora?",energyLow:"Poca",energyMedium:"Moderada",energyHigh:"Mucha"},
} as const;
const key=(topicId:string)=>"hh-stse-v1-session:"+topicId;
export function StateTransitionSelector({locale,topicId,disabled,selectedScenarioId,onChooseScenario,allowEditorialDrafts=false}:Props){
 const t=language[locale];
 const states=useMemo(()=>listStates(locale),[locale]);
 const validIds=useMemo(()=>new Set(states.map(row=>row.id)),[states]);
 const [current,setCurrent]=useState("");
 const [desired,setDesired]=useState("");
 const [intensity,setIntensity]=useState<"low"|"medium"|"high">("medium");
 const [energy,setEnergy]=useState<"low"|"moderate"|"high">("moderate");
 const [result,setResult]=useState<Response|null>(null);
 const [choice,setChoice]=useState(0);
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState("");
 const serial=useRef(0);
 useEffect(()=>{
   serial.current+=1;
   setResult(null);setChoice(0);setFeedback("");setBusy(false);
   setCurrent("");setDesired("");setIntensity("medium");setEnergy("moderate");
   // Per-tab temporary persistence, never raw free text, no cookies or network.
   try{
     const saved=JSON.parse(window.sessionStorage.getItem(key(topicId))||"null");
     if(saved&&validIds.has(saved.currentId)&&validIds.has(saved.desiredId)){
       setCurrent(saved.currentId);setDesired(saved.desiredId);
       if(["low","medium","high"].includes(saved.intensity))setIntensity(saved.intensity);
       if(["low","moderate","high"].includes(saved.energy))setEnergy(saved.energy);
     }
   }catch{/* Restricted storage is allowed; the flow still works in memory. */}
 },[topicId,validIds]);
 const update=(fn:()=>void)=>{
   serial.current+=1;setResult(null);setChoice(0);setFeedback("");setBusy(false);fn();
 };
 const suggest=async()=>{
   if(!validIds.has(current)||!validIds.has(desired)||busy||disabled)return;
   const turn=++serial.current;
   setBusy(true);setFeedback("");setResult(null);
   try{
     // On-demand local code only; never send personal state text to a provider.
     const {recommendScenario}=await import("@/lib/mandala/state-transition/scenario-engine.mjs");
     const data:Response=recommendScenario({
       schemaVersion:"state-transition-request-v1",locale,topicId,
       current:{stateId:current,intensity},desired:{stateId:desired,intensity:"medium"},
       preferences:{pace:intensity==="high"?"gentle":null,energy,
         includeEditorialDrafts:allowEditorialDrafts},
     });
     if(serial.current!==turn)return;
     if(data.status==="ok"&&data.recommendations.length){
       setResult(data);setChoice(0);
     }else setFeedback(data.clarification||t.failure);
   }catch{
     if(serial.current===turn)setFeedback(t.failure);
   }finally{if(serial.current===turn)setBusy(false);}
 };
 const confirm=()=>{
   const rec=result?.recommendations[choice];
   if(!rec||disabled||busy||!validIds.has(current)||!validIds.has(desired))return;
   // Persist only explicit confirmed canonical choice for this tab, not state text.
   try{window.sessionStorage.setItem(key(topicId),JSON.stringify({
     currentId:current,desiredId:desired,intensity,energy,scenarioId:rec.scenarioId,
     transitionTemplateId:rec.transitionTemplateId,
     motifId:rec.suggestedMotifIds[0]||null,styleId:rec.suggestedStyleId,
     editorialStatus:rec.editorialReviewStatus
   }));}catch{/* Private/no-storage modes remain supported. */}
   onChooseScenario(rec.scenarioId,{currentStateId:current,desiredStateId:desired,
      intensity,energy});
 };
 return <section className={css.panel} data-hh-state-transition data-topic-id={topicId}
    aria-label={t.title}>
   <h4 className={css.title}>{t.title}</h4>
   <p className={css.hint}>{t.hint}</p>
   <div className={css.fields}>
     <label className={css.field}>
       <span>{t.now}</span>
       <select data-stse-current value={current} disabled={disabled||busy}
         onChange={event=>update(()=>setCurrent(event.currentTarget.value))}>
         <option value="">{t.empty}</option>
         {states.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
       </select>
     </label>
     <label className={css.field}>
       <span>{t.want}</span>
       <select data-stse-desired value={desired} disabled={disabled||busy}
         onChange={event=>update(()=>setDesired(event.currentTarget.value))}>
         <option value="">{t.empty}</option>
         {states.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
       </select>
     </label>
   </div>
   <details className={css.more}>
     <summary>{t.more}</summary>
     <label className={css.field}>
       <span>{t.intensity}</span>
       <select data-stse-intensity value={intensity} disabled={disabled||busy}
         onChange={event=>update(()=>setIntensity(event.currentTarget.value as "low"|"medium"|"high"))}>
         <option value="low">{t.low}</option><option value="medium">{t.medium}</option><option value="high">{t.high}</option>
       </select>
     </label>
     <label className={css.field}>
       <span>{t.energy}</span>
       <select data-stse-energy value={energy} disabled={disabled||busy}
         onChange={event=>update(()=>setEnergy(event.currentTarget.value as "low"|"moderate"|"high"))}>
         <option value="low">{t.energyLow}</option>
         <option value="moderate">{t.energyMedium}</option>
         <option value="high">{t.energyHigh}</option>
       </select>
     </label>
   </details>
   <button type="button" className={css.suggest} data-stse-suggest
     disabled={!current||!desired||disabled||busy} onClick={suggest}>
     {busy?t.loading:t.search}
   </button>
   {feedback?<p role="status" className={css.warning} data-stse-error>{feedback}</p>:null}
   {result?.recommendations.length?<div className={css.results} data-stse-recommendations>
      <p className={css.hint}>{t.pending}</p>
      <div className={css.options} role="radiogroup" aria-label={t.recommend}>
        {result.recommendations.map((rec,index)=><label key={rec.scenarioId}
          className={choice===index?css.selected:css.option}>
          <input type="radio" name={"stse-choice-"+topicId} value={rec.scenarioId}
            checked={choice===index} disabled={disabled||busy} onChange={()=>setChoice(index)}/>
          <span className={css.optionBody}>
            <strong>{index===0?t.recommend:t.alternative}: {rec.label}</strong>
            <small>{rec.rationale||rec.creativeBrief}</small>
            <small>{rec.creativeBrief}</small>
            <small>{t.media}</small>
          </span>
        </label>)}
      </div>
      <button type="button" data-stse-confirm className={css.confirm} disabled={disabled||busy} onClick={confirm}>
        {t.choose}
      </button>
    </div>:null}
   {selectedScenarioId&&result?.recommendations.some(row=>row.scenarioId===selectedScenarioId)?
     <p className={css.notice} role="status" data-stse-selected>{t.chosen}: {selectedScenarioId}</p>:null}
   <p className={css.disclaimer}>{t.safety}</p>
 </section>;
}
