/**
 * MyTube creative choices v1.
 *
 * Canonical catalog order: category → subcategory → topic → meaning → motif → film scenario.
 * The five-motifs-after-scenario helper is preserved for older readers only.
 * Visual style is an orthogonal optional filter; the existing four narrative
 * plots per scenario remain independent. Suggestions are editorial, NOT MP4s.
 *
 * No personal input, provider calls, inferred psychotherapy outcomes or rights
 * decisions here. Approved footage must still pass the existing source gate.
 */
import {getMyTubeTaxonomy} from "./mytube-content-taxonomy.mjs";
import topicPalettes from "../../data/video-catalog/mytube-topic-motif-palettes-v1.json" with {type:"json"};
import meaningMap from "../../data/video-catalog/mytube-meaning-motifs-v1.json" with {type:"json"};

const LANGUAGES=new Set(["ru","en","es"]);
const language=(locale)=>LANGUAGES.has(locale)?locale:"ru";
const localized=(ru,en,es)=>Object.freeze({ru,en,es});
const row=(id,ru,en,es,symbolRu,symbolEn,symbolEs,visualTags)=>Object.freeze({
  id,label:localized(ru,en,es),meaning:localized(symbolRu,symbolEn,symbolEs),
  visualTags:Object.freeze(visualTags),
  status:"editorial_symbol_not_verified_footage",
});

// The visual tags describe literal things potentially visible in footage,
// not psychological diagnoses or guaranteed interpretations.
export const MYTUBE_VISUAL_MOTIFS=Object.freeze([
  row("key","Ключ","Key","Llave","Возможность открыть новое","An opening to something new","Abrir una posibilidad",["key","keys"]),
  row("stream","Ручей","Stream","Arroyo","Движение и мягкое течение","Movement and gentle flow","Movimiento y fluir suave",["stream","creek","brook"]),
  row("meadow","Луг","Meadow","Pradera","Пространство для спокойствия","Space to settle","Espacio para calmarse",["meadow","grassland"]),
  row("mountain","Гора","Mountain","Montaña","Высота и собственный путь","Perspective and ascent","Perspectiva y ascenso",["mountain","peak"]),
  row("house","Дом","Home","Casa","Внутреннее безопасное место","A place to belong","Un lugar de pertenencia",["home","house","cottage"]),
  row("tree","Дерево","Tree","Árbol","Рост и устойчивость","Growth and stability","Crecimiento y estabilidad",["tree","trees"]),
  row("forest","Лес","Forest","Bosque","Неизвестное и исследование","Exploration of the unknown","Explorar lo desconocido",["forest","woods"]),
  row("bridge","Мост","Bridge","Puente","Связь между берегами","Connecting two shores","Conectar dos orillas",["bridge"]),
  row("door","Дверь","Door","Puerta","Порог перемен","A threshold for change","Umbral de cambio",["door","doorway"]),
  row("path","Тропа","Path","Sendero","Один следующий шаг","One next step","Un siguiente paso",["path","trail","footpath"]),
  row("sunrise","Рассвет","Sunrise","Amanecer","Начало нового этапа","A new beginning","Un nuevo comienzo",["sunrise","dawn"]),
  row("seed","Семя","Seed","Semilla","Потенциал и созревание","Potential taking root","Potencial que germina",["seed","seeds"]),
  row("flower","Цветок","Flower","Flor","Раскрытие своего качества","Unfolding","Despliegue",["flower","flowers","blossom"]),
  row("rose","Роза","Rose","Rosa","Бережная близость","Tender closeness","Cercanía cuidadosa",["rose","roses"]),
  row("nest","Гнездо","Nest","Nido","Укрытие и забота","Shelter and care","Refugio y cuidado",["nest"]),
  row("hearth","Очаг","Hearth","Hogar cálido","Тепло и общность","Warmth and belonging","Calidez y comunidad",["hearth","fireplace"]),
  row("lantern","Фонарь","Lantern","Farol","Небольшой свет в пути","A guiding light","Una luz de guía",["lantern","lamp"]),
  row("mirror","Зеркало","Mirror","Espejo","Новый взгляд на себя","A different perspective","Otra perspectiva",["mirror","reflection"]),
  row("window","Окно","Window","Ventana","Новая точка зрения","A new viewpoint","Una nueva mirada",["window"]),
  row("compass","Компас","Compass","Brújula","Собственное направление","Inner direction","Dirección propia",["compass"]),
  row("river","Река","River","Río","Время и движение жизни","Time and life's movement","Tiempo y movimiento vital",["river"]),
  row("spring","Родник","Spring","Manantial","Восстановление ресурса","Renewal of resources","Renovar recursos",["spring","water-spring","freshwater-source"]),
  row("lake","Озеро","Lake","Lago","Тишина и отражение","Stillness and reflection","Quietud y reflejo",["lake"]),
  row("ocean","Море","Sea","Mar","Большое пространство чувств","A vast emotional landscape","Amplio paisaje emocional",["sea","ocean"]),
  row("stone","Камень","Stone","Piedra","Опора и границы","Stability and boundaries","Estabilidad y límites",["stone","rock","rocks"]),
  row("roots","Корни","Roots","Raíces","Связь с основаниями","Being grounded","Estar arraigado",["root","roots"]),
  row("stairs","Лестница","Stairs","Escalera","Последовательные шаги","Progress step by step","Avance paso a paso",["stairs","staircase","steps"]),
  row("butterfly","Бабочка","Butterfly","Mariposa","Изменение формы","A gentle metamorphosis","Una metamorfosis suave",["butterfly"]),
  row("boat","Лодка","Boat","Barca","Выбранное направление движения","Navigating a choice","Navegar una elección",["boat","sailboat"]),
  row("island","Остров","Island","Isla","Своя территория","Personal space","Territorio propio",["island"]),
  row("fire","Пламя","Flame","Llama","Живой импульс","Vital spark","Impulso vital",["fire","flame"]),
  row("sun","Солнце","Sun","Sol","Ясность и энергия","Clarity and warmth","Claridad y calor",["sun","sunlight"]),
  row("moon","Луна","Moon","Luna","Ритм и пауза","Rhythm and rest","Ritmo y pausa",["moon"]),
  row("stars","Звёзды","Stars","Estrellas","Ориентиры в темноте","Points of orientation","Puntos de orientación",["stars","starfield"]),
  row("garden","Сад","Garden","Jardín","Забота о растущем","Tending what grows","Cuidar lo que crece",["garden"]),
  row("hands","Ладони","Hands","Manos","Контакт и действие","Connection and action","Contacto y acción",["hands","hand"]),
  row("circle","Круг","Circle","Círculo","Целостность и связь","Wholeness and connection","Totalidad y vínculo",["circle","ring"]),
  row("thread","Нить","Thread","Hilo","Тонкая связь","A delicate bond","Un vínculo delicado",["thread","yarn"]),
  row("shield","Щит","Shield","Escudo","Граница и защита","Boundaries and safety","Límites y protección",["shield"]),
  row("rain","Дождь","Rain","Lluvia","Прохождение переживания","Letting a feeling pass","Dejar pasar una emoción",["rain"]),
  row("clouds","Облака","Clouds","Nubes","Изменчивость состояний","Passing states","Estados cambiantes",["clouds","cloud"]),
  row("horizon","Горизонт","Horizon","Horizonte","Широта возможностей","An open outlook","Horizonte abierto",["horizon"]),
  row("book","Книга","Book","Libro","История и собственный смысл","An unfolding personal story","Una historia personal",["book","pages"]),
  row("temple","Храм","Temple","Templo","Сакральное пространство","A ritual setting","Un espacio ritual",["temple","shrine"]),
  row("bird","Птица","Bird","Ave","Свобода и взгляд сверху","Freedom and perspective","Libertad y perspectiva",["bird","birds"]),
  row("gate","Ворота","Gate","Portal","Прохождение порога","Passing a threshold","Cruzar un umbral",["gate","gateway"]),
]);

const style=(id,ru,en,es,descRu,descEn,descEs,visualTags)=>Object.freeze({
  id,label:localized(ru,en,es),description:localized(descRu,descEn,descEs),
  visualTags:Object.freeze(visualTags),status:"editorial_style_hint_not_frame_verified",
});
export const MYTUBE_VISUAL_STYLES=Object.freeze([
  style("nature","Природный","Nature","Naturaleza","Ландшафты, вода, лес и мягкое движение","Landscapes, water, woods and gentle movement","Paisajes, agua, bosques y movimiento suave",["nature","forest","meadow","mountain","river","lake","tree","water","flowers"]),
  style("cinematic","Кинематографичный","Cinematic","Cinematográfico","Выразительный свет, глубина, движение камеры","Expressive light, depth and camera movement","Luz expresiva, profundidad y cámara",["cinematic","golden","horizon","sunset","sunrise","aerial","wide","film"]),
  style("meditative","Медитативный","Meditative","Meditativo","Мягкие кадры и спокойный темп","Gentle imagery with an unhurried pace","Imágenes suaves a ritmo tranquilo",["calm","relax","soft","quiet","peace","gentle","nature","rest"]),
  style("realistic","Реалистичный","Realistic","Realista","Повседневная жизнь, люди, реальные места","People and real-life settings","Personas y escenarios cotidianos",["people","person","hands","home","city","work","street","life"]),
  style("symbolic","Символический","Symbolic","Simbólico","Метафоры, свет, образы перехода","Metaphors, light and transitions","Metáforas, luz y transiciones",["symbol","symbolic","metaphor","portal","light","dream","transformation","magic"]),
  style("minimal","Минималистичный","Minimal","Minimalista","Простые формы и один визуальный акцент","Simple shapes and a focused image","Formas simples y un solo foco",["minimal","simple","clean","geometry","shape","abstract"]),
  style("sacred","Храмовый","Sacred / ritual","Sagrado / ritual","Храмы, свечи и ритуальная эстетика","Temples, candlelight and ritual imagery","Templos, velas e imágenes rituales",["temple","ritual","candle","sacred","ancient","shrine"]),
  style("cosmic","Космический","Cosmic","Cósmico","Звёзды, пространство и световые потоки","Stars, space and luminous motion","Estrellas, espacio y luz en movimiento",["stars","cosmic","galaxy","space","night","universe"]),
  style("urban","Городской","Urban","Urbano","Город, улицы, современная архитектура","Cities, streets and modern architecture","Ciudades, calles y arquitectura moderna",["urban","city","street","office","business","architecture"]),
  style("abstract","Абстрактный","Abstract","Abstracto","Геометрические и нефигуративные образы","Geometry and nonfigurative motion","Geometría y movimiento no figurativo",["abstract","geometry","shapes","particles","original_motion_mp4"]),
]);

const motifById=new Map(MYTUBE_VISUAL_MOTIFS.map(row=>[row.id,row]));
const styleById=new Map(MYTUBE_VISUAL_STYLES.map(row=>[row.id,row]));

// Category + dramatic archetype: intentional imagery families, not random
// universal lists. Scenario-specific visual cues re-order each 7–8 item pool.
const CURATED_POOLS=Object.freeze({
  "goals-money":{
    journey:["compass","key","path","bridge","mountain","door","horizon","stairs"],
    shelter:["tree","house","stone","hearth","lantern","garden","roots","meadow"],
    reframe:["mirror","key","window","book","sunrise","horizon","compass","door"],
    integration:["seed","stairs","path","tree","sunrise","key","bridge","hands"],
  },
  "love-relationships":{
    journey:["bridge","path","rose","key","door","boat","hands","stream"],
    shelter:["house","nest","hearth","tree","rose","garden","lake","hands"],
    reframe:["mirror","window","thread","rose","bridge","butterfly","moon","key"],
    integration:["hands","rose","bridge","seed","garden","tree","lantern","circle"],
  },
  "energy-confidence":{
    journey:["sun","spring","path","mountain","fire","stream","tree","sunrise"],
    shelter:["meadow","stone","tree","house","roots","stream","lake","nest"],
    reframe:["mirror","butterfly","sunrise","window","river","clouds","sun","spring"],
    integration:["sunrise","seed","tree","fire","stream","hands","sun","stairs"],
  },
  "stress-anxiety":{
    journey:["stream","bridge","lantern","path","boat","meadow","sunrise","river"],
    shelter:["nest","house","hearth","meadow","lake","stone","tree","hands"],
    reframe:["mirror","moon","window","butterfly","clouds","spring","flower","key"],
    integration:["stream","roots","tree","sunrise","seed","stone","lantern","meadow"],
  },
});

const scenarioIndex=new Map();
for(const category of getMyTubeTaxonomy().categories){
  for(const subcategory of category.subcategories){
    for(const topic of subcategory.topics){
      for(const scenario of topic.scenarios){
        if(scenarioIndex.has(scenario.id))throw new Error("Duplicate scenario: "+scenario.id);
        scenarioIndex.set(scenario.id,{category,subcategory,topic,scenario});
      }
    }
  }
}
const normalized=(value)=>String(value||"").normalize("NFKC").toLowerCase();
/** Literal image cues in the scenario title, not a diagnosis or user-profile inference. */
const TITLE_CUE_ALIASES=Object.freeze({
  spark:"fire",sparks:"fire",storm:"rain",lighthouse:"lantern",
  threshold:"gate",ladder:"stairs",harbor:"boat",
});
function literalScenarioMotifId(scenario,topicPool,arcPool){
  const words=new Set(normalized(scenario.label.en).match(/[a-z]+/g)||[]);
  const literal=MYTUBE_VISUAL_MOTIFS.filter(m=>m.visualTags.some(tag=>words.has(tag)))
    .map(m=>m.id);
  for(const [word,id] of Object.entries(TITLE_CUE_ALIASES))
    if(words.has(word)&&!literal.includes(id))literal.push(id);
  // A concrete image already in a curated topic/arc palette is the best
  // anchor. No arbitrary hash, global random seed or paid AI heuristic.
  literal.sort((a,b)=>
    ((topicPool.includes(b)?4:0)+(arcPool.includes(b)?2:0))-
    ((topicPool.includes(a)?4:0)+(arcPool.includes(a)?2:0))||
    a.localeCompare(b));
  return literal[0]||null;
}
/** Five distinct motifs per *individual* scenario, not 16 repeated templates.
 * 1 literal storyline anchor when present, 2–3 topic-specific images,
 * and 2 narrative-arc images. The original 256 IDs and all 1,024 plots stay fixed.
 */
function recommendedIds(scenarioId){
  const found=scenarioIndex.get(scenarioId);
  if(!found)return [];
  const arcPool=CURATED_POOLS[found.category.id]?.[found.scenario.archetype];
  const topicPool=topicPalettes.topics[found.topic.id];
  if(!arcPool||!Array.isArray(topicPool)||topicPool.length!==5)return [];
  const ids=[];
  const add=id=>{if(motifById.has(id)&&!ids.includes(id))ids.push(id);};
  add(literalScenarioMotifId(found.scenario,topicPool,arcPool));
  // Keep at least two story-specific topic symbols ahead of generic arc cues.
  for(const id of topicPool){if(ids.length>=3)break;add(id);}
  for(const id of arcPool){if(ids.length>=5)break;add(id);}
  for(const id of topicPool){if(ids.length>=5)break;add(id);}
  return ids.length===5?ids:[];
}

export function getMyTubeMotif(motifId){return motifById.get(motifId)||null;}
export function getMyTubeStyle(styleId){return styleById.get(styleId)||null;}
export function listMyTubeMotifs(locale="ru"){
  const lang=language(locale);
  return MYTUBE_VISUAL_MOTIFS.map(m=>({
    id:m.id,label:m.label[lang],meaning:m.meaning[lang],status:m.status,
  }));
}
export function listMyTubeStyles(locale="ru"){
  const lang=language(locale);
  return MYTUBE_VISUAL_STYLES.map(s=>({
    id:s.id,label:s.label[lang],description:s.description[lang],status:s.status,
  }));
}
export function listMyTubeScenarioMotifs(scenarioId,locale="ru"){
  const lang=language(locale);
  return recommendedIds(scenarioId).map((id,index)=>{
    const motif=motifById.get(id);
    return {id,label:motif.label[lang],meaning:motif.meaning[lang],
      recommended:index===0,rank:index+1,status:motif.status};
  });
}
/** Five relevant suggestions; the fourth/fifth story plots are not modified. */
export function getMyTubeCreativeChoices(scenarioId,locale="ru"){
  const record=scenarioIndex.get(scenarioId);
  if(!record)return null;
  return {scenarioId,topicId:record.topic.id,categoryId:record.category.id,
    motifs:listMyTubeScenarioMotifs(scenarioId,locale),
    styles:listMyTubeStyles(locale),
    plotChoicesUnaffected:true,
    sourceStatus:"editorial_not_bound_to_video"};
}
export function validateMyTubeCreativeSelection({topicId,scenarioId,motifId=null,styleId=null,meaningAxisId=null}={}){
  const found=scenarioIndex.get(scenarioId);
  if(!found||found.topic.id!==topicId)return {ok:false,status:"invalid_scenario"};
  if(motifId!==null&&!motifById.has(motifId))return {ok:false,status:"invalid_motif"};
  if(meaningAxisId!==null){
    const allowed=meaningMap.motifsByAxis[meaningAxisId];
    if(!allowed)return {ok:false,status:"invalid_meaning_axis"};
    if(!motifId||!allowed.includes(motifId))return {ok:false,status:"invalid_meaning_motif"};
  }
  if(styleId!==null&&!styleById.has(styleId))return {ok:false,status:"invalid_style"};
  return {ok:true,status:"valid_editorial_selection"};
}
const exactTags=(data)=>new Set(Array.isArray(data)?
  data.filter(tag=>typeof tag==="string").map(tag=>tag.trim().toLowerCase()):[]);
/**
 * Existing scene.motifs/tags are catalog metadata, not computer-vision proof.
 * Never treat matching "river" as verification of a literal "key" in frame.
 */
export function evaluateMyTubeSceneCreativeMatch(scene,{motifId=null,styleId=null}={}){
  const motif=motifById.get(motifId);
  const styleRow=styleById.get(styleId);
  const motifs=exactTags(scene?.motifs);
  const sceneTags=exactTags(scene?.tags);
  const certified=exactTags(scene?.visualMotifsVerified);
  const visualStyles=exactTags(scene?.visualStyles);
  const motifTags=motif?.visualTags??[];
  const exactMotif=Boolean(motif&&motifTags.some(tag=>certified.has(tag)));
  const motifMatch=Boolean(motif&&motifTags.some(tag=>motifs.has(tag)||sceneTags.has(tag)||certified.has(tag)));
  const explicitStyle=Boolean(styleRow&&visualStyles.has(styleRow.id));
  const allStyleTags=new Set([...motifs,...sceneTags,...exactTags(scene?.categories)]);
  if(scene?.media==="original_motion_mp4")allStyleTags.add("original_motion_mp4");
  const styleMatch=Boolean(explicitStyle||(styleRow&&styleRow.visualTags.some(tag=>allStyleTags.has(tag))));
  return {motifMatch,styleMatch,motifFrameVerified:exactMotif,
    styleEvidence:explicitStyle?"explicit_scene_style":styleMatch?"catalog_tags_only":"none",
    motifEvidence:exactMotif?"reviewed_visual_motif":motifMatch?"catalog_tags_only":"none"};
}
/** Additional visual matching only. Existing legal/source gates remain required. */
export function evaluateMyTubeMontageCreativeMatch({
  clipIds=[],scenes=[],motifId=null,styleId=null,
}={}){
  if(motifId!==null&&!motifById.has(motifId))return {ok:false,status:"invalid_motif",motifMatches:0,styleMatches:0};
  if(styleId!==null&&!styleById.has(styleId))return {ok:false,status:"invalid_style",motifMatches:0,styleMatches:0};
  if(!Array.isArray(clipIds)||clipIds.length!==4||new Set(clipIds).size!==4||!Array.isArray(scenes))
    return {ok:false,status:"invalid_montage",motifMatches:0,styleMatches:0};
  const index=new Map(scenes.map(scene=>[scene?.id,scene]));
  const chosen=clipIds.map(id=>index.get(id));
  if(chosen.some(scene=>!scene||scene.status!=="approved"))
    return {ok:false,status:"invalid_montage",motifMatches:0,styleMatches:0};
  const evidence=chosen.map(scene=>evaluateMyTubeSceneCreativeMatch(scene,{motifId,styleId}));
  const motifMatches=evidence.filter(row=>row.motifMatch).length;
  const styleMatches=evidence.filter(row=>row.styleMatch).length;
  return {ok:(!motifId||motifMatches>=1)&&(!styleId||styleMatches>=3),
    status:motifId&&motifMatches<1?"insufficient_motif_media":
      styleId&&styleMatches<3?"insufficient_style_media":"creative_tags_matched_not_frame_verified",
    motifMatches,styleMatches,
    literalMotifVerified:evidence.some(row=>row.motifFrameVerified),
    visualMatchOnly:true};
}
/**
 * Public MyTube feed: a label means something is actually annotated as visible,
 * not merely present in the video's subject or title.
 * This is discovery only; not an approval of source usage in render/export.
 */
export function videoMatchesMyTubeVisualFilter(video,{motifId=null,styleId=null}={}){
  if(motifId===null&&styleId===null)return true;
  if(motifId!==null&&!motifById.has(motifId))return false;
  if(styleId!==null&&!styleById.has(styleId))return false;
  if(video?.mytubeVisualTagEvidence!=="explicit_human_review")return false;
  if(motifId!==null&&(!Array.isArray(video.mytubeMotifIds)||!video.mytubeMotifIds.includes(motifId)))return false;
  if(styleId!==null&&(!Array.isArray(video.mytubeStyleIds)||!video.mytubeStyleIds.includes(styleId)))return false;
  return true;
}
export function auditMyTubeCreativeChoices(){
  const errors=[],ordered=new Set(),unordered=new Set(),seenTopics=new Set();
  for(const [scenarioId,record] of scenarioIndex){
    const topicId=record.topic.id;
    if(!seenTopics.has(topicId)){
      seenTopics.add(topicId);
      const palette=topicPalettes.topics[topicId];
      if(!Array.isArray(palette)||palette.length!==5||
         new Set(palette).size!==5||palette.some(id=>!motifById.has(id)))
        errors.push("invalid_topic_motif_palette:"+topicId);
    }
    const choices=recommendedIds(scenarioId);
    if(choices.length!==5||new Set(choices).size!==5)errors.push("scenario_motif_count:"+scenarioId);
    for(const id of choices)if(!motifById.has(id))errors.push("unknown_motif:"+scenarioId+":"+id);
    const key=choices.join("|"),setKey=[...choices].sort().join("|");
    if(ordered.has(key))errors.push("duplicated_scenario_motif_sequence:"+scenarioId);
    if(unordered.has(setKey))errors.push("duplicated_scenario_motif_set:"+scenarioId);
    ordered.add(key);unordered.add(setKey);
  }
  if(topicPalettes.topicCount!==64||seenTopics.size!==64||
     Object.keys(topicPalettes.topics).length!==64)
    errors.push("topic_palette_coverage_mismatch");
  for(const row of [...MYTUBE_VISUAL_MOTIFS,...MYTUBE_VISUAL_STYLES]){
    for(const locale of LANGUAGES){
      if(!row.label[locale]||!(row.meaning?.[locale]||row.description?.[locale]))
        errors.push("missing_locale:"+row.id+":"+locale);
    }
  }
  return {ok:errors.length===0,counts:{
    scenarios:scenarioIndex.size,motifs:motifById.size,styles:styleById.size,
    suggestions:scenarioIndex.size*5,
  },mappingDiversity:{ordered:ordered.size,unordered:unordered.size},errors};
}
