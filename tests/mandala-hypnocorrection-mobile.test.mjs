import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hypnoWavePhase, paintHypnoLightOverlay, recommendHypnoLight } from "../lib/mandala/hypno-visual-overlay.mjs";

test("Wave selects different calm or focused effects from local goal and theme",()=>{
  const active=recommendHypnoLight("energy","more vitality");
  const calm=recommendHypnoLight("energy","хочу спокойствия");
  const work=recommendHypnoLight("money","prepare for an interview");
  assert.equal(active.cyclesPerMinute,8);
  assert.equal(calm.cyclesPerMinute,6);
  assert.equal(calm.opacity,.14);
  assert.equal(work.cyclesPerMinute,7);
  assert.notDeepEqual(active,calm);
});
test("hypnocorrection's smooth six-cycle wave is deterministic and never flashes",()=>{
  assert.equal(hypnoWavePhase(0,6),0);
  assert.ok(hypnoWavePhase(5,6)>.9999);
  assert.ok(hypnoWavePhase(10,6)<.0001);
  assert.equal(hypnoWavePhase(5,6),hypnoWavePhase(5,6));
  assert.ok(hypnoWavePhase(30,6)>=0);
  assert.ok(hypnoWavePhase(30,6)<=1);
});
test("enabled overlay draws a smooth concentric light pattern and restores Canvas state",()=>{
  const actions=[];
  const ctx={
    canvas:{width:1280,height:720},
    save(){actions.push("save");},restore(){actions.push("restore");},
    createRadialGradient(){actions.push("gradient");return{addColorStop(){}};},
    fillRect(){actions.push("fill");},beginPath(){},
    ellipse(){actions.push("ellipse");},stroke(){actions.push("stroke");},
    moveTo(){},lineTo(){},
  };
  paintHypnoLightOverlay(ctx,5,{enabled:true,cyclesPerMinute:6,opacity:.2});
  assert.equal(actions[0],"save");
  assert.equal(actions.at(-1),"restore");
  assert.equal(actions.filter(x=>x==="fill").length,1);
  assert.equal(actions.filter(x=>x==="ellipse").length,3);
  assert.equal(actions.filter(x=>x==="stroke").length,11);
});
test("disabled overlay performs no frame drawing",()=>{
  let called=false;
  paintHypnoLightOverlay({canvas:{width:320,height:180},save(){called=true;}},1,{enabled:false});
  assert.equal(called,false);
});
test("mobile layout reuses one editor, real phrase settings and both frame pipelines",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");
  assert.match(studio,/data-video-quick-control=\{item.id\}/);
  assert.match(studio,/effects:\{tab:"Гипноэффект",title:"Гипноэффекты"/);
  assert.match(studio,/effects:\{tab:"Hypno effect",title:"Hypno effects"/);
  assert.match(studio,/effects:\{tab:"Efecto hipno",title:"Efectos de hipnosis"/);
  assert.match(studio,/data-workspace-section="effects"/);
  assert.match(studio,/MandalaHypnocorrectionMobile/);
  assert.match(studio,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(studio,/createHypnoAudioEffectFile/);
  assert.match(ui,/data-hypno-speech-settings/);
  assert.match(ui,/data-hypno-binaural-settings/);
  assert.match(ui,/whisperEnabled/);
  assert.match(ui,/binauralEnabled/);
  const audioGroup=ui.slice(ui.indexOf('{group.id==="audio"?<>'),ui.indexOf('{group.id==="visual"?<>'));
  assert.ok(audioGroup.length>0,"audio group must exist");
  assert.doesNotMatch(audioGroup,/unavailable|coming soon/);
  assert.match(studio,/onOpenPhraseEditor=\{\(\)=>\{/);
  assert.match(studio,/openQuickDetailed\("video-hypnosis"\)/);
  assert.match(studio,/onOpenScenes=\{\(\)=>openQuickDetailed\("video-templates"\)\}/);
  assert.equal((studio.match(/paintHypnoLightOverlay\(ctx,/g)||[]).length,5, "both native and WebCodecs MP4 must draw the real hypno overlay");
  for(const name of ['"phrases"','"audio"','"visual"'])assert.ok(ui.includes(name));
  assert.doesNotMatch(ui,/posters\.meditation/,"no stale lookup remains for the removed meditation group");
  for(const name of ["25-й кадр","Бинауральные ритмы","Импульс света",
    "Быстрая настройка с Wave","Создать личную медитацию"])assert.ok(ui.includes(name));
  assert.match(css,/font-size:18px/);
  assert.match(css,/\.feature\{display:grid/);
  assert.doesNotMatch(ui,/fetch\(|getUserMedia\(|checkout|stripe|payPal/i);
});

test("owner's third workspace exposes three image-led groups in approved order and one real Create handler",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");
  const videoCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  const order=["phrases","visual","audio"].map(id=>ui.indexOf('id:"'+id+'",title:t.'));
  assert.ok(order.every(value=>value>=0)&&order.every((value,i)=>i===0||value>order[i-1]));
  assert.match(ui,/useState<GroupId\[\]>\(\["phrases","visual","audio"\]\)/);
  assert.match(ui,/data-hypno-card/);
  assert.match(ui,/note==="voice"/,
    "opening the speech control reveals the inline voice editor");
  assert.match(ui,/voiceEditor\|\|<p className=\{styles\.note\}>\{t\.voiceHint\}<\/p>/,
    "audio guidance offers the inline phrase-voice editor or a clear prerequisite");
  assert.match(ui,/audioEffectBusy/,"audio controls expose their real render-busy state");
  assert.match(ui,/data-photo=\{Boolean\(poster\)\}/);
  assert.match(ui,/data-hypno-create/);
  assert.match(ui,/createPortal\(intro,introTarget\)/);
  assert.match(ui,/data-hypno-intro/);
  assert.match(studio,/data-hypno-intro-slot/);
  assert.match(css,/\.intro\{display:grid/);
  assert.match(studio,/onCreate=\{startFromHero\}/);
  assert.match(studio,/studioMode==="pump"&&activeWorkspace!=="effects"/);
  assert.match(css,/groupContent:not\(\[hidden\]\)\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:374px\)/);
  assert.match(css,/\.switch\{position:relative;display:flex;align-items:center;justify-content:flex-start;/);
  assert.match(ui,/groups\.map\(\(group,index\)=>/, "number all three approved illustrated groups");
  assert.match(ui,/styles\.groupNumber/, "number badge is on original photo tile");
  assert.match(css,/\.groupNumber\{position:absolute/, "number badge remains legible on photo");
  assert.match(css,/\.feature\{height:124px;min-height:124px;max-height:124px;/,
    "375-430 CSS-pixel iPhone cards must be compact, not 170px high");
  assert.match(css,/\.meditation \.meditationStart\{display:grid/,
    "meditation action uses white card override over legacy purple button");
  assert.match(videoCss,/scroll-margin-top:min\(44svh,390px\)/,
    "third-tab deep-link must reveal the original header/Wave/player above groups");
  assert.match(videoCss,/not\(\[data-active-workspace="effects"\]\) \.quickBuilder>\[data-video-result\]/,
    "generated video result must remain visible in third workspace");
  assert.match(videoCss,/data-active-workspace="effects"\] \.quickBuilder>\[data-video-effects-panel\]\{order:3\}/,
    "the four groups appear immediately after the single player/navigation");
  assert.match(videoCss,/data-active-workspace="effects"\] \.quickBuilder>\[data-video-result\]\{order:4\}/,
    "real generated output and Save appear after Effects/Create, not above them");
  assert.match(videoCss,/data-active-workspace="effects"\] \.previewStage \.hero\{aspect-ratio:3\.3\/1!important\}/);
  assert.match(css,/@media\(min-width:375px\) and \(max-width:759px\)\{\s*\.groupHeader\{min-height:128px\}/);
  assert.match(css,/\.feature\{min-height:128px;grid-template-rows:38px 1fr\}/);
  assert.match(css,/@media\(max-width:374px\)\{\s*\.groupHeader\{min-height:84px\}/);
  for(const locale of ["ru","en","es"])assert.match(ui,new RegExp(locale+": \\{"));
  assert.doesNotMatch(ui,/unavailable onToggle=/, "no dead placeholder remains in the three live groups");
  assert.match(ui,/data-hypno-create[\s\S]{0,140}onClick=\{onCreate\}/);
});

test("02 Nov reference has six real, full-width goal chips and three accessible full-width cards per effects row",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");
  const videoCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  assert.match(studio,/const effectsThemeOrder: VideoTheme\[\] = \["life","energy","relationships","goals","money","health"\]/);
  assert.match(studio,/open=\{activeWorkspace==="effects"\|\|undefined\}/);
  assert.match(studio,/effectsThemeNames\[locale\]\[value\]/);
  assert.match(videoCss,/\.studio\[data-active-workspace="effects"\] \.quickBuilder>\[data-video-quick-section="1"\]\{\s*display:grid!important;order:3/);
  assert.match(videoCss,/\.quickThemeRail\{\s*display:grid!important;grid-auto-flow:row;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.group\{display:block;grid-template-columns:none/);
  assert.match(css,/\.groupContent:not\(\[hidden\]\)\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.groupHeader::after,\.groupHeader>img\{display:none\}/);
  assert.match(css,/\.feature,.feature\[data-photo=true\]\{position:relative/);
  assert.match(css,/\.feature\[data-photo=true\] \.featurePoster\{position:absolute/);
  assert.match(css,/\.switch\{grid-column:1;grid-row:1;z-index:3/);
  assert.doesNotMatch(ui,/data-hypno-meditation-action/, "personal meditation action belongs to Practices");
  assert.doesNotMatch(ui,/id:"meditation"|styles\.meditation/);
  assert.equal((ui.match(/data-hypno-create/g)||[]).length,1,"one original local recording callback");
  assert.match(ui,/onClick=\{onCreate\}/);
  assert.doesNotMatch(ui,/fetch\(|getUserMedia\(|new MediaRecorder\(/);
});

test("effects moves the single original tab rail above Wave on mobile only",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  assert.equal((studio.match(/<nav className=\{videoStyles\.quickVideoNav\}/g)||[]).length,1);
  assert.ok(studio.indexOf('id="video-hero"')<studio.indexOf("data-video-quick-controls"),
    "original video hero precedes the tabs in source order and all other workspaces");
  assert.match(studio,/activeWorkspace==="effects"&&mobile\.matches/);
  assert.match(studio,/data-video-hypno-nav-slot/);
  assert.match(studio,/createPortal\(nav,effectsNavTarget\)/);
  assert.match(css,/\.studio\[data-active-workspace="effects"\] \.quickBuilder>\.hypnoNavSlot/);
  assert.match(css,/\.hypnoNavSlot\{display:none\}/);
});
