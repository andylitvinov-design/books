'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const mod=require('../pr-task-tree.js');
const row=(number,title,labels=[],base='codex/public-book-library',draft=false)=>({number,title,draft,base:{ref:base},labels:labels.map(name=>({name})),updated_at:'2026-11-07T18:00:00Z'});
test('curated map is unambiguous and retains verified initial grouping',()=>{
 const index=mod.curatedIndex();
 assert.equal(index.size,133);
 assert.equal(index.get(3852),'video/goal');
 assert.equal(index.get(3836),'video/render');
 assert.equal(index.get(3869),'messenger/council');
 assert.equal(index.get(499),'cabinet/tests');
 assert.equal(index.get(3866),'platform/commander');
});
test('complete PR inventory groups each PR exactly once across differing bases',()=>{
 const rows=[
  row(3836,'Safari MP4'),row(3833,'WebM',[],'codex/public-book-library',true),
  row(3852,'Concept',[]),row(499,'IPIP', ['hh:repair-manual']),
  row(3866,'Commander',[],'codex/bootstrap-books'),
  row(2613,'Intelligence',[],'codex/stacked',true),
  row(3869,'Council',['hh:hold'])
 ];
 const model=mod.build(rows);
 assert.equal(model.counts.total,rows.length);
 assert.equal(model.groups.reduce((n,g)=>n+g.count,0),rows.length);
 assert.deepEqual([model.counts.production,model.counts.control,model.counts.stacked],[5,1,1]);
 assert.deepEqual([model.counts.hold,model.counts.manual,model.counts.draft],[1,1,2]);
 const render=model.groups.find(g=>g.key==='video').tasks.find(t=>t.key==='video/render');
 assert.deepEqual(render.prs.map(p=>p.number),[3836,3833]);
 assert.equal(model.overlaps.some(x=>x.title.includes('Safari')),true);
});
test('new PR has provisional deterministic group, no false merge or LIVE status',()=>{
 const p=row(4999,'feat(video): add scenic footage',['hh:direction:video']);
 assert.equal(mod.route(p).key,'video/scenes');
 assert.equal(mod.route(p).method,'keyword');
 assert.equal(mod.statusOf(p),'open');
 assert.throws(()=>mod.build([p,p]),/DUPLICATE_PR/);
 assert.throws(()=>mod.build([{number:1,title:'bad'}]),/INCOMPLETE_GITHUB_PR/);
});
test('HTML routes show the tree without adding write APIs or timers',()=>{
 const read=p=>readFileSync(new URL('../'+p,'file://'+__dirname+'/'), 'utf8');
 // Use direct source path; test should work from any checkout path.
 const fs=require('node:fs'),path=require('node:path');
 const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 for(const page of ['project-management-public.html','projects.html']){
  assert.match(src(page),/id="hh-pr-task-tree"/);
  assert.match(src(page),/pr-task-tree\.js/);
  assert.match(src(page),/pr-task-tree\.css/);
 }
 const js=src('pr-task-tree.js');
 assert.doesNotMatch(js,/setInterval|workflow_dispatch|method:\s*['"]POST['"]|service_role/);
 assert.match(js,/state=open&per_page=100/);
 assert.match(js,/GITHUB_PAGINATION_INCOMPLETE/);
});
