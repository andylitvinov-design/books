'use strict';
/* HH_PR_RECOMMENDATIONS_V1
 * Read-only five-action brief from the existing Control Tower snapshot.
 * One GET on page open + explicit refresh only; no polling, CI or dispatch.
 */
(function(root){
 const SOURCE='https://github.com/andylitvinov-design/books/issues/3128';
 const valid=n=>Number.isSafeInteger(n)&&n>=0;
 const stamp=s=>{const n=Date.parse(s||'');return Number.isFinite(n)?n:null;};

 function derive(data,now){
  now=Number.isFinite(now)?now:Date.now();
  if(!data||data.schema!=='HH_CONTROL_DISPATCH_METRICS_V1')throw Error('INVALID_CONTROL_TOWER_SCHEMA');
  const sample=data.watchdog_sample&&data.watchdog_sample.scope==='BOUNDED_DEEP_INSPECTION'?data.watchdog_sample:null;
  let checked=sample?stamp(sample.checked_at):stamp(data.checked_at);
  if(checked!==null&&checked>now+60000)checked=null;
  const age=checked===null?null:Math.max(0,Math.floor((now-checked)/60000));
  const freshness=age===null?'unknown':age<=15?'fresh':age<=75?'delayed':'stale';
  const counts=data.counts||{};
  const n=v=>valid(v)?String(v):'UNKNOWN';
  const scope=sample&&valid(sample.inspected)?'bounded Watchdog sample '+sample.inspected+' PR':'bounded sample unverified';
  const runUrl=typeof data.run_url==='string'&&
   /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/[1-9][0-9]{0,19}$/.test(data.run_url)?data.run_url:null;
  const delivery=/^[A-Z_]{2,50}$/.test(String(data.delivery_status||''))?data.delivery_status:'UNKNOWN';
  const reason=/^[A-Z0-9_:\- ]{1,150}$/.test(String(data.reason||''))?data.reason:'UNKNOWN';
  const blocked=Object.entries(data.blocked_reasons||{}).filter(([code,value])=>
   /^[A-Z][A-Z0-9_]{0,79}$/.test(code)&&valid(value)&&value>0)
   .sort((a,b)=>b[1]-a[1]).slice(0,3)
   .map(([code,value])=>code+'='+value).join(', ')||'UNKNOWN';
  const snapshot=checked===null?'time UNKNOWN':new Date(checked).toISOString();
  const evidence=runUrl||SOURCE;
  const common='REPO: andylitvinov-design/books. CONTROL BASE: codex/bootstrap-books; SITE BASE: codex/public-book-library. '+
   'Before changing anything, read GLOBAL_PR_ONE_PUBLISH_V1 and docs/operations/PR_AUTOMATION_CANONICAL_V1.md. '+
   'Do not bypass required exact-HEAD Core, Specialist, Guard, reviewer/lease, privacy/consent/payment or branch protection. '+
   'Make one cohesive, tested HEAD; MERGED is not LIVE. Do not add paid services, polling, new CI waves or no-op reruns.';
  const items=[];
  function add(id,rank,priority,confidence,title,signal,owner,verify,fix,tests,done){
   const prompt=[
    '/goal '+title,
    'КОНТЕКСТ: '+common,
    'ОПОРНЫЕ ДАННЫЕ: '+signal+'; '+scope+'; checked_at='+snapshot+'; freshness='+freshness.toUpperCase()+'.',
    'ЛОГИ / EVIDENCE: '+SOURCE+(runUrl?' ; '+runUrl:'')+'. В публичном агрегате нет полного списка PR/HEAD и job stack traces.',
    'ШАГ 1 — ПРОВЕРИТЬ: '+verify,
    'ШАГ 2 — ИСПРАВИТЬ: '+fix,
    'TEST PLAN: '+tests,
    'ACCEPTANCE: '+done,
    'ОТЧЁТ: PR URL, текущий HEAD SHA, evidence URLs, root cause, assigned owner/lease, executed tests, CI status, merge SHA и независимый Vercel LIVE/smoke receipt либо NOT_VERIFIED.'
   ].join('\n');
   items.push({id,rank,priority,confidence,title,signal,owner,precondition:verify,prompt,evidence,runUrl});
  }
  const candidates=valid(counts.candidates)?counts.candidates:null;
  const accepted=valid(counts.dispatch_requests_accepted)?counts.dispatch_requests_accepted:null;
  const started=valid(counts.worker_dispatches)?counts.worker_dispatches:null;
  const handoffBlocked=/BLOCKED|FAILED|REJECTED/.test(delivery)||
   /CAPACITY_UNVERIFIED|INVALID_RUN_INVENTORY/.test(reason)||
   (candidates!==null&&candidates>0&&accepted===0);
  if(handoffBlocked||(accepted!==null&&started!==null&&accepted>0&&started===0)){
   const signal='delivery='+delivery+'; reason='+reason+'; candidates='+n(candidates)+
    '; dispatch_accepted='+n(accepted)+'; signed_runner_started='+n(started)+'; blocked_reasons='+blocked;
   add('handoff',120,'P0','AUTOMATION_RECEIPT','Восстановить Dispatcher → Repair Worker',signal,':10 Triage Router / Dispatcher',
    'Открыть указанный workflow run, проверить первый failed/blocked job, run inventory и точный reason_code. '+
     'Сопоставить текущие task_id → PR/HEAD → lease → dispatch receipt → signed RUNNER_STARTED; '+
     'accepted и started относятся к разным состояниям и не являются одной когортой. Проверить права и лимиты прежде чем запускать.',
    'Исправить доказанную первопричину состояния '+reason+' в существующем маршруте capacity/inventory/dispatcher, '+
     'восстановить атомарный handoff только для безопасных действующих задач. Сохранить идемпотентность, owner lease, exact HEAD, '+
     'terminal SOURCE_PUBLISHED / NO_SOURCE / SUPERSEDED receipts и адресное логирование без токенов.',
    'Существующие tests Dispatcher/Worker: capacity unavailable, stale inventory, 0 accepted, accepted without runner, '+
     'RUNNER_STARTED without source commit, superseded HEAD, duplicate task claim.',
    'Новый подтверждённый dispatch receipt и подписанный RUNNER_STARTED для допустимой задачи; source SHA readback, '+
     'обязательная CI и отдельный LIVE proof. При блокировке — точная причина и next owner; не выдавать HTTP 2xx за исполнение.');
  }
  const core=sample&&valid(sample.core_failures)?sample.core_failures:null;
  if(core!==null&&core>0){
   const signal='Core failures='+core+' / '+scope;
   add('core',110,'P0','CONFIRMED_BOUNDED_SAMPLE','Устранить первопричины красного Core CI',signal,':10 classifier → :35 source owner',
    'Для каждого реально затронутого PR прочитать current HEAD, exact workflow_run/job/failed step и классификацию '+
     'HH_CI_ERROR_CLASSIFICATION_V1; исключить stale SHA, manual/hold/security blockers и конкурирующие lease. '+
     'Публичный агрегат не содержит индивидуальных ошибок.',
    'По первому причинному failed step создать/проверить единственную привязанную задачу с ответственным. '+
     'Исправить исходный source, а не накручивать workflow rerun. До публикации собрать tests/patch; опубликовать '+
     'один проверенный HEAD с регрессией и остановить параллельные писатели.',
    'Повторить локальный целевой failing test, затем защищённые Core, применимые Specialist/Guard на одном новом SHA.',
    'Root cause и связь task→owner→commit подтверждены, exact-head required checks PASS, PR merge допустим; '+
     'нет no-op wake, повторной волны без причины или фиктивной отметки LIVE.');
  }
  const conflicts=sample&&valid(sample.merge_conflicts)?sample.merge_conflicts:null;
  if(conflicts!==null&&conflicts>0){
   const signal='Verified merge conflicts='+conflicts+' / '+scope+
    (blocked.includes('MANUAL_CONFLICT_PROBE_NOT_DIRTY')?'; label false-positive probe: '+blocked:'');
   add('conflicts',100,'P1','CONFIRMED_BOUNDED_SAMPLE','Разрешить только реальные merge-tree конфликты',signal,':45 Conflict Repair',
    'Сверить список затронутых PR по текущим GitHub mergeability/merge-tree и source/base HEAD. '+
     'Метка conflict сама по себе не доказывает dirty merge; проверить, нет ли false-positive '+
     'MANUAL_CONFLICT_PROBE_NOT_DIRTY. Выбрать одну свободную owner lease.',
    'Выполнить адресный семантический three-way merge затронутых файлов с сохранением production '+
     'контрактов. Если merge-tree clean, только зафиксировать correct state без rewrite. '+
     'Не делать force-push, ours/theirs вслепую, бессмысленный rebase.',
    'Targeted conflict reproduction + профильные regression tests; затем exact-HEAD Core/Specialist/Guard.',
    'Для выбранного PR конфликт реально исчез, проверенные файлы целы, signed source SHA подтверждён, '+
     'required gates/ревью соблюдены; дальнейшее merge→LIVE проверено независимо.');
  }
  const specialist=sample&&valid(sample.specialist_failures)?sample.specialist_failures:null;
  const holds=sample&&valid(sample.specialist_policy_holds)?sample.specialist_policy_holds:null;
  if((specialist!==null&&specialist>0)||(holds!==null&&holds>0)){
   const signal='Specialist failed='+n(specialist)+'; policy holds='+n(holds)+' / '+scope;
   add('specialist',90,'P1','CONFIRMED_BOUNDED_SAMPLE','Разделить Specialist failure и policy hold',signal,':10 classifier → Specialist reviewer',
    'Открыть exact-HEAD Specialist job logs, зафиксировать failed test и причину. Отделить test failure '+
     'от защищённых security/privacy/consent/payment policy holds; владелец и lease обязательны.',
    'Технический failing Specialist тест исправить в source с минимальной регрессией. '+
     'Policy hold передать защищённому reviewer и не снимать автоматически. Не подавлять checks ради merge.',
    'Фокусный Specialist test, privacy/security/consent gate там, где затронут, и protected required checks.',
    'Каждый случай либо получил verified source fix с зелёными проверками, либо документирован как manual hold '+
     'с ответственным и причиной; ложного PASS нет.');
  }
  const wake=data.ci_wake_handoff;
  if(wake&&wake.status!=='UNVERIFIED'&&valid(wake.observed_tasks)&&wake.observed_tasks>0){
   const signal='CI wake tasks='+wake.observed_tasks+'; status='+wake.status;
   add('wake',85,'P1','SIGNED_BOUNDED_SAMPLE','Сократить путь task claim → CI wake',signal,':10 Dispatcher → existing Watchdog',
    'Сверить signed receipts reserved→claimed→wake→outcome по одному exact task, измерить p50/p95 по имеющимся временам. '+
     'Не выводить 0 или глобальную latency из пустой выборки.',
    'Устранить подтверждённую потерю wake или зависший claim в существующих guards, без новых triggers. '+
     'Сохранить no-duplicate CI и защиту от stale source SHA.',
    'Existing wake/claim receipt tests: missing claim, no wake, stale task, duplicate wake, runner missing.',
    'Все переходы имеют точные квитанции и timestamps; повторный CI не запускается без объективного основания.');
  }
  // Do not manufacture a confirmed blocker when the bounded snapshot lacks one.
  if(items.length<3){
   add('merge-gate',50,'P1','NEEDS_JOB_LEVEL_EVIDENCE','Проверить green CI → protected merge', 'Individual green→merge durations are not supplied by this feed.',
    ':30 Native Auto-merge',
    'На текущем HEAD для выбранных открытых PR собрать timestamp последнего required GREEN, active lease, '+
     'review, mergeable status, protection; не считать label и старый зелёный run подтверждением.',
    'Если доказан реальный gate bottleneck, исправить существующий auto-merge eligibility/receipt path '+
     'без bypass, лишнего CI wake и изменения green HEAD.',
    'Existing merge-gate decision tests: clean green, stale green, pending review, hold, parent stack, unknown lease.',
    'Есть точный gate/merge receipt и измеренный интервал на одной когорте; false merge and skipped checks = 0.');
  }
  if(items.length<3){
   add('live',40,'P1','NEEDS_DEPLOY_EVIDENCE','Подтвердить merge → Vercel LIVE', 'GitHub merged/READY by itself does not establish LIVE.',
    ':00 Production LIVE Acceptance',
    'Для merged website PR сверить merge SHA и ancestry на codex/public-book-library с фактически обслуживаемым '+
     'Vercel alias; определить требуемый functional smoke, не смешивать control branch с production.',
    'Устранить только документированный deploy/smoke blocker; сохранить полное source manifest, '+
     'существующие API и откат, не выкладывать partial archive.',
    'Production alias readback + SHA/ancestry proof + user-flow smoke for the changed feature.',
    'Для каждого проверенного PR есть MERGED+LIVE_VERIFIED либо отдельный честный AWAITING_SMOKE с reason.');
  }
  if(items.length<3){
   add('coverage',30,'P1','NEEDS_MORE_EVIDENCE','Уточнить stage evidence без повторных CI', 'Not all PR stage timestamps exist in the public feed.',
    ':20 Optimizer Analysis',
    'Сопоставить имеющиеся full-open inventory, bounded Watchdog sample и matching created+closed cohorts. '+
     'Не складывать пересекающиеся populations и не считать first-seen настоящим transition_time.',
    'Записать недостающие event timestamp coverage в существующий HH_CURRENT snapshot и '+
     'предложить конкретный low-cost bottleneck только при подтверждении логом.',
    'Validation of time scope, timestamp coverage and non-overlapping denominator.',
    'Каждая рекомендованная задержка подтверждена timestamp pairs из одной когорты.');
  }
  items.sort((a,b)=>b.rank-a.rank);
  return {generatedAt:data.generated_at||null,checkedAt:sample?.checked_at||data.checked_at||null,
   ageMinutes:age,freshness,source:SOURCE,runUrl,
   recommendations:items.slice(0,3),
   sample:{inspected:sample&&valid(sample.inspected)?sample.inspected:null,core,conflicts,specialist,holds},
   coverage:'BOUNDED_SAMPLE_NOT_ALL_OPEN_PRS'};
 }

 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
 function safeHref(u){return typeof u==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:issues\/\d+|pull\/\d+|actions\/runs\/\d+(?:\/job\/\d+)?)$/.test(u)?u:null;}

 function mount(){
  if(typeof document==='undefined')return false;
  if(document.getElementById('hh-pr-recommendations'))return true;
  const main=document.querySelector('main.wrap')||document.querySelector('main');
  if(!main)return false;
  const box=el('section','hh-pr-recommendations');box.id='hh-pr-recommendations';
  box.setAttribute('aria-label','Три технические рекомендации для ускорения PR → LIVE');
  const header=el('div','hh-pr-rec-head');
  const title=el('div');
  title.append(el('h2','','Рекомендации · ТОП-3'),
   el('p','hh-pr-rec-intro','По Watchdog / Control Tower. Готовые технические промпты для Agents Director.'));
  const refresh=el('button','hh-pr-rec-refresh','Обновить');refresh.type='button';
  const meta=el('p','hh-pr-rec-meta','Читаю последний опубликованный снимок проверок…');
  meta.setAttribute('role','status');
  const list=el('div','hh-pr-rec-list');
  const footer=el('p','hh-pr-rec-footer',
   'Источник: публичный ограниченный Watchdog sample и запись автоматизации. '+
   'Логи отдельных jobs и HEAD нужно перепроверять. Открытие задачи не запускает Worker.');
  header.append(title,refresh);box.append(header,meta,list,footer);
  function place(){
   const chart=document.getElementById('hh-pr-top-graphs');
   const speed=document.getElementById('hh-pr-merge-speed');
   const anchor=chart?.parentElement===main?chart:
    speed?.parentElement===main?speed:null;
   if(anchor){
    if(box.parentElement!==main||anchor.nextElementSibling!==box)
      main.insertBefore(box,anchor.nextSibling);
   }else if(box.parentElement!==main)main.append(box);
  }
  place();
  const observer=typeof MutationObserver==='function'?new MutationObserver(place):null;
  if(observer)observer.observe(main,{childList:true});
  let busy=false;
  async function copyPrompt(value,status){
   try{
    if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(value);
    else {
     const area=el('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';
     document.body.append(area);area.select();
     if(!document.execCommand('copy'))throw Error('NO_CLIPBOARD');
     area.remove();
    }
    status.textContent='Промпт скопирован. Можно отправить исполнителю.';
   }catch(_){status.textContent='Копирование заблокировано — выделите текст промпта.';}
  }
  function openEditor(rec,status){
   const packet={raw:rec.title+'. Выполнить техническое задание из промпта ниже.',
    fullPrompt:rec.prompt,relatedPr:[]};
   if(root&&root.HHCommanderTransfer?.begin){
    root.HHCommanderTransfer.begin(packet,status);return;
   }
   try{
    const src=packet.raw.slice(0,2500);
    sessionStorage.setItem('hh.commander.handoff.v2',JSON.stringify({
     version:2,at:Date.now(),raw:src,fullPrompt:rec.prompt.slice(0,15000),
     relatedPr:[]}));
    window.location.assign('/task-editor.html');
   }catch(_){status.textContent='Нет защищённой передачи. Скопируйте промпт и откройте /task-editor.html.';}
  }
  async function load(){
   if(busy)return;busy=true;refresh.disabled=true;meta.textContent='Сверяю последний snapshot…';
   try{
    const response=await fetch('/api/control-tower-stats',{
     cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const result=derive(await response.json());
    list.replaceChildren();
    for(const [index,rec] of result.recommendations.entries()){
     const card=el('article','hh-pr-rec-card');
     const top=el('div','hh-pr-rec-top');
     top.append(el('span','hh-pr-rec-priority',String(index+1)+' · '+rec.priority),
      el('span','hh-pr-rec-confidence',rec.confidence));
     card.append(top,el('h3','',rec.title),el('p','hh-pr-rec-signal',rec.signal),
      el('p','hh-pr-rec-owner','Владелец: '+rec.owner));
     const details=el('details','hh-pr-rec-details');
     const summary=el('summary','','Технический промпт · проверить / исправить / принять');
     const prompt=el('pre','hh-pr-rec-prompt',rec.prompt);
     details.append(summary,prompt);card.append(details);
     const actions=el('div','hh-pr-rec-actions');
     const copy=el('button','hh-pr-rec-copy','Копировать промпт');copy.type='button';
     const send=el('button','hh-pr-rec-send','В задачу');send.type='button';
     const status=el('p','hh-pr-rec-status','');status.setAttribute('role','status');
     copy.addEventListener('click',()=>{details.open=true;void copyPrompt(rec.prompt,status);});
     send.addEventListener('click',()=>openEditor(rec,status));
     actions.append(copy,send);card.append(actions,status);
     for(const [href,label] of [[rec.evidence,'Логи / run ↗'],[SOURCE,'Снимок Watchdog ↗']]){
      const url=safeHref(href);
      if(url&&!card.querySelector('a[href="'+url+'"]')){
       const a=el('a','hh-pr-rec-evidence',label);a.href=url;a.target='_blank';
       a.rel='noopener noreferrer';card.append(a);
      }
     }
     list.append(card);
    }
    const clock=result.checkedAt?
     new Date(result.checkedAt).toLocaleString('ru-CA',{timeZone:'America/Toronto'}):'неизвестно';
    meta.textContent='Снимок: '+clock+' Toronto · возраст: '+
      (result.ageMinutes===null?'—':result.ageMinutes+' мин')+
      ' · '+result.freshness.toUpperCase()+' · '+result.coverage+
      (result.freshness==='stale'||result.freshness==='unknown'?
       ' · Перед действием заново проверить PR/HEAD/lease и текущие логи.':'');
    box.dataset.freshness=result.freshness;
   }catch(error){
    list.replaceChildren();
    meta.textContent='Данные не подтверждены ('+String(error.message||error).slice(0,90)+
     '). Рекомендации не строятся из пустых/устаревших кэшированных значений.';
    box.dataset.freshness='unknown';
   }finally{busy=false;refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>void load());
  void load();
  return true;
 }

 if(typeof module!=='undefined'&&module.exports)module.exports={derive};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  const observer=typeof MutationObserver!=='undefined'?new MutationObserver(()=>{if(mount())observer.disconnect();}):null;
  if(observer&&document.body)observer.observe(document.body,{childList:true,subtree:true});
 }
 if(root)root.HHPRRecommendations={derive};
})(typeof window!=='undefined'?window:null);
