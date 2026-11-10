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
const configured={HH_AGENT_OPENROUTER_API_KEY:'sk-or-v1-test-only-key-which-is-never-logged'};
function response(body,status=200){
  return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)};
}
const freeCompletion={
  model:'meta-llama/llama-3.3-70b-instruct:free',
  usage:{prompt_tokens:120,completion_tokens:90,total_tokens:210,cost:0},
  choices:[{message:{content:'Проверил контекст. Предлагаю сначала выполнить тесты и затем подготовить ограниченный Draft PR.'}}]
};

test('OpenRouter configuration is server-only and disabled without the protected API key',()=>{
  assert.equal(ownedModelConfig({}),null);
  assert.equal(ownedModelConfig({HH_AGENT_OPENROUTER_API_KEY:''}),null);
  assert.equal(ownedModelConfig({HH_AGENT_OPENROUTER_API_KEY:'too short'}),null);
  assert.equal(ownedModelConfig(configured).model,'openrouter/free');
  assert.equal(ownedModelConfig(configured).apiKey,configured.HH_AGENT_OPENROUTER_API_KEY);
});

test('request validation binds one run to a valid owner, chat and first-party project',()=>{
  assert.equal(normalizeOwnedCommanderRun(run).projectKey,'holistic-house');
  assert.equal(normalizeOwnedCommanderRun(run).modelId,'owned-default');
  assert.throws(()=>normalizeOwnedCommanderRun({...run,ownerId:'not-a-uuid'}),/INVALID_AGENT_DIRECTOR_ID/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,projectKey:'other'}),/PROJECT_NOT_ALLOWED/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,confirmGitHubWrite:'yes'}),/WRITE_POLICY_REQUIRED/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,contextCapsule:{large:'x'.repeat(4000)}}),/INVALID_AGENT_DIRECTOR_CONTEXT/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,modelId:'anthropic/claude-sonnet'}),/INVALID_AGENT_DIRECTOR_MODEL/);
  assert.throws(()=>normalizeOwnedCommanderRun({...run,unexpected:'secret'}),/UNEXPECTED_AGENT_DIRECTOR_FIELD/);
});

test('missing OpenRouter key returns BLOCKED without any model request',async()=>{
  let calls=0;
  const result=await executeOwnedCommanderRun(run,{env:{},fetcher:async()=>{calls++;throw Error('must not fetch')}});
  assert.equal(result.schema,'HH_AGENT_DIRECTOR_RUN_V1');
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reasonCode,'OPENROUTER_API_KEY_NOT_CONFIGURED');
  assert.equal(result.agentStarted,false);
  assert.equal(result.executionVerified,false);
  assert.equal(result.sourceWrite,null);
  assert.equal(calls,0);
});

test('GitHub write confirmation stays blocked until the protected App writer is explicitly wired',async()=>{
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

test('first-party Director uses only OpenRouter free router and verifies exact zero cost',async()=>{
  let request;
  const result=await executeOwnedCommanderRun(run,{
    env:configured,
    fetcher:async(url,options)=>{
      request={url:String(url),options,body:JSON.parse(options.body)};
      return response(freeCompletion);
    }
  });
  assert.equal(request.url,'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(request.options.method,'POST');
  assert.equal(request.options.redirect,'error');
  assert.equal(request.options.headers.Authorization,'Bearer '+configured.HH_AGENT_OPENROUTER_API_KEY);
  assert.equal(request.body.model,'openrouter/free');
  assert.equal(request.body.provider.allow_fallbacks,false);
  assert.equal(request.body.stream,false);
  assert.equal(result.status,'COMPLETED');
  assert.equal(result.agentStarted,true);
  assert.equal(result.executionVerified,true);
  assert.equal(result.model,'meta-llama/llama-3.3-70b-instruct:free');
  assert.equal(result.sourceWrite,null);
  assert.equal(result.proofLevel,'AGENT_DIRECTOR_READ_ONLY_RESPONSE');
  assert.match(result.result,/Предлагаю/);
  assert.ok(request.body.messages[0].content.includes('READ-ONLY'));
  assert.ok(request.body.messages[0].content.includes('cannot'));
});

test('a paid or unverified routed model is rejected instead of falling back or being reported as success',async()=>{
  const paid={...freeCompletion,model:'anthropic/claude-sonnet-4'};
  const result=await executeOwnedCommanderRun(run,{env:configured,fetcher:async()=>response(paid)});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reasonCode,'OPENROUTER_NON_FREE_MODEL_REJECTED');
  assert.equal(result.agentStarted,false);
  assert.equal(result.sourceWrite,null);
  const noCost={...freeCompletion,usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}};
  const costResult=await executeOwnedCommanderRun(run,{env:configured,fetcher:async()=>response(noCost)});
  assert.equal(costResult.status,'BLOCKED');
  assert.equal(costResult.reasonCode,'OPENROUTER_COST_NOT_VERIFIED_ZERO');
});

test('unsafe, oversized or URL-bearing model output is not accepted as a receipt',async()=>{
  for(const output of ['', 'https://github.com/example/repo', '<script>alert(1)</script>', 'x'.repeat(1801)]){
    const invalid={...freeCompletion,choices:[{message:{content:output}}]};
    const result=await executeOwnedCommanderRun(run,{env:configured,fetcher:async()=>response(invalid)});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reasonCode,'OPENROUTER_RESPONSE_NOT_ACCEPTED');
    assert.equal(result.sourceWrite,null);
  }
});

test('transport errors and free-tier limit errors return durable BLOCKED receipts',async()=>{
  const failed=await executeOwnedCommanderRun(run,{env:configured,fetcher:async()=>{throw Error('network error')}});
  assert.equal(failed.status,'BLOCKED');
  assert.equal(failed.reasonCode,'OPENROUTER_REQUEST_FAILED');
  const limited=await executeOwnedCommanderRun(run,{env:configured,fetcher:async()=>response({},429)});
  assert.equal(limited.status,'BLOCKED');
  assert.equal(limited.reasonCode,'OPENROUTER_FREE_LIMIT_REACHED');
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
