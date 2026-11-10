'use strict';
/* HH_PR_ERROR_FUNNEL_V1 — read-only, owner-scoped CI incident lifecycle.
 * A dispatch is not a worker claim; a claim is not execution; an AI reply
 * is not a GitHub commit. Never synthesize zero from missing evidence.
 */
(function(root){
  var REPO='andylitvinov-design/books';
  var SHA=/^[a-f0-9]{40}$/i, TASK=/^[a-f0-9]{32}$/i;
  var ASSOCIATIONS=new Set(['MATCHED_CHAT_EVENT_RECORDED',
    'TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED','AUTO_TASK_CREATED_NOT_DISPATCHED']);
  var FAILURE=new Set(['failure','timed_out','startup_failure','action_required']);
  var TERMINAL=new Set(['PUBLISHED','MANUAL','FAILED','PREPARED','REJECTED',
    'SUPERSEDED','VERIFY_REQUIRED','NO_CLAIM_RETRYABLE']);
  var STAGES=[
    ['failed','PR с ошибкой','Подтверждённая ошибка Core CI'],
    ['classified','Классифицировано','Сохранён тип ошибки и стратегия'],
    ['task','Задача создана','Задача связана с конкретным PR и HEAD'],
    ['assigned','Исполнитель назначен','Сохранён конкретный executor_id'],
    ['dispatched','Задача отправлена','GitHub принял запрос на запуск Worker'],
    ['claimed','Задача получена','Worker подтвердил CLAIMED на том же HEAD'],
    ['runner','Исполнитель запущен','Подтверждён реальный GitHub Actions runner'],
    ['responded','Ответ исполнителя','Сохранён подписанный итог Worker'],
    ['committed','Коммит в GitHub','Новый SHA подтверждён GitHub и связан с HEAD']
  ];
  function goodTime(value){var n=Date.parse(value||'');return Number.isFinite(n)?n:null;}
  function validEvent(e){
    return !!(e&&e.repository===REPO&&Number.isSafeInteger(e.pr_number)&&e.pr_number>0&&
      SHA.test(e.head_sha||'')&&
      /^[0-9]{1,20}$/.test(String(e.workflow_run_id||''))&&
      Number.isSafeInteger(Number(e.run_attempt))&&Number(e.run_attempt)>0&&
      FAILURE.has(e.conclusion)&&goodTime(e.created_at)!==null);
  }
  function classified(e){var c=e.classification;return !!(c&&
    c.schema==='HH_CI_ERROR_CLASSIFICATION_V1'&&c.status==='DIAGNOSTIC_ONLY'&&
    c.category===e.category&&typeof c.reason_code==='string'&&
    c.reason_code.length>0&&typeof c.responsible_role==='string'&&
    c.responsible_role.length>0);}
  function taskLinked(e){return classified(e)&&ASSOCIATIONS.has(e.association_status);}
  function routeFor(e){
    var r=e.route_receipt;
    return taskLinked(e)&&r&&r.schema==='HH_COMMANDER_CI_ROUTE_RECEIPT_V1'&&
      r.prNumber===e.pr_number&&r.headSha===e.head_sha&&
      String(r.runId)===String(e.workflow_run_id)&&
      r.category===e.category&&
      r.inboxId===e.ci_event_id&&
      r.executorId==='github-actions:hh-pr-repair-worker.yml'&&
      TASK.test(r.workerTaskKey||'')&&TASK.test(r.errorTaskId||'')&&
      r.dispatchAccepted===1&&r.dispatchAcknowledged===true&&
      r.state==='DISPATCH_ACCEPTED_NOT_WORKER_STARTED'?r:null;
  }
  function trustedComment(c){return !!(c&&Number.isSafeInteger(c.id)&&c.id>0&&
    c.user?.login==='github-actions[bot]'&&
    c.user.id===41898282&&c.user.type==='Bot'&&
    c.performed_via_github_app?.id===15368&&
    c.performed_via_github_app.slug==='github-actions'&&
    c.created_at===c.updated_at&&goodTime(c.created_at)!==null&&
    typeof c.body==='string'&&c.body.length<65000);}
  function commentUrl(c){
    return /^https:\/\/github\.com\/andylitvinov-design\/books\/(?:issues|pull)\/\d+#issuecomment-\d+$/.test(c?.html_url||'')?
      c.html_url:null;
  }
  function taskRecords(c){
    var found=[],expression=/<!-- HH_PR_TASK_V1 -->\s*\x60\x60\x60json\s*\n([^\n]{1,45000})\n\x60\x60\x60/g,match;
    while((match=expression.exec(c.body))!==null&&found.length<5){
      try{var item=JSON.parse(match[1]);if(item?.schema==='HH_PR_TASK_V1')found.push(item);}
      catch(_){/* Malformed receipts are not evidence. */}
    }
    return found;
  }
  function stagePublished(c,e,taskKey,runId,newSha){
    var match,expr=/<!-- HH_PR_STAGE_V1 (\{[^\r\n]{1,680}\}) -->/g;
    while((match=expr.exec(c.body))!==null){
      try{
        var s=JSON.parse(match[1]);
        if(s.stage==='source_published'&&s.source==='verified_git_ref'&&
          s.pr_number===e.pr_number&&s.head_sha===e.head_sha&&
          s.task_key===taskKey&&String(s.run_id)===String(runId)&&s.new_sha===newSha)
          return true;
      }catch(_){/* ignore */}
    }
    return false;
  }
  function taskEvidence(comments,e){
    var route=routeFor(e),empty={claimed:false,runner:false,responded:false,
      candidate_sha:null,ai_response:false,links:{},worker_status:null};
    if(!route||!Array.isArray(comments))return empty;
    var events=[],seen=new Set();
    for(var c of comments){
      if(!trustedComment(c)||seen.has(c.id))continue;
      seen.add(c.id);
      for(var item of taskRecords(c)){
        if(item.pr_number!==e.pr_number||item.head_sha!==e.head_sha||
          item.task_key!==route.workerTaskKey)continue;
        events.push({comment:c,item:item});
      }
    }
    var claimed=events.find(function(x){
      return x.item.state==='CLAIMED'&&x.item.worker_started===true&&
        x.item.assignment_status==='WORKER_CLAIMED'&&
        x.item.assigned_executor_id===route.executorId&&
        x.item.error_task_id===route.errorTaskId&&
        /^[1-9][0-9]{0,18}$/.test(String(x.item.owner_run_id||''))&&
        x.comment.body.includes('<!-- HH_PR_REPAIR_WORKER_V1 '+e.head_sha+' -->');
    });
    if(!claimed)return empty;
    var runId=String(claimed.item.owner_run_id);
    empty.claimed=true;empty.links.claimed=commentUrl(claimed.comment);
    var runner=events.find(function(x){
      var r=x.item.runner||{};
      return x.item.state==='RUNNER_STARTED'&&String(x.item.owner_run_id)===runId&&
        String(r.run_id)===runId&&Number.isSafeInteger(r.job_id)&&r.job_id>0&&
        Number.isSafeInteger(r.runner_id)&&r.runner_id>0&&
        goodTime(r.started_at)!==null&&
        x.comment.body.includes('<!-- HH_EXECUTION_RUNNER_V1 '+e.head_sha+' -->');
    });
    if(!runner)return empty;
    empty.runner=true;empty.links.runner=commentUrl(runner.comment);
    var answer=events.find(function(x){
      return TERMINAL.has(x.item.state)&&String(x.item.owner_run_id)===runId&&
        x.comment.body.includes('<!-- HH_PR_REPAIR_OUTCOME_V1 '+e.head_sha+' '+runId+' -->')&&
        typeof x.item.reason_code==='string'&&x.item.reason_code.length>0;
    });
    if(!answer)return empty;
    empty.responded=true;empty.links.responded=commentUrl(answer.comment);
    empty.worker_status=answer.item.state;
    var ai=answer.item.model_run;
    empty.ai_response=!!(ai&&ai.schema==='HH_FREE_AI_MODEL_RUN_V1'&&
      ai.prompt_delivery_status==='RESPONSE_OBSERVED'&&
      goodTime(ai.response_received_at)!==null&&
      ai.pr_number===e.pr_number&&ai.source_head===e.head_sha&&
      String(ai.run_id)===runId);
    var result=answer.item;
    if(result.state==='PUBLISHED'&&result.source_published===true&&
      result.verified_source_fix===true&&SHA.test(result.new_sha||'')&&
      result.new_sha!==e.head_sha&&
      result.outcome?.schema==='HH_TASK_OUTCOME_V1'&&
      result.outcome.verified_source===true&&
      result.outcome.new_sha===result.new_sha&&
      result.outcome.task_key===route.workerTaskKey&&
      comments.some(function(c){return trustedComment(c)&&
        stagePublished(c,e,route.workerTaskKey,runId,result.new_sha);}))
      empty.candidate_sha=result.new_sha;
    return empty;
  }
  function summarize(raw,byEvent,hours,now,complete){
    if(!Array.isArray(raw)||![24,168,336,720].includes(hours))return null;
    var start=now-hours*3600000;
    var selected=raw.filter(function(e){var t=goodTime(e.created_at);
      return validEvent(e)&&t>=start&&t<=now+60000;});
    // Count the PR once per step; independent incidents on the same PR cannot
    // be accidentally combined into a fabricated single verified repair.
    var prs=new Map(),uniqueEvents=new Set(),counts={},links={};
    for(var stage of STAGES){counts[stage[0]]=0;links[stage[0]]=[];}
    for(var e of selected){
      uniqueEvents.add([e.pr_number,e.head_sha,e.workflow_run_id,e.run_attempt].join(':'));
      var pr=prs.get(e.pr_number)||{number:e.pr_number,steps:{},proof:{},ai_response:false};
      var route=routeFor(e),id=String(e.ci_event_id||'');
      var proof=byEvent&&byEvent[id]||{};
      var states={failed:true,classified:classified(e),task:taskLinked(e),
        assigned:!!route,dispatched:!!route,claimed:!!route&&proof.claimed===true,
        runner:!!route&&proof.runner===true,
        responded:!!route&&proof.responded===true,
        committed:!!route&&proof.responded===true&&proof.commit_verified===true};
      for(var key of Object.keys(states)){
        if(states[key]){pr.steps[key]=true;
          pr.proof[key]=key==='committed'&&proof.candidate_sha?
            'https://github.com/'+REPO+'/commit/'+proof.candidate_sha:
            proof.links?.[key]||e.run_url||'https://github.com/'+REPO+'/pull/'+e.pr_number;}
      }
      if(proof.ai_response===true)pr.ai_response=true;
      prs.set(e.pr_number,pr);
    }
    for(var pr of prs.values()){
      for(var stage of STAGES){var key=stage[0];
        if(pr.steps[key]){counts[key]++;links[key].push({
          pr:pr.number,url:pr.proof[key],worker_status:pr.steps.responded?pr.worker_status:null});}
      }
    }
    for(var key of Object.keys(links))links[key].sort(function(a,b){return b.pr-a.pr;});
    return {schema:'HH_PR_ERROR_FUNNEL_V1',period_hours:hours,from:new Date(start).toISOString(),
      to:new Date(now).toISOString(),counts:counts,links:links,
      unique_prs:prs.size,unique_events:uniqueEvents.size,
      ai_responded_prs:[...prs.values()].filter(function(p){return p.ai_response;}).length,
      complete:complete===true};
  }
  var model={STAGES:STAGES,validEvent:validEvent,classified:classified,
    taskLinked:taskLinked,routeFor:routeFor,trustedComment:trustedComment,
    taskEvidence:taskEvidence,summarize:summarize};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;
  if(typeof document==='undefined'||typeof window==='undefined')return;
  if(root.__hhPrErrorFunnelMounted)return;
  root.__hhPrErrorFunnelMounted=true;
  var panel,select,refreshButton,message,grid,drill,loading=false;
  var commentsCache=new Map(),commitCache=new Map();
  var formatter=new Intl.NumberFormat('ru-RU');
  function el(tag,css,label){var n=document.createElement(tag);
    if(css)n.className=css;if(label!==undefined)n.textContent=String(label);return n;}
  function safeLink(url){
    return typeof url==='string'&&
      /^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull\/\d+|issues\/\d+#issuecomment-\d+|commit\/[0-9a-f]{40}|actions\/runs\/\d+)$/.test(url);
  }
  function mount(){
    if(panel||document.getElementById('hh-pr-error-funnel'))return;
    var main=document.querySelector('main.wrap')||document.querySelector('main:not(#hh2-boot-status)');
    if(!main)return;
    panel=el('section','hh-error-funnel');
    panel.id='hh-pr-error-funnel';
    panel.setAttribute('aria-label','Обработка ошибок PR');
    var header=el('div','hh-error-head');
    var titles=el('div');
    titles.append(el('h2','', 'Обработка ошибок'),el('p','',
      'От ошибки CI до подтверждённого коммита · только проверенные события'));
    var controls=el('div','hh-error-controls');
    var label=el('label','', 'Период');
    select=el('select');select.setAttribute('aria-label','Период обработки ошибок PR');
    for(var x of [[24,'24 часа'],[168,'7 дней'],[336,'14 дней'],[720,'30 дней']]){
      var option=el('option','',x[1]);option.value=String(x[0]);select.append(option);
    }
    select.value='24';label.append(select);
    refreshButton=el('button','hh-error-refresh','Обновить');
    refreshButton.type='button';
    controls.append(label,refreshButton);
    header.append(titles,controls);
    grid=el('div','hh-error-grid');
    message=el('p','hh-error-message','Загружаю подтверждённые события…');
    message.setAttribute('role','status');
    drill=el('div','hh-error-drill');
    panel.append(header,grid,message,drill);
    main.insertBefore(panel,main.firstChild);
    select.addEventListener('change',load);
    refreshButton.addEventListener('click',function(){
      commentsCache.clear();commitCache.clear();void load();
    });
    void load();
  }
  async function gh(url){
    var response=await fetch(url,{method:'GET',credentials:'omit',
      cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error('GITHUB_HTTP_'+response.status);
    return response.json();
  }
  async function commentsFor(pr){
    if(commentsCache.has(pr))return commentsCache.get(pr);
    var u='https://api.github.com/repos/'+REPO+'/issues/'+pr+'/comments?per_page=100';
    var data=await gh(u);
    if(!Array.isArray(data))throw Error('INVALID_GITHUB_COMMENTS');
    var result={comments:data,complete:data.length<100};
    commentsCache.set(pr,result);
    return result;
  }
  async function verifyCommit(e,sha){
    if(!SHA.test(sha||''))return false;
    var cacheKey=e.head_sha+':'+sha;
    if(commitCache.has(cacheKey))return commitCache.get(cacheKey);
    var result=await gh('https://api.github.com/repos/'+REPO+'/git/commits/'+sha);
    var valid=result.sha===sha&&Array.isArray(result.parents)&&
      result.parents.some(function(p){return p.sha===e.head_sha;});
    commitCache.set(cacheKey,valid);
    return valid;
  }
  function display(data,note){
    grid.replaceChildren();drill.replaceChildren();
    for(var stage of STAGES){
      var key=stage[0],n=data.counts[key],card=el('article','hh-error-stage');
      var top=el('div','hh-error-stage-head');
      top.append(el('span','',stage[1]),el('strong','',data.complete?formatter.format(n):'≥'+formatter.format(n)));
      var fraction=data.unique_prs>0?Math.max(0,Math.min(100,100*n/data.unique_prs)):0;
      var track=el('div','hh-error-track'),fill=el('span','hh-error-fill');
      fill.style.width=fraction.toFixed(1)+'%';track.append(fill);
      var sub=el('small','',stage[2]);
      card.append(top,track,sub);grid.append(card);
      var d=el('details','hh-error-details');
      var title=el('summary','',stage[1]+' · '+(data.complete?String(n):'≥'+n)+' PR');
      d.append(title);
      var list=el('div','hh-error-pr-list');
      if(!n)list.append(el('span','',data.complete?'Нет подтверждённых переходов.':'Нет подтверждений в просмотренном срезе.'));
      for(var item of data.links[key]){
        var a=el('a','', 'PR #'+item.pr);a.href='https://github.com/'+REPO+'/pull/'+item.pr;
        a.target='_blank';a.rel='noopener noreferrer';list.append(a);
        if(safeLink(item.url)&&item.url!==a.href){
          var proof=el('a','hh-error-proof','Доказательство');
          proof.href=item.url;proof.target='_blank';proof.rel='noopener noreferrer';list.append(proof);
        }
      }
      d.append(list);drill.append(d);
    }
    message.replaceChildren();
    var time=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
      day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    message.append('Период: '+time.format(new Date(data.from))+' — '+time.format(new Date(data.to))+
      ' (Торонто). Ошибок Core CI: '+data.unique_events+' событий в '+
      data.unique_prs+' PR. Ответов модели OpenRouter: '+data.ai_responded_prs+
      ' PR (это не равно коммиту). '+(note||'')+
      (data.complete?'':' Неполное покрытие: показаны минимально подтверждённые значения, не все события.'));
  }
  async function load(){
    if(loading||!panel)return;loading=true;
    refreshButton.disabled=true;select.disabled=true;
    message.textContent='Сверяю задачи с подписанными квитанциями Worker и GitHub…';
    grid.replaceChildren();drill.replaceChildren();
    try{
      var response=await fetch('/api/commander-chats?action=ci_events&limit=100',{
        credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
      if(response.status===401||response.status===403){
        message.replaceChildren('Для просмотра обработки ошибок войдите как владелец. ');
        var login=el('a','','Войти в Commander');login.href='/commander-auth.html';message.append(login);
        return;
      }
      if(!response.ok)throw Error('CI_INBOX_HTTP_'+response.status);
      var result=await response.json();
      if(result.schema!=='HH_COMMANDER_CI_EVENT_INBOX_V1'||!Array.isArray(result.events))
        throw Error('CI_INBOX_INVALID');
      var now=Date.now(),hours=Number(select.value),cutoff=now-hours*3600000;
      var all=result.events,eligible=all.filter(function(e){
        return validEvent(e)&&goodTime(e.created_at)>=cutoff&&goodTime(e.created_at)<=now+60000;});
      var oldest=all.reduce(function(low,e){var t=goodTime(e.created_at);return t!==null&&t<low?t:low;},Infinity);
      var complete=all.length<100||oldest<cutoff;
      var candidates=eligible.filter(routeFor);
      var prs=[...new Set(candidates.map(function(e){return e.pr_number;}))];
      // Bound public unauthenticated GitHub reads and surface truncation.
      if(prs.length>18){prs=prs.slice(0,18);complete=false;}
      var evidence={},failed=0,commitFailures=0;
      var batches=await Promise.allSettled(prs.map(commentsFor));
      var byPR=new Map();
      prs.forEach(function(pr,i){if(batches[i].status==='fulfilled'){
        byPR.set(pr,batches[i].value);
        if(!batches[i].value.complete)complete=false;
      }else{failed++;complete=false;}});
      var commitChecks=[];
      for(var e of candidates){
        var bundle=byPR.get(e.pr_number);
        if(!bundle)continue;
        var proof=taskEvidence(bundle.comments,e);
        evidence[String(e.ci_event_id||'')]=proof;
        if(proof.candidate_sha){
          commitChecks.push({e:e,proof:proof});
        }
      }
      var checks=await Promise.allSettled(commitChecks.map(function(x){
        return verifyCommit(x.e,x.proof.candidate_sha);
      }));
      checks.forEach(function(result,i){
        if(result.status==='fulfilled'&&result.value===true)
          commitChecks[i].proof.commit_verified=true;
        else{commitFailures++;complete=false;}
      });
      var data=summarize(all,evidence,hours,now,complete);
      if(!data)throw Error('CI_FUNNEL_CALCULATION');
      var note=(failed?'Не удалось сверить '+failed+' PR с GitHub. ':'')+
        (commitFailures?'Не подтверждено '+commitFailures+' кандидатов на коммит. ':'')+
        'Принятый dispatch ≠ запущенный Worker; ответ Worker ≠ коммит.';
      display(data,note);
    }catch(err){
      message.textContent='Достоверная статистика недоступна ('+
        String(err.message||err).slice(0,90)+'). Пропуск данных не равен нулю.';
    }finally{loading=false;refreshButton.disabled=false;select.disabled=false;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})(typeof window==='undefined'?globalThis:window);
