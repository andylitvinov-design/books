/**
 * Holistic House video scene discovery v1.
 * Rank APPROVED metadata candidates from the existing catalogues. Searchable
 * hints are NOT verified claims about on-screen action, legal redistribution,
 * or permission to render. The existing licence and physical-aspect gates
 * are mandatory here and again at the final composer.
 *
 * No network, personal text persistence, remote AI, paid calls, or new media.
 */
import {deriveVideoSceneTags,sceneSupportsPhysicalAspect} from './video-source-tag-facets.mjs';
import {isSafeMontageScene} from './video-montage-sources.mjs';

const LOCALES=new Set(['ru','en','es']);
const ASPECTS=new Set(['portrait','landscape','square']);
const TYPES=new Set(['all','licensed','animation']);
const MAX_QUERY_LENGTH=500;
const MAX_RESULTS=100;

// Canonical visual concepts. Each alias is a RU/EN/ES word or word stem;
// every mapped slug must already exist in the catalog metadata to match.
const CONCEPTS=Object.freeze([
  ['sun',['солнц','солнеч','рассвет','лучи','sun','sunny','sunlit','sunrise','sunlight','sunset','sol','soleado','amanecer','atardecer'],['sun','sunburst','sunlight','sunrise','sunset','rays']],
  ['warm',['тепл','тёпл','warm','warmth','golden','calido','calida','cálido','cálida'],['warm','gold','golden','sunburst']],
  ['forest',['лес','леса','лесной','лесу','лесом','дерев','роща','хвой','forest','trees','woods','bosque','arbol','árbol'],['forest','tree','trees','fern']],
  ['water',['вода','воды','воде','водой','воду','влажн','water','agua'],['water','sea','ocean','river','lake','waterfall','waves','stream','coast','beach']],
  ['sea',['море','моря','морю','морск','океан','побереж','пляж','sea','ocean','coast','beach','mar','océano','oceano','playa'],['sea','ocean','coast','beach','waves']],
  ['river',['река','реки','рек','речк','ручей','ручь','river','stream','rio','río','arroyo'],['river','stream']],
  ['lake',['озеро','озер','lake','lago'],['lake']],
  ['waterfall',['водопад','каскад','waterfall','falls','cascada'],['waterfall']],
  ['mountain',['гора','горы','горн','вершин','mountain','mountains','summit','montana','montaña','cumbre'],['mountain','mountains','rock']],
  ['flowers',['цветок','цветы','цветущ','цветени','лепест','сад','луг','flowers','blossom','bloom','garden','flores','flor','jardin','jardín'],['flowers','bloom','garden','lotus','meadow']],
  ['night',['ноч','темн','dark','night','midnight','oscuro','noche'],['night','stars']],
  ['stars',['звезд','звёзд','космос','stars','cosmos','estrellas','estrella'],['stars','constellation']],
  ['snow',['снег','снеж','зима','snow','winter','nieve','invierno'],['snow','winter']],
  ['morning',['утр','рассвет','morning','dawn','mañana','amanecer'],['morning','sunrise','dew']],
  ['calm',['спокой','тишин','мягк','расслаб','отдых','calm','peaceful','quiet','gentle','tranquil','calma','sereno'],['calm','soft','softness','stillness','rest']],
  ['energy',['энерг','силы','энергия','бодр','energy','vitality','power','energia','energía','vitalidad'],['energy','vitality','energy-confidence','sunburst']],
  ['love',['любов','сердц','партнер','партнёр','love','heart','partner','amor','corazon','corazón','pareja'],['love','connection','love-relationships','heart-light']],
  ['confidence',['уверен','смел','confidence','courage','confianza','valentia','valentía'],['confidence','self-confidence','energy-confidence']],
  ['focus',['фокус','внимани','концентрац','focus','attention','concentrate','enfoque','atencion','atención'],['focus','clarity']],
  ['growth',['рост','развити','возможност','growth','opportunity','develop','crecer','crecimiento','desarrollo'],['growth','progress','opportunity','goals-money']],
  ['money',['деньг','доход','финанс','бизнес','денег','заработ','money','income','finance','dinero','ingresos','finanzas'],['money','abundance','goals-money','financial-security']],
  ['path',['путь','дорог','троп','дорога','path','road','journey','camino','sendero'],['path','road','horizon']],
  ['stress',['стресс','тревог','тревож','паник','напряжен','выгоран','stress','anxiety','worry','burnout','estrés','estres','ansiedad','agotamiento'],['stress-recovery','stress-relief','constant-anxiety','chronic-stress','social-anxiety','work-stress','burnout','panic-attacks']],
  ['sleep',['сон','засып','бессонниц','спать','sleep','insomnia','bedtime','sueño','sueno','dormir','insomnio'],['sleep-quality','fall-asleep','insomnia','night-waking','rest']],
  ['breath',['дыхан','дышат','дышу','breath','breathe','respir','respiración','respiracion'],['breath','breathing','water','air']],
  ['stability',['опор','стабиль','устойчив','безопасн','stability','steady','grounding','secure','estable','estabilidad','seguridad'],['stability','grounding','safety','financial-security','roots']],
  ['dragon',['дракон','dragon','dragón','dragon'],['dragon']],
  ['wolf',['волк','волч','wolf','lobo'],['wolf']],
  ['eagle',['орел','орёл','орла','eagle','águila','aguila'],['eagle']],
  ['abstract',['абстракт','анимац','abstract','animation','animacion','animación'],['abstract','motion']],
  ['light',['свет','светл','сияни','лучи','light','glow','luz','luminoso'],['light','rays','sparkle','sunlight']],
  ['sky',['неб','облак','sky','clouds','cloud','cielo','nubes'],['sky','clouds']],
  ['slow',['медлен','плавн','нетороп','slow','slowly','gentle movement','lentamente','despacio'],['slow']],
  ['fast',['быстр','динамич','rapid','fast','quickly','rápido','rapido'],['fast']],
  ['autumn',['осенн','осень','autumn','fall foliage','otoño','otono'],['autumn']],
  ['blue',['син','голуб','blue','azul'],['blue']],
  ['green',['зелён','зелен','green','verde'],['green']],
  ['red',['красн','алый','red','rojo'],['red']],
  ['cinematic',['реальн','кино','съем','съём','real footage','filmed','cinematic','filmado','cine'],['cinematic']],
]);

const normalize=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const tokenize=s=>normalize(s).split(' ').filter(Boolean);
const EXACT_ALIASES=new Set(['water','sea','river','lake','agua','mar','rio','lago','sol','light']);
const cleanTag=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,'-');
const unique=items=>[...new Set(items)];
const tagSet=arr=>new Set((Array.isArray(arr)?arr:[]).filter(x=>typeof x==='string')
 .map(cleanTag).filter(Boolean));
function includesAlias(words,alias){
 const parts=tokenize(alias);
 if(!parts.length)return false;
 if(parts.length===1){
   const term=parts[0];
   return term.length>=3&&words.some(word=>word===term||
     (term.length>=4&&!EXACT_ALIASES.has(term)&&word.startsWith(term)));
 }
 for(let i=0;i<=words.length-parts.length;i++)
   if(parts.every((part,j)=>words[i+j]===part||words[i+j].startsWith(part)))return true;
 return false;
}
function conceptsIn(text){
 const words=tokenize(text);
 return CONCEPTS.filter(([,aliases])=>aliases.some(alias=>includesAlias(words,alias)))
   .map(([id])=>id);
}
function negateSegments(query){
 // Negation applies only to its clause; never turn "без моря" into a sea request.
 const parts=normalize(query).replace(/\s+(?:а|но|but|pero|quiero|хочу|want)\s+/g,';');
 const negatives=[],positives=[];
 for(const fragment of parts.split(/[;,.!?]/)){
   const segment=fragment.trim();
   if(!segment)continue;
   const neg=/(?:^|\s)(без|никак\p{L}*|исключи\p{L}*|не\s+хочу|не\s+показывай|without|exclude|avoid|sin|no)\s+/gu;
   const matches=[...segment.matchAll(neg)];
   if(!matches.length){positives.push(segment);continue;}
   if(matches[0].index>0)positives.push(segment.slice(0,matches[0].index));
   for(let i=0;i<matches.length;i++){
     const start=matches[i].index+matches[i][0].length;
     const end=i+1<matches.length?matches[i+1].index:segment.length;
     negatives.push(segment.slice(start,end));
   }
 }
 return {include:unique(conceptsIn(positives.join(' '))),
         exclude:unique(conceptsIn(negatives.join(' ')))};
}
function expandedConceptTags(id){
 const found=CONCEPTS.find(([key])=>key===id);
 return found?found[2]:[id];
}
function hasConcept(tags,id){
 return expandedConceptTags(id).some(x=>tags.has(x));
}
function sourceAllowed(scene,type){
 return type==='all'||(type==='licensed'&&scene.media==='licensed_mp4')||
  (type==='animation'&&scene.media==='original_motion_mp4');
}

/** Public option state is metadata only; do not turn these results directly
 * into URLs or use them to bypass the final montage rights/safety check.
 */
export function parseVideoSearchIntent(query=''){
 if(typeof query!=='string'||query.length>MAX_QUERY_LENGTH)
   return {valid:false,reason:'invalid_query',include:[],exclude:[]};
 const {include,exclude}=negateSegments(query);
 // Explicit exclusions outrank a duplicated positive mention.
 return {valid:true,include:include.filter(x=>!exclude.includes(x)),exclude};
}

/**
 * @param {{scenes:readonly object[],query?:string,aspect?:string|null,
 *   sourceType?:'all'|'licensed'|'animation',pace?:string|null,
 *   includeTags?:string[],excludeTags?:string[],excludedMotifs?:string[],limit?:number,
 *   locale?:'ru'|'en'|'es',motifs?:readonly object[],styles?:readonly object[],
 *   topicsById?:Record<string,readonly object[]>}} options
 */
export function searchApprovedVideoScenes({scenes,query='',aspect=null,
 sourceType='all',pace=null,includeTags=[],excludeTags=[],excludedMotifs=[],limit=24,
 locale='ru',motifs=[],styles=[],topicsById={}}={}){
 if(!Array.isArray(scenes)||!TYPES.has(sourceType)||
    (aspect!==null&&!ASPECTS.has(aspect))||
    (pace!==null&&!['slow','moderate','fast'].includes(pace))||
    !Array.isArray(includeTags)||!Array.isArray(excludeTags)||
    !Array.isArray(excludedMotifs)||excludedMotifs.some(x=>!['water','forest','dark'].includes(x))||
    !Number.isInteger(limit)||limit<1||limit>MAX_RESULTS)
   return {status:'invalid_filters',total:0,items:[]};
 const intent=parseVideoSearchIntent(query);
 if(!intent.valid)return {status:'invalid_query',total:0,items:[]};
 // A meaningful but unsupported request must never silently become the whole
 // catalogue. This is especially important for subjects with no real footage.
 if(query.trim()&&!intent.include.length&&!intent.exclude.length&&
    !includeTags.length&&!excludeTags.length)
   return {status:'unrecognized_query',total:0,items:[],
     matchedIntentTags:[],excludedIntentTags:[],metadataOnly:true};
 const language=LOCALES.has(locale)?locale:'ru';
 const included=unique([...intent.include,...includeTags.map(cleanTag)]);
 const excluded=unique([...intent.exclude,...excludeTags.map(cleanTag)]);
 const skip=new Set(excluded);
 const goals=included.filter(tag=>!skip.has(tag));
 const rows=[],seen=new Set();
 for(const scene of scenes){
   if(!scene||seen.has(scene.id)||!isSafeMontageScene(scene,excludedMotifs)||
      !sceneSupportsPhysicalAspect(scene,aspect)||!sourceAllowed(scene,sourceType)||
      (pace&&scene.pace!==pace))continue;
   seen.add(scene.id);
   const facets=deriveVideoSceneTags(scene,{motifs,styles,topics:topicsById[scene.id]||[]});
   if(!facets)continue;
   const literal=tagSet([...facets.subjectTags,...facets.literalMotifTags]);
   const allTags=tagSet(facets.searchableTags);
   for(const name of [...facets.motifCandidates,...facets.styleCandidates])allTags.add(name);
   if(excluded.some(tag=>hasConcept(allTags,tag)))continue;
   const matched=goals.filter(tag=>hasConcept(allTags,tag));
   // An explicit goal must match at least one source-backed tag.
   if(goals.length&&!matched.length)continue;
   const exact=matched.filter(tag=>hasConcept(literal,tag));
   const score=matched.length*12+exact.length*5+
     (matched.length===goals.length&&goals.length>0?10:0)+
     (scene.media==='licensed_mp4'?1:0);
   rows.push({id:scene.id,sceneId:scene.id,sourceType:scene.media,
      label:scene.label?.[language]||scene.label?.en||scene.id,
      video:scene.video,poster:scene.poster||null,
      aspect:facets.physicalAspect,pace:facets.paceTag,
      tags:facets.searchableTags,
      topicTags:facets.topicTags,matchedTags:matched,
      missingTags:goals.filter(tag=>!matched.includes(tag)),
      score,evidence:'catalog_metadata_not_independently_frame_verified',
      requiresFinalComposerValidation:true});
 }
 rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return {status:rows.length?'ok':goals.length?'no_matching_tags':'empty_catalog',
   total:rows.length,matchedIntentTags:goals,excludedIntentTags:excluded,
   partialMatches:rows.some(r=>r.missingTags.length>0),
   items:rows.slice(0,limit),metadataOnly:true};
}

/** Short display labels only; search and composer always use canonical IDs. */
const DISPLAY_TAG_LABELS=Object.freeze({
 sun:['Солнце','Sun','Sol'],sunlight:['Солнечный свет','Sunlight','Luz solar'],
 warm:['Тёплый свет','Warm','Cálido'],gold:['Золотистый','Golden','Dorado'],
 forest:['Лес','Forest','Bosque'],trees:['Деревья','Trees','Árboles'],
 ocean:['Океан','Ocean','Océano'],sea:['Море','Sea','Mar'],
 water:['Вода','Water','Agua'],river:['Река','River','Río'],
 mountain:['Горы','Mountains','Montañas'],flowers:['Цветы','Flowers','Flores'],
 nature:['Природа','Nature','Naturaleza'],calm:['Спокойствие','Calm','Calma'],
 hope:['Надежда','Hope','Esperanza'],growth:['Рост','Growth','Crecimiento'],
 light:['Свет','Light','Luz'],sky:['Небо','Sky','Cielo'],
 snow:['Снег','Snow','Nieve'],winter:['Зима','Winter','Invierno'],
 autumn:['Осень','Autumn','Otoño'],sunrise:['Рассвет','Sunrise','Amanecer'],
 sunset:['Закат','Sunset','Atardecer'],
 slow:['Медленно','Slow','Lento'],fast:['Быстро','Fast','Rápido'],
 autumn:['Осень','Autumn','Otoño'],blue:['Синий','Blue','Azul'],green:['Зелёный','Green','Verde'],
 stars:['Звёзды','Stars','Estrellas'],focus:['Фокус','Focus','Enfoque'],
 confidence:['Уверенность','Confidence','Confianza'],
 rest:['Отдых','Rest','Descanso'],abstract:['Абстракция','Abstract','Abstracto'],
 motion:['Анимация','Animation','Animación'],
});
export function videoSceneTagLabel(tag,locale='ru'){
 const id=cleanTag(tag);
 const values=DISPLAY_TAG_LABELS[id];
 const i=locale==='en'?1:locale==='es'?2:0;
 return values?.[i]||id.replace(/[-_]+/g,' ');
}
