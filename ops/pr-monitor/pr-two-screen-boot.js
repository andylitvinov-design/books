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
      '<script src="/pr-two-screen.js?v=20261104-evidence-3501" defer><\/script>'+
      '<link rel="stylesheet" href="/pr-three-kpi-ui.css?v=20261104-kpi1">'+
      '<script src="/pr-three-kpi-ui.js?v=20261104-kpi1" defer><\/script>';
    // Disable only the old layout reordering script, without removing any
    // source asset or changing any KPI/event processing modules.
    html=html.replace(/<head>/i,'<head><script src="/pr-two-screen-pre.js" ><\/script>');
    html=html.replace(/<\/head>/i,additions+'</head>');
    document.open();document.write(html);document.close();
  } catch(e) {
    if(fallback)fallback.textContent='Монитор не удалось загрузить: '+String(e.message||e)+'. Оригинальная версия: /legacy.html';
    var link=document.getElementById('hh2-fallback');
    if(link)link.hidden=false;
  }
})();
