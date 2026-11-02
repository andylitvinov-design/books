'use strict';
const {PROD,REPO,validPR,laneOf}=require('./ci-pr-task-state.cjs');
async function collectBacklog({github,owner,repo,maxRequests=20,minRemaining=100}){
 const out={complete:false,counts:null,reason:null,reads:0,remaining:null,inventory:'NON_ATOMIC'};
 if(owner+'/'+repo!==REPO||!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>100||
    !Number.isSafeInteger(minRemaining)||minRemaining<100){out.reason='INVALID_INPUT';return out;}
 let halted=false;
 const read=async fn=>{
  if(halted||out.reads>=maxRequests)throw Error('API_BUDGET');
  out.reads++;const r=await fn();const left=r?.headers?.['x-ratelimit-remaining'];
  if(left===undefined||left===null||!Number.isFinite(Number(left)))throw Error('RATE_RESERVE_UNVERIFIED');
  out.remaining=Number(left);if(out.remaining<minRemaining)halted=true;return r;
 };
 async function inventory(){
  const all=new Map();
  for(let page=1;page<=30;page++){
   const r=await read(()=>github.rest.pulls.list({owner,repo,state:'open',per_page:100,page}));
   if(!Array.isArray(r.data)||r.data.length>100)throw Error('INVENTORY_INCOMPLETE');
   for(const pr of r.data){
    if(!Number.isSafeInteger(pr?.number)||pr.number<1||all.has(pr.number)||pr.state!=='open'||
       typeof pr.draft!=='boolean'||typeof pr.base?.ref!=='string'||typeof pr.head?.sha!=='string'||
       !Array.isArray(pr.labels)||pr.labels.some(x=>typeof x?.name!=='string'))throw Error('INVENTORY_AMBIGUOUS');
    all.set(pr.number,pr);
   }
   if(r.data.length<100)return all;
  }
  throw Error('INVENTORY_PAGE_LIMIT');
 }
 try{
  const first=await inventory(),second=await inventory();
  const fingerprint=map=>JSON.stringify([...map.values()].map(p=>({number:p.number,draft:p.draft,
    base:p.base.ref,head:p.head.sha,headRepo:p.head.repo?.full_name||null,author:p.user?.login||null,
    labels:p.labels.map(l=>l.name).sort()})).sort((a,b)=>a.number-b.number));
  if(fingerprint(first)!==fingerprint(second))throw Error('INVENTORY_CHANGED');
  const production=[...first.values()].filter(pr=>pr.base.ref===PROD);
  const has=(pr,label)=>pr.labels.some(x=>x.name===label);
  out.counts={open:production.length,draft:production.filter(pr=>pr.draft).length,
   source_queued:production.filter(pr=>has(pr,'hh:repair-needed')).length,
   conflict_queued:production.filter(pr=>has(pr,'hh:conflict-repair-needed')).length,
   ci_queued:production.filter(pr=>has(pr,'hh:ci-needed')).length,
   manual:production.filter(pr=>['hh:repair-manual','hh:hold','hh:blocked'].some(x=>has(pr,x))).length,
   candidates:production.filter(pr=>validPR(pr)&&laneOf(pr)).length,
   actionable:null};
  out.complete=true;out.reason='COMPLETE_NON_ATOMIC';
 }catch(error){out.reason=String(error?.message||error).slice(0,120);}
 return out;
}
module.exports={collectBacklog};
