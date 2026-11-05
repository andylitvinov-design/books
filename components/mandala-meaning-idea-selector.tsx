"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {listStates} from "@/lib/mandala/state-transition/state-catalog.mjs";
import {listMeaningAxes,listEmotionalVectors} from "@/lib/mandala/meaning-emotion/idea-engine.mjs";
import {listCurrentEmotionClusters,listDesiredEmotionClusters,
 getEmotionalClusterForState,getEmotionalVectorByStates,calculateEmotionalRelief}
 from "@/lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";
import css from "./mandala-meaning-idea-selector.module.css";

type Locale="ru"|"en"|"es";
type StateOption={id:string;label:string};
type ClusterOption={id:string;label:string;representativeStateId:string;stateIds:string[]};
type MeaningAxisOption={id:string;label:string;description:string};
type VectorOption={id:string;currentStateId:string;desiredStateId:string;label:string};
type Idea={ideaId:string;ideaText:string;axisId:string;premiseType:string;
  editorReviewStatus:string;approvedByOwner:boolean};
type Response={status:string;ideas:Idea[];axisOptions:{id:string;label:string;description:string}[];
  clarification:string|null;safetyNotes:string[];normalizedInputs?:{vectorId:string|null}|null};
export type ConfirmedMeaningHandoff={
 schemaVersion:string;status:string;
 ideaBrief:{status:string;topicId:string;ideaText?:string|null;confirmedIdeaId?:string|null;
  meaningAxisId?:string|null;userEdited?:boolean;editorialReviewStatus?:string;
  ownerEditorialApproved?:boolean;emotionalTransition?:{from:string;to:string;vectorId:string}}|null;
 emotionalScenario:{status:string;stages:string[];pace:string}|null;
 filmScenario:{scenarioId:string;label:string;narrativeBeats:string[];centralIdea:string}|null;
 psychologistMind:{status:string;processCodes?:string[];clinicalTreatment:boolean}|null;
 renderReady:boolean;mayPublishVideo:boolean;
};
type Props={locale:Locale;topicId:string;disabled:boolean;selectedScenarioId:string;
 initialAxisId?:string;canChooseScenario?:boolean;
 onConfirmHandoff:(handoff:ConfirmedMeaningHandoff|null,includeCaption:boolean)=>void;
 onChooseScenario:(scenarioId:string)=>void};
const wording={
 ru:{title:"Тема и идея вашего фильма",lead:"Сначала выберите «Сейчас → Хочу», затем смысл истории. Это творческий выбор, не диагноз.",
 current:"Сейчас",desired:"Хочу",empty:"Выберите кластер",vectors:"Примеры переходов",
 refine:"Уточнить конкретную эмоцию",precise:"Уточнение",valence:"Ощущение: −3 неприятно … +3 приятно",
 charge:"Эмоциональный заряд",resourceScore:"Ресурсный ориентир",suggestion:"Валентность предложена каталогом — её можно изменить",
 partialCoverage:"Часть уточнённых сочетаний имеет подготовленные идеи",missingCoverage:"Для этой пары доступны три авторские идеи на каждую смысловую ось; вы можете изменить или отклонить их",
 uncurated:"Для этого сочетания не нашлось подходящей безопасной идеи. Выберите другое направление или нейтральное видео.",
 intensity:"Сила переживания (0–10, необязательно)",energy:"Энергия сейчас (0–10, необязательно)",
 optional:"Дополнительные настройки",unknown:"Не указано",axis:"Что для вас сейчас важнее?",
 axisAuto:"Предложите варианты",discover:"Показать смысловые идеи",
 suggest:"Идея вашего фильма",different:"Другая идея",edit:"Изменить словами",
 text:"Формулировка идеи",confirm:"Подходит — подтвердить идею",
 noIdea:"Без смысловой идеи — спокойное видео",reset:"Изменить выбор",
 caption:"Добавить смысловую идею титром, если последний титр ещё не заполнен",
 reviewed:"Авторский вариант для вашего выбора; профессиональный эффект не обещается.",
 editorial:"Редакторское утверждение ещё не завершено. Кадры и права проверяются отдельно.",
 pending:"Идея ещё не подтверждена и не меняет ваше видео.",
 selected:"Идея подтверждена; эмоциональная траектория предложена отдельно от физического видеоряда.",
 plan:"Предложенный сценарий",apply:"Выбрать этот сценарий для видеомонтажа",
 existing:"Ваш уже выбранный сценарий остаётся без изменений.",
 mismatch:"Идея подтверждена, но сценарию ещё требуется отдельная проверка.",
 tooLong:"Для титра текст длиннее допустимого. Сократите формулировку или оставьте видео без нового титра.",
 safety:"Вы можете отказаться или остановиться. Подбор не является лечением.",
 error:"Не удалось предложить безопасную идею. Уточните состояния или выберите нейтральное видео.",
 saved:"Подтверждённый выбор сохранён только в текущей вкладке.",
 consent:"При подтверждении только вы решаете, применять ли идею к монтажу.",
 tryAnother:"Выберите другую ось или другой эмоциональный переход.",
 },
 en:{title:"Your film's theme and idea",lead:"Choose Now → Want, then the story's meaning. A creative choice, not a diagnosis.",
 current:"Now",desired:"Want",empty:"Choose a cluster",vectors:"Suggested transitions",
 refine:"Refine the exact feeling",precise:"Specific feeling",valence:"Feeling: −3 unpleasant … +3 pleasant",
 charge:"Emotional charge",resourceScore:"Resource orientation",suggestion:"Valence suggested by catalog — you may change it",
 partialCoverage:"Some refined pairs have curated ideas",missingCoverage:"Three original ideas are available for each meaning axis; you may edit or decline them",
 uncurated:"No suitable safe idea for this pair. Choose another or a neutral video.",
 intensity:"Intensity (0–10, optional)",energy:"Energy now (0–10, optional)",
 optional:"Optional settings",unknown:"Not specified",axis:"What matters most to you?",
 axisAuto:"Suggest directions",discover:"Explore meaning ideas",
 suggest:"Your film's idea",different:"Another idea",edit:"Edit in my words",
 text:"Idea wording",confirm:"This fits — confirm idea",
 noIdea:"No meaning idea — a calm video",reset:"Change choices",
 caption:"Add this idea as a caption if the final caption is still empty",
 reviewed:"Original creative option for your choice; no benefit is guaranteed.",
 editorial:"Editorial owner approval is pending. Footage and rights are checked separately.",
 pending:"The idea is not yet confirmed and does not change your video.",
 selected:"Idea confirmed; the emotional path is proposed separately from physical footage.",
 plan:"Suggested story",apply:"Choose this story for the film",
 existing:"Your existing story choice remains unchanged.",
 mismatch:"The confirmed idea still needs a compatible story review.",
 tooLong:"This idea exceeds the caption length. Shorten it or omit the new caption.",
 safety:"You may stop or skip. This is not treatment.",
 error:"No safe idea could be suggested. Refine the states or choose a neutral video.",
 saved:"Your confirmed choice is retained in this browser tab only.",
 consent:"You decide whether to apply the idea to the film.",
 tryAnother:"Choose another axis or emotional transition."},
 es:{title:"El sentido y la idea de tu película",lead:"Elige Ahora → Quiero y luego el sentido de la historia. Es una elección creativa, no un diagnóstico.",
 current:"Ahora",desired:"Quiero",empty:"Elige un grupo",vectors:"Transiciones sugeridas",
 refine:"Precisar la emoción",precise:"Emoción concreta",valence:"Sensación: −3 desagradable … +3 agradable",
 charge:"Carga emocional",resourceScore:"Recurso orientativo",suggestion:"Valencia sugerida por catálogo — puedes cambiarla",
 partialCoverage:"Algunos pares precisos tienen ideas revisadas",missingCoverage:"Hay tres ideas originales para cada eje de sentido; puedes editarlas o rechazarlas",
 uncurated:"No hay una idea segura para este par. Elige otra opción o un vídeo neutro.",
 intensity:"Intensidad (0–10, opcional)",energy:"Energía actual (0–10, opcional)",
 optional:"Ajustes opcionales",unknown:"No indicado",axis:"¿Qué es más importante para ti?",
 axisAuto:"Sugerir direcciones",discover:"Explorar ideas",
 suggest:"Idea de tu película",different:"Otra idea",edit:"Cambiar mis palabras",
 text:"Texto de la idea",confirm:"Me representa — confirmar idea",
 noIdea:"Sin idea de sentido — vídeo tranquilo",reset:"Cambiar la elección",
 caption:"Añadir la idea como subtítulo si el último todavía está vacío",
 reviewed:"Propuesta creativa original, sin promesa de eficacia.",
 editorial:"Pendiente de aprobación editorial. El vídeo y los derechos se verifican aparte.",
 pending:"La idea no se ha confirmado y no modifica tu vídeo.",
 selected:"Idea confirmada; el recorrido emocional es distinto de las imágenes físicas.",
 plan:"Historia sugerida",apply:"Elegir esta historia para el vídeo",
 existing:"Tu historia ya seleccionada no cambia.",
 mismatch:"La idea confirmada requiere revisión de compatibilidad narrativa.",
 tooLong:"La idea supera la longitud del subtítulo. Acórtala u omite el nuevo subtítulo.",
 safety:"Puedes detenerte u omitirlo. No es tratamiento.",
 error:"No hay idea segura disponible. Precisa los estados o elige vídeo neutro.",
 saved:"Tu elección confirmada se guarda solo en esta pestaña.",
 consent:"Tú decides si aplicas la idea al montaje.",
 tryAnother:"Elige otro eje o transición emocional."},
} as const;

// Narrow the pure JS bridge at the React boundary. Never trust arbitrary
// browser JSON as an authentication, therapy or rendered-media decision.
const objectOf=(x:unknown):Record<string,unknown>|null=>
 x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:null;
const stringsOf=(x:unknown):string[]=>
 Array.isArray(x)?x.filter((v):v is string=>typeof v==="string"):[];
function parsedHandoff(value:unknown):ConfirmedMeaningHandoff|null{
 const src=objectOf(value);
 if(!src||!["editorial_only","neutral_supportive"].includes(String(src.status)))return null;
 const idea=objectOf(src.ideaBrief),mind=objectOf(src.psychologistMind),
   emotion=objectOf(src.emotionalScenario),film=objectOf(src.filmScenario),
   transition=objectOf(idea?.emotionalTransition);
 if(!idea||!mind||!emotion||!["confirmed","neutral_confirmed"].includes(String(idea.status)))
   return null;
 if(src.renderReady!==false||src.mayPublishVideo!==false||mind.clinicalTreatment!==false)
   return null; // never promote a future unverified/clinical bridge into the UI
 const confirmed=String(idea.status);
 if(confirmed==="confirmed"&&!film)return null;
 return {
   schemaVersion:String(src.schemaVersion),status:String(src.status),
   ideaBrief:{status:confirmed,topicId:String(idea.topicId),
     ideaText:typeof idea.ideaText==="string"?idea.ideaText:null,
     confirmedIdeaId:typeof idea.confirmedIdeaId==="string"?idea.confirmedIdeaId:null,
     meaningAxisId:typeof idea.meaningAxisId==="string"?idea.meaningAxisId:null,
     userEdited:idea.userEdited===true,
     editorialReviewStatus:typeof idea.editorialReviewStatus==="string"?idea.editorialReviewStatus:undefined,
     ownerEditorialApproved:idea.ownerEditorialApproved===true,
     emotionalTransition:transition?{
       from:String(transition.from),to:String(transition.to),vectorId:String(transition.vectorId)
     }:undefined},
   psychologistMind:{status:String(mind.status),clinicalTreatment:false,
     processCodes:stringsOf(mind.processCodes)},
   emotionalScenario:{status:String(emotion.status),stages:stringsOf(emotion.stages),
     pace:String(emotion.pace)},
   filmScenario:film?{scenarioId:String(film.scenarioId),label:String(film.label),
     narrativeBeats:stringsOf(film.narrativeBeats),
     centralIdea:String(film.centralIdea)}:null,
   mayPublishVideo:false,renderReady:false,
 };
}
const storageKey=(topicId:string)=>"hh-meaning-idea-v1-session:"+topicId;
const digitOrNull=(value:string)=>value===""?null:Number(value);
export function MandalaMeaningIdeaSelector({locale,topicId,disabled,selectedScenarioId,
 initialAxisId="",canChooseScenario=true,onConfirmHandoff,onChooseScenario}:Props){
 const t=wording[locale];
 const states=useMemo<StateOption[]>(()=>listStates(locale).map(x=>({id:String(x.id),label:String(x.label)})),[locale]);
 const axes=useMemo<MeaningAxisOption[]>(()=>listMeaningAxes(locale),[locale]);
 const nowClusters=useMemo<ClusterOption[]>(()=>listCurrentEmotionClusters(locale),[locale]);
 const wantClusters=useMemo<ClusterOption[]>(()=>listDesiredEmotionClusters(locale),[locale]);
 const vectors=useMemo<VectorOption[]>(()=>listEmotionalVectors(locale),[locale]);
 const validIds=useMemo(()=>new Set(states.map(x=>x.id)),[states]);
 const [current,setCurrent]=useState("");
 const [desired,setDesired]=useState("");
 const [intensity,setIntensity]=useState("");
 const [energy,setEnergy]=useState("");
 const [valence,setValence]=useState("");
 const [axis,setAxis]=useState(initialAxisId);
 const [response,setResponse]=useState<Response|null>(null);
 const [selectedId,setSelectedId]=useState("");
 const [customText,setCustomText]=useState("");
 const [editing,setEditing]=useState(false);
 const [includeCaption,setIncludeCaption]=useState(true);
 const [handoff,setHandoff]=useState<ConfirmedMeaningHandoff|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const requestSerial=useRef(0);
 const onConfirmRef=useRef(onConfirmHandoff);
 useEffect(()=>{onConfirmRef.current=onConfirmHandoff},[onConfirmHandoff]);
 const makeRequest=(from:string=current,to:string=desired,which:string=axis,
   force:number|null=digitOrNull(intensity),resource:number|null=digitOrNull(energy),
 feltValence:number|null=digitOrNull(valence))=>({
    schemaVersion:"meaning-idea-request-v1",topicId,locale,
    current:{stateId:from,intensity:force,valence:feltValence},desired:{stateId:to},
    energy:resource,meaningAxisId:which||null,consentScope:"this_video_only",
    preferences:{pace:null},
  });
 useEffect(()=>{
   let active=true;
   requestSerial.current++;
   setCurrent("");setDesired("");setAxis(initialAxisId);setIntensity("");setEnergy("");setValence("");
   setResponse(null);setSelectedId("");setCustomText("");setEditing(false);setError("");
   setHandoff(null);setBusy(false);
   try{
     const saved=JSON.parse(window.sessionStorage.getItem(storageKey(topicId))||"null");
     if(saved&&saved.locale===locale&&validIds.has(saved.current)&&validIds.has(saved.desired)&&
       (saved.axis===""||axes.some(x=>x.id===saved.axis))&&(!initialAxisId||saved.axis===initialAxisId)){
       setCurrent(saved.current);setDesired(saved.desired);setAxis(initialAxisId||saved.axis);
       const strong=Number.isInteger(saved.intensity)&&saved.intensity>=0&&saved.intensity<=10?
         String(saved.intensity):"";
       const fuel=Number.isInteger(saved.energy)&&saved.energy>=0&&saved.energy<=10?
         String(saved.energy):"";
       const feeling=Number.isInteger(saved.valence)&&saved.valence>=-3&&saved.valence<=3?
         String(saved.valence):"";
       setIntensity(strong);setEnergy(fuel);setValence(feeling);
       if(saved.ideaId||saved.neutral===true){
         void Promise.all([
           import("@/lib/mandala/meaning-emotion/idea-engine.mjs"),
           import("@/lib/mandala/meaning-emotion/idea-film-handoff.mjs")
         ]).then(([engine,bridge])=>{
           if(!active)return;
           const req=makeRequest(saved.current,saved.desired,initialAxisId||saved.axis,
             digitOrNull(strong),digitOrNull(fuel),digitOrNull(feeling));
           const suggestion=engine.recommendMeaningIdeas(req);
           const idea=engine.confirmMeaningIdea(req,saved.neutral===true?
             {neutral:true}:{ideaId:saved.ideaId,
               customIdeaText:typeof saved.customText==="string"?saved.customText:undefined});
           if(!idea)return;
           const adapted=parsedHandoff(bridge.buildMeaningFilmHandoff(idea,{locale}));
           if(!adapted)return;
           setResponse(suggestion);setSelectedId(saved.ideaId||"");
           setCustomText(typeof saved.customText==="string"?saved.customText:"");
           setIncludeCaption(saved.includeCaption===true);setHandoff(adapted);
           onConfirmRef.current(adapted,saved.includeCaption===true);
         }).catch(()=>{/* no storage/browser adapter: live selection still works */});
       }
     }
   }catch{/* sessionStorage may be blocked; stay in memory */}
   return ()=>{active=false;requestSerial.current++};
 // Intentionally reset only when topic/locale changes, not on callback re-render.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[topicId,locale,validIds,axes,initialAxisId]);
 const invalidate=()=>{
   requestSerial.current++;
   setResponse(null);setSelectedId("");setCustomText("");setEditing(false);
   setHandoff(null);setError("");setBusy(false);
   onConfirmRef.current(null,false);
   try{window.sessionStorage.removeItem(storageKey(topicId))}catch{/* optional */}
 };
 const chooseStates=(from:string,to:string)=>{
   invalidate();if(from!==current)setValence("");setCurrent(from);setDesired(to)
 };
 const selected=response?.ideas.find(x=>x.ideaId===selectedId)||null;
 const suggest=async()=>{
   if(disabled||busy||!validIds.has(current)||!validIds.has(desired))return;
   const serial=++requestSerial.current;
   setBusy(true);setError("");setResponse(null);setSelectedId("");setHandoff(null);
   onConfirmRef.current(null,false);
   try{
     const {recommendMeaningIdeas}=await import("@/lib/mandala/meaning-emotion/idea-engine.mjs");
     const r:Response=recommendMeaningIdeas(makeRequest());
     if(serial!==requestSerial.current)return;
     setResponse(r);
     if(r.status==="ok")setSelectedId(r.ideas[0]?.ideaId||"");
     else if(r.status==="safety_support"||r.status==="no_safe_idea"||r.status==="clarify")
       setError(r.status==="no_safe_idea"?t.uncurated:r.clarification||t.error);
   }catch{if(serial===requestSerial.current)setError(t.error)}
   finally{if(serial===requestSerial.current)setBusy(false)}
 };
 const confirm=async(neutral=false)=>{
   if(busy||disabled||!validIds.has(current)||!validIds.has(desired))return;
   const serial=++requestSerial.current;setBusy(true);setError("");
   try{
     const [{confirmMeaningIdea},{buildMeaningFilmHandoff}]=await Promise.all([
       import("@/lib/mandala/meaning-emotion/idea-engine.mjs"),
       import("@/lib/mandala/meaning-emotion/idea-film-handoff.mjs"),
     ]);
     if(serial!==requestSerial.current)return;
     const custom=editing?customText:null;
     const brief=confirmMeaningIdea(makeRequest(),neutral?{neutral:true}:
       {ideaId:selectedId,customIdeaText:custom});
     if(!brief){setError(t.error);return}
     const next=parsedHandoff(buildMeaningFilmHandoff(brief,{locale}));
     if(!next){
       setError(t.mismatch);return;
     }
     setHandoff(next);onConfirmRef.current(next,includeCaption&&!neutral);
     try{
       window.sessionStorage.setItem(storageKey(topicId),JSON.stringify({
         locale,current,desired,axis,intensity:digitOrNull(intensity),energy:digitOrNull(energy),
         valence:digitOrNull(valence),
         ideaId:neutral?null:selectedId,neutral,customText:!neutral&&editing?custom:null,
         includeCaption:includeCaption&&!neutral,
       }));
     }catch{/* No browser storage is required */}
   }catch{if(serial===requestSerial.current)setError(t.error)}
   finally{if(serial===requestSerial.current)setBusy(false)}
 };
 const currentOption=selected?.ideaText||"";
 const nowGroup=getEmotionalClusterForState(current,"current");
 const wantGroup=getEmotionalClusterForState(desired,"desired");
 const vectorCell=getEmotionalVectorByStates(current,desired);
 const relief=calculateEmotionalRelief({currentStateId:current,
   valence:digitOrNull(valence),intensity:digitOrNull(intensity),energy:digitOrNull(energy)});
 return <section className={css.panel} data-meaning-idea-selector data-topic-id={topicId}
   aria-label={t.title}>
   <h4 className={css.title}>{t.title}</h4><p className={css.hint}>{t.lead}</p>
   <div className={css.fields}>
     <label className={css.field}>{t.current}
       <select data-meaning-current-cluster value={nowGroup?.id||""} disabled={disabled||busy}
         onChange={e=>chooseStates(nowClusters.find(x=>x.id===e.currentTarget.value)?.representativeStateId||"",desired)}>
         <option value="">{t.empty}</option>
         {nowClusters.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
       </select>
     </label>
     <label className={css.field}>{t.desired}
       <select data-meaning-desired-cluster value={wantGroup?.id||""} disabled={disabled||busy}
         onChange={e=>chooseStates(current,wantClusters.find(x=>x.id===e.currentTarget.value)?.representativeStateId||"")}>
         <option value="">{t.empty}</option>
         {wantClusters.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
       </select>
     </label>
   </div>
   <details className={css.compact}>
     <summary>{t.refine}</summary>
     <div className={css.fields}>
       <label className={css.field}>{t.current} — {t.precise}
         <select data-meaning-current value={current} disabled={disabled||busy}
           onChange={e=>chooseStates(e.currentTarget.value,desired)}>
           <option value="">{t.empty}</option>
           {states.filter(x=>getEmotionalClusterForState(x.id,"current"))
             .map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select>
       </label>
       <label className={css.field}>{t.desired} — {t.precise}
         <select data-meaning-desired value={desired} disabled={disabled||busy}
           onChange={e=>chooseStates(current,e.currentTarget.value)}>
           <option value="">{t.empty}</option>
           {states.filter(x=>getEmotionalClusterForState(x.id,"desired"))
             .map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select>
       </label>
     </div>
   </details>
   <details className={css.compact}>
     <summary>{t.vectors}</summary>
     <div className={css.presetRow} role="group" aria-label={t.vectors}>
       {vectors.map(x=><button key={x.id} type="button" className={css.chip}
         disabled={disabled||busy} data-meaning-vector={x.id}
         aria-pressed={current===x.currentStateId&&desired===x.desiredStateId}
         onClick={()=>chooseStates(x.currentStateId,x.desiredStateId)}>{x.label}</button>)}
     </div>
   </details>
   {!initialAxisId?<><p className={css.legend}>{t.axis}</p>
   <div className={css.axes} role="group" aria-label={t.axis}>
     <button type="button" className={css.chip} data-meaning-axis="auto"
       disabled={disabled||busy} aria-pressed={!axis} onClick={()=>{invalidate();setAxis("")}}>
       {t.axisAuto}
     </button>
     {axes.map(item=><button key={item.id} type="button" className={css.chip}
       data-meaning-axis={item.id} disabled={disabled||busy}
       title={item.description} aria-label={item.label+". "+item.description}
       aria-pressed={axis===item.id} onClick={()=>{invalidate();setAxis(item.id)}}>
       {item.label}
     </button>)}
   </div></>:null}
   <details className={css.compact}><summary>{t.optional}</summary>
     <div className={css.fields}>
       <label className={css.field}>{t.intensity}
         <select value={intensity} data-meaning-intensity disabled={disabled||busy}
           onChange={e=>{invalidate();setIntensity(e.currentTarget.value)}}>
           <option value="">{t.unknown}</option>
           {Array.from({length:11},(_,n)=><option key={n} value={n}>{n}</option>)}
         </select>
       </label>
       <label className={css.field}>{t.energy}
         <select value={energy} data-meaning-energy disabled={disabled||busy}
           onChange={e=>{invalidate();setEnergy(e.currentTarget.value)}}>
           <option value="">{t.unknown}</option>
           {Array.from({length:11},(_,n)=><option key={n} value={n}>{n}</option>)}
         </select>
       </label>
       <label className={css.field}>{t.valence}
         <select value={valence} data-meaning-valence disabled={disabled||busy}
           onChange={e=>{invalidate();setValence(e.currentTarget.value)}}>
           <option value="">{t.unknown}</option>
           {[-3,-2,-1,0,1,2,3].map(n=><option key={n} value={n}>
             {n>0?"+"+n:n}</option>)}
         </select>
       </label>
     </div>
   </details>
   {vectorCell?<p className={css.notice} data-meaning-vector-cell={vectorCell.id}>
     {nowClusters.find(x=>x.id===nowGroup?.id)?.label} → {wantClusters.find(x=>x.id===wantGroup?.id)?.label}.
     {" "}{vectorCell.reviewStatus==="partially_curated"?t.partialCoverage:t.missingCoverage}.
   </p>:null}
   {relief.status==="calculated"?<p className={css.notice} data-meaning-relief>
     {t.charge}: <b>{relief.emotionalCharge!>0?"+":""}{relief.emotionalCharge}</b> (−30…+30).
     {" "}{t.resourceScore}: <b>{relief.resourceIndex}/100</b>.
     {relief.valenceSource==="editorial_suggestion"?" "+t.suggestion:""}
   </p>:null}
   <button type="button" className={css.primary} data-meaning-suggest
     disabled={disabled||busy||!current||!desired} onClick={suggest}>
     {t.discover}
   </button>
   {response?.status==="choose_axis"?<p className={css.notice} role="status">
     {response.clarification}
     <span className={css.suggestedAxes}>{response.axisOptions.map(item=>
       <button type="button" key={item.id} disabled={disabled||busy}
         onClick={()=>{invalidate();setAxis(item.id)}}>{item.label}</button>)}</span>
   </p>:null}
   {response?.status==="ok"&&response.ideas.length>0?<div className={css.options}
      data-meaning-ideas role="radiogroup" aria-label={t.suggest}>
     <strong>{t.suggest}</strong>
     <p className={css.hint}>{t.pending}</p>
     {response.ideas.map((idea,i)=><label key={idea.ideaId} className={css.option}
       data-meaning-idea={idea.ideaId}>
       <input type="radio" name={"meaning-idea-"+topicId} disabled={disabled||busy}
         checked={selectedId===idea.ideaId}
         value={idea.ideaId} onChange={()=>{setSelectedId(idea.ideaId);setEditing(false);
           setCustomText("");setHandoff(null);onConfirmRef.current(null,false)}}/>
       <span><b>{i===0?t.suggest:t.different}</b><span>{idea.ideaText}</span></span>
     </label>)}
     {selected?<><button className={css.linkAction} type="button"
       data-meaning-edit disabled={disabled||busy}
       onClick={()=>{setEditing(x=>!x);if(!editing)setCustomText(currentOption)}}>
       {t.edit}
     </button>
       {editing?<label className={css.field}>{t.text}
         <textarea data-meaning-custom maxLength={220} value={customText}
           onChange={e=>setCustomText(e.currentTarget.value)}
           rows={2} disabled={disabled||busy}/>
       </label>:null}
       <label className={css.check}>
         <input type="checkbox" data-meaning-caption checked={includeCaption}
           disabled={disabled||busy}
           onChange={e=>setIncludeCaption(e.currentTarget.checked)}/>
         <span>{t.caption}</span>
       </label>
       <button type="button" className={css.primary} data-meaning-confirm
         disabled={disabled||busy} onClick={()=>void confirm(false)}>{t.confirm}</button>
       <p className={css.disclaimer}>{t.reviewed} {t.editorial}</p>
     </>:null}
   </div>:null}
   <button type="button" className={css.neutral} data-meaning-neutral
     disabled={disabled||busy||!current||!desired} onClick={()=>void confirm(true)}>
     {t.noIdea}
   </button>
   {error?<p className={css.warning} role="status" data-meaning-error>{error}</p>:null}
   {handoff?<div className={css.confirmed} role="status" data-meaning-confirmed>
      <strong>{t.selected}</strong>
      {handoff.ideaBrief?.ideaText?<p>{handoff.ideaBrief.ideaText}</p>:null}
      <p className={css.hint}>{t.saved} {t.consent}</p>
      {handoff.status==="editorial_only"&&handoff.filmScenario?
       <div data-meaning-story-plan>
        <strong>{t.plan}: {handoff.filmScenario.label}</strong>
        <ol>{handoff.filmScenario.narrativeBeats.map((beat,i)=><li key={i}>{beat}</li>)}</ol>
        {selectedScenarioId?<p>{t.existing}</p>:
         <button type="button" className={css.secondary} data-meaning-choose-scenario
           disabled={disabled||busy||!canChooseScenario}
           onClick={()=>onChooseScenario(handoff.filmScenario!.scenarioId)}>{t.apply}</button>}
       </div>:null}
     </div>:null}
   <p className={css.disclaimer}>{t.safety}</p>
 </section>;
}
