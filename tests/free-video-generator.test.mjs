import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildFreeVideoPlan,cleanVisualDescription,FREE_VIDEO_EXAMPLES,
  FREE_VIDEO_FAMILIES,FREE_VIDEO_PALETTES,FREE_VIDEO_VERSION} from "../lib/mandala/free-video-generator.mjs";
import * as generator from "../lib/mandala/free-video-generator.mjs";

test("eight original procedural worlds preserve the first three families and palettes",()=>{
  assert.deepEqual(FREE_VIDEO_FAMILIES,["mandala","light","lotus","temple","tree","cosmic","light_tunnel","flowering_garden"]);
  assert.equal(FREE_VIDEO_VERSION,"hh-free-procedural-v2");
  assert.deepEqual(FREE_VIDEO_PALETTES,["gold","ocean","violet"]);
  for(const locale of ["ru","en","es"]){
    const p=buildFreeVideoPlan({description:FREE_VIDEO_EXAMPLES[locale],locale,theme:"energy"});
    assert.equal(p.family,"lotus");
    assert.equal(p.hasRecognizedMotif,true);
    assert.equal(p.framesFromReadyVideo,false);
    assert.equal(p.paidProviderRequired,false);
  }
});
test("actual visual intent—not psychological wish—chooses a new motif",()=>{
  const cases=[
    ["Золотая мандала вращается медленно","ru","mandala","gold","calm"],
    ["Glowing portal and moving rays of light","en","light",null,null],
    ["Un loto violeta se abre lentamente","es","lotus","violet","calm"],
    ["Blue sacred geometry and stars","en","mandala","ocean",null],
  ];
  for(const [description,locale,family,palette,motion] of cases){
    const p=buildFreeVideoPlan({description,locale,theme:"energy"});
    assert.equal(p.family,family,description);
    assert.equal(p.hasRecognizedMotif,true);
    if(palette)assert.equal(p.palette,palette,description);
    if(motion)assert.equal(p.motion,motion,description);
  }
});
test("RU EN ES visual intents route to five actually distinct new worlds",()=>{
  const descriptions=[
    ["ru","Светлый храм с колоннами","temple"],
    ["en","An old oak tree with drifting leaves","tree"],
    ["es","Un cosmos con galaxia y nebulosa","cosmic"],
    ["ru","Световой туннель в перспективе","light_tunnel"],
    ["es","Un jardín de flores al amanecer","flowering_garden"],
  ];
  for(const [locale,description,family] of descriptions){
    const p=buildFreeVideoPlan({locale,description,theme:"life"});
    assert.equal(p.family,family,description);
    assert.equal(p.hasRecognizedMotif,true);
    assert.equal(p.source,"local_procedural");
    assert.equal(p.framesFromReadyVideo,false);
    assert.equal(p.paidProviderRequired,false);
    assert.equal(p.version,FREE_VIDEO_VERSION);
    assert.ok(!JSON.stringify(p).includes(description));
  }
  for(const family of FREE_VIDEO_FAMILIES){
    const p=buildFreeVideoPlan({family,locale:"en",theme:"energy",variation:17});
    const q=buildFreeVideoPlan({family,locale:"en",theme:"energy",variation:17});
    assert.deepEqual(p,q);
    assert.equal(p.family,family);
  }
});
test("unsupported human-film prompts fail honestly to a labeled symbolic fallback",()=>{
  const p=buildFreeVideoPlan({theme:"energy",locale:"ru",
    description:"Реалистичный актёр играет на гитаре"});
  assert.equal(p.hasRecognizedMotif,false);
  assert.equal(p.recognition,"fallback");
  assert.equal(p.family,"light");
  assert.equal(p.source,"local_procedural");
});
test("another variation changes reproducible geometry without any provider or PII",()=>{
  const args={theme:"health",locale:"ru",description:"Золотой лотос на озере",family:"lotus"};
  const a=buildFreeVideoPlan({...args,variation:0});
  const b=buildFreeVideoPlan({...args,variation:1});
  assert.equal(a.seed,buildFreeVideoPlan({...args,variation:0}).seed);
  assert.notEqual(a.seed,b.seed);
  assert.equal(a.family,b.family);
  assert.equal(a.palette,b.palette);
  assert.equal(a.variation,0);
  assert.equal(b.variation,1);
  assert.throws(()=>buildFreeVideoPlan({...args,variation:-1}),/invalid_free_video_options/);
  assert.throws(()=>buildFreeVideoPlan({...args,family:"actor"}),/invalid_free_video_options/);
  assert.ok(Object.isFrozen(a));
});
test("reduced-motion preference is preserved in the shared preview and export plan",()=>{
  const options={locale:"en",theme:"energy",family:"temple",motion:"dynamic",variation:2};
  const normal=buildFreeVideoPlan(options), reduced=buildFreeVideoPlan({...options,reducedMotion:true});
  assert.equal(normal.reducedMotion,false);
  assert.equal(reduced.reducedMotion,true);
  assert.equal(reduced.seed,normal.seed,'motion preference must not change the visual identity');
  assert.equal(reduced.motion,'dynamic','the user choice remains available when preference changes');
  assert.equal(typeof generator.freeVideoMotionTime,'function');
  assert.ok(generator.freeVideoMotionTime(reduced,10)<generator.freeVideoMotionTime(normal,10));
  assert.ok(generator.freeVideoMotionTime(reduced,10)>0,'reduced motion remains gently animated');
  assert.throws(()=>buildFreeVideoPlan({...options,reducedMotion:'yes'}),/invalid_free_video_options/);
});
test("visual descriptions are bounded and never echoed into exported plan",()=>{
  assert.equal(cleanVisualDescription("hello\nworld"),"hello world");
  const secret="PRIVATE_TEST_PERSONAL_ID_123";
  const p=buildFreeVideoPlan({description:secret,theme:"energy",locale:"en"});
  assert.ok(!JSON.stringify(p).includes(secret));
  assert.equal(p.descriptionLength,secret.length);
  assert.equal(cleanVisualDescription("a".repeat(400)).length,280);
});
test("new generator feeds the SAME working Canvas/MediaRecorder as existing editor",()=>{
  const s=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const renderer=readFileSync(new URL("../lib/mandala/free-video-renderer.ts",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-free-video-generator.tsx",import.meta.url),"utf8");
  assert.match(s,/data-free-video-source="generated"/);
  assert.match(s,/data-free-video-source="catalog"/);
  assert.match(s,/data-video-quick-section="6"/);
  assert.match(s,/paintFreeVideoFrame\(ctx,freePlan,time,permittedPortrait\?image:null\)/);
  assert.match(s,/const proceduralScene=creationMode==="generated"\?freeVideoPlan:null/);
  assert.match(s,/canvas\.captureStream\(framesPerSecond\)/);
  assert.match(s,/new MediaRecorder\(stream,recorderOptions\)/);
  assert.match(s,/stream\.addTrack\(musicSession\.track\)/);
  assert.match(s,/exportSignature=signature\+":"\+JSON\.stringify/);
  assert.match(s,/sourceRef\.current !== snapshotKey/);
  assert.match(ui,/data-free-video-variant/);
  assert.match(ui,/data-free-video-prompt/);
  assert.match(ui,/data-free-video-play/);
  assert.match(ui,/data-free-video-canvas/);
  assert.match(ui,/role="status".*data-free-video-fallback/);
  assert.match(renderer,/function mandala\(/);
  assert.match(renderer,/function light\(/);
  assert.match(renderer,/function lotus\(/);
  assert.match(renderer,/function random\(/);
  assert.match(renderer,/paintExtendedWorld\(/);
  const worlds=readFileSync(new URL("../lib/mandala/free-video-worlds.ts",import.meta.url),"utf8");
  for(const world of ["temple","tree","cosmic","lightTunnel","floweringGarden"]){
    assert.match(worlds,new RegExp("function "+world+"\\("));
  }
  assert.match(worlds,/createRadialGradient/);
  assert.match(worlds,/bezierCurveTo/);
  assert.doesNotMatch(worlds,/fetch\(|XMLHttpRequest|WebSocket|FormData|sendBeacon|localStorage|sessionStorage/);
  assert.match(renderer,/drawImage\(image,/);
  assert.doesNotMatch(renderer,/fetch\(|XMLHttpRequest|WebSocket|FormData|sendBeacon|localStorage|sessionStorage/);
});
