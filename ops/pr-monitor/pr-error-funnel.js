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
    ['assigned','Исполнитель назначен','Назначен реальный диагност или ремонтный агент; не означает исправление'],
    ['source_assigned','Repair Worker назначен','Назначен конкретный кодовый исполнитель на проверенный HEAD'],
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
  // Only a signed Core source-owned test may join ordinary code repair.
  // Specialist/browser tests remain review-only.
  function sourceRepairCandidate(e){
    if(['TYPESCRIPT','SOURCE_CODE'].includes(e?.category))return true;
    if(e?.category!=='TEST_FAILURE'||!classified(e)||
       e.classification?.reason_code!=='FAILED_TEST_STEP_REQUIRES_TRIAGE'||
       e.classification?.evidence_code!=='FAILED_TEST_STEP_REQUIRES_TRIAGE')return false;
    var job='core-lint-types-build',
      step='Mobile Dock Core geometry and iPhone keyboard contracts';
    // The private OIDC inbox retains failed_jobs/failed_steps separately;
    // it deliberately does not persist unrestricted classifier fields.
    return (e.classification.failed_job===job&&e.classification.failed_step===step)||
      (Array.isArray(e.failed_jobs)&&e.failed_jobs.includes(job)&&
       Array.isArray(e.failed_steps)&&e.failed_steps.includes(job+' / '+step));
  }
  function routeFor(e,comments){
    var r=e.route_receipt;
    var stored=taskLinked(e)&&r&&r.schema==='HH_COMMANDER_CI_ROUTE_RECEIPT_V1'&&
      r.prNumber===e.pr_number&&r.headSha===e.head_sha&&
      String(r.runId)===String(e.workflow_run_id)&&
      r.category===e.category&&
      r.inboxId===e.ci_event_id&&
      r.executorId==='github-actions:hh-pr-repair-worker.yml'&&
      TASK.test(r.workerTaskKey||'')&&TASK.test(r.errorTaskId||'')&&
      r.dispatchAccepted===1&&r.dispatchAcknowledged===true&&
      r.state==='DISPATCH_ACCEPTED_NOT_WORKER_STARTED'?r:null;
    return stored||signedClaimRoute(comments,e);
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
  function diagnosticAssignment(e){
    var a=e.assignment_receipt;
    return !!(taskLinked(e)&&a&&a.schema==='HH_CI_EXECUTOR_ASSIGNMENT_V1'&&
      a.ciEventId===e.ci_event_id&&a.prNumber===e.pr_number&&
      a.headSha===e.head_sha&&a.category===e.category&&
      a.executor==='openrouter'&&
      a.executorId==='agent-commander-openrouter-worker'&&
      typeof a.strategy==='string'&&a.strategy.length>0&&
      typeof a.runId==='string'&&a.runId.length>0);
  }
  // GitHub's signed, immutable CLAIMED receipt is stronger than an early
  // Supabase cron-backstop snapshot. Reconstruct an accepted source route
  // only when a separate trusted Core error-task comment binds the same
  // PR, original HEAD, Core run and error task id. An edited dispatch comment
  // or an arbitrary model answer is NOT accepted as evidence.
  function signedClaimRoute(comments,e){
    if(!taskLinked(e)||!Array.isArray(comments)||
      !sourceRepairCandidate(e))return null;
    var errors=new Set();
    for(var c of comments){
      if(!trustedComment(c))continue;
      var match=c.body.match(/<!-- HH_CI_ERROR_TASK_V1 ([a-f0-9]{32}) -->[\s\S]{0,1800}?\x60\x60\x60json\s*\n([^\n]{1,45000})\n\x60\x60\x60/);
      if(!match)continue;
      try{
        var er=JSON.parse(match[2]);
        if(er.schema==='HH_CI_ERROR_TASK_V1'&&er.task_id===match[1]&&
          er.pr_number===e.pr_number&&er.head_sha===e.head_sha&&
          String(er.run_id)===String(e.workflow_run_id)&&
          er.category===e.category&&er.executor_id==='github-actions:hh-pr-repair-worker.yml'&&
          er.strategy_code==='GUARDED_SOURCE_REPAIR'&&
          er.source_write_authorized===false&&er.execution_authorized===false)
          errors.add(er.task_id);
      }catch(_){/* unverified source is never a route */}
    }
    if(!errors.size)return null;
    for(var comment of comments){
      if(!trustedComment(comment)||
        !comment.body.includes('<!-- HH_PR_REPAIR_WORKER_V1 '+e.head_sha+' -->'))continue;
      for(var item of taskRecords(comment)){
        if(item.state!=='CLAIMED'||item.worker_started!==true||
          item.assignment_status!=='WORKER_CLAIMED'||
          item.pr_number!==e.pr_number||item.head_sha!==e.head_sha||
          item.head_ref===undefined||item.base_ref!=='codex/public-book-library'||
          item.assigned_executor_id!=='github-actions:hh-pr-repair-worker.yml'||
          !TASK.test(item.task_key||'')||!errors.has(item.error_task_id)||
          !/^[1-9][0-9]{0,18}$/.test(String(item.owner_run_id||'')))continue;
        return {schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
          prNumber:e.pr_number,headSha:e.head_sha,runId:e.workflow_run_id,
          category:e.category,inboxId:e.ci_event_id,
          executorId:'github-actions:hh-pr-repair-worker.yml',
          workerTaskKey:item.task_key,errorTaskId:item.error_task_id,
          dispatchAccepted:1,dispatchAcknowledged:true,
          state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',
          evidenceSource:'GITHUB_SIGNED_EXACT_HEAD_WORKER_CLAIM',
          proofUrl:commentUrl(comment)};
      }
    }
    return null;
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
  // Fixed-vocabulary failure taxonomy: the user can see WHY a verified
  // Worker outcome did not become a GitHub commit. Never render provider
  // messages, source text, token contents or untrusted PR descriptions.
  // These are historical outcomes, not an instruction to retry a held HEAD.
  var FAILURE_REASONS=[
    ['publish','GitHub не опубликовал коммит',
      'Проверить права издателя и совпадение SHA; не выполнять обходной force-push.'],
    ['coverage','Нет доказанного теста или воспроизведения',
      'Уточнить конкретный тест и ошибку TypeScript; проверку не отключать.'],
    ['provider','Бесплатная модель недоступна',
      'Квота/запрос бесплатной модели; платный fallback не запускать.'],
    ['patch','Патч отклонён проверкой',
      'Нужна новая безопасная правка и независимая верификация.'],
    ['scope','Область исходников требует владельца',
      'Чувствительные или неподдерживаемые файлы нельзя передавать свободному агенту.'],
    ['other','Другая подтверждённая причина',
      'Открыть подписанный результат Worker и назначенную задачу для точного разбора.'],
    ['unverified','Есть кандидат, но запись SHA не проверена',
      'Не считать коммитом до независимого чтения GitHub commit и его родителя.']
  ];
  var SOURCE_CATEGORIES=new Set(['TYPESCRIPT','SOURCE_CODE']);
  function workerFailureReason(item){
    if(!item||typeof item!=='object'||item.state==='PUBLISHED')return null;
    var reason=typeof item.reason_code==='string'?item.reason_code:'';
    var detail=typeof item.detail_code==='string'?item.detail_code:'';
    if(reason==='SOURCE_PUBLISH_JOB_FAILURE'||
       reason==='FREE_AI_JOB_NOT_STARTED_NO_SOURCE_COMMIT'||
       /^HH_REPAIR_(?:GIT_DATA|GRAPHQL|PUBLISH)/.test(detail))return 'publish';
    if(['FREE_AI_NO_BOUNDED_TEST_COVERAGE',
      'FREE_AI_NO_REPRODUCED_BOUNDED_FAILURE',
      'FREE_AI_TYPECHECK_FAILURE_OUTSIDE_REPAIR_SCOPE',
      'FREE_AI_TYPECHECK_LINE_NOT_IN_SOURCE',
      'SCOPED_TESTS_NOT_GREEN'].includes(detail))return 'coverage';
    if(['FREE_AI_UNSAFE_SOURCE_SCOPE','SOURCE_SCOPE_UNSAFE_FOR_FREE_AI',
      'SOURCE_SCOPE_NOT_ACTIONABLE'].includes(detail))return 'scope';
    if(['FREE_AI_PATCH_APPLY_CHECK_FAILED','FREE_AI_PATCH_RESPONSE_INVALID',
      'FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED',
      'FREE_AI_PATCH_APPLY_RECOUNT_UNVERIFIED'].includes(detail))return 'patch';
    if(detail==='FREE_AI_FREE_TIER_QUOTA_EXHAUSTED'||
       /^FREE_AI_OPENROUTER_(?:HTTP_|REQUEST_|RATE_|MODEL_|QUOTA_)/.test(detail)||
       detail==='FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID')return 'provider';
    return 'other';
  }
  function verifiedFollowUp(item,e,taskKey,runId){
    var f=item?.follow_up_task;
    return !!(f&&f.schema==='HH_CI_ERROR_TASK_V1'&&
      f.event_kind==='REPAIR_WORKER_FAILED'&&
      f.pr_number===e.pr_number&&f.head_sha===e.head_sha&&
      f.parent_task_key===taskKey&&String(f.owner_run_id)===runId&&
      f.executor_kind==='owner_review'&&f.assignment_status==='OWNER_REVIEW_REQUIRED'&&
      f.source_write_authorized===false&&f.execution_authorized===false&&
      TASK.test(f.task_id||''));
  }
  function taskEvidence(comments,e){
    var route=routeFor(e,comments),empty={claimed:false,runner:false,responded:false,
      candidate_sha:null,ai_response:false,links:{},worker_status:null,
      failure_reason:null,follow_up_verified:false,
      verified_route:route||null};
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
    empty.failure_reason=workerFailureReason(answer.item);
    empty.follow_up_verified=verifiedFollowUp(answer.item,e,route.workerTaskKey,runId);
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
    if(!Array.isArray(raw)||![1,24,168,336,720].includes(hours))return null;
    var start=now-hours*3600000;
    var selected=raw.filter(function(e){var t=goodTime(e.created_at);
      return validEvent(e)&&t>=start&&t<=now+60000;});
    // Count the PR once per step; independent incidents on the same PR cannot
    // be accidentally combined into a fabricated single verified repair.
    var prs=new Map(),uniqueEvents=new Set(),counts={},links={};
    // These diagnostic cohorts overlap. No missing receipt is fabricated.
    var BLOCKERS=[
      ['diagnostic_only','Ошибка не требует кодового Worker',
        'Маршрут CI, диагностика, конфликт или иной тип — нужен профильный исполнитель.'],
      ['source_not_dispatched','Кодовая задача ещё не дошла до Worker',
        'Ошибка исходников подтверждена, но нет проверенного dispatch для конкретного HEAD.'],
      ['unclassified','Диагностика не завершена','Нет проверенной классификации или причина UNKNOWN'],
      ['unrouted','Нет результата маршрутизации','Нет ни сохранённого маршрута, ни подписанного подтверждения GitHub.'],
      ['needs_review','Нужен другой исполнитель','Задача направлена на диагностику/ручной разбор, а не кодовому Worker.'],
      ['worker_without_commit','Ответ без коммита','Worker завершил попытку, исходный код не опубликован.'],
      ...FAILURE_REASONS.map(function(r){return ['why_'+r[0],r[1],r[2]];})
    ];
    var blockers={};
    for(var item of BLOCKERS)blockers[item[0]]={prs:new Set(),events:new Set(),label:item[1],note:item[2]};
    var mark=(code,e)=>{
      blockers[code].prs.add(e.pr_number);
      blockers[code].events.add([e.pr_number,e.head_sha,e.workflow_run_id,e.run_attempt].join(':'));
    };
    for(var stage of STAGES){counts[stage[0]]=0;links[stage[0]]=[];}
    for(var e of selected){
      uniqueEvents.add([e.pr_number,e.head_sha,e.workflow_run_id,e.run_attempt].join(':'));
      var pr=prs.get(e.pr_number)||{number:e.pr_number,steps:{},proof:{},ai_response:false};
      var id=String(e.ci_event_id||'');
      var proof=byEvent&&byEvent[id]||{};
      var route=routeFor(e)||proof.verified_route||null;
      if(!classified(e)||e.category==='UNKNOWN')mark('unclassified',e);
      if(taskLinked(e)&&!e.route_receipt&&!route)mark('unrouted',e);
      if(taskLinked(e)&&!SOURCE_CATEGORIES.has(e.category))
        mark('diagnostic_only',e);
      if(taskLinked(e)&&SOURCE_CATEGORIES.has(e.category)&&!route)
        mark('source_not_dispatched',e);
      if(['TASK_REQUIRES_REVIEW','TASK_ROUTED_TO_REVIEW',
        'TASK_AWAITING_EXISTING_RECOVERY'].includes(e.route_receipt?.state))
        mark('needs_review',e);
      if(route&&proof.responded===true&&proof.commit_verified!==true){
        mark('worker_without_commit',e);
        var failureKey=proof.candidate_sha?'unverified':proof.failure_reason||'other';
        mark('why_'+failureKey,e);
      }
      var states={failed:true,classified:classified(e),task:taskLinked(e),
        assigned:diagnosticAssignment(e)||!!route,
        source_assigned:!!route,dispatched:!!route,
        claimed:!!route&&proof.claimed===true,
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
      if(proof.worker_status)pr.worker_status=proof.worker_status;
      prs.set(e.pr_number,pr);
    }
    for(var pr of prs.values()){
      for(var stage of STAGES){var key=stage[0];
        if(pr.steps[key]){counts[key]++;links[key].push({
          pr:pr.number,url:pr.proof[key],worker_status:pr.steps.responded?pr.worker_status:null});}
      }
    }
    for(var key of Object.keys(links))links[key].sort(function(a,b){return b.pr-a.pr;});
    // Differences of lower bounds are NOT lower bounds. Never render 15-3
    // as an exact number when the 100-event/PR proof window is incomplete.
    var diagnosticAssignments=complete===true?
      Math.max(0,counts.assigned-counts.source_assigned):null;
    var workerRepliesWithoutCommit=complete===true?
      Math.max(0,counts.responded-counts.committed):null;
    return {schema:'HH_PR_ERROR_FUNNEL_V1',period_hours:hours,from:new Date(start).toISOString(),
      to:new Date(now).toISOString(),counts:counts,links:links,
      unique_prs:prs.size,unique_events:uniqueEvents.size,
      ai_responded_prs:[...prs.values()].filter(function(p){return p.ai_response;}).length,
      breakdown:{assigned_diagnostic_not_source:diagnosticAssignments,
        worker_replies_without_commit:workerRepliesWithoutCommit,
        note:'Когорта содержит исторические и закрытые PR; категории могут пересекаться.'},
      blockers:BLOCKERS.map(function(item){
        var row=blockers[item[0]];
        return {key:item[0],label:row.label,note:row.note,
          prs:[...row.prs].sort(function(a,b){return b-a;}),
          pr_count:row.prs.size,event_count:row.events.size};
      }),
      complete:complete===true};
  }
  var model={STAGES:STAGES,validEvent:validEvent,classified:classified,
    taskLinked:taskLinked,routeFor:routeFor,trustedComment:trustedComment,
    diagnosticAssignment:diagnosticAssignment,sourceRepairCandidate:sourceRepairCandidate,signedClaimRoute:signedClaimRoute,
    taskEvidence:taskEvidence,summarize:summarize};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;
  if(typeof document==='undefined'||typeof window==='undefined')return;
  if(root.__hhPrErrorFunnelMounted)return;
  root.__hhPrErrorFunnelMounted=true;
  var panel,select,refreshButton,message,insight,grid,drill,blockerPanel,loading=false;
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
    for(var x of [[1,'1 час'],[24,'24 часа'],[168,'7 дней'],[336,'14 дней'],[720,'30 дней']]){
      var option=el('option','',x[1]);option.value=String(x[0]);select.append(option);
    }
    select.value='24';label.append(select);
    refreshButton=el('button','hh-error-refresh','Обновить');
    refreshButton.type='button';
    controls.append(label,refreshButton);
    header.append(titles,controls);
    insight=el('p','hh-error-insight','Разбираю назначения и публикации по подтверждениям GitHub…');
    grid=el('div','hh-error-grid');
    message=el('p','hh-error-message','Загружаю подтверждённые события…');
    message.setAttribute('role','status');
    drill=el('div','hh-error-drill');
    blockerPanel=el('details','hh-error-blockers');
    blockerPanel.append(el('summary','','Почему задачи останавливаются · причины и PR'),
      el('p','','После входа здесь появится разбивка по типу блокировки.'));
    panel.append(header,insight,grid,message,blockerPanel,drill);
    main.insertBefore(panel,main.firstChild);
    renderSkeleton();
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
  function renderSkeleton(){
    if(!grid||!drill)return;
    grid.replaceChildren();drill.replaceChildren();
    for(var stage of STAGES){
      var card=el('article','hh-error-stage');
      var head=el('div','hh-error-stage-head');
      head.append(el('span','',stage[1]),el('strong','','—'));
      var progress=el('progress','hh-error-progress');
      progress.max=100;progress.value=0;
      progress.setAttribute('aria-label',stage[1]+' · данные недоступны');
      card.append(head,progress,el('small','',stage[2]));
      grid.append(card);
    }
  }
  function display(data,note){
    grid.replaceChildren();drill.replaceChildren();
    insight.textContent=data.complete?
      'Назначено: '+data.counts.source_assigned+' Repair Worker и '+
      data.breakdown.assigned_diagnostic_not_source+' диагностических исполнителей. '+
      'Подтверждённых коммитов: '+data.counts.committed+' из '+
      data.counts.responded+' ответов Worker; без SHA — '+
      data.breakdown.worker_replies_without_commit+'.':
      'Неполные данные: подтверждено не менее '+
      data.counts.source_assigned+' кодовых назначений и '+
      data.counts.committed+' GitHub-коммитов. Причины ниже, точная доля недоступна.';
    for(var stage of STAGES){
      var key=stage[0],n=data.counts[key],card=el('article','hh-error-stage');
      var top=el('div','hh-error-stage-head');
      top.append(el('span','',stage[1]),el('strong','',data.complete?formatter.format(n):'≥'+formatter.format(n)));
      var fraction=data.unique_prs>0?Math.max(0,Math.min(100,100*n/data.unique_prs)):0;
      var track=el('progress','hh-error-progress');
      track.max=100;track.value=fraction;
      track.setAttribute('aria-label',stage[1]+' · '+fraction.toFixed(0)+'% PR');
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
    blockerPanel.replaceChildren();
    blockerPanel.append(el('summary','','Почему назначений и коммитов меньше · причины по PR'));
    var reasons=el('div','hh-error-reasons');
    for(var b of data.blockers||[]){
      if(b.pr_count===0)continue;
      var box=el('article','hh-error-reason');
      var head=el('div','hh-error-reason-head');
      head.append(el('strong','',b.label),el('span','',b.event_count+' событий · '+b.pr_count+' PR'));
      box.append(head,el('small','',b.note));
      var prs=el('div','hh-error-reason-prs');
      for(var number of b.prs){
        var link=el('a','','#'+number);
        link.href='https://github.com/'+REPO+'/pull/'+number;
        link.rel='noopener noreferrer';link.target='_blank';prs.append(link);
      }
      box.append(prs);reasons.append(box);
    }
    if(!reasons.children.length)reasons.append(el('p','',
      'В выбранном периоде нет подтверждённых причин остановки.'));
    blockerPanel.append(reasons);
    message.replaceChildren();
    var time=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
      day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    message.append('Период: '+time.format(new Date(data.from))+' — '+time.format(new Date(data.to))+
      ' (Торонто). Ошибок Core CI: '+data.unique_events+' событий в '+
      data.unique_prs+' PR. Назначений: '+data.counts.assigned+
      ', кодовому Worker: '+data.counts.source_assigned+
      ', коммитов: '+data.counts.committed+
      '. Ответов модели OpenRouter: '+data.ai_responded_prs+
      ' PR (это не равно коммиту). В выборке есть закрытые и тестовые PR. '+(note||'')+
      (data.complete?'':' Неполное покрытие: показаны минимально подтверждённые значения, не все события.'));
  }
  async function load(){
    if(loading||!panel)return;loading=true;
    refreshButton.disabled=true;select.disabled=true;
    message.textContent='Сверяю задачи с подписанными квитанциями Worker и GitHub…';
    renderSkeleton();
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
      // Review and non-source diagnoses do not have a code Worker. For
      // historical incidents, a genuine Worker CLAIMED comment may be the
      // only durable dispatch proof if Supabase saved an earlier backstop.
      var candidates=eligible.filter(function(e){return taskLinked(e)&&
        sourceRepairCandidate(e);});
      var prs=[...new Set(candidates.map(function(e){return e.pr_number;}))];
      // Bound public unauthenticated GitHub reads and surface truncation.
      if(prs.length>24){prs=prs.slice(0,24);complete=false;}
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
