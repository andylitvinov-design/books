import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWriterRequest, WRITER_BEAT_IDS } from "../lib/holistic-support/meditation-writer/contract.mjs";
import { getLiteraryStyle, LITERARY_TECHNIQUES, ORIGINAL_STYLE_EXAMPLES } from "../lib/holistic-support/meditation-writer/styles.mjs";
import { prepareMeditationCreativeBrief } from "../lib/holistic-support/meditation-writer/brief.mjs";
const safe = focus=>({status:"ready",mode:"self_guided",focus});
const basic=(locale="ru",focus="stress")=>({locale,focus,durationMinutes:10,styleId:"poetic_contained"});
const prepare=(input,options={})=>prepareMeditationCreativeBrief({
  request:input,program:safe(input.focus),
  consent:{resourceImagery:true},...options,
});
test("accept RU/EN/ES choices, preserve intentional negative preferences",()=>{
 for(const locale of ["ru","en","es"]){
  const x=normalizeWriterRequest({...basic(locale),avoidElements:["breath_focus"]});
  assert.equal(x.status,"valid");
  assert.deepEqual([...x.avoidElements],["breath_focus"]);
  assert.equal(Object.keys(ORIGINAL_STYLE_EXAMPLES[locale]).length,4);
  for(const id of Object.keys(ORIGINAL_STYLE_EXAMPLES[locale]))
    assert.equal(getLiteraryStyle(id,locale)?.voiceFriendly,true);
 }
 assert.ok(Object.keys(LITERARY_TECHNIQUES).length>=10);
});
test("reject forged safety, account and consent flags in public request",()=>{
 for(const key of ["safety","access","userId","profile","consent","ownerScoped","clinicalReviewRequired"]){
  assert.equal(normalizeWriterRequest({...basic(),[key]:true}).status,"invalid_input");
 }
 assert.equal(normalizeWriterRequest({...basic(),durationMinutes:60}).status,"invalid_input");
 assert.equal(normalizeWriterRequest({...basic(),avoidElements:["breath_focus","breath_focus"]}).status,"invalid_input");
 assert.equal(normalizeWriterRequest({...basic(),avoidElements:["unknown"]}).status,"invalid_input");
});
test("only self-guided motifs and separately consented resource imagery produce brief",()=>{
 const r=prepare({...basic(),motifId:"gentle_nature",symbolId:"tree"});
 assert.equal(r.status,"brief_ready");
 assert.equal(r.brief.selectedMotifId,"gentle_nature");
 assert.equal(r.brief.symbolId,"tree");
 assert.deepEqual(r.brief.beats.map(b=>b.id),[...WRITER_BEAT_IDS]);
 assert.equal(r.brief.beats.reduce((x,b)=>x+b.allocatedSeconds,0),600);
 assert.equal(r.template.generationMode,"template");
 assert.equal(r.template.audioAssetId,null);
 for(const motifId of ["house","cave","volcano","tree","animal_family"]){
   const x=prepare({...basic(),motifId});
   assert.equal(x.status,"clinician_review_required",motifId);
   assert.equal(x.brief,null);
 }
});
test("fail closed on missing opt-in, no-imagery and unready psychologist program",()=>{
 assert.equal(prepare(basic(),{consent:{resourceImagery:false}}).status,"imagery_consent_required");
 assert.equal(prepare({...basic(),noImagery:true}).status,"unsupported_mode");
 assert.equal(prepare(basic(),{program:{status:"urgent",mode:"self_guided",focus:"stress"}}).status,"human_review_required");
 assert.equal(prepare(basic(),{program:safe("meaning")}).code,"FOCUS_MISMATCH");
});
test("keep clinical symbol and explicit avoidance restrictions",()=>{
 assert.equal(prepare({...basic(),symbolId:"lion"}).status,"symbol_review_required");
 assert.equal(prepare({...basic(),motifId:"small_light",avoidElements:["darkness"]}).status,"preferences_conflict");
 assert.equal(prepare({...basic(),motifId:"gentle_nature",avoidElements:["water"]}).status,"preferences_conflict");
 const safeText=prepare({...basic(),clientPhrase:"Я могу выбирать свой ответ",avoidElements:["breath_focus"]});
 assert.equal(safeText.brief.clientPhrase,"Я могу выбирать свой ответ");
 assert.deepEqual([...safeText.brief.avoidElements],["breath_focus"]);
});
