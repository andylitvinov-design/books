'use strict';
(() => {
  if (window.__hhControlTowerWatchdogMounted) return;
  const REASON_LABELS = {
    CI_WAKE_MANUAL_HOLD_UNVERIFIED: 'Ручная блокировка повторного запуска Core',
    SOURCE_PROOF_MISSING: 'Нет доказательства исходной ошибки',
    SOURCE_PROOF_UNVERIFIED: 'Доказательство ошибки не подтверждено',
    STACKED_PARENT: 'Ожидает родительский PR',
    CONFLICT_NOT_VERIFIED: 'Конфликт не подтверждён',
    ALREADY_HANDLED: 'Задача уже обработана, нужна проверка результата',
    OWNER_LEASE_UNVERIFIED: 'Не подтверждён владелец исправления',
    OWNER_LEASE_ACTIVE: 'PR занят другим исполнителем',
    CI_WAKE_AWAITING_CORE: 'Запрошен Core, запуск не подтверждён',
    CI_WAKE_UNDELIVERED: 'Пробуждение CI не доставлено',
    CAPACITY_UNVERIFIED: 'Не подтверждена свободная мощность CI'
  };
  const fmt = value => Number.isSafeInteger(value) && value >= 0
    ? new Intl.NumberFormat('ru-RU').format(value) : '—';
  function node(tag, cls, text, parent) {
    const element=document.createElement(tag);
    if(cls)element.className=cls;
    if(text!==undefined)element.textContent=text;
    if(parent)parent.appendChild(element);
    return element;
  }
  function mount(){
    const host=document.querySelector('.hh-watchdog');
    if(!host)return false;
    if(document.getElementById('hh-watchdog-control-tower'))return true;
    window.__hhControlTowerWatchdogMounted=true;
    if(!document.querySelector('link[data-hh-ct-css]')){
      const css=node('link',null,undefined,document.head);
      css.rel='stylesheet';css.href='/watchdog-control-tower.css';css.dataset.hhCtCss='true';
    }
    const box=node('section','hh-ct',undefined,host);
    box.id='hh-watchdog-control-tower';
    box.setAttribute('aria-label','Control Tower: реальное выполнение PR');
    const header=node('div','hh-ct-head',undefined,box);
    node('h3','hh-ct-title','Control Tower · передача PR',header);
    const source=node('a','hh-ct-source','Источник GitHub',header);
    source.href='https://github.com/andylitvinov-design/books/issues/3128';
    source.target='_blank';source.rel='noopener noreferrer';
    const stats=node('div','hh-ct-stats',undefined,box);
    const defs=[['open','Открыто в production'],['candidates','Кандидаты'],['workers','Worker начал']];
    const values={};
    for(const [key,label] of defs){
      const card=node('div','hh-ct-stat',undefined,stats);
      values[key]=node('strong','hh-ct-value','—',card);
      node('span','hh-ct-label',label,card);
    }
    const line=node('p','hh-ct-line','Загружаю подтверждённые данные GitHub…',box);
    line.setAttribute('aria-live','polite');
    const details=node('details','hh-ct-details',undefined,box);
    const summary=node('summary','hh-ct-summary','Причины блокировок · проверяю',details);
    const blocked=node('div','hh-ct-blockers',undefined,details);
    const footer=node('div','hh-ct-footer',undefined,box);
    const runLink=node('a','hh-ct-link','Открыть запуск Watchdog',footer);
    runLink.target='_blank';runLink.rel='noopener noreferrer';
    const stamp=node('span','hh-ct-stamp','',footer);
    async function refresh(){
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),12000);
        let response;
        try{response=await fetch('/api/control-tower-stats',{cache:'no-store',signal:controller.signal})}
        finally{clearTimeout(timer)}
        if(!response.ok)throw Error('HTTP '+response.status);
        const data=await response.json();
        if(data.schema!=='HH_CONTROL_DISPATCH_METRICS_V1')throw Error('Неверный формат');
        const counts=data.counts||{};
        values.open.textContent=fmt(counts.production_prs);
        values.candidates.textContent=fmt(counts.candidates);
        values.workers.textContent=fmt(counts.worker_dispatches);
        const accepted=counts.dispatch_requests_accepted;
        const age=Number.isSafeInteger(data.age_minutes)?data.age_minutes:null;
        const stale=age===null||age>20||data.feed_error;
        line.classList.toggle('hh-ct-stale',!!stale);
        const pieces=[];
        if(stale)pieces.push('УСТАРЕВШИЙ ОТЧЁТ — требуется новый реальный запуск');
        else pieces.push('Отчёт подтверждён');
        pieces.push('Для обработки: '+fmt(counts.actionable_prs));
        pieces.push('Принято запросов передачи: '+fmt(accepted));
        pieces.push('Worker: '+fmt(counts.worker_dispatches));
        line.textContent=pieces.join(' · ');
        if(typeof data.run_url==='string'&&data.run_url.startsWith('https://github.com/andylitvinov-design/books/actions/runs/'))
          runLink.href=data.run_url;
        const t=Date.parse(data.checked_at||'');
        const time=Number.isFinite(t)?new Intl.DateTimeFormat('ru-RU',{
          timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',hour12:false
        }).format(new Date(t)):'время неизвестно';
        stamp.textContent=time+' · '+(age===null?'возраст неизвестен':age+' мин назад');
        blocked.replaceChildren();
        if(!data.blocked_reasons_complete){
          summary.textContent='Блокировки · данные пока неполные';
          node('p','hh-ct-empty','Последний отчёт не содержит полного списка причин. Ноль показывать нельзя.',blocked);
          details.open=true;
          return;
        }
        const reasons=Object.entries(data.blocked_reasons||{})
          .filter(([,n])=>Number.isSafeInteger(n)&&n>0)
          .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
        const total=reasons.reduce((s,[,n])=>s+n,0);
        summary.textContent='Блокировки · '+fmt(total)+' · посмотреть причины';
        if(reasons.length===0){
          node('p','hh-ct-empty',counts.candidates>0
            ?'Кандидаты есть, но конкретная причина не подтверждена.'
            :'В последнем проверенном проходе блокировок передачи не обнаружено.',blocked);
        }
        for(const [reason,count] of reasons.slice(0,12)){
          const item=node('div','hh-ct-blocker',undefined,blocked);
          const headline=node('div','hh-ct-blocker-head',undefined,item);
          node('span','hh-ct-blocker-name',REASON_LABELS[reason]||reason,headline);
          node('strong','hh-ct-blocker-count',fmt(count),headline);
          const sample=data.blocked_examples?.[reason]||[];
          if(Array.isArray(sample)&&sample.length){
            const refs=node('div','hh-ct-pr-refs',undefined,item);
            for(const entry of sample.slice(0,3)){
              if(!Number.isSafeInteger(entry?.pr_number)||entry.pr_number<1)continue;
              const a=node('a','hh-ct-pr','#'+entry.pr_number,refs);
              a.href='https://github.com/andylitvinov-design/books/pull/'+entry.pr_number;
              a.target='_blank';a.rel='noopener noreferrer';
            }
          }
        }
        details.open=reasons.length>0;
      }catch(error){
        line.classList.add('hh-ct-stale');
        line.textContent='Нет свежего подтверждения GitHub · '+String(error.message||'ошибка').slice(0,65);
        summary.textContent='Блокировки · отчёт недоступен';
        blocked.replaceChildren();
        node('p','hh-ct-empty','Не заменяем отсутствующие данные нулями.',blocked);
        details.open=true;
      }
    }
    refresh();
    setInterval(refresh,90000);
    return true;
  }
  function start(){
    if(mount())return;
    let attempts=0;
    const interval=setInterval(()=>{
      attempts++;
      if(mount()||attempts>=10)clearInterval(interval);
    },2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
