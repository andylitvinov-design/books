'use strict';
/**
 * HH_PR_REPAIR_LATENCY_V2 — read-only, provenance-bound breakdown.
 * The clock is first failed Core job COMPLETION to first observed Core workflow
 * for a DIFFERENT verified PR source HEAD, NOT Create->Merge and NOT Core CPU.
 * Only exact-run, exact-task, GitHub-Actions-app stage receipts are eligible.
 * Do not equate claimed with task receipt, fix step with typing, or commit
 * timeline with remote ref publication. Unknown spans remain unknown.
 */
const SHA=/^[0-9a-f]{40}$/i, TASK=/^[0-9a-f]{32}$/i;
const PHASES=Object.freeze([
  ['wait_assignment','Ошибка CI → задача закреплена'],
  ['wait_execution','Задача закреплена → начался Repair'],
  ['repair_and_validation','Repair → патч прошёл проверку'],
  ['wait_publication','Патч проверен → HEAD опубликован'],
  ['wait_new_ci','HEAD опубликован → новая CI создана']
]);
const SOURCES=Object.freeze({
  claimed:'repair_worker_claim',
  repair_started:'github_actions_fix_step',
  patch_verified:'github_actions_patch_verification_step',
  source_published:'verified_git_ref'
});
const clock=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s)&&
  Number.isFinite(Date.parse(s))?Date.parse(s):null;
const roundMs=ms=>ms===null?null:Math.round(ms/600)/100;
const sha=x=>typeof x==='string'&&SHA.test(x);
const strEq=(a,b)=>sha(a)&&sha(b)&&a.toLowerCase()===b.toLowerCase();
const validEvent=(e,pr,head)=>e?.kind==='stage'&&e.verified===true&&
  e.pr===pr&&strEq(e.head,head)&&Object.hasOwn(SOURCES,e.stage)&&
  e.source===SOURCES[e.stage]&&clock(e.at)!==null&&
  Number.isSafeInteger(e.runId)&&e.runId>0&&TASK.test(e.task||'')&&
  (e.stage!=='source_published'||sha(e.newHead));

function breakdownCycle(cycle,events,pr,options={}){
  const times=cycle?.timestamps||{};
  const started=clock(times.ci_failed_at),nextCI=clock(times.new_ci_created_at);
  const exactHead=sha(cycle?.failed_head)&&Number.isSafeInteger(cycle?.failed_run_id)&&cycle.failed_run_id>0;
  const finished=exactHead&&started!==null&&nextCI!==null&&nextCI>=started&&
    sha(cycle.next_head)&&!strEq(cycle.failed_head,cycle.next_head)&&
    Number.isSafeInteger(cycle.next_run_id)&&cycle.next_run_id>0;
  const observed=clock(options.observed_at);
  const inProgress=!finished&&exactHead&&started!==null&&nextCI===null&&
    options.pr_open===true&&strEq(options.current_head,cycle.failed_head)&&
    observed!==null&&observed>=started;
  const end=finished?nextCI:inProgress?observed:null;
  const validWindow=Number.isSafeInteger(pr)&&pr>0&&started!==null&&end!==null&&end>=started;
  const blank={schema:'HH_PR_REPAIR_LATENCY_V2',scope:finished?
    'FAILED_CORE_JOB_TO_DIFFERENT_HEAD_CORE_QUEUED':
    'FAILED_CORE_JOB_TO_OBSERVATION_NO_NEW_HEAD',
    status:inProgress?'IN_PROGRESS':'UNKNOWN',
    total_minutes:validWindow?roundMs(end-started):null,observed_minutes:null,
    unattributed_minutes:validWindow?roundMs(end-started):null,
    reconciled:validWindow,exact_task:null,worker_run_id:null,
    pending_since_verified_at:null,pending_age_minutes:null,
    timestamps:{claimed:null,repair_started:null,patch_verified:null,source_published:null},
    phases:PHASES.map(([key,label])=>({key,label,minutes:null,start_at:null,end_at:null,evidence_urls:[]})),
    note:'Недостаточно достоверно связанных событий. Неизвестное время не является нулевым.'};
  if(!validWindow||!Array.isArray(events))return blank;
  const eligible=events.filter(e=>validEvent(e,pr,cycle.failed_head)&&
    clock(e.at)>=started&&clock(e.at)<=end);
  let tied=[],pub=null,task=null,runId=null;
  if(finished){
    const publishes=eligible.filter(e=>e.stage==='source_published'&&strEq(e.newHead,cycle.next_head));
    if(publishes.length!==1)return blank;
    pub=publishes[0];task=pub.task;runId=pub.runId;
    tied=eligible.filter(e=>e.runId===runId&&e.task===task);
  }else{
    const candidates=eligible.filter(e=>e.stage!=='source_published');
    const keys=[...new Set(candidates.map(e=>e.runId+':'+e.task))];
    if(keys.length!==1)return blank;
    runId=candidates[0].runId;task=candidates[0].task;
    tied=candidates.filter(e=>e.runId===runId&&e.task===task);
  }
  const one=(stage,before)=>{
    const values=tied.filter(e=>e.stage===stage&&clock(e.at)<=before);
    return values.length===1?values[0]:null;
  };
  const bound=pub?clock(pub.at):end;
  const ready=one('patch_verified',bound);
  const repair=one('repair_started',ready?clock(ready.at):bound);
  const claim=one('claimed',repair?clock(repair.at):ready?clock(ready.at):bound);
  const marks=[times.ci_failed_at,claim?.at||null,repair?.at||null,
    ready?.at||null,pub?.at||null,finished?times.new_ci_created_at:null];
  const links=[null,claim?.url||null,repair?.url||null,ready?.url||null,
    pub?.url||null,cycle.links?.next_ci||null];
  let measured=0;
  const phases=PHASES.map(([key,label],i)=>{
    const a=clock(marks[i]),b=clock(marks[i+1]);
    if(a===null||b===null||a>b||a<started||b>end)
      return {key,label,minutes:null,start_at:marks[i],end_at:marks[i+1],evidence_urls:[]};
    const ms=b-a;measured+=ms;
    return {key,label,minutes:roundMs(ms),start_at:marks[i],end_at:marks[i+1],
      evidence_urls:[links[i],links[i+1]].filter(x=>typeof x==='string'&&
        /^https:\/\/github\.com\/andylitvinov-design\/books\//.test(x))};
  });
  const total=end-started;
  if(measured>total)return blank;
  const unknown=total-measured;
  const pendingAge=inProgress&&ready?end-clock(ready.at):null;
  return {schema:'HH_PR_REPAIR_LATENCY_V2',scope:blank.scope,
    status:finished?(unknown===0?'COMPLETE':'PARTIAL'):'IN_PROGRESS',
    total_minutes:roundMs(total),observed_minutes:roundMs(measured),
    unattributed_minutes:roundMs(unknown),reconciled:measured+unknown===total,
    exact_task:task,worker_run_id:runId,
    pending_since_verified_at:inProgress?ready?.at||null:null,
    pending_age_minutes:pendingAge!==null&&pendingAge>=0?roundMs(pendingAge):null,
    timestamps:{claimed:claim?.at||null,repair_started:repair?.at||null,
      patch_verified:ready?.at||null,source_published:pub?.at||null},phases,
    note:finished?
      'Claim не доказывает получение задачи; Repair = старт fix-шага; работа включает тесты; опубликованный HEAD подтверждён remote ref. Неизвестные минуты не приписаны агенту.':
      'Открытый PR со старым HEAD: возраст после ошибки на момент запроса, не завершённое время. Если патч проверен, его возраст без подтверждённой публикации показывается отдельно, без включения в измеренный publisher wait.'};
}

function enrichRepairCycles(report,stageEvents,options={}){
  if(report?.schema!=='HH_PR_REPAIR_CYCLE_V1'||!Number.isSafeInteger(report.pr)||
    !Array.isArray(report.cycles))throw Error('INVALID_REPAIR_CYCLE_REPORT');
  const cycles=report.cycles.map(c=>({...c,latency:breakdownCycle(c,stageEvents,report.pr,options)}));
  const completed=cycles.filter(c=>['COMPLETE','PARTIAL','UNKNOWN'].includes(c.latency.status)&&c.latency.scope==='FAILED_CORE_JOB_TO_DIFFERENT_HEAD_CORE_QUEUED'&&c.latency.total_minutes!==null), partial=completed.filter(c=>c.latency.status==='PARTIAL').length;
  const group=PHASES.map(([key,label])=>{
    const values=completed.map(c=>c.latency.phases.find(p=>p.key===key)?.minutes).filter(v=>v!==null);
    return {key,label,measured_cycles:values.length,total_minutes:Math.round(values.reduce((a,b)=>a+b,0)*100)/100,
      mean_minutes_observed:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100:null};
  });
  return {...report,cycles,latency_summary:{schema:'HH_PR_REPAIR_LATENCY_SUMMARY_V2',
    completed_changed_head_cycles:completed.length,in_progress_cycles:cycles.filter(c=>c.latency.status==='IN_PROGRESS').length,fully_measured_cycles:completed.length-partial-
      completed.filter(c=>c.latency.status==='UNKNOWN').length,
    partial_cycles:partial,unknown_cycles:completed.filter(c=>c.latency.status==='UNKNOWN').length,
    phases:group,note:'Descriptive per-PR cycle evidence; NOT the Create→Merge or archived Core cohort.'}};
}
module.exports={PHASES,breakdownCycle,enrichRepairCycles};
