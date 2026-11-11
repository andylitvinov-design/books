'use strict';
/* Load the COMPLETE previous monitor page, never a partial Vercel source tree.
 * The original production index is retained byte-for-byte as /legacy.html.
 */
(async function () {
  var fallback=document.getElementById('hh2-boot-status');
  try {
    var response=await fetch('/legacy.html',{cache:'default',headers:{Accept:'text/html'}});
    if(!response.ok)throw Error('Original monitor '+response.status);
    var html=await response.text();
    if(!/<\/head>/i.test(html)||!/<main\b/i.test(html))throw Error('Original monitor markup incomplete');
    var additions='<link rel="stylesheet" href="/pr-timestamp-coverage.css?v=20261104-5">'+
      '<script src="/pr-timestamp-coverage.js?v=20261104-5" defer><\/script>'+
      '<link rel="stylesheet" href="/pr-two-screen.css?v=20261104-4">'+
      '<script src="/pr-cohort-wall-clock.js?v=20261104-kpi-p95-3476" defer><\/script>'+
      '<script src="/ci-queue-backup.js?v=20261106-ci-filter-v2" defer><\/script>'+
      '<script data-pr-stage-only src="/pr-two-screen.js?v=20261107-stage-return-v1" defer><\/script>'+
      '<link rel="stylesheet" href="/pr-three-kpi-ui.css?v=20261106-wave-kpi1">'+
      '<script src="/pr-three-kpi-ui.js?v=20261106-wave-kpi1" defer><\/script>';
    // Preserve the manually deployed LIVE monitor extensions; source archives in
    // GitHub intentionally contain only a subset of the 100+ production assets.
    additions += '<link rel="stylesheet" href="/pr-monitor-fluid.css?v=20261105-v1">'+
      '<script src="/pr-merge-velocity-ui.js?v=20261105-v1" defer><\/script>';
    additions += '<link rel="stylesheet" href="/pr-velocity-three-lines.css?v=20261105-v1">'+
      '<script src="/pr-velocity-three-lines.js?v=20261105-v1" defer><\/script>';
    additions += '<link rel="stylesheet" href="/pr-queue-recovery.css?v=20261105-queue-v1">'+
      '<script src="/pr-open-queue.js?v=20261105-queue-v1" defer><\/script>'+
      '<script src="/pr-trends-recovery.js?v=20261105-history-v1" defer><\/script>';
    // A single read of the existing public activity snapshot; no additional polling.
    additions += '<link rel="stylesheet" href="/gpt-agent-counter.css?v=20261106-grid-v1">'+
      '<script src="/gpt-agent-counter.js?v=20261106-grid-v1" defer><\/script>';
    // HH_CI_VERIFIED_LOAD_V2: one user-requested census; never launches workflows.
    // The two existing jobs cards share the VERIFIED server census, no duplicate graphs.
    additions += '<script src="/ci-jobs-bridge.js?v=20261109-workflow-labels-v1" defer><\/script>';
    additions += '<link rel="stylesheet" href="/pr-lifecycle-ribbon.css?v=20261107-journey-v2">'+
      '<script src="/pr-lifecycle-ribbon.js?v=20261107-journey-v2" defer><\/script>';
    // Historical attribution may be missing from legacy.html.
    // The panel has its own duplicate-mount guard.
    additions += '<link rel="stylesheet" href="/pr-attribution-ui.css?v=20261107-journey-v2">'+
      '<script src="/pr-attribution-ui.js?v=20261107-journey-v2" defer><\/script>';
    // Owner-scoped CI incident funnel: only on-demand read-only evidence.
    additions += '<link rel="stylesheet" href="/pr-error-funnel.css?v=20261111-reasons-v5">'+
      '<script src="/pr-error-funnel.js?v=20261111-reasons-v5" defer><\/script>';
    // HH_PM_NAV_V1: public monitor only links to the separate owner-authenticated page.
    additions += '<link rel="stylesheet" href="/project-management-nav.css?v=20261107-cc-v1">'+
      '<script src="/project-management-nav.js?v=20261107-cc-v1" defer><\/script>';
    // A discoverable link on the existing PR Monitor, without changing the five-item dock.
    additions += '<link rel="stylesheet" href="/commander-learning.css?v=20261107-learning-v1">';
    // Disable only old layout reordering, preserving all sources and working APIs.
    // Keep the proven LIVE mobile screen flow; the CSS now expands the chart itself.
    additions += "<style id=\"hh-monitor-graph-first\">@media(max-width:700px){body.hh2-active .hh2-screen{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;overscroll-behavior:auto!important;padding-top:12px!important;padding-bottom:12px!important}body.hh2-active .hh2-first{gap:8px!important}body.hh2-active .hh2-chart{min-height:190px!important;flex:0 0 auto!important}body.hh2-active #hh-merge-velocity{margin-top:4px!important;margin-bottom:4px!important}body.hh2-active .hh2-second{margin-top:7px!important}body.hh2-active .hh2-totals{margin-top:4px!important}body.hh2-active .hh2-chart-slot{overflow:visible!important}}</style>";
    html=html.replace(/<head>/i,'<head><script src="/pr-two-screen-pre.js"><\/script>');
    html=html.replace(/<\/head>/i,additions+'</head>');
    html=html.replace(/<\/header>/i,'</header><p class="hh-learning-monitor-entry"><a href="/learning.html">✦ Обучение агентов</a></p>');
    document.open();document.write(html);document.close();
  } catch(e) {
    if(fallback)fallback.textContent='Монитор не удалось загрузить: '+String(e.message||e)+'. Оригинальная версия: /legacy.html';
    var link=document.getElementById('hh2-fallback');
    if(link)link.hidden=false;
  }
})();