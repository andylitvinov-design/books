'use strict';
// Public read-only 48h historical LIVE feed. One cached GET of the dedicated
// existing hourly single-writer issue, never one API call per PR.
const ROOT='https://api.github.com/repos/andylitvinov-design/books/issues/3440';
const MARKER='<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->',SCHEMA='HH_PR_JOURNEY_LIVE_FEED_V1';
const SHA=/^[0-9a-f]{40}$/i,DEP=/^dpl_[A-Za-z0-9]{8,64}$/;
const TTL=12*60*1000;let stored=null,pending=null;
const ms=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null;};
function parse(body,now=Date.now()){
 if(typeof body!=='string'||!body.startsWith(MARKER)||body.length>61000)
  throw Error('LIVE_FEED_MARKER_MISSING');
 let x;try{x=JSON.parse(body.slice(MARKER.length).trim());}
 catch{throw Error('LIVE_FEED_JSON_MISSING');}
 if(x?.schema!==SCHEMA||x.repo!=='andylitvinov-design/books'||
  x.production_base!=='codex/public-book-library'||
  !Number.isFinite(ms(x.generated_at))||ms(x.generated_at)>now+60000||
  !Array.isArray(x.rows)||x.rows.length>160||!x.coverage||
  !['COMPLETE_NON_ATOMIC_RECEIPTS','VERIFIED_OBSERVED_SAMPLE_NOT_ALL_PRS'].includes(x.coverage.label))
  throw Error('LIVE_FEED_SCHEMA_INVALID');
 const keys=new Set(),rows=[];
 for(const r of x.rows){
  const created=ms(r?.created_at),merged=ms(r?.merged_at),live=ms(r?.live_at);
  if(!Number.isSafeInteger(r?.pr)||r.pr<=0||!SHA.test(r?.merge_sha||'')||
   !DEP.test(r?.deployment_id||'')||created===null||merged===null||live===null||
   created>merged||merged>live||live>ms(x.generated_at)+60000)throw Error('LIVE_FEED_ROW_UNVERIFIED');
  const key=r.pr+':'+r.merge_sha.toLowerCase();
  if(keys.has(key))throw Error('LIVE_FEED_DUPLICATE');
  keys.add(key);rows.push({pr:r.pr,merge_sha:r.merge_sha.toLowerCase(),
   deployment_id:r.deployment_id,created_at:r.created_at,merged_at:r.merged_at,live_at:r.live_at});
 }
 return {schema:SCHEMA,generated_at:x.generated_at,coverage:x.coverage,rows,
  definition:x.definition||'Historically observed exact-Merge LIVE receipts only'};
}
async function load({request=fetch,now=Date.now(),token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||''}={}){
 const headers={Accept:'application/vnd.github+json','User-Agent':'hh-pr-journey-live-feed-read'};
 if(token)headers.Authorization='Bearer '+token;
 const r=await request(ROOT,{headers,signal:AbortSignal.timeout(9500)});
 if(!r.ok)throw Error('GITHUB_FEED_HTTP_'+r.status);
 const raw=await r.json();
 if(raw?.number!==3440||raw?.state!=='open'||raw?.pull_request)throw Error('GITHUB_FEED_ISSUE_UNVERIFIED');
 return parse(raw.body,now);
}
async function handler(req,res){
 res.setHeader('Cache-Control','public,max-age=60,s-maxage=600');
 if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 const now=Date.now();
 if(stored&&now-stored.at<TTL)return res.status(200).json({...stored.value,cache_hit:true});
 if(!pending)pending=load({now}).then(value=>(stored={value,at:Date.now()},value)).finally(()=>{pending=null;});
 try{return res.status(200).json({...await pending,cache_hit:false});}
 catch(e){
  if(stored)return res.status(200).json({...stored.value,stale:true,source_error:String(e.message||e).slice(0,100)});
  return res.status(503).json({schema:SCHEMA,available:false,
   coverage:{label:'NO_TRUSTED_FEED_DATA',no_receipt_meaning:'UNKNOWN_NOT_NO_DEPLOY'},
   error:String(e?.message||e).slice(0,100)});
 }
}
handler.parse=parse;handler.load=load;module.exports=handler;