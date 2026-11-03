'use strict';
// HH_PR_STAGE_V1: authenticated, HEAD-scoped timestamps stored in existing
// GitHub PR comments. No new cron, workflow, runner, services, or PAT.
const SHA=/^[a-f0-9]{40}$/i,TASK=/^[a-f0-9]{32}$/i;
const STAGES=new Set(['ready','triage','claimed','repair_started','source_published']);
const SOURCES=new Set(['pr_opened_ready','ready_event_observed','ready_for_review_readback',
 'trusted_core_failure','repair_worker_claim','ci_worker_claim',
 'github_actions_fix_step','verified_git_ref']);
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));
function validate(x){
 if(!x||!STAGES.has(x.stage)||!Number.isSafeInteger(x.pr_number)||x.pr_number<=0||
   !SHA.test(x.head_sha||'')||!/^[1-9][0-9]{0,18}$/.test(String(x.run_id||''))||
   !iso(x.at)||!SOURCES.has(x.source))return false;
 if(x.task_key!=null&&!TASK.test(x.task_key))return false;
 if(x.stage==='claimed'&&!TASK.test(x.task_key||''))return false;
 if(x.stage==='repair_started'&&(x.source!=='github_actions_fix_step'||!TASK.test(x.task_key||'')))return false;
 if(x.stage==='source_published'&&(x.source!=='verified_git_ref'||
   !SHA.test(x.new_sha||'')||x.new_sha===x.head_sha||!TASK.test(x.task_key||'')))return false;
 if(x.stage!=='source_published'&&x.new_sha!=null)return false;
 return true;
}
function stageLine(data){
 const e={stage:data.stage,pr_number:data.pr_number,head_sha:data.head_sha,
  run_id:String(data.run_id),at:data.at,source:data.source};
 if(data.task_key!=null)e.task_key=data.task_key;
 if(data.new_sha!=null)e.new_sha=data.new_sha;
 if(!validate(e))throw Error('INVALID_STAGE_RECEIPT');
 return '<!-- HH_PR_STAGE_V1 '+JSON.stringify(e)+' -->';
}
function trusted(c){
 return c?.user?.id===41898282&&c.user.login==='github-actions[bot]'&&
  c.user.type==='Bot'&&c.performed_via_github_app?.id===15368&&
  c.performed_via_github_app?.slug==='github-actions';
}
function parseComment(c,{number=null,head=null}={}){
 if(!trusted(c))return [];
 const body=String(c.body||''),received=Date.parse(c.created_at||'');
 if(body.length>150000||!Number.isFinite(received))return [];
 const result=[];
 for(const match of body.matchAll(/<!-- HH_PR_STAGE_V1 (\{[^\r\n]{1,680}\}) -->/g)){
  let e;try{e=JSON.parse(match[1]);}catch{continue;}
  if(!validate(e)||(number!==null&&e.pr_number!==number)||
     (head!==null&&e.head_sha!==head))continue;
  const at=Date.parse(e.at);
  if(at>received+60000)continue;
  if(e.source!=='github_actions_fix_step'&&received-at>86400000)continue;
  result.push({...e,comment_created_at:c.created_at});
 }
 return result;
}
function timelineStages(events){
 const result=[];
 for(const e of Array.isArray(events)?events:[]){
  const at=e?.created_at;if(!iso(at))continue;
  if(e.event==='ready_for_review')
   result.push({stage:'ready',at,source:'github:ready_for_review'});
  // Direction Watcher already persists this label as a native GitHub event.
  if(e.event==='labeled'&&e.label?.name==='hh:merge-stage:inspect')
   result.push({stage:'triage',at,source:'github:merge-stage:inspect'});
 }
 return result;
}
module.exports={stageLine,parseComment,timelineStages,validate};
