'use strict';
// Read-only per-PR timestamp coverage from existing /api/control-tower-stats.
// Event dates and first Watchdog OBSERVATIONS are intentionally kept separate.
(function(){
 if(typeof document==='undefined'||window.__hhPrTimestampPanel)return;
 window.__hhPrTimestampPanel=true;
 var FLAG={draft:1,ready:2,triage:4,claimed:8,repair_hint:16,ci_hint:32,
  gate_hint:64,conflict_hint:128,manual_hint:256,hold_hint:512};
 var STAGES=[
  ['ready','Ready observed (not event date)'],['triage','Triage label observed'],
  ['claimed','Worker-claimed label observed'],['repair_hint','Repair queue hint observed'],
  ['ci_hint','CI-needed hint observed'],['gate_hint','Merge/Gate review hint observed'],
  ['conflict_hint','Conflict hint observed'],['manual_hint','Manual routing observed'],
  ['hold_hint','Hold observed']
 ];
 var root,summary,status,rowsBox,filter,meta,loaded=null,busy=false,armed=false;
 var clock=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
 function make(tag,cls,t){var e=document.createElement(tag);if(cls)e.className=cls;
  if(t!==undefined)e.textContent=String(t);return e;}
 function date(n){return Number.isSafeInteger(n)&&n>0?clock.format(new Date(n*1000)):'—';}
 function armLazy(){
  if(armed||!root)return;
  armed=true;
  if('IntersectionObserver' in window){
   var io=new IntersectionObserver(function(entries){
    if(entries.some(function(e){return e.isIntersecting;})){
     io.disconnect();void fetchData(false);
    }
   },{rootMargin:'250px 0px'});
   io.observe(root);
  }else void fetchData(false);
 }
 function mount(){
  if(root)return true;
  var after=document.getElementById('hh2-stages');
  if(!after)return false;
  root=make('section','hh-pr-timestamp-observer');root.id='hh-pr-timestamp-observer';
  root.setAttribute('aria-label','Покрытие временными метками всех открытых PR');
  var head=make('div','hh-pr-ts-head');
  head.append(make('h2','','Временные метки · все открытые PR'));
  var reload=make('button','','Перепроверить');reload.type='button';
  reload.addEventListener('click',function(){void fetchData(true);});head.append(reload);
  summary=make('div','hh-pr-ts-grid');
  status=make('p','hh-pr-ts-status','Данные будут считаны из существующего Watchdog по запросу.');
  status.setAttribute('role','status');
  meta=make('p','hh-pr-ts-note',
   'Created / Updated — даты GitHub. Ready / Triage / Repair — первое наблюдение текущего состояния Watchdog, НЕ точное время действия. CI, runner и merge подтверждаются отдельными GitHub событиями.');
  var controls=make('div','hh-pr-ts-controls');
  filter=make('select','','');
  [['all','Все открытые'],['production','Production'],['other','Другие ветки'],
   ['draft','Draft'],['ready','Не Draft'],['conflict','С конфликтом'],
   ['manual','Ручная очередь'],['no-triage','Без наблюдаемого Triage']]
   .forEach(function(pair){var option=make('option','',pair[1]);option.value=pair[0];filter.append(option);});
  filter.setAttribute('aria-label','Фильтр по PR');
  filter.addEventListener('change',renderRows);controls.append(filter);
  rowsBox=make('div','hh-pr-ts-rows');
  var caption=make('p','hh-pr-ts-note','Для точных дат CI и завершённых этапов откройте хронологию конкретного PR; недостающие старые события не восстанавливаются догадками.');
  root.append(head,summary,status,meta,controls,rowsBox,caption);
  after.insertAdjacentElement('afterend',root);
  armLazy();
  return true;
 }
 function metric(label,n){
  var c=make('article','hh-pr-ts-metric');c.append(make('span','',label),make('strong','',Number.isSafeInteger(n)?n:'—'));return c;
 }
 function render(){
  if(!root)return;
  summary.replaceChildren();
  if(!loaded)return;
  var data=loaded;
  var c=data.counts;
  var items=[['Открытых PR',data.total],['Созданы · точное время',c.created_exact],
   ['Обновлены · точное время',c.updated_exact],['HEAD SHA',c.head_exact],
   ['Production',data.production],['Ready сейчас',c.ready],['Draft',c.draft],
   ['Triage label сейчас',c.triage_now],['Claimed сейчас',c.claimed_now],
   ['Repair hint сейчас',c.repair_hint_now],['CI hint сейчас',c.ci_hint_now],
   ['Gate hint сейчас',c.gate_hint_now],['Conflict hint сейчас',c.conflict_hint_now],
   ['Manual hint сейчас',c.manual_hint_now]];
  items.forEach(function(p){summary.append(metric(p[0],p[1]));});
  var age=Number.isSafeInteger(data.age_minutes)?data.age_minutes:'—';
  status.textContent='Полный снимок GitHub: '+date(Math.floor(Date.parse(data.observed_at)/1000))+
    ' Toronto · '+data.total+' PR · '+age+' мин назад'+
    (age>25?' · УСТАРЕЛ':'')+
    (data.source_status==='PRESERVED_PRIOR_FULL_SCAN'?' · сохранён предыдущий полный проход':'');
  renderRows();
 }
 function renderRows(){
  if(!rowsBox||!loaded)return;
  rowsBox.replaceChildren();
  var items;try{items=JSON.parse(loaded.records);}catch{
   rowsBox.textContent='Ошибка состава списка PR; данные не засчитаны.';return;}
  var selection=filter?.value||'all';
  var hits=items.filter(function(r){
   var f=r[6];
   return selection==='all'||selection==='production'&&r[2]===1||
    selection==='other'&&r[2]===0||
    selection==='draft'&&Boolean(f&FLAG.draft)||
    selection==='ready'&&Boolean(f&FLAG.ready)||
    selection==='conflict'&&Boolean(f&FLAG.conflict_hint)||
    selection==='manual'&&Boolean(f&FLAG.manual_hint)||
    selection==='no-triage'&&!(f&FLAG.triage);
  });
  rowsBox.append(make('p','hh-pr-ts-status','Показано '+hits.length+' из '+items.length+' PR'));
  var list=make('div','hh-pr-ts-list');
  for(var r of hits){
   var block=make('details','hh-pr-ts-pr'),head=make('summary');
   head.append(make('b','','#'+r[0]),make('span','',r[2]===1?'Production':'Другая ветка'),
     make('span','',(r[6]&FLAG.draft)?'Draft':'Ready'),
     make('small','',date(r[3])));
   block.append(head);
   var inner=make('div','hh-pr-ts-pr-body');
   var initial=[['Создан · GitHub (точное)',date(r[3])],
     ['Обновлён · GitHub (точное)',date(r[4])],
     ['HEAD впервые увиден Watchdog',date(r[5])]];
   for(var pair of initial){
    var line=make('div','hh-pr-ts-line');
    line.append(make('span','',pair[0]),make('strong','',pair[1]));inner.append(line);
   }
   for(var i=0;i<STAGES.length;i++){
    var row=make('div','hh-pr-ts-line'),s=STAGES[i];
    row.append(make('span','',s[1]),
      make('strong','',r[i+7]?'Наблюдалось: '+date(r[i+7]):'Не наблюдалось'));
    inner.append(row);
   }
   inner.append(make('p','hh-pr-ts-note','HEAD: '+r[1]+'. Времена первого наблюдения — не даты фактического наступления этапа.'));
   var production=r[2]===1;
   var link=make('a','',production?'Открыть аудит PR #'+r[0]:
     'Открыть PR #'+r[0]+' в GitHub (другая base-ветка)');
   link.href=production?'/?pr='+r[0]+'#hh-pr-attribution':
     'https://github.com/andylitvinov-design/books/pull/'+r[0];
   if(!production){link.target='_blank';link.rel='noopener noreferrer';}
   inner.append(link);block.append(inner);list.append(block);
  }
  rowsBox.append(list);
 }
 async function fetchData(force){
  if(busy||!root)return;
  busy=true;status.textContent='Читаю сохранённый срез Watchdog…';
  try{
   var r=await fetch('/api/control-tower-stats',{
    cache:force?'no-store':'default',headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('HTTP '+r.status);
   var data=await r.json(),value=data.pr_timestamps;
   if(!value||value.status!=='VERIFIED_OPEN_PR_METADATA_SNAPSHOT'||
      typeof value.records!=='string'||value.total<1)throw Error(
        value?.status||'Полный снимок временных меток ещё не опубликован');
   loaded=value;render();
  }catch(e){
   if(loaded){render();status.textContent+=' · повторная проверка недоступна';}
   else status.textContent='Полный снимок пока недоступен: '+
      String(e.message||e).slice(0,150)+'. Не считаем отсутствие записи нулём.';
  }finally{busy=false;}
 }
 function boot(){
  if(mount())return;
  var watch=new MutationObserver(function(){if(mount())watch.disconnect();});
  watch.observe(document.documentElement,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

})();
