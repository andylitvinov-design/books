'use strict';
/* HH_TASK_MODEL_PICKER_V1 — an owner's device preference, NOT runtime evidence.
 * No provider key, paid inference, private writes, agent dispatch or polling.
 */
(function (win) {
  const MODEL_PATTERN=/^[a-z0-9._/-]{1,96}:free$/;
  const TASK_PATTERN=/^(?:(?:ci-head|ai-commits):[A-Z][0-9]{2}|pr:[1-9][0-9]{0,5})$/;
  const STORAGE='hh.pr-monitor.preferred-models.v1';
  const ENDPOINT='https://openrouter.ai/api/v1/models';
  function freeModel(m){
    if(!m||typeof m.id!=='string'||!MODEL_PATTERN.test(m.id)||!m.pricing)return false;
    const p=m.pricing;
    if(p.prompt===undefined||p.completion===undefined)return false;
    return Object.values(p).every(v=>v==null||(typeof v!=='object'&&String(v).trim()!==''&&Number(v)===0));
  }
  const cleanName=v=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,80);
  function readSaved(storage){
    try{
      const parsed=JSON.parse(storage?.getItem(STORAGE)||'null');
      if(!parsed||parsed.schema!=='HH_PM_PREFERRED_MODELS_V1'||typeof parsed.items!=='object'||Array.isArray(parsed.items))return {};
      const result={};
      for(const [key,v] of Object.entries(parsed.items).slice(0,400)){
        if(TASK_PATTERN.test(key)&&v&&MODEL_PATTERN.test(v.id||'')&&typeof v.verifiedAt==='string')
          result[key]={id:v.id,name:cleanName(v.name||v.id),verifiedAt:v.verifiedAt};
      }
      return result;
    }catch{return {}}
  }
  const api={freeModel,readSaved,validKey:key=>TASK_PATTERN.test(key)};
  if(typeof module==='object'&&module.exports)module.exports=api;
  const doc=win?.document;
  if(!doc||!doc.getElementById('pm-root'))return;
  let storage=null;
  try{storage=win.localStorage;}catch{}
  let items=readSaved(storage),models=null,modelsFetchedAt=0,loading=null,activeKey='',sheet=null,feedback=null,list=null,filter=null,changeQueued=false;
  const badges=new Map();
  const make=(tag,cls,label)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=String(label);return e;};
  const badgeText=v=>v?'🧠 '+(v.name||v.id):'🧠 Модель: —';
  const modelGet=key=>TASK_PATTERN.test(key)?(items[key]||null):null;
  function updateBadges(key){
    for(const b of badges.get(key)||[]){
      const v=modelGet(key);b.textContent=badgeText(v);
      b.title=v?'Предпочтительная модель: '+v.id+' · каталог проверен '+v.verifiedAt+' · НЕ доказательство исполнения':'Выбрать бесплатную модель OpenRouter для будущего задания';
      b.setAttribute('aria-label',b.title);
      b.dataset.assigned=v?'true':'false';
    }
  }
  function attach(row,key,where){
    if(!TASK_PATTERN.test(key)||row.querySelector('.hh-task-model'))return;
    const target=row.querySelector(where);if(!target)return;
    const b=make('button','hh-task-model');b.type='button';b.dataset.modelKey=key;
    b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open(key);});
    if(!badges.has(key))badges.set(key,new Set());badges.get(key).add(b);
    target.appendChild(b);updateBadges(key);
  }
  function scan(){
    for(const row of doc.querySelectorAll('#pm-root .pm-task')){
      const id=row.querySelector('.pm-task-check')?.value;
      if(id)attach(row,id,'.pm-task-head');
    }
    for(const row of doc.querySelectorAll('#hh-pr-task-tree .hh-pt-pr')){
      const href=row.querySelector('a[href*="/pull/"]')?.getAttribute('href')||'';
      const match=/\/pull\/([1-9][0-9]{0,5})(?:$|[?#])/.exec(href);
      if(match)attach(row,'pr:'+match[1],'.hh-pt-pr-head');
    }
  }
  function scheduleScan(){
    if(changeQueued)return;
    changeQueued=true;
    Promise.resolve().then(()=>{changeQueued=false;scan();});
  }
  function setFeedback(message){if(feedback)feedback.textContent=message;}
  function writeSaved(next){
    try{
      if(!storage)throw Error('LOCAL_STORAGE_DISABLED');
      storage.setItem(STORAGE,JSON.stringify({schema:'HH_PM_PREFERRED_MODELS_V1',items:next}));
      items=next;return true;
    }catch{return false;}
  }
  function pick(key,m){
    const next={...items};
    if(m)next[key]={id:m.id,name:cleanName(m.name||m.id),verifiedAt:new Date().toISOString()};
    else delete next[key];
    if(!writeSaved(next)){setFeedback('Браузер не разрешил сохранение. Выбор не изменён.');return;}
    updateBadges(key);close();
  }
  function close(){
    if(sheet){sheet.remove();sheet=null;feedback=null;list=null;filter=null;}
    activeKey='';
  }
  function listModels(){
    if(!list||!sheet)return;
    const q=(filter?.value||'').trim().toLocaleLowerCase('ru-RU').slice(0,80);
    const matching=(models||[]).filter(m=>(m.name+' '+m.id).toLocaleLowerCase('ru-RU').includes(q));
    list.replaceChildren();
    if(!matching.length){list.append(make('p','hh-model-empty',models?'Ничего не найдено.':'Каталог ещё не загружен.'));return;}
    for(const m of matching.slice(0,30)){
      const b=make('button','hh-model-option');b.type='button';
      b.append(make('span',null,m.name),make('small',null,m.id+' · проверенная цена $0'));
      b.addEventListener('click',()=>pick(activeKey,m));list.append(b);
    }
    if(matching.length>30)list.append(make('p','hh-model-empty','Показаны 30 из '+matching.length+'. Уточните поиск.'));
  }
  async function getModels(){
    if(models&&Date.now()-modelsFetchedAt<300000)return models;
    if(loading)return loading;
    loading=(async()=>{
      const res=await win.fetch(ENDPOINT,{method:'GET',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
      if(!res.ok)throw Error('HTTP '+res.status);
      const catalog=await res.json();
      if(!Array.isArray(catalog?.data)||catalog.data.length>3500)throw Error('Неверный ответ каталога');
      const seen=new Set();
      const free=catalog.data.filter(freeModel).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true})
        .map(x=>({id:x.id,name:cleanName(x.name||x.id)}))
        .sort((a,b)=>a.name.localeCompare(b.name,'ru'));
      if(!free.length)throw Error('Бесплатные модели сейчас не подтверждены');
      models=free;modelsFetchedAt=Date.now();return free;
    })();
    try{return await loading;}finally{loading=null;}
  }
  async function open(key){
    if(!TASK_PATTERN.test(key))return;
    close();activeKey=key;
    sheet=make('div','hh-model-backdrop');sheet.setAttribute('role','presentation');
    const pane=make('section','hh-model-sheet');pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');
    pane.setAttribute('aria-label','Выбор модели OpenRouter для задачи '+key);
    const top=make('div','hh-model-top'),title=make('h3',null,'🧠 Модель OpenRouter');
    const dismiss=make('button','hh-model-close','✕');dismiss.type='button';dismiss.setAttribute('aria-label','Закрыть выбор модели');dismiss.addEventListener('click',close);
    top.append(title,dismiss);
    const sub=make('p','hh-model-note','Задача '+key+' · выбранная модель хранится только в этом браузере. Это НЕ запуск агента, не смена текущего исполнителя и не доказательство выполненного PR.');
    filter=make('input','hh-model-search');filter.type='search';filter.placeholder='Найти модель по названию…';
    filter.setAttribute('aria-label','Поиск модели OpenRouter');filter.addEventListener('input',listModels);
    feedback=make('p','hh-model-state','Получаю актуальный список бесплатных моделей OpenRouter…');feedback.setAttribute('role','status');
    list=make('div','hh-model-list');
    const bottom=make('div','hh-model-actions');
    const reset=make('button','hh-model-reset','Снять выбор');reset.type='button';reset.addEventListener('click',()=>pick(activeKey,null));
    const cancel=make('button','hh-model-reset','Отмена');cancel.type='button';cancel.addEventListener('click',close);
    bottom.append(reset,cancel);
    pane.append(top,sub,filter,feedback,list,bottom);
    sheet.append(pane);sheet.addEventListener('click',event=>{if(event.target===sheet)close();});
    doc.body.append(sheet);filter.focus();
    try{
      await getModels();
      if(activeKey!==key||!sheet)return;
      const previous=modelGet(key);
      setFeedback(previous?('Выбрано: '+previous.id+'. Для смены выберите другую модель.'):('Доступно '+models.length+' бесплатных моделей · лимиты провайдера проверяются перед запуском.'));
      listModels();
    }catch(e){if(activeKey===key)setFeedback('Не удалось проверить каталог OpenRouter: '+String(e.message||e).slice(0,120)+'. Новый выбор недоступен.');}
  }
  win.HHPM_TASK_MODELS={get:modelGet};
  const styles=make('link');styles.rel='stylesheet';styles.href='/task-model-picker.css?v=20261107-v1';doc.head.append(styles);
  const taskRoot=doc.getElementById('pm-root'),treeRoot=doc.getElementById('hh-pr-task-tree');
  if(typeof win.MutationObserver==='function'){
    const watcher=new win.MutationObserver(scheduleScan);
    watcher.observe(taskRoot,{childList:true,subtree:true});
    if(treeRoot)watcher.observe(treeRoot,{childList:true,subtree:true});
  }
  doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&sheet)close();});
  scan();
})(typeof window==='undefined'?null:window);
