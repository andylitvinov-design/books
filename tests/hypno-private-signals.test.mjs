import test from "node:test";
import assert from "node:assert/strict";
import {resolvePrivateHypnoCodes} from "../lib/mandala/hypno-private-signals.mjs";
test("private note signal mapping in all supported languages",()=>{
  const ex=[
    {locale:"ru",theme:"relationships",problemNote:"Боюсь критики",
      goalNote:"Хочу уметь говорить о своих границах",problemIndex:2,goalId:"dialogue",
      expectedIssue:0,expectedGoal:"boundaries"},
    {locale:"en",theme:"energy",problemNote:"I am always rushing",
      goalNote:"I need to rest more",problemIndex:0,goalId:"strength",
      expectedIssue:2,expectedGoal:"recovery"},
    {locale:"es",theme:"goals",problemNote:"Tengo miedo al fracaso",
      goalNote:"Quiero avanzar poco a poco",problemIndex:0,goalId:"clarity",
      expectedIssue:2,expectedGoal:"progress"},
  ];
  for(const e of ex){
    const found=resolvePrivateHypnoCodes(e);
    assert.equal(found.problemIndex,e.expectedIssue);
    assert.equal(found.goalId,e.expectedGoal);
    assert.equal(found.rawTextShared,false);
    assert.equal(found.privateDescriptionInterpreted,true);
    assert.equal(JSON.stringify(found).includes(e.problemNote),false);
  }
});
test("ambiguous notes preserve explicit client selections",()=>{
  const found=resolvePrivateHypnoCodes({locale:"ru",theme:"energy",
    problemNote:"Я устал из-за спешки",goalNote:"Хочу и отдых, и энергию",
    problemIndex:0,goalId:"rhythm"});
  assert.equal(found.problemIndex,0);
  assert.equal(found.goalId,"rhythm");
  assert.equal(found.privateDescriptionInterpreted,false);
});
test("invalid theme/code combinations fail closed",()=>{
  for(const input of [
    {locale:"ru",theme:"money",problemIndex:0,goalId:"connection"},
    {locale:"ru",theme:"energy",problemIndex:99,goalId:"recovery"},
    {locale:"xx",theme:"health",problemIndex:0,goalId:"rhythm"},
  ])assert.throws(()=>resolvePrivateHypnoCodes(input),/HYPNO_PRIVATE_CODES_INVALID/);
});
