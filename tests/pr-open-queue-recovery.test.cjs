'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../ops/pr-monitor');
const q=require(path.join(dir,'pr-open-queue.js'));
const g=require(path.join(dir,'pr-trends-recovery.js'));
const pr=(number,title,base='codex/public-book-library',draft=false)=>({number,title,base:{ref:base},draft,labels:[]});
test('technical and product feature classification from scope, ambiguous remains unknown',()=>{
 assert.equal(q.classify(pr(1,'fix(ci): queue first')), 'technical');
 assert.equal(q.classify(pr(2,'perf(monitor): reduce latency')), 'technical');
 assert.equal(q.classify(pr(3,'P0 fix(ci): independent runner')), 'technical');
 assert.equal(q.classify(pr(4,'feat(video): improve shots')), 'functional');
 assert.equal(q.classify(pr(5,'fix(cabinet): improve profile')), 'functional');
 assert.equal(q.classify(pr(6,'fix(video-ci): optimize CI under video')), 'unknown');
 assert.equal(q.classify(pr(7,'fix: unspecified change')), 'unknown');
});
test('whole production queue is distinct from CI queue and other-base PR',()=>{
 const data=q.tally([pr(1,'fix(ci): runner'),pr(2,'feat(video): shots',undefined,true),pr(3,'fix: unspecified'),pr(4,'docs: elsewhere','codex/bootstrap-books')]);
 assert.deepEqual(data,{total:4,production:3,other:1,ready:2,draft:1,functional:1,technical:1,unknown:1});
 assert.throws(()=>q.tally([pr(1,'feat(video): A'),pr(1,'feat(video): B')]),/INCOMPLETE_PR_ROW/);
});
test('cache strict arithmetic and bounded age',()=>{
 const now=1793900000000,record={schema:'HH_PR_OPEN_QUEUE_V1',at:now,counts:{total:2,production:1,other:1,ready:1,draft:0,functional:1,technical:0,unknown:0}};
 assert.ok(q.verifyCache(record,now+30000));
 assert.equal(q.verifyCache({...record,counts:{...record.counts,functional:0}},now+30000),null);
 assert.equal(q.verifyCache(record,now+3600001),null);
});
test('typed period cards map to created and merged counts without replacing unknown with zero',()=>{
 const inputs=['09:52 +— Ф0 · Т0 ✓— Ф0 · Т0','10:02 +— Ф0 · Т0 ✓— Ф0 · Т0','10:12 +— Ф3 · Т2 ✓— Ф2 · Т2','10:22 +— Ф3 · Т1 · ?3 ✓— Ф4 · Т2 · ?2','10:32 +— Ф6 · Т1 · ?1 ✓— Ф3 · Т0 · ?1','10:42 +— Ф1 · Т0 · ?1 ✓— Ф3 · Т1'];
 const res=g.plotData(inputs);
 assert.deepEqual(res.map(x=>x.created),[0,0,5,7,8,2]);
 assert.deepEqual(res.map(x=>x.merged),[0,0,4,8,4,4]);
 assert.equal(g.parseCard('10:42 +— ✓—'),null);
 assert.equal(g.plotData(['10:42 +— ✓—']),null);
});
test('source has no scheduled calls, CI reruns or new paid provider',()=>{
 const files=['pr-open-queue.js','pr-trends-recovery.js'];
 const source=files.map(x=>fs.readFileSync(path.join(dir,x),'utf8')).join('\n');
 assert.doesNotMatch(source,/setInterval\s*\(|workflow_dispatch|rerunWorkflow|stripe|openai/i);
 assert.match(source,/PAGINATION_INCOMPLETE/);
 assert.match(source,/GitHub HTTP/);
});
test('inline mobile CSS avoids nested scrolling and hides no primary widget',()=>{
 const css=fs.readFileSync(path.join(dir,'pr-queue-recovery.css'),'utf8');
 assert.match(css,/#hh-open-queue/);
 assert.doesNotMatch(css,/overflow\s*:\s*(?:auto|scroll|hidden)|position\s*:\s*fixed/i);
});