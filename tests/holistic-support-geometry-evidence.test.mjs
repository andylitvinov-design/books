import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../scripts/verify-holistic-support-mock-fidelity.mjs',import.meta.url),'utf8');
const start=source.indexOf('async function recordSupportGeometry('),end=source.indexOf('const evidence = [];',start);
assert.ok(start>=0&&end>start);
const actual=source.slice(start,end);
function fixture({writeFail=false,screenFail=false}={}) {
 const writes=[],shots=[],events=[];
 const record=vm.runInNewContext(actual+'\nrecordSupportGeometry', {assert,output:'artifacts/synthetic',writeFile:async(path,text)=>{if(writeFail)throw Error('disk failure');events.push("write");writes.push({path,text});}});
 const page={screenshot:async(args)=>{if(screenFail)throw Error('screenshot failure');events.push("screenshot");shots.push(args);}};
 const geometry={client:390,scroll:390,a:[{x:0,y:5,width:120,height:400,text:'PRIVATE',url:'https://private.invalid'}],hero:[{x:0,y:410,width:390,height:300}],scaleRows:[{x:0,y:1,width:50,height:44}],payload:'DO NOT SAVE'};
 return {record,page,geometry,writes,shots,events};
}
test('actual helper records all six engine/width cases with numeric selector data before screenshot',async()=>{
 for(const engine of ['chromium','webkit'])for(const width of [320,390,430]){
  const f=fixture();await f.record({geometry:f.geometry,engine,locale:'ru',width,page:f.page});
  assert.equal(f.writes.length,1);assert.equal(f.shots.length,1);assert.deepEqual(f.events,["write","screenshot"]);
  assert.match(f.writes[0].path,new RegExp(engine+'-ru-'+width+'-geometry.json$'));
  assert.equal(f.shots[0].path,'artifacts/synthetic/'+engine+'-ru-'+width+'.png');
  assert.equal(f.shots[0].fullPage,true);const data=JSON.parse(f.writes[0].text);
  assert.equal(data.geometry.a[0].height,400);assert.equal(data.geometry.scaleRows[0].height,44);
  assert.doesNotMatch(f.writes[0].text,/PRIVATE|private.invalid|payload|DO NOT SAVE/);
 }
});
test('invalid case identifiers fail before file or screenshot operation',async()=>{
 for(const invalid of [{engine:'../../private'},{locale:'../secret'},{width:999}]){const f=fixture();await assert.rejects(f.record({geometry:f.geometry,engine:'chromium',locale:'ru',width:390,page:f.page,...invalid}));assert.equal(f.writes.length+f.shots.length,0);}
});
test('non-finite bounds and unknown fields cannot leak into JSON',async()=>{
 const f=fixture();f.geometry.a[0].x=Infinity;f.geometry.a[0].height='private';await f.record({geometry:f.geometry,engine:'webkit',locale:'es',width:390,page:f.page});const d=JSON.parse(f.writes[0].text);assert.equal('x'in d.geometry.a[0],false);assert.equal('height'in d.geometry.a[0],false);
});
test('write and screenshot failures are not swallowed',async()=>{
 for(const opts of [{writeFail:true},{screenFail:true}]){const f=fixture(opts);await assert.rejects(f.record({geometry:f.geometry,engine:'chromium',locale:'en',width:430,page:f.page}),/failure/);}
});
test('all-width evidence executes before unchanged geometry and native assertions',()=>{
 const call=source.indexOf('await recordSupportGeometry({ geometry, engine: browserType.name(), locale, width, page });');
 assert.ok(call>0&&call<source.indexOf('assert.ok(geometry.scroll<=geometry.client+allowedMargin'));
 assert.match(source,/assert\.ok\(geometry\.hero\[0\]\.y-geometry\.a\[0\]\.y<385,/);
 for(const gate of ['geometry.readableTools.every','geometry.hero[0].height>=300','assert.deepEqual(errors,[]','page.waitForFunction','assert.equal(await root.locator(\'[data-support-tool]\').count(), 5'])assert.ok(source.includes(gate),gate);
 assert.doesNotMatch(source.slice(call,source.indexOf('const allowedMargin=3;',call)),/if\(width===320\)/);
});
