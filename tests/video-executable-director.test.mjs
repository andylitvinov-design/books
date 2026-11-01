import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalogue from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import {
  EXECUTABLE_VIDEO_SCENARIO_VERSION,
  compileExecutableVideoScenario,parseAiVideoCutSuggestion,
  executableSceneCandidates,visualSignalsFromGoal,
} from "../lib/mandala/video-executable-director.mjs";
import {validateMontageClips} from "../lib/mandala/video-montage-sources.mjs";
import {
  parseAiVideoPlanInput,validateAiVideoPlanResponse,generateAiVideoPlan,
} from "../lib/mandala/video-chat-executable-ai.mjs";

const scenes=catalogue.scenes;
const presets=[
  {id:"sun-video",theme:"energy",clips:[
    "solar-surge","sunbeam-flow","mountain-air","desert-light"]},
  {id:"alternative",theme:"energy",clips:[
    "mountain-air","wealth-sunrise","golden-rain","radiant-portal"]},
  {id:"nature",theme:"life",clips:[
    "meadow-morning","petal-hope","wildflower-dance","fern-awakening"]},
];
const draft={goal:"Горы, солнечный рассвет без моря",mood:"slow",aspect:"portrait",
  duration:30,music:"meditation",phrases:true};
const base={goal:draft.goal,locale:"ru",fallbackTheme:"energy",presets,scenes,
  selectedPresetId:"sun-video",alternativePresetIds:["alternative"],
  excludedMotifs:["water"],draft,
  renderOptions:{quality:"fullhd",brightness:"bright",volumePercent:47}};

test("client desire becomes an executable, source-licensed timeline/audio/captions",()=>{
  const script=compileExecutableVideoScenario(base);
  assert.equal(script.version,EXECUTABLE_VIDEO_SCENARIO_VERSION);
  assert.equal(script.origin,"local_compiler");
  assert.equal(script.readyToExecute,true);
  assert.equal(script.shots.length,4);
  assert.equal(script.shots[0].sceneId,"mountain-air");
  assert.ok(script.shots.every(shot=>shot.assetPath.endsWith("/"+shot.sceneId+".mp4")));
  assert.ok(script.shots.every(shot=>shot.durationSeconds>=2));
  assert.equal(script.shots.reduce((sum,shot)=>sum+shot.durationSeconds,0),30);
  assert.deepEqual(script.shots.map(shot=>shot.startSeconds),
    [0,script.shots[0].durationSeconds,
      script.shots[0].durationSeconds+script.shots[1].durationSeconds,
      30-script.shots[3].durationSeconds]);
  assert.equal(script.audio.kind,"approved_preset");
  assert.equal(script.audio.trackId,"meditation");
  assert.equal(script.audio.volumePercent,47);
  assert.equal(script.rendering.aspect,"portrait");
  assert.equal(script.rendering.quality,"fullhd");
  assert.equal(script.rendering.brightness,"bright");
  assert.equal(script.edit.captionTexts.length,4);
  assert.ok(script.edit.captionTexts.every(Boolean));
  assert.equal(script.edit.excludedMotifs[0],"water");
  assert.ok(validateMontageClips(script.edit.clipIds,scenes,script.edit.excludedMotifs));
  assert.equal(script.noExternalClientData,true);
  assert.equal(JSON.stringify(script).includes(base.goal),false);
});
test("negated visuals are not scored as positive subjects",()=>{
  assert.deepEqual(visualSignalsFromGoal("Без моря, горы и рассвет"),["mountains","sun"]);
  assert.deepEqual(visualSignalsFromGoal("No ocean, bright mountains"),["mountains"]);
  assert.equal(visualSignalsFromGoal("Сделайте видео про еду")[0],"food");
});
test("requested silence and no captions remain silent and caption-free",()=>{
  const script=compileExecutableVideoScenario({...base,
    draft:{...draft,duration:10,aspect:"square",music:"none",phrases:false}});
  assert.equal(script.audio.kind,"silent");
  assert.equal(script.audio.trackId,"none");
  assert.ok(script.edit.captionTexts.every(x=>x===""));
  assert.equal(script.shots.reduce((sum,s)=>sum+s.durationSeconds,0),10);
  assert.ok(script.shots.every(s=>s.durationSeconds>=2));
});
test("AI cannot invent clip, duplicate source, bypass excluded motif or distort duration",()=>{
  const candidates=executableSceneCandidates({presetId:base.selectedPresetId,
    alternativePresetIds:base.alternativePresetIds,presets,scenes,
    excludedMotifs:base.excludedMotifs});
  assert.ok(candidates.includes("mountain-air"));
  const values={candidateSceneIds:candidates,durationSeconds:30,scenes,
    excludedMotifs:["water"]};
  const good={clipIds:["mountain-air","solar-surge","sunbeam-flow","desert-light"],
    stageSeconds:[4,6,12,8]};
  assert.ok(parseAiVideoCutSuggestion(good,values));
  const scenario=compileExecutableVideoScenario({...base,aiSuggestion:good});
  assert.equal(scenario.origin,"ai_suggestion_validated");
  assert.deepEqual(scenario.edit.durationSecondsByStage,[4,6,12,8]);
  for(const bad of [
    {...good,clipIds:["mountain-air","solar-surge","sunbeam-flow","invented-ai-scene"]},
    {...good,clipIds:["mountain-air","solar-surge","sunbeam-flow","mountain-air"]},
    {...good,stageSeconds:[2,2,2,2]},
    {...good,stageSeconds:[1,6,12,11]},
    {...good,music:"paid-voice"},
    {...good,clipIds:["mountain-air","solar-surge","ocean-pulse","desert-light"]},
  ]){
    assert.equal(parseAiVideoCutSuggestion(bad,values),null);
    assert.throws(()=>compileExecutableVideoScenario({...base,aiSuggestion:bad}));
  }
});
test("invalid source metadata and insufficient eligible sources fail closed",()=>{
  assert.throws(()=>compileExecutableVideoScenario({...base,
    scenes:scenes.map(s=>s.id==="mountain-air"?{...s,status:"draft"}:s),
    selectedPresetId:"does-not-exist"}));
  assert.throws(()=>compileExecutableVideoScenario({...base,
    scenes:scenes.filter(s=>s.id==="mountain-air")}));
  assert.throws(()=>compileExecutableVideoScenario({...base,draft:{...draft,duration:400}}));
});
test("AI-plan endpoint validates only consented, licensed user-supplied candidates",()=>{
  const scenario=compileExecutableVideoScenario(base);
  const wire={consent:true,locale:"ru",goal:base.goal,durationSeconds:30,
    mood:"slow",aspect:"portrait",music:"meditation",phrases:true,
    candidateSceneIds:[...scenario.candidateSceneIds],excludedMotifs:["water"]};
  const parsed=parseAiVideoPlanInput(wire);
  assert.ok(parsed);
  assert.equal(parseAiVideoPlanInput({...wire,consent:false}),null);
  assert.equal(parseAiVideoPlanInput({...wire,clientProfile:{name:"Private"}}),null);
  assert.equal(parseAiVideoPlanInput({...wire,candidateSceneIds:[...wire.candidateSceneIds,"ghost-clip"]}),null);
  assert.equal(parseAiVideoPlanInput({...wire,candidateSceneIds:[
    ...wire.candidateSceneIds,"ocean-pulse"]}),null);
  assert.equal(parseAiVideoPlanInput({...wire,durationSeconds:999}),null);
  assert.equal(parseAiVideoPlanInput({...wire,candidateSceneIds:[...wire.candidateSceneIds,wire.candidateSceneIds[0]]}),null);
});
test("AI response makes only a verified structured cut, with local-only fallback",async()=>{
  const scenario=compileExecutableVideoScenario(base);
  const input=parseAiVideoPlanInput({consent:true,locale:"ru",goal:base.goal,durationSeconds:30,
    mood:"slow",aspect:"portrait",music:"meditation",phrases:true,
    candidateSceneIds:[...scenario.candidateSceneIds],excludedMotifs:["water"]});
  const output=JSON.stringify({clipIds:["mountain-air","solar-surge","sunbeam-flow","desert-light"],
    stageSeconds:[4,6,12,8]});
  assert.deepEqual(validateAiVideoPlanResponse(output,input)?.stageSeconds,[4,6,12,8]);
  assert.equal(validateAiVideoPlanResponse("A beautiful movie about mountains",input),null);
  const env={HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"test-only-gemini-key-123"};
  const calls=[];
  const result=await generateAiVideoPlan(input,env,async (url,options)=>{
    calls.push({url,body:JSON.parse(options.body)});
    return {ok:true,status:200,text:async()=>JSON.stringify({
      candidates:[{content:{parts:[{text:output}]}}]})};
  });
  assert.equal(result.provider,"gemini_free");
  assert.deepEqual(result.suggestion.stageSeconds,[4,6,12,8]);
  assert.equal(calls.length,1);
  assert.match(calls[0].body.contents[0].parts[0].text,/mountain-air/);
  assert.equal(calls[0].body.contents[0].parts[0].text.includes("portrait photo"),false);
  const off=await generateAiVideoPlan(input,{},async()=>{throw Error("must-not-call");});
  assert.equal(off.error,"VIDEO_PLAN_AI_DISABLED");
});
test("verified script is submitted through the only existing renderer and soundtrack",()=>{
  const chat=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
  const editor=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const route=readFileSync(new URL("../app/api/holistic-support/video-director-plan/route.js",import.meta.url),"utf8");
  assert.match(chat,/data-executable-video-scenario/);
  assert.match(chat,/parseAiVideoCutSuggestion/);
  assert.match(chat,/onConfirm\(\{scenario:executable\}\)/);
  assert.match(chat,/data-video-chat-ai-cut/);
  assert.match(chat,/approvedPlanKeyRef.current!==planKey/);
  assert.match(editor,/scenario\.edit,scenario\.aspect/);
  assert.match(editor,/setAttachedAudio\(soundtrack==="none"\?null/);
  assert.match(editor,/setSoundVolume\(scenario\.audio\.volumePercent\)/);
  assert.match(editor,/setCaptionMode\("none"\)/);
  assert.match(editor,/onCreate=\{createQuickVideo\}/);
  assert.match(editor,/new MediaRecorder\(/);
  assert.match(route,/requireSameOrigin\(request,config\)/);
  assert.match(route,/consumeRate\(config/);
  assert.match(route,/freeFirstVideoProviders\(process\.env\)/);
  assert.doesNotMatch(route,/xpDebit|checkout|chargeCard/);
});

test("800-character creative brief retains late visual motifs, temporal ordering and exclusions",()=>{
  const story="Долгий спокойный рассказ о целях. ".repeat(14)+"Сначала лес, затем горы, без моря.";
  assert.ok(story.length>160&&story.length<=800);
  const signals=visualSignalsFromGoal(story);
  assert.deepEqual(signals.slice(0,2),["forest","mountains"]);
  assert.equal(signals.includes("sea"),false);
  const scenario=compileExecutableVideoScenario({...base,goal:story});
  assert.equal(scenario.shots.length,4);
  assert.throws(()=>compileExecutableVideoScenario({...base,goal:"д".repeat(801)}));
  assert.deepEqual(visualSignalsFromGoal("Без моря хочу горы, затем солнце"),["mountains","sun"]);
  assert.deepEqual(visualSignalsFromGoal("Primero el bosque, después las montañas"),["forest","mountains"]);
});
