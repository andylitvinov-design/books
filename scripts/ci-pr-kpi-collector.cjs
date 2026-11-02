'use strict';
const {createHash}=require('node:crypto');
const {normalizeReceipts}=require('./ci-pr-kpi-receipts.cjs');
const {MARKER}=require('./ci-pr-task-state.cjs');
// Repository comment inventory avoids one read per PR while retaining the
// Actions bot/app provenance check and independently verifying PR identity.
async function collectReceiptEvents({github,owner,repo,since,until=Date.now(),maxRequests=80,minRemaining=100}){
 const result={events:[],complete:false,since,reads:0,remaining:null,reason:null,inventory:'NON_ATOMIC'};
 if(owner!=='andylitvinov-design'||repo!=='books'||!Number.isFinite(since)||!Number.isFinite(until)||since>=until||
    !Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>200||
    !Number.isSafeInteger(minRemaining)||minRemaining<100){result.reason='INVALID_INPUT';return result;}
 let halted=false,sound=true;
 const read=async fn=>{
  if(halted||result.reads>=maxRequests)throw Error('API_BUDGET');
  result.reads++;const res=await fn();const left=res?.headers?.['x-ratelimit-remaining'];
  if(left===undefined||left===null||!Number.isFinite(Number(left)))throw Error('RATE_RESERVE_UNVERIFIED');
  result.remaining=Number(left);if(result.remaining<minRemaining)halted=true;return res;
 };
 const verified=new Map();
 async function verifyPRs(numbers){
  const pending=[...new Set(numbers)].filter(n=>!verified.has(n));
  for(let start=0;start<pending.length;start+=50){
   if(halted||result.reads>=maxRequests)throw Error('API_BUDGET');
   const batch=pending.slice(start,start+50);
   const fields=batch.map(n=>'p'+n+':pullRequest(number:'+n+') { number }').join('\n');
   const query='query($owner:String!,$name:String!){ rateLimit { remaining } repository(owner:$owner,name:$name){ '+fields+' } }';
   result.reads++;const data=await github.graphql(query,{owner,name:repo});
   const left=data?.rateLimit?.remaining;
   if(!Number.isSafeInteger(left))throw Error('GRAPHQL_RATE_RESERVE_UNVERIFIED');
   result.remaining=result.remaining===null?left:Math.min(result.remaining,left);
   if(left<minRemaining)halted=true;
   if(!data?.repository)throw Error('GRAPHQL_PR_INVENTORY_UNVERIFIED');
   for(const n of batch)verified.set(n,data.repository['p'+n]?.number===n);
  }
 }
 async function inventory(collect){
  const rows=new Map();
  for(let page=1;page<=60;page++){
   const res=await read(()=>github.rest.issues.listCommentsForRepo({owner,repo,since:new Date(since).toISOString(),sort:'updated',direction:'desc',per_page:100,page}));
   if(!Array.isArray(res.data)||res.data.length>100)throw Error('COMMENTS_INCOMPLETE');
   const pending=[];
   for(const c of res.data){
    const match=typeof c?.issue_url==='string'?c.issue_url.match(/^https:\/\/api\.github\.com\/repos\/andylitvinov-design\/books\/issues\/(\d+)$/):null;
    if(!Number.isSafeInteger(c?.id)||c.id<1||rows.has(c.id)||!match||!Number.isFinite(Date.parse(c.updated_at||''))||
       typeof c.body!=='string')throw Error('COMMENTS_UNVERIFIED');
    const number=Number(match[1]);if(!Number.isSafeInteger(number)||number<1)throw Error('COMMENTS_UNVERIFIED');
    const created=Date.parse(c.created_at||''),updated=Date.parse(c.updated_at||'');
    if(!Number.isFinite(created)||created>updated)throw Error('COMMENTS_UNVERIFIED');
    if(created>until)continue;
    if(updated>until)throw Error('COMMENT_CHANGED_AFTER_CUTOFF');
    const fingerprint=createHash('sha256').update(JSON.stringify([c.id,c.updated_at,c.issue_url,c.body,c.user?.id,c.user?.login,c.user?.type,c.performed_via_github_app?.id,c.performed_via_github_app?.slug])).digest('hex');
    rows.set(c.id,fingerprint);
    if(collect&&c.body.includes(MARKER)){
     const normalized=normalizeReceipts(number,[c]);if(!normalized.complete)sound=false;
     if(normalized.events.length)pending.push({number,events:normalized.events});
    }
   }
   if(collect&&pending.length){
    await verifyPRs(pending.map(x=>x.number));
    for(const item of pending){if(verified.get(item.number))result.events.push(...item.events);else sound=false;}
   }
   if(res.data.length<100)return rows;
  }
  throw Error('COMMENTS_PAGE_LIMIT');
 }
 try{
  const first=await inventory(true),second=await inventory(false);
  const fingerprint=map=>JSON.stringify([...map.entries()].sort((a,b)=>a[0]-b[0]));
  if(fingerprint(first)!==fingerprint(second))throw Error('COMMENTS_CHANGED');
  result.complete=sound;result.reason=sound?'COMPLETE_NON_ATOMIC':'RECEIPT_UNVERIFIED';
 }catch(error){result.reason=String(error?.message||error).slice(0,120);}
 return result;
}
module.exports={collectReceiptEvents};
