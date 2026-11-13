// HH_AGENT_MEMORY_DIGEST_V1. Structured first-party receipts only; never ingest chat prose.
// Pure deterministic engine; works in Deno Edge and Node without a model or worker.
export const DIGEST_SCHEMA = 'HH_AGENT_MEMORY_DIGEST_V1';
const SHA = /^[a-f0-9]{40}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[a-z0-9][a-z0-9-]{0,80}$/;
const EVENT = /^[a-z0-9:_-]{6,150}$/i;
const REASON = /^[A-Z][A-Z0-9_]{2,79}$/;
const TYPES = Object.freeze({
 RUN_QUEUED:['unknown','Поручение записано в очередь; запуск исполнителя не доказан','run'],
 RUN_BLOCKED:['blocked','Запуск исполнителя заблокирован','run'],
 RUN_COMPLETED:['completed','Подтверждено завершение ответа агента; изменения кода и LIVE не доказаны','run'],
 RUN_FAILED:['blocked','Запуск исполнителя завершился ошибкой','run'],
 RUN_CANCELLED:['blocked','Запуск исполнителя отменён','run'],
 CI_FAILED:['blocked','GitHub CI завершился ошибкой для указанного SHA','github_ci'],
 CI_PASSED:['working','GitHub CI прошёл для указанного SHA; merge и LIVE не доказаны','github_ci'],
 CI_ROUTE:['blocked','Маршрут восстановления зафиксирован; запуск worker не доказан','github_ci'],
 PR_OPEN:['working','PR открыт; CI, merge и LIVE требуют отдельной проверки','github_pr'],
 PR_MERGED:['working','PR объединён; production LIVE не подтверждён','github_pr'],
 DEPLOY_READY:['working','Deployment READY; проверка LIVE не подтверждена','deployment'],
 LIVE_VERIFIED:['completed','Production endpoint проверен отдельным достоверным подтверждением','live'],
});
const TRUSTED = Object.freeze({
 RUN_QUEUED:'commander-run',RUN_BLOCKED:'commander-run',RUN_COMPLETED:'commander-run',
 RUN_FAILED:'commander-run',RUN_CANCELLED:'commander-run',
 CI_FAILED:'github-oidc',CI_PASSED:'github-oidc',CI_ROUTE:'github-oidc',
 PR_OPEN:'github-api',PR_MERGED:'github-api',DEPLOY_READY:'vercel-api',LIVE_VERIFIED:'live-smoke',
});
const limit = (s,n) => String(s ?? '').slice(0,n);
const validIso = v => typeof v==='string' && v.length<=40 && !Number.isNaN(Date.parse(v)) && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(v);
const allowedUrl = (raw,type) => {
 if(typeof raw!=='string'||raw.length>300) return null;
 if(type==='run' && /^commander:run:[a-f0-9-]{36}$/i.test(raw))return raw;
 try {
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)return null;
  if(type==='github_ci' && u.hostname==='github.com' && new RegExp('^/andylitvinov-design/books/actions/runs/[1-9][0-9]{0,15}(?:/job/[0-9]+)?$').test(u.pathname)) return u.href;
  if(type==='github_pr' && u.hostname==='github.com' && new RegExp('^/andylitvinov-design/books/pull/[1-9][0-9]{0,8}$').test(u.pathname)) return u.href;
  if((type==='deployment'||type==='live') && (u.hostname==='vercel.com'||u.hostname==='holistichouse.vercel.app'||u.hostname==='holistic-house-pr-monitor.vercel.app')) return u.href;
 } catch {}
 return null;
};
async function sha256(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
function uuidFromHash(h){return h.slice(0,8)+'-'+h.slice(8,12)+'-8'+h.slice(13,16)+'-'+((parseInt(h[16],16)&3)|8).toString(16)+h.slice(17,20)+'-'+h.slice(20,32)}
function identity(v){return typeof v==='string'&&UUID.test(v)?v.toLowerCase():null}
// The Edge adapter supplies trusted sourceSystem, source verification and owner/project from its ACL.
// No arbitrary tool-output text is accepted or reflected, even if an event claims verification.
export function normalizeAgentActivityEvent(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(TYPES,input.eventType))throw Error('INVALID_DIGEST_EVENT');
 const eventId=limit(input.eventId,151),projectKey=input.projectKey,agentId=limit(input.agentId,80);
 if(!EVENT.test(eventId)||!KEY.test(projectKey||'')||!/^[a-z][a-z0-9:_-]{0,79}$/.test(agentId))throw Error('INVALID_DIGEST_SCOPE');
 if(!validIso(input.observedAt))throw Error('INVALID_DIGEST_TIME');
 const taskId=input.taskId==null?null:identity(input.taskId),chatId=input.chatId==null?null:identity(input.chatId),runId=input.runId==null?null:identity(input.runId);
 if((input.taskId!=null&&!taskId)||(input.chatId!=null&&!chatId)||(input.runId!=null&&!runId)||(!chatId&&!taskId))throw Error('INVALID_DIGEST_LINEAGE');
 const sourceSha=input.sourceSha==null?null:limit(input.sourceSha,41);
 const expectedHeadSha=input.expectedHeadSha==null?null:limit(input.expectedHeadSha,41);
 if((sourceSha&&!SHA.test(sourceSha))||(expectedHeadSha&&!SHA.test(expectedHeadSha)))throw Error('INVALID_DIGEST_SHA');
 const evidenceType=TYPES[input.eventType][2];
 const sourceRef=allowedUrl(input.sourceRef,evidenceType);
 const trust=TRUSTED[input.eventType]===input.sourceSystem && input.sourceVerification==='verified';
 const fresh=!expectedHeadSha||(sourceSha!==null&&sourceSha===expectedHeadSha);
 const verified=trust&&fresh&&!!sourceRef&&(evidenceType==='run'||(!!sourceSha&&evidenceType!=='live')||evidenceType==='live');
 const reasonCode=typeof input.reasonCode==='string'&&REASON.test(input.reasonCode)?input.reasonCode:null;
 return Object.freeze({eventId,projectKey,taskId,chatId,runId,agentId,
  eventType:input.eventType,observedAt:input.observedAt,sourceSystem:TRUSTED[input.eventType],
  sourceSha,expectedHeadSha,sourceRef,verified,stale:trust&&!fresh,reasonCode});
}
export async function buildAgentDigest(events,{ownerId}={}){
 if(typeof ownerId!=='string'||!UUID.test(ownerId)||!Array.isArray(events)||!events.length||events.length>30)throw Error('INVALID_DIGEST_INPUT');
 const all=events.map(normalizeAgentActivityEvent);
 const base=all[0];
 if(all.some(e=>e.projectKey!==base.projectKey||e.taskId!==base.taskId||e.chatId!==base.chatId||e.runId!==base.runId||e.agentId!==base.agentId))throw Error('DIGEST_SCOPE_MISMATCH');
 const byId=new Map();
 for(const e of all){
  const prior=byId.get(e.eventId);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(e))throw Error('DIGEST_EVENT_ID_COLLISION');
  byId.set(e.eventId,e);
 }
 const sorted=[...byId.values()].sort((a,b)=>a.observedAt.localeCompare(b.observedAt)||a.eventId.localeCompare(b.eventId));
 const verified=sorted.filter(e=>e.verified&&!e.stale);
 const last=(verified.length?verified:sorted).at(-1);
 const workDone=sorted.slice(-3).map(e=>TYPES[e.eventType][1]);
 const evidence=sorted.filter(e=>e.sourceRef).slice(-3).map(e=>({type:TYPES[e.eventType][2],url:e.sourceRef,
  ...(e.sourceSha?{sha:e.sourceSha}:{}),verifiedAt:e.observedAt,proof:e.verified?'verified':'unverified'}));
 const verification=verified.length===sorted.length?'verified':verified.length?'partial':'unverified';
 const status=last.verified?TYPES[last.eventType][0]:(last.eventType==='RUN_BLOCKED'||last.eventType==='RUN_FAILED'||last.eventType==='CI_FAILED'||last.eventType==='CI_ROUTE'?'blocked':'unknown');
 const contextHash=await sha256(JSON.stringify(sorted));
 const digestId=uuidFromHash(await sha256(['HH_AGENT_MEMORY_DIGEST_V1',ownerId,base.projectKey,base.taskId||'',base.chatId||'',base.runId||'',contextHash].join(':')));
 const result=last.verified?TYPES[last.eventType][1]:
   (last.stale?'Источник относится к устаревшему PR SHA; требуется повторная проверка':
    'NO_EVIDENCE: действие зафиксировано, но его результат не подтверждён');
 const blockers=sorted.filter(e=>e.reasonCode&&(e.eventType.includes('BLOCKED')||e.eventType.includes('FAILED')||e.eventType==='CI_ROUTE')).slice(-3).map(e=>e.reasonCode);
 const nextAction=last.stale?'Перепроверить PR HEAD и CI на актуальном SHA':
  status==='blocked'?'Проверить причину блокировки и актуальные подтверждения':
  last.eventType==='LIVE_VERIFIED'?'Сохранить подтверждение LIVE и проверить отсутствие регрессий':
  'Проверить текущий HEAD, CI и deployment перед следующим действием';
 return Object.freeze({schema:DIGEST_SCHEMA,digestId,projectKey:base.projectKey,taskId:base.taskId,
  chatId:base.chatId,runId:base.runId,agentId:base.agentId,coveredUntil:last.observedAt,status,
  verification,workDone,result,decisions:[],blockers,nextAction,evidence,
  sourceEventIds:sorted.map(e=>e.eventId).slice(-30),contextHash,revision:1});
}
// Strict project + lineage matching. A linked PR hint is never enough for cross-project recall.
export function selectDigestsForCapsule(digests,{projectKey,taskId=null,chatId=null,prNumbers=[],limit:count=2,maxChars=1650}={}){
 if(!KEY.test(projectKey||''))return [];
 const prs=new Set(Array.isArray(prNumbers)?prNumbers.filter(n=>Number.isInteger(n)&&n>0&&n<1e8).slice(0,8):[]);
 const matched=(Array.isArray(digests)?digests:[]).filter(d=>d&&d.schema===DIGEST_SCHEMA&&d.projectKey===projectKey&&
  (taskId&&d.taskId===taskId||chatId&&d.chatId===chatId||d.evidence?.some(e=>{
    if(e.type!=='github_pr')return false;const n=Number(String(e.url||'').match(new RegExp('/pull/([0-9]+)$'))?.[1]);return prs.has(n);
  })));
 matched.sort((a,b)=>(Number(b.verification==='verified')-Number(a.verification==='verified'))||String(b.coveredUntil).localeCompare(String(a.coveredUntil)));
 let chars=0;const result=[];
 for(const d of matched){if(result.length>=Math.min(3,Math.max(0,count)))break;
  const e=(d.evidence||[]).find(v=>v.proof==='verified')||(d.evidence||[])[0];
  const value={digestId:d.digestId,status:d.status,verification:d.verification,coveredUntil:d.coveredUntil,
   result:limit(d.result,180),nextAction:limit(d.nextAction,130),
   ...(e?{proof:{type:e.type,url:e.url,sha:e.sha||null,verifiedAt:e.verifiedAt,proof:e.proof}}:{})};
  const size=JSON.stringify(value).length;
  if(chars+size>Math.min(1800,Math.max(0,maxChars)))continue;
  chars+=size;result.push(value);
 }
 return result;
}
// Candidate only: never automatically write Skills, AGENTS.md or public Brain.
export function proposedLessons(digests){
 const groups=new Map();
 for(const d of Array.isArray(digests)?digests:[]){
  if(d?.schema!==DIGEST_SCHEMA||d.verification!=='verified')continue;
  for(const reason of d.blockers||[]){
   if(!REASON.test(reason))continue;
   const key=d.projectKey+':'+reason;
   if(!groups.has(key))groups.set(key,new Map());
   const proof=(d.evidence||[]).find(e=>e.proof==='verified'&&e.sha);
   if(proof)groups.get(key).set(proof.sha,{reason,projectKey:d.projectKey,sha:proof.sha,digestId:d.digestId});
  }
 }
 return [...groups.entries()].filter(([,items])=>items.size>=2).map(([key,items])=>({
  key,occurrences:items.size,status:'CANDIDATE_REVIEW_ONLY',
  evidence:[...items.values()].slice(0,5).map(x=>({digestId:x.digestId,sha:x.sha})),
  nextAction:'Review under AI Projects Brain Save → Apply → Check → Prune; do not auto-activate.'
 }));
}
