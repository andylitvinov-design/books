'use strict';
// The pull-request API's base SHA can reflect an older snapshot. A merge
// policy change needs evidence against the current production branch.
const SHA=/^[a-f0-9]{40}$/i;
const ISOLATED_CI_ONLY=new Set([
 'scripts/ci-specialist-aggregate.mjs',
 'lib/ci/specialist-aggregate.mjs',
 'lib/ci/production-base-impact.mjs',
 'tests/ci-specialist-aggregate.test.mjs',
 'tests/ci-specialist-wait.test.mjs',
]);
const PUBLIC_MEDIA_ONLY=/^(?:components\/mandala-[a-z0-9._/-]+\.(?:tsx|jsx|css)|lib\/mandala\/[a-z0-9._/-]+\.(?:mjs|js|ts|tsx)|tests\/(?:mandala-|video-|free-film-)[a-z0-9._/-]+\.test\.mjs|docs\/[a-z0-9._-]+\.md)$/i;
const FORBIDDEN_PUBLIC_MEDIA=/(?:^|[\/._-])(?:operations|policy|ci|workflow|security|privacy|private|token|client|crm|message|medical|health|audio|voice|recording|codec|encoder|export|license|auth|consent|secret|credential|payment|billing|rls|database|migration|supabase|api)(?:$|[\/._-])/i;
function verifiedDetachedCiMediaAdvance(compare,runBase,liveBase,rows){
 if(!SHA.test(runBase||'')||!SHA.test(liveBase||'')||runBase===liveBase||
    !Array.isArray(rows)||!rows.length||rows.length>ISOLATED_CI_ONLY.size||
    rows.some(row=>!ISOLATED_CI_ONLY.has(row.filename)||!['M','A'].includes(row.status))||
    new Set(rows.map(row=>row.filename)).size!==rows.length||
    !compare||compare.status!=='ahead'||compare.base_commit?.sha!==runBase||
    compare.merge_base_commit?.sha!==runBase||compare.behind_by!==0||
    !Number.isInteger(compare.ahead_by)||compare.ahead_by<1||compare.ahead_by>20||
    compare.total_commits!==compare.ahead_by||
    !Array.isArray(compare.commits)||compare.commits.length!==compare.ahead_by||
    compare.commits.at(-1)?.sha!==liveBase||
    !Array.isArray(compare.files)||compare.files.length<1||compare.files.length>=50)return false;
 const changed=new Set(rows.map(row=>row.filename));
 return compare.files.every(row=>
   typeof row?.filename==='string'&&!changed.has(row.filename)&&
   ['added','modified'].includes(row.status)&&!row.previous_filename&&
   !row.filename.split('/').some(part=>!part||part==='.'||part==='..')&&
   PUBLIC_MEDIA_ONLY.test(row.filename)&&!FORBIDDEN_PUBLIC_MEDIA.test(row.filename));
}


const PUBLIC_RASTER_BASE_ADVANCE=/^public\/(?:images|photos|assets)\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:png|jpe?g|webp|avif|gif)$/i;
// Mirror protected production Specialist's exact-ancestry safe-asset exception.
// Runtime/security/CI/policy paths, SVG and incomplete comparisons stay blocked.
function verifiedIndependentPublicRasterAdvance(compare,testedBase,liveBase,candidatePaths=[]){
 if(!SHA.test(testedBase||'')||!SHA.test(liveBase||'')||testedBase===liveBase||
    !compare||compare.status!=='ahead'||compare.base_commit?.sha!==testedBase||
    compare.merge_base_commit?.sha!==testedBase||compare.behind_by!==0||
    !Number.isInteger(compare.ahead_by)||compare.ahead_by<1||compare.ahead_by>20||
    compare.total_commits!==compare.ahead_by||
    !Array.isArray(compare.commits)||compare.commits.length!==compare.ahead_by||
    compare.commits.at(-1)?.sha!==liveBase||!Array.isArray(compare.files)||
    compare.files.length<1||compare.files.length>=100||
    !Array.isArray(candidatePaths)||candidatePaths.length<1||candidatePaths.length>300||
    candidatePaths.some(path=>typeof path!=='string'||!path||
      path.split('/').some(part=>!part||part==='.'||part==='..'))||
    new Set(candidatePaths).size!==candidatePaths.length)return false;
 const changed=new Set(candidatePaths),seen=new Set();
 return compare.files.every(file=>{
   const path=file?.filename;
   if(typeof path!=='string'||!PUBLIC_RASTER_BASE_ADVANCE.test(path)||
      file.previous_filename||changed.has(path)||seen.has(path)||
      !['added','modified'].includes(file.status)||
      path.split('/').some(part=>!part||part==='.'||part==='..'))return false;
   seen.add(path);return true;
 });
}

async function assessBaseFreshness({github,owner,repo,pr,verifiedRunBase,classifierBase,decideRoute,baseAdvancePolicy}){
 const fail=reason=>({ok:false,reason});
 if(!Number.isSafeInteger(pr?.number)||pr.number<1||!SHA.test(pr.base?.sha||'')||
    !Number.isSafeInteger(pr.changed_files)||pr.changed_files<0||pr.changed_files>300)return fail('INVALID_PR_EVIDENCE');
 try{
  const branch=(await github.rest.repos.getBranch({owner,repo,branch:'codex/public-book-library'})).data;
  const actual=branch?.commit?.sha;if(!SHA.test(actual||''))return fail('CURRENT_BASE_UNAVAILABLE');
  if(classifierBase!==actual||typeof decideRoute!=='function')return fail('CLASSIFIER_BASE_STALE');
  const files=[];
  for(let page=1;page<=3;page++){
   const rows=(await github.rest.pulls.listFiles({owner,repo,pull_number:pr.number,per_page:100,page})).data;
   if(!Array.isArray(rows)||rows.length>100)return fail('FILES_INCOMPLETE');
   files.push(...rows);if(rows.length<100)break;
  }
  if(files.length!==pr.changed_files||new Set(files.map(f=>f?.filename)).size!==files.length)return fail('FILES_INCOMPLETE');
  const statusMap={added:'A',modified:'M',removed:'D',renamed:'R',copied:'C',changed:'T',unchanged:'U'};
  const rows=[];
  for(const f of files){
   if(typeof f?.filename!=='string'||!f.filename||!statusMap[f.status]||
      (f.status==='renamed'&&typeof f.previous_filename!=='string'))return fail('FILES_UNVERIFIED');
   rows.push({status:statusMap[f.status],filename:f.filename});
   if(f.previous_filename)rows.push({status:'R',filename:f.previous_filename});
  }
  const route=decideRoute(rows,null,null);
  if(!['FULL','CORE','ASSETS','TEXT'].includes(route))return fail('CLASSIFIER_RESULT_UNVERIFIED');
  const sensitive=route==='FULL';
  let revalidatedReason=null;
  if(sensitive){
   if(typeof verifiedRunBase==='function')verifiedRunBase=await verifiedRunBase(rows);
   if(!SHA.test(verifiedRunBase||'')){
    return fail(actual===pr.base.sha?'SENSITIVE_CI_BASE_UNVERIFIED':'SENSITIVE_BASE_STALE');
   }
   if(verifiedRunBase!==actual){
    // Source deletes/renames are not production-base changes. Retain BOTH
    // old/new path names for overlap checks, rather than forcing a full
    // Core rerun when another PR advanced only independent public content.
    // GitHub's verified target comparison still blocks actual target
    // deletes/renames, and native merge still requires mergeable=true.
    if(!rows.length||!rows.every(row=>['M','A','D','R'].includes(row.status)))
      return fail(actual===pr.base.sha?'SENSITIVE_CI_BASE_STALE':'SENSITIVE_BASE_STALE');
    let comparison;
    try{
     comparison=(await github.rest.repos.compareCommits({
       owner,repo,base:verifiedRunBase,head:actual,per_page:100
     })).data;
    }catch{return fail(actual===pr.base.sha?'SENSITIVE_CI_BASE_STALE':'SENSITIVE_BASE_STALE');}
    const paths=rows.map(row=>row.filename);
    // Specialist already used this same protected production BASE's policy.
    // Never let this control-plane verifier use a PR-controlled classifier or
    // independently invent broader exemptions for runtime/security changes.
    const required=['safeDocumentationAdvance','safeIndependentCiMaintenanceAdvance',
      'verifiedIndependentPublicRasterAdvance'];
    if(baseAdvancePolicy && required.some(name=>
        typeof baseAdvancePolicy[name]!=='function'))
      return fail('TRUSTED_BASE_ADVANCE_POLICY_INCOMPLETE');
    const approved=name=>{
      if(!baseAdvancePolicy)return false; // legacy direct callers are narrow
      try{
        return baseAdvancePolicy[name](comparison,verifiedRunBase,actual,paths)===true;
      }catch{return false;}
    };
    const detachedCi=rows.every(row=>ISOLATED_CI_ONLY.has(row.filename))&&
      verifiedDetachedCiMediaAdvance(comparison,verifiedRunBase,actual,rows);
    // Keep existing local raster proof as a second independent conservative
    // validator. The new protected helper must also accept it when provided.
    const independentRaster=pr.mergeable===true&&
      verifiedIndependentPublicRasterAdvance(comparison,verifiedRunBase,actual,paths)&&
      (!baseAdvancePolicy||approved('verifiedIndependentPublicRasterAdvance'));
    const documentationOnly=approved('safeDocumentationAdvance');
    const independentMaintenance=approved('safeIndependentCiMaintenanceAdvance');
    // Only the production-pinned Specialist policy may approve independent
    // public-page advances. No filename-only control-plane waiver.
    const independentPresentation=pr.mergeable===true&&
      approved('safeIndependentPublicPresentationAdvance');
    // Specialist on the unchanged PR HEAD already verified ALL applicable
    // checks. Import the same protected policy, never a PR-authored bypass.
    const disjointPublicSource=pr.mergeable===true&&
      approved('safeDisjointPublicSourceAdvance');
    // Specialist itself loads the NEW protected validator and re-evaluates all
    // real Core/specialist evidence after policy + unrelated source merges.
    // Mirror that exact approval, never independently invent broader rules.
    const trustedPolicyAdvance=pr.mergeable===true&&
      approved('safeTrustedPolicyAdvance');
    // Same protected, read-only browser QA path proof as Specialist. No
    // waiving failed/queued real workflows or hosting rules.
    const independentQaAdvance=pr.mergeable===true&&
      approved('safeIndependentQaAdvance');
    // Reuse exactly the Specialist's *protected production* policy for
    // disjoint domain test-only updates. Do not trust PR-authored policy,
    // unconfirmed mergeability or synthetic/missing required Core jobs.
    const independentDomainTest=pr.mergeable===true&&
      approved('safeIndependentDomainTestAdvance');
    // NEVER invent a control-plane exception: use the optional function
    // loaded from this exact protected production commit. It validates
    // every changed row and the complete Compare, not a union of names.
    // The same HEAD's successful mandatory CI must already be present.
    const composedIndependent=pr.mergeable===true&&
      approved('safeComposedIndependentAdvance');
    // The controlling policy is loaded exclusively from the CURRENT
    // protected production SHA. Mirror Specialist's verified scoped and
    // mixed-delta approvals; the default branch NEVER invents a waiver.
    const scopedIndependent=pr.mergeable===true&&
      approved('safeScopedDisjointProductionAdvance');
    const mixedIndependent=pr.mergeable===true&&
      approved('safeMixedProtectedAdvance');
    // Mirror the exact current protected Specialist's ordinary-product loose-base rule.
    // No fallback to PR-authored or default-branch-defined acceptance policy.
    const nonOverlappingProduct=pr.mergeable===true&&
      approved('safeNonOverlappingProductAdvance');
    if(!detachedCi&&!independentRaster&&!documentationOnly&&!independentMaintenance&&
       !independentPresentation&&!disjointPublicSource&&!trustedPolicyAdvance&&
       !independentQaAdvance&&!independentDomainTest&&!composedIndependent&&
       !scopedIndependent&&!mixedIndependent&&!nonOverlappingProduct)
      return fail('SENSITIVE_COMPARE_UNSAFE');
    revalidatedReason=detachedCi?'ISOLATED_CI_PUBLIC_MEDIA_REVALIDATED':
      independentRaster?'INDEPENDENT_PUBLIC_RASTER_REVALIDATED':
      documentationOnly?'INDEPENDENT_DOCS_BASE_REVALIDATED':
      independentMaintenance?'INDEPENDENT_CI_MAINTENANCE_REVALIDATED':
      independentPresentation?'INDEPENDENT_PUBLIC_PRESENTATION_REVALIDATED':
      disjointPublicSource?'DISJOINT_PUBLIC_SOURCE_REVALIDATED':
      trustedPolicyAdvance?'TRUSTED_POLICY_BASE_REVALIDATED':
      independentQaAdvance?'INDEPENDENT_QA_BASE_REVALIDATED':
      independentDomainTest?'INDEPENDENT_DOMAIN_TEST_BASE_REVALIDATED':
      // Existing native workflow already pins this documented mixed result
      // to the exact protected SHA before activating AutoMerge.
      'MIXED_INDEPENDENT_BASE_REVALIDATED';
   }
  }
  const finalBranch=(await github.rest.repos.getBranch({owner,repo,branch:'codex/public-book-library'})).data;
  if(finalBranch?.commit?.sha!==actual)return fail('BASE_MOVED_DURING_CHECK');
  return {ok:true,reason:revalidatedReason||
     (sensitive?'SENSITIVE_BASE_VERIFIED':'NON_SENSITIVE_BASE_ADVANCE'),base:actual};
 }catch{return fail('BASE_OR_FILES_UNAVAILABLE');}
}
function coreRunBase(run,pr,fullRepo,suiteId){
 if(!Number.isSafeInteger(run?.id)||run.id<1||run.event!=='pull_request'||
    run.name!=='HH PR core release gate'||String(run.path||'').split('@')[0]!=='.github/workflows/hh-pr-core-release.yml'||
    run.status!=='completed'||run.conclusion!=='success'||run.repository?.full_name!==fullRepo||
    run.head_repository?.full_name!==fullRepo||run.head_branch!==pr.head?.ref||
    !Number.isSafeInteger(suiteId)||run.check_suite_id!==suiteId||!Array.isArray(run.pull_requests))return null;
 const refs=run.pull_requests.filter(x=>x.number===pr.number&&x.head?.sha===pr.head.sha&&x.head?.ref===pr.head.ref&&
  x.base?.ref==='codex/public-book-library'&&SHA.test(x.base?.sha||''));
 return refs.length===1?refs[0].base.sha:null;
}
async function coreRunBaseForCheck({github,owner,repo,pr,check,rows=null,token=null,fetcher=globalThis.fetch}){
 try{
  const u=new URL(check?.details_url||'');
  const m=u.pathname.match(new RegExp('^/'+owner+'/'+repo+'/actions/runs/([0-9]+)/job/([0-9]+)/?$'));
  if(u.protocol!=='https:'||u.hostname!=='github.com'||u.search||u.hash||!m)return null;
  const runId=Number(m[1]),jobId=Number(m[2]);
  if(!Number.isSafeInteger(runId)||runId<1||!Number.isSafeInteger(jobId)||jobId<1||!Number.isSafeInteger(check.id))return null;
  const job=(await github.rest.actions.getJobForWorkflowRun({owner,repo,job_id:jobId})).data;
  if(job?.id!==jobId||job.run_id!==runId||
     !['hh-merge-check','hh-core-verified'].includes(check.name)||job.name!==check.name||
     check.app?.id!==15368||check.app?.slug!=='github-actions'||
     job.status!=='completed'||job.conclusion!=='success'||
     job.check_run_url!=='https://api.github.com/repos/'+owner+'/'+repo+'/check-runs/'+check.id)return null;
  const run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:runId})).data;
  if(run?.id!==runId)return null;
  const associated=coreRunBase(run,pr,owner+'/'+repo,check.check_suite?.id);
  if(associated)return associated;
  // The hourly coordinator must share the verified Core-base fallback with
  // event-driven auto-merge. GitHub can return pull_requests: [] on green Core.
  // Recover only for the matching current source SHA, complete exact-run jobs
  // and a known non-workflow PR diff; unknown provenance stays unknown.
  if(owner+'/'+repo!=='andylitvinov-design/books'||
     !token||typeof fetcher!=='function'||!Array.isArray(rows)||!rows.length||
     !Array.isArray(run?.pull_requests)||run.pull_requests.length!==0||
     run.head_sha!==pr?.head?.sha)return null;
  const page=(await github.rest.actions.listJobsForWorkflowRun({
    owner,repo,run_id:runId,per_page:100,filter:'latest'
  })).data;
  if(!Number.isSafeInteger(page?.total_count)||page.total_count<1||
     page.total_count>100||!Array.isArray(page.jobs)||
     page.total_count!==page.jobs.length)return null;
  const {recoverTestedBase}=require('./ci-pr-core-tested-base-logs.cjs');
  return recoverTestedBase({github,owner,repo,pr,run,jobs:page.jobs,
    rows,token,fetcher});
 }catch{return null;}
}
async function loadTrustedClassifier(workspace){
 const path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
 if(typeof workspace!=='string'||!path.isAbsolute(workspace))throw Error('CLASSIFIER_WORKSPACE_INVALID');
 const dir=path.join(workspace,'.hh-merge-policy-production');
 const classifierBase=execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8',timeout:10000}).trim();
 if(!SHA.test(classifierBase))throw Error('CLASSIFIER_BASE_INVALID');
 // The production checkout may advance more than once in one event.
 // Bind the ESM cache to the verified protected commit SHA.
 const url=pathToFileURL(path.join(dir,'scripts/ci-quick-route.mjs'));
 url.searchParams.set('sha',classifierBase);
 const mod=await import(url.href);
 if(typeof mod.decideRoute!=='function')throw Error('CLASSIFIER_UNAVAILABLE');
 // Load only code from the SAME immutable protected checkout as routing.
 // No new API calls or detached worker; native Specialist already uses this
 // source of truth to judge harmless production-base changes.
 const impactUrl=pathToFileURL(path.join(dir,'lib/ci/production-base-impact.mjs'));
 impactUrl.searchParams.set('sha',classifierBase);
 const impact=await import(impactUrl.href);
 const names=['safeDocumentationAdvance','safeIndependentCiMaintenanceAdvance',
   'verifiedIndependentPublicRasterAdvance'];
 if(names.some(name=>typeof impact[name]!=='function'))
   throw Error('PROTECTED_BASE_ADVANCE_POLICY_UNAVAILABLE');
 // Backward-compatible two-branch rollout: until production ships the new
 // policy, absence means HOLD on presentation drift, never a spurious PASS.
 if(typeof impact.safeIndependentPublicPresentationAdvance==='function')
   names.push('safeIndependentPublicPresentationAdvance');
 // Safe two-branch rollout: old production lacks this helper and rejects
 // disjoint runtime drift until the protected Specialist patch is published.
 if(typeof impact.safeDisjointPublicSourceAdvance==='function')
   names.push('safeDisjointPublicSourceAdvance');
 // Available even before the compound policy lands: the older trusted
 // function accepts policy-only advances, never mixed unsafe code.
 if(typeof impact.safeTrustedPolicyAdvance==='function')
   names.push('safeTrustedPolicyAdvance');
 // Only production versions with this reviewed helper can reuse QA-only
 // target movement; old protected policies continue to HOLD instead.
 if(typeof impact.safeIndependentQaAdvance==='function')
   names.push('safeIndependentQaAdvance');
 // Backward-compatible rollout: no helper in protected production means no
 // domain-test exemption. Only load exact current protected SHA.
 if(typeof impact.safeIndependentDomainTestAdvance==='function')
   names.push('safeIndependentDomainTestAdvance');
 // Two-branch rollout: old production without the reviewed mixed proof
 // continues to HOLD. Never use this control branch's own implementation.
 if(typeof impact.safeComposedIndependentAdvance==='function')
   names.push('safeComposedIndependentAdvance');
 // These helpers are strictly optional for safe staggered rollout. Neither
 // the default branch nor an open PR can define their behavior.
 if(typeof impact.safeScopedDisjointProductionAdvance==='function')
   names.push('safeScopedDisjointProductionAdvance');
 if(typeof impact.safeMixedProtectedAdvance==='function')
   names.push('safeMixedProtectedAdvance');
 // Roll out after production ships the reviewed helper; older production
 // remains fail-closed. The existing mixed-revalidated reason preserves the
 // final native protected-ref pin for both event and hourly coordinators.
 if(typeof impact.safeNonOverlappingProductAdvance==='function')
   names.push('safeNonOverlappingProductAdvance');
 const baseAdvancePolicy=Object.fromEntries(names.map(name=>[name,impact[name]]));
 return {classifierBase,decideRoute:mod.decideRoute,baseAdvancePolicy};
}
module.exports={assessBaseFreshness,coreRunBase,coreRunBaseForCheck,loadTrustedClassifier,verifiedDetachedCiMediaAdvance,verifiedIndependentPublicRasterAdvance};
