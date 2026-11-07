import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept,reviseVideoConcept,videoConceptIsValid}
  from "../lib/mandala/auto-video-concept.mjs";
import {getMyTubeTopic,listMyTubeScenarios} from "../lib/mandala/mytube-content-taxonomy.mjs";

test("Auto Concept produces a real canonical taxonomy path in RU/EN/ES without any provider",()=>{
  for(const locale of ["ru","en","es"]){
    for(const theme of ["energy","money","relationships","goals","life","health"]){
      const proposal=suggestVideoConcept({locale,goal:"",theme,styleIndex:0});
      assert.equal(videoConceptIsValid(proposal),true,locale+":"+theme);
      assert.equal(proposal.mediaBindingStatus,"editorial_only_unverified");
      assert.equal(proposal.source,"catalog_example");
      assert.equal(proposal.sceneOutline.length,4);
      assert.equal(proposal.emotionalProgram.length,4);
      assert.equal(proposal.hasPersonalInput,false);
      assert.equal(getMyTubeTopic(proposal.topicId)?.category.id,proposal.categoryId);
    }
  }
});
test("Same user input is deterministic; modified intent changes proposal signature",()=>{
  const a=suggestVideoConcept({locale:"ru",goal:"Хочу спокойствие",theme:"health",styleIndex:0});
  const b=suggestVideoConcept({locale:"ru",goal:"Хочу спокойствие",theme:"health",styleIndex:0});
  const changed=suggestVideoConcept({locale:"ru",goal:"Хочу развитие",theme:"health",styleIndex:0});
  assert.deepEqual(a,b);
  assert.notEqual(changed.signature,a.signature);
  assert.equal(videoConceptIsValid(changed),true);
});
test("Editing applies dependent category/topic/meaning/motif/scenario cascades",()=>{
  const base=suggestVideoConcept({locale:"en",goal:"Calm",theme:"health"});
  const categoryChanged=reviseVideoConcept(base,{categoryId:"goals-money",subcategoryId:"",
    topicId:"",scenarioId:"",motifId:""},"en");
  assert.equal(categoryChanged.categoryId,"goals-money");
  assert.equal(videoConceptIsValid(categoryChanged),true);
  const meaningChanged=reviseVideoConcept(categoryChanged,{meaningAxisId:"growth",
    motifId:""},"en");
  assert.equal(meaningChanged.meaningAxisId,"growth");
  assert.equal(videoConceptIsValid(meaningChanged),true);
  const scenario=listMyTubeScenarios(meaningChanged.topicId,"en")[1];
  const selected=reviseVideoConcept(meaningChanged,{scenarioId:scenario.id},"en");
  assert.equal(selected.scenarioId,scenario.id);
  assert.deepEqual(selected.sceneOutline,scenario.sceneOutline);
  assert.equal(videoConceptIsValid(selected),true);
});
test("Concept never claims video exists; unsupported IDs are rejected",()=>{
  const p=suggestVideoConcept({locale:"es",goal:"Quiero energía",theme:"energy"});
  assert.equal(p.mediaBindingStatus,"editorial_only_unverified");
  assert.equal(videoConceptIsValid({...p,scenarioId:"invented"}),false);
  assert.equal(videoConceptIsValid({...p,motifId:"invented"}),false);
});
test("Montage still owns the original single editor and verifies guest approval UX",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const concept=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-video-concept.module.css",import.meta.url),"utf8");
  assert.match(source,/data-video-montage-concept/);
  assert.match(source,/\{id:"effects",Icon:Sparkles\},\{id:"audio",Icon:Music2\}/);
  assert.match(source,/\{id:"concept",Icon:Brain\},\{id:"settings",Icon:SlidersHorizontal\}/);
  assert.match(source,/data-video-concept-text-tools/);
  assert.match(source,/data-video-montage-text/);
  assert.match(source,/MandalaMultiTrackTimeline/);
  assert.match(source,/setMontagePanel\("audio"\)/);
  assert.match(source,/onApprove=\{approved=>/);
  assert.match(source,/approvedConcept=\{approvedVideoConcept\}/);
  assert.match(source,/setApprovedVideoConcept\(approved\)/);
  assert.match(concept,/approvedConcept\?\.signature===concept\.signature/);
  assert.doesNotMatch(source,/data-video-montage-tab="text"/);
  assert.match(concept,/data-video-concept-approve/);
  assert.match(concept,/data-video-concept-edit/);
  assert.match(concept,/if\(signedIn\)setEditing\(true\);else setLoginOpen\(true\)/);
  assert.match(concept,/data-video-concept-signin/);
  assert.match(concept,/data-video-concept-auth-overlay/);
  assert.match(concept,/data-video-concept-check-login/);
  assert.match(concept,/aria-modal="true"/);
  assert.match(concept,/target="_blank"/);
  assert.match(css,/@media\(max-width:359px\)/);
  assert.match(css,/safe-area-inset-bottom/);
});
