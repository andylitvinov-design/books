'use strict';
// Zero-cron, read-only monitor. Source is a verified GitHub Actions issue archive.
const ISSUE=3419,BASE='codex/public-book-library';
const HOST='https://api.github.com/repos/andylitvinov-design/books';
const PREFIX='<!-- HH_CORE_CI_JOURNEY_SHARD_V1:';
const SCHEMA='HH_CORE_CI_JOURNEY_SHARD_V1';
const HOURS=[1,6,24,72],SHA=/^[a-f0-9]{40}$/i;
const t=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null;};
const rnd=x=>Math.round(x*100)/100;
const quant=(arr,p)=>{if(!arr.length)return null;const a=[...arr].sort((x,y)=>x-y);
 const x=(a.length-1)*p,lo=Math.floor(x),hi=Math.ceil(x);
 return a[lo]+(a[hi]-a[lo])*(x-lo);};
const safeRun=x=>typeof x==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(x)?x:null;
const msurl=id=>'https://github.com/andylitvinov-design/books/actions/runs/'+id;
let cache=null,last=0,pending=null;
function parse(comment){
 // One-time historical, explicitly partial readback. Owner-authored, never
 // treated as an Actions bot receipt or as a complete archive.
 const imported=comment?.user?.login==='andylitvinov-design'&&
   typeof comment.body==='string'&&
   comment.body.startsWith('<!-- HH_CORE_CI_JOURNEY_IMPORT_V1 -->\n');
 if(imported){
   let old;try{old=JSON.parse(comment.body.slice('<!-- HH_CORE_CI_JOURNEY_IMPORT_V1 -->\n'.length));}
   catch{return [];}
   if(old?.schema!=='HH_CORE_CI_JOURNEY_IMPORT_V1'||!Array.isArray(old.runs)||
      old.runs.length>25)return [];
   const bucket='2026-11-04T14-success';
   const fake={user:{login:'github-actions[bot]'},
     body:PREFIX+bucket+' -->\n'+JSON.stringify({schema:SCHEMA,bucket,runs:old.runs})};
   return parse(fake).map(r=>({...r,partial_jobs:true,source:'VERIFIED_PARTIAL_HISTORICAL_IMPORT'}));
 }
 if(comment?.user?.login!=='github-actions[bot]'||typeof comment?.body!=='string'||
   !comment.body.startsWith(PREFIX)||comment.body.length>60000)return [];
 const i=comment.body.indexOf(' -->\n');
 if(i<0)return [];
 const bucket=comment.body.slice(PREFIX.length,i);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}-(success|failure)$/.test(bucket))return [];
 let data;try{data=JSON.parse(comment.body.slice(i+5));}catch{return [];}
 if(data?.schema!==SCHEMA||data.bucket!==bucket||!Array.isArray(data.runs)||data.runs.length>160)return [];
 return data.runs.map(r=>{
   if(!Number.isSafeInteger(r.pr)||r.pr<1||!Number.isSafeInteger(r.run_id)||r.run_id<1||
     !Number.isSafeInteger(r.attempt)||r.attempt<1||r.base!==BASE||
     !SHA.test(r.source_head||'')||t(r.queued_at)===null||t(r.completed_at)===null||
     t(r.completed_at)<t(r.queued_at)||!Array.isArray(r.jobs)||r.jobs.length>30)return null;
   const jobs=r.jobs.filter(j=>Number.isSafeInteger(j.id)&&j.id>0&&
     t(j.queued_at)!==null&&t(j.started_at)!==null&&t(j.completed_at)!==null&&
     t(j.queued_at)<=t(j.started_at)&&t(j.started_at)<=t(j.completed_at)&&
     t(j.completed_at)<=t(r.completed_at)+120000);
   if(!jobs.length)return null;
   return {...r,jobs,partial_jobs:r.partial_jobs===true||jobs.length!==r.jobs.length};
 }).filter(Boolean);
}
async function fetchArchive(){
 if(cache&&Date.now()-last<300000)return {...cache,stale:false};
 if(pending)return pending;
 pending=(async()=>{
   const since=new Date(Date.now()-96*3600000).toISOString();
   const url=HOST+'/issues/'+ISSUE+'/comments?per_page=100&since='+encodeURIComponent(since);
   const headers={Accept:'application/vnd.github+json',
     'User-Agent':'HH-CI-Journey-Read-Only','X-GitHub-Api-Version':'2022-11-28'};
   const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
   if(token)headers.Authorization='Bearer '+token;
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
   let response;
   try{response=await fetch(url,{headers,signal:ctrl.signal});}
   finally{clearTimeout(timer);}
   const remaining=Number(response.headers.get('x-ratelimit-remaining'));
   if(!response.ok||(Number.isFinite(remaining)&&remaining<5))
     throw Error('ARCHIVE_HTTP_'+response.status+(remaining<5?'_RATE_RESERVE':''));
   const comments=await response.json();
   if(!Array.isArray(comments))throw Error('ARCHIVE_INVALID');
   const byRun=new Map();
   for(const c of comments)for(const r of parse(c)){
     const id=r.run_id+':'+r.attempt;
     if(!byRun.has(id)||byRun.get(id).partial_jobs&&!r.partial_jobs)byRun.set(id,r);
   }
   cache={runs:[...byRun.values()],comments:comments.length,
     pagination_partial:comments.length>=100,
     remaining:Number.isFinite(remaining)?remaining:null,
     fetched_at:new Date().toISOString()};
   last=Date.now();return {...cache,stale:false};
 })().catch(e=>{
   if(cache)return {...cache,stale:true,stale_reason:String(e.message||e).slice(0,100)};
   throw e;
 }).finally(()=>{pending=null;});
 return pending;
}
function summarizePR(pr,runs){
 const sorted=[...runs].sort((a,b)=>t(a.queued_at)-t(b.queued_at));
 const first=t(sorted[0].queued_at),end=Math.max(...sorted.map(x=>t(x.completed_at)));
 if(first===null||end<=first)return null;
 const intervals=[];
 const add=(name,a,b)=>{if(a!==null&&b!==null&&b>a&&a<end&&b>first)
   intervals.push({name,start:Math.max(first,a),end:Math.min(end,b)});};
 let prev=null;
 for(const r of sorted){
   const a=t(r.queued_at),b=t(r.completed_at);
   if(prev!==null&&a>prev)add('between_waves_unknown',prev,a);
   prev=Math.max(prev||0,b);
   let firstJob=Infinity;
   for(const j of r.jobs){
     const q=t(j.queued_at),s=t(j.started_at),c=t(j.completed_at);
     firstJob=Math.min(firstJob,q);
     add('runner_wait',q,s);
     add('checks',s,c);
   }
   // In legacy imports job.created_at is unknown, so this interval is
   // unattributed. Never mistake it for measured workflow/runner queue.
   if(Number.isFinite(firstJob)&&r.source!=='VERIFIED_PARTIAL_HISTORICAL_IMPORT')
     add('workflow_wait',a,firstJob);
 }
 const marks=[first,end,...intervals.flatMap(x=>[x.start,x.end])].sort((a,b)=>a-b);
 const stages={workflow_wait:0,runner_wait:0,checks:0,between_waves_unknown:0,other_unknown:0};
 const priority=['checks','runner_wait','workflow_wait','between_waves_unknown'];
 for(let i=1;i<marks.length;i++){
   const a=marks[i-1],b=marks[i];if(b<=a)continue;
   const cat=priority.find(k=>intervals.some(x=>x.name===k&&x.start<=a&&x.end>=b))||'other_unknown';
   stages[cat]+=b-a;
 }
 if(Math.abs(Object.values(stages).reduce((a,b)=>a+b,0)-(end-first))>1)return null;
 const lastRun=[...sorted].sort((a,b)=>t(b.completed_at)-t(a.completed_at))[0];
 return {pr,first_at:new Date(first).toISOString(),last_at:new Date(end).toISOString(),
   elapsed_ms:end-first,elapsed_minutes:rnd((end-first)/60000),stages_ms:stages,
   runs:sorted.length,repeats:Math.max(0,sorted.length-1),
   distinct_heads:new Set(sorted.map(x=>x.source_head)).size,
   failures:sorted.filter(x=>['failure','timed_out','startup_failure'].includes(x.conclusion)).length,
   partial:sorted.some(x=>x.partial_jobs),
   created_at:sorted.map(x=>x.pr_created_at).find(x=>t(x)!==null)||null,
   merged_at:sorted.map(x=>x.merged_at).filter(x=>t(x)!==null).sort().at(-1)||null,
   first_url:safeRun(sorted[0].workflow_url)||msurl(sorted[0].run_id),
   last_url:safeRun(lastRun.workflow_url)||msurl(lastRun.run_id),
   history_complete:false};
}
function report(store,h,now=Date.now()){
 const byPR=new Map();
 for(const run of store.runs){
   if(!byPR.has(run.pr))byPR.set(run.pr,[]);
   byPR.get(run.pr).push(run);
 }
 const cutoff=now-h*3600000;
 const rows=[...byPR.entries()].map(([pr,runs])=>summarizePR(pr,runs)).filter(Boolean)
   .filter(x=>t(x.last_at)>=cutoff&&t(x.last_at)<=now+60000)
   .sort((a,b)=>b.elapsed_ms-a.elapsed_ms||a.pr-b.pr);
 const nums=rows.map(x=>x.elapsed_ms),sum=nums.reduce((a,b)=>a+b,0);
 return {schema:'HH_CI_FIRST_LAST_ARCHIVE_V1',
   generated_at:new Date(now).toISOString(),
   period_hours:h,cohort:'LAST_OBSERVED_CORE_JOB_COMPLETED_IN_WINDOW',
   archive_url:'https://github.com/andylitvinov-design/books/issues/'+ISSUE,
   coverage:{label:'VERIFIED_RUN_SAMPLE_NOT_ALL_PRS',comments_seen:store.comments,
     archived_runs:store.runs.length,archived_prs:byPR.size,
     partial_prs:rows.filter(x=>x.partial).length,
     history_complete:false,pagination_partial:store.pagination_partial,
     api_remaining:store.remaining,stale:store.stale===true,
     archive_fetched_at:store.fetched_at,
     note:'Первая и последняя CI из наблюдаемых Core runs; отсутствие старых workflow_run событий может уменьшать длительность.'},
   summary:{n:rows.length,median_minutes:nums.length?rnd(quant(nums,.5)/60000):null,
     average_minutes:nums.length?rnd(sum/nums.length/60000):null,
     p90_minutes:nums.length?rnd(quant(nums,.9)/60000):null,
     repeats:rows.reduce((n,x)=>n+x.repeats,0),
     failures:rows.reduce((n,x)=>n+x.failures,0)},
   rows:rows.slice(0,250)};
}
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Robots-Tag','noindex,nofollow');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','public,s-maxage=300,stale-while-revalidate=900');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end(JSON.stringify({error:'METHOD_NOT_ALLOWED'}));}
 const hours=Number(req.query?.hours||24);
 if(!HOURS.includes(hours)){res.statusCode=400;return res.end(JSON.stringify({error:'INVALID_HOURS'}));}
 try{res.statusCode=200;res.end(JSON.stringify(report(await fetchArchive(),hours)));}
 catch(e){res.statusCode=503;res.end(JSON.stringify({schema:'HH_CI_FIRST_LAST_ARCHIVE_V1',
   error:String(e.message||e).slice(0,90),missing_is_not_zero:true}));}
};
module.exports._test={parse,summarizePR,report};
