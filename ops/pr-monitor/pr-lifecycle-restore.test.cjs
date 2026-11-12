'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
test('full Created->LIVE stages are visible',()=>{
 const css=source('pr-dense-view.css');
 assert.doesNotMatch(css,/not\(\.hh-pr-dense-expanded\) #hh-pr-two-screens/);
 assert.match(css,/#hh-pr-two-screens\s*\{[\s\S]*?display:block!important/);
 assert.match(css,/#hh-pr-two-screens #hh2-stages/);
});
test('stage-only source does not access cells of unmounted overview',()=>{
 const js=source('pr-two-screen.js');
 assert.match(js,/if \(baseline && !STAGE_ONLY && cells\.avg\)/);
 assert.match(js,/if\(cells\.live\)/);
 assert.match(js,/Итого: Created → LIVE/);
 assert.match(js,/if\(spec\[0\]==='merge_to_live'\)detail\.open=true/);
});
test('existing eight stage partitions and per PR audit are retained',()=>{
 const js=source('pr-two-screen.js');
 for(const token of ['before_unknown','workflow_wait','runner_wait','checks','ci_gaps',
 'after_unknown','no_archive_unknown','merge_to_live','auditPR','readArchive'])
  assert.ok(js.includes(token),token);
});
test('full stage table remains just below both original top graphs',()=>{
 const js=source('pr-dense-view.js'),boot=source('pr-two-screen-boot.js');
 assert.match(js,/keepLifecycleBelowGraphs/);
 assert.match(js,/main\.insertBefore\(stage,anchor\.nextSibling\)/);
 assert.match(boot,/pr-two-screen\.js\?v=20261111-full-journey-v3/);
});
