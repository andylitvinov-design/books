'use strict';
/* HH_PR_MONITOR_TWO_SCREENS_V1
 * Presentation-only first screen, read-only historical second screen.
 * Mirrors existing DOM for live CI and active-cohort KPIs. It never polls GitHub,
 * schedules a job, starts CI, or treats unknown LIVE evidence as zero.
 */
(function () {
  if (typeof document === 'undefined' || window.__hhTwoScreensV1) return;
  window.__hhTwoScreensV1 = true;
  var ROOT_ID = 'hh-pr-two-screens';
  var STAGES = [
    ['prepare', 'Создание → готовность', 'Ready, Triage, получение задачи и исходный код до финального CI.'],
    ['runner', 'Очередь → runner', 'Очередь GitHub Actions до фактического старта исполнителя.'],
    ['ci', 'Core / Specialist CI', 'Работа проверок, ожидание и повторные волны; параллельные jobs не суммируются.'],
    ['gate', 'Проверки → Merge Gate', 'Ожидание и подтверждение последнего обязательного gate.'],
    ['merge', 'Gate → Merge', 'После успешного gate до merged_at.'],
    ['merge_to_live', 'Merge → LIVE', 'Только при наличии независимой production READY и LIVE-квитанции.']
  ];
  var stages = Object.create(null), cells = Object.create(null);
  var root, graphSlot, graphHint, comparison, prList, coverage, status, firstFoot, secondFoot;
  var sourceSnapshot = null, baseline = null, detailed = null, mounted = false;
  var scheduled = false, detailBusy = false, observer = null;
  var queueSnapshot = null, queueError = null, archive = null, archivePending = false;
  var auditRequests = 0, auditBusy = false, auditCache = new Map();
  var diagnostics = null, archiveNote = null;
  var number = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 1});
  function make(tag, className, value) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (value !== undefined) e.textContent = String(value);
    return e;
  }
  function valid(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0; }
  function time(v) { var t = Date.parse(v || ''); return Number.isFinite(t) ? t : null; }
  function duration(minutes) {
    if (!valid(minutes)) return '—';
    if (minutes < 1) return number.format(Math.round(minutes * 60)) + ' сек';
    if (minutes < 60) return number.format(minutes) + ' мин';
    return number.format(minutes / 60) + ' ч';
  }
  function aggregate(win) {
    if (!win || !Array.isArray(win.rows)) return null;
    var start = time(win.from), end = time(win.to);
    if (start === null || end === null) return null;
    var rows = win.rows.filter(function (p) {
      var created = time(p.created_at), merged = time(p.merged_at);
      return created !== null && merged !== null && created >= start && created < end &&
        merged >= start && merged <= end && merged >= created;
    }).map(function (p) {
      return {number: p.number, created_at: p.created_at, merged_at: p.merged_at,
        minutes: (time(p.merged_at) - time(p.created_at)) / 60000};
    });
    var values = rows.map(function (r) { return r.minutes; }).sort(function (a,b) { return a-b; });
    var quantile = function (q) {
      if (!values.length) return null;
      var pos = (values.length-1)*q, lo = Math.floor(pos), hi = Math.ceil(pos);
      return values[lo] + (values[hi] - values[lo]) * (pos - lo);
    };
    return {n: rows.length,
      mean: rows.length ? values.reduce(function (a,b) { return a+b; },0)/rows.length : null,
      median: quantile(0.5), p90: quantile(0.9),
      rows: rows.sort(function (a,b) { return b.minutes-a.minutes; }),
      from: win.from, to: win.to, complete: win.complete === true};
  }
  function originalQueue() {
    var grid = document.querySelector('#hh-ci-queue-detail .hh-queue-grid');
    if (!grid) return null;
    var items = Array.from(grid.querySelectorAll('.hh-queue-metric'));
    if (items.length < 5) return null;
    return items.map(function (item) { return item.querySelector('strong')?.textContent.trim() || '—'; });
  }
  function originalCohort() {
    var panel = document.getElementById('hh-pr-journey-health');
    if (!panel) return null;
    var result = Object.create(null);
    panel.querySelectorAll('.hh-journey-stat').forEach(function (item) {
      var key = item.querySelector('small')?.textContent.trim();
      var value = item.querySelector('strong')?.textContent.trim();
      if (key && value) result[key] = value;
    });
    return result;
  }
  var SUBSTEPS = {
    prepare: [
      ['ready','Создан → Ready'],['triage','Ready → Triage'],
      ['claimed','Triage → назначен исполнитель'],['repair','Исполнитель → начало Repair'],
      ['source','Repair → публикация исправления'],['first_ci','Публикация → первая CI']
    ],
    runner: [
      ['workflow_wait','Workflow поставлен → создание jobs'],
      ['runner_wait','Ожидание runner после создания jobs']
    ],
    ci: [
      ['checks','Выполнение Core CI jobs'],['specialist','Specialist CI jobs'],
      ['between_waves_unknown','Промежутки между волнами CI (не установлено)'],
      ['other_unknown','Другие пробелы событий CI'],['retry','Повторные CI: доказанные запуски']
    ],
    gate: [
      ['green_checks','Core и Specialist зелёные'],
      ['gate_queue','Ожидание Merge Gate'],['gate_run','Работа Merge Gate']
    ],
    merge: [
      ['approval','Gate зелёный → готовность к merge'],
      ['merge_wait','Ожидание auto-merge / слияния']
    ],
    merge_to_live: [
      ['deploy_queue','Merge → создание production deployment'],
      ['deploy_build','Deployment → READY'],['alias','READY → проверенный LIVE alias']
    ]
  };
  function validCount(v) { return Number.isSafeInteger(v) && v >= 0; }
  function queueValue(snapshot, key) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    var buckets=[snapshot.counts,snapshot.queue?.counts,snapshot.queue,snapshot.metrics,
      snapshot.summary,snapshot.data,snapshot];
    for (var bucket of buckets) {
      if (bucket && typeof bucket==='object' && validCount(bucket[key])) return bucket[key];
    }
    return null;
  }
  function queueNumbers(data) {
    var names=['prs_waiting_ci','workflows_queued','workflows_running','jobs_queued','jobs_running'];
    var values=names.map(function (n) {return queueValue(data,n);});
    return values.some(validCount)?values:null;
  }
  function showQueue() {
    var original = originalQueue();
    var direct = queueNumbers(queueSnapshot);
    function one(index) {
      var a=original?.[index];
      // The original widget's live callback remains authoritative when numeric.
      // The direct endpoint is only a fallback if that widget did not mount.
      if (/^\d+$/.test(a||'')) return a;
      if (validCount(direct?.[index])) return String(direct[index]);
      return '—';
    }
    var running=one(2), queued=one(1);
    cells.running.n.textContent=running;
    cells.queued.n.textContent=queued;
    cells.running.sub.textContent='Workflows · jobs выполняются: '+one(4);
    cells.queued.sub.textContent='Workflows · jobs ожидают: '+one(3);
    status.textContent='GitHub CI · PR ждут: '+one(0)+'. '+
      (queueError ? 'Источник очереди: '+queueError+'. Повторить через штатную кнопку «Обновить».' :
       'Только подтверждённые числа; неизвестное не равно 0.');
  }
  async function readQueue() {
    try {
      if (originalQueue()?.slice(1,3).every(function(v){return /^\d+$/.test(v);})) {
        queueError=null;showQueue();return;
      }
      // This is the EXISTING queue endpoint and an on-demand GET only.
      // No new schedules, no GitHub client token, no interval polling.
      var response=await fetch('/api/ci-queue-detail',{cache:'default',
        headers:{Accept:'application/json'}});
      if (!response.ok) throw Error('HTTP '+response.status);
      var data=await response.json();
      if (!queueNumbers(data)) throw Error('Формат счётчиков не подтверждён');
      queueSnapshot=data;queueError=null;
    }catch(e){queueError=String(e.message||e).slice(0,95);}
    showQueue();
  }
  function setSubstep(key, name, value, note) {
    var entry=stages[key]?.substeps?.[name];
    if (!entry) return;
    entry.value.textContent=valid(value)?duration(value):'—';
    entry.note.textContent=note || (valid(value)?'Подтверждённая выборка':'Нет подтверждённой пары временных меток');
  }
  function buildSubsteps(key, target) {
    target.replaceChildren();
    var list=make('div','hh2-stage-substeps');
    stages[key].substeps=Object.create(null);
    for (var pair of SUBSTEPS[key]||[]) {
      var row=make('div','hh2-substep');
      var label=make('span','',pair[1]);
      var value=make('strong','','—');
      var note=make('small','','Нет подтверждённой пары событий для той же когорты');
      row.append(label,value,note);list.append(row);
      stages[key].substeps[pair[0]]={value:value,note:note};
    }
    target.append(list);
    var sample=make('p','hh2-sample','Времена не выводятся из разности других этапов. Глубокие замеры и архив CI могут иметь иной охват PR.');
    target.append(sample);stages[key].sample=sample;
  }
  function reconcileStagesForSameCohort(total, data) {
    var keys=['prepare','runner','ci','gate','merge'],n=total?.n;
    if (!valid(n)||n===0||!valid(total?.mean)||
      data?.population?.merged!==n)return {ok:false,n:n??null,reason:'DENOMINATOR_MISMATCH'};
    var values=[];
    for (var k of keys) {
      var row=data.stages?.[k];
      if(!row||row.n!==n||!valid(row.mean))
        return {ok:false,n,reason:'UNVERIFIED_STAGE_'+k};
      values.push(row.mean);
    }
    var sum=values.reduce(function(a,b){return a+b;},0);
    if(Math.abs(sum-total.mean)>0.1)
      return {ok:false,n,sum,reason:'NON_RECONCILED_STAGE_TOTAL'};
    return {ok:true,n,sum,reason:'EXACT_SAME_COHORT'};
  }
  function archiveMatchedRows() {
    if(!baseline?.rows||!Array.isArray(archive?.rows))return [];
    var numbers=new Set(baseline.rows.map(function(p){return p.number;}));
    return archive.rows.filter(function(r){return numbers.has(r.pr) &&
      valid(r.elapsed_minutes) && r.stages_ms && typeof r.stages_ms==='object';});
  }
  function applyArchive() {
    var rows=archiveMatchedRows();
    if(!rows.length) {
      archiveNote.textContent='В сохранённом CI-архиве нет PR из выбранной 24-часовой когорты. '+
        'Времена подэтапов не выводятся из других PR и остаются «—».';
      return;
    }
    var keys=['workflow_wait','runner_wait','checks','between_waves_unknown','other_unknown'];
    var sum=Object.create(null),tot=0;
    for(var k of keys)sum[k]=0;
    for(var r of rows) {
      tot+=r.elapsed_minutes*60000;
      for(var key of keys)sum[key]+=valid(r.stages_ms?.[key])?r.stages_ms[key]:0;
    }
    var actual=keys.reduce(function(n,k){return n+sum[k];},0);
    if(Math.abs(actual-tot)>1000*rows.length) {
      archiveNote.textContent='Архив CI: суммы интервалов не сходятся. Длительности скрыты.';
      return;
    }
    for(var k of ['workflow_wait','runner_wait']) {
      var note='Пересечение с выбранной когортой: '+rows.length+' PR / '+
        baseline.n+' · среднее по CI-архиву, не всему потоку; история может быть частичной';
      setSubstep('runner',k,sum[k]>0?sum[k]/rows.length/60000:null,note);
    }
    for(var k of ['checks','between_waves_unknown','other_unknown']) {
      setSubstep('ci',k,sum[k]>0?sum[k]/rows.length/60000:null,
        'То же пересечение '+rows.length+' PR / '+baseline.n+' · архив Core CI, не время всего PR');
    }
    // The CI archive partitions only first queued → last completed CI.
    // Never add these subset means to the whole Created→Merged population mean.
    var elapsed=tot/rows.length/60000,parts=actual/rows.length/60000;
    archiveNote.textContent='CI-архив: '+rows.length+'/'+baseline.n+' тех же PR с сохранёнными job-метками. '+
      'Путь первого → последнего Core CI: '+duration(elapsed)+
      '; сумма неперекрывающихся подэтапов: '+duration(parts)+
      '. Это отдельная неполная выборка, НЕ часть общей средней всей когорты.';
    for(var key of ['runner','ci']) {
      stages[key].sample.textContent='Подэтапы по пересечению '+rows.length+' PR, архив неполный. '+
        'Промежутки без событий показаны отдельно, не записываются в Repair или ожидание runner.';
    }
  }
  async function readArchive() {
    if(archivePending||archive)return;
    archivePending=true;
    try {
      var response=await fetch('/api/ci-journey-summary?hours=24',{cache:'default',
        headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('HTTP '+response.status);
      var data=await response.json();
      if(data.schema!=='HH_CI_FIRST_LAST_ARCHIVE_V1'||!Array.isArray(data.rows))
        throw Error('Архив CI не соответствует ожидаемому формату');
      archive=data;applyArchive();
    }catch(e){
      archiveNote.textContent='Архив CI: '+String(e.message||e).slice(0,110)+
        '. Нет данных ≠ 0.';
    }finally{archivePending=false;}
  }
  function rowStat(name, value, note) {
    var article = make('article', 'hh2-stat');
    article.append(make('span', '', name), make('strong', '', value), make('small', '', note));
    return article;
  }
  function build() {
    root = make('div','hh2-root'); root.id = ROOT_ID;
    var one = make('section','hh2-screen hh2-first'); one.id = 'hh2-overview';
    one.setAttribute('aria-label','Экран 1 — очередь CI, график и время до LIVE');
    var top = make('header','hh2-header');
    var title = make('div',''); title.append(make('h1','','PR Monitor'),make('small','','Экран 1 / 2 · оперативная картина'));
    var link = make('a','hh2-link','Этапы ↓'); link.href='#hh2-stages';
    top.append(title,link); one.append(top);
    var kpi = make('div','hh2-ci-kpis');
    function ciCard(key, label, helper) {
      var box = make('article','hh2-ci-card');
      box.append(make('span','',label));
      var n = make('strong','','—'); n.setAttribute('aria-live','polite');
      var sub = make('small','',helper);
      box.append(n,sub); kpi.append(box);
      cells[key] = {n:n,sub:sub};
    }
    ciCard('running','CI в работе','Workflows · данные GitHub');
    ciCard('queued','CI в ожидании','Workflows · очередь GitHub');
    one.append(kpi);
    status = make('p','hh2-meta','Источники GitHub загружаются…'); one.append(status);
    var chart = make('div','hh2-chart');
    var chartHeader = make('div','hh2-line');
    chartHeader.append(make('h2','','Новые PR · Merged · CI'),make('small','','Тот же график и его фильтры'));
    chart.append(chartHeader);
    graphSlot = make('div','hh2-chart-slot'); graphHint = make('p','hh2-placeholder','Подключаю существующий график…');
    graphSlot.append(graphHint); chart.append(graphSlot); one.append(chart);
    var times = make('section','hh2-totals');
    times.append(make('h2','','Длительность прохождения PR'));
    var metrics = make('div','hh2-time-grid');
    cells.avg = rowStat('PR → Merge · среднее','—','Подтверждённая когорта');
    cells.median = rowStat('PR → Merge · медиана','—','Сопоставимый период');
    cells.live = rowStat('PR → LIVE','—','Нет полного LIVE-подтверждения');
    metrics.append(cells.avg,cells.median,cells.live); times.append(metrics);
    firstFoot = make('p','hh2-meta','PR → Merge и PR → LIVE не смешиваются. Пропуск ≠ 0.');
    times.append(firstFoot); one.append(times);
    var two = make('section','hh2-screen hh2-second'); two.id = 'hh2-stages';
    two.setAttribute('aria-label','Экран 2 — этапы и сравнение с двумя неделями назад');
    var head2 = make('header','hh2-header');
    var title2 = make('div','');title2.append(make('h2','','Путь PR → LIVE'),make('small','','Экран 2 / 2 · сравнение этапов'));
    var back = make('a','hh2-link','↑ Обзор');back.href='#hh2-overview';
    head2.append(title2,back);two.append(head2);
    comparison = make('div','hh2-compare');
    var compareTitle = make('div','hh2-stage-head');
    compareTitle.append(make('strong','','Этап'),make('strong','','Сейчас'),make('strong','','2 недели назад'));
    comparison.append(compareTitle);
    STAGES.forEach(function (spec) {
      var detail = make('details','hh2-stage-item');
      var summary = make('summary','hh2-stage-row');
      var name = make('span','',spec[1]), current = make('strong','','—'), history = make('strong','','—');
      summary.append(name,current,history);
      var explanation = make('div','hh2-detail');
      detail.append(summary,explanation);
      comparison.append(detail);
      stages[spec[0]] = {current:current,history:history,explanation:explanation};
      buildSubsteps(spec[0],explanation);
      if (spec[0]==='runner'||spec[0]==='ci') detail.addEventListener('toggle',function(){
        if (detail.open) void readArchive();
      });
    });
    var all = make('details','hh2-stage-item hh2-total');
    var sum = make('summary','hh2-stage-row');
    sum.append(make('span','','Итого: Created → Merged'),
      make('strong','','—'),make('strong','','—'));
    all.append(sum,make('div','hh2-detail','Только PR, созданные и смерженные внутри одинаковых 24-часовых окон Toronto. До LIVE это не полный путь.'));
    comparison.append(all);stages.total={current:sum.children[1],history:sum.children[2]};
    two.append(comparison);
    diagnostics=make('p','hh2-diagnostic','Проверяю охват подэтапов и сопоставимость периодов…');
    two.append(diagnostics);
    archiveNote=make('p','hh2-meta','Подэтапы Core CI загружаются только при раскрытии соответствующего этапа.');
    two.append(archiveNote);
    coverage = make('p','hh2-meta','Сравнение по подтверждённым снимкам; этапы без исторических receipts остаются неизвестными.');
    two.append(coverage);
    var actions = make('div','hh2-actions');
    var verify = make('button','hh2-button','Проверить подробные этапы');
    verify.type='button';
    verify.addEventListener('click',function () { void readDetailed(verify); });
    actions.append(verify); two.append(actions);
    var prs = make('details','hh2-prs');
    var prTitle = make('summary','','Каждый PR · общее время и хронология');
    prList = make('div','hh2-pr-list'); prList.append(make('p','hh2-placeholder','Читаю сохранённые PR-когорты…'));
    prs.append(prTitle,prList); two.append(prs);
    var more=make('a','hh2-link','Все остальные разделы ↓');
    more.href='#quick-signal';two.append(more);
    secondFoot = make('p','hh2-meta','Детали раскрываются нажатием на этап или отдельный PR.');
    two.append(secondFoot);
    root.append(one,two);
    document.body.prepend(root);
    document.body.classList.add('hh2-active');
    mounted=true;
  }
  function chartAndMetrics() {
    if (!mounted) return;
    var graph = document.getElementById('hh-pr-trends');
    if (graph && !graphSlot.contains(graph)) {
      graphSlot.replaceChildren(graph);
      graph.classList.add('hh2-original-chart');
    }
    if (!graph && !graphSlot.firstElementChild) graphSlot.append(graphHint);
    showQueue();
    // Both screens read exactly the same created-and-merged PR cohort.
    if (baseline) {
      cells.avg.querySelector('strong').textContent=duration(baseline.mean);
      cells.median.querySelector('strong').textContent=duration(baseline.median);
      firstFoot.textContent='Одна когорта Created→Merged: '+baseline.n+' PR · срез '+
        (baseline.to||'—')+' · '+(baseline.source==='live'?'текущий API':'архив; может устареть')+
        '. LIVE пока подтверждается отдельно.';
    }
  }
  function updateComparison() {
    if (!mounted) return;
    if (baseline) stages.total.current.textContent=duration(baseline.mean);
    var historical=aggregate(sourceSnapshot?.windows?.find(function(w){return w.id==='two_weeks_ago';}));
    if (historical) stages.total.history.textContent=duration(historical.mean);
    var result=reconcileStagesForSameCohort(baseline,detailed);
    var n=baseline?.n||0;
    var measuredSum=result.sum??null;
    var reconciled=result.ok;
    for (var i=0;i<STAGES.length;i++) {
      var key=STAGES[i][0], stage=stages[key];
      var stat=detailed?.stages?.[key]||
        (key==='merge_to_live'?detailed?.stages?.live_verified:null);
      stage.current.textContent=reconciled&&key!=='merge_to_live'?duration(stat.mean):'—';
      stage.history.textContent='—';
      stage.current.title=reconciled?'Из единой когортной декомпозиции':
        'Нет подтверждённого распределения для той же когорты';
      stage.history.title='Не найден аналогичный по охвату исторический архив этапов';
      if (stat?.n>0&&valid(stat.mean)) {
        stage.sample.textContent='Отдельный замер: '+duration(stat.mean)+' · n='+stat.n+
          '. Этот средний интервал получен по неполной выборке, его нельзя суммировать '+
          'с общей средней '+duration(baseline?.mean)+'. Подэтапы без меток остаются «—».';
      }
    }
    var oldN=historical?.n??'—';
    coverage.textContent='Созданы и смержены за 24 часа: сейчас '+
      (baseline?.n??'—')+' PR; в историческом архиве '+oldN+
      ' PR. Историческое окно рассчитано отдельно по Toronto. «—» = измерений нет.';
    var selected=detailed?.coverage?.selected;
    if (selected!==undefined)
      coverage.textContent+=' Глубокие этапы: проверено '+selected+
        ' PR; это не весь поток и не одинаковый знаменатель.';
    diagnostics.textContent=reconciled?
      'Контроль: сумма пяти этапов '+duration(measuredSum)+
        ' совпадает с Created→Merged '+duration(baseline.mean)+' (n='+n+').':
      'Основная задержка по всему потоку пока НЕ ДОКАЗАНА. Created→Merged = '+
      duration(baseline?.mean)+' по '+(baseline?.n??'—')+
      ' PR; текущий разбор этапов охватывает '+(selected??'—')+
      ' PR. Средние 2,3 ч и 1,4 ч из разных выборок, их нельзя складывать. '+
      'Для подтверждённого распределения откройте подэтапы отдельного PR ниже.';
    if (archive) applyArchive();
    // Historical LIVE receipts cannot be used to claim the whole cohort is
    // live. Only a matched full-population audit would establish that metric.
    cells.live.querySelector('strong').textContent='—';
    cells.live.querySelector('small').textContent='Нет полного набора LIVE-квитанций';

  }
  var AUDIT_STAGES=[
    ['created_to_first_ci','Создание → первый наблюдаемый Core CI'],
    ['runner_wait','Ожидание runner'],
    ['checks','Выполнение подтверждённых checks'],
    ['repair_after_failure','Repair после сбоя'],
    ['conflict_resolution','Исправление merge-конфликта'],
    ['repeat_ci','Повторные CI'],
    ['waiting_merge','Ожидание merge после зелёного gate'],
    ['unattributed','Не распределено по подтверждённым событиям']
  ];
  function showAudit(data, mount) {
    mount.replaceChildren();
    if(data.schema!=='HH_PR_ATTRIBUTION_V1'||!Array.isArray(data.intervals)||
      !valid(data.elapsed_minutes))throw Error('Неполная хронология PR');
    var sum=AUDIT_STAGES.reduce(function(n,p){
      return n+(valid(data.stage_totals_minutes?.[p[0]])?data.stage_totals_minutes[p[0]]:0);
    },0);
    if(Math.abs(sum-data.elapsed_minutes)>0.1)throw Error('Времена этапов не складываются в общую длительность');
    var total=make('p','hh2-sample','PR #'+data.pr_number+' · всего '+duration(data.elapsed_minutes)+
      ' · подтверждено '+(data.accounted_percent??'—')+'% · не распределено '+
      duration(data.unattributed_minutes)+'. Этапы здесь по ОДНОМУ PR, без смешения выборок.');
    mount.append(total);
    for(var pair of AUDIT_STAGES) {
      var key=pair[0],minutes=data.stage_totals_minutes?.[key],rows=data.intervals.filter(function(x){
        return x.stage===key && valid(x.duration_minutes);
      });
      var block=make('details','hh2-stage-item');
      if(key==='unattributed')block.open=true;
      var headline=make('summary','hh2-stage-row');
      headline.append(make('span','',pair[1]),make('strong','',''),
        make('strong','',valid(minutes)?duration(minutes):'—'));
      block.append(headline);
      var body=make('div','hh2-detail');
      if(!rows.length)body.append(make('p','hh2-inline-warning','Отдельный подтверждённый интервал отсутствует. Не означает нулевое время.'));
      for(var part of rows) {
        var line=make('div','hh2-substep');
        var label=(part.substage&&part.substage!=='missing_evidence'?part.substage:pair[1]);
        line.append(make('span','',label),make('strong','',duration(part.duration_minutes)));
        line.append(make('small','',String(part.start_at||'')+' → '+String(part.end_at||'')+
          ' · '+String(part.reason||'Причина не подтверждена')));
        var url=(part.evidence_urls||[]).find(function(u){
          return /^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull|actions|issues|commit)\//.test(u);
        });
        if(url){var a=make('a','hh2-substep-link','Источник события');a.href=url;
          a.target='_blank';a.rel='noopener noreferrer';line.append(a);}
        body.append(line);
      }
      block.append(body);mount.append(block);
    }
    if (data.journey?.created_to_live_minutes!==null &&
        valid(data.journey?.created_to_live_minutes)) {
      mount.append(make('p','hh2-sample','Проверено Created → LIVE: '+
        duration(data.journey.created_to_live_minutes)+' · Merge → LIVE '+
        duration(data.journey.merge_to_live_minutes)));
    } else {
      mount.append(make('p','hh2-inline-warning',
        'LIVE-квитанции для этого PR нет среди проверенных источников. Merge ≠ LIVE.'));
    }
    var long=data.intervals.filter(function(i){return valid(i.duration_minutes);})
      .sort(function(a,b){return b.duration_minutes-a.duration_minutes;})[0];
    if(long)mount.prepend(make('p','hh2-diagnostic','Самый длинный доказанный / нераспределённый интервал: '+
      duration(long.duration_minutes)+' · '+String(long.reason||'причина неизвестна')));
  }
  async function auditPR(n, mount, button) {
    if(auditBusy)return;
    if(auditCache.has(n)){
      try{showAudit(auditCache.get(n),mount);}catch(e){mount.textContent=String(e.message||e);}return;
    }
    if(auditRequests>=3) {
      mount.textContent='Лимит ручных аудитов этой страницы (3 PR), чтобы не расходовать запросы GitHub. Откройте сам PR или обновите страницу для нового сеанса.';
      return;
    }
    auditRequests++;auditBusy=true;button.disabled=true;
    mount.textContent='Читаю подтверждённые события PR #'+n+'…';
    try {
      // On click ONLY; existing audited endpoint has a bounded GitHub GET budget,
      // server-side 15m cache and rate reserve guard.
      var response=await fetch('/api/pr-attribution?pr='+encodeURIComponent(n),{
        cache:'default',headers:{Accept:'application/json'}});
      var data=await response.json();
      if(!response.ok||!Array.isArray(data.intervals))throw Error(data.error||'HTTP '+response.status);
      auditCache.set(n,data);showAudit(data,mount);
    }catch(e){
      mount.textContent='Не удалось подтвердить подэтапы PR #'+n+': '+
        String(e.message||e).slice(0,140)+'. Отсутствие измерений не равно 0.';
    }finally{
      auditBusy=false;button.disabled=false;
      button.textContent='Переоткрыть подэтапы PR';
    }
  }
  function fillPRs() {
    if (!baseline || !prList) return;
    prList.replaceChildren();
    if (!baseline.rows.length) {prList.append(make('p','hh2-placeholder','Нет подтверждённых PR в этой когорте.'));return;}
    var hint=make('p','hh2-meta','Полный список '+baseline.n+' PR за окно; каждый: Created → Merged. LIVE — только с независимой квитанцией.');
    prList.append(hint);
    baseline.rows.forEach(function (p) {
      if (!Number.isSafeInteger(p.number)||p.number<1) return;
      var entry=make('details','hh2-pr-item');
      var head=make('summary');
      head.append(make('strong','','#'+p.number),make('span','','Создан → merge'),make('b','',duration(p.minutes)));
      entry.append(head);
      var detail=make('div','hh2-detail');
      detail.append(make('p','','Created: '+p.created_at),
        make('p','','Merged: '+p.merged_at),
        make('p','','PR → LIVE: — (нет независимой LIVE-квитанции в этой выборке)'));
      var a=make('a','','Открыть PR в GitHub');
      a.href='https://github.com/andylitvinov-design/books/pull/'+p.number;
      a.target='_blank';a.rel='noopener noreferrer';
      detail.append(a);
      var action=make('button','hh2-audit-button','Показать подэтапы PR по GitHub');
      action.type='button';
      var timeline=make('div','hh2-pr-audit');
      action.addEventListener('click',function(){void auditPR(p.number,timeline,action);});
      detail.append(action,timeline);entry.append(detail);prList.append(entry);
    });
  }
  async function readHistorical() {
    try {
      var response=await fetch('/pr-three-cohorts-snapshot.json',{cache:'default',headers:{Accept:'application/json'}});
      if (!response.ok) throw Error('HTTP '+response.status);
      var data=await response.json();
      if (data.schema!=='HH_PR_THREE_CREATED_COHORTS_V1' || !Array.isArray(data.windows)) throw Error('INVALID_SNAPSHOT');
      sourceSnapshot=data;
      if (!baseline) {
        baseline=aggregate(data.windows.find(function (w) {return w.id==='last_day';}));
        if(baseline)baseline.source='archive';
      }
      chartAndMetrics();updateComparison();fillPRs();
    } catch(e) {
      coverage.textContent='Сравнительный срез недоступен: '+String(e.message||e)+'. Нули не подставлены.';
      prList.replaceChildren(make('p','hh2-placeholder','Нет проверенной исторической когорты.'));
    }
  }
  async function readCurrentCohort() {
    try {
      var response=await fetch('/api/pr-created-cohort',{cache:'default',
        headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('HTTP '+response.status);
      var data=await response.json();
      if(data.schema!=='HH_PR_CREATED_COHORT_V1'||!Array.isArray(data.rows)||
        !Number.isFinite(Date.parse(data.generated_at||'')))throw Error('INVALID_COHORT');
      var end=Date.parse(data.generated_at),begin=end-24*3600000;
      var rows=data.rows.filter(function(p){return p.base==='codex/public-book-library';});
      var result=aggregate({from:new Date(begin).toISOString(),
        to:new Date(end).toISOString(),rows:rows,complete:data.coverage?.complete===true});
      if(!result)throw Error('INCOMPLETE_COHORT');
      result.source='live';baseline=result;
      chartAndMetrics();updateComparison();fillPRs();
    }catch(e){
      firstFoot.textContent='Текущая когорта недоступна: '+String(e.message||e)+
        '. Архивный период обозначен отдельно, пропуски не считаются нулём.';
    }
  }
  async function readDetailed(button) {
    if (detailBusy) return;
    detailBusy=true;button.disabled=true;button.textContent='Проверяю существующий API…';
    try {
      // Deliberately opt-in. This existing endpoint has its own server-side
      // 25-minute cache and may consume GitHub rate reserve on a cache miss.
      var response=await fetch('/api/pr-stage-overview?hours=24&scope=production',{cache:'default',
        headers:{Accept:'application/json'}});
      if (!response.ok) throw Error('HTTP '+response.status);
      var data=await response.json();
      if (data.schema!=='HH_PR_STAGE_OVERVIEW_V1'||data.selection?.hours!==24||
        data.selection?.scope!=='production') throw Error('Несовпадающая когорта');
      detailed=data;updateComparison();
      secondFoot.textContent='Этапы считаны по проверенным событиям текущей выборки. «—» означает отсутствие измерения, не 0.';
    } catch(e) {
      secondFoot.textContent='Глубокие этапы недоступны: '+String(e.message||e)+'. Сохранённая когорта не заменена нулями.';
    } finally {
      detailBusy=false;button.disabled=false;button.textContent='Повторно проверить этапы';
    }
  }
  function schedule() {
    if (scheduled || !mounted) return;
    scheduled=true;
    Promise.resolve().then(function () { scheduled=false; chartAndMetrics(); });
  }
  function start() {
    if (mounted || !document.body) return;
    build();chartAndMetrics();void readHistorical();void readCurrentCohort();
    void readQueue();
    document.getElementById('refresh')?.addEventListener('click',()=>void readQueue());
    observer=new MutationObserver(function (changes) {
      if (changes.some(function (m) { return !root.contains(m.target); })) schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:false});
    // One lazy check when the user enters screen 2. No timer, refresh loop
    // or additional scheduled GitHub workload. Manual retry remains available.
    if ('IntersectionObserver' in window) {
      var second=document.getElementById('hh2-stages');
      var io=new IntersectionObserver(function (entries) {
        if (entries.some(function (e) {return e.isIntersecting; })) {
          io.disconnect();
          var button=second.querySelector('.hh2-button');
          if(button)void readDetailed(button);
        }
      },{threshold:0.18});
      if(second)io.observe(second);
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
