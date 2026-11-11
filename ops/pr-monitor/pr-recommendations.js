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
  const core=sample&&valid(sample.core_failures)?sample.core_failures:null;
  const conflicts=sample&&valid(sample.merge_conflicts)?sample.merge_conflicts:null;
  const specialist=sample&&valid(sample.specialist_failures)?sample.specialist_failures:null;
  const policy=sample&&valid(sample.specialist_policy_holds)?sample.specialist_policy_holds:null;
  const inspected=sample&&valid(sample.inspected)?sample.inspected:null;
  const accepted=valid(counts.dispatch_requests_accepted)?counts.dispatch_requests_accepted:null;
  const started=valid(counts.worker_dispatches)?counts.worker_dispatches:null;
  const blocked=valid(counts.verified_blocked_lower_bound)?counts.verified_blocked_lower_bound:
    (valid(data.blocked_total)?data.blocked_total:null);
  const n=v=>v===null?'неизвестно':String(v);
  const sampleScope=inspected===null?'bounded sample не подтверждён':
    'выборка '+inspected+' PR; это не весь backlog';
  return {
   generatedAt:data.generated_at||null,checkedAt:sample?(sample.checked_at||null):(data.checked_at||null),
   ageMinutes:age,freshness,
   source:SOURCE,
   recommendations:[
    {id:'conflicts',priority:'P0',confidence:conflicts!==null?'CONFIRMED_SAMPLE':'NEEDS_REVALIDATION',
     title:'Разрешить подтверждённые merge-конфликты',
     signal: n(conflicts)+' конфликтов · '+sampleScope, owner:':45 · только после проверки действующей lease', blocker:'точные PR/HEAD не входят в публичный bounded KPI feed; требуется адресная сверка',
     task:'Для каждого реально затронутого PR повторно прочитать текущие HEAD, base, diff, owner lease и safety labels. Назначить одного владельца :45. Выполнить семантический three-way merge с сохранением актуальных production-контрактов; не применять ours/theirs вслепую.',
     tests:'Точный конфликтный файл + профильный regression test; затем exact-HEAD Core, применимые Specialist и Guard.',
     done:'Конфликт отсутствует на текущем HEAD, required checks PASS, protection labels и review не обходились.',
     evidence:SOURCE},
    {id:'core',priority:'P0',confidence:core!==null?'CONFIRMED_SAMPLE':'NEEDS_REVALIDATION',
     title:'Исправить реальные Core CI failures',
     signal:n(core)+' Core failures · '+sampleScope, owner:':10 triage → :35 source repair', blocker:'до записи нужны текущие PR/HEAD, причинный job и свободная lease',
     task:'По каждому выбранному PR :10 фиксирует точный HEAD, workflow/run/job и первый упавший шаг. Владелец :35 исправляет первопричину в source и добавляет focused regression test; не запускать пустой rerun и не переносить ошибку со старого HEAD.',
     tests:'Focused regression test и обязательный Core на новом exact HEAD; Specialist/Guard — по затронутой области.',
     done:'Есть новый source SHA, focused test PASS и все обязательные проверки на этом же SHA PASS.',
     evidence:SOURCE},
    {id:'specialist',priority:'P1',confidence:specialist!==null||policy!==null?'CONFIRMED_SAMPLE':'NEEDS_REVALIDATION',
     title:'Разобрать Specialist failures и policy holds',
     signal:'Specialist failures: '+n(specialist)+' · policy holds: '+n(policy), owner:':10 triage → текущий Specialist owner / защищённый reviewer', blocker:'policy hold не снимается автоматическим ремонтом',
     task:'Проверить точные workflow/job/HEAD и разделить техническую ошибку от policy hold. Техническую причину направить одному владельцу; policy/privacy/consent/payment hold оставить на защищённом review. Не ослаблять acceptance и не снимать hold ради зелёного агрегатора.',
     tests:'Профильный Specialist тест, проверка затронутого security/consent контракта и финальный required gate.',
     done:'Причина классифицирована; применимые Specialist и Guard PASS либо policy hold документирован как ручной блокер.',
     evidence:SOURCE},
    {id:'handoff',priority:'P1',confidence:accepted!==null&&started!==null?'CONFIRMED_METRICS':'NEEDS_REVALIDATION',
     title:'Свести dispatch acceptance с реальным запуском Worker',
     signal:'HTTP accepted: '+n(accepted)+' · trusted RUNNER_STARTED: '+n(started)+' · delivery: '+String(data.delivery_status||'UNKNOWN'), owner:':10 · существующий Dispatcher/Worker', blocker:'нужна связка task ID → signed RUNNER_STARTED → terminal source receipt',
     task:'Сверить одну выбранную задачу от dispatch request до подписанного exact-task RUNNER_STARTED receipt. Проверить task ID, PR, HEAD, lease и terminal receipt. Не считать HTTP 2xx, PREPARED или workflow success фактом source write; при source_published=false/new_sha=null фиксировать NO_SOURCE.',
     tests:'Существующий dispatch/receipt integration test: accepted, runner started, source published, no-source и superseded-head сценарии.',
     done:'Каждый этап имеет собственную квитанцию и точное время; source считается изменённым только после GitHub readback нового SHA.',
     evidence:'https://github.com/andylitvinov-design/books/issues/1419'},
    {id:'freshness',priority:'P1',confidence:age===null?'NEEDS_REVALIDATION':'CONFIRMED_TIMESTAMP',
     title:'Не допускать устаревших рекомендаций',
     signal:age===null?'Время снимка не подтверждено': 'Снимок '+age+' мин · '+freshness.toUpperCase(), owner:':20 · единственный writer журнала', blocker:'при STALE старые задачи нельзя назначать без нового snapshot и exact-head recheck',
     task:'Показывать время источника отдельно от времени загрузки страницы. До 15 мин помечать FRESH, 15–75 мин DELAYED, старше 75 мин STALE. При STALE не выдавать старые root/HEAD/lease за текущие; обновить source snapshot штатным существующим циклом и адресно перепроверить текущие PR.',
     tests:'Fixtures на границах 15/75 минут, отсутствующий checked_at, будущая метка времени и stale cache.',
     done:'У каждого набора данных видны checked_at, age и freshness; STALE запрещает actionable recommendation без повторной проверки.',
     evidence:SOURCE}
   ],
   sample:{inspected,conflicts,core,specialist,policy,blocked}
  };
 }
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
 function safeHref(u){return typeof u==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:issues\/\d+|pull\/\d+|actions\/runs\/\d+(?:\/job\/\d+)?)$/.test(u)?u:null;}
 function mount(){
  if(typeof document==='undefined')return false;
  if(document.getElementById('hh-pr-recommendations'))return true;
  const anchor=document.getElementById('hh2-stages')||
    document.getElementById('diagnostics-mount')||
    document.querySelector('.throughput');
  if(!anchor)return false;
  const box=el('section','hh-pr-recommendations');box.id='hh-pr-recommendations';
  box.setAttribute('aria-label','Пять приоритетных технических рекомендаций PR');
  const header=el('div','hh-pr-rec-head');
  const title=el('div');title.append(el('h2','','Пять задач для ускорения Merge'),
    el('p','hh-pr-rec-intro','Только проверяемые действия. Неизвестные значения не заменяются нулём.'));
  const refresh=el('button','hh-pr-rec-refresh','Обновить');refresh.type='button';
  const meta=el('p','hh-pr-rec-meta','Загружаю актуальный Control Tower snapshot…');meta.setAttribute('role','status');
  const list=el('div','hh-pr-rec-list');
  header.append(title,refresh);box.append(header,meta,list);
  const footer=el('p','hh-pr-rec-footer','Источник: Control Tower #3128 · bounded Watchdog sample. Количество в выборке не равно всему backlog.');
  box.append(footer);
  anchor.insertAdjacentElement('afterend',box);
  let busy=false;
  async function load(){
   if(busy)return;busy=true;refresh.disabled=true;meta.textContent='Обновляю…';
   try{
    const response=await fetch('/api/control-tower-stats',{cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json(),result=derive(data);
    list.replaceChildren();
    for(const r of result.recommendations){
     const card=el('article','hh-pr-rec-card');
     const top=el('div','hh-pr-rec-top');
     top.append(el('span','hh-pr-rec-priority',r.priority),el('span','hh-pr-rec-confidence',r.confidence));
     card.append(top,el('h3','',r.title),el('p','hh-pr-rec-signal',r.signal),
       el('p','hh-pr-rec-owner','Ответственный: '+r.owner),
       el('p','hh-pr-rec-blocker','Перед началом: '+r.blocker),
       el('p','hh-pr-rec-task',r.task));
     const details=el('details','hh-pr-rec-details');
     details.append(el('summary','','Тесты и критерий готовности'),
       el('p','',r.tests),el('p','hh-pr-rec-done',r.done));
     card.append(details);
     const link=safeHref(r.evidence);if(link){const a=el('a','hh-pr-rec-evidence','Открыть evidence ↗');a.href=link;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
     list.append(card);
    }
    const time=result.checkedAt?new Date(result.checkedAt).toLocaleString('ru-CA',{timeZone:'America/Toronto'}):'неизвестно';
    meta.textContent='Источник проверен: '+time+' Toronto · возраст: '+(result.ageMinutes===null?'—':result.ageMinutes+' мин')+' · '+result.freshness.toUpperCase()+
      (result.freshness==='stale'?' · ДАННЫЕ УСТАРЕЛИ — перед действиями обязательна повторная проверка HEAD/lease/CI.':'')+
      ' · выборка '+(result.sample.inspected===null?'—':result.sample.inspected+' PR');
    box.dataset.freshness=result.freshness;
   }catch(error){
    meta.textContent='Рекомендации недоступны: '+String(error.message||error)+'. Старые значения не показываются.';
    list.replaceChildren();
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
