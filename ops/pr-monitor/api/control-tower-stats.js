'use strict';
// LIVE PR monitor: public data only, never holds GitHub credentials.
// Read the verified Watchdog dispatch receipt from its single public issue.
const ISSUE='https://api.github.com/repos/andylitvinov-design/books/issues/3128';
const MARKER='<!-- HH_CONTROL_TOWER_PUBLIC_KPI_V1 -->';
const SCHEMA='HH_CONTROL_DISPATCH_METRICS_V1';
let cached=null,cacheAt=0;
const valid=n=>Number.isSafeInteger(n)&&n>=0;
function count(n,fallback=0){return valid(n)?n:fallback;}
function normalize(source,now=Date.now()){
 if(!source||source.schema!==SCHEMA||source.source_dry_run!==false||
    source.source_schema!=='HH_CONTROL_DISPATCH_V1'||!valid(source.run_id)||
    !source.run_id||typeof source.checked_at!=='string')throw Error('UNVERIFIED_SOURCE');
 const checked=Date.parse(source.checked_at);
 if(!Number.isFinite(checked)||checked>now+60000)throw Error('UNVERIFIED_TIME');
 if(!source.counts||typeof source.counts!=='object')throw Error('MISSING_COUNTS');
 const c=source.counts,q=source.queue_states||{};
 if(!valid(c.candidates)||!valid(c.worker_dispatches)||!valid(c.unknown_owner_locks))
   throw Error('INVALID_COUNTS');
 const normalizedCounts={
   candidates:c.candidates,
   discovered_open_prs:count(c.discovered_open_prs,null),
   production_prs:count(c.production_prs,count(c.production_open_prs,null)),
   actionable_prs:count(c.actionable_prs,null),
   inspected:count(c.inspected,null),
   unknown_owner_locks:c.unknown_owner_locks,
   dispatch_requests_accepted:count(c.dispatch_requests_accepted,null),
   worker_dispatches:c.worker_dispatches
 };
 let blocked_reasons={},blocked_examples={};
 const hasReasons=!!source.blocked_reasons&&typeof source.blocked_reasons==='object'&&
   !Array.isArray(source.blocked_reasons);
 if(hasReasons){
   for(const [key,n] of Object.entries(source.blocked_reasons).slice(0,50)){
     if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(key)||!valid(n))continue;
     blocked_reasons[key]=n;
   }
   const examples=source.blocked_examples||{};
   for(const [reason,items] of Object.entries(examples)){
     if(!(reason in blocked_reasons)||!Array.isArray(items))continue;
     blocked_examples[reason]=items.slice(0,3).filter(x=>
       valid(x?.pr_number)&&x.pr_number>0&&
       /^[a-f0-9]{12}$/i.test(x?.head_sha||'')
     ).map(x=>({pr_number:x.pr_number,head_sha:x.head_sha}));
   }
 }
 const age=Math.max(0,Math.floor((now-checked)/60000));
 return {
   schema:SCHEMA,source_dry_run:false,source_schema:'HH_CONTROL_DISPATCH_V1',generated_at:new Date(now).toISOString(),
   checked_at:source.checked_at,run_id:source.run_id,
   run_url:'https://github.com/andylitvinov-design/books/actions/runs/'+source.run_id,
   source_issue:'https://github.com/andylitvinov-design/books/issues/3128',
   counts:normalizedCounts,queue_states:q,
   blocked_reasons,blocked_examples,
   blocked_reasons_complete:hasReasons,
   blocked_total:hasReasons?Object.values(blocked_reasons).reduce((a,b)=>a+b,0):null,
   source_event:typeof source.source_event==='string'?source.source_event:null,
   delivery_status:typeof source.delivery_status==='string'?source.delivery_status:null,
   reason:typeof source.reason==='string'?source.reason:null,
   age_minutes:age,freshness:age>20?'stale':age>10?'aging':'fresh'
 };
}
function parseBody(body){
 if(typeof body!=='string'||!body.startsWith(MARKER))throw Error('UNTRUSTED_FEED_MARKER');
 const match=body.match(/```json\s*([\s\S]*?)```/);
 if(!match)throw Error('MISSING_FEED_JSON');
 return JSON.parse(match[1]);
}
async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
 if(cached&&Date.now()-cacheAt<30000)return res.status(200).json(normalize(cached));
 try{
   const r=await fetch(ISSUE,{headers:{Accept:'application/vnd.github+json','User-Agent':'holistic-house-pr-monitor'},signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('GITHUB_UPSTREAM_'+r.status);
   const issue=await r.json();
   if(issue.state!=='open')throw Error('FEED_CLOSED');
   const src=parseBody(issue.body);
   const payload=normalize(src);
   cached=src;cacheAt=Date.now();
   return res.status(200).json(payload);
 }catch(error){
   // Fail visibly rather than converting missing proof to zero.
   if(cached){try{const payload=normalize(cached);return res.status(200).json({...payload,feed_error:'UPSTREAM_UNAVAILABLE'});}catch{}}
   return res.status(503).json({schema:SCHEMA,error:'FEED_UNAVAILABLE',blocked_reasons_complete:false});
 }
}
handler.normalize=normalize;
handler.parseBody=parseBody;
module.exports=handler;
