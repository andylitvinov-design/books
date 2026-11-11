'use strict';
// Recover the exact production base tested by the trusted, successful Core
// checkout when GitHub omits workflow_run.pull_requests. This is only a
// cryptographically scoped provenance fallback; it cannot turn red CI green.
const SHA=/^[a-f0-9]{40}$/i;
const CORE='HH PR core release gate';
const PATH='.github/workflows/hh-pr-core-release.yml';
const MAX_LOG=3_000_000;
function parseTestedBaseLog(text){
 if(typeof text!=='string'||text.length===0||text.length>MAX_LOG||
    !text.includes('Verify bounded shallow scope ancestry before PR routing'))return null;
 const matches=[...text.matchAll(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z[ \t]+HH_TESTED_BASE_VERIFIED: ([a-f0-9]{40})[ \t]*$/gm)];
 if(!matches.length)return null;
 const values=[...new Set(matches.map(m=>m[1].toLowerCase()))];
 if(values.length!==1||!SHA.test(values[0]))return null;
 // An echoed command is not proof. Only the runner's environment display
 // plus the completed, verified ancestry step may provide this base.
 return values[0];
}
async function recoverTestedBase({github,owner,repo,pr,run,jobs,rows,token,
  fetcher=globalThis.fetch}={}){
 const full=owner+'/'+repo;
 if(full!=='andylitvinov-design/books'||!Number.isSafeInteger(pr?.number)||
   pr.number<1||!SHA.test(pr.head?.sha||'')||
   run?.name!==CORE||run?.path?.split('@')[0]!==PATH||
   run?.event!=='pull_request'||run?.status!=='completed'||
   run?.conclusion!=='success'||run?.head_sha!==pr.head.sha||
   run?.head_branch!==pr.head.ref||
   run?.repository?.full_name!==full||
   run?.head_repository?.full_name!==full||
   !Number.isSafeInteger(run?.check_suite_id)||
   !Number.isSafeInteger(run?.id)||run.id<1||
   !Array.isArray(run.pull_requests)||run.pull_requests.length!==0||
   !Array.isArray(rows)||!Array.isArray(jobs)||
   !token||typeof fetcher!=='function')return null;
 // When this PR changes workflow or composite-action policy, CI logs can
 // describe modified untrusted checks. Never use the fallback in that case.
 if(rows.some(r=>typeof r?.filename!=='string'||
   /^\.github\/(?:workflows|actions)\//.test(r.filename)||
   /^scripts\/ci-pr-readiness\.mjs$/.test(r.filename)))return null;
 const core=jobs.filter(j=>j?.name==='core-lint-types-build');
 if(core.length!==1||core[0].run_id!==run.id||
   !Number.isSafeInteger(core[0].id)||core[0].id<1||
   core[0].status!=='completed'||core[0].conclusion!=='success'||
   !core[0].steps?.some(step=>
     step.name==='Verify bounded shallow scope ancestry before PR routing'&&
     step.status==='completed'&&step.conclusion==='success'))return null;
 try{
  const url='https://api.github.com/repos/'+full+
    '/actions/jobs/'+core[0].id+'/logs';
  const response=await fetcher(url,{
   headers:{Authorization:'Bearer '+token,Accept:'text/plain',
    'X-GitHub-Api-Version':'2022-11-28'},
   redirect:'follow',
   signal:AbortSignal.timeout(20000)
  });
  if(!response?.ok)return null;
  const size=Number(response.headers?.get?.('content-length')||0);
  if(size>MAX_LOG)return null;
  const text=await response.text();
  return parseTestedBaseLog(text);
 }catch{return null;}
}
module.exports={parseTestedBaseLog,recoverTestedBase,MAX_LOG};
