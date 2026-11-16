import test from "node:test";
import assert from "node:assert/strict";
import {buildMandalaWriterRequest} from "../lib/holistic-support/meditation-writer/mandala-bridge.mjs";
import {normalizeWriterRequest} from "../lib/holistic-support/meditation-writer/contract.mjs";
import {resolveMeditationClientIntent} from "../lib/holistic-support/meditation-writer/intent-codes.mjs";

const THEMES=["energy","money","relationships","goals","life","health"];
const LOCALES=["ru","en","es"];
test("six site directions and all three locales produce a valid owned Writer request",()=>{
 for(const locale of LOCALES)for(const theme of THEMES){
  const response=buildMandalaWriterRequest({locale,theme,
   selectedGoals:[theme]});
  assert.equal(response.status,"ready",locale+" "+theme);
  assert.equal(response.externalProviderCalled,false);
  assert.equal(response.resourceImageryConsent,false);
  assert.equal(response.externalModelConsent,false);
  assert.equal(response.privateNotesAvailableToExternalFreeModel,false);
  assert.equal(normalizeWriterRequest(response.request).status,"valid");
  const check=resolveMeditationClientIntent(response.request);
  assert.equal(check.request.focus,response.request.focus);
  assert.equal(check.request.intentionCode,response.request.intentionCode);
  assert.equal(response.request.mode,"resource");
 }
});
test("four explicitly selected states override broad theme without guessing diagnosis",()=>{
 const wanted={calm:["stress","settle"],energy:["stress","support"],
  support:["stress","support"],connection:["relationships","relationships"]};
 for(const [state,[focus,goal]] of Object.entries(wanted)){
  const response=buildMandalaWriterRequest({
    locale:"ru",theme:"money",selectedState:state});
  assert.equal(response.status,"ready");
  assert.equal(response.request.focus,focus);
  assert.equal(response.request.intentionCode,goal);
 }
});
test("vector requires current and desired fields but never sends notes without consent",()=>{
 const sensitive="PRIVATE_CLIENT_NOTE_XYZ";
 for(const input of [{currentState:"",desiredState:"calm"},
    {currentState:"tense",desiredState:""}]){
  assert.equal(buildMandalaWriterRequest({locale:"en",theme:"energy",
    focusMode:"vector",...input}).reason,"VECTOR_NEEDS_BOTH_STATES");
 }
 const result=buildMandalaWriterRequest({
  locale:"en",theme:"energy",focusMode:"vector",
  currentState:sensitive,desiredState:"I want a calmer day"});
 assert.equal(result.status,"ready");
 assert.equal(result.privateNotesSentToFirstParty,false);
 assert.ok(!JSON.stringify(result).includes(sensitive));
 assert.ok(!Object.hasOwn(result.request,"problemFrame"));
 assert.ok(!Object.hasOwn(result.request,"desiredExperience"));
 assert.equal(normalizeWriterRequest(result.request).status,"valid");
});
test("optional personal notes are for same-origin server only, bounded to writer contract",()=>{
 const result=buildMandalaWriterRequest({locale:"es",theme:"relationships",
  focusMode:"vector",currentState:"a".repeat(500),
  desiredState:"b".repeat(300),allowPersonalNotes:true});
 assert.equal(result.status,"ready");
 assert.equal(result.privateNotesSentToFirstParty,true);
 assert.equal(result.request.problemFrame.length,350);
 assert.equal(result.request.desiredExperience.length,180);
 assert.equal(normalizeWriterRequest(result.request).status,"valid");
 assert.equal(Object.hasOwn(result.request,"externalModelOptIn"),false);
 assert.equal(Object.hasOwn(result.request,"resourceImageryOptIn"),false);
});
test("invalid goals, providers, control characters and hidden activation fail closed",()=>{
 const base={locale:"ru",theme:"energy",selectedState:"calm"};
 const bad=[
  {locale:"xx"},{theme:"unknown"},{selectedState:"trauma"},
  {selectedGoals:["__proto__"]},{selectedGoals:["money","health","goals","energy"]},
  {focusMode:"clinical"},{avoidElements:["emdr"]},
  {avoidElements:["water","water"]},{durationMinutes:3},
  {styleId:"hypnosis"},{allowPersonalNotes:"yes"},
  {currentState:"unsafe\u0001input"},
 ];
 for(const input of bad)assert.equal(
  buildMandalaWriterRequest({...base,...input}).status,"invalid",
  JSON.stringify(input));
 assert.equal(buildMandalaWriterRequest({locale:"ru",theme:"energy"}).status,"invalid");
});
test("goals are not literal money or health outcomes; approved nonclinical codes only",()=>{
 for(const theme of ["money","health"]){
  const response=buildMandalaWriterRequest({locale:"ru",theme,selectedGoals:[theme]});
  assert.equal(response.status,"ready");
  assert.ok(["meaning","stress"].includes(response.request.focus));
  assert.ok(["goals","settle"].includes(response.request.intentionCode));
  assert.equal(response.request.clientPhrase,undefined);
  assert.equal(response.request.problemFrame,undefined);
 }
});
