"use client";
import {useMemo} from "react";
import {ArrowRight,Film,Play} from "lucide-react";
import {suggestVideoConcept} from "@/lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "@/lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "@/lib/mandala/storyboard-content-alignment.mjs";
import {planReviewedFilmedStory,planReviewedStoryWithPhotos,isReviewedFilmedStorySequence,
 isReviewedStoryWithPhotosSequence,isReviewedFilmedStoryScene} from "@/lib/mandala/reviewed-filmed-story.mjs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto} from "@/lib/mandala/story-photo-library.mjs";
import type {CategoryStoryboardShot} from "@/lib/mandala/category-video-storyboard.mjs";
import type {ApprovedVideoConcept} from "./mandala-video-concept";
import styles from "./mandala-video-mobile.module.css";

type Locale="ru"|"en"|"es";
type Shot={sceneId:string;startSeconds:number;durationSeconds:number};
type Props={
 locale:Locale;goal:string;theme:string;durationSeconds:number;aspect:string;styleIndex:number;
 selectedTopic?:{topicId:string;brief?:string}|null;
 pace:"slow"|"dynamic";personalization?:{currentState?:string;desiredState?:string;focus?:string}|null;
 appliedStoryKey?:string|null;
 phrases:readonly string[];transcript:object|null;approvedConcept:ApprovedVideoConcept|null;
 draftConcept?:ApprovedVideoConcept|null;
 scenes:readonly unknown[];appliedShots:readonly Shot[]|null;
 resolveMedia:(id:string)=>{poster:string|null;title:string};
 disabled:boolean;
 onApply:(shots:readonly CategoryStoryboardShot[],concept:ApprovedVideoConcept,key:string,captions:string[])=>boolean;
 onChooseQuality:(sourceReady:boolean)=>void;
 fiveSceneShots?:readonly Shot[]|null;
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
  noPoster:"Превью недоступно",quality:"Выбрать качество генерации",clips:"клипов"},
 en:{source:"Automatically from Ideas",scene:"Scene",visual:"Visual",preview:"Preview shot",
  apply:"Apply scenes to montage",applied:"Scenes in current montage",ideas:"Open concept in Ideas",
  sample:"Sample storyboard. Refine your goal in Ideas to personalize it.",
  replace:"The current montage differs from the selected theme, phrases or verified footage. Review the new plan and apply it only when matching media is available.",
  personal:"Scenes are already suggested from your idea. No questionnaire needed.",
  note:"Only reviewed real-camera footage with verified rights and technical quality. Symbolic scene descriptions still need your review.",
  format:"Applying verified footage switches the video to portrait 9:16.",
  empty:"Not enough different reviewed camera shots for this duration. No illustrated filler will be used. Choose a shorter video.",
  noPoster:"Preview unavailable",quality:"Select generation quality",clips:"clips"},
 es:{source:"Automático desde Ideas",scene:"Escena",visual:"En pantalla",preview:"Ver escena",
  apply:"Aplicar escenas al montaje",applied:"Escenas del montaje actual",ideas:"Abrir concepto en Ideas",
  sample:"Guion de ejemplo. Define tu objetivo en Ideas para personalizarlo.",
  replace:"El montaje no coincide con la configuración o los materiales verificados. Revisa el nuevo plan y aplícalo cuando haya vídeos adecuados.",
  personal:"Escenas propuestas según tu idea, sin cuestionarios.",
  note:"Solo imágenes de vídeo grabado con cámara, con derechos y calidad revisados. Comprueba la pertinencia de las escenas.",
  format:"Al aplicar se utilizará el formato vertical 9:16.",
  empty:"No hay suficientes tomas reales revisadas para esta duración. No se usarán dibujos; elige un vídeo más corto.",
  noPoster:"Vista previa no disponible",quality:"Elegir calidad de generación",clips:"clips"}
} as const;
const clock=(time:number)=>{
 const seconds=Math.max(0,Math.floor(time));
 return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
};

export function MandalaAutomaticStoryboard({
 locale,goal,theme,durationSeconds,aspect,styleIndex,pace,personalization,appliedStoryKey,selectedTopic=null,
 phrases,transcript,approvedConcept,draftConcept=null,scenes,appliedShots,resolveMedia,disabled,onApply,onChooseQuality,fiveSceneShots
}:Props){
 const t=words[locale];
 const phraseKey=phrases.join("\u001f");
 const personalizationKey=JSON.stringify(personalization??null);
 // Concept and Story get the SAME confirmed Goals/Ideas/phrases/transcript.
 const suggested=useMemo(()=>suggestVideoConcept({
  locale,goal,theme,styleIndex,phrases:phraseKey?phraseKey.split("\u001f"):[],
  speechTranscript:transcript,personalization:JSON.parse(personalizationKey),
  selectedTopicId:selectedTopic?.topicId||null,creativeBrief:selectedTopic?.brief||null
 }) as unknown as ApprovedVideoConcept,
 [locale,goal,theme,styleIndex,phraseKey,transcript,personalizationKey,
  selectedTopic?.topicId,selectedTopic?.brief]);
 // Ideas initially shows the first creative direction even before approval.
 // Story must use that exact screenplay, or the current choice/edit, not raw tags.
 const defaultDirection=useMemo(()=>getVideoCreativeDirections(suggested,locale)[0],
  [suggested,locale]);
 const defaultFilm=useMemo(()=>defaultDirection?
  applyVideoCreativeDirection(suggested,defaultDirection) as ApprovedVideoConcept:suggested,
  [suggested,defaultDirection]);
 const sameIntent=(candidate:ApprovedVideoConcept|null|undefined)=>Boolean(candidate&&
  (candidate.signature===suggested.signature||candidate.baseSignature===suggested.signature));
 const concept=(sameIntent(draftConcept)?draftConcept:null)||
  (sameIntent(approvedConcept)?approvedConcept:null)||defaultFilm;
 const guides=useMemo(()=>buildAlignedStorySceneGuides({
  locale,goal:concept.goal||goal,phrases:phraseKey?phraseKey.split("\u001f"):[],
  concept,count:concept.storyboard?.length||Math.max(4,Math.ceil(durationSeconds/5)),pace
 }),[locale,goal,concept,phraseKey,durationSeconds,pace]);
 const storyKey=JSON.stringify([
  concept.signature,concept.storyboard?.map(shot=>[shot.title,shot.action,shot.emotion])??null,
  phraseKey,styleIndex,pace,durationSeconds,"portrait",theme,
  concept.avoidImagery||[],personalizationKey
 ]);
 const proposal=useMemo(()=>{
  const parameters={
   categoryId:concept.categoryId,locale,aspect:"portrait" as const,durationSeconds,scenes,
   styleId:concept.styleId,pace,goal:concept.goal||goal,
   phrases:phraseKey?phraseKey.split("\u001f"):[],sceneGuides:guides.scenes,
   excludedVisuals:concept.avoidImagery||[]
  };
  return guides.professional&&concept.categoryId==="goals-money"
    ?planReviewedStoryWithPhotos({...parameters,concept})
    :planReviewedFilmedStory(parameters);
 },[concept,locale,durationSeconds,scenes,pace,goal,phraseKey,guides]);
 const filmedProposalReady=proposal.ok&&proposal.shots.length===guides.scenes.length;
 // All authored six-shot stories require actual scene-level visual evidence.
 // Catalogue tags cannot prove that an object or action appears in a clip.
 const v3RequiresActionProof=Array.isArray(concept.storyboard)&&concept.storyboard.length>0;
 const currentMatchesProposal=filmedProposalReady&&appliedShots?.length===proposal.shots.length&&
  appliedShots.every((shot,index)=>shot.sceneId===proposal.shots[index].sceneId&&
   Math.abs(shot.startSeconds-proposal.shots[index].startMs/1000)<.01);
 const applied=Boolean(!v3RequiresActionProof&&currentMatchesProposal&&appliedStoryKey===storyKey&&
  (isReviewedFilmedStorySequence({shots:appliedShots,scenes,
    aspect:aspect as "portrait"|"landscape"|"square"})||
   isReviewedStoryWithPhotosSequence({shots:appliedShots,scenes,
    aspect:aspect as "portrait"|"landscape"|"square"})));
 const replacingGraphics=Boolean(appliedShots?.length&&!applied);
 const sceneCatalog=new Map(scenes.filter((scene):scene is {id:string}=>Boolean(
   scene&&typeof scene==="object"&&"id" in scene&&typeof scene.id==="string"))
   .map(scene=>[scene.id,scene]));
 // Reviewed planner currently returns depictedEventVerified:false.
 // This also gates the curated six-shot scripts, not only the new v3 corpus.
 const eligible=filmedProposalReady&&!v3RequiresActionProof&&
  proposal.shots.every(shot=>{
   const photo=STORY_PHOTO_BY_ID.get(shot.sceneId);
   return photo?isTrustedStoryPhoto(photo):
     isReviewedFilmedStoryScene(sceneCatalog.get(shot.sceneId),"portrait");
  });
 const proposalHasPhotos=proposal.ok&&proposal.shots.some(shot=>STORY_PHOTO_BY_ID.has(shot.sceneId));
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
 const cameraNames={
  ru:{"medium":"Средний план","close-up":"Крупный план",detail:"Деталь",wide:"Общий план"},
  en:{"medium":"Medium shot","close-up":"Close-up",detail:"Detail",wide:"Wide shot"},
  es:{"medium":"Plano medio","close-up":"Primer plano",detail:"Detalle",wide:"Plano general"}
 } as const;
 const paceText=pace==="dynamic"?
  (locale==="ru"?"Энергичный темп":locale==="es"?"Ritmo dinámico":"Dynamic pace"):
  (locale==="ru"?"Спокойный темп":locale==="es"?"Ritmo pausado":"Gentle pace");

 // The author's six scenes stay six scenes; never fold them into five cards.
 // A five-cut editor montage is an explicitly separate legacy 20s flow.
 const manualFiveReady=Boolean(!v3RequiresActionProof&&durationSeconds===20&&fiveSceneShots?.length===5&&
  fiveSceneShots.every(shot=>isReviewedFilmedStoryScene(sceneCatalog.get(shot.sceneId),"portrait")));
 const visibleCount=manualFiveReady?5:guides.scenes.length;
 const compactCards=Array.from({length:visibleCount},(_,index)=>{
  const guide=guides.scenes[index];
  const shot=manualFiveReady?(fiveSceneShots?.[index]??null):(shots[index]??null);
  const from=manualFiveReady&&shot?shot.startSeconds:index*durationSeconds/guides.scenes.length;
  const to=manualFiveReady&&shot?shot.startSeconds+shot.durationSeconds:(index+1)*durationSeconds/guides.scenes.length;
  return {guide,shot,from,to};
 });
 return <div className={styles.storyAutoRoot} data-video-auto-storyboard
  data-storyboard-source={manualFiveReady||applied?"montage":replacingGraphics?"filmed-replacement":"ideas"}
  data-storyboard-scenes={compactCards.length}
  data-storyboard-clips={manualFiveReady?fiveSceneShots?.length||0:eligible?proposal.shots.length:0}
  data-storyboard-source-ids={eligible?proposal.shots.map(shot=>shot.sceneId).join(","):""}
  data-reviewed-filmed-only={!proposalHasPhotos}
  data-reviewed-media-only="true" data-photo-fallback={proposalHasPhotos?"licensed":undefined}
  data-storyboard-aligned-to-settings={manualFiveReady||applied}
  data-storyboard-aligned-to-concept={v3RequiresActionProof}
  data-storyboard-media-ready={manualFiveReady||eligible}
  data-storyboard-action-proof={v3RequiresActionProof?"editorial_unverified":"legacy"}
  data-storyboard-selected-direction={concept.creativeDirectionId||undefined}>
  <div className={styles.storyAutoHead}>
   {concept.creativeTitle?<strong data-video-story-selected-title>{concept.creativeTitle}</strong>:null}
   <p className={styles.storyAutoMeta}>
    <Film size={14} aria-hidden="true"/>{compactCards.length} {locale==="ru"?"сцен":locale==="es"?"escenas":"scenes"}
    <span aria-hidden="true">·</span>{manualFiveReady?20:durationSeconds}s
    <span aria-hidden="true">·</span>9:16
    {eligible?<small>({proposal.shots.length} {t.clips})</small>:null}
   </p>
   <small className={styles.storyAutoLead}>{lead} · {statusText} · {paceText}</small>
  </div>
  <ol className={styles.storyAutoList} data-video-auto-storyboard-list>
   {compactCards.map((item,index)=>{
    const {guide,shot,from,to}=item;
    const authored=concept.storyboard?.length===guides.scenes.length?concept.storyboard[index]:null;
    const camera=authored?.shotType&&Object.prototype.hasOwnProperty.call(cameraNames[locale],authored.shotType)?
      cameraNames[locale][authored.shotType as keyof typeof cameraNames[typeof locale]]:null;
    const photo=shot?STORY_PHOTO_BY_ID.get(shot.sceneId):null;
    const media=photo?{poster:photo.src,title:photo.labels[locale]}:
      shot?resolveMedia(shot.sceneId):null;
    const emotion=guides.professional?professionalArc[locale][Math.min(3,guide.stage-1)]:
      concept.emotionalProgram?.[Math.min(3,guide.stage-1)];
    const generic=/^(?:step|шаг|paso)\s*\d+$/i.test(guide.title);
    const title=generic?(emotion||media?.title||lead):guide.title;
    return <li key={index} className={styles.storyAutoCard}
      data-video-story-scene={index+1} data-concept-scene-id={authored?.sceneId||undefined}
      data-video-story-media-matched={Boolean(shot)}
      data-story-media-kind={photo?"photo":shot?"video":"missing"}
      data-storyboard-continuity={authored?.continuityKeys?.join(",")||undefined}>
     <div className={styles.storyAutoPoster}>
      {media?.poster? /* eslint-disable-next-line @next/next/no-img-element */
       <img src={media.poster} alt={media.title} loading="lazy"/>:
       <div className={styles.storyAutoNoPoster} data-video-story-media-missing={!shot}>
        <Film size={19}/><small>{shot?t.noPoster:
         (locale==="ru"?"Нужен кадр":locale==="es"?"Falta vídeo":"Footage needed")}</small>
       </div>}
      <span>{index+1}</span>
     </div>
     <div className={styles.storyAutoBody}>
      <span className={styles.srOnly}>{t.scene} {index+1}</span>
      <small data-storyboard-scene-time>{clock(from)}–{clock(to)}</small>
      <strong>{title}</strong>
      <p data-storyboard-scene-action>{guide.visual}</p>
      {authored?<small data-storyboard-media-brief>
        {locale==="ru"?"Подбираем видео или фото именно этого действия":
          locale==="es"?"Vídeo o foto de esta acción exacta":
          "Video or photo depicting this exact action"}
      </small>:null}
      {authored?<small data-storyboard-shot-direction>
        {[camera,authored.emotion||emotion].filter(Boolean).join(" · ")}
      </small>:null}
      {media?.title?<small data-storyboard-media-title>{media.title}
        {photo?" · "+(locale==="ru"?"Фото":locale==="es"?"Foto":"Photo"):null}</small>:null}
     </div>
    </li>;
   })}
  </ol>
  {!manualFiveReady&&replacingGraphics?<p className={styles.storyAutoEmpty} role="status"
   data-video-story-graphics-detected>{t.replace}</p>:null}
  {!manualFiveReady&&!eligible?<p className={styles.storyAutoEmpty} role="status"
   data-video-story-missing-relevant-media>{noRelevant}</p>:null}
  <button type="button" className={styles.storyAutoApply}
    data-video-story-select-quality
    data-video-auto-storyboard-apply={!manualFiveReady&&!applied&&eligible?true:undefined}
    disabled={disabled} onClick={()=>{
      // Only attach approved local footage. No render, charge or paid API call.
      // The optional, strictly verified scene application may fail closed
      // (missing matching footage). Quality selection is navigation, not
      // proof that a scene was applied or permission to export/charge.
      let sourceReady=manualFiveReady||applied;
      if(!manualFiveReady&&!applied&&eligible){
        sourceReady=onApply(proposal.shots,concept,storyKey,
         guides.scenes.map(item=>item.sourcePhrase||""));
      }
      onChooseQuality(sourceReady);
    }}>
    <Play size={17} aria-hidden="true"/>{t.quality}<ArrowRight size={19} aria-hidden="true"/>
  </button>
 </div>;
}
