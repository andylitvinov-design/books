"use client";
import {useMemo} from "react";
import {ArrowRight,Brain,Check,Clock3,Film,Play,Sparkles} from "lucide-react";
import {suggestVideoConcept} from "@/lib/mandala/auto-video-concept.mjs";
import {buildAlignedStorySceneGuides} from "@/lib/mandala/storyboard-content-alignment.mjs";
import {planReviewedFilmedStory,isReviewedFilmedStorySequence,isReviewedFilmedStoryScene} from "@/lib/mandala/reviewed-filmed-story.mjs";
import type {CategoryStoryboardShot} from "@/lib/mandala/category-video-storyboard.mjs";
import type {ApprovedVideoConcept} from "./mandala-video-concept";
import styles from "./mandala-video-mobile.module.css";

type Locale="ru"|"en"|"es";
type Shot={sceneId:string;startSeconds:number;durationSeconds:number};
type Props={
 locale:Locale;goal:string;theme:string;durationSeconds:number;aspect:string;styleIndex:number;
 pace:"slow"|"dynamic";personalization?:{currentState?:string;desiredState?:string;focus?:string}|null;
 appliedStoryKey?:string|null;
 phrases:readonly string[];transcript:object|null;approvedConcept:ApprovedVideoConcept|null;
 scenes:readonly unknown[];appliedShots:readonly Shot[]|null;
 resolveMedia:(id:string)=>{poster:string|null;title:string};
 disabled:boolean;
 onApply:(shots:readonly CategoryStoryboardShot[],concept:ApprovedVideoConcept,key:string,captions:string[])=>void;
 onPreview:(second:number)=>void;onOpenIdeas:()=>void;
};
const words={
 ru:{source:"Автоматически из «Идей»",scene:"Сцена",visual:"В кадре",preview:"Посмотреть кадр",
  apply:"Применить сцены к монтажу",applied:"Сцены в текущем монтаже",ideas:"Открыть концепт в Идеях",
  sample:"Пример сюжета. Уточните запрос в «Идеях» для персонального результата.",
  replace:"Текущий монтаж не соответствует выбранным настройкам или содержит неподтверждённые кадры. Ниже — новый план; применяйте его только при наличии подходящих материалов.",
  personal:"Сцены уже предложены по вашей идее. Анкету заполнять не нужно.",
  note:"Только снятые на камеру видеокадры с проверенным качеством и правами. Описания сцен могут быть символическими — проверьте соответствие сюжету.",
  format:"Для проверенных кадров при применении будет выбран вертикальный формат 9:16.",
  empty:"Для выбранной длительности недостаточно разных качественных видеосъёмок. Рисованные кадры не подставляются. Выберите ролик короче.",
  noPoster:"Превью недоступно"},
 en:{source:"Automatically from Ideas",scene:"Scene",visual:"Visual",preview:"Preview shot",
  apply:"Apply scenes to montage",applied:"Scenes in current montage",ideas:"Open concept in Ideas",
  sample:"Sample storyboard. Refine your goal in Ideas to personalize it.",
  replace:"The current montage differs from the selected theme, phrases or verified footage. Review the new plan and apply it only when matching media is available.",
  personal:"Scenes are already suggested from your idea. No questionnaire needed.",
  note:"Only reviewed real-camera footage with verified rights and technical quality. Symbolic scene descriptions still need your review.",
  format:"Applying verified footage switches the video to portrait 9:16.",
  empty:"Not enough different reviewed camera shots for this duration. No illustrated filler will be used. Choose a shorter video.",
  noPoster:"Preview unavailable"},
 es:{source:"Automático desde Ideas",scene:"Escena",visual:"En pantalla",preview:"Ver escena",
  apply:"Aplicar escenas al montaje",applied:"Escenas del montaje actual",ideas:"Abrir concepto en Ideas",
  sample:"Guion de ejemplo. Define tu objetivo en Ideas para personalizarlo.",
  replace:"El montaje no coincide con la configuración o los materiales verificados. Revisa el nuevo plan y aplícalo cuando haya vídeos adecuados.",
  personal:"Escenas propuestas según tu idea, sin cuestionarios.",
  note:"Solo imágenes de vídeo grabado con cámara, con derechos y calidad revisados. Comprueba la pertinencia de las escenas.",
  format:"Al aplicar se utilizará el formato vertical 9:16.",
  empty:"No hay suficientes tomas reales revisadas para esta duración. No se usarán dibujos; elige un vídeo más corto.",
  noPoster:"Vista previa no disponible"}
} as const;
const clock=(time:number)=>{
 const seconds=Math.max(0,Math.floor(time));
 return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
};

export function MandalaAutomaticStoryboard({
 locale,goal,theme,durationSeconds,aspect,styleIndex,pace,personalization,appliedStoryKey,
 phrases,transcript,approvedConcept,scenes,appliedShots,resolveMedia,disabled,onApply,onPreview,onOpenIdeas
}:Props){
 const t=words[locale];
 const phraseKey=phrases.join("\u001f");
 const personalizationKey=JSON.stringify(personalization??null);
 // Concept and Story get the SAME confirmed Goals/Ideas/phrases/transcript.
 const suggested=useMemo(()=>suggestVideoConcept({
  locale,goal,theme,styleIndex,phrases:phraseKey?phraseKey.split("\u001f"):[],
  speechTranscript:transcript,personalization:JSON.parse(personalizationKey)
 }) as ApprovedVideoConcept,
 [locale,goal,theme,styleIndex,phraseKey,transcript,personalizationKey]);
 const concept=approvedConcept?.signature===suggested.signature?approvedConcept:suggested;
 const guides=useMemo(()=>buildAlignedStorySceneGuides({
  locale,goal:concept.goal||goal,phrases:phraseKey?phraseKey.split("\u001f"):[],
  concept,count:Math.max(4,Math.ceil(durationSeconds/5)),pace
 }),[locale,goal,concept,phraseKey,durationSeconds,pace]);
 const storyKey=JSON.stringify([
  concept.signature,phraseKey,styleIndex,pace,durationSeconds,"portrait",theme,
  concept.avoidImagery||[],personalizationKey
 ]);
 const proposal=useMemo(()=>planReviewedFilmedStory({
  categoryId:concept.categoryId,locale,aspect:"portrait",durationSeconds,scenes,
  styleId:concept.styleId,pace,goal:concept.goal||goal,
  phrases:phraseKey?phraseKey.split("\u001f"):[],sceneGuides:guides.scenes,
  excludedVisuals:concept.avoidImagery||[]
 }),[concept,locale,durationSeconds,scenes,pace,goal,phraseKey,guides]);
 const filmedProposalReady=proposal.ok&&proposal.shots.length===guides.scenes.length;
 const currentMatchesProposal=filmedProposalReady&&appliedShots?.length===proposal.shots.length&&
  appliedShots.every((shot,index)=>shot.sceneId===proposal.shots[index].sceneId&&
   Math.abs(shot.startSeconds-proposal.shots[index].startMs/1000)<.01);
 const applied=Boolean(currentMatchesProposal&&appliedStoryKey===storyKey&&
   isReviewedFilmedStorySequence({shots:appliedShots,scenes,
    aspect:aspect as "portrait"|"landscape"|"square"}));
 const replacingGraphics=Boolean(appliedShots?.length&&!applied);
 const sceneCatalog=new Map(scenes.filter((scene):scene is {id:string}=>Boolean(
   scene&&typeof scene==="object"&&"id" in scene&&typeof scene.id==="string"))
   .map(scene=>[scene.id,scene]));
 const eligible=filmedProposalReady&&proposal.shots.every(
   shot=>isReviewedFilmedStoryScene(sceneCatalog.get(shot.sceneId),"portrait"));
 const shots=eligible?proposal.shots.map(shot=>({
  sceneId:shot.sceneId,startSeconds:shot.startMs/1000,
  durationSeconds:shot.durationMs/1000,stage:shot.stage
 })):[];
 const professionalArc={
  ru:["Возможности","Инициатива","Навыки и стратегия","Результат"],
  en:["Opportunities","Initiative","Skills and strategy","Results"],
  es:["Oportunidades","Iniciativa","Habilidades y estrategia","Resultados"]
 } as const;
 const lead=guides.professional?
  (locale==="ru"?"Новые возможности, навыки и реальные шаги к рабочим целям":
   locale==="es"?"Nuevas oportunidades, habilidades y pasos para avanzar en el trabajo":
   "New opportunities, skills and real steps toward work goals"):concept.mainMessage;
 const noRelevant=locale==="ru"?
  "Для сцены не найден подходящий проверенный видеоматериал. Случайный пейзаж не подставляем; понадобится тематический ролик или фотография.":
  locale==="es"?
  "No hay vídeo verificado para esta escena. No sustituimos por paisajes aleatorios; se necesita un vídeo o una foto pertinentes.":
  "No matching verified footage for this scene. No random landscapes will be substituted; a relevant clip or photo is needed.";
 const statusText=guides.professional?
  (locale==="ru"?"Работа и развитие":locale==="es"?"Trabajo y desarrollo":"Work and growth"):
  (locale==="ru"?"По вашей теме":locale==="es"?"Según tu tema":"On your topic");
 const paceText=pace==="dynamic"?
  (locale==="ru"?"Энергичный темп":locale==="es"?"Ritmo dinámico":"Dynamic pace"):
  (locale==="ru"?"Спокойный темп":locale==="es"?"Ritmo pausado":"Gentle pace");
 return <div className={styles.storyAutoRoot} data-video-auto-storyboard
  data-storyboard-source={applied?"montage":replacingGraphics?"filmed-replacement":"ideas"}
  data-storyboard-scenes={guides.scenes.length} data-reviewed-filmed-only="true"
  data-storyboard-aligned-to-settings={applied} data-storyboard-media-ready={eligible}>
  <div className={styles.storyAutoHead}>
   <span className={styles.storyAutoBadge}><Sparkles size={15} aria-hidden="true"/>{t.source}</span>
   <strong>{lead}</strong>
   <p>{concept.hasPersonalInput?t.personal:t.sample}</p>
   <p className={styles.storyAutoNote} data-video-story-settings>{statusText} · {paceText}</p>
   {replacingGraphics?<p className={styles.storyAutoEmpty} role="status"
     data-video-story-graphics-detected>{t.replace}</p>:null}
   <div className={styles.storyAutoStats}>
    <span><Film size={15} aria-hidden="true"/>{guides.scenes.length} {locale==="ru"?"сцен":locale==="es"?"escenas":"scenes"}</span>
    <span><Clock3 size={15} aria-hidden="true"/>{durationSeconds}s</span>
    <span>{applied?aspect:"9:16"}</span>
   </div>
  </div>
  <ol className={styles.storyAutoList} data-video-auto-storyboard-list>
   {guides.scenes.map((guide,index)=>{
    const shot=shots[index]||null;
    const media=shot?resolveMedia(shot.sceneId):null;
    const emotion=guides.professional?professionalArc[locale][Math.min(3,guide.stage-1)]:
      concept.emotionalProgram?.[Math.min(3,guide.stage-1)];
    const from=index*durationSeconds/guides.scenes.length;
    const to=(index+1)*durationSeconds/guides.scenes.length;
    return <li key={index} className={styles.storyAutoCard}
      data-video-story-scene={index+1} data-video-story-media-matched={Boolean(shot)}>
     <div className={styles.storyAutoPoster}>
      {media?.poster? /* eslint-disable-next-line @next/next/no-img-element */
       <img src={media.poster} alt={media.title} loading="lazy"/>:
       <div className={styles.storyAutoNoPoster} data-video-story-media-missing={!shot}>
        <Film size={26}/><small>{shot?t.noPoster:
         (locale==="ru"?"Нужен подходящий кадр":locale==="es"?"Falta un plano adecuado":"Relevant footage needed")}</small>
       </div>}
      <span>{index+1}</span>
     </div>
     <div className={styles.storyAutoBody}>
      <span className={styles.storyAutoNumber}>{t.scene} {index+1}
       <small>{clock(from)}–{clock(to)}</small>
      </span>
      <strong>{guide.title}</strong>
      <p>{t.visual}: {guide.visual}</p>
      {media?<small>{media.title}</small>:<small>{noRelevant}</small>}
      {emotion?<small>{emotion}</small>:null}
      {applied&&shot?<button type="button" className={styles.storyAutoView}
        disabled={disabled} onClick={()=>onPreview(shot.startSeconds)}>
        <Play size={13} aria-hidden="true"/>{t.preview}
      </button>:null}
     </div>
    </li>;
   })}
  </ol>
  {!eligible?<p className={styles.storyAutoEmpty} role="status"
    data-video-story-missing-relevant-media>{noRelevant}</p>:null}
  <p className={styles.storyAutoNote}>{t.note}</p>
  {!applied&&eligible?
   <button type="button" className={styles.storyAutoApply} data-video-auto-storyboard-apply
     disabled={disabled} onClick={()=>onApply(proposal.shots,concept,storyKey,
      guides.scenes.map(item=>item.sourcePhrase||""))}>
     <Check size={19} aria-hidden="true"/>{t.apply}<ArrowRight size={18} aria-hidden="true"/>
   </button>:applied?<p className={styles.storyAutoApplied}><Check size={16}/>{t.applied}</p>:null}
  {!applied&&proposal.ok&&aspect!=="portrait"?<p className={styles.storyAutoFormat}>{t.format}</p>:null}
  <button type="button" className={styles.storyAutoIdeas} disabled={disabled} onClick={onOpenIdeas}>
    <Brain size={17} aria-hidden="true"/>{t.ideas}<ArrowRight size={15} aria-hidden="true"/>
  </button>
 </div>;
}
