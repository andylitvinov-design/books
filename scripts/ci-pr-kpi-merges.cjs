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
  const rows=new Map();
  for(let page=1;page<=30;page++){
   const r=await read(()=>github.rest.issues.listForRepo({owner,repo,state:'closed',since:new Date(since).toISOString(),per_page:100,page}));
   if(!Array.isArray(r.data)||r.data.length>100)throw Error('INVENTORY_INCOMPLETE');
   for(const issue of r.data){
    const updated=Date.parse(issue?.updated_at||'');
    if(!Number.isFinite(updated))throw Error('INVENTORY_UNVERIFIED');
    if(updated<since||!issue.pull_request)continue;
    if(!Number.isSafeInteger(issue.number)||issue.number<1||rows.has(issue.number)||issue.state!=='closed'||
       !Number.isFinite(Date.parse(issue.closed_at||'')))throw Error('PR_INVENTORY_UNVERIFIED');
    rows.set(issue.number,{number:issue.number,updated_at:issue.updated_at,closed_at:issue.closed_at});
   }
   if(r.data.length<100)return rows;
  }
  throw Error('INVENTORY_PAGE_LIMIT');
 }
 try{
  const first=await inventory();
  const rows=[...first.values()];
  for(let start=0;start<rows.length;start+=50){
   if(halted||result.reads>=maxRequests)throw Error('API_BUDGET');
   const batch=rows.slice(start,start+50);
   const fields=batch.map(row=>'p'+row.number+':pullRequest(number:'+row.number+') { number state closedAt mergedAt headRefOid baseRefName mergeCommit { oid } }').join('\n');
   const query='query($owner:String!,$name:String!){ rateLimit { remaining } repository(owner:$owner,name:$name){ '+fields+' } }';
   result.reads++;
   const data=await github.graphql(query,{owner,name:repo});
   const remaining=data?.rateLimit?.remaining;
   if(!Number.isSafeInteger(remaining))throw Error('GRAPHQL_RATE_RESERVE_UNVERIFIED');
   result.remaining=result.remaining===null?remaining:Math.min(result.remaining,remaining);
   if(remaining<minRemaining)halted=true;
   if(!data?.repository)throw Error('GRAPHQL_PR_INVENTORY_UNVERIFIED');
   for(const row of batch){
    const pr=data.repository['p'+row.number];
    if(pr?.number!==row.number||!['CLOSED','MERGED'].includes(pr.state)||!SHA.test(pr.headRefOid||'')||
       typeof pr.baseRefName!=='string'||!Number.isFinite(Date.parse(pr.closedAt||''))||
       Date.parse(pr.closedAt)!==Date.parse(row.closed_at))throw Error('PR_UNVERIFIED');
    if(pr.state==='MERGED'){
     if(!Number.isFinite(Date.parse(pr.mergedAt||''))||!SHA.test(pr.mergeCommit?.oid||''))throw Error('MERGE_UNVERIFIED');
     result.events.push({kind:'merged',at:pr.mergedAt,pr:pr.number,head:pr.headRefOid,mergeSha:pr.mergeCommit.oid,production:pr.baseRefName===PROD});
    }else{
     if(pr.mergedAt)throw Error('MERGE_UNVERIFIED');
     if(pr.baseRefName===PROD)result.events.push({kind:'closed_unmerged',at:pr.closedAt,pr:pr.number,head:pr.headRefOid});
    }
   }
  }
  const second=await inventory();
  const fingerprint=map=>JSON.stringify([...map.values()].sort((a,b)=>a.number-b.number));
  if(fingerprint(first)!==fingerprint(second))throw Error('INVENTORY_CHANGED');
  result.complete=true;result.reason='COMPLETE_NON_ATOMIC';
 }catch(error){result.reason=String(error?.message||error).slice(0,120);}
 return result;
}
module.exports={collectMergeEvents};
