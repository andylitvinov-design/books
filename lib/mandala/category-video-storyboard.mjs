/**
 * Category-first MyTube storyboard / source-backed candidate planner.
 * Four narrative beats != four repeated clips. Does not render or publish.
 * The 49 director questions, provider layer and original voice remain unchanged.
 */
import moneyManifest from "../../public/videos/holistic-house/money-films-v1/manifest.json" with {type:"json"};
import v2Manifest from "../../public/videos/holistic-house/film-collection-v2/manifest.json" with {type:"json"};
import stockManifest from "../../data/video-catalog/free-stock-scenes.json" with {type:"json"};
import {isSafeMontageScene} from "./video-montage-sources.mjs";
import {getMyTubeStyle} from "./mytube-creative-choices.mjs";
export const CATEGORY_STORYBOARD_VERSION="hh-category-storyboard-v1";
const CATEGORIES=Object.freeze({"goals-money":{"themes":["money","goals","life"],"tags":["money","work","goals","business","growth","opportunity"],"ru":["Исходная ситуация","Препятствие","Новый ресурс","Следующий шаг"],"en":["Starting point","Obstacle","New resource","Next step"],"es":["Situación inicial","Obstáculo","Nuevo recurso","Siguiente paso"],"beats":[["morning","work","city","path","home","day"],["fog","shadow","challenge","rain","crossroads","city"],["light","growth","hands","open","bridge","opportunity"],["horizon","road","sunrise","path","calm","future"]],"purposes":{"ru":["Показать исходную задачу и желание изменений.","Обозначить неопределённость или выбор.","Показать появление новой возможности.","Завершить конкретным шагом вперёд."],"en":["Establish the situation and the wish to change.","Show uncertainty or a choice.","Reveal a new possible resource.","Finish with one concrete next step."],"es":["Presentar la situación inicial.","Mostrar una decisión o duda.","Abrir una nueva posibilidad.","Terminar con un paso adelante."]}},"love-relationships":{"themes":["relationships","life"],"tags":["love","relationships","connection","trust","family"],"ru":["Контакт","Дистанция","Встреча","Продолжение"],"en":["Contact","Distance","Encounter","Continuity"],"es":["Contacto","Distancia","Encuentro","Continuidad"],"beats":[["hands","people","home","meeting","heart","beginning"],["alone","distance","shadow","rain","silence"],["hands","warm","meeting","trust","together","light"],["horizon","garden","heart","together","sunset","peace"]],"purposes":{"ru":["Показать потребность в контакте.","Передать препятствие или дистанцию.","Обозначить возможность взаимной поддержки.","Показать продолжение контакта."],"en":["Introduce a wish for connection.","Show distance or an obstacle.","Open the possibility of mutual support.","Show a possible continuation."],"es":["Mostrar el deseo de conexión.","Mostrar distancia o dificultad.","Abrir una posibilidad de apoyo.","Mostrar una continuación."]}},"energy-confidence":{"themes":["energy","goals","health"],"tags":["energy","confidence","vitality","nature","light"],"ru":["Состояние","Порог","Пробуждение","Движение"],"en":["Current state","Challenge","Awakening","Forward motion"],"es":["Estado actual","Desafío","Despertar","Movimiento"],"beats":[["morning","quiet","rest","mist","slow","still"],["cloud","fog","shadow","challenge","rain"],["light","sun","growth","flow","bloom","nature"],["path","horizon","open","golden","sunrise","freedom"]],"purposes":{"ru":["Показать текущее состояние и ресурс.","Обозначить сомнение или порог.","Показать постепенное пробуждение движения.","Закончить устойчивым движением вперёд."],"en":["Establish the current state.","Show uncertainty or a threshold.","Show a gentle return of motion.","Finish with steady forward motion."],"es":["Mostrar el estado actual.","Mostrar duda o desafío.","Despertar el movimiento.","Terminar con un avance estable."]}},"stress-anxiety":{"themes":["health","energy","life"],"tags":["stress","rest","calm","recovery","health","nature"],"ru":["Напряжение","Пауза","Опора","Стабилизация"],"en":["Tension","Pause","Support","Stabilization"],"es":["Tensión","Pausa","Apoyo","Estabilización"],"beats":[["cloud","fog","pause","quiet","still","slow"],["forest","shelter","quiet","rest","shade","still"],["tree","ground","light","soft","earth","breath"],["calm","peace","horizon","sunrise","gentle","garden"]],"purposes":{"ru":["Показать напряжение без тревожащих образов.","Создать пространство для паузы.","Показать опору и доступный ресурс.","Завершить спокойной открытой композицией."],"en":["Show tension without alarming imagery.","Make space for a pause.","Show a modest accessible resource.","Finish in calm, open space."],"es":["Mostrar tensión sin alarmar.","Crear una pausa segura.","Mostrar un apoyo accesible.","Terminar con calma y apertura."]}}});
const PHYSICAL=new Map([...moneyManifest.scenes,...v2Manifest.scenes,...stockManifest]
  .filter(x=>typeof x?.id==="string").map(x=>[x.id,x]));
const LOCALES=new Set(["ru","en","es"]);
const ASPECTS=new Set(["landscape","portrait","square"]);
const LENGTHS=new Set([10,15,20,30,60]);
const tokens=v=>new Set(v.flatMap(x=>String(x||"").toLowerCase()
  .split(/[^a-z0-9а-яёáéíóúñ]+/iu).filter(Boolean)));
const overlap=(a,b)=>[...a].filter(x=>b.has(x)).length;
const positive=n=>typeof n==="number"&&Number.isFinite(n)&&n>0;
const blocked=(status,base)=>({...base,ok:false,status,canExport:false,shots:[]});
export function canonicalSourceMasterKey(scene){
  if(!scene||typeof scene!=="object")return null;
  const id=scene.sourceMasterId||scene.masterSourceId||scene.originalMasterId;
  if(typeof id==="string"&&id.trim())return "master:"+id.trim();
  const page=scene.rightsReference?.sourcePage;
  if(typeof page==="string"&&page.startsWith("https://"))
    return "origin:"+page.replace(/\/+$/,"").toLowerCase();
  const sha=scene.sha256||scene.technicalQuality?.sha256;
  if(typeof sha==="string"&&/^[a-f\d]{64}$/i.test(sha))
    return "sha256:"+sha.toLowerCase();
  return typeof scene.video==="string"&&scene.video.startsWith("/videos/holistic-house/")
    ?"local:"+scene.video:null;
}
/** Trust only exact published manifest paths, never poster orientation or text tags. */
export function verifiedCategorySource(scene){
  if(!isSafeMontageScene(scene))return null;
  const row=PHYSICAL.get(scene.id);
  if(row&&row.video===scene.video&&positive(row.width)&&positive(row.height)&&
     positive(row.durationSeconds))
    return {...scene,width:row.width,height:row.height,
      durationSeconds:row.durationSeconds,aspectPhysicallyVerified:true};
  if(scene.media==="original_motion_mp4"&&positive(scene.width)&&positive(scene.height)&&
     positive(scene.durationSeconds)&&/^[a-f\d]{64}$/i.test(scene.sha256||""))
    return {...scene,aspectPhysicallyVerified:true};
  return null;
}
export function verifiedSceneAspect(scene,aspect){
  if(!ASPECTS.has(aspect)||!scene||scene.aspectPhysicallyVerified!==true||
     !positive(scene.width)||!positive(scene.height)||
     (Array.isArray(scene.allowedAspects)&&!scene.allowedAspects.includes(aspect)))
    return false;
  const ratio=scene.width/scene.height;
  return aspect==="landscape"?ratio>=1.6&&ratio<=1.9:
    aspect==="portrait"?ratio>=.526&&ratio<=.625:ratio>=.95&&ratio<=1.05;
}
function styleFits(scene,style){
  if(!style)return true;
  if(style.id==="realistic"&&scene.media==="original_motion_mp4")return false;
  if(scene.visualStyles?.includes(style.id))return true;
  const sceneTags=tokens([...(scene.tags||[]),...(scene.motifs||[]),...(scene.categories||[])]);
  return style.visualTags.some(tag=>sceneTags.has(tag));
}
export function planMyTubeCategory({
  categoryId,locale="ru",aspect="landscape",durationSeconds=30,
  styleId=null,excludedMotifs=[],scenes=[],stageVisualTags=[]
}={}){
  const category=CATEGORIES[categoryId];
  if(!category)return blocked("CATEGORY_UNKNOWN",{categoryId,stages:[]});
  if(!LOCALES.has(locale)||!ASPECTS.has(aspect)||!LENGTHS.has(durationSeconds)||
     !Array.isArray(scenes)||!Array.isArray(excludedMotifs)||
     !Array.isArray(stageVisualTags))
    return blocked("INVALID_INPUT",{categoryId,stages:[]});
  const style=styleId===null?null:getMyTubeStyle(styleId);
  if(styleId!==null&&!style)return blocked("INVALID_STYLE",{categoryId,stages:[]});
  const stages=category.beats.map((tags,i)=>({stage:i+1,
    name:category[locale][i],purpose:category.purposes[locale][i],requiredTags:[...tags],styleId}));
  const base={version:CATEGORY_STORYBOARD_VERSION,categoryId,locale,aspect,durationSeconds,
    styleId,stages,canExport:false,publishAuthorized:false,
    evidence:"approved_catalog_tags_and_exact_physical_manifest_not_event_frame_review"};
  const categoryTags=tokens(category.tags);
  const unique=new Map();
  for(const original of scenes){
    const scene=verifiedCategorySource(original);
    if(!scene||!isSafeMontageScene(scene,excludedMotifs)||
       !verifiedSceneAspect(scene,aspect)||!styleFits(scene,style))continue;
    const words=tokens([...(scene.tags||[]),...(scene.motifs||[]),...(scene.categories||[])]);
    const score=overlap(categoryTags,words)*12+(category.themes.includes(scene.theme)?24:0);
    const key=canonicalSourceMasterKey(scene);
    if(!key||score===0)continue;
    const old=unique.get(key);
    if(!old||score>old.score||(score===old.score&&scene.id<old.scene.id))
      unique.set(key,{scene,words,score,key,
        group:typeof scene.perceptualGroupId==="string"?scene.perceptualGroupId:null});
  }
  const candidates=[...unique.values()];
  const required=Math.max(4,Math.ceil(durationSeconds/5));
  if(candidates.length<required)return blocked("INSUFFICIENT_UNIQUE_MEDIA",{
    ...base,requiredUniqueMasters:required,availableUniqueMasters:candidates.length,
    missingUniqueMasters:required-candidates.length});
  const used=new Set(),groups=new Set(),shots=[];
  const total=durationSeconds*1000;
  let cursor=0;
  for(let i=0;i<required;i++){
    const stage=Math.min(3,Math.floor(i*4/required));
    const ms=Math.floor(total/required)+(i<total%required?1:0);
    const visitorStage=Array.isArray(stageVisualTags[stage])?
      stageVisualTags[stage].filter(tag=>typeof tag==="string"&&/^[a-z]{3,20}$/.test(tag)).slice(0,8):[];
    const wanted=tokens([...stages[stage].requiredTags,...visitorStage]);
    const ranked=candidates.filter(item=>!used.has(item.key)&&
      (!item.group||!groups.has(item.group))&&item.scene.durationSeconds*1000>=ms)
      .map(item=>({...item,beatScore:overlap(wanted,item.words)}))
      .sort((a,b)=>b.beatScore-a.beatScore||b.score-a.score||
        a.scene.id.localeCompare(b.scene.id));
    // Missing exact stage tags may use a category-relevant symbolic frame; never
    // claim that this depicts the authored action without frame-level review.
    const next=ranked[0];
    if(!next)return blocked("INSUFFICIENT_STAGE_MEDIA",{
      ...base,requiredUniqueMasters:required,availableUniqueMasters:candidates.length,
      missingStage:stage+1,missingUniqueMasters:Math.max(1,required-shots.length)});
    used.add(next.key);
    if(next.group)groups.add(next.group);
    shots.push({index:i+1,stage:stage+1,sceneId:next.scene.id,
      sourceMasterKey:next.key,sourcePath:next.scene.video,startMs:cursor,
      sourceInMs:0,durationMs:ms,sourceDurationMs:Math.round(next.scene.durationSeconds*1000),
      matchedTags:[...wanted].filter(tag=>next.words.has(tag)),
      styleId,mediaKind:next.scene.media,symbolicFallback:next.beatScore===0,
      loopRequired:false,depictedEventVerified:false});
    cursor+=ms;
  }
  return {...base,ok:true,status:"CANDIDATE_PLAN_NOT_EXPORTED",shots,
    clipIds:shots.map(x=>x.sceneId),requiredUniqueMasters:required,
    uniqueSourceMasterCount:used.size,totalPlannedMs:cursor,
    stageCoverage:stages.map(s=>({stage:s.stage,shots:shots.filter(x=>x.stage===s.stage).length}))};
}
