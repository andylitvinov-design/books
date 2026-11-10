import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOwnedCommanderRun,ownedModelConfig,executeOwnedCommanderRun,verifiedFreeReply}
  from '../lib/agent-director/commander-owned-runtime.mjs';

const run={
  runId:'11111111-1111-4111-8111-111111111111',
  chatId:'22222222-2222-4222-8222-222222222222',
  ownerId:'33333333-3333-4333-8333-333333333333',
  projectKey:'holistic-house',
  message:'Объясните, как проверить PR безопасно.',
  modelId:'owned-default',
  confirmGitHubWrite:false,
  contextCapsule:{schema:'HH_COMMANDER_TASK_CONTEXT_V1',title:'Review task',linkedPrHintsVerified:false}
};
const FREE='research/example-free:free',OTHER='testing/another-free:free';
const key='sk-or-v1-'+'Z'.repeat(40);
const configured={
  HH_AGENT_OPENROUTER_ENABLED:'true',HH_AGENT_OPENROUTER_API_KEY:key,VERCEL_ENV:'production'
};
const free=(id=FREE,context_length=6000)=>({id,context_length,
  pricing:{prompt:'0',completion:'0',request:'0',image:'0'},
  architecture:{input_modalities:['text'],output_modalities:['text']}});
function response(body,status=200){
  return {status,ok:status>=200&&status<300,text:async()=>JSON.stringify(body)};
}
function goodAnswer(content='Проверьте текущий HEAD и необходимые CI-проверки.',cost=0,model=FREE){
  return {id:'generation-test',model,choices:[{message:{content},finish_reason:'stop'}],
    usage:{prompt_tokens:40,completion_tokens:12,cost}};
}
function fetchMock({models=[free()],reply=goodAnswer(),status=200,track=[]}={}){
  return async (url,options)=>{
    track.push({url:String(url),options});
    if(String(url).includes('/models?endpoints='))return response({data:models});
    if(String(url)==='https://openrouter.ai/api/v1/chat/completions')return response(reply,status);
    throw Error('Unexpected model host');
  };
}
test('OpenRouter Free is opt-in; missing key, paid model or Ollama-only env does not start inference',async()=>{
  assert.equal(ownedModelConfig({}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OPENROUTER_ENABLED:'false'}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OPENROUTER_API_KEY:''}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OPENROUTER_MODEL:'vendor/model'}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OPENROUTER_MODEL:FREE}).preferredModel,FREE);
  assert.equal(ownedModelConfig({HH_AGENT_OLLAMA_ENABLED:'true',HH_AGENT_OLLAMA_ENDPOINT:'https://sample.invalid/api/chat',
    HH_AGENT_OLLAMA_TOKEN:key,HH_AGENT_OLLAMA_MODEL:'old-model'}),null);
  let calls=0;
  const got=await executeOwnedCommanderRun(run,{env:{},fetcher:async()=>{calls++;throw Error('must not fetch')}});
  assert.equal(got.status,'BLOCKED');assert.equal(got.reasonCode,'OWNED_MODEL_RUNTIME_NOT_CONFIGURED');
  assert.equal(got.agentStarted,false);assert.equal(got.executionVerified,false);
  assert.equal(got.sourceWrite,null);assert.equal(calls,0);
});
test('run is bound to valid owner, chat, first-party project, bounded context and explicit source policy',()=>{
  assert.equal(normalizeOwnedCommanderRun(run).projectKey,'holistic-house');
  assert.throws(()=>normalizeOwnedCommanderRun({...run,ownerId:'invalid'}),/INVALID_AGENT_DIRECTOR_ID/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,projectKey:'other'}),/PROJECT_NOT_ALLOWED/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,confirmGitHubWrite:'yes'}),/WRITE_POLICY_REQUIRED/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,contextCapsule:{large:'x'.repeat(4000)}}),/INVALID_AGENT_DIRECTOR_CONTEXT/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,unexpected:'secret'}),/UNEXPECTED_AGENT_DIRECTOR_FIELD/);
});
test('source write confirmation is blocked before any provider call',async()=>{
  let calls=0;
  const got=await executeOwnedCommanderRun({...run,confirmGitHubWrite:true},{env:configured,
    fetcher:async()=>{calls++;throw Error('must not fetch')}});
  assert.equal(got.status,'BLOCKED');assert.equal(got.reasonCode,'AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED');
  assert.equal(got.agentStarted,false);assert.equal(got.sourceWrite,null);assert.equal(calls,0);
});
test('catalog selects verified :free text model with zero prices; request has a hard zero spend ceiling',async()=>{
  const track=[];
  const got=await executeOwnedCommanderRun(run,{env:configured,fetcher:fetchMock({models:[
    {id:'paid/model',pricing:{prompt:'1',completion:'1'},architecture:{input_modalities:['text'],output_modalities:['text']}},
    free(FREE),free(OTHER,1000)
  ],track})});
  assert.equal(track.length,2);
  assert.equal(track[0].options.method,'GET');
  assert.equal(track[1].url,'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(track[1].options.method,'POST');
  assert.equal(track[1].options.headers.Authorization,'Bearer '+key);
  const body=JSON.parse(track[1].options.body);
  assert.equal(body.model,FREE);
  assert.match(body.model,/:free$/);
  assert.deepEqual(body.provider,{allow_fallbacks:false,max_price:{prompt:0,completion:0}});
  assert.deepEqual(body.usage,{include:true});
  assert.equal(body.stream,false);
  assert.ok(!('tools' in body));assert.ok(!('plugins' in body));
  assert.match(body.messages[0].content,/READ-ONLY/);
  assert.equal(got.status,'COMPLETED');assert.equal(got.agentStarted,true);
  assert.equal(got.executionVerified,true);assert.equal(got.sourceWrite,null);
  assert.equal(got.model,FREE);assert.equal(got.proofLevel,'AGENT_DIRECTOR_READ_ONLY_RESPONSE');
  assert.match(got.result,/CI-проверки/);
});
test('pinned model must appear in current free catalog; no arbitrary client-side model is allowed',async()=>{
  const track=[];
  const got=await executeOwnedCommanderRun(run,{env:{...configured,HH_AGENT_OPENROUTER_MODEL:OTHER},
    fetcher:fetchMock({models:[free(FREE)],track})});
  assert.equal(got.status,'BLOCKED');assert.equal(got.reasonCode,'OWNED_MODEL_NOT_FREE_IN_CATALOG');
  assert.equal(track.length,1);
  let calls=0;
  const alt=await executeOwnedCommanderRun({...run,modelId:OTHER},{env:configured,
    fetcher:async()=>{calls++;throw Error('must not fetch')}});
  assert.equal(alt.status,'BLOCKED');assert.equal(alt.reasonCode,'OWNED_MODEL_ID_MISMATCH');
  assert.equal(calls,0);
});
test('model cost must be reported exactly $0; wrong model, empty, unsafe and oversized text fail closed',async()=>{
  for(const data of [
    {...goodAnswer(),usage:{}},
    {...goodAnswer(),usage:{cost:null}},
    goodAnswer('text',0.001),
    goodAnswer('text','1'),
    goodAnswer('text',0,'vendor/paid'),
    goodAnswer(''),
    goodAnswer('https://github.com/example/pull/1'),
    goodAnswer('<script>bad</script>'),
    goodAnswer('x'.repeat(1801))
  ]){
    const track=[],got=await executeOwnedCommanderRun(run,{env:configured,fetcher:fetchMock({track,reply:data})});
    assert.equal(got.status,'BLOCKED');assert.equal(got.agentStarted,false);
    assert.equal(got.executionVerified,false);assert.equal(got.sourceWrite,null);
    assert.equal(track.length,2);
  }
});
test('unknown or positive model prices and missing text modalities cannot trigger inference',async()=>{
  const track=[],models=[
    {id:FREE,pricing:{prompt:'0',completion:'0',image:'0.1'},architecture:{input_modalities:['text'],output_modalities:['text']}},
    {id:OTHER,pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['image'],output_modalities:['text']}}
  ];
  const got=await executeOwnedCommanderRun(run,{env:configured,fetcher:fetchMock({track,models})});
  assert.equal(got.status,'BLOCKED');assert.equal(got.reasonCode,'OWNED_MODEL_NO_VERIFIED_FREE_MODELS');
  assert.equal(track.length,1);
});
test('401, 429, unavailable catalog and unexpected response fail without retry',async()=>{
  for(const [status,expected] of [[401,'OWNED_MODEL_OPENROUTER_KEY_REJECTED'],[429,'OWNED_MODEL_FREE_RATE_LIMIT']]){
    const track=[],got=await executeOwnedCommanderRun(run,{env:configured,fetcher:fetchMock({track,status})});
    assert.equal(got.status,'BLOCKED');assert.equal(got.reasonCode,expected);assert.equal(track.length,2);
  }
  const offline=await executeOwnedCommanderRun(run,{env:configured,
    fetcher:async()=>{throw Error('offline')}});
  assert.equal(offline.reasonCode,'OWNED_MODEL_FREE_CATALOG_UNAVAILABLE');
});
test('likely credentials in message or context are never forwarded to OpenRouter',async()=>{
  let calls=0;
  const got=await executeOwnedCommanderRun({...run,message:'Bearer '+('a'.repeat(60))},{env:configured,
    fetcher:async()=>{calls++;throw Error('must not fetch')}});
  assert.equal(got.reasonCode,'OWNED_MODEL_SENSITIVE_CONTENT_REJECTED');assert.equal(calls,0);
});
test('canonical owner route rechecks Supabase JWT, ACL and exact starting run',async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync(new URL('../app/api/agent-director/commander-run/route.js',import.meta.url),'utf8');
  assert.match(source,/verifyOwner\(request,body,fetcher\)/);
  assert.match(source,/store\?\.canWrite!==true/);
  assert.match(source,/run\.status!=='STARTING'/);
  assert.match(source,/consumeRate/);
});

test('native GitHub App source publisher remains server-only and disabled without App secrets',async()=>{
 const {ownedGithubAppConfigured,publishOwnedDraftSource}=await import('../lib/agent-director/github-app-source-publisher.mjs');
 assert.equal(ownedGithubAppConfigured({}),false);
 let calls=0;
 const example={job:{id:'owned_writer_check',projectKey:'holistic-house',
  githubPlan:{repo:'andylitvinov-design/books',baseBranch:'codex/public-book-library'}},
  project:{repo:'andylitvinov-design/books',productionBranch:'codex/public-book-library'},
  expectedBaseSha:'a'.repeat(40),
  filesJson:JSON.stringify([{path:'docs/read-only-check.md',content:'safe note',expectedBlobSha:null}]),
  commitMessage:'docs: bounded safe note',confirmWrite:true,ownerAuthorized:true,freeCiBudgetVerified:true};
 await assert.rejects(publishOwnedDraftSource(example,{env:{},fetchImpl:async()=>{calls++;throw Error('network forbidden')}}),/APP_NOT_CONFIGURED/);
 assert.equal(calls,0);
});


test('coaching free gateway enforces zero data retention without changing Agent Director requests',async()=>{
  const track=[]
  const selected=ownedModelConfig(configured)
  const reply=await verifiedFreeReply(selected,{privacyMode:'zdr',messages:[{role:'user',content:'I want to plan one small step.'}]},fetchMock({track}),AbortSignal.timeout(2000))
  assert.equal(reply.model,FREE)
  assert.equal(track.length,2)
  assert.match(track[0].url,/&zdr=true$/)
  const request=JSON.parse(track[1].options.body)
  assert.equal(request.provider.zdr,true)
  assert.deepEqual(request.provider.max_price,{prompt:0,completion:0})
  assert.equal(request.provider.allow_fallbacks,false)
  assert.deepEqual(request.usage,{include:true})
  assert.equal(JSON.parse(track[1].options.body).messages.length,1)
  const offline=[]
  await assert.rejects(()=>verifiedFreeReply(selected,{privacyMode:'zdr',messages:[]},fetchMock({models:[],track:offline}),AbortSignal.timeout(2000)),/OWNED_MODEL_NO_VERIFIED_ZDR_FREE_MODELS/)
  assert.equal(offline.length,1)
  let calls=0
  await assert.rejects(()=>verifiedFreeReply(selected,{privacyMode:'non_zdr',messages:[]},async()=>{calls++;throw Error('SHOULD_NOT_CALL')},AbortSignal.timeout(2000)),/OWNED_MODEL_PRIVACY_POLICY_INVALID/)
  assert.equal(calls,0)
})
