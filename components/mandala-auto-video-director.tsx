"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Check,Sparkles,Target,Play,ArrowRight,Sun,Heart,Sprout,BriefcaseBusiness} from "lucide-react";
import {AUTO_VIDEO_GOALS,recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {allocateAdaptiveFilmTimeline,shiftAdaptiveFilmBoundary} from "@/lib/mandala/free-film-timeline.mjs";
import {STAGE_CAPTION_LIMIT} from "@/lib/mandala/stage-caption-track.mjs";
import {montageReplacementOptions} from "@/lib/mandala/video-montage-sources.mjs";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-auto-video-director.module.css";

type Preset={
  id:string;theme:VideoTheme;
  label:Record<PublicLocale,string>;clips:readonly string[];focusTags?:readonly string[];
};
type SceneMeta={id:string;theme:string;collection:string;status:string;media:string;
  rightsReference:{kind:string};pace?:string;
  video:string;poster?:string;label:Record<PublicLocale,string>;description:Record<PublicLocale,string>;
  categories:readonly string[];tags:readonly string[];motifs:readonly string[]};
type Props={
  locale:PublicLocale;goal:string;theme:VideoTheme;aspect:"landscape"|"portrait"|"square";presets:readonly Preset[];
  scenes:readonly SceneMeta[];
  disabled:boolean;activePresetId:string|null;
  clipLabel:(id:string)=>string;
  audioAttached?:boolean;audioTrackLabel?:string;onOpenAudio?:()=>void;
  onGoalChange:(value:string)=>void;
  onInvalidate?:()=>void;
  onApply:(presetId:string,durationSeconds:10|15|20|30|60,
    edit?:{clipIds:readonly string[];durationSecondsByStage:readonly number[];captionTexts:readonly string[];excludedMotifs?:readonly string[]})=>void|boolean;
  onCreate?:()=>void;canCreate?:boolean;rendering?:boolean;
};
const copy={
 ru:{
   title:"Auto Video Director",
   intro:"Один общий запрос → четыре варианта сценария",
   goalsTitle:"Что хотелось бы изменить?",
   placeholder:"Например: хочу меньше тревожиться и ощущать спокойствие",
   suggest:"Подобрать сценарий",reason:"Мой сценарий",uncertain:"Проверьте тему: это предварительная рекомендация.",
   duration:"Длительность",variants:"Выберите один из сценариев",storyboard:"Четыре сцены выбранного сценария",topic:"Направление",edit:"Изменить детали (необязательно)",
   stages:["Начало","Погружение","Развитие","Завершение"],
   source:"4 настоящих MP4 · бесплатный монтаж",
   accept:"Подтвердить сценарий",applied:"Сценарий выбран — нажмите «Создать видео».",
   warning:"Новых персонажей и кадров здесь не генерируем: предложен символический монтаж.",
   empty:"Нет подходящего готового сюжета с такими ограничениями. Уточните цель или используйте расширенный редактор.",
   safety:"Образная практика для поддержки, не медицинское или психотерапевтическое лечение.",
   input:"Или напишите свою цель",clarify:"Уточнить цель",refine:"Что именно хотите почувствовать или изменить?",addRefine:"Добавить к цели",moreGoals:"Ещё цели",create:"Создать выбранное видео",waiting:"Создаём видео…",blocked:"Проверьте выбранный звук и разрешения для создания видео.",
   selectedGoal:"Выбранная цель",
   captionTrack:"Текст по сценам",captionHint:"Необязательно: одна надпись на каждом этапе. Текст показывается в вашем видео, а не отправляется в ИИ.",soundTrack:"Музыка и голос",soundMissing:"Звук не прикреплён",soundSettings:"Настроить звук",
   timeline:"Монтажная шкала",openMontage:"Открыть монтаж (необязательно)",montageHelp:"Измените порядок и длительность сцен, затем подтвердите сценарий.",reorder:"Порядок сцены",less:"Укоротить",more:"Удлинить",audioHint:"Музыка, голос и фразы настраиваются в существующих разделах видеостудии.",replaceScene:"Заменить клип",replacementHint:"Доступны только проверенные видео из каталога.",
 },
 en:{
   title:"Auto Video Director",
   intro:"One goal → four story options",
   goalsTitle:"What would you like to change?",
   placeholder:"For example: I want less anxiety and more calm",
   suggest:"Suggest my film",reason:"Suggested film",uncertain:"Please check this provisional topic.",
   duration:"Duration",variants:"Choose a story",storyboard:"Four shots in the chosen story",topic:"Topic",edit:"Adjust details (optional)",
   stages:["Opening","Arriving","Exploring","Closing"],
   source:"4 genuine MP4 clips · free compilation",
   accept:"Confirm this story",applied:"Story selected — choose Create video.",
   warning:"New characters and footage are not generated here; this is a symbolic montage.",
   empty:"No ready-made story matches those exclusions. Refine your goal or use the advanced editor.",
   safety:"Supportive imagery, not medical or psychotherapeutic treatment.",
   input:"Or write your own goal",clarify:"Refine goal",refine:"What would you like to feel or change?",addRefine:"Add to my goal",moreGoals:"More goals",create:"Create selected video",waiting:"Creating video…",blocked:"Check your selected audio and permissions before creating video.",
   selectedGoal:"Selected goal",
   captionTrack:"Scene captions",captionHint:"Optional: one caption per stage. Your text appears in the video and is not sent to AI.",soundTrack:"Music and voice",soundMissing:"No audio attached",soundSettings:"Edit sound",
   timeline:"Montage timeline",openMontage:"Open montage (optional)",montageHelp:"Adjust shot order and durations, then confirm the storyboard.",reorder:"Reorder shot",less:"Shorten",more:"Lengthen",audioHint:"Music, voice and captions remain in the existing studio sections.",replaceScene:"Replace clip",replacementHint:"Only licensed catalogue videos are available.",
 },
 es:{
   title:"Auto Video Director",
   intro:"Un objetivo → cuatro opciones de vídeo",
   goalsTitle:"¿Qué te gustaría cambiar?",
   placeholder:"Por ejemplo: quiero menos ansiedad y más calma",
   suggest:"Proponer vídeo",reason:"Vídeo sugerido",uncertain:"Confirma que la temática propuesta es correcta.",
   duration:"Duración",variants:"Elige una historia",storyboard:"Cuatro escenas de la historia elegida",topic:"Tema",edit:"Ajustar detalles (opcional)",
   stages:["Inicio","Llegada","Desarrollo","Cierre"],
   source:"4 clips MP4 reales · montaje gratuito",
   accept:"Confirmar esta historia",applied:"Historia elegida; pulsa Crear vídeo.",
   warning:"No se generan personajes ni escenas nuevas: es un montaje simbólico.",
   empty:"Ningún montaje coincide con estas restricciones. Ajusta el objetivo o usa el editor avanzado.",
   safety:"Imágenes de apoyo, no un tratamiento médico ni psicoterapéutico.",
   input:"O escribe tu objetivo",clarify:"Precisar objetivo",refine:"¿Qué te gustaría sentir o cambiar?",addRefine:"Añadir al objetivo",moreGoals:"Más objetivos",create:"Crear vídeo seleccionado",waiting:"Creando vídeo…",blocked:"Comprueba el audio y los permisos para crear el vídeo.",
   selectedGoal:"Objetivo elegido",
   captionTrack:"Texto por escena",captionHint:"Opcional: un texto por etapa. Se muestra en el vídeo, sin enviarlo a IA.",soundTrack:"Música y voz",soundMissing:"Sin audio adjunto",soundSettings:"Ajustar audio",
   timeline:"Línea de montaje",openMontage:"Abrir montaje (opcional)",montageHelp:"Cambia el orden y la duración; después confirma el guion.",reorder:"Ordenar escena",less:"Acortar",more:"Alargar",audioHint:"Música, voz y frases se ajustan en las secciones actuales.",replaceScene:"Cambiar clip",replacementHint:"Solo están disponibles vídeos aprobados del catálogo.",
 }
} as const;
const allowedDurations=[10,15,20,30,60] as const;
const allThemes=["energy","money","relationships","goals","life","health"] as const;
const themeLabels={
 ru:{energy:"Энергия",money:"Работа и деньги",relationships:"Отношения",goals:"Уверенность",life:"Развитие",health:"Спокойствие"},
 en:{energy:"Energy",money:"Work and money",relationships:"Relationships",goals:"Confidence",life:"Growth",health:"Calm"},
 es:{energy:"Energía",money:"Trabajo y dinero",relationships:"Relaciones",goals:"Confianza",life:"Desarrollo",health:"Calma"},
} as const;

export function MandalaAutoVideoDirector({
 locale,goal,theme,aspect,presets,scenes,disabled,activePresetId,clipLabel,
 audioAttached=false,audioTrackLabel="",onOpenAudio,onGoalChange,onInvalidate,onApply,onCreate,canCreate=false,rendering=false
}:Props){
 const t=copy[locale];
 const [proposal,setProposal]=useState<ReturnType<typeof recommendAutoVideo>|null>(null);
 const [proposalContext,setProposalContext]=useState<{goal:string;theme:VideoTheme}|null>(null);
 const [overrideId,setOverrideId]=useState<string|null>(null);
 const [seconds,setSeconds]=useState<10|15|20|30|60|null>(null);
 const [selectedGoalId,setSelectedGoalId]=useState<string|null>(null);
 const [goalTarget,setGoalTarget]=useState<HTMLElement|null>(null);
 const [refineOpen,setRefineOpen]=useState(false);
 const [refineText,setRefineText]=useState("");
 const [timelineEdits,setTimelineEdits]=useState<{
   presetId:string;totalSeconds:number;clipIds:string[];durations:number[];captions:string[];
 }|null>(null);
 const [confirmedTimelineKey,setConfirmedTimelineKey]=useState<string|null>(null);
 useEffect(()=>{
   setGoalTarget(document.querySelector<HTMLElement>("[data-video-director-goal-controls]"));
 },[]);
 const selectedGoal=AUTO_VIDEO_GOALS.find(item=>item.id===selectedGoalId);
 const chosen=presets.find(p=>p.id===(overrideId||proposal?.presetId));
 const sceneById=new Map(scenes.map(item=>[item.id,item]));
 const sceneLabel=(id:string)=>sceneById.get(id)?.label[locale]||clipLabel(id);
 const scenePoster=(id:string)=>sceneById.get(id)?.poster||null;
 const length=seconds||proposal?.durationSeconds||30;
 const activeTimelineEdits=chosen&&timelineEdits?.presetId===chosen.id&&
   timelineEdits.totalSeconds===length?timelineEdits:null;
 const stageClipIds=chosen?(activeTimelineEdits?.clipIds||[...chosen.clips]):[];
 const stageDurations=chosen?(activeTimelineEdits?.durations||
   allocateAdaptiveFilmTimeline(length,stageClipIds).map(shot=>shot.durationSeconds)):[];
 const stageCaptions=chosen?(activeTimelineEdits?.captions||["","","",""]):[];
 const timelineKey=JSON.stringify([chosen?.id,length,stageClipIds,stageDurations,stageCaptions]);
 const availableReplacements=stageClipIds.map(currentId=>
   montageReplacementOptions({scenes,currentId,selectedIds:stageClipIds,
     excludedMotifs:proposal?.excludedMotifs||[],limit:6}));
 const editTimeline=(clipIds:readonly string[],durations:readonly number[],
   captions:readonly string[]=stageCaptions)=>{
   if(!chosen)return;
   onInvalidate?.(); // An edited cut must not leave a stale downloadable movie.
   setTimelineEdits({presetId:chosen.id,totalSeconds:length,
     clipIds:[...clipIds],durations:[...durations],captions:[...captions]});
 };
 const shiftBoundary=(index:number,direction:-1|1)=>{
   if(index<0||index>=3)return;
   const next=shiftAdaptiveFilmBoundary(stageDurations,index,direction);
   if(next.some((seconds,i)=>seconds!==stageDurations[i]))editTimeline(stageClipIds,next);
 };
 const swapScene=(index:number,direction:-1|1)=>{
   const other=index+direction;
   if(other<0||other>=stageClipIds.length)return;
   const next=[...stageClipIds];
   [next[index],next[other]]=[next[other],next[index]];
   editTimeline(next,stageDurations);
 };
 const replaceStage=(index:number,nextId:string)=>{
   if(!availableReplacements[index]?.some(scene=>scene.id===nextId))return;
   const next=[...stageClipIds];next[index]=nextId;
   editTimeline(next,stageDurations);
 };
 // A prompt changed in the other shared editor must not leave a stale confirmation.
 const showProposal=Boolean(proposal&&proposalContext?.goal===goal&&
   (proposalContext?.theme===theme||proposal.theme===theme||activePresetId===chosen?.id));
 const alternatives=proposal?[proposal.presetId,...proposal.alternativePresetIds]
   .filter((id):id is string=>Boolean(id)): [];
 const choose=()=>{
   setSelectedGoalId(null);
   setProposalContext({goal,theme});
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);
 };
 const chooseReadyGoal=(goalId:string)=>{
   // The selected ready goal also becomes the editable shared wish.
   // No test result or private objective is sent outside this component.
   const nextGoal=AUTO_VIDEO_GOALS.find(item=>item.id===goalId)?.labels[locale]||"";
   onGoalChange(nextGoal);
   setProposalContext({goal:nextGoal,theme});
   setSelectedGoalId(goalId);
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);
   setProposal(recommendAutoVideo({goal:nextGoal,goalId,locale,fallbackTheme:theme,presets,scenes}));
 };
 const primaryGoalIds=new Set(["confidence","connection","fresh-start","stability"]);
 const renderGoal=(item:(typeof AUTO_VIDEO_GOALS)[number])=>{
   const Icon=item.id==="confidence"?Sun:item.id==="connection"?Heart:
     item.id==="fresh-start"?Sprout:item.id==="stability"?BriefcaseBusiness:Sparkles;
   return <button key={item.id} type="button" data-auto-video-goal={item.id}
       aria-pressed={showProposal&&selectedGoalId===item.id}
       disabled={disabled} onClick={()=>chooseReadyGoal(item.id)}>
       <Icon size={17} aria-hidden="true"/>{item.labels[locale]}
     </button>;
 };
 const goalPanel=<div className={css.goalPanel} data-auto-video-goal-panel>
   <p className={css.goalsTitle}>{t.goalsTitle}</p>
   <div className={css.goalChoices} role="group" aria-label={t.goalsTitle}>
     {AUTO_VIDEO_GOALS.filter(item=>primaryGoalIds.has(item.id)).map(renderGoal)}
   </div>
   <details className={css.extraGoals} data-auto-video-more-goals>
     <summary>{t.moreGoals}</summary>
     <div className={css.goalChoices}>
       {AUTO_VIDEO_GOALS.filter(item=>!primaryGoalIds.has(item.id)).map(renderGoal)}
     </div>
   </details>
   <div className={css.entry}>
     <label className={css.goal}><span className={css.notice}>{t.input}</span>
       <input type="text" data-auto-video-input value={goal}
         maxLength={160} disabled={disabled} placeholder={t.placeholder}
         onChange={event=>{
           onGoalChange(event.currentTarget.value);
           setProposal(null);setProposalContext(null);setOverrideId(null);setSeconds(null);
           setSelectedGoalId(null);setTimelineEdits(null);
         }}/>
     </label>
     <div className={css.goalActions}>
       <button type="button" data-auto-video-suggest disabled={disabled||!goal.trim()}
         onClick={choose}><Sparkles size={16} aria-hidden="true"/>{t.suggest}</button>
       <button type="button" className={css.clarifyButton} data-auto-video-clarify
         disabled={disabled} aria-expanded={refineOpen}
         onClick={()=>setRefineOpen(open=>!open)}>
         <Target size={16} aria-hidden="true"/>{t.clarify}
       </button>
     </div>
   </div>
   {refineOpen?<div className={css.refinePanel} data-auto-video-refine-panel>
     <label htmlFor="auto-video-refine">{t.refine}</label>
     <textarea id="auto-video-refine" rows={2} maxLength={120}
       disabled={disabled} value={refineText} onChange={event=>setRefineText(event.currentTarget.value)}/>
     <button type="button" disabled={disabled||!refineText.trim()} onClick={()=>{
       onGoalChange([goal.trim(),refineText.trim()].filter(Boolean).join(". ").slice(0,160));
       setProposal(null);setProposalContext(null);setSelectedGoalId(null);setRefineOpen(false);
       setTimelineEdits(null);
     }}>{t.addRefine}<ArrowRight size={15} aria-hidden="true"/></button>
   </div>:null}
 </div>;
 return <section className={css.root} data-auto-video-director aria-labelledby="auto-video-heading">
   <div className={css.head}><Sparkles size={22} aria-hidden="true"/>
     <div><h3 id="auto-video-heading">{t.title}</h3><p>{t.intro}</p></div>
   </div>
   {goalTarget?createPortal(goalPanel,goalTarget):goalPanel}
   {showProposal&&proposal?<div className={css.result} data-auto-video-proposal aria-live="polite">
     {chosen?<div>
       <h4>{t.reason}: {chosen.label[locale]}</h4>
       {selectedGoal?<p className={css.meta}>{t.selectedGoal}: {selectedGoal.labels[locale]}</p>:null}
       <p className={css.meta}>{length} s · {aspect==="portrait"?"9:16":aspect==="square"?"1:1":"16:9"} · {t.source}</p>
       <p className={css.meta} data-auto-video-matched-theme>{t.topic}: {themeLabels[locale][proposal.theme as VideoTheme]}</p>
       {proposal.confidence==="low"||proposal.confidence==="medium"?<p className={css.warning}>{t.uncertain}</p>:null}
       {proposal.requiresNewAiFootage?<p className={css.warning}>{t.warning}</p>:null}
       <p className={css.variantsTitle}>{t.variants}</p>
       <div className={css.storyChoices} role="group" aria-label={t.variants} data-auto-video-story-options>
         {alternatives.map((id,index)=>{
           const option=presets.find(item=>item.id===id);
           return option?<button key={id} type="button" data-auto-video-option={id}
             aria-pressed={chosen.id===id} disabled={disabled}
             onClick={()=>{if(chosen?.id!==id)onInvalidate?.();
               setOverrideId(id===proposal.presetId?null:id);setTimelineEdits(null);}}>
             {scenePoster(option.clips[0])?<img src={scenePoster(option.clips[0])!}
               alt="" loading="lazy" className={css.storyPoster}/>:null}
             <span className={css.storyNumber}>{index+1}. {chosen.id===id?<Check size={15} aria-hidden="true"/>:null}</span>
             <strong>{option.label[locale]}</strong>
             <small>{sceneById.get(option.clips[0])?.description[locale]||""}</small>
           </button>:null;
         })}
       </div>
       <p className={css.variantsTitle}>{t.storyboard}</p>
       <ol className={css.shots} data-auto-video-storyboard>
         {stageClipIds.map((clip,index)=>{
           const scene=sceneById.get(clip);
           return <li key={clip}>
             {scenePoster(clip)?<img src={scenePoster(clip)!} alt="" loading="lazy" className={css.shotPoster}/>:null}
             <b>{index+1}. {t.stages[index]} · {stageDurations[index]} s</b><span>{sceneLabel(clip)}</span>
             {scene?<small className={css.clipDescription}>{scene.description[locale]}</small>:null}
             {scene?<small className={css.clipTags}>{themeLabels[locale][scene.theme as VideoTheme]||scene.theme} · {scene.tags.slice(0,3).join(" · ")}</small>:null}
           </li>;
         })}
       </ol>
       <div className={css.timelineTrack} data-auto-video-timeline-preview
         role="list" aria-label={t.timeline}>
         {stageClipIds.map((clip,index)=><div key={clip} role="listitem"
           className={css.timelineSegment} style={{flexGrow:stageDurations[index]}}
           title={sceneLabel(clip)+" · "+stageDurations[index]+" s"}>
           <strong>{index+1}</strong><span>{stageDurations[index]} s</span>
         </div>)}
       </div>
       <details className={css.montageDetails} data-auto-video-montage>
         <summary>{t.openMontage}</summary>
         <p className={css.notice}>{t.montageHelp}</p>
         <div className={css.montageRows}>
           {stageClipIds.map((clip,index)=><div className={css.montageRow} key={clip}>
             <span className={css.montageName}>
               <strong>{index+1}. {t.stages[index]} · {stageDurations[index]} s</strong>
               <small>{sceneLabel(clip)}</small>
             </span>
             <label className={css.montageReplace}>
               <span>{t.replaceScene}</span>
               <select data-auto-video-stage-replace={index} value={clip}
                 disabled={disabled||availableReplacements[index].length===0}
                 onChange={event=>replaceStage(index,event.currentTarget.value)}>
                 <option value={clip}>{sceneLabel(clip)}</option>
                 {availableReplacements[index].map(item=>
                   <option key={item.id} value={item.id}>{sceneLabel(item.id)}</option>)}
               </select>
             </label>
             <div className={css.montageActions}>
               <button type="button" disabled={disabled||index===0}
                 aria-label={t.reorder+" ← "+sceneLabel(clip)}
                 onClick={()=>swapScene(index,-1)}>←</button>
               <button type="button" disabled={disabled||index===3}
                 aria-label={t.reorder+" → "+sceneLabel(clip)}
                 onClick={()=>swapScene(index,1)}>→</button>
               {index<3?<button type="button" disabled={disabled||stageDurations[index]<=2}
                 aria-label={t.less+" "+sceneLabel(clip)}
                 onClick={()=>shiftBoundary(index,-1)}>−1s</button>:null}
               {index<3?<button type="button" disabled={disabled||stageDurations[index+1]<=2}
                 aria-label={t.more+" "+sceneLabel(clip)}
                 onClick={()=>shiftBoundary(index,1)}>+1s</button>:null}
             </div>
           </div>)}
         </div>
         <div className={css.trackSection} data-auto-video-tracks>
           <div className={css.trackLabel}>{t.captionTrack}</div>
           <div className={css.textSegments} data-auto-video-text-track
             role="list" aria-label={t.captionTrack}>
             {stageCaptions.map((caption,index)=><div key={index} role="listitem"
               data-caption-active={caption.trim()?"true":"false"}
               title={caption||t.captionTrack}
               className={css.textSegment} style={{flexGrow:stageDurations[index]}}>
               <span>{caption?"Aa":"·"}</span>
             </div>)}
           </div>
           <div className={css.stageCaptionFields} data-auto-video-caption-editor>
             <p className={css.notice}>{t.captionHint}</p>
             {stageClipIds.map((clip,index)=><label key={clip} className={css.captionInput}>
               <span>{index+1}. {t.stages[index]} · {stageDurations[index]} s</span>
               <input type="text" data-auto-video-stage-caption={index}
                 maxLength={STAGE_CAPTION_LIMIT} disabled={disabled}
                 value={stageCaptions[index]||""}
                 onChange={event=>{
                   const captions=[...stageCaptions];
                   captions[index]=event.currentTarget.value;
                   editTimeline(stageClipIds,stageDurations,captions);
                 }}/>
             </label>)}
           </div>
           <div className={css.soundTrack} data-auto-video-sound-track
             data-attached={audioAttached?"true":"false"}>
             <div className={css.soundTrackLabel}>
               <strong>{t.soundTrack}</strong>
               <small>{audioAttached?(audioTrackLabel||t.soundTrack):t.soundMissing}</small>
             </div>
             {onOpenAudio?<button type="button" disabled={disabled} onClick={onOpenAudio}>
               {t.soundSettings}</button>:null}
           </div>
         </div>
         <p className={css.notice}>{t.replacementHint} {t.audioHint}</p>
       </details>
       <details className={css.details} data-auto-video-adjust>
         <summary>{t.edit}</summary>
         <div className={css.adjust}><span>{t.topic}:</span>
           {allThemes.map(value=><button type="button" key={value} disabled={disabled}
             aria-pressed={proposal.theme===value}
             onClick={()=>{
               onInvalidate?.();setOverrideId(null);setTimelineEdits(null);
               setProposal(recommendAutoVideo({goal,goalId:selectedGoalId,locale,fallbackTheme:theme,presets,scenes,
                 preferredTheme:value}));
             }}>{themeLabels[locale][value]}</button>)}
         </div>
         <div className={css.adjust}><span>{t.duration}:</span>
           {allowedDurations.map(n=><button type="button" key={n} disabled={disabled}
             aria-pressed={length===n} onClick={()=>{if(length!==n)onInvalidate?.();
               setSeconds(n);setTimelineEdits(null);}}>{n} s</button>)}
         </div>
       </details>
       <button type="button" data-auto-video-confirm className={css.confirm}
         disabled={disabled} onClick={()=>{
           const accepted=onApply(chosen.id,length as 10|15|20|30|60,{
             clipIds:stageClipIds,durationSecondsByStage:stageDurations,
             excludedMotifs:proposal.excludedMotifs,captionTexts:stageCaptions});
           if(accepted!==false)setConfirmedTimelineKey(timelineKey);
         }}>
         <Check size={18} aria-hidden="true"/> {t.accept}
       </button>
       {activePresetId===chosen.id&&confirmedTimelineKey===timelineKey?<div className={css.appliedActions}>
         <p className={css.notice} role="status">{t.applied}</p>
         {onCreate?<button type="button" className={css.create} data-auto-video-create
           disabled={disabled||!canCreate} onClick={onCreate}>
           <Play size={17} fill="currentColor" aria-hidden="true"/>
           {rendering?t.waiting:t.create}
         </button>:null}
         {!canCreate&&!disabled?<p className={css.notice}>{t.blocked}</p>:null}
       </div>:null}
       <p className={css.notice}>{t.safety}</p>
     </div>:<p role="status" className={css.warning}>{t.empty}</p>}
   </div>:null}
 </section>;
}
