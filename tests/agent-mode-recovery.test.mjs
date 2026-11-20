import test from "node:test";
import assert from "node:assert/strict";
import {shouldRetryNativeAgentMode,nativeAgentFallbackPayload} from "../lib/holistic-support/agent-mode-recovery.mjs";

test("only explicitly disabled optional AI modes auto-retry the native route",()=>{
  for(const mode of ["owned","device"])
    assert.equal(shouldRetryNativeAgentMode({mode,status:503,errorCode:"AGENT_DISABLED"}),true);
  for(const status of [200,401,403,409,429,500,502,504])
    assert.equal(shouldRetryNativeAgentMode({mode:"owned",status,errorCode:"AGENT_DISABLED"}),false);
  for(const errorCode of ["DATABASE_UNAVAILABLE","RATE_LIMITED","UNAUTHORIZED",null,undefined])
    assert.equal(shouldRetryNativeAgentMode({mode:"owned",status:503,errorCode}),false);
  assert.equal(shouldRetryNativeAgentMode({mode:"rules",status:503,errorCode:"AGENT_DISABLED"}),false);
});
test("retry strips optional model consent and private-context selectors",()=>{
  const original={locale:"ru",message:"Привет поговорим",mode:"owned",history:[{role:"user",text:"Привет"}],
    ownedInferenceConsent:true,usePrivateProfile:true,usePrivateHistory:true,useAgentMemory:true,
    chosenAxes:["relationships"],nativeSession:{id:"old",revision:1},
    judgmentChoice:null,feedback:{dismissedIds:[],completedIds:[]}};
  const next=nativeAgentFallbackPayload(original);
  assert.equal(next.mode,"rules");
  assert.equal(next.ownedInferenceConsent,false);
  assert.equal(next.usePrivateProfile,false);
  assert.equal(next.usePrivateHistory,false);
  assert.equal(next.useAgentMemory,false);
  assert.deepEqual(next.chosenAxes,[]);
  assert.equal("nativeSession" in next,false);
  assert.equal(next.message,original.message);
  assert.deepEqual(next.history,original.history);
  assert.equal(original.mode,"owned");
  assert.equal(original.ownedInferenceConsent,true);
});
test("existing rules and invalid requests do not create new retries",()=>{
  assert.equal(nativeAgentFallbackPayload({mode:"rules"}),null);
  assert.equal(nativeAgentFallbackPayload(null),null);
  assert.equal(nativeAgentFallbackPayload({mode:"other"}),null);
});
