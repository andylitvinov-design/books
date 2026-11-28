'use strict';
/* HH_AGENT_PERFORMANCE_ISOLATED_V1: opt-in public GitHub evidence; no writes or polling. */
(function(env){
const AGENTS=["mycoach-00","mycoach-10","mycoach-20","mycoach-30","mycoach-40","mycoach-50","triage-15","merge-35","repair-45","live-05","manual-chat","UNKNOWN"],REPO="https://github.com/andylitvinov-design/books",STAGES=["PR","DIAGNOSIS","ASSIGNMENT","REPAIR","HEAD","CI","MERGE","RELEASE","LIVE"],EVENTS=["PR_CREATED","COMMIT_WRITTEN","ERROR_DETECTED","REPAIR_ASSIGNED","REPAIR_BLOCKED","CI_RESTORED","MERGE_ARMED","MERGED","DEPLOYED","LIVE_VERIFIED","STAGE_BLOCKED","STAGE_OBSERVED"],OUTCOMES=["DONE","OBSERVED","WAIT","HOLD","FAILED"];
function sha(x){return typeof x==='string'&&/^[0-9a-f]{40}$/i.test(x)?x.toLowerCase():null}
function time(x){return typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null}
function number(x){return Number.isSafeInteger(x)&&x>0&&x<=999999?x:null}
function isOwner(x){return x?.login==='andylitvinov-design'&&x.id===274943885}
function identity(s){
 if(typeof s!=='string'||s.length>100000)return null;
 const a=[...s.matchAll(/^HH-Automation: ([a-z0-9-]+)[ \t]*\r?$/gm)],b=[...s.matchAll(/^HH-Run: ([A-Za-z0-9:._-]+)[ \t]*\r?$/gm)];
 if(a.length!==1||b.length!==1)return null;
 const actor=a[0][1],run=b[0][1];
 if(!AGENTS.includes(actor)||actor==='UNKNOWN'||!run.startsWith(actor+'-')||run.length>100)return null;
 const suffix=run.slice(actor.length+1);
 if(actor==='manual-chat'?!/^[A-Za-z0-9._-]{6,80}$/.test(suffix):!/^(?:\d{8}T\d{6}(?:\.\d+)?Z|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/.test(suffix))return null;
 return {actor,run};
}
function registryPath(now=Date.now()){
 if(!Number.isFinite(now))throw Error('REGISTRY_CLOCK');
 return '/api/agent-trace-registry?since='+encodeURIComponent(new Date(now-86400000).toISOString());
}
function registryPage(rows,now){
 if(!Number.isFinite(now)||!Array.isArray(rows)||rows.length>100)return false;
 return rows.every(r=>{const t=Date.parse(r?.updated_at||r?.created_at||'');return Number.isFinite(t)&&t>=now-86400000-1000;});
}
function recentPages(count,cap=100000){
 if(!Number.isSafeInteger(count)||count<0||count>100000)return [1];
 const n=Math.min(count,cap),last=Math.max(1,Math.ceil(n/100));
 return last>1&&n%100!==0?[last-1,last]:[last];
}
function recentRows(pages,key){
 if(!Array.isArray(pages)||pages.length>2||pages.some(p=>!Array.isArray(p)||p.length>100))throw Error('PAGE_SCHEMA');
 const rows=new Map();
 for(const page of pages)for(const r of page){const k=r?.[key];if(typeof k==='string'||Number.isSafeInteger(k))rows.set(k,r);}
 return [...rows.values()].slice(-100);
}
function receipts(rows,{pr=null,registry=false,now=Date.now()}={}){
 if(!Array.isArray(rows)||rows.length>100||(!registry&&!number(pr)))return [];
 const out=[];
 for(const c of rows){
  if(!isOwner(c?.user)||!Number.isSafeInteger(c.id)||c.id<1||typeof c.body!=='string'||c.body.length>60000||time(c.created_at)===null)continue;
  const lines=c.body.split(/\r?\n/);
  for(let i=0;i+1<lines.length;i++){
   if(lines[i].trim()!=='<!-- HH_PR_TRACE_V1 -->'||lines[i+1].length>3000)continue;
   let e;try{e=JSON.parse(lines[i+1])}catch{continue}
   if(e?.schema!=='HH_PR_TRACE_V1'||!number(e.pr)||(pr!==null&&e.pr!==pr)||!STAGES.includes(e.stage)||!EVENTS.includes(e.event)||!OUTCOMES.includes(e.outcome)||!sha(e.head_sha))continue;
   const id=identity('HH-Automation: '+e.automation_id+'\nHH-Run: '+e.run_id),at=time(e.at);
   if(!id||at===null||at>now||at>time(c.created_at)+60000)continue;
   const reason=typeof e.reason_code==='string'&&/^[A-Z0-9][A-Z0-9_.:-]{0,119}$/.test(e.reason_code)?e.reason_code:null;
   if(['WAIT','HOLD','FAILED'].includes(e.outcome)&&(!reason||typeof e.next_action!=='string'||!e.next_action.trim()||e.next_action.length>240))continue;
   if(e.event==='COMMIT_WRITTEN'&&e.outcome==='DONE'&&!sha(e.commit_sha))continue;
   if(['MERGED','DEPLOYED','LIVE_VERIFIED'].includes(e.event)&&e.outcome==='DONE'&&!sha(e.merge_sha))continue;
   if(['DEPLOYED','LIVE_VERIFIED'].includes(e.event)&&e.outcome==='DONE'&&!sha(e.served_sha))continue;
   out.push({...id,pr:e.pr,stage:e.stage,event:e.event,outcome:e.outcome,at:e.at,head:sha(e.head_sha),base:sha(e.base_sha),commit:sha(e.commit_sha),merge:sha(e.merge_sha),reason,url:REPO+'/'+(registry?'issues/1419':'pull/'+e.pr)+'#issuecomment-'+c.id});
  }
 }
 return out;
}
function distinct(rows){
 const m=new Map();
 for(const r of rows){
  const key=JSON.stringify([r.pr,r.actor,r.run,r.stage,r.event,r.outcome,r.head,r.base,r.commit,r.merge,r.reason]);
  if(!m.has(key)||time(m.get(key).at)<time(r.at))m.set(key,r);
 }
 return [...m.values()].sort((a,b)=>time(b.at)-time(a.at));
}
function ledger(rows,now){
 if(!Array.isArray(rows)||rows.length>100)return null;
 const events=distinct(receipts(rows,{registry:true,now})).filter(r=>time(r.at)>=now-86400000);
 const runs=new Map(),claims=new Map(),prs=new Set();
 for(const r of events){
  prs.add(r.pr);
  if(!runs.has(r.actor))runs.set(r.actor,new Set());runs.get(r.actor).add(r.run);
  const metric=r.outcome==='OBSERVED'?'OBSERVED':['WAIT','HOLD','FAILED'].includes(r.outcome)?'BLOCKED':r.event;
  const k=JSON.stringify([metric,metric==='COMMIT_WRITTEN'?r.commit:metric==='PR_CREATED'?r.pr:['MERGED','DEPLOYED','LIVE_VERIFIED'].includes(metric)?r.pr+':'+r.merge:r.pr+':'+r.head+':'+r.stage+':'+(r.reason||''),['OBSERVED','BLOCKED'].includes(metric)?r.actor:null]);
  if(!claims.has(k))claims.set(k,{metric,actors:new Set()});claims.get(k).actors.add(r.actor);
 }
 const totals=Object.fromEntries(AGENTS.map(a=>[a,{runs:runs.get(a)?.size??0}]));
 for(const c of claims.values()){const a=c.actors.size===1?[...c.actors][0]:'UNKNOWN';totals[a][c.metric]=(totals[a][c.metric]||0)+1;}
 return {events,totals,prs:prs.size,commentCount:rows.length,capped:rows.length===100,observedAt:new Date(now).toISOString()};
}
function verifyMeta(p,n){
 return p?.number===n&&number(n)&&p.head?.repo?.full_name==='andylitvinov-design/books'&&['codex/public-book-library','codex/bootstrap-books'].includes(p.base?.ref)&&!!sha(p.head.sha)&&!!sha(p.base.sha)&&['open','closed'].includes(p.state);
}
function prReport(p,commitRows,commentRows,checkData,registryRows,now){
 if(!verifyMeta(p,p?.number))return null;
 const head=sha(p.head.sha),base=sha(p.base.sha),merge=p.merged_at?sha(p.merge_commit_sha):null;
 const own=isOwner(p.user)?identity(p.body):null;
 const events=distinct([...receipts(commentRows,{pr:p.number,now}),...receipts(registryRows,{pr:p.number,registry:true,now})]);
 const commits=new Map();
 if(Array.isArray(commitRows)&&commitRows.length<=100)for(const c of commitRows){const key=sha(c?.sha);if(key)commits.set(key,{sha:key,identity:identity(c.commit?.message)});}
 const checks=Array.isArray(checkData?.check_runs)&&checkData.check_runs.length<=100?checkData.check_runs.filter(c=>sha(c?.head_sha)===head&&typeof c.name==='string'&&Number.isSafeInteger(c.id)&&c.id>0):null;
 const coverage={commits:Array.isArray(commitRows)&&commitRows.length<=100,comments:Array.isArray(commentRows)&&commentRows.length<=100,checks:checks!==null,registry:Array.isArray(registryRows)&&registryRows.length<=100};
 const latestChecks=new Map();
 for(const c of checks||[]){const prev=latestChecks.get(c.name);if(!prev||c.id>prev.id)latestChecks.set(c.name,c);}
 const selected=[...latestChecks.values()];
 const gate=latestChecks.get('hh-merge-check');
 const active=selected.filter(c=>['queued','in_progress','pending','waiting','requested'].includes(c.status));
 const failed=selected.filter(c=>c.status==='completed'&&['failure','timed_out','action_required','startup_failure','cancelled'].includes(c.conclusion));
 let stage,reason;
 if(merge){stage='RELEASE / LIVE';reason='Merge подтверждён GitHub; публикация и функциональная LIVE-приёмка здесь не доказаны.'}
 else if(p.state==='closed'){stage='PR';reason='Закрыт без подтверждённого merge.'}
 else if(p.draft===true){stage='PR';reason='Draft — ожидается готовность PR.'}
 else if(p.mergeable===false&&p.mergeable_state==='dirty'){stage='HEAD';reason='GitHub подтверждает конфликт. Требуется проверка merge-tree.'}
 else if(gate?.status==='completed'&&gate.conclusion==='failure'){stage='CI';reason='hh-merge-check RED на текущем HEAD; причинную проверку см. в GitHub.'}
 else if(active.length){stage='CI';reason='На текущем HEAD есть выполняющиеся или ожидающие проверки.'}
 else if(failed.length){stage='CI';reason='Есть неуспешные проверки на текущем HEAD; обязательность каждой отдельно не доказана.'}
 else if(gate?.status==='completed'&&gate.conclusion==='success'){stage='MERGE';reason='hh-merge-check SUCCESS; окончательная готовность к merge зависит от защиты ветки и актуальности BASE.'}
 else{stage='UNKNOWN';reason='Недостаточно проверенных событий текущего HEAD для установления этапа.'}
 const current=events.find(e=>merge?['RELEASE','LIVE'].includes(e.stage)&&e.merge===merge:
  p.state==='open'&&e.head===head&&e.base===base&&!['RELEASE','LIVE'].includes(e.stage)&&!(gate?.conclusion==='success'&&['DIAGNOSIS','ASSIGNMENT','REPAIR','HEAD','CI'].includes(e.stage)));
 const blocker=current&&['WAIT','HOLD','FAILED'].includes(current.outcome)?current:null;
 const mergeActors=new Set(events.filter(e=>e.event==='MERGED'&&e.outcome==='DONE'&&merge&&e.merge===merge).map(e=>e.actor));
 return {number:p.number,head,base,merge,origin:own,mergeActor:mergeActors.size===1?[...mergeActors][0]:'UNKNOWN',stage,reason,blocker,events:events.slice(0,60),commits:[...commits.values()],checks:selected.filter(c=>active.includes(c)||failed.includes(c)).slice(0,25).map(c=>({name:c.name.slice(0,100),status:c.status,conclusion:c.conclusion,link:REPO+'/commit/'+head+'/checks'})),coverage,expectedCommits:Number.isSafeInteger(p.commits)?p.commits:null,expectedComments:Number.isSafeInteger(p.comments)?p.comments:null,commentCount:Array.isArray(commentRows)?commentRows.length:null,headCommitSeen:commits.has(head),checkCount:checks?.length??null,checkTotal:Number.isSafeInteger(checkData?.total_count)?checkData.total_count:null};
}

if(typeof module==='object'&&module.exports){module.exports={identity,receipts,ledger,prReport,verifyMeta,registryPath,registryPage,recentPages,recentRows};return;}
const doc=env.document;if(!doc)return;
const el=id=>doc.getElementById(id);
if(!el('agents-performance')||!el('agents-registry-refresh')||!el('agents-pr-find'))return;
const put=(id,text)=>{const e=el(id);if(e)e.textContent=text;};
const node=(tag,text)=>{const x=doc.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
const link=(url,label)=>{const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const fmt=x=>Number.isSafeInteger(x)&&x>0?String(x):'—';
const clock=x=>{try{return new Date(x).toLocaleString('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'});}catch{return '—';}};
const routes={registry:registryPath,meta:n=>'/api/verified-pr-meta/'+n,comments:n=>'/api/agent-trace-comments/'+n,commits:n=>'/api/agent-trace-commits/'+n,checks:h=>'/api/agent-trace-checks/'+h};
async function get(path){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
 try{const r=await env.fetch(path,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',headers:{Accept:'application/json'},signal:ctrl.signal});if(!r.ok)throw Error('HTTP_'+r.status);return await r.json();}finally{clearTimeout(timer);}
}
let registryRows=null,registryTime=0,registryPending=null,sequence=0;
function renderLedger(report){
 const body=el('agents-registry-rows');body.replaceChildren();
 const metrics=['runs','PR_CREATED','COMMIT_WRITTEN','ERROR_DETECTED','CI_RESTORED','MERGE_ARMED','MERGED','LIVE_VERIFIED','BLOCKED','OBSERVED'];
 for(const actor of AGENTS){const tr=node('tr'),a=report?.totals?.[actor];tr.append(node('th',actor));for(const k of metrics)tr.append(node('td',fmt(a?.[k])));body.append(tr);}
 if(!report){put('agents-registry-status','Реестр недоступен. Нет подтверждённого покрытия.');return;}
 put('agents-registry-status','Срез '+clock(report.observedAt)+' Toronto · '+report.prs+' PR · '+report.events.length+' записей за 24 ч · '+report.commentCount+' комментариев'+(report.capped?' · лимит страницы достигнут; неполная выборка':' · полученная страница полная, история запусков может быть неполной')+'.');
}
// GitHub issue comments are oldest-first; sort/direction are not supported on this endpoint.
async function readRegistry(force=false){
 const now=Date.now();
 if(!force&&Array.isArray(registryRows)&&now-registryTime<300000)return registryRows;
 if(registryPending)return registryPending;
 registryPending=(async()=>{
  try{const rows=await get(routes.registry(now));if(!registryPage(rows,now))throw Error('REGISTRY_WINDOW_UNVERIFIED');const report=ledger(rows,now);if(!report)throw Error('REGISTRY_SCHEMA');registryRows=rows;registryTime=now;renderLedger(report);return rows;}
  catch{registryRows=null;registryTime=0;renderLedger(null);return null;}
  finally{registryPending=null;}
 })();
 return registryPending;
}
async function refreshRegistry(){
 const btn=el('agents-registry-refresh');btn.disabled=true;put('agents-registry-status','Читаю существующий реестр #1419…');
 try{await readRegistry(true);}finally{btn.disabled=false;}
}
async function readRecent(path,count,key,cap){
 const pages=recentPages(count,cap);
 return recentRows(await Promise.all(pages.map(page=>get(path+'?page='+page))),key);
}
function renderPr(r){
 const root=el('agents-pr-result');root.replaceChildren();
 if(!r){root.append(node('p','Точный PR недоступен или HEAD изменился во время запроса. Повторите проверку.'));return;}
 const title=node('h3','PR #'+r.number+' · '+r.stage);root.append(title,node('p',r.reason),node('p','HEAD '+r.head.slice(0,12)+' · BASE '+r.base.slice(0,12)),node('p','Создатель: '+(r.origin?.actor||'UNKNOWN')+(r.origin?.run?' · '+r.origin.run:'')));
 if(r.merge){root.append(node('p','Merge '+r.merge.slice(0,12)+' · заявленный инициатор: '+r.mergeActor));}
 if(r.blocker){const p=node('p','Актуальная запись агента: '+r.blocker.actor+' · '+r.blocker.stage+' · '+r.blocker.reason+' · '+clock(r.blocker.at)+' ');p.append(link(r.blocker.url,'Причина / следующий шаг'));root.append(p);}
 else root.append(node('p','Подтверждённой актуальной записи блокера агента нет.'));
 const check=node('details');check.append(node('summary','Неуспешные / активные проверки ('+r.checks.length+')'));
 for(const c of r.checks){const p=node('p',c.name+' · '+c.status+' '+(c.conclusion||'')+' ');p.append(link(c.link,'GitHub'));check.append(p);}
 root.append(check);
 const commits=node('details');commits.append(node('summary','Коммиты: '+r.commits.length+' / '+(r.expectedCommits??'—')+(r.headCommitSeen?' · текущий HEAD прочитан':' · текущий HEAD вне выборки')));
 for(const c of r.commits){const p=node('p',(c.identity?.actor||'UNKNOWN')+' · '+c.sha.slice(0,12)+(c.identity?.run?' · '+c.identity.run:'')+' ');p.append(link(REPO+'/commit/'+c.sha,'GitHub'));commits.append(p);}root.append(commits);
 const history=node('details');history.append(node('summary','Действия и наблюдения: '+r.events.length));
 for(const e of r.events){const p=node('p',e.actor+' · '+e.stage+' · '+e.event+' · '+(e.outcome==='OBSERVED'?'наблюдение чужого результата':e.outcome==='DONE'?'заявленное действие':e.outcome)+(e.reason?' · '+e.reason:'')+' · '+clock(e.at)+' ');p.append(link(e.url,'Источник'));history.append(p);}root.append(history);
 root.append(node('p','Покрытие: '+Object.entries(r.coverage).map(([k,v])=>k+' '+(v?'прочитано':'—')).join(' · ')+'; checks '+(r.checkCount??'—')+' / '+(r.checkTotal??'—')+'; комментарии '+(r.commentCount??'—')+' / '+(r.expectedComments??'—')+'. До 100 показанных записей на источник; API PR commits ограничен 250. Маркировка автора не является криптографической подписью.'));
 root.append(link(REPO+'/pull/'+r.number,'Открыть PR в GitHub'),node('span',' · '),link('https://holistichouse.vercel.app/commander/pr','Owner-only Commander: полная приёмка'));
}
async function loadPr(){
 const raw=el('agents-pr-number').value.trim();if(!/^\d{1,6}$/.test(raw)||!number(Number(raw))){put('agents-pr-status','Введите корректный номер PR.');return;}
 const seq=++sequence,n=Number(raw),btn=el('agents-pr-find');btn.disabled=true;put('agents-pr-status','Проверяю точный HEAD, комментарии, коммиты и CI…');
 try{
  const p=await get(routes.meta(n));if(!verifyMeta(p,n))throw Error('PR_SCOPE');
  const parts=await Promise.allSettled([readRecent(routes.commits(n),p.commits,'sha',250),readRecent(routes.comments(n),p.comments,'id'),get(routes.checks(sha(p.head.sha))),readRegistry()]);
  const final=await get(routes.meta(n));if(!verifyMeta(final,n)||final.head.sha!==p.head.sha||final.base.sha!==p.base.sha||final.state!==p.state||final.merge_commit_sha!==p.merge_commit_sha)throw Error('HEAD_MOVED');
  if(seq!==sequence)return;
  const rows=parts.map(x=>x.status==='fulfilled'?x.value:null);
  renderPr(prReport(final,rows[0],rows[1],rows[2],rows[3],Date.now()));
  put('agents-pr-status','Срез GitHub '+clock(new Date().toISOString())+' Toronto. Без токена; неполная история отмечена.');
 }catch{if(seq===sequence){renderPr(null);put('agents-pr-status','Нет достаточных данных GitHub (лимит, смена HEAD или ошибка чтения).');}}finally{if(seq===sequence)btn.disabled=false;}
}
el('agents-registry-refresh').addEventListener('click',refreshRegistry);
el('agents-pr-find').addEventListener('click',loadPr);
renderLedger(null);put('agents-registry-status','Нажмите «Обновить 24 ч». Фонового опроса нет.');

})(typeof window!=='undefined'?window:{});
