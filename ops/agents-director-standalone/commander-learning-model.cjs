'use strict';
/* HH_COMMANDER_LEARNING_V1: trust-bound, read-only evidence learning.
 * No arbitrary PR instructions, auto-promotion, source-writing or paid provider.
 */
const crypto=require('node:crypto');
const REPO='andylitvinov-design/books';
const POLICY='HH_PR_AUTOMATION_CANONICAL_V1';
const SHA=/^[a-f0-9]{40}$/i;
const MARK='<!-- HH_PR_TASK_V1 -->\n```json\n';
const FAMILIES=Object.freeze({
 'lint-autofix':{title:'Уточнение алгоритма ESLint',hint:'Проверить точный HEAD и диагностический diff до повторного применения autofix.'},
 'typescript-deterministic':{title:'Уточнение TypeScript-исправлений',hint:'Сравнить type-only ошибки и проверить отсутствие новых диагностик.'},
 'bounded-free-ai':{title:'Улучшение ограниченного AI Repair',hint:'Проверять цену модели, исходный HEAD, тесты и доказательство публикации.'}
});
function isTime(x){return typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x))}
function digest(x){return crypto.createHash('sha256').update(x).digest('hex').slice(0,32)}
function trustedComment(c){
 return !!c&&c.user?.id===41898282&&c.user.login==='github-actions[bot]'&&c.user.type==='Bot'&&
 c.performed_via_github_app?.id===15368&&c.performed_via_github_app?.slug==='github-actions'&&
 typeof c.body==='string'&&c.body.length<150000&&isTime(c.created_at);
}
function caseFromComment(c){
 if(!trustedComment(c))return null;
 const m=/^<!-- HH_PR_REPAIR_OUTCOME_V1 ([a-f0-9]{40}) ([1-9]\d{0,18}) -->\n/.exec(c.body);
 if(!m)return null;
 const a=c.body.indexOf(MARK);if(a<0)return null;
 const z=c.body.indexOf('\n```',a+MARK.length);
 if(z<0||z-a>13000)return null;
 let r;try{r=JSON.parse(c.body.slice(a+MARK.length,z))}catch{return null}
 if(r?.schema!=='HH_PR_TASK_V1'||r.state!=='PUBLISHED'||r.source_published!==true||
  r.verified_source_fix!==true||r.reason_code!=='SOURCE_COMMIT_VERIFIED_ON_PR_HEAD'||
  !Number.isSafeInteger(r.pr_number)||r.pr_number<1||r.pr_number>99999999||
  !SHA.test(r.head_sha||'')||!SHA.test(r.new_sha||'')||r.head_sha===r.new_sha||
  !/^[a-f0-9]{32}$/i.test(r.task_key||'')||!/^[1-9]\d{0,18}$/.test(String(r.owner_run_id||''))||
  !isTime(r.created_at)||m[1]!==r.head_sha||m[2]!==String(r.owner_run_id)||
  Math.abs(Date.parse(c.created_at)-Date.parse(r.created_at))>86400000||
  r.run_url!=='https://github.com/'+REPO+'/actions/runs/'+r.owner_run_id)return null;
 const family=r.strategy==='lint'&&r.repair_kind==='lint'?'lint-autofix':
  r.strategy==='code'&&r.repair_kind==='lint'?'typescript-deterministic':
  r.strategy==='code'&&r.repair_kind==='free_ai'?'bounded-free-ai':null;
 if(!family)return null;
 return {case_id:digest([REPO,r.pr_number,r.head_sha,r.new_sha,r.owner_run_id].join('|')),
  pr_number:r.pr_number,previous_head:r.head_sha,published_head:r.new_sha,
  owner_run_id:String(r.owner_run_id),skill_id:family,skill_version:'1.0.0',
  observed_at:r.created_at,policy:POLICY,
  pr_url:'https://github.com/'+REPO+'/pull/'+r.pr_number,
  run_url:r.run_url,source_receipt:'TRUSTED_ACTIONS_TERMINAL_RECEIPT',
  source_proof:'NOT_INDEPENDENTLY_CHECKED',ci_proof:'NOT_VERIFIED',
  merge_proof:'NOT_VERIFIED',live_proof:'NOT_VERIFIED'};
}
function gather(comments){
 if(!Array.isArray(comments)||comments.length>300)return [];
 const seen=new Set(),cases=[];
 for(const c of comments){const x=caseFromComment(c);
  if(x&&!seen.has(x.case_id)){seen.add(x.case_id);cases.push(x)}
 }
 return cases;
}
function parentProof(c,commit){
 return !!c&&SHA.test(c.previous_head)&&SHA.test(c.published_head)&&
 commit?.sha===c.published_head&&Array.isArray(commit.parents)&&
 commit.parents.some(x=>x.sha===c.previous_head);
}
function ciProof(c,body){
 const checks=body?.check_runs;if(!Array.isArray(checks)||checks.length>100)return false;
 return ['core-lint-types-build','hh-specialist','hh-merge-check'].every(name=>
  checks.some(x=>x.name===name&&x.head_sha===c.published_head&&
   x.status==='completed'&&x.conclusion==='success'&&
   x.app?.id===15368&&x.app?.slug==='github-actions'));
}
function candidateLessons(cases){
 if(!Array.isArray(cases))return [];
 const out=[];
 for(const [id,desc] of Object.entries(FAMILIES)){
  const rows=cases.filter(x=>x.skill_id===id&&x.source_proof==='VERIFIED_COMMIT_PARENT'&&
    x.ci_proof==='EXACT_HEAD_CI_VERIFIED'&&x.policy===POLICY);
  const prs=new Set(rows.map(x=>x.pr_number)),heads=new Set(rows.map(x=>x.published_head));
  if(prs.size<2||heads.size<2)continue;
  out.push({skill_id:id,title:desc.title,suggestion:desc.hint,
    supporting_prs:[...prs].slice(0,8),verified_cases:rows.length,
    state:'CANDIDATE_OWNER_REVIEW_REQUIRED',auto_execute:false,auto_promote:false,
    needs:'Exact skill diff, independent regression test and owner-approved protected PR'});
 }
 return out;
}
function curator(cases){
 const out=[];const lessons=candidateLessons(cases);
 for(const x of lessons)out.push({skill_id:x.skill_id,action:'REVIEW_CANDIDATE',reason:x.verified_cases+' independently verified cases'});
 return out;
}
module.exports={REPO,POLICY,FAMILIES,caseFromComment,gather,parentProof,ciProof,candidateLessons,curator};
