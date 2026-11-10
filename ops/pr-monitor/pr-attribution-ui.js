'use strict';
(()=>{
  if(document.getElementById('hh-pr-attribution'))return;
  const host=document.querySelector('main'); // Persistent: stage dashboard rerenders its own children
  if(!host)return;
  const label={
    created_to_first_ci:'Создание → первый CI',runner_wait:'Ожидание runner',
    checks:'Проверки CI',repair_after_failure:'Исправления после ошибок',
    conflict_resolution:'Разрешение конфликтов',repeat_ci:'Повторные CI',
    waiting_merge:'CI green → merge',unattributed:'Периоды без доказанной причины'
  };
  const gapLabels={
    created_to_first_observed_event:'После создания PR, до первого события',
    failed_ci_to_next_event:'После ошибки CI → следующее событие',
    green_ci_to_next_event:'После зелёного CI → следующее событие',
    source_published_to_next_event:'После изменения кода → следующее событие',
    repair_started_without_verified_publish:'После начала Repair без подтверждённой публикации',
    conflict_mark_to_next_event:'Метка конфликта → следующее событие',
    between_ci_events:'Между CI jobs и событиями',
    between_pr_events:'Между событиями PR',
    ambiguous_overlap:'Неподтверждённое пересечение источников',
    missing_evidence:'История событий отсутствует'
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

  // Supplementary evidence, never added again to the exclusive PR-clock bars.
  function renderRepairCycles(report){
    if(report?.schema!=='HH_PR_REPAIR_CYCLE_V1'||!Array.isArray(report.cycles))return;
    const section=elt('details','hh-pr-audit-events hh-pr-audit-repair');
    section.append(elt('summary',null,'Цепочка исправления · '+report.cycles.length+
      ' подтверждённых ошибок Core CI'));
    if(!report.cycles.length){
      section.append(elt('p','hh-pr-audit-none',
        'В просмотренной истории не найдено завершённых ошибкой Core jobs. Это не доказывает, что ошибок не было.'));
    }
    for(const row of report.cycles){
      const wrap=elt('div','hh-pr-audit-interval');
      const label='HEAD '+String(row.failed_head||'').slice(0,10);
      wrap.append(elt('strong',null,label+' · '+(row.failed_job?.name||'Core job')+
        (row.failed_job?.step?' / '+row.failed_job.step:'')));
      const failure=link(row.failed_job?.url);
      if(failure){const a=elt('a',null,' · Лог ошибки');a.href=failure;a.target='_blank';
        a.rel='noopener noreferrer';wrap.append(a);}
      const list=elt('ol','hh-pr-audit-event-list');
      const t=row.timestamps||{},d=row.durations_minutes||{},refs=row.links||{};
      for(const [title,at,span,url,info] of [
        ['Ошибка CI',t.ci_failed_at,null,row.failed_job?.url,'Первый завершённый ошибкой job в проверенном Core run'],
        ['Агент закреплён',t.owner_claimed_at,d.failure_to_claim,refs.claim,
          row.owner_claimed?'Заявленный владелец: '+row.owner_claimed:'Событие назначения не подтверждено'],
        ['Начало Repair заявлено',t.repair_declared_at,d.claim_to_repair,refs.repair,
          'Это отметка о начале, не измеренное время редактирования'],
        ['Новый HEAD',t.new_head_commit_event_at,d.repair_to_commit_event,refs.next_head,
          row.next_head?'SHA '+row.next_head.slice(0,12)+' · событие committed ≠ точное время push':'Публикация не подтверждена'],
        ['Новая CI создана',t.new_ci_created_at,d.commit_event_to_ci,refs.next_ci,
          'Событие workflow GitHub, не время ожидания исполнителя'],
        ['Создан первый CI job',t.first_job_created_at,d.ci_to_job_created,refs.next_ci,
          'Создание job; не начало работы runner'],
        ['Runner начал job',t.runner_started_at,d.job_created_to_runner,refs.next_ci,
          'Ожидание может включать workflow needs и concurrency']
      ]){
        const item=elt('li');
        const time=elt('time',null,fmtDate(at));if(at)time.dateTime=at;
        const value=elt('span',null,title);
        const href=link(url);
        if(href){const a=elt('a',null,'Источник');a.href=href;a.target='_blank';
          a.rel='noopener noreferrer';value.append(' · ',a);}
        const duration=elt('strong',null,span==null?'—':fmtMin(span));
        duration.title=info;item.append(time,value,duration);list.append(item);
      }
      // Supplemental breakdown of the already accounted PR clock: NOT additive.
      const latency=row.latency;
      if(latency?.schema==='HH_PR_REPAIR_LATENCY_V2'&&latency.reconciled===true){
        const section=elt('section','hh-pr-latency');
        section.append(elt('h4',null,'Где задерживается исправление после красной CI'));
        section.append(elt('p','hh-pr-audit-foot',
          (latency.status==='IN_PROGRESS'?'Открытое ожидание с момента ошибки: ':
           'Ошибка Core job → новая CI другого HEAD: ')+fmtMin(latency.total_minutes)+
          ' · подтверждено '+fmtMin(latency.observed_minutes)+
          ' · не измерено '+fmtMin(latency.unattributed_minutes)));
        const rows=elt('div','hh-pr-latency-rows');
        for(const phase of latency.phases||[]){
          const line=elt('div','hh-pr-latency-row');
          line.append(elt('span',null,phase.label),
            elt('strong',null,phase.minutes===null?'Не измерено':fmtMin(phase.minutes)));
          for(const url of phase.evidence_urls||[]){
            const href=link(url);if(!href)continue;
            const a=elt('a','hh-pr-latency-link','Источник GitHub');
            a.href=href;a.target='_blank';a.rel='noopener noreferrer';line.append(a);
          }
          rows.append(line);
        }
        const unknown=elt('div','hh-pr-latency-row hh-pr-latency-unknown');
        unknown.append(elt('span',null,'Время без проверенных меток'),
          elt('strong',null,fmtMin(latency.unattributed_minutes)));
        rows.append(unknown);
        section.append(rows);
        if(latency.status==='IN_PROGRESS'){
          section.append(elt('p','hh-pr-audit-foot',latency.pending_age_minutes===null?
            'Новый HEAD не подтверждён. Причина текущего ожидания неизвестна.':
            'Патч проверен, но HEAD ещё не опубликован: прошло '+fmtMin(latency.pending_age_minutes)+
              '. Это незавершённый интервал, не среднее по завершённым PR.'));
        }
        section.append(elt('p','hh-pr-audit-foot',latency.note));
        wrap.append(section);
      }
      wrap.append(list,elt('p','hh-pr-audit-foot',
        'Время реального редактирования, получение задачи агентом и точное время push не установлены. '+
        'Ошибка job — место сбоя, а не подтверждённая первопричина.'));
      section.append(wrap);
    }
    section.append(elt('p','hh-pr-audit-foot',
      'Данные только из существующего запроса к GitHub. Отсутствие времени отмечено «—», не нулём. '+
      'История '+(report.cycles.some(c=>!c.evidence?.run_history_complete||
        !c.evidence?.timeline_complete||!c.evidence?.comments_complete)?'частичная':'проверена для найденных событий')+
      '. Интервалы нельзя прибавлять к уже показанному общему времени PR.'));
    result.append(section);
  }

  function renderTaskOutcomes(rows){
    if(!Array.isArray(rows)||!rows.length)return;
    const section=elt('details','hh-pr-audit-events hh-pr-audit-repair');
    section.append(elt('summary',null,'Результаты Repair Worker · '+rows.length+
      ' подписанных решений'));
    const labels={
      FIXED:'Исправление опубликовано · CI ещё проверяется',
      VERIFIED:'Исправление и required CI подтверждены',
      RETRY_SCHEDULED:'Назначена ограниченная повторная попытка',
      REROUTED:'Передано другому исполнителю',
      WAITING_INPUT:'Ожидаются данные или доступ',
      MANUAL_REQUIRED:'Требуется действие владельца',
      KNOWN_ISSUE:'Известная проблема · есть план',
      NOT_ACTIONABLE:'Исправление исходников не требуется',
      BLOCKED:'Задача заблокирована',
      UNCLASSIFIED:'Ошибка ещё не классифицирована'
    };
    for(const row of rows){
      const wrap=elt('div','hh-pr-audit-interval');
      const head='HEAD '+String(row.head_sha||'').slice(0,12);
      wrap.append(elt('strong',null,(labels[row.status]||row.status)+' · '+head+
        (row.current_head?' · текущий HEAD':' · предыдущий HEAD')));
      const list=elt('ol','hh-pr-audit-event-list');
      const items=[
        ['Причина',row.reason_code],
        ['Ответственный',row.responsible_role],
        ['Следующее действие',row.next_action],
        ['Следующая проверка',row.next_check_at?fmtDate(row.next_check_at):'Не назначена']
      ];
      for(const [name,value] of items){
        const li=elt('li');li.append(elt('span',null,name),elt('strong',null,value||'—'));
        list.append(li);
      }
      const links=elt('p','hh-pr-audit-foot');
      const comment=link(row.comment_url),run=link(row.run_url),commit=link(
        row.new_sha?'https://github.com/andylitvinov-design/books/commit/'+row.new_sha:null);
      if(comment){const a=elt('a',null,'Квитанция результата');a.href=comment;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
      if(run){if(links.childNodes.length)links.append(' · ');const a=elt('a',null,'Запуск Worker');a.href=run;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
      if(commit){if(links.childNodes.length)links.append(' · ');const a=elt('a',null,'Опубликованный commit');a.href=commit;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
      wrap.append(list,links);
      if(row.recorded_status==='FIXED'&&row.status==='VERIFIED'){
        const note=elt('p','hh-pr-audit-foot',
          'Проверено: текущий HEAD совпадает с опубликованным SHA, а Core, Specialist и Merge Gate прошли в одной успешной CI-попытке.');
        const verified=link(row.verification_url);
        if(verified){const a=elt('a',null,' · Проверка exact HEAD');a.href=verified;a.target='_blank';a.rel='noopener noreferrer';note.append(a);}
        wrap.append(note);
      }else if(row.recorded_status==='FIXED'){
        wrap.append(elt('p','hh-pr-audit-foot',
          'Новый source SHA подтверждён на PR, но VERIFIED ещё не присвоен: ожидается независимая зелёная проверка обязательных gates на точном HEAD.'));
      }
      section.append(wrap);
    }
    section.append(elt('p','hh-pr-audit-foot',
      'Решения читаются только из неизменённых комментариев доверенного GitHub Actions App. Отправка prompt, принятие задачи или зелёный workflow сами по себе не считаются исправлением.'));
    result.append(section);
  }

  function render(data){
    result.replaceChildren();
    const line=elt('div','hh-pr-audit-summary');
    const title=elt('a','hh-pr-audit-pr',`PR #${data.pr_number}`);
    title.href=data.pr_url;title.rel='noopener noreferrer';title.target='_blank';
    line.append(title);
    for(const [k,v] of [
      ['Полное время',fmtMin(data.elapsed_minutes)],
      ['Причина подтверждена',`${data.accounted_percent}%`],
      ['Без доказанной причины',fmtMin(data.unattributed_minutes)],
      ['Повторные CI',data.repeated_attempts],
      ['Ошибки checks',data.failures]]){
      const box=elt('div','hh-pr-audit-stat');box.append(elt('small',null,k),elt('strong',null,v));line.append(box);
    }
    result.append(line);
    const stamp=elt('p','hh-pr-audit-stamp',
      `${fmtDate(data.created_at)} — ${fmtDate(data.ended_at)} · ${data.state==='merged'?'Смёржен':data.state==='open'?'Открыт':'Закрыт без merge'}`);
    result.append(stamp);
    if(window.HHPrLifecycle?.render)window.HHPrLifecycle.render(result,data);
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

    renderRepairCycles(data.repair_cycles);
    renderTaskOutcomes(data.task_outcomes);

    if(data.source?.history_partial){
      result.append(elt('p','hh-pr-audit-alert',
        'История GitHub неполная: пропущенные события не означают ноль минут или простой исполнителя.'));
    }
    result.append(elt('p','hh-pr-audit-stamp',
      'Доказанная причина ≠ наблюдаемый промежуток. Границы этапов подтверждены GitHub, но без парных событий нельзя приписывать всё время ожиданию runner, ремонту или человеку.'));
    const rawUnknownMs=(data.stage_totals_ms?.unattributed ?? Math.round(Number(data.unattributed_minutes||0)*60000));
    const groupedMs=Object.values(data.gap_context_ms||{}).reduce((sum,ms)=>sum+(Number.isSafeInteger(ms)&&ms>=0?ms:0),0);
    const groupedValid=!!data.gap_context_ms&&Object.values(data.gap_context_ms).every(ms=>Number.isSafeInteger(ms)&&ms>=0)&&groupedMs===rawUnknownMs;
    if(data.gap_context_ms&&!groupedValid){
      result.append(elt('p','hh-pr-audit-alert',
        'Сумма контекстных интервалов не совпала с длительностью PR. Показываем исходные GitHub-интервалы без распределения по категориям.'));
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
      if(key==='unattributed'&&groupedValid){
        const grouped=[...Object.entries(data.gap_context_ms)]
          .filter(([,ms])=>ms>0).sort((a,b)=>b[1]-a[1]);
        for(const [kind,ms] of grouped){
          const subgroup=elt('details','hh-pr-audit-stage');
          const subgroupTitle=elt('summary');
          subgroupTitle.append(elt('span',null,gapLabels[kind]||'Неидентифицированные события'),
            elt('b',null,fmtMin(ms)));
          subgroup.append(subgroupTitle);
          for(const row of relevant.filter(x=>(x.substage||'unknown')===kind)){
            const item=elt('div','hh-pr-audit-interval');
            item.append(elt('div','hh-pr-audit-clock',`${fmtDate(row.start_at)} → ${fmtDate(row.end_at)}`),
              elt('strong','hh-pr-audit-duration',fmtMin(row.duration_minutes)),
              elt('p',null,row.reason||'Реальная причина этого промежутка не установлена'));
            const links=elt('div','hh-pr-audit-links');
            for(const [i,u] of (row.evidence_urls||[]).entries()){
              const href=link(u);if(!href)continue;
              const a=elt('a',null,i===0?'Начальное событие GitHub':'Следующее событие / PR');
              a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
            }
            if(links.childElementCount)item.append(links);
            subgroup.append(item);
          }
          details.append(subgroup);
        }
      }
      for(const row of key==='unattributed'&&groupedValid?[]:relevant){
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
      'Повторный CI включает только подтверждённую очередь и выполнение. Параллельные jobs учитываются по общей длительности PR один раз. Контекстные промежутки показывают событие до/после, но не доказывают причину задержки.'));
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
