'use strict';
// Existing scheduled Watchdog runner only. No deployment, new CI job, cron,
// paid provider, or source write. LIVE is stronger than GitHub MERGED/READY.
const REPO='andylitvinov-design/books',OWNER='andylitvinov-design',BOOKS='books';
const PROD='codex/public-book-library',ORIGIN='https://holistichouse.vercel.app';
const PROJECT='prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b',SHA=/^[a-f0-9]{40}$/i;
const DEPLOY=/^dpl_[A-Za-z0-9]{8,64}$/;
const VERCEL=/^https:\/\/vercel\.com\/super10\/codex-public-book-library\/([A-Za-z0-9]{8,64})\/?$/;
const MARKER='HH_PR_BOT_LIVE_VERIFIED_V1';
const no=reason=>({verified:false,reason});
function verifyLiveEvidence({pr,identity,combined,comparison,site,files}={}){
 if(!pr||pr.state!=='closed'||pr.merged!==true||
    !SHA.test(pr.merge_commit_sha||'')||
    !Number.isFinite(Date.parse(pr.merged_at||''))||
    pr.base?.ref!==PROD||pr.base?.repo?.full_name!==REPO||
    pr.head?.repo?.full_name!==REPO||pr.user?.login!==OWNER)
   return no('MERGED_PRODUCTION_PR_IDENTITY_UNVERIFIED');
 if(!Number.isSafeInteger(pr.changed_files)||pr.changed_files<1||
    pr.changed_files>=100||!Array.isArray(files)||files.length!==pr.changed_files||
    !files.every(f=>typeof f.filename==='string'))
   return no('CHANGED_FILE_SCOPE_INCOMPLETE');
 if(files.some(f=>/^supabase\/(?:functions|migrations)\//.test(f.filename)))
   return no('SUPABASE_RUNTIME_SCOPE_REQUIRES_SEPARATE_ACCEPTANCE');
 if(!identity||identity.schema!=='HH_PUBLIC_RELEASE_EVIDENCE_V1'||
    identity.available!==true||identity.project_id!==PROJECT||
    identity.environment!=='production'||identity.branch!==PROD||
    identity.repo!==REPO||!SHA.test(identity.sha||'')||
    !DEPLOY.test(identity.deployment_id||''))
   return no('PUBLIC_RELEASE_IDENTITY_UNVERIFIED');
 if(!site||site.status!==200||site.host!=='holistichouse.vercel.app'||
    site.html!==true||!String(site.contentType||'').toLowerCase().includes('text/html'))
   return no('CANONICAL_SITE_NOT_VERIFIED');
 if(!combined||!Array.isArray(combined.statuses)||
    combined.total_count!==combined.statuses.length||
    combined.total_count<1||combined.total_count>100)
   return no('GITHUB_VERCEL_STATUS_INCOMPLETE');
 const status=combined.statuses.filter(x=>
   ['Vercel','Vercel – codex-public-book-library'].includes(x?.context))
   .sort((a,b)=>(Date.parse(b.updated_at||b.created_at||'')||0)-
     (Date.parse(a.updated_at||a.created_at||'')||0))[0];
 const d=String(status?.target_url||'').match(VERCEL);
 if(status?.state!=='success'||!d||identity.deployment_id!=='dpl_'+d[1])
   return no('VERCEL_STATUS_OR_DEPLOYMENT_MISMATCH');
 const merge=pr.merge_commit_sha.toLowerCase(),served=identity.sha.toLowerCase();
 if(!comparison||comparison.base_commit?.sha!==merge||
    !['ahead','identical'].includes(comparison.status)||
    (comparison.status==='identical'&&served!==merge)||
    (comparison.status==='ahead'&&
     (comparison.merge_base_commit?.sha!==merge||comparison.behind_by!==0)))
   return no('MERGE_NOT_ON_SERVED_PRODUCTION_ANCESTRY');
 return {verified:true,reason:'SIGNED_GITHUB_AND_CANONICAL_PRODUCTION_ANCESTRY',
   mergeSha:merge,productionSha:served,deploymentId:identity.deployment_id};
}
async function getJson(fetchImpl,url,max=320000){
 const r=await fetchImpl(url,{method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(7500),headers:{Accept:'application/json'}});
 if(r.status!==200)return null;
 const raw=await r.text();
 if(typeof raw!=='string'||raw.length>max)return null;
 try{return JSON.parse(raw)}catch{return null}
}
async function proofFor({github,pr,fetcher}){
 try{
  const identity=await getJson(fetcher,ORIGIN+'/api/public/release-evidence',3000);
  if(!identity||!SHA.test(identity.sha||''))return no('PRODUCTION_IDENTITY_UNAVAILABLE');
  const [siteResponse,statuses,comparison,fs]=await Promise.all([
   fetcher(ORIGIN+'/en',{method:'GET',cache:'no-store',redirect:'follow',
    signal:AbortSignal.timeout(8500),headers:{Accept:'text/html'}}),
   github.rest.repos.getCombinedStatusForRef({owner:OWNER,repo:BOOKS,ref:identity.sha,per_page:100}),
   github.rest.repos.compareCommitsWithBasehead({owner:OWNER,repo:BOOKS,
    basehead:pr.merge_commit_sha+'...'+identity.sha,per_page:1}),
   github.rest.pulls.listFiles({owner:OWNER,repo:BOOKS,pull_number:pr.number,per_page:100})
  ]);
  const siteHost=new URL(siteResponse.url||ORIGIN+'/en').hostname;
  const contentType=String(siteResponse.headers?.get('content-type')||'');
  let html=false;
  if(siteResponse.status===200&&siteHost==='holistichouse.vercel.app'&&
     contentType.toLowerCase().includes('text/html')){
    const body=await siteResponse.text();
    html=body.length<=2500000&&/<html(?:\s|>)/i.test(body);
  }
  return verifyLiveEvidence({pr,identity,combined:statuses.data,
   comparison:comparison.data,files:fs.data,
   site:{status:siteResponse.status,host:siteHost,contentType,html}});
 }catch{return no('PRODUCTION_READBACK_UNAVAILABLE')}
}
const isBot=c=>c?.user?.id===41898282&&c.user.login==='github-actions[bot]'&&
 c.user.type==='Bot'&&c.performed_via_github_app?.id===15368&&
 c.performed_via_github_app?.slug==='github-actions';
async function hasPriorLiveReceipt(github,pr,marker){
 for(let page=1;page<=4;page++){
  const res=await github.rest.issues.listComments({owner:OWNER,repo:BOOKS,
   issue_number:pr.number,per_page:100,page});
  const comments=res?.data;
  if(!Array.isArray(comments)||comments.length>100)return null;
  if(comments.some(c=>isBot(c)&&String(c.body||'').startsWith(marker)))return true;
  if(comments.length<100)return false;
 }
 return null; // incomplete history cannot permit duplicate notice
}
async function sweep({github,context,fetcher=global.fetch,core,proofImpl=proofFor,now=Date.now()}={}){
 // A verified non-dry backlog-reconcile dispatch is an existing protected
 // Watchdog runner, needed when native GitHub schedule ticks disappear.
 const inputs=context?.payload?.inputs||{};
 const partial=String(inputs.direct_dispatch||'false')==='true'||
   String(inputs.completion_wake||'false')==='true'||
   (typeof inputs.pm_pr_number==='string'&&inputs.pm_pr_number!=='');
 const fallback=context?.eventName==='workflow_dispatch'&&!partial&&
   String(inputs.dry_run||'false')==='false';
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
   context?.ref!=='refs/heads/codex/bootstrap-books'||
   !(context.eventName==='schedule'||fallback))
  return {status:'SKIPPED_NOT_SCHEDULE'};
 // One already scheduled runner, bounded GitHub API cost. Fair rotation avoids
 // one unresolved deployment or Supabase-only PR starving every other merge.
 const list=await github.rest.pulls.list({owner:OWNER,repo:BOOKS,
  state:'closed',base:PROD,sort:'updated',direction:'desc',per_page:100});
 if(!Array.isArray(list?.data)||list.data.length>100)
  return {status:'GITHUB_PR_LIST_UNVERIFIED'};
 const candidates=list.data.filter(p=>p.merged_at&&
   Number.isFinite(Date.parse(p.merged_at))&&
   now-Date.parse(p.merged_at)>=0&&
   now-Date.parse(p.merged_at)<=72*3600000&&
   p.user?.login===OWNER).slice(0,50);
 if(!candidates.length)return {status:'NO_RECENT_MERGED_PR',inspected:0};
 const offset=Math.floor(now/1200000)%candidates.length;
 const rotated=[...candidates.slice(offset),...candidates.slice(0,offset)];
 let inspected=0,proofAttempts=0;
 const unresolved=[];
 for(const entry of rotated){
  if(inspected>=10||proofAttempts>=3)break;
  inspected++;
  let pr;
  try{pr=(await github.rest.pulls.get({owner:OWNER,repo:BOOKS,
    pull_number:entry.number})).data;}
  catch{
   unresolved.push({pr:entry.number,reason:'GITHUB_PR_READ_UNAVAILABLE'});
   continue;
  }
  if(!pr||pr.number!==entry.number||pr.merged!==true||
     pr.state!=='closed'||!SHA.test(pr.merge_commit_sha||''))continue;
  const marker='<!-- '+MARKER+' pr='+pr.number+' merge='+pr.merge_commit_sha+' -->';
  let prior;
  try{prior=await hasPriorLiveReceipt(github,pr,marker);}
  catch{prior=null;}
  if(prior===null){
   unresolved.push({pr:pr.number,reason:'HISTORY_UNVERIFIED'});
   continue;
  }
  if(prior)continue;
  proofAttempts++;
  let proof;
  try{proof=await proofImpl({github,pr,fetcher});}
  catch{proof=no('LIVE_PROOF_READ_UNAVAILABLE');}
  if(!proof?.verified){
   unresolved.push({pr:pr.number,reason:proof?.reason||'LIVE_PROOF_UNVERIFIED'});
   continue;
  }
  // The confirmed merge and HEAD ancestry must remain exact at publication.
  let current;
  try{current=(await github.rest.pulls.get({owner:OWNER,repo:BOOKS,
    pull_number:pr.number})).data;}
  catch{
   unresolved.push({pr:pr.number,reason:'MERGE_READBACK_UNAVAILABLE'});
   continue;
  }
  if(current?.state!=='closed'||current.merged!==true||
     current.merge_commit_sha!==pr.merge_commit_sha){
   unresolved.push({pr:pr.number,reason:'MERGE_READBACK_CHANGED'});
   continue;
  }
  try{
   await github.rest.issues.createComment({owner:OWNER,repo:BOOKS,
    issue_number:pr.number,body:marker+'\n**Production LIVE independently verified.**\n'+
    'Merged '+proof.mergeSha+' is an ancestor of currently served '+
    proof.productionSha+' at '+ORIGIN+
    '. Deployment '+proof.deploymentId+
    '; GitHub Vercel status and canonical HTML verified. '+
    'Signed GitHub release receipt, not proof that every user journey was tested.'});
  }catch{
   return {status:'LIVE_NOTICE_UNCONFIRMED',pr:pr.number,inspected,proofAttempts};
  }
  core?.info?.('HH_PR_LIVE_PROOF '+JSON.stringify({pr:pr.number,
   deployment:proof.deploymentId,merge:proof.mergeSha}));
  return {status:'LIVE_VERIFIED_NOTICE_SENT',pr:pr.number,inspected,proofAttempts};
 }
 return {status:unresolved.length?'LIVE_PENDING_RECHECK':'NO_ELIGIBLE_UNNOTIFIED_PR',
  inspected,proofAttempts,unresolved:unresolved.slice(0,3)};

}
module.exports={verifyLiveEvidence,proofFor,sweep,hasPriorLiveReceipt,MARKER};
