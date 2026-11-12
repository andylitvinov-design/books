import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  sessionGoalChoices,sessionCopy,sessionGoalForText,sessionOfferIds,sessionOfferDescription,
} from "../lib/holistic-support/session-goal-intake.mjs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Sessions asks about the goal before any service cards are visible",()=>{
 const projects=read("components/app/messenger-six-projects.tsx");
 const agent=read("components/holistic-agent-chat.tsx");
 for(const prompt of ["What would you like to work on","С какой ситуацией вы хотите поработать","¿Qué situación te gustaría trabajar"])
   assert.ok(projects.includes(prompt),prompt);
 assert.match(agent,/projectFlow==="sessions"&&sessionStep==="goal"/);
 assert.match(agent,/projectFlow!=="sessions"/);
 assert.match(agent,/data-hh-session-goal-options/);
 assert.match(agent,/data-hh-session-offers/);
 assert.match(agent,/sessionOfferIds\(goal\)/);
 assert.match(agent,/requiresProtectedReply\(text,turnLocale\)/);
});

test("goal and expected outcome are collected before linking to matching offers",()=>{
 for(const locale of ["en","ru","es"]){
   assert.equal(sessionGoalChoices(locale).length,4);
   assert.equal(new Set(sessionGoalChoices(locale).map(item=>item.id)).size,4);
   assert.ok(sessionCopy(locale).detail.length>40);
   assert.ok(sessionCopy(locale).offersLabel);
   for(const id of ["free-review","imagery","constellations","business"])
     assert.ok(sessionOfferDescription(locale,id).length>10);
 }
 assert.equal(sessionGoalForText("Хочу разобраться в отношениях с мамой"),"relationships");
 assert.equal(sessionGoalForText("Need to decide on a new business team"),"business");
 assert.equal(sessionGoalForText("Siento ansiedad y estrés"),"wellbeing");
 assert.equal(sessionGoalForText("What is my next personal choice?"),"personal");
 assert.equal(sessionGoalForText("hello"),null);
 assert.equal(sessionGoalForText("I want to work with my mother"),"relationships");
 assert.equal(sessionGoalForText("Хочу поработать над отношениями"),"relationships");
 assert.equal(sessionGoalForText("Quiero trabajar la ansiedad"),"wellbeing");
 assert.deepEqual(sessionOfferIds("business"),["business","free-review"]);
 assert.deepEqual(sessionOfferIds("relationships"),["constellations","imagery","free-review"]);
 assert.deepEqual(sessionOfferIds("wellbeing"),["free-review","imagery"]);
 assert.deepEqual(sessionOfferIds("personal"),["free-review","imagery"]);
});

test("every in-dialogue option group is one horizontal card per row",()=>{
 const css=read("components/holistic-agent-chat.module.css");
 assert.match(css,/\.projectOptions\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.topicChoices\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.videoEditOptions\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.videoPhraseFilters fieldset>div\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.judgmentChoices \{[^}]*flex-direction:column/);
 assert.match(css,/\.projectOptions a:focus-visible/);
});
