import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const landing=read("components/app/messenger-ai-landing.tsx");
const quiz=read("components/app/messenger-support-quiz.tsx");
const chat=read("components/holistic-agent-chat.tsx");
const css=read("components/app/messenger-support-quiz.module.css");

test("Get support opens the existing Ali chat quiz, not an external service page",()=>{
  assert.match(landing,/id:"support"/);
  assert.match(landing,/onSupport/);
  assert.match(chat,/onSupport=\{openSupportQuiz\}/);
  assert.match(chat,/<MessengerSupportQuiz locale=\{locale\}/);
  assert.match(chat,/data-hh-support-context/);
  assert.match(chat,/setSupportQuizOpen\(false\)/);
  assert.doesNotMatch(quiz,/fetch\(|localStorage|sessionStorage|window\.location/);
});

test("exactly four owner-approved categories precede need and conversation mode",()=>{
  for(const label of [
    "Ease stress & restore energy","Improve relationships & esteem",
    "Get money & self growth ideas","Get business support",
  ])assert.ok(quiz.includes(label),label);
  for(const id of ["stress","relationships","money","business"])
    assert.match(quiz,new RegExp('id:"'+id+'"'));
  assert.match(quiz,/setStep\("need"\)/);
  assert.match(quiz,/setStep\("mode"\)/);
  assert.match(quiz,/step==="category"/);
  assert.match(quiz,/step==="need"/);
  assert.match(quiz,/step==="mode"/);
  assert.match(quiz,/if\(!category\|\|!need\)return/);
  assert.match(quiz,/data-hh-support-mode=\{id\}/);
  assert.match(quiz,/onFinish\(\{category,categoryLabel:/);
});

test("RU EN ES parity, consent and reset boundaries are preserved",()=>{
  for(const locale of ["en","ru","es"])
    assert.match(quiz,new RegExp("\\b"+locale+":\\{"));
  for(const mode of ["secretary","coach","talk"])
    assert.ok(quiz.includes(mode),mode);
  assert.match(quiz,/not a human therapist/);
  assert.match(quiz,/не живой психотерапевт/);
  assert.doesNotMatch(chat,/validatedPsychologistConsent:true/);
  assert.match(chat,/supportQuizOpen\?<MessengerSupportQuiz/);
  assert.match(chat,/setSupportSelection\(null\)/);
  assert.match(chat,/selectedGoal:!leaveSupport&&supportSelection\?\.mode==="coach"/);
  assert.match(css,/\.categories\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("modified components transpile without TS/JSX syntax errors",()=>{
  for(const path of [
    "components/app/messenger-support-quiz.tsx",
    "components/app/messenger-ai-landing.tsx",
    "components/holistic-agent-chat.tsx",
  ]){
    const out=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,
        module:ts.ModuleKind.ESNext}});
    assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
      .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[],path);
  }
});
