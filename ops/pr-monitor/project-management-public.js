'use strict';
(function () {
  const HOST = 'https://api.github.com/repos/andylitvinov-design/books';
  const SNAPSHOT = '/project-management-public.json';
  const root = document.getElementById('pm-root');
  const info = document.getElementById('pm-info');
  const inspected = new Map();
  let current = null;
  const L = {verified:'Подтверждено',partial:'Частично',planned:'Не начато',blocked:'Блокировано'};
  const status = s => Object.prototype.hasOwnProperty.call(L,s)?s:'planned';
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=String(text);
    return n;
  }
  function button(text,fn,cls){
    const n=el('button',cls||'pm-btn',text);
    n.type='button';n.addEventListener('click',fn);return n;
  }
  function count(tasks){
    const x={verified:0,partial:0,planned:0,blocked:0,withPR:0,total:0};
    for(const t of tasks){x.total++;x[status(t.status)]++;if(t.prs.length)x.withPR++;}
    return x;
  }
  function badges(row,total){
    const c=el('div','pm-badges');
    for(const key of ['verified','partial','planned','blocked','withPR']){
      const lab=key==='withPR'?'Есть PR':L[key];
      c.appendChild(el('span','pm-badge',row[key]+' · '+lab));
    }
    const bar=el('progress','pm-progress');bar.max=total||1;bar.value=row.verified;c.appendChild(bar);
    return c;
  }
  function save(name,lines){
    try{
      const blob=new Blob([lines.join('\n')+'\n'],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob),a=el('a');
      a.href=url;a.download='hh-'+name.replace(/[^a-zA-Z0-9-]/g,'-')+'.txt';
      a.hidden=true;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1800);
    }catch(e){info.textContent='Экспорт недоступен: '+String(e.message||e).slice(0,90);}
  }
  function describeTask(t,stage){
    const lines=['  '+t.id+' · '+t.title+' — '+L[status(t.status)]];
    lines.push('  Этап: '+stage.title);
    lines.push('  PR: '+(t.prs.length?t.prs.map(p=>'#'+p).join(', '):'не привязан'));
    for(const p of t.prs){const state=inspected.get(p);if(state)lines.push('  GitHub #'+p+': '+state.label+' (проверено '+state.observed+')');}
    return lines;
  }
  function exportScope(project,stage,task){
    const stages=stage?[stage]:project.stages;
    const all=stages.flatMap(s=>task?[task]:s.tasks);
    const n=count(all),lines=[
      'Holistic House · Project Management',
      'Источник: публичный ограниченный снимок; без приватного кабинета',
      'Состояние задач на: '+current.asOf,
      'Проект: '+project.title,
      'Всего '+n.total+' · подтверждено '+n.verified+' · частично '+n.partial+' · не начато '+n.planned+' · блокировано '+n.blocked,
      'PR проверяются отдельно; GitHub merge и LIVE — разные факты',''
    ];
    for(const s of stages){lines.push('Этап: '+s.title);for(const t of (task?[task]:s.tasks)){lines.push(...describeTask(t,s),'');}}
    save(task?.id||stage?.key||project.key,lines);
  }
  const displays = new Map();
  function registerPR(n,output){
    if(!displays.has(n))displays.set(n,new Set());
    displays.get(n).add(output);
    const old=inspected.get(n);
    if(old)output.textContent=old.label+' · '+new Date(old.observed).toLocaleString('ru-RU');
  }
  function displayPR(n,saved){
    for(const element of displays.get(n)||[]){
      element.textContent=saved.label+' · '+new Date(saved.observed).toLocaleString('ru-RU');
    }
  }
  async function checkPR(n,output,trigger){
    trigger.disabled=true;output.textContent='Проверяю GitHub…';
    try{
      let saved=inspected.get(n);
      if(!saved||Date.now()-saved.time>180000){
        const req=await fetch(HOST+'/pulls/'+n,{
          headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
        if(!req.ok)throw Error('GitHub PR '+req.status);
        const pr=await req.json();
        let checks=null;
        try{
          if(pr?.head?.sha&&/^[0-9a-f]{40}$/i.test(pr.head.sha)){
            const response=await fetch(HOST+'/commits/'+pr.head.sha+'/check-runs?per_page=100',{
              headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
            if(response.ok)checks=await response.json();
          }
        }catch(_){/* GitHub CI errors remain UNKNOWN, never assumed green. */}
        const observed=new Date().toISOString();
        const proof=window.HHPMProof?.evaluatePR?.(pr,checks,observed);
        if(!proof||proof.pr==='unknown')throw Error('PR_IDENTITY_UNVERIFIED');
        saved={label:proof.label,observed,time:Date.now(),proof};
        inspected.set(n,saved);
      }
      displayPR(n,saved);
    }catch(e){
      const message='Проверка недоступна: '+String(e.message||e).slice(0,85)+'. Источник — PR в GitHub.';
      for(const node of displays.get(n)||[output])node.textContent=message;
    }finally{trigger.disabled=false;}
  }
  function taskCard(task,project,stage){
    const card=el('div','pm-task'),head=el('div','pm-task-head');
    card.dataset.pmStatus=status(task.status);
    card.dataset.pmSearch=(task.id+' '+task.title+' '+stage.title+' '+task.prs.map(p=>'#'+p).join(' ')).toLocaleLowerCase('ru-RU');
    const title=el('strong',null,task.id+' · '+task.title);
    head.appendChild(title);head.appendChild(el('span','pm-status pm-'+status(task.status),L[status(task.status)]));
    card.appendChild(head);
    window.HHPM_ASSIGN?.attach(card,task,stage,project);
    const actions=el('div','pm-task-actions');
    if(!task.prs.length)actions.appendChild(el('small','pm-dim','PR не создан или не привязан'));
    for(const p of task.prs){
      const link=el('a','pm-pr','PR #'+p);link.href='https://github.com/andylitvinov-design/books/pull/'+p;link.target='_blank';link.rel='noopener noreferrer';
      const out=el('small','pm-pr-result','Статус GitHub ещё не проверен');
      out.setAttribute('aria-live','polite');registerPR(p,out);
      actions.appendChild(link);actions.appendChild(button('Проверить PR',event=>checkPR(p,out,event.currentTarget),'pm-btn pm-check'));actions.appendChild(out);
    }
    if(task.evidence_url&&/^https:\/\/(?:holistic-house-pr-monitor\.vercel\.app\/|github\.com\/andylitvinov-design\/books\/)/.test(task.evidence_url)){
      const proofLink=el('a','pm-evidence','Доказательство выполнения');
      proofLink.href=task.evidence_url;proofLink.target='_blank';proofLink.rel='noopener noreferrer';
      actions.appendChild(proofLink);
      if(task.evidence_note)actions.appendChild(el('small','pm-evidence-note',task.evidence_note));
    }
    actions.appendChild(button('Отчёт задачи',()=>exportScope(project,stage,task),'pm-btn pm-quiet'));
    card.appendChild(actions);return card;
  }
  function stageCard(stage,project){
    const details=el('details','pm-stage'),summary=el('summary');
    const row=count(stage.tasks);
    summary.appendChild(el('strong',null,stage.title));
    summary.appendChild(el('span','pm-stage-count',row.verified+' / '+row.total+' подтверждено'));
    details.appendChild(summary);details.appendChild(badges(row,row.total));
    const content=el('div','pm-stage-tasks');
    content.appendChild(button('Скачать отчёт этапа',()=>exportScope(project,stage),'pm-btn pm-quiet'));
    for(const t of stage.tasks)content.appendChild(taskCard(t,project,stage));
    details.appendChild(content);return details;
  }
  function projectCard(project){
    const card=el('article','pm-project'),row=project.stages.flatMap(x=>x.tasks),stats=count(row);
    const head=el('div','pm-project-head');
    head.appendChild(el('h2',null,project.title));
    head.appendChild(button('Скачать отчёт',()=>exportScope(project),'pm-btn'));
    card.appendChild(head);
    card.appendChild(el('p','pm-description',project.summary));
    card.appendChild(el('p','pm-summary',project.stages.length+' этапов · '+stats.total+' подзадач · '+stats.verified+' подтверждено'));
    card.appendChild(badges(stats,stats.total));
    for(const s of project.stages)card.appendChild(stageCard(s,project));
    return card;
  }
  function valid(c){
    if(!c||c.schema!=='HH_PM_PUBLIC_V1'||!Array.isArray(c.projects)||
       c.projects.length<1||c.projects.length>6||
       !Number.isFinite(Date.parse(c.asOf||'')))return false;
    const unique=new Set(),keys=new Set();
    let count=0;
    for(const p of c.projects){
      if(!p||!['ci-head','ai-commits'].includes(p.key)||keys.has(p.key)||
         !Array.isArray(p.stages)||p.stages.length>20)return false;
      keys.add(p.key);
      for(const s of p.stages){
        if(!s||!Array.isArray(s.tasks)||s.tasks.length>50)return false;
        for(const t of s.tasks){
          if(!t||!/^[A-Z][0-9]{2}$/.test(t.id)||
             unique.has(p.key+':'+t.id)||typeof t.title!=='string'||
             t.title.length<5||t.title.length>240||
             !Object.prototype.hasOwnProperty.call(L,t.status)||
             !Array.isArray(t.prs)||t.prs.length>8||
             !t.prs.every(n=>Number.isSafeInteger(n)&&n>0))return false;
          unique.add(p.key+':'+t.id);
          if(++count>200)return false;
        }
      }
    }
    return count>0;
  }
  function applyFilters(){
    const query=document.getElementById('pm-query');
    const state=document.getElementById('pm-status-filter');
    const matching=document.getElementById('pm-matches');
    if(!current||!query||!state||!matching)return;
    const term=query.value.trim().toLocaleLowerCase('ru-RU').slice(0,160);
    const wanted=state.value;
    let visible=0;
    for(const task of root.querySelectorAll('.pm-task')){
      const shown=(wanted==='all'||task.dataset.pmStatus===wanted)&&
        (!term||task.dataset.pmSearch.includes(term));
      task.hidden=!shown;
      if(shown)visible++;
    }
    for(const stage of root.querySelectorAll('.pm-stage')){
      const any=Boolean(stage.querySelector('.pm-task:not([hidden])'));
      stage.hidden=!any;
      if(any&&(term||wanted!=='all'))stage.open=true;
    }
    for(const project of root.querySelectorAll('.pm-project')){
      project.hidden=!project.querySelector('.pm-stage:not([hidden])');
    }
    matching.textContent='Показано '+visible+' из '+root.querySelectorAll('.pm-task').length+' подзадач';
  }
  async function init(){
    try{
      const response=await fetch(SNAPSHOT,{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!valid(data))throw Error('Публичный реестр неполон');
      current=data;root.replaceChildren();
      window.HHPM_ASSIGN?.init(data);
      const summary=data.projects.flatMap(p=>p.stages.flatMap(s=>s.tasks)),tot=count(summary);
      document.getElementById('pm-projects').textContent=data.projects.length;
      document.getElementById('pm-total').textContent=tot.total;
      document.getElementById('pm-done').textContent=tot.verified;
      document.getElementById('pm-blocked').textContent=tot.blocked;
      const age=Date.now()-Date.parse(data.asOf);
      const stale=Number.isFinite(age)&&age>86400000;
      info.textContent=(stale?'Внимание: публичный снимок старше суток. ':'')+
        'Статусы задач на '+new Date(data.asOf).toLocaleString('ru-RU')+
        ' · PR проверяются по нажатию · Merge ≠ LIVE';
      for(const p of data.projects)root.appendChild(projectCard(p));
      document.getElementById('pm-query')?.addEventListener('input',applyFilters);
      document.getElementById('pm-status-filter')?.addEventListener('change',applyFilters);
      applyFilters();
    }catch(e){root.replaceChildren(el('p','pm-error','Не удалось открыть реестр: '+String(e.message||e)));info.textContent='Снимок недоступен, старые данные не подставлены.';}
  }
  init();
})();
