"use client";
import {useMemo} from "react";
import {ArrowRight,Brain,Check,Clock3,Film,Play,Sparkles} from "lucide-react";
import {suggestVideoConcept} from "@/lib/mandala/auto-video-concept.mjs";
import {planReviewedFilmedStory,planReviewedStoryWithPhotos,isReviewedFilmedStorySequence,
 isReviewedStoryWithPhotosSequence,isReviewedFilmedStoryScene}
 from "@/lib/mandala/reviewed-filmed-story.mjs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto} from "@/lib/mandala/story-photo-library.mjs";
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
  replace:"В текущем монтаже есть графические или недостаточно проверенные кадры. Ниже — раскадровка только из реальных видеосъёмок. Примените её, чтобы заменить старые сцены.",
  personal:"Сцены уже предложены по вашей идее. Анкету заполнять не нужно.",
  note:"Сначала подбираем реальные видео по действиям. Если подходящего бизнес-видео нет, используем лицензированное фото с плавным движением кадра. Люди на фото — иллюстрация, а не ваша команда.",
  format:"Для проверенных кадров при применении будет выбран вертикальный формат 9:16.",
  empty:"Для выбранной длительности недостаточно разных качественных видеосъёмок. Рисованные кадры не подставляются. Выберите ролик короче.",
  noPoster:"Превью недоступно"},
 en:{source:"Automatically from Ideas",scene:"Scene",visual:"Visual",preview:"Preview shot",
  apply:"Apply scenes to montage",applied:"Scenes in current montage",ideas:"Open concept in Ideas",
  sample:"Sample storyboard. Refine your goal in Ideas to personalize it.",
  replace:"The current montage contains illustrated or insufficiently reviewed media. Apply these real-camera videos and licensed photographs instead.",
  personal:"Scenes are already suggested from your idea. No questionnaire needed.",
  note:"Real camera footage comes first; when there is no matching business video, a licensed photographic still replaces it. Stock subjects are illustrative, not your actual team. Review the story before export.",
  format:"Applying verified footage switches the video to portrait 9:16.",
  empty:"Not enough different reviewed camera shots for this duration. No illustrated filler will be used. Choose a shorter video.",
  noPoster:"Preview unavailable"},
 es:{source:"Automático desde Ideas",scene:"Escena",visual:"En pantalla",preview:"Ver escena",
  apply:"Aplicar escenas al montaje",applied:"Escenas del montaje actual",ideas:"Abrir concepto en Ideas",
  sample:"Guion de ejemplo. Define tu objetivo en Ideas para personalizarlo.",
  replace:"El montaje contiene escenas gráficas o sin verificar. La propuesta usa solo vídeo real revisado. Aplícala para sustituir los planos anteriores.",
  personal:"Escenas propuestas según tu idea, sin cuestionarios.",
  note:"Primero, vídeo real que represente la acción; si falta, una foto con licencia y movimiento suave. Las personas de archivo son ilustrativas, no tu equipo.",
  format:"Al aplicar se utilizará el formato vertical 9:16.",
  empty:"No hay suficientes tomas reales revisadas para esta duración. No se usarán dibujos; elige un vídeo más corto.",
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
 const proposal=useMemo(()=>{
   const request={categoryId:concept.categoryId,locale,aspect:"portrait" as const,
     durationSeconds,scenes};
   return concept.categoryId==="goals-money"
     ?planReviewedStoryWithPhotos({...request,concept})
     :planReviewedFilmedStory(request);
 },[concept,locale,durationSeconds,scenes]);
 const businessPhotoProposal=proposal.ok&&
   proposal.status==="REVIEWED_BUSINESS_VIDEO_OR_PHOTO_STORYBOARD";
 const isApprovedMedia=Boolean(appliedShots?.length)&&(
   isReviewedFilmedStorySequence({
     shots:appliedShots,scenes,aspect:aspect as "portrait"|"landscape"|"square"
   })||isReviewedStoryWithPhotosSequence({
     shots:appliedShots,scenes,aspect:aspect as "portrait"|"landscape"|"square"
   }));
 // A formerly applied nature montage is not relevant to a business brief.
 // Do not hide the action-matched storyboard behind an applied status.
 const applied=isApprovedMedia&&(!businessPhotoProposal||
   (appliedShots?.length===proposal.shots.length&&
     appliedShots!.every((shot,index)=>shot.sceneId===proposal.shots[index]?.sceneId)));
 const replacingGraphics=Boolean(appliedShots?.length&&!applied);
 const sceneCatalog=new Map(scenes.filter((scene):scene is {id:string}=>Boolean(
   scene&&typeof scene==="object"&&"id" in scene&&typeof scene.id==="string"))
   .map(scene=>[scene.id,scene]));
 const filmedProposalReady=proposal.ok&&proposal.shots.length>0&&proposal.shots.every(shot=>{
   const photo=STORY_PHOTO_BY_ID.get(shot.sceneId);
   return photo?isTrustedStoryPhoto(photo):
     isReviewedFilmedStoryScene(sceneCatalog.get(shot.sceneId),"portrait");
 });
 const count=applied?appliedShots!.length:filmedProposalReady?proposal.shots.length:0;
 const shots=applied?appliedShots!.map((shot,index)=>({
  sceneId:shot.sceneId,startSeconds:shot.startSeconds,durationSeconds:shot.durationSeconds,
  stage:Math.min(4,Math.floor(index*4/count)+1)
 })):filmedProposalReady?proposal.shots.map(shot=>({
  sceneId:shot.sceneId,startSeconds:shot.startMs/1000,durationSeconds:shot.durationMs/1000,
  stage:shot.stage
 })):[];
 return <div className={styles.storyAutoRoot} data-video-auto-storyboard
  data-storyboard-source={applied?"montage":replacingGraphics?"filmed-replacement":"ideas"}
  data-storyboard-scenes={shots.length} data-reviewed-filmed-only="false" data-reviewed-media-only="true" data-photo-fallback="licensed">
  <div className={styles.storyAutoHead}>
   <span className={styles.storyAutoBadge}><Sparkles size={15} aria-hidden="true"/>{t.source}</span>
   <strong>{concept.mainMessage}</strong>
   <p>{concept.hasPersonalInput?t.personal:t.sample}</p>
   {replacingGraphics?<p className={styles.storyAutoEmpty} role="status"
     data-video-story-graphics-detected>{t.replace}</p>:null}
   <div className={styles.storyAutoStats}>
    <span><Film size={15} aria-hidden="true"/>{shots.length} {locale==="ru"?"сцен":locale==="es"?"escenas":"scenes"}</span>
    <span><Clock3 size={15} aria-hidden="true"/>{durationSeconds}s</span>
    <span>{applied?aspect:"9:16"}</span>
    {proposal.ok&&"photoCandidates" in proposal&&typeof proposal.photoCandidates==="number"&&proposal.photoCandidates>0?
      <span data-story-photo-options>{locale==="ru"?"Фото":locale==="es"?"Fotos":"Photos"}: {proposal.photoCandidates}</span>:null}
   </div>
  </div>
  {shots.length?<ol className={styles.storyAutoList} data-video-auto-storyboard-list>
   {shots.map((shot,index)=>{
    const photo=STORY_PHOTO_BY_ID.get(shot.sceneId);
    const media=photo?{poster:photo.src,title:photo.labels[locale]}:resolveMedia(shot.sceneId);
    const step=Math.max(0,Math.min(3,shot.stage-1));
    const title=concept.sceneOutline?.[step]||
      (locale==="ru"?"Развитие сюжета":locale==="es"?"Desarrollo":"Story beat");
    const repeated=Boolean(index>0&&shots[index-1]?.stage===shot.stage);
    const displayTitle=repeated?title+" — "+media.title:title;
    const emotion=concept.emotionalProgram?.[step];
    return <li key={shot.sceneId+"-"+index} className={styles.storyAutoCard}
      data-video-story-scene={index+1} data-story-media-kind={photo?"photo":"video"}>
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
      <strong>{displayTitle}</strong><p>{t.visual}: {media.title}
        {photo?<small> · {locale==="ru"?"Фото":locale==="es"?"Foto":"Photo"}</small>:null}
      </p>
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
  {!applied&&filmedProposalReady?
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
