import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prepareNaturalDialogue, finishNaturalDialogue} from "../lib/holistic-support/natural-dialogue.mjs";
import {generateOwnedOllama} from "../lib/holistic-support/owned-ollama.mjs";

const base={
  channel:"owned", access:{authenticated:true,ownerScoped:true},
  consent:{ownedInference:true}, decision:{status:"clarify",message:"Could you clarify?",suggestions:[]},
};
test("Secretary and Coach use one approved model path with different server prompts",async()=>{
  const secretary=prepareNaturalDialogue({...base,locale:"ru",message:"Сколько стоит консультация?"});
  const coach=prepareNaturalDialogue({...base,locale:"en",message:"I feel stuck with my goal"});
  assert.equal(secretary.mindRole,"secretary");
  assert.equal(coach.mindRole,"coach");
  assert.equal(secretary.modelAllowed,true);
  assert.equal(coach.modelAllowed,true);
  assert.match(secretary.modelRequest.messages[0].content,/Secretary Mind/);
  assert.match(coach.modelRequest.messages[0].content,/Coach Mind/);
  assert.match(secretary.modelRequest.messages[0].content,/Respond in Russian/);
  assert.match(coach.modelRequest.messages[0].content,/Respond in English/);
  const sent=[];
  const model="hh-qwen3-test:latest";
  for(const envelope of [secretary,coach]){
    const generated=await finishNaturalDialogue(envelope,request=>generateOwnedOllama(request,{
      endpoint:"https://models.example.test/api/chat",model,
      bearerToken:"server-only-token-placeholder-1234567890",
      fetcher:async(url,options)=>{
        assert.equal(url,"https://models.example.test/api/chat");
        sent.push(JSON.parse(options.body));
        return {ok:true,json:async()=>({message:{content:"A short safe answer."}})};
      },
    }));
    assert.equal(generated.modelUsed,true);
  }
  assert.equal(sent.length,2);
  assert.deepEqual(sent.map(x=>x.model),[model,model]);
  assert.equal(sent[0].messages[0].role,"system");
  assert.equal(sent[1].messages[0].role,"system");
  assert.ok(sent.every(x=>x.think===false&&x.stream===false));
});

test("roles cannot unlock an unconsented owned request or add confidential memory",()=>{
  const noConsent=prepareNaturalDialogue({...base,locale:"en",message:"I feel stuck",consent:{}});
  assert.equal(noConsent.mindRole,"coach");
  assert.equal(noConsent.modelAllowed,false);
  const note=prepareNaturalDialogue({...base,locale:"en",message:"I feel stuck",
    memory:{medicalNote:"PRIVATE_CLINICAL_DETAIL",preferredName:"Sasha"}});
  assert.doesNotMatch(JSON.stringify(note.modelRequest),/PRIVATE_CLINICAL_DETAIL|Sasha/);
  const es=prepareNaturalDialogue({...base,locale:"es",message:"Hola"});
  assert.equal(es.mindRole,"general");
  assert.doesNotMatch(es.modelRequest.messages[0].content,/Secretary Mind|Coach Mind/);
});

test("server route derives the selected role without accepting a client-supplied model",()=>{
  const route=readFileSync(new URL("../app/api/holistic-agent/turn/route.js",import.meta.url),"utf8");
  assert.match(route,/selectedGoal:goal,/);
  assert.match(route,/model:process\.env\.HH_AGENT_OLLAMA_MODEL/);
  assert.doesNotMatch(route,/body\.(?:model|mindRole|agentModel)/);
});
