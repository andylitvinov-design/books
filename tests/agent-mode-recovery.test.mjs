import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {shouldRetryNativeAgentMode,nativeAgentFallbackPayload,
  aliNeedsVerifiedAction,aliGentleContinuity} from "../lib/holistic-support/agent-mode-recovery.mjs";

test("only explicitly disabled optional modes retry first-party protected route",()=>{
  for(const mode of ["owned","device"])assert.equal(shouldRetryNativeAgentMode({mode,status:503,errorCode:"AGENT_DISABLED"}),true);
  for(const status of [200,400,401,403,409,429,500,502,504])
    assert.equal(shouldRetryNativeAgentMode({mode:"owned",status,errorCode:"AGENT_DISABLED"}),false);
  for(const errorCode of ["DATABASE_UNAVAILABLE","RATE_LIMITED","UNAUTHORIZED",null,undefined])
    assert.equal(shouldRetryNativeAgentMode({mode:"device",status:503,errorCode}),false);
  assert.equal(shouldRetryNativeAgentMode({mode:"rules",status:503,errorCode:"AGENT_DISABLED"}),false);
});
test("native downgrade keeps words but not optional model/private permissions",()=>{
  const original={locale:"ru",message:"Привет поговорим",mode:"owned",history:[{role:"user",text:"Привет"}],
    ownedInferenceConsent:true,usePrivateProfile:true,usePrivateHistory:true,useAgentMemory:true,
    chosenAxes:["relationships"],nativeSession:{id:"old",revision:1},
    judgmentChoice:null,feedback:{dismissedIds:[],completedIds:[]}};
  const next=nativeAgentFallbackPayload(original);
  assert.equal(next.mode,"rules");assert.equal(next.ownedInferenceConsent,false);
  assert.equal(next.usePrivateProfile,false);assert.equal(next.usePrivateHistory,false);
  assert.equal(next.useAgentMemory,false);assert.deepEqual(next.chosenAxes,[]);
  assert.equal("nativeSession" in next,false);assert.equal(next.message,original.message);
  assert.deepEqual(next.history,original.history);
  assert.equal(original.mode,"owned");assert.equal(original.ownedInferenceConsent,true);
  assert.equal(nativeAgentFallbackPayload({mode:"rules"}),null);
  assert.equal(nativeAgentFallbackPayload(null),null);
});
test("ordinary unrecognized messages never become an emergency warning",()=>{
  for(const locale of ["ru","en","es"]){
    const reply=aliGentleContinuity({locale,message:"just a question"});
    assert.ok(reply.length>25,locale);
    assert.doesNotMatch(reply,/emergency services|экстренн|emergencia|без нейросети|settings|настройк|model is unavailable|AGENT_DISABLED/i,locale);
    assert.equal((reply.match(/\?/g)||[]).length<=1,true);
  }
  assert.match(aliGentleContinuity({locale:"ru",message:"Привет поговорим"}),/поговорим/i);
  assert.match(aliGentleContinuity({locale:"en",message:"Let's talk"}),/talk/i);
  assert.match(aliGentleContinuity({locale:"es",message:"Quiero hablar"}),/hablar/i);
});
test("short turns keep a gentle continuation without invented facts",()=>{
  const history=[{role:"user",text:"Мне нужна поддержка"},{role:"assistant",text:"Можем обсудить это?"}];
  const reply=aliGentleContinuity({message:"Давайте",locale:"ru",history});
  assert.match(reply,/продолжить/i);
  assert.match(aliGentleContinuity({message:"Мне тревожно",locale:"ru"}),/темпе/);
  assert.match(aliGentleContinuity({message:"Спасибо",locale:"ru"}),/Пожалуйста/);
});
test("action and private access recovery never report a completed operation",()=>{
  assert.equal(aliNeedsVerifiedAction("Хочу записаться"),true);
  assert.equal(aliNeedsVerifiedAction("Оплатить заказ"),true);
  assert.equal(aliNeedsVerifiedAction("Привет поговорим"),false);
  for(const locale of ["ru","en","es"]){
    const action=aliGentleContinuity({locale,message:"book a session"});
    assert.match(action,/не могу подтвердить|can't confirm|no puedo confirmar/);
    const pending=aliGentleContinuity({locale,actionPending:true});
    assert.match(pending,/не могу подтвердить|can't confirm|no puedo confirmarla/);
  }
  const protectedReply=aliGentleContinuity({locale:"ru",message:"Покажи мой отчёт",requiresSignIn:true});
  assert.match(protectedReply,/защищённый вход/);
});
test("Messenger routes technical failures into real bubbles, not manual mode instructions",()=>{
  const s=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(s,/Этот режим пока недоступен\. Выберите «Без нейросети»/);
  assert.match(s,/aliGentleContinuity\(/);
  assert.match(s,/setMessages\(prev=>\[\.\.\.prev,\{role:"assistant" as const,text:answer,provisional:true\}\]/);
  assert.match(s,/remote\.status===503/);
  assert.match(s,/window\.setTimeout\(\(\)=>network\.abort\(\),12000\)/);
  assert.match(s,/window\.clearTimeout\(timeout\)/);
  assert.match(s,/if\(typeof data\?\.reply!=="string"\|\|!data\.reply\.trim\(\)\)/);
  assert.match(s,/newTurns\.slice\(userIndex\+1\)\.some\(turn=>turn\.role==="assistant"&&turn\.provisional!==true\)/);
});
