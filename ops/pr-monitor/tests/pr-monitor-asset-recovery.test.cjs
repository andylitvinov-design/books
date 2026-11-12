'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Script}=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'pr-monitor.html'),'utf8');
const recover=[
 ['pr-stage-dashboard.css',14000],
 ['pr-stage-dashboard.js',31000],
 ['pr-monitor-fluid.css',5500]
];
test('three formerly missing LIVE resources are now archived in versioned source',()=>{
 for(const [name,minSize] of recover){
  const contents=fs.readFileSync(path.join(root,name),'utf8');
  assert.ok(contents.length>minSize,`${name} unexpectedly short`);
  assert.ok(html.includes('/'+name),`monitor must reference ${name}`);
  if(name.endsWith('.js'))assert.doesNotThrow(()=>new Script(contents,{filename:name}));
 }
});
