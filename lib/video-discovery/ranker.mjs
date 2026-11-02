/**
 * Public-only editorial video discovery for Holistic House.
 * No profile, health data, cookies, provider API or AI calls.
 * Keep video IDs as the sole optional persisted preference.
 */
export const VIDEO_GOALS = Object.freeze(["all","stress","energy","relationships","work","meaning","practices"]);
const topicRules=[
  ["stress",/стресс|тревож|расслаб|спокой|безопасн|заземлен|защит|anxiety|calm|stress|relax|grounding|calma|ansiedad|estr[eé]s/iu],
  ["energy",/энерг|рейки|сил[аыу]|кундалини|чакр|подкач|reiki|kundalini|energy|vitality|energ[ií]a/iu],
  ["relationships",/отношен|любов|деметр|дионис|тантр|близост|relationship|love|intimacy|tantra|relaci[oó]n|amor/iu],
  ["work",/работ|бизнес|деньг|карьер|успех|business|work|career|money|success|negocio|trabajo/iu],
  ["meaning",/смысл|осирис|мистер|архетип|солнц|майя|самопознан|meaning|purpose|archetype|osiris|sun flight|misterio|sentido/iu],
  ["practices",/практик|урок|курс|обучен|медитац|practice|course|lesson|meditation|learn|tutorial|pr[aá]ctica|curso|meditaci[oó]n/iu],
];
const safeId=value=>typeof value==="string" && value.length>0 && value.length<=180;
const publicKey=video=>safeId(video?.youtubeId)?video.youtubeId:video?.id;
export function getVideoTopics(video){
  const explicit=Array.isArray(video?.topicTags)?video.topicTags.filter(tag=>VIDEO_GOALS.includes(tag)&&tag!=="all"):[];
  if(explicit.length)return [...new Set(explicit)];
  const haystack=[video?.title,video?.description,video?.seriesTitle]
    .filter(x=>typeof x==="string").join(" ").slice(0,900);
  const tags=topicRules.filter(([,regex])=>regex.test(haystack)).map(([tag])=>tag);
  return tags.length?tags:["practices"];
}
export function rankDiscoveryVideos(items,options={}){
  const {goal="all",language="all",savedIds=[],hiddenIds=[],savedOnly=false,sort="for-you"}=options;
  const saved=new Set(savedIds.filter(safeId).slice(0,200));
  const hidden=new Set(hiddenIds.filter(safeId).slice(0,200));
  const seen=new Set();
  const choices=[];
  for(const item of items){
    if(!item||item.kind!=="video")continue;
    const id=publicKey(item);
    if(!safeId(id)||seen.has(id)||hidden.has(id))continue;
    seen.add(id);
    if(savedOnly&&!saved.has(id))continue;
    if(language!=="all" && item.audioLanguage!==language)continue;
    const topics=getVideoTopics(item);
    if(goal!=="all" && !topics.includes(goal))continue;
    choices.push({item,id,topics,index:choices.length});
  }
  if(sort==="series")return choices.map(({item})=>item);
  if(sort==="newest")return choices.sort((a,b)=>
    (Date.parse(b.item.publishedAt||"")||0)-(Date.parse(a.item.publishedAt||"")||0) || a.index-b.index
  ).map(({item})=>item);
  const interest=new Map();
  for(const entry of choices)if(saved.has(entry.id)){
    for(const topic of entry.topics)interest.set(topic,(interest.get(topic)||0)+1);
  }
  const ranked=choices.map(entry=>({
    ...entry,
    score:(entry.item.curation==="verified"?5:0)
      +(saved.has(entry.id)?2:0)
      +entry.topics.reduce((sum,tag)=>sum+2*Math.min(3,interest.get(tag)||0),0),
  })).sort((a,b)=>b.score-a.score||a.index-b.index);
  // Promote source diversity in the first screen, without dropping any items.
  const first=[],deferred=[],bySource=new Map();
  for(const item of ranked){
    const group=item.item.seriesId||item.item.sourceGroup||item.id;
    const count=bySource.get(group)||0;
    if(first.length<8&&count>=2){deferred.push(item);continue;}
    first.push(item);bySource.set(group,count+1);
  }
  return [...first,...deferred].map(({item})=>item);
}
