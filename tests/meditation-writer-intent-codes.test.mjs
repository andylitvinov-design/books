import test from "node:test";
import assert from "node:assert/strict";
import {resolveMeditationClientIntent} from "../lib/holistic-support/meditation-writer/intent-codes.mjs";
test("Auto extracts only approved safe codes in RU/EN/ES",()=>{
 const cases=[
  {locale:"ru",problemFrame:"Мне трудно с личными границами",desiredExperience:"Хочу уважать границы",focus:"relationships",goal:"boundaries"},
  {locale:"en",problemFrame:"I feel stress after work",desiredExperience:"I want to feel calm",focus:"stress",goal:"settle"},
  {locale:"es",problemFrame:"Me cuesta encontrar sentido",desiredExperience:"Busco claridad",focus:"meaning",goal:"clarity"},
 ];
 for(const t of cases){
   const r=resolveMeditationClientIntent({locale:t.locale,focus:"auto",intentionCode:"auto",
     problemFrame:t.problemFrame,desiredExperience:t.desiredExperience});
   assert.equal(r.decision.focusCode,t.focus);
   assert.equal(r.decision.goalCode,t.goal);
   assert.equal(r.decision.personallyIdentifyingDataShared,false);
   assert.equal(JSON.stringify(r.decision).includes(t.problemFrame),false);
 }
});
test("Manual focus takes priority and ambiguity becomes honest generic default",()=>{
 const manual=resolveMeditationClientIntent({locale:"ru",focus:"relationships",
   intentionCode:"boundaries",problemFrame:"стресс"});
 assert.equal(manual.decision.focusCode,"relationships");
 assert.equal(manual.decision.goalCode,"boundaries");
 assert.equal(manual.decision.origin,"explicit_focus");
 const generic=resolveMeditationClientIntent({locale:"ru",focus:"auto",
   intentionCode:"auto",problemFrame:"Нечто новое"});
 assert.equal(generic.decision.origin,"general_default");
 assert.equal(generic.request.focus,"stress");
});
test("Reject unknown locale and incompatible explicit goal",()=>{
 assert.throws(()=>resolveMeditationClientIntent({locale:"xx",focus:"auto"}));
 assert.throws(()=>resolveMeditationClientIntent({locale:"ru",focus:"relationships",intentionCode:"confidence"}));
});
