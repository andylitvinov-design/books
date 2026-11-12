import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildVideoConceptNarrative} from "../lib/mandala/video-concept-narrative.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getMyTubeTopic,listMyTubeScenarios} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {listMyTubeMeaningMotifs} from "../lib/mandala/mytube-meaning-hierarchy.mjs";

test("Narrative derives an editable paragraph from canonical creative choices in each locale",()=>{
  for(const locale of ["ru","en","es"]){
    const c=suggestVideoConcept({locale,goal:locale==="en"?"Love":"Любовь",theme:"relationships"});
    const topic=getMyTubeTopic(c.topicId);
    const scenario=listMyTubeScenarios(c.topicId,locale).find(x=>x.id===c.scenarioId);
    const motif=listMyTubeMeaningMotifs(c.topicId,c.meaningAxisId,locale).find(x=>x.id===c.motifId);
    const input={
      locale,topic:topic.topic.label[locale],mainMessage:c.mainMessage,
      scenario:scenario?.label,motif:motif?.label,emotionalProgram:c.emotionalProgram
    };
    const one=buildVideoConceptNarrative(input);
    assert.equal(one,buildVideoConceptNarrative(input),"deterministic");
    assert.ok(one.length>c.mainMessage.length,"prose expands on a headline");
    assert.ok(one.includes(c.mainMessage),"preserves the user's key idea");
    assert.ok(one.includes(scenario.label),"names the approved scenario");
    assert.ok(one.includes(motif.label),"names the existing motif");
    assert.ok(one.includes(c.emotionalProgram[0]),"describes first emotional stage");
    assert.ok(one.includes(c.emotionalProgram.at(-1)),"describes final emotional stage");
    assert.doesNotMatch(one,/rendered|exported|verified MP4|готовое видео/i,
      "concept prose does not claim footage was already rendered");
  }
});

test("User-controlled strings are normalized and short; no markup injected",()=>{
  const text=buildVideoConceptNarrative({
    locale:"en",topic:"<script>alert(1)</script>",mainMessage:"  Progress\u0000  ",
    scenario:"<b>Story</b>",motif:"Bridge",emotionalProgram:[]
  });
  assert.ok(!text.includes("<"),"no injected markup");
  assert.match(text,/Progress/);
  assert.match(text,/Bridge/);
});

test("Video Studio keeps one canonical concept editor with text saved in approval payload",()=>{
 const source=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
 const parent=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/mandala-video-concept.module.css",import.meta.url),"utf8");
 assert.equal((parent.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(source,/conceptText\?:string/);
 assert.match(source,/const approvedToSave=\{\.\.\.concept,conceptText:narrativeText\}/);
 assert.match(source,/onApprove\(approvedToSave\)/);
 assert.match(parent,/setApprovedVideoConcept\(approved\)/);
 assert.match(source,/data-video-concept-text-edit/);
 assert.match(source,/data-video-concept-text-input/);
 assert.match(source,/setCustom\(\{\.\.\.concept,conceptText:text\}\)/);
 assert.match(source,/data-video-concept-all-parameters/);
 assert.ok(source.indexOf('data-video-concept-text>') <
   source.indexOf('data-video-concept-all-parameters>'));
 assert.equal((source.match(/data-video-concept-main-idea=/g)||[]).length,1);
 assert.match(css,/\.parameterList\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.emotionSteps\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.editor\{grid-template-columns:minmax\(0,1fr\)/);
 assert.doesNotMatch(css,/\.compactGrid\{/);
});


test("Explicit Income Growth and confirmed energy selections outrank stale free text in RU/EN/ES",()=>{
  const profile={
    currentState:"Tired · Tense",desiredState:"Energetic · Joyful · Confident",
    focus:"Freedom · Wholeness · Growth",
    currentIds:["fatigue","tension"],desiredIds:["energetic","joyful","confident"],
    focusIds:["freedom","wholeness","growth"],energyStart:4,energyTarget:6
  };
  for(const locale of ["ru","en","es"]){
    const concept=suggestVideoConcept({locale,goal:"Sex",theme:"relationships",
      selectedTopicId:"income-growth",creativeBrief:"Sex",personalization:profile});
    assert.equal(concept.categoryId,"goals-money");
    assert.equal(concept.subcategoryId,"money-abundance");
    assert.equal(concept.topicId,"income-growth");
    assert.equal(concept.goal,getMyTubeTopic("income-growth").topic.label[locale]);
    assert.equal(concept.semanticConfidence,"explicit");
    assert.equal(concept.meaningAxisId,"freedom");
    assert.equal(concept.motifId,"key");
    assert.equal(concept.styleId,"cinematic");
    assert.equal(concept.energyStart,4);
    assert.equal(concept.energyTarget,6);
    assert.equal(concept.parameters.pace.value,"dynamic");
    assert.equal(concept.parameters.intensity.value,"uplifting");
    assert.match(concept.parameters.visualWorld.value,/real|реаль|reales/i);
    assert.equal(concept.parameters.currentState.value,profile.currentState);
    assert.equal(concept.parameters.desiredState.value,profile.desiredState);
    assert.ok(concept.sceneOutline.some(beat=>/рабоч|работ|work|trabajo/i.test(beat)));
    assert.equal(concept.emotionalProgram.length,4);
    assert.doesNotMatch(concept.mainMessage,/steadiness|стабильност|estabilidad/i);
    const paragraph=buildVideoConceptNarrative({
      locale,topic:concept.goal,mainMessage:concept.mainMessage,
      emotionalProgram:concept.emotionalProgram,
      currentState:concept.parameters.currentState.value,
      desiredState:concept.parameters.desiredState.value,
      pace:concept.parameters.pace.value,energyStart:concept.energyStart,
      energyTarget:concept.energyTarget,durationSeconds:30
    });
    assert.ok(paragraph.includes(concept.mainMessage));
    assert.ok(paragraph.includes("4/10"));
    assert.ok(paragraph.includes("6/10"));
    assert.doesNotMatch(paragraph,/Sex|Finding a little more steadiness/i);
    assert.ok(paragraph.length<550,"one short editable paragraph");
  }
  const strong=suggestVideoConcept({locale:"en",goal:"Sex",theme:"money",
    selectedTopicId:"income-growth",personalization:{...profile,energyTarget:8}});
  const moderate=suggestVideoConcept({locale:"en",goal:"Sex",theme:"money",
    selectedTopicId:"income-growth",personalization:profile});
  assert.notEqual(strong.signature,moderate.signature,"energy changes invalidate approval");
  assert.equal(strong.parameters.intensity.value,"energetic");
  const calm=suggestVideoConcept({locale:"en",goal:"a slow meditation",theme:"money",
    selectedTopicId:"income-growth",creativeBrief:"a slow meditation",personalization:profile});
  assert.equal(calm.topicId,"income-growth");
  assert.equal(calm.parameters.pace.value,"gentle","explicit slow practice remains slow");
});

test("Confirmed screenshot filters form a specific idea before a filmed concept in RU/EN/ES",()=>{
 const locales={
  en:{now:"Tired · Tense · Overwhelmed",desired:"Safe · Energetic · Connected",
   focus:"Connection · Freedom · Dignity",from:/tiredness.*tension.*overwhelm/i,
   toward:/safety.*energy.*connection/i,values:/freedom.*dignity/i},
  ru:{now:"Усталость · Напряжение · Перегрузка",desired:"Безопасность · Энергия · Близость",
   focus:"Связь · Свобода · Достоинство",from:/усталости.*напряжения.*перегрузки/i,
   toward:/безопасности.*энергии.*контакту/i,values:/свободу.*достоинство/i},
  es:{now:"Cansancio · Tensión · Sobrecarga",desired:"Seguridad · Energía · Conexión",
   focus:"Conexión · Libertad · Dignidad",from:/cansancio.*tensión.*sobrecarga/i,
   toward:/seguridad.*energía.*conexión/i,values:/libertad.*dignidad/i}
 };
 for(const locale of ["ru","en","es"]){
  const v=locales[locale];
  const p={currentState:v.now,desiredState:v.desired,focus:v.focus,
   currentIds:["fatigue","tension","overwhelmed"],desiredIds:["safe","energetic","connected"],
   focusIds:["connection","freedom","dignity"],energyStart:4,energyTarget:6};
  const concept=suggestVideoConcept({locale,goal:"Everyday tension",theme:"energy",personalization:p});
  assert.match(concept.mainMessage,v.from);
  assert.match(concept.mainMessage,v.toward);
  assert.match(concept.mainMessage,v.values);
  assert.equal(concept.parameters.pace.value,"dynamic");
  assert.equal(concept.sceneOutline.length,4);
  assert.equal(concept.emotionalProgram.length,4);
  const prose=buildVideoConceptNarrative({locale,topic:"Everyday tension",
   mainMessage:concept.mainMessage,emotionalProgram:concept.emotionalProgram,
   currentState:concept.parameters.currentState.value,
   desiredState:concept.parameters.desiredState.value,
   focus:concept.personalizationFocus,pace:concept.parameters.pace.value,
   energyStart:concept.energyStart,energyTarget:concept.energyTarget,durationSeconds:30});
  assert.ok(prose.startsWith(concept.mainMessage+"."));
  for(const exact of [v.now,v.desired,v.focus,"4/10","6/10"])assert.ok(prose.includes(exact),exact);
  assert.ok(prose.length<700,"a concise editorial paragraph, not raw filters");
  const changed=suggestVideoConcept({locale,goal:"Everyday tension",theme:"energy",
   personalization:{...p,desiredIds:["calm","connected"],desiredState:"Calm · Connected"}});
  assert.notEqual(changed.mainMessage,concept.mainMessage);
 }
 const panel=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/mandala-video-concept.module.css",import.meta.url),"utf8");
 assert.ok(panel.indexOf('data-video-concept-main-idea="true"') <
   panel.indexOf('data-video-concept-text>'));
 assert.ok(panel.indexOf('data-video-concept-text>') <
   panel.indexOf('data-video-concept-all-parameters>'));
 assert.equal((panel.match(/data-video-concept-main-idea=/g)||[]).length,1);
 assert.match(css,/\.mainIdeaCard\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
});
