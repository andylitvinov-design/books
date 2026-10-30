import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPsychologyProgram, PSYCHOLOGIST_METHODS } from
  "../lib/holistic-support/psychologist-mind.mjs";
import { PSYCHOLOGY_VIDEO_SKILLS } from
  "../lib/holistic-support/psychologist-video-curricula.mjs";
import {
  selectMeditationPractice, enhanceMeditationTemplateWithPractice,
  MEDITATION_PRACTICE_DIRECTOR_VERSION,
} from "../lib/holistic-support/meditation-writer/practice-director.mjs";
import { prepareMeditationCreativeBrief } from
  "../lib/holistic-support/meditation-writer/brief.mjs";
import { anonymizeMeditationBrief } from
  "../lib/holistic-support/meditation-writer/free-gemini.mjs";
import { writeMeditationDraft } from
  "../lib/holistic-support/meditation-writer/writer.mjs";

const rawProgram=(focus,locale="ru")=>buildPsychologyProgram({
  locale,safety:{status:"clear"},intent:{focus},consent:{resourceImagery:true},
});
const request=(focus,intentionCode,locale="ru")=>({
  locale,focus,intentionCode,durationMinutes:10,
  motifId:"comfortable_corner",styleId:"gentle_simple",
});
const plan=(focus,goal,locale="ru",extra={})=>prepareMeditationCreativeBrief({
  program:rawProgram(focus,locale),
  request:{...request(focus,goal,locale),...extra},
  consent:{resourceImagery:true},
});
test("approved, distinct practical skills are chosen for real user goals",()=>{
  for(const [focus,goal,expected] of [
    ["stress","settle","present_orientation"],
    ["relationships","boundaries","boundary_rehearsal"],
    ["self_worth","confidence","self_compassion"],
    ["meaning","meaning","values_clarification"],
    ["stress","clarity","thought_reflection"],
  ]){
    const chosen=selectMeditationPractice({program:rawProgram(focus),
      locale:"ru",goal});
    assert.equal(chosen.status,"ready");
    assert.equal(chosen.practice.methodId,expected);
    assert.equal(chosen.practice.version,MEDITATION_PRACTICE_DIRECTOR_VERSION);
    assert.equal(PSYCHOLOGIST_METHODS[expected].selfGuided,true);
    assert.equal(chosen.practice.clinicalProtocol,false);
    assert.equal(chosen.practice.efficacyClaim,false);
  }
});
test("three languages have real, concrete steps and an optional transfer action",()=>{
  for(const locale of ["ru","en","es"]){
    const result=plan("relationships","boundaries",locale);
    assert.equal(result.status,"brief_ready");
    assert.equal(result.brief.practice.methodId,"boundary_rehearsal");
    assert.equal(result.brief.practice.steps.length,3);
    assert.equal(result.brief.practice.transferAction,
      PSYCHOLOGY_VIDEO_SKILLS.boundary_rehearsal.steps[locale][2]);
    assert.equal(result.template.segments.length,7);
    assert.ok(result.template.segments.find(x=>x.id==="supportive_choice")
      .text.includes(result.brief.practice.steps[1]));
    assert.ok(result.template.segments.find(x=>x.id==="closing")
      .text.includes(result.brief.practice.transferAction));
    assert.ok(result.template.script.includes(result.brief.practice.transferAction));
    assert.ok(result.brief.beats.find(x=>x.id==="supportive_choice").practiceCue);
    assert.ok(result.brief.beats.find(x=>x.id==="closing").transferCue);
    assert.equal(result.template.audioAssetId,null);
    assert.equal(result.template.rendered,false);
  }
});
test("practical selection respects user avoidances and cannot force people interaction",()=>{
  const selected=selectMeditationPractice({program:rawProgram("relationships"),
    goal:"boundaries",locale:"ru",avoidElements:["people"]});
  assert.equal(selected.status,"ready");
  assert.notEqual(selected.practice.methodId,"boundary_rehearsal");
  assert.notEqual(selected.practice.methodId,"resource_inventory");
  assert.notEqual(selected.practice.methodId,"self_compassion");
  assert.equal(selected.practice.explanationCode,"safe_allowed_fallback");
});
test("the practitioner never receives a self-guided clinical procedure",()=>{
  const never=["emdr_processing","cpt_trauma_processing","exposure_processing","kip_clinical"];
  for(const focus of ["stress","relationships","self_worth","meaning"]){
    for(const goal of ["settle","support","clarity","boundaries","relationships",
      "confidence","meaning","goals"]){
      const chosen=selectMeditationPractice({program:rawProgram(focus),goal});
      assert.equal(chosen.status,"ready");
      assert.equal(chosen.practice.needsExplicitStart,true);
      assert.equal(chosen.practice.saveRequiresConsent,true);
      assert.ok(!never.includes(chosen.practice.methodId));
    }
  }
});
test("a practitioner draft or unready program cannot produce an exercise",()=>{
  const no=selectMeditationPractice({program:{status:"human_review_required",
    mode:"self_guided",focus:"relationships"}});
  assert.equal(no.status,"not_eligible");
  const clinician=selectMeditationPractice({program:{status:"clinician_draft",
    mode:"practitioner_draft",focus:"relationships"}});
  assert.equal(clinician.status,"not_eligible");
});
test("session alignment uses only methods actually approved for this session",()=>{
  const program=rawProgram("relationships");
  const sessionFour=selectMeditationPractice({program,goal:"boundaries",sessionNumber:4});
  assert.equal(sessionFour.status,"ready");
  assert.equal(sessionFour.practice.methodId,"boundary_rehearsal");
  const sessionOne=selectMeditationPractice({program,goal:"boundaries",sessionNumber:1});
  assert.equal(sessionOne.status,"ready");
  assert.ok(program.sessions[0].methodIds.includes(sessionOne.practice.methodId));
  for(const index of [0,9,1.5,-2])assert.equal(
    selectMeditationPractice({program,sessionNumber:index}).status,"not_eligible");
});
test("clinical motifs, consent refusal, and unreliable program do not reach a brief",()=>{
  assert.equal(plan("relationships","boundaries","ru",
    {motifId:"cave"}).status,"clinician_review_required");
  assert.equal(prepareMeditationCreativeBrief({
    program:rawProgram("relationships"),
    request:request("relationships","boundaries"),
    consent:{resourceImagery:false},
  }).status,"imagery_consent_required");
  assert.equal(prepareMeditationCreativeBrief({
    program:{status:"human_review_required",mode:"self_guided",focus:"relationships"},
    request:request("relationships","boundaries"),consent:{resourceImagery:true},
  }).status,"human_review_required");
});
test("the enriched template is rejected if the seven-beat contract is malformed",()=>{
  const selected=selectMeditationPractice({program:rawProgram("stress"),
    goal:"settle"}).practice;
  assert.equal(enhanceMeditationTemplateWithPractice({
    status:"script_ready",segments:[{id:"closing",text:"hi"}],
  },selected),null);
});
test("writer template mode preserves practical action without claiming LLM or media",async()=>{
  const p=plan("self_worth","confidence");
  const draft=await writeMeditationDraft(p);
  assert.equal(draft.status,"template_ready");
  assert.equal(draft.modelUsed,false);
  assert.equal(draft.practiceCard.methodId,"self_compassion");
  assert.ok(draft.script.includes(p.brief.practice.transferAction));
  assert.equal(draft.audioAssetId,null);
  assert.equal(draft.published,false);
});
test("generated literary text keeps the same reviewed practical goal and next action",async()=>{
  const prepared=plan("relationships","boundaries");
  const prose="Есть простое спокойное место, где ничто не требует быстрого решения. "+
    "Можно немного осмотреться, если это вам подходит, и заметить один знакомый предмет. "+
    "Вы сами выбираете, продолжать ли этот образ или просто слушать слова. "+
    "Иногда небольшая пауза перед ответом помогает заметить собственные предпочтения. "+
    "В этом упражнении нет правильного результата и нет необходимости кому-то что-то доказывать.";
  const result=await writeMeditationDraft(prepared,{writeBeat:async()=>prose});
  assert.equal(result.status,"draft_review_required");
  assert.equal(result.practiceCard.methodId,"boundary_rehearsal");
  assert.equal(result.practiceCard.transferAction,
    prepared.brief.practice.transferAction);
  assert.equal(result.audioAssetId,null);
  assert.equal(result.published,false);
});
test("external Gemini sees only a curated anonymous practice, not client text",()=>{
  const secret="PRIVATE_CLIENT_HISTORY_8919";
  const p=plan("relationships","boundaries","ru",
    {clientPhrase:secret,problemFrame:secret,desiredExperience:secret});
  assert.equal(p.status,"brief_ready");
  const sanitized=anonymizeMeditationBrief({
    locale:p.brief.locale,focus:p.brief.focus,goal:p.brief.goal,
    selectedMotifId:p.brief.selectedMotifId,styleId:p.brief.styleId,
    avoidElements:p.brief.avoidElements,
    practiceMethodId:p.brief.practice.methodId,beats:p.brief.beats,
    clientPhrase:secret,profile:secret,
  });
  const json=JSON.stringify(sanitized);
  assert.equal(json.includes(secret),false);
  assert.equal(json.includes("clientPhrase"),false);
  assert.equal(sanitized.practice.methodId,"boundary_rehearsal");
  assert.ok(sanitized.practice.instruction.length>6);
  assert.ok(sanitized.practice.optionalNextStep.length>6);
  assert.throws(()=>anonymizeMeditationBrief({
    ...p.brief,practiceMethodId:"emdr_processing",
  }),/AI_PRACTICE_INVALID/u);
});
test("UI and preview API wire user intent into approved optional skill",()=>{
  const route=readFileSync(new URL(
    "../app/api/holistic-support/meditation-writer/brief/route.js",import.meta.url),"utf8");
  const ui=readFileSync(new URL(
    "../components/meditation-writer-preview.tsx",import.meta.url),"utf8");
  assert.ok(route.includes("practice:outcome.brief.practice"));
  assert.ok(route.includes("clinicalProtocol:false"));
  assert.ok(route.includes("requiresEditorialReview:true"));
  assert.ok(ui.includes("intentionCode:goal"));
  assert.ok(ui.includes("preview.practice.steps.slice(0,2)"));
  assert.ok(ui.includes("preview.practice.transferAction"));
  assert.ok(ui.includes("setGoal(defaultGoal[next])"));
  assert.ok(ui.includes('<details className={styles.checkin}>'));
  assert.ok(ui.includes('setBefore("");setAfter("");'));
  assert.ok(ui.includes('before!==""&&after!==""'));
  // The check-in is local UI state and not posted to the authenticated API.
  assert.ok(!route.includes("beforeCheckinValue"));
  assert.ok(!route.includes("afterCheckinValue"));
});
