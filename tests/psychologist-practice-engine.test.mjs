import test from "node:test";
import assert from "node:assert/strict";
import {
  consultPsychologistMind, buildPsychologyProgram, buildPsychologyDialogueTurn,
} from "../lib/holistic-support/psychologist-mind.mjs";
import {
  PSYCHOLOGY_VIDEO_SKILLS, PSYCHOLOGY_VIDEO_COURSES,
  listPsychologyVideoCourseOptions,
} from "../lib/holistic-support/psychologist-video-curricula.mjs";
import {
  KIP_MOTIFS, KIP_SYMBOLS, listKipMotifs, exploreKipSymbol,
} from "../lib/holistic-support/kip-symbol-registry.mjs";
import {
  PERSONAL_MEDITATION_VERSION,
} from "../lib/holistic-support/psychologist-meditation-composer.mjs";
import { consultPsychologistMind as fromCore,
  KIP_MOTIFS as fromCoreMotifs, PSYCHOLOGY_VIDEO_COURSES as fromCoreCourses
} from "../lib/holistic-support/holistic-intelligence.mjs";

const safe={safety:{status:"clear"}};
const ask=(task,extra={})=>consultPsychologistMind({
  ...safe,locale:"ru",intent:{focus:"stress"},task,...extra,
});

test("catalogue has 5 historical basic KIP motifs, broader motives and 60+ non-diagnostic symbols",()=>{
  assert.ok(KIP_MOTIFS.length>=40);
  assert.ok(KIP_SYMBOLS.length>=60);
  const ids=new Set(KIP_MOTIFS.map(m=>m.id));
  assert.equal(ids.size,KIP_MOTIFS.length);
  for(const key of ["meadow","brook","mountain","house","forest_edge"])
    assert.ok(ids.has(key));
  assert.ok(KIP_MOTIFS.every(m=>m.sourceUrl.startsWith("https://")&&
    m.interpretationRule==="ask_client_first_no_fixed_symbol_meaning"));
  for(const id of ["house","cave","volcano","lion","animal_family","rosebush"])
    assert.equal(KIP_MOTIFS.find(x=>x.id===id).selfGuided,false);
  assert.ok(KIP_SYMBOLS.every(s=>s.neverDiagnostic&&s.interpretation==="meaning_belongs_to_client"));
  assert.equal(exploreKipSymbol({id:"bridge",locale:"ru"}).fixedMeaning,null);
  assert.equal(exploreKipSymbol({id:"unknown"}),null);
});

test("only four original nonclinical resource prompts may be suggested for autonomous practice",()=>{
  const allowed=listKipMotifs({selfGuidedOnly:true});
  assert.equal(allowed.length,4);
  assert.ok(allowed.every(x=>x.tier==="original_support"&&x.selfGuided));
  assert.equal(listKipMotifs({locale:"es",tier:"base"}).length,5);
  assert.equal(ask("kip_library").motifCount,KIP_MOTIFS.length);
  assert.equal(ask("kip_library").symbolCount,KIP_SYMBOLS.length);
  assert.equal(ask("kip_library",{intent:{focus:"stress",selfGuidedOnly:true}}).motifs.length,4);
  assert.equal(ask("symbol_explore",{intent:{focus:"stress",symbolId:"tree"}}).symbol.fixedMeaning,null);
});

test("six course models and twelve practical skills are multilingual and source-linked",()=>{
  assert.equal(Object.keys(PSYCHOLOGY_VIDEO_COURSES).length,6);
  assert.equal(Object.keys(PSYCHOLOGY_VIDEO_SKILLS).length,12);
  for(const skill of Object.values(PSYCHOLOGY_VIDEO_SKILLS)) {
    assert.ok(skill.label.ru&&skill.label.en&&skill.label.es);
    assert.ok(skill.steps.ru.length>=3&&skill.steps.en.length>=3&&skill.steps.es.length>=3);
    assert.ok(skill.source.startsWith("https://"));
    assert.equal(skill.clinicalProtocol,false);
  }
  assert.deepEqual(
    listPsychologyVideoCourseOptions({focus:"relationships",locale:"ru"}).map(x=>x.id),
    ["relationship_skills"]);
});

test("video_course returns eight storyboarded 12-minute episodes without claiming assets exist",()=>{
  for(const focus of ["stress","relationships","self_worth","meaning"]) {
    for(const locale of ["ru","en","es"]) {
      const plan=ask("video_course",{locale,intent:{focus}});
      assert.equal(plan.status,"draft_ready");
      assert.equal(plan.lessons.length,8);
      assert.equal(plan.published,false);
      assert.equal(plan.rendered,false);
      for(const lesson of plan.lessons) {
        assert.equal(lesson.videoPlayable,false);
        assert.equal(lesson.videoAssetId,null);
        assert.equal(lesson.audioAssetId,null);
        assert.equal(lesson.plannedVideoSeconds,720);
        assert.equal(lesson.segments.reduce((a,s)=>a+s.seconds,0),720);
        assert.ok(lesson.segments.some(s=>s.requiresOptIn));
        assert.equal(lesson.needsSafetyRecheck,true);
        if(lesson.selectedSkillId)assert.ok(PSYCHOLOGY_VIDEO_SKILLS[lesson.selectedSkillId]);
      }
    }
  }
});

test("chosen compatible course takes priority, incompatible selection falls back to focus",()=>{
  const custom=ask("video_course",{intent:{focus:"stress",courseId:"anxiety_cbt"}});
  assert.equal(custom.courseId,"anxiety_cbt");
  assert.equal(custom.selectionRationale,"client_selected_compatible_format");
  const incompatible=ask("video_course",{intent:{focus:"stress",courseId:"relationship_skills"}});
  assert.equal(incompatible.courseId,"stress_foundations");
  assert.equal(incompatible.selectionRationale,"safe_default_for_confirmed_focus");
});

test("imagery course option requires separate opt-in and actually permitted method",()=>{
  const without=ask("course_options");
  assert.ok(!without.formats.some(f=>f.id==="imagery_resources"));
  const withConsent=ask("course_options",{consent:{resourceImagery:true}});
  assert.ok(withConsent.formats.some(f=>f.id==="imagery_resources"));
  const chosen=ask("video_course",{
    consent:{resourceImagery:true},intent:{focus:"stress",courseId:"imagery_resources"}});
  assert.equal(chosen.courseId,"imagery_resources");
  const optedOut=ask("video_course",{
    consent:{resourceImagery:true},intent:{focus:"stress",courseId:"imagery_resources",noImagery:true}});
  assert.notEqual(optedOut.courseId,"imagery_resources");
});

test("meditation writes a full original paced script personalized by intention, language and motif",()=>{
  for(const locale of ["ru","en","es"]) {
    const result=ask("meditation",{locale,consent:{resourceImagery:true},
      intent:{focus:"stress",intentionCode:"clarity",durationMinutes:12,motifId:"small_light"}});
    assert.equal(result.version,PERSONAL_MEDITATION_VERSION);
    assert.equal(result.status,"script_ready");
    assert.equal(result.motifId,"small_light");
    assert.equal(result.intentionCode,"clarity");
    assert.equal(result.segments.length,7);
    assert.equal(result.segments.reduce((acc,x)=>acc+x.seconds,0),720);
    assert.equal(result.plannedDurationSeconds,720);
    assert.ok(result.script.length>500);
    assert.equal(result.published,false);
    assert.equal(result.audioAssetId,null);
    assert.equal(result.videoAssetId,null);
    assert.equal(result.noSymbolInterpretation,true);
    assert.equal(result.diagnosis,null);
  }
});

test("free-text request influences controlled intention but is never quoted in output",()=>{
  const raw="Мне нужна ясность <script>steal_private_notes()</script> SECRET_CLIENT_TOKEN";
  const plan=ask("meditation",{consent:{resourceImagery:true},
    intent:{focus:"meaning",rawUtterance:raw}});
  assert.equal(plan.status,"script_ready");
  assert.equal(plan.intentionCode,"clarity");
  assert.ok(!JSON.stringify(plan).includes("SECRET_CLIENT_TOKEN"));
  assert.ok(!JSON.stringify(plan).includes("steal_private_notes"));
});

test("clinical KIP motifs can be referenced but never turned into auto meditations",()=>{
  for(const motifId of ["meadow","house","forest_edge","cave","volcano","animal_family"]) {
    const x=ask("meditation",{consent:{resourceImagery:true},
      intent:{focus:"stress",motifId}});
    assert.equal(x.status,"clinician_review_required");
    assert.equal(x.script,null);
  }
});

test("safety preflight, crisis, trauma request and self-reported worsening block all generators",()=>{
  const noPreflight=consultPsychologistMind({task:"meditation",
    locale:"ru",intent:{focus:"stress"},consent:{resourceImagery:true}});
  assert.equal(noPreflight.status,"safety_check_required");
  assert.equal(noPreflight.script,undefined);
  const urgent=ask("video_course",{safety:{status:"urgent"}});
  assert.equal(urgent.status,"safety_handoff");
  assert.equal(urgent.lessons,undefined);
  const trauma=ask("meditation",{consent:{resourceImagery:true},
    intent:{focus:"trauma_support"}});
  assert.equal(trauma.status,"human_review_required");
  const worsening=ask("meditation",{feedback:{worsening:true},consent:{resourceImagery:true}});
  assert.equal(worsening.status,"paused_for_review");
});

test("disabled imagery, saved no-imagery and user avoidMethods cannot be overridden",()=>{
  assert.equal(ask("meditation").status,"imagery_consent_required");
  assert.equal(ask("meditation",{consent:{resourceImagery:true},
    intent:{focus:"stress",noImagery:true}}).status,"imagery_consent_required");
  const saved=ask("meditation",{access:{authenticated:true,ownerScoped:true},
    consent:{resourceImagery:true,profilePersonalization:true,agentMemory:true},
    profile:{noImagery:true}});
  assert.equal(saved.status,"imagery_consent_required");
  const avoided=ask("meditation",{consent:{resourceImagery:true},
    intent:{focus:"stress",avoidMethods:["resource_imagery"]}});
  assert.equal(avoided.status,"imagery_consent_required");
});

test("practitioner KIP catalog remains reference only, never an autonomous treatment",()=>{
  const clinician={task:"meditation",locale:"ru",intent:{focus:"stress",mode:"practitioner_draft"},
    ...safe,access:{authenticated:true,ownerScoped:true,verifiedPractitioner:true},
    consent:{resourceImagery:true}};
  const out=consultPsychologistMind(clinician);
  assert.equal(out.status,"human_review_required");
  assert.equal(out.script,null);
  const library=consultPsychologistMind({...clinician,task:"kip_library"});
  assert.equal(library.status,"clinician_draft");
  assert.ok(library.motifs.some(m=>m.id==="volcano"&&m.clinicalReviewRequired));
});

test("dialogue reuses session-approved skill descriptions but never auto-starts practice",()=>{
  const x=buildPsychologyDialogueTurn({...safe,locale:"ru",
    intent:{focus:"stress"},state:{sessionNumber:2,phase:"practice_intro"}});
  assert.equal(x.status,"dialogue");
  assert.equal(x.canStartExercise,false);
  assert.ok(x.skillPreview?.steps.length>=3);
  assert.equal(x.skillPreview.needsExplicitStart,true);
  assert.ok(x.suggestedMethodIds.includes(x.skillPreview.id));
  const stopped=buildPsychologyDialogueTurn({...safe,locale:"ru",text:"стоп",
    intent:{focus:"stress"},state:{phase:"practice_intro"}});
  assert.equal(stopped.status,"client_paused");
  assert.equal(stopped.skillPreview,undefined);
});

test("exports are available through existing Holistic Intelligence without a new provider",()=>{
  const viaCore=fromCore({task:"video_course",...safe,intent:{focus:"stress"}});
  assert.equal(viaCore.status,"draft_ready");
  assert.equal(fromCoreMotifs.length,KIP_MOTIFS.length);
  assert.equal(Object.keys(fromCoreCourses).length,6);
  assert.equal(buildPsychologyProgram({...safe,intent:{focus:"stress"}}).sessions.length,8);
});
