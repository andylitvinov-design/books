'use strict';
/* Owner-only proof dashboard over PUBLIC GitHub receipts. GET only.
 * No DB, model, workflow dispatch, source writer or skill promotion.
 */
const crypto=require('node:crypto');
const M=require('../commander-learning-model.cjs');
const API='https://api.github.com/repos/'+M.REPO;
const COOKIE='hh_seo_owner';
let cache=null,until=0;
function send(res,status,body){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 return res.end(JSON.stringify(body));
}
function owner(req){
 const secret=process.env.SEO_SESSION_SECRET||'';
 const c=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!secret||!c)return false;
 const parts=c.slice(COOKIE.length+1).split('.');
 if(parts.length!==3||parts[0]!=='v1'||!/^\d{10}$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
 const ts=Number(parts[1]);
 if(!Number.isSafeInteger(ts)||ts<=Date.now()/1000)return false;
 const got=crypto.createHmac('sha256',secret).update('v1.'+parts[1]).digest('hex');
 return crypto.timingSafeEqual(Buffer.from(got),Buffer.from(parts[2]));
}
async function get(path){
 const r=await fetch(API+path,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500),
  headers:{Accept:'application/vnd.github+json','User-Agent':'HH-Commander-Learning-ReadOnly'}});
 if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);
 const data=await r.text();if(data.length>900000)throw Error('GITHUB_RESPONSE_TOO_LARGE');
 return JSON.parse(data);
}
async function snapshot(){
 if(cache&&Date.now()<until)return {...cache,cached:true};
 // Up to 200 latest public GitHub issue comments; no expensive full PR sweep.
 const comments=[];
 for(let page=1;page<=2;page++){
  const part=await get('/issues/comments?sort=created&direction=desc&per_page=100&page='+page);
  if(!Array.isArray(part)||part.length>100)throw Error('GITHUB_COMMENTS_INVALID');
  comments.push(...part);
  if(part.length<100)break;
 }
 const raw=M.gather(comments).slice(0,5);
 const cases=await Promise.all(raw.map(async c=>{
  const result={...c};
  try{
   const commit=await get('/commits/'+c.published_head);
   if(M.parentProof(c,commit))result.source_proof='VERIFIED_COMMIT_PARENT';
  }catch{result.source_proof='UNVERIFIED_GITHUB_UNAVAILABLE'}
  if(result.source_proof==='VERIFIED_COMMIT_PARENT')try{
   const checks=await get('/commits/'+c.published_head+'/check-runs?per_page=100');
   if(M.ciProof(c,checks))result.ci_proof='EXACT_HEAD_CI_VERIFIED';
  }catch{result.ci_proof='UNVERIFIED_GITHUB_UNAVAILABLE'}
  return result;
 }));
 const suggestions=M.candidateLessons(cases);
 const response={schema:'HH_COMMANDER_LEARNING_V1',observed_at:new Date().toISOString(),
  source:'SIGNED_GITHUB_ACTIONS_PR_RECEIPTS',scanned_comments:comments.length,
  cases,candidates:suggestions,curator_actions:M.curator(cases),
  metrics:{source_verified:cases.filter(c=>c.source_proof==='VERIFIED_COMMIT_PARENT').length,
   ci_verified:cases.filter(c=>c.ci_proof==='EXACT_HEAD_CI_VERIFIED').length,
   candidates:suggestions.length},
  limitations:['Recent public GitHub receipts only; this is not an exhaustive history.',
   'CI does not prove merge, deployment or functional LIVE.',
   'Candidates are suggestions; no automatic skill update or execution.'],
  can_auto_promote:false,can_execute:false};
 cache=response;until=Date.now()+120000;
 return response;
}
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'METHOD_NOT_ALLOWED'})}
 if(!owner(req))return send(res,401,{error:'OWNER_SESSION_REQUIRED'});
 try{return send(res,200,await snapshot())}
 catch(e){return send(res,503,{error:'LEARNING_SOURCE_UNAVAILABLE',reason:String(e.message).slice(0,80)})}
};
module.exports._test={owner,snapshot};
