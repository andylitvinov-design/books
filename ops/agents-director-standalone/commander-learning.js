'use strict';
/* Read-only owner learning dashboard. Never interpret a candidate as executable. */
(function(){
 const host=document.getElementById('hh-learning');if(!host)return;
 const E=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;
  if(value!==undefined)el.textContent=String(value);return el};
 const set=(parent,...items)=>parent.append(...items);
 const status=E('p','hh-learning-status','Проверяю подписанные GitHub-отчёты…');
 const button=E('button','hh-learning-refresh','Обновить фактические данные');
 button.type='button';
 button.addEventListener('click',load);
 host.replaceChildren(button,status);
 function link(label,href){
  const a=E('a',null,label);
  if(/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull\/\d+|actions\/runs\/\d+)$/.test(href)){
   a.href=href;a.target='_blank';a.rel='noopener noreferrer';
  }else a.textContent='Ссылка недоступна';
  return a;
 }
 function fact(c,k,correct){
  return E('span','hh-learning-fact '+(correct?'verified':'unknown'),
   k+': '+(correct?'подтверждено':'не подтверждено'));
 }
 function group(title){const x=E('section','hh-learning-pane');x.append(E('h2',null,title));host.append(x);return x}
 function draw(payload){
  [...host.querySelectorAll('.hh-learning-pane')].forEach(el=>el.remove());
  const m=payload.metrics||{};
  const metrics=group('Фактический прогресс');
  const boxes=E('div','hh-learning-metrics');
  for(const [title,val] of [['Source SHA',m.source_verified||0],['CI на HEAD',m.ci_verified||0],
    ['Кандидаты',m.candidates||0]]){
   const card=E('div','hh-learning-metric');
   set(card,E('strong',null,val),E('span',null,title));boxes.append(card);
  }
  set(metrics,boxes,E('p','hh-learning-note',
    'Результаты построены по недавним подписанным отчётам GitHub Actions. Merge и LIVE проверяются отдельно.'));
  const cbox=group('Извлечённые решения');
  if(!payload.cases?.length)cbox.append(E('p','hh-learning-note',
   'В доступной истории пока нет подходящих подтверждённых публикаций исходного кода. Никакие успешные кейсы не выдумываются.'));
  for(const c of payload.cases||[]){
   const card=E('article','hh-learning-case');
   set(card,E('h3',null,'PR #'+c.pr_number+' · '+c.skill_id+'@'+c.skill_version));
   const proof=E('div','hh-learning-proofs');
   set(proof,fact(c,'Source',c.source_proof==='VERIFIED_COMMIT_PARENT'),
     fact(c,'CI',c.ci_proof==='EXACT_HEAD_CI_VERIFIED'),
     fact(c,'Merge',false),fact(c,'LIVE',false));
   const links=E('div','hh-learning-links');
   set(links,link('Открыть PR',c.pr_url),link('Запуск Worker',c.run_url));
   set(card,proof,links);cbox.append(card);
  }
  const sbox=group('На проверку — новые алгоритмы');
  if(!payload.candidates?.length)sbox.append(E('p','hh-learning-note',
    'Для предложения обновления необходимы минимум два независимых случая с настоящим source SHA и успешными обязательными CI. Пока подтверждённых повторов недостаточно.'));
  for(const item of payload.candidates||[]){
   const card=E('article','hh-learning-case');
   set(card,E('h3',null,item.title),
     E('p',null,item.suggestion),
     E('p','hh-learning-note','Подтверждённых случаев: '+item.verified_cases+
       '. Статус: кандидат, требуется тест и утверждение владельца.'),
     E('p','hh-learning-note','PR: '+item.supporting_prs.map(i=>'#'+i).join(', ')));
   sbox.append(card);
  }
  const info=group('Как обновляются навыки');
  set(info,E('p',null,
    'Агент накапливает случаи в подтверждённых отчётах Worker. Повторяющийся алгоритм становится кандидатом; изменение доверенного SKILL.md требует отдельного diff, тестов и защищённого PR. Это не автоматическое переписывание кода.'),
    E('p','hh-learning-note','Публичный каталог рекомендаций и новая версия исполняемого навыка — разные уровни доверия.'));
 }
 async function load(){
  button.disabled=true;
  status.textContent='Сверяю источник, SHA и обязательные проверки…';
  try{
   const r=await fetch('/api/commander-learning',{credentials:'same-origin',cache:'no-store'});
   if(r.status===401){status.textContent='Войдите как владелец через существующую авторизацию PR Monitor, затем обновите страницу.';return;}
   if(!r.ok)throw Error('HTTP_'+r.status);
   const d=await r.json();
   if(d.schema!=='HH_COMMANDER_LEARNING_V1')throw Error('INVALID_LEARNING_RESPONSE');
   draw(d);
   status.textContent='Проверено '+d.scanned_comments+' записей. Наблюдение: '+new Date(d.observed_at).toLocaleString('ru-RU');
  }catch(e){status.textContent='История обучения временно недоступна ('+e.message+'). Не показываю неподтверждённые результаты.'}
  finally{button.disabled=false}
 }
 load();
})();
