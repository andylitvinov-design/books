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
      '<script src="/pr-two-screen.js?v=20261106-ci-filter-v2" defer><\/script>'+
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
    // Disable only old layout reordering, preserving all sources and working APIs.
    html=html.replace(/<head>/i,'<head><script src="/pr-two-screen-pre.js"><\/script>');
    html=html.replace(/<\/head>/i,additions+'</head>');
    document.open();document.write(html);document.close();
  } catch(e) {
    if(fallback)fallback.textContent='Монитор не удалось загрузить: '+String(e.message||e)+'. Оригинальная версия: /legacy.html';
    var link=document.getElementById('hh2-fallback');
    if(link)link.hidden=false;
  }
})();