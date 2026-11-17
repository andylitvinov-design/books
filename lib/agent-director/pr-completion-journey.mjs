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
const coreCheck=(checks,sha)=>{
 if(!Array.isArray(checks))return null;
 const rows=checks.filter(c=>c?.name==='core-lint-types-build'&&
  c.head_sha===sha&&typeof c.status==='string');
 return rows.length===1?rows[0]:null;
};
export function buildPrCompletionJourney({item,github={},production={},observedAt=new Date().toISOString()}={}){
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
 const exactCore=head?coreCheck(validChecks,head):null;
 const coreSucceeded=exactCore?.status==='completed'&&exactCore.conclusion==='success';
 const coreFailed=exactCore?.status==='completed'&&
  ['failure','timed_out','cancelled','action_required','startup_failure'].includes(exactCore.conclusion);
 const signed=trustedPR&&github.commentsComplete===true?github.comments:null;
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
   coreFailed?'Точный HEAD: Core CI завершился ошибкой ('+exactCore.conclusion+').':
    coreSucceeded?'Core CI на текущем HEAD прошёл успешно.':
    exactCore?'Core CI на текущем HEAD ещё не завершён.':
    'Результат Core CI на текущем HEAD не подтверждён.',
   exactCore?.completed_at||exactCore?.started_at,exactCore?.html_url),
  stage('handoff','Передача исправления',
   hasHold?'attention':item.dispatchAccepted===true?'done':
    item.dispatchAttemptedAt?'attention':'waiting',
   hasHold?'На PR установлена ручная блокировка: её нельзя обходить.':
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
  stage('model','AI получил задачу','unknown',
   'Отдельного достоверного подтверждения реального вызова модели пока нет.'),
  stage('commit','Исправляющий коммит / новый HEAD',
   changed?'done':'waiting',
   changed?'GitHub HEAD изменился с исходного SHA; авторство AI не подтверждается этим фактом.':
    'Нового SHA после заявки пока нет.',
   null),
  stage('recheck','Проверка CI на текущем HEAD',
   coreSucceeded?'done':coreFailed?'attention':exactCore?'working':'unknown',
   coreSucceeded?'Core CI подтверждён для SHA '+head.slice(0,12)+'.':
    coreFailed?'Текущий Core CI красный; обязательные проверки нельзя обходить.':
    exactCore?'Core CI выполняется или ожидает результат.':
    'Не найдена подтверждённая Core-проверка текущего SHA.',
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
   (focus==='handoff'&&hasHold)||(focus==='merge'&&closedUnmerged));
 if(stalled){
  attention=leaseExpired?'Истёк срок аренды Watchdog':
   queueSlow?'Длительное ожидание запуска Watchdog':
   hasHold?'Ручная блокировка PR':
   closedUnmerged?'PR закрыт без merge':
   'Задача заблокирована: '+(item.reasonCode||'причина не уточнена');
 }
 return {
  schema:JOURNEY_SCHEMA,requestId:item.requestId||null,prNumber:item.prNumber,observedAt,
  source:'SUPABASE_OWNER_QUEUE_AND_GITHUB_EXACT_HEAD',
  currentHeadSha:head,submittedHeadSha:original,
  coreStatus:exactCore?{name:exactCore.name,status:exactCore.status,
   conclusion:exactCore.conclusion,url:exactCore.html_url||null}:null,
  lastQueueCheckAt:verifiedTime(item.lastCheckedAt),
  currentStage:focus,currentStageTitle:selected?.title||'Требуется уточнение',
  stalled,attention,minutesSinceRequest:taskAge,githubVerified:trustedPR,
  productionVerified:verifiedLive,
  productionSha:verifiedLive?production.production_sha:null,
  deploymentId:verifiedLive?production.deployment_id:null,
  stages
 };
}
