'use strict';
const {createHash}=require('node:crypto');
const {normalizeReceipts}=require('./ci-pr-kpi-receipts.cjs');
const {parseComment}=require('./ci-pr-stage-receipts.cjs');
const STAGE_MARKER='<!-- HH_PR_STAGE_V1 ';

const LIVE_MARKER='<!-- HH_LIVE_VERIFIED_V1 sha=';
const LIVE_METHODS=new Set(['VERCEL_API_READY_AND_ALIAS',
 'PUBLIC_RUNTIME_EXACT_SHA_AND_DEPLOYMENT',
 'PUBLIC_RUNTIME_ALIAS_SHA_AND_DEPLOYMENT_ANCESTRY',
 'VERCEL_API_READY_AND_ALIAS_WITH_GITHUB_STATUS_ANCESTRY']);
const HASH=/^[a-f0-9]{40}$/i;
function parseLiveComment(c,number){
 if(!Number.isSafeInteger(number)||number<=0||
  c?.user?.id!==41898282||c?.user?.login!=='github-actions[bot]'||
  c?.user?.type!=='Bot'||c?.performed_via_github_app?.id!==15368||
  c?.performed_via_github_app?.slug!=='github-actions')return null;
 const body=String(c.body||''),posted=Date.parse(c.created_at||'');
 if(body.length>150000||!Number.isFinite(posted))return null;
 const matched=body.match(/^<!-- HH_LIVE_VERIFIED_V1 sha=([a-f0-9]{40}) deployment=(dpl_[A-Za-z0-9]{8,64}) -->\r?\nLIVE observed at ([0-9TZ:.-]+) for protected production merge commit ([a-f0-9]{40})\./i);
 if(!matched||matched[1].toLowerCase()!==matched[4].toLowerCase())return null;
 const at=Date.parse(matched[3]);
 if(!Number.isFinite(at)||at>posted+60000||posted-at>48*3600000)return null;
 const sha=matched[1].toLowerCase(),deployment=matched[2],methodMarker='Method: ';
 const method=body.slice(body.indexOf(methodMarker)+methodMarker.length).split('.')[0];
 if(!body.includes('https://holistichouse.vercel.app/en. Method: ')||
  !LIVE_METHODS.has(method)||
  !body.includes('- https://github.com/andylitvinov-design/books/commit/'+sha)||
  !body.includes('- https://vercel.com/super10/codex-public-book-library/'+deployment.slice(4))||
  !body.includes('- https://holistichouse.vercel.app/en')||
  (method.startsWith('PUBLIC_RUNTIME')&&!body.includes('- https://holistichouse.vercel.app/api/public/release-evidence')))
  return null;
 return {kind:'live_verified',at:new Date(at).toISOString(),pr:number,
  head:sha,head_kind:'merge_commit_anchor',mergeSha:sha,production:true,
  aliasVerified:true,smokeVerified:true,deployment_id:deployment,method,
  source:'authenticated_github_actions_live_receipt'};
}

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
   const fields=batch.map(n=>'p'+n+':pullRequest(number:'+n+') { number state mergedAt baseRefName mergeCommit { oid } }').join('\n');
   const query='query($owner:String!,$name:String!){ rateLimit { remaining } repository(owner:$owner,name:$name){ '+fields+' } }';
   result.reads++;const data=await github.graphql(query,{owner,name:repo});
   const left=data?.rateLimit?.remaining;
   if(!Number.isSafeInteger(left))throw Error('GRAPHQL_RATE_RESERVE_UNVERIFIED');
   result.remaining=result.remaining===null?left:Math.min(result.remaining,left);
   if(left<minRemaining)halted=true;
   if(!data?.repository)throw Error('GRAPHQL_PR_INVENTORY_UNVERIFIED');
   for(const n of batch){
    const pr=data.repository['p'+n];
    verified.set(n,pr?.number===n?pr:null);
   }
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
    if(collect&&(c.body.includes(MARKER)||c.body.includes(STAGE_MARKER)||c.body.includes(LIVE_MARKER))){
     const normalized=c.body.includes(MARKER)?normalizeReceipts(number,[c]):{events:[],complete:true};
     if(!normalized.complete)sound=false;
     // Stage receipts are authenticated by the same GitHub Actions bot/app
     // and already present in this inventory: no extra GitHub calls.
     const hasStage=c.body.includes(STAGE_MARKER);
     const verifiedStage=hasStage?parseComment(c,{number}):[];
     if(hasStage&&c.user?.id===41898282&&!verifiedStage.length)sound=false;
     const live=c.body.includes(LIVE_MARKER)?parseLiveComment(c,number):null;
     if(c.body.includes(LIVE_MARKER)&&c.user?.id===41898282&&!live)sound=false;
     const events=[...normalized.events,...verifiedStage.map(x=>({
      kind:'stage',stage:x.stage,at:x.at,pr:number,head:x.head_sha,
      task:x.task_key||null,newHead:x.new_sha||null,source:x.source
     })),...(live?[live]:[])];
     if(events.length)pending.push({number,events});
    }
   }
   if(collect&&pending.length){
    await verifyPRs(pending.map(x=>x.number));
    for(const item of pending){
      const pr=verified.get(item.number);
      if(!pr){sound=false;continue;}
      for(const e of item.events){
       if(e.kind!=='live_verified'){result.events.push(e);continue;}
       if(pr.state!=='MERGED'||pr.baseRefName!=='codex/public-book-library'||
        !HASH.test(pr.mergeCommit?.oid||'')||pr.mergeCommit.oid.toLowerCase()!==e.mergeSha||
        !Number.isFinite(Date.parse(pr.mergedAt||''))||
        Date.parse(e.at)<Date.parse(pr.mergedAt)){sound=false;continue;}
       result.events.push(e);
      }
     }
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
module.exports={collectReceiptEvents,parseLiveComment};
