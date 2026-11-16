import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept,videoConceptIsValid} from "../lib/mandala/auto-video-concept.mjs";
import {VIDEO_CONCEPT_FIELD_LABELS,VIDEO_CONCEPT_REVIEW_FIELD_IDS,
  buildConceptShotSketch} from "../lib/mandala/video-concept-semantic.mjs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("generic LOVE, Любовь, Amor never infer a breakup or unrequited feelings",()=>{
  for(const [locale,goal] of [["en","Love"],["ru","Любовь"],["es","Amor"]]){
    const concept=suggestVideoConcept({locale,goal,theme:"energy",
      phrases:["Breakup and longing after a difficult goodbye"]});
    assert.equal(concept.categoryId,"love-relationships",locale);
    assert.equal(concept.topicId,"emotional-intimacy",locale);
    assert.equal(concept.semanticConfidence,"low",locale);
    assert.equal(concept.semanticPurpose,"reflection",locale);
    assert.equal(concept.inferredTopic,false,locale);
    assert.equal(concept.parameters.currentState.status,"unknown",locale);
    assert.equal(concept.parameters.desiredState.status,"unknown",locale);
    assert.equal(videoConceptIsValid(concept),true,locale);
  }
});

test("confirmed personalization fills factual fields and changes approval signature",()=>{
  const goal="Love";
  const base=suggestVideoConcept({locale:"en",goal,theme:"relationships"});
  const personalized=suggestVideoConcept({
    locale:"en",goal,theme:"relationships",
    personalization:{currentState:"Lonely",desiredState:"Connected",focus:"Mutual care"}
  });
  assert.equal(personalized.parameters.currentState.value,"Lonely");
  assert.equal(personalized.parameters.currentState.status,"extracted");
  assert.equal(personalized.parameters.currentState.source,"personalization");
  assert.equal(personalized.parameters.desiredState.value,"Connected");
  assert.equal(personalized.parameters.desiredState.source,"personalization");
  assert.equal(personalized.personalizationFocus,"Mutual care");
  assert.notEqual(personalized.signature,base.signature);
  assert.equal(videoConceptIsValid(personalized),true);
  assert.equal(suggestVideoConcept({locale:"en",goal,theme:"relationships",
    personalization:{currentState:"Lonely",desiredState:"Connected",focus:"Mutual care"}
  }).signature,personalized.signature);
});

test("explicit client statement outranks lower-priority personalization",()=>{
  const concept=suggestVideoConcept({locale:"en",theme:"relationships",
    goal:"I want gentle closeness. Now I feel lonely.",
    personalization:{currentState:"Angry",desiredState:"Confused",focus:"Love"}
  });
  assert.match(concept.parameters.currentState.value,/feel lonely/);
  assert.equal(concept.parameters.currentState.source,"goal");
  assert.equal(concept.parameters.desiredState.value,"gentle closeness");
  assert.equal(concept.parameters.desiredState.source,"goal");
});

test("compact creative review hides legacy technical ownership and unspecified fields",()=>{
  assert.equal(VIDEO_CONCEPT_FIELD_LABELS.length,38,
    "old saved drafts and external integration remain backwards compatible");
  assert.ok(VIDEO_CONCEPT_REVIEW_FIELD_IDS.length>=10 &&
    VIDEO_CONCEPT_REVIEW_FIELD_IDS.length<=20);
  assert.equal(new Set(VIDEO_CONCEPT_REVIEW_FIELD_IDS).size,
    VIDEO_CONCEPT_REVIEW_FIELD_IDS.length);
  for(const key of ["references","delivery","timelineBinding","creationMode",
    "wordsAndVoice","soundtrack","categoryId","topicId","visualActions","beats"]){
    assert.equal(VIDEO_CONCEPT_REVIEW_FIELD_IDS.includes(key),false,key);
  }
  const panel=read("components/mandala-video-concept.tsx");
  const studio=read("components/mandala-free-video-studio.tsx");
  assert.ok(panel.includes('field.status!=="unknown"'));
  assert.ok(panel.includes("data-video-concept-all-parameters"));
  assert.ok(!panel.includes("All 38 parameters"));
  assert.ok(panel.includes("data-video-concept-shot-sketch"));
  assert.ok(studio.includes("ideasProfileConfirmed?ideasProfile:null"));
  assert.ok(studio.includes("setIdeasProfileConfirmed(true)"));
});

test("thirty second concept sketches exactly six timed five-second shots, never fake footage",()=>{
  const concept=suggestVideoConcept({locale:"en",goal:"Love",theme:"relationships"});
  const shots=buildConceptShotSketch(concept,30);
  assert.equal(shots.length,6);
  assert.equal(new Set(shots.map(x=>x.number)).size,6);
  assert.deepEqual(shots.map(x=>[x.startSeconds,x.endSeconds]),[
    [0,5],[5,10],[10,15],[15,20],[20,25],[25,30]
  ]);
  assert.deepEqual(shots.map(x=>x.stageIndex),[0,0,1,2,2,3]);
  assert.deepEqual(shots.map(x=>x.shotKind),[0,1,2,3,4,5]);
  assert.ok(shots.every(x=>x.sourceVerified===false));
});
