/**
 * Candidate-only import / curation contracts.
 * Never writes directly into published tables and never sets approval flags.
 */
const ID=/^[A-Za-z0-9_-]{11}$/;
const ALLOWED_GOALS=new Set(["business","relationships","energy_health","personal_growth","stress","energy","work","meaning","practices"]);
const clean=(s,max=240)=>typeof s==="string"?s.trim().slice(0,max):"";
export function parseYouTubeVideoId(input){
  if(typeof input!=="string"||input.length>512)return null;
  let u;try{u=new URL(input)}catch{return null;}
  if(u.protocol!=="https:"||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase(),p=u.pathname;
  let id=null;
  if(host==="youtu.be"&&/^\/[a-zA-Z0-9_-]{11}\/?$/.test(p))id=p.slice(1,12);
  else if(["youtube.com","www.youtube.com","m.youtube.com","www.youtube-nocookie.com"].includes(host)){
    if(p==="/watch")id=u.searchParams.get("v");
    else {const m=/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(p);if(m)id=m[1];}
  }
  return ID.test(id||"")?id:null;
}
export function normalizeVideoCandidate({url,title,creator="",sourceUrl="",reason="",sourceKind="external"}={}){
  const id=parseYouTubeVideoId(url);
  if(!id||!["original","external"].includes(sourceKind))return {ok:false,error:"INVALID_VIDEO_SOURCE"};
  if(!sourceUrl||typeof sourceUrl!=="string"||!/^https:\/\//.test(sourceUrl)||sourceUrl.length>512)
    return {ok:false,error:"SOURCE_PROVENANCE_REQUIRED"};
  return {ok:true,candidate:{
    youtube_id:id,title:clean(title,140)||"Title needs review",creator:clean(creator,120),
    source_kind:sourceKind,source_url:"https://www.youtube.com/watch?v="+id,
    source_evidence_url:sourceUrl.slice(0,512),recommendation_reason:clean(reason,240),
    editorial_status:"candidate",embed_status:"unverified",
    rights_status:"pending_embed_check",metadata_confidence:"unknown",
    suggestions:[], // AI output and raw-source claims are never publication approvals.
  }};
}
export function parseAiVideoLabels(response){
  let data;try{if(typeof response!=="string"||response.length>8192)return null;data=JSON.parse(response)}catch{return null;}
  if(!data||Array.isArray(data)||typeof data!=="object")return null;
  if(Object.keys(data).some(k=>!["goals","summary","confidence","warnings"].includes(k)))return null;
  if(!Array.isArray(data.goals)||data.goals.length>10||
    data.goals.some(x=>!ALLOWED_GOALS.has(x)))return null;
  if(typeof data.summary!=="string"||data.summary.length>300)return null;
  if(!["low","medium","high"].includes(data.confidence))return null;
  if(!Array.isArray(data.warnings)||data.warnings.length>8||
    data.warnings.some(x=>typeof x!=="string"||x.length>90))return null;
  return {suggestedGoals:[...new Set(data.goals)],summary:data.summary,
    confidence:data.confidence,warnings:data.warnings,reviewRequired:true};
}
export function curationAudit(rows=[]){
  const counts={candidates:0,external:0,original:0,approvedEmbeds:0,linkOnly:0,duplicates:0,invalid:0};
  const seen=new Set();
  for(const row of rows){
    if(!row||!ID.test(row.youtube_id||"")){counts.invalid++;continue;}
    if(seen.has(row.youtube_id)){counts.duplicates++;continue;}
    seen.add(row.youtube_id);counts.candidates++;
    if(row.source_kind==="external")counts.external++;
    if(row.source_kind==="original")counts.original++;
    if(row.editorial_status==="approved" && row.embed_status==="confirmed" &&
      row.rights_status==="embed_approved" && Boolean(row.content_checked_at))counts.approvedEmbeds++;
    else if(row.discovery_status==="link_only")counts.linkOnly++;
  }
  return counts;
}
