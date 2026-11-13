'use strict';
/* Existing Memory view: owner-only activity. DOM nodes are always textContent, never HTML. */
(function(win){
 if(!win||!win.document)return;
 const doc=win.document,by=id=>doc.getElementById(id);
 const panel=by('hh-agent-digest-panel'),status=by('hh-agent-digest-status'),list=by('hh-agent-digest-list'),
  summary=by('hh-agent-digest-summary'),project=by('hh-agent-digest-project'),agent=by('hh-agent-digest-agent'),
  state=by('hh-agent-digest-state'),login=by('hh-agent-digest-login'),refresh=by('hh-agent-digest-refresh');
 if(!panel||!status||!list||!summary||!project||!agent||!state||!refresh)return;
 const make=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
 const safeLink=raw=>{try{const u=new URL(raw);if(u.protocol!=='https:'||u.search||u.hash||u.username||u.password||u.port)return null;
  if(u.hostname==='github.com'&&/^\/andylitvinov-design\/books\/(actions\/runs|pull)\/[1-9][0-9]*(\/job\/[1-9][0-9]*)?$/.test(u.pathname))return u.href;
  if(['vercel.com','holistichouse.vercel.app','holistic-house-pr-monitor.vercel.app'].includes(u.hostname))return u.href;
 }catch{}return null};
 const labels={working:'В работе',completed:'Завершён ответ',blocked:'Блокировка',unknown:'Не подтверждено'};
 let epoch=0;
 async function api(body){const controller=new AbortController(),timer=win.setTimeout(()=>controller.abort(),10000);
  try{const r=await win.fetch('/api/commander-agent-memory',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
   const data=await r.json().catch(()=>null);if(r.status===401||r.status===403)return {authorization:'denied',status:r.status};
   if(!r.ok||!data||data.schema!=='HH_AGENT_MEMORY_DIGEST_LIST_V1'||!Array.isArray(data.digests))throw Error('PRIVATE_MEMORY_UNAVAILABLE');
   return {authorization:'ok',data};
  }finally{win.clearTimeout(timer)}
 }
 function render(data){
  list.replaceChildren();
  const digests=data.digests.filter(d=>d&&d.schema==='HH_AGENT_MEMORY_DIGEST_V1').slice(0,50);
  summary.textContent='Сегодня: '+(data.briefing?.today||0)+' · последние 7 дней: '+(data.briefing?.last7Days||0)+
   ' · блокировки: '+(data.briefing?.blocked||0)+' · всего в выборке: '+digests.length+
   (data.limited?' · показана часть записей':'')+' (сводка текущей страницы)';
  if(!digests.length){list.append(make('p','hh-agent-digest-empty','Пока нет подтверждённых событий в выбранном проекте. Новые события появятся после рабочих запусков.'));return}
  for(const d of digests){
   const card=make('article','hh-agent-digest-item');
   const meta=make('p','hh-agent-digest-meta',(d.projectKey||'Проект')+' · '+(d.agentId||'агент')+' · '+(d.coveredUntil?new Date(d.coveredUntil).toLocaleString('ru-RU'):''));
   const heading=make('h3',null,labels[d.status]||'Состояние не определено');
   const result=make('p','hh-agent-digest-result',String(d.result||'Подтверждение отсутствует').slice(0,250));
   const next=make('p','hh-agent-digest-next','Далее: '+String(d.nextAction||'Проверить источник').slice(0,170));
   const proof=Array.isArray(d.evidence)?d.evidence.find(e=>e.proof==='verified')||d.evidence[0]:null;
   card.append(meta,heading,result,next);
   if(proof){const url=safeLink(proof.url),line=make('p','hh-agent-digest-proof');
    const info=make('span',null,proof.proof==='verified'?'Проверен источник · ':'Источника недостаточно · ');line.append(info);
    if(url){const a=make('a',null,'Открыть подтверждение');a.href=url;a.rel='noopener noreferrer';a.target='_blank';line.append(a)}
    else line.append(make('span',null,proof.type==='run'?'Запись во внутреннем журнале':'Источник недоступен'));
    if(proof.sha)line.append(make('code',null,' SHA '+String(proof.sha).slice(0,12)));
    card.append(line);
   }else card.append(make('p','hh-agent-digest-proof','Подтверждение не получено'));
   list.append(card);
  }
 }
 async function load(){const my=++epoch;refresh.disabled=true;status.textContent='Проверяю приватную память…';login.hidden=true;
  const body={action:'list',limit:30};if(project.value)body.projectKey=project.value;if(agent.value)body.agentId=agent.value;if(state.value)body.status=state.value;
  try{const r=await api(body);if(my!==epoch)return;
   if(r.authorization==='denied'){
    summary.textContent='';list.replaceChildren();login.hidden=false;
    status.textContent='История активности доступна только владельцу через защищённую сессию.';return;
   }
   status.textContent=r.data.syncState==='OK'?'Память обновлена из доступных запусков.':'Память доступна; синхронизация запусков пока не подтверждена.';
   render(r.data);
  }catch(error){if(my!==epoch)return;summary.textContent='';list.replaceChildren();status.textContent='Приватная память временно недоступна. Данные не подменяются примерами.';}
  finally{if(my===epoch)refresh.disabled=false}
 }
 refresh.addEventListener('click',load);
 for(const select of [project,agent,state])select.addEventListener('change',load);
 load();
})(typeof window==='undefined'?null:window);
