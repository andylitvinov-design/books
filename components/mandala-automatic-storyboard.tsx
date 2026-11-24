"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowRight,Film,Play,Pencil} from "lucide-react";
import {suggestVideoConcept} from "@/lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "@/lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "@/lib/mandala/storyboard-content-alignment.mjs";
import {resolveSelectedVideoFilm} from "@/lib/mandala/video-story-selection.mjs";
import {conceptSceneAlignment,storyReviewRequired} from "@/lib/mandala/video-story-review.mjs";
import {MandalaStoryboardSceneSketch} from "./mandala-storyboard-scene-sketch";
import {planReviewedFilmedStory,planReviewedStoryWithPhotos,isReviewedFilmedStorySequence,
 isReviewedStoryWithPhotosSequence,isReviewedFilmedStoryScene} from "@/lib/mandala/reviewed-filmed-story.mjs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto} from "@/lib/mandala/story-photo-library.mjs";
import {storyboardPhotoReferences,illustrativeStoryboardPhotoReferences,
 STORYBOARD_REFERENCE_STATUS,STORYBOARD_ILLUSTRATION_STATUS} from "@/lib/mandala/storyboard-photo-references.mjs";
import type {StoryboardReferencePhoto} from "@/lib/mandala/storyboard-photo-references.mjs";
import type {CategoryStoryboardShot} from "@/lib/mandala/category-video-storyboard.mjs";
import type {ApprovedVideoConcept} from "./mandala-video-concept";
import styles from "./mandala-video-mobile.module.css";

type Locale="ru"|"en"|"es";
export type StoryboardSourceIssue="photos"|"media"|"review"|"duration";
type Shot={sceneId:string;startSeconds:number;durationSeconds:number};
type Props={
 locale:Locale;goal:string;theme:string;durationSeconds:number;aspect:string;styleIndex:number;
 selectedTopic?:{topicId:string;brief?:string}|null;
 pace:"slow"|"dynamic";personalization?:{currentState?:string;desiredState?:string;focus?:string}|null;
 appliedStoryKey?:string|null;
 phrases:readonly string[];transcript:object|null;approvedConcept:ApprovedVideoConcept|null;
 draftConcept?:ApprovedVideoConcept|null;
 suggestedConcept?:ApprovedVideoConcept|null;selectedDirectionId?:string|null;
 scenes:readonly unknown[];appliedShots:readonly Shot[]|null;
 resolveMedia:(id:string)=>{poster:string|null;title:string};
 disabled:boolean;
 onApply:(shots:readonly CategoryStoryboardShot[],concept:ApprovedVideoConcept,key:string,
   captions:string[],outputAspect?:"portrait"|"landscape")=>boolean;
 onChooseQuality:(sourceReady:boolean)=>void;
 onApprovalRequiredChange?:(pending:boolean)=>void;
 onSourceIssueChange?:(issue:StoryboardSourceIssue)=>void;
 fiveSceneShots?:readonly Shot[]|null;
 onPreview:(second:number)=>void;onOpenIdeas:()=>void;
 onEditPhrase:(phrase:string)=>void;
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
function StoryboardReferencePoster({photo,locale,action,keywords,onPhotoLoaded,onPhotoUnavailable}:{
 photo:StoryboardReferencePhoto;locale:Locale;action:string;keywords:readonly string[];
 onPhotoLoaded:(id:string)=>void;onPhotoUnavailable:(id:string)=>void;
}){
 const [unavailable,setUnavailable]=useState(false);
 if(unavailable)return <div className={styles.storyAutoNoPoster} data-storyboard-reference-unavailable>
  <MandalaStoryboardSceneSketch locale={locale} action={action} keywords={keywords}/>
  <small className={styles.storyAutoNeedsFootage}>{locale==="ru"?"Фото недоступно":
    locale==="es"?"Foto no disponible":"Photo unavailable"}</small>
 </div>;
 return <>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={photo.src} alt={photo.labels[locale]} loading="eager" decoding="async"
   onLoad={event=>{
     const img=event.currentTarget;
     if(img.complete&&img.naturalWidth>=600&&img.naturalHeight>=600)
       onPhotoLoaded(photo.id);
     else{setUnavailable(true);onPhotoUnavailable(photo.id);}
   }}
   onError={()=>{setUnavailable(true);onPhotoUnavailable(photo.id);}}
   data-storyboard-reference-photo/>
  <small className={styles.storyAutoNeedsFootage} data-storyboard-photo-reference-label>
   {locale==="ru"?"Фото · референс":locale==="es"?"Foto · referencia":"Photo · reference"}
  </small>
 </>;
}
const clock=(time:number)=>{
 const seconds=Math.max(0,Math.floor(time));
 return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
};

export function MandalaAutomaticStoryboard({
 locale,goal,theme,durationSeconds,aspect,styleIndex,pace,personalization,appliedStoryKey,selectedTopic=null,
 phrases,transcript,approvedConcept,draftConcept=null,suggestedConcept=null,selectedDirectionId=null,
 scenes,appliedShots,resolveMedia,disabled,onApply,onChooseQuality,onApprovalRequiredChange,
 onSourceIssueChange,fiveSceneShots,onOpenIdeas,onEditPhrase
}:Props){
 const t=words[locale];
 const [expandedScene,setExpandedScene]=useState<number|null>(null);
 const [loadedPhotoIds,setLoadedPhotoIds]=useState<readonly string[]>([]);
 const [unavailablePhotoIds,setUnavailablePhotoIds]=useState<readonly string[]>([]);
 const [photoRetry,setPhotoRetry]=useState(0);
 const [photoOutputAspect,setPhotoOutputAspect]=useState<"portrait"|"landscape">(
   aspect==="landscape"?"landscape":"portrait");
 const phraseKey=phrases.join("\u001f");
 const personalizationKey=JSON.stringify(personalization??null);
 // Concept and Story get the SAME confirmed Goals/Ideas/phrases/transcript.
 const localSuggested=useMemo(()=>suggestVideoConcept({
  locale,goal,theme,styleIndex,phrases:phraseKey?phraseKey.split("\u001f"):[],
  speechTranscript:transcript,personalization:JSON.parse(personalizationKey),
  selectedTopicId:selectedTopic?.topicId||null,creativeBrief:selectedTopic?.brief||null
 }) as unknown as ApprovedVideoConcept,
 [locale,goal,theme,styleIndex,phraseKey,transcript,personalizationKey,
  selectedTopic?.topicId,selectedTopic?.brief]);
 const suggested=suggestedConcept||localSuggested;
 // Ideas initially shows the first creative direction even before approval.
 // Story must use that exact screenplay, or the current choice/edit, not raw tags.
 const defaultDirection=useMemo(()=>getVideoCreativeDirections(suggested,locale)[0],
  [suggested,locale]);
 const defaultFilm=useMemo(()=>defaultDirection?
  applyVideoCreativeDirection(suggested,defaultDirection) as ApprovedVideoConcept:suggested,
  [suggested,defaultDirection]);
 const sameIntent=(candidate:ApprovedVideoConcept|null|undefined)=>Boolean(candidate&&
  (candidate.signature===suggested.signature||candidate.baseSignature===suggested.signature));
 const currentDraft=sameIntent(draftConcept)?draftConcept:null;
 const currentApproved=sameIntent(approvedConcept)?approvedConcept:null;
 const choice=resolveSelectedVideoFilm<ApprovedVideoConcept>({
  base:suggested,locale,selectedDirectionId,draft:currentDraft,approved:currentApproved
 });
 const concept=choice.concept||defaultFilm;
 const scriptSceneAlignment=conceptSceneAlignment(concept);
 const scriptNeedsReview=storyReviewRequired(concept);
 const guides=useMemo(()=>buildAlignedStorySceneGuides({
  locale,goal:concept.goal||goal,phrases:phraseKey?phraseKey.split("\u001f"):[],
  concept,count:concept.storyboard?.length||Math.max(4,Math.ceil(durationSeconds/5)),pace
 }),[locale,goal,concept,phraseKey,durationSeconds,pace]);
 const matchedReferences=useMemo(()=>storyboardPhotoReferences({
  scenarioId:concept.scenarioId||"",categoryId:concept.categoryId||"",
  shotCount:guides.scenes.length,avoidImagery:concept.avoidImagery||[],
  sceneGuides:guides.scenes,aspect:photoOutputAspect
 }),[concept.scenarioId,concept.categoryId,concept.avoidImagery,guides.scenes,photoOutputAspect]);
 // Exact scene matches stay strict. A separate, visibly labelled photo story
 // can reuse the selected canonical story's reviewed thematic photographs.
 // Neither branch attaches media until the visitor accepts all six images.
 const illustrativeReferences=useMemo(()=>matchedReferences.length===6&&
   matchedReferences.every(Boolean)?[]:illustrativeStoryboardPhotoReferences({
    scenarioId:concept.scenarioId||"",categoryId:concept.categoryId||"",
    shotCount:guides.scenes.length,aspect:photoOutputAspect,
    avoidImagery:concept.avoidImagery||[],userEditedFields:concept.userEditedFields||[]
   }),[matchedReferences,concept.scenarioId,concept.categoryId,concept.avoidImagery,
    concept.userEditedFields,guides.scenes.length,photoOutputAspect]);
 const illustrativePhotos=illustrativeReferences.length===6;
 const references=illustrativePhotos?illustrativeReferences:matchedReferences;
 const storyKey=JSON.stringify([
  concept.signature,concept.storyboard?.map(shot=>[shot.title,shot.action,shot.emotion])??null,
  phraseKey,styleIndex,pace,durationSeconds,photoOutputAspect,theme,
  concept.avoidImagery||[],personalizationKey,references.map(photo=>photo?.id||null)
 ]);
 const hasSixPhotoReferences=references.length===6&&
   references.every(photo=>photo&&isTrustedStoryPhoto(photo))&&
   new Set(references.map(photo=>photo?.id)).size===6;
 const referencesDecoded=hasSixPhotoReferences&&references.every(photo=>
   photo&&loadedPhotoIds.includes(photo.id));
 const unavailableReferenceCount=references.filter(photo=>
   photo&&unavailablePhotoIds.includes(photo.id)).length;
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
 const photoAdaptationApplied=Boolean(hasSixPhotoReferences&&aspect===photoOutputAspect&&
   !choice.selectionMissing&&appliedStoryKey===storyKey&&
   appliedShots?.length===6&&appliedShots.every((shot,index)=>
     shot.sceneId===references[index]?.id&&
     Math.abs(shot.startSeconds-index*5)<.01&&
     Math.abs(shot.durationSeconds-5)<.01));
 const applied=photoAdaptationApplied||Boolean(!v3RequiresActionProof&&currentMatchesProposal&&appliedStoryKey===storyKey&&
  (isReviewedFilmedStorySequence({shots:appliedShots,scenes,
    aspect:aspect as "portrait"|"landscape"|"square"})||
   isReviewedStoryWithPhotosSequence({shots:appliedShots,scenes,
    aspect:aspect as "portrait"|"landscape"|"square"})));
 // A photo reference is not an export source until all six images are
 // explicitly accepted; no prior background may replace the chosen story.
 const photoApprovalRequired=hasSixPhotoReferences&&durationSeconds===30&&!photoAdaptationApplied;
 const replacingGraphics=Boolean(appliedShots?.length&&!applied);
 const sceneCatalog=new Map(scenes.filter((scene):scene is {id:string}=>Boolean(
   scene&&typeof scene==="object"&&"id" in scene&&typeof scene.id==="string"))
   .map(scene=>[scene.id,scene]));
 // Reviewed planner currently returns depictedEventVerified:false.
 // This also gates the curated six-shot scripts, not only the new v3 corpus.
 const eligible=filmedProposalReady&&!v3RequiresActionProof&&!choice.selectionMissing&&
  scriptSceneAlignment.aligned&&!scriptNeedsReview&&
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
 const manualFiveReady=Boolean(!choice.selectionMissing&&!v3RequiresActionProof&&durationSeconds===20&&fiveSceneShots?.length===5&&
  fiveSceneShots.every(shot=>isReviewedFilmedStoryScene(sceneCatalog.get(shot.sceneId),"portrait")));
 const storyboardSourcesPending=!manualFiveReady&&!eligible&&!photoAdaptationApplied;
 const sourceIssue:StoryboardSourceIssue=choice.selectionMissing||scriptNeedsReview?"review":
  hasSixPhotoReferences?(durationSeconds===30?"photos":"duration"):"media";
 useEffect(()=>{
  onApprovalRequiredChange?.(storyboardSourcesPending);
 },[storyboardSourcesPending,onApprovalRequiredChange]);
 useEffect(()=>{onSourceIssueChange?.(sourceIssue);},[sourceIssue,onSourceIssueChange]);
 const visibleCount=manualFiveReady?5:guides.scenes.length;
 // Source-reviewed photos remain visible as REFERENCES until a visitor
 // explicitly accepts the illustrative photomontage.
 const linkedPhraseCount=guides.scenes.filter(beat=>Boolean(beat.sourcePhrase)).length;
 const photoReferenceCount=references.slice(0,visibleCount).filter((photo,index)=>
   Boolean(photo&&!(manualFiveReady?fiveSceneShots?.[index]:
     photoAdaptationApplied?appliedShots?.[index]:shots[index]))).length;
 const compactCards=Array.from({length:visibleCount},(_,index)=>{
  const guide=guides.scenes[index];
  const shot=manualFiveReady?(fiveSceneShots?.[index]??null):
    photoAdaptationApplied?(appliedShots?.[index]??null):(shots[index]??null);
  const from=manualFiveReady&&shot?shot.startSeconds:index*durationSeconds/guides.scenes.length;
  const to=manualFiveReady&&shot?shot.startSeconds+shot.durationSeconds:(index+1)*durationSeconds/guides.scenes.length;
  return {guide,shot,from,to};
 });
 if(choice.selectionMissing)return <section className={styles.storyAutoRoot}
  data-video-auto-storyboard data-storyboard-selection-missing
  data-storyboard-selected-direction={selectedDirectionId||undefined} role="status">
   <strong>{locale==="ru"?"История изменилась":locale==="es"?"La historia ha cambiado":"Story selection changed"}</strong>
   <p>{locale==="ru"?"Выбранный фильм не соответствует текущим настройкам. Вернитесь в «Идеи» и выберите историю заново.":
     locale==="es"?"La historia seleccionada no corresponde a los ajustes actuales. Vuelve a Ideas para elegirla.":
     "The selected film is no longer available for these preferences. Reopen Ideas and choose a story."}</p>
   <button type="button" className={styles.storyAutoApply} data-storyboard-choose-another-story onClick={onOpenIdeas}>
    {t.ideas}<ArrowRight size={17}/>
   </button>
 </section>;
 return <div className={styles.storyAutoRoot} data-video-auto-storyboard
  data-storyboard-selection-source={choice.source}
  data-storyboard-selected-direction={choice.directionId||undefined}
  data-storyboard-source={manualFiveReady||applied?"montage":replacingGraphics?"filmed-replacement":"ideas"}
  data-storyboard-scenes={compactCards.length}
  data-storyboard-clips={manualFiveReady?fiveSceneShots?.length||0:
    photoAdaptationApplied?6:eligible?proposal.shots.length:0}
  data-storyboard-source-ids={photoAdaptationApplied?references.map(photo=>photo?.id).join(","):
    eligible?proposal.shots.map(shot=>shot.sceneId).join(","):""}
  data-reviewed-filmed-only={!proposalHasPhotos&&!photoAdaptationApplied}
  data-reviewed-media-only="true"
  data-photo-fallback={photoAdaptationApplied?"user_selected_licensed_photos":
    proposalHasPhotos?"licensed":undefined}
  data-storyboard-aligned-to-settings={manualFiveReady||applied}
  data-storyboard-aligned-to-concept={v3RequiresActionProof&&
    scriptSceneAlignment.aligned&&!scriptNeedsReview}
  data-storyboard-script-check={scriptSceneAlignment.checked?
    scriptSceneAlignment.reason:"curated_editorial_review"}
  data-storyboard-graphics-mode={photoReferenceCount?"licensed-photographic-references":"screenplay-scene-sketch"}
  data-storyboard-reference-count={photoReferenceCount}
  data-storyboard-reference-status={photoReferenceCount?
    illustrativePhotos?STORYBOARD_ILLUSTRATION_STATUS:STORYBOARD_REFERENCE_STATUS:undefined}
  data-storyboard-reference-match={illustrativePhotos?"illustrative":"scene"}
  data-storyboard-source-issue={storyboardSourcesPending?sourceIssue:undefined}
  data-storyboard-media-ready={manualFiveReady||eligible||photoAdaptationApplied}
  data-storyboard-action-proof={photoAdaptationApplied?"user_approved_symbolic_photo_montage":
    v3RequiresActionProof?"editorial_unverified":"legacy"}
  data-storyboard-concept-direction={concept.creativeDirectionId||undefined}>
  <div className={styles.storyAutoHead}>
   {concept.creativeTitle?<strong data-video-story-selected-title>{concept.creativeTitle}</strong>:null}
   <p className={styles.storyAutoMeta}>
    <Film size={14} aria-hidden="true"/>{compactCards.length} {locale==="ru"?"сцен":locale==="es"?"escenas":"scenes"}
    <span aria-hidden="true">·</span>{manualFiveReady?20:durationSeconds}s
    <span aria-hidden="true">·</span>{hasSixPhotoReferences?
       photoOutputAspect==="landscape"?"16:9":"9:16":"9:16"}
    {eligible?<small>({proposal.shots.length} {t.clips})</small>:null}
   </p>
   <small className={styles.storyAutoLead}>{lead} · {statusText} · {paceText}</small>
   {linkedPhraseCount>0?<small className={styles.storyAutoPhraseSummary}
     data-storyboard-phrase-summary>
     {locale==="ru"?"Фразы по сценам: ":locale==="es"?"Frases por escena: ":"Phrases in scenes: "}
     {linkedPhraseCount}/{guides.scenes.length}
   </small>:null}
  </div>
  <ol className={styles.storyAutoList} data-video-auto-storyboard-list>
   {compactCards.map((item,index)=>{
    const {guide,shot,from,to}=item;
    const authored=concept.storyboard?.length===guides.scenes.length?concept.storyboard[index]:null;
    const camera=authored?.shotType&&Object.prototype.hasOwnProperty.call(cameraNames[locale],authored.shotType)?
      cameraNames[locale][authored.shotType as keyof typeof cameraNames[typeof locale]]:null;
    const photo=shot?STORY_PHOTO_BY_ID.get(shot.sceneId):null;
    const reference=shot?null:references[index]||null;
    const media=photo?{poster:photo.src,title:photo.labels[locale]}:
      shot?resolveMedia(shot.sceneId):null;
    const emotion=guides.professional?professionalArc[locale][Math.min(3,guide.stage-1)]:
      concept.emotionalProgram?.[Math.min(3,guide.stage-1)];
    const generic=/^(?:step|шаг|paso)\s*\d+$/i.test(guide.title);
    const title=generic?(emotion||media?.title||lead):guide.title;
    const sourcePhrase=guide.sourcePhrase;
    return <li key={index} className={styles.storyAutoCard}
      data-video-story-scene={index+1} data-concept-scene-id={authored?.sceneId||undefined}
      data-video-story-media-matched={Boolean(shot)}
      data-storyboard-expanded={expandedScene===index}
      data-storyboard-has-phrase={Boolean(sourcePhrase)}
      data-story-media-kind={photo?"photo":shot?"video":reference?"reference":"missing"}
      data-storyboard-reference-only={Boolean(reference&&!shot)}
      data-storyboard-reference-id={reference?.id||undefined}
      data-storyboard-continuity={authored?.continuityKeys?.join(",")||undefined}>
     <div className={styles.storyAutoPoster}>
      {media?.poster? /* eslint-disable-next-line @next/next/no-img-element */
       <img src={media.poster} alt={media.title} loading="lazy"/>:
       reference?<StoryboardReferencePoster key={reference.id+":"+photoRetry} photo={reference}
        locale={locale} action={guide.visual} keywords={authored?.keywords||guide.keywords}
        onPhotoLoaded={id=>{
          setLoadedPhotoIds(curr=>curr.includes(id)?curr:[...curr,id]);
          setUnavailablePhotoIds(curr=>curr.filter(x=>x!==id));
        }}
        onPhotoUnavailable={id=>{
          setLoadedPhotoIds(curr=>curr.filter(x=>x!==id));
          setUnavailablePhotoIds(curr=>curr.includes(id)?curr:[...curr,id]);
        }}/>:
       <div className={styles.storyAutoNoPoster} data-video-story-media-missing={!shot}>
        <MandalaStoryboardSceneSketch locale={locale} action={guide.visual}
          visualSubject={authored?.visualSubject}
          keywords={authored?.keywords||guide.keywords} shotType={authored?.shotType}/>
        <small className={styles.storyAutoNeedsFootage}>{shot?t.noPoster:
         (locale==="ru"?"Нужен видеокадр":locale==="es"?"Falta vídeo":"Footage needed")}</small>
       </div>}
      <span>{index+1}</span>
     </div>
     <div className={styles.storyAutoBody}>
      <span className={styles.srOnly}>{t.scene} {index+1}</span>
      <small data-storyboard-scene-time>{clock(from)}–{clock(to)}</small>
      <strong>{title}</strong>
      {reference?<small data-storyboard-reference-title>{reference.labels[locale]}</small>:null}
      {sourcePhrase?<button type="button" className={styles.storyAutoPhraseEdit}
        data-storyboard-scene-phrase data-storyboard-edit-phrase={index+1}
        aria-label={(locale==="ru"?"Редактировать установку в сцене ":
          locale==="es"?"Editar frase de la escena ":"Edit phrase in scene ")+(index+1)+": "+sourcePhrase}
        title={locale==="ru"?"Редактировать во вкладке Текст":
          locale==="es"?"Editar en Texto":"Edit in Text"}
        disabled={disabled} onClick={()=>onEditPhrase(sourcePhrase)}>
        <span className={styles.storyAutoPhraseText}>{sourcePhrase}</span>
        <Pencil size={15} aria-hidden="true"/>
      </button>:null}
      <button type="button" className={styles.storyAutoAction}
        data-storyboard-scene-action aria-expanded={expandedScene===index}
        title={guide.visual}
        aria-label={(locale==="ru"?"Раскрыть действие сцены ":locale==="es"?"Ver acción de escena ":"Expand scene action ")+(index+1)+": "+guide.visual}
        onClick={()=>setExpandedScene(current=>current===index?null:index)}>
        {guide.visual}
      </button>
      {authored?<small data-storyboard-media-brief>
        {illustrativePhotos?(locale==="ru"?"Фото по теме; действие сценария не заснято":
          locale==="es"?"Foto temática; la acción del guion no está filmada":
          "Thematic photo; the scripted action was not filmed"):
         locale==="ru"?"Подбираем видео или фото именно этого действия":
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
  {scriptNeedsReview?<p className={styles.storyAutoEmpty} role="status"
    data-storyboard-script-review-needed>
    {locale==="ru"?"История и шесть кадров требуют сверки в «Идеях» перед выпуском.":
      locale==="es"?"Revisa la historia y las seis escenas en Ideas antes de exportar.":
      "Review the screenplay and all six shots in Ideas before export."}
  </p>:null}
  {!manualFiveReady&&replacingGraphics?<p className={styles.storyAutoEmpty} role="status"
   data-video-story-graphics-detected>{t.replace}</p>:null}
  {!manualFiveReady&&!eligible&&!photoAdaptationApplied?<p className={styles.storyAutoEmpty} role="status"
   data-video-story-missing-relevant-media>{illustrativePhotos?
     (locale==="ru"?"Подобраны 6 фотографий по теме. Проверьте снимки и подтвердите фотоисторию — она иллюстрирует идею, а не точные действия сценария.":
      locale==="es"?"Hay 6 fotos de la temática. Revisa y confirma la historia fotográfica: ilustra la idea, no las acciones exactas del guion.":
      "Six thematic photos are selected. Review and accept the photo story: it illustrates the idea, not the exact scripted actions."):
    photoReferenceCount?
     (locale==="ru"?"Реальные фото показывают направление сюжета, но конкретные действия сцен ещё не подтверждены. Для экспорта нужен соответствующий материал.":
      locale==="es"?"Las fotos reales ilustran la historia, pero las acciones exactas aún no están verificadas. Para exportar se necesitan medios adecuados.":
       "Real photos illustrate the story, but the exact shot actions are not yet verified. Matching media is still required to export.")
     :noRelevant}</p>:null}
  {hasSixPhotoReferences&&durationSeconds===30?
   <div className={styles.storyPhotoAspectChoices} data-storyboard-photo-output-aspect
     role="group" aria-label={locale==="ru"?"Формат фотомонтажа":
       locale==="es"?"Formato del montaje fotográfico":"Photo montage format"}>
     {(["portrait","landscape"] as const).map(format=>
      <button key={format} type="button" disabled={disabled}
        aria-pressed={photoOutputAspect===format}
        onClick={()=>setPhotoOutputAspect(format)}>
        {format==="portrait"?"9:16 · Vertical":"16:9 · Horizontal"}
      </button>)}
   </div>:null}
  {photoApprovalRequired?<p role="status" data-storyboard-photo-approval-required>
    {locale==="ru"?"Нажмите «Использовать эти 6 фото в видео», чтобы включить показанные снимки в свой ролик.":
     locale==="es"?"Pulsa «Usar estas 6 fotos en el vídeo» para incluir las fotografías mostradas en tu vídeo.":
     "Choose «Use these 6 photos in my video» to include the photographs shown in your video."}
   </p>:null}
  {photoApprovalRequired&&unavailableReferenceCount>0?<button type="button"
    className={styles.storyAutoApply} data-storyboard-retry-photos disabled={disabled}
    onClick={()=>{setLoadedPhotoIds([]);setUnavailablePhotoIds([]);setPhotoRetry(value=>value+1);}}>
    {locale==="ru"?"Фото не загрузились — повторить":
      locale==="es"?"No se cargaron las fotos — reintentar":"Photos did not load — retry"}
  </button>:null}
  {hasSixPhotoReferences&&!photoAdaptationApplied&&durationSeconds===30&&
   !scriptNeedsReview&&scriptSceneAlignment.aligned&&!choice.selectionMissing?
   <button type="button" className={styles.storyAutoApply}
     data-storyboard-apply-reference-photos disabled={disabled||!referencesDecoded}
     onClick={()=>{
       if(!referencesDecoded||references.some(photo=>!photo||!isTrustedStoryPhoto(photo)))return;
       // The visitor explicitly accepts an ILLUSTRATIVE photo montage.
       // Actual image.decode + rights are still checked by the real renderer.
       const photoShots=references.map((photo,index)=>({
         index:index+1,stage:Math.min(4,Math.floor(index*4/6)+1),
         sceneId:photo!.id,sourceMasterKey:photo!.id,sourcePath:photo!.src,
         startMs:index*5000,sourceInMs:0,durationMs:5000,sourceDurationMs:5000,
         matchedTags:[],symbolicFallback:true,loopRequired:false as const,
         depictedEventVerified:false as const
       })) as CategoryStoryboardShot[];
       if(onApply(photoShots,concept,storyKey,guides.scenes.map(beat=>
         beat.sourcePhrase||""),photoOutputAspect))onChooseQuality(true);
     }}>
     <Film size={17} aria-hidden="true"/>
     {locale==="ru"?"Использовать эти 6 фото в видео":
      locale==="es"?"Usar estas 6 fotos en el vídeo":"Use these 6 photos in my video"}
     <ArrowRight size={19} aria-hidden="true"/>
   </button>:null}
  {photoAdaptationApplied?<p className={styles.storyAutoEmpty}
    data-storyboard-user-selected-photo-interpretation>
    {locale==="ru"?"Это иллюстративный фотомонтаж; действия сцен не подтверждены как видеосъёмка.":
     locale==="es"?"Es un montaje fotográfico ilustrativo; las acciones no están confirmadas como filmaciones.":
     "This is an illustrative photo montage; the scripted actions were not verified as filmed events."}
  </p>:null}
  {storyboardSourcesPending&&sourceIssue!=="photos"?<button type="button"
    className={styles.storyAutoApply} data-storyboard-choose-another-story
    disabled={disabled} onClick={onOpenIdeas}>
    {locale==="ru"?"Выбрать или изменить сюжет":
      locale==="es"?"Elegir o editar la historia":"Choose or edit the story"}
    <ArrowRight size={19} aria-hidden="true"/>
  </button>:null}
  <button type="button" className={styles.storyAutoApply}
    data-video-story-select-quality
    data-video-auto-storyboard-apply={!manualFiveReady&&!applied&&eligible?true:undefined}
    disabled={disabled} onClick={()=>{
      if(photoApprovalRequired){onChooseQuality(false);return;}
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
