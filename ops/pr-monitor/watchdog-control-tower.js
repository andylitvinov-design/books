'use strict';
(()=>{
  if(window.__hhControlTowerWatchdogMounted)return;
  function mount(){
    const section=document.querySelector('.hh-watchdog');
    if(!section)return false;
    if(document.getElementById('hh-watchdog-control-tower'))return true;
    window.__hhControlTowerWatchdogMounted=true;
    const panel=document.createElement('section');
    panel.id='hh-watchdog-control-tower';
    panel.className='hh-watchdog-control';
    panel.setAttribute('aria-label','Контроль выполнения задач Control Tower');
    const heading=document.createElement('p');
    heading.className='hh-watchdog-control-heading';
    heading.textContent='Control Tower · последний рабочий проход';
    const grid=document.createElement('div');
    grid.className='hh-watchdog-grid';
    const entries=[
      ['candidates','Кандидатов','PR, выбранные диспетчером для обработки'],
      ['blocked_total','Заблокировано','Все подтверждённые причины недоставленных PR, а не только OWNER_LEASE_UNVERIFIED'],
      ['worker_dispatches','Runner стартовал','Подтверждённый старт реального Worker, не просто HTTP-приём dispatch']
    ];
    const nodes={};
    for(const [key,label,tip] of entries){
      const item=document.createElement('article');
      item.className='hh-watchdog-metric';
      item.title=tip;
      const n=document.createElement('strong');
      n.textContent='—';
      n.setAttribute('aria-label',label+': ожидаются данные');
      const l=document.createElement('span');l.textContent=label;
      item.append(n,l);grid.append(item);nodes[key]=n;
    }
    const info=document.createElement('p');
    info.className='hh-watchdog-control-meta';
    info.setAttribute('role','status');
    info.textContent='Читаю последний подтверждённый отчёт Control Tower…';
    const link=document.createElement('a');
    link.textContent='Журнал GitHub ↗';
    link.target='_blank';link.rel='noopener noreferrer';link.hidden=true;
    const blockers=document.createElement('details');
    blockers.className='hh-ct-blockers';
    const blockersTitle=document.createElement('summary');
    blockersTitle.textContent='Причины блокировок · загружаю';
    const blockersList=document.createElement('div');
    blockersList.className='hh-ct-blocker-list';
    blockers.append(blockersTitle,blockersList);
    panel.append(heading,grid,info,blockers,link);
    const after=section.querySelector('.hh-watchdog-meta');
    if(after)after.insertAdjacentElement('afterend',panel);
    else section.append(panel);
    const style=document.createElement('style');
    style.textContent='.hh-watchdog-control{margin:12px 0 5px;padding-top:10px;border-top:1px solid #314c67}'+
      '.hh-watchdog-control-heading{margin:0 0 8px;font-size:12px;font-weight:750;color:#bcd0e4}'+
      '.hh-watchdog-control .hh-watchdog-metric{min-height:68px}'+
      '.hh-watchdog-control .hh-watchdog-metric:nth-child(2) strong{color:#ff929b}'+
      '.hh-watchdog-control .hh-watchdog-metric:nth-child(3) strong{color:#65dfc0}'+
      '.hh-watchdog-control .hh-watchdog-metric span{overflow-wrap:anywhere}'+
      '.hh-watchdog-control-meta{margin:7px 0 2px;color:#adc0d4;font-size:11px;line-height:1.45}'+
      '.hh-watchdog-control a{display:inline-block;margin:2px 0 4px;color:#99cfff;font-size:11px;text-decoration:underline}'+
      '.hh-watchdog-control a[hidden]{display:none}'+
      '.hh-ct-blockers{border-top:1px solid #35516b;margin-top:10px;padding-top:9px}'+
      '.hh-ct-blockers summary{font-size:13px;font-weight:730;color:#d8e6fa;cursor:pointer}'+
      '.hh-ct-blocker-list{display:grid;gap:8px;margin-top:10px}'+
      '.hh-ct-blocker-item{border:1px solid #35516b;border-radius:10px;background:#101d31;padding:9px 11px;font-size:12px;color:#d4e5f9}'+
      '.hh-ct-blocker-item strong{float:right;color:#ff9da6;font-size:15px}'+
      '.hh-ct-blocker-item a{font-size:12px;margin-right:12px}'+
      '@media(max-width:700px){.hh-watchdog-control .hh-watchdog-metric{min-height:75px;padding:9px 4px;gap:5px}.hh-watchdog-control .hh-watchdog-metric span{font-size:10px;line-height:1.18}.hh-watchdog-control-heading{font-size:12px}}';
    document.head.append(style);
    let last=0,loading=false;
    const clock=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',hour12:false});
    async function refresh(force){
      if(loading||(!force&&Date.now()-last<100000))return;
      loading=true;
      try{
        const response=await fetch('/api/control-tower-stats',{cache:'no-store',headers:{Accept:'application/json'}});
        if(!response.ok)throw Error('HTTP '+response.status);
        const data=await response.json();
        if(data.schema!=='HH_CONTROL_DISPATCH_METRICS_V1'||data.source_dry_run!==false||!data.counts)throw Error('Source unverified');
        for(const [key,label] of entries){
          const count=data.counts[key];
          const value=Number.isSafeInteger(count)&&count>=0?new Intl.NumberFormat('ru-RU').format(count):'—';
          nodes[key].textContent=value;
          nodes[key].setAttribute('aria-label',label+': '+value);
        }
        const date=new Date(data.checked_at);
        const minutes=Number.isFinite(+date)?Math.max(0,Math.round((Date.now()-date)/60000)):null;
        info.textContent='Control Tower · '+(Number.isFinite(+date)?clock.format(date)+' Торонто':'время неизвестно')+
          (minutes===null?'':' · '+minutes+' мин назад')+
          ' · production PR: '+(Number.isSafeInteger(data.counts.production_prs)?
            data.counts.production_prs:'неизвестно')+
          ' · принято: '+(Number.isSafeInteger(data.counts.dispatch_requests_accepted)?
            data.counts.dispatch_requests_accepted:'—')+
          (minutes!==null&&minutes>20?' · УСТАРЕВШИЙ ОТЧЁТ':'');
        if(/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+$/.test(data.run_url||'')){
          link.href=data.run_url;link.hidden=false;
        }
        blockersList.replaceChildren();
        const names={
          CI_WAKE_MANUAL_HOLD_UNVERIFIED:'Не подтверждена ручная разблокировка CI',
          SOURCE_PROOF_MISSING:'Не хватает подтверждения исходной ошибки',
          SOURCE_PROOF_UNVERIFIED:'Доказательство исходной ошибки не подтверждено',
          STACKED_PARENT:'Ожидает родительский PR',
          OWNER_LEASE_UNVERIFIED:'Владелец PR не подтверждён',
          ALREADY_HANDLED:'Старая попытка уже обработана',
          CONFLICT_NOT_VERIFIED:'Конфликт пока не подтверждён',
          CI_WAKE_UNDELIVERED:'Запуск Core CI не доставлен'
        };
        const complete=data.blocked_reasons_complete===true;
        const rows=complete&&data.blocked_reasons?
          Object.entries(data.blocked_reasons)
            .filter(([key,n])=>/^[A-Z][A-Z0-9_]{0,79}$/.test(key)&&
              Number.isSafeInteger(n)&&n>0)
            .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])):[];
        if(!complete){
          blockersTitle.textContent='Блокировки · отчёт ещё не полный';
          const p=document.createElement('p');
          p.textContent='Нет полной разбивки причин. Не считаем отсутствие данных нулём.';
          blockersList.append(p);blockers.open=true;
        }else{
          const total=rows.reduce((sum,[,n])=>sum+n,0);
          blockersTitle.textContent='Блокировки · '+total+' · причины и PR';
          if(!rows.length){
            const p=document.createElement('p');
            p.textContent=data.counts.candidates>0?
              'Кандидаты есть, но подробный блокер не указан.':
              'В этом подтверждённом проходе блокировок передачи нет.';
            blockersList.append(p);
          }
          for(const [code,n] of rows.slice(0,12)){
            const item=document.createElement('div');
            item.className='hh-ct-blocker-item';
            item.textContent=names[code]||code;
            const strong=document.createElement('strong');
            strong.textContent=String(n);item.append(strong);
            const samples=data.blocked_examples?.[code]||[];
            if(Array.isArray(samples)&&samples.length){
              const refs=document.createElement('div');
              for(const entry of samples.slice(0,3)){
                if(!Number.isSafeInteger(entry.pr_number)||entry.pr_number<1)continue;
                const a=document.createElement('a');
                a.textContent='#'+entry.pr_number;
                a.href='https://github.com/andylitvinov-design/books/pull/'+entry.pr_number;
                a.target='_blank';a.rel='noopener noreferrer';refs.append(a);
              }
              item.append(refs);
            }
            blockersList.append(item);
          }
          blockers.open=rows.length>0;
        }
        last=Date.now();
      }catch{
        for(const node of Object.values(nodes)){node.textContent='—';node.setAttribute('aria-label','Данные недоступны');}
        info.textContent='Нет подтверждённых данных Control Tower. Нулём отсутствие отчёта не считается.';
        blockersTitle.textContent='Блокировки · отчёт недоступен';
        blockersList.replaceChildren();blockers.open=true;
        link.hidden=true;last=Date.now();
      }finally{loading=false;}
    }
    document.getElementById('refresh')?.addEventListener('click',()=>refresh(true));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});
    setInterval(()=>{if(!document.hidden)refresh(false);},120000);
    void refresh(true);
    return true;
  }
  if(mount())return;
  const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{if(mount())observer.disconnect();},{once:true});
})();