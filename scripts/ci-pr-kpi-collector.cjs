'use strict';
const {normalizeReceipts}=require('./ci-pr-kpi-receipts.cjs');
// Bounded, read-only collection. Two matching issue inventories reduce races;
// they are not an atomic GitHub snapshot and are labeled as such by callers.
async function collectReceiptEvents({github,owner,repo,since,maxRequests=80,minRemaining=100}){
 const result={events:[],complete:false,since,reads:0,remaining:null,reason:null,inventory:'NON_ATOMIC'};
 if(owner!=='andylitvinov-design'||repo!=='books'||!Number.isFinite(since)||
    !Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>200||
    !Number.isSafeInteger(minRemaining)||minRemaining<100){result.reason='INVALID_INPUT';return result;}
 let halted=false;
 const read=async fn=>{
  if(halted||result.reads>=maxRequests)throw Error('API_BUDGET');
  result.reads++;const res=await fn();
  const remaining=res?.headers?.['x-ratelimit-remaining'];
  if(remaining===undefined||remaining===null||!Number.isFinite(Number(remaining)))throw Error('RATE_RESERVE_UNVERIFIED');
  result.remaining=Number(remaining);if(result.remaining<minRemaining)halted=true;
  return res;
 };
 async function inventory(){
  const selected=new Map();
  for(let page=1;page<=30;page++){
   const r=await read(()=>github.rest.issues.listForRepo({owner,repo,state:'all',since:new Date(since).toISOString(),sort:'updated',direction:'desc',per_page:100,page}));
   if(!Array.isArray(r.data)||r.data.length>100)throw Error('INVENTORY_INCOMPLETE');
   for(const issue of r.data){
    const updated=Date.parse(issue?.updated_at||'');
    if(!Number.isFinite(updated))throw Error('INVENTORY_UNVERIFIED');
    if(updated<since)continue;
    if(!issue.pull_request)continue;
    if(!Number.isSafeInteger(issue.number)||issue.number<1||!Number.isSafeInteger(issue.comments)||issue.comments<0||selected.has(issue.number))
     throw Error('INVENTORY_AMBIGUOUS');
    selected.set(issue.number,{number:issue.number,updated_at:issue.updated_at,comments:issue.comments});
   }
   if(r.data.length<100)return selected;
  }
  throw Error('INVENTORY_PAGE_LIMIT');
 }
 try{
  const first=await inventory();
  for(const issue of first.values()){
   if(!issue.comments)continue;
   const comments=[];let ended=false;
   for(let page=1;page<=30;page++){
    const r=await read(()=>github.rest.issues.listComments({owner,repo,issue_number:issue.number,per_page:100,page}));
    if(!Array.isArray(r.data)||r.data.length>100)throw Error('COMMENTS_INCOMPLETE');
    comments.push(...r.data);
    if(r.data.length<100){ended=true;break;}
   }
   if(!ended||comments.length!==issue.comments)throw Error('COMMENTS_CHANGED_OR_INCOMPLETE');
   const normalized=normalizeReceipts(issue.number,comments);
   result.events.push(...normalized.events);
   if(!normalized.complete)throw Error('RECEIPT_UNVERIFIED');
  }
  const second=await inventory();
  const fingerprint=map=>JSON.stringify([...map.values()].sort((a,b)=>a.number-b.number));
  if(fingerprint(first)!==fingerprint(second))throw Error('INVENTORY_CHANGED');
  result.complete=true;result.reason='COMPLETE_NON_ATOMIC';
 }catch(error){result.reason=String(error?.message||error).slice(0,120);}
 return result;
}
module.exports={collectReceiptEvents};
