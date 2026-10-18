import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchFixture,consoleCategory,classifyFetch } from './fetch-probe.mjs';
const request={type:'server-fetch-request'}, command={type:'navigation-command'};
const warning={type:'console-error',category:'ratings-access-control'}, cancel={type:'requestfailed',cancelled:true};
test('handled fetch mirrors credentials/cache/status/json and explicit abort capability',()=>{
 for(const fragment of ["credentials:'same-origin'","cache:'no-store'",'response.ok','response.json()','.catch(error =>','new AbortController()'])assert.ok(fetchFixture.includes(fragment));
 assert.doesNotMatch(fetchFixture,/throw error|preventDefault|stopImmediatePropagation|console\./);
});
test('console output uses only fixed categories without raw endpoint content',()=>{
 assert.equal(consoleCategory('Fetch API cannot load http://127.0.0.1:123/synthetic-ratings due to access control checks.','http://127.0.0.1:123'),'ratings-access-control');
 for(const raw of ['secret token','https://other.test/synthetic-ratings access control','http://127.0.0.1:123/other access control'])assert.equal(consoleCategory(raw,'http://127.0.0.1:123'),'other');
});
test('native cancellation needs command-correlated request failure and access-control warning',()=>{
 assert.equal(classifyFetch([request,command,cancel,warning],'no-abort',true),'native-access-control-cancellation-observed');
 assert.equal(classifyFetch([request,command,warning],'no-abort',true),'access-control-without-cancellation-proof');
 assert.equal(classifyFetch([request,warning,cancel,command],'no-abort',true),'not-reproduced');
 assert.equal(classifyFetch([command,cancel,warning],'no-abort',true),'insufficient-evidence');
});
test('abort control proves ordered request/abort/settlement before navigation and zero warnings',()=>{
 const ordered=[request,{type:'abort-command'},{type:'fetch-aborted'},command,cancel];
 assert.equal(classifyFetch(ordered,'abort-before-navigation',true),'abort-control-quiet');
 assert.equal(classifyFetch([...ordered,warning],'abort-before-navigation',true),'abort-control-not-quiet');
 for(const events of [[request,command],[request,{type:'fetch-aborted'},{type:'abort-command'},command],[{type:'abort-command'},request,{type:'fetch-aborted'},command]])assert.equal(classifyFetch(events,'abort-before-navigation',true),'invalid-abort-control');
});
test('completed control requires actual200/settled fetch and rejects early or late warnings',()=>{
 const completed=[request,{type:'fetch-response',status:200},{type:'fetch-completed'},command];
 assert.equal(classifyFetch(completed,'completed',true),'completed-control-passed');
 for(const events of [[warning,...completed],[...completed,warning],[request,command]])assert.equal(classifyFetch(events,'completed',true),'completed-control-failed');
});
test('navigation, HTTP and unrelated browser errors stay explicit failures',()=>{
 assert.equal(classifyFetch([request,command],'no-abort',false),'navigation-failed');
 assert.equal(classifyFetch([request,{type:'fetch-response',status:404},command],'no-abort',true),'unexpected-response');
 assert.equal(classifyFetch([request,command,{type:'pageerror',category:'other'}],'no-abort',true),'unexpected-error');
});
