'use strict';
(()=>{
  if(window.__hhRepairOutcomesUiMounted)return;
  const HOURS=[1,6,24,72];
  let selected=6,loading=false,last=0;
  function mount(){
    const details=document.getElementById('extended');
    const body=details?.querySelector('.details-body');
    if(!body)return false;
    if(document.getElementById('hh-repair-outcomes'))return true;
    window.__hhRepairOutcomesUiMounted=true;
    const root=document.createElement('section');
    root.id='hh-repair-outcomes';
    root.className='hh-repair-outcomes';
    root.setAttribute('aria-label','Подтверждённые результаты Repair Worker');
    root.innerHTML='<div class="hh-repair-heading"><b>Repair Worker · реальные исправления</b><span>Зелёный запуск ≠ коммит</span></div>'+
      '<div class="hh-repair-controls" role="group" aria-label="Интервал Repair Worker"></div>'+
      '<div class="hh-repair-values">'+
      '<div><strong data-repair="terminal">—</strong><span>Завершено задач¹</span></div>'+
      '<div><strong data-repair="published">—</strong><span>Коммитов подтверждено</span></div>'+
      '<div><strong data-repair="manual">—</strong><span>Без исправления</span></div></div>'+
      '<p class="hh-repair-note" role="status">Читаю подписанные результаты GitHub…</p>'+
      '<p class="hh-repair-source">¹ Выборка терминальных отчётов, не все запуски. <a href="https://docs.google.com/document/d/1IsXRcjNoaifzwVFLW8Xv8KLI1xGTnynrmKBKGAHa8wg/edit" target="_blank" rel="noopener noreferrer">Журнал наблюдения</a><a data-repair="evidence" href="https://github.com/andylitvinov-design/books/actions" target="_blank" rel="noopener noreferrer">GitHub</a></p>';
    const controls=root.querySelector('.hh-repair-controls');
    for(const [h,label] of [[1,'1 ч'],[6,'6 ч'],[24,'24 ч'],[72,'3 дня']]){
      const b=document.createElement('button');
      b.type='button';b.textContent=label;
      b.dataset.repairHours=String(h);
      b.setAttribute('aria-pressed',String(h===selected));
      b.addEventListener('click',()=>{
        selected=h;
        for(const btn of controls.querySelectorAll('button'))
          btn.setAttribute('aria-pressed',String(Number(btn.dataset.repairHours)===h));
        void refresh(true);
      });
      controls.appendChild(b);
    }
    const anchor=body.querySelector('.extra-grid');
    if(anchor)anchor.insertAdjacentElement('afterend',root);
    else body.appendChild(root);
    details.addEventListener('toggle',()=>{if(details.open)void refresh(false);});
    document.getElementById('refresh')?.addEventListener('click',()=>{if(details.open)void refresh(true);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&details.open)void refresh(false);});
    setInterval(()=>{if(!document.hidden&&details.open)void refresh(false);},120000);
    if(details.open)void refresh(true);
    return true;
  }
  async function refresh(force){
    const root=document.getElementById('hh-repair-outcomes');if(!root||loading)return;
    if(!force&&Date.now()-last<45000)return;
    loading=true;
    const note=root.querySelector('.hh-repair-note');
    const fields={terminal:root.querySelector('[data-repair="terminal"]'),
      published:root.querySelector('[data-repair="published"]'),
      manual:root.querySelector('[data-repair="manual"]')};
    note.textContent='Проверяю GitHub · '+selected+' ч…';
    try{
      const response=await fetch('/api/repair-outcomes?hours='+selected,
        {signal:AbortSignal.timeout(16000),cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(data.schema!=='HH_REPAIR_SOURCE_OUTCOMES_V1'||!data.totals||!data.coverage)
        throw Error('Нет подтверждённых данных');
      const count=(n,complete)=>Number.isSafeInteger(n)&&n>=0
        ?(complete||n>0?(complete?'':'≥')+new Intl.NumberFormat('ru-RU').format(n):'—'):'—';
      const complete=data.coverage.verified_sample_complete===true;
      fields.terminal.textContent=count(data.totals.terminal_tasks_sampled,complete);
      fields.published.textContent=count(data.totals.verified_source_commits,complete);
      fields.manual.textContent=count(data.totals.manual_no_source,complete);
      const at=new Date(data.generated_at);
      const stamp=Number.isFinite(+at)?new Intl.DateTimeFormat('ru-RU',{
        timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit'
      }).format(at):'время неизвестно';
      const coverage=complete?'Все терминальные комментарии за интервал прочитаны':
        'Неполная выборка · цифры — нижняя граница';
      const extra=Number(data.totals.publication_verification_unknown||0);
      note.textContent=coverage+' · '+stamp+' Торонто'+
        (extra?' · '+extra+' публикаций требуют сверки SHA':'')+
        '. CLAIMED, workflow SUCCESS и merge учитываются отдельно.';
      const proof=data.evidence?.find(x=>/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+$/.test(x.run_url||''));
      const link=root.querySelector('[data-repair="evidence"]');
      if(proof){link.href=proof.run_url;link.textContent='Последний отчёт GitHub';}
      else{link.href='https://github.com/andylitvinov-design/books/actions';link.textContent='GitHub Actions';}
      last=Date.now();
    }catch(error){
      Object.values(fields).forEach(n=>n.textContent='—');
      note.textContent='Нет надёжных данных о результатах Worker: '+String(error.message||'ошибка')+
        '. Отсутствие подтверждения не означает ноль исправлений.';
      last=Date.now();
    }finally{loading=false;}
  }
  if(mount())return;
  document.addEventListener('DOMContentLoaded',mount,{once:true});
})();