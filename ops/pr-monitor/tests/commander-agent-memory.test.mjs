import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const apiSource=read('api/commander-agent-memory.js');
const create=()=>{
 const calls=[];
 const mocks={
  callStore:async(_req,action,body)=>{calls.push([action,body]);return{status:200,data:{schema:'HH_AGENT_MEMORY_DIGEST_LIST_V1',digests:[],briefing:{last7Days:0,blocked:0}}}},
  isOriginAllowed:req=>req.headers.origin==='https://holistic-house-pr-monitor.vercel.app',
  sendJson:(res,status,data)=>{res.statusCode=status;res.payload=data;return data}
 };
 const exports={};const module={exports};vm.runInNewContext(apiSource,{require:()=>mocks,module,exports,console,URL},{timeout:1000});
 const request=async(method='POST',body={action:'list'},origin='https://holistic-house-pr-monitor.vercel.app')=>{
  const res={headers:{},setHeader(k,v){this.headers[k]=v}};
  await module.exports({method,body,headers:{origin}},res);return res;
 };
 return{calls,request};
};
test('owner-only proxy rejects GET, hostile origin, unknown writes, invalid project and oversized body',async()=>{
 const {request,calls}=create();
 assert.equal((await request('GET')).statusCode,405);
 assert.equal((await request('POST',{action:'list'},'https://attack.invalid')).statusCode,403);
 assert.equal((await request('POST',{action:'create'})).statusCode,400);
 assert.equal((await request('POST',{action:'list',projectKey:'../../secret'})).statusCode,400);
 assert.equal((await request('POST',{action:'list',query:'x'.repeat(3000)})).statusCode,400);
 assert.equal(calls.length,0);
});
test('private proxy forwards only bounded read filters through existing Supabase owner-bound store',async()=>{
 const {request,calls}=create();const response=await request('POST',{action:'list',projectKey:'agent-commander',status:'blocked',limit:20});
 assert.equal(response.statusCode,200);assert.equal(response.headers['Cache-Control'],'private, no-store, max-age=0');
 assert.equal(calls[0][0],'commander_list_agent_digests');assert.equal(calls[0][1].limit,20);
 assert.equal((await request('POST',{action:'detail',digestId:'invalid'})).statusCode,400);
});
test('mobile panel preserves old public Brain and avoids DOM HTML insertion of owner records',()=>{
 const html=read('memory.html'),js=read('commander-agent-memory-page.js'),css=read('commander-agent-memory.css');
 assert.match(html,/hh-memory-projects/);assert.match(html,/commander-memory-page\.js/);
 for(const id of ['hh-agent-digest-panel','hh-agent-digest-project','hh-agent-digest-agent','hh-agent-digest-state','hh-agent-digest-refresh','hh-agent-digest-list'])assert.ok(html.includes(id),id);
 assert.match(js,/textContent/);assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.match(js,/credentials:'same-origin'/);assert.match(js,/cache:'no-store'/);
 assert.match(js,/github\.com/);assert.match(js,/сводка текущей страницы/);
 for(const w of [320,390,430])assert.ok(css.includes('max-width:'+w+'px'),w);
 assert.match(css,/min-width:0/);assert.match(css,/overflow-wrap:anywhere/);
});
