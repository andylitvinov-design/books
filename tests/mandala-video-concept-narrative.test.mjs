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
