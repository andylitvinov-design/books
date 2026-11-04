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
      var explanation = make('div','hh2-detail',spec[2]+' Источник: подтверждённые события PR/CI. Отсутствие пары временных меток не равно 0 минут.');
      detail.append(summary,explanation);
      comparison.append(detail); stages[spec[0]] = {current:current,history:history,explanation:explanation};
    });
    var all = make('details','hh2-stage-item hh2-total');
    var sum = make('summary','hh2-stage-row');
    sum.append(make('span','','Итого: Created → Merged'),
      make('strong','','—'),make('strong','','—'));
    all.append(sum,make('div','hh2-detail','Только PR, созданные и смерженные внутри одинаковых 24-часовых окон Toronto. До LIVE это не полный путь.'));
    comparison.append(all);stages.total={current:sum.children[1],history:sum.children[2]};
    two.append(comparison);
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
    var more = make('button','hh2-full','Показать остальные разделы монитора');
    more.type='button';more.setAttribute('aria-pressed','false');
    more.addEventListener('click',function () {
      var opened = document.body.classList.toggle('hh2-full-open');
      more.setAttribute('aria-pressed',String(opened));
      more.textContent=opened?'Свернуть дополнительные разделы':'Показать остальные разделы монитора';
    });
    two.append(more);
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
    var q = originalQueue();
    if (q) {
      cells.running.n.textContent = q[2];
      cells.queued.n.textContent = q[1];
      cells.running.sub.textContent = 'Workflows · jobs выполняются: '+q[4];
      cells.queued.sub.textContent = 'Workflows · jobs ожидают: '+q[3];
      status.textContent = 'Источник: существующая очередь CI · PR ждут: '+q[0]+'. Срез обновляется исходным монитором.';
    }
    var current = originalCohort();
    if (current && (current['Среднее Created→Merged'] || current['Медиана'])) {
      cells.avg.querySelector('strong').textContent = current['Среднее Created→Merged'] || '—';
      cells.median.querySelector('strong').textContent = current['Медиана'] || '—';
      firstFoot.textContent = 'Срез Created→Merged из существующей API-когорты · Merged: '+
        (current.Merged || '—')+'. Полного подтверждения LIVE для всех PR нет.';
    } else if (baseline) {
      cells.avg.querySelector('strong').textContent=duration(baseline.mean);
      cells.median.querySelector('strong').textContent=duration(baseline.median);
      firstFoot.textContent='Сохранённый срез PR: '+(sourceSnapshot?.generated_at||'дата неизвестна')+
        ' · '+baseline.n+' PR. Это исторические 24 часа, не LIVE-счётчик.';
    }
  }
  function updateComparison() {
    if (!mounted) return;
    if (baseline) stages.total.current.textContent=duration(baseline.mean);
    var old=aggregate(sourceSnapshot?.windows?.find(function (w) { return w.id==='two_weeks_ago'; }));
    if (old) stages.total.history.textContent=duration(old.mean);
    for (var i=0;i<STAGES.length;i++) {
      var key=STAGES[i][0], stage=stages[key];
      var stat=detailed?.stages?.[key] || (key==='merge_to_live'?detailed?.stages?.live_verified:null);
      stage.current.textContent=stat && stat.n>0 && valid(stat.mean)?duration(stat.mean):'—';
      stage.history.textContent='—';
      stage.current.title=stat && stat.n>0?'Среднее · n='+stat.n:'Нет проверенной пары событий';
      stage.history.title='Нет исторической выборки того же этапа за 2 недели назад';
    }
    var oldN = old ? old.n : '—';
    coverage.textContent='Тот же 24-часовой интервал Toronto · Created+Merged: сейчас '+
      (baseline?baseline.n:'—')+' PR, 2 недели назад '+oldN+
      ' PR. Этапы без подтверждённых исторических меток отмечены «—».';
    if (detailed?.coverage) coverage.textContent+=' Текущий глубокий замер: '+(detailed.coverage.selected??'—')+' PR; данные условной выборки, не всего потока.';
    var live=detailed?.stages?.created_to_live;
    if (live?.n>0&&valid(live.mean)) {
      cells.live.querySelector('strong').textContent=duration(live.mean);
      cells.live.querySelector('small').textContent='Только '+live.n+' PR с LIVE-квитанциями';
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
      detail.append(a);entry.append(detail);prList.append(entry);
    });
  }
  async function readHistorical() {
    try {
      var response=await fetch('/pr-three-cohorts-snapshot.json',{cache:'default',headers:{Accept:'application/json'}});
      if (!response.ok) throw Error('HTTP '+response.status);
      var data=await response.json();
      if (data.schema!=='HH_PR_THREE_CREATED_COHORTS_V1' || !Array.isArray(data.windows)) throw Error('INVALID_SNAPSHOT');
      sourceSnapshot=data;
      baseline=aggregate(data.windows.find(function (w) {return w.id==='last_day';}));
      chartAndMetrics();updateComparison();fillPRs();
    } catch(e) {
      coverage.textContent='Сравнительный срез недоступен: '+String(e.message||e)+'. Нули не подставлены.';
      prList.replaceChildren(make('p','hh2-placeholder','Нет проверенной исторической когорты.'));
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
    build();chartAndMetrics();void readHistorical();
    observer=new MutationObserver(function (changes) {
      if (changes.some(function (m) { return !root.contains(m.target); })) schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:false});
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
