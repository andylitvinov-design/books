// PR Completion journey. Pure, read-only, exact-HEAD evidence classifier.
// "Dispatch accepted" is never model invocation, source write, merge or LIVE.
export const JOURNEY_SCHEMA='HH_COMMANDER_PR_JOURNEY_V1';
const SHA=/^[a-f0-9]{40}$/i;
const verifiedTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?s:null;
const ageMinutes=(since,now)=>{
 const t=Date.parse(since||'');
 return Number.isFinite(t)&&now>=t?Math.floor((now-t)/60000):null;
};
const stage=(id,title,state,detail,at=null,link=null)=>({
 id,title,state,detail,at:verifiedTime(at),link:typeof link==='string'&&
  /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/[0-9]+(?:\/job\/[0-9]+)?$/.test(link)?link:null
});
const botSigned=c=>c?.user?.login==='github-actions[bot]'&&
 c.user?.id===41898282&&c.user?.type==='Bot'&&
 c.performed_via_github_app?.id===15368&&
 c.performed_via_github_app?.slug==='github-actions';
function signedReceipt(comments,marker,sha){
 if(!Array.isArray(comments)||!SHA.test(sha||''))return null;
 return comments.find(c=>botSigned(c)&&typeof c.body==='string'&&
  c.body.startsWith('<!-- '+marker+' '+sha+' -->'))||null;
}
// GitHub source/runner receipts are evidence, never an AI-generated status.
// Require the existing GitHub Actions bot identity and exact PR/HEAD/run data.
// Do not parse model output, secrets, prompts, or untrusted PR-authored text.
const TASK_KEY=/^[a-f0-9]{32}$/i;
const RUN_ID=/^[1-9][0-9]{0,18}$/;
function signedWorkerEvidence(comments,prNumber,knownHeads,knownCommits){
 const results={model:null,source:null};
 if(!Array.isArray(comments)||!(knownHeads instanceof Set)||
   !(knownCommits instanceof Set))return results;
 for(const comment of comments){
  if(!botSigned(comment)||typeof comment.body!=='string'||
    comment.body.length>42000)continue;
  const match=/<!-- HH_PR_TASK_V1 -->\s*\x60\x60\x60json\s*\n([\s\S]{1,30000}?)\n\x60\x60\x60/.exec(comment.body);
  if(!match)continue;
  let receipt;try{receipt=JSON.parse(match[1])}catch{continue;}
  if(receipt?.schema!=='HH_PR_TASK_V1'||receipt.lane!=='repair'||
    receipt.pr_number!==prNumber||!TASK_KEY.test(receipt.task_key||'')||
    !SHA.test(receipt.head_sha||'')||
    !knownHeads.has(receipt.head_sha.toLowerCase()))continue;
  const runId=String(receipt.owner_run_id||'');
  if(!RUN_ID.test(runId))continue;
  const link='https://github.com/andylitvinov-design/books/actions/runs/'+runId;
  const ai=receipt.ai_execution,model=receipt.model_run;
  if(ai?.schema==='HH_PR_AI_EXECUTION_EVIDENCE_V1'&&
    ai.model_request_attempted===true&&
    model?.schema==='HH_FREE_AI_MODEL_RUN_V1'&&
    model.pr_number===prNumber&&String(model.run_id)===runId&&
    model.source_head?.toLowerCase()===receipt.head_sha.toLowerCase()&&
    verifiedTime(model.model_call_started_at)&&
    typeof model.model==='string'&&
    /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]{2,100}$/i.test(model.model)){
   const at=model.model_call_started_at;
   const observed={at,link,model:model.model,
    response:ai.model_response_confirmed===true&&
      !!verifiedTime(model.response_received_at)};
   if(!results.model||Date.parse(at)>Date.parse(results.model.at))
    results.model=observed;
  }
  if(receipt.state==='PUBLISHED'&&receipt.source_published===true&&
    SHA.test(receipt.new_sha||'')&&
    receipt.new_sha.toLowerCase()!==receipt.head_sha.toLowerCase()&&
    knownCommits.has(receipt.new_sha.toLowerCase())&&
    (receipt.verified_source_fix===true||
     receipt.ai_execution?.source_published_sha===receipt.new_sha)){
   const observed={sha:receipt.new_sha,link,
    at:verifiedTime(receipt.created_at)||null};
   if(!results.source||Date.parse(observed.at||'1970-01-01')>
      Date.parse(results.source.at||'1970-01-01'))results.source=observed;
  }
 }
 return results;
}
const coreCheck=(checks,sha,name)=>{
 if(!Array.isArray(checks))return null;
 const rows=checks.filter(c=>c?.name===name&&
  c.head_sha===sha&&typeof c.status==='string');
 return rows.length===1?rows[0]:null;
};
const requiredCheckFailed=c=>c?.status==='completed'&&
 typeof c.conclusion==='string'&&c.conclusion!=='success';
export function buildPrCompletionJourney({item,github={},production={},ciEvents=[],verifiedCommitShas=[],observedAt=new Date().toISOString()}={}){
 if(!item||!Number.isSafeInteger(item.prNumber)||item.prNumber<=0||
  !SHA.test(item.requestedHeadSha||item.headSha||'')||
  typeof item.status!=='string')
  throw Error('INVALID_OWNER_PR_JOURNEY_ITEM');
 const now=Date.parse(observedAt),pr=github.pr||null;
 const trustedPR=!!pr&&pr.number===item.prNumber&&
  pr.head?.repo?.full_name==='andylitvinov-design/books'&&
  pr.base?.repo?.full_name==='andylitvinov-design/books'&&
  pr.base?.ref==='codex/public-book-library'&&SHA.test(pr.head?.sha||'');
 const head=trustedPR?pr.head.sha:null;
 const original=(item.requestedHeadSha||item.headSha).toLowerCase();
 const changed=!!head&&head.toLowerCase()!==original;
 const validChecks=trustedPR&&github.checksComplete===true?github.checks:null;
 const exactBuild=head?coreCheck(validChecks,head,'core-lint-types-build'):null;
 const exactGate=head?coreCheck(validChecks,head,'hh-merge-check'):null;
 const coreSucceeded=exactBuild?.status==='completed'&&exactBuild.conclusion==='success'&&
  exactGate?.status==='completed'&&exactGate.conclusion==='success';
 const failedCheck=[exactBuild,exactGate].find(requiredCheckFailed)||null;
 const coreFailed=!!failedCheck;
 const exactCore=failedCheck||exactGate||exactBuild;
 const coreDetail=coreFailed?
  (failedCheck?.name||'Required CI')+' завершился '+failedCheck.conclusion+
   ' на текущем HEAD; общий Core CI не пройден.':
  coreSucceeded?'Core CI и обязательный hh-merge-check прошли на текущем HEAD.':
  exactBuild?.status==='completed'&&exactBuild.conclusion==='success'?
   'Сборка Core успешна; обязательный hh-merge-check ещё не подтверждён.':
  exactCore?'Обязательные проверки Core CI на текущем HEAD ещё не завершены.':
   'Результат обязательных проверок Core CI на текущем HEAD не подтверждён.';
 const unassignedTriage=coreFailed&&Array.isArray(ciEvents)?
  ciEvents.find(e=>e?.headSha===head&&
   e?.routeReason==='NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY'&&
   e?.dispatchAccepted!==true&&e?.workerStarted!==true):null;
 const signed=trustedPR&&github.commentsComplete===true?github.comments:null;
 const trustedCommits=new Set([...(Array.isArray(verifiedCommitShas)?verifiedCommitShas:[]),head]
  .filter(value=>SHA.test(value||'')).map(value=>value.toLowerCase()));
 const trustedHeads=new Set([...trustedCommits,original]);
 const workerEvidence=signedWorkerEvidence(signed,item.prNumber,trustedHeads,trustedCommits);
 const failedReceipt=signedReceipt(signed,'HH_PR_10MIN_SOURCE_REPAIR_V1',head);
 const runnerReceipt=signedReceipt(signed,'HH_EXECUTION_RUNNER_V1',head)||
  signedReceipt(signed,'HH_EXECUTION_RUNNER_V1',original);
 const taskAge=ageMinutes(item.createdAt,now);
 const leaseExpired=item.status==='LEASED'&&verifiedTime(item.leaseUntil)&&
  Date.parse(item.leaseUntil)<now;
 const queueSlow=item.status==='QUEUED'&&taskAge!==null&&taskAge>=25;
 const watcherSeen=!!verifiedTime(item.firstAttemptAt)||
  Number(item.checkedCount)>0||item.status==='LEASED'||item.dispatchAccepted===true;
 const claimedAt=verifiedTime(item.firstAttemptAt);
 const verifiedMerged=trustedPR&&pr.state==='closed'&&pr.merged===true&&
  SHA.test(pr.merge_commit_sha||'')&&verifiedTime(pr.merged_at);
 const verifiedLive=!!verifiedMerged&&production?.verified_live===true&&
  production.proof_method==='CANONICAL_RUNTIME_AND_GITHUB_VERCEL_ANCESTRY'&&
  production.alias==='holistichouse.vercel.app'&&
  production.merge_sha?.toLowerCase()===pr.merge_commit_sha.toLowerCase()&&
  SHA.test(production.production_sha||'')&&
  /^dpl_[A-Za-z0-9]{8,64}$/.test(production.deployment_id||'');
 const closedUnmerged=trustedPR&&pr.state==='closed'&&pr.merged!==true;
 const hasHold=trustedPR&&Array.isArray(pr.labels)&&pr.labels.some(l=>
  ['hh:hold','hh:blocked','hh:repair-manual'].includes(l?.name));
 const stages=[
  stage('accepted','Заявка зарегистрирована','done',
   'Команда сохранена в личной очереди Supabase.',item.createdAt),
  stage('watchdog','Watchdog получил задачу',
   leaseExpired?'attention':watcherSeen?'done':queueSlow?'attention':'waiting',
   leaseExpired?'Аренда исполнителя истекла; нет подтверждения завершения обработки.':
    watcherSeen?'Получена запись о назначении/обработке; это ещё не запуск AI.':
    queueSlow?'Нет подтверждения принятия задачи более 25 минут.':
    'Ждём подтверждения, что Watchdog взял задачу.',
   claimedAt),
  stage('diagnostics','Диагностика Core CI',
   exactCore?(coreFailed?'attention':coreSucceeded?'done':'working'):'unknown',
   coreDetail,
   exactCore?.completed_at||exactCore?.started_at,exactCore?.html_url),
  stage('handoff','Передача исправления',
   hasHold||unassignedTriage?'attention':item.dispatchAccepted===true?'done':
    item.dispatchAttemptedAt?'attention':'waiting',
   hasHold?'На PR установлена ручная блокировка: её нельзя обходить.':
    unassignedTriage?'CI классифицирован как '+(unassignedTriage.category||'TEST_FAILURE')+
     ', но источник подтвердил NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY: автоматический исполнитель не назначен.':
    item.dispatchAccepted===true?'GitHub принял dispatch; старт AI и публикация кода не доказаны.':
    item.dispatchAttemptedAt?'Попытка передачи есть, но GitHub-подтверждения dispatch нет.':
    failedReceipt?'Ошибка Core подтверждена подписанной записью; передача ещё не подтверждена.':
    'Подписанная передача Repair Worker пока не подтверждена.',
   item.dispatchAttemptedAt),
  stage('runner','Исполнитель начал работу',
   runnerReceipt?'done':item.dispatchAccepted===true?'waiting':'unknown',
   runnerReceipt?'Подписанная запись подтверждает GitHub runner; вызов модели отдельно не доказан.':
    item.dispatchAccepted===true?'Ждём подтверждённого старта GitHub runner.':
    'Нет подтверждённого запуска исполнителя.',
   runnerReceipt?.created_at),
  stage('model','AI получил задачу',
   workerEvidence.model?(workerEvidence.model.response?'done':'working'):'unknown',
   workerEvidence.model?
    'Подписанный GitHub Worker подтвердил обращение к '+workerEvidence.model.model+
    (workerEvidence.model.response?
     '. Ответ модели получен; патч требует отдельной проверки.':
     '. Ответ модели пока не подтверждён.'):
    'Нет подписанного подтверждения реального вызова модели.',
   workerEvidence.model?.at||null,workerEvidence.model?.link||null),
  stage('commit','Исправляющий коммит / новый HEAD',
   workerEvidence.source?'done':changed?'working':'waiting',
   workerEvidence.source?
    'GitHub подтвердил исправляющий коммит '+workerEvidence.source.sha.slice(0,12)+
    ' по подписанному Worker и истории PR.':
    changed?'GitHub HEAD изменился с исходного SHA; авторство AI не подтверждается этим фактом.':
     'Подтверждённого исправляющего коммита после заявки пока нет.',
   workerEvidence.source?.at||null,workerEvidence.source?.link||null),
  stage('recheck','Проверка CI на текущем HEAD',
   coreSucceeded?'done':coreFailed?'attention':exactCore?'working':'unknown',
   coreSucceeded?'Core CI и hh-merge-check подтверждены для SHA '+head.slice(0,12)+'.':
    coreDetail,
   exactCore?.completed_at||exactCore?.started_at,exactCore?.html_url),
  stage('merge','GitHub merge',
   verifiedMerged?'done':closedUnmerged||item.status==='CLOSED_UNMERGED'?'attention':'waiting',
   verifiedMerged?'GitHub подтвердил merge SHA '+pr.merge_commit_sha.slice(0,12)+'.':
    closedUnmerged?'PR закрыт без merge.':
    trustedPR?'PR не смержен: ждём обязательные проверки и защищённый merge.':
    'Статус merge не удалось проверить напрямую в GitHub.',
   verifiedMerged?pr.merged_at:null),
  stage('live','Production LIVE',verifiedLive?'done':'unknown',
   verifiedLive?
    'Подтверждён LIVE: Vercel '+production.deployment_id+
     ' обслуживает версию '+production.production_sha.slice(0,12)+
     ', содержащую merge SHA '+pr.merge_commit_sha.slice(0,12)+'.':
    'Для LIVE необходимо отдельное подтверждение Vercel deployment, SHA и функциональной проверки.',
   verifiedLive?observedAt:null)
 ];
 let focus=null,attention=null;
 // Live GitHub merge readback outranks an older Supabase BLOCKED/LEASED
 // receipt. Do not erase the historical failure; show the current verified
 // merge and keep Vercel LIVE unknown until separately attested.
 if(verifiedMerged)focus='live';
 else if(closedUnmerged||item.status==='CLOSED_UNMERGED')focus='merge';
 else if(item.status==='QUEUED'&&!watcherSeen)focus='watchdog';
 else if(leaseExpired)focus='watchdog';
 else if(item.status==='BLOCKED')focus='handoff';
 else if(!trustedPR)focus='diagnostics';
 else if(hasHold)focus='handoff';
 else if(coreFailed&&!item.dispatchAccepted)focus='handoff';
 else if(item.dispatchAccepted&&!runnerReceipt)focus='runner';
 else if(!changed&&!coreSucceeded)focus=runnerReceipt?'commit':failedReceipt?'handoff':'diagnostics';
 else if(!coreSucceeded)focus='recheck';
 else focus='merge';
 const selected=stages.find(s=>s.id===focus);
 const stalled=!verifiedMerged&&(!!leaseExpired||!!queueSlow||item.status==='BLOCKED'||
   (focus==='handoff'&&(hasHold||(unassignedTriage&&watcherSeen)))||
   (focus==='merge'&&closedUnmerged));
 if(stalled){
  attention=leaseExpired?'Истёк срок аренды Watchdog':
   queueSlow?'Длительное ожидание запуска Watchdog':
   hasHold?'Ручная блокировка PR':
   unassignedTriage?'Для этой категории CI ещё не назначен безопасный автоматический исполнитель':
   closedUnmerged?'PR закрыт без merge':
   'Задача заблокирована: '+(item.reasonCode||'причина не уточнена');
 }
 return {
  schema:JOURNEY_SCHEMA,requestId:item.requestId||null,prNumber:item.prNumber,observedAt,
  source:'SUPABASE_OWNER_QUEUE_AND_GITHUB_EXACT_HEAD',
  currentHeadSha:head,submittedHeadSha:original,
  coreStatus:exactCore?{name:exactCore.name,status:exactCore.status,
   conclusion:coreSucceeded?'success':coreFailed?failedCheck.conclusion:null,
  buildConclusion:exactBuild?.conclusion||null,
  requiredGateConclusion:exactGate?.conclusion||null,
  url:exactCore.html_url||null}:null,
  lastQueueCheckAt:verifiedTime(item.lastCheckedAt),
  currentStage:focus,currentStageTitle:selected?.title||'Требуется уточнение',
  stalled,attention,minutesSinceRequest:taskAge,githubVerified:trustedPR,
  productionVerified:verifiedLive,
  modelCallVerified:workerEvidence.model!==null,
  repairCommitVerified:workerEvidence.source!==null,
  productionSha:verifiedLive?production.production_sha:null,
  deploymentId:verifiedLive?production.deployment_id:null,
  stages
 };
}
