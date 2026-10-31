import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {QUESTION_REGISTRY} from "../lib/mandala/video-studio-question-registry.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const panel=source("components/mandala-video-parameters.tsx");
const css=source("components/mandala-video-parameters.module.css");
const director=source("components/mandala-cinematic-director.tsx");
const parent=source("components/mandala-free-video-studio.tsx");

test("approved design: 49 canonical questions, exactly 3 EN/RU/ES answers each, no shadow registry",()=>{
  assert.equal(QUESTION_REGISTRY.length,49);
  const groups={principal:9,personalization:10,advanced:11,pro:13,extra:6};
  assert.deepEqual(Object.fromEntries(Object.keys(groups).map(key=>
    [key,QUESTION_REGISTRY.filter(q=>q.group===key).length])),groups);
  assert.ok(QUESTION_REGISTRY.every(q=>q.options.length===3));
  assert.match(panel,/import \{QUESTION_REGISTRY, questionsForDraft\}/);
  assert.match(panel,/data-total-questions=\{questionRegistry.length\}/);
  assert.match(panel,/order:readonly VideoQuestionGroup\[\]=\["principal","personalization","advanced","pro","extra"\]/);
  assert.match(panel,/shortIds\.push\("PERSONAL_06"\)/);
  assert.match(panel,/shortIds\.push\("PERSONAL_07"\)/);
  assert.match(panel,/questionsForDraft\(\{intentText:visualIdea,answers:globalAnswers/);
});
test("approved design: gold accordion, left-side question, three narrow answers to the right",()=>{
  assert.match(panel,/data-video-parameter-group=\{section\}/);
  assert.match(panel,/data-director-question=\{question\.id\}/);
  assert.match(panel,/question\.options\.map\(option=>/);
  assert.match(panel,/aria-pressed=\{answer\?\.confirmed&&answer\.selectedOptionId===option\.id\}/);
  assert.match(panel,/data-video-parameter-show-all=\{section\}/);
  assert.match(panel,/const \[open,setOpen\]=useState\(true\)/);
  assert.match(css,/\.questionGrid\{display:grid;grid-template-columns:minmax\(0,39%\) minmax\(0,61%\)/);
  assert.match(css,/\.answers\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.group\[data-open=true\]\{border-color:#d9ab43/);
  assert.match(css,/@media\(max-width:350px\)/);
  assert.match(css,/focus-visible/);
});
test("parameters are on the main studio page before the collapsed legacy details, without a duplicate editor",()=>{
  assert.equal((parent.match(/<MandalaCinematicDirector /g)||[]).length,1);
  assert.ok(parent.indexOf("<MandalaCinematicDirector")<parent.indexOf("data-video-quick-legacy"));
  assert.match(director,/<MandalaVideoParameters locale=\{locale\}/);
  assert.match(director,/globalAnswers=\{questionAnswers\}/);
  assert.match(director,/sceneAnswers=\{activeSceneAnswers\}/);
  assert.match(director,/onAnswer=\{answerStudioQuestion\}/);
  assert.match(director,/data-director-profile-consent checked=\{profileConsent\}/);
  assert.match(director,/data-director-create-plan/);
  assert.match(director,/data-director-apply-montage/);
  assert.doesNotMatch(panel,/fetch\(|localStorage|sessionStorage|sendBeacon|HEYGEN_API_KEY|OPENAI_API_KEY/);
});
