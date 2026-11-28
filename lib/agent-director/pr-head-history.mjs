// An owner-only, on-demand audit of observed PR HEADs and their exact-SHA evidence.
// A commit is not proof it was published as a HEAD, and a runner is not a model call.
import {readAutomationIdentity} from './pr-automation-trace.mjs';
export const HEAD_HISTORY_SCHEMA='HH_COMMANDER_PR_HEAD_HISTORY_V1';
const SHA=/^[a-f0-9]{40}$/i;
const safeSha=x=>typeof x==='string'&&SHA.test(x)?x.toLowerCase():null;
const when=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;
const text=(x,max=120)=>typeof x==='string'?x.slice(0,max):null;
const checkUrl=x=>typeof x==='string'&&
 /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(x)?x:null;
const githubStatus=x=>['success','failure','neutral','skipped','cancelled','timed_out',
 'action_required','startup_failure','stale'].includes(x)?x:null;
const byTime=(a,b)=>String(a.at||'').localeCompare(String(b.at||''))||a.id.localeCompare(b.id);
export function buildPrHeadHistory({pr,item,commits=[],checksBySha={},ciEvents=[],
 forcePushes=[],page=1,pageCount=1,commitHistoryComplete=true,ciHistoryAvailable=true,ciHistoryComplete=true,
 checksComplete=true,observedAt=new Date().toISOString()}={}){
 if(!pr||!Number.isSafeInteger(pr.number)||!safeSha(pr.head?.sha)||
  !Number.isSafeInteger(page)||page<1)throw Error('PR_HEAD_HISTORY_IDENTITY_INVALID');
 const heads=new Map(),events=[];
 const put=(sha,source,at=null,subject=null)=>{
  const id=safeSha(sha);if(!id)return null;
  if(!heads.has(id))heads.set(id,{sha:id,kind:'commit',sources:[],at:null,subject:null,
   observedHead:false,checks:[],ciEvents:[]});
  const row=heads.get(id);
  if(!row.sources.includes(source))row.sources.push(source);
  if(source!=='commit'&&source!=='github-checks')row.observedHead=true;
  if(when(at)&&(!row.at||Date.parse(at)<Date.parse(row.at)))row.at=at;
  if(!row.subject&&subject)row.subject=text(subject,130);
  return row;
 };
 const emit=(id,at,title,description,sha=null,url=null,state='info')=>{
  if(!when(at))return;
  events.push({id,at,title,description:text(description,240),sha:safeSha(sha),
   url:checkUrl(url),state});
 };
 if(when(pr.created_at))emit('pr-created',pr.created_at,'PR открыт',
  'GitHub: создание PR #'+pr.number);
 for(const c of Array.isArray(commits)?commits:[]){
  const sha=safeSha(c?.sha),time=when(c?.commit?.committer?.date)||when(c?.commit?.author?.date);
  if(!sha)continue;
  const row=put(sha,'commit',time,c?.commit?.message?.split('\n')[0]);
  row.automation=readAutomationIdentity(c?.commit?.message);
  row.githubActor=typeof c?.author?.login==='string'&&c.author.login.length<=64&&/^[A-Za-z0-9_-]+(?:\[bot\])?$/.test(c.author.login)?c.author.login:null;
  emit('commit:'+sha,time,'Коммит в PR',text(c?.commit?.message?.split('\n')[0],120),sha);
 }
 for(const fp of Array.isArray(forcePushes)?forcePushes:[]){
  const at=when(fp?.at),before=safeSha(fp?.before),after=safeSha(fp?.after);
  if(before)put(before,'force-push',at);
  if(after)put(after,'force-push',at);
  if(at&&(before||after))emit('force:'+at+':'+(after||before),at,
   'HEAD переписан (force-push)',(before?.slice(0,12)||'?')+' → '+(after?.slice(0,12)||'?'),after);
 }
 const current=safeSha(pr.head.sha);
 put(current,'current',null);
 const requested=safeSha(item?.requestedHeadSha||item?.headSha);
 if(requested)put(requested,'owner-request',when(item?.createdAt));
 for(const raw of Array.isArray(ciEvents)?ciEvents:[]){
  const sha=safeSha(raw?.headSha),row=put(sha,'ci-inbox',when(raw?.sourceRunAt));
  if(!row)continue;
  const category=text(raw.category,70)||'UNKNOWN';
  const detail=text(raw.reasonCode,100)||text(raw.routeReason,100)||'Проверка классифицирована';
  const entry={runId:Number.isSafeInteger(raw.runId)?raw.runId:null,
   attempt:Number.isSafeInteger(raw.attempt)?raw.attempt:null,
   category,conclusion:text(raw.conclusion,30),reasonCode:text(raw.reasonCode,100),
   classificationStatus:text(raw.classificationStatus,60),
   routeState:text(raw.routeState,65),routeReason:text(raw.routeReason,100),
   responsibleRole:text(raw.responsibleRole,90),
   workerStarted:raw.workerStarted===true,dispatchAccepted:raw.dispatchAccepted===true,
   diagnostic:raw.diagnostic&&typeof raw.diagnostic==='object'?{
     runId:text(raw.diagnostic.runId,40),status:text(raw.diagnostic.status,35),
     executor:'openrouter',workerClaimed:raw.diagnostic.workerClaimed===true,
     modelResponseVerified:raw.diagnostic.modelResponseVerified===true,
     model:text(raw.diagnostic.model,130),
     costUsd:raw.diagnostic.modelResponseVerified===true&&raw.diagnostic.costUsd===0?0:null,
     reasonCode:text(raw.diagnostic.reasonCode,100),
     attempts:Number.isSafeInteger(raw.diagnostic.attempts)?raw.diagnostic.attempts:null,
     completedAt:when(raw.diagnostic.completedAt)
   }:null,
   recordedAt:when(raw.recordedAt),sourceRunAt:when(raw.sourceRunAt),
   url:raw.runId&&Number.isSafeInteger(raw.runId)?
    'https://github.com/andylitvinov-design/books/actions/runs/'+raw.runId:null};
  if(!row.ciEvents.some(e=>e.runId===entry.runId&&e.attempt===entry.attempt))row.ciEvents.push(entry);
  emit('ci:'+entry.runId+':'+entry.attempt,entry.recordedAt||entry.sourceRunAt,
   'Ошибка CI · '+category,detail,sha,entry.url,
   raw.conclusion==='failure'?'attention':'info');
  if(entry.routeState)emit('route:'+entry.runId+':'+entry.attempt,
   entry.recordedAt||entry.sourceRunAt,'Маршрутизация · '+entry.routeState,
   'Ответственный: '+(entry.responsibleRole||'не подтверждён')+
   '. Запуск исполнителя '+(entry.workerStarted?'подтверждён':'не подтверждён'),sha,
   entry.url,entry.workerStarted?'done':'info');
  if(entry.diagnostic)emit('diagnostic:'+entry.runId+':'+entry.attempt,
   entry.diagnostic.completedAt||entry.recordedAt,
   'AI-диагностика · '+entry.diagnostic.status,
   entry.diagnostic.modelResponseVerified?
    'Подтверждён ответ бесплатной модели '+entry.diagnostic.model+
     ' с нулевой стоимостью. Это ещё не исправляющий коммит.':
    'Диагностический исполнитель '+entry.diagnostic.status+
     '. Исправление исходного кода не подтверждено.',
   sha,entry.url,entry.diagnostic.modelResponseVerified?'done':'info');
 }
 for(const [key,rows] of Object.entries(checksBySha||{})){
  const sha=safeSha(key),head=sha&&put(sha,'github-checks');
  if(!head||!Array.isArray(rows))continue;
  for(const check of rows){
   if(check?.head_sha!==sha||typeof check.name!=='string')continue;
   if(check.name==='core-lint-types-build')head.observedHead=true;
   const id=Number.isSafeInteger(check.id)?check.id:null;
   const mapped={id,name:text(check.name,100),status:text(check.status,24),
    conclusion:githubStatus(check.conclusion),startedAt:when(check.started_at),
    finishedAt:when(check.completed_at),url:checkUrl(check.html_url)};
   if(head.checks.some(x=>id!==null&&x.id===id))continue;
   head.checks.push(mapped);
   const state=mapped.conclusion==='success'?'done':
    mapped.conclusion&&mapped.conclusion!=='skipped'?'attention':'info';
   emit('check:'+sha+':'+(id||mapped.name),mapped.finishedAt||mapped.startedAt,
    'CI · '+mapped.name, mapped.conclusion||mapped.status,sha,mapped.url,state);
  }
 }
 if(when(item?.createdAt))emit('owner-request',item.createdAt,'Заявка Commander',
  'Отдельная заявка на уже существующий PR');
 if(when(item?.firstAttemptAt))emit('watchdog',item.firstAttemptAt,'Watchdog взял заявку',
  'Это не доказательство запуска AI');
 const mergedAt=when(pr.merged_at);
 if(pr.merged===true&&mergedAt&&safeSha(pr.merge_commit_sha))emit('merge',mergedAt,
  'GitHub merge','Merge SHA '+pr.merge_commit_sha.slice(0,12),pr.merge_commit_sha);
 const all=[...heads.values()];
 for(const h of all){
  h.checks.sort((a,b)=>String(a.startedAt||'').localeCompare(String(b.startedAt||'')));
  h.ciEvents.sort((a,b)=>String(a.sourceRunAt||'').localeCompare(String(b.sourceRunAt||'')));
 }
 all.sort((a,b)=>Number(b.sha===current)-Number(a.sha===current)||
  String(b.at||'').localeCompare(String(a.at||''))||a.sha.localeCompare(b.sha));
 const openedAt=when(pr.created_at),ownerRequestedAt=when(item?.createdAt);
 const prToMergeMinutes=openedAt&&mergedAt&&Date.parse(mergedAt)>=Date.parse(openedAt)?
  Math.floor((Date.parse(mergedAt)-Date.parse(openedAt))/60000):null;
 return {schema:HEAD_HISTORY_SCHEMA,observedAt,page,pageCount,
  hasOlder:page<pageCount,hasMoreCi:ciHistoryAvailable&&!ciHistoryComplete,
  coverage:{commits:commitHistoryComplete?'page-complete':'unavailable',
   checks:checksComplete?'loaded-for-shown-shas':'partial',
   ciInbox:!ciHistoryAvailable?'unavailable':ciHistoryComplete?'page-complete':'partial',
   note:'GitHub может не сохранять все HEAD после переписывания истории; отсутствие события не означает его отсутствия.'},
  prCreatedAt:openedAt,mergedAt,prToMergeMinutes,
  ownerRequestAfterMerge:!!(ownerRequestedAt&&mergedAt&&
   Date.parse(ownerRequestedAt)>Date.parse(mergedAt)),
  currentHeadSha:current,heads:all,events:events.sort(byTime)};
}
