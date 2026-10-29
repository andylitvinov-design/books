import test from "node:test";
import assert from "node:assert/strict";
import { AGENT_MEMORY_VERSION,AGENT_MEMORY_KEYS,validateMemoryPreference,approvedMemoryForLocalPrompt,applyAgentMemoryForTurn } from "../lib/holistic-support/agent-memory-policy.mjs";
import {prepareLocalConversation} from "../lib/holistic-support/local-conversation-contract.mjs";
test("only explicitly permitted keys and bounded values are saved",()=>{
 assert.equal(AGENT_MEMORY_VERSION,"hh-agent-memory-v1");
 assert.deepEqual(AGENT_MEMORY_KEYS,["preferred_name","communication_style","response_length","avoid_format","personal_accent"]);
 assert.equal(validateMemoryPreference("preferred_name","  Оля  "),"Оля");
 assert.equal(validateMemoryPreference("response_length","short"),"short");
 assert.equal(validateMemoryPreference("avoid_format","video"),"video");
 assert.equal(validateMemoryPreference("diagnosis","anything"),null);
 assert.equal(validateMemoryPreference("communication_style","super friendly"),null);
});
test("invalid or potentially secret preference strings fail closed",()=>{
 for(const value of ["https://example.org","a@example.com","<script>x</script>","sk-topsecretkey","A".repeat(161)]){
  assert.equal(validateMemoryPreference("personal_accent",value),null,value);
 }
 assert.equal(validateMemoryPreference("preferred_name","N".repeat(61)),null);
});
test("only whitelisted explicit preferences reach browser-model context",()=>{
 const items=approvedMemoryForLocalPrompt([
  {kind:"preferred_name",value:"Alex"},
  {kind:"personal_accent",value:"Use simple words"},
  {kind:"medical_history",value:"diagnosis details"},
  {kind:"preferred_name",value:"Second name"},
 ]);
 assert.deepEqual(items,[{kind:"preferred_name",value:"Alex"},{kind:"personal_accent",value:"Use simple words"}]);
 const request=prepareLocalConversation({
  history:[],currentMessage:"I need some calm.",
  decision:{status:"clarify",state:{locale:"en",topic:"energy",excluded:[]}},
  memory:items,
 });
 assert.deepEqual(request.memory,items);
 assert.equal(JSON.stringify(request).includes("diagnosis details"),false);
});
test("without opt-in memory remains absent from local conversation",()=>{
 const request=prepareLocalConversation({
  currentMessage:"I need help.",decision:{status:"clarify",state:{locale:"en"}},
 });
 assert.deepEqual(request.memory,[]);
});

test("saved preferences affect only a derived turn state, never the ongoing state",()=>{
 const previous={version:"holistic-language-2.1",address:"neutral",brevity:"normal",excluded:[],topic:"energy",format:"video"};
 const memory=[{kind:"response_length",value:"short"},{kind:"communication_style",value:"informal"},
   {kind:"avoid_format",value:"video"}];
 const effective=applyAgentMemoryForTurn(previous,memory);
 assert.equal(effective.brevity,"short");
 assert.equal(effective.address,"informal");
 assert.deepEqual(effective.excluded,["video"]);
 assert.deepEqual(previous.excluded,[]);
 assert.equal(previous.address,"neutral");
 assert.equal(applyAgentMemoryForTurn(previous,[]),previous);
});
test("explicit current dialogue style takes priority over saved memory",()=>{
 const previous={address:"formal",brevity:"detailed",excluded:["audio"]};
 const effective=applyAgentMemoryForTurn(previous,[
  {kind:"communication_style",value:"informal"},{kind:"response_length",value:"short"},
  {kind:"avoid_format",value:"video"},
 ]);
 assert.equal(effective.address,"formal");assert.equal(effective.brevity,"detailed");
 assert.deepEqual(effective.excluded,["audio","video"]);
});
