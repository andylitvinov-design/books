'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {summarizeHeadStatus:check}=require('../pr-current-head-gate.cjs');
const h='a'.repeat(40),old='b'.repeat(40);
const at=m=>new Date(Date.parse('2026-11-07T11:00:00Z')+m*60000).toISOString();
const pr={head:{sha:h},merged_at:null};
const entry=(kind,head,minute)=>({kind,head,at:at(minute),url:'https://github.com/andylitvinov-design/books/actions/runs/1'});
test('only verified latest current-head green qualifies',()=>{
 const p=check({pr,chronology:[entry('ci_green',old,1),entry('ci_green',h,5)]});
 assert.equal(p.green_exact_head,true);assert.equal(p.green_at,at(5));
});
test('old-head-only green never passes current HEAD',()=>{
 assert.equal(check({pr,chronology:[entry('ci_green',old,5)]}).green_exact_head,false);
});
test('new current-head red invalidates previous green',()=>{
 const p=check({pr,chronology:[entry('ci_green',h,1),entry('ci_failed',h,3)]});
 assert.equal(p.green_exact_head,false);assert.match(p.stop_reason,/ошибка CI/);
});
test('new pending Core check after previous green means not green',()=>{
 const run={status:'in_progress',created_at:at(6),pull_requests:[{head:{sha:h}}]};
 const p=check({pr,chronology:[entry('ci_green',h,2)],runs:[run]});
 assert.equal(p.green_exact_head,false);assert.match(p.stop_reason,/ожидает или выполняет/);
});
test('partial history cannot certify last green, missing LIVE is not zero',()=>{
 assert.equal(check({pr,chronology:[entry('ci_green',h,2)],historyPartial:true}).green_exact_head,false);
 assert.match(check({pr:{...pr,merged_at:at(4)},chronology:[]}).stop_reason,/нет подтверждённой квитанции LIVE/);
});
