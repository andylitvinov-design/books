'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parse,normalize}=require('../ops/pr-monitor/gpt-agent-counter.js');
const NOW=Date.parse('2026-11-06T19:30:00Z');
function data(o={}){return {schema:'HH_CHATGPT_AGENT_ACTIVITY_V1',
 scope:'SCHEDULED_CHATGPT_AUTOMATIONS_ONLY',source:'CHATGPT_AUTOMATIONS_PEEK',
 observed_at:'2026-11-06T19:26:30Z',enabled:15,observed:15,running:0,...o};}
test('exact zero only for complete coverage',()=>{
 assert.equal(normalize(data(),NOW).count,'0');
 assert.equal(normalize(data({observed:14}),NOW).count,'≥0');
 assert.throws(()=>normalize(data({running:16}),NOW));
});
test('expired and invalid data fail closed',()=>{
 assert.equal(normalize(data(),NOW+76*60000).count,'—');
 assert.throws(()=>normalize(data({scope:'ALL_CHATGPT_CHATS'}),NOW));
 assert.throws(()=>normalize(data({observed_at:'2028-01-01'}),NOW));
});
test('comment marker must be verified',()=>{
 const fence=String.fromCharCode(96).repeat(3);
 assert.deepEqual(parse('<!-- HH_CHATGPT_AGENT_ACTIVITY_V1 -->\n'+fence+'json\n'+JSON.stringify(data())+'\n'+fence),data());
 assert.throws(()=>parse(fence+'json\n'+JSON.stringify(data())+'\n'+fence));
});
test('no extra polling or CI and boot includes both assets',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/gpt-agent-counter.js'),'utf8');
 const boot=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-two-screen-boot.js'),'utf8');
 assert.doesNotMatch(ui,/setInterval\s*\(|workflow_dispatch|setTimeout\s*\(/);
 assert.match(ui,/MutationObserver/);
 assert.match(boot,/gpt-agent-counter\.js/);assert.match(boot,/gpt-agent-counter\.css/);
 assert.match(ui,/target\.append\(el\)/);assert.match(ui,/Обычные чаты и Work не учтены/);
});
