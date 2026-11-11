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
  // Explicit opt-in on the standalone PR page: restore the detailed stages
  // as a slide after the existing central metrics, not a second top overview.
  var STAGE_ONLY = Boolean(document.currentScript?.hasAttribute?.("data-pr-stage-only"));
  var STAGES = [
    ['before_unknown','До первой сохранённой CI · неатрибутировано','Включает Draft, подготовку PR и пропущенные Core runs; это НЕ измерение задержки GitHub до первой CI'],
    ['workflow_wait','Workflow → jobs','Время создания jobs в сохранённых Core runs'],
    ['runner_wait','Очередь runner','От jobs queued до started_at'],
    ['checks','Работа Core CI','Подтверждённое wall-clock jobs без двойного счёта'],
    ['ci_gaps','Между волнами CI','Промежутки между Core runs, не приписываем Repair без доказательств'],
    ['after_unknown','Последняя CI → Merge','После последнего сохранённого job; Gate/ожидание не разделены'],
    ['no_archive_unknown','Нет CI-истории PR','Общее время PR без подходящих достоверных CI-записей'],
    ['merge_to_live','Merge → LIVE','Только независимо проверенная production-квитанция']
  ];
  var stages = Object.create(null), cells = Object.create(null);
  var root, graphSlot, graphHint, comparison, prList, coverage, status, firstFoot, secondFoot;
  var sourceSnapshot = null, baseline = null, detailed = null, mounted = false;
  var scheduled = false, detailBusy = false, observer = null;
  var queueSnapshot = null, queueFallback = null, queueError = null, archive = null, archivePending = false;
  var auditRequests = 0, auditBusy = false, auditCache = new Map();
  var diagnostics = null, archiveNote = null;
  var journeyComparison = null, journeyComparisonPending = false, waveCompareMount = null;
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
      median: quantile(0.5), p50: quantile(0.5), p90: quantile(0.9), p95: quantile(0.95),
      rows: rows.sort(function (a,b) { return b.minutes-a.minutes; }),
      from: win.from, to: win.to, complete: win.complete === true};
  }
  function displayMetric(value,unit) {
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)return '—';
    return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value)+(unit?' '+unit:'');
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
    before_unknown:[
      ['before_unknown','Создан → первая сохранённая Core CI (включая время Draft)'],
      ['ready','Отдельное время Ready'],['triage','Отдельное время Triage'],
      ['repair','Отдельное время Repair']
    ],
    workflow_wait:[['workflow_wait','Queued workflow → созданы jobs'],['workflow_missing','Неподтверждённые запуски']],
    runner_wait:[['runner_wait','Jobs queued → runner started'],['runner_missing','Jobs без меток времени']],
    checks:[['checks','Выполнение Core jobs'],['specialist','Specialist / другие проверки']],
    ci_gaps:[['ci_wave_unknown','Между сохранёнными CI waves'],['ci_other_unknown','Другие пробелы CI']],
    after_unknown:[['after_unknown','Последний сохранённый CI → merged_at'],
       ['gate','Ожидание Merge Gate'],['merge_wait','После зелёного Gate']],
    no_archive_unknown:[['no_archive_unknown','PR без полного CI архива'],['provenance','Доля PR с подтверждёнными CI']],
    merge_to_live:[['deployment','Production deploy READY'],['alias','Верификация LIVE']]
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
      // Only backup workflow counts; PR and job counts stay explicitly unknown.
      if (index===2&&validCount(queueFallback?.running))return '≥'+String(queueFallback.running);
      if (index===1&&validCount(queueFallback?.queued))
        return '≥'+String(queueFallback.queued);
      return '—';
    }
    var verified=window.__hhCiVerifiedSnapshot;
    var age=Date.now()-Date.parse(verified?.observed_at||'');
    if(verified?.schema==='HH_CI_VERIFIED_LOAD_V2' && verified.coverage && verified.ci &&
       Number.isFinite(age) && age>=0 && age<=120000){
      var complete=verified.coverage.complete===true;
      var val=function(n){return validCount(n)?(complete?'':'≥')+n:'—';};
      var unmeasured=verified.coverage.checked_ci_runs===0 &&
        verified.coverage.known_ci_runs>0&&!complete;
      cells.running.n.textContent=unmeasured?'—':val(verified.ci.running_jobs);
      cells.queued.n.textContent=unmeasured?'—':val(verified.ci.queued_jobs);
      cells.running.sub.textContent='Подтверждённые CI jobs · активных workflow: '+val(verified.ci.active_workflows);
      cells.queued.sub.textContent='Ожидающие CI jobs · Stale CI: '+val(verified.ci.stale_workflows);
      status.textContent='GitHub CI jobs, не workflow · проверено '+verified.coverage.checked_runs+
        '/'+verified.coverage.listed_runs+' · '+(complete?'полный охват':'нижняя граница ≥')+
        ' · Пропуски GitHub cron и другие работы ниже.';
      return;
    }
    // No verified job-level census. Legacy workflow statuses are not live load.
    var running=one(2), queued=one(1);
    cells.running.n.textContent='—';
    cells.queued.n.textContent='—';
    cells.running.sub.textContent='Реальные jobs неизвестны · workflow status '+running;
    cells.queued.sub.textContent='Реальные jobs неизвестны · workflow status '+queued;
    var sourceNote=queueFallback?
      'Основной API: '+(queueError||'нет полных данных')+
      '. Резерв: отфильтрованные CI workflows · '+(queueFallback.from_cache?'сохранённый':'новый')+
      ' срез '+(queueFallback.age_minutes??0)+' мин назад · ≥ только найденные CI'+
      (queueFallback.queue_complete?'':' · очередь частично проверена')+
      '. Watchdog/AutoMerge исключены; PR/jobs неизвестны.':null;
    status.textContent='GitHub CI · PR ждут: '+one(0)+'. '+
      (sourceNote||(queueError?
       'Источник очереди: '+queueError+'. Повторить через штатную кнопку «Обновить».':
       'Только подтверждённые числа; неизвестное не равно 0.'));
  }
  if(typeof window.addEventListener==='function')window.addEventListener('hh:ci-verified-updated',showQueue);
  async function readQueue() {
    try {
      if (originalQueue()?.slice(1,3).every(function(v){return /^\d+$/.test(v);})) {
        queueFallback=null;queueError=null;showQueue();return;
      }
      // This is the EXISTING queue endpoint and an on-demand GET only.
      // No new schedules, no GitHub client token, no interval polling.
      var response=await fetch('/api/ci-queue-detail',{cache:'default',
        headers:{Accept:'application/json'}});
      if (!response.ok) throw Error('HTTP '+response.status);
      var data=await response.json();
      var complete=queueNumbers(data);
      if(!complete||!validCount(complete[1])||!validCount(complete[2]))
        throw Error('Отсутствуют подтверждённые CI-счётчики');
      queueSnapshot=data;queueFallback=null;queueError=null;
    }catch(e){
      queueError=String(e.message||e).slice(0,95);
      // Only on failure, maximum 5 public GETs. Never start/restart any CI.
      try{queueFallback=await window.HHCIQueueBackup?.read?.()||null;}
      catch(_){queueFallback=null;}
    }
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
    if(key==='ci_gaps'){
      waveCompareMount=make('section','hh2-wave-comparison');
      waveCompareMount.append(make('h3','','Сколько волн CI запускалось и где терялось время'));
      waveCompareMount.append(make('p','hh2-meta','Загружаю одинаковые 24-часовые окна: сейчас, неделю назад и две недели назад…'));
      target.append(waveCompareMount);
    }
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
  function groupedValue(model,key) {
    if(!model)return null;
    if(key==='ci_gaps') {
      const n=model.coverage.ci_window_prs;
      if(!n)return null;
      return {mean:(model.stage_mean_minutes.ci_wave_unknown||0)+
          (model.stage_mean_minutes.ci_other_unknown||0),n};
    }
    if(key==='merge_to_live')return null;
    const value=model.stage_mean_minutes[key],n=model.observed_count[key];
    return n>0&&valid(value)?{mean:value,n,p50:model.stage_kpis?.[key]?.p50_min??null,
      p95:model.stage_kpis?.[key]?.p95_min??null}:null;
  }
  function applyArchive() {
    if(!baseline)return;
    const core=window.HHPrCohortWallClock;
    if(!archive||!core){
      archiveNote.textContent='Читаю сохранённые Core CI job-метки (без запуска новых CI)…';
      return;
    }
    const model=core.calculate(baseline,archive);
    if(!model||!model.reconciled||!model.total_mean_matches_original){
      diagnostics.textContent='Ошибка арифметической сверки Created→Merged. Нельзя показывать неподтверждённые этапы.';
      return;
    }
    const N=model.N,covered=model.coverage.ci_window_prs;
    for(const row of STAGES) {
      const key=row[0],st=stages[key],item=groupedValue(model,key);
      if(!st)continue;
      st.current.textContent=key==='merge_to_live'?'—':item?
        ((key==='workflow_wait'||key==='runner_wait'||key==='checks')?'≥ ':'')+
        duration(item.mean):'—';
      st.current.title=item?'Средний вклад на ВСЕ '+N+' PR (известен по '+item.n+
        ' PR); отсутствие архива не приравнивается нулю.':'Подтверждённых меток нет';
      if(st.name){
        const label=STAGES.find(function(p){return p[0]===key;})?.[1]||key;
        st.name.replaceChildren(document.createTextNode(label),
          make('small','hh2-stage-coverage',item?'n='+item.n+'/'+N:'n=0/'+N));
        st.name.title=item?'Наблюдаемые Core events: '+item.n+' из '+N:'Нет проверенных меток времени';
      }
      st.week.textContent='—';st.week.title='Нет сопоставимых подтверждённых CI events за неделю назад';
      st.history.textContent='—';
      st.history.title='Нет сопоставимых подтверждённых CI events за 2 недели назад';
      if(key==='merge_to_live')continue;
      st.sample.textContent=
        'Средний вклад в общую когорту: '+(item?duration(item.mean):'—')+
        ' / PR; подтверждено по '+(item?.n??0)+' из '+N+
        ' PR. P50 по измеренным: '+duration(item?.p50)+
        ' · P95 по измеренным: '+duration(item?.p95)+
        '. Это не средняя длительность только проверенных PR. '+
        ((key.endsWith('_unknown')||key==='ci_gaps')?
          'Причина задержки внутри границ пока не установлена.':
          'Это наблюдаемая нижняя граница; старая CI могла отсутствовать в архиве.');
    }
    for(const key of Object.keys(SUBSTEPS)) {
      if(key==='merge_to_live')continue;
      for(const pair of SUBSTEPS[key]){
        const name=pair[0],val=model.stage_mean_minutes[name];
        const n=model.observed_count[name]??0,kpi=model.stage_kpis?.[name];
        if(n>0&&valid(val))setSubstep(key,name,val,
          'Среднее на '+N+' PR · покрытие '+n+'/'+N+
          ' · P50 '+duration(kpi?.p50_min)+' · P95 '+duration(kpi?.p95_min)+
          (name.endsWith('unknown')?' · причины не установлены':' · подтверждённые метки'));
        else setSubstep(key,name,null,'В этот период нет проверенного временного интервала');
      }
    }
    // Current stage and substep contributions are from exactly ONE denominator.
    applyJourneyComparison();
    let total=Object.values(model.stage_totals_ms).reduce((a,b)=>a+b,0)/60000/N;
    let m=model.overall_mean_minutes;
    diagnostics.textContent='Арифметика: сумма всех этапов '+duration(total)+
      ' = Created→Merged '+duration(m)+' по '+N+' PR. '+
      'Подтверждённые Core CI пути: '+covered+'/'+N+'. '+
      'Наибольшая НЕИЗВЕСТНАЯ часть: '+duration(
        Math.max(model.stage_mean_minutes.no_archive_unknown||0,
        model.stage_mean_minutes.before_unknown||0,
        model.stage_mean_minutes.after_unknown||0))+
      ' на PR; это недостаток меток, не доказательство ожидания конкретного исполнителя. '+
       'Самый длинный подтверждённый этап: '+(model.largest_delay?.largest_measured_stage?.stage||'—')+
       ' · средний вклад '+duration(model.largest_delay?.largest_measured_stage?.contribution_mean_minutes)+
       ' / PR; неизвестное время '+duration(model.largest_delay?.unattributed_mean_minutes)+
       ' / PR. Статус: '+(model.largest_delay?.status==='LARGEST_VERIFIED_INTERVAL_BOUNDED'?
       'максимальная измеренная часть ограничена доказательствами':
       'неизвестное время может превосходить известные этапы')+'.';
    archiveNote.textContent='Источник: сохранённые GitHub Actions Core CI; по '+covered+
      ' из '+N+' PR найдены непротиворечивые job-интервалы. '+
      'До/после этих интервалов причины НЕ подтверждены. '+model.coverage.rejected_ci_rows+
      ' несогласованных записей отнесены к «Нет CI-истории». Данные архива могут быть неполны.';
    if(prList)prList.querySelectorAll('.hh2-pr-item').forEach(function(entry){
      const n=Number(entry.querySelector('summary strong')?.textContent.replace('#',''));
      const p=model.paths.find(x=>x.pr===n);
      if(!p)return;
      let note=entry.querySelector('.hh2-pr-evidence');
      if(!note){note=make('p','hh2-pr-evidence hh2-inline-warning','');
        entry.querySelector('.hh2-detail')?.prepend(note);}
      note.textContent=p.covered?'Core CI подтверждена; сегменты суммируются с общим временем.':
        'Нет сопоставимого сохранённого Core CI пути: длительность PR не приписана CI или Repair.';
    });
  }
  function renderWaveComparison() {
    if(!waveCompareMount)return;
    waveCompareMount.replaceChildren();
    waveCompareMount.append(make('h3','','Количество волн CI и паузы между ними'));
    if(!journeyComparison||journeyComparison.schema!=='HH_CI_JOURNEY_PERIOD_COMPARISON_V1'){
      waveCompareMount.append(make('p','hh2-meta','Сравнение не подтверждено. Нет данных — это не нулевое значение.'));
      return;
    }
    var byId=Object.fromEntries((journeyComparison.periods||[]).map(p=>[p.id,p]));
    var head=make('div','hh2-wave-row hh2-wave-head');
    head.append(make('span','','Показатель'),make('strong','','Сейчас'),
      make('strong','','7 дн. назад'),make('strong','','14 дн. назад'));
    waveCompareMount.append(head);
    var metrics=[
      ['Всего CI runs','ci_runs','шт'],['Повторные waves','repeat_waves','шт'],
      ['Среднее runs / PR','mean_runs_per_pr',''],['Интервалов между waves','intervals','шт'],
      ['Переходов на новый HEAD','new_head','шт'],['Повторов на том же HEAD','same_head','шт'],
      ['HEAD не подтверждён','unverified_head','шт'],
      ['Пауза после failed workflow','after_workflow_failure','шт'],
      ['После failed Core job','after_core_failure','шт'],
      ['После failed Specialist job','after_specialist_failure','шт'],
      ['После failed Merge Gate','after_merge_gate_failure','шт'],
      ['После successful workflow','after_success','шт'],
      ['Сумма пауз','gap_total_minutes','мин'],['P50 паузы','gap_p50_minutes','мин'],
      ['P95 паузы','gap_p95_minutes','мин']
    ];
    metrics.forEach(function(spec){
      var row=make('div','hh2-wave-row');
      row.append(make('span','',spec[0]));
      ['current','week_ago','two_weeks_ago'].forEach(function(id){
        row.append(make('strong','',displayMetric(byId[id]?.wave_summary?.[spec[1]],spec[2])));
      });
      waveCompareMount.append(row);
    });
    waveCompareMount.append(make('p','hh2-meta','Одинаковые окна по 24 ч. Охват архивной когорты: '+
      ['current','week_ago','two_weeks_ago'].map(function(id){
        var p=byId[id];return (p?.label||id)+' '+(p?.wave_summary?.observed_prs??'—')+
          '/'+(p?.coverage?.archived_prs??'—');
      }).join(' · ')+'. Паузы обрезаны по границам окна: предшествующее время за его пределами не включается. Архив неполный. Новый HEAD не доказывает, кто и почему задержал публикацию.'));
    // Do not overwrite stages.ci_gaps.current: it belongs to the Created→Merged
    // cohort rendered above. This comparison has a separate archive cohort
    // (PR selected by last observed Core completion) and is diagnostic only.
    var s=stages.ci_gaps;
    s.current.title='Основное значение выше рассчитано по той же Created→Merged когорте и не заменяется архивной выборкой waves.';
    [['week_ago','week'],['two_weeks_ago','history']].forEach(function(pair){
      var p=byId[pair[0]],v=p?.wave_summary?.gap_mean_minutes_per_pr;
      s[pair[1]].textContent=typeof v==='number'?duration(v):'—';
      s[pair[1]].title=p?'Архивная диагностическая когорта; окно '+(p.period?.from||'—')+
        ' → '+(p.period?.to||'—')+'; PR n='+p.wave_summary.observed_prs+
        '/'+(p.coverage?.archived_prs??'—')+
        '. Паузы обрезаны до выбранного окна; значение не складывается с Created→Merged.':'Нет данных';
    });
  }
  function applyJourneyComparison() {
    if(!journeyComparison||journeyComparison.schema!=='HH_CI_JOURNEY_PERIOD_COMPARISON_V1')return;
    renderWaveComparison();
  }
  async function readJourneyComparison() {
    if(journeyComparisonPending||journeyComparison)return;
    journeyComparisonPending=true;
    try{
      var response=await fetch('/api/ci-journey-summary?hours=24&compare=1',{
        cache:'default',headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('HTTP '+response.status);
      var data=await response.json();
      if(data.schema!=='HH_CI_JOURNEY_PERIOD_COMPARISON_V1'||
        !Array.isArray(data.periods)||data.periods.length!==3||
        !data.periods.some(p=>p.id==='current')||
        !data.periods.some(p=>p.id==='week_ago')||
        !data.periods.some(p=>p.id==='two_weeks_ago'))throw Error('Неполный набор сравнения CI');
      journeyComparison=data;applyJourneyComparison();
    }catch(e){
      if(waveCompareMount){
        waveCompareMount.replaceChildren(make('h3','','Количество волн CI и паузы между ними'),
          make('p','hh2-meta','Сравнение недоступно: '+String(e.message||e)+
            '. Неполные данные не заменяются нулями.'));
      }
    }finally{journeyComparisonPending=false;}
  }
  async function readArchive() {
    if(archivePending||archive)return;
    archivePending=true;
    try {
      var response=await fetch('/api/ci-journey-summary?hours=72',{cache:'default',
        headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('HTTP '+response.status);
      var data=await response.json();
      if(data.schema!=='HH_CI_FIRST_LAST_ARCHIVE_V1'||!Array.isArray(data.rows))
        throw Error('Архив CI не соответствует ожидаемому формату');
      archive=data;updateComparison();
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
    ciCard('running','CI jobs в работе','Проверенные jobs · данные GitHub');
    ciCard('queued','CI jobs в ожидании','Проверенные jobs · очередь GitHub');
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
    cells.median = rowStat('PR → Merge · P50','—','Та же когорта PR');
    cells.p95 = rowStat('PR → Merge · P95','—','Та же когорта PR');
    cells.live = rowStat('PR → LIVE','—','Нет полного LIVE-подтверждения');
    metrics.append(cells.avg,cells.median,cells.p95,cells.live); times.append(metrics);
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
    compareTitle.append(make('strong','','Этап · n/N'),make('strong','','Сейчас'),make('strong','','7 дней назад'),make('strong','','14 дней назад'));
    comparison.append(compareTitle);
    STAGES.forEach(function (spec) {
      var detail = make('details','hh2-stage-item');
      var summary = make('summary','hh2-stage-row');
      var name = make('span','',spec[1]), current = make('strong','','—'), week = make('strong','','—'), history = make('strong','','—');
      summary.append(name,current,week,history);
      var explanation = make('div','hh2-detail');
      detail.append(summary,explanation);
      comparison.append(detail);
      stages[spec[0]] = {name:name,current:current,week:week,history:history,explanation:explanation};
      buildSubsteps(spec[0],explanation);
      detail.addEventListener('toggle',function(){if(detail.open&&archive)applyArchive();});
    });
    var all = make('details','hh2-stage-item hh2-total');
    var sum = make('summary','hh2-stage-row');
    sum.append(make('span','','Итого: Created → Merged'),
      make('strong','','—'),make('strong','','—'),make('strong','','—'));
    all.append(sum,make('div','hh2-detail','Сравнение использует одинаковые 24-часовые окна: сейчас, 7 дней назад и 14 дней назад. До LIVE это не полный путь.'));
    comparison.append(all);stages.total={current:sum.children[1],week:sum.children[2],history:sum.children[3]};
    two.append(comparison);
    diagnostics=make('p','hh2-diagnostic','Проверяю охват подэтапов и сопоставимость периодов…');
    two.append(diagnostics);
    archiveNote=make('p','hh2-meta','Архив Core CI читается при открытии этого экрана; новых CI-запусков нет.');
    two.append(archiveNote);
    coverage = make('p','hh2-meta','Сравнение по подтверждённым снимкам; этапы без исторических receipts остаются неизвестными.');
    two.append(coverage);
    var actions = make('div','hh2-actions');
    var verify = make('button','hh2-button','Обновить сохранённые CI-метки');
    verify.type='button';
    verify.addEventListener('click',function () { archive=null; void readArchive(); });
    actions.append(verify); two.append(actions);
    var prs = make('details','hh2-prs');
    var prTitle = make('summary','','Каждый PR · общее время и хронология');
    prList = make('div','hh2-pr-list'); prList.append(make('p','hh2-placeholder','Читаю сохранённые PR-когорты…'));
    prs.append(prTitle,prList); two.append(prs);
    var more=make('a','hh2-link','Все остальные разделы ↓');
    more.href='#quick-signal';two.append(more);
    secondFoot = make('p','hh2-meta','Детали раскрываются нажатием на этап или отдельный PR.');
    two.append(secondFoot);
    if(STAGE_ONLY){
      root.classList.add('hh2-stage-only');
      root.append(two);
      const main=document.querySelector('main.wrap')||document.querySelector('main');
      // Preserve the owner error funnel as the first block. Stage timings
      // belong at the very top of monitoring, before the legacy queue/chart.
      // If the funnel loads later, it prepends itself ahead of these timings.
      const funnel=main?.querySelector('#hh-pr-error-funnel');
      if(funnel)funnel.insertAdjacentElement('afterend',root);
      else if(main)main.insertBefore(root,main.querySelector('header.header')||main.firstChild);
      else document.body.prepend(root);
      // The original queue/KPI screen stays in place. Only the stage slide is added.
    }else{
      root.append(one,two);
      document.body.prepend(root);
      document.body.classList.add('hh2-active');
    }
    mounted=true;
  }
  // Missing measurements must never be rendered as 0.00 minutes. The legacy
  // lower dashboard may put the unit ("мин/PR") inside the numeric element.
  function legacyUnmeasuredDurationText(value) {
    return /^0[,.]00(?:\s*мин(?:\s*\/\s*PR)?)?$/i.test(
      String(value??'').replace(/\u00a0/g,' ').trim());
  }
  function legacyUnmeasuredCandidates(leaf,section) {
    if(!/Проверено:\s*0\s+из\s+\d+\s+PR/i.test(leaf?.textContent||''))return [];
    // Select only values in the NEAREST stage card with exactly one proof
    // count; never climb to a table with other stages and real measurements.
    for(let cur=leaf,depth=0;cur&&cur!==section&&depth<10;
        cur=cur.parentElement,depth++){
      const descendants=Array.from(cur.querySelectorAll('*'));
      const proofs=descendants.filter(el=>el.childElementCount===0&&
        /Проверено:\s*\d+\s+из\s+\d+\s+PR/i.test(el.textContent||''));
      if(proofs.length>1)return [];
      const numbers=descendants.filter(el=>el.childElementCount===0&&
        legacyUnmeasuredDurationText(el.textContent));
      if(proofs.length===1&&numbers.length)return numbers;
    }
    return [];
  }
  // A legacy summary is a real HTML table with separate evidence and duration
  // cells. Normalize at the row boundary instead of guessing DOM ancestry.
  function repairLegacyZeroTableRows() {
    let corrected=0;
    const tables=Array.from(document.querySelectorAll('table,[role="table"]'));
    for(const table of tables){
      const tableText=String(table.textContent||'');
      if(!/До последнего коммита PR/i.test(tableText)||
         !/Итого Created\s*→?\s*Merged/i.test(tableText))continue;
      const rows=Array.from(table.querySelectorAll('tr,[role="row"]'));
      for(const row of rows){
        if(!/Проверено:\s*0\s+из\s+\d+\s+PR/i.test(row.textContent||''))continue;
        const cells=Array.from(row.querySelectorAll('td,th,[role="cell"]'));
        if(cells.length<2)continue;
        const valueCell=cells.at(-1);
        if(!legacyUnmeasuredDurationText(valueCell?.textContent))continue;
        valueCell.textContent='—';
        valueCell.title='Нет проверенных измерений по данному этапу';
        corrected++;
      }
    }
    return corrected;
  }
  function repairLegacyUnmeasuredZeros() {
    repairLegacyZeroTableRows();
    // Keep historical panels and their real counts unchanged. Only normalize
    // missing duration cells proven by exactly 0 measured PR in the same row.
    const headings=Array.from(document.querySelectorAll('h2,h3,h4,h5'));
    const title=headings.find(h=>/Где прошло время до merge/i.test(h.textContent||''));
    if(!title)return;
    const section=title.closest('section,article')||title.parentElement?.parentElement;
    if(!section)return;
    const evidenceLeaves=Array.from(section.querySelectorAll('*')).filter(el=>
      el.childElementCount===0&&
      /Проверено:\s*0\s+из\s+\d+\s+PR/i.test(el.textContent||''));
    const normalized=new Set();
    for(const leaf of evidenceLeaves){
      const targets=legacyUnmeasuredCandidates(leaf,section);
      for(const el of targets){
        el.textContent='—';
        el.title='Нет проверенной пары событий для этапа; это не ноль минут';
      }
      if(targets.length){
        leaf.title='0 подтверждённых PR. Длительность не измерена.';
        normalized.add(leaf);
      }
    }
    // Some older tables render the evidence badges in one column and the
    // duration cells in another. There is no safe nearest-stage DOM ancestor.
    // Allow a strictly count-matched fallback ONLY if every remaining "0,00"
    // duration belongs to one still-unresolved n=0 stage. Real measured
    // zeroes or unrelated durations make the counts differ and stay intact.
    const unresolved=evidenceLeaves.filter(leaf=>!normalized.has(leaf));
    if(unresolved.length){
      const zeroDurations=Array.from(section.querySelectorAll('*')).filter(el=>
        el.childElementCount===0&&legacyUnmeasuredDurationText(el.textContent));
      if(zeroDurations.length===unresolved.length){
        for(const el of zeroDurations){
          el.textContent='—';
          el.title='Нет проверенной пары событий; значение не измерено';
        }
        for(const leaf of unresolved)
          leaf.title='0 подтверждённых PR. Длительность не измерена.';
      }
    }
    if(evidenceLeaves.length&&!section.querySelector('.hh2-legacy-proof-notice')){
      const notice=make('p','hh2-legacy-proof-notice hh2-diagnostic',
        'Строки с «Проверено: 0» не имеют измеренного времени. '+
        'Их значения — «—», не 0 минут. Сопоставимая, арифметически полная '+
        'разбивка из сохранённых CI находится на втором экране выше.');
      title.insertAdjacentElement('afterend',notice);
    }
  }
  function chartAndMetrics() {
    if (!mounted) return;
    repairLegacyUnmeasuredZeros();
    if(!STAGE_ONLY){
      var graph = document.getElementById('hh-pr-trends');
      if (graph && !graphSlot.contains(graph)) {
        graphSlot.replaceChildren(graph);
        graph.classList.add('hh2-original-chart');
      }
      if (!graph && !graphSlot.firstElementChild) graphSlot.append(graphHint);
      showQueue();
    }
    // Both screens read exactly the same created-and-merged PR cohort.
    if (baseline) {
      cells.avg.querySelector('strong').textContent=duration(baseline.mean);
      cells.median.querySelector('strong').textContent=duration(baseline.median);
       cells.p95.querySelector('strong').textContent=duration(baseline.p95);
      firstFoot.textContent='Одна когорта Created→Merged: '+baseline.n+' PR · срез '+
        (baseline.to||'—')+' · '+(baseline.source==='live'?'текущий API':'архив; может устареть')+
        '. LIVE пока подтверждается отдельно.';
    }
  }
  function updateComparison() {
    if(!mounted)return;
    if(baseline)stages.total.current.textContent=duration(baseline.mean);
    const historical=aggregate(sourceSnapshot?.windows?.find(function(w){return w.id==='two_weeks_ago';}));
    if(historical)stages.total.history.textContent=duration(historical.mean);
    if(!archive){
      for(const [key] of STAGES){
        stages[key].current.textContent='—';
        stages[key].week.textContent='—';
        stages[key].history.textContent='—';
      }
      diagnostics.textContent=baseline?
        'Общее Created→Merged: '+duration(baseline.mean)+' / PR из '+baseline.n+
        ' PR. Загружаю Core CI архив для того же списка PR. Неизмеренные этапы не равны 0.':
        'Ожидаю единый список созданных и смерженных PR…';
    }else applyArchive();
    const N=baseline?.n??'—';
    coverage.textContent='Единая когорта созданных и смерженных PR: '+N+
      ' за 24 ч; историческая когорта: '+(historical?.n??'—')+
      '. Для исторических этапов двухнедельной давности нет сопоставимого CI-архива; «—» означает «не измерено», а не 0.';
    cells.live.querySelector('strong').textContent='—';
    cells.live.querySelector('small').textContent='Полный набор независимых LIVE-квитанций отсутствует';
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
    var reasonUnproven=valid(data.reason_unproven_minutes)?
      data.reason_unproven_minutes:data.unattributed_minutes;
    var total=make('p','hh2-sample','PR #'+data.pr_number+' · всего '+duration(data.elapsed_minutes)+
      ' · разбито по подтверждённым границам '+(data.accounted_percent??'—')+'%'+
      ' · время с неподтверждённой причиной '+duration(reasonUnproven)+
      ' (до первой CI, после зелёного gate и другие неизвестные интервалы). '+
      'Границы интервала не доказывают первопричину задержки.');
    mount.append(total);
    var proof=data.journey?.checkpoint_coverage;
    if(proof?.schema==='HH_PR_CHECKPOINT_EVIDENCE_V1'){
      mount.append(make('p','hh2-sample',
        'Обязательные временные точки Created→Merged: '+proof.observed+'/'+proof.total+
        ' · недостающие: '+(proof.missing?.length?proof.missing.join(', '):'нет')+
        '. Условные этапы (Triage, Worker, Repair, конфликт, повторный CI) '+
        'не снижают покрытие, если они не требовались. '+
        (proof.history_partial?
          'История GitHub частичная: даже полная цепочка не подтверждает все старые CI.':
          'История проверенного набора событий не помечена как частичная.')+
        ' Production LIVE: '+(proof.delivery?.independently_live_verified?
           'есть отдельная подтверждённая квитанция.':'не подтверждён для этого PR.')));
    }
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
    if(long)mount.prepend(make('p','hh2-diagnostic','Самый длинный интервал с подтверждёнными границами (причина может быть неизвестна): '+
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
  let legacyRepairScheduled=false;
  function legacyStageSection() {
    const title=Array.from(document.querySelectorAll('h2,h3,h4,h5')).find(h=>
      /Где прошло время до merge/i.test(h.textContent||''));
    return title?.closest('section,article')||title?.parentElement?.parentElement||null;
  }
  function isLegacyStageMutation(target) {
    const element=target?.nodeType===3?target.parentElement:target;
    const table=typeof element?.closest==='function'?
      element.closest('table,[role="table"]'):null;
    if(table&&/До последнего коммита PR/i.test(table.textContent||''))
      return true;
    const section=legacyStageSection();
    return Boolean(element&&section&&typeof section.contains==='function'&&
      section.contains(element));
  }
  function scheduleLegacyRepair() {
    if(legacyRepairScheduled||!mounted)return;
    legacyRepairScheduled=true;
    Promise.resolve().then(function(){
      legacyRepairScheduled=false;
      // Render order can be async inside screen 2. Observe the existing DOM
      // instead of adding timers, GitHub requests, or another worker.
      repairLegacyUnmeasuredZeros();
    });
  }
  function start() {
    if (mounted || !document.body) return;
    build();chartAndMetrics();void readJourneyComparison();if(!STAGE_ONLY)void readHistorical();void readCurrentCohort();
    if(!STAGE_ONLY){
      void readQueue();
      document.getElementById('refresh')?.addEventListener('click',()=>void readQueue());
    }
    observer=new MutationObserver(function (changes) {
      if (changes.some(function (m) { return !root.contains(m.target); }))
        schedule();
      else if (changes.some(m=>isLegacyStageMutation(m.target)))
        scheduleLegacyRepair();
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
          void readArchive();
        }
      },{threshold:0.18});
      if(second)io.observe(second);
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
