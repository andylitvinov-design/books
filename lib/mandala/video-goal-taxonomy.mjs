/**
 * Canonical narrative hierarchy for the existing Holistic House Video Studio.
 *
 * Category -> specific client topic -> 4 unique narrative scenarios -> 4
 * semantic storyboard beats. No invented MP4, no paid render, no client data.
 * Keep the legacy six video-engine themes separate from these five public axes.
 */
import body from "../../data/video-catalog/video-goal-taxonomy-body-v1.json" with {type:"json"};
import business from "../../data/video-catalog/video-goal-taxonomy-business-v1.json" with {type:"json"};
import energy from "../../data/video-catalog/video-goal-taxonomy-energy-v1.json" with {type:"json"};
import love from "../../data/video-catalog/video-goal-taxonomy-love-v1.json" with {type:"json"};
import stress from "../../data/video-catalog/video-goal-taxonomy-stress-v1.json" with {type:"json"};

export const VIDEO_GOAL_TAXONOMY_VERSION = "hh-video-goal-topic-scenarios-v1";
export const VIDEO_GOAL_CATEGORY_ORDER = Object.freeze([
  "body", "business", "energy", "love", "stress",
]);

const LOCALES = new Set(["ru", "en", "es"]);
const LEGACY_THEMES = new Set(["health","money","energy","life","goals","relationships"]);
const SOURCES = [body,business,energy,love,stress];
const localeOf = locale => LOCALES.has(locale) ? locale : "ru";
const localize = (value,locale) => value?.[localeOf(locale)] || value?.ru || "";

// Abstract visual cues; these are not URLs, licensed source references or
// verified pictures. They become media lookup tags at the later binding stage.
const MOTIF_ROWS = [
  ["river","река","river","río"],
  ["stone","тёплые камни","warm stones","piedras cálidas"],
  ["light","мягкий свет","soft light","luz suave"],
  ["meadow","цветущий луг","flowering meadow","pradera florida"],
  ["sunrise","рассвет","sunrise","amanecer"],
  ["sunset","закат","sunset","atardecer"],
  ["mountain","горные вершины","mountain peaks","cumbres"],
  ["forest","лес","forest","bosque"],
  ["ocean","море","sea","mar"],
  ["lake","озеро","lake","lago"],
  ["waterfall","водопад","waterfall","cascada"],
  ["garden","сад","garden","jardín"],
  ["flowers","цветы","flowers","flores"],
  ["tree","дерево","tree","árbol"],
  ["roots","корни","roots","raíces"],
  ["path","тропа","path","sendero"],
  ["door","открытая дверь","open door","puerta abierta"],
  ["horizon","горизонт","horizon","horizonte"],
  ["sky","небо","sky","cielo"],
  ["stars","звёзды","stars","estrellas"],
  ["clouds","облака","clouds","nubes"],
  ["warmth","тепло","warmth","calidez"],
  ["breeze","лёгкий ветер","gentle breeze","brisa suave"],
  ["leaves","листва","leaves","hojas"],
  ["seed","семя","seed","semilla"],
  ["harvest","урожай","harvest","cosecha"],
  ["golden-field","золотое поле","golden field","campo dorado"],
  ["bridge","мост","bridge","puente"],
  ["lantern","фонарь","lantern","farol"],
  ["circle","круг света","circle of light","círculo de luz"],
  ["heart","сердечное сияние","heart glow","resplandor del corazón"],
  ["home","дом","home","hogar"],
  ["hearth","очаг","hearth","hogar encendido"],
  ["mirror","зеркало","mirror","espejo"],
  ["hands","ладони","hands","manos"],
  ["breath","дыхание","breath","respiración"],
  ["stage","сцена","stage","escenario"],
  ["notebook","блокнот","notebook","cuaderno"],
  ["compass","компас","compass","brújula"],
  ["window","окно","window","ventana"],
  ["flame","пламя свечи","candle flame","llama de vela"],
  ["rain","дождь","rain","lluvia"],
  ["nest","уютное гнездо","cozy nest","nido acogedor"],
  ["stream","ручей","stream","arroyo"],
  ["shore","берег","shore","orilla"],
  ["spark","искра","spark","chispa"],
  ["clearing","поляна","clearing","claro"],
  ["shield","мягкий щит","gentle shield","escudo suave"],
  ["road","дорога","road","camino"],
  ["spring","родник","spring","manantial"],
  ["sun","солнце","sun","sol"],
];
export const VIDEO_STORY_MOTIFS = Object.freeze(Object.fromEntries(
  MOTIF_ROWS.map(([id,ru,en,es]) => [id,Object.freeze({ru,en,es})]),
));
const ARC_STEPS = Object.freeze({
  journey:{
    ru:["Отправная точка","Путь открывается","Первый шаг","Новый горизонт"],
    en:["Starting point","A path opens","First step","New horizon"],
    es:["Punto de partida","Se abre un camino","Primer paso","Nuevo horizonte"],
  },
  shelter:{
    ru:["Замедление","Тёплое пространство","Мягкая опора","Возвращение"],
    en:["Slowing down","Welcoming space","Gentle support","Returning"],
    es:["Bajar el ritmo","Espacio acogedor","Apoyo suave","Regresar"],
  },
  awakening:{
    ru:["Первый импульс","Появляется свет","Рост и движение","Новый день"],
    en:["First spark","Light appears","Growth and movement","A new day"],
    es:["Primera chispa","Aparece la luz","Crecimiento y movimiento","Un nuevo día"],
  },
  connection:{
    ru:["Приближение","Прислушаться","Встреча","Бережный финал"],
    en:["Approaching","Listening","Meeting","Gentle ending"],
    es:["Acercamiento","Escuchar","Encuentro","Cierre amable"],
  }
});
export const VIDEO_STORY_ARC_IDS = Object.freeze(Object.keys(ARC_STEPS));

function freezeRecord(record) {
  return Object.freeze(record);
}
export const VIDEO_GOAL_CATEGORIES = Object.freeze(SOURCES.map(group => freezeRecord({
  id:group.id, label:Object.freeze(group.label),subtitle:Object.freeze(group.subtitle),
  topicIds:Object.freeze(group.topics.map(item=>item.id)),
})));
export const VIDEO_GOAL_TOPICS = Object.freeze(SOURCES.flatMap(group => group.topics.map(topic => freezeRecord({
  ...topic,categoryId:group.id,
  label:Object.freeze(topic.label),desiredOutcome:Object.freeze(topic.desiredOutcome),
  aliases:freezeRecord(Object.fromEntries(
    ["ru","en","es"].map(lc=>[lc,Object.freeze([...topic.aliases[lc]])]))),
  scenarioIds:Object.freeze(topic.scenarios.map(s=>s.id)),
  scenarios:undefined,
}))));
export const VIDEO_GOAL_SCENARIOS = Object.freeze(SOURCES.flatMap(group=>
  group.topics.flatMap(topic=>topic.scenarios.map(s=>freezeRecord({
    ...s,categoryId:group.id,topicId:topic.id,
    label:Object.freeze(s.label),
    visualMotifs:Object.freeze([...s.visualMotifs]),
  })))));
const CATEGORY_BY_ID = new Map(VIDEO_GOAL_CATEGORIES.map(c=>[c.id,c]));
const TOPIC_BY_ID = new Map(VIDEO_GOAL_TOPICS.map(t=>[t.id,t]));
const SCENARIO_BY_ID = new Map(VIDEO_GOAL_SCENARIOS.map(s=>[s.id,s]));
export const VIDEO_GOAL_LEGACY_PROFILE_TOPICS = Object.freeze([...new Set(
  VIDEO_GOAL_TOPICS.map(t=>t.legacyProfileTopic))].sort());

function validTopicInCategory(topicId,categoryId) {
  const t=TOPIC_BY_ID.get(topicId);
  return t && (!categoryId || t.categoryId===categoryId) ? t : null;
}

export function listVideoGoalCategories(locale="ru"){
  return VIDEO_GOAL_CATEGORIES.map(c=>({
    id:c.id,title:localize(c.label,locale),
    subtitle:localize(c.subtitle,locale),topicCount:c.topicIds.length,
  }));
}
export function listVideoGoalTopics(categoryId,locale="ru"){
  const c=CATEGORY_BY_ID.get(categoryId);
  if(!c)return [];
  return c.topicIds.map(id=>TOPIC_BY_ID.get(id)).filter(Boolean).map(t=>({
    id:t.id,categoryId:t.categoryId,title:localize(t.label,locale),
    desiredOutcome:localize(t.desiredOutcome,locale),scenarioCount:t.scenarioIds.length,
  }));
}
export function getVideoGoalTopic(topicId,locale="ru"){
  const t=TOPIC_BY_ID.get(topicId);
  if(!t)return null;
  return {id:t.id,categoryId:t.categoryId,title:localize(t.label,locale),
    desiredOutcome:localize(t.desiredOutcome,locale),
    legacyVideoTheme:t.legacyVideoTheme,legacyProfileTopic:t.legacyProfileTopic,
    scenarioCount:t.scenarioIds.length};
}
/**
 * Four conceptual storyboard beats, not already bound/approved video files.
 * The visual motif labels tell the future media-linking stage what to look for.
 */
export function listVideoGoalScenarios(topicId,locale="ru"){
  const t=TOPIC_BY_ID.get(topicId);
  if(!t)return [];
  return t.scenarioIds.map(id=>SCENARIO_BY_ID.get(id)).filter(Boolean).map(s=>{
    const phases=ARC_STEPS[s.arc]?.[localeOf(locale)];
    return {
      id:s.id,categoryId:s.categoryId,topicId:s.topicId,
      title:localize(s.label,locale),arc:s.arc,sourceStatus:s.sourceStatus,
      canExport:false,
      storyboard:s.visualMotifs.map((motifId,index)=>({
        shot:index+1,phase:phases[index],visualMotifId:motifId,
        visualHint:localize(VIDEO_STORY_MOTIFS[motifId],locale),
      })),
    };
  });
}
/** Never treat an unbound creative scenario as a ready four-MP4 film. */
export function buildVideoGoalScenarioPlan({
  categoryId=null,topicId=null,scenarioId=null,locale="ru",
}={}){
  const topic=validTopicInCategory(topicId,categoryId);
  if(!topic || !scenarioId || !topic.scenarioIds.includes(scenarioId))return null;
  const scenario=listVideoGoalScenarios(topicId,locale).find(s=>s.id===scenarioId);
  if(!scenario)return null;
  return {
    version:VIDEO_GOAL_TAXONOMY_VERSION,
    categoryId:topic.categoryId,topicId,scenarioId,
    categoryTitle:localize(CATEGORY_BY_ID.get(topic.categoryId).label,locale),
    topicTitle:localize(topic.label,locale),
    goal:localize(topic.desiredOutcome,locale),
    title:scenario.title,legacyVideoTheme:topic.legacyVideoTheme,
    legacyProfileTopic:topic.legacyProfileTopic,
    shots:scenario.storyboard,requiresMediaBinding:true,
    mediaStatus:"unbound",audioStatus:"unbound",
    canExport:false,clientDataIncluded:false,
  };
}
const normalized = x => typeof x==="string"?
  x.normalize("NFKC").toLocaleLowerCase().replace(/ё/g,"е")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,320):"";
function topicScore(t,text,locale){
  if(!text)return 0;
  const lc=localeOf(locale);
  const direct=normalized(t.label[lc]);
  const goal=normalized(t.desiredOutcome[lc]);
  let score=0;
  if(direct===text)score+=150;
  else if(direct.length>=5&&text.includes(direct))score+=90;
  if(goal===text)score+=130;
  else if(goal.length>=8&&text.includes(goal))score+=50;
  for(const alias of t.aliases[lc]){
    const a=normalized(alias);
    if(!a||a.length<4)continue;
    if(text===a)score+=55;
    else if(text.includes(a))score+=a.includes(" ")?38:25;
  }
  return score;
}
/**
 * Optional selected category/topic outranks uncertain free text.
 * Return a clarification state instead of silently inventing a goal.
 */
export function resolveVideoGoalTopic({
  categoryId=null,topicId=null,request="",locale="ru",
}={}){
  if(topicId){
    const topic=validTopicInCategory(topicId,categoryId);
    return topic ? {
      status:"matched",categoryId:topic.categoryId,topicId:topic.id,
      confidence:"explicit",
    } : {status:"invalid_selection",categoryId:null,topicId:null,confidence:"none"};
  }
  if(categoryId && !CATEGORY_BY_ID.has(categoryId)){
    return {status:"invalid_selection",categoryId:null,topicId:null,confidence:"none"};
  }
  const text=normalized(request);
  if(!text)return {status:categoryId?"needs_topic":"needs_category",
    categoryId,topicId:null,confidence:"none"};
  const matches=VIDEO_GOAL_TOPICS.filter(t=>!categoryId||t.categoryId===categoryId)
    .map(t=>({topic:t,score:topicScore(t,text,locale)}))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||
      VIDEO_GOAL_TOPICS.indexOf(a.topic)-VIDEO_GOAL_TOPICS.indexOf(b.topic));
  if(!matches.length)return {status:categoryId?"needs_topic":"needs_category",
    categoryId,topicId:null,confidence:"none"};
  if(matches[1]&&matches[0].score===matches[1].score){
    return {status:"ambiguous",categoryId:categoryId||null,topicId:null,
      confidence:"low",suggestedTopicIds:matches.filter(x=>x.score===matches[0].score)
        .slice(0,4).map(x=>x.topic.id)};
  }
  const match=matches[0].topic;
  return {status:"matched",categoryId:match.categoryId,topicId:match.id,
    confidence:matches[0].score>=90?"high":"medium"};
}
/**
 * Strict read-only startup validation: also used by the independent tests.
 * Guard technical compatibility with old film preset theme IDs.
 */
export function auditVideoGoalTaxonomy(){
  const issues=[];
  if(VIDEO_GOAL_CATEGORIES.length!==5)issues.push("categories");
  if(VIDEO_GOAL_TOPICS.length!==30)issues.push("topics");
  if(VIDEO_GOAL_SCENARIOS.length!==120)issues.push("scenarios");
  if(new Set(VIDEO_GOAL_CATEGORIES.map(c=>c.id)).size!==5)issues.push("duplicate_category");
  if(new Set(VIDEO_GOAL_TOPICS.map(t=>t.id)).size!==30)issues.push("duplicate_topic");
  if(new Set(VIDEO_GOAL_SCENARIOS.map(s=>s.id)).size!==120)issues.push("duplicate_scenario");
  for(const category of VIDEO_GOAL_CATEGORIES){
    if(category.topicIds.length!==6)issues.push("topic_count:"+category.id);
  }
  for(const topic of VIDEO_GOAL_TOPICS){
    if(!CATEGORY_BY_ID.has(topic.categoryId))issues.push("missing_category:"+topic.id);
    if(!LEGACY_THEMES.has(topic.legacyVideoTheme))issues.push("invalid_theme:"+topic.id);
    if(topic.scenarioIds.length!==4)issues.push("story_count:"+topic.id);
    for(const locale of LOCALES){
      if(!topic.label[locale]||!topic.desiredOutcome[locale])issues.push("topic_locale:"+topic.id);
      if(!Array.isArray(topic.aliases[locale]))issues.push("topic_alias:"+topic.id);
    }
    const usedArc=new Set(),usedImages=new Set();
    for(const scenarioId of topic.scenarioIds){
      const s=SCENARIO_BY_ID.get(scenarioId);
      if(!s||s.topicId!==topic.id){issues.push("missing_story:"+scenarioId);continue;}
      usedArc.add(s.arc);
      usedImages.add(s.visualMotifs.join("|"));
      if(s.visualMotifs.length!==4||s.visualMotifs.some(id=>!VIDEO_STORY_MOTIFS[id]))
        issues.push("invalid_beats:"+scenarioId);
      if(s.sourceStatus!=="unbound")issues.push("imaginary_media:"+scenarioId);
      for(const locale of LOCALES)if(!s.label[locale])issues.push("story_locale:"+scenarioId);
    }
    if(usedArc.size!==4||usedImages.size!==4)issues.push("duplicate_story:"+topic.id);
  }
  return {
    ok:issues.length===0,version:VIDEO_GOAL_TAXONOMY_VERSION,
    categories:VIDEO_GOAL_CATEGORIES.length,topics:VIDEO_GOAL_TOPICS.length,
    scenarios:VIDEO_GOAL_SCENARIOS.length,storyboardBeats:VIDEO_GOAL_SCENARIOS.length*4,
    issues,
  };
}
