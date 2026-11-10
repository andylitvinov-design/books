"use client";
import {useMemo} from "react";
import {ArrowRight,Brain,Check,Clock3,Film,Play,Sparkles} from "lucide-react";
import {suggestVideoConcept} from "@/lib/mandala/auto-video-concept.mjs";
import {planMyTubeCategory} from "@/lib/mandala/category-video-storyboard.mjs";
import type {CategoryStoryboardShot} from "@/lib/mandala/category-video-storyboard.mjs";
import type {ApprovedVideoConcept} from "./mandala-video-concept";
import styles from "./mandala-video-mobile.module.css";

type Locale="ru"|"en"|"es";
type Shot={sceneId:string;startSeconds:number;durationSeconds:number};
type Props={
 locale:Locale;goal:string;theme:string;durationSeconds:number;aspect:string;styleIndex:number;
 phrases:readonly string[];transcript:object|null;approvedConcept:ApprovedVideoConcept|null;
 scenes:readonly unknown[];appliedShots:readonly Shot[]|null;
 resolveMedia:(id:string)=>{poster:string|null;title:string};
 disabled:boolean;
 onApply:(shots:readonly CategoryStoryboardShot[],concept:ApprovedVideoConcept)=>void;
 onPreview:(second:number)=>void;onOpenIdeas:()=>void;
};
const words={
 ru:{source:"Автоматически из «Идей»",scene:"Сцена",visual:"В кадре",preview:"Посмотреть кадр",
  apply:"Применить сцены к монтажу",applied:"Сцены в текущем монтаже",ideas:"Открыть концепт в Идеях",
  sample:"Пример сюжета. Уточните запрос в «Идеях» для персонального результата.",
  personal:"Сцены уже предложены по вашей идее. Анкету заполнять не нужно.",
  note:"Изображения — постеры реальных проверенных видео из медиатеки. Проверьте смысловое соответствие перед экспортом.",
  format:"Для проверенных кадров при применении будет выбран вертикальный формат 9:16.",
  empty:"Для этого сюжета пока не хватает проверенных кадров. Уточните идею в «Идеях».",
  noPoster:"Превью недоступно"},
 en:{source:"Automatically from Ideas",scene:"Scene",visual:"Visual",preview:"Preview shot",
  apply:"Apply scenes to montage",applied:"Scenes in current montage",ideas:"Open concept in Ideas",
  sample:"Sample storyboard. Refine your goal in Ideas to personalize it.",
  personal:"Scenes are already suggested from your idea. No questionnaire needed.",
  note:"Images are posters of verified library videos. Review each source's relevance to the story before exporting.",
  format:"Applying verified footage switches the video to portrait 9:16.",
  empty:"Not enough verified footage for this storyboard. Refine the idea in Ideas.",
  noPoster:"Preview unavailable"},
 es:{source:"Automático desde Ideas",scene:"Escena",visual:"En pantalla",preview:"Ver escena",
  apply:"Aplicar escenas al montaje",applied:"Escenas del montaje actual",ideas:"Abrir concepto en Ideas",
  sample:"Guion de ejemplo. Define tu objetivo en Ideas para personalizarlo.",
  personal:"Escenas propuestas según tu idea, sin cuestionarios.",
  note:"Las imágenes son carteles de vídeos verificados. Comprueba su relevancia antes de exportar.",
  format:"Al aplicar se utilizará el formato vertical 9:16.",
  empty:"No hay suficientes vídeos verificados para este guion. Ajusta la idea en Ideas.",
  noPoster:"Vista previa no disponible"}
} as const;
const clock=(time:number)=>{
 const seconds=Math.max(0,Math.floor(time));
 return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
};

export function MandalaAutomaticStoryboard({
 locale,goal,theme,durationSeconds,aspect,styleIndex,phrases,transcript,
 approvedConcept,scenes,appliedShots,resolveMedia,disabled,onApply,onPreview,onOpenIdeas
}:Props){
 const t=words[locale];
 const phraseKey=phrases.join("\u001f");
 // Exactly the same local Ideas model and approved concept, not another questionnaire.
 const suggested=useMemo(()=>suggestVideoConcept({
  locale,goal,theme,styleIndex,phrases:phraseKey?phraseKey.split("\u001f"):[],
  speechTranscript:transcript
 }) as ApprovedVideoConcept,[locale,goal,theme,styleIndex,phraseKey,transcript]);
 const concept=approvedConcept?.signature===suggested.signature?approvedConcept:suggested;
 // Four editorial meaning phases map to six distinct verified 5s videos at 30s.
 const proposal=useMemo(()=>planMyTubeCategory({
  categoryId:concept.categoryId,locale,aspect:"portrait",durationSeconds,scenes
 }),[concept.categoryId,locale,durationSeconds,scenes]);
 const applied=Boolean(appliedShots?.length);
 const count=applied?appliedShots!.length:proposal.ok?proposal.shots.length:0;
 const shots=applied?appliedShots!.map((shot,index)=>({
  sceneId:shot.sceneId,startSeconds:shot.startSeconds,durationSeconds:shot.durationSeconds,
  stage:Math.min(4,Math.floor(index*4/count)+1)
 })):proposal.ok?proposal.shots.map(shot=>({
  sceneId:shot.sceneId,startSeconds:shot.startMs/1000,durationSeconds:shot.durationMs/1000,
  stage:shot.stage
 })):[];
 return <div className={styles.storyAutoRoot} data-video-auto-storyboard
  data-storyboard-source={applied?"montage":"ideas"} data-storyboard-scenes={shots.length}>
  <div className={styles.storyAutoHead}>
   <span className={styles.storyAutoBadge}><Sparkles size={15} aria-hidden="true"/>{t.source}</span>
   <strong>{concept.mainMessage}</strong>
   <p>{concept.hasPersonalInput?t.personal:t.sample}</p>
   <div className={styles.storyAutoStats}>
    <span><Film size={15} aria-hidden="true"/>{shots.length} {locale==="ru"?"сцен":locale==="es"?"escenas":"scenes"}</span>
    <span><Clock3 size={15} aria-hidden="true"/>{durationSeconds}s</span>
    <span>{applied?aspect:"9:16"}</span>
   </div>
  </div>
  {shots.length?<ol className={styles.storyAutoList} data-video-auto-storyboard-list>
   {shots.map((shot,index)=>{
    const media=resolveMedia(shot.sceneId);
    const step=Math.max(0,Math.min(3,shot.stage-1));
    const title=concept.sceneOutline?.[step]||
      (locale==="ru"?"Развитие сюжета":locale==="es"?"Desarrollo":"Story beat");
    const emotion=concept.emotionalProgram?.[step];
    return <li key={shot.sceneId+"-"+index} className={styles.storyAutoCard}
      data-video-story-scene={index+1}>
     <div className={styles.storyAutoPoster}>
      {media.poster? /* eslint-disable-next-line @next/next/no-img-element */
       <img src={media.poster} alt={media.title} loading="lazy"/>:
       <div className={styles.storyAutoNoPoster}><Film size={26}/><small>{t.noPoster}</small></div>}
      <span>{index+1}</span>
     </div>
     <div className={styles.storyAutoBody}>
      <span className={styles.storyAutoNumber}>{t.scene} {index+1}
       <small>{clock(shot.startSeconds)}–{clock(shot.startSeconds+shot.durationSeconds)}</small>
      </span>
      <strong>{title}</strong><p>{t.visual}: {media.title}</p>
      {emotion?<small>{emotion}</small>:null}
      {applied?<button type="button" className={styles.storyAutoView}
        disabled={disabled} onClick={()=>onPreview(shot.startSeconds)}>
        <Play size={13} aria-hidden="true"/>{t.preview}
      </button>:null}
     </div>
    </li>;
   })}
  </ol>:<p className={styles.storyAutoEmpty} role="status">{t.empty}</p>}
  <p className={styles.storyAutoNote}>{t.note}</p>
  {!applied&&proposal.ok&&proposal.shots.length?
   <button type="button" className={styles.storyAutoApply} data-video-auto-storyboard-apply
     disabled={disabled} onClick={()=>onApply(proposal.shots,concept)}>
     <Check size={19} aria-hidden="true"/>{t.apply}<ArrowRight size={18} aria-hidden="true"/>
   </button>:applied?<p className={styles.storyAutoApplied}><Check size={16}/>{t.applied}</p>:null}
  {!applied&&proposal.ok&&aspect!=="portrait"?<p className={styles.storyAutoFormat}>{t.format}</p>:null}
  <button type="button" className={styles.storyAutoIdeas} disabled={disabled} onClick={onOpenIdeas}>
    <Brain size={17} aria-hidden="true"/>{t.ideas}<ArrowRight size={15} aria-hidden="true"/>
  </button>
 </div>;
}
