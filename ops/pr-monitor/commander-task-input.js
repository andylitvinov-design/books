'use strict';
/* Mobile Agent Commander task intake: voice + editable breakdown, no public task writes. */
(function(global){
 const buildTaskBriefCore=(value)=>{
  const raw=String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').trim().slice(0,2500);
  if(raw.length<8)return '';
  const parts=raw.replace(/\bво[- ]первых\b/gi,'\n').replace(/\bво[- ]вторых\b/gi,'\n')
   .replace(/\bв[- ]третьих\b/gi,'\n').split(/\n+|[.!?](?=\s|$)/)
   .map(s=>s.replace(/^\s*(?:[-*]|\d+[.)])\s*/,'').trim()).filter(Boolean).slice(0,6);
  const goal=(parts[0]||raw).slice(0,170),refs=[...new Set((raw.match(/https?:\/\/[^\s<>"')]+|#[0-9]{3,6}/g)||[]).slice(0,8))];
  const low=raw.toLowerCase(),steps=[],checks=[];
  const add=(task,check)=>{steps.push(task);checks.push(check)};
  if(/микрофон|диктов|распознаван|голосов(ой|ого|ым) ввод|speech.?to.?text/.test(low))
   add('Добавить кнопку микрофона: ручной старт/стоп, распознанный текст остаётся редактируемым; обрабатывать отказ, неподдерживаемый браузер и поздние события.',
    'На поддерживаемом устройстве текст диктовки виден в поле без автоматической отправки; при отказе работает ручной ввод.');
  if(/разобра|разбор|обработ|промпт|декомпоз|конкрет|техзадан|тз|план реализац|агент/.test(low))
   add('Преобразовать свободное описание в проверяемые подзадачи, критерии приёмки, границы и открытые вопросы; позволить поправить и скопировать ТЗ.',
    'Полученный план редактируется, хранит исходную формулировку и не выдаёт план за сделанную работу.');
  if(/кнопк|экран|мобильн|интерфейс|дизайн|форм|панел|вкладк|ui|ux/.test(low))
   add('Сверить с текущим интерфейсом: сохранить навигацию и рабочие маршруты, обработать экранную клавиатуру, фокус и доступность.',
    'Проверить 320/390/430 px, видимость элементов с клавиатурой, доступность кнопок и отсутствие регрессий.');
  if(/pr|pull request|merge|мерж|ci|github|деплой|лив|live/.test(low))
   add('Сверить существующие PR/lease, целевую ветку и точный HEAD; применить действующий защищённый процесс исправлений.',
    'Отдельно подтвердить commit, CI, merge, deployment и функциональный LIVE либо пометить как непроверенное.');
  if(!steps.length)parts.slice(0,4).forEach((s,i)=>add('Реализовать пункт '+(i+1)+': '+s,
   'Проверить пункт '+(i+1)+' в воспроизводимом сценарии и приложить доказательства.'));
  const questions=[];
  if(!refs.length)questions.push('Где именно реализовать? Найти страницу и репозиторий в текущей системе, не придумывать путь.');
  if(!/320|390|430|iphone|ios|android|desktop|mobile|мобил|телефон|safari/i.test(raw))
   questions.push('Какие устройства и браузеры приоритетны? Проверить мобильный сценарий, не угадывая платформу.');
  questions.push('Какие зависимости, права и существующие функции запрещено менять? Проверить перед работой.');
  return [
   'ТЗ ДЛЯ АГЕНТА · РЕДАКТИРУЕМЫЙ ЧЕРНОВИК','',
   '1. ЦЕЛЬ И РЕЗУЛЬТАТ',goal,'',
   '2. ИСХОДНОЕ ОПИСАНИЕ — ДОСЛОВНО',raw,'',
   '3. ПРИВЯЗКА И ИСХОДНЫЕ ССЫЛКИ',refs.length?refs.join('\n'):'Точные ссылки и PR не указаны — проверить в проекте.','',
   '4. ПОДЗАДАЧИ',...steps.map((s,i)=>(i+1)+'. '+s),'',
   '5. КРИТЕРИИ ПРИЁМКИ',...checks.map(s=>'- '+s),
   '- Приложить тесты и подтверждение того, что прежние сценарии не сломаны.','',
   '6. ЧТО НУЖНО УТОЧНИТЬ',...questions.map(s=>'- '+s),'',
   '7. ТРЕБОВАНИЯ К ИСПОЛНИТЕЛЮ',
   '- Сначала найти текущую реализацию и дублирующие PR; проверить владельца задачи и ветку.',
   '- Не добавлять платные сервисы и не обходить защищённые проверки.',
   '- Подготовить один согласованный пакет кода и тестов, затем PR, CI и защищённое слияние.',
   '- MERGED, Vercel READY и функциональный LIVE — разные факты. Без доказательств не сообщать «готово».'
  ].join('\n');
 };

 /* Owner prompt contract: immediately show WHAT, GOOD RESULT, BENCHMARKS, BUSINESS CONTEXT.
  * Only curated public context; do not infer a physical address, private client data or current PR status.
  */
 const buildTaskBrief=(value)=>{
  const base=buildTaskBriefCore(value);
  if(!base)return '';
  const raw=String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').trim().slice(0,2500);
  const low=raw.toLowerCase();
  const chunk=(from,to)=>{
   const start=base.indexOf(from);
   if(start<0)return 'Уточнить по текущему коду и исходному запросу.';
   const a=start+from.length,b=to?base.indexOf(to,a):-1;
   return base.slice(a,b<0?undefined:b).trim();
  };
  const steps=chunk('4. ПОДЗАДАЧИ','5. КРИТЕРИИ ПРИЁМКИ');
  const quality=chunk('5. КРИТЕРИИ ПРИЁМКИ','6. ЧТО НУЖНО УТОЧНИТЬ');
  const questions=chunk('6. ЧТО НУЖНО УТОЧНИТЬ','7. ТРЕБОВАНИЯ К ИСПОЛНИТЕЛЮ');
  const rules=chunk('7. ТРЕБОВАНИЯ К ИСПОЛНИТЕЛЮ',null);
  const references=[...new Set((raw.match(/https?:\/\/[^\s<>"')]+|#[0-9]{3,6}/g)||[]).slice(0,8))];
  const isCommander=/agent commander|агент|командир|командн|monitor|монитор|\bpr\b|pull request|мерж|merge|github|\bci\b|workflow|задач|исполнител/.test(low);
  const isVideo=/видео|video|montage|монтаж|гипноэффект|видеогенератор|ролик/.test(low);
  const isVoice=/микрофон|диктов|распознаван|голосов(ой|ого|ым) ввод|speech.?to.?text/.test(low);
  const hasExplicitCommander=/agent commander|pr monitor|командн|агент команд|monitor|монитор|github|\bpr\b|pull request|\bci\b/.test(low);
  const scope=hasExplicitCommander?'commander':isVideo?'video':isCommander?'commander':'holistic';
  const benchmarks=[],add=(name,criterion,url)=>{
   if(!benchmarks.some(x=>x.name===name))benchmarks.push({name,criterion,url});
  };
  if(isVoice)add('Apple Dictation','ввод речи прямо в редактируемое текстовое поле без потери управления','https://support.apple.com/guide/iphone/dictate-text-iph2c0651d2/27/ios/27');
  if(scope==='commander'){
   add('Linear','краткая, однозначная постановка задачи, понятная исполнителю','https://linear.app/method/write-issues-not-user-stories');
   add('GitHub Projects','связь Issues, PR и наблюдаемых статусов работы','https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects');
  }else if(scope==='video'){
   add('Canva Video Editor','удобный путь от идеи к редактированию и результату, не копируя интерфейс','https://www.canva.com/video-editor/');
   add('Linear','чёткие критерии завершённого результата','https://linear.app/method/write-issues-not-user-stories');
  }else{
   add('Notion AI','упорядочивание заметок в понятный документ с контекстом','https://www.notion.com/help/guides/notion-ai-for-docs');
   add('Linear','конкретный объём работы и проверяемый исход','https://linear.app/method/write-issues-not-user-stories');
  }
  const business=[
   '- Holistic House — цифровая платформа личного развития, тестов, обучающих программ и индивидуальной поддержки; аудитория Toronto & Online.',
   '- Сайт бизнеса: https://holistichouse.vercel.app',
   '- Код и рабочий репозиторий: https://github.com/andylitvinov-design/books',
   '- Бизнес-цель: простой путь от бесплатного самоисследования и выбора услуги до понятной помощи, программы или персонального контента.',
   '- Принципы: мобильный интерфейс, RU/EN/ES, добровольность, конфиденциальность, без новых платных сервисов.',
   '- Точный физический адрес в доступном публичном контексте не подтверждён — не придумывать.'
  ];
  const specific=scope==='commander'?[
   '- Проект: отдельный Agent Commander / PR Monitor; мобильная постановка задач, назначение агентов и доказательное наблюдение за выполнением.',
   '- Главный адрес: https://holistic-house-pr-monitor.vercel.app',
   '- Реестр и подзадачи: https://holistic-house-pr-monitor.vercel.app/project-management-public.html',
   '- Защищённый командный центр: https://holistichouse.vercel.app/admin/command-center',
   '- Цель: голосовая задача → качественный промпт → выбранный исполнитель → PR/CI → подтверждённый LIVE.',
   '- Ветки: codex/bootstrap-books — control plane, codex/public-book-library — сайт. Фактические SHA и статусы проверять на момент работы.',
   '- Публичный монитор не создаёт и не запускает задачи; изменения доступны только через права владельца.'
  ]:scope==='video'?[
   '- Проект: Holistic House Video Studio, главный путь от цели и предложенного сценария к воспроизводимому и скачиваемому видео.',
   '- Публичная страница: https://holistichouse.vercel.app/ru/holistic-support/mandala (актуальность проверить).',
   '- Приоритет: один готовый сценарий вместо десятков обязательных фильтров, с редактированием по желанию и проверенным MP4.'
  ]:[
   '- Проект: основной Holistic House — тесты, личный анализ, консультации, обучение и клиентский кабинет.',
   '- Приоритет: понятный шаг к полезному результату, без медицинских диагнозов по догадке и без разглашения данных.'
  ];
  return [
   'ГОТОВЫЙ ПРОМПТ ИСПОЛНИТЕЛЮ · РЕДАКТИРУЕМЫЙ ЧЕРНОВИК','',
   'Роль: реализуй запрос владельца в существующем проекте. Не сообщай «готово» без проверки.','',
   '1. ЧТО НАДО ВЫПОЛНИТЬ',
   'Исходная задача: '+raw,
   'Подзадачи (для реализации):',
   steps,'',
   '2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ',
   quality,
   '- Готовая функция воспроизводимо работает у пользователя; существующее поведение не сломано.',
   '- Приёмка — проверяемые сценарии и доказательства, а не только описание изменений.','',
   '3. ОРИЕНТИРЫ КАЧЕСТВА — КТО ДЕЛАЕТ ЭТО ХОРОШО',
   ...benchmarks.map(x=>'- '+x.name+': ориентир — '+x.criterion+'. Источник: '+x.url),
   '- Это ориентиры принципов качества, а не требования копировать дизайн, текст или чужой код.','',
   '4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА — ЦЕЛИ И АДРЕСА',
   ...business,...specific,
   '- Указанные сведения — предварительная публичная карточка; перед разработкой сверить с актуальным проектом.','',
   '5. ИСХОДНЫЕ ССЫЛКИ И ОТКРЫТЫЕ ВОПРОСЫ',
   references.length?references.join('\n'):'Точные ссылки и PR не указаны — проверить в проекте.',
   questions,'',
   '6. ПРАВИЛА ВЫПОЛНЕНИЯ И ОТЧЁТ',
   rules,
   '- Зафиксируй подтверждённые факты, ссылку на PR/commit, результаты CI, слияние и функциональный LIVE отдельно.','',
   '7. ИСХОДНОЕ ОПИСАНИЕ — ДОСЛОВНО',raw
  ].join('\n').slice(0,8500);
 };
 if(typeof module!=='undefined'&&module.exports)module.exports={buildTaskBrief};
 if(!global||!global.document)return;
 const doc=global.document, mk=(tag,klass,text)=>{const e=doc.createElement(tag);if(klass)e.className=klass;if(text!==undefined)e.textContent=text;return e};
 let dialog=null,recognition=null,voiceEpoch=0,analysisEpoch=0;
 function stopVoice(){
  voiceEpoch++;const old=recognition;recognition=null;if(old)try{old.abort()}catch{}
  const btn=dialog?.querySelector('.hh-cc-mic');if(btn){btn.setAttribute('aria-pressed','false');btn.setAttribute('aria-label','Начать диктовку')}
 }
 function close(){analysisEpoch++;stopVoice();if(dialog)dialog.hidden=true;doc.querySelector('#hh-cc-dock button[aria-label="Создать задачу"]')?.focus()}
 function startVoice(input,btn,status){
  if(recognition){stopVoice();status.textContent='Диктовка остановлена. Текст можно редактировать.';return}
  const Speech=global.SpeechRecognition||global.webkitSpeechRecognition;
  if(!Speech){input.focus();status.textContent='Этот браузер не поддерживает Web Speech. Используйте микрофон на клавиатуре iPhone или ручной ввод.';return}
  let next;try{next=new Speech()}catch{input.focus();status.textContent='Микрофон недоступен. Используйте диктовку клавиатуры.';return}
  const token=++voiceEpoch,base=input.value.trim();recognition=next;
  next.lang=/^en/i.test(doc.documentElement.lang)?'en-US':/^es/i.test(doc.documentElement.lang)?'es-ES':'ru-RU';
  next.continuous=true;next.interimResults=true;
  next.onresult=e=>{
   if(token!==voiceEpoch||recognition!==next||dialog.hidden)return;
   const words=[];for(let i=0;i<e.results.length;i++){const t=String(e.results[i]?.[0]?.transcript||'').trim();if(t)words.push(t)}
   const spoken=words.join(' ').trim();if(!spoken)return;
   const updated=((base?base+' ':'')+spoken).slice(0,input.maxLength);
   if(input.value!==updated){input.value=updated;input.dispatchEvent(new Event('input',{bubbles:true}))}
  };
  next.onerror=e=>{
   if(token!==voiceEpoch)return;
   status.textContent=['not-allowed','service-not-allowed','audio-capture'].includes(e.error)?
    'Доступ к микрофону запрещён. Разрешите его в браузере или используйте диктовку на клавиатуре.':
    'Распознавание не удалось ('+String(e.error||'ошибка')+'). Попробуйте ещё раз или введите текст.';
   stopVoice();
  };
  next.onend=()=>{
   if(token!==voiceEpoch)return;
   recognition=null;btn.setAttribute('aria-pressed','false');btn.setAttribute('aria-label','Начать диктовку');
   if(status.textContent.startsWith('Слушаю'))status.textContent='Диктовка завершена. Проверьте текст.';
  };
  try{next.start();btn.setAttribute('aria-pressed','true');btn.setAttribute('aria-label','Остановить диктовку');
   status.textContent='Слушаю… Нажмите микрофон повторно для остановки. Сайт не сохраняет аудиозапись.'}
  catch{stopVoice();input.focus();status.textContent='Не удалось начать запись. Используйте голосовой ввод клавиатуры.'}
 }
 async function analyze(input,output,area,status,button){
  const raw=input.value.trim();
  if(raw.length<8){status.textContent='Опишите задачу хотя бы в нескольких словах.';input.focus();return}
  const token=++analysisEpoch;area.hidden=false;const localBrief=buildTaskBrief(raw);output.value=localBrief;
  status.textContent='Готовый промпт сформирован: что сделать, хороший результат, ориентиры и контекст. Проверяю доступность ИИ владельца…';
  button.disabled=true;button.textContent='Разбираю…';
  try{
   const auth=await fetch('/api/pm-agent-chat?action=status',{credentials:'same-origin',cache:'no-store'});
   if(!auth.ok){status.textContent='Локальный промпт готов. Для расширенного ИИ-разбора войдите кодом владельца PR Monitor (без Google).';return}
   const data=await auth.json();
   if(data.authenticated!==true||data.modes?.openrouter!==true){
    status.textContent='Локальный промпт готов. Бесплатная модель пока не подключена.';return;
   }
   const res=await fetch('/api/pm-agent-chat?action=decompose',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({message:raw})});
   let plan;try{plan=await res.json()}catch{throw Error('ответ сервера не распознан')}
   if(!res.ok||plan.reportType!=='AI_TASK_PLAN_NOT_EXECUTION'||typeof plan.reply!=='string'||plan.reply.trim().length<80)
    throw Error(String(plan.error||'нет содержательного ответа бесплатной модели').slice(0,110));
   if(token!==analysisEpoch||dialog.hidden||input.value.trim()!==raw)return;
   if(output.value!==localBrief){status.textContent='ИИ-разбор получен, но ваши правки локального промпта сохранены. Повторите разбор только при необходимости.';return}
   output.value=plan.reply.trim();status.textContent='ИИ-разбор бесплатной моделью готов. Проверьте содержание и подтвердите задачу в защищённом редакторе.';
  }catch(e){if(token===analysisEpoch&&!dialog.hidden)status.textContent='Локальный промпт сохранён. ИИ недоступен: '+String(e.message||e).slice(0,110)}
  finally{if(token===analysisEpoch){button.disabled=false;button.textContent='✦ Разобрать задачу'}}
 }
 function open(){
  if(!dialog){
   dialog=mk('div','hh-cc-dlg');dialog.id='hh-cc-task-draft';
   dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Новая задача');
   const sheet=mk('section','hh-cc-sheet');
   sheet.append(mk('h2',null,'Новая задача'),
    mk('p',null,'Продиктуйте или напишите задачу. Сначала разбор, потом подтверждение владельцем и назначение агента.'));
   const holder=mk('div','hh-cc-task-composer'),input=mk('textarea');
   input.maxLength=2500;input.rows=4;input.id='hh-cc-task-description';
   input.placeholder='Что нужно изменить? Где и какой результат должен получить пользователь?';
   input.setAttribute('aria-label','Описание новой задачи');
   const mic=mk('button','hh-cc-mic','🎙');mic.type='button';mic.setAttribute('aria-label','Начать диктовку');
   mic.setAttribute('aria-pressed','false');holder.append(input,mic);sheet.append(holder);
   const dictation=mk('p','hh-cc-dictation-note','Кнопка микрофона запускает распознавание браузера. Если оно недоступно, используйте диктовку клавиатуры.');
   dictation.setAttribute('role','status');dictation.setAttribute('aria-live','polite');sheet.append(dictation);
   mic.addEventListener('click',()=>startVoice(input,mic,dictation));
   const action=mk('button','hh-cc-analyze','✦ Разобрать задачу');action.type='button';sheet.append(action);
   sheet.append(mk('p','hh-cc-privacy-note','При активной сессии владельца текст по нажатию отправляется проверенной бесплатной модели OpenRouter (:free). Без неё разбор локальный. Не вводите личные данные клиентов.'));
   const area=mk('section','hh-cc-task-result');area.hidden=true;
   area.append(mk('h3',null,'Готовый промпт для исполнителя'));
   const output=mk('textarea','hh-cc-task-plan');output.rows=9;output.maxLength=8500;
   output.setAttribute('aria-label','Редактируемый промпт для исполнителя');area.append(output);
   const note=mk('p','hh-cc-task-note','');note.setAttribute('role','status');note.setAttribute('aria-live','polite');area.append(note);
   sheet.append(area);
   action.addEventListener('click',()=>analyze(input,output,area,note,action));
   input.addEventListener('input',()=>{analysisEpoch++;action.disabled=false;action.textContent='✦ Разобрать задачу';
    if(!area.hidden)note.textContent='Описание изменилось. Нажмите «Разобрать задачу», чтобы обновить промпт.'});
   const copy=mk('button',null,'Копировать описание / промпт');copy.type='button';
   copy.addEventListener('click',async()=>{
    const field=area.hidden?input:output,content=field.value.trim();
    if(!content){dictation.textContent='Сначала опишите задачу.';return}
    try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
     await navigator.clipboard.writeText(content);copy.textContent='Скопировано ✓'}
    catch{field.focus();field.select();copy.textContent='Текст выделен — скопируйте вручную'}
   });sheet.append(copy);
   const owner=mk('a',null,'Открыть защищённый редактор');
   owner.href='https://holistichouse.vercel.app/admin/command-center';owner.target='_blank';owner.rel='noopener noreferrer';sheet.append(owner);
   sheet.append(mk('p','hh-cc-privacy-note','Публичная форма не сохраняет и не запускает задачи. Скопируйте ТЗ и подтвердите создание в защищённом Agent Commander.'));
   const done=mk('button','hh-cc-secondary','Закрыть');done.type='button';done.addEventListener('click',close);sheet.append(done);
   dialog.append(sheet);dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
   dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
   doc.body.append(dialog);
   if(global.visualViewport){
    const fit=()=>{dialog.style.top=Math.max(0,global.visualViewport.offsetTop)+'px';dialog.style.height=global.visualViewport.height+'px';dialog.style.bottom='auto'};
    global.visualViewport.addEventListener('resize',fit);global.visualViewport.addEventListener('scroll',fit);fit();
   }
  }
  dialog.hidden=false;dialog.querySelector('#hh-cc-task-description')?.focus();
 }
 global.HHOpenTaskIntake=open;
})(typeof window==='undefined'?null:window);
