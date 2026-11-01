/**
 * Holistic House executable four-scene director v1.
 * A prompt is NOT a render plan. This trusted compiler is the only boundary
 * from client intent (or optional LLM suggestions) to the existing real
 * approved-MP4 Canvas / MediaRecorder workflow.
 * No personal text, profile, uploads or fabricated assets leave this module.
 */
import {recommendAutoVideo} from "./auto-video-director.mjs";
import {allocateAdaptiveFilmTimeline} from "./free-film-timeline.mjs";
import {isSafeMontageScene,validateMontageClips} from "./video-montage-sources.mjs";
import {normalizeStageCaption} from "./stage-caption-track.mjs";

export const EXECUTABLE_VIDEO_SCENARIO_VERSION = "hh-executable-video-scenario-v1";
const VALID_LENGTHS = [10,15,20,30,60];
const VALID_ASPECTS = ["landscape","portrait","square"];
const VALID_MUSIC = ["none","harmony","love","meditation"];
const VALID_THEMES = ["money","energy","relationships","goals","life","health"];
const ROLES = ["opening","orientation","development","closing"];
const emptyCaptions=()=>["","","",""];
const safeLocale=x=>["ru","en","es"].includes(x)?x:"en";
const unique=x=>[...new Set(x)];
const isRecord=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
const exactKeys=(object,keys)=>isRecord(object)&&Object.keys(object).every(key=>keys.includes(key));
const CUES=Object.freeze([
  {id:"mountains",test:/(?:гор(?:ы|а|е|ные|ах)|вершин|скал|mountains?|summit|peaks?|monta[ñn]a)/iu,tags:["mountain","sky","rock","peaks"]},
  {id:"food",test:/(?:ед(?:а|ы|у|е|ой)|пища|блюд|кулинар|food|cooking|recipe|comida|receta)/iu,tags:["food","cooking","meal","fruit","vegetable"]},
  {id:"forest",test:/(?:лес|дерев|роща|forest|trees?|woods?|bosque|[aá]rbol)/iu,tags:["forest","trees","tree","fern","nature"]},
  {id:"sea",test:/(?:море|моря|океан|волны|sea|ocean|waves?|mar|oc[eé]ano|olas?)/iu,tags:["sea","water","coast","ocean","waves"]},
  {id:"water",test:/(?:вод[аыеу]|водопад|река|ручей|river|water|waterfall|stream|r[ií]o|agua)/iu,tags:["water","river","stream","waterfall","falls"]},
  {id:"flowers",test:/(?:цвет|сад|луг|flowers?|garden|blossom|jard[ií]n|flor(?:es)?)/iu,tags:["flowers","blossom","garden","meadow"]},
  {id:"sun",test:/(?:солнц|рассвет|закат|sunrise|sunset|sunlight|sun|amanecer|atardecer|sol)/iu,tags:["sun","sunrise","light","dawn"]},
  {id:"stars",test:/(?:зв[её]зд|космос|stars?|galaxy|estrellas?|galaxia)/iu,tags:["stars","night","sky","cosmic"]},
]);
const WITHOUT=/(?:без|избегать|исключить|не хочу|without|avoid|no|sin|no quiero)\s+(?:[\p{L}-]+\s+){0,2}[\p{L}-]+/giu;
const CAPTIONS={
  ru:{
    energy:["Новый импульс","Движение и свет","Мой следующий шаг","Продолжать в своём темпе"],
    money:["Начать с опоры","Замечать возможности","Действовать постепенно","Выбирать свой путь"],
    relationships:["Пространство для встречи","Уважение и границы","Тепло и доверие","Оставаться собой"],
    goals:["Я вижу направление","Шаг за шагом","Исследую возможности","Двигаюсь дальше"],
    life:["Новое начало","Всё меняется","Мой собственный ритм","Открытое пространство"],
    health:["Момент тишины","Замедлиться","Больше пространства","Бережно к себе"],
  },
  en:{
    energy:["A fresh beginning","Movement and light","One step forward","At my own pace"],
    money:["Find solid ground","Notice opportunities","Make gradual progress","Choose my direction"],
    relationships:["Room to connect","Respect and boundaries","Warmth and trust","Stay true to myself"],
    goals:["See a direction","Step by step","Explore possibilities","Moving forward"],
    life:["A new beginning","Things can change","My own rhythm","An open space"],
    health:["A quiet moment","Slow down","Find more space","Be gentle with myself"],
  },
  es:{
    energy:["Un nuevo comienzo","Movimiento y luz","El siguiente paso","A mi propio ritmo"],
    money:["Encontrar apoyo","Ver oportunidades","Avanzar poco a poco","Elegir mi camino"],
    relationships:["Espacio para conectar","Respeto y límites","Calidez y confianza","Ser yo mismo"],
    goals:["Ver una dirección","Paso a paso","Explorar posibilidades","Seguir adelante"],
    life:["Un nuevo comienzo","Todo puede cambiar","Mi propio ritmo","Un espacio abierto"],
    health:["Un momento de calma","Bajar el ritmo","Encontrar espacio","Cuidarme con respeto"],
  },
};
export function visualSignalsFromGoal(goal=""){
  const text=typeof goal==="string"?goal.slice(0,160).replace(WITHOUT," "):"";
  return Object.freeze(CUES.filter(cue=>cue.test.test(text)).map(cue=>cue.id));
}
function relevance(scene,signals){
  const haystack=[scene.id,...scene.tags,...scene.motifs,...(scene.categories||[])].join(" ").toLocaleLowerCase();
  const scores=signals.map(id=>{
    const cue=CUES.find(item=>item.id===id);
    return cue?cue.tags.reduce((total,word)=>total+(haystack.includes(word)?1:0),0):0;
  });
  return scores.reduce((sum,n,i)=>sum+n*(signals.length-i),0);
}
export function executableSceneCandidates({presetId,alternativePresetIds=[],presets=[],scenes=[],excludedMotifs=[]}={}){
  const map=new Map(scenes.filter(scene=>isSafeMontageScene(scene,excludedMotifs)).map(scene=>[scene.id,scene]));
  const selected=presets.find(preset=>preset.id===presetId);
  if(!selected||!Array.isArray(selected.clips)||selected.clips.length!==4)return Object.freeze([]);
  const eligiblePresets=[selected,...alternativePresetIds.slice(0,3)
    .map(id=>presets.find(preset=>preset.id===id))
    .filter(preset=>preset&&preset.theme===selected.theme)];
  const ids=unique(eligiblePresets.flatMap(preset=>preset.clips||[]))
    .filter(id=>map.has(id)).slice(0,16);
  return Object.freeze(ids);
}
export function parseAiVideoCutSuggestion(value,{candidateSceneIds=[],durationSeconds,scenes=[],excludedMotifs=[]}={}){
  if(!exactKeys(value,["clipIds","stageSeconds"])||!Array.isArray(value.clipIds)||
    !Array.isArray(value.stageSeconds)||value.clipIds.length!==4||
    value.stageSeconds.length!==4||!VALID_LENGTHS.includes(durationSeconds)||
    value.stageSeconds.some(seconds=>!Number.isInteger(seconds)||seconds<2)||
    value.stageSeconds.reduce((a,b)=>a+b,0)!==durationSeconds)return null;
  const whitelist=new Set(candidateSceneIds);
  if(value.clipIds.some(id=>typeof id!=="string"||!whitelist.has(id)) ||
    !validateMontageClips(value.clipIds,scenes,excludedMotifs))return null;
  return Object.freeze({clipIds:Object.freeze([...value.clipIds]),
    stageSeconds:Object.freeze([...value.stageSeconds])});
}
export function compileExecutableVideoScenario({
  goal="",locale="en",fallbackTheme="energy",presets=[],scenes=[],
  selectedPresetId=null,alternativePresetIds=[],excludedMotifs=null,
  draft={},renderOptions={},aiSuggestion=null
}={}){
  const language=safeLocale(locale);
  if(typeof goal!=="string"||goal.trim().length<3||goal.length>160||
    !isRecord(draft)||!VALID_LENGTHS.includes(draft.duration)||
    !VALID_ASPECTS.includes(draft.aspect)||!VALID_MUSIC.includes(draft.music)||
    !["slow","dynamic"].includes(draft.mood)||typeof draft.phrases!=="boolean")
    throw Error("invalid_executable_video_input");
  const recommended=recommendAutoVideo({goal,locale:language,fallbackTheme,presets,scenes});
  const preset=presets.find(item=>item.id===selectedPresetId);
  if(!preset||!VALID_THEMES.includes(preset.theme)||!Array.isArray(preset.clips)||preset.clips.length!==4)
    throw Error("invalid_executable_video_preset");
  const exclusions=excludedMotifs===null?recommended.excludedMotifs:excludedMotifs;
  if(!Array.isArray(exclusions)||exclusions.some(id=>!["water","forest","dark"].includes(id)))
    throw Error("invalid_executable_video_exclusions");
  const candidateSceneIds=executableSceneCandidates({presetId:preset.id,
    alternativePresetIds,presets,scenes,excludedMotifs:exclusions});
  if(candidateSceneIds.length<4)throw Error("insufficient_licensed_video_sources");
  const map=new Map(scenes.filter(scene=>isSafeMontageScene(scene,exclusions)).map(scene=>[scene.id,scene]));
  let ids;
  if(aiSuggestion!==null){
    const parsed=parseAiVideoCutSuggestion(aiSuggestion,{
      candidateSceneIds,durationSeconds:draft.duration,scenes,excludedMotifs:exclusions,
    });
    if(!parsed)throw Error("untrusted_ai_film_suggestion");
    ids=[...parsed.clipIds];
  }else{
    const signals=visualSignalsFromGoal(goal);
    const ranked=candidateSceneIds.map((id,index)=>({id,index,
      score:relevance(map.get(id),signals),
    })).sort((a,b)=>b.score-a.score||a.index-b.index);
    // Curated preset establishes the story continuity. At most one hero scene
    // is replaced to honor the visitor's explicit visual subject.
    const hero=ranked[0]?.score>0?ranked[0].id:preset.clips[0];
    ids=unique([hero,...preset.clips,...candidateSceneIds]).slice(0,4);
  }
  if(!validateMontageClips(ids,scenes,exclusions))
    throw Error("unlicensed_or_excluded_video_scene");
  const timeline=aiSuggestion!==null?
    allocateAdaptiveFilmTimeline(draft.duration,ids,aiSuggestion.stageSeconds):
    allocateAdaptiveFilmTimeline(draft.duration,ids);
  const captions=draft.phrases?CAPTIONS[language][preset.theme].map(normalizeStageCaption):emptyCaptions();
  const audio=Object.freeze({kind:draft.music==="none"?"silent":"approved_preset",
    trackId:draft.music,volumePercent:Number.isInteger(renderOptions.volumePercent)&&
      renderOptions.volumePercent>=0&&renderOptions.volumePercent<=100?renderOptions.volumePercent:75,
    durationSeconds:draft.duration});
  const rendering=Object.freeze({engine:"existing_canvas_mediarecorder",
    source:"licensed_first_party_mp4",
    aspect:draft.aspect,quality:["hd","fullhd"].includes(renderOptions.quality)?renderOptions.quality:"hd",
    brightness:["soft","bright"].includes(renderOptions.brightness)?renderOptions.brightness:"soft",
    motion:draft.mood,captionMode:"stage_only",transition:"existing_renderer"});
  const shots=timeline.map((item,i)=>Object.freeze({
    number:i+1,role:ROLES[i],sceneId:item.sceneId,
    assetPath:map.get(item.sceneId).video,poster:map.get(item.sceneId).poster||null,
    startSeconds:item.startSeconds,durationSeconds:item.durationSeconds,
    captionText:captions[i],
  }));
  const edit=Object.freeze({clipIds:Object.freeze([...ids]),
    durationSecondsByStage:Object.freeze(shots.map(s=>s.durationSeconds)),
    captionTexts:Object.freeze([...captions]),
    excludedMotifs:Object.freeze([...exclusions])});
  return Object.freeze({version:EXECUTABLE_VIDEO_SCENARIO_VERSION,
    origin:aiSuggestion?"ai_suggestion_validated":"local_compiler",
    presetId:preset.id,theme:preset.theme,locale:language,
    durationSeconds:draft.duration,aspect:draft.aspect,
    mood:draft.mood,phrases:draft.phrases,
    shotCount:4,shots:Object.freeze(shots),
    audio,rendering,edit,
    candidateSceneIds,
    requiresNovelFootage:Boolean(recommended.requiresNewAiFootage),
    noExternalClientData:true,paidRenderApproved:false,readyToExecute:true,
  });
}
