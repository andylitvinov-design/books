import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOwnedCommanderRun,
  ownedModelConfig,
  executeOwnedCommanderRun
} from '../lib/agent-director/commander-owned-runtime.mjs';

const run={
  runId:'11111111-1111-4111-8111-111111111111',
  chatId:'22222222-2222-4222-8222-222222222222',
  ownerId:'33333333-3333-4333-8333-333333333333',
  projectKey:'holistic-house',
  message:'Review this task and explain the safest implementation plan.',
  modelId:'owned-default',
  confirmGitHubWrite:false,
  contextCapsule:{schema:'HH_COMMANDER_TASK_CONTEXT_V1',title:'Review task',linkedPrHintsVerified:false}
};
const configured={
  HH_AGENT_OLLAMA_ENABLED:'true',
  HH_AGENT_OLLAMA_ENDPOINT:'https://ollama.example/api/chat',
  HH_AGENT_OLLAMA_MODEL:'qwen2.5-coder:7b',
  HH_AGENT_OLLAMA_TOKEN:'test-only-token-which-is-never-logged',
  VERCEL_ENV:'production'
};
function response(body,status=200){
  return {ok:status>=200&&status<300,status,json:async()=>body};
}

test('owned runtime is disabled unless the first-party model flag and protected endpoint are configured',()=>{
  assert.equal(ownedModelConfig({}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OLLAMA_ENABLED:'false'}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OLLAMA_ENDPOINT:'http://10.0.0.4:11434/api/chat'}),null);
  assert.equal(ownedModelConfig({...configured,HH_AGENT_OLLAMA_TOKEN:''}),null);
  assert.equal(ownedModelConfig(configured).model,'qwen2.5-coder:7b');
});

test('request validation binds one run to a valid owner, chat and first-party project',()=>{
  assert.equal(normalizeOwnedCommanderRun(run).projectKey,'holistic-house');
  assert.throws(()=>normalizeOwnedCommanderRun({...run,ownerId:'not-a-uuid'}),/INVALID_AGENT_DIRECTOR_ID/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,projectKey:'other'}),/PROJECT_NOT_ALLOWED/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,confirmGitHubWrite:'yes'}),/WRITE_POLICY_REQUIRED/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,contextCapsule:{large:'x'.repeat(4000)}}),/INVALID_AGENT_DIRECTOR_CONTEXT/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,unexpected:'secret'}),/UNEXPECTED_AGENT_DIRECTOR_FIELD/);
});

test('missing owned model returns a BLOCKED receipt without starting a network request',async()=>{
  let calls=0;
  const result=await executeOwnedCommanderRun(run,{env:{},fetcher:async()=>{calls++;throw Error('must not fetch')}});
  assert.equal(result.schema,'HH_AGENT_DIRECTOR_RUN_V1');
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reasonCode,'OWNED_MODEL_RUNTIME_NOT_CONFIGURED');
  assert.equal(result.agentStarted,false);
  assert.equal(result.executionVerified,false);
  assert.equal(result.sourceWrite,null);
  assert.equal(calls,0);
});

test('GitHub write confirmation fails closed until the protected first-party writer exists',async()=>{
  let calls=0;
  const result=await executeOwnedCommanderRun({...run,confirmGitHubWrite:true},{
    env:configured,fetcher:async()=>{calls++;throw Error('must not fetch')}
  });
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reasonCode,'AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED');
  assert.equal(result.agentStarted,false);
  assert.equal(result.sourceWrite,null);
  assert.equal(calls,0);
});

test('native Ollama completion returns a read-only receipt and never claims a source write',async()=>{
  let request;
  const result=await executeOwnedCommanderRun(run,{
    env:configured,
    fetcher:async(url,options)=>{
      request={url:String(url),options,body:JSON.parse(options.body)};
      return response({message:{content:'Проверил контекст. Предлагаю сначала выполнить тесты и только затем создавать PR.'}});
    }
  });
  assert.equal(request.url,configured.HH_AGENT_OLLAMA_ENDPOINT);
  assert.equal(request.options.method,'POST');
  assert.equal(request.options.redirect,'error');
  assert.equal(request.options.headers.Authorization,'Bearer '+configured.HH_AGENT_OLLAMA_TOKEN);
  assert.equal(request.body.model,configured.HH_AGENT_OLLAMA_MODEL);
  assert.equal(result.status,'COMPLETED');
  assert.equal(result.agentStarted,true);
  assert.equal(result.executionVerified,true);
  assert.equal(result.sourceWrite,null);
  assert.equal(result.proofLevel,'AGENT_DIRECTOR_READ_ONLY_RESPONSE');
  assert.match(result.result,/Предлагаю/);
  assert.ok(request.body.messages[0].content.includes('READ-ONLY'));
  assert.ok(request.body.messages[0].content.includes('cannot'));
});

test('unsafe, oversized or URL-bearing model output is not accepted as a receipt',async()=>{
  for(const output of ['', 'https://github.com/example/repo', '<script>alert(1)</script>', 'x'.repeat(1801)]){
    const result=await executeOwnedCommanderRun(run,{env:configured,
      fetcher:async()=>response({message:{content:output}})});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reasonCode,'OWNED_MODEL_RESPONSE_NOT_ACCEPTED');
    assert.equal(result.sourceWrite,null);
  }
});

test('selected model must match the server-side owned model instead of selecting an arbitrary model',async()=>{
  let calls=0;
  const result=await executeOwnedCommanderRun({...run,modelId:'someone/other-model'},{
    env:configured,fetcher:async()=>{calls++;return response({message:{content:'not used'}})}
  });
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reasonCode,'OWNED_MODEL_ID_MISMATCH');
  assert.equal(calls,0);
});
