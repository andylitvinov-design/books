/**
 * Holistic House Hourly Video Scout — deterministic public metadata acquisition.
 * No LLM, download, upload, account API, private text, arbitrary URLs or publication.
 * All candidate records are RESEARCH_ONLY; even CC0 claims require independent review.
 */
export const SCOUT_TASK_ID = 'video-scout-hourly';
export const SCOUT_CRON = '17 * * * *';
export const SCOUT_PROVIDER = 'wikimedia_commons';
export const SCOUT_MAX_CALLS = 2;
export const SCOUT_MAX_CANDIDATES = 20;
export const SCOUT_POLICY_VERSION = 'hh-video-scout-l0-v1';
const HOUR = 3_600_000;
const MINUTE = 60_000;
const COMMONS_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED_EXT = /\.(?:webm|ogv|mp4)$/i;
const ALLOWED_MIME = new Set(['video/webm', 'video/ogg', 'video/mp4']);
// Closed dictionary: neither an AI reply nor an external page can alter source queries.
const SEARCH_PHRASES = Object.freeze({
  'love-relationships': Object.freeze(['family walking', 'people embracing', 'couple walking']),
  'stress-anxiety': Object.freeze(['calm river', 'slow ocean waves', 'quiet forest']),
  'energy-confidence': Object.freeze(['sunrise landscape', 'mountain ascent', 'morning sunshine']),
  'goals-money': Object.freeze(['office teamwork', 'business meeting', 'city skyline']),
  // Crosswalk fallback when the related MyTube topic is not in the allowlist.
  nature: Object.freeze(['forest landscape', 'sunset clouds', 'waterfall nature']),
});
const safeString=(v,n=200)=>typeof v==='string'?v.trim().slice(0,n):'';
const intOrNull=(v,max=1_000_000_000)=>Number.isSafeInteger(v)&&v>0&&v<=max?v:null;
const htmlText=value=>safeString(value,400).replace(/<[^>]*>/g,' ')
  .replace(/&(amp|quot|lt|gt|nbsp|#39);/gi,(_,x)=>({amp:'&',quot:'"',lt:'<',gt:'>',nbsp:' ', '#39':"'"}[x.toLowerCase()]||' '))
  .replace(/\s+/g,' ').trim().slice(0,180);
const metaText=(metadata,key)=>htmlText(metadata?.[key]?.value);
/**
 * Commons full-text search frequently matches descriptions/categories that are
 * unrelated to visible footage. Keep clear mismatches out of the review queue.
 * Unknown footage is still NEVER approved for use; this checks titles only.
 * Only evidence-backed high-noise search terms get strict guards.
 */
export function plausibleResearchTitle(title,term){
  if(typeof title!=='string'||typeof term!=='string')return false;
  const text=title.toLowerCase().normalize('NFKC');
  if(term==='calm river'){
    if(/\b(?:hurricane|storm|flood|flooding|rapids?|tornado|tsunami|helicopters?|firefighters?|wildfire|dangerous|water transport|rescue)\b/i.test(text))return false;
    return /\b(?:river|rivers|riverside|riverbank|riverfront|stream|creek|canal|ganga|ganges|rishikesh|rivière|río|rio|fluss|riviera)\b/i.test(text);
  }
  if(term==='people embracing'){
    if(/\b(?:cats?|kittens?|dogs?|puppies|animals?|hugging face|huggingface|virtual event|bigscience|embrace your future|ai model)\b/i.test(text))return false;
    const action=/\b(?:hug|hugs|hugging|embrace|embracing|cuddle|cuddling|holding hands)\b/i;
    const people=/\b(?:people|persons?|friends?|family|families|couples?|partners?|parents?|children|men|women|girls?|boys?|lovers?|humans?)\b/i;
    return action.test(text)&&people.test(text);
  }
  return true;
}

export function latestScoutSlot(now=new Date()) {
  const ms=+new Date(now);
  if(!Number.isFinite(ms))throw Error('SCOUT_BAD_CLOCK');
  return new Date(Math.floor((ms-17*MINUTE)/HOUR)*HOUR+17*MINUTE).toISOString();
}
export function scoutSlotsThrough(now=new Date(),length=24) {
  if(!Number.isInteger(length)||length<1||length>168)throw Error('SCOUT_BAD_SLOT_COUNT');
  const last=Date.parse(latestScoutSlot(now));
  return Array.from({length},(_,i)=>new Date(last-i*HOUR).toISOString());
}

/** Reuse actual media-gap categories, never infer an English search from private prompts. */
export function chooseScoutSearches(coverage,slotUtc) {
  const slot=Date.parse(slotUtc);
  if(!Number.isFinite(slot))throw Error('SCOUT_BAD_SLOT');
  const gaps=coverage?.sourcingQueue;
  const categories=[...new Set((Array.isArray(gaps)?gaps:[])
    .filter(row=>row?.optionsShortOfFour>0 && Object.hasOwn(SEARCH_PHRASES,row.categoryId))
    .map(row=>row.categoryId))];
  if(!categories.length)categories.push('nature');
  const epoch=Math.floor(slot/HOUR);
  const chosen=[];
  for(let i=0;i<SCOUT_MAX_CALLS;i++){
    const category=categories[(epoch+i)%categories.length];
    const options=SEARCH_PHRASES[category];
    const term=options[(Math.floor(epoch/categories.length)+i)%options.length];
    if(!chosen.some(x=>x.term===term))chosen.push({category,term});
  }
  return chosen;
}

export function commonsSearchUrl(term) {
  const possible=Object.values(SEARCH_PHRASES).flat();
  if(!possible.includes(term))throw Error('SCOUT_UNAPPROVED_SEARCH');
  const u=new URL(COMMONS_ENDPOINT);
  for(const [k,v] of Object.entries({
    action:'query',generator:'search',gsrsearch:term+' filetype:video',
    gsrnamespace:'6',gsrlimit:'20',prop:'imageinfo',iiprop:'size|mime|sha1|extmetadata',
    format:'json',formatversion:'2',maxlag:'5',
    iiextmetadatafilter:'Artist|LicenseShortName|LicenseUrl',
  }))u.searchParams.set(k,v);
  return u.toString();
}

/** Maps exact Commons API metadata to unapproved evidence, not usable footage. */
export function normalizeCommonsPage(page,{category,term}) {
  if(!page||page.ns!==6||!intOrNull(page.pageid,2_000_000_000))return null;
  const title=safeString(page.title,220);
  if(!title.startsWith('File:')||!ALLOWED_EXT.test(title)||/[\r\n\u0000-\u001f]/.test(title))return null;
  const info=Array.isArray(page.imageinfo)?page.imageinfo[0]:null;
  if(!info||!ALLOWED_MIME.has(info.mime))return null;
  const cleanTitle=title.slice(5).replace(/ /g,'_');
  const link='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(cleanTitle).replace(/%2F/gi,'/');
  if(link.length>650)return null;
  const meta=info.extmetadata||{};
  const claimedLicenseUrl=safeString(meta.LicenseUrl?.value,450);
  let licenseUrl=null;
  try {const u=new URL(claimedLicenseUrl);
    if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
      ['creativecommons.org','commons.wikimedia.org'].includes(u.hostname))licenseUrl=u.href;
  }catch { /* untrusted metadata; claim stays unknown */ }
  return {
    provider:SCOUT_PROVIDER,sourceId:String(page.pageid),sourcePage:link,
    title:title.slice(5).replace(/_/g,' ').slice(0,180),
    creator:metaText(meta,'Artist'),licenseClaim:metaText(meta,'LicenseShortName'),
    licenseUrl,sourceQuery:term,category,
    mime:info.mime,sizeBytes:intOrNull(info.size,10_000_000_000),
    width:intOrNull(info.width,100_000),height:intOrNull(info.height,100_000),
    sha1Claim:/^[a-f0-9]{40}$/i.test(info.sha1||'')?info.sha1.toLowerCase():null,
    reviewState:'research_only',rightsState:'unverified',
  };
}

/** GET to a compile-time fixed upstream; redirects, HTML and big payloads fail closed. */
export async function searchCommons({term,category},fetcher=fetch) {
  const url=commonsSearchUrl(term);
  let response;
  try {
    response=await fetcher(url,{
      method:'GET',redirect:'error',cache:'no-store',
      headers:{Accept:'application/json','User-Agent':'HolisticHouse-VideoScout/1.0 (https://holistichouse.vercel.app)'},
      signal:AbortSignal.timeout(10_000),
    });
  } catch {return {status:'failed',code:'COMMONS_NETWORK_UNAVAILABLE',received:0,items:[]};}
  if(!response?.ok)return {
    status:response?.status===429?'quota_paused':'failed',
    code:response?.status===429?'COMMONS_RATE_LIMIT':'COMMONS_HTTP_ERROR',received:0,items:[],
  };
  const size=Number(response.headers?.get?.('content-length')||0);
  if(size>1_000_000)return {status:'failed',code:'COMMONS_PAYLOAD_TOO_LARGE',received:0,items:[]};
  let wire;
  try {const raw=await response.text();
    if(raw.length>1_000_000)throw Error('TOO_LARGE');
    wire=JSON.parse(raw);
  }catch{return {status:'failed',code:'COMMONS_INVALID_JSON',received:0,items:[]};}
  if(wire?.error||!wire?.query||typeof wire.query!=='object'||
    (wire.query.pages!==undefined&&!Array.isArray(wire.query.pages)))return {
    status:'failed',code:'COMMONS_SCHEMA_UNEXPECTED',received:0,items:[],
  };
  const pages=(wire.query.pages||[]).slice(0,20);
  const items=pages.map(page=>normalizeCommonsPage(page,{term,category}))
    .filter(item=>item&&plausibleResearchTitle(item.title,term));
  return {status:'ok',code:null,received:pages.length,items};
}

/** Pure IO-bound contract: commit is the ONLY place that may claim durable success. */
export async function performScoutCycle({slotUtc,coverage,fetcher=fetch,commit}) {
  if(typeof commit!=='function')throw Error('SCOUT_COMMIT_REQUIRED');
  const searches=chooseScoutSearches(coverage,slotUtc);
  const gathered=[],seen=new Set(),warnings=[];
  let sourceCalls=0,received=0,rejected=0,duplicateWithinBatch=0,quotaPaused=false;
  for(const search of searches){
    const found=await searchCommons(search,fetcher);
    sourceCalls++;received+=found.received;
    if(found.status!=='ok'){
      warnings.push(found.code);
      if(found.status==='quota_paused'){quotaPaused=true;break;}
      continue;
    }
    rejected+=found.received-found.items.length;
    for(const item of found.items){
      const id=item.provider+':'+item.sourceId;
      if(seen.has(id)){duplicateWithinBatch++;continue;}
      seen.add(id);gathered.push(item);
    }
  }
  const items=gathered.slice(0,SCOUT_MAX_CANDIDATES);
  const requestedStatus=quotaPaused?'quota_paused':
    warnings.length===searches.length?'failed':warnings.length?'partial':
    'ok';
  return commit({items,slotUtc,sourceCalls,received,rejected,
    duplicateWithinBatch,warnings,requestedStatus,queries:searches.map(x=>x.term)});
}
