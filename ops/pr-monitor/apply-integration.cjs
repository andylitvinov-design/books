'use strict';
/* Apply to FULL verified standalone PR monitor bundle or ops/pr-monitor archive.
 * All writes are staged in memory; no partial update on failed preflight.
 * Does NOT deploy or create GitHub refs/runs, requires explicit local invocation.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||'.');
const archive=fs.existsSync(path.join(root,'ops/pr-monitor/pr-two-screen.js'))
  ?path.join(root,'ops/pr-monitor'):root;
const files=['pr-two-screen-boot.js','pr-two-screen.js','pr-attribution-ui.js','index.html'];
const originals=Object.fromEntries(files.map(p=>[p,fs.readFileSync(path.join(archive,p),'utf8')]));
function once(input,needle,replacement,file){
  if(input.split(needle).length!==2)throw Error('Expected unique anchor missing: '+file+' / '+needle.slice(0,55));
  return input.replace(needle,replacement);
}
const out={...originals};
out['pr-two-screen-boot.js']=once(out['pr-two-screen-boot.js'],
  '    // Disable only old layout reordering',
  `    // HH_CI_VERIFIED_LOAD_V1: one user-requested census; never launches workflows.\n`+
  `    additions += '<link rel="stylesheet" href="/ci-verified-panel.css?v=20261107-truth-v1">'+\n`+
  `      '<script src="/ci-verified-panel.js?v=20261107-truth-v1" defer><\\/script>';\n`+
  `    additions += '<link rel="stylesheet" href="/pr-lifecycle-ribbon.css?v=20261107-journey-v1">'+\n`+
  `      '<script src="/pr-lifecycle-ribbon.js?v=20261107-journey-v1" defer><\\/script>';\n`+
  '    // Disable only old layout reordering','pr-two-screen-boot.js');
const queueAnchor=`    var running=one(2), queued=one(1);\n`+
  `    cells.running.n.textContent=running;\n`+
  `    cells.queued.n.textContent=queued;\n`+
  `    cells.running.sub.textContent='Workflows (не PR) · jobs выполняются: '+one(4);\n`+
  `    cells.queued.sub.textContent='Workflows (не PR) · jobs ожидают: '+one(3);`;
const replaceQueue=`    var verified=window.__hhCiVerifiedSnapshot;\n`+
  `    var age=Date.now()-Date.parse(verified?.observed_at||'');\n`+
  `    if(verified?.schema==='HH_CI_VERIFIED_LOAD_V1' && verified.coverage && verified.ci &&\n`+
  `       Number.isFinite(age) && age>=0 && age<=120000){\n`+
  `      var complete=verified.coverage.complete===true;\n`+
  `      var val=function(n){return validCount(n)?(complete?'':'≥')+n:'—';};\n`+
  `      cells.running.n.textContent=val(verified.ci.running_jobs);\n`+
  `      cells.queued.n.textContent=val(verified.ci.queued_jobs);\n`+
  `      cells.running.sub.textContent='Подтверждённые CI jobs · активных workflow: '+val(verified.ci.active_workflows);\n`+
  `      cells.queued.sub.textContent='Ожидающие CI jobs · Stale CI: '+val(verified.ci.stale_workflows);\n`+
  `      status.textContent='GitHub CI jobs, не workflow · проверено '+verified.coverage.checked_runs+\n`+
  `        '/'+verified.coverage.listed_runs+' · '+(complete?'полный охват':'нижняя граница ≥')+\n`+
  `        ' · Пропуски GitHub cron и другие работы ниже.';\n`+
  `      return;\n`+
  `    }\n`+
  `    // No verified job-level census. Legacy workflow statuses are not live load.\n`+
  `    var running=one(2), queued=one(1);\n`+
  `    cells.running.n.textContent='—';\n`+
  `    cells.queued.n.textContent='—';\n`+
  `    cells.running.sub.textContent='Реальные jobs неизвестны · workflow status '+running;\n`+
  `    cells.queued.sub.textContent='Реальные jobs неизвестны · workflow status '+queued;`;
out['pr-two-screen.js']=once(out['pr-two-screen.js'],queueAnchor,replaceQueue,'pr-two-screen.js');
out['pr-two-screen.js']=once(out['pr-two-screen.js'],
  '  async function readQueue() {',
  "  window.addEventListener('hh:ci-verified-updated',showQueue);\n  async function readQueue() {",'pr-two-screen.js');
out['pr-attribution-ui.js']=once(out['pr-attribution-ui.js'],
  '    result.append(stamp);',
  "    result.append(stamp);\n    if(window.HHPrLifecycle?.render)window.HHPrLifecycle.render(result,data);",'pr-attribution-ui.js');
out['index.html']=once(out['index.html'],
  'pr-two-screen-boot.js?v=20261106-ci-filter-v2',
  'pr-two-screen-boot.js?v=20261107-truth-v1','index.html');
for(const [file,contents]of Object.entries(out))if(file.endsWith('.js'))new vm.Script(contents,{filename:file});
for(const [file,contents]of Object.entries(out))fs.writeFileSync(path.join(archive,file),contents);
console.log('HH PR monitor integration staged:',Object.keys(out).join(', '));
