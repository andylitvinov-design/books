'use strict';
(()=>{
  if(document.getElementById('hh-pr-attribution'))return;
  const host=document.querySelector('main'); // Persistent: stage dashboard rerenders its own children
  if(!host)return;
  const label={
    created_to_first_ci:'Создание → первый CI',runner_wait:'Ожидание runner',
    checks:'Проверки CI',repair_after_failure:'Исправления после ошибок',
    conflict_resolution:'Разрешение конфликтов',repeat_ci:'Повторные CI',
    waiting_merge:'CI green → merge',unattributed:'Нераспределённое время'
  };
  const showTime=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
    day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const fmtDate=x=>Number.isFinite(Date.parse(x||''))?showTime.format(new Date(x)):'Нет времени';
  const fmtMin=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?
    (n>=60?`${Math.floor(n/60)} ч ${Math.round(n%60)} мин`:n>=1?`${Number(n.toFixed(1))} мин`:`${Math.round(n*60)} сек`):'—';
  const fmtExactMs=v=>{
    if(!Number.isFinite(v)||v<0)return '—';
    const total=Math.round(v/1000),hours=Math.floor(total/3600);
    const mins=Math.floor((total%3600)/60),seconds=total%60;
    return (hours?hours+' ч ':'')+mins+' мин '+seconds+' сек';
  };
  const elt=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;
    if(value!=null)node.textContent=String(value);return node;};
  const link=url=>{
    try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='github.com'&&
      u.pathname.startsWith('/andylitvinov-design/books/')?u.href:null;
    }catch{return null;}
  };
  const panel=elt('section','hh-pr-audit');panel.id='hh-pr-attribution';
  const head=elt('div','hh-pr-audit-head');
  head.append(elt('h2',null,'Хронология PR: куда ушло время'),
    elt('p',null,'Время только по подтверждённым событиям GitHub. Отсутствующие данные — отдельно, без предположений. Все даты — Toronto.'));
  panel.append(head);
  const form=elt('form','hh-pr-audit-form');form.id='hh-pr-audit-form';
  const input=elt('input');input.type='number';input.min='1';input.max='999999';input.step='1';
  input.placeholder='Номер PR';input.inputMode='numeric';input.required=true;
  input.setAttribute('aria-label','Номер PR');
  const submit=elt('button',null,'Показать хронологию');submit.type='submit';
  const live=elt('span','hh-pr-audit-state','Введите номер PR, чтобы проверить подтверждённые события.');
  live.setAttribute('role','status');live.setAttribute('aria-live','polite');
  form.append(input,submit);panel.append(form,live);
  const result=elt('div','hh-pr-audit-result');panel.append(result);
  host.append(panel);
  let active=null;
  function render(data){
    result.replaceChildren();
    const line=elt('div','hh-pr-audit-summary');
    const title=elt('a','hh-pr-audit-pr',`PR #${data.pr_number}`);
    title.href=data.pr_url;title.rel='noopener noreferrer';title.target='_blank';
    line.append(title);
    for(const [k,v] of [
      ['Полное время',fmtMin(data.elapsed_minutes)],
      ['Подтверждено',`${data.accounted_percent}%`],
      ['Нераспределено',fmtMin(data.unattributed_minutes)],
      ['Повторные CI',data.repeated_attempts],
      ['Ошибки checks',data.failures]]){
      const box=elt('div','hh-pr-audit-stat');box.append(elt('small',null,k),elt('strong',null,v));line.append(box);
    }
    result.append(line);
    const stamp=elt('p','hh-pr-audit-stamp',
      `${fmtDate(data.created_at)} — ${fmtDate(data.ended_at)} · ${data.state==='merged'?'Смёржен':data.state==='open'?'Открыт':'Закрыт без merge'}`);
    result.append(stamp);
    const live=data.live_evidence;
    const proof=elt('div','hh-pr-audit-alert',live?
      'LIVE подтверждён '+fmtDate(live.live_at)+' · Merge → LIVE: '+
        fmtExactMs(live.merge_to_live_ms)+
        ' · Created → LIVE: '+fmtExactMs(live.created_to_live_ms)+
        '. Это историческое подтверждение, не текущий алиас.':
      'LIVE ещё не подтверждён доступными квитанциями. Отсутствие записи НЕ означает, что версия не опубликована.');
    if(live?.receipt_url){const proofLink=elt('a',null,'Квитанция GitHub LIVE');
      proofLink.href=live.receipt_url;proofLink.target='_blank';proofLink.rel='noopener noreferrer';
      proof.append(' ',proofLink);}
    result.append(proof);

    const cps=data.journey?.checkpoints;
    if(Array.isArray(cps)&&cps.length){
      const rows=elt('details','hh-pr-audit-events');
      const confirmed=cps.filter(x=>x.evidence==='GITHUB_VERIFIED_EVENT').length;
      rows.append(elt('summary',null,'Контрольные точки PR: '+confirmed+' / '+cps.length+
       ' подтверждены · показать все этапы'));
      const list=elt('ol','hh-pr-audit-event-list');
      for(const cp of cps){
        const li=elt('li');
        li.append(elt('span',null,cp.label),
         elt('time',null,cp.at?fmtDate(cp.at):'Нет подтверждения'));
        const url=link(cp.url);
        if(url){const a=elt('a',null,'Источник');a.href=url;a.target='_blank';
          a.rel='noopener noreferrer';li.append(a);}
        list.append(li);
      }
      rows.append(list,elt('p','hh-pr-audit-foot',
       'Нет подтверждения ≠ ноль минут или неисправность. READY deployment измеряется отдельно от LIVE.'));
      result.append(rows);
    }

    if(data.source?.history_partial){
      result.append(elt('p','hh-pr-audit-alert',
        'История источников неполная: временные промежутки без записей остаются нераспределёнными.'));
    }
    const categories=elt('div','hh-pr-audit-stages');
    for(const [key,title] of Object.entries(label)){
      const relevant=data.intervals?.filter(x=>x.stage===key)||[];
      const total=data.stage_totals_minutes?.[key];
      const details=elt('details',key==='unattributed'?'hh-pr-audit-stage unknown':'hh-pr-audit-stage');
      if(key==='unattributed')details.open=true;
      const summary=elt('summary');summary.append(elt('span',null,title),
        elt('b',null,total>0?fmtMin(total):'Нет подтверждения'));
      details.append(summary);
      if(!relevant.length)details.append(elt('p','hh-pr-audit-none','Подтверждённых интервалов нет. Это не означает, что этап занимал 0 минут.'));
      for(const row of relevant){
        const item=elt('div','hh-pr-audit-interval');
        item.append(elt('div','hh-pr-audit-clock',`${fmtDate(row.start_at)} → ${fmtDate(row.end_at)}`),
          elt('strong','hh-pr-audit-duration',fmtMin(row.duration_minutes)),
          elt('p',null,row.reason||'Причина не подтверждена'));
        const urls=Array.isArray(row.evidence_urls)?row.evidence_urls:[];
        const links=elt('div','hh-pr-audit-links');
        for(const [i,u] of urls.entries()){
          const href=link(u);if(!href)continue;
          const a=elt('a',null,i===0?'Событие GitHub':'Дополнительное событие');
          a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
        }
        if(links.childElementCount)item.append(links);
        else item.append(elt('small','hh-pr-audit-no-proof','Ссылка на подтверждающее событие отсутствует'));
        details.append(item);
      }
      categories.append(details);
    }
    result.append(categories);
    const section=elt('details','hh-pr-audit-events');
    const sum=elt('summary',null,'Все зарегистрированные события по датам');
    section.append(sum);
    const table=elt('ol','hh-pr-audit-event-list');
    for(const event of data.chronology||[]){
      const li=elt('li');const tag=elt('time',null,fmtDate(event.at));tag.dateTime=event.at;
      li.append(tag,elt('span',null,event.reason||event.kind));
      const href=link(event.url);if(href){const a=elt('a',null,'Открыть событие');
        a.href=href;a.target='_blank';a.rel='noopener noreferrer';li.append(a);}
      table.append(li);
    }
    if(!table.childElementCount)section.append(elt('p',null,'События не найдены.'));
    else section.append(table);
    result.append(section);
    result.append(elt('p','hh-pr-audit-foot',
      'Повторный CI включает только подтверждённую очередь и выполнение. При параллельных jobs их wall-clock учитывается один раз. Незаписанные ожидания, включая промежутки после ошибок, остаются нераспределёнными.'));
  }
  async function load(n){
    if(active)active.abort();active=new AbortController();
    live.textContent=`Проверяю PR #${n} по GitHub...`;submit.disabled=true;
    try{
      const response=await fetch('/api/pr-attribution?pr='+encodeURIComponent(n),
        {signal:active.signal,cache:'no-store'});
      const data=await response.json();
      if(!response.ok||data.schema!=='HH_PR_ATTRIBUTION_V1'||!Array.isArray(data.intervals))
        throw Error(data.error||'Данные не подтверждены');
      render(data);
      live.textContent=data.stale?'Показан последний проверенный снимок: GitHub сейчас недоступен.':
        'Подтверждённые данные по выбранному PR загружены.';
    }catch(error){
      if(error.name==='AbortError')return;
      result.replaceChildren();
      live.textContent=`Хронология недоступна: ${String(error.message||error).slice(0,120)}. Неизвестное время не считается нулём.`;
    }finally{submit.disabled=false;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();const n=Number(input.value);
    if(Number.isSafeInteger(n)&&n>0&&n<=999999)load(n);
  });
  const pr=Number(new URLSearchParams(location.search).get('pr'));
  if(Number.isSafeInteger(pr)&&pr>0&&pr<=999999){input.value=String(pr);load(pr);}
})();
