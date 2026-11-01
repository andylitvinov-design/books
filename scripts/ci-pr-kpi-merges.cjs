'use strict';
const {PROD,REPO}=require('./ci-pr-task-state.cjs');
const SHA=/^[a-f0-9]{40}$/i;
async function collectMergeEvents({github,owner,repo,since,maxRequests=40,minRemaining=100}){
 const result={events:[],complete:false,since,reads:0,remaining:null,reason:null,inventory:'NON_ATOMIC'};
 if(owner+'/'+repo!==REPO||!Number.isFinite(since)||!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>100||
    !Number.isSafeInteger(minRemaining)||minRemaining<100){result.reason='INVALID_INPUT';return result;}
 let halted=false;
 const read=async fn=>{
  if(halted||result.reads>=maxRequests)throw Error('API_BUDGET');
  result.reads++;const r=await fn();const left=r?.headers?.['x-ratelimit-remaining'];
  if(left===undefined||left===null||!Number.isFinite(Number(left)))throw Error('RATE_RESERVE_UNVERIFIED');
  result.remaining=Number(left);if(result.remaining<minRemaining)halted=true;return r;
 };
 async function inventory(){
  const rows=new Map();let prior=Infinity;
  for(let page=1;page<=30;page++){
   const r=await read(()=>github.rest.pulls.list({owner,repo,state:'closed',sort:'updated',direction:'desc',per_page:100,page}));
   if(!Array.isArray(r.data)||r.data.length>100)throw Error('INVENTORY_INCOMPLETE');
   let older=false;
   for(const pr of r.data){
    const updated=Date.parse(pr?.updated_at||'');
    if(!Number.isFinite(updated)||updated>prior)throw Error('INVENTORY_UNORDERED');
    prior=updated;if(updated<since){older=true;continue;}
    if(!Number.isSafeInteger(pr.number)||pr.number<1||rows.has(pr.number)||pr.state!=='closed'||
       !SHA.test(pr.head?.sha||'')||typeof pr.base?.ref!=='string'||!Number.isFinite(Date.parse(pr.closed_at||'')))throw Error('PR_UNVERIFIED');
    if(pr.merged_at!==null&&pr.merged_at!==undefined&&
       (!Number.isFinite(Date.parse(pr.merged_at))||!SHA.test(pr.merge_commit_sha||'')))throw Error('MERGE_UNVERIFIED');
    rows.set(pr.number,{number:pr.number,updated_at:pr.updated_at,closed_at:pr.closed_at,
      merged_at:pr.merged_at||null,merge_sha:pr.merge_commit_sha||null,head:pr.head.sha,base:pr.base.ref});
   }
   if(older||r.data.length<100)return rows;
  }
  throw Error('INVENTORY_PAGE_LIMIT');
 }
 try{
  const first=await inventory(),second=await inventory();
  const fingerprint=map=>JSON.stringify([...map.values()].sort((a,b)=>a.number-b.number));
  if(fingerprint(first)!==fingerprint(second))throw Error('INVENTORY_CHANGED');
  for(const r of first.values()){
   if(r.merged_at)result.events.push({kind:'merged',at:r.merged_at,pr:r.number,head:r.head,mergeSha:r.merge_sha,production:r.base===PROD});
   else if(r.base===PROD)result.events.push({kind:'closed_unmerged',at:r.closed_at,pr:r.number,head:r.head});
  }
  result.complete=true;result.reason='COMPLETE_NON_ATOMIC';
 }catch(error){result.reason=String(error?.message||error).slice(0,120);}
 return result;
}
module.exports={collectMergeEvents};
