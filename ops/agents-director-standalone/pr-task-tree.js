'use strict';
/* HH_PR_TASK_TREE_V1 · live public PR inventory, no timers, no write authority. */
(function (env) {
  const REPO='andylitvinov-design/books';
  const BASE='https://api.github.com/repos/'+REPO;
  const KEY='hh-pr-task-tree-v1', TTL=15*60*1000, MAX_PAGES=6;
  const definitions=[["video","Video Studio",[["goal","Цель, категории, концепция и сценарий",[3852,3826,3782,3774,3691,3640,3626]],["ideas","Ideas, Voice, гипноэффекты и монтаж",[3811,3777,3767]],["scenes","PRO, персонажи, видеосцены и кинодизайн",[3853,3819,3612,3575,2276]],["render","Генерация, Safari, MP4 и сохранение",[3836,3833,3824,2625]],["director","AI Video Director и iHelp",[3843]],["publish","Публикация, YouTube и MyTube",[3748,3627,2517]]]],["messenger","AI Council, мессенджер и коммуникации",[["council","AI Council и ответы Telegram",[3869]],["chat","Диалоги, тесты, голосовые сообщения",[3823,3776,3647,1421]],["crm","CRM, WhatsApp и заявки клиентов",[2194,2177,1586,1384,1430,1447]],["voice","Голосовой Companion и озвучка",[3740,3434,2724]]]],["cabinet","Кабинет, диагностика и интеллект",[["tests","Тесты и психометрические методики",[2555,2554,2482,2180,1213,389,388,385,499,495,494,1017]],["profile","Профиль, отчёты и личный кабинет",[2703,2609,2560,2558,2557,2214,2176,2137,267,247]],["support","Holistic Support, цели и мандалы",[2983,2641,2553,2551,2545,2342,2340,2335]],["mind","Holistic Intelligence и безопасные рекомендации",[2613,2593,2572,2580,2556,2633]],["coaching","Коучинг и клиентские практики",[3735,2171,1996,1897,1824,1817]]]],["academy","Академия, Рейки и ОПОРА",[["reiki","Курс Рейки, инициация и сертификаты",[2525,2466,1955,1634,1605,1521,1464,204]],["opora","ОПОРА — 14-дневный антистресс",[1825,1808,1674,1546,1416,875,536,1539]],["courses","Курсы и учебные материалы",[1898,1823,1596,1554,1500,1594]],["masters","Кабинет мастера и публикация услуг",[2516,2212,2211,1980,2167,1847,752]],["business","Бизнес-программа и консультация",[1705,1624,1588]]]],["services","Услуги, оплата и заказы",[["offers","Услуги и оформление заказа",[1652,775,228,2679,2117]],["wallet","Баланс XP, кошелёк и оплаты",[2705,2634]],["remote","Дистанционная поддержка и талисманы",[2315,2288]],["events","События и билеты",[2307]]]],["growth","Маркетинг, соцсети и SEO",[["social","Instagram, реклама и продвижение",[2306,2259,2287,1821,374]],["home","Главная, путь клиента и персональные рекомендации",[1683,1531]]]],["platform","Agent Commander, CI и приложения",[["commander","Agent Commander и постановка задач",[3866]],["ci","Watchdog, CI и автоматизация PR",[3183]],["apps","PWA и Android",[3812,3121,3111]]]]];
  const overlapSets=[
    ['Goal: второй шаг и общий экран',[3826,3782,3774]],
    ['Safari: проверка MP4 / WebM',[3836,3833]],
    ['Android: подпись APK',[3121,3111]],
    ['Рейки: приветственный экран',[1634,1605]]
  ];
  function curatedIndex() {
    const map=new Map();
    for(const [d,,tasks] of definitions)for(const [t,,numbers] of tasks){
      for(const n of numbers){
        if(map.has(n))throw Error('DUPLICATE_TOPIC_OWNER_'+n);
        map.set(n,d+'/'+t);
      }
    }
    return map;
  }
  const curated=curatedIndex();
  const fallback=[
    [/commander|command.center|постановк.*задач|agent.*task/i,'platform/commander'],
    [/watchdog|(?:^|\W)ci(?:\W|$)|merge|workflow|runner|control.tower/i,'platform/ci'],
    [/android|(?:^|\W)pwa(?:\W|$)/i,'platform/apps'],
    [/council|мудрец/i,'messenger/council'],
    [/whatsapp|telegram|crm|intake|messenger|client enquiry/i,'messenger/crm'],
    [/companion|(?:^|\W)voice(?:\W|$)|tts|wav|голос/i,'messenger/voice'],
    [/mp4|webm|safari|render|playback|upload|export/i,'video/render'],
    [/video.*(concept|goal|category|taxonom|wish)|concept.*video|цель.*видео/i,'video/goal'],
    [/ihelp|video director/i,'video/director'],
    [/mytube|youtube|publish.*video/i,'video/publish'],
    [/cinema|character|footage|scene|kinodesign|персонаж/i,'video/scenes'],
    [/video|montage|hypno|ideas|виде/i,'video/ideas'],
    [/assessment|psychometric|ipip|bfas|test|тест|диагност/i,'cabinet/tests'],
    [/reiki|рейки/i,'academy/reiki'],
    [/opora|опора|anti.stress/i,'academy/opora'],
    [/academy|course|lesson|обучен|курс/i,'academy/courses'],
    [/master|practitioner|мастер/i,'academy/masters'],
    [/business|бизнес/i,'academy/business'],
    [/coaching|коучинг/i,'cabinet/coaching'],
    [/intelligence|meditation|psychologist|recommendation/i,'cabinet/mind'],
    [/support|mandala|talisman|талисман/i,'cabinet/support'],
    [/cabinet|profile|report|клиентск.*кабинет/i,'cabinet/profile'],
    [/payment|wallet|checkout|revenue|(?:^|\W)xp(?:\W|$)/i,'services/wallet'],
    [/services|service|booking|заказ|услуг/i,'services/offers'],
    [/event|ticket|билет/i,'services/events'],
    [/instagram|seo|meta.*ad|advertising/i,'growth/social'],
    [/home|landing|onboarding/i,'growth/home']
  ];
  const byDirection={
    'video':'video/ideas','messenger-crm':'messenger/chat',
    'audio-hypno':'messenger/voice','cabinet-diagnostics':'cabinet/profile',
    'academy-courses':'academy/courses','orders-payments':'services/offers',
    'seo-growth':'growth/social','platform':'platform/ci'
  };
  function labels(p){return p.labels.map(l=>String(typeof l==='string'?l:l.name||''));}
  function route(p){
    if(curated.has(p.number))return {key:curated.get(p.number),method:'curated'};
    const title=String(p.title||'');
    for(const [regex,key] of fallback)if(regex.test(title))return {key,method:'keyword'};
    const direction=labels(p).find(l=>l.startsWith('hh:direction:'));
    const key=byDirection[direction?.slice(13)]||'unassigned/triage';
    return {key,method:key.startsWith('unassigned')?'review':'direction'};
  }
  function statusOf(p){
    const x=labels(p);
    if(x.includes('hh:hold'))return 'hold';
    if(p.draft)return 'draft';
    if(x.includes('hh:repair-manual')||x.includes('hh:conflict-repair-needed')||
       x.includes('hh:merge-stage:manual'))return 'manual';
    return 'open';
  }
  function slim(p){
    if(!p||!Number.isSafeInteger(p.number)||p.number<1||
      typeof p.title!=='string'||typeof p.draft!=='boolean'||
      typeof p.base?.ref!=='string'||!Array.isArray(p.labels))throw Error('INCOMPLETE_GITHUB_PR');
    return {number:p.number,title:p.title.slice(0,360),draft:p.draft,
      base:{ref:p.base.ref},labels:labels(p).map(name=>({name})),
      updated_at:typeof p.updated_at==='string'?p.updated_at:null};
  }
  function build(rows){
    if(!Array.isArray(rows)||rows.length>600)throw Error('INVALID_PR_POPULATION');
    const seen=new Set(), groups=[], lookup=new Map();
    for(const [d,dl,tasks] of definitions){
      const group={key:d,title:dl,tasks:[],count:0};
      for(const [t,tl] of tasks){
        const child={key:d+'/'+t,title:tl,prs:[]};
        group.tasks.push(child);lookup.set(child.key,child);
      }
      groups.push(group);
    }
    const unknown={key:'unassigned',title:'Новые PR · требуется разбор',tasks:[{key:'unassigned/triage',title:'Назначить направление',prs:[]}],count:0};
    lookup.set('unassigned/triage',unknown.tasks[0]);
    const counts={total:0,production:0,control:0,stacked:0,draft:0,hold:0,manual:0,open:0,preliminary:0};
    for(const raw of rows){
      const p=slim(raw);
      if(seen.has(p.number))throw Error('DUPLICATE_PR_'+p.number);
      seen.add(p.number);
      const routed=route(p),status=statusOf(p);
      const task=lookup.get(routed.key)||unknown.tasks[0];
      task.prs.push({...p,status,method:routed.method});
      counts.total++;counts[status]++;
      if(routed.method!=='curated')counts.preliminary++;
      if(p.base.ref==='codex/public-book-library')counts.production++;
      else if(p.base.ref==='codex/bootstrap-books')counts.control++;
      else counts.stacked++;
    }
    const all=[...groups,unknown];
    for(const g of all){
      g.tasks=g.tasks.filter(t=>t.prs.length);
      for(const t of g.tasks)t.prs.sort((a,b)=>b.number-a.number);
      g.count=g.tasks.reduce((n,t)=>n+t.prs.length,0);
    }
    const active=all.filter(g=>g.count);
    if(active.reduce((n,g)=>n+g.count,0)!==counts.total||
      counts.production+counts.control+counts.stacked!==counts.total||
      counts.draft+counts.hold+counts.manual+counts.open!==counts.total)
      throw Error('TREE_COVERAGE_MISMATCH');
    return {groups:active,counts,overlaps:overlapSets.map(([title,ids])=>({
      title,ids:ids.filter(n=>seen.has(n))})).filter(x=>x.ids.length>1)};
  }

  function taskOverview(prs){
    if(!Array.isArray(prs)||!prs.length)throw Error('TASK_HAS_NO_OPEN_PRS');
    const counts={hold:0,manual:0,draft:0,open:0};
    for(const p of prs){if(!(p.status in counts))throw Error('UNKNOWN_PR_STATUS');counts[p.status]++;}
    const state=counts.hold?'hold':counts.manual?'repair':counts.draft?'working':'review';
    const names={hold:'Блокировано',repair:'На доработке',working:'В разработке',review:'Ожидает проверки'};
    return {state,label:names[state],total:prs.length,counts,liveConfirmed:false,
      note:'Статус по открытым PR не означает завершения задачи'};
  }
  function reviewPrompt(task){
    if(!task||typeof task.title!=='string'||!Array.isArray(task.prs)||!task.prs.length)throw Error('NO_REVIEWABLE_TASK');
    return [
      'НЕЗАВИСИМАЯ ПРОВЕРКА · Agent Commander',
      'Задача: '+task.title,
      'PR:',
      ...task.prs.map(p=>'#'+p.number+' · '+p.title+' · https://github.com/'+REPO+'/pull/'+p.number),
      'Сверить исходную задачу, текущие HEAD и diff каждого PR, совместимость и регрессии.',
      'Проверить тесты, потребительский сценарий, мобильный UI, права, стоимость и безопасность.',
      'Выдать отчёт с конкретными ошибками, ссылками, нужными тестами и ответственным PR.',
      'Не закрывать, не мержить и не запускать код. МERGED ≠ LIVE. Если LIVE не проверен, писать LIVE_NOT_VERIFIED.'
    ].join('\n');
  }
  const api={build,slim,route,statusOf,curatedIndex,definitions,overlapSets,taskOverview,reviewPrompt};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(!env?.document||!env.fetch)return;
  const host=env.document.getElementById('hh-pr-task-tree');if(!host)return;
  let list=[],received=0,loading=false,filter='';
  const taskReports=new Map();
  const el=(tag,cls,txt)=>{const node=env.document.createElement(tag);
    if(cls)node.className=cls;if(txt!==undefined)node.textContent=String(txt);return node;};
  const link=n=>{const a=el('a','hh-pt-link','#'+n);
    a.href='https://github.com/'+REPO+'/pull/'+n;a.target='_blank';a.rel='noopener noreferrer';return a;};
  const statusText={hold:'HOLD',draft:'Draft',manual:'Ручная доработка',open:'Открыт'};
  const heading=el('header','hh-pt-head');
  heading.append(el('div',null,'ДЕРЕВО ЗАДАЧ · GITHUB PR'),el('h2',null,'Направления → задачи → PR'));
  const description=el('p','hh-pt-help','Список открытых PR. Тематическая привязка не равна выполнению; CI, Merge и LIVE проверяются отдельно.');
  const controls=el('div','hh-pt-controls'),search=el('input');
  search.type='search';search.placeholder='Задача или PR #…';search.setAttribute('aria-label','Найти задачу или PR');
  const refresh=el('button','hh-pt-refresh','Обновить GitHub');refresh.type='button';
  controls.append(search,refresh);
  const stamp=el('p','hh-pt-stamp','Читаю открытую очередь…');stamp.setAttribute('role','status');
  stamp.setAttribute('aria-live','polite');
  const output=el('div','hh-pt-output');
  host.replaceChildren(heading,description,controls,stamp,output);

  async function auditTask(task,report,button){
    if(button.disabled)return;
    if(!env.HHPMProof?.evaluatePR){report.textContent='Нет валидатора exact-HEAD. Проверка недоступна.';return;}
    const state={checked:0,pass:0,fail:0,pending:0,unknown:0,merged:0,errors:[],lines:[]};
    button.disabled=true;button.textContent='Проверяю…';
    report.textContent='Читаю текущие PR и HEAD без запуска CI…';
    try{
      for(const item of task.prs.slice(0,12)){
        try{
          const r=await env.fetch(BASE+'/pulls/'+item.number,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
          if(!r.ok)throw Error('PR HTTP '+r.status);
          const p=await r.json();
          if(p.number!==item.number||p.base?.repo?.full_name!==REPO)throw Error('IDENTITY_UNVERIFIED');
          if(!/^[0-9a-f]{40}$/i.test(p.head?.sha||''))throw Error('HEAD_UNVERIFIED');
          const flags=(p.labels||[]).map(x=>x.name);
          const manual=p.draft||flags.some(n=>['hh:hold','hh:repair-manual',
            'hh:conflict-repair-needed','hh:merge-stage:manual'].includes(n));
          let checks=null;
          if(p.state==='open'&&!manual){
            const c=await env.fetch(BASE+'/commits/'+p.head.sha+'/check-runs?per_page=100',
              {cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
            if(!c.ok)throw Error('CHECKS HTTP '+c.status);
            checks=await c.json();
          }
          const proof=env.HHPMProof.evaluatePR(p,checks,new Date().toISOString());
          if(proof.pr==='unknown')throw Error('PROOF_INVALID');
          state.checked++;state[proof.ci]++;
          if(proof.pr==='merged')state.merged++;
          state.lines.push('#'+item.number+': '+proof.label);
        }catch(error){state.errors.push('#'+item.number+' · '+String(error.message||error).slice(0,70));}
      }
      const text=[
        'Проверено '+state.checked+'/'+task.prs.length+' PR · MERGED '+state.merged+
        ' · CI PASS '+state.pass+' / FAIL '+state.fail+' / PENDING '+state.pending+' / UNKNOWN '+state.unknown+'.',
        'Функциональный LIVE не подтверждён; завершение задачи требует отдельной приёмки.',
        ...state.lines,...state.errors.map(x=>'Не удалось проверить '+x)
      ].join('\n');
      taskReports.set(task.key,{text,at:Date.now()});report.textContent=text;
    }finally{button.disabled=false;button.textContent='Проверить задачу';}
  }
  async function handoff(task,button,output){
    const prompt=reviewPrompt(task);
    try{
      if(!env.navigator?.clipboard?.writeText)throw Error('COPY_UNSUPPORTED');
      await env.navigator.clipboard.writeText(prompt);
      button.textContent='ТЗ скопировано ✓';
      output.textContent='Для запуска проверяющего агента откройте защищённый Commander.';
    }catch{
      const area=el('textarea','hh-pt-review-fallback');area.readOnly=true;area.value=prompt;
      area.setAttribute('aria-label','ТЗ проверки для ручного копирования');
      output.replaceChildren(area);area.focus();area.select();
      button.textContent='ТЗ выделено';
    }
  }
  function draw(stale){
    const model=build(list);output.replaceChildren();
    const metrics=el('div','hh-pt-metrics');
    for(const [label,num] of [['Открытые PR',model.counts.total],['Направления',model.groups.length],
      ['Draft',model.counts.draft],['Нужна доработка',model.counts.manual+model.counts.hold]]){
      const div=el('span',null);div.append(el('strong',null,num),el('small',null,label));metrics.append(div);
    }
    output.append(metrics);
    const hints=el('p','hh-pt-help','Production: '+model.counts.production+' · Control: '+model.counts.control+
      ' · Stacked: '+model.counts.stacked+
      (model.counts.preliminary?' · Предварительная классификация: '+model.counts.preliminary:'')+
      ' · статус «Открыт» не означает готовность к merge');
    output.append(hints);
    const needle=filter.trim().toLocaleLowerCase('ru-RU').slice(0,120);
    let shown=0;
    for(const [i,group] of model.groups.entries()){
      const g=el('details','hh-pt-direction');g.open=!!needle||i===0;
      const gs=el('summary');
      gs.append(el('strong',null,group.title),el('span',null,group.count+' PR'));g.append(gs);
      let gVisible=0;
      for(const [j,task] of group.tasks.entries()){
        const matches=task.prs.filter(p=>!needle||[group.title,task.title,String(p.number),'#'+p.number,p.title]
          .some(v=>String(v).toLocaleLowerCase('ru-RU').includes(needle)));
        if(!matches.length)continue;
        const child=el('details','hh-pt-task');child.open=!!needle||(i===0&&j===0);
        const health=taskOverview(task.prs);
        const ts=el('summary');ts.append(el('strong',null,task.title),
          el('span',null,health.label+' · '+matches.length+' PR'));
        child.append(ts);
        child.append(el('p','hh-pt-task-summary',health.label+' · '+health.total+' открытых PR'+
          (health.counts.manual?' · доработка '+health.counts.manual:'')+
          (health.counts.draft?' · Draft '+health.counts.draft:'')+
          (health.counts.hold?' · HOLD '+health.counts.hold:'')+
          ' · готовность LIVE не проверена'));
        const controls=el('div','hh-pt-task-actions');
        const verify=el('button','hh-pt-refresh','Проверить задачу');verify.type='button';
        const agent=el('button','hh-pt-refresh hh-pt-handoff','ТЗ проверяющему агенту');agent.type='button';
        const report=el('p','hh-pt-audit',taskReports.get(task.key)?.text||
          'Проверка PR и точных HEAD пока не запускалась.');
        report.setAttribute('aria-live','polite');
        const agentReport=el('div','hh-pt-handoff-status');
        verify.addEventListener('click',()=>auditTask(task,report,verify));
        agent.addEventListener('click',()=>handoff(task,agent,agentReport));
        controls.append(verify,agent);child.append(controls,report,agentReport);
        env.HHPRContextComments?.mount({host:controls,container:child,kind:'task',title:task.title,prs:task.prs,context:group.title});
        for(const p of matches){
          const r=el('div','hh-pt-pr'),head=el('div','hh-pt-pr-head');
          head.append(link(p.number),el('span','hh-pt-badge hh-pt-'+p.status,statusText[p.status]));
          if(p.method!=='curated')head.append(el('span','hh-pt-badge','Предварительно'));
          r.append(head,el('p',null,p.title),el('small',null,
            (p.base.ref==='codex/public-book-library'?'Production':p.base.ref==='codex/bootstrap-books'?'Control':'Stacked')+
            (p.labels.map(x=>x.name).find(x=>/^hh:priority:[1-5]$/.test(x))?' · P'+p.labels.find(x=>/^hh:priority:[1-5]$/.test(x.name)).name.slice(-1):'')));
          env.HHPRContextComments?.mount({host:head,container:r,kind:'pr',title:p.title,prs:[p],context:task.title});
          child.append(r);
        }
        g.append(child);gVisible+=matches.length;
      }
      if(gVisible){output.append(g);shown+=gVisible;}
    }
    if(!shown)output.append(el('p','hh-pt-help',needle?'По запросу PR не найдены.':'Открытых PR нет.'));
    if(model.overlaps.length&&!needle){
      const panel=el('details','hh-pt-overlaps');const sum=el('summary');
      sum.append(el('strong',null,'Проверить пересечения'),el('span',null,model.overlaps.length+' группы'));
      panel.append(sum,el('p','hh-pt-help','Это кандидаты на сравнение реализации, не доказанные дубликаты. Автоматического закрытия и merge нет.'));
      for(const pair of model.overlaps){const row=el('div','hh-pt-pair');row.append(el('span',null,pair.title));
        for(const n of pair.ids)row.append(link(n));panel.append(row);}
      output.append(panel);
    }
    const age=Math.max(0,Date.now()-received);
    stamp.textContent=(stale?'Сохранённый, не обновлённый срез: ':'GitHub · срез: ')+
      new Date(received).toLocaleString('ru-RU',{timeZone:'America/Toronto'})+
      ' Toronto'+(age>TTL?' · старше 15 минут':'')+' · '+shown+' PR в выборке';
  }
  function readCache(){
    try{const v=JSON.parse(env.sessionStorage?.getItem(KEY)||'null');
      if(v&&v.schema==='HH_PR_TASK_TREE_V1'&&Array.isArray(v.rows)&&
        Number.isFinite(v.at)&&v.at<=Date.now()&&Date.now()-v.at<3600000){
        build(v.rows);return v;
      }
    }catch{}return null;
  }
  async function fetchAll(){
    const rows=[];
    for(let page=1;page<=MAX_PAGES;page++){
      const response=await env.fetch(BASE+'/pulls?state=open&per_page=100&sort=created&direction=desc&page='+page,
        {headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
      if(!response.ok)throw Error('GitHub HTTP '+response.status);
      const chunk=await response.json();
      if(!Array.isArray(chunk)||chunk.length>100)throw Error('BAD_GITHUB_PAGE');
      rows.push(...chunk.map(slim));
      if(chunk.length<100){build(rows);return rows;}
    }
    throw Error('GITHUB_PAGINATION_INCOMPLETE');
  }
  async function load(force){
    if(loading)return;
    const cached=readCache();
    if(!force&&cached&&Date.now()-cached.at<TTL){
      list=cached.rows;received=cached.at;draw(false);return;
    }
    if(cached){list=cached.rows;received=cached.at;draw(true);}
    loading=true;refresh.disabled=true;stamp.textContent='Проверяю полный список открытых PR в GitHub…';
    try{
      const current=await fetchAll();list=current;received=Date.now();taskReports.clear();
      try{env.sessionStorage?.setItem(KEY,JSON.stringify({schema:'HH_PR_TASK_TREE_V1',at:received,rows:list}));}catch{}
      draw(false);
    }catch(error){
      if(cached){list=cached.rows;received=cached.at;draw(true);
        stamp.textContent+=' · Обновление недоступно: '+String(error.message||error).slice(0,70);}
      else {output.replaceChildren();stamp.textContent='Данные GitHub недоступны: '+
        String(error.message||error).slice(0,75)+'. Нельзя считать очередь пустой.';
        const a=el('a','hh-pt-link','Открыть все PR в GitHub');a.href='https://github.com/'+REPO+'/pulls?q=is%3Apr+is%3Aopen';
        a.target='_blank';a.rel='noopener noreferrer';output.append(a);}
    }finally{loading=false;refresh.disabled=false;}
  }
  search.addEventListener('input',()=>{filter=search.value;if(received)draw(Date.now()-received>TTL);});
  refresh.addEventListener('click',()=>load(true));
  void load(false);
})(typeof window==='undefined'?null:window);
