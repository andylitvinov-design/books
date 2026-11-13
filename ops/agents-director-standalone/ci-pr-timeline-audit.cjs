'use strict';
/**
 * HH PR timeline audit v1 — deterministic, read-only wall-clock attribution.
 *
 * Inputs are independently fetched from GitHub. The collector MUST authenticate
 * stage/task receipts before setting `verified: true` on those events. A time
 * interval is attributed only when BOTH endpoints have evidence. Everything
 * else stays explicitly unattributed, including a disputed/overlapping span.
 *
 * No API calls, Actions, tokens, schedules, billing or workflow changes here.
 */
const REPO = 'andylitvinov-design/books';
const PROD = 'codex/public-book-library';
const CORE = '.github/workflows/hh-pr-core-release.yml';
const REPO_URL = `https://github.com/${REPO}`;
const SHA = /^[0-9a-f]{40}$/i;
const TASK = /^[0-9a-f]{32}$/i;
const STAGES = Object.freeze([
  'created_to_first_ci',
  'runner_wait',
  'checks',
  'repair_after_failure',
  'conflict_resolution',
  'repeat_ci',
  'waiting_merge',
  'unattributed',
]);
const round = value => Math.round(value * 100) / 100;
const parsed = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};
const iso = time => new Date(time).toISOString();
const positive = n => Number.isSafeInteger(n) && n > 0;
const validUrl = value => typeof value === 'string' && (
  new RegExp(`^https://github\\.com/${REPO.replace('/', '\\/')}/(?:pull/\\d+(?:[#?].*)?|actions/runs/\\d+(?:/job/\\d+)?|commit/[0-9a-f]{40}|issues/\\d+(?:#issuecomment-\\d+)?)(?:$)`,'i').test(value)
) ? value : null;
const prUrl = n => `${REPO_URL}/pull/${n}`;
const runUrl = id => `${REPO_URL}/actions/runs/${id}`;
const jobUrl = (run, job) => `${runUrl(run)}/job/${job}`;
const unique = items => [...new Set(items.filter(Boolean))];
const minute = ms => round(ms / 60000);

function normalizePr(pr, now) {
  const number = pr?.number;
  const created = parsed(pr?.created_at);
  const merged = parsed(pr?.merged_at);
  const closed = parsed(pr?.closed_at);
  const base = typeof pr?.base === 'string' ? pr.base : pr?.base?.ref;
  if (!positive(number) || base !== PROD || created === null || created > now ||
      merged !== null && (merged < created || merged > now) ||
      closed !== null && (closed < created || closed > now)) throw Error('INVALID_PRODUCTION_PR');
  const isMerged = pr?.merged === true || merged !== null;
  if (isMerged && merged === null) throw Error('MERGE_TIMESTAMP_UNVERIFIED');
  const end = merged ?? (closed ?? now);
  const state = isMerged ? 'merged' : closed !== null ? 'closed_without_merge' : 'open';
  const head = SHA.test(pr?.head?.sha || '') ? pr.head.sha.toLowerCase() :
    SHA.test(pr?.head_sha || '') ? pr.head_sha.toLowerCase() : null;
  return {number, created, merged, end, state, head, url:prUrl(number)};
}

// The same exact-HEAD association contract used by the existing Core KPI.
// A synthetic merge head without independently verified parents is excluded.
function normalizeRuns(pr, runs, now) {
  if (!Array.isArray(runs) || runs.length > 400) throw Error('RUNS_LIMIT');
  const rows = [], seen = new Set();
  for (const run of runs) {
    if (!positive(run?.id) || seen.has(run.id) || !positive(run.run_attempt) ||
        run.event !== 'pull_request' || String(run.path || '').split('@')[0] !== CORE ||
        run.repository?.full_name !== REPO || run.head_repository?.full_name !== REPO ||
        !Array.isArray(run.pull_requests) || run.pull_requests.length !== 1) continue;
    const ref = run.pull_requests[0];
    const head = ref?.head?.sha;
    if (ref.number !== pr.number || ref?.base?.ref !== PROD || !SHA.test(head || '') ||
        !SHA.test(ref?.base?.sha || '') ||
        (run.head_sha !== head && !(Array.isArray(run.verified_merge_parents) &&
          run.verified_merge_parents.length===2 &&
          run.verified_merge_parents[0]===ref.base.sha &&
          run.verified_merge_parents[1]===head)) ||
        run.head_branch !== ref?.head?.ref) continue;
    const created = parsed(run.created_at);
    if (created === null || created < pr.created || created > pr.end || created > now) continue;
    seen.add(run.id);
    rows.push({id:run.id, created, head:head.toLowerCase(), runAttempt:run.run_attempt,
      status:run.status, conclusion:run.conclusion, url:runUrl(run.id)});
  }
  rows.sort((a,b) => a.created-b.created || a.id-b.id);
  return rows;
}

function normalizeJobs(runs, jobs, now) {
  if (!Array.isArray(jobs) || jobs.length > 3000) throw Error('JOBS_LIMIT');
  const map = new Map(runs.map(r => [r.id,r]));
  const result = [], seen = new Set();
  for (const job of jobs) {
    const run = map.get(job?.run_id);
    if (!run || !positive(job.id) || seen.has(job.id) || !positive(job.run_attempt) ||
        job.run_attempt > run.runAttempt) continue;
    const created = parsed(job.created_at);
    const started = parsed(job.started_at);
    const completed = parsed(job.completed_at);
    if (created === null || started === null || completed === null ||
        started < created || completed < started || completed > now ||
        created < run.created - 60000 || completed > now) continue;
    seen.add(job.id);
    result.push({runId:run.id, runCreated:run.created, head:run.head,
      attempt:job.run_attempt, id:job.id, name:String(job.name || '').slice(0,100),
      created, started, completed, conclusion:String(job.conclusion || ''),
      url:jobUrl(run.id,job.id)});
  }
  return result.sort((a,b) => a.started-b.started || a.id-b.id);
}

function verifiedEvents(pr, raw, now) {
  if (!Array.isArray(raw) || raw.length > 3000) throw Error('EVENTS_LIMIT');
  const rows = [];
  for (const event of raw) {
    // Never treat arbitrarily supplied, unauthenticated comments as receipts.
    const label=['conflict_labeled','conflict_unlabeled'].includes(event?.kind);
    if (event?.verified !== true || event.pr !== pr.number ||
        (!label && !SHA.test(event.head || ''))) continue;
    const at = parsed(event.at);
    if (at === null || at < pr.created || at > pr.end || at > now) continue;
    const url = validUrl(event.url) || (positive(event.runId) ? runUrl(event.runId) : null);
    rows.push({...event,atMs:at,head:label?null:event.head.toLowerCase(),url});
  }
  return rows;
}

function analyzePrTimeline({pr, runs=[], jobs=[], events=[], now=Date.now(),runInventoryComplete=true}) {
  if (!Number.isFinite(now)) throw Error('INVALID_NOW');
  const p = normalizePr(pr, now);
  const rs = normalizeRuns(p,runs,now);
  const js = normalizeJobs(rs,jobs,now);
  const ev = verifiedEvents(p,events,now);
  const intervals = [];
  const marks = [];
  const failures=[];
  const addMark = (kind,at,reason,url,extra={}) => marks.push({kind,at:iso(at),reason,url:url||null,...extra});
  const add = (stage,from,to,reason,urls,substage=null,extra={}) => {
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || from < p.created || to > p.end) return;
    intervals.push({stage,from,to,reason:String(reason).slice(0,240),urls:unique(urls).map(validUrl).filter(Boolean),substage,...extra});
  };
  addMark('created',p.created,'Создан PR',p.url);
  if (rs.length && runInventoryComplete===true) {
    const first=rs[0];
    add('created_to_first_ci',p.created,first.created,
        'От создания PR до подтверждённой постановки первого Core CI; состав внутренних действий неизвестен',
        [p.url,first.url]);
  }
  const attemptGroups=new Map();
  for (const job of js) {
    const key=`${job.runId}:${job.attempt}`;
    if (!attemptGroups.has(key)) attemptGroups.set(key,[]);
    attemptGroups.get(key).push(job);
  }
  const attempts=[];
  for (const run of rs) {
    // Earlier reruns of a run have their own job records when available.
    const detected=[...attemptGroups.keys()].filter(k=>k.startsWith(run.id+':'))
      .map(k=>Number(k.split(':')[1])).sort((a,b)=>a-b);
    for (const attempt of detected) {
      const group=attemptGroups.get(`${run.id}:${attempt}`);
      const started=Math.min(...group.map(j=>j.started));
      const queued=attempt===1?run.created:Math.min(...group.map(j=>j.created));
      if (queued > started || queued < p.created) continue;
      attempts.push({run,attempt,group,queued,started});
    }
  }
  attempts.sort((a,b)=>a.queued-b.queued || a.run.id-b.run.id || a.attempt-b.attempt);
  // The first *confirmed* attempt is initial. All subsequent attempts/runs are
  // repeats; when first run lacks job data, its queue is shown as unverified.
  const firstAttempt=attempts.find(a=>a.run.id===rs[0]?.id&&a.attempt===1) || null;
  const attemptsWithEvidence = [];
  for (const a of attempts) {
    const repeated=a!==firstAttempt;
    const queueStage=repeated?'repeat_ci':'runner_wait';
    const checkStage=repeated?'repeat_ci':'checks';
    const queueReason=repeated?'Повторная проверка: ожидание первого runner':'Ожидание первого runner Core CI';
    addMark(repeated?'repeat_ci_queued':'ci_queued',a.queued,
        repeated?'Запущена повторная попытка CI':'Первая подтверждённая попытка CI',a.run.url,
        {head:a.run.head,attempt:a.attempt});
    add(queueStage,a.queued,a.started,queueReason,[a.run.url],'queue');
    for (const j of a.group) {
      add(checkStage,j.started,j.completed,`${repeated?'Повторный CI':'Проверка'}: ${j.name}`,
          [j.url], 'checks', {check:j.name,conclusion:j.conclusion});
      addMark('job_completed',j.completed,
          `${j.name}: ${j.conclusion||'нет статуса'}`,j.url,
          {head:j.head,attempt:j.attempt});
      if (['failure','timed_out','startup_failure','cancelled','action_required'].includes(j.conclusion)) {
        failures.push(j);
        addMark('ci_failed',j.completed,`Ошибка ${j.name}: ${j.conclusion}`,j.url,{head:j.head});
      }
    }
    attemptsWithEvidence.push({run_id:a.run.id,attempt:a.attempt,head:a.run.head,
      queued_at:iso(a.queued),runner_started_at:iso(a.started),
      queue_minutes:minute(a.started-a.queued),
      checks_wall_minutes:minute(Math.max(...a.group.map(j=>j.completed))-a.started),
      repeated,run_url:a.run.url});
  }
  for (const row of ev) {
    if(row.kind==='conflict_labeled'||row.kind==='conflict_unlabeled') {
      addMark(row.kind,row.atMs,`GitHub: ${row.kind==='conflict_labeled'?'выставлен':'снят'} label hh:conflict-repair-needed; это маркер блокировки, не доказательство длительности ремонта`,row.url,{head:row.head});
    }
    if (row.kind==='stage') {
      addMark(row.stage,row.atMs,`Подтверждённый этап ${row.stage} (${row.source||'receipt'})`,row.url,
        {head:row.head,task:row.task||null});
    }
  }
  // Repair is a trusted, exact-task, exact-HEAD receipt pair. Merely seeing a
  // failed job does NOT authorize labeling the gap to repair as repair time.
  const stage=ev.filter(e=>e.kind==='stage' && TASK.test(e.task||''));
  const keys=unique(stage.map(x=>`${x.head}:${x.task}`));
  for (const key of keys) {
    const [head,task]=key.split(':');
    const pair=s=>stage.filter(e=>e.head===head&&e.task===task&&e.stage===s);
    const starts=pair('repair_started'),ends=pair('source_published');
    if (starts.length===1 && ends.length===1 && starts[0].atMs < ends[0].atMs &&
        SHA.test(ends[0].newHead||'') && ends[0].newHead.toLowerCase()!==head) {
      const past=[...failures].filter(j=>j.head===head&&j.completed<=starts[0].atMs)
        .sort((a,b)=>b.completed-a.completed)[0];
      const triage=ev.some(e=>e.kind==='stage'&&e.stage==='triage'&&
        e.head===head&&e.source==='trusted_core_failure'&&e.atMs<=starts[0].atMs);
      if(past||triage) add('repair_after_failure',starts[0].atMs,ends[0].atMs,
          past?`Исправление после ошибки ${past.name}`:
          'Исправление после подтверждённого сбоя Core CI; название failed job недоступно',
          [starts[0].url,ends[0].url,past?.url],null,{task,head});
    }
  }
  // Conflict lane requires a matching claimed + verified source publish task.
  const conflict=ev.filter(e=>e.lane==='conflict' && TASK.test(e.task||''));
  for (const key of unique(conflict.map(x=>`${x.head}:${x.task}`))) {
    const [head,task]=key.split(':');
    const claims=conflict.filter(x=>x.kind==='claimed'&&x.head===head&&x.task===task);
    const ends=conflict.filter(x=>x.kind==='source_committed'&&x.head===head&&x.task===task);
    if (claims.length!==1||ends.length!==1||claims[0].atMs>=ends[0].atMs||
        !SHA.test(ends[0].newHead||'')) continue;
    addMark('conflict_claimed',claims[0].atMs,'Заявка на разрешение конфликта',claims[0].url,{task,head});
    addMark('conflict_published',ends[0].atMs,'Опубликован проверенный исход конфликта',ends[0].url,{task,head});
    add('conflict_resolution',claims[0].atMs,ends[0].atMs,
        'Подтверждённая работа по разрешению конфликта (не включая ожидание до claim)',
        [claims[0].url,ends[0].url],null,{task,head});
  }
  // Exact-head green: the three protected gates from ONE run + attempt. Other
  // jobs in that same attempt may be skipped/neutral, but not failed/cancelled.
  const greens=[];
  for (const a of attempts) {
    const byName=name=>a.group.filter(j=>j.name===name);
    const gates=['core-lint-types-build','hh-specialist','hh-merge-check'].map(byName);
    if (gates.some(g=>g.length!==1||g[0].conclusion!=='success') ||
        a.group.some(j=>!['success','skipped','neutral'].includes(j.conclusion))) continue;
    const finished=Math.max(...a.group.map(j=>j.completed));
    if (a.run.conclusion==='success'&&a.run.status==='completed'&&finished<=p.end) {
      greens.push({time:finished,head:a.run.head,run:a.run});
      addMark('ci_green',finished,'Core, Specialist и Merge Gate зелёные на одном HEAD и попытке',a.run.url,{head:a.run.head});
    }
  }
  // GitHub's "rerun failed jobs" keeps successful jobs from earlier attempts:
  // Core can be successful on attempt 1 while Specialist/Gate retry on 2.
  // Accept cumulative proof only when the immutable run is completed/successful,
  // the latest required job for EACH gate is successful, and no latest attempt
  // job reports failure. Never combine across different runs or HEADs.
  for(const run of rs){
    if(run.runAttempt<2||run.status!=='completed'||run.conclusion!=='success'||
       greens.some(g=>g.run.id===run.id))continue;
    const all=js.filter(j=>j.runId===run.id);
    const last=all.filter(j=>j.attempt===run.runAttempt);
    if(!last.length||last.some(j=>!['success','skipped','neutral'].includes(j.conclusion)))continue;
    const latest=[];
    for(const name of ['core-lint-types-build','hh-specialist','hh-merge-check']){
      const rows=all.filter(j=>j.name===name).sort((a,b)=>b.attempt-a.attempt||b.completed-a.completed);
      if(!rows.length||rows[0].conclusion!=='success'||
         rows.filter(j=>j.attempt===rows[0].attempt).length!==1){latest.length=0;break;}
      latest.push(rows[0]);
    }
    if(latest.length!==3)continue;
    const finished=Math.max(...last.map(j=>j.completed),...latest.map(j=>j.completed));
    if(finished>p.end)continue;
    greens.push({time:finished,head:run.head,run,urls:[run.url,...latest.map(j=>j.url)],proof:'cumulative_rerun'});
    addMark('ci_green',finished,
      'GitHub Actions завершён успешно: последние Core, Specialist и Gate зелёные на том же HEAD после частичного rerun',
      run.url,{head:run.head,proof:'cumulative_rerun'});
  }
  if (p.state==='merged') {
    const green=greens.filter(x=>x.head===p.head&&x.time<=p.merged)
      .sort((a,b)=>b.time-a.time)[0];
    if (green) add('waiting_merge',green.time,p.merged,
        'Защищённый CI зелёный на merged HEAD; ожидание фактического merge',
        [...(green.urls||[green.run.url]),p.url]);
    addMark('merged',p.merged,'GitHub подтвердил merge в production-ветку',p.url);
  } else if(p.state==='closed_without_merge') {
    addMark('closed_without_merge',p.end,'PR закрыт без merge — не считать production merge',p.url);
  }

  // Reconciliation: partition the entire wall-clock [created, end] into disjoint
  // atomic spans. Competing stage sources are NOT silently force-prioritized.
  const ticks=unique([p.created,p.end,...intervals.flatMap(x=>[x.from,x.to]),
    ...marks.map(m=>Date.parse(m.at))]).sort((a,b)=>a-b);
  const slices=[];
  for (let i=1;i<ticks.length;i++) {
    const from=ticks[i-1],to=ticks[i];if (to<=from) continue;
    const active=intervals.filter(x=>x.from<=from&&x.to>=to);
    const kinds=unique(active.map(x=>x.stage));
    let stageName,substage,reason,urls;
    if(kinds.length===1) {
      stageName=kinds[0];
      substage=unique(active.map(x=>x.substage)).length===1?active[0].substage:null;
      reason=unique(active.map(x=>x.reason)).join('; ').slice(0,300);
      urls=unique(active.flatMap(x=>x.urls));
    }else if(kinds.length>1) {
      stageName='unattributed';substage='ambiguous_overlap';
      reason=`Противоречащие друг другу события: ${kinds.join(' + ')}`;
      urls=unique(active.flatMap(x=>x.urls));
    }else {
      stageName='unattributed';substage='missing_evidence';
      const eventRank={ci_failed:20,ci_green:19,source_published:18,repair_started:17,
        conflict_labeled:16,conflict_unlabeled:15,review_requested:14,job_completed:2,created:1};
      const lastMark=marks.filter(m=>Date.parse(m.at)<=from).sort((a,b)=>
        Date.parse(b.at)-Date.parse(a.at) || (eventRank[b.kind]||0)-(eventRank[a.kind]||0))[0];
      const nextMark=marks.filter(m=>Date.parse(m.at)>=to).sort((a,b)=>
        Date.parse(a.at)-Date.parse(b.at))[0];
      const lastConflict=marks.filter(m=>['conflict_labeled','conflict_unlabeled'].includes(m.kind)&&
        Date.parse(m.at)<=from).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
      const lastFailure=lastMark?.kind==='ci_failed'?failures.find(j=>j.url===lastMark.url):null;
      if(lastConflict?.kind==='conflict_labeled'){
        substage='conflict_mark_to_next_event';
        reason='От метки конфликта до следующего зафиксированного события; длительность фактического ремонта не доказана';
      }else if(lastMark?.kind==='ci_failed'||lastFailure){
        substage='failed_ci_to_next_event';reason='После провала CI до следующего подтверждённого события; ожидание ремонта не равно активному ремонту';
      }else if(lastMark?.kind==='ci_green'){
        substage='green_ci_to_next_event';reason='После зелёного CI до следующего события; причина ожидания не доказана';
      }else if(lastMark?.kind==='source_published'||lastMark?.kind==='head_changed'){
        substage='source_published_to_next_event';reason='После публикации кода до следующего подтверждённого события; состояние не равно runner queue';
      }else if(lastMark?.kind==='repair_started'){
        substage='repair_started_without_verified_publish';reason='После Repair Started без подтверждённого времени завершения; факт непрерывной работы неизвестен';
      }else if(lastMark?.kind==='job_completed'){
        substage='between_ci_events';reason='Между окончанием CI job и следующим зафиксированным событием';
      }else if(lastMark?.kind==='created'){
        substage='created_to_first_observed_event';reason='От создания PR до первого наблюдаемого события; могли быть новые коммиты/HEAD';
      }else{
        substage='between_pr_events';reason='Промежуток между GitHub-событиями, причина не подтверждена';
      }
      // Evidence identifies the BOUNDARIES only, not the hidden cause.
      urls=unique([lastConflict?.kind==='conflict_labeled'?lastConflict.url:null,
        lastMark?.url,nextMark?.url,p.url]);
    }
    slices.push({stage:stageName,substage,from,to,reason,urls});
  }
  const spans=[];
  for (const s of slices) {
    const prev=spans.at(-1);
    if(prev && prev.stage===s.stage && prev.substage===s.substage &&
       prev.reason===s.reason && prev.to===s.from &&
       JSON.stringify(prev.urls)===JSON.stringify(s.urls)) {prev.to=s.to;continue;}
    spans.push({...s});
  }
  const timeline=spans.map(s=>({stage:s.stage,substage:s.substage,
    start_at:iso(s.from),end_at:iso(s.to),duration_ms:s.to-s.from,
    duration_minutes:minute(s.to-s.from),reason:s.reason,
    evidence_urls:s.urls,evidence_url:s.urls[0]||null}));
  const totals=Object.fromEntries(STAGES.map(key=>[key,0]));
  for(const s of timeline)totals[s.stage]+=s.duration_ms;
  const elapsed=p.end-p.created;
  if(Object.values(totals).reduce((a,b)=>a+b,0)!==elapsed)throw Error('TIMELINE_NOT_RECONCILED');
  const label=p.state==='merged'?'created_to_merge':p.state==='open'?'created_to_now':'created_to_close_without_merge';
  return {schema:'HH_PR_ATTRIBUTION_V1',repo:REPO,pr_number:p.number,pr_url:p.url,
    production_branch:PROD,state:p.state,label,created_at:iso(p.created),
    ended_at:iso(p.end),merged_at:p.merged===null?null:iso(p.merged),
    elapsed_ms:elapsed,elapsed_minutes:minute(elapsed),
    stage_totals_ms:totals,
    stage_totals_minutes:Object.fromEntries(STAGES.map(key=>[key,minute(totals[key])])),
    accounted_percent:elapsed?round(100*(elapsed-totals.unattributed)/elapsed):100,
    unattributed_minutes:minute(totals.unattributed),
    // Confirmed time boundaries are not causal explanations. In particular,
    // time before first Core CI and Green->Merge waiting still has an
    // unverified cause even if both endpoints are exactly timestamped.
    reason_unproven_ms:totals.unattributed+totals.created_to_first_ci+totals.waiting_merge,
    reason_unproven_minutes:minute(totals.unattributed+totals.created_to_first_ci+totals.waiting_merge),
    reason_provenance:'TIME_BOUNDED_NOT_ROOT_CAUSE_VERIFIED',
    // Backward compatible raw unknown count plus event-anchored observational
    // buckets. These buckets sum to raw unattributed time exactly and never
    // claim causal proof of idle time or runner scheduling.
    gap_context_ms:Object.fromEntries(
      [...new Set(timeline.filter(t=>t.stage==='unattributed').map(t=>t.substage||'unknown'))]
      .map(key=>[key,timeline.filter(t=>t.stage==='unattributed'&&(t.substage||'unknown')===key)
        .reduce((sum,t)=>sum+t.duration_ms,0)])),
    gap_context_coverage:'EVENT_BOUNDARIES_NOT_CAUSES',
    confirmed_runs:rs.length,confirmed_attempts:attempts.length,
    repeated_attempts:attempts.filter(a=>a!==firstAttempt).length,
    failures:failures.length,attempt_details:attemptsWithEvidence,
    intervals:timeline,
    chronology:marks.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.kind.localeCompare(b.kind)),
    limitations:[
      'Временные интервалы не могут быть разделены точнее, чем имеющиеся аутентифицированные события.',
      'Параллельные проверки объединяются по wall-clock, их runner-минуты нельзя складывать с длительностью PR.',
      'Время между failure и реальным repair_started остаётся нераспределённым.',
      'Повторный CI включает только подтверждённую очередь и выполнение; промежутки между попытками остаются нераспределёнными.',
      'CI-green → merge учитывается только для подтверждённого final HEAD.',
      'Создание → первый CI измеряется лишь при достаточно полном инвентаре workflow runs.'
    ]};
}

function compareCreatedMergedCohorts({prs,runs=[],jobs=[],events=[],periods,now=Date.now()}) {
  if(!Array.isArray(prs)||prs.length>250||!Array.isArray(periods)||!periods.length||periods.length>10)
    throw Error('INVALID_COHORT_INPUT');
  const results=[];
  for(const period of periods) {
    const from=parsed(period?.start),to=parsed(period?.end);
    if(from===null||to===null||from>=to||to>now)throw Error('INVALID_COHORT_PERIOD');
    const matching=prs.filter(pr=>pr?.merged===true &&
      (typeof pr.base==='string'?pr.base:pr.base?.ref)===PROD &&
      parsed(pr.created_at)!==null && parsed(pr.merged_at)!==null &&
      parsed(pr.created_at)>=from && parsed(pr.created_at)<to &&
      parsed(pr.merged_at)>=from && parsed(pr.merged_at)<to);
    const timelines=matching.map(pr=>analyzePrTimeline({pr,runs,jobs,events,now}));
    const avg=a=>a.length?minute(a.reduce((x,y)=>x+y,0)/a.length):null;
    results.push({label:period.label||null,start_at:iso(from),end_at:iso(to),
      cohort:'PR_CREATED_AND_MERGED_WITHIN_SAME_PERIOD',sample_prs:timelines.length,
      average_total_minutes:avg(timelines.map(t=>t.elapsed_ms)),
      averages_minutes:Object.fromEntries(STAGES.map(stage=>[stage,avg(timelines.map(t=>t.stage_totals_ms[stage]))])),
      coverage:{complete_with_zero_unattributed:timelines.filter(t=>t.stage_totals_ms.unattributed===0).length,
        pr_with_unknown:timelines.filter(t=>t.stage_totals_ms.unattributed>0).length},
      prs:timelines});
  }
  return {schema:'HH_PR_COHORT_AUDIT_V1',repo:REPO,periods:results};
}
module.exports={STAGES,analyzePrTimeline,compareCreatedMergedCohorts};
