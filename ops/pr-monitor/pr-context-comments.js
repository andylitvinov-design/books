'use strict';
/* HH_PR_CONTEXT_COMMENT_V1: on-demand public PR evidence, owner-only handoff.
 * No direct GitHub writes, task execution or persisted browser audio. */
(function(env){
 const REPO='andylitvinov-design/books',BASE='https://api.github.com/repos/'+REPO;
 const MAX_PR=15,MAX_TEXT=1800,DETAIL=3;
 const safe=(v,n=1100)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
 const numbers=items=>[...new Set((items||[]).map(x=>Number(x?.number||x)).filter(x=>Number.isSafeInteger(x)&&x>0&&x<100000))].slice(0,MAX_PR);
 function makePrompt({kind,title,text,prs,evidence=[],context=''}) {
   if(!['pr','task'].includes(kind)||safe(text,MAX_TEXT).length<3)throw Error('INVALID_COMMENT_TARGET');
   const ids=numbers(prs);
   if(kind==='pr'&&!ids.length)throw Error('INVALID_COMMENT_PR');
   const lines=[
     'HH_PR_CONTEXT_COMMENT_V1 · ПРОДОЛЖИТЬ СУЩЕСТВУЮЩУЮ РАБОТУ',
     '1. ЧТО НАДО ВЫПОЛНИТЬ',
     'Цель: '+(kind==='pr'?'доработка PR':'доработка задачи')+' · '+safe(title,200),
     'НОВЫЙ КОММЕНТАРИЙ ВЛАДЕЛЬЦА:',
     safe(text,MAX_TEXT),
     '2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ',
     'Выполнена указанная корректировка с тестами, реальным изменением и отчётом. При наличии PR продолжен подходящий PR, не создан дубль. Готовность LIVE проверена отдельно.',
     '3. ОРИЕНТИРЫ КАЧЕСТВА',
     'Следовать действующим правилам репозитория, GLOBAL_PR_ONE_PUBLISH_V1 и защищённым CI/merge gates. Не запускать лишние проверки и платные сервисы.',
     '4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА',
     'Проект: Holistic House / Agent Commander. Репозиторий: https://github.com/'+REPO,
     'Контекст карточки: '+(safe(context,800)||'не указан; уточнить в первоисточнике'),
     'СВЯЗАННЫЕ PR: '+(ids.length?ids.map(n=>'#'+n+' https://github.com/'+REPO+'/pull/'+n).join('; '):'PR ещё не создан — продолжать текущую задачу без выдуманного PR'),
     'ДОКАЗАТЕЛЬСТВА ПО PR НА МОМЕНТ КОММЕНТАРИЯ (перепроверить перед работой):'
   ];
   for(const e of evidence) {
     lines.push('PR #'+e.number+' · '+safe(e.title,180));
     lines.push('Исходная задача PR: '+(safe(e.body,1300)||'не загружена; прочитать GitHub PR'));
     lines.push('Статус: '+safe(e.status,85)+' · base '+safe(e.base,100)+' · HEAD '+safe(e.head,45)+' · последнее обновление '+safe(e.updated,45));
     lines.push('Последняя работа / HEAD commit: '+safe(e.commit,600));
     lines.push('CI по HEAD: '+safe(e.checks,620));
     lines.push('Последние видимые комментарии: '+safe(e.comments,950));
     if(e.error)lines.push('НЕТ ПОЛНОГО КОНТЕКСТА: '+safe(e.error,220));
   }
   if(ids.length>evidence.length)lines.push('Не загружено подробно '+(ids.length-evidence.length)+' PR из-за ограниченного запроса; открыть все связанные PR вручную.');
   lines.push('5. ИСТОРИЯ ПРЕДЫДУЩИХ ЗАДАЧ');
   lines.push('Владелец должен получить сохранённые приватные записи из защищённого Commander и передать исполнителю исходные требования, последние планы, решения, существующие комментарии и связанные PR. Публичная страница не имеет доступа к приватным задачам.');
   lines.push('6. КОНТРОЛЬ И ПЕРЕДАЧА');
   lines.push('Перед исходными изменениями заново прочитать PR conversation, review, все commits/checks и связанный task history; проверить exact HEAD, lease, конфликты, owner и корректную branch direction. При существующем PR продолжить его, а не дублировать. Операции над кодом только после защищённого подтверждения.');
   lines.push('Очередь != запуск агента; merge != функциональный LIVE. Отчёт должен отдельно указать verified commit, CI, merge и LIVE evidence.');
   return lines.join('\n').slice(0,14900);
 }
 const api={numbers,makePrompt};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!env?.document||!env.fetch)return;
 const create=(tag,cls,text)=>{const n=env.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 async function gh(path){
   const r=await env.fetch(BASE+path,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
   if(!r.ok)throw Error('HTTP_'+r.status);return r.json();
 }
 async function evidence(n){
   const out={number:n,title:'PR #'+n,body:'',status:'UNKNOWN',base:'UNKNOWN',head:'UNKNOWN',
     updated:'UNKNOWN',commit:'UNKNOWN',checks:'UNKNOWN',comments:'UNKNOWN',error:''};
   try {
     const p=await gh('/pulls/'+n);
     if(p?.number!==n||p?.base?.repo?.full_name!==REPO||!/^[0-9a-f]{40}$/i.test(p?.head?.sha||''))throw Error('PR_IDENTITY_OR_HEAD_UNVERIFIED');
     Object.assign(out,{title:p.title,body:p.body||'',
       status:p.merged_at?'MERGED':p.state==='closed'?'CLOSED_UNMERGED':p.draft?'DRAFT':'OPEN_NOT_MERGE_READY',
       base:p.base.ref,head:p.head.sha,updated:p.updated_at||'UNKNOWN'});
     const batch=await Promise.allSettled([
       gh('/commits/'+p.head.sha),
       gh('/commits/'+p.head.sha+'/check-runs?per_page=100'),
       gh('/issues/'+n+'/comments?per_page=100&page=1')
     ]);
     if(batch[0].status==='fulfilled')out.commit=batch[0].value?.commit?.message||'UNKNOWN';
     else out.error+='HEAD commit недоступен. ';
     if(batch[1].status==='fulfilled'){
       const checks=batch[1].value;
       out.checks=Array.isArray(checks?.check_runs)&&checks.check_runs.length?
         checks.check_runs.slice(0,8).map(x=>safe(x.name,75)+':'+safe(x.status,20)+'/'+safe(x.conclusion||'PENDING',30)).join('; '):
         'Список проверок пуст — не считать PASS';
       if(checks.total_count>100)out.error+='Не все проверки показаны. ';
     }else out.error+='CI недоступен. ';
     if(batch[2].status==='fulfilled'){
       const comments=batch[2].value;
       out.comments=Array.isArray(comments)&&comments.length?
         comments.slice(-3).map(x=>safe(x.user?.login,35)+': '+safe(x.body,260)).join(' | '):
         'Нет комментариев на первой странице';
       if(comments.length===100)out.error+='История комментариев частичная. ';
     }else out.error+='Комментарии недоступны. ';
   }catch(e){out.error=safe(e?.message||e,180)+'; состояние PR повторно проверить перед работой';}
   return out;
 }
 function mount({host,container,kind,title,prs,context=''}) {
   if(!host||!container||!['pr','task'].includes(kind)||host.querySelector('.hh-pt-comment-toggle'))return;
   const related=numbers(prs);
   if(kind==='pr'&&!related.length)return;
   const toggle=create('button','hh-pt-comment-toggle','💬');
   toggle.type='button';toggle.title='Комментарий к '+(kind==='pr'?'PR #'+related[0]:'задаче');
   toggle.setAttribute('aria-label',toggle.title);toggle.setAttribute('aria-expanded','false');
   const panel=create('section','hh-pt-comment-panel');panel.hidden=true;
   panel.setAttribute('aria-label',toggle.title);
   const label=create('label','hh-pt-comment-label',toggle.title);
   const input=create('textarea','hh-pt-comment-text');input.rows=3;input.maxLength=MAX_TEXT;
   input.placeholder='Что исправить, дополнить или проверить?';
   input.setAttribute('aria-label','Текст комментария');
   const mic=create('button','hh-pt-comment-mic','🎙 Надиктовать');mic.type='button';
   mic.setAttribute('aria-pressed','false');
   const send=create('button','hh-pt-comment-send','Отправить в работу');send.type='button';
   const actions=create('div','hh-pt-comment-actions');actions.append(mic,send);
   const status=create('p','hh-pt-comment-status',
     'После отправки откроется защищённый редактор: сохранение, очередь и запуск агента подтверждаются отдельно.');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   panel.append(label,input,actions,status);host.append(toggle);container.append(panel);
   toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)input.focus();});
   let recognition=null,spokenBase='';
   mic.addEventListener('click',()=>{
     if(recognition){try{recognition.stop();status.textContent='Останавливаю запись. Проверьте расшифровку.';}catch{}return;}
     const Speech=env.SpeechRecognition||env.webkitSpeechRecognition;
     if(!Speech){status.textContent='Распознавание браузера недоступно. Используйте голосовую диктовку клавиатуры.';input.focus();return;}
     try{
       const active=new Speech();recognition=active;spokenBase=input.value.trim();
       const lang=env.document.documentElement.lang||'ru';
       active.lang=lang.startsWith('en')?'en-US':lang.startsWith('es')?'es-ES':'ru-RU';
       active.interimResults=true;active.continuous=true;
       mic.setAttribute('aria-pressed','true');mic.textContent='■ Стоп';
       active.onresult=e=>{if(recognition!==active)return;
         const words=[];for(let i=0;i<e.results.length;i++){const t=String(e.results[i]?.[0]?.transcript||'').trim();if(t)words.push(t);}
         input.value=[spokenBase,...words].filter(Boolean).join(' ').slice(0,MAX_TEXT);
       };
       active.onerror=e=>{if(recognition===active)status.textContent='Голосовой ввод: '+safe(e.error,40)+'. Можно дополнить вручную.'};
       active.onend=()=>{if(recognition!==active)return;recognition=null;mic.setAttribute('aria-pressed','false');mic.textContent='🎙 Надиктовать';};
       active.start();status.textContent='Запись речи началась. После остановки проверьте текст.';
     }catch{recognition=null;mic.setAttribute('aria-pressed','false');mic.textContent='🎙 Надиктовать';status.textContent='Микрофон недоступен: используйте диктовку клавиатуры.';}
   });
   send.addEventListener('click',async()=>{
     if(recognition){status.textContent='Сначала остановите запись и проверьте расшифровку.';return;}
     const text=input.value.trim();
     if(text.length<3){status.textContent='Напишите или продиктуйте комментарий.';input.focus();return;}
     if(!env.HHCommanderTransfer?.begin){status.textContent='Защищённая передача недоступна. Откройте редактор через меню.';return;}
     send.disabled=true;status.textContent='Собираю текущие PR, HEAD, CI и последние изменения…';
     try{
       const details=[];
       for(const id of related.slice(0,DETAIL))details.push(await evidence(id));
       const prompt=makePrompt({kind,title,text,prs:related,evidence:details,context});
       const raw=('Комментарий к '+(kind==='pr'?'PR #'+related[0]:'задаче «'+title+'»')+': '+text).slice(0,2500);
       const ok=env.HHCommanderTransfer.begin({raw,fullPrompt:prompt,relatedPr:related},status);
       if(!ok)send.disabled=false;
     }catch(e){send.disabled=false;status.textContent='Контекст не подготовлен: '+safe(e?.message||e,150);}
   });
 }
 env.HHPRContextComments={...api,mount};
})(typeof window==='undefined'?null:window);
