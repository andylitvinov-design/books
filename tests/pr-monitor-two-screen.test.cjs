'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const app=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen.js'),'utf8');
const marker="  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});";
assert.ok(app.includes(marker),'Test must instrument the active browser bundle');
const instrumented=app.replace(marker,"  window.__hhTests={aggregate:aggregate,duration:duration,legacyUnmeasuredDurationText:legacyUnmeasuredDurationText,legacyUnmeasuredCandidates:legacyUnmeasuredCandidates,repairLegacyUnmeasuredZeros:repairLegacyUnmeasuredZeros,isLegacyStageMutation:isLegacyStageMutation,repairLegacyZeroTableRows:repairLegacyZeroTableRows};\n"+marker);
const context={window:{},document:{readyState:'loading',addEventListener(){}}};
vm.runInNewContext(instrumented,context,{filename:'pr-two-screen.js'});
const {aggregate,duration,legacyUnmeasuredDurationText,legacyUnmeasuredCandidates,repairLegacyUnmeasuredZeros,isLegacyStageMutation,repairLegacyZeroTableRows}=context.window.__hhTests;

function row(number,created,merged){
 return {number,created_at:'2026-11-03T'+created+':00Z',
   merged_at:merged?'2026-11-03T'+merged+':00Z':null};
}
test('only PRs created and merged inside identical 24-hour windows count',()=>{
 const window={id:'last_day',from:'2026-11-03T00:00:00Z',to:'2026-11-04T00:00:00Z',
  complete:true,rows:[row(1,'01:00','01:10'),row(2,'02:00','02:30'),row(3,'03:00',null),
   {number:4,created_at:'2026-11-02T23:00:00Z',merged_at:'2026-11-03T01:00:00Z'},
   {number:5,created_at:'2026-11-03T23:59:00Z',merged_at:'2026-11-04T00:10:00Z'}]};
 const result=aggregate(window);
 assert.equal(result.n,2);assert.equal(result.mean,20);
 assert.equal(result.median,20);assert.equal(result.p90,28);
 assert.deepEqual(Array.from(result.rows,r=>r.number),[2,1]);
});
test('unknown evidence is not reported as a zero-duration observation',()=>{
 assert.equal(aggregate({from:'2026-11-03T00:00:00Z',to:'2026-11-04T00:00:00Z',
  rows:[row(1,'01:00',null)]}).mean,null);
 assert.equal(duration(null),'—');
 assert.equal(duration(-5),'—');
 assert.equal(duration(0),'0 сек');
});
test('stages are mounted before the legacy queue while preserving error funnel order',()=>{
 assert.match(app,/const funnel=main\?\.querySelector\('#hh-pr-error-funnel'\)/);
 assert.match(app,/if\(funnel\)funnel\.insertAdjacentElement\('afterend',root\)/);
 assert.match(app,/main\.insertBefore\(root,main\.querySelector\('header\.header'\)\|\|main\.firstChild\)/);
 assert.doesNotMatch(app,/const after=main\?\.querySelector\('#diagnostics-mount'\)/);
});
test('no automatic CI reruns, new scheduled polling or GitHub client calls',()=>{
 assert.doesNotMatch(app,/workflow_dispatch|setInterval\s*\(|api\.github\.com/);
 assert.match(app,/IntersectionObserver/);
 assert.match(app,/hh-pr-trends/);
 assert.match(app,/pr-three-cohorts-snapshot\.json/);
});

test('legacy unknown duration with units is missing, not zero minutes',()=>{
 for(const label of ['0,00','0.00','0,00мин','0,00 мин/PR','0.00 мин / PR','0,00\u00a0мин/PR'])
  assert.equal(legacyUnmeasuredDurationText(label),true,label);
 for(const actual of ['0','0 PR','0,01мин/PR','10,00мин/PR','1,00'])
  assert.equal(legacyUnmeasuredDurationText(actual),false,actual);
});
function mockElement(text='',children=[]){
 const e={textContent:text,childElementCount:children.length,parentElement:null,
  children,querySelectorAll(){return children.flatMap(x=>[x,...x.querySelectorAll('*')]);}};
 for(const child of children)child.parentElement=e;
 return e;
}
test('legacy PR panel never replaces an observed stage or another stage count',()=>{
 const missingText=mockElement('Проверено: 0 из 60 PR');
 const missingValue=mockElement('0,00мин/PR');
 const measuredText=mockElement('Проверено: 12 из 60 PR');
 const measuredValue=mockElement('0,00мин/PR');
 const missedRow=mockElement('',[missingValue,missingText]);
 const measuredRow=mockElement('',[measuredValue,measuredText]);
 const section=mockElement('',[missedRow,measuredRow]);
 const targets=legacyUnmeasuredCandidates(missingText,section);
 assert.deepEqual(Array.from(targets,x=>x.textContent),['0,00мин/PR']);
 assert.equal(legacyUnmeasuredCandidates(measuredText,section).length,0);
 const mixed=mockElement('',[missedRow,measuredRow]);
 assert.equal(legacyUnmeasuredCandidates(missingText,mixed).length,1);
 const deep=mockElement('',[mixed]);
 assert.equal(legacyUnmeasuredCandidates(missingText,deep).length,1);
});
test('rendered legacy unknown stage becomes dash while real zero stays untouched',()=>{
 const missingText=mockElement('Проверено: 0 из 60 PR');
 const missingValue=mockElement('0,00мин/PR');
 const measuredText=mockElement('Проверено: 5 из 60 PR');
 const measuredValue=mockElement('0,00мин/PR');
 const section=mockElement('',[mockElement('',[missingText,missingValue]),
  mockElement('',[measuredText,measuredValue])]);
 let notices=0;
 section.querySelector=()=>null;
 const title={textContent:'Где прошло время до merge',
  closest:()=>section,insertAdjacentElement:()=>{notices++;}};
 context.document.querySelectorAll=()=>[title];
 context.document.createElement=()=>({});
 repairLegacyUnmeasuredZeros();
 assert.equal(missingValue.textContent,'—');
 assert.equal(measuredValue.textContent,'0,00мин/PR');
 assert.equal(missingText.title,'0 подтверждённых PR. Длительность не измерена.');
 assert.equal(notices,1);
});

test('column-oriented historical stage rows normalize only when missing counts match',()=>{
 const count0a=mockElement('Проверено: 0 из 66 PR');
 const count0b=mockElement('Проверено: 0 из 66 PR');
 const zeroA=mockElement('0,00мин/PR');
 const zeroB=mockElement('0,00мин/PR');
 const proofColumn=mockElement('',[count0a,count0b]);
 const timeColumn=mockElement('',[zeroA,zeroB]);
 const section=mockElement('',[proofColumn,timeColumn]);
 section.querySelector=()=>null;
 const title={textContent:'Где прошло время до merge',closest:()=>section,
  insertAdjacentElement(){}};
 context.document.querySelectorAll=()=>[title];
 context.document.createElement=()=>({});
 assert.equal(legacyUnmeasuredCandidates(count0a,section).length,0);
 repairLegacyUnmeasuredZeros();
 assert.equal(zeroA.textContent,'—');
 assert.equal(zeroB.textContent,'—');
});
test('column fallback refuses to overwrite observed zero-minute metric',()=>{
 const missing=mockElement('Проверено: 0 из 66 PR');
 const known=mockElement('Проверено: 4 из 66 PR');
 const missingTime=mockElement('0,00мин/PR');
 const actualZero=mockElement('0,00мин/PR');
 const section=mockElement('',[mockElement('',[missing,known]),
  mockElement('',[missingTime,actualZero])]);
 section.querySelector=()=>null;
 const title={textContent:'Где прошло время до merge',closest:()=>section,
  insertAdjacentElement(){}};
 context.document.querySelectorAll=()=>[title];
 context.document.createElement=()=>({});
 repairLegacyUnmeasuredZeros();
 assert.equal(actualZero.textContent,'0,00мин/PR');
 assert.equal(missingTime.textContent,'0,00мин/PR');
});
test('watcher recognizes late DOM changes in stage panel but ignores unrelated blocks',()=>{
 const value=mockElement('0,00мин/PR');
 const section=mockElement('',[value]);
 section.contains=node=>node===section||section.querySelectorAll('*').includes(node);
 const title={textContent:'Где прошло время до merge',closest:()=>section};
 context.document.querySelectorAll=()=>[title];
 assert.equal(isLegacyStageMutation(value),true);
 assert.equal(isLegacyStageMutation(mockElement('unrelated')),false);
});

test('legacy source table corrects only stage rows without verified PR evidence',()=>{
 const proofMissing={textContent:'1. До последнего коммита PR Проверено: 0 из 64 PR'};
 const missingValue={textContent:'0,00мин/PR'};
 const proofMeasured={textContent:'6. Другое Проверено: 64 из 64 PR'};
 const measuredValue={textContent:'0,00мин/PR'};
 const row=(left,right)=>({textContent:left.textContent+' '+right.textContent,
   querySelectorAll(selector){
    assert.equal(selector,'td,th,[role="cell"]');return [left,right];
   }});
 const missingRow=row(proofMissing,missingValue),measuredRow=row(proofMeasured,measuredValue);
 const table={textContent:'До последнего коммита PR; Итого Created → Merged',
   querySelectorAll(sel){assert.equal(sel,'tr,[role="row"]');return [missingRow,measuredRow];}};
 context.document.querySelectorAll=sel=>{
   if(sel==='table,[role="table"]')return [table];
   if(sel==='h2,h3,h4,h5')return [];
   return [];
 };
 assert.equal(repairLegacyZeroTableRows(),1);
 assert.equal(missingValue.textContent,'—');
 assert.equal(measuredValue.textContent,'0,00мин/PR');
 assert.equal(repairLegacyZeroTableRows(),0,'idempotent after normalization');
});
test('table normalization fails closed for unrelated/missing-identity tables',()=>{
 const row={textContent:'Проверено: 0 из 64 PR',
  querySelectorAll(){return [{textContent:'N'},{textContent:'0,00мин/PR'}]}};
 const other={textContent:'Unrelated summary',querySelectorAll(){return [row]}};
 context.document.querySelectorAll=selector=>selector==='table,[role="table"]'?[other]:[];
 assert.equal(repairLegacyZeroTableRows(),0);
});
